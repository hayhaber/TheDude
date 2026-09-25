// The Studies -> CAGED course's content model: hand-authored lesson data,
// in the same spirit as drills.js/licks.js, plus the small pure functions
// that turn a lesson into Fretboard props. No new chord-shape computation
// here — every shape demo is read straight out of the app's existing CAGED
// engine (shapeTemplates.js -> voicings.js -> computeChordPositions.js),
// which already tags every position of a chord with which of the 5 open
// shapes (E/A/D/G/C) produced it, and every triad out of triads.js.
//
// The whole course works in any major key (CAGED_KEYS). Lesson text is
// written key-neutral, with {tokens} filled in per key by
// cagedLessonVars(), plus a per-lesson "facts" line (cagedLessonFacts())
// that states the exact frets/strings for the selected key.
import { transitionLabel } from './positionRoadmap';
import { colorForChord, colorForNextChord } from '../styles/colors';

// Default key: C major, the conventional reference chord for teaching CAGED
// ("the C you get from the E-shape", etc).
export const CAGED_REFERENCE_CHORD = 'C';

// Every major key the course can be viewed in — `value` is the chord symbol
// fed to computeChordPositions, `label` is what the menu shows (ASCII
// accidentals, matching how the chord engine spells every note label).
export const CAGED_KEYS = [
  { value: 'C', label: 'C' },
  { value: 'Db', label: 'Db' },
  { value: 'D', label: 'D' },
  { value: 'Eb', label: 'Eb' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'F#', label: 'F#' },
  { value: 'G', label: 'G' },
  { value: 'Ab', label: 'Ab' },
  { value: 'A', label: 'A' },
  { value: 'Bb', label: 'Bb' },
  { value: 'B', label: 'B' },
];

export function cagedKeyLabel(keyValue) {
  return CAGED_KEYS.find((k) => k.value === keyValue)?.label ?? keyValue;
}

export const CAGED_STAGES = {
  FOUNDATION: 'foundation',
  SHAPES: 'shapes',
  CONNECTING: 'connecting',
  INVERSIONS: 'inversions',
  APPLICATION: 'application',
};

// Display order of the stages in the lesson rail.
export const CAGED_STAGE_ORDER = [
  CAGED_STAGES.FOUNDATION,
  CAGED_STAGES.SHAPES,
  CAGED_STAGES.CONNECTING,
  CAGED_STAGES.INVERSIONS,
  CAGED_STAGES.APPLICATION,
];

export const CAGED_STAGE_LABELS = {
  [CAGED_STAGES.FOUNDATION]: { en: 'Foundation', he: 'יסודות' },
  [CAGED_STAGES.SHAPES]: { en: 'The 5 Shapes', he: '5 הצורות' },
  [CAGED_STAGES.CONNECTING]: { en: 'Connecting Shapes', he: 'חיבור הצורות' },
  [CAGED_STAGES.INVERSIONS]: { en: 'Inversions', he: 'היפוכים' },
  [CAGED_STAGES.APPLICATION]: { en: 'Application', he: 'יישום' },
};

function step(string, fret, finger, noteName) {
  return { string, fret, finger, noteName };
}

export const CAGED_LESSONS = [
  {
    id: 'caged-overview',
    stage: CAGED_STAGES.FOUNDATION,
    title: { en: 'What Is CAGED?', he: 'מהי שיטת CAGED?' },
    kind: 'overview',
    description: {
      en:
        'CAGED takes the 5 open chords every beginner learns first — C, A, G, E, D — and shows that their shapes ' +
        "repeat all the way up the neck for any chord, not just the one they're named after. Once you know these 5 " +
        'shapes, you can play the same chord in 5 different places, and — more importantly — you always know where ' +
        'you are on the neck. Every lesson here works in any key: pick one from the Key menu (C major is the ' +
        'classic starting point). Learning the shapes in one key only means memorizing 5 positions; seeing them in ' +
        'several keys is what makes it a system.\n\n' +
        'The name CAGED describes the order the shapes appear along the neck (C -> A -> G -> E -> D, then C again), ' +
        'not the order you learn them in. The course starts with the E-shape and the A-shape because they are the ' +
        'barre chords most players already know, and their roots sit on the two lowest strings (6 and 5), the ' +
        'easiest place to find any note. The D-, G- and C-shapes then fill the gaps between them. After the 5 ' +
        'shapes, you will see how they connect, and how to find the inversions (small 3-note chords) hidden inside ' +
        'each one.',
      he:
        'שיטת CAGED לוקחת את 5 האקורדים הפתוחים שכל מתחיל לומד ראשונים — C, A, G, E, D — ומראה שהצורות שלהם חוזרות ' +
        'על עצמן לאורך כל צוואר הגיטרה, עבור כל אקורד, לא רק זה שעל שמו הן קרויות. ברגע שאתם מכירים את 5 הצורות ' +
        'האלה, תוכלו לנגן את אותו אקורד ב-5 מקומות שונים, וחשוב לא פחות — תמיד תדעו איפה אתם נמצאים על הצוואר. ' +
        'כל שיעור כאן עובד בכל טונליות: בחרו אחת מתפריט הטונליות (דו מז\'ור היא נקודת הפתיחה הקלאסית). לימוד ' +
        'הצורות בטונליות אחת בלבד הוא שינון של 5 מקומות; לראות אותן בכמה טונליות זה מה שהופך את זה לשיטה.\n\n' +
        'השם CAGED מתאר את הסדר שבו הצורות מופיעות לאורך הצוואר (C <- A <- G <- E <- D, ואז שוב C), ולא את הסדר ' +
        'שבו לומדים אותן. הקורס מתחיל בצורת E ובצורת A כי אלה אקורדי הברה שרוב הנגנים כבר מכירים, והשורש שלהן ' +
        'נמצא על שני המיתרים הנמוכים (6 ו-5), המקום הקל ביותר למצוא בו כל תו. צורות D, G ו-C ממלאות אחר כך את ' +
        'הפערים ביניהן. אחרי 5 הצורות תראו כיצד הן מתחברות, וכיצד למצוא את ההיפוכים (אקורדים קטנים בני 3 תווים) ' +
        'שמסתתרים בתוך כל אחת מהן.',
    },
  },
  {
    id: 'caged-e-shape',
    stage: CAGED_STAGES.SHAPES,
    title: { en: 'The E-Shape', he: 'צורת E' },
    kind: 'shape',
    shapeName: 'E-shape',
    description: {
      en:
        'Take the open-E chord shape, barre it with your first finger, and slide it up until its root — on the low ' +
        'and high E strings (6 and 1) — lands on the note you want. This is usually the first CAGED shape ' +
        'guitarists learn, because it grows directly out of the open E chord most beginners already know.',
      he:
        'קחו את צורת אקורד ה-E הפתוח, עשו ברה עם האצבע הראשונה, והחליקו אותה למעלה עד שהשורש — על מיתרי ה-E הנמוך ' +
        'והגבוה (6 ו-1) — נופל על התו שאתם רוצים. זו בדרך כלל הצורה הראשונה בשיטת CAGED שגיטריסטים לומדים, ' +
        'מכיוון שהיא צומחת ישירות מתוך אקורד ה-E הפתוח שרוב המתחילים כבר מכירים.',
    },
  },
  {
    id: 'caged-a-shape',
    stage: CAGED_STAGES.SHAPES,
    title: { en: 'The A-Shape', he: 'צורת A' },
    kind: 'shape',
    shapeName: 'A-shape',
    description: {
      en:
        'The open-A shape, barred and moved up so its root on the A string (5) lands on the note you want. Compact, ' +
        'and often the second shape learned after E.',
      he:
        'צורת ה-A הפתוחה, מבורית ומוזזת למעלה כך שהשורש שלה על מיתר ה-A (5) נופל על התו שאתם רוצים. קומפקטית, ' +
        'ולרוב הצורה השנייה שנלמדת אחרי E.',
    },
  },
  {
    id: 'caged-d-shape',
    stage: CAGED_STAGES.SHAPES,
    title: { en: 'The D-Shape', he: 'צורת D' },
    kind: 'shape',
    shapeName: 'D-shape',
    description: {
      en:
        'The open-D shape, with its root on the D string (4). It only uses the top 4 strings, so it is a lighter, ' +
        'higher-sounding voicing.',
      he:
        'צורת ה-D הפתוחה, עם השורש על מיתר ה-D (4). היא משתמשת רק ב-4 המיתרים העליונים, ולכן זו צורה קלה יותר ' +
        'שנשמעת גבוהה יותר.',
    },
  },
  {
    id: 'caged-g-shape',
    stage: CAGED_STAGES.SHAPES,
    title: { en: 'The G-Shape', he: 'צורת G' },
    kind: 'shape',
    shapeName: 'G-shape',
    description: {
      en:
        'The open-G shape, with roots on the low and high E strings (6 and 1, like the E-shape) and on the G ' +
        'string (3). The full shape is a wide stretch, so players often play just part of it.',
      he:
        'צורת ה-G הפתוחה, עם שורשים על מיתרי ה-E הנמוך והגבוה (6 ו-1, כמו בצורת E) ועל מיתר ה-G (3). הצורה ' +
        'המלאה דורשת מתיחה רחבה, ולכן נגנים מנגנים לעתים קרובות רק חלק ממנה.',
    },
  },
  {
    id: 'caged-c-shape',
    stage: CAGED_STAGES.SHAPES,
    title: { en: 'The C-Shape', he: 'צורת C' },
    kind: 'shape',
    shapeName: 'C-shape',
    description: {
      en:
        'The open-C shape, with its root on the A string (5) and the B string (2). In C major it is simply the open ' +
        'C chord you already know; in every other key the same shape moves up the neck.',
      he:
        'צורת ה-C הפתוחה, עם השורש על מיתר ה-A (5) ועל מיתר ה-B (2). בדו מז\'ור זה פשוט אקורד ה-C הפתוח שאתם ' +
        'כבר מכירים; בכל טונליות אחרת אותה צורה זזה למעלה בצוואר.',
    },
  },
  {
    id: 'caged-connect',
    stage: CAGED_STAGES.CONNECTING,
    title: { en: 'Connecting the Shapes', he: 'חיבור הצורות' },
    kind: 'connecting',
    description: {
      en:
        'All 5 shapes are really one repeating pattern that wraps around the neck, always in the same order: ' +
        'C -> A -> G -> E -> D, then back to C. Only the starting point changes with the key. Each shape shares a ' +
        'root note with the next one, and that shared root is the "hinge" that connects them. The roadmap below ' +
        'shows every {key} major position in order, so you can see how each shape hands off to the next.',
      he:
        'כל 5 הצורות הן למעשה תבנית אחת חוזרת שעוטפת את כל הצוואר, תמיד באותו סדר: C <- A <- G <- E <- D, ואז ' +
        'חזרה ל-C. רק נקודת ההתחלה משתנה לפי הטונליות. כל צורה חולקת תו שורש עם הצורה הבאה, והשורש המשותף הזה ' +
        'הוא ה"ציר" שמחבר ביניהן. המפה שלמטה מציגה כל פוזיציה של {key} מז\'ור לפי הסדר, כך שתוכלו לראות כיצד ' +
        'כל צורה מוסרת את השרביט לצורה הבאה.',
    },
  },
  {
    id: 'caged-inversions-intro',
    stage: CAGED_STAGES.INVERSIONS,
    title: { en: 'What Is an Inversion?', he: 'מהו היפוך?' },
    kind: 'inversion',
    description: {
      en:
        'A triad is a 3-note chord: the root, the 3rd and the 5th. In {key} major those are {key} (root), {third} ' +
        '(3rd) and {fifth} (5th). An inversion is simply which of the three is the lowest note. Root position has ' +
        'the root on the bottom ({key}-{third}-{fifth}). 1st inversion puts the 3rd on the bottom ' +
        '({third}-{fifth}-{key}), written {key}/{third}. 2nd inversion puts the 5th on the bottom ' +
        '({fifth}-{key}-{third}), written {key}/{fifth}. It is the same chord every time; only the order ' +
        'changes.\n\n' +
        'The fretboard shows {key} in root position on strings 3-2-1 (frets {introFrets}): {key} on the G string ' +
        'is the root (1), {third} on the B string is the 3rd (3), and {fifth} on the high E string is the 5th (5). ' +
        'These three notes sit inside the {introShape} you already know. Every CAGED shape is really a stack of ' +
        'small triads like this one, and inversions are how you find them.',
      he:
        'טריאדה היא אקורד בן 3 תווים: השורש, הטרצה והקווינטה. ב-{key} מז\'ור אלה {key} (שורש), {third} (טרצה) ' +
        'ו-{fifth} (קווינטה). היפוך הוא פשוט השאלה איזה משלושת התווים הוא הנמוך ביותר. במצב יסודי השורש ' +
        'נמצא למטה ({key}-{third}-{fifth}). בהיפוך ראשון הטרצה נמצאת למטה ({third}-{fifth}-{key}), ונכתב ' +
        '{key}/{third}. בהיפוך שני הקווינטה נמצאת למטה ({fifth}-{key}-{third}), ונכתב {key}/{fifth}. זה תמיד ' +
        'אותו אקורד; רק הסדר משתנה.\n\n' +
        'המסרגה מציגה את {key} במצב יסודי על מיתרים 3-2-1 (שריגים {introFrets}): {key} על מיתר G הוא השורש (1), ' +
        '{third} על מיתר B הוא הטרצה (3), ו-{fifth} על מיתר E הגבוה הוא הקווינטה (5). שלושת התווים האלה יושבים ' +
        'בתוך {introShapeHe} שאתם כבר מכירים. כל צורת CAGED היא למעשה ערימה של טריאדות קטנות כמו זו, וההיפוכים ' +
        'הם הדרך למצוא אותן.',
    },
  },
  {
    id: 'caged-inversions-neck',
    stage: CAGED_STAGES.INVERSIONS,
    title: { en: 'Inversions Up the Neck', he: 'היפוכים לאורך הצוואר' },
    kind: 'inversionMap',
    description: {
      en:
        'Choose a string set. On every set, the three inversions of {key} major repeat up the neck in a fixed ' +
        'order, and each one lives inside one of the CAGED shapes. The chain below lists them in order ({key} = ' +
        'root position, {key}/{third} = 1st inversion, {key}/{fifth} = 2nd inversion), with the CAGED shape each ' +
        'one comes from. On the neck, the pins name each inversion and the highlighted dots mark the root ({key}). ' +
        'Play each triad, then say which inversion it is and which CAGED shape it comes from.',
      he:
        'בחרו קבוצת מיתרים. בכל קבוצה, שלושת ההיפוכים של {key} מז\'ור חוזרים לאורך הצוואר בסדר קבוע, וכל אחד ' +
        'מהם יושב בתוך אחת מצורות CAGED. השרשרת שלמטה מציגה אותם לפי הסדר ({key} = מצב יסודי, {key}/{third} = ' +
        'היפוך ראשון, {key}/{fifth} = היפוך שני), יחד עם צורת ה-CAGED שממנה כל אחד מגיע. על הצוואר, הסיכות ' +
        'מציינות כל היפוך, והנקודות המודגשות מסמנות את השורש ({key}). נגנו כל טריאדה, ואז אמרו איזה היפוך זה ' +
        'ומאיזו צורת CAGED הוא מגיע.',
    },
  },
  {
    id: 'caged-workout',
    stage: CAGED_STAGES.APPLICATION,
    title: { en: 'CAGED Shape-Shift Workout', he: 'תרגיל מעבר בין צורות CAGED' },
    kind: 'shapeShift',
    description: {
      en:
        'The core CAGED exercise: play the same chord ({key} major) in all 5 shapes, up the neck and back down, ' +
        'in the order the shapes connect. Each step shows the full shape and strums it. Play along, and before ' +
        'you move, picture where the next shape goes.\n\n' +
        'The ringed note is the root this shape shares with the next one. Keep your eye on it: it is the anchor ' +
        'that tells you exactly where the next shape starts. Start slowly, with each shape held for 4 beats, and ' +
        'speed up only once the changes are clean.',
      he:
        'תרגיל הליבה של CAGED: נגנו את אותו אקורד ({key} מז\'ור) בכל 5 הצורות, למעלה בצוואר וחזרה למטה, לפי ' +
        'הסדר שבו הצורות מתחברות. כל צעד מציג את הצורה המלאה ומנגן אותה. נגנו יחד, ולפני שאתם זזים, דמיינו ' +
        'איפה נמצאת הצורה הבאה.\n\n' +
        'התו המוקף בטבעת הוא השורש שהצורה הזו חולקת עם הצורה הבאה. שימו עליו עין: זה העוגן שמראה בדיוק איפה ' +
        'מתחילה הצורה הבאה. התחילו לאט, 4 פעמות לכל צורה, והגבירו את הקצב רק כשהמעברים נקיים.',
    },
  },
  {
    id: 'caged-inversion-climb',
    stage: CAGED_STAGES.APPLICATION,
    title: { en: 'Inversion Climb', he: 'טיפוס בהיפוכים' },
    kind: 'exercise',
    description: {
      en:
        'A metronome-timed drill that climbs the {key} major triad up strings 3-2-1, one inversion at a time: ' +
        '{climbChain}. Pick each triad as a short arpeggio, low string to high, and name the inversion as you ' +
        'land on it.',
      he:
        'תרגיל בקצב מטרונום שמטפס עם טריאדת {key} מז\'ור על מיתרים 3-2-1, היפוך אחרי היפוך: {climbChain}. נגנו ' +
        'כל טריאדה כארפג\'ו קצר, מהמיתר הנמוך לגבוה, וקראו בשם ההיפוך כשאתם מגיעים אליו.',
    },
    // C major version — the practice catalog's static copy. The Studies view
    // loads the selected key's version via resolveCagedExercise().
    exercise: {
      title: { en: 'Inversion Climb', he: 'טיפוס בהיפוכים' },
      bpmSuggested: 70,
      noteValue: 'quarter',
      sequence: [
        step(3, 0, 0, 'G'),
        step(4, 1, 1, 'C'),
        step(5, 0, 0, 'E'),
        step(3, 5, 3, 'C'),
        step(4, 5, 3, 'E'),
        step(5, 3, 1, 'G'),
        step(3, 9, 2, 'E'),
        step(4, 8, 1, 'G'),
        step(5, 8, 1, 'C'),
        step(3, 12, 1, 'G'),
        step(4, 13, 2, 'C'),
        step(5, 12, 1, 'E'),
      ],
    },
  },
];

// ---- Shapes ---------------------------------------------------------------

const SHAPE_LETTERS = ['C', 'A', 'G', 'E', 'D'];

// The chord engine labels an actual open chord 'Open' rather than '<X>-shape'
// (correct everywhere else in the app — an open C shouldn't be mislabeled as
// a moved shape). In this course the open C chord IS the C-shape, open G IS
// the G-shape, etc., so name it after its own letter.
function cagedShapeName(position, keyValue) {
  if (position.shapeName !== 'Open') return position.shapeName;
  const letter = keyValue[0];
  return SHAPE_LETTERS.includes(letter) ? `${letter}-shape` : position.shapeName;
}

// Every position of the key's chord with a normalized CAGED shape name,
// sorted up the neck.
function namedShapePositions(positions, keyValue) {
  return positions
    .map((p) => ({ ...p, shapeName: cagedShapeName(p, keyValue) }))
    .sort((a, b) => a.baseFret - b.baseFret);
}

// Lowest-fret instance of one shape.
function findShapePosition(positions, keyValue, shapeName) {
  return namedShapePositions(positions, keyValue).find((p) => p.shapeName === shapeName) ?? null;
}

function rootStringNumbers(position) {
  return position.strings
    .map((s, i) => (s.fret !== null && s.role === 'root' ? 6 - i : null))
    .filter((n) => n !== null)
    .sort((a, b) => b - a);
}

function shapeHe(shapeName) {
  return `צורת ${shapeName[0]}`;
}

// Builds a single-chord "roadmap" across the 5 CAGED positions, in the same
// {steps, transitions} shape buildPositionRoadmap produces for a whole
// progression — so the existing Fretboard roadmap pins and
// PositionRoadmapPanel can render it with zero changes. Keeps only the
// lowest-fret instance per shape (one trip around the cycle), plus the
// first shape again an octave up when it fits, so the cycle visibly closes.
function oneCycle(positions, keyValue) {
  const named = namedShapePositions(positions, keyValue);
  const cycle = [];
  for (const p of named) {
    if (cycle.some((c) => c.shapeName === p.shapeName)) {
      if (cycle.length === 5 && p.shapeName === cycle[0].shapeName) cycle.push(p);
      if (cycle.length === 6) break;
      continue;
    }
    cycle.push(p);
  }
  return cycle;
}

function buildShapeRoadmap(positions, keyValue) {
  const steps = oneCycle(positions, keyValue).map((p) => ({
    chordText: keyValue,
    baseFret: p.baseFret,
    shapeName: p.shapeName,
  }));
  const transitions = steps.slice(1).map((s, i) => {
    const deltaFrets = s.baseFret - steps[i].baseFret;
    return { deltaFrets, label: transitionLabel(deltaFrets) };
  });
  return { steps, transitions };
}

// ---- Shape-Shift Workout ----------------------------------------------------

// Root notes (same string, same fret) that two positions both play — the
// "hinge" that connects neighboring CAGED shapes.
function sharedRoots(a, b) {
  if (!a || !b) return [];
  return a.strings
    .map((s, i) => ({ s, i }))
    .filter(({ s, i }) => s.fret !== null && s.role === 'root' && b.strings[i]?.fret === s.fret && b.strings[i]?.role === 'root')
    .map(({ s, i }) => ({ string: i, fret: s.fret, label: '', role: 'root' }));
}

// The workout's sequence: one cycle up the neck (5 shapes + the first shape
// an octave up), then back down, ending just before the start so looping
// flows straight into the next climb. Each step carries the root(s) it
// shares with the step after it.
export function buildShapeShiftSteps(positions, keyValue) {
  const up = oneCycle(positions, keyValue);
  if (up.length < 2) return [];
  const down = up.slice(1, -1).reverse();
  const sequence = [...up, ...down];
  return sequence.map((position, i) => {
    const next = sequence[(i + 1) % sequence.length];
    return {
      position,
      shapeName: position.shapeName,
      baseFret: position.baseFret,
      direction: i < up.length - 1 ? 'up' : 'down',
      sharedRoots: sharedRoots(position, next),
    };
  });
}

// ---- Inversions -----------------------------------------------------------
//
// The inversion lessons read triads straight out of the app's existing triad
// engine (computeChordPositions(chord, 'triad') -> triads.js), and find the
// CAGED shape each triad lives in by checking which full CAGED voicing
// (computeChordPositions(chord, 'chord')) frets the same 3 notes. Nothing
// here computes new shapes.

// The string sets offered in "Inversions Up the Neck". `order` matches
// triads.js's stringSetOrder. Strings 6-5-4 are deliberately left out:
// close-voiced triads that low sound muddy, and most of them don't sit inside
// any of the 5 CAGED shapes, so they don't fit this course.
export const CAGED_INVERSION_STRING_SETS = [
  { order: 0, label: { en: 'Strings 3-2-1', he: 'מיתרים 3-2-1' } },
  { order: 1, label: { en: 'Strings 4-3-2', he: 'מיתרים 4-3-2' } },
  { order: 2, label: { en: 'Strings 5-4-3', he: 'מיתרים 5-4-3' } },
];

// One full cycle of inversions plus the octave repeat (12 frets) — past that
// the same triads just repeat again. Measured from the lowest triad on the
// set, so keys whose first triad starts a few frets up still get a whole
// cycle.
const INVERSION_CYCLE_FRETS = 12;

const DEGREE_LABEL_BY_ROLE = { root: '1', third: '3', fifth: '5' };

function toneLabel(triad, role) {
  return triad.strings.find((s) => s.fret !== null && s.role === role)?.label ?? '';
}

// "C", "C/E", "C/G": the chord with its lowest note as a slash bass, i.e.
// root position, 1st inversion, 2nd inversion.
function slashName(triad, keyLabel) {
  const lowest = triad.strings.find((s) => s.fret !== null);
  return triad.lowestRole === 'root' ? keyLabel : `${keyLabel}/${lowest.label}`;
}

// Which CAGED shape(s) contain all 3 notes of a triad.
function cagedShapesFor(triad, positions, keyValue) {
  const fretted = triad.strings.map((s, i) => (s.fret === null ? -1 : i)).filter((i) => i >= 0);
  const names = namedShapePositions(positions, keyValue)
    .filter((p) => fretted.every((i) => p.strings[i]?.fret === triad.strings[i].fret))
    .map((p) => p.shapeName);
  return [...new Set(names)];
}

function triadNotes(triad) {
  return triad.strings
    .map((s, string) =>
      s.fret === null
        ? null
        : { string, fret: s.fret, noteName: s.label, degreeLabel: DEGREE_LABEL_BY_ROLE[s.role], isRoot: s.role === 'root' }
    )
    .filter(Boolean);
}

// A close-voiced triad fits under the hand within a few frets. Near the nut
// the triad engine can only reach some notes an octave up (a note "below"
// fret 0 doesn't exist), producing a wide, unplayable spread like 0-0-10 —
// those aren't real triad shapes, so they're dropped here.
const MAX_TRIAD_SPAN = 4;

function triadSpan(triad) {
  const frets = triad.strings.filter((s) => s.fret !== null).map((s) => s.fret);
  return Math.max(...frets) - Math.min(...frets);
}

function triadsOnSet(triadPositions, stringSetOrder) {
  const onSet = triadPositions
    .filter((p) => p.stringSetOrder === stringSetOrder && triadSpan(p) <= MAX_TRIAD_SPAN)
    .sort((a, b) => a.baseFret - b.baseFret);
  if (onSet.length === 0) return [];
  const limit = onSet[0].baseFret + INVERSION_CYCLE_FRETS;
  return onSet.filter((p) => p.baseFret <= limit);
}

// The intro lesson's single example: root position on strings 3-2-1, lowest
// instance on the neck.
function introTriad(triadPositions) {
  return triadsOnSet(triadPositions, 0).find((p) => p.lowestRole === 'root') ?? null;
}

// Every triad on one string set across one cycle, as a roadmap (pins named
// C / C/E / C/G, each tagged with its CAGED shape) plus the dots themselves.
export function buildInversionMap(triadPositions, positions, stringSetOrder, keyValue = CAGED_REFERENCE_CHORD) {
  const keyLabel = cagedKeyLabel(keyValue);
  const triads = triadsOnSet(triadPositions, stringSetOrder);

  const steps = triads.map((triad) => ({
    chordText: slashName(triad, keyLabel),
    baseFret: triad.baseFret,
    shapeName: cagedShapesFor(triad, positions, keyValue).join(' / ') || null,
  }));
  if (steps.length > 0) {
    steps[0].color = colorForChord(steps[0].chordText);
    for (let i = 1; i < steps.length; i += 1) {
      steps[i].color = colorForNextChord(steps[i].chordText, steps[i - 1].color);
    }
  }
  const transitions = steps.slice(1).map((s, i) => {
    const deltaFrets = s.baseFret - steps[i].baseFret;
    return { deltaFrets, label: transitionLabel(deltaFrets) };
  });

  return { roadmap: { steps, transitions }, notes: triads.flatMap(triadNotes) };
}

// Simple, realistic fingering for a 3-note triad: open strings 0, otherwise
// by distance from the lowest fretted fret (index finger there).
function triadFingers(frets) {
  const fretted = frets.filter((f) => f > 0);
  const low = fretted.length ? Math.min(...fretted) : 0;
  return frets.map((f) => (f === 0 ? 0 : Math.min(4, f - low + 1)));
}

// The Inversion Climb drill for the selected key: every triad on strings
// 3-2-1 across one cycle, each picked low string to high.
function buildInversionClimb(triadPositions) {
  const triads = triadsOnSet(triadPositions, 0);
  return triads.flatMap((triad) => {
    const notes = triad.strings.map((s, i) => ({ ...s, i })).filter((s) => s.fret !== null);
    const fingers = triadFingers(notes.map((n) => n.fret));
    return notes.map((n, j) => step(n.i, n.fret, fingers[j], n.label));
  });
}

// The exercise a lesson should load for the selected key (falls back to the
// lesson's own static exercise).
export function resolveCagedExercise(lesson, triadPositions, keyValue = CAGED_REFERENCE_CHORD) {
  if (lesson.id === 'caged-inversion-climb' && triadPositions.length > 0) {
    return { ...lesson.exercise, id: `${lesson.id}-${keyValue}`, sequence: buildInversionClimb(triadPositions) };
  }
  return { ...lesson.exercise, id: lesson.id };
}

// ---- Per-key text ---------------------------------------------------------

// The {token} values lesson descriptions use, for the selected key.
export function cagedLessonVars(keyValue, positions, triadPositions) {
  const key = cagedKeyLabel(keyValue);
  const intro = introTriad(triadPositions);
  const introShape = intro ? cagedShapesFor(intro, positions, keyValue)[0] ?? '' : '';
  const climb = triadsOnSet(triadPositions, 0).map((t) => {
    const shapes = cagedShapesFor(t, positions, keyValue);
    return `${slashName(t, key)}${shapes.length ? ` (${shapes.join(' / ')})` : ''}`;
  });
  return {
    key,
    third: intro ? toneLabel(intro, 'third') : '',
    fifth: intro ? toneLabel(intro, 'fifth') : '',
    introFrets: intro ? intro.strings.filter((s) => s.fret !== null).map((s) => s.fret).join('-') : '',
    introShape,
    introShapeHe: introShape ? shapeHe(introShape) : '',
    climbChain: climb.join(' -> '),
  };
}

export function fillLessonText(text, vars) {
  return text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] != null ? vars[name] : match));
}

// A one-line, key-specific fact shown under a shape lesson's text: where the
// shape sits and which strings carry its root.
export function cagedLessonFacts(lesson, keyValue, positions) {
  if (lesson.kind !== 'shape') return null;
  const position = findShapePosition(positions, keyValue, lesson.shapeName);
  if (!position) return null;
  const key = cagedKeyLabel(keyValue);
  const strings = rootStringNumbers(position).join(', ');
  const whereEn = position.baseFret === 0 ? 'open position' : `fret ${position.baseFret}`;
  const whereHe = position.baseFret === 0 ? 'פוזיציה פתוחה' : `שריג ${position.baseFret}`;
  return {
    en: `${key} major in the ${lesson.shapeName}: ${whereEn} · root on strings ${strings}`,
    he: `${key} מז'ור ב${shapeHe(lesson.shapeName)}: ${whereHe} · שורש על מיתרים ${strings}`,
  };
}

// ---- Stage props ----------------------------------------------------------

// The single function App.jsx calls to turn "which lesson is active" into
// Fretboard props — keeps this branching out of App.jsx itself.
export function resolveCagedStageProps(lesson, positions, options = {}) {
  const {
    keyValue = CAGED_REFERENCE_CHORD,
    triadPositions = [],
    inversionStringSet = 0,
    shapeShiftStep = null,
  } = options;
  if (!lesson) return { position: null };
  if (lesson.kind === 'shape') {
    return { position: findShapePosition(positions, keyValue, lesson.shapeName), labelMode: 'note' };
  }
  if (lesson.kind === 'connecting') {
    return { position: null, roadmap: buildShapeRoadmap(positions, keyValue) };
  }
  if (lesson.kind === 'shapeShift') {
    if (!shapeShiftStep) return { position: null };
    return {
      position: shapeShiftStep.position,
      labelMode: 'note',
      landingNotes: shapeShiftStep.sharedRoots,
    };
  }
  if (lesson.kind === 'inversion') {
    const triad = introTriad(triadPositions);
    return { position: null, scaleNotes: triad ? triadNotes(triad) : [], labelMode: 'degree' };
  }
  if (lesson.kind === 'inversionMap') {
    const { roadmap, notes } = buildInversionMap(triadPositions, positions, inversionStringSet, keyValue);
    return { position: null, roadmap, scaleNotes: notes, labelMode: 'degree' };
  }
  return { position: null };
}
