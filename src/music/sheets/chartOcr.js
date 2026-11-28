// The words + chords of a chart that holds NO text (v1.0.292): a scan, a phone
// photo, a PDF printed as shapes. The pages are drawn to JPEG here and read by
// Claude through our server (api/chart-ocr.js — the key lives on Vercel, only
// signed-in users). The result becomes the song's words (words view, Key
// stepper over the words, the editor to fix it).
import { loadPdfDocument } from '../pdfTextExtractor';
import { getSheet, setSheetLyrics } from './sheetStore';

const MAX_PAGES = 8;
const BUDGET = 3.6e6; // characters of base64 — under Vercel's 4.5 MB body

export class OcrError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code; // 'setup' | 'signin' | 'offline' | 'empty' | 'error'
  }
}

async function pagesOf(blob) {
  const doc = await loadPdfDocument(blob);
  const out = [];
  try {
    const n = Math.min(doc.numPages, MAX_PAGES);
    for (let i = 1; i <= n; i += 1) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      // ~1500 px wide (small chords stay readable), never above 2400 tall
      const scale = Math.min(1500 / base.width, 2400 / base.height, 4);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const g = canvas.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: g, viewport }).promise;
      out.push(canvas);
    }
  } finally {
    doc.destroy?.();
  }
  // fit the request: lower the JPEG quality, then the size
  for (const [q, shrink] of [[0.82, 1], [0.7, 1], [0.6, 0.8], [0.55, 0.65]]) {
    const urls = out.map((c) => {
      if (shrink === 1) return c.toDataURL('image/jpeg', q);
      const s = document.createElement('canvas');
      s.width = Math.round(c.width * shrink);
      s.height = Math.round(c.height * shrink);
      s.getContext('2d').drawImage(c, 0, 0, s.width, s.height);
      return s.toDataURL('image/jpeg', q);
    });
    const data = urls.map((u) => u.replace(/^data:image\/jpeg;base64,/, ''));
    if (data.reduce((a, d) => a + d.length, 0) <= BUDGET || shrink < 0.7) return data;
  }
  return [];
}

async function token() {
  const { getLink } = await import('../../cloud/cloudState');
  if (!getLink()) return null;
  const { cloudClient } = await import('../../cloud/cloudSync');
  return (await cloudClient().auth.getSession()).data?.session?.access_token ?? null;
}

/** The chart's words (text in the app's format) — throws OcrError. */
export async function readChart(blob, name = '') {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new OcrError('offline');
  const tk = await token();
  if (!tk) throw new OcrError('signin');
  const pages = await pagesOf(blob);
  if (!pages.length) throw new OcrError('empty');
  let r;
  try {
    r = await fetch('/api/chart-ocr', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tk },
      body: JSON.stringify({ pages, name }),
    });
  } catch (e) {
    throw new OcrError('offline', e?.message);
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 503 && data.setup) throw new OcrError('setup');
  if (r.status === 401) throw new OcrError('signin');
  if (!r.ok) throw new OcrError('error', data.error || 'status ' + r.status);
  const text = String(data.text || '').trim();
  if (!text) throw new OcrError('empty');
  return text;
}

// ---- one song at a time, watched by the screens --------------------------------------

let state = { busy: [], last: null }; // last = {id, ok, code}
const subs = new Set();
const set = (p) => {
  state = { ...state, ...p };
  subs.forEach((fn) => fn());
};
export const ocrState = () => state;
export function onOcr(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** Read a song's chart and make it the song's words (only when it has none,
    unless `force`). Resolves true when words were written. */
export async function readChartWords(id, { force = false } = {}) {
  if (state.busy.includes(id)) return false;
  const rec = await getSheet(id);
  if (!rec?.blob || (!force && (rec.lyrics || '').trim())) return false;
  set({ busy: [...state.busy, id] });
  try {
    const text = await readChart(rec.blob, rec.name);
    const now = await getSheet(id);
    if (!force && (now?.lyrics || '').trim()) return false; // typed meanwhile
    await setSheetLyrics(id, text);
    set({ last: { id, ok: true, at: Date.now() } });
    return true;
  } catch (e) {
    set({ last: { id, ok: false, code: e?.code || 'error', at: Date.now() } });
    return false;
  } finally {
    set({ busy: state.busy.filter((x) => x !== id) });
  }
}
