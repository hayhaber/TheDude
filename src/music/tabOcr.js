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

// A mostly-blank tab line (all filler dashes, one or two lonely fret
// numbers far apart) reads completely differently to Tesseract than a
// busy one: SPARSE_TEXT mode's own layout analysis treats the isolated
// digit groups as separate disconnected text regions rather than one
// line, so its plain `text` output comes back fragmented — verified
// directly against real content. Reassembling it from each region's own
// word-level bounding box position gets the digits back in roughly the
// right column; anything below `minConfidence` is discarded rather than
// kept as noise, since a low-confidence guess on what's overwhelmingly
// likely to just be another "-" is worse than assuming "-".
function reconstructFromWords(words, minConfidence = 50) {
  const good = words.filter((w) => w.confidence >= minConfidence && w.text.trim());
  if (good.length === 0) return '';
  const widthSamples = good.filter((w) => w.text.length >= 2).map((w) => (w.bbox.x1 - w.bbox.x0) / w.text.length);
  const charWidth = widthSamples.length ? median(widthSamples) : 10;
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
  // Trailing dashes are legitimate (real filler); a LEADING dash is
  // always a reconstruction rounding artifact (a real tab line always
  // starts at its string-label letter, never a dash before it) and
  // would otherwise stop tabPdfParser.js's own line-format regex from
  // recognizing this as a valid string line at all.
  return chars.join('').replace(/^-+/, '');
}

// Recognizes one already-cropped, single-string-line image. A busy line
// (lots of digits/symbols close together) stays as one coherent run in
// Tesseract's own plain-text output — used as-is, since it's already
// reliable. A quiet line doesn't (see reconstructFromWords's own
// comment) — detected by the plain text coming back as more than one
// line, and rebuilt from word positions instead.
async function recognizeLine(worker, lineCanvas) {
  const { data } = await worker.recognize(lineCanvas, {}, { blocks: true });
  const plain = data.text.trim();
  if (plain.length > 0 && !plain.includes('\n')) return plain;
  const words = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)));
  return reconstructFromWords(words);
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
    // SPARSE_TEXT (not SINGLE_LINE) — the case this is actually tuned
    // for (a busy line staying one coherent run vs. a quiet line
    // fragmenting into separate regions) only shows up under SPARSE_TEXT;
    // SINGLE_LINE forces everything into one guess either way, at the
    // cost of exactly the sparse-line accuracy recognizeLine() recovers.
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
  });

  const rows = [];
  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const canvas = await withTimeout(renderPageToCanvas(page), PAGE_TIMEOUT_MS, `Page ${pageNum} took too long to render.`);
      const bands = detectLineBands(canvas);

      for (let i = 0; i < bands.length; i++) {
        // A fresh blank row every STRINGS_PER_BLOCK lines — bands are
        // already grouped into fixed 6-line blocks by detectLineBands,
        // so the block boundary is just "every 6th band," no separate
        // gap-based inference needed here.
        if (i > 0 && i % STRINGS_PER_BLOCK === 0) rows.push('');

        const lineCanvas = cropBand(canvas, bands[i]);
        const line = await withTimeout(
          recognizeLine(worker, lineCanvas),
          PAGE_TIMEOUT_MS,
          `Page ${pageNum}, line ${i + 1} took too long to read.`
        );
        // An entirely blank string-line (nothing recognized at all — a
        // genuinely legitimate, common result: most strings in a lead
        // riff just aren't played) still needs to occupy its OWN row, not
        // an actually-empty one — tabPdfParser.js's groupRows() uses a
        // truly blank row to mean "end of this 6-line block," so pushing
        // '' here would make a quiet string look like a phrase break and
        // silently drop the rest of the block along with it.
        rows.push(line.trim() === '' ? '-' : line);

        const pageStart = (pageNum - 1) / pdf.numPages;
        const pageSpan = 1 / pdf.numPages;
        onProgress?.(pageStart + ((i + 1) / Math.max(bands.length, 1)) * pageSpan);
      }

      rows.push('');
    }
  } finally {
    await worker.terminate();
  }

  return rows;
}
