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
  if (question.kind === 'interval') {
    playNote(notes[0].midi);
    setTimeout(() => playNote(notes[1].midi), 650);
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
