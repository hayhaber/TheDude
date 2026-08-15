import { useEffect, useRef, useState } from 'react';
import { GUITAR_CHORD_RHYTHM_MODES, generateGuitarChordRhythmProgression, parseGuitarChordProgressionText } from '../music/guitarChordRhythmContent';
import { useMicChordDetector } from './useMicChordDetector';

// Same "how long before its window opens the block/chip is already
// visible" convention as the piano version, and the same reasoning: a
// fixed reaction-time budget in real seconds, not a beat count, so it
// never gets uncomfortably short at fast tempos.
export const LEAD_TIME_S = 2.5;
const TAIL_S = 0.6;
const DEFAULT_MODE = GUITAR_CHORD_RHYTHM_MODES[0].key;
const DEFAULT_BEATS_PER_CHORD = 4;
const AUTO_SEQUENCE_LENGTH = 8;
const AUTO_TOPUP_LENGTH = 8; // how many more chords 'timer'/'endless' auto mode generates once the queue is running low
const AUTO_TIMER_S = 60; // the "60-second timer" auto-duration option
const NEAR_END_THRESHOLD = 2; // top up once fewer than this many chords remain queued after the active one

function repeatList(list, times) {
  const out = [];
  for (let i = 0; i < Math.max(0, times); i += 1) out.push(...list);
  return out;
}

// Builds one contiguous, back-to-back block of timed chords starting at
// `startTime` — used both for the initial sequence (startTime = LEAD_TIME_S)
// and for extending it later (startTime = the previous last chord's own
// endTime, so a loop repeat or a freshly-generated top-up batch continues
// the timeline with zero gap and stays perfectly on the beat).
function buildTimedChords(chordList, startTime, secondsPerBeat, beatsPerChord) {
  return chordList.map((chord, i) => {
    const s = startTime + i * beatsPerChord * secondsPerBeat;
    const e = s + beatsPerChord * secondsPerBeat;
    return { ...chord, startTime: s, endTime: e };
  });
}

// Guitar's own "Guitar Hero for chords" — architecturally the exact same
// continuous-tick-loop engine as useChordRhythm.js (piano), rebuilt here
// rather than shared because judging is fundamentally different: piano
// judges discrete key clicks against exact MIDI notes; this judges a
// continuously-updating microphone chord GUESS (see useMicChordDetector.js)
// against a target {rootPitchClass, qualityKey} — there's no click to
// gate on, so the tick loop itself checks "does the mic's current best
// guess match the active chord" every frame instead of waiting for a
// discrete input event.
//
// Three content sources (mirrors the piano version's preset/custom split,
// plus a third for real-song practice):
//   'auto'   — generated from a chord-name pool (see guitarChordRhythmContent.js),
//              with its own duration mode: a fixed short run, a 60s timer,
//              or endless-until-stopped (each topped up with a fresh
//              theory-generated batch as the queue runs low).
//   'custom' — one typed progression (any chord parseChordSymbol accepts,
//              not just the four generated pools), optionally looped.
//   'song'   — an arbitrary, player-extendable LIST of progression groups
//              (verse/chorus/bridge/however many), each with its own repeat
//              count, chained into one sequence; optionally looped as a
//              whole once every group has played through. A group can be
//              typed directly here (plain chord text, judged/shown with a
//              default fretboard voicing), or arrive already-voiced from
//              Compose's "Training" handoff (see loadGroupsFromCompose) —
//              in which case its `chords` carry the EXACT fretboard shape
//              the player chose there, shown as-is during practice.
// 'loop' only applies to 'custom'/'song' (a fixed, player-authored
// sequence repeating itself) — 'auto' mode's own duration selector already
// covers "keep going," via freshly-varied content rather than a repeat.
export function useGuitarChordRhythm(metronome) {
  const [source, setSource] = useState('auto'); // 'auto' | 'custom' | 'song'
  const [mode, setMode] = useState(DEFAULT_MODE);
  const [autoDuration, setAutoDuration] = useState('fixed'); // 'fixed' | 'timer' | 'endless'
  const [customText, setCustomText] = useState('G D Em C');
  // Each group: { id, text, repeats, chords }. `chords` is null for a
  // typed group (re-parsed from `text` at load time via
  // parseGuitarChordProgressionText, and shown with a default computed
  // fretboard voicing — see GuitarChordRhythmPanel.jsx); populated with
  // {chordText, rootPitchClass, qualityKey, voicing, capoFret} entries for
  // a group that arrived from Compose, carrying its exact chosen voicing.
  const [groups, setGroups] = useState([
    { id: 'g1', text: 'Em C G D', repeats: 2, chords: null },
    { id: 'g2', text: 'G D Em C', repeats: 2, chords: null },
  ]);
  const [loop, setLoop] = useState(false);
  const [beatsPerChord, setBeatsPerChord] = useState(DEFAULT_BEATS_PER_CHORD);
  const [viewMode, setViewMode] = useState('falling'); // 'falling' | 'timeline'

  const [sequence, setSequence] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [now, setNow] = useState(0);
  const [results, setResults] = useState({}); // { [index]: 'hit' | 'miss' }
  const [score, setScore] = useState({ hits: 0, misses: 0 });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  // 'match' | 'mismatch' | null — the mic's CURRENT guess compared against
  // whichever chord is active right now, updated every frame. This is what
  // gives real-time positive/negative feedback while a chord's window is
  // still open, distinct from `results[index]`, which is only set once a
  // chord is fully judged (on a match, or once its window times out).
  const [micMatchStatus, setMicMatchStatus] = useState(null);

  const mic = useMicChordDetector();

  const sequenceRef = useRef([]);
  const resultsRef = useRef({});
  const activeIndexRef = useRef(-1);
  const secondsPerBeatRef = useRef(0.75);
  const beatsPerChordRef = useRef(DEFAULT_BEATS_PER_CHORD);
  const nowRef = useRef(0);
  const startPerfTimeRef = useRef(0);
  const rafIdRef = useRef(null);
  const micMatchStatusRef = useRef(null);
  // Snapshotted at loadSequence() time — every control that drives these is
  // disabled while playing, so they never change mid-session, but a ref
  // (not the raw state closure) matches this codebase's existing
  // convention (see useChordRhythm.js's strictModeRef) for what the
  // long-lived tick() closure reads.
  const sourceRef = useRef('auto');
  const modeRef = useRef(DEFAULT_MODE);
  const autoDurationRef = useRef('fixed');
  const loopRef = useRef(false);
  // The ORIGINAL (un-repeated-for-looping) chord list for 'custom'/'song' —
  // what gets re-appended each time the loop wraps back to the start.
  const baseLoopListRef = useRef(null);

  function judgeChord(index, isCorrect) {
    if (resultsRef.current[index] != null) return;
    resultsRef.current = { ...resultsRef.current, [index]: isCorrect ? 'hit' : 'miss' };
    setResults(resultsRef.current);
    setScore((s) => (isCorrect ? { ...s, hits: s.hits + 1 } : { ...s, misses: s.misses + 1 }));
    setCombo((c) => {
      const next = isCorrect ? c + 1 : 0;
      setMaxCombo((m) => Math.max(m, next));
      return next;
    });
  }

  function endSession() {
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    metronome.stop();
    mic.stopListening();
    setIsPlaying(false);
    setEnded(true);
  }

  function activeIndexAt(t) {
    const seq = sequenceRef.current;
    for (let i = 0; i < seq.length; i += 1) {
      if (t >= seq[i].startTime && t < seq[i].endTime) return i;
    }
    return -1;
  }

  // Tops up the queued sequence once it's running low, so a session never
  // "runs dry" mid-loop/mid-timer/mid-endless-run — called every tick, a
  // no-op unless fewer than NEAR_END_THRESHOLD chords remain after the
  // active one AND the current mode actually wants more (see the comment
  // on the hook itself for which source/duration combos extend vs. end).
  function extendIfNeeded(elapsed) {
    const seq = sequenceRef.current;
    const remaining = seq.length - (activeIndexRef.current + 1);
    if (activeIndexRef.current < 0 || remaining > NEAR_END_THRESHOLD) return;

    let more = null;
    if (sourceRef.current === 'auto') {
      if (autoDurationRef.current === 'fixed') return;
      if (autoDurationRef.current === 'timer' && elapsed >= AUTO_TIMER_S) return;
      more = generateGuitarChordRhythmProgression(modeRef.current, AUTO_TOPUP_LENGTH).sequence;
    } else if (loopRef.current && baseLoopListRef.current && baseLoopListRef.current.length > 0) {
      more = baseLoopListRef.current;
    }
    if (!more || more.length === 0) return;

    const last = seq[seq.length - 1];
    const built = buildTimedChords(more, last.endTime, secondsPerBeatRef.current, beatsPerChordRef.current);
    sequenceRef.current = [...seq, ...built];
    setSequence(sequenceRef.current);
  }

  // rAF-driven, exactly like useChordRhythm.js's own tick — see that
  // hook's comment on why a timer-based loop reads as stuttery compared to
  // one scheduled right before the browser's next actual paint.
  function tick() {
    const elapsed = (performance.now() - startPerfTimeRef.current) / 1000;
    nowRef.current = elapsed;
    setNow(elapsed);

    activeIndexRef.current = activeIndexAt(elapsed);

    // The mic's current best guess, checked against whichever chord is
    // active RIGHT NOW — a match ends that chord's window early as a hit,
    // the same "early satisfying answer" pattern the piano version's click
    // handler gives, just driven by a continuous signal instead of a
    // discrete event. Also drives micMatchStatus (see its own comment) for
    // real-time positive/negative feedback independent of judging.
    const activeIndex = activeIndexRef.current;
    const g = mic.guessRef.current;
    let matchStatus = null;
    if (activeIndex >= 0) {
      const target = sequenceRef.current[activeIndex];
      if (g) matchStatus = g.root === target.rootPitchClass && g.qualityKey === target.qualityKey ? 'match' : 'mismatch';
      if (matchStatus === 'match' && resultsRef.current[activeIndex] == null) judgeChord(activeIndex, true);
    }
    if (matchStatus !== micMatchStatusRef.current) {
      micMatchStatusRef.current = matchStatus;
      setMicMatchStatus(matchStatus);
    }

    extendIfNeeded(elapsed);

    const seq = sequenceRef.current;
    for (let i = 0; i < seq.length; i += 1) {
      if (resultsRef.current[i] == null && elapsed >= seq[i].endTime) {
        judgeChord(i, false);
      }
    }

    const last = seq[seq.length - 1];
    if (last && elapsed >= last.endTime + TAIL_S) {
      endSession();
      return;
    }
    rafIdRef.current = requestAnimationFrame(tick);
  }

  function loadSequence() {
    sourceRef.current = source;
    modeRef.current = mode;
    autoDurationRef.current = autoDuration;
    loopRef.current = loop;

    let chordList;
    let bpm = metronome.bpm;
    let nextBeatsPerChord = beatsPerChord;
    let baseLoopList = null;

    if (source === 'auto') {
      const generated = generateGuitarChordRhythmProgression(mode, AUTO_SEQUENCE_LENGTH);
      chordList = generated.sequence;
      bpm = generated.bpmSuggested;
      nextBeatsPerChord = generated.beatsPerChord;
    } else if (source === 'song') {
      chordList = groups.flatMap((g) => repeatList(g.chords ?? parseGuitarChordProgressionText(g.text), g.repeats));
      baseLoopList = chordList;
    } else {
      chordList = parseGuitarChordProgressionText(customText);
      baseLoopList = chordList;
    }

    metronome.setBpm(bpm);
    setBeatsPerChord(nextBeatsPerChord);
    secondsPerBeatRef.current = 60 / bpm;
    beatsPerChordRef.current = nextBeatsPerChord;
    baseLoopListRef.current = baseLoopList;

    const built = buildTimedChords(chordList, LEAD_TIME_S, secondsPerBeatRef.current, nextBeatsPerChord);
    sequenceRef.current = built;
    setSequence(built);
    setEnded(false);
    setScore({ hits: 0, misses: 0 });
    setCombo(0);
    setMaxCombo(0);
    resultsRef.current = {};
    setResults({});
    activeIndexRef.current = -1;
    micMatchStatusRef.current = null;
    setMicMatchStatus(null);
    return built;
  }

  function addGroup() {
    setGroups((gs) => [...gs, { id: `${Date.now()}-${Math.random()}`, text: '', repeats: 2, chords: null }]);
  }

  function removeGroup(id) {
    setGroups((gs) => gs.filter((g) => g.id !== id));
  }

  // Editing a group's text by hand takes back manual control — any voicing
  // it arrived with from Compose no longer matches what's typed, so it's
  // dropped in favor of a plain re-parse + default fretboard voicing (same
  // as any other typed group).
  function updateGroupText(id, text) {
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, text, chords: null } : g)));
  }

  function updateGroupRepeats(id, repeats) {
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, repeats } : g)));
  }

  // Compose -> Training handoff: replaces the group list wholesale with
  // whatever Compose captured — each incoming group already carries its
  // exact per-chord fretboard voicing (App.jsx's buildCurrentTrainingGroup),
  // which flows straight through buildTimedChords into the sequence, so the
  // panel can render the SAME shape the player chose in Compose rather than
  // a default guess. Does not auto-start playback — the player presses
  // Start themselves (same as arriving at this tab any other way, and keeps
  // audio playback gated behind an explicit gesture).
  function loadGroupsFromCompose(composeGroups) {
    setGroups(
      composeGroups.map((g, i) => ({
        id: g.id ?? `${Date.now()}-${i}`,
        text: g.chordsText,
        repeats: 1,
        chords: g.chords.map((c) => ({ ...c, capoFret: g.capoFret })),
      }))
    );
    setSource('song');
  }

  async function play() {
    const built = loadSequence();
    if (built.length === 0) return;
    setEnded(false);
    setIsPlaying(true);
    nowRef.current = 0;
    setNow(0);
    await mic.startListening();
    startPerfTimeRef.current = performance.now();
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(tick);
    metronome.start();
  }

  function restart() {
    play();
  }

  function stop() {
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = null;
    metronome.stop();
    mic.stopListening();
    setIsPlaying(false);
  }

  useEffect(() => {
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const accuracyPct = score.hits + score.misses > 0 ? Math.round((score.hits / (score.hits + score.misses)) * 100) : null;

  return {
    source,
    setSource,
    mode,
    setMode,
    autoDuration,
    setAutoDuration,
    customText,
    setCustomText,
    groups,
    addGroup,
    removeGroup,
    updateGroupText,
    updateGroupRepeats,
    loadGroupsFromCompose,
    loop,
    setLoop,
    beatsPerChord,
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
    micIsListening: mic.isListening,
    micError: mic.error,
    micGuess: mic.guess,
    micMatchStatus,
  };
}
