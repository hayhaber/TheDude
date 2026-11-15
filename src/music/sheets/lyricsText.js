// A song's words for the singer (Stage, v1.0.206): plain text the singer
// pastes, writes, brings from the Songwriter or pulls out of a chart PDF.
//   [Verse] / [פזמון]      a line alone in brackets that isn't a chord = a section
//   [Am]words [F]more      a chord over the word after it (ChordPro style)
//   {breathe}              a stage note (its own line, or inside a line)
//   blank line             a new section (no name)
// Text copied from tab sites puts the chords on a line of their own above
// the words: for a Latin line they are moved into it by their column; a
// Hebrew line keeps its chord line above it as is (its columns run the
// other way and can't be trusted). Pure — no DOM.
import { isChord, isChordLine } from './chartChords';

const LABEL_WORDS =
  /^(?:verse|chorus|pre-?chorus|bridge|intro|outro|interlude|solo|hook|coda|tag|refrain|instrumental|בית|פזמון|קדם[-־ ]?פזמון|גשר|פתיחה|סיום|מעבר|סולו|פזמון חוזר)(?:\s*\d+)?\s*:?$/i;
const HEBREW = /[֐-׿]/;

const tokensOf = (line) => line.trim().split(/\s+/).filter(Boolean);

/** A line that is only a section name: "[Chorus]", "Verse 2:", "פזמון". */
export function labelOf(line) {
  const s = line.trim();
  const m = /^\[([^\]]{1,40})\]:?$/.exec(s);
  if (m && !isChord(m[1].trim())) return m[1].trim();
  if (LABEL_WORDS.test(s)) return s.replace(/:$/, '').trim();
  return null;
}

/** A line of chords only (tab-site style), outside brackets. */
function isBareChordLine(line) {
  if (/\[|\{/.test(line)) return false;
  const tk = tokensOf(line);
  return tk.length > 0 && isChordLine(tk);
}

/**
 * Tab-site text (a chord line above a Latin lyric line) -> chords in
 * brackets inside the lyric line, by column. Other lines are kept.
 */
export function mergeChordLines(text) {
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const next = lines[i + 1];
    if (isBareChordLine(line) && next != null && next.trim() && !isBareChordLine(next) && !labelOf(next) && !HEBREW.test(next) && !/\[/.test(next)) {
      const marks = [];
      const re = /\S+/g;
      let m;
      while ((m = re.exec(line))) if (isChord(m[0])) marks.push({ at: m.index, chord: m[0] });
      let words = next;
      if (words.length < line.length) words = words.padEnd(line.length, ' ');
      for (const mk of marks.sort((a, b) => b.at - a.at)) {
        // the chord goes in front of the word it sits on
        let at = mk.at;
        // over a space: the word after it; inside a word: its start
        if (words[at] === ' ') {
          while (at < words.length && words[at] === ' ') at += 1;
        } else {
          while (at > 0 && words[at - 1] !== ' ') at -= 1;
        }
        words = words.slice(0, at) + `[${mk.chord}]` + words.slice(at);
      }
      out.push(words.replace(/\s+$/, ''));
      i += 1;
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

/** One lyric line -> {words: [{chord, text}], notes: [string]}. */
function parseWords(line) {
  const notes = [];
  const clean = line.replace(/\{([^}]*)\}/g, (_, n) => {
    if (n.trim()) notes.push(n.trim());
    return ' ';
  });
  const words = [];
  const re = /\[([^\]]*)\]|([^[]+)/g;
  let m;
  let pending = null;
  while ((m = re.exec(clean))) {
    if (m[1] != null) {
      if (pending != null) words.push({ chord: pending, text: '' });
      pending = m[1].trim() || null;
      continue;
    }
    const parts = m[2].split(/(\s+)/);
    for (const p of parts) {
      if (!p) continue;
      if (/^\s+$/.test(p)) {
        if (pending != null) {
          words.push({ chord: pending, text: '' });
          pending = null;
        }
        continue;
      }
      words.push({ chord: pending, text: p });
      pending = null;
    }
  }
  if (pending != null) words.push({ chord: pending, text: '' });
  return { words, notes };
}

/**
 * The text -> sections [{label, lines}]; a line = {kind:'words', words}
 * | {kind:'note', text} | {kind:'chords', chords}.
 */
export function parseLyrics(text) {
  const lines = mergeChordLines(text).split('\n');
  const sections = [];
  let cur = null;
  const open = (label = null) => {
    cur = { label, lines: [] };
    sections.push(cur);
  };
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) {
      if (cur && cur.lines.length) cur = null;
      continue;
    }
    const label = labelOf(line);
    if (label) {
      open(label);
      continue;
    }
    if (!cur) open();
    const note = /^\s*\{([^}]*)\}\s*$/.exec(line);
    if (note) {
      if (note[1].trim()) cur.lines.push({ kind: 'note', text: note[1].trim() });
      continue;
    }
    if (isBareChordLine(line)) {
      cur.lines.push({ kind: 'chords', chords: tokensOf(line).filter(isChord) });
      continue;
    }
    const { words, notes } = parseWords(line);
    if (words.length) cur.lines.push({ kind: 'words', words });
    for (const n of notes) cur.lines.push({ kind: 'note', text: n });
  }
  return sections.filter((s) => s.lines.length || s.label);
}

/** Every chord of the text, in order. */
export function chordsOf(sections) {
  const out = [];
  for (const s of sections)
    for (const l of s.lines) {
      if (l.kind === 'chords') out.push(...l.chords);
      if (l.kind === 'words') for (const w of l.words) if (w.chord) out.push(w.chord);
    }
  return out;
}

/** The words of the text, plain (no chords / notes): for counting / search. */
export function hasWords(text) {
  return parseLyrics(text).some((s) => s.lines.some((l) => l.kind === 'words' && l.words.some((w) => w.text)));
}

/**
 * A Songwriter song -> the stage text + the first sung note (midi or null).
 * `kindName(kind)` names a section in the app's language.
 */
export function songToLyrics(song, kindName = (k) => k) {
  const blocks = [];
  let first = null;
  for (const sec of song?.sections ?? []) {
    const lines = (sec.lines ?? []).map((l) => String(l.raw ?? '').replace(/\s+$/, '')).filter((x) => x.trim());
    if (!lines.length) continue;
    blocks.push([`[${kindName(sec.kind)}]`, ...lines].join('\n'));
    if (first == null)
      for (const l of sec.lines ?? []) {
        const n = (l.melody?.notes ?? []).slice().sort((a, b) => a.s - b.s)[0];
        if (n) {
          first = n.p;
          break;
        }
      }
  }
  return { text: blocks.join('\n\n'), start: first };
}

/**
 * The text runs of a PDF page (getTextContent().items) -> lines of text,
 * top to bottom. Runs on one baseline are joined, left to right — reversed
 * for a Hebrew line (pdf.js gives a Hebrew run in reading order, but the
 * runs of a line come by their place on the page).
 */
export function pdfLines(items) {
  const runs = items
    .filter((it) => it.str && it.str.trim() && Math.abs(it.transform[1]) < 0.01 && Math.abs(it.transform[2]) < 0.01)
    .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, size: Math.hypot(it.transform[2], it.transform[3]) || it.height || 10 }));
  const lines = [];
  for (const r of runs.sort((a, b) => b.y - a.y || a.x - b.x)) {
    const line = lines.find((l) => Math.abs(l.y - r.y) <= Math.max(1.5, r.size * 0.25));
    if (line) line.runs.push(r);
    else lines.push({ y: r.y, size: r.size, runs: [r] });
  }
  const out = [];
  let lastY = null;
  let lastSize = 10;
  for (const l of lines) {
    const runsX = l.runs.sort((a, b) => a.x - b.x);
    const heb = runsX.some((r) => HEBREW.test(r.str));
    let s = '';
    let end = null;
    for (const r of heb ? [...runsX].reverse() : runsX) {
      if (end != null) {
        const gap = heb ? end - (r.x + r.w) : r.x - end;
        s += ' '.repeat(Math.max(gap > r.size * 0.15 ? 1 : 0, Math.min(40, Math.round(gap / (r.size * 0.5)))));
      }
      s += r.str;
      end = heb ? r.x : r.x + r.w;
    }
    // a wide gap between lines = a new section
    if (lastY != null && lastY - l.y > lastSize * 2.2) out.push('');
    out.push(s.replace(/\s+$/, ''));
    lastY = l.y;
    lastSize = l.size;
  }
  return out;
}
