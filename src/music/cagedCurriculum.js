// The Studies -> CAGED course's content model: hand-authored lesson data,
// in the same spirit as drills.js/licks.js, plus the small pure functions
// that turn a lesson into Fretboard props. No new chord-shape computation
// here — every shape demo is read straight out of the app's existing CAGED
// engine (shapeTemplates.js -> voicings.js -> computeChordPositions.js),
// which already tags every position of a chord with which of the 5 open
// shapes (E/A/D/G/C) produced it.
import { transitionLabel } from './positionRoadmap';

// All lessons demo C major, the conventional reference chord for teaching
// CAGED ("the C you get from the E-shape", etc).
export const CAGED_REFERENCE_CHORD = 'C';

export const CAGED_STAGES = {
  FOUNDATION: 'foundation',
  SHAPES: 'shapes',
  CONNECTING: 'connecting',
  APPLICATION: 'application',
};

export const CAGED_STAGE_LABELS = {
  [CAGED_STAGES.FOUNDATION]: { en: 'Foundation', he: 'יסודות' },
  [CAGED_STAGES.SHAPES]: { en: 'The 5 Shapes', he: '5 הצורות' },
  [CAGED_STAGES.CONNECTING]: { en: 'Connecting Shapes', he: 'חיבור הצורות' },
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
        'how the shapes link together into one continuous map of the fretboard.',
      he:
        'שיטת CAGED לוקחת את 5 האקורדים הפתוחים שכל מתחיל לומד ראשונים — C, A, G, E, D — ומראה שהצורות שלהם חוזרות ' +
        'על עצמן לאורך כל צוואר הגיטרה, עבור כל אקורד, לא רק זה שעל שמו הן קרויות. ברגע שאתם מכירים את 5 הצורות ' +
        'האלה, תוכלו לנגן את אותו אקורד ב-5 מקומות שונים, וחשוב לא פחות — תמיד תדעו איפה אתם נמצאים על הצוואר. ' +
        'הקורס הזה עובר על כל צורה תוך שימוש באקורד דו מז\'ור (C) כדוגמה, ולאחר מכן מראה כיצד הצורות מתחברות ' +
        'למפה אחת רציפה של המסרגה.',
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

// The single function App.jsx calls to turn "which lesson is active" into
// Fretboard props — keeps this branching out of App.jsx itself.
export function resolveCagedStageProps(lesson, positions) {
  if (!lesson) return { position: null };
  if (lesson.kind === 'shape') {
    return { position: findShapePosition(positions, lesson.shapeName) ?? null, labelMode: 'note' };
  }
  if (lesson.kind === 'connecting') {
    return { position: null, roadmap: buildShapeRoadmap(positions, CAGED_REFERENCE_CHORD) };
  }
  return { position: null };
}
