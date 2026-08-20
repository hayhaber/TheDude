import { createWorker, PSM } from 'tesseract.js';
import { loadPdfDocument } from './pdfTextExtractor';

// Only the characters an ASCII tab actually uses — narrowing Tesseract's
// character set away from full English prose meaningfully improves
// accuracy on dense, tiny monospace digits (its language model otherwise
// keeps trying to "correct" e.g. "15" into a real word). The technique
// letters (h/p/b) are intentionally lowercase-only: uppercase H/P/B are
// visually closer to other digits/symbols at this size and full tab
// convention already uses lowercase for these anyway.
const TAB_CHAR_WHITELIST = '0123456789ABDEGabdeghpx#|-/\\~ \n';

// A render scale high enough to give OCR real pixels-per-character to
// work with, but capped by MAX_CANVAS_DIMENSION regardless of the page's
// own native size — an embedded source image can be far higher-resolution
// than the page itself displays it at, and scaling up an already-large
// image is pure wasted work (slower canvas render, slower OCR pass) well
// past the point of any accuracy benefit.
const RENDER_SCALE = 2;
const MAX_CANVAS_DIMENSION = 2200;

// A page render or OCR pass that hangs (a corrupt/pathological embedded
// image, or just a very slow device) should fail that PAGE with a clear
// error instead of leaving the player staring at a stuck progress bar
// forever with no way to know something's wrong.
const PAGE_TIMEOUT_MS = 45000;

// Standard 6-string guitar tab, always — every phrase block in the tab
// layout this app reads is 6 lines, one per string.
const STRINGS_PER_BLOCK = 6;

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function median(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function renderPageToCanvas(page) {
  const nativeViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(RENDER_SCALE, MAX_CANVAS_DIMENSION / Math.max(nativeViewport.width, nativeViewport.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

// Raw pass: any row with at least one dark pixel counts as "inside
// text" — used only to find each phrase BLOCK's outer top/bottom extent
// (see detectLineBands below), not to place individual string-lines
// directly. A "-" character is thin and a mostly-unplayed string line
// (all filler, no digits) has far less ink than a line full of fret
// numbers, so trying to detect each of the 6 lines this way individually
// silently loses the quiet ones — verified against a real tab file: the
// one busy line was found perfectly, the other five vanished into a
// single blob. A gap only ends a band after 2 consecutive all-white
// rows, so a single stray anti-aliasing pixel-row doesn't fracture one
// real line's ink into two separate bands.
function detectRawBands(canvas) {
  const ctx = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const hasDarkPixel = new Array(canvas.height).fill(false);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (luminance < 220) {
        hasDarkPixel[y] = true;
        break;
      }
    }
  }

  const bands = [];
  let inBand = false;
  let start = 0;
  let blankRun = 0;
  for (let y = 0; y < canvas.height; y++) {
    if (hasDarkPixel[y]) {
      blankRun = 0;
      if (!inBand) {
        inBand = true;
        start = y;
      }
    } else if (inBand) {
      blankRun += 1;
      if (blankRun >= 2) {
        inBand = false;
        bands.push([start, y - blankRun + 1]);
      }
    }
  }
  if (inBand) bands.push([start, canvas.height]);
  return bands;
}

// Groups the raw (individually unreliable) bands into PHRASE BLOCKS by a
// large-gap heuristic — the tight, near-uniform gaps between a phrase's
// own string-lines read very differently from the larger paragraph
// spacing between one phrase and the next — then divides each block's
// own top-to-bottom extent into exactly STRINGS_PER_BLOCK EQUAL slices,
// ignoring individual line darkness entirely from this point on. Real
// tab notation is a rigid, evenly-spaced monospace grid: a phrase block
// is always exactly 6 lines tall, at a constant pitch, by construction —
// so once its overall extent is known, mechanically dividing it by 6 is
// more robust than trying to (re-)detect each individual line's own
// boundary, which is exactly what silently drops the quiet ones. Falls
// back to raw bands as-is if there's nothing to measure a gap from.
function detectLineBands(canvas) {
  const rawBands = detectRawBands(canvas);
  if (rawBands.length === 0) return [];
  if (rawBands.length === 1) return rawBands;

  const gaps = [];
  for (let i = 1; i < rawBands.length; i++) gaps.push(rawBands[i][0] - rawBands[i - 1][1]);
  const positiveGaps = gaps.filter((g) => g > 0);
  const breakThreshold = Math.max((positiveGaps.length ? median(positiveGaps) : 1) * 1.8, 1);

  const blocks = [];
  let current = [rawBands[0]];
  for (let i = 1; i < rawBands.length; i++) {
    if (gaps[i - 1] > breakThreshold) {
      blocks.push(current);
      current = [];
    }
    current.push(rawBands[i]);
  }
  blocks.push(current);

  const bands = [];
  for (const block of blocks) {
    const top = block[0][0];
    const bottom = block[block.length - 1][1];
    const sliceHeight = (bottom - top) / STRINGS_PER_BLOCK;
    for (let s = 0; s < STRINGS_PER_BLOCK; s++) {
      bands.push([Math.round(top + s * sliceHeight), Math.round(top + (s + 1) * sliceHeight)]);
    }
  }
  return bands;
}

function cropBand(canvas, [y0, y1], padding = 4) {
  const top = Math.max(0, y0 - padding);
  const height = Math.min(canvas.height, y1 + padding) - top;
  const cropped = document.createElement('canvas');
  cropped.width = canvas.width;
  cropped.height = height;
  cropped.getContext('2d').drawImage(canvas, 0, top, canvas.width, height, 0, 0, canvas.width, height);
  return cropped;
}

// Recognizes one already-cropped, single-string-line image and returns
// its raw recognized WORDS (bbox + text + confidence) — NOT yet turned
// into a text string. `cropBand` only trims the canvas vertically, so a
// word's own x0/x1 here is already the same absolute pixel coordinate
// every other string-line in the same block was measured in; that
// shared coordinate space is what reconstructBlockRows below depends on
// to keep two strings' notes correctly aligned to the same moment in
// time, not just correctly aligned within each string's own line.
async function recognizeLineWords(worker, lineCanvas) {
  const { data } = await worker.recognize(lineCanvas, {}, { blocks: true });
  return (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)));
}

// Tesseract's own per-word confidence score is only meaningful for
// SHORT words — verified directly: a long, character-for-character
// CORRECT run (a busy tab line read as one ~60-character word) still
// scored a confidence of 10, apparently because a few visually-ambiguous
// characters inside a long word drag its aggregate score down even when
// every character was actually read right. A short (1-2 char) low-
// confidence word, on the other hand, really is likely noise (a
// misread fragment of a mostly-dash line) — worth discarding rather
// than trusting. So length alone decides whether confidence is
// consulted at all, not a blanket threshold.
const LONG_WORD_CHARS = 6;
function isTrustworthyWord(w, minConfidence) {
  return w.text.trim() && (w.text.length >= LONG_WORD_CHARS || w.confidence >= minConfidence);
}

// A real tab reads top-to-bottom as much as left-to-right: two fret
// numbers stacked directly on top of each other (same horizontal
// position, different strings) are struck TOGETHER, not one after the
// other — a single column position by itself doesn't carry a note's
// timing correctly unless it's measured in the SAME coordinate space
// every other string in that block used. Rebuilding each of the 6 lines
// independently (this function's earlier version) let each one's own
// estimated character width drift slightly from its neighbors', which
// is exactly what breaks that vertical alignment — a note ends up a
// column or two off from where the SAME moment landed on another
// string. Estimating ONE shared character width from every recognized
// word across the whole block fixes that: same width, same origin
// (x=0), for all 6 lines, so a column index means the same physical x
// position — and therefore the same instant — on every string.
function reconstructBlockRows(perLineWords, minConfidence = 50) {
  const allGoodWords = perLineWords
    .flat()
    .filter((w) => isTrustworthyWord(w, minConfidence))
    // A single stray character (misread noise from a mostly-dash line)
    // is a bad width sample; multi-character words (a real fret number,
    // or the string's own "X|" label) are reliable ones.
    .filter((w) => w.text.length >= 2);
  const widthSamples = allGoodWords.map((w) => (w.bbox.x1 - w.bbox.x0) / w.text.length);
  const charWidth = widthSamples.length ? median(widthSamples) : 10;

  return perLineWords.map((words) => {
    const good = words.filter((w) => isTrustworthyWord(w, minConfidence));
    if (good.length === 0) return '';
    const maxX1 = Math.max(...good.map((w) => w.bbox.x1));
    const totalCols = Math.ceil(maxX1 / charWidth) + 2;
    const chars = new Array(totalCols).fill('-');
    for (const w of good) {
      const startCol = Math.round(w.bbox.x0 / charWidth);
      for (let i = 0; i < w.text.length; i++) {
        const c = startCol + i;
        if (c >= 0 && c < chars.length) chars[c] = w.text[i];
      }
    }
    // Trailing dashes are legitimate (real filler); so are LEADING ones
    // on a line with no label of its own — its content can genuinely
    // start many real columns in (a note appearing well into an
    // otherwise-quiet string), and that offset IS its correct position
    // relative to every other string in the block, not noise to erase.
    // Only strip a leading dash when a label immediately follows it — a
    // real rounding artifact from that specific case (verified directly:
    // "B|" landing one column short of the block's shared origin), NOT a
    // general rule. Stripping unconditionally was itself a bug: it also
    // erased genuine positional dashes ahead of unlabeled content,
    // making that content look like it happened at the very start of
    // the block instead of wherever it actually falls — verified this
    // directly against a real OCR read where it produced exactly that:
    // a later note reordered ahead of the block's true first note.
    const withoutRoundingArtifact = chars.join('').replace(/^-+(?=[A-Ga-g][#b]?\|)/, '');
    return withoutRoundingArtifact;
  });
}

// OCR fallback for a PDF with no real text layer (a scanned/rasterized
// tab image, see pdfTextExtractor.js's own top comment on why
// extractPdfTextRows alone can't handle that case). `onProgress(fraction)`
// reports 0-1 across all pages combined, since a multi-page tab can take
// a while — Tesseract's own per-line progress is folded into that overall
// fraction rather than resetting per line, so a progress bar reads as
// continuous.
export async function ocrPdfToTextRows(file, { onProgress } = {}) {
  const pdf = await loadPdfDocument(file);
  const worker = await createWorker('eng', 1, {});
  await worker.setParameters({
    tessedit_char_whitelist: TAB_CHAR_WHITELIST,
    // SPARSE_TEXT (not SINGLE_LINE) — a quiet line's isolated digit
    // groups need to come back as separate word-level regions (each
    // with its own bounding box) for reconstructBlockRows to place
    // correctly; SINGLE_LINE instead forces the whole line into one
    // guess, which is exactly what a mostly-blank line reads badly as.
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
  });

  const rows = [];
  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const canvas = await withTimeout(renderPageToCanvas(page), PAGE_TIMEOUT_MS, `Page ${pageNum} took too long to render.`);
      const bands = detectLineBands(canvas);

      // Recognized a full BLOCK (STRINGS_PER_BLOCK bands) at a time —
      // reconstructBlockRows needs every string's words up front to
      // measure one shared character width/origin across all of them
      // (see its own comment on why that's what keeps two strings'
      // notes correctly aligned to the same moment, not just correctly
      // ordered within each string on its own).
      for (let blockStart = 0; blockStart < bands.length; blockStart += STRINGS_PER_BLOCK) {
        const blockBands = bands.slice(blockStart, blockStart + STRINGS_PER_BLOCK);
        const perLineWords = [];
        for (let i = 0; i < blockBands.length; i++) {
          const lineCanvas = cropBand(canvas, blockBands[i]);
          const words = await withTimeout(
            recognizeLineWords(worker, lineCanvas),
            PAGE_TIMEOUT_MS,
            `Page ${pageNum}, line ${blockStart + i + 1} took too long to read.`
          );
          perLineWords.push(words);

          const pageStart = (pageNum - 1) / pdf.numPages;
          const pageSpan = 1 / pdf.numPages;
          onProgress?.(pageStart + ((blockStart + i + 1) / Math.max(bands.length, 1)) * pageSpan);
        }

        if (blockStart > 0) rows.push('');
        for (const line of reconstructBlockRows(perLineWords)) {
          // An entirely blank string-line (nothing recognized at all —
          // a genuinely legitimate, common result: most strings in a
          // lead riff just aren't played) still needs to occupy its OWN
          // row, not an actually-empty one — tabPdfParser.js's
          // groupRows() uses a truly blank row to mean "end of this
          // 6-line block," so pushing '' here would make a quiet string
          // look like a phrase break and silently drop the rest of the
          // block along with it.
          rows.push(line.trim() === '' ? '-' : line);
        }
      }

      rows.push('');
    }
  } finally {
    await worker.terminate();
  }

  return rows;
}
