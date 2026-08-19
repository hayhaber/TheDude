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
// Technique symbols recognized between/after fret numbers, mapped to the
// exact `technique` values Fretboard.jsx's TECHNIQUE_GLYPH and
// audio/lickPlayer.js already handle (bend/vibrato get real audio
// treatment there; hammer/pull/slide render their own glyph with plain
// audio) — reusing generateLick.js's own vocabulary rather than inventing
// a second one.
const HAMMER_PULL_RE = /[hHpP]/;
const SLIDE_RE = /[/\\]/;
const BEND_RE = /[bB]/;
const STRING_LINE_RE = /^\s*([A-Ga-g])([#b]?)\s*\|(.*)$/;
const CONTINUATION_LINE_RE = /^\s*([-|\dhHpPbB/\\~]+)\s*$/;

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

// Reads one digit run (1-2 digits, matching a real fret number range)
// starting at `i`, returning [value, nextIndex] — or null if `i` isn't on
// a digit.
function readFretNumber(stream, i) {
  if (!/\d/.test(stream[i] ?? '')) return null;
  let numStr = stream[i];
  let next = i + 1;
  if (/\d/.test(stream[next] ?? '')) {
    numStr += stream[next];
    next += 1;
  }
  return [Number(numStr), next];
}

// Sequentially scans ONE string's concatenated character stream, reading
// fret numbers and the articulation symbol immediately following them
// (no gap — that's the real tab convention: "5h7" is one hammer-on, "5--h7"
// with dashes between isn't a valid articulation and is read as two
// separate, unlinked events instead). hammer-on/pull-off/slide each imply
// a SECOND note (the target fret); bend/vibrato just tag the note already
// read. Returns events tagged with their starting column, for merging
// across all 6 strings afterward.
function parseStringStream(stream) {
  const events = [];
  let i = 0;
  while (i < stream.length) {
    const read = readFretNumber(stream, i);
    if (!read) {
      i += 1;
      continue;
    }
    const [fret, afterFret] = read;
    const noteEvent = { col: i, fret, technique: undefined };
    events.push(noteEvent);
    i = afterFret;

    const artCh = stream[i];
    if (artCh && HAMMER_PULL_RE.test(artCh)) {
      const target = readFretNumber(stream, i + 1);
      if (target) {
        const [targetFret, afterTarget] = target;
        events.push({ col: i + 1, fret: targetFret, technique: artCh.toLowerCase() === 'h' ? 'hammer' : 'pull' });
        i = afterTarget;
        continue;
      }
    } else if (artCh && SLIDE_RE.test(artCh)) {
      const target = readFretNumber(stream, i + 1);
      if (target) {
        const [targetFret, afterTarget] = target;
        events.push({ col: i + 1, fret: targetFret, technique: 'slide' });
        i = afterTarget;
        continue;
      }
    } else if (artCh && BEND_RE.test(artCh)) {
      // "5b7" (bend up to fret 7's pitch) and bare "5b" both just tag the
      // ORIGINAL note as a bend — this app's bend playback is a fixed
      // interval (see lickPlayer.js's BEND_SEMITONES), not modeled per a
      // specific target pitch, so a trailing target-fret digit run (if
      // present) is consumed but not turned into its own note.
      noteEvent.technique = 'bend';
      i += 1;
      const target = readFretNumber(stream, i);
      if (target) i = target[1];
      continue;
    }
    if (stream[i] === '~') {
      noteEvent.technique = noteEvent.technique ?? 'vibrato';
      while (stream[i] === '~') i += 1;
    }
  }
  return events;
}

// Walks all 6 of a phrase's concatenated streams, then merges every
// string's own ordered event list into one timeline sorted by column
// (ties — a chord voicing struck together — ordered top-string-first,
// matching how a player's eye reads a tab).
function parsePhraseNotes(streams) {
  const events = [];
  for (let stringLine = 0; stringLine < 6; stringLine++) {
    for (const e of parseStringStream(streams[stringLine])) {
      events.push({ ...e, stringLine });
    }
  }
  events.sort((a, b) => (a.col === b.col ? a.stringLine - b.stringLine : a.col - b.col));
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
    for (const { stringLine, fret, technique } of events) {
      if (fret > MAX_FRET) continue;
      const arrayIndex = 5 - stringLine; // top line (0) = highest string = STANDARD_TUNING[5]
      const tuning = STANDARD_TUNING[arrayIndex];
      const midi = tuning.baseMidi + fret;
      const label = midiToNoteName(midi).replace(/\d+$/, '');
      notes.push({ order: order++, string: arrayIndex, fret, label, technique, durationMultiplier });
    }
  }

  return notes;
}
