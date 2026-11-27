// The words + chords inside a chart PDF (v1.0.283): a PDF that holds TEXT
// (Tab4u / Ultimate Guitar prints, an export from Word…) carries its lyrics
// and chords — they are taken out when the chart is added, so the song has
// its words view and its editor at once. A scan / photo has no text: ''.
import { loadPdfDocument } from '../pdfTextExtractor';
import { pdfLines } from './lyricsText';

const LETTERS = /\p{L}{2,}/u;

/** All the PDF's lines (pages split by a blank line); `song` = only when it
    reads like a song — at least 3 lines of words — else ''. */
export async function pdfWords(blob, { song = false } = {}) {
  const doc = await loadPdfDocument(blob);
  const pages = [];
  try {
    for (let i = 1; i <= doc.numPages; i += 1) {
      const c = await (await doc.getPage(i)).getTextContent();
      pages.push(pdfLines(c.items).join('\n'));
    }
  } finally {
    doc.destroy?.();
  }
  const all = pages.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!song) return all;
  const wordy = all.split('\n').filter((l) => LETTERS.test(l)).length;
  return wordy >= 3 ? all : '';
}
