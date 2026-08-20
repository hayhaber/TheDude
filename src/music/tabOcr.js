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

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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

// Finds each horizontal band of dark pixels (one visual text LINE) via a
// row-darkness profile — classic line-segmentation-by-projection. Doing
// this ourselves and OCRing each line SEPARATELY (see the caller) beats
// handing Tesseract the whole page at once: tab notation is almost
// entirely long runs of "-" with no spaces, and Tesseract's own page-
// layout analysis tends to misread six of those stacked tightly together
// as a table/ruled-line graphic rather than six lines of text, badly
// degrading — sometimes to nothing at all — recognition of the digits
// actually mixed into those lines. One line at a time has no neighboring
// lines to get confused with.
function median(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Raw pass: any row with at least one dark pixel counts as "inside a
// line" — a "-" character is thin and a mostly-unplayed string line (a
// long run of dashes, no digits) has far less ink than a line full of
// fret numbers, so a stricter per-row pixel-count threshold reliably
// finds the busy lines but silently loses the quiet ones entirely
// (verified against a real tab: the one digit-heavy line came through
// perfectly, the other five collapsed into a single blob). A gap only
// ends a band after 2 consecutive all-white rows, so a single stray
// anti-aliasing pixel-row doesn't fracture one real line into two.
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

// Real tab notation is a rigid grid — every string-line in a block is the
// SAME height, at the SAME fixed pitch, monospace font — so once the
// raw pass above finds a handful of reliably-detected (busy) lines to
// measure that pitch from, any band or gap that's a multiple of it too
// TALL almost certainly swallowed one or more quiet lines the raw pass
// couldn't see on their own, rather than genuinely being one unusually
// tall line or one unusually large gap. Splitting/filling those evenly
// recovers the lines the pixel-darkness pass alone silently drops.
function detectLineBands(canvas) {
  const rawBands = detectRawBands(canvas);
  if (rawBands.length < 3) return rawBands;

  // The reference "one line" height comes from the SMALLEST bands, not
  // the median of all of them — a band that's actually several merged
  // lines is always taller than a real single line, so including it
  // would drag the "typical" height up and mask exactly the anomaly
  // this is meant to catch (verified: with only a couple of bands, a
  // plain median gets skewed enough by one merged band that it no
  // longer looks anomalous relative to itself).
  const heights = rawBands.map(([y0, y1]) => y1 - y0);
  const gaps = [];
  for (let i = 1; i < rawBands.length; i++) gaps.push(rawBands[i][0] - rawBands[i - 1][1]);
  const smallestHalf = [...heights].sort((a, b) => a - b).slice(0, Math.max(1, Math.ceil(heights.length / 2)));
  const medianHeight = median(smallestHalf);
  const medianGap = median(gaps.filter((g) => g > 0)) || medianHeight;
  const linePitch = medianHeight + medianGap;
  if (linePitch <= 0) return rawBands;

  const bands = [];
  for (let i = 0; i < rawBands.length; i++) {
    const [y0, y1] = rawBands[i];
    const height = y1 - y0;
    const extraLines = Math.round(height / linePitch) - 1;
    if (extraLines > 0 && extraLines <= 8) {
      // This one band is actually N lines merged together — slice it
      // into N evenly-sized pieces instead of one oversized crop.
      const sliceHeight = height / (extraLines + 1);
      for (let s = 0; s <= extraLines; s++) bands.push([Math.round(y0 + s * sliceHeight), Math.round(y0 + (s + 1) * sliceHeight)]);
    } else {
      bands.push([y0, y1]);
    }

    if (i < rawBands.length - 1) {
      const gap = rawBands[i + 1][0] - y1;
      const missingLines = Math.round(gap / linePitch) - 1;
      if (missingLines > 0 && missingLines <= 8) {
        // A suspiciously large GAP instead — one or more quiet lines
        // that never crossed the darkness threshold at all, estimated
        // into place at the same fixed pitch.
        const sliceHeight = gap / (missingLines + 1);
        for (let s = 1; s <= missingLines; s++) {
          const estStart = Math.round(y1 + s * sliceHeight - medianHeight / 2);
          bands.push([Math.max(0, estStart), estStart + Math.round(medianHeight)]);
        }
      }
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

// Turns a page's detected line-bands into text ROWS with blank-line
// separators between phrase groups — a big vertical gap between one
// band's bottom and the next band's top (paragraph spacing) reads as a
// group boundary, same as an actual blank line would in a real text
// layer; the tight, near-uniform gaps BETWEEN a phrase's own 6 string-
// lines don't trigger it. Falls back to no separators (one continuous
// group) if there's nothing to compare against.
function insertGroupBreaks(bands, rows) {
  if (bands.length < 2) return rows;
  const gaps = [];
  for (let i = 1; i < bands.length; i++) gaps.push(bands[i][0] - bands[i - 1][1]);
  const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
  const breakThreshold = avgGap * 1.8;

  const out = [rows[0]];
  for (let i = 1; i < rows.length; i++) {
    if (gaps[i - 1] > breakThreshold) out.push('');
    out.push(rows[i]);
  }
  return out;
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
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
  });

  const rows = [];
  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const canvas = await withTimeout(renderPageToCanvas(page), PAGE_TIMEOUT_MS, `Page ${pageNum} took too long to render.`);
      const bands = detectLineBands(canvas);

      const pageRows = [];
      for (let i = 0; i < bands.length; i++) {
        const lineCanvas = cropBand(canvas, bands[i]);
        const { data } = await withTimeout(
          worker.recognize(lineCanvas),
          PAGE_TIMEOUT_MS,
          `Page ${pageNum}, line ${i + 1} took too long to read.`
        );
        pageRows.push(data.text.replace(/\n/g, '').trimEnd());

        const pageStart = (pageNum - 1) / pdf.numPages;
        const pageSpan = 1 / pdf.numPages;
        onProgress?.(pageStart + ((i + 1) / Math.max(bands.length, 1)) * pageSpan);
      }

      rows.push(...insertGroupBreaks(bands, pageRows), '');
    }
  } finally {
    await worker.terminate();
  }

  return rows;
}
