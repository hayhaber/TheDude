import { useEffect, useMemo, useRef, useState } from 'react';
import { parseChordSymbol, capitalizeChordRoot, normalizeAmbiguousMinorM } from '../music/chordSymbolParser';
import { computePianoChordTones } from '../music/pianoChordTones';
import { playPianoChord, playPianoNote } from '../audio/pianoPlayer';
import { generateChordRhythmProgression } from '../music/chordRhythmGenerator';
import { logPerf } from '../coach/perfLog';
import { startBpm } from '../coach/skillLevel';
import { runResult, tempoAfter } from '../coach/playRun';

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
// Adaptive practice (v1.0.132, the guitar's v1.0.131 mechanism on the
// piano): a chord is "in time" when its first right key lands within this
// of its click (both hands, a chord is never perfectly together).
const ON_TIME_MS = 100;
const MIN_TO_LOG = 2;
export const CHORD_RHYTHM_TOOLS = ['chordRhythm'];

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
// (requestAnimationFrame + performance.now()) drives every chord's
// fall/cross/exit position as a pure function of elapsed time. bpm /
// beatsPerChord are snapshotted when a run starts, so the whole timeline —
// every chord's exact startTime/endTime — is fixed and known up front.
//
// Judging routes through the shared PianoKeyboard's quiz plumbing
// (quizKeys/onQuizKeyClick/quizFeedbackKeys), which already fans out to
// mouse/touch, a connected MIDI keyboard and the computer keyboard.
//
// ADAPTIVE PRACTICE (v1.0.132 — the guitar's v1.0.131 mechanism, user:
// "build the new mechanism for the piano too"):
//   - phases idle · demo (listen only: the trainer plays the chords, keys
//     lit) · countin (the lead-in clicks, counted down) · run (your turn) ·
//     done (result);
//   - the clock starts on the HEARD first click (metronome.onBeatTime), the
//     lead-in is whole beats, so every chord lands on a click;
//   - every chord is judged for the notes AND the time of its first right
//     key vs its click (early / on time ±100 ms / late);
//   - adaptive tempo (nextBpm) on by default, "find my speed" loop, start
//     tempo from the player's chord-rhythm level (startBpm, piano family);
//   - runs go to the performance log (tool 'chordRhythm', nps = beats / s).
export function useChordRhythm(metronome) {
  const [source, setSource] = useState('preset'); // 'preset' | 'custom'
  // The generated "Starter set" progression: a fresh random key + pattern
  // after every played run (see chordRhythmGenerator.js), shown before the
  // run so Demo and Start play the same thing.
  const [generatedLabel, setGeneratedLabel] = useState('');
  const [customText, setCustomText] = useState('C G Am F');
  const [beatsPerChord, setBeatsPerChord] = useState(DEFAULT_BEATS_PER_CHORD);
  const [strictMode, setStrictMode] = useState(false); // lenient by default
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
  const [phase, setPhase] = useState('idle'); // idle | demo | countin | run | done
  const [countIn, setCountIn] = useState(0);
  const [demoing, setDemoing] = useState(false);
  // Elapsed seconds since the run's first click — everything visual is a
  // pure function of it. Updated every frame.
  const [now, setNow] = useState(0);
  // { [chordIndex]: 'hit' | 'miss' } — set once per chord.
  const [results, setResults] = useState({});
  const [score, setScore] = useState({ hits: 0, misses: 0 });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [live, setLive] = useState({ hits: 0, misses: 0, onTime: 0 });
  const [result, setResult] = useState(null);
  const [autoTempo, setAutoTempo] = useState(true);
  const [findSpeed, setFindSpeed] = useState(false);
  const [startWhy, setStartWhy] = useState(null);
  // [{midi, state}] — key flashes (PianoKeyboard quizFeedbackKeys).
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
  const rafIdRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);
  // midi -> 'hit' | 'miss' for every key struck during the ACTIVE chord's
  // window — each note's correctness shows the instant it's played.
  const liveFeedbackRef = useRef(new Map());
  // A chord already being played early (see EARLY_S) — its notes so far
  // are kept when its window opens.
  const earlyIndexRef = useRef(-1);
  const waitTimerRef = useRef(null);
  // The run: mode, the clock's origin (perf ms of the first HEARD click,
  // null = waiting for it) and the counters.
  const R = useRef({ running: false });
  const metro = useRef(metronome);
  metro.current = metronome;
  const presetRef = useRef(null); // the current generated set
  const findRef = useRef(false);
  findRef.current = findSpeed;
  const autoRef = useRef(autoTempo);
  autoRef.current = autoTempo;
  const startRunRef = useRef(null);
  const finishRef = useRef(null);

  function activeIndexAt(t) {
    const seq = sequenceRef.current;
    for (let i = 0; i < seq.length; i += 1) {
      if (t >= seq[i].startTime && t < seq[i].endTime) return i;
    }
    return -1;
  }

  // Full success: every target tone flashes green. A miss shows per-note
  // feedback — gold for the notes that WERE struck, red for the others.
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

  // Judges chord `index` exactly once (a satisfying press, or its window
  // closing unsatisfied); `resultsRef` is the source of truth.
  function judgeChord(index, isCorrect) {
    if (resultsRef.current[index] != null) return;
    const entry = sequenceRef.current[index];
    if (!entry) return;
    resultsRef.current = { ...resultsRef.current, [index]: isCorrect ? 'hit' : 'miss' };
    setResults(resultsRef.current);
    flashKeys(entry, isCorrect);
    const S = R.current;
    if (isCorrect) {
      S.hits += 1;
      const at = S.attemptAt.get(index) ?? nowRef.current;
      const off = (at - entry.startTime) * 1000;
      S.offsets.push(off);
      if (Math.abs(off) <= ON_TIME_MS) S.onTime += 1;
      S.combo += 1;
      S.maxCombo = Math.max(S.maxCombo, S.combo);
    } else {
      S.misses += 1;
      S.combo = 0;
    }
    setLive({ hits: S.hits, misses: S.misses, onTime: S.onTime });
    setScore({ hits: S.hits, misses: S.misses });
    setCombo(S.combo);
    setMaxCombo(S.maxCombo);
  }

  function isSatisfied(entry) {
    if (!entry) return false;
    if (strictModeRef.current) {
      if (struckMidiRef.current.size !== entry.tones.length) return false;
      return entry.tones.every((t) => struckMidiRef.current.has(t.midi));
    }
    return [...entry.pitchClasses].every((pc) => struckPitchClassesRef.current.has(pc));
  }

  const elapsedNow = () => (R.current.startAt == null ? 0 : (performance.now() - R.current.startAt) / 1000);

  function handleQuizKeyClick(midi) {
    // A performance tool: every key sounds, right or wrong.
    playPianoNote(midi);
    const S = R.current;
    if (!S.running || S.mode !== 'play' || S.startAt == null) return;
    const t = elapsedNow();
    let index = activeIndexRef.current;
    // The current chord is done (or none is open yet) and the next one is
    // about to start: this press belongs to the next chord.
    const seq = sequenceRef.current;
    const nextIdx = index < 0 ? seq.findIndex((c) => c.startTime > t) : index + 1;
    const next = seq[nextIdx];
    if ((index < 0 || resultsRef.current[index] != null) && next && next.startTime - t <= EARLY_S) {
      if (earlyIndexRef.current !== nextIdx) {
        earlyIndexRef.current = nextIdx;
        struckPitchClassesRef.current = new Set();
        struckMidiRef.current = new Set();
        liveFeedbackRef.current = new Map();
      }
      index = nextIdx;
    }
    if (index < 0 || resultsRef.current[index] != null) {
      // a key between chords: wrong only when it isn't in the chord just played
      return;
    }
    const entry = sequenceRef.current[index];
    const correct = strictModeRef.current
      ? entry.tones.some((tn) => tn.midi === midi)
      : entry.pitchClasses.has(pitchClassOf(midi));
    if (correct && !S.attemptAt.has(index)) S.attemptAt.set(index, t);
    if (!correct) S.wrong += 1;
    struckMidiRef.current.add(midi);
    struckPitchClassesRef.current.add(pitchClassOf(midi));
    liveFeedbackRef.current.set(midi, correct ? 'hit' : 'miss');
    setFeedbackKeys([...liveFeedbackRef.current.entries()].map(([m, state]) => ({ midi: m, state })));
    if (isSatisfied(entry)) judgeChord(index, true);
  }

  // One frame: advance the clock, count in, play (demo) / judge (as a
  // miss) the chords whose windows closed, end the run after the last.
  function tick() {
    const S = R.current;
    if (!S.running) return;
    const elapsed = elapsedNow();
    nowRef.current = elapsed;
    setNow(elapsed);
    const seq = sequenceRef.current;
    const spb = secondsPerBeatRef.current;

    // count-in -> your turn / demo
    const first = seq[0]?.startTime ?? 0;
    if (S.startAt != null) {
      if (elapsed < first - 0.02) {
        const n = Math.max(1, Math.ceil((first - elapsed) / spb - 0.02));
        if (n !== S.count) {
          S.count = n;
          setCountIn(n);
        }
      } else if (S.count !== 0) {
        S.count = 0;
        setCountIn(0);
        setPhase(S.mode === 'demo' ? 'demo' : 'run');
      }
    }

    if (S.mode === 'demo') {
      // play each chord exactly on its click (a frame of look-ahead)
      seq.forEach((c, i) => {
        if (S.played.has(i) || elapsed < c.startTime - 0.03) return;
        S.played.add(i);
        const wait = Math.max(0, (c.startTime - elapsed) * 1000);
        setTimeout(() => {
          if (R.current === S && S.running) playPianoChord(c.tones.map((tn) => tn.midi));
        }, wait);
      });
    } else {
      for (let i = 0; i < seq.length; i += 1) {
        if (resultsRef.current[i] == null && elapsed >= seq[i].endTime) judgeChord(i, false);
      }
    }

    const newActiveIndex = activeIndexAt(elapsed);
    if (newActiveIndex !== activeIndexRef.current) {
      activeIndexRef.current = newActiveIndex;
      if (earlyIndexRef.current !== newActiveIndex) {
        struckPitchClassesRef.current = new Set();
        struckMidiRef.current = new Set();
        liveFeedbackRef.current = new Map();
      }
      earlyIndexRef.current = -1;
    }

    const last = seq[seq.length - 1];
    if (last && elapsed >= last.endTime + TAIL_S) {
      finishRef.current();
      return;
    }
    rafIdRef.current = requestAnimationFrame(tick);
  }

  const itemKey = () => (source === 'custom' ? `custom:${parseProgressionText(customText).map((c) => c.text).join(' ')}` : 'preset');

  function newPreset() {
    const g = generateChordRhythmProgression();
    presetRef.current = g;
    setGeneratedLabel(g.progressionText);
    setBeatsPerChord(g.beatsPerChord);
    return g;
  }

  // Opening the exercise / switching the source: the start tempo from the
  // player's level (the last tempo this progression was passed at, else the
  // chord-rhythm speed measured on any progression).
  function prepare() {
    if (R.current.running) return;
    let suggested = 70;
    if (source === 'preset') suggested = (presetRef.current ?? newPreset()).bpmSuggested ?? 70;
    const s = startBpm({ tool: 'chordRhythm', item: itemKey(), suggested, tools: CHORD_RHYTHM_TOOLS });
    setStartWhy(s.why);
    metro.current.setBpm(s.bpm);
  }

  function loadSequence() {
    let progressionText = customText;
    let nextBeatsPerChord = beatsPerChord;
    if (source === 'preset') {
      const g = R.current.freshNeeded || !presetRef.current ? newPreset() : presetRef.current;
      progressionText = g.progressionText;
      nextBeatsPerChord = g.beatsPerChord;
    }
    secondsPerBeatRef.current = 60 / metro.current.bpm;
    beatsPerChordRef.current = nextBeatsPerChord;
    strictModeRef.current = strictMode;

    const chords = parseProgressionText(progressionText);
    // The lead-in is a whole number of beats, so every chord lands on a click.
    const spb = secondsPerBeatRef.current;
    const leadBeats = Math.max(2, Math.ceil(LEAD_TIME_S / spb));
    const built = buildSequence(chords, spb, nextBeatsPerChord, leadBeats * spb);
    sequenceRef.current = built;
    setSequence(built);
    setFeedbackKeys([]);
    resultsRef.current = {};
    setResults({});
    activeIndexRef.current = -1;
    struckPitchClassesRef.current = new Set();
    struckMidiRef.current = new Set();
    liveFeedbackRef.current = new Map();
    earlyIndexRef.current = -1;
    return { built, leadBeats };
  }

  function startRun(mode) {
    if (R.current.running) finishRef.current({ aborted: true });
    const prev = R.current;
    if (findRef.current) prev.freshNeeded = false; // find-my-speed keeps the same set
    const { built, leadBeats } = loadSequence();
    if (built.length === 0) return;
    R.current = {
      running: true,
      mode,
      startAt: null,
      clockStarted: false,
      count: leadBeats,
      played: new Set(),
      attemptAt: new Map(),
      hits: 0,
      misses: 0,
      onTime: 0,
      wrong: 0,
      combo: 0,
      maxCombo: 0,
      offsets: [],
      startedAt: Date.now(),
      speedBest: findRef.current ? prev.speedBest ?? null : null,
      freshNeeded: false,
      item: itemKey(),
    };
    setLive({ hits: 0, misses: 0, onTime: 0 });
    setScore({ hits: 0, misses: 0 });
    setCombo(0);
    setMaxCombo(0);
    if (mode === 'play') setResult(null);
    setDemoing(mode === 'demo');
    setPhase('countin');
    setCountIn(leadBeats);
    nowRef.current = 0;
    setNow(0);
    // The clock starts on the first HEARD click (onBeatTime below); if it
    // doesn't come (silenced / odd setup), start anyway shortly after.
    clearTimeout(waitTimerRef.current);
    const S = R.current;
    waitTimerRef.current = setTimeout(() => {
      if (S.running && S.startAt == null) S.startAt = performance.now();
    }, 800);
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(tick);
    if (metro.current.isRunning) metro.current.stop();
    setTimeout(() => metro.current.start(), 40);
  }
  startRunRef.current = startRun;

  function finish({ aborted = false } = {}) {
    const S = R.current;
    if (!S.running) return;
    S.running = false;
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    clearTimeout(waitTimerRef.current);
    metro.current.stop();
    setCountIn(0);
    setDemoing(false);
    const judged = S.hits + S.misses;
    if (S.mode === 'demo' || (aborted && judged < MIN_TO_LOG)) {
      setPhase('idle');
      return;
    }
    const bpm = metro.current.bpm;
    const res = runResult({
      bpm,
      total: sequenceRef.current.length,
      hits: S.hits,
      onTime: S.onTime,
      offsets: S.offsets,
      wrong: S.wrong,
      maxCombo: S.maxCombo,
      judged,
      onTimeMs: ON_TIME_MS,
    });
    logPerf({
      tool: 'chordRhythm',
      item: S.item,
      bpm,
      durationMs: Date.now() - S.startedAt,
      metrics: {
        hits: S.hits,
        misses: res.misses,
        total: res.total,
        accuracyPct: res.notesPct,
        timingPct: res.timingPct,
        meanOffsetMs: res.meanOffsetMs,
        spreadMs: res.spreadMs,
        maxCombo: S.maxCombo,
        beatsPerChord: beatsPerChordRef.current,
        strict: strictModeRef.current,
        completed: res.complete,
        passed: res.passed,
        nps: bpm / 60,
      },
    });
    const next = tempoAfter({ res, bpm, find: findRef.current, best: S.speedBest, auto: autoRef.current });
    res.tempo = next.tempo;
    if (next.tempo?.best) res.bestBpm = next.tempo.best;
    S.speedBest = next.best;
    S.freshNeeded = !next.again; // a new starter set for the next run
    if (next.stopFind) setFindSpeed(false);
    if (next.bpm !== bpm) metro.current.setBpm(next.bpm);
    setResult(res);
    setPhase('done');
    if (next.again) setTimeout(() => startRunRef.current('play'), 1200);
  }
  finishRef.current = finish;

  // The clock: the HEARD first click of the shared metronome.
  useEffect(
    () =>
      metronome.onBeatTime((_b, heard) => {
        const S = R.current;
        if (!S.running) return;
        S.clockStarted = true;
        if (S.startAt == null) S.startAt = heard;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // The metronome stopped from outside (its pill): the run stops too.
  useEffect(() => {
    const S = R.current;
    if (S.running && S.clockStarted && !metronome.isRunning) finishRef.current({ aborted: true });
  }, [metronome.isRunning]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      clearTimeout(feedbackTimeoutRef.current);
      clearTimeout(waitTimerRef.current);
    };
  }, []);

  const play = () => startRun('play');
  const demo = () => startRun('demo');
  function stop() {
    if (R.current.running) {
      setFindSpeed(false);
      findRef.current = false;
      finish({ aborted: true });
    }
  }
  function startFindSpeed() {
    setFindSpeed(true);
    findRef.current = true;
    R.current.speedBest = null;
    startRun('play');
  }

  const isPlaying = phase === 'countin' || phase === 'run' || phase === 'demo';
  const ended = phase === 'done';
  const accuracyPct = score.hits + score.misses > 0 ? Math.round((score.hits / (score.hits + score.misses)) * 100) : null;

  // Keys lit on the keyboard: in the demo, the chord being played; with
  // Show keys, the first unjudged chord whose block is already falling.
  const hintKeys = !isPlaying
    ? []
    : demoing
    ? (sequence.find((c) => now >= c.startTime - 0.05 && now < c.endTime)?.tones ?? []).map((tn) => ({ midi: tn.midi }))
    : showKeys
    ? (sequence.find((c, i) => results[i] == null && now >= c.startTime - LEAD_TIME_S && now < c.endTime)?.tones ?? []).map((tn) => ({ midi: tn.midi }))
    : [];

  const exercise = useMemo(() => ({ sequence }), [sequence]);

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
    restart: play,
    stop,
    score,
    combo,
    maxCombo,
    accuracyPct,
    showKeys,
    setShowKeys,
    // PlayAlong (components/PlayAlong)
    exercise,
    phase,
    countIn,
    demoing,
    demo,
    live,
    result,
    autoTempo,
    setAutoTempo,
    findSpeed,
    startFindSpeed,
    startWhy,
    prepare,
    // PianoKeyboard quiz props — spread straight into stagePianoProps.
    // While running every key plays; idle = the normal keyboard.
    quizKeys: isPlaying ? ALL_KEYS : null,
    quizRevealKeys: hintKeys,
    onQuizKeyClick: handleQuizKeyClick,
    quizFeedbackKeys: feedbackKeys,
  };
}
