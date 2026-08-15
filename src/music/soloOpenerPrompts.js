// Practice -> Solo Opener content: the four "knobs" a player can vary when
// starting an improvised solo, distilled from the observation that most
// players open every solo almost identically (same string, same note count,
// same rhythm, same entry point relative to the beat) without noticing —
// and that changing any ONE of these is enough to pull a genuinely
// different phrase out of you, since there's no earlier material to fall
// back on habit for. Each round randomly draws one option from each list
// and the panel combines them into a single readable constraint.
export const TIMING_OPTIONS = [
  { id: 'on-beat', en: 'Right on beat 1 — the downbeat', he: 'בדיוק על פעימה 1 — התחלה חזקה' },
  { id: 'late', en: 'Late — hang back, let it drag in behind the beat', he: 'באיחור — תן לזה להיכנס אחרי הפעימה' },
  { id: 'early', en: 'Early — anticipate, already moving before the bar lands', he: 'מוקדם — תתחיל לפני התיבה, כבר בתנועה כשהיא נופלת' },
];

export const STRING_OPTIONS = [
  { id: 'low-e', en: 'the low E string', he: 'מיתר Mi הנמוך' },
  { id: 'a', en: 'the A string', he: 'מיתר La' },
  { id: 'd', en: 'the D string', he: 'מיתר Re' },
  { id: 'g', en: 'the G string', he: 'מיתר Sol' },
  { id: 'b', en: 'the B string', he: 'מיתר Si' },
  { id: 'high-e', en: 'the high E string', he: 'מיתר Mi הגבוה' },
];

export const DENSITY_OPTIONS = [
  { id: 'sustain', en: 'one long held note or bend', he: 'תו אחד מוחזק או כפיפה ארוכה' },
  { id: 'burst', en: 'a short 2–3 note burst', he: 'פרץ קצר של 2–3 תווים' },
  { id: 'run', en: 'a fast 4+ note run', he: 'ריצה מהירה של 4+ תווים' },
];

export const RHYTHM_OPTIONS = [
  { id: 'straight', en: 'straight, even eighth notes', he: 'שמיניות ישרות ואחידות' },
  { id: 'triplet', en: 'a triplet feel', he: 'תחושת טריולות' },
  { id: 'syncopated', en: 'syncopated — off the beat', he: 'סינקופה — חוץ לפעימה' },
];

function pickRandom(options) {
  return options[Math.floor(Math.random() * options.length)];
}

export function generateSoloOpenerPrompt() {
  return {
    timing: pickRandom(TIMING_OPTIONS),
    string: pickRandom(STRING_OPTIONS),
    density: pickRandom(DENSITY_OPTIONS),
    rhythm: pickRandom(RHYTHM_OPTIONS),
  };
}
