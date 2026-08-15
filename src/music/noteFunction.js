import { CHORD_QUALITIES } from './chordQualities';
import { localize } from '../i18n/localize';

const DEGREE_LABELS = {
  1: { en: 'Root', he: 'שורש' },
  3: { en: '3rd', he: 'שלישית' },
  5: { en: '5th', he: 'חמישית' },
  7: { en: '7th', he: 'שביעית' },
};
const EXTENSION_DEGREES = new Set([9, 11, 13]);

// Classifies a note (by scale degree + semitone offset from the chord root)
// against a chord quality's own tones. An exact {degree, semitones} match
// gets that tone's harmonic role; anything else — a chromatic alteration
// (e.g. a blue-note b3 over a major chord) or a non-chord scale tone — is a
// passing tone. Pure, reused by both chord-shape dots (chordQualities.js
// roles, already exact matches by construction) and lick notes (generateLick.js,
// which may include real passing tones).
export function classifyChordTone(qualityKey, degree, semitones) {
  const quality = CHORD_QUALITIES[qualityKey];
  if (!quality) return 'passing';

  const exact = quality.tones.find((t) => t.degree === degree && t.semitones === semitones);
  if (exact) return exact.role;

  if (degree === 1) return 'root';
  if (degree === 3) return 'third';
  if (degree === 5) return 'fifth';
  if (degree === 7) return 'seventh';
  if (EXTENSION_DEGREES.has(degree)) return 'extension';
  return 'passing';
}

// Human-readable scale-degree label for the Note Info panel.
export function degreeLabel(role, degree, lang) {
  if (role === 'bass') return lang === 'he' ? 'תו בס מוגדר' : 'Specified bass note';
  if (role === 'passing') return lang === 'he' ? 'תו מעבר' : 'Passing tone';
  if (role === 'extension') return lang === 'he' ? `הרחבה (${degree})` : `Extension (${degree}th)`;
  return localize(DEGREE_LABELS[degree], lang) ?? (lang === 'he' ? `דרגה ${degree}` : `Degree ${degree}`);
}

const FUNCTION_REASONS = {
  root: {
    en: 'The root of the chord — its home base and the most stable, resolved note you can land on.',
    he: 'השורש של האקורד — הבית שלו, והתו היציב והמותר ביותר שאפשר לנחות עליו.',
  },
  third: {
    en: 'The 3rd of the chord — defines major or minor quality and resolves strongly to the root.',
    he: 'השלישית של האקורד — קובעת אם האיכות היא מז\'ורית או מינורית, ומתרת בחוזקה לשורש.',
  },
  fifth: {
    en: "The 5th of the chord — a stable, open-sounding tone that reinforces the chord without adding tension.",
    he: 'החמישית של האקורד — תו יציב ובעל צליל פתוח, המחזק את האקורד בלי להוסיף מתח.',
  },
  seventh: {
    en: 'The 7th of the chord — adds color and creates a pull back toward the root or the next chord.',
    he: 'השביעית של האקורד — מוסיפה צבע ויוצרת משיכה חזרה אל השורש או אל האקורד הבא.',
  },
  extension: {
    en: 'An extension (9th/11th/13th) — colorful but less stable; works best as a passing or decorative tone.',
    he: 'הרחבה (9/11/13) — צבעונית אך פחות יציבה; עובדת הכי טוב כתו מעבר או תו קישוט.',
  },
  passing: {
    en: "Outside the chord's own tones — a passing or chromatic note. Use it briefly and resolve to a chord tone.",
    he: 'מחוץ לתווי האקורד עצמו — תו מעבר או כרומטי. השתמשו בו לזמן קצר והתירו לתו אקורד.',
  },
  bass: {
    en: "The bass note specified by the slash chord — the lowest-sounding note, setting the harmony's foundation.",
    he: 'תו הבס שהוגדר על ידי אקורד ה-slash — התו הנמוך ביותר, הקובע את יסוד ההרמוניה.',
  },
};

export function functionReason(role, lang) {
  return localize(FUNCTION_REASONS[role] ?? FUNCTION_REASONS.passing, lang);
}
