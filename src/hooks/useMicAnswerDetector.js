import { useEffect, useRef } from 'react';
import { usePitchDetection } from './usePitchDetection';

const STABLE_MS = 120; // how long a note must hold steady before it counts as "played", so pick-attack transients don't misfire
const REQUIRED_CLARITY = 0.9; // matches usePitchDetection's own MIN_CLARITY gate — belt and suspenders since it already filters currentNote

// Turns usePitchDetection's continuous stream of "what pitch is this instant"
// into discrete "the user played this note" events for Ear Training's mic
// answer mode. A held note only fires once (after STABLE_MS of the same
// MIDI value), and re-arms only once the mic goes quiet again — otherwise a
// single sustained guitar note would submit dozens of duplicate answers per
// second, one per pitch-detection tick.
export function useMicAnswerDetector(onNoteDetected) {
  const { isListening, startListening, stopListening, currentNote, clarity, error } = usePitchDetection();

  const armedRef = useRef(true);
  const stableMidiRef = useRef(null);
  const stableSinceRef = useRef(0);
  const onNoteDetectedRef = useRef(onNoteDetected);
  onNoteDetectedRef.current = onNoteDetected;

  useEffect(() => {
    if (!currentNote || clarity < REQUIRED_CLARITY) {
      armedRef.current = true; // silence (or noise) re-arms for the next note
      stableMidiRef.current = null;
      return;
    }

    const now = performance.now();
    if (currentNote.midi !== stableMidiRef.current) {
      stableMidiRef.current = currentNote.midi;
      stableSinceRef.current = now;
      return;
    }

    if (armedRef.current && now - stableSinceRef.current >= STABLE_MS) {
      armedRef.current = false;
      onNoteDetectedRef.current(currentNote.midi);
    }
  }, [currentNote, clarity]);

  return { isListening, startListening, stopListening, currentNote, error };
}
