// Lyric lines for the Songwriter: chords inside the text (ChordPro style,
// "[Am]words"), words, syllables (English + Hebrew, with or without nikud)
// and end rhymes. Pure — no DOM.
//
// Syllables are an ESTIMATE the writer can override: unpointed Hebrew
// doesn't show its vowels ("ספר" = sefer / sapar / sfar), so the split is a
// guess from the vowel letters (matres lectionis ו / י, a final ה / א) that
// the line's syllable field lets the writer correct with hyphens.

const HEB_LETTER = /[א-ת]/;
const HEB_MARKS = /[֑-ׇ]/g;
const LATIN_VOWEL = /[aeiouy]/i;

// ---- chords inside the text ------------------------------------------------

/**
 * "[Am]Hello [F]world" -> { text: "Hello world", chords: [{ at: 0, symbol:
 * "Am" }, { at: 6, symbol: "F" }] } — `at` = index in `text`.
 */
export function parseLine(raw) {
  const s = String(raw ?? '');
  const chords = [];
  let text = '';
  let i = 0;
  while (i < s.length) {
    if (s[i] === '[') {
      const end = s.indexOf(']', i + 1);
      if (end > i) {
        const symbol = s.slice(i + 1, end).trim();
        if (symbol) chords.push({ at: text.length, symbol });
        i = end + 1;
        continue;
      }
    }
    text += s[i];
    i += 1;
  }
  return { text, chords };
}

/** The inverse of parseLine. */
export function joinLine(text, chords) {
  const sorted = [...chords].sort((a, b) => a.at - b.at);
  let out = '';
  let k = 0;
  for (let i = 0; i <= text.length; i += 1) {
    while (k < sorted.length && sorted[k].at <= i) {
      out += `[${sorted[k].symbol}]`;
      k += 1;
    }
    if (i < text.length) out += text[i];
  }
  return out;
}

/** Words with their character ranges in `text`. */
export function words(text) {
  const out = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text))) out.push({ w: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

/** Index of the word a character position belongs to (the next word when on a space). */
export function wordAt(text, at) {
  const ws = words(text);
  for (let i = 0; i < ws.length; i += 1) if (at < ws[i].end) return i;
  return ws.length - 1;
}

/**
 * Puts (or replaces / removes with symbol=null) the chord over word `wi` of
 * the line `raw`. Returns the new raw line.
 */
export function setChordOnWord(raw, wi, symbol) {
  const { text, chords } = parseLine(raw);
  const ws = words(text);
  const w = ws[wi];
  if (!w) return raw;
  const kept = chords.filter((c) => !(c.at >= w.start && c.at < w.end));
  if (symbol) kept.push({ at: w.start, symbol });
  return joinLine(text, kept);
}

/** The chord standing over each word (or null). */
export function chordsByWord(raw) {
  const { text, chords } = parseLine(raw);
  const ws = words(text);
  const out = ws.map(() => null);
  for (const c of chords) {
    const wi = Math.max(0, wordAt(text, c.at));
    if (ws.length) out[wi] = c.symbol;
  }
  return out;
}

// ---- syllables ---------------------------------------------------------------

const isHebrew = (w) => HEB_LETTER.test(w);
const stripPunct = (w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}֑-ׇ]+$/gu, '');

// English: vowel groups; the consonants between two groups split in the
// middle (hel-lo, sum-mer), a single one goes to the next syllable (ba-by);
// a silent final e joins the syllable before it (love, time).
function englishSyllables(w) {
  const lower = w.toLowerCase();
  const groups = [];
  const re = /[aeiouy]+/g;
  let m;
  while ((m = re.exec(lower))) groups.push({ start: m.index, end: m.index + m[0].length });
  if (groups.length > 1) {
    const last = groups[groups.length - 1];
    const silentE =
      last.start === lower.length - 1 &&
      lower[last.start] === 'e' &&
      !/[^aeiouy]le$/.test(lower) && // ta-ble
      lower.length > 3;
    const silentEs = /[^aeiouy]es$/.test(lower) && !/(ch|sh|ss|x|z|ce|ge|se|[^aeiouy]l)es$/.test(lower) && last.start === lower.length - 2;
    const silentEd = /[^aeiouy]ed$/.test(lower) && !/[td]ed$/.test(lower) && last.start === lower.length - 2;
    if (silentE || silentEs || silentEd) groups.pop();
  }
  if (groups.length <= 1) return [w];
  const cuts = [];
  for (let g = 1; g < groups.length; g += 1) {
    const a = groups[g - 1].end;
    const b = groups[g].start;
    const n = b - a;
    cuts.push(n <= 1 ? a : a + Math.floor(n / 2));
  }
  // ta-ble, trou-bles: the consonant before a final "le(s)" starts that syllable.
  const le = /[^aeiouy](le|les)$/.exec(lower);
  if (le && cuts.length) cuts[cuts.length - 1] = le.index;
  const out = [];
  let from = 0;
  for (const c of cuts) {
    out.push(w.slice(from, c));
    from = c;
  }
  out.push(w.slice(from));
  return out.filter(Boolean);
}

// Hebrew with nikud: a syllable starts at every letter carrying a vowel
// point (shva only at the start of the word); holam male / shuruk give their
// vowel to the letter before them.
const VOWEL_POINTS = /[ֱ-ׇֻ]/;
function pointedHebrewSyllables(w) {
  const letters = [];
  for (const ch of w) {
    if (HEB_LETTER.test(ch) || !/[֑-ׇ]/.test(ch)) letters.push({ ch, marks: '' });
    else if (letters.length) letters[letters.length - 1].marks += ch;
  }
  const starts = new Set();
  let firstLetter = true;
  letters.forEach((l, i) => {
    if (!HEB_LETTER.test(l.ch)) return;
    const shuruk = l.ch === 'ו' && l.marks.includes('ּ') && !VOWEL_POINTS.test(l.marks);
    const holamMale = l.ch === 'ו' && /[ֹֺ]/.test(l.marks) && i > 0;
    if ((shuruk || holamMale) && i > 0) {
      // The vowel belongs to the letter before (unless it has its own).
      let p = i - 1;
      while (p > 0 && !HEB_LETTER.test(letters[p].ch)) p -= 1;
      if (!VOWEL_POINTS.test(letters[p].marks)) starts.add(p);
      else if (shuruk) starts.add(i); // "וּ" as the word "and"/a vowel on its own
    } else if (VOWEL_POINTS.test(l.marks) || (firstLetter && l.marks.includes('ְ'))) starts.add(i);
    else if (firstLetter && shuruk) starts.add(i);
    firstLetter = false;
  });
  if (starts.size <= 1) return [w];
  const order = [...starts].sort((a, b) => a - b);
  const out = [];
  for (let k = 0; k < order.length; k += 1) {
    const from = k === 0 ? 0 : order[k];
    const to = k + 1 < order.length ? order[k + 1] : letters.length;
    out.push(letters.slice(from, to).map((l) => l.ch + l.marks).join(''));
  }
  return out;
}

// Unpointed Hebrew: ו / י inside the word are vowel letters (not when
// doubled, not the first letter), a final ה / א / י after a consonant is a
// vowel. A syllable starts at a consonant followed by a vowel letter, or at
// any other consonant except the last one (that one closes the syllable).
function plainHebrewSyllables(w) {
  const ls = [...w];
  const n = ls.length;
  const isMater = ls.map((c, i) => {
    if (i === 0) return false;
    if (c === 'ו' || c === 'י') {
      if (ls[i - 1] === c || ls[i + 1] === c) return false; // וו / יי = consonant
      return true;
    }
    if (i === n - 1 && (c === 'ה' || c === 'א')) return true;
    return false;
  });
  const starts = [];
  for (let i = 0; i < n; i += 1) {
    if (isMater[i]) continue;
    if (!HEB_LETTER.test(ls[i])) continue;
    const next = i + 1 < n ? i + 1 : -1;
    if (next >= 0 && isMater[next]) {
      starts.push(i);
      continue;
    }
    // A silent final ה / א after a vowel letter ("הוא", "היא").
    if (i === n - 1) break;
    starts.push(i);
  }
  // A final consonant closes the syllable before it; but a word of one
  // consonant + a final consonant ("של", "את") is one syllable anyway.
  if (starts.length <= 1) return [w];
  const out = [];
  for (let k = 0; k < starts.length; k += 1) {
    const from = k === 0 ? 0 : starts[k];
    const to = k + 1 < starts.length ? starts[k + 1] : n;
    out.push(ls.slice(from, to).join(''));
  }
  return out;
}

/** The syllables of one word (an estimate). */
export function wordSyllables(word) {
  const w = stripPunct(word);
  if (!w) return [];
  if (isHebrew(w)) {
    const pointed = /[ְ-ׇּ]/.test(w);
    if (pointed) return pointedHebrewSyllables(w);
    return plainHebrewSyllables(w);
  }
  if (LATIN_VOWEL.test(w)) return englishSyllables(w);
  return [w];
}

/** "Hel-lo world" — the line's words with the estimated syllables hyphenated. */
export function autoHyphenate(text) {
  return words(text)
    .map((x) => {
      const s = wordSyllables(x.w);
      return s.length ? s.join('-') : x.w;
    })
    .join(' ');
}

/**
 * The syllables to sing, in order: [{ text, word, first, last }] — from the
 * writer's hyphenated override when there is one (it must have the same
 * number of words to be used), else the estimate.
 */
export function syllables(text, override) {
  const ws = words(text);
  let parts = null;
  if (override && override.trim()) {
    const ow = override.trim().split(/\s+/);
    parts = ow.map((w) => w.split('-').filter(Boolean));
  }
  if (!parts) parts = ws.map((x) => {
    const s = wordSyllables(x.w);
    return s.length ? s : [x.w];
  });
  const out = [];
  parts.forEach((p, wi) => {
    p.forEach((s, k) => out.push({ text: s, word: wi, first: k === 0, last: k === p.length - 1 }));
  });
  return out;
}

export function countSyllables(text, override) {
  return syllables(text, override).length;
}

// ---- rhymes -------------------------------------------------------------------

const FINAL_FORMS = { 'ם': 'מ', 'ן': 'נ', 'ץ': 'צ', 'ף': 'פ', 'ך': 'כ' };
// Letters that sound the same in modern Hebrew.
const SAME_SOUND = { 'ט': 'ת', 'ק': 'כ', 'ח': 'כ', 'ע': 'א' };

function normalizeHebrew(s) {
  return [...s.replace(HEB_MARKS, '')].map((c) => {
    const f = FINAL_FORMS[c] ?? c;
    return SAME_SOUND[f] ?? f;
  }).join('');
}

/**
 * What has to match for two line ends to rhyme: from the last vowel on
 * (English: "night" -> "ight"; Hebrew: the last syllable without its first
 * consonant, "שלום" -> "ומ"; a bare vowel ending keeps its consonant, "אהבה"
 * -> "בה"). Null for an empty line.
 */
export function rhymeKey(text) {
  const ws = words(text);
  if (!ws.length) return null;
  const last = stripPunct(ws[ws.length - 1].w);
  if (!last) return null;
  if (isHebrew(last)) {
    const syl = wordSyllables(last);
    const s = normalizeHebrew(syl[syl.length - 1] ?? last);
    const tail = s.slice(1);
    if (tail.length >= 2 || (tail.length === 1 && !/[הא]/.test(tail))) return 'he:' + tail;
    return 'he:' + s;
  }
  let w = last.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return null;
  if (w.length > 3 && /[^aeiouy]e$/.test(w) && /[aeiouy]/.test(w.slice(0, -2))) w = w.slice(0, -1);
  w = w.replace(/([aeiou])\1+/g, '$1');
  const m = /[aeiouy]+[^aeiouy]*$/.exec(w);
  return 'en:' + (m ? m[0] : w);
}

/**
 * Rhyme letters for a block of lines (A, B, A, B…); `rhymes[i]` is true when
 * line i shares its letter with another line.
 */
export function rhymeScheme(texts) {
  const keys = texts.map(rhymeKey);
  const letterOf = new Map();
  const letters = [];
  let next = 0;
  for (const k of keys) {
    if (!k) {
      letters.push('');
      continue;
    }
    if (!letterOf.has(k)) letterOf.set(k, String.fromCharCode(65 + (next++ % 26)));
    letters.push(letterOf.get(k));
  }
  const count = {};
  letters.forEach((l) => l && (count[l] = (count[l] ?? 0) + 1));
  return { letters, rhymes: letters.map((l) => !!l && count[l] > 1) };
}

// ---- editing the text without losing the chords ----------------------------------

function snapToWords(text, chords) {
  const ws = words(text);
  const byAt = new Map();
  for (const c of chords) {
    const w = ws.find((x) => c.at < x.end) ?? ws[ws.length - 1];
    const at = w ? w.start : 0;
    // One chord per word: a chord pushed there by an edit (weak) never
    // replaces the word's own one.
    if (c.weak && byAt.has(at)) continue;
    byAt.set(at, { at, symbol: c.symbol });
  }
  return [...byAt.values()];
}

/**
 * The line with its words changed to `newText`; every chord stays over the
 * word it was over (the edited stretch is found as the part between the
 * unchanged start and end).
 */
export function replaceText(raw, newText) {
  const { text, chords } = parseLine(raw);
  if (text === newText) return raw;
  let p = 0;
  while (p < text.length && p < newText.length && text[p] === newText[p]) p += 1;
  let q = 0;
  while (q < text.length - p && q < newText.length - p && text[text.length - 1 - q] === newText[newText.length - 1 - q]) q += 1;
  const delta = newText.length - text.length;
  const moved = chords.map((c) =>
    c.at < p ? c : c.at >= text.length - q ? { ...c, at: c.at + delta } : { ...c, at: p, weak: true }
  );
  // Strong ones first so a weak one never displaces them.
  moved.sort((a, b) => Number(!!a.weak) - Number(!!b.weak));
  return joinLine(newText, snapToWords(newText, moved));
}

/** Splits the line at `caret` (an index in its text) into two raw lines. */
export function splitRaw(raw, caret) {
  const { text, chords } = parseLine(raw);
  const a = text.slice(0, caret).replace(/\s+$/, '');
  const bStart = caret + (text.slice(caret).length - text.slice(caret).replace(/^\s+/, '').length);
  const b = text.slice(bStart);
  return [
    joinLine(a, chords.filter((c) => c.at < caret && c.at < a.length)),
    joinLine(b, snapToWords(b, chords.filter((c) => c.at >= caret).map((c) => ({ ...c, at: Math.max(0, c.at - bStart) })))),
  ];
}

/** Two lines joined (Backspace at the start of a line). */
export function joinRaw(rawA, rawB) {
  const a = parseLine(rawA);
  const b = parseLine(rawB);
  const sep = a.text && b.text ? ' ' : '';
  const off = a.text.length + sep.length;
  return joinLine(a.text + sep + b.text, [...a.chords, ...b.chords.map((c) => ({ ...c, at: c.at + off }))]);
}
