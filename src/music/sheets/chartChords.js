// Chords inside a chart PDF (the Stage, v1.0.176). A PDF exported from a
// text program keeps its words as text: pdf.js gives every run with its
// place on the page. A line counts as a CHORD LINE when nearly all its
// words are chord symbols (lyrics lines fail: their words aren't chords),
// so "A" in a lyric is never taken for a chord. Pure — no pdf.js import:
// it works on getTextContent()'s items and a measuring function.

const NOTE = '[A-G](?:#|b|♯|♭)?';
const QUAL = '(?:maj|Maj|MAJ|min|mi|m|M|dim|aug|sus|add|°|ø|\\+|-|Δ)?';
const EXT = '(?:\\d{1,2})?(?:(?:maj|sus|add|b|#|♭|♯|\\+|-|no)\\d{1,2})*';
const PAREN = '(?:\\([^)\\s]{1,12}\\))?';
const CHORD_RE = new RegExp(`^${NOTE}${QUAL}${EXT}${PAREN}(?:\\/${NOTE})?$`);
// Things on a chord line that are neither chords nor words.
const NEUTRAL_RE = /^(?:\||\|\||:\|\||\|\|:|\/|%|-+|x\d+|\d+x|\(|\)|N\.?C\.?|\.{2,}|[|:]+)$/i;

/** Strip the brackets / bars a chart may wrap a chord in: "(Am)", "|G". */
function core(token) {
  let c = token.replace(/^[|[]+/, '').replace(/[|\],.]+$/, '');
  // a wrapping "(Am)" — but keep a chord's own "(#9)"
  if (c.startsWith('(') && c.endsWith(')')) c = c.slice(1, -1);
  return c;
}

export function isChord(token) {
  const c = core(token);
  return c.length > 0 && c.length <= 14 && CHORD_RE.test(c);
}

/** A line of tokens is a chord line: >= 1 chord, chords >= 75 % of words. */
export function isChordLine(tokens) {
  let chords = 0;
  let words = 0;
  for (const tk of tokens) {
    if (NEUTRAL_RE.test(tk)) continue;
    if (isChord(tk)) chords += 1;
    else if (/[\p{L}]/u.test(tk)) words += 1;
  }
  return chords > 0 && chords / (chords + words) >= 0.75;
}

/**
 * The chords on one page. `items` = getTextContent().items, `measure(str,
 * size)` = text width in the same units (a canvas measureText scaled so the
 * whole run matches the item's own width). Returns [{text, x, y, w, size}]
 * in PDF user units: x / y = the baseline start, size = font size.
 */
export function chordsOnPage(items, measure) {
  // horizontal text only, grouped into lines by baseline
  const runs = items
    .filter((it) => it.str && it.str.trim() && Math.abs(it.transform[1]) < 0.01 && Math.abs(it.transform[2]) < 0.01)
    .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, size: Math.hypot(it.transform[2], it.transform[3]) || it.height || 10 }));
  const lines = [];
  for (const r of runs.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((l) => Math.abs(l.y - r.y) <= Math.max(1.5, r.size * 0.25));
    if (line) line.runs.push(r);
    else lines.push({ y: r.y, runs: [r] });
  }
  const out = [];
  for (const line of lines) {
    const tokens = [];
    for (const r of line.runs) {
      const full = measure(r.str, r.size) || 1;
      const k = r.w > 0 ? r.w / full : 1;
      const re = /\S+/g;
      let m;
      while ((m = re.exec(r.str))) {
        tokens.push({ text: m[0], x: r.x + measure(r.str.slice(0, m.index), r.size) * k, y: r.y, w: measure(m[0], r.size) * k, size: r.size });
      }
    }
    if (!isChordLine(tokens.map((t) => t.text))) continue;
    for (const tk of tokens) if (isChord(tk.text)) out.push(tk);
  }
  return out;
}

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function pcOf(note) {
  let pc = PC[note[0]];
  for (const ch of note.slice(1)) pc += ch === '#' || ch === '♯' ? 1 : -1;
  return (pc + 12) % 12;
}

/** Flats or sharps for a chart moved to `semitones` away: by its new key,
 *  read from the first chord (major keys F Bb Eb Ab Db Gb, minor keys
 *  Dm Gm Cm Fm Bbm Ebm take flats). */
export function flatsFor(firstChord, semitones) {
  const m = /^([A-G](?:#|b|♯|♭)?)(m(?!aj))?/.exec(core(firstChord || ''));
  if (!m) return false;
  const pc = (pcOf(m[1]) + semitones + 120) % 12;
  return m[2] ? [2, 7, 0, 5, 10, 3].includes(pc) : [5, 10, 3, 8, 1, 6].includes(pc);
}

/** "F#m7/C#" moved by n semitones (brackets / bars around it kept). */
export function transposeChord(token, n, flats = false) {
  if (!n) return token;
  const names = flats ? FLATS : SHARPS;
  return token.replace(/([A-G](?:#|b|♯|♭)?)(?=[^A-Za-z]|m|M|maj|min|dim|aug|sus|add|$)/g, (note, _x, offset, whole) => {
    // only a root (start, after a bracket / bar) or a bass (after "/")
    const before = whole[offset - 1];
    if (offset > 0 && !/[\s/|([]/.test(before)) return note;
    return names[(pcOf(note) + n + 120) % 12];
  });
}

/** The key name a chart is in, read from its first chord ("G", "Em"). */
export function keyOf(firstChord, n = 0) {
  const m = /^([A-G](?:#|b|♯|♭)?)(m(?!aj))?/.exec(core(firstChord || ''));
  if (!m) return null;
  const flats = flatsFor(firstChord, n);
  return (flats ? FLATS : SHARPS)[(pcOf(m[1]) + n + 120) % 12] + (m[2] ? 'm' : '');
}
