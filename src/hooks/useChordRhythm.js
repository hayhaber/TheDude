import { useEffect, useRef, useState } from 'react';
import { parseChordSymbol, capitalizeChordRoot, normalizeAmbiguousMinorM } from '../music/chordSymbolParser';
import { computePianoChordTones } from '../music/pianoChordTones';
import { playPianoNote } from '../audio/pianoPlayer';
import { generateChordRhythmProgression } from '../music/chordRhythmGenerator';

const FEEDBACK_FLASH_MS = 500;
const DEFAULT_BEATS_PER_CHORD = 4;
// How long (real seconds, tempo-independent) a chord is visible BEFORE its
// judging window opens — i.e. how much advance warning the falling
// block/timeline chip gives before you need to play it. Same name/value
// convention as FallingNotesPanel's own FALL_TIME_S, for the same reason:
// a fixed reaction-time budget in real seconds rather than a beat count,
// so it doesn't get uncomfortably short at fast tempos.
export const LEAD_TIME_S = 2.5;
// How long past the last chord's window closing to keep the session
// visually running before ending it — lets the very last block finish
// crossing/exiting the line instead of vanishing the instant it's judged.
const TAIL_S = 0.6;
const SHOW_KEYS_STORAGE = 'chord-rhythm-show-keys';
// Every key stays playable (and audible) during a run — a wrong key is a
// wrong note you should hear, not a dead key.
const ALL_KEYS = Array.from({ length: 88 }, (_, i) => ({ midi: 21 + i }));
// A chord played a touch early (just before its window opens) still counts
// for it — players anticipate the beat.
const EARLY_S = 0.25;

function parseProgressionText(text) {
  return text
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => capitalizeChordRoot(t))
    .map((t) => normalizeAmbiguousMinorM(t))
    .map((t) => ({ text: t, parsed: parseChordSymbol(t) }))
    .filter((c) => c.parsed);
}

function pitchClassOf(midi) {
  return ((midi % 12) + 12) % 12;
}

// One entry per chord in the sequence: its display text, its default
// (root-position, near-middle-C) tones from computePianoChordTones — used
// as-is for Strict mode's exact-match target, and as the pitch-class basis
// Lenient mode expands across LENIENT_RANGE. `startTime`/`endTime` are
// this chord's judging-window boundaries on the session's own timeline
// (seconds since play() was called) — back-to-back with no gaps
// (`startTime` of chord i+1 === `endTime` of chord i), computed ONCE here
// from a snapshotted bpm/beatsPerChord so the whole session's timeline is
// fixed and known in advance, not built up incrementally beat-by-beat.
// This is what lets the panel render every chord's exact fall/cross/exit
// position as a pure function of elapsed time (see the tick loop below) —
// no per-beat state, no discrete jumps, nothing to drift out of sync.
function buildSequence(chords, secondsPerBeat, beatsPerChord, lead) {
  return chords.map((chord, i) => {
    const tones = computePianoChordTones(chord.parsed);
    const pitchClasses = new Set(tones.map((t) => pitchClassOf(t.midi)));
    const startTime = lead + i * beatsPerChord * secondsPerBeat;
    const endTime = startTime + beatsPerChord * secondsPerBeat;
    return { text: chord.text, tones, pitchClasses, startTime, endTime };
  });
}

// "Guitar Hero"-for-chords, Synthesia-style: a continuous real-time clock
// (setInterval + performance.now(), the exact same pattern
// hooks/useFallingNotes.js already uses and has proven correct/smooth for
// this app) drives every chord's fall/cross/exit position as a pure
// function of elapsed time — there is no discrete "advance one step per
// beat" state to get out of sync or cause a chord to vanish mid-flight.
// bpm/beatsPerChord are snapshotted once at play() time (the UI disables
// those controls while playing, same existing convention), so the whole
// session's timeline — every chord's exact startTime/endTime — is fixed
// and known up front.
//
// Judging routes through the shared PianoKeyboard's EXISTING quiz plumbing
// (quizKeys/onQuizKeyClick/quizFeedbackKeys) — the same path Ear Training
// already uses, which itself already fans out to mouse clicks, a connected
// MIDI keyboard, AND the computer-keyboard-as-piano input, with zero
// PianoKeyboard.jsx changes needed.
export function useChordRhythm(metronome) {
  const [source, setSource] = useState('preset'); // 'preset' | 'custom'
  // What the generator produced for the CURRENT/most recent "Starter set"
  // run — a fresh random key + pattern every time play() is called in that
  // mode (see loadSequence), shown to the player instead of a fixed
  // dropdown so the practice content actually varies run to run.
  const [generatedLabel, setGeneratedLabel] = useState('');
  const [customText, setCustomText] = useState('C G Am F');
  const [beatsPerChord, setBeatsPerChord] = useState(DEFAULT_BEATS_PER_CHORD);
  const [strictMode, setStrictMode] = useState(false); // lenient by default — see the design writeup
  const [viewMode, setViewMode] = useState('falling'); // 'falling' | 'timeline'
  // Show the keys of the chord to play on the keyboard as soon as its block
  // appears (a learning aid; off = play it from the chord name alone).
  const [showKeys, setShowKeysState] = useState(() => {
    try {
      return localStorage.getItem(SHOW_KEYS_STORAGE) === '1';
    } catch {
      return false;
    }
  });
  const setShowKeys = (v) => {
    setShowKeysState(v);
    try {
      localStorage.setItem(SHOW_KEYS_STORAGE, v ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  };

  const [sequence, setSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  // Elapsed seconds since play() was called — the ONE piece of continuous
  // state everything else (active chord, every visible chord's exact
  // position) is derived from. Updated every tick (~16ms).
  const [now, setNow] = useState(0);
  // { [chordIndex]: 'hit' | 'miss' } — set once per chord, the moment it's
  // judged (either early, via a satisfying click, or at its window's
  // natural close). The panel colors each chord's own block/chip from
  // this directly once judged, instead of a separate flash element —
  // since chords no longer vanish mid-flight, there's no need for one.
  const [results, setResults] = useState({});
  const [score, setScore] = useState({ hits: 0, misses: 0 });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  // [{midi, state}] — every target tone (Strict) or every struck key
  // (Lenient) flashes at once, reusing the exact same pulse the single-note
  // quizzes already use (see PianoKeyboard.jsx's quizFeedbackKeys, an
  // additive array sibling of its older quizFeedbackKey prop).
  const [feedbackKeys, setFeedbackKeys] = useState([]);

  const sequenceRef = useRef([]);
  const resultsRef = useRef({});
  const activeIndexRef = useRef(-1); // which chord's window currently contains `now`, or -1
  const struckPitchClassesRef = useRef(new Set()); // Lenient: pitch classes struck during the ACTIVE chord's window
  const struckMidiRef = useRef(new Set()); // Strict: exact MIDI values struck during the ACTIVE chord's window
  const secondsPerBeatRef = useRef(0.5);
  const beatsPerChordRef = useRef(DEFAULT_BEATS_PER_CHORD);
  const strictModeRef = useRef(false);
  const nowRef = useRef(0);
  const startPerfTimeRef = useRef(0);
  const rafIdRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);
  // midi -> 'hit' | 'miss' for every key struck so far during the ACTIVE
  // chord's window, in click order — this is what makes each note's
  // correctness visible the INSTANT it's played, not just once the whole
  // chord (or the window's timeout) resolves it. Cleared whenever the
  // active window changes (see tick()) or a new session loads.
  const liveFeedbackRef = useRef(new Map());
  // A chord already being played early (see EARLY_S) — its notes so far
  // are kept when its window opens.
  const earlyIndexRef = useRef(-1);
  // The clock starts on the metronome's first click (so the chords fall in
  // time with it); until then `waitingRef` holds it at 0.
  const waitingRef = useRef(false);
  const waitTimerRef = useRef(null);

  function activeIndexAt(t) {
    const seq = sequenceRef.current;
    for (let i = 0; i < seq.length; i += 1) {
      if (t >= seq[i].startTime && t < seq[i].endTime) return i;
    }
    return -1;
  }

  // Flashes the chord's default (root-position) tones regardless of which
  // actual octave/inversion was played — the display always shows "this
  // chord," not the specific keys the player happened to strike.
  //
  // Full success: every target tone flashes green ('hit'). A miss (whether
  // nothing was played, or only some of the chord's notes were struck
  // before the window closed) shows per-note feedback instead of a uniform
  // red flash — gold ('partial') for whichever notes WERE struck
  // correctly, red ('miss') for the ones that weren't.
  function flashKeys(entry, isCorrect) {
    const keys = isCorrect
      ? entry.tones.map((t) => ({ midi: t.midi, state: 'hit' }))
      : entry.tones.map((t) => {
          const struck = strictModeRef.current
            ? struckMidiRef.current.has(t.midi)
            : struckPitchClassesRef.current.has(pitchClassOf(t.midi));
          return { midi: t.midi, state: struck ? 'partial' : 'miss' };
        });
    setFeedbackKeys(keys);
    clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setFeedbackKeys([]), FEEDBACK_FLASH_MS);
  }

  // Judges chord `index` exactly once — called either early (a satisfying
  // click, mid-window) or from the tick loop once its window's endTime has
  // passed unsatisfied. `resultsRef` is the source of truth for "already
  // judged," checked synchronously so the two call sites can never both
  // score the same chord.
  function judgeChord(index, isCorrect) {
    if (resultsRef.current[index] != null) return;
    const entry = sequenceRef.current[index];
    if (!entry) return;
    resultsRef.current = { ...resultsRef.current, [index]: isCorrect ? 'hit' : 'miss' };
    setResults(resultsRef.current);
    flashKeys(entry, isCorrect);
    setScore((s) => (isCorrect ? { ...s, hits: s.hits + 1 } : { ...s, misses: s.misses + 1 }));
    setCombo((c) => {
      const next = isCorrect ? c + 1 : 0;
      setMaxCombo((m) => Math.max(m, next));
      return next;
    });
  }

  function isSatisfied(entry) {
    if (!entry) return false;
    if (strictModeRef.current) {
      if (struckMidiRef.current.size !== entry.tones.length) return false;
      return entry.tones.every((t) => struckMidiRef.current.has(t.midi));
    }
    return [...entry.pitchClasses].every((pc) => struckPitchClassesRef.current.has(pc));
  }

  function handleQuizKeyClick(midi) {
    // Unlike Ear Training's own quiz clicks (deliberately silent — hearing
    // the note back would give away the answer to a listen-and-identify
    // test), this is a performance-practice tool: every played note must
    // be audible regardless of right/wrong, the way an actual instrument
    // would sound — also when the chord was already judged, or between
    // chords.
    playPianoNote(midi);
    let index = activeIndexRef.current;
    // The current chord is done (or none is open yet) and the next one is
    // about to start: this press belongs to the next chord.
    const seq = sequenceRef.current;
    const nextIdx = index < 0 ? seq.findIndex((c) => c.startTime > nowRef.current) : index + 1;
    const next = seq[nextIdx];
    if ((index < 0 || resultsRef.current[index] != null) && next && next.startTime - nowRef.current <= EARLY_S) {
      if (earlyIndexRef.current !== nextIdx) {
        earlyIndexRef.current = nextIdx;
        struckPitchClassesRef.current = new Set();
        struckMidiRef.current = new Set();
        liveFeedbackRef.current = new Map();
      }
      index = nextIdx;
    }
    if (index < 0 || resultsRef.current[index] != null) return;
    const entry = sequenceRef.current[index];
    const correct = strictModeRef.current
      ? entry.tones.some((t) => t.midi === midi)
      : entry.pitchClasses.has(pitchClassOf(midi));
    struckMidiRef.current.add(midi);
    struckPitchClassesRef.current.add(pitchClassOf(midi));
    // Immediate per-key feedback the instant a note is struck, instead of
    // only once the whole chord (or its window timing out) resolves —
    // otherwise a correctly-played note gives no sign of success until a
    // judgement that could be up to a full bar away. Persists on screen
    // until the window changes or the chord is fully judged (at which
    // point judgeChord's flashKeys call replaces it with the fuller
    // every-target-tone breakdown).
    liveFeedbackRef.current.set(midi, correct ? 'hit' : 'miss');
    setFeedbackKeys([...liveFeedbackRef.current.entries()].map(([m, state]) => ({ midi: m, state })));
    if (isSatisfied(entry)) judgeChord(index, true);
  }

  function endSession() {
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    metronome.stop();
    setIsPlaying(false);
    setEnded(true);
  }

  // One frame: advance the continuous clock, and judge (as a miss) any
  // chord whose window has closed without already being satisfied — the
  // ONLY thing that changes per frame is `now` itself; every chord's visual
  // position is then a pure function of it (see ChordRhythmPanel.jsx),
  // never a separately-tracked "current step."
  //
  // Driven by requestAnimationFrame rather than a setInterval — rAF is
  // scheduled by the browser to land right before the next actual paint,
  // so the block's rendered position always matches what the compositor is
  // about to draw. A timer-based tick can fire a few ms off that paint
  // cadence (worse under any main-thread load, or throttled entirely in a
  // background tab), which reads as tiny stutters even though the
  // underlying time math is correct — this is the single biggest thing
  // Synthesia-style falling-note implementations (e.g. the Canvas/WebGL
  // reference the user pointed to) get from rAF that a timer can't.
  function tick() {
    const elapsed = waitingRef.current ? 0 : (performance.now() - startPerfTimeRef.current) / 1000;
    nowRef.current = elapsed;
    setNow(elapsed);

    const seq = sequenceRef.current;

    // Judge any chord whose window just closed BEFORE resetting the
    // struck-note tracking below — flashKeys (called from judgeChord) needs
    // struckMidiRef/struckPitchClassesRef exactly as they stood at the end
    // of THAT chord's own window to tell gold ("you struck this one") from
    // red ("you never did"); resetting first would zero them out and turn
    // every timeout-miss into an all-red flash regardless of what was
    // actually played.
    for (let i = 0; i < seq.length; i += 1) {
      if (resultsRef.current[i] == null && elapsed >= seq[i].endTime) {
        judgeChord(i, false);
      }
    }

    const newActiveIndex = activeIndexAt(elapsed);
    if (newActiveIndex !== activeIndexRef.current) {
      activeIndexRef.current = newActiveIndex;
      // Notes played early for this very chord are kept.
      if (earlyIndexRef.current !== newActiveIndex) {
        struckPitchClassesRef.current = new Set();
        struckMidiRef.current = new Set();
        liveFeedbackRef.current = new Map();
      }
      earlyIndexRef.current = -1;
    }

    const last = seq[seq.length - 1];
    if (last && elapsed >= last.endTime + TAIL_S) {
      endSession();
      return;
    }
    rafIdRef.current = requestAnimationFrame(tick);
  }

  function loadSequence() {
    let progressionText = customText;
    let bpm = metronome.bpm;
    let nextBeatsPerChord = beatsPerChord;
    if (source === 'preset') {
      // A fresh random key + pattern every run (see chordRhythmGenerator.js)
      // — this is the whole point of "Starter set": the practice content
      // itself varies, not just a fixed dropdown always in C.
      const generated = generateChordRhythmProgression();
      progressionText = generated.progressionText;
      setGeneratedLabel(generated.progressionText);
      bpm = generated.bpmSuggested;
      nextBeatsPerChord = generated.beatsPerChord;
      metronome.setBpm(bpm);
      setBeatsPerChord(nextBeatsPerChord);
    }
    secondsPerBeatRef.current = 60 / bpm;
    beatsPerChordRef.current = nextBeatsPerChord;
    strictModeRef.current = strictMode;

    const chords = parseProgressionText(progressionText);
    // The lead-in is a whole number of beats, so every chord lands on a
    // metronome click.
    const spb = secondsPerBeatRef.current;
    const lead = Math.max(2, Math.ceil(LEAD_TIME_S / spb)) * spb;
    const built = buildSequence(chords, spb, nextBeatsPerChord, lead);
    sequenceRef.current = built;
    setSequence(built);
    setEnded(false);
    setScore({ hits: 0, misses: 0 });
    setCombo(0);
    setMaxCombo(0);
    setFeedbackKeys([]);
    resultsRef.current = {};
    setResults({});
    activeIndexRef.current = -1;
    struckPitchClassesRef.current = new Set();
    struckMidiRef.current = new Set();
    liveFeedbackRef.current = new Map();
    earlyIndexRef.current = -1;
    return built;
  }

  function play() {
    const built = loadSequence();
    if (built.length === 0) return;
    setEnded(false);
    setIsPlaying(true);
    nowRef.current = 0;
    setNow(0);
    startPerfTimeRef.current = performance.now();
    // Wait for the metronome's first click (see the effect below); if it
    // doesn't come (silenced/odd setup), start anyway shortly after.
    waitingRef.current = true;
    clearTimeout(waitTimerRef.current);
    waitTimerRef.current = setTimeout(() => {
      if (!waitingRef.current) return;
      waitingRef.current = false;
      startPerfTimeRef.current = performance.now();
    }, 700);
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(tick);
    // The metronome's click is a real audible tempo reference while
    // practicing, same as before — but the falling-block/timeline motion
    // itself no longer depends on its beat callbacks at all (see the tick
    // loop above), only on the bpm value snapshotted into
    // secondsPerBeatRef at loadSequence() time.
    metronome.start();
  }

  function restart() {
    play();
  }

  function stop() {
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    metronome.stop();
    setIsPlaying(false);
  }

  // The metronome just clicked: if a run is waiting, its clock starts now —
  // the lead-in and every chord then fall exactly on the clicks.
  useEffect(() => {
    if (metronome.currentBeat == null || !waitingRef.current) return;
    waitingRef.current = false;
    clearTimeout(waitTimerRef.current);
    startPerfTimeRef.current = performance.now();
  }, [metronome.currentBeat]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      clearTimeout(feedbackTimeoutRef.current);
      clearTimeout(waitTimerRef.current);
    };
  }, []);

  const accuracyPct = score.hits + score.misses > 0 ? Math.round((score.hits / (score.hits + score.misses)) * 100) : null;

  // The chord to show on the keys (Show keys): the first one not yet
  // judged whose block is already falling.
  const hintKeys =
    isPlaying && showKeys
      ? (sequence.find((c, i) => results[i] == null && now >= c.startTime - LEAD_TIME_S && now < c.endTime)?.tones ?? []).map((tn) => ({ midi: tn.midi }))
      : [];

  return {
    source,
    setSource,
    generatedLabel,
    customText,
    setCustomText,
    beatsPerChord,
    setBeatsPerChord,
    strictMode,
    setStrictMode,
    viewMode,
    setViewMode,
    sequence,
    now,
    results,
    isPlaying,
    ended,
    play,
    restart,
    stop,
    score,
    combo,
    maxCombo,
    accuracyPct,
    showKeys,
    setShowKeys,
    // PianoKeyboard quiz props — spread straight into stagePianoProps.
    // While running every key plays; idle = the normal keyboard.
    quizKeys: isPlaying ? ALL_KEYS : null,
    quizRevealKeys: hintKeys,
    onQuizKeyClick: handleQuizKeyClick,
    quizFeedbackKeys: feedbackKeys,
  };
}
