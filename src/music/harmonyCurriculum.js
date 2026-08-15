// The Studies -> Harmony & Chord Theory course's content model — same
// hand-authored-data + small-pure-helpers pattern as cagedCurriculum.js/
// scalesCurriculum.js/circleOfFifthsCurriculum.js. Diatonic chords are built
// here by genuinely stacking 3rds on the existing scale-family interval data
// (scalesCurriculum.js's SCALE_FAMILIES) — the same method a real theory
// class teaches — rather than a lookup table, so it's automatically correct
// for major, natural minor, and harmonic minor alike. Fretboard/piano
// rendering reuses the app's one shared chord engine (chordQualities.js's
// CHORD_QUALITIES, via computeChordPositions/computePianoChordTones called
// from App.jsx, same call-site pattern as every other Studies course) — nothing
// here adds a second chord-shape or chord-tone engine.
import { noteNameForPitchClass } from './scaleShapes';
import { SCALE_FAMILIES } from './scalesCurriculum';
import { mod } from './notes';

// --- Levels (this course groups by student level, not by topic, per an
// explicit request) -------------------------------------------------------
export const HARMONY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  PRACTICE: 'practice',
};

export const HARMONY_LEVEL_LABELS = {
  [HARMONY_LEVELS.BEGINNER]: { en: 'Beginner', he: 'מתחילים' },
  [HARMONY_LEVELS.INTERMEDIATE]: { en: 'Intermediate', he: 'בינוני' },
  [HARMONY_LEVELS.ADVANCED]: { en: 'Advanced', he: 'מתקדמים' },
  [HARMONY_LEVELS.PRACTICE]: { en: 'Practice', he: 'תרגול' },
};

// --- Chord-quality <-> chord-symbol-suffix, for the qualities this app's
// shared chord engine (chordQualities.js) actually supports. Only these can
// be handed to computeChordPositions/computePianoChordTones for a live
// fretboard/piano demo; anything outside this set (half-diminished 7ths,
// minor-major7, augmented-major7 — all real but rare diatonic byproducts,
// see classifySeventh below) still gets a theory-correct label and spelled
// notes, just without an interactive shape.
const QUALITY_SUFFIX = {
  major: '',
  minor: 'm',
  dim: 'dim',
  aug: 'aug',
  dominant7: '7',
  major7: 'maj7',
  minor7: 'm7',
  dim7: 'dim7',
  add9: 'add9',
};

export const QUALITY_LABELS = {
  major: { en: 'Major', he: 'מז\'ור' },
  minor: { en: 'Minor', he: 'מינור' },
  dim: { en: 'Diminished', he: 'דימיניושד' },
  aug: { en: 'Augmented', he: 'אוגמנטד' },
  dominant7: { en: 'Dominant 7th', he: 'דומיננטי 7' },
  major7: { en: 'Major 7th', he: 'מז\'ור 7' },
  minor7: { en: 'Minor 7th', he: 'מינור 7' },
  dim7: { en: 'Diminished 7th', he: 'דימיניושד 7' },
  add9: { en: 'Add 9', he: 'Add 9' },
};

export function chordTextFor(rootPitchClass, qualityKey) {
  const suffix = QUALITY_SUFFIX[qualityKey];
  if (suffix === undefined) return null;
  return noteNameForPitchClass(rootPitchClass) + suffix;
}

// --- Diatonic chord builder -------------------------------------------
// Stacks two (triad) or three (7th) further 3rds on top of each scale
// degree, in semitones, using ONLY the scale's own interval list — this is
// the textbook method (Kostka & Payne's Tonal Harmony, the standard
// undergrad theory text, teaches diatonic triads exactly this way: "build a
// triad on every scale degree by stacking thirds within the scale").
function stackedInterval(intervals, fromDegree, stepsUp) {
  const idx = mod(fromDegree + stepsUp, 7);
  const octaves = Math.floor((fromDegree + stepsUp) / 7);
  return intervals[idx] + octaves * 12;
}

function classifyTriad(thirdInterval, fifthInterval) {
  if (thirdInterval === 4 && fifthInterval === 7) return 'major';
  if (thirdInterval === 3 && fifthInterval === 7) return 'minor';
  if (thirdInterval === 3 && fifthInterval === 6) return 'dim';
  if (thirdInterval === 4 && fifthInterval === 8) return 'aug';
  return 'major'; // unreachable for the 3 scale families used here, kept safe
}

// Returns { engineQuality, label } — engineQuality is a chordQualities.js
// key when one exists for this exact tone stack, null otherwise (still a
// real, nameable 7th chord — see comment on QUALITY_SUFFIX above).
function classifySeventh(triadQuality, seventhInterval) {
  if (triadQuality === 'major' && seventhInterval === 11) return { engineQuality: 'major7', label: 'maj7' };
  if (triadQuality === 'major' && seventhInterval === 10) return { engineQuality: 'dominant7', label: '7' };
  if (triadQuality === 'minor' && seventhInterval === 10) return { engineQuality: 'minor7', label: '7' };
  if (triadQuality === 'minor' && seventhInterval === 11) return { engineQuality: null, label: '(maj7)' };
  if (triadQuality === 'dim' && seventhInterval === 10) return { engineQuality: null, label: 'ø7' };
  if (triadQuality === 'dim' && seventhInterval === 9) return { engineQuality: 'dim7', label: '°7' };
  if (triadQuality === 'aug' && seventhInterval === 11) return { engineQuality: null, label: '+maj7' };
  return { engineQuality: null, label: '7' };
}

const BASE_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

function romanForTriad(degreeIndex, triadQuality) {
  const base = BASE_NUMERALS[degreeIndex];
  if (triadQuality === 'minor') return base.toLowerCase();
  if (triadQuality === 'dim') return base.toLowerCase() + '°';
  if (triadQuality === 'aug') return base + '+';
  return base;
}

// The 3 functional families every intro harmony course teaches: chords that
// share 2 of their 3 notes with the tonic triad behave like "home" (tonic),
// the ones sharing notes with the subdominant push away from home
// (subdominant), and the ones sharing notes with the dominant (built a 5th
// above the tonic) pull strongly back toward it (dominant). This is the
// standard grouping (Piston's Harmony / Kostka & Payne both teach it this
// way) — I=vi=iii lean tonic, ii=IV lean subdominant, V=vii° lean dominant.
export const FUNCTION_FOR_DEGREE = {
  major: ['tonic', 'subdominant', 'tonic', 'subdominant', 'dominant', 'tonic', 'dominant'],
};

export const FUNCTION_LABELS = {
  tonic: { en: 'Tonic', he: 'טוניקה' },
  subdominant: { en: 'Subdominant', he: 'סאב-דומיננטה' },
  dominant: { en: 'Dominant', he: 'דומיננטה' },
};

// Builds all 7 diatonic chords of a key. `seventh` adds a 4th stacked 3rd.
// Every chord: { degreeIndex, roman, rootPitchClass, engineQuality,
// chordText (null if unsupported), noteNames: [...], function (triads only,
// natural-major-scale terms — used loosely as a teaching aid for minor keys
// too, not a claim that minor-key function theory is identical). }
export function buildDiatonicChords(rootPitchClass, familyKey, seventh = false) {
  const family = SCALE_FAMILIES[familyKey];
  const intervals = family.intervals;
  return intervals.map((rootInterval, degreeIndex) => {
    const thirdInterval = stackedInterval(intervals, degreeIndex, 2) - rootInterval;
    const fifthInterval = stackedInterval(intervals, degreeIndex, 4) - rootInterval;
    const triadQuality = classifyTriad(thirdInterval, fifthInterval);
    const chordRootPitchClass = mod(rootPitchClass + rootInterval, 12);

    const noteSemitones = [0, thirdInterval, fifthInterval];
    let roman = romanForTriad(degreeIndex, triadQuality);
    let engineQuality = triadQuality;
    let seventhLabel = null;

    if (seventh) {
      const seventhInterval = stackedInterval(intervals, degreeIndex, 6) - rootInterval;
      noteSemitones.push(seventhInterval);
      const classified = classifySeventh(triadQuality, seventhInterval);
      engineQuality = classified.engineQuality;
      seventhLabel = classified.label;
      // Half-diminished's "ø" already implies the diminished triad beneath
      // it — the customary notation is "viiø7", not "vii°ø7" — so this one
      // case uses the plain lowercase base instead of romanForTriad's own
      // '°' suffix (still added normally for a fully-diminished vii°7).
      const romanBase = seventhLabel === 'ø7' ? BASE_NUMERALS[degreeIndex].toLowerCase() : romanForTriad(degreeIndex, triadQuality);
      roman = romanBase + seventhLabel;
    }

    return {
      degreeIndex,
      roman,
      rootPitchClass: chordRootPitchClass,
      triadQuality,
      engineQuality,
      chordText: engineQuality ? chordTextFor(chordRootPitchClass, engineQuality) : null,
      noteNames: noteSemitones.map((s) => noteNameForPitchClass(chordRootPitchClass + s)),
      // Tonic/subdominant/dominant grouping is only authored for the major
      // scale (see FUNCTION_FOR_DEGREE above) — real, but out of this
      // course's scope for minor keys, so it's left unset rather than
      // silently mislabeling a minor-key diatonic chord with major-key roles.
      function: !seventh && familyKey === 'major' ? FUNCTION_FOR_DEGREE.major[degreeIndex] : null,
    };
  });
}

// --- Lesson content ---------------------------------------------------
function lesson(id, level, title, description, extra = {}) {
  return { id, level, title, description, ...extra };
}

export const HARMONY_LESSONS = [
  lesson(
    'harmony-what-is-a-chord',
    HARMONY_LEVELS.BEGINNER,
    { en: 'What Is a Chord?', he: 'מהו אקורד?' },
    {
      en:
        'A chord is 3 or more notes sounding together. The most basic chord, a "triad," has exactly 3 notes, always ' +
        'called by the same 3 names: the root, the 3rd, and the 5th. You get there by stacking two 3rd-intervals on ' +
        'top of the root, one at a time — root, then a note a 3rd above it (that\'s the chord\'s "3rd"), then ' +
        'another note a 3rd above THAT (which lands a 5th above the root — that\'s the chord\'s "5th"). In C major, ' +
        'that\'s C (root), E (3rd), G (5th). Almost all of Western harmony, from a beginner\'s first open chords to ' +
        'a jazz musician\'s most complex voicings, ultimately traces back to this one idea: stacking 3rds.',
      he:
        'אקורד הוא 3 תווים או יותר המושמעים יחד. לאקורד הבסיסי ביותר, "טריאד", יש בדיוק 3 תווים, שנקראים תמיד ' +
        'באותם 3 שמות: השורש (Root), השלישית (3rd), והחמישית (5th). מגיעים לזה על ידי הנחת שתי שלישיות (מרווחים) ' +
        'זו על גבי זו, אחת בכל פעם: השורש, ואז תו שלישית מעליו (וזו ה"שלישית" של האקורד), ואז תו נוסף שלישית מעל ' +
        'זה (שנופל בדיוק חמישית מעל השורש — וזו ה"חמישית" של האקורד). בדו מז\'ור, אלה דו (שורש), מי (שלישית), וסול ' +
        '(חמישית). כמעט כל ההרמוניה המערבית, מהאקורדים הפתוחים הראשונים של מתחיל ועד לווויסינגים המורכבים ביותר ' +
        'של מוזיקאי ג\'אז, חוזרת בסופו של דבר לרעיון האחד הזה: הנחת שלישיות זו על גבי זו.',
    },
    { kind: 'overview', demo: { type: 'fixed', chordText: 'C' } }
  ),
  lesson(
    'harmony-triad-qualities',
    HARMONY_LEVELS.BEGINNER,
    { en: 'Major, Minor, Diminished, Augmented', he: 'מז\'ור, מינור, דימיניושד, אוגמנטד' },
    {
      en:
        'There are only 4 possible triads, and the difference between them is entirely in the size of the two ' +
        'stacked 3rds. Major (big 3rd + small 3rd) sounds bright and resolved. Minor (small 3rd + big 3rd) sounds ' +
        'darker. Diminished (small 3rd + small 3rd) sounds tense and unstable — it wants to resolve somewhere. ' +
        'Augmented (big 3rd + big 3rd) sounds suspended and ambiguous, with no clear "down" — every one of its ' +
        'intervals is identical. Toggle between all 4 below on the same root to hear the difference for yourself.',
      he:
        'קיימות רק 4 טריאדות אפשריות, וההבדל ביניהן טמון כולו בגודל שתי השלישיות המוערמות. מז\'ור (שלישית גדולה + ' +
        'שלישית קטנה) נשמע בהיר ופתור. מינור (שלישית קטנה + שלישית גדולה) נשמע כהה יותר. דימיניושד (שלישית קטנה + ' +
        'שלישית קטנה) נשמע מתוח ולא יציב — הוא רוצה להיפתר למשהו. אוגמנטד (שלישית גדולה + שלישית גדולה) נשמע מרחף ' +
        'ודו-משמעי, ללא "כיוון" ברור — כל המרווחים בו זהים. עברו בין כל ה-4 למטה על אותו שורש כדי לשמוע את ההבדל ' +
        'בעצמכם.',
    },
    { kind: 'demo', demo: { type: 'chordToggle', options: ['major', 'minor', 'dim', 'aug'] } }
  ),
  lesson(
    'harmony-diatonic-triads',
    HARMONY_LEVELS.BEGINNER,
    { en: 'Diatonic Triads: The Key\'s Own Chords', he: 'טריאדות דיאטוניות: האקורדים של הסולם' },
    {
      en:
        'Stack a 3rd-and-a-3rd on every single note of a major scale, using only notes that already belong to that ' +
        'scale, and you get exactly 7 triads — one per scale degree, numbered with Roman numerals I through vii°. ' +
        'These are a key\'s "diatonic" chords: the chords that belong to it, the ones a simple song in that key is ' +
        'built almost entirely from. Notice the pattern that always repeats: I, IV, and V come out major; ii, iii, ' +
        'and vi come out minor; vii alone comes out diminished — true in every major key, not just this one.',
      he:
        'הניחו שלישית-ועוד-שלישית על כל תו בסולם מז\'ור, תוך שימוש רק בתווים ששייכים כבר לסולם הזה, ותקבלו בדיוק 7 ' +
        'טריאדות — אחת לכל דרגת סולם, ממוספרות בספרות רומיות I עד vii°. אלה האקורדים ה"דיאטוניים" של הסולם: ' +
        'האקורדים ששייכים לו, אלה ששיר פשוט בסולם הזה בנוי כמעט כולו מהם. שימו לב לתבנית שחוזרת תמיד: I, IV, ו-V ' +
        'יוצאים מז\'ור; ii, iii, ו-vi יוצאים מינור; vii לבדו יוצא דימיניושד — נכון בכל סולם מז\'ורי, לא רק בזה.',
    },
    { kind: 'demo', demo: { type: 'diatonicTable', family: 'major', seventh: false } }
  ),
  lesson(
    'harmony-chord-function',
    HARMONY_LEVELS.BEGINNER,
    { en: 'Chord Function: Tonic, Subdominant, Dominant', he: 'פונקציית אקורד: טוניקה, סאב-דומיננטה, דומיננטה' },
    {
      en:
        'The 7 diatonic chords sort into 3 functional "roles," grouped by which notes they share with each other. ' +
        'Tonic (I, iii, vi) is home — stable, resolved, where a progression wants to land. Dominant (V, vii°) is ' +
        'maximum tension — it wants to pull back to the tonic, and almost always does. Subdominant (ii, IV) is ' +
        'in between — motion away from home, usually heading toward the dominant next. A huge amount of harmony is ' +
        'just tonic -> subdominant -> dominant -> tonic in different orders and disguises.',
      he:
        '7 האקורדים הדיאטוניים מתחלקים ל-3 "תפקידים" הרמוניים, מקובצים לפי אילו תווים הם חולקים אחד עם השני. ' +
        'טוניקה (I, iii, vi) היא הבית — יציבה, פתורה, המקום שאליו רצף אקורדים רוצה לנחות. דומיננטה (V, vii°) היא ' +
        'המתח המקסימלי — היא רוצה להימשך בחזרה לטוניקה, וכמעט תמיד עושה זאת. סאב-דומיננטה (ii, IV) היא באמצע — ' +
        'תנועה הרחק מהבית, לרוב בדרך אל הדומיננטה הבאה. חלק עצום מהרמוניה הוא פשוט טוניקה -> סאב-דומיננטה -> ' +
        'דומיננטה -> טוניקה, בסדרים ובתחפושות שונות.',
    },
    { kind: 'demo', demo: { type: 'diatonicTable', family: 'major', seventh: false, showFunction: true } }
  ),
  lesson(
    'harmony-I-IV-V',
    HARMONY_LEVELS.BEGINNER,
    { en: 'The I-IV-V Progression', he: 'הרצף I-IV-V' },
    {
      en:
        'Tonic, subdominant, dominant, tonic — I-IV-V-I — is the single most common chord progression in Western ' +
        'music, the backbone of blues, folk, rock, and pop. It is also exactly the "neighbor keys" trick from the ' +
        'Circle of Fifths course: IV and V are literally the keys sitting one step to either side of I on the ' +
        'circle. Play through the 3 chords below in the selected key.',
      he:
        'טוניקה, סאב-דומיננטה, דומיננטה, טוניקה — I-IV-V-I — הוא הרצף האקורדי הנפוץ ביותר במוזיקה המערבית, עמוד ' +
        'השדרה של בלוז, פולק, רוק, ופופ. זהו גם בדיוק הטריק "השכנים במעגל" מקורס מעגל החמישיות: IV ו-V הם ממש ' +
        'הסולמות היושבים צעד אחד מכל צד של I על המעגל. נגנו את 3 האקורדים למטה בסולם הנבחר.',
    },
    { kind: 'demo', demo: { type: 'progression', chords: [{ offset: 0, quality: 'major', roman: 'I' }, { offset: 5, quality: 'major', roman: 'IV' }, { offset: 7, quality: 'major', roman: 'V' }] } }
  ),
  lesson(
    'harmony-inversions',
    HARMONY_LEVELS.BEGINNER,
    { en: 'Chord Inversions', he: 'היפוכי אקורד' },
    {
      en:
        'The same chord can be played with a different note on the bottom — "root position" has the root lowest, ' +
        '"1st inversion" has the 3rd lowest, "2nd inversion" has the 5th lowest. The notes are identical; only the ' +
        'order changes. Inversions matter because they smooth out bass movement between chords — instead of the ' +
        'bass leaping around, it can step gradually, which is exactly why a bass line and a chord\'s root note are ' +
        'not always the same thing. Try the picker below on piano (guitarists get a related effect for free: which ' +
        'string a barre-chord shape\'s lowest note falls on).',
      he:
        'אותו אקורד יכול להתנגן עם תו שונה בתחתית — "פוזיציית שורש" עם השורש הכי נמוך, "היפוך ראשון" עם השלישית ' +
        'הכי נמוכה, "היפוך שני" עם החמישית הכי נמוכה. התווים זהים; רק הסדר משתנה. היפוכים חשובים כי הם מחליקים את ' +
        'תנועת הבס בין אקורדים — במקום שהבס יקפוץ סביב, הוא יכול לצעוד בהדרגה, וזו בדיוק הסיבה שקו בס ותו השורש ' +
        'של אקורד אינם תמיד אותו דבר. נסו את הבוחר למטה על פסנתר (גיטריסטים מקבלים אפקט קרוב בחינם: על איזה מיתר ' +
        'נופל התו הכי נמוך של צורת ברה).',
    },
    { kind: 'demo', demo: { type: 'inversion' } }
  ),

  lesson(
    'harmony-seventh-chords',
    HARMONY_LEVELS.INTERMEDIATE,
    { en: 'Seventh Chords: Adding a 4th Note', he: 'אקורדי 7: הוספת תו רביעי' },
    {
      en:
        'Stack one more 3rd on top of a triad and you get a 7th chord — richer and more colorful than a plain ' +
        'triad, the backbone of jazz harmony (though common everywhere). The 3 most important: major7 (bright, ' +
        'dreamy — a major triad plus a note a half-step below the octave), dominant7 (bluesy, restless — a major ' +
        'triad plus a note a whole-step below the octave, the strongest "pull toward resolution" chord in tonal ' +
        'music), and minor7 (mellow, jazzy — a minor triad plus the same whole-step-below-octave note as dominant7).',
      he:
        'הניחו עוד שלישית אחת על גבי טריאד ותקבלו אקורד 7 — עשיר וצבעוני יותר מטריאד רגיל, עמוד השדרה של הרמוניית ' +
        'הג\'אז (אם כי נפוץ בכל מקום). 3 החשובים ביותר: מז\'ור7 (בהיר, חלומי — טריאד מז\'ור בתוספת תו חצי-צעד מתחת ' +
        'לאוקטבה), דומיננטי7 (בלוזי, חסר מנוחה — טריאד מז\'ור בתוספת תו צעד-שלם מתחת לאוקטבה, אקורד ה"משיכה לפתרון" ' +
        'החזק ביותר במוזיקה טונלית), ומינור7 (רך, ג\'אזי — טריאד מינור בתוספת אותו תו צעד-שלם-מתחת-לאוקטבה כמו ' +
        'דומיננטי7).',
    },
    { kind: 'demo', demo: { type: 'chordToggle', options: ['major7', 'minor7', 'dominant7', 'dim7'] } }
  ),
  lesson(
    'harmony-diatonic-sevenths',
    HARMONY_LEVELS.INTERMEDIATE,
    { en: 'Diatonic Seventh Chords', he: 'אקורדי 7 דיאטוניים' },
    {
      en:
        'Add a 4th stacked 3rd to each of the 7 diatonic triads and the pattern gets one degree richer: Imaj7, ' +
        'ii7, iii7, IVmaj7, V7, vi7, and vii — a diminished triad plus a note a whole-step below the octave, which ' +
        'makes it "half-diminished" (written ø7), not fully diminished. Notice V7 is the ONLY dominant7 chord in ' +
        'the whole key — one more reason it pulls so strongly back to I.',
      he:
        'הוסיפו שלישית מוערמת רביעית לכל אחת מ-7 הטריאדות הדיאטוניות והתבנית מתעשרת בדרגה אחת: Imaj7, ii7, iii7, ' +
        'IVmaj7, V7, vi7, ו-vii — טריאד דימיניושד בתוספת תו צעד-שלם מתחת לאוקטבה, מה שהופך אותו ל"חצי-דימיניושד" ' +
        '(נכתב ø7), ולא דימיניושד מלא. שימו לב ש-V7 הוא אקורד הדומיננטי7 היחיד בכל הסולם — עוד סיבה שהוא נמשך כה ' +
        'חזק בחזרה ל-I.',
    },
    { kind: 'demo', demo: { type: 'diatonicTable', family: 'major', seventh: true } }
  ),
  lesson(
    'harmony-ii-V-I',
    HARMONY_LEVELS.INTERMEDIATE,
    { en: 'The ii-V-I Progression', he: 'הרצף ii-V-I' },
    {
      en:
        'The single most common progression in jazz (and everywhere pop borrows jazz harmony from): subdominant, ' +
        'dominant, tonic. What makes it so strong is the bass motion — ii to V to I each move down a perfect 5th ' +
        '(or up a 4th, same distance), the strongest root movement in tonal harmony, the exact same motion that ' +
        'builds the Circle of Fifths itself. Once this shape is memorized in one key, moving it to any other key is ' +
        'just starting the same shape somewhere else.',
      he:
        'הרצף הנפוץ ביותר בג\'אז (ובכל מקום שהפופ שואל ממנו הרמוניה): סאב-דומיננטה, דומיננטה, טוניקה. מה שהופך ' +
        'אותו לכה חזק היא תנועת הבס — ii ל-V ל-I כל אחד זז חמישית צרה כלפי מטה (או רביעית כלפי מעלה, אותו מרחק), ' +
        'תנועת השורש החזקה ביותר בהרמוניה טונלית, אותה תנועה בדיוק שבונה את מעגל החמישיות עצמו. ברגע שהצורה הזו ' +
        'משוננת בסולם אחד, מעבר לכל סולם אחר הוא פשוט התחלת אותה צורה במקום אחר.',
    },
    { kind: 'demo', demo: { type: 'progression', chords: [{ offset: 2, quality: 'minor7', roman: 'ii7' }, { offset: 7, quality: 'dominant7', roman: 'V7' }, { offset: 0, quality: 'major7', roman: 'Imaj7' }] } }
  ),
  lesson(
    'harmony-secondary-dominants',
    HARMONY_LEVELS.INTERMEDIATE,
    { en: 'Secondary Dominants', he: 'דומיננטות משניות' },
    {
      en:
        'A dominant7 chord doesn\'t only have to resolve to the actual tonic — it can briefly point to ANY diatonic ' +
        'chord, borrowing that chord\'s "own V7" from outside the key. This is a secondary dominant, labeled ' +
        '"V7/x" (read "five of x"). The most common: V7/V, the dominant of the dominant — in the key of C, that\'s ' +
        'D7 resolving to G, adding forward pull exactly where a plain diatonic G could feel a little flat. It works ' +
        'because, borrowed or not, it\'s still that same strongest-possible root motion: down a 5th.',
      he:
        'אקורד דומיננטי7 לא חייב להיפתר רק לטוניקה האמיתית — הוא יכול להצביע באופן זמני על כל אקורד דיאטוני, ' +
        'ולשאול את ה"V7 המשלו" מחוץ לסולם. זוהי דומיננטה משנית, מסומנת "V7/x" (נקרא "חמש של x"). הנפוצה ביותר: ' +
        'V7/V, הדומיננטה של הדומיננטה — בסולם דו מז\'ור, זהו D7 הנפתר לסול — מוסיף משיכה קדימה בדיוק במקום שבו ' +
        'סול דיאטוני רגיל עלול להרגיש קצת שטוח. זה עובד כי, שאול או לא, זו עדיין אותה תנועת שורש החזקה ביותר: ' +
        'חמישית כלפי מטה.',
    },
    { kind: 'demo', demo: { type: 'progression', chords: [{ offset: 2, quality: 'dominant7', roman: 'V7/V' }, { offset: 7, quality: 'major', roman: 'V' }] } }
  ),
  lesson(
    'harmony-minor-key-harmony',
    HARMONY_LEVELS.INTERMEDIATE,
    { en: 'Minor Key Harmony', he: 'הרמוניה בסולם מינורי' },
    {
      en:
        'Build diatonic triads on natural minor and the v chord comes out minor, not major — it lacks a real ' +
        '"leading tone" (a note a half-step below the tonic pulling strongly up into it), so it doesn\'t resolve to ' +
        'i nearly as strongly as a major V does to I. The fix, used constantly in real minor-key music: raise the ' +
        '7th degree, which turns the natural minor scale into harmonic minor and turns v into V (major) — now with ' +
        'a genuine leading tone. Compare both below.',
      he:
        'בנו טריאדות דיאטוניות על מינור טבעי, ואקורד ה-v יוצא מינורי, לא מז\'ורי — חסר לו "תו הובלה" אמיתי (תו ' +
        'חצי-צעד מתחת לטוניקה שמושך חזק כלפי מעלה לתוכה), ולכן הוא לא נפתר ל-i בעוצמה שבה V מז\'ורי נפתר ל-I. ' +
        'הפתרון, בשימוש מתמיד במוזיקה מינורית אמיתית: הגביהו את הדרגה השביעית, מה שהופך את המינור הטבעי למינור ' +
        'הרמוני והופך את v ל-V (מז\'ור) — עכשיו עם תו הובלה אמיתי. השוו בין השניים למטה.',
    },
    { kind: 'demo', demo: { type: 'diatonicTable', family: 'naturalMinor', compareFamily: 'harmonicMinor', seventh: false } }
  ),

  lesson(
    'harmony-extended-chords',
    HARMONY_LEVELS.ADVANCED,
    { en: 'Extended Chords: 9ths, 11ths, 13ths', he: 'אקורדים מורחבים: 9, 11, 13' },
    {
      en:
        'Keep stacking 3rds past the 7th and you get "extensions": a 9th (one 3rd past the 7th — the same note as ' +
        'a 2nd, an octave up), an 11th (same as a 4th), a 13th (same as a 6th). These add color without changing a ' +
        'chord\'s basic identity or function — a Cmaj9 is still fundamentally a tonic C chord, just a richer-sounding ' +
        'one. Jazz leans on these heavily; pop and rock use them more sparingly, often just add9 (a 9th added ' +
        'without the 7th) for a bright, open color.',
      he:
        'המשיכו להערים שלישיות מעבר ל-7 ותקבלו "הרחבות": תשיעית (עוד שלישית מעבר ל-7 — אותו תו כמו שנייה, אוקטבה ' +
        'למעלה), אחת-עשרה (כמו רביעית), שלוש-עשרה (כמו שישית). אלה מוסיפות צבע בלי לשנות את הזהות או הפונקציה ' +
        'הבסיסית של האקורד — Cmaj9 הוא עדיין במהותו אקורד טוניקה של דו, רק עשיר יותר בצליל. ג\'אז נשען על אלה ' +
        'רבות; פופ ורוק משתמשים בהן בצמצום רב יותר, לרוב רק add9 (תשיעית שמתווספת בלי ה-7) לצבע בהיר ופתוח.',
    },
    { kind: 'demo', demo: { type: 'chordToggle', options: ['dominant7', 'add9'] } }
  ),
  lesson(
    'harmony-modal-interchange',
    HARMONY_LEVELS.ADVANCED,
    { en: 'Modal Interchange (Borrowed Chords)', he: 'השאלה מודאלית (אקורדים שאולים)' },
    {
      en:
        'A major key can "borrow" chords from its parallel minor (same tonic, e.g. C major borrowing from C minor) ' +
        'for extra color — this is modal interchange. The most common borrowed chords: iv (minor iv instead of the ' +
        'diatonic major IV — a classic wistful, bittersweet move heard constantly in pop and rock), bVI, and bVII. ' +
        'They stand out because they use a note (like Eb in the key of C) that isn\'t actually in the major scale — ' +
        'that\'s the tell that a chord has been borrowed rather than diatonic.',
      he:
        'סולם מז\'ורי יכול "לשאול" אקורדים מהמינור המקביל שלו (אותה טוניקה, למשל דו מז\'ור שואל מדו מינור) לצבע ' +
        'נוסף — זוהי השאלה מודאלית. האקורדים השאולים הנפוצים ביותר: iv (מינור iv במקום ה-IV המז\'ורי הדיאטוני — ' +
        'מהלך נוסטלגי-מריר קלאסי הנשמע כל הזמן בפופ וברוק), bVI, ו-bVII. הם בולטים כי הם משתמשים בתו (כמו Eb ' +
        'בסולם דו) שלמעשה לא נמצא בסולם המז\'ורי — זה הסימן המזהה שאקורד הושאל ולא דיאטוני.',
    },
    { kind: 'demo', demo: { type: 'progression', chords: [{ offset: 5, quality: 'minor', roman: 'iv (borrowed)' }, { offset: 8, quality: 'major', roman: 'bVI (borrowed)' }, { offset: 10, quality: 'major', roman: 'bVII (borrowed)' }] } }
  ),
  lesson(
    'harmony-circle-and-function',
    HARMONY_LEVELS.ADVANCED,
    { en: 'The Circle of Fifths & Functional Harmony', he: 'מעגל החמישיות והרמוניה פונקציונלית' },
    {
      en:
        'Everything in this course connects back to one shape: the Circle of Fifths. Root movement down a 5th (or ' +
        'up a 4th) is the strongest possible motion in tonal harmony — it\'s why V resolves to I, why ii-V-I works, ' +
        'and why a secondary dominant briefly tonicizes whatever it points at. A ii-V-I is 3 consecutive ' +
        'counter-clockwise steps on the circle; a chain of secondary dominants is just more of the same steps ' +
        'extended further out. Once you can see a progression as circle movement, you can predict how strongly it ' +
        'will pull, in any key, without memorizing it chord by chord.',
      he:
        'הכל בקורס הזה מתחבר בחזרה לצורה אחת: מעגל החמישיות. תנועת שורש חמישית כלפי מטה (או רביעית כלפי מעלה) ' +
        'היא התנועה החזקה ביותר האפשרית בהרמוניה טונלית — זו הסיבה ש-V נפתר ל-I, זו הסיבה ש-ii-V-I עובד, וזו ' +
        'הסיבה שדומיננטה משנית מטוניקה זמנית כל דבר שהיא מצביעה עליו. ii-V-I הם 3 צעדים רצופים בכיוון הפוך לשעון ' +
        'על המעגל; שרשרת של דומיננטות משניות היא פשוט עוד מאותם הצעדים, מורחבים הלאה. ברגע שאתם יכולים לראות ' +
        'רצף אקורדים כתנועה על המעגל, תוכלו לחזות עד כמה הוא ימשוך, בכל סולם, בלי לשנן אותו אקורד-אקורד.',
    },
    { kind: 'demo', demo: { type: 'circleDiagram' } }
  ),
  lesson(
    'harmony-chord-scale',
    HARMONY_LEVELS.ADVANCED,
    { en: 'Chord-Scale Relationships', he: 'יחסי אקורד-סולם' },
    {
      en:
        'Every chord implies a scale you can improvise or write a melody with over it — usually just the scale it\'s ' +
        'diatonic to, matched to that chord\'s own root. Over a plain I, IV, or V in a major key, the safest choice ' +
        'is that key\'s own major scale; over a ii or vi, the same notes reframed from a different root (which is ' +
        'exactly Dorian or Aeolian — see the Scales course\'s Modes lessons). This course covers WHICH chord you\'re ' +
        'playing over and why; the Scales course covers HOW to actually play each of those scales on your instrument.',
      he:
        'כל אקורד מרמז על סולם שאפשר לאלתר או לכתוב איתו מלודיה מעליו — לרוב פשוט הסולם שהוא דיאטוני אליו, ' +
        'מותאם לשורש של אותו אקורד. מעל I, IV, או V רגילים בסולם מז\'ורי, הבחירה הבטוחה ביותר היא סולם המז\'ור של ' +
        'אותו סולם; מעל ii או vi, אותם התווים בדיוק, ממוסגרים מחדש משורש אחר (וזה בדיוק דורי או אאולי — ראו את ' +
        'שיעורי המודוסים בקורס הסולמות). הקורס הזה מכסה איזה אקורד אתם מנגנים עליו ולמה; קורס הסולמות מכסה איך ' +
        'בפועל לנגן כל אחד מהסולמות האלה על הכלי שלכם.',
    },
    { kind: 'overview', demo: { type: 'fixed', chordText: 'C' } }
  ),

  lesson(
    'harmony-practice-spelling',
    HARMONY_LEVELS.PRACTICE,
    { en: 'Practice: Chord Spelling', he: 'תרגול: איות אקורדים' },
    {
      en:
        'The standard theory-class drill for internalizing chord construction: you\'re shown a chord symbol and ' +
        'asked to pick its exact notes, letter by letter, out of all 12. This builds the skill of spelling any ' +
        'chord from any root on demand — the single most useful harmony skill for reading a chart or writing one.',
      he:
        'תרגיל השיעור הסטנדרטי בתיאוריה להטמעת בניית אקורדים: מוצג לכם סימן אקורד ומתבקשים לבחור את התווים ' +
        'המדויקים שלו, אחד אחד, מתוך כל ה-12. זה בונה את היכולת לאיית כל אקורד מכל שורש לפי דרישה — מיומנות ' +
        'ההרמוניה השימושית ביותר לקריאת תווים או לכתיבתם.',
    },
    { kind: 'quiz', quizType: 'spelling' }
  ),
  lesson(
    'harmony-practice-function-id',
    HARMONY_LEVELS.PRACTICE,
    { en: 'Practice: Identify the Function', he: 'תרגול: זיהוי פונקציה' },
    {
      en:
        'The other classic theory-class drill: given a key and a diatonic chord, name its Roman numeral or its ' +
        'function (tonic/subdominant/dominant). This is what "hearing" a progression\'s logic instead of just its ' +
        'chord names actually trains — the skill behind writing your own progressions instead of only copying ' +
        'ones you already know.',
      he:
        'התרגיל הקלאסי השני של שיעור תיאוריה: בהינתן סולם ואקורד דיאטוני, לומר את הספרה הרומית שלו או את הפונקציה ' +
        'שלו (טוניקה/סאב-דומיננטה/דומיננטה). זה מה ש"לשמוע" את ההיגיון של רצף אקורדים, ולא רק את שמות האקורדים, ' +
        'באמת מאמן — המיומנות שמאחורי כתיבת רצפים משלכם במקום רק העתקת כאלה שאתם כבר מכירים.',
    },
    { kind: 'quiz', quizType: 'function' }
  ),
];

// --- Fretboard/piano integration --------------------------------------
// Same "one function turns (lesson, current preview state) into Fretboard
// props" role as the other 3 courses' resolvers. All the branching between
// demo types collapses to one thing by the time it reaches here: a single
// "currently previewed chord" text (or null) — HarmonyView is responsible
// for keeping that in sync with whichever demo control is active.
export function resolveHarmonyStageProps(previewChordText, tonicPositions) {
  if (!previewChordText) return { position: null };
  return { position: tonicPositions?.[0] ?? null, labelMode: 'note' };
}
