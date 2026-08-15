import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FALLING_NOTES_SONGS, resolveFallingNotesSong, generateFallingNotesSong } from '../music/fallingNotesSongs';

const HIT_WINDOW_S = 0.35; // generous — this is a learning tool, not a rhythm-game precision test
const TICK_MS = 16; // ~60fps equivalent

// Falling Notes' real-time engine: a clock drives both the note animation
// and a sweep for notes whose hit window has passed unplayed (misses),
// while on-screen key clicks AND Web MIDI note-on messages both feed the
// same handleNotePlayed() scoring path. Ticks on a plain setInterval rather
// than requestAnimationFrame — matching this app's own established pattern
// for exactly this kind of real-time practice-session clock (Ear
// Training's countdown, Bending's hold-progress tracker both already tick
// this way), and unlike rAF it isn't tied to the page actually being
// painted, which matters for a practice tool a player might reasonably
// leave running in a background tab. Elapsed time is always recomputed
// from `performance.now()` each tick rather than counted in tick units, so
// timing stays correct even if a given tick fires late. The clock and
// scoring state live in refs (mirrored to state only for rendering) — the
// MIDI listener is attached once and long-lived, so it would otherwise
// read stale `song`/`results` values captured from whatever render
// attached it, exactly the bug class ensureTimerRunning-style refs avoid
// elsewhere in this app's other real-time hooks.
export function useFallingNotes() {
  const [songKey, setSongKey] = useState(FALLING_NOTES_SONGS[0].key);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [now, setNow] = useState(0);
  const [results, setResults] = useState({}); // { [noteId]: 'hit' | 'miss' }
  const [midiState, setMidiState] = useState('idle'); // 'idle' | 'unsupported' | 'connecting' | 'connected' | 'denied'

  const song = useMemo(() => generateFallingNotesSong(resolveFallingNotesSong(songKey)), [songKey]);

  const songRef = useRef(song);
  useEffect(() => {
    songRef.current = song;
  }, [song]);

  const nowRef = useRef(0);
  const resultsRef = useRef({});
  const intervalRef = useRef(null);
  const startPerfTimeRef = useRef(0);
  const midiAccessRef = useRef(null);
  const midiInputsRef = useRef([]);

  const stopLoop = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const elapsed = (performance.now() - startPerfTimeRef.current) / 1000;
    nowRef.current = elapsed;
    setNow(elapsed);

    const currentSong = songRef.current;
    let changed = false;
    const nextResults = { ...resultsRef.current };
    for (const note of currentSong.notes) {
      if (nextResults[note.id] == null && elapsed > note.time + HIT_WINDOW_S) {
        nextResults[note.id] = 'miss';
        changed = true;
      }
    }
    if (changed) {
      resultsRef.current = nextResults;
      setResults(nextResults);
    }

    if (elapsed >= currentSong.totalDuration) {
      setIsPlaying(false);
      setIsComplete(true);
      stopLoop();
    }
  }, [stopLoop]);

  const start = useCallback(() => {
    stopLoop();
    resultsRef.current = {};
    setResults({});
    setIsComplete(false);
    nowRef.current = 0;
    setNow(0);
    startPerfTimeRef.current = performance.now();
    setIsPlaying(true);
    intervalRef.current = setInterval(tick, TICK_MS);
  }, [stopLoop, tick]);

  const stop = useCallback(() => {
    setIsPlaying(false);
    stopLoop();
  }, [stopLoop]);

  // Shared by on-screen key clicks and Web MIDI note-on messages — finds
  // the closest still-unresolved note matching this pitch within the hit
  // window and marks it a hit. A click/MIDI note with no matching pending
  // note nearby (wrong note, or nothing currently falling) is silently
  // ignored rather than penalized — this rewards correct playing without
  // punishing exploratory mis-clicks on a keyboard the player may not know
  // well yet.
  const handleNotePlayed = useCallback((midi) => {
    const currentSong = songRef.current;
    const currentResults = resultsRef.current;
    const elapsed = nowRef.current;
    let bestNote = null;
    let bestDistance = Infinity;
    for (const note of currentSong.notes) {
      if (currentResults[note.id] != null || note.midi !== midi) continue;
      const distance = Math.abs(elapsed - note.time);
      if (distance <= HIT_WINDOW_S && distance < bestDistance) {
        bestDistance = distance;
        bestNote = note;
      }
    }
    if (bestNote) {
      const nextResults = { ...currentResults, [bestNote.id]: 'hit' };
      resultsRef.current = nextResults;
      setResults(nextResults);
    }
  }, []);

  const handleNotePlayedRef = useRef(handleNotePlayed);
  useEffect(() => {
    handleNotePlayedRef.current = handleNotePlayed;
  }, [handleNotePlayed]);

  // A single stable function identity for the whole hook lifetime (empty
  // dep array) — required so a later removeEventListener call (when inputs
  // change, or on unmount) actually matches the function instance that was
  // added, rather than a new one recreated per render.
  const onMidiMessage = useCallback((e) => {
    const [status, note, velocity] = e.data;
    const isNoteOn = (status & 0xf0) === 0x90 && velocity > 0;
    if (isNoteOn) handleNotePlayedRef.current(note);
  }, []);

  const attachMidiInputs = useCallback(
    (access) => {
      midiInputsRef.current.forEach((input) => input.removeEventListener('midimessage', onMidiMessage));
      midiInputsRef.current = Array.from(access.inputs.values());
      midiInputsRef.current.forEach((input) => input.addEventListener('midimessage', onMidiMessage));
    },
    [onMidiMessage]
  );

  const enableMidi = useCallback(() => {
    if (!navigator.requestMIDIAccess) {
      setMidiState('unsupported');
      return;
    }
    setMidiState('connecting');
    navigator
      .requestMIDIAccess()
      .then((access) => {
        midiAccessRef.current = access;
        attachMidiInputs(access);
        access.onstatechange = () => attachMidiInputs(access);
        setMidiState('connected');
      })
      .catch(() => setMidiState('denied'));
  }, [attachMidiInputs]);

  // Stop the tick loop and detach every MIDI listener on unmount — a real
  // MIDI keyboard left connected after navigating away must not keep
  // firing into a gone component.
  useEffect(() => {
    return () => {
      stopLoop();
      midiInputsRef.current.forEach((input) => input.removeEventListener('midimessage', onMidiMessage));
      if (midiAccessRef.current) midiAccessRef.current.onstatechange = null;
    };
  }, [stopLoop, onMidiMessage]);

  const score = useMemo(() => {
    const values = Object.values(results);
    return { hits: values.filter((v) => v === 'hit').length, misses: values.filter((v) => v === 'miss').length };
  }, [results]);

  return {
    songKey,
    setSongKey,
    songs: FALLING_NOTES_SONGS,
    song,
    isPlaying,
    isComplete,
    now,
    results,
    score,
    midiState,
    enableMidi,
    start,
    stop,
    handleNotePlayed,
  };
}
