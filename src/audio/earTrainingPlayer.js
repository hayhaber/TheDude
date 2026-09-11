import { playNote } from './chordPlayer';

// Plays a quiz question's notes — pitch/triad are effectively simultaneous
// (triad gets a light strum-like stagger), interval and call & response
// notes play one after another with a gap so they're distinguishable.
// Feedback after the player answers a pitch/fret question: always sound the
// note they actually picked (so a wrong guess is heard, not just seen), and
// on a miss follow it a beat later with the correct note so the ear can
// compare the two directly — that A/B is the whole point of the exercise.
export function playAnswerFeedbackAudio(pickedMidi, correctMidi) {
  playNote(pickedMidi);
  if (correctMidi != null && correctMidi !== pickedMidi) {
    setTimeout(() => playNote(correctMidi), 620);
  }
}

export function playQuestionAudio(question) {
  if (!question) return;
  const notes = question.notesToPlay;

  if (question.kind === 'pitch') {
    playNote(notes[0].midi);
    return;
  }
  if (question.kind === 'triad' || question.kind === 'chord') {
    notes.forEach((n, i) => setTimeout(() => playNote(n.midi), i * 90));
    return;
  }
  if (question.kind === 'scaledegree') {
    // I-IV-V-I cadence first (light strum-like stagger per chord, same
    // technique the chord/triad kinds above use), THEN — after a clear gap
    // so the ear has actually settled into the key — the single target
    // note on its own, unambiguous.
    question.cadenceChords.forEach((chord, ci) => {
      chord.forEach((midi, ni) => setTimeout(() => playNote(midi), ci * 500 + ni * 25));
    });
    const targetDelay = question.cadenceChords.length * 500 + 350;
    setTimeout(() => playNote(notes[0].midi), targetDelay);
    return;
  }
  if (question.kind === 'direction') {
    // Always melodic/sequential — direction is inherently a "which came
    // second, and was it higher or lower" percept, so playing both notes
    // together would defeat the exercise.
    playNote(notes[0].midi);
    setTimeout(() => playNote(notes[1].midi), 650);
    return;
  }
  if (question.kind === 'interval') {
    // Harmonic (played together) vs melodic (one after another) — see
    // generateIntervalQuestion's own comment for why this varies per
    // question rather than being one fixed style.
    playNote(notes[0].midi);
    if (question.harmonic) {
      playNote(notes[1].midi);
    } else {
      setTimeout(() => playNote(notes[1].midi), 650);
    }
    return;
  }
  if (question.kind === 'callresponse') {
    notes.forEach((n, i) => setTimeout(() => playNote(n.midi), i * 550));
    return;
  }
  if (question.kind === 'scaleid') {
    notes.forEach((n, i) => setTimeout(() => playNote(n.midi), i * 220));
  }
}
