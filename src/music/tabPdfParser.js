import { STANDARD_TUNING, MAX_FRET } from './notes';
import { midiToNoteName } from './pitchUtils';

// Parses the specific, very common "6 lines per string, dashes as filler,
// digits as fret numbers, | as bar separators" plain-text tab layout (the
// format most tab sites export, and what extractPdfTextRows.js reconstructs
// from a PDF's text layer) into an ordered sequence of playable fretboard
// notes — the exact shape App.jsx/Fretboard.jsx already expect for a "lick"
// (see music/generateLick.js), so a parsed tab can reuse the SAME
// play-on-the-neck overlay/animation Improvise's Lick Library already has,
// with no new rendering code needed.
//
// Deliberately scoped to this one layout, not a general tab-format parser:
// - A "labeled" string line starts with a note name (the OPEN-string pitch,
//   which reflects the file's own tuning — e.g. "Eb|----15--") — this is
//   read only to confirm 6 consecutive lines are a string block; the actual
//   FRET POSITIONS parsed out are tuning-agnostic (a tab tells you which
//   fret to press regardless of what pitch it sounds at), so a
//   half-step-down (or other) alternate tuning in the source file doesn't
//   need this app to support alternate tuning at all — see the caller's
//   own tuning-mismatch note to the player.
// - A group of 6 string lines can be followed by more groups of exactly 6
//   *unlabeled* continuation lines (the same layout tools use to wrap a
//   long bar onto its own row) before a blank line ends the phrase — all
//   of a phrase's line-groups are concatenated per string, in order,
//   before parsing fret numbers out.
const STRING_LINE_RE = /^\s*([A-Ga-g])([#b]?)\s*\|(.*)$/;
const CONTINUATION_LINE_RE = /^\s*([-|\d]+)\s*$/;

function isBlank(line) {
  return line.trim() === '';
}

// A "labeled" line's tab content is everything after the first `|`; a bare
// continuation line's content is the whole line. Either way, strip the
// remaining `|` bar separators — they only mattered for finding the line in
// the first place, not for column position within the concatenated stream.
function tabContent(line) {
  const labeled = line.match(STRING_LINE_RE);
  const raw = labeled ? labeled[3] : line;
  return raw.replace(/\|/g, '');
}

function looksLikeStringLine(line) {
  return STRING_LINE_RE.test(line) || CONTINUATION_LINE_RE.test(line);
}

// Splits the full row list into phrase groups (separated by blank rows),
// each group further split into 6-line chunks (one chunk per bar-wrapping
// row of the SAME 6 strings) to be concatenated per string.
function groupRows(rows) {
  const groups = [];
  let current = [];
  for (const raw of rows) {
    const line = raw.replace(/\r$/, '');
    if (isBlank(line)) {
      if (current.length) groups.push(current);
      current = [];
      continue;
    }
    if (looksLikeStringLine(line)) current.push(line);
    // Non-tab lines (titles, "Difficulty: beginner", tuning notes, page
    // numbers) are simply not string lines — ignored rather than breaking
    // the group, since they can appear between a page's header and its
    // first tab block without an intervening blank line in some PDF
    // extractions.
  }
  if (current.length) groups.push(current);
  return groups;
}

// Concatenates a phrase group's lines into exactly 6 per-string character
// streams, in top-to-bottom (high string to low string) order.
function concatenateGroup(lines) {
  const streams = ['', '', '', '', '', ''];
  for (let i = 0; i < lines.length; i++) {
    const stringIndex = i % 6; // 0 = top line = highest-pitched string
    streams[stringIndex] += tabContent(lines[i]);
  }
  return streams;
}

// Walks a phrase's 6 concatenated streams column by column, reading out
// each run of digits (a fret number, 1 or 2 digits) as one note event —
// order across simultaneous columns is top-string-first, matching how a
// player's eye reads a chord voicing on a real tab.
function parsePhraseNotes(streams) {
  const events = [];
  const maxLen = Math.max(...streams.map((s) => s.length));
  for (let col = 0; col < maxLen; col++) {
    for (let stringLine = 0; stringLine < 6; stringLine++) {
      const ch = streams[stringLine][col];
      if (ch === undefined || !/\d/.test(ch)) continue;
      const prevCh = streams[stringLine][col - 1];
      if (prevCh !== undefined && /\d/.test(prevCh)) continue; // mid-number, already captured
      let numStr = ch;
      let next = streams[stringLine][col + 1];
      if (next !== undefined && /\d/.test(next)) numStr += next;
      events.push({ stringLine, fret: Number(numStr), col });
    }
  }
  return events;
}

// Parses the full set of extracted text rows into a lick-shaped note array
// (see generateLick.js's own note shape) ready for playLick()/Fretboard.
// `barDurationMultiplier` scales EVERY note the same amount (there's no
// reliable way to recover exact rhythm from plain-text tab spacing —
// column distance loosely implies duration but isn't a real time-signature
// grid), so this defaults to equal-length notes and leaves genuine tempo
// control to the player via BPM, same as the app's existing "sync a typed
// progression to a BPM" flow (SongVideoPlayer.jsx's handleSync).
export function parseAsciiTab(rows, { durationMultiplier = 1 } = {}) {
  const groups = groupRows(rows);
  const notes = [];
  let order = 1;

  for (const lines of groups) {
    if (lines.length < 6) continue; // stray non-tab text that slipped past looksLikeStringLine
    const chunkCount = Math.floor(lines.length / 6);
    const chunks = [];
    for (let c = 0; c < chunkCount; c++) chunks.push(lines.slice(c * 6, c * 6 + 6));

    // Concatenate every 6-line chunk's streams together, in order, before
    // parsing — this is what stitches a bar-3 continuation chunk onto the
    // end of the bar-1/2 chunk that precedes it.
    const streams = ['', '', '', '', '', ''];
    for (const chunk of chunks) {
      const chunkStreams = concatenateGroup(chunk);
      for (let i = 0; i < 6; i++) streams[i] += chunkStreams[i];
    }

    const events = parsePhraseNotes(streams);
    for (const { stringLine, fret } of events) {
      if (fret > MAX_FRET) continue;
      const arrayIndex = 5 - stringLine; // top line (0) = highest string = STANDARD_TUNING[5]
      const tuning = STANDARD_TUNING[arrayIndex];
      const midi = tuning.baseMidi + fret;
      const label = midiToNoteName(midi).replace(/\d+$/, '');
      notes.push({ order: order++, string: arrayIndex, fret, label, durationMultiplier });
    }
  }

  return notes;
}
