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

// Groups OCR words into rows by y-position (clustering by proximity to a
// row's running average, since OCR word boxes on the same visual line
// still jitter a few pixels vertically) and reconstructs each row's text
// with spacing derived from the page's own average character width — an
// OCR word's bbox gives real pixel width for real recognized characters,
// which is a better column estimate here than a guessed constant (unlike
// pdfTextExtractor.js's PDF-point case, OCR render scale can vary run to
// run).
function wordsToRows(words) {
  if (words.length === 0) return [];

  const charWidths = words
    .filter((w) => w.text.trim().length > 0)
    .map((w) => (w.bbox.x1 - w.bbox.x0) / w.text.length);
  const avgCharWidth = charWidths.reduce((sum, w) => sum + w, 0) / charWidths.length || 10;

  const heights = words.map((w) => w.bbox.y1 - w.bbox.y0);
  const avgHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length || 10;
  const rowTolerance = avgHeight * 0.6;

  const sorted = [...words].sort((a, b) => (a.bbox.y0 + a.bbox.y1) / 2 - (b.bbox.y0 + b.bbox.y1) / 2);
  const rowGroups = [];
  for (const word of sorted) {
    const yCenter = (word.bbox.y0 + word.bbox.y1) / 2;
    const lastRow = rowGroups[rowGroups.length - 1];
    if (lastRow && Math.abs(yCenter - lastRow.yCenter) <= rowTolerance) {
      lastRow.words.push(word);
      lastRow.yCenter = (lastRow.yCenter * lastRow.words.length + yCenter) / (lastRow.words.length + 1);
    } else {
      rowGroups.push({ yCenter, words: [word] });
    }
  }

  return rowGroups.map(({ words: rowWords }) => {
    const ordered = [...rowWords].sort((a, b) => a.bbox.x0 - b.bbox.x0);
    let line = '';
    for (const w of ordered) {
      const targetCol = Math.max(line.length, Math.round(w.bbox.x0 / avgCharWidth));
      if (targetCol > line.length) line += ' '.repeat(targetCol - line.length);
      line += w.text;
    }
    return line;
  });
}

// OCR fallback for a PDF with no real text layer (a scanned/rasterized
// tab image, see App's own top comment on why extractPdfTextRows alone
// can't handle that case). `onProgress(fraction)` reports 0-1 across all
// pages combined, since a multi-page tab can take a while — Tesseract's
// own per-page progress is folded into that overall fraction rather than
// resetting to 0 each page, so a progress bar reads as continuous.
export async function ocrPdfToTextRows(file, { onProgress } = {}) {
  const pdf = await loadPdfDocument(file);
  // Reassigned per-page below so the logger (set up once, fired
  // repeatedly by Tesseract as it works through EACH page) always folds
  // its 0-1-per-page progress into that page's own slice of the overall
  // 0-1 range — otherwise a progress bar would restart at 0% every page.
  let reportPageProgress = () => {};
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') reportPageProgress(m.progress);
    },
  });
  await worker.setParameters({
    tessedit_char_whitelist: TAB_CHAR_WHITELIST,
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
  });

  const rows = [];
  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const pageStart = (pageNum - 1) / pdf.numPages;
      const pageSpan = 1 / pdf.numPages;
      reportPageProgress = (pageFraction) => onProgress?.(pageStart + pageFraction * pageSpan);

      const page = await pdf.getPage(pageNum);
      const canvas = await withTimeout(renderPageToCanvas(page), PAGE_TIMEOUT_MS, `Page ${pageNum} took too long to render.`);
      const { data } = await withTimeout(worker.recognize(canvas), PAGE_TIMEOUT_MS, `Page ${pageNum} took too long to read.`);
      const pageRows = wordsToRows(data.words ?? []);
      rows.push(...pageRows, '');
    }
  } finally {
    await worker.terminate();
  }

  return rows;
}
