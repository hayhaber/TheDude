import { useEffect, useRef, useState } from 'react';
import { generateSoloOpenerPrompt } from '../music/soloOpenerPrompts';
import { logPerf } from '../coach/perfLog';

const BEATS_PER_BAR = 4;
const DEFAULT_BARS = 4;

// "Drill the opening phrase" practice loop: the metronome runs for a fixed
// number of bars, a randomized constraint (timing/string/note-count/rhythm)
// tells the player how to change up THIS pass's opening, then the loop
// wraps around and draws a fresh constraint automatically — no judging, no
// right/wrong, this is a creative-practice tool, not a quiz. Reuses the
// same shared metronome instance every other Practice drill does, and the
// same "advance on metronome.currentBeat" pattern useRhythmGame.js /
// usePracticeDrill.js already use for beat-driven (not smooth-animation)
// state, since all that's needed here is discrete bar counting.
export function useSoloOpener(metronome) {
  const [bars, setBars] = useState(DEFAULT_BARS);
  const [prompt, setPrompt] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBar, setCurrentBar] = useState(0);
  const [roundCount, setRoundCount] = useState(0);

  const beatCounterRef = useRef(0);
  const firstBeatRef = useRef(true);
  // For the performance log: beats counted since Start, and when it started.
  const sessionRef = useRef(null); // { startedAt, beats, rounds } while running

  function newRound() {
    setPrompt(generateSoloOpenerPrompt());
    setRoundCount((r) => r + 1);
    if (sessionRef.current) sessionRef.current.rounds += 1;
    beatCounterRef.current = 0;
    setCurrentBar(1);
  }

  // One tick per metronome beat: advance the bar counter, and once the loop
  // length is reached, wrap back to bar 1 with a brand new constraint — this
  // is what makes "press play, get a fresh idea every N bars, no need to
  // stop and restart" work without any per-frame animation.
  useEffect(() => {
    if (!isPlaying || metronome.currentBeat === null) return undefined;
    if (firstBeatRef.current) {
      firstBeatRef.current = false;
      return undefined;
    }
    if (sessionRef.current) sessionRef.current.beats += 1;
    beatCounterRef.current += 1;
    const bar = Math.floor(beatCounterRef.current / BEATS_PER_BAR) + 1;
    if (bar > bars) {
      newRound();
      return undefined;
    }
    setCurrentBar(bar);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metronome.currentBeat]);

  function play() {
    firstBeatRef.current = true;
    setRoundCount(0); // a fresh Start is a new session, not a continuation — newRound() below bumps it to 1
    sessionRef.current = { startedAt: Date.now(), beats: 0, rounds: 0 };
    newRound();
    setIsPlaying(true);
    metronome.start();
  }

  function stop() {
    metronome.stop();
    setIsPlaying(false);
    // Logged once at least one full round (bars x 4 beats) went by.
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session && session.beats >= bars * BEATS_PER_BAR) {
      logPerf({
        tool: 'soloOpener',
        item: `${bars}bars`,
        bpm: metronome.bpm,
        durationMs: Date.now() - session.startedAt,
        metrics: { rounds: session.rounds, completedRounds: Math.floor(session.beats / (bars * BEATS_PER_BAR)), bars, beats: session.beats },
      });
    }
  }

  // Manually grab a new idea without waiting for the loop to come back
  // around — the article's own drill ("press play, try a new way in, stop,
  // restart") is naturally satisfied by the auto-looping above, but letting
  // the player reshuffle on demand mid-loop keeps it flexible. Unlike
  // play(), the metronome is already running and its beat count doesn't
  // reset, so firstBeatRef must stay false here — the next beat is a real
  // beat to count, not the "start pulse" play() needs to discount.
  function shuffle() {
    newRound();
  }

  useEffect(() => {
    return () => metronome.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    bars,
    setBars,
    prompt,
    isPlaying,
    currentBar,
    roundCount,
    play,
    stop,
    shuffle,
  };
}
