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
// "r" (release — a bend coming back down to a real pitch, always written
// with its own target in parens: "r(8)") — a second tab-site convention
// alongside h/p/b/~, seen for the first time in a file using PARENTHESIZED
// bend/release targets ("8b(10)r(8)") instead of the bare-digit style
// ("8b10") the rest of this parser was built against. Both styles are
// handled (see readParenTarget below); this doesn't change how the
// bare-digit style parses at all.
const RELEASE_RE = /[rR]/;
// A trailing "x2" / "x3," repeat-count marker (a THIRD convention from
// that same file, "play this section N times") sitting at the end of an
// otherwise-real content line — stripped before the fret-digit scanner
// ever sees it, since an unstripped "2" or "3" there would otherwise be
// misread as one more fret number.
const REPEAT_SUFFIX_RE = /\s*x\d+,?\s*$/i;
const STRING_LINE_RE = /^\s*([A-Ga-g])([#b]?)\s*\|(.*)$/;
// Whitespace is allowed ANYWHERE, not just at the two ends — OCR output
// for an unlabeled continuation line sometimes has a stray internal space
// (e.g. before a recognized trailing "|"), which used to make the whole
// line fail to match at all and get silently dropped (verified against a
// real file: this is exactly what happened to an otherwise near-perfect
// reading of the busiest, most important line in a block). "rR()x" added
// for the release/repeat-marker conventions above — an UNLABELED line
// carrying either (no "X|" prefix to fall back on STRING_LINE_RE's own
// unrestricted tail) would otherwise fail this check entirely and get
// silently dropped, same failure mode as the earlier missing-whitespace
// bug.
const CONTINUATION_LINE_RE = /^[-|\dhHpPbBrRxX/\\~()\s]+$/;
// No real fret number is 3+ digits (guitar tops out well under 100 frets
// in practice) — a run of 3+ consecutive digits in an unlabeled line is
// unambiguously OCR noise (verified against a real file: page furniture
// like a misread bar/measure counter), never a genuine note, so it's
// safe to reject outright rather than risk it becoming a bogus phantom
// line that throws off which physical string every REAL line after it
// in the same block maps to.
const GARBAGE_DIGIT_RUN_RE = /\d{3,}/;

function isBlank(line) {
  return line.trim() === '';
}

// A "labeled" line's tab content is everything after the first `|`; a bare
// continuation line's content is the whole line. Either way, strip the
// remaining `|` bar separators and any stray whitespace — neither carries
// real column position (this app's own reconstruction always fills gaps
// with "-", never a space) and leaving whitespace in would shift every
// character after it by one column, breaking exactly the cross-string
// alignment tabOcr.js's reconstructBlockRows works to preserve.
function tabContent(line) {
  const labeled = line.match(STRING_LINE_RE);
  const raw = labeled ? labeled[3] : line;
  return raw.replace(REPEAT_SUFFIX_RE, '').replace(/[|\s]/g, '');
}

function looksLikeStringLine(line) {
  if (STRING_LINE_RE.test(line)) return true;
  if (!CONTINUATION_LINE_RE.test(line)) return false;
  return !GARBAGE_DIGIT_RUN_RE.test(line);
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

// Reads a PARENTHESIZED fret number — "(10)" — starting exactly at `i`
// (must be the opening paren itself), returning [value, nextIndex] or
// null if there's no well-formed "(<digits>)" there. This is the OTHER
// bend/release target notation this parser supports, alongside the
// bare-digit style ("5b7") readFretNumber's own callers already handle.
function readParenTarget(stream, i) {
  if (stream[i] !== '(') return null;
  let j = i + 1;
  let numStr = '';
  while (/\d/.test(stream[j] ?? '')) {
    numStr += stream[j];
    j += 1;
  }
  if (numStr === '' || stream[j] !== ')') return null;
  return [Number(numStr), j + 1];
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
      // Either target style just tags the ORIGINAL note as a bend, never
      // adds a second note — bending doesn't change which fret is
      // physically held, only the pitch it rings at. "5b(7)" (parens)
      // gives an EXACT interval to bend by (fret difference = semitones,
      // one fret is one semitone), overriding this app's generic fixed
      // bend width (lickPlayer.js's BEND_SEMITONES) with the real target
      // pitch; bare "5b7" or plain "5b" fall back to that generic width,
      // same as before.
      noteEvent.technique = 'bend';
      i += 1;
      const parenTarget = readParenTarget(stream, i);
      if (parenTarget) {
        const [targetFret, afterParen] = parenTarget;
        noteEvent.bendSemitones = targetFret - fret;
        i = afterParen;
      } else {
        const target = readFretNumber(stream, i);
        if (target) i = target[1];
      }
      // A release ("r(8)") is written immediately after ITS bend's own
      // target, not after a fresh fret number — checking for it here,
      // right where the bend left off, is the only place it can actually
      // be found; the main loop only ever looks for an articulation
      // character right after reading a NEW digit run, which this isn't.
      if (RELEASE_RE.test(stream[i] ?? '')) {
        const releaseTarget = readParenTarget(stream, i + 1);
        if (releaseTarget) {
          const [targetFret, afterParen] = releaseTarget;
          events.push({ col: i + 1, fret: targetFret, technique: 'release' });
          i = afterParen;
        }
      }
      continue;
    } else if (artCh && RELEASE_RE.test(artCh)) {
      // "r(8)" directly after a plain note, with no bend in between —
      // less common, but handled the same way for consistency. Only
      // recognized with an explicit paren target — this tab-site
      // convention always writes one; a bare "r" with nothing bracketed
      // after it is far more likely a stray letter than a real release
      // marker, so it's left alone rather than guessed at.
      const parenTarget = readParenTarget(stream, i + 1);
      if (parenTarget) {
        const [targetFret, afterParen] = parenTarget;
        events.push({ col: i + 1, fret: targetFret, technique: 'release' });
        i = afterParen;
        continue;
      }
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
    for (const { stringLine, fret, technique, bendSemitones } of events) {
      if (fret > MAX_FRET) continue;
      const arrayIndex = 5 - stringLine; // top line (0) = highest string = STANDARD_TUNING[5]
      const tuning = STANDARD_TUNING[arrayIndex];
      const midi = tuning.baseMidi + fret;
      const label = midiToNoteName(midi).replace(/\d+$/, '');
      const note = { order: order++, string: arrayIndex, fret, label, technique, durationMultiplier };
      if (bendSemitones !== undefined) note.bendSemitones = bendSemitones;
      notes.push(note);
    }
  }

  return notes;
}
