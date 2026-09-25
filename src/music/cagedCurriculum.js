// The Studies -> CAGED course's content model: hand-authored lesson data,
// in the same spirit as drills.js/licks.js, plus the small pure functions
// that turn a lesson into Fretboard props. No new chord-shape computation
// here — every shape demo is read straight out of the app's existing CAGED
// engine (shapeTemplates.js -> voicings.js -> computeChordPositions.js),
// which already tags every position of a chord with which of the 5 open
// shapes (E/A/D/G/C) produced it.
import { transitionLabel } from './positionRoadmap';
import { colorForChord, colorForNextChord } from '../styles/colors';

// All lessons demo C major, the conventional reference chord for teaching
// CAGED ("the C you get from the E-shape", etc).
export const CAGED_REFERENCE_CHORD = 'C';

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
        "shapes, you can play the same chord in 5 different places, and — more importantly — you always know where " +
        "you are on the neck. This course walks through each shape using C major as the example chord, then shows " +
        'how the shapes link together into one continuous map of the fretboard.\n\n' +
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
        'הקורס הזה עובר על כל צורה תוך שימוש באקורד דו מז\'ור (C) כדוגמה, ולאחר מכן מראה כיצד הצורות מתחברות ' +
        'למפה אחת רציפה של המסרגה.\n\n' +
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
        'Barre the open-E chord shape and slide it up until the root (on the low and high E strings) lands on C — ' +
        "that's a C major chord built from the E-shape, at the 8th fret. This is usually the first CAGED shape " +
        'guitarists learn because it grows directly out of the open E chord most beginners already know.',
      he:
        'ברו את צורת אקורד ה-E הפתוח והחליקו אותה למעלה עד שהשורש (על מיתרי ה-E הנמוך והגבוה) נופל על התו דו (C) — ' +
        'זהו אקורד דו מז\'ור הבנוי מצורת E, בשריג ה-8. זו בדרך כלל הצורה הראשונה בשיטת CAGED שגיטריסטים לומדים, ' +
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
        'The open-A shape, barred and slid up so its root (on the A string) lands on C at the 3rd fret. Compact and ' +
        'close to the nut — often the second shape learned after E.',
      he:
        'צורת ה-A הפתוחה, מבורית ומוחלקת למעלה כך שהשורש שלה (על מיתר ה-A) נופל על דו (C) בשריג ה-3. קומפקטית וקרובה ' +
        'לאוכף — לרוב הצורה השנייה שנלמדת אחרי E.',
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
        'The open-D shape, with its root on the D string, lands on C at the 10th fret. This shape only uses the top ' +
        "4 strings, so it's a lighter, higher-up-the-neck voicing.",
      he:
        'צורת ה-D הפתוחה, עם השורש שלה על מיתר ה-D, נופלת על דו (C) בשריג ה-10. הצורה הזו משתמשת רק ב-4 המיתרים ' +
        'העליונים, ולכן זו צורת ניגון קלה יותר וגבוהה יותר על הצוואר.',
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
        'The open-G shape, with roots on the low and high E strings again (like the E-shape, one octave apart), lands ' +
        'on C at the 5th fret — a wide stretch, but a very common barre-chord voicing.',
      he:
        'צורת ה-G הפתוחה, עם שורשים על מיתרי ה-E הנמוך והגבוה שוב (כמו צורת E, באוקטבה הפרש), נופלת על דו (C) בשריג ' +
        'ה-5 — מתיחה רחבה, אך צורת ברה נפוצה מאוד.',
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
        "The open-C shape is already rooted on C, so this is just the open C chord you already know — the shape that " +
        'gives CAGED its name, shown here in its natural open position.',
      he:
        'צורת ה-C הפתוחה כבר מבוססת על דו (C), אז זה פשוט אקורד ה-C הפתוח שאתם כבר מכירים — הצורה שנותנת לשיטת ' +
        'CAGED את שמה, מוצגת כאן בפוזיציה הפתוחה הטבעית שלה.',
    },
  },
  {
    id: 'caged-connect',
    stage: CAGED_STAGES.CONNECTING,
    title: { en: 'Connecting the Shapes', he: 'חיבור הצורות' },
    kind: 'connecting',
    description: {
      en:
        'All 5 shapes are really one repeating pattern that wraps around the neck: C (open) -> A-shape (3rd fret) -> ' +
        'G-shape (5th fret) -> E-shape (8th fret) -> D-shape (10th fret) -> back to C-shape an octave up. The roadmap ' +
        'below shows every C major position in that order, so you can see how each shape hands off to the next.',
      he:
        'כל 5 הצורות הן למעשה תבנית אחת חוזרת שעוטפת את כל הצוואר: C (פתוח) <- צורת A (שריג 3) <- צורת G (שריג 5) <- ' +
        'צורת E (שריג 8) <- צורת D (שריג 10) <- וחזרה לצורת C אוקטבה למעלה. המפה שלמטה מציגה כל פוזיציה של דו מז\'ור ' +
        'בסדר הזה, כך שתוכלו לראות כיצד כל צורה מוסרת את השרביט לצורה הבאה.',
    },
  },
  {
    id: 'caged-inversions-intro',
    stage: CAGED_STAGES.INVERSIONS,
    title: { en: 'What Is an Inversion?', he: 'מהו היפוך?' },
    kind: 'inversion',
    description: {
      en:
        'A triad is a 3-note chord: the root, the 3rd and the 5th. In C major those are C (root), E (3rd) and ' +
        'G (5th). An inversion is simply which of the three is the lowest note. Root position has the root on the ' +
        'bottom (C-E-G). 1st inversion puts the 3rd on the bottom (E-G-C), written C/E. 2nd inversion puts the 5th ' +
        'on the bottom (G-C-E), written C/G. It is the same C major chord every time; only the order changes.\n\n' +
        'The fretboard shows C in root position on strings 3-2-1 (frets 5-5-3): C on the G string is the root (1), ' +
        'E on the B string is the 3rd (3), and G on the high E string is the 5th (5). These three notes sit inside ' +
        'the A-shape you already know. Every CAGED shape is really a stack of small triads like this one, and ' +
        'inversions are how you find them.',
      he:
        'טריאדה היא אקורד בן 3 תווים: השורש, הטרצה והקווינטה. בדו מז\'ור אלה C (שורש), E (טרצה) ו-G (קווינטה). ' +
        'היפוך הוא פשוט השאלה איזה משלושת התווים הוא הנמוך ביותר. במצב יסודי השורש נמצא למטה (C-E-G). בהיפוך ' +
        'ראשון הטרצה נמצאת למטה (E-G-C), ונכתב C/E. בהיפוך שני הקווינטה נמצאת למטה (G-C-E), ונכתב C/G. זה תמיד ' +
        'אותו אקורד דו מז\'ור; רק הסדר משתנה.\n\n' +
        'המסרגה מציגה את C במצב יסודי על מיתרים 3-2-1 (שריגים 5-5-3): C על מיתר G הוא השורש (1), E על מיתר B ' +
        'הוא הטרצה (3), ו-G על מיתר E הגבוה הוא הקווינטה (5). שלושת התווים האלה יושבים בתוך צורת A שאתם כבר ' +
        'מכירים. כל צורת CAGED היא למעשה ערימה של טריאדות קטנות כמו זו, וההיפוכים הם הדרך למצוא אותן.',
    },
  },
  {
    id: 'caged-inversions-neck',
    stage: CAGED_STAGES.INVERSIONS,
    title: { en: 'Inversions Up the Neck', he: 'היפוכים לאורך הצוואר' },
    kind: 'inversionMap',
    description: {
      en:
        'Choose a string set. On every set, the three inversions of C major repeat up the neck in a fixed order, ' +
        'and each one lives inside one of the CAGED shapes. For example, on strings 3-2-1: C/G (2nd inversion, ' +
        'inside the open C-shape) -> C (root position, inside the A-shape) -> C/E (1st inversion, inside the ' +
        'E-shape) -> C/G again, 12 frets up (inside the D- and C-shapes). The pins above the neck name each ' +
        'inversion, and the highlighted dots mark the root (C). Play each triad, then say which inversion it is ' +
        'and which CAGED shape it comes from.',
      he:
        'בחרו קבוצת מיתרים. בכל קבוצה, שלושת ההיפוכים של דו מז\'ור חוזרים לאורך הצוואר בסדר קבוע, וכל אחד מהם ' +
        'יושב בתוך אחת מצורות CAGED. לדוגמה, על מיתרים 3-2-1: C/G (היפוך שני, בתוך צורת C הפתוחה) <- C (מצב ' +
        'יסודי, בתוך צורת A) <- C/E (היפוך ראשון, בתוך צורת E) <- ושוב C/G, 12 שריגים למעלה (בתוך צורות D ו-C). ' +
        'הסיכות מעל הצוואר מציינות כל היפוך, והנקודות המודגשות מסמנות את השורש (C). נגנו כל טריאדה, ואז אמרו ' +
        'איזה היפוך זה ומאיזו צורת CAGED הוא מגיע.',
    },
  },
  {
    id: 'caged-workout',
    stage: CAGED_STAGES.APPLICATION,
    title: { en: 'CAGED Shape-Shift Workout', he: 'תרגיל מעבר בין צורות CAGED' },
    kind: 'exercise',
    description: {
      en:
        "A metronome-timed drill that steps through the root note of C in all 5 shapes, ascending the neck. Play " +
        "each root in time, then say (out loud or in your head) which shape it belongs to — this is the drill that " +
        'makes the shape sequence automatic.',
      he:
        'תרגיל בקצב מטרונום שעובר על תו השורש דו (C) בכל 5 הצורות, בעלייה לאורך הצוואר. נגנו כל שורש בקצב, ואז אמרו ' +
        '(בקול או בראש) לאיזו צורה הוא שייך — זה התרגיל שהופך את רצף הצורות לאוטומטי.',
    },
    exercise: {
      title: { en: 'CAGED Shape-Shift Workout', he: 'תרגיל מעבר בין צורות CAGED' },
      bpmSuggested: 70,
      noteValue: 'quarter',
      sequence: [
        step(4, 1, 2, 'C'), // C-shape root (B string)
        step(1, 3, 1, 'C'), // A-shape root (A string)
        step(3, 5, 3, 'C'), // G-shape root (G string)
        step(0, 8, 4, 'C'), // E-shape root (low E string)
        step(2, 10, 1, 'C'), // D-shape root (D string)
      ],
    },
  },
  {
    id: 'caged-inversion-climb',
    stage: CAGED_STAGES.APPLICATION,
    title: { en: 'Inversion Climb', he: 'טיפוס בהיפוכים' },
    kind: 'exercise',
    description: {
      en:
        'A metronome-timed drill that climbs the C major triad up strings 3-2-1, one inversion at a time: C/G ' +
        '(open C-shape) -> C (A-shape) -> C/E (E-shape) -> C/G (C-shape, 12th fret). Pick each triad as a short ' +
        'arpeggio, low string to high, and name the inversion as you land on it.',
      he:
        'תרגיל בקצב מטרונום שמטפס עם טריאדת דו מז\'ור על מיתרים 3-2-1, היפוך אחרי היפוך: C/G (צורת C פתוחה) <- ' +
        'C (צורת A) <- C/E (צורת E) <- C/G (צורת C, שריג 12). נגנו כל טריאדה כארפג\'ו קצר, מהמיתר הנמוך לגבוה, ' +
        'וקראו בשם ההיפוך כשאתם מגיעים אליו.',
    },
    exercise: {
      title: { en: 'Inversion Climb', he: 'טיפוס בהיפוכים' },
      bpmSuggested: 70,
      noteValue: 'quarter',
      sequence: [
        // C/G, 2nd inversion (open C-shape)
        step(3, 0, 0, 'G'),
        step(4, 1, 1, 'C'),
        step(5, 0, 0, 'E'),
        // C, root position (A-shape)
        step(3, 5, 3, 'C'),
        step(4, 5, 4, 'E'),
        step(5, 3, 1, 'G'),
        // C/E, 1st inversion (E-shape)
        step(3, 9, 2, 'E'),
        step(4, 8, 1, 'G'),
        step(5, 8, 1, 'C'),
        // C/G, 2nd inversion an octave up (C-shape)
        step(3, 12, 1, 'G'),
        step(4, 13, 2, 'C'),
        step(5, 12, 1, 'E'),
      ],
    },
  },
];

// The C-shape is the one edge case: at root C, its "natural" position IS the
// open chord (offset 0 in voicings.js's transposeShape), which gets labeled
// shapeName 'Open' rather than 'C-shape' — that's correct behavior for
// transposeShape (an actual open C chord shouldn't be mislabeled as a
// transposed shape elsewhere in the app), but this lesson still needs to
// find it.
function findShapePosition(positions, shapeName) {
  if (shapeName === 'C-shape') {
    return positions.find((p) => p.baseFret === 0) ?? positions.find((p) => p.shapeName === shapeName);
  }
  return positions.find((p) => p.shapeName === shapeName);
}

// Builds a single-chord "roadmap" across the 5 (well, 6 — the cycle wraps
// back to the C-shape an octave up) CAGED positions, in the same
// {steps, transitions} shape buildPositionRoadmap produces for a whole
// progression — so the existing Fretboard roadmap pins and
// PositionRoadmapPanel can render it with zero changes.
//
// computeChordPositions returns every playable position, including the same
// shape repeated an octave higher (e.g. two E-shape voicings, 12 frets
// apart) — this lesson wants the one cycle through each shape, not every
// octave duplicate, so keep only the lowest-fret instance per distinct
// shapeName label.
function buildShapeRoadmap(positions, chordText) {
  const byShape = new Map();
  for (const p of positions) {
    const existing = byShape.get(p.shapeName);
    if (!existing || p.baseFret < existing.baseFret) byShape.set(p.shapeName, p);
  }
  const ordered = [...byShape.values()].sort((a, b) => a.baseFret - b.baseFret);
  const steps = ordered.map((p) => ({
    chordText,
    baseFret: p.baseFret,
    shapeName: p.shapeName,
  }));
  const transitions = steps.slice(1).map((s, i) => {
    const deltaFrets = s.baseFret - steps[i].baseFret;
    return { deltaFrets, label: transitionLabel(deltaFrets) };
  });
  return { steps, transitions };
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

// One full cycle of inversions plus the octave repeat (0-12) — past that the
// same triads just repeat again.
const INVERSION_MAP_MAX_FRET = 12;

const DEGREE_LABEL_BY_ROLE = { root: '1', third: '3', fifth: '5' };

// "C", "C/E", "C/G": the chord with its lowest note as a slash bass, i.e.
// root position, 1st inversion, 2nd inversion.
function slashName(triad) {
  const lowest = triad.strings.find((s) => s.fret !== null);
  return triad.lowestRole === 'root' ? CAGED_REFERENCE_CHORD : `${CAGED_REFERENCE_CHORD}/${lowest.label}`;
}

// Which CAGED shape(s) contain all 3 notes of a triad. The open C chord is
// labeled 'Open' by the chord engine (see findShapePosition above) — for
// this course it's the C-shape.
function cagedShapesFor(triad, cagedPositions) {
  const fretted = triad.strings.map((s, i) => (s.fret === null ? -1 : i)).filter((i) => i >= 0);
  const names = cagedPositions
    .filter((p) => fretted.every((i) => p.strings[i]?.fret === triad.strings[i].fret))
    .map((p) => (p.shapeName === 'Open' ? 'C-shape' : p.shapeName));
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

// The intro lesson's single example: C in root position on strings 3-2-1.
function introTriad(triadPositions) {
  return triadPositions.find((p) => p.stringSetOrder === 0 && p.lowestRole === 'root') ?? null;
}

// Every C triad on one string set, frets 0-12, as a roadmap (pins named C /
// C/E / C/G, each tagged with its CAGED shape) plus the dots themselves.
export function buildInversionMap(triadPositions, cagedPositions, stringSetOrder) {
  const triads = triadPositions
    .filter((p) => p.stringSetOrder === stringSetOrder && p.baseFret <= INVERSION_MAP_MAX_FRET)
    .sort((a, b) => a.baseFret - b.baseFret);

  const steps = triads.map((triad) => ({
    chordText: slashName(triad),
    baseFret: triad.baseFret,
    shapeName: cagedShapesFor(triad, cagedPositions).join(' / ') || null,
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

// The single function App.jsx calls to turn "which lesson is active" into
// Fretboard props — keeps this branching out of App.jsx itself.
export function resolveCagedStageProps(lesson, positions, triadPositions = [], inversionStringSet = 0) {
  if (!lesson) return { position: null };
  if (lesson.kind === 'inversion') {
    const triad = introTriad(triadPositions);
    return { position: null, scaleNotes: triad ? triadNotes(triad) : [], labelMode: 'degree' };
  }
  if (lesson.kind === 'inversionMap') {
    const { roadmap, notes } = buildInversionMap(triadPositions, positions, inversionStringSet);
    return { position: null, roadmap, scaleNotes: notes, labelMode: 'degree' };
  }
  if (lesson.kind === 'shape') {
    return { position: findShapePosition(positions, lesson.shapeName) ?? null, labelMode: 'note' };
  }
  if (lesson.kind === 'connecting') {
    return { position: null, roadmap: buildShapeRoadmap(positions, CAGED_REFERENCE_CHORD) };
  }
  return { position: null };
}
