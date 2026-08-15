// The Studies -> Scales course's content model — same hand-authored-data +
// small-pure-helpers pattern as cagedCurriculum.js. All scale/fretboard math
// lives in scaleShapes.js; this file is purely curriculum content plus the
// one function (resolveScaleStageProps) that turns "which lesson + key +
// position" into Fretboard props.
import { computeScaleNotes } from './scaleShapes';

export const SCALES_STAGES = {
  FOUNDATION: 'foundation',
  MAJOR: 'major',
  MINOR: 'minor',
  PENTATONIC: 'pentatonic',
  BLUES: 'blues',
  MODES: 'modes',
  ADVANCED: 'advanced',
};

export const SCALES_STAGE_LABELS = {
  [SCALES_STAGES.FOUNDATION]: { en: 'Foundation', he: 'יסודות' },
  [SCALES_STAGES.MAJOR]: { en: 'Major Scale', he: 'סולם מז\'ור' },
  [SCALES_STAGES.MINOR]: { en: 'Natural Minor Scale', he: 'סולם מינור טבעי' },
  [SCALES_STAGES.PENTATONIC]: { en: 'Pentatonic Scales', he: 'סולמות פנטטוניים' },
  [SCALES_STAGES.BLUES]: { en: 'Blues Scale', he: 'סולם בלוז' },
  [SCALES_STAGES.MODES]: { en: 'Modes', he: 'מודוסים' },
  [SCALES_STAGES.ADVANCED]: { en: 'Advanced Scales', he: 'סולמות מתקדמים' },
};

// Semitone intervals from the root + theory-correct degree labels (parallel
// arrays). Modes are listed in their own right (Aeolian duplicates Natural
// Minor's intervals — that's correct, Aeolian IS the natural minor mode —
// but gets its own lesson framed in modal-derivation terms).
export const SCALE_FAMILIES = {
  major: { intervals: [0, 2, 4, 5, 7, 9, 11], degreeLabels: [1, 2, 3, 4, 5, 6, 7] },
  naturalMinor: { intervals: [0, 2, 3, 5, 7, 8, 10], degreeLabels: [1, 2, 'b3', 4, 5, 'b6', 'b7'] },
  majorPentatonic: { intervals: [0, 2, 4, 7, 9], degreeLabels: [1, 2, 3, 5, 6] },
  minorPentatonic: { intervals: [0, 3, 5, 7, 10], degreeLabels: [1, 'b3', 4, 5, 'b7'] },
  blues: { intervals: [0, 3, 5, 6, 7, 10], degreeLabels: [1, 'b3', 4, 'b5', 5, 'b7'] },
  ionian: { intervals: [0, 2, 4, 5, 7, 9, 11], degreeLabels: [1, 2, 3, 4, 5, 6, 7] },
  dorian: { intervals: [0, 2, 3, 5, 7, 9, 10], degreeLabels: [1, 2, 'b3', 4, 5, 6, 'b7'] },
  phrygian: { intervals: [0, 1, 3, 5, 7, 8, 10], degreeLabels: [1, 'b2', 'b3', 4, 5, 'b6', 'b7'] },
  lydian: { intervals: [0, 2, 4, 6, 7, 9, 11], degreeLabels: [1, 2, 3, '#4', 5, 6, 7] },
  mixolydian: { intervals: [0, 2, 4, 5, 7, 9, 10], degreeLabels: [1, 2, 3, 4, 5, 6, 'b7'] },
  aeolian: { intervals: [0, 2, 3, 5, 7, 8, 10], degreeLabels: [1, 2, 'b3', 4, 5, 'b6', 'b7'] },
  locrian: { intervals: [0, 1, 3, 5, 6, 8, 10], degreeLabels: [1, 'b2', 'b3', 4, 'b5', 'b6', 'b7'] },
  harmonicMinor: { intervals: [0, 2, 3, 5, 7, 8, 11], degreeLabels: [1, 2, 'b3', 4, 5, 'b6', 7] },
  melodicMinor: { intervals: [0, 2, 3, 5, 7, 9, 11], degreeLabels: [1, 2, 'b3', 4, 5, 6, 7] },
  diminished: { intervals: [0, 2, 3, 5, 6, 8, 9, 11], degreeLabels: [1, 2, 'b3', 4, 'b5', 'b6', 6, 7] },
  wholeTone: { intervals: [0, 2, 4, 6, 8, 10], degreeLabels: [1, 2, 3, '#4', '#5', '#6'] },
};

export const SCALES_REFERENCE_ROOT_PITCH_CLASS = 0; // C, same convention as CAGED_REFERENCE_CHORD

// Whether a scale's key selector should read e.g. "Cm" or plain "C" — derived
// from the scale's own 3rd-degree interval (the one thing that actually
// determines major/minor quality), not hand-picked per scale, so every
// scale in SCALE_FAMILIES is labeled correctly (including new ones added
// later) rather than only the couple anyone happened to remember to special-
// case. A flattened 3rd (interval 3, i.e. a degree label of 'b3') means the
// scale's own tonic triad is minor-quality, hence the "m" suffix — exactly
// the bug this fixes: the Natural Minor Scale lesson's key selector showed
// plain "C" (implying C MAJOR) instead of "Cm", because it reused
// scaleAnalyzer.js's KEY_NAMES (a flat major-style name list) for every
// scale regardless of its actual mode.
export function scaleKeySuffix(scaleKey) {
  const family = SCALE_FAMILIES[scaleKey];
  if (!family) return '';
  const thirdIndex = family.degreeLabels.findIndex((d) => d === 3 || d === 'b3');
  return thirdIndex !== -1 && family.intervals[thirdIndex] === 3 ? 'm' : '';
}

function drill(title, description, scaleKey, extra = {}) {
  return { title, description, scaleKey, ...extra };
}

export const SCALES_LESSONS = [
  drill(
    { en: 'What Is a Scale?', he: 'מהו סולם?' },
    {
      en:
        'A scale is a set of notes arranged by pitch, built from a repeating pattern of whole-steps (2 semitones) and ' +
        'half-steps (1 semitone). Different patterns of whole/half steps give different scales — major, minor, ' +
        'pentatonic, and more — each with its own character. Scales matter because they\'re the vocabulary you ' +
        'improvise and solo with: once you know which notes belong to a scale, you know which notes will sound ' +
        '"right" over a given chord or key, wherever you play it.',
      he:
        'סולם הוא אוסף תווים המסודרים לפי גובה צליל, בנוי מתבנית חוזרת של טונים (2 חצאי-טון) וחצאי טון (חצי טון אחד). ' +
        'תבניות שונות של צעדים שלמים/חצאיים נותנות סולמות שונים — מז\'ור, מינור, פנטטוני, ועוד — כל אחד עם אופי משלו. ' +
        'סולמות חשובים כי הם אוצר המילים שבו אתם מאלתרים ומנגנים סולו: ברגע שאתם יודעים אילו תווים שייכים לסולם, אתם ' +
        'יודעים אילו תווים "יישמעו נכון" מעל אקורד או סולם נתון, בכל מקום שתנגנו אותו.',
    },
    null,
    { stage: SCALES_STAGES.FOUNDATION, id: 'scales-intro', kind: 'overview' }
  ),
  drill(
    { en: 'The Major Scale', he: 'סולם מז\'ור' },
    {
      en:
        'The major scale\'s formula is W-W-H-W-W-W-H (whole-whole-half-whole-whole-whole-half) — 7 notes, degrees 1 ' +
        'through 7. It\'s the foundation nearly every other scale in this course is described relative to. The same ' +
        'shape repeats predictably in every key: on guitar, that means 5 movable positions up the neck (the position ' +
        'browser below steps through all 5, using the same 5 CAGED-based shapes as the CAGED course); on piano it\'s ' +
        'simply the same 7 notes in any octave. Use the practice exercise to run the scale in time.',
      he:
        'הנוסחה של סולם המז\'ור היא טון-טון-חצי טון-טון-טון-טון-חצי טון — 7 תווים, דרגות 1 עד 7. ' +
        'זהו הבסיס שכמעט כל סולם אחר בקורס הזה מתואר ביחס אליו. אותה צורה חוזרת על עצמה באופן צפוי בכל סולם: בגיטרה, ' +
        'זה אומר 5 פוזיציות ניידות לאורך הצוואר (בורר הפוזיציות למטה עובר בין כל 5, באמצעות אותן 5 צורות מבוססות ' +
        'CAGED כמו בקורס ה-CAGED); בפסנתר זה פשוט אותם 7 תווים בכל אוקטבה. השתמשו בתרגיל התרגול כדי לנגן את הסולם ' +
        'בקצב.',
    },
    'major',
    { stage: SCALES_STAGES.MAJOR, id: 'scales-major', kind: 'scale', hasPositions: true }
  ),
  drill(
    { en: 'The Natural Minor Scale', he: 'סולם המינור הטבעי' },
    {
      en:
        'Natural minor is the major scale\'s relative mode — built starting from the major scale\'s 6th degree, using ' +
        'exactly the same notes (e.g. A natural minor uses all the same notes as C major). Its formula is ' +
        'W-H-W-W-H-W-W, giving it a darker, sadder sound than major even though the notes overlap. On guitar it ' +
        'repeats in the same 5-position system as the major scale; on piano it\'s the same 7 notes in any octave.',
      he:
        'המינור הטבעי הוא המודוס הקרוב של סולם המז\'ור — בנוי החל מהדרגה השישית של סולם המז\'ור, תוך שימוש באותם ' +
        'התווים בדיוק (למשל, לה מינור טבעי משתמש באותם התווים כמו דו מז\'ור). הנוסחה שלו היא טון-חצי טון-טון-טון-חצי ' +
        'טון-טון-טון, מה שנותן לו צליל כהה ועצוב יותר ממז\'ור למרות שהתווים חופפים. בגיטרה הוא חוזר על עצמו באותה ' +
        'שיטת 5 הפוזיציות כמו סולם המז\'ור; בפסנתר אלה פשוט אותם 7 תווים בכל אוקטבה.',
    },
    'naturalMinor',
    { stage: SCALES_STAGES.MINOR, id: 'scales-natural-minor', kind: 'scale', hasPositions: true }
  ),
  drill(
    { en: 'Major Pentatonic Scale', he: 'סולם פנטטוני מז\'ורי' },
    {
      en:
        'Major pentatonic drops the major scale\'s 4th and 7th degrees (the two half-steps), leaving 5 notes — ' +
        '1, 2, 3, 5, 6 — with no half-steps at all, which is why nothing in it ever clashes. Common in country, pop, ' +
        'and major-key rock soloing. On guitar it repeats in the same 5-position system as the major scale; on piano ' +
        'it\'s the same 5 notes in any octave.',
      he:
        'הפנטטוני המז\'ורי משמיט את הדרגות 4 ו-7 של סולם המז\'ור (שני חצאי הצעדים), ומשאיר 5 תווים — 1, 2, 3, 5, 6 — ' +
        'ללא חצאי צעדים כלל, ולכן שום דבר בו לעולם לא מתנגש. נפוץ בסולואים בסגנון קאנטרי, פופ, ורוק מז\'ורי. בגיטרה ' +
        'הוא חוזר על עצמו באותה שיטת 5 פוזיציות כמו סולם המז\'ור; בפסנתר אלה פשוט אותם 5 תווים בכל אוקטבה.',
    },
    'majorPentatonic',
    { stage: SCALES_STAGES.PENTATONIC, id: 'scales-major-pentatonic', kind: 'scale', hasPositions: true }
  ),
  drill(
    { en: 'Minor Pentatonic Scale', he: 'סולם פנטטוני מינורי' },
    {
      en:
        'Minor pentatonic drops the natural minor scale\'s 2nd and b6th degrees, leaving 1, b3, 4, 5, b7 — the single ' +
        'most-used scale in rock and blues soloing (guitar or otherwise). On guitar it repeats in the same 5-position ' +
        'system; on piano it\'s the same 5 notes in any octave — either way, it\'s the foundation the Blues scale ' +
        'below builds on directly.',
      he:
        'הפנטטוני המינורי משמיט את הדרגות 2 ו-b6 של סולם המינור הטבעי, ומשאיר 1, b3, 4, 5, b7 — הסולם הנפוץ ביותר ' +
        'בסולואים של רוק ובלוז (בגיטרה ומחוצה לה). בגיטרה הוא חוזר על עצמו באותה שיטת 5 פוזיציות; בפסנתר אלה פשוט ' +
        'אותם 5 תווים בכל אוקטבה — כך או כך, זה הבסיס שסולם הבלוז למטה נבנה עליו ישירות.',
    },
    'minorPentatonic',
    { stage: SCALES_STAGES.PENTATONIC, id: 'scales-minor-pentatonic', kind: 'scale', hasPositions: true }
  ),
  drill(
    { en: 'The Blues Scale', he: 'סולם הבלוז' },
    {
      en:
        'The blues scale is minor pentatonic plus one extra note — the b5, often called the "blue note" — sitting ' +
        'between the 4th and 5th. It\'s the note that gives blues its signature tension, usually bent or slid into ' +
        'rather than landed on squarely. Practice resolving from the b5 to either the 4th or 5th.',
      he:
        'סולם הבלוז הוא הפנטטוני המינורי בתוספת תו אחד נוסף — ה-b5, המכונה לעיתים קרובות "התו הכחול" — היושב בין ' +
        'הדרגה הרביעית לחמישית. זהו התו שנותן לבלוז את המתח האופייני לו, ולרוב מגיעים אליו בכפיפה או בסליידה במקום ' +
        'לנחות עליו ישירות. תרגלו התרה מה-b5 אל הדרגה הרביעית או החמישית.',
    },
    'blues',
    { stage: SCALES_STAGES.BLUES, id: 'scales-blues', kind: 'scale', hasPositions: false }
  ),
  ...[
    ['ionian', { en: 'Ionian Mode', he: 'מודוס יוני (Ionian)' }, {
      en: 'Ionian is just another name for the major scale itself — the 1st mode, built starting from the major scale\'s own root. Bright, resolved, the "home" sound every other mode is compared against.',
      he: 'יוני הוא פשוט שם אחר לסולם המז\'ור עצמו — המודוס הראשון, בנוי החל משורש סולם המז\'ור עצמו. צליל בהיר ומותר, ה"בית" שאליו משווים כל מודוס אחר.',
    }],
    ['dorian', { en: 'Dorian Mode', he: 'מודוס דורי (Dorian)' }, {
      en: 'Dorian is built starting from the major scale\'s 2nd degree — a minor mode (b3, b7) but with a natural 6th, giving it a slightly brighter, jazzier minor sound than natural minor. Common in jazz, funk, and modal rock.',
      he: 'דורי בנוי החל מהדרגה השנייה של סולם המז\'ור — מודוס מינורי (b3, b7) אך עם דרגה שישית טבעית, מה שנותן לו צליל מינורי בהיר וג\'אזי יותר מהמינור הטבעי. נפוץ בג\'אז, פאנק, ורוק מודאלי.',
    }],
    ['phrygian', { en: 'Phrygian Mode', he: 'מודוס פריגי (Phrygian)' }, {
      en: 'Phrygian is built from the major scale\'s 3rd degree — a minor mode with a flattened 2nd (b2), giving it a dark, Spanish/flamenco-tinged sound.',
      he: 'פריגי בנוי מהדרגה השלישית של סולם המז\'ור — מודוס מינורי עם דרגה שנייה מושפלת (b2), מה שנותן לו צליל כהה בגוון ספרדי/פלמנקו.',
    }],
    ['lydian', { en: 'Lydian Mode', he: 'מודוס לידי (Lydian)' }, {
      en: 'Lydian is built from the major scale\'s 4th degree — a major mode with a raised 4th (#4), giving it a dreamy, floating, slightly unresolved bright sound. Common in film scores and fusion.',
      he: 'לידי בנוי מהדרגה הרביעית של סולם המז\'ור — מודוס מז\'ורי עם דרגה רביעית מוגבהת (#4), מה שנותן לו צליל בהיר, חלומי ומרחף, מעט לא-מותר. נפוץ במוזיקת קולנוע ובפיוז\'ן.',
    }],
    ['mixolydian', { en: 'Mixolydian Mode', he: 'מודוס מיקסולידי (Mixolydian)' }, {
      en: 'Mixolydian is built from the major scale\'s 5th degree — a major mode with a flattened 7th (b7), giving it a bluesy, dominant-7th sound. Extremely common in blues, rock, and funk.',
      he: 'מיקסולידי בנוי מהדרגה החמישית של סולם המז\'ור — מודוס מז\'ורי עם דרגה שביעית מושפלת (b7), מה שנותן לו צליל בלוזי ודומיננטי-7. נפוץ מאוד בבלוז, רוק ופאנק.',
    }],
    ['aeolian', { en: 'Aeolian Mode', he: 'מודוס אאולי (Aeolian)' }, {
      en: 'Aeolian is built from the major scale\'s 6th degree — this is exactly the natural minor scale from earlier in the course, just framed here as "mode 6" alongside the others.',
      he: 'אאולי בנוי מהדרגה השישית של סולם המז\'ור — זהו בדיוק סולם המינור הטבעי שנלמד קודם בקורס, רק ממוסגר כאן כ"מודוס 6" לצד האחרים.',
    }],
    ['locrian', { en: 'Locrian Mode', he: 'מודוס לוקרי (Locrian)' }, {
      en: 'Locrian is built from the major scale\'s 7th degree — a minor mode with both a flattened 2nd and a flattened 5th (b5), making its own root chord diminished rather than minor. The most unstable, tense-sounding mode, rarely used as a full tonal center.',
      he: 'לוקרי בנוי מהדרגה השביעית של סולם המז\'ור — מודוס מינורי עם דרגה שנייה מושפלת וגם דרגה חמישית מושפלת (b5), מה שהופך את אקורד השורש שלו לדימיניושד ולא למינורי. המודוס הכי לא יציב ומתוח, ולעיתים רחוקות משמש כמרכז טונלי מלא.',
    }],
  ].map(([scaleKey, title, description]) => drill(title, description, scaleKey, {
    stage: SCALES_STAGES.MODES,
    id: `scales-mode-${scaleKey}`,
    kind: 'scale',
    hasPositions: false,
  })),
  drill(
    { en: 'Harmonic Minor', he: 'מינור הרמוני' },
    {
      en:
        'Natural minor with a raised 7th degree — that half-step gap between b6 and 7 gives it an exotic, Middle ' +
        'Eastern/classical sound, and creates a proper leading tone back to the root (which natural minor lacks).',
      he:
        'מינור טבעי עם דרגה שביעית מוגבהת — הפער של חצי טון בין b6 ל-7 נותן לו צליל אקזוטי, מזרח-תיכוני/קלאסי, ' +
        'ויוצר תו הובלה אמיתי בחזרה לשורש (שחסר במינור הטבעי).',
    },
    'harmonicMinor',
    { stage: SCALES_STAGES.ADVANCED, id: 'scales-harmonic-minor', kind: 'scale', hasPositions: false }
  ),
  drill(
    { en: 'Melodic Minor', he: 'מינור מלודי' },
    {
      en:
        'Natural minor with both the 6th and 7th degrees raised (ascending/jazz form) — smooths out harmonic minor\'s ' +
        'exotic gap while keeping the minor 3rd, giving a sound jazz players lean on heavily over minor-major and ' +
        'altered dominant chords.',
      he:
        'מינור טבעי עם הדרגות 6 ו-7 מוגבהות (הצורה העולה/הג\'אזית) — מחליק את הפער האקזוטי של המינור ההרמוני תוך ' +
        'שמירה על השלישית המינורית, ונותן צליל שנגני ג\'אז נשענים עליו רבות מעל אקורדי מינור-מז\'ור ודומיננטים משונים.',
    },
    'melodicMinor',
    { stage: SCALES_STAGES.ADVANCED, id: 'scales-melodic-minor', kind: 'scale', hasPositions: false }
  ),
  drill(
    { en: 'Diminished Scale', he: 'סולם דימיניושד' },
    {
      en:
        'An 8-note symmetric scale alternating whole-step, half-step, whole-step, half-step... — because the pattern ' +
        'repeats every minor 3rd, the whole shape simply transposes up in minor-3rd jumps (on guitar, that\'s a ' +
        '3-fret slide). Used over diminished and altered-dominant chords.',
      he:
        'סולם סימטרי בן 8 תווים המתחלף בין טון, חצי טון, טון, חצי טון... — מכיוון שהתבנית חוזרת על עצמה כל ' +
        'שלישית מינורית, כל הצורה פשוט עוברת טרנספוזיציה בקפיצות של שלישית מינורית (בגיטרה, זו החלקה של 3 שריגים). ' +
        'משמש מעל אקורדי דימיניושד ודומיננטים משונים.',
    },
    'diminished',
    { stage: SCALES_STAGES.ADVANCED, id: 'scales-diminished', kind: 'scale', hasPositions: false }
  ),
  drill(
    { en: 'Whole Tone Scale', he: 'סולם טונים שלמים' },
    {
      en:
        'A 6-note symmetric scale built entirely from whole-steps — no half-steps at all, which gives it a hazy, ' +
        'ambiguous, "floating" sound with no strong pull toward any one note. Associated with augmented and altered ' +
        'dominant harmony.',
      he:
        'סולם סימטרי בן 6 תווים הבנוי כולו מצעדים שלמים — ללא חצאי צעדים כלל, מה שנותן לו צליל ערפילי, דו-משמעי, ' +
        '"מרחף" ללא משיכה חזקה לתו כלשהו. קשור להרמוניה אוגמנטד ודומיננטים משונים.',
    },
    'wholeTone',
    { stage: SCALES_STAGES.ADVANCED, id: 'scales-whole-tone', kind: 'scale', hasPositions: false }
  ),
].map((lesson) => ({
  id: lesson.id,
  stage: lesson.stage,
  title: lesson.title,
  description: lesson.description,
  kind: lesson.kind,
  scaleKey: lesson.scaleKey,
  hasPositions: !!lesson.hasPositions,
}));

// Generates a metronome-timed drill sequence (same shape usePracticeDrill/
// PracticeDrillPanel already consume) directly from computeScaleNotes,
// rather than hand-authoring a sequence per scale — one generic generator
// covers all 17 lessons, and a future 18th scale needs zero new authoring.
export function buildScaleExercise(scaleKey, rootPitchClass, { fretStart = 0, fretEnd = 12, direction = 'ascending', bpm = 80 } = {}) {
  const family = SCALE_FAMILIES[scaleKey];
  if (!family) return null;
  const notes = computeScaleNotes({ rootPitchClass, intervals: family.intervals, degreeLabels: family.degreeLabels, fretStart, fretEnd });
  // One representative octave run, low string to high, ascending fret order
  // per string — a natural single-string-at-a-time practice run rather than
  // every note in the window at once.
  const sorted = [...notes].sort((a, b) => a.string - b.string || a.fret - b.fret);
  const sequence = (direction === 'descending' ? [...sorted].reverse() : sorted).map((n) => ({
    string: n.string,
    fret: n.fret,
    finger: null,
    noteName: n.noteName,
  }));
  return { title: null, bpmSuggested: bpm, noteValue: 'quarter', sequence };
}

// The single function ScalesView calls to turn "which lesson + key +
// position" into Fretboard props — keeps the branching out of the component,
// same role as cagedCurriculum.js's resolveCagedStageProps.
export function resolveScaleStageProps(lesson, rootPitchClass, labelMode, position) {
  if (!lesson || lesson.kind !== 'scale') return { position: null };
  const family = SCALE_FAMILIES[lesson.scaleKey];
  if (!family) return { position: null };
  const fretStart = position ? position.fretStart : 0;
  const fretEnd = position ? position.fretEnd : 12;
  const scaleNotes = computeScaleNotes({ rootPitchClass, intervals: family.intervals, degreeLabels: family.degreeLabels, fretStart, fretEnd });
  return { position: null, scaleNotes, labelMode };
}
