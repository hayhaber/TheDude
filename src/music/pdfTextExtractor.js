import * as pdfjsLib from 'pdfjs-dist';
// Vite-friendly way to point pdf.js at its own worker script — bundles the
// worker as a separate asset and gives us a real URL to it, instead of
// pdf.js's default (which assumes a CDN or a specific public/ path).
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// A typical monospace character's width, in PDF points, at the font sizes
// these tab exports use (~10-11pt monospace) — used only to convert an x
// position into an approximate character column so two text runs on the
// same row land in the right place relative to each other. Doesn't need to
// be exact: the tab parser only cares about ORDER and rough alignment
// between simultaneous notes on different string-lines, not pixel-perfect
// spacing.
const APPROX_CHAR_WIDTH_PT = 5.3;

// Reconstructs each page as an array of plain-text ROWS, preserving
// horizontal spacing — pdf.js's own text items are already broken into
// runs at roughly their real x/y position, but simply concatenating them
// collapses whitespace, which destroys an ASCII tab's column alignment
// (the whole point of "Eb|----15--" is that the "15" sits directly above
// the beat it's played on). Grouping items by y (row) and padding gaps
// between runs with spaces based on their x position keeps that alignment
// intact well enough for the tab parser to read fret numbers back out in
// the right relative position.
export async function extractPdfTextRows(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const rows = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Group text items into rows by y (rounded — pdf.js sometimes reports
    // sub-pixel y differences for items that are visually on the same
    // baseline).
    const rowsByY = new Map();
    for (const item of content.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!rowsByY.has(y)) rowsByY.set(y, []);
      rowsByY.get(y).push({ x, str: item.str });
    }

    // pdf.js's y axis grows upward — sort rows top-to-bottom (descending y)
    // to match reading order, matching each row's items left-to-right.
    const sortedYs = [...rowsByY.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const items = rowsByY.get(y).sort((a, b) => a.x - b.x);
      let line = '';
      let col = 0;
      for (const { x, str } of items) {
        const targetCol = Math.max(col, Math.round(x / APPROX_CHAR_WIDTH_PT));
        if (targetCol > line.length) line += ' '.repeat(targetCol - line.length);
        line += str;
        col = line.length;
      }
      rows.push(line);
    }
    rows.push(''); // blank separator between pages, same as a blank line within a page
  }

  return rows;
}
