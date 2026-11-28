// The piano teacher's curriculum (v1.0.294) — levels 0–2.
//
// Order and content follow the established beginner method books and the
// graded syllabi (rule 14), in the order a private teacher uses them:
//   • Faber "Piano Adventures" Primer / Level 1 and Alfred's "Basic Adult
//     Piano Course" Level 1: posture and finger numbers first, the black-key
//     groups as the map of the keyboard, C position (one finger per key) for
//     both hands, note values and counting, reading from the landmark notes,
//     hands taking turns, then a held bass, then the I and V7 chords in the
//     left hand, then IV (Alfred's C–G7 then F order, the F chord as C–F–A so
//     the hand barely moves).
//   • ABRSM / Trinity Initial–Grade 1 technical work: C and G major one
//     octave hands separately with the thumb passing under (fingering
//     1-2-3-1-2-3-4-5), A minor, the major triad and its inversions, broken
//     chords; dynamics (p, mf, f) and legato / staccato.
// Pieces are public domain (Beethoven "Ode to Joy" 1824; "Hot Cross Buns",
// traditional; "Jingle Bells", J. L. Pierpont 1857) or our own.
//
// SKILLS: check = how mastery is shown — {kind:'play'} the student played the
// step's notes (screen keys exactly, or the mic heard them), {kind:'quiz'},
// {kind:'self'} (a checklist, never alone). Mastered = 2 days for play.
//
// NOTES are written as a short string, one EVENT per space:
//   'E4.3'        E4 with finger 3          'C4.1+C3.5'  two notes together
//   'E4.3_1.5'    lasts 1.5 beats (default 1, used by Hear only)
//   'C*'          any C (any octave)        hand: < middle C = left, else right
//                                           (a step's `hand: 'L'` makes middle C left;
//                                           `split: 55` moves the line, e.g. RH chords down to A3)
const L = (en, he) => ({ en, he });
const H = (s) => `⁦${s}⁩`; // isolate a Latin token inside Hebrew

export const PIANO_LEVELS = [
  { n: 0, grade: 'Pre-Initial', title: L('First steps', 'צעדים ראשונים') },
  { n: 1, grade: 'Initial', title: L('Both hands, first chords', 'שתי ידיים, אקורדים ראשונים') },
  { n: 2, grade: 'Grade 1', title: L('Scales, triads, accompaniment', 'סולמות, משולשים, ליווי') },
];

// ---- the notes language ---------------------------------------------------------------

const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

/** 'E4.3+C3.5_2' -> {notes:[{midi, finger, hand}], beats, any?:pc} */
export function parseEvents(src, { hand = null, split = 60 } = {}) {
  return String(src)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const [body, dur] = tok.split('_');
      const notes = body.split('+').map((n) => {
        const any = n.match(/^([A-G])([#b]?)\*$/);
        if (any) return { pc: (LETTER[any[1]] + (any[2] === '#' ? 1 : any[2] === 'b' ? -1 : 0) + 12) % 12, any: true };
        const m = n.match(/^([A-G])([#b]?)(\d)(?:\.(\d))?$/);
        if (!m) throw new Error('bad note ' + n + ' in ' + src);
        const midi = 12 * (Number(m[3]) + 1) + LETTER[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
        const h = midi < split ? 'L' : midi > split ? 'R' : hand ?? 'R';
        return { midi, finger: m[4] ? Number(m[4]) : null, hand: h };
      });
      return { notes, beats: dur ? Number(dur) : 1 };
    });
}

export const noteName = (midi) => NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
export const pcName = (pc) => NAMES[pc];

// ---- skills ---------------------------------------------------------------------------

export const PIANO_SKILLS = [
  { id: 'p-posture', level: 0, title: L('Sitting and hand shape', 'ישיבה ותנוחת היד'), check: { kind: 'self' } },
  { id: 'p-fingers', level: 0, title: L('Finger numbers 1–5', 'מספרי האצבעות 1–5'), check: { kind: 'quiz' } },
  { id: 'p-find-c', level: 0, title: L('Find every C', `למצוא כל ${H('C')}`), check: { kind: 'play' } },
  { id: 'p-white-keys', level: 0, title: L('The white keys by name', 'הקלידים הלבנים בשמם'), check: { kind: 'play' } },
  { id: 'p-rh-c', level: 0, title: L('Right hand in C position', `יד ימין בתנוחת ${H('C')}`), check: { kind: 'play' } },
  { id: 'p-lh-c', level: 0, title: L('Left hand in C position', `יד שמאל בתנוחת ${H('C')}`), check: { kind: 'play' } },
  { id: 'p-ode-rh', level: 0, title: L('“Ode to Joy”, right hand', '„האודה לשמחה”, יד ימין'), check: { kind: 'play' } },
  { id: 'p-note-values', level: 0, title: L('Quarter, half, whole and dotted notes', 'רבע, חצי, שלם ותו מנוקד'), check: { kind: 'quiz' } },
  { id: 'p-count', level: 0, title: L('Playing in time with the click', 'לנגן בזמן עם המטרונום'), check: { kind: 'self' } },
  { id: 'p-read-treble', level: 1, title: L('Reading the treble staff', 'קריאה במפתח סול'), check: { kind: 'quiz' } },
  { id: 'p-read-bass', level: 1, title: L('Reading the bass staff', 'קריאה במפתח פה'), check: { kind: 'quiz' } },
  { id: 'p-read-play', level: 1, title: L('Read and play a new tune', 'לקרוא ולנגן מנגינה חדשה'), check: { kind: 'play' } },
  { id: 'p-ht-held', level: 1, title: L('Hands together: a held bass', 'שתי ידיים: בס מוחזק'), check: { kind: 'play' } },
  { id: 'p-chord-c', level: 1, title: L('C chord, left hand', `אקורד ${H('C')}, יד שמאל`), check: { kind: 'play' } },
  { id: 'p-chord-g7', level: 1, title: L('G7 chord, left hand', `אקורד ${H('G7')}, יד שמאל`), check: { kind: 'play' } },
  { id: 'p-v7-root', level: 1, title: L('The notes of G7', `הצלילים של ${H('G7')}`), check: { kind: 'quiz' } },
  { id: 'p-ode-chords', level: 1, title: L('A tune with I and V7 chords', `מנגינה עם אקורדי ${H('I')} ו־${H('V7')}`), check: { kind: 'play' } },
  { id: 'p-chord-f', level: 1, title: L('F chord and I–IV–V7', `אקורד ${H('F')} ו־${H('I–IV–V7')}`), check: { kind: 'play' } },
  { id: 'p-primary', level: 1, title: L('Tonic, subdominant, dominant', 'טוניקה, סאבדומיננטה, דומיננטה'), check: { kind: 'quiz' } },
  { id: 'p-jingle', level: 1, title: L('“Jingle Bells”, hands together', '„ג׳ינגל בלז”, שתי ידיים'), check: { kind: 'play' } },
  { id: 'p-scale-c-rh', level: 2, title: L('C major scale, right hand', `סולם ${H('C')} מז׳ור, יד ימין`), check: { kind: 'play' } },
  { id: 'p-scale-c-lh', level: 2, title: L('C major scale, left hand', `סולם ${H('C')} מז׳ור, יד שמאל`), check: { kind: 'play' } },
  { id: 'p-thumb-under', level: 2, title: L('Where the thumb passes under', 'איפה האגודל עובר מתחת'), check: { kind: 'quiz' } },
  { id: 'p-scale-g-rh', level: 2, title: L('G major scale, right hand', `סולם ${H('G')} מז׳ור, יד ימין`), check: { kind: 'play' } },
  { id: 'p-scale-g-lh', level: 2, title: L('G major scale, left hand', `סולם ${H('G')} מז׳ור, יד שמאל`), check: { kind: 'play' } },
  { id: 'p-key-g', level: 2, title: L('The key of G: one sharp', `סולם ${H('G')}: דיאז אחד`), check: { kind: 'quiz' } },
  { id: 'p-inversions', level: 2, title: L('C triad and its inversions', `המשולש ${H('C')} וההיפוכים שלו`), check: { kind: 'play' } },
  { id: 'p-inv-names', level: 2, title: L('Name an inversion', 'לזהות היפוך'), check: { kind: 'quiz' } },
  { id: 'p-four-chords', level: 2, title: L('I–V–vi–IV with smooth chords', `${H('I–V–vi–IV')} באקורדים חלקים`), check: { kind: 'play' } },
  { id: 'p-a-minor', level: 2, title: L('A minor: five fingers and the scale', `${H('A')} מינור: חמש אצבעות והסולם`), check: { kind: 'play' } },
  { id: 'p-minor-ear', level: 2, title: L('Hear major from minor', 'לשמוע מז׳ור ממינור'), check: { kind: 'quiz' } },
  { id: 'p-minor-chords', level: 2, title: L('Am, Dm and E in the left hand', `${H('Am')}, ${H('Dm')} ו־${H('E')} ביד שמאל`), check: { kind: 'play' } },
  { id: 'p-broken', level: 2, title: L('Broken-chord accompaniment', 'ליווי באקורדים שבורים'), check: { kind: 'play' } },
  { id: 'p-dynamics', level: 2, title: L('Dynamics and touch', 'דינמיקה ומגע'), check: { kind: 'quiz' } },
  { id: 'p-ode-broken', level: 2, title: L('A melody over a moving bass', 'מנגינה מעל בס נע'), check: { kind: 'play' } },
];
export const pianoSkillById = (id) => PIANO_SKILLS.find((s) => s.id === id);

// ---------------------------------------------------------------------------------------
// Lessons. Step kinds:
//   explain   {title, text, keys?}                 text; `keys` = notes shown on the keyboard + Hear
//   checklist {title, text?, items, metronome?}    ticked by the student
//   quiz      {title, question, options, answer, why, listen?, staff?}
//   staff     {title, text, staff:{clef, notes}}    notes on a staff + Hear
//   play      {title, text, notes, skill, staff?, hand?, bpm?}
//             the student plays the events in order — screen keys (exact) or
//             the mic (a real piano); the next one is lit on the keyboard
// homework: [{id, kind:'play', skill, step} | {id, kind:'self', text}]
// ---------------------------------------------------------------------------------------

const ODE_RH = 'E4.3 E4.3 F4.4 G4.5 G4.5 F4.4 E4.3 D4.2 C4.1 C4.1 D4.2 E4.3 E4.3_1.5 D4.2_0.5 D4.2_2';
const C_LH = 'C3.5+E3.3+G3.1';
const G7_LH = 'B2.5+F3.2+G3.1';
const F_LH = 'C3.5+F3.2+A3.1';

const lessonKeyboard = {
  id: 'p0-keyboard',
  level: 0,
  minutes: 15,
  title: L('Meet the keyboard', 'היכרות עם המקלדת'),
  objective: L('Sit well, number your fingers, and find any white key by the black-key groups.', 'לשבת נכון, לדעת את מספרי האצבעות, ולמצוא כל קליד לבן לפי קבוצות השחורים.'),
  skills: ['p-posture', 'p-fingers', 'p-find-c', 'p-white-keys'],
  steps: [
    {
      kind: 'explain',
      title: L('Today’s lesson', 'השיעור של היום'),
      text: L(
        'In 15 minutes you will sit at the piano the way teachers ask, know your finger numbers, and find any white key without counting. Play on a real piano or keyboard — the teacher listens through the microphone — or tap the keys on the screen.',
        'ב־15 הדקות הקרובות תלמד לשבת ליד הפסנתר כמו שמורים מבקשים, תכיר את מספרי האצבעות, ותמצא כל קליד לבן בלי לספור. נגן על פסנתר אמיתי או אורגן — המורה מקשיב דרך המיקרופון — או הקש על הקלידים במסך.'
      ),
    },
    {
      kind: 'checklist',
      skill: 'p-posture',
      title: L('Sit at the piano', 'ישיבה ליד הפסנתר'),
      text: L('Check each point at your piano.', 'בדוק כל נקודה ליד הפסנתר שלך.'),
      items: [
        L('Sit in front of the middle of the keyboard, on the front half of the bench.', 'שב מול אמצע המקלדת, על החצי הקדמי של הכיסא.'),
        L('Bench height: your forearms are level with the keys; elbows a little in front of your body.', 'גובה הכיסא: האמות בגובה הקלידים; המרפקים מעט לפני הגוף.'),
        L('Feet flat on the floor, back straight but not stiff.', 'כפות הרגליים על הרצפה, גב זקוף אבל לא נוקשה.'),
        L('Fingers curved as if holding a ball; you play on the fingertips.', 'אצבעות מעוגלות כאילו מחזיקים כדור; מנגנים בקצות האצבעות.'),
        L('Wrists level with the hand — not dropped, not raised. The thumb plays on its side corner.', 'שורש כף היד בגובה היד — לא שמוט ולא מורם. האגודל מנגן בפינה של הצד שלו.'),
      ],
    },
    {
      kind: 'explain',
      title: L('Finger numbers', 'מספרי האצבעות'),
      keys: 'C3.5 D3.4 E3.3 F3.2 G3.1 C4.1 D4.2 E4.3 F4.4 G4.5',
      text: L(
        'Pianists number the fingers the same way in both hands: thumb 1, index 2, middle 3, ring 4, little finger 5. Music shows these numbers above the notes. On the keyboard below, both hands lie ready: the thumbs point to each other, so the left hand’s 5 is on the lowest note.',
        'פסנתרנים ממספרים את האצבעות באותה צורה בשתי הידיים: אגודל 1, אצבע מורה 2, אמה 3, קמיצה 4, זרת 5. בתווים המספרים האלה כתובים מעל התווים. במקלדת למטה שתי הידיים מוכנות: האגודלים פונים זה אל זה, ולכן ה־5 של יד שמאל נמצא על הצליל הנמוך ביותר.'
      ),
    },
    {
      kind: 'quiz',
      skill: 'p-fingers',
      title: L('Which finger?', 'איזו אצבע?'),
      question: L('In the LEFT hand, which finger is number 1?', 'ביד שמאל, איזו אצבע היא מספר 1?'),
      options: [L('The little finger', 'הזרת'), L('The thumb', 'האגודל'), L('The index finger', 'האצבע המורה')],
      answer: 1,
      why: L('Both hands count from the thumb: thumb = 1, little finger = 5.', 'בשתי הידיים סופרים מהאגודל: אגודל = 1, זרת = 5.'),
    },
    {
      kind: 'explain',
      title: L('The map: two and three black keys', 'המפה: שניים ושלושה שחורים'),
      keys: 'C2 C3 C4 C5 C6',
      text: L(
        `The black keys come in groups of two and three, again and again. They are your map. C (“do”) is the white key just LEFT of every group of TWO. D (“re”) is between those two black keys, and E (“mi”) just right of them. The marked keys below are all Cs — the one in the middle of the piano is MIDDLE C, the home note of everything you will play now.`,
        `הקלידים השחורים מסודרים בקבוצות של שניים ושל שלושה, שוב ושוב. הם המפה שלך. ${H('C')} (דו) הוא הקליד הלבן שמשמאל לכל קבוצה של שני שחורים. ${H('D')} (רה) נמצא בין שני השחורים, ו־${H('E')} (מי) מימינם. כל הקלידים המסומנים למטה הם ${H('C')} — זה שבאמצע הפסנתר נקרא ״דו האמצעי״, צליל הבית של כל מה שתנגן עכשיו.`
      ),
    },
    {
      kind: 'play',
      skill: 'p-find-c',
      title: L('Find the Cs', `למצוא את ה־${H('C')}`),
      notes: 'C* C* C* C*',
      text: L(
        'Play a C four times, each one in a different part of the piano — low, middle, high. Look for the two black keys and take the white key on their left.',
        `נגן ${H('C')} ארבע פעמים, כל פעם באזור אחר של הפסנתר — נמוך, אמצע, גבוה. חפש את שני השחורים וקח את הלבן שמשמאלם.`
      ),
    },
    {
      kind: 'quiz',
      title: L('Between the two', 'בין השניים'),
      question: L('Which white key sits BETWEEN the two black keys?', 'איזה קליד לבן נמצא בין שני הקלידים השחורים?'),
      options: [L('C', H('C')), L('D', H('D')), L('F', H('F'))],
      answer: 1,
      why: L('C is left of the two, D between them, E right of them.', `${H('C')} משמאל לשניים, ${H('D')} ביניהם, ${H('E')} מימינם.`),
    },
    {
      kind: 'play',
      skill: 'p-white-keys',
      title: L('All seven white notes', 'כל שבעת הלבנים'),
      notes: 'C4 D4 E4 F4 G4 A4 B4 C5',
      text: L(
        'The white keys go C D E F G A B and start again at C. F (“fa”) is just left of the group of THREE black keys. Play from middle C up to the next C, saying each name out loud.',
        `הלבנים הולכים ${H('C D E F G A B')} ומתחילים שוב ב־${H('C')}. ${H('F')} (פה) נמצא משמאל לקבוצה של שלושה שחורים. נגן מדו האמצעי עד ה־${H('C')} הבא, ואמור כל שם בקול.`
      ),
    },
  ],
  homework: [
    { id: 'find', kind: 'play', skill: 'p-white-keys', step: 7, text: L('Each day: find every C, then play C to C naming the keys.', `כל יום: למצוא כל ${H('C')}, ואז לנגן מ־${H('C')} ל־${H('C')} ולומר את השמות.`) },
  ],
};

const lessonCPosition = {
  id: 'p0-c-position',
  level: 0,
  minutes: 20,
  title: L('C position: five fingers, five notes', `תנוחת ${H('C')}: חמש אצבעות, חמישה צלילים`),
  objective: L('Play C–G with each hand, one finger per key, and your first melody.', `לנגן ${H('C–G')} בכל יד, אצבע לכל קליד, ואת המנגינה הראשונה.`),
  skills: ['p-rh-c', 'p-lh-c', 'p-ode-rh'],
  steps: [
    {
      kind: 'explain',
      title: L('One finger per key', 'אצבע לכל קליד'),
      keys: 'C4.1 D4.2 E4.3 F4.4 G4.5',
      text: L(
        'In C position the right-hand thumb (1) sits on middle C and each finger takes the next white key: C D E F G = fingers 1 2 3 4 5. The hand does not move — the fingers do the work.',
        `בתנוחת ${H('C')} האגודל של יד ימין (1) יושב על דו האמצעי וכל אצבע לוקחת את הלבן הבא: ${H('C D E F G')} = אצבעות 1 2 3 4 5. היד לא זזה — האצבעות עובדות.`
      ),
    },
    {
      kind: 'play',
      skill: 'p-rh-c',
      title: L('Right hand up and down', 'יד ימין למעלה ולמטה'),
      notes: 'C4.1 D4.2 E4.3 F4.4 G4.5 F4.4 E4.3 D4.2 C4.1',
      text: L('Play up to G and back, slowly and evenly. Keep every finger touching its key.', `נגן עד ${H('G')} וחזרה, לאט ובאופן שווה. כל אצבע נשארת נוגעת בקליד שלה.`),
    },
    {
      kind: 'explain',
      title: L('The left hand', 'יד שמאל'),
      keys: 'C3.5 D3.4 E3.3 F3.2 G3.1',
      text: L(
        'The left hand mirrors it, one octave lower: little finger (5) on the C below middle C, then D E F G with 4 3 2 1 — the thumb ends on G.',
        `יד שמאל היא תמונת מראה, אוקטבה אחת נמוך יותר: הזרת (5) על ה־${H('C')} שמתחת לדו האמצעי, ואז ${H('D E F G')} עם 4 3 2 1 — האגודל מסיים על ${H('G')}.`
      ),
    },
    {
      kind: 'play',
      skill: 'p-lh-c',
      title: L('Left hand up and down', 'יד שמאל למעלה ולמטה'),
      notes: 'C3.5 D3.4 E3.3 F3.2 G3.1 F3.2 E3.3 D3.4 C3.5',
      text: L('Up to G with the thumb and back down to C. Notes evenly loud — the 4th and 5th fingers are weaker, give them a little more.', `עד ${H('G')} באגודל וחזרה ל־${H('C')}. צלילים בעוצמה שווה — אצבעות 4 ו־5 חלשות יותר, תן להן קצת יותר.`),
    },
    {
      kind: 'checklist',
      title: L('A good hand', 'יד טובה'),
      items: [
        L('Fingers stay curved; no finger collapses at the first joint.', 'האצבעות נשארות מעוגלות; אף אצבע לא נשברת במפרק הראשון.'),
        L('Fingers not playing rest on their keys, ready.', 'אצבעות שלא מנגנות נחות על הקלידים שלהן, מוכנות.'),
        L('The wrist stays quiet: the finger moves, not the arm.', 'שורש כף היד שקט: האצבע זזה, לא הזרוע.'),
        L('Each note as loud as the one before.', 'כל צליל בעוצמה של הקודם.'),
      ],
    },
    {
      kind: 'play',
      skill: 'p-ode-rh',
      title: L('Your first melody: “Ode to Joy”', 'המנגינה הראשונה: „האודה לשמחה”'),
      notes: ODE_RH,
      text: L(
        'Beethoven wrote this theme for his 9th Symphony (1824), and it fits C position exactly. Start on E with finger 3. The lit key on the keyboard is always the next note; Hear plays the whole phrase.',
        `בטהובן כתב את הנושא הזה לסימפוניה התשיעית שלו (1824), והוא נכנס בדיוק לתנוחת ${H('C')}. מתחילים ב־${H('E')} עם אצבע 3. הקליד המואר במקלדת הוא תמיד הצליל הבא; ״האזנה״ מנגנת את כל המשפט.`
      ),
    },
    {
      kind: 'quiz',
      title: L('Where is G?', `איפה ${H('G')}?`),
      question: L('In C position, which right-hand finger plays G?', `בתנוחת ${H('C')}, איזו אצבע של יד ימין מנגנת ${H('G')}?`),
      options: [L('3', '3'), L('4', '4'), L('5', '5')],
      answer: 2,
      why: L('C D E F G = 1 2 3 4 5, so G is the little finger.', `${H('C D E F G')} = 1 2 3 4 5, ולכן ${H('G')} היא הזרת.`),
    },
  ],
  homework: [
    { id: 'ode', kind: 'play', skill: 'p-ode-rh', step: 5, text: L('Play “Ode to Joy” three times a day.', 'לנגן את „האודה לשמחה” שלוש פעמים ביום.') },
    { id: 'lh', kind: 'play', skill: 'p-lh-c', step: 3, text: L('Left hand C–G–C, slowly, every day.', `יד שמאל ${H('C–G–C')}, לאט, כל יום.`) },
  ],
};

const lessonRhythm = {
  id: 'p0-rhythm',
  level: 0,
  minutes: 15,
  title: L('Counting the beat', 'לספור את הפעמה'),
  objective: L('Hold each note for its right number of beats, with the click.', 'להחזיק כל צליל את מספר הפעמות הנכון, עם המטרונום.'),
  skills: ['p-note-values', 'p-count'],
  steps: [
    {
      kind: 'staff',
      title: L('How long a note lasts', 'כמה זמן צליל נמשך'),
      staff: { clef: 'treble', notes: 'C4 C4 C4 C4 C4_2 C4_2 C4_4' },
      text: L(
        'Music runs on a steady beat. A QUARTER note (black, with a stem) lasts 1 beat, a HALF note (white with a stem) 2 beats, a WHOLE note (white, no stem) 4 beats. Most music groups the beats in fours: one BAR = 4 beats, counted “1 2 3 4”.',
        'מוזיקה נשענת על פעמה קבועה. רבע (שחור עם מקל) נמשך פעמה אחת, חצי (לבן עם מקל) 2 פעמות, שלם (לבן בלי מקל) 4 פעמות. רוב המוזיקה מקבצת את הפעמות בארבע: תיבה אחת = 4 פעמות, וסופרים ״1 2 3 4״.'
      ),
    },
    {
      kind: 'quiz',
      skill: 'p-note-values',
      title: L('Half a bar', 'חצי תיבה'),
      question: L('How many beats does a HALF note last?', 'כמה פעמות נמשך חצי?'),
      options: [L('1', '1'), L('2', '2'), L('4', '4')],
      answer: 1,
      why: L('Quarter 1, half 2, whole 4 — each is twice the one before.', 'רבע 1, חצי 2, שלם 4 — כל אחד כפול מהקודם.'),
    },
    {
      kind: 'checklist',
      skill: 'p-count',
      metronome: 60,
      title: L('Play with the click', 'לנגן עם המטרונום'),
      text: L('Start the click and count aloud “1 2 3 4” with it.', 'הפעל את המטרונום וספור בקול ״1 2 3 4״ איתו.'),
      items: [
        L('Middle C on every click: four quarter notes.', 'דו האמצעי על כל קליק: ארבעה רבעים.'),
        L('Middle C held for two clicks, twice: two half notes.', 'דו האמצעי מוחזק שני קליקים, פעמיים: שני חצאים.'),
        L('Middle C held for all four clicks: one whole note.', 'דו האמצעי מוחזק את כל ארבעת הקליקים: שלם אחד.'),
        L('You let go of each note exactly on the next count, not before.', 'משחררים כל צליל בדיוק בספירה הבאה, לא לפני.'),
      ],
    },
    {
      kind: 'quiz',
      title: L('The dot', 'הנקודה'),
      question: L('A dot after a note adds half its length. How long is a DOTTED quarter?', 'נקודה אחרי תו מוסיפה חצי מאורכו. כמה נמשך רבע מנוקד?'),
      options: [L('1 beat', 'פעמה אחת'), L('1½ beats', 'פעמה וחצי'), L('2 beats', '2 פעמות')],
      answer: 1,
      why: L('1 + ½ = 1½. In “Ode to Joy” the E before the last two Ds is dotted: “E – (and) D D”.', `1 + ½ = 1½. ב„אודה לשמחה” ה־${H('E')} שלפני שני ה־${H('D')} האחרונים מנוקד.`),
    },
    {
      kind: 'checklist',
      metronome: 60,
      title: L('“Ode to Joy” in time', '„האודה לשמחה” בזמן'),
      text: L('Play the melody with the click: one note per click, the dotted E for one and a half, the last D for two.', `נגן את המנגינה עם המטרונום: צליל אחד בכל קליק, ה־${H('E')} המנוקד פעמה וחצי, ה־${H('D')} האחרון שתיים.`),
      items: [
        L('The notes land ON the clicks, not between them.', 'הצלילים נופלים על הקליקים, לא ביניהם.'),
        L('You keep going after a mistake — the beat never stops.', 'ממשיכים אחרי טעות — הפעמה לא נעצרת.'),
        L('Twice without stopping.', 'פעמיים בלי לעצור.'),
      ],
    },
  ],
  homework: [{ id: 'click', kind: 'self', text: L('Play “Ode to Joy” with the click at 60, then 72.', 'לנגן את „האודה לשמחה” עם מטרונום 60, ואז 72.') }],
};

const lessonReading = {
  id: 'p1-reading',
  level: 1,
  minutes: 20,
  title: L('Reading the notes', 'לקרוא תווים'),
  objective: L('Read C-position notes on both staves from three landmark notes.', `לקרוא את צלילי תנוחת ${H('C')} בשני החמשות, משלושה צלילי ציון־דרך.`),
  skills: ['p-read-treble', 'p-read-bass', 'p-read-play'],
  steps: [
    {
      kind: 'staff',
      title: L('Treble staff: the right hand', 'מפתח סול: יד ימין'),
      staff: { clef: 'treble', notes: 'C4 D4 E4 F4 G4' },
      text: L(
        'Piano music has two staves: the TREBLE staff (top, mostly the right hand) and the BASS staff (bottom, the left hand). Middle C sits on a short extra line just below the treble staff. Each step up goes line → space → line: C (line), D (space), E (bottom line), F (space), G (second line). The treble clef curls around that G line — your landmark.',
        `בתווי פסנתר יש שתי חמשות: מפתח סול (למעלה, בעיקר יד ימין) ומפתח פה (למטה, יד שמאל). דו האמצעי יושב על קו עזר קצר מתחת לחמשה העליונה. כל צעד למעלה עובר קו ← רווח ← קו: ${H('C')} (קו), ${H('D')} (רווח), ${H('E')} (הקו התחתון), ${H('F')} (רווח), ${H('G')} (הקו השני). מפתח סול מסתלסל סביב קו ה־${H('G')} הזה — ציון הדרך שלך.`
      ),
    },
    {
      kind: 'quiz',
      skill: 'p-read-treble',
      title: L('Name it', 'מה התו?'),
      staff: { clef: 'treble', notes: 'G4_4' },
      question: L('Which note is this?', 'איזה תו זה?'),
      options: [L('E', H('E')), L('G', H('G')), L('F', H('F'))],
      answer: 1,
      why: L('It sits on the second line — the line the treble (G) clef curls around.', 'הוא יושב על הקו השני — הקו שמפתח סול מסתלסל סביבו.'),
    },
    {
      kind: 'staff',
      title: L('Bass staff: the left hand', 'מפתח פה: יד שמאל'),
      staff: { clef: 'bass', notes: 'C3 D3 E3 F3 G3' },
      text: L(
        'The bass clef’s two dots sit around the F line (the fourth line from the bottom) — F below middle C, your second landmark. The left hand’s C position: C in the second space, then D E F G up to the top space.',
        `שתי הנקודות של מפתח פה יושבות סביב קו ה־${H('F')} (הקו הרביעי מלמטה) — ה־${H('F')} שמתחת לדו האמצעי, ציון הדרך השני. תנוחת ${H('C')} של יד שמאל: ${H('C')} ברווח השני, ואז ${H('D E F G')} עד הרווח העליון.`
      ),
    },
    {
      kind: 'quiz',
      skill: 'p-read-bass',
      title: L('Bass landmark', 'ציון דרך בבס'),
      staff: { clef: 'bass', notes: 'F3_4' },
      question: L('Which note is this?', 'איזה תו זה?'),
      options: [L('F', H('F')), L('A', H('A')), L('D', H('D'))],
      answer: 0,
      why: L('It sits on the line between the bass clef’s two dots: F.', `הוא יושב על הקו שבין שתי הנקודות של מפתח פה: ${H('F')}.`),
    },
    {
      kind: 'quiz',
      title: L('Bottom line', 'הקו התחתון'),
      staff: { clef: 'treble', notes: 'E4_4' },
      question: L('And this one, on the bottom line of the treble staff?', 'וזה, על הקו התחתון של מפתח סול?'),
      options: [L('C', H('C')), L('D', H('D')), L('E', H('E'))],
      answer: 2,
      why: L('Middle C (extra line), D (just under the staff), E (bottom line).', `דו האמצעי (קו עזר), ${H('D')} (מתחת לחמשה), ${H('E')} (הקו התחתון).`),
    },
    {
      kind: 'play',
      skill: 'p-read-play',
      title: L('Read and play: “Hot Cross Buns”', 'לקרוא ולנגן: „Hot Cross Buns”'),
      staff: { clef: 'treble', notes: 'E4 D4 C4_2 E4 D4 C4_2' },
      notes: 'E4.3 D4.2 C4.1_2 E4.3 D4.2 C4.1_2 C4.1_0.5 C4.1_0.5 C4.1_0.5 C4.1_0.5 D4.2_0.5 D4.2_0.5 D4.2_0.5 D4.2_0.5 E4.3 D4.2 C4.1_2',
      text: L(
        'A traditional tune on three notes. Read the first bars from the staff — bottom line E, then D, then middle C — before you look at the keyboard. The middle part is four quick Cs and four quick Ds.',
        `מנגינה עממית על שלושה צלילים. קרא את התיבות הראשונות מהחמשה — הקו התחתון ${H('E')}, אחר כך ${H('D')}, ואז דו האמצעי — לפני שאתה מסתכל במקלדת. באמצע: ארבעה ${H('C')} מהירים וארבעה ${H('D')} מהירים.`
      ),
    },
  ],
  homework: [{ id: 'read', kind: 'self', text: L('Each day: name 10 notes in Theory › Piano’s note-reading quiz.', 'כל יום: לזהות 10 תווים בחידון קריאת התווים שבתאוריה › פסנתר.') }],
};

const lessonHandsTogether = {
  id: 'p1-hands-together',
  level: 1,
  minutes: 20,
  title: L('Two hands: a held bass', 'שתי ידיים: בס מוחזק'),
  objective: L('Play “Ode to Joy” with a long left-hand note under each bar.', 'לנגן את „האודה לשמחה” עם צליל ארוך ביד שמאל מתחת לכל תיבה.'),
  skills: ['p-ht-held'],
  steps: [
    {
      kind: 'explain',
      title: L('Give each hand one job', 'לכל יד תפקיד אחד'),
      keys: 'C3.5 G3.1',
      text: L(
        'The easiest way to start with both hands: the left hand plays ONE long note at the start of each bar and holds it, while the right hand plays the tune. Under “Ode to Joy” the left hand alternates C (finger 5) and G (thumb) — the tonic and the dominant of C major, the home note and the note that leads back home.',
        `הדרך הקלה ביותר להתחיל בשתי ידיים: יד שמאל מנגנת צליל ארוך אחד בתחילת כל תיבה ומחזיקה אותו, ויד ימין מנגנת את המנגינה. מתחת ל„אודה לשמחה” יד שמאל מחליפה בין ${H('C')} (אצבע 5) ל־${H('G')} (אגודל) — הטוניקה והדומיננטה של ${H('C')} מז׳ור, צליל הבית והצליל שמוביל חזרה הביתה.`
      ),
    },
    {
      kind: 'play',
      title: L('Left hand alone', 'יד שמאל לבד'),
      notes: 'C3.5_4 G3.1_4 C3.5_4 G3.1_4',
      text: L('Four long notes, four beats each: C, G, C, G. Count “1 2 3 4” on each.', `ארבעה צלילים ארוכים, ארבע פעמות כל אחד: ${H('C, G, C, G')}. ספור ״1 2 3 4״ על כל אחד.`),
    },
    {
      kind: 'play',
      skill: 'p-ht-held',
      title: L('Together, slowly', 'יחד, לאט'),
      notes: 'E4.3+C3.5_1 E4.3 F4.4 G4.5 G4.5+G3.1 F4.4 E4.3 D4.2 C4.1+C3.5 C4.1 D4.2 E4.3 E4.3+G3.1_1.5 D4.2_0.5 D4.2_2',
      text: L(
        'Where two keys are lit, play them EXACTLY together; then the right hand goes on while the left hand holds. Go as slowly as you need — even is better than fast.',
        'איפה ששני קלידים מוארים, נגן אותם בדיוק יחד; ואז יד ימין ממשיכה ויד שמאל מחזיקה. לך לאט ככל שצריך — אחיד עדיף על מהיר.'
      ),
    },
    {
      kind: 'checklist',
      metronome: 60,
      title: L('With the click', 'עם המטרונום'),
      items: [
        L('Both notes start on the same click.', 'שני הצלילים מתחילים באותו קליק.'),
        L('The left-hand note lasts the whole bar (4 clicks).', 'הצליל של יד שמאל נמשך את כל התיבה (4 קליקים).'),
        L('Your eyes stay on the music (or the lit keys), not on the hands.', 'העיניים על התווים (או על הקלידים המוארים), לא על הידיים.'),
      ],
    },
    {
      kind: 'quiz',
      title: L('Why C and G?', `למה ${H('C')} ו־${H('G')}?`),
      question: L('In C major, G is the…', `בסולם ${H('C')} מז׳ור, ${H('G')} הוא…`),
      options: [L('tonic (1st degree)', 'טוניקה (דרגה 1)'), L('dominant (5th degree)', 'דומיננטה (דרגה 5)'), L('subdominant (4th degree)', 'סאבדומיננטה (דרגה 4)')],
      answer: 1,
      why: L('C D E F G: G is the 5th note — the dominant, which pulls back to the tonic C.', `${H('C D E F G')}: ${H('G')} הוא הצליל החמישי — הדומיננטה, שמושכת חזרה לטוניקה ${H('C')}.`),
    },
  ],
  homework: [{ id: 'ht', kind: 'play', skill: 'p-ht-held', step: 2, text: L('Hands together “Ode to Joy”, twice a day, slowly.', '„האודה לשמחה” בשתי ידיים, פעמיים ביום, לאט.') }],
};

const lessonChordsCG7 = {
  id: 'p1-chords-c-g7',
  level: 1,
  minutes: 25,
  title: L('Your first chords: C and G7', `האקורדים הראשונים: ${H('C')} ו־${H('G7')}`),
  objective: L('Play C and G7 in the left hand and change between them under a melody.', `לנגן ${H('C')} ו־${H('G7')} ביד שמאל ולהחליף ביניהם מתחת למנגינה.`),
  skills: ['p-chord-c', 'p-chord-g7', 'p-v7-root', 'p-ode-chords'],
  steps: [
    {
      kind: 'explain',
      title: L('The C chord', `אקורד ${H('C')}`),
      keys: C_LH,
      text: L(
        'A chord is three or more notes played together. The C major chord is C (the ROOT, the chord’s name), E (its 3rd) and G (its 5th) — every other white key from C. In the left hand: fingers 5, 3, 1.',
        `אקורד הוא שלושה צלילים או יותר שמנגנים יחד. אקורד ${H('C')} מז׳ור הוא ${H('C')} (היסוד, שנותן לאקורד את שמו), ${H('E')} (הטרצה שלו) ו־${H('G')} (הקווינטה שלו) — כל לבן שני מ־${H('C')}. ביד שמאל: אצבעות 5, 3, 1.`
      ),
    },
    {
      kind: 'play',
      skill: 'p-chord-c',
      title: L('Play the C chord', `לנגן אקורד ${H('C')}`),
      notes: `${C_LH}_2 ${C_LH}_2 ${C_LH}_4`,
      text: L('Three times: all three keys down at the same moment, then lift together.', 'שלוש פעמים: שלושת הקלידים יורדים באותו רגע, ומשתחררים יחד.'),
    },
    {
      kind: 'explain',
      title: L('G7 — the chord that leads home', `${H('G7')} — האקורד שמוביל הביתה`),
      keys: G7_LH,
      text: L(
        `G7 is the DOMINANT 7th chord of C major: G (root), B (3rd), D (5th) and F (7th). Pianists play a short form in the left hand: B–F–G, fingers 5–2–1 (the D is left out). From the C chord the thumb stays on G, finger 2 moves down to F and the little finger down to B — the hand hardly moves.`,
        `${H('G7')} הוא אקורד הספטאקורד הדומיננטי של ${H('C')} מז׳ור: ${H('G')} (יסוד), ${H('B')} (טרצה), ${H('D')} (קווינטה) ו־${H('F')} (ספטימה). פסנתרנים מנגנים ביד שמאל צורה מקוצרת: ${H('B–F–G')}, אצבעות 5–2–1 (ה־${H('D')} מושמט). מאקורד ${H('C')} האגודל נשאר על ${H('G')}, אצבע 2 יורדת ל־${H('F')} והזרת ל־${H('B')} — היד כמעט לא זזה.`
      ),
    },
    {
      kind: 'play',
      skill: 'p-chord-g7',
      title: L('C – G7 – C', H('C – G7 – C')),
      notes: `${C_LH}_4 ${G7_LH}_4 ${C_LH}_4 ${G7_LH}_4 ${C_LH}_4`,
      text: L('Change between the two without looking — feel the thumb stay on G.', `החלף בין השניים בלי להסתכל — הרגש את האגודל נשאר על ${H('G')}.`),
    },
    {
      kind: 'quiz',
      skill: 'p-v7-root',
      title: L('Which is the root?', 'מהו היסוד?'),
      question: L('In the left-hand G7 shape B–F–G, which note is the ROOT?', `בצורת ${H('G7')} של יד שמאל ${H('B–F–G')}, איזה צליל הוא היסוד?`),
      options: [L('B', H('B')), L('F', H('F')), L('G', H('G'))],
      answer: 2,
      why: L('G7 = G B D F. Here G is on top; B is the 3rd, F the 7th.', `${H('G7')} = ${H('G B D F')}. כאן ${H('G')} למעלה; ${H('B')} הוא הטרצה, ${H('F')} הספטימה.`),
    },
    {
      kind: 'play',
      skill: 'p-ode-chords',
      title: L('“Ode to Joy” with chords', '„האודה לשמחה” עם אקורדים'),
      notes: `E4.3+${C_LH} E4.3 F4.4 G4.5 G4.5+${G7_LH} F4.4 E4.3 D4.2 C4.1+${C_LH} C4.1 D4.2 E4.3 E4.3+${G7_LH}_1.5 D4.2_0.5 D4.2_2`,
      text: L(
        'Now the left hand plays a chord on the first beat of each bar: C, G7, C, G7 — tonic, dominant, tonic, dominant. Hold each chord for the whole bar.',
        `עכשיו יד שמאל מנגנת אקורד בפעמה הראשונה של כל תיבה: ${H('C, G7, C, G7')} — טוניקה, דומיננטה, טוניקה, דומיננטה. החזק כל אקורד את כל התיבה.`
      ),
    },
    {
      kind: 'checklist',
      metronome: 66,
      title: L('In time', 'בזמן'),
      items: [
        L('Chords change exactly on beat 1.', 'האקורדים מתחלפים בדיוק בפעמה 1.'),
        L('The melody is a little louder than the chords.', 'המנגינה מעט חזקה מהאקורדים.'),
        L('Twice through without stopping.', 'פעמיים ברצף בלי לעצור.'),
      ],
    },
  ],
  homework: [
    { id: 'cg7', kind: 'play', skill: 'p-chord-g7', step: 3, text: L('C – G7 changes every day.', `החלפות ${H('C – G7')} כל יום.`) },
    { id: 'odec', kind: 'play', skill: 'p-ode-chords', step: 5, text: L('“Ode to Joy” with chords, twice a day.', '„האודה לשמחה” עם אקורדים, פעמיים ביום.') },
  ],
};

const JINGLE_RH = 'E4.3 E4.3 E4.3_2 E4.3 E4.3 E4.3_2 E4.3 G4.5 C4.1_1.5 D4.2_0.5 E4.3_4 F4.4 F4.4 F4.4_1.5 F4.4_0.5 F4.4 E4.3 E4.3 E4.3_0.5 E4.3_0.5 E4.3 D4.2 D4.2 E4.3 D4.2_2 G4.5_2';

const lessonChordF = {
  id: 'p1-chord-f',
  level: 1,
  minutes: 25,
  title: L('The third chord: F — and “Jingle Bells”', `האקורד השלישי: ${H('F')} — ו„ג׳ינגל בלז”`),
  objective: L('Play I, IV and V7 in C and accompany a whole song with them.', `לנגן ${H('I')}, ${H('IV')} ו־${H('V7')} ב־${H('C')} וללוות איתם שיר שלם.`),
  skills: ['p-chord-f', 'p-primary', 'p-jingle'],
  steps: [
    {
      kind: 'explain',
      title: L('The F chord, the near way', `אקורד ${H('F')}, בדרך הקרובה`),
      keys: F_LH,
      text: L(
        `F major is F (root), A (3rd), C (5th). In the left hand we play it as C–F–A, fingers 5–2–1: the little finger STAYS on C, finger 2 moves up to F, the thumb to A. Same notes, the 5th at the bottom (a 2nd inversion) — so the hand barely moves from the C chord.`,
        `${H('F')} מז׳ור הוא ${H('F')} (יסוד), ${H('A')} (טרצה), ${H('C')} (קווינטה). ביד שמאל מנגנים אותו כ־${H('C–F–A')}, אצבעות 5–2–1: הזרת נשארת על ${H('C')}, אצבע 2 עולה ל־${H('F')}, האגודל ל־${H('A')}. אותם צלילים, הקווינטה למטה (היפוך שני) — ולכן היד כמעט לא זזה מאקורד ${H('C')}.`
      ),
    },
    {
      kind: 'play',
      skill: 'p-chord-f',
      title: L('I – IV – I – V7 – I', H('I – IV – I – V7 – I')),
      notes: `${C_LH}_4 ${F_LH}_4 ${C_LH}_4 ${G7_LH}_4 ${C_LH}_4`,
      text: L('C, F, C, G7, C — the progression under countless songs.', `${H('C, F, C, G7, C')} — המהלך שמתחת לאינספור שירים.`),
    },
    {
      kind: 'quiz',
      skill: 'p-primary',
      title: L('The three primary chords', 'שלושת האקורדים הראשיים'),
      question: L('In C major, which chord is the SUBDOMINANT (IV)?', `ב־${H('C')} מז׳ור, איזה אקורד הוא הסאבדומיננטה (${H('IV')})?`),
      options: [L('C', H('C')), L('F', H('F')), L('G7', H('G7'))],
      answer: 1,
      why: L('Built on the 4th note of the scale (C D E F): F. C is the tonic (I), G7 the dominant (V7).', `נבנה על הצליל הרביעי בסולם (${H('C D E F')}): ${H('F')}. ${H('C')} הוא הטוניקה (${H('I')}), ${H('G7')} הדומיננטה (${H('V7')}).`),
    },
    {
      kind: 'play',
      skill: 'p-jingle',
      title: L('“Jingle Bells”, right hand', '„ג׳ינגל בלז”, יד ימין'),
      notes: JINGLE_RH,
      text: L(
        'The chorus of “Jingle Bells” (J. L. Pierpont, 1857) fits C position: start on E with finger 3. Watch the jump from G (5) down to C (1) in the third bar.',
        `הפזמון של „ג׳ינגל בלז” (ג׳. ל. פירפונט, 1857) נכנס לתנוחת ${H('C')}: מתחילים ב־${H('E')} עם אצבע 3. שים לב לקפיצה מ־${H('G')} (5) ל־${H('C')} (1) בתיבה השלישית.`
      ),
    },
    {
      kind: 'play',
      title: L('Hands together', 'שתי ידיים'),
      notes: `E4.3+${C_LH} E4.3 E4.3_2 E4.3+${C_LH} E4.3 E4.3_2 E4.3+${C_LH} G4.5 C4.1_1.5 D4.2_0.5 E4.3+${C_LH}_4 F4.4+${F_LH} F4.4 F4.4_1.5 F4.4_0.5 F4.4+${C_LH} E4.3 E4.3 E4.3_0.5 E4.3_0.5 E4.3+${G7_LH} D4.2 D4.2 E4.3 D4.2+${G7_LH}_2 G4.5_2`,
      text: L(
        'A chord on beat 1 of every bar: C C C C | F C | G7 G7. The melody note and the chord start together.',
        `אקורד בפעמה 1 של כל תיבה: ${H('C C C C | F C | G7 G7')}. צליל המנגינה והאקורד מתחילים יחד.`
      ),
    },
    {
      kind: 'checklist',
      metronome: 80,
      title: L('Up to speed', 'לקצב'),
      items: [
        L('At 60 first, then 80.', 'קודם ב־60, אחר כך ב־80.'),
        L('No pause before a chord change — the left hand moves early.', 'אין עצירה לפני החלפת אקורד — יד שמאל זזה מוקדם.'),
        L('Twice through, then sing along.', 'פעמיים ברצף, ואז גם לשיר.'),
      ],
    },
  ],
  homework: [{ id: 'jingle', kind: 'play', skill: 'p-jingle', step: 3, text: L('“Jingle Bells” every day — right hand, then with chords.', '„ג׳ינגל בלז” כל יום — יד ימין, ואז עם אקורדים.') }],
};

const lessonScaleC = {
  id: 'p2-scale-c',
  level: 2,
  minutes: 25,
  title: L('The C major scale: thumb under', `סולם ${H('C')} מז׳ור: אגודל מתחת`),
  objective: L('Play C major one octave in each hand with the standard fingering.', `לנגן ${H('C')} מז׳ור אוקטבה אחת בכל יד באצבוע המקובל.`),
  skills: ['p-scale-c-rh', 'p-scale-c-lh', 'p-thumb-under'],
  steps: [
    {
      kind: 'explain',
      title: L('Eight notes, five fingers', 'שמונה צלילים, חמש אצבעות'),
      keys: 'C4.1 D4.2 E4.3 F4.1 G4.2 A4.3 B4.4 C5.5',
      text: L(
        'A scale runs C to C — eight notes — but you have five fingers, so the THUMB PASSES UNDER. Right hand going up: 1 2 3, then the thumb slips under the hand to F, then 2 3 4 5 to the top C. Coming down: 5 4 3 2 1, then finger 3 crosses OVER the thumb to E, then 2 1.',
        `סולם עובר מ־${H('C')} ל־${H('C')} — שמונה צלילים — אבל יש חמש אצבעות, ולכן האגודל עובר מתחת. יד ימין בעלייה: 1 2 3, ואז האגודל מחליק מתחת ליד אל ${H('F')}, ואז 2 3 4 5 עד ה־${H('C')} העליון. בירידה: 5 4 3 2 1, ואז אצבע 3 עוברת מעל האגודל אל ${H('E')}, ואז 2 1.`
      ),
    },
    {
      kind: 'play',
      skill: 'p-scale-c-rh',
      title: L('Right hand, up and down', 'יד ימין, למעלה ולמטה'),
      notes: 'C4.1 D4.2 E4.3 F4.1 G4.2 A4.3 B4.4 C5.5 B4.4 A4.3 G4.2 F4.1 E4.3 D4.2 C4.1',
      text: L('While finger 3 plays E, the thumb is already moving under toward F.', `בזמן שאצבע 3 מנגנת ${H('E')}, האגודל כבר נע מתחת לכיוון ${H('F')}.`),
    },
    {
      kind: 'quiz',
      skill: 'p-thumb-under',
      title: L('The crossing', 'המעבר'),
      question: L('Right hand going UP: on which note does the thumb pass under?', 'יד ימין בעלייה: על איזה צליל האגודל עובר מתחת?'),
      options: [L('E', H('E')), L('F', H('F')), L('G', H('G'))],
      answer: 1,
      why: L('C D E with 1 2 3, then the thumb on F; G A B C with 2 3 4 5.', `${H('C D E')} עם 1 2 3, ואז אגודל על ${H('F')}; ${H('G A B C')} עם 2 3 4 5.`),
    },
    {
      kind: 'play',
      skill: 'p-scale-c-lh',
      hand: 'L',
      title: L('Left hand, up and down', 'יד שמאל, למעלה ולמטה'),
      notes: 'C3.5 D3.4 E3.3 F3.2 G3.1 A3.3 B3.2 C4.1 B3.2 A3.3 G3.1 F3.2 E3.3 D3.4 C3.5',
      text: L(
        'The left hand is the mirror: up 5 4 3 2 1, then finger 3 crosses OVER the thumb to A, then 2 1. Down: 1 2 3, the thumb passes UNDER to G, then 2 3 4 5.',
        `יד שמאל היא תמונת מראה: בעלייה 5 4 3 2 1, ואז אצבע 3 עוברת מעל האגודל אל ${H('A')}, ואז 2 1. בירידה: 1 2 3, האגודל עובר מתחת אל ${H('G')}, ואז 2 3 4 5.`
      ),
    },
    {
      kind: 'checklist',
      metronome: 60,
      title: L('Even, like a string of pearls', 'אחיד, כמו מחרוזת פנינים'),
      items: [
        L('One note per click; no bump or pause on the thumb note.', 'צליל אחד בכל קליק; בלי קפיצה או עצירה על צליל האגודל.'),
        L('The wrist stays level and moves smoothly sideways.', 'שורש כף היד נשאר ישר ונע בעדינות הצידה.'),
        L('Each hand separately twice, then at 72.', 'כל יד לחוד פעמיים, ואז ב־72.'),
      ],
    },
    {
      kind: 'explain',
      title: L('The scale’s degrees', 'הדרגות של הסולם'),
      keys: 'C4 F4 G4',
      text: L(
        'Each note of the scale has a number, its DEGREE: C is 1 (the tonic), F is 4 (the subdominant), G is 5 (the dominant). The three chords you already know — C, F, G7 — are built on exactly these three degrees: I, IV and V.',
        `לכל צליל בסולם יש מספר, הדרגה שלו: ${H('C')} הוא 1 (הטוניקה), ${H('F')} הוא 4 (הסאבדומיננטה), ${H('G')} הוא 5 (הדומיננטה). שלושת האקורדים שכבר אתה מכיר — ${H('C, F, G7')} — בנויים בדיוק על שלוש הדרגות האלה: ${H('I')}, ${H('IV')} ו־${H('V')}.`
      ),
    },
  ],
  homework: [
    { id: 'crh', kind: 'play', skill: 'p-scale-c-rh', step: 1, text: L('C major, right hand, every day.', `${H('C')} מז׳ור, יד ימין, כל יום.`) },
    { id: 'clh', kind: 'play', skill: 'p-scale-c-lh', step: 3, text: L('C major, left hand, every day.', `${H('C')} מז׳ור, יד שמאל, כל יום.`) },
  ],
};

const lessonScaleG = {
  id: 'p2-scale-g',
  level: 2,
  minutes: 20,
  title: L('G major: the first sharp', `${H('G')} מז׳ור: הדיאז הראשון`),
  objective: L('Play G major one octave in each hand and know its key signature.', `לנגן ${H('G')} מז׳ור אוקטבה אחת בכל יד ולהכיר את סימני ההיתק שלו.`),
  skills: ['p-scale-g-rh', 'p-scale-g-lh', 'p-key-g'],
  steps: [
    {
      kind: 'staff',
      title: L('Why F♯?', `למה ${H('F♯')}?`),
      staff: { clef: 'treble', notes: 'G4 A4 B4 C5 D5 E5 F#5 G5' },
      text: L(
        'Every major scale has the same pattern of steps: tone, tone, semitone, tone, tone, tone, semitone. Starting on G, the 7th note must be a semitone below the top G — so it is F♯, the black key. The KEY SIGNATURE shows it once at the start of every line: a sharp on the F line.',
        `לכל סולם מז׳ור אותה תבנית צעדים: טון, טון, חצי טון, טון, טון, טון, חצי טון. כשמתחילים ב־${H('G')}, הצליל השביעי חייב להיות חצי טון מתחת ל־${H('G')} העליון — ולכן הוא ${H('F♯')}, הקליד השחור. סימני ההיתק מראים אותו פעם אחת בתחילת כל שורה: דיאז על קו ה־${H('F')}.`
      ),
    },
    {
      kind: 'quiz',
      skill: 'p-key-g',
      title: L('The sharp', 'הדיאז'),
      question: L('Which note is sharp in G major?', `איזה צליל מסומן בדיאז ב־${H('G')} מז׳ור?`),
      options: [L('C', H('C')), L('F', H('F')), L('B', H('B'))],
      answer: 1,
      why: L('G A B C D E F♯ G — F♯ is the 7th degree, the leading note that pulls up to G.', `${H('G A B C D E F♯ G')} — ${H('F♯')} הוא הדרגה השביעית, הצליל המוביל שמושך למעלה ל־${H('G')}.`),
    },
    {
      kind: 'play',
      skill: 'p-scale-g-rh',
      title: L('Right hand', 'יד ימין'),
      notes: 'G4.1 A4.2 B4.3 C5.1 D5.2 E5.3 F#5.4 G5.5 F#5.4 E5.3 D5.2 C5.1 B4.3 A4.2 G4.1',
      text: L('The same fingering as C major: 1 2 3, thumb under to C, 2 3 4 5. Finger 4 plays the black F♯ — reach in a little.', `אותו אצבוע כמו ${H('C')} מז׳ור: 1 2 3, אגודל מתחת אל ${H('C')}, 2 3 4 5. אצבע 4 מנגנת את ה־${H('F♯')} השחור — היכנס מעט פנימה.`),
    },
    {
      kind: 'play',
      skill: 'p-scale-g-lh',
      title: L('Left hand', 'יד שמאל'),
      notes: 'G2.5 A2.4 B2.3 C3.2 D3.1 E3.3 F#3.2 G3.1 F#3.2 E3.3 D3.1 C3.2 B2.3 A2.4 G2.5',
      text: L('Also like C: 5 4 3 2 1, finger 3 over to E, 2 on F♯, 1 on G.', `גם כמו ${H('C')}: 5 4 3 2 1, אצבע 3 מעל אל ${H('E')}, 2 על ${H('F♯')}, 1 על ${H('G')}.`),
    },
    {
      kind: 'explain',
      title: L('The chords of G major', `האקורדים של ${H('G')} מז׳ור`),
      keys: 'G3+B3+D4 C4+E4+G4 D4+F#4+A4',
      text: L(
        'The same degrees give the primary chords in G: G (I, tonic), C (IV, subdominant), D or D7 (V, dominant). A song you can play in C can be moved to G with these three.',
        `אותן דרגות נותנות את האקורדים הראשיים ב־${H('G')}: ${H('G')} (${H('I')}, טוניקה), ${H('C')} (${H('IV')}, סאבדומיננטה), ${H('D')} או ${H('D7')} (${H('V')}, דומיננטה). שיר שאתה מנגן ב־${H('C')} אפשר להעביר ל־${H('G')} עם שלושת אלה.`
      ),
    },
    {
      kind: 'checklist',
      metronome: 66,
      title: L('Hands separately, in time', 'כל יד לחוד, בזמן'),
      items: [
        L('Right hand twice at 66.', 'יד ימין פעמיים ב־66.'),
        L('Left hand twice at 66.', 'יד שמאל פעמיים ב־66.'),
        L('You think “F sharp” before you reach it.', 'חושבים ״פה דיאז״ לפני שמגיעים אליו.'),
      ],
    },
  ],
  homework: [{ id: 'g', kind: 'play', skill: 'p-scale-g-rh', step: 2, text: L('G major, each hand, every day.', `${H('G')} מז׳ור, כל יד, כל יום.`) }],
};

const lessonTriads = {
  id: 'p2-triads',
  level: 2,
  minutes: 25,
  title: L('Triads, inversions and the four chords', 'משולשים, היפוכים וארבעת האקורדים'),
  objective: L('Play a triad in all its positions and move between chords with the least movement.', 'לנגן משולש בכל התנוחות שלו ולעבור בין אקורדים בתנועה הקטנה ביותר.'),
  skills: ['p-inversions', 'p-inv-names', 'p-four-chords'],
  steps: [
    {
      kind: 'explain',
      title: L('Same notes, another note at the bottom', 'אותם צלילים, צליל אחר למטה'),
      keys: 'C4.1+E4.3+G4.5',
      text: L(
        `A TRIAD is a root, a 3rd and a 5th. C–E–G is ROOT POSITION (the root at the bottom). Move the C up an octave and you get E–G–C, the 1st INVERSION (the 3rd at the bottom). Move the E up and you get G–C–E, the 2nd INVERSION (the 5th at the bottom). It is still a C chord each time. Right-hand fingers: 1-3-5, 1-2-5, 1-3-5.`,
        `משולש הוא יסוד, טרצה וקווינטה. ${H('C–E–G')} הוא מצב יסודי (היסוד למטה). מעבירים את ה־${H('C')} אוקטבה למעלה ומקבלים ${H('E–G–C')}, ההיפוך הראשון (הטרצה למטה). מעבירים את ה־${H('E')} למעלה ומקבלים ${H('G–C–E')}, ההיפוך השני (הקווינטה למטה). בכל פעם זה עדיין אקורד ${H('C')}. אצבעות יד ימין: 1-3-5, 1-2-5, 1-3-5.`
      ),
    },
    {
      kind: 'play',
      skill: 'p-inversions',
      title: L('Climb and come back', 'לטפס ולחזור'),
      notes: 'C4.1+E4.3+G4.5 E4.1+G4.2+C5.5 G4.1+C5.3+E5.5 E4.1+G4.2+C5.5 C4.1+E4.3+G4.5',
      text: L('Root position, 1st, 2nd, 1st, root. Listen: it stays C, only the colour changes.', `מצב יסודי, ראשון, שני, ראשון, יסודי. הקשב: זה נשאר ${H('C')}, רק הצבע משתנה.`),
    },
    {
      kind: 'quiz',
      skill: 'p-inv-names',
      title: L('Which position?', 'איזו תנוחה?'),
      question: L('G–C–E is a C chord in…', `${H('G–C–E')} הוא אקורד ${H('C')} ב…`),
      options: [L('root position', 'מצב יסודי'), L('1st inversion', 'היפוך ראשון'), L('2nd inversion', 'היפוך שני')],
      answer: 2,
      why: L('The lowest note is G, the chord’s 5th → 2nd inversion.', `הצליל הנמוך הוא ${H('G')}, הקווינטה של האקורד ← היפוך שני.`),
    },
    {
      kind: 'explain',
      title: L('The four chords of pop', 'ארבעת האקורדים של הפופ'),
      split: 55,
      keys: 'C4+E4+G4 B3+D4+G4 A3+C4+E4 A3+C4+F4',
      text: L(
        `C – G – Am – F (I – V – vi – IV) is under hundreds of songs: tonic C, dominant G, A minor (vi, the relative minor) and subdominant F. Played in root position the hand jumps; with inversions it barely moves: C (C E G) → G (B D G) → Am (A C E) → F (A C F). Common notes stay, the others step to the nearest note.`,
        `${H('C – G – Am – F')} (${H('I – V – vi – IV')}) נמצא מתחת למאות שירים: הטוניקה ${H('C')}, הדומיננטה ${H('G')}, ${H('A')} מינור (${H('vi')}, המינור המקביל) והסאבדומיננטה ${H('F')}. במצב יסודי היד קופצת; עם היפוכים היא כמעט לא זזה: ${H('C')} (${H('C E G')}) ← ${H('G')} (${H('B D G')}) ← ${H('Am')} (${H('A C E')}) ← ${H('F')} (${H('A C F')}). צלילים משותפים נשארים, האחרים זזים לצליל הקרוב.`
      ),
    },
    {
      kind: 'play',
      title: L('Right hand alone', 'יד ימין לבד'),
      split: 55,
      notes: 'C4.1+E4.3+G4.5_4 B3.1+D4.2+G4.5_4 A3.1+C4.2+E4.4_4 A3.1+C4.2+F4.5_4',
      text: L('Four chords, four beats each. Feel which fingers stay and which move.', 'ארבעה אקורדים, ארבע פעמות כל אחד. הרגש אילו אצבעות נשארות ואילו זזות.'),
    },
    {
      kind: 'play',
      skill: 'p-four-chords',
      split: 55,
      title: L('With the bass', 'עם הבס'),
      notes: 'C4.1+E4.3+G4.5+C3_4 B3.1+D4.2+G4.5+G2_4 A3.1+C4.2+E4.4+A2_4 A3.1+C4.2+F4.5+F2_4',
      text: L(
        'The left hand plays each chord’s ROOT, low: C, G, A, F. Now the chord’s name is in the bass even when the right hand plays an inversion.',
        `יד שמאל מנגנת את היסוד של כל אקורד, נמוך: ${H('C, G, A, F')}. עכשיו שם האקורד נמצא בבס גם כשיד ימין מנגנת היפוך.`
      ),
    },
    {
      kind: 'checklist',
      metronome: 70,
      title: L('Loop it', 'בלולאה'),
      items: [
        L('Four times round, 4 beats per chord.', 'ארבעה סיבובים, 4 פעמות לאקורד.'),
        L('Then 2 beats per chord.', 'אחר כך 2 פעמות לאקורד.'),
        L('Then the right hand plays the chord on every beat (1 2 3 4).', 'אחר כך יד ימין מנגנת את האקורד בכל פעמה (1 2 3 4).'),
      ],
    },
  ],
  homework: [{ id: 'four', kind: 'play', skill: 'p-four-chords', step: 5, text: L('The four chords with the bass, every day.', 'ארבעת האקורדים עם הבס, כל יום.') }],
};

const lessonMinor = {
  id: 'p2-minor',
  level: 2,
  minutes: 25,
  title: L('Minor: A minor', `מינור: ${H('A')} מינור`),
  objective: L('Hear minor from major, play A minor and its three main chords.', `לשמוע מינור ממז׳ור, לנגן ${H('A')} מינור ואת שלושת האקורדים הראשיים שלו.`),
  skills: ['p-minor-ear', 'p-a-minor', 'p-minor-chords'],
  steps: [
    {
      kind: 'quiz',
      skill: 'p-minor-ear',
      title: L('Listen first', 'קודם מקשיבים'),
      listen: 'C4+E4+G4_2 C4+Eb4+G4_2',
      question: L('Two chords play. Which one is MINOR?', 'מתנגנים שני אקורדים. איזה מהם מינור?'),
      options: [L('The first', 'הראשון'), L('The second', 'השני')],
      answer: 1,
      why: L(
        'The second has E♭: its 3rd is a MINOR 3rd (3 semitones above the root) — darker. The first, with E (4 semitones), is major.',
        `בשני יש ${H('E♭')}: הטרצה שלו היא טרצה קטנה (3 חצאי טונים מעל היסוד) — כהה יותר. הראשון, עם ${H('E')} (4 חצאי טונים), מז׳ור.`
      ),
    },
    {
      kind: 'play',
      title: L('A minor five-finger position', `${H('A')} מינור, חמש אצבעות`),
      notes: 'A4.1 B4.2 C5.3 D5.4 E5.5 D5.4 C5.3 B4.2 A4.1',
      text: L(
        'All white keys from A: A B C D E. The step from B to C is a semitone, so the 3rd (C) is minor. Right hand, fingers 1–5.',
        `כל הלבנים מ־${H('A')}: ${H('A B C D E')}. הצעד מ־${H('B')} ל־${H('C')} הוא חצי טון, ולכן הטרצה (${H('C')}) קטנה — מינור. יד ימין, אצבעות 1–5.`
      ),
    },
    {
      kind: 'play',
      skill: 'p-a-minor',
      title: L('The A minor scale', `סולם ${H('A')} מינור`),
      notes: 'A4.1 B4.2 C5.3 D5.1 E5.2 F5.3 G5.4 A5.5 G5.4 F5.3 E5.2 D5.1 C5.3 B4.2 A4.1',
      text: L(
        'A minor uses the same white keys as C major, from A to A — it is C major’s RELATIVE minor. Fingering like C: 1 2 3, thumb under to D, 2 3 4 5.',
        `${H('A')} מינור משתמש באותם לבנים כמו ${H('C')} מז׳ור, מ־${H('A')} עד ${H('A')} — הוא המינור המקביל של ${H('C')} מז׳ור. אצבוע כמו ב־${H('C')}: 1 2 3, אגודל מתחת אל ${H('D')}, 2 3 4 5.`
      ),
    },
    {
      kind: 'explain',
      title: L('i – iv – V in A minor', `${H('i – iv – V')} ב־${H('A')} מינור`),
      keys: 'A2.5+C3.3+E3.1',
      text: L(
        `The main chords in A minor: Am (i, A C E), Dm (iv, D F A) and E (V, E G♯ B). The V chord is MAJOR: its 3rd is G♯, the raised 7th degree — the LEADING NOTE a semitone under A that pulls home. Left hand: Am = A–C–E (5-3-1), Dm = A–D–F (5-2-1), E = G♯–B–E (5-3-1).`,
        `האקורדים הראשיים ב־${H('A')} מינור: ${H('Am')} (${H('i')}, ${H('A C E')}), ${H('Dm')} (${H('iv')}, ${H('D F A')}) ו־${H('E')} (${H('V')}, ${H('E G♯ B')}). אקורד ה־${H('V')} הוא מז׳ור: הטרצה שלו היא ${H('G♯')}, הדרגה השביעית המוגבהת — הצליל המוביל, חצי טון מתחת ל־${H('A')}, שמושך הביתה. יד שמאל: ${H('Am')} = ${H('A–C–E')} (5-3-1), ${H('Dm')} = ${H('A–D–F')} (5-2-1), ${H('E')} = ${H('G♯–B–E')} (5-3-1).`
      ),
    },
    {
      kind: 'play',
      skill: 'p-minor-chords',
      title: L('Am – Dm – Am – E – Am', H('Am – Dm – Am – E – Am')),
      notes: 'A2.5+C3.3+E3.1_4 A2.5+D3.2+F3.1_4 A2.5+C3.3+E3.1_4 G#2.5+B2.3+E3.1_4 A2.5+C3.3+E3.1_4',
      text: L('The little finger stays on A for Am and Dm, and moves down a semitone to G♯ for E.', `הזרת נשארת על ${H('A')} ב־${H('Am')} וב־${H('Dm')}, ויורדת חצי טון ל־${H('G♯')} ב־${H('E')}.`),
    },
    {
      kind: 'quiz',
      title: L('The black key', 'הקליד השחור'),
      question: L('Why does the E chord in A minor use G♯ and not G?', `למה אקורד ${H('E')} ב־${H('A')} מינור משתמש ב־${H('G♯')} ולא ב־${H('G')}?`),
      options: [
        L('To make V major, with a leading note that pulls to A', `כדי שה־${H('V')} יהיה מז׳ור, עם צליל מוביל שמושך ל־${H('A')}`),
        L('Because A minor has one sharp in its key signature', `כי ל־${H('A')} מינור יש דיאז אחד בסימני ההיתק`),
        L('It is a mistake in the book', 'זו טעות בספר'),
      ],
      answer: 0,
      why: L('A minor’s key signature has no sharps; the G♯ is added in the music to make the dominant major (harmonic minor).', `בסימני ההיתק של ${H('A')} מינור אין דיאזים; ה־${H('G♯')} מתווסף בתווים כדי שהדומיננטה תהיה מז׳ור (מינור הרמוני).`),
    },
  ],
  homework: [{ id: 'am', kind: 'play', skill: 'p-minor-chords', step: 4, text: L('A minor scale and Am–Dm–E chords, every day.', `סולם ${H('A')} מינור ואקורדי ${H('Am–Dm–E')}, כל יום.`) }],
};

const lessonAccompaniment = {
  id: 'p2-accompaniment',
  level: 2,
  minutes: 25,
  title: L('Accompaniment: broken chords and dynamics', 'ליווי: אקורדים שבורים ודינמיקה'),
  objective: L('Accompany a melody with a moving left hand, the melody louder than the bass.', 'ללוות מנגינה ביד שמאל נעה, כשהמנגינה חזקה מהבס.'),
  skills: ['p-broken', 'p-dynamics', 'p-ode-broken'],
  steps: [
    {
      kind: 'explain',
      title: L('Break the chord', 'לשבור את האקורד'),
      keys: 'C3.5 G3.1 E3.3 G3.1',
      text: L(
        'Instead of holding a block chord, the left hand can play its notes one at a time: root – 5th – 3rd – 5th (C G E G). This BROKEN CHORD keeps the music moving; played fast it is the famous ALBERTI BASS of Mozart’s sonatas.',
        `במקום להחזיק אקורד שלם, יד שמאל יכולה לנגן את הצלילים שלו אחד אחד: יסוד – קווינטה – טרצה – קווינטה (${H('C G E G')}). האקורד השבור הזה שומר על תנועה במוזיקה; כשמנגנים אותו מהר זה „בס אלברטי” המפורסם מהסונטות של מוצרט.`
      ),
    },
    {
      kind: 'play',
      skill: 'p-broken',
      title: L('C – G7 – C, broken', H('C – G7 – C')),
      notes: 'C3.5 G3.1 E3.3 G3.1 B2.5 G3.1 F3.2 G3.1 C3.5 G3.1 E3.3 G3.1 C3.5_4',
      text: L('C: C G E G. G7: B G F G — the thumb stays on G throughout. Even and quiet.', `${H('C')}: ${H('C G E G')}. ${H('G7')}: ${H('B G F G')} — האגודל נשאר על ${H('G')} כל הזמן. אחיד ושקט.`),
    },
    {
      kind: 'explain',
      title: L('Loud and soft, smooth and short', 'חזק וחלש, מחובר וקצר'),
      text: L(
        'DYNAMICS tell how loud: p (piano) = soft, mf (mezzo forte) = medium loud, f (forte) = loud. TOUCH tells how notes connect: LEGATO = smooth, each key let go exactly as the next goes down; STACCATO (a dot over the note) = short and detached. The accompaniment is played softer than the melody, so the tune “sings” on top.',
        'דינמיקה אומרת כמה חזק: ⁦p⁩ (פיאנו) = חלש, ⁦mf⁩ (מצו־פורטה) = בינוני־חזק, ⁦f⁩ (פורטה) = חזק. המגע אומר איך הצלילים מתחברים: לגאטו = מחובר, כל קליד משתחרר בדיוק כשהבא יורד; סטקאטו (נקודה מעל התו) = קצר ומנותק. את הליווי מנגנים חלש מהמנגינה, כדי שהמנגינה „תשיר” מעליו.'
      ),
    },
    {
      kind: 'quiz',
      skill: 'p-dynamics',
      title: L('Signs', 'סימנים'),
      question: L('The sign “f” under the music means…', 'הסימן ״⁦f⁩״ מתחת לתווים פירושו…'),
      options: [L('soft', 'חלש'), L('loud', 'חזק'), L('short notes', 'צלילים קצרים')],
      answer: 1,
      why: L('f = forte, loud; p = piano, soft. Short notes are marked with dots (staccato).', '⁦f⁩ = פורטה, חזק; ⁦p⁩ = פיאנו, חלש. צלילים קצרים מסומנים בנקודות (סטקאטו).'),
    },
    {
      kind: 'play',
      skill: 'p-ode-broken',
      title: L('“Ode to Joy” over a moving bass', '„האודה לשמחה” מעל בס נע'),
      notes:
        'E4.3+C3.5 E4.3+G3.1 F4.4+E3.3 G4.5+G3.1 G4.5+B2.5 F4.4+G3.1 E4.3+F3.2 D4.2+G3.1 C4.1+C3.5 C4.1+G3.1 D4.2+E3.3 E4.3+G3.1 D4.2+B2.5 C4.1+G3.1 C4.1+C3.5_2',
      text: L(
        'Each melody note now has a left-hand partner: the broken chords C, G7, C, G7–C, one note per beat. Melody mf, bass p.',
        `לכל צליל במנגינה יש עכשיו בן זוג ביד שמאל: האקורדים השבורים ${H('C, G7, C, G7–C')}, צליל אחד בכל פעמה. המנגינה ⁦mf⁩, הבס ⁦p⁩.`
      ),
    },
    {
      kind: 'checklist',
      metronome: 60,
      title: L('Make it music', 'להפוך את זה למוזיקה'),
      items: [
        L('The melody is clearly louder than the bass.', 'המנגינה חזקה בבירור מהבס.'),
        L('The right hand is legato — no gaps between the notes.', 'יד ימין לגאטו — בלי רווחים בין הצלילים.'),
        L('At 60, then 76, without stopping.', 'ב־60, ואז ב־76, בלי לעצור.'),
      ],
    },
  ],
  homework: [{ id: 'oded', kind: 'play', skill: 'p-ode-broken', step: 4, text: L('“Ode to Joy” with the broken-chord bass, every day.', '„האודה לשמחה” עם בס באקורדים שבורים, כל יום.') }],
};

export const PIANO_LESSONS = [
  lessonKeyboard,
  lessonCPosition,
  lessonRhythm,
  lessonReading,
  lessonHandsTogether,
  lessonChordsCG7,
  lessonChordF,
  lessonScaleC,
  lessonScaleG,
  lessonTriads,
  lessonMinor,
  lessonAccompaniment,
];
export const pianoLessonById = (id) => PIANO_LESSONS.find((l) => l.id === id);
