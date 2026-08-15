import { parseNoteName } from './spelling';
import { QUALITY_ALIAS_LOOKUP } from './chordQualities';

// "em" -> "Em", "f#dim7" -> "F#dim7", "em/g" -> "Em/G" — the root letter (and
// the bass note's letter, for slash chords) is always the first character of
// its part, so capitalizing just that character normalizes display casing
// without touching the quality suffix (m, maj7, dim, sus4, ...) at all.
// Deliberately doesn't validate the input — an unrecognized chord still gets
// its chip capitalized the same way a valid one would.
export function capitalizeChordRoot(text) {
  if (!text) return text;
  const capitalizeFirst = (part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part);
  const [chordPart, bassPart] = text.split('/');
  const capped = capitalizeFirst(chordPart);
  return bassPart !== undefined ? `${capped}/${capitalizeFirst(bassPart)}` : capped;
}

// Hebrew Unicode block (0x0590-0x05FF) plus Hebrew presentation forms
// (0xFB1D-0xFB4F), built from character codes rather than a literal range in
// a regex/string source so this file stays plain ASCII on disk.
const HEBREW_RANGE_START = String.fromCharCode(0x0590);
const HEBREW_RANGE_END = String.fromCharCode(0x05ff);
const HEBREW_PRESENTATION_START = String.fromCharCode(0xfb1d);
const HEBREW_PRESENTATION_END = String.fromCharCode(0xfb4f);
const HEBREW_CHARS = new RegExp(
  '[' + HEBREW_RANGE_START + '-' + HEBREW_RANGE_END + HEBREW_PRESENTATION_START + '-' + HEBREW_PRESENTATION_END + ']',
  'g'
);

// Strips input the chord-progression field should never accept, live as the
// user types (called from ChordInput's onChange, not just at parse time):
//   1. Hebrew letters — the field is chord notation (Latin note letters,
//      digits, symbols), never a script the app would try to parse as one.
//   2. A token's (or a slash chord's bass note's) leading letter, if it's
//      anything past G — A-G are the only 7 letters that are ever a valid
//      note root, so H/I/J/... could never start a real chord. Only the
//      LEADING letter of each part is checked — a quality suffix typed right
//      after a valid root (the "m" in "Am", the "aug" in "Caug", the "dim7"
//      in "F#dim7") legitimately uses letters past G and is left untouched.
const INVALID_LEADING_LETTER = /^[A-Za-z]/;

function stripInvalidLeadingLetter(part) {
  return /^[A-Ga-g]/.test(part) ? part : part.replace(INVALID_LEADING_LETTER, '');
}

export function sanitizeChordInput(value) {
  if (!value) return value;
  return value
    .replace(HEBREW_CHARS, '')
    .split(' ')
    .map((token) => {
      if (!token) return token;
      const parts = token.split('/');
      return parts.map((part) => (part ? stripInvalidLeadingLetter(part) : part)).join('/');
    })
    .join(' ');
}

const ROOT_PATTERN = /^([A-Ga-g])([#b]{0,2})/;

// "AM"/"AM7" (a bare, ambiguous-cased "M" right after the root, with nothing
// else) always parses as minor in this app's convention (see
// chordQualities.js's comment on the major quality) — but leaving the chip
// showing the exact ambiguous text the user typed would still read as "did
// this parse as major or minor?" at a glance. This rewrites it to the
// unambiguous "Am"/"Am7" for display, everywhere `progression`'s `text`
// field is shown (chord chips, the fretboard's position roadmap, lick/phrase
// labels, ...), not just for parsing. Anything else (an explicit 'maj',
// 'sus4', 'dim7', ...) is left exactly as typed.
export function normalizeAmbiguousMinorM(text) {
  if (!text) return text;
  const [chordPart, bassPart] = text.split('/');
  const rootMatch = ROOT_PATTERN.exec(chordPart);
  if (!rootMatch) return text;

  const rest = chordPart.slice(rootMatch[0].length);
  const newRest = rest === 'M' ? 'm' : rest === 'M7' ? 'm7' : rest;
  if (newRest === rest) return text;

  const newChordPart = rootMatch[0] + newRest;
  return bassPart !== undefined ? `${newChordPart}/${bassPart}` : newChordPart;
}

// "F#dim7" -> { root: {letter:'F', accidental:1, pitchClass:6}, qualityKey: 'dim7', bass: null }
// "C/G" -> { root: {letter:'C', ...}, qualityKey: 'major', bass: {letter:'G', ...} }
// Returns null if the input can't be parsed.
export function parseChordSymbol(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const [chordText, bassText, ...extra] = trimmed.split('/');
  if (extra.length > 0) return null; // more than one slash

  const rootMatch = /^([A-Ga-g])([#b]{0,2})/.exec(chordText);
  if (!rootMatch) return null;

  const rootText = rootMatch[1].toUpperCase() + rootMatch[2];
  const root = parseNoteName(rootText);
  if (!root) return null;

  const rest = chordText.slice(rootMatch[0].length).trim();

  const match = QUALITY_ALIAS_LOOKUP.find((entry) => entry.alias === rest);
  if (!match) return null;

  let bass = null;
  if (bassText !== undefined) {
    bass = parseNoteName(bassText);
    if (!bass) return null;
  }

  return { root, qualityKey: match.key, bass };
}
