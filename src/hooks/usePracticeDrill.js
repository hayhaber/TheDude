import { useEffect, useRef, useState } from 'react';
import { STANDARD_TUNING } from '../music/notes';
import { playNote } from '../audio/chordPlayer';

const SUBDIVISION = { quarter: 1, '8th': 2, '16th': 4, triplet: 3 };

// Drives Practice & Drill Engine playback off the SAME metronome instance
// the visible Metronome panel uses (passed in, not created here) — no
// second tempo clock. `metronome.currentBeat` already fires once per
// quarter-note beat via the existing lookahead scheduler (audio/metronome.js,
// untouched); this hook advances one sequence step per beat, and for
// exercises with a finer noteValue (8th/16th/triplet) schedules the
// in-between sub-steps via setTimeout, timed off the metronome's live bpm.
// That's a deliberate trade-off: sub-step *visual* timing isn't run through
// the audio-context lookahead scheduler the way click *sound* is, so a few
// ms of jitter is possible on fast runs — acceptable for fretboard
// highlighting, not worth complicating the untouched audio engine for.
export function usePracticeDrill(metronome, onSessionEnd) {
  const [exercise, setExercise] = useState(null);
  // Tags the currently loaded exercise (exerciseId/context) so a completed
  // session can be attributed to whichever surface loaded it (drills / caged
  // / scales) when logged via onSessionEnd — usePracticeHistory stays fed
  // from this one place rather than duplicated in every caller.
  const sessionRef = useRef(null);
  // Actual practice time for the current exercise: accumulates only while
  // isPlaying is true, so pausing (manually, or leaving the section) freezes
  // it and resuming continues from where it left off — "time spent
  // practicing," not wall-clock time since load.
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedMsRef = useRef(0);
  const runStartRef = useRef(null);
  const [mode, setMode] = useState('static'); // 'static' | 'live'
  const [stepIndex, setStepIndex] = useState(0);
  // "Hear it" — only meaningful during Live Playback (per the request: hear
  // the exercise as it's actually stepping through, not while browsing
  // Static Overview). Refs mirror the reactive state so the beat-driven
  // effect below (which only depends on metronome.currentBeat, same as the
  // stepIndex advance itself) always reads the latest value without
  // needing to be torn down/rebuilt every time either changes.
  const [hearAudio, setHearAudio] = useState(false);
  // What the fretboard overlay's note dots show: the note's letter name, or
  // its 1-based position in the exercise sequence — the latter so you can
  // tell "this is the note I play 4th" at a glance, without having to
  // mentally count dots. Applies uniformly wherever this drill engine is
  // used (Practice -> Drills, Studies -> CAGED workout, Studies -> Scales
  // practice), same as every other piece of state here.
  const [noteLabelMode, setNoteLabelMode] = useState('note'); // 'note' | 'order'
  const hearAudioRef = useRef(hearAudio);
  useEffect(() => {
    hearAudioRef.current = hearAudio;
  }, [hearAudio]);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  const stepIndexRef = useRef(stepIndex);
  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);

  const bpmRef = useRef(metronome.bpm);
  useEffect(() => {
    bpmRef.current = metronome.bpm;
  }, [metronome.bpm]);

  // Tracks whether the user has manually changed BPM since the last
  // loadExercise() call, so we don't stomp a deliberate tweak — but a fresh
  // load always re-applies that exercise's own suggested BPM.
  const bpmOverriddenRef = useRef(false);
  const lastAppliedBpmRef = useRef(null);
  useEffect(() => {
    if (lastAppliedBpmRef.current !== null && metronome.bpm !== lastAppliedBpmRef.current) {
      bpmOverriddenRef.current = true;
    }
  }, [metronome.bpm]);

  // Folds the currently-open run (if any) into elapsedMsRef and stops the
  // clock — shared by pause() and exit() so a session ending while still
  // playing doesn't lose its last running span.
  function flushElapsed() {
    if (runStartRef.current !== null) {
      elapsedMsRef.current += Date.now() - runStartRef.current;
      runStartRef.current = null;
      setElapsedMs(elapsedMsRef.current);
    }
  }

  // Logs whatever's accumulated for the current session (skipped if nothing
  // meaningful was practiced) and zeroes the timer — shared by exit() and by
  // loadExercise() when it's replacing an already-loaded exercise, so
  // switching straight to a new drill without hitting Exit first doesn't
  // silently drop the time already spent on the previous one.
  function commitSession() {
    flushElapsed();
    if (sessionRef.current && onSessionEnd && elapsedMsRef.current > 0) {
      onSessionEnd({
        exerciseId: sessionRef.current.exerciseId,
        context: sessionRef.current.context,
        durationMs: elapsedMsRef.current,
        bpm: metronome.bpm,
      });
    }
    elapsedMsRef.current = 0;
    setElapsedMs(0);
  }

  function loadExercise(ex, context) {
    if (sessionRef.current) commitSession();
    setExercise(ex);
    setStepIndex(0);
    setMode('static');
    if (!bpmOverriddenRef.current) {
      metronome.setBpm(ex.bpmSuggested);
      lastAppliedBpmRef.current = ex.bpmSuggested;
    }
    bpmOverriddenRef.current = false;
    sessionRef.current = { exerciseId: ex.id, context };
  }

  function exit() {
    metronome.stop();
    commitSession();
    sessionRef.current = null;
    setExercise(null);
    setStepIndex(0);
  }

  function play() {
    if (!exercise) return;
    runStartRef.current = Date.now();
    metronome.start();
  }

  function pause() {
    metronome.stop();
    flushElapsed();
  }

  // "Start this attempt over" — zeroes the visible timer for the currently
  // loaded exercise without touching history, distinct from exit(). The UI
  // only enables this while paused, so there's no running span to flush.
  function resetTimer() {
    elapsedMsRef.current = 0;
    setElapsedMs(0);
  }

  function stepManual(direction) {
    if (!exercise) return;
    setStepIndex((i) => (i + direction + exercise.sequence.length) % exercise.sequence.length);
  }

  // Advance on every metronome beat, plus scheduled sub-beats for finer
  // note values. Sub-beats are polled against absolute target times
  // (performance.now() + offset) on a short interval rather than chained via
  // individual setTimeout delays — plain setTimeout has no way to "catch up":
  // if the main thread is busy when one fires (e.g. the Drum Machine's own
  // audio scheduling running alongside), the delay is simply late, and on a
  // fast grid (16th notes) those small lags compound within the same beat.
  // Polling re-checks "is it time yet" every ~20ms, so a delayed check still
  // catches up on the very next tick instead of drifting for the rest of
  // the beat.
  useEffect(() => {
    if (!exercise || !metronome.isRunning || metronome.currentBeat === null) return undefined;

    const advance = () => {
      const next = (stepIndexRef.current + 1) % exercise.sequence.length;
      stepIndexRef.current = next;
      setStepIndex(next);
      if (hearAudioRef.current && modeRef.current === 'live') {
        const note = exercise.sequence[next];
        playNote(STANDARD_TUNING[note.string].baseMidi + note.fret);
      }
    };
    advance();

    const subdivision = SUBDIVISION[exercise.noteValue] ?? 1;
    if (subdivision <= 1) return undefined;

    const beatSeconds = 60 / bpmRef.current;
    const start = performance.now();
    const targets = [];
    for (let i = 1; i < subdivision; i += 1) {
      targets.push(start + ((beatSeconds * i) / subdivision) * 1000);
    }
    let nextTargetIndex = 0;

    const pollId = setInterval(() => {
      const now = performance.now();
      while (nextTargetIndex < targets.length && now >= targets[nextTargetIndex]) {
        advance();
        nextTargetIndex += 1;
      }
      if (nextTargetIndex >= targets.length) clearInterval(pollId);
    }, 20);

    return () => clearInterval(pollId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronome.currentBeat]);

  // Ticks the visible elapsed-time readout once a second while a run is
  // open — elapsedMsRef itself only updates on pause/exit (see
  // flushElapsed), so without this the on-screen timer would sit frozen
  // for the whole run instead of counting up live.
  useEffect(() => {
    if (runStartRef.current === null || !metronome.isRunning) return undefined;
    const intervalId = setInterval(() => {
      // Re-check on every tick, not just when the effect (re)starts: pause()/
      // flushElapsed() can null this out slightly before this effect's own
      // cleanup runs, and Date.now() - null coerces to Date.now() itself
      // (null -> 0), which would corrupt elapsedMs with a huge bogus value.
      if (runStartRef.current !== null) {
        setElapsedMs(elapsedMsRef.current + (Date.now() - runStartRef.current));
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [metronome.isRunning]);

  return {
    exercise,
    mode,
    setMode,
    stepIndex,
    elapsedMs,
    resetTimer,
    isPlaying: metronome.isRunning && !!exercise,
    loadExercise,
    exit,
    play,
    pause,
    stepManual,
    hearAudio,
    setHearAudio,
    noteLabelMode,
    setNoteLabelMode,
  };
}
