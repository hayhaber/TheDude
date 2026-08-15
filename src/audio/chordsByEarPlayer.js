import { playNote } from './chordPlayer';

// Playback for the "Chords by Ear" course — its own small player (not
// earTrainingPlayer.js) since its drills need things that one doesn't:
// looping a chord on a beat grid (chord-change detection) and playing a
// multi-chord progression in tempo (progression-pattern recognition), not
// just single question-and-done audio.

// A chord "strummed" — notes staggered like a real down-strum rather than
// all firing at once, same light stagger earTrainingPlayer.js uses.
export function playChordVoicing(notesToPlay) {
  if (!notesToPlay) return;
  notesToPlay.forEach((n, i) => setTimeout(() => playNote(n.midi), i * 55));
}

// Plays a single low reference note (the "home" tonic) — used to establish
// the key before a functional-hearing question, the same "sing against a
// drone" anchor real relative-pitch ear training starts every exercise with.
export function playReferenceTone(midi) {
  playNote(midi);
}

// Plays a sequence of chord voicings back to back, one per bar, at `bpm`
// (4 beats/bar). Returns a cancel function — every drill that loops audio
// needs a way to stop a previous run before starting a new one, otherwise
// two overlapping setTimeout chains would both keep firing. `onStepChange(i)`
// — optional — fires exactly when step `i` starts, so a caller can sync a
// visual (e.g. the shared Fretboard) to whichever chord is currently
// sounding, not just play audio with no visual feedback.
export function playProgression(chordVoicings, { bpm = 90, onStepChange } = {}) {
  const beatMs = 60000 / bpm;
  const barMs = beatMs * 4;
  const timers = [];
  chordVoicings.forEach((voicing, i) => {
    timers.push(
      setTimeout(() => {
        playChordVoicing(voicing);
        onStepChange?.(i);
      }, i * barMs)
    );
  });
  return () => timers.forEach(clearTimeout);
}

// Functional-hearing question: reference tone, then the I chord (both
// establishing "home"), then the target chord — the exact "sing against a
// drone, then hear the target relative to it" sequence relative-pitch ear
// training uses. Returns a cancel function like the others.
export function playFunctionalQuestionAudio({ referenceToneMidi, referenceNotesToPlay, targetNotesToPlay }) {
  const timers = [];
  timers.push(setTimeout(() => playReferenceTone(referenceToneMidi), 0));
  timers.push(setTimeout(() => playChordVoicing(referenceNotesToPlay), 500));
  timers.push(setTimeout(() => playChordVoicing(targetNotesToPlay), 1600));
  return () => timers.forEach(clearTimeout);
}

// Bass-motion drill: plays chord A, then chord B after a short gap — a
// plain "before, then after" comparison rather than a beat-timed loop,
// since the question is only about the direction of the jump between the
// two, not about catching a change in time.
export function playBassMotionDemo({ voicingA, voicingB, onStepChange }) {
  const timers = [];
  timers.push(
    setTimeout(() => {
      playChordVoicing(voicingA);
      onStepChange?.('A');
    }, 0)
  );
  timers.push(
    setTimeout(() => {
      playChordVoicing(voicingB);
      onStepChange?.('B');
    }, 900)
  );
  return () => timers.forEach(clearTimeout);
}

// Generic "play A, then B" comparison pair — same mechanic as
// playBassMotionDemo above, reused under its own name for QualityDrill's
// incorrect-answer remediation replay (hear the correct quality right next
// to the one you guessed, the same "1-3 vs 1-b3 back to back" technique
// certified ear-training methods use to fix a quality mix-up).
export const playComparisonPair = playBassMotionDemo;

// Chord-change detection drill: strums chordA once per beat for
// `beatsBeforeChange` beats, then switches to chordB and keeps strumming it
// (so there's always audio to listen to, not just one hit) — `totalBeats`
// controls how long the whole demo runs. Returns a cancel function, same
// reason as playProgression.
export function playChangeDemo({ voicingA, voicingB, beatsBeforeChange, bpm = 90, totalBeats = 8, onStepChange }) {
  const beatMs = 60000 / bpm;
  const timers = [];
  for (let beat = 0; beat < totalBeats; beat += 1) {
    const isA = beat < beatsBeforeChange;
    const voicing = isA ? voicingA : voicingB;
    // Only fire onStepChange right at the switch (beat 0, and the exact
    // beat chordB takes over) — not every single beat — so a visual
    // synced to it changes exactly when the audio does, not once per strum.
    const fireChange = beat === 0 || beat === beatsBeforeChange;
    timers.push(
      setTimeout(() => {
        playChordVoicing(voicing);
        if (fireChange) onStepChange?.(isA ? 'A' : 'B');
      }, beat * beatMs)
    );
  }
  return () => timers.forEach(clearTimeout);
}
