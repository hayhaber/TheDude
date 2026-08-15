import { LETTERS, NATURAL_PITCH_CLASS, mod } from './notes';

const ACCIDENTAL_SYMBOLS = { '-2': 'bb', '-1': 'b', 0: '', 1: '#', 2: '##' };

export function accidentalSymbol(accidental) {
  return ACCIDENTAL_SYMBOLS[accidental] ?? '';
}

// "F#" -> { letter: 'F', accidental: 1, pitchClass: 6 }
// "Bb" -> { letter: 'B', accidental: -1, pitchClass: 10 }
export function parseNoteName(input) {
  const match = /^([A-Ga-g])([#b]{0,2})$/.exec(input.trim());
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const accidentalText = match[2];
  let accidental = 0;
  for (const ch of accidentalText) {
    accidental += ch === '#' ? 1 : -1;
  }
  const pitchClass = mod(NATURAL_PITCH_CLASS[letter] + accidental, 12);
  return { letter, accidental, pitchClass };
}

// Given a root letter/pitch-class and a chord tone's scale degree + semitone
// offset from the root, spell that tone using real letter-stacking theory
// (stack by degree, then pick whichever accidental produces the right pitch).
export function spellTone(rootLetter, rootPitchClass, degree, semitones) {
  const rootLetterIndex = LETTERS.indexOf(rootLetter);
  const letterIndex = mod(rootLetterIndex + (degree - 1), 7);
  const letter = LETTERS[letterIndex];
  const naturalPitchClass = NATURAL_PITCH_CLASS[letter];

  const desiredPitchClass = mod(rootPitchClass + semitones, 12);
  let diff = mod(desiredPitchClass - naturalPitchClass, 12);
  if (diff > 6) diff -= 12; // smallest-magnitude accidental (e.g. -1 not +11)

  const accidental = Math.max(-2, Math.min(2, diff));
  return {
    letter,
    accidental,
    label: letter + (ACCIDENTAL_SYMBOLS[accidental] ?? ''),
    pitchClass: desiredPitchClass,
  };
}
