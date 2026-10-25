// The guitar teacher's curriculum (Teacher, 2026-10-25).
//
// SKILLS = the map of what a student can do, by domain and level (levels
// follow the RSL Rockschool grades: 0 = before Debut, 1 = Debut, 2 = Grade 1,
// 3 = Grade 2 …). Each skill says how it is MEASURED (`check`) so the
// teacher marks it mastered only from evidence, never from a tap.
// LESSONS = the ordered path; a lesson teaches one objective in the steps a
// private teacher uses (review -> new material -> guided practice -> use in
// music -> homework). Lessons without `steps` are planned, not yet written.
//
// Method notes (sources in the plan doc "המורה של DudeStar — תכנון"):
//   • First chords D and A, then E: open shapes taught as whole-hand shapes,
//     checked string by string ("chord perfect"), then changed in the
//     one-minute-changes format; 30 changes/min = ready to move on
//     (JustinGuitar beginner course, Grade 1).
//   • Accuracy before speed; tempo up 4–5 % only after clean repetitions.
//   • Hear it before you play it (Suzuki / Kodály / Gordon): every new shape
//     is first played to the student.
//
// Text is inline {en, he}. Hebrew uses ⁦…⁩ around Latin chord names so
// the bidi algorithm keeps them in place.

const L = (en, he) => ({ en, he });
const H = (s) => `⁦${s}⁩`; // isolate a Latin token inside Hebrew

export const DOMAINS = [
  { key: 'fretting', title: L('Fretting hand', 'יד שמאל') },
  { key: 'picking', title: L('Picking hand', 'יד ימין') },
  { key: 'rhythm', title: L('Rhythm & timing', 'קצב ותזמון') },
  { key: 'lead', title: L('Scales & lead', 'סולמות וסולו') },
  { key: 'fretboard', title: L('Fretboard & harmony', 'הצוואר וההרמוניה') },
  { key: 'ear', title: L('Ear', 'שמיעה') },
  { key: 'reading', title: L('Reading', 'קריאה') },
  { key: 'repertoire', title: L('Songs', 'שירים') },
];

export const LEVELS = [
  { n: 0, grade: 'Pre-Debut', title: L('First steps', 'צעדים ראשונים') },
  { n: 1, grade: 'Debut', title: L('First chords and songs', 'אקורדים ושירים ראשונים') },
  { n: 2, grade: 'Grade 1', title: L('All open chords, first scale', 'כל האקורדים הפתוחים, סולם ראשון') },
  { n: 3, grade: 'Grade 2', title: L('Barre chords and the blues', 'אקורדי ברה ובלוז') },
];

// Standard-tuning open shapes (low E first; null = not played).
export const SHAPES = {
  D: { root: 2, type: 'major', frets: [null, null, 0, 2, 3, 2] },
  A: { root: 9, type: 'major', frets: [null, 0, 2, 2, 2, 0] },
  E: { root: 4, type: 'major', frets: [0, 2, 2, 1, 0, 0] },
  Am: { root: 9, type: 'minor', frets: [null, 0, 2, 2, 1, 0] },
  Em: { root: 4, type: 'minor', frets: [0, 2, 2, 0, 0, 0] },
  Dm: { root: 2, type: 'minor', frets: [null, null, 0, 2, 3, 1] },
  G: { root: 7, type: 'major', frets: [3, 2, 0, 0, 0, 3] },
  C: { root: 0, type: 'major', frets: [null, 3, 2, 0, 1, 0] },
};
// Fingers per string for the shapes above (low E first; 0 = open / none).
export const FINGERS = {
  D: [0, 0, 0, 1, 3, 2],
  A: [0, 0, 1, 2, 3, 0],
  E: [0, 2, 3, 1, 0, 0],
};

// ---------------------------------------------------------------------------
// Skills. check = how mastery is shown:
//   {kind:'chord', chord}                   mic hears the shape (twice, 0.5 s apart)
//   {kind:'changes', pair:[a,b], min}       one-minute changes on the pair >= min
//   {kind:'quiz', id}                       the lesson's quiz answered right
//   {kind:'self'}                           a checklist the student confirms (never alone)
// ---------------------------------------------------------------------------

export const SKILLS = [
  { id: 'tuning', domain: 'fretting', level: 0, title: L('Tune the guitar with a tuner', 'לכוון את הגיטרה בטיונר'), check: { kind: 'self' } },
  { id: 'posture', domain: 'fretting', level: 0, title: L('Sitting position and hand shape', 'ישיבה ותנוחת יד'), check: { kind: 'self' } },
  { id: 'strings', domain: 'fretboard', level: 0, title: L('String names and numbers', 'שמות ומספרי המיתרים'), check: { kind: 'quiz', id: 'strings' } },
  { id: 'chord-D', domain: 'fretting', level: 1, after: ['posture'], title: L('D chord', `אקורד ${H('D')}`), check: { kind: 'chord', chord: 'D' } },
  { id: 'chord-A', domain: 'fretting', level: 1, after: ['posture'], title: L('A chord', `אקורד ${H('A')}`), check: { kind: 'chord', chord: 'A' } },
  { id: 'chord-E', domain: 'fretting', level: 1, after: ['posture'], title: L('E chord', `אקורד ${H('E')}`), check: { kind: 'chord', chord: 'E' } },
  { id: 'changes-AD', domain: 'fretting', level: 1, after: ['chord-D', 'chord-A'], title: L('A–D changes, 30 a minute', `החלפות ${H('A–D')}, 30 בדקה`), check: { kind: 'changes', pair: ['A', 'D'], min: 30 } },
  { id: 'changes-AE', domain: 'fretting', level: 1, after: ['chord-A', 'chord-E'], title: L('A–E changes, 30 a minute', `החלפות ${H('A–E')}, 30 בדקה`), check: { kind: 'changes', pair: ['A', 'E'], min: 30 } },
  { id: 'changes-DE', domain: 'fretting', level: 1, after: ['chord-D', 'chord-E'], title: L('D–E changes, 30 a minute', `החלפות ${H('D–E')}, 30 בדקה`), check: { kind: 'changes', pair: ['D', 'E'], min: 30 } },
  { id: 'strum-down', domain: 'rhythm', level: 1, title: L('Down strums in time', 'פריטה למטה בזמן'), check: { kind: 'self' } },
  { id: 'chord-Am', domain: 'fretting', level: 2, after: ['chord-A'], title: L('Am chord', `אקורד ${H('Am')}`), check: { kind: 'chord', chord: 'Am' } },
  { id: 'chord-Em', domain: 'fretting', level: 2, after: ['chord-E'], title: L('Em chord', `אקורד ${H('Em')}`), check: { kind: 'chord', chord: 'Em' } },
  { id: 'chord-Dm', domain: 'fretting', level: 2, after: ['chord-D'], title: L('Dm chord', `אקורד ${H('Dm')}`), check: { kind: 'chord', chord: 'Dm' } },
  { id: 'chord-G', domain: 'fretting', level: 2, title: L('G chord', `אקורד ${H('G')}`), check: { kind: 'chord', chord: 'G' } },
  { id: 'chord-C', domain: 'fretting', level: 2, title: L('C chord', `אקורד ${H('C')}`), check: { kind: 'chord', chord: 'C' } },
];

export const skillById = (id) => SKILLS.find((s) => s.id === id);

// ---------------------------------------------------------------------------
// Lessons
//
// step kinds:
// `skill` on a tune / checklist / quiz step = the skill it passes when done.
//   explain   {title, text, shape?}                 text; `shape` shows a chord on the neck + "Hear"
//   tune      {title, text}                         the tuner, inline
//   checklist {title, text?, items:[…]}             the student ticks each item
//   quiz      {id, title, question, options:[…], answer, why}
//   chord     {chord, title, text}                  mic check of one chord shape
//   changes   {pair:[a,b], title, text}             one-minute changes (opens the tool, waits for a run)
// homework: [{id, kind:'changes', pair, min, perDay} | {id, kind:'chord', chord, perDay} | {id, kind:'self', text}]
// ---------------------------------------------------------------------------

const lessonFirstChords = {
  id: 'g1-first-chords',
  level: 1,
  title: L('Your first chords: D and A', `האקורדים הראשונים: ${H('D')} ו־${H('A')}`),
  objective: L(
    'Play D and A so every string rings, and change between them.',
    `לנגן ${H('D')} ו־${H('A')} כך שכל מיתר מצלצל, ולעבור ביניהם.`
  ),
  minutes: 25,
  skills: ['tuning', 'posture', 'strings', 'chord-D', 'chord-A', 'changes-AD'],
  steps: [
    {
      kind: 'explain',
      title: L('Today’s lesson', 'השיעור של היום'),
      text: L(
        'In 25 minutes you will play your first two chords, D and A, and switch between them. Everything else in the first months is built on this: clean chord shapes and moving between them in time. Work slowly — accuracy now saves months later.',
        `ב־25 הדקות הקרובות תנגן את שני האקורדים הראשונים שלך, ${H('D')} ו־${H('A')}, ותעבור ביניהם. כל מה שיבוא בחודשים הראשונים נבנה על זה: צורות אקורד נקיות ומעבר ביניהן בזמן. עבוד לאט — דיוק עכשיו חוסך חודשים אחר כך.`
      ),
    },
    {
      kind: 'tune',
      skill: 'tuning',
      title: L('Tune first', 'קודם מכוונים'),
      text: L(
        'An out-of-tune guitar makes right fingers sound wrong. Press Start, play one open string at a time, and turn its peg until the meter is green. From the thickest string: E A D G B E.',
        `גיטרה לא מכוונת גורמת לאצבעות נכונות להישמע לא נכון. לחץ התחל, נגן מיתר פתוח אחד בכל פעם, וסובב את המפתח שלו עד שהמחוון ירוק. מהמיתר העבה: ${H('E A D G B E')}.`
      ),
    },
    {
      kind: 'checklist',
      skill: 'posture',
      title: L('Sit and hold the guitar', 'ישיבה ואחיזה'),
      text: L('Check each point with the guitar in your hands.', 'בדוק כל נקודה כשהגיטרה בידיים שלך.'),
      items: [
        L('Sit upright, the guitar’s waist on your right leg, the neck slightly raised.', 'שב זקוף, המותן של הגיטרה על הרגל הימנית, הצוואר מורם מעט.'),
        L('Fretting-hand thumb behind the neck, roughly opposite your middle finger.', 'אגודל יד שמאל מאחורי הצוואר, בערך מול האצבע האמצעית.'),
        L('Press with the fingertips, fingers curved like holding a ball.', 'לוחצים עם קצות האצבעות, אצבעות מעוגלות כמו שמחזיקים כדור.'),
        L('Press just behind the fret wire, not on top of it and not in the middle of the gap.', 'לוחצים ממש מאחורי הסריג, לא עליו ולא באמצע המרווח.'),
        L('Fretting-hand nails short, shoulders loose.', 'ציפורני יד שמאל קצרות, כתפיים רפויות.'),
      ],
    },
    {
      kind: 'quiz',
      id: 'strings',
      skill: 'strings',
      title: L('String numbers', 'מספרי המיתרים'),
      question: L('Which string is string 1?', 'איזה מיתר הוא מיתר 1?'),
      options: [
        L('The thinnest string, nearest the floor (high E)', `המיתר הדק ביותר, הקרוב לרצפה (${H('E')} גבוה)`),
        L('The thickest string, nearest your face (low E)', `המיתר העבה ביותר, הקרוב לפנים (${H('E')} נמוך)`),
        L('The middle string (G)', `המיתר האמצעי (${H('G')})`),
      ],
      answer: 0,
      why: L(
        'Strings are numbered from the thinnest: 1 is high E, 6 is low E. Chord diagrams and lessons use these numbers.',
        `המיתרים ממוספרים מהדק: 1 הוא ${H('E')} גבוה, 6 הוא ${H('E')} נמוך. דיאגרמות אקורדים ושיעורים משתמשים במספרים האלה.`
      ),
    },
    {
      kind: 'explain',
      title: L('The D chord', `האקורד ${H('D')}`),
      shape: 'D',
      text: L(
        'Three fingers on the top three strings: index on string 3, fret 2; ring finger on string 2, fret 3; middle finger on string 1, fret 2. Strum only strings 4 to 1 — strings 5 and 6 stay silent. Listen first (Hear), then build the shape one finger at a time.',
        'שלוש אצבעות על שלושת המיתרים העליונים: אצבע 1 על מיתר 3, שריג 2; אצבע 3 על מיתר 2, שריג 3; אצבע 2 על מיתר 1, שריג 2. פורטים רק את מיתרים 4 עד 1 — מיתרים 5 ו־6 לא מנוגנים. קודם הקשב (שמע), ואז בנה את הצורה אצבע אחרי אצבע.'
      ),
    },
    {
      kind: 'chord',
      chord: 'D',
      title: L('Play D', `נגן ${H('D')}`),
      text: L(
        'Play each string of the chord one by one: every one should ring clearly. A dead string usually means a finger is touching it — curve that finger more. Then strum, and let the teacher listen.',
        'נגן כל מיתר של האקורד בנפרד: כל אחד צריך לצלצל נקי. מיתר מת אומר בדרך כלל שאצבע נוגעת בו — עגל אותה יותר. אחר כך פרוט, ותן למורה להקשיב.'
      ),
    },
    {
      kind: 'explain',
      title: L('The A chord', `האקורד ${H('A')}`),
      shape: 'A',
      text: L(
        'Three fingers side by side on fret 2: index on string 4, middle on string 3, ring on string 2. It is tight — angle the fingers so they fit. Strum strings 5 to 1; string 6 stays silent.',
        'שלוש אצבעות זו ליד זו על שריג 2: אצבע 1 על מיתר 4, אצבע 2 על מיתר 3, אצבע 3 על מיתר 2. צפוף — הטה את האצבעות כדי שייכנסו. פורטים את מיתרים 5 עד 1; מיתר 6 לא מנוגן.'
      ),
    },
    {
      kind: 'chord',
      chord: 'A',
      title: L('Play A', `נגן ${H('A')}`),
      text: L(
        'Same check: string by string, then strum. If string 1 is dead, the ring finger is lying on it — lift it onto its tip.',
        'אותה בדיקה: מיתר אחרי מיתר, ואז פריטה. אם מיתר 1 מת, אצבע 3 שוכבת עליו — הרם אותה לקצה.'
      ),
    },
    {
      kind: 'quiz',
      id: 'strum-D',
      title: L('Which strings?', 'אילו מיתרים?'),
      question: L('Which strings do you strum for D?', `אילו מיתרים פורטים ב־${H('D')}?`),
      options: [L('All six', 'כל השישה'), L('Strings 5 to 1', 'מיתרים 5 עד 1'), L('Strings 4 to 1', 'מיתרים 4 עד 1')],
      answer: 2,
      why: L('D starts on the open D string (4); strings 5 and 6 would add the wrong bass.', `${H('D')} מתחיל במיתר ${H('D')} הפתוח (4); מיתרים 5 ו־6 היו מוסיפים בס לא נכון.`),
    },
    {
      kind: 'explain',
      title: L('Changing chords', 'מעבר בין אקורדים'),
      text: L(
        'Move all fingers together, as one shape, not one after the other. Lift them only a little, and “see” the next shape in the air before you land. Slow and clean beats fast and messy — speed comes on its own.',
        'הזז את כל האצבעות יחד, כצורה אחת, ולא אחת אחרי השנייה. הרם אותן רק מעט, ו"ראה" את הצורה הבאה באוויר לפני הנחיתה. לאט ונקי עדיף על מהר ומלוכלך — המהירות מגיעה לבד.'
      ),
    },
    {
      kind: 'changes',
      pair: ['A', 'D'],
      title: L('One-minute changes: A and D', `החלפות בדקה: ${H('A')} ו־${H('D')}`),
      text: L(
        'One strum on A, one on D, and so on for 60 seconds — the microphone counts the clean changes. Any number is a fine start; you will see it grow during the week.',
        `פריטה אחת על ${H('A')}, אחת על ${H('D')}, וכך במשך 60 שניות — המיקרופון סופר את ההחלפות הנקיות. כל מספר הוא התחלה טובה; תראה אותו עולה במהלך השבוע.`
      ),
    },
  ],
  homework: [
    { id: 'ad-changes', kind: 'changes', pair: ['A', 'D'], min: 30, perDay: 1, text: L('One-minute changes A–D, once a day. Goal: 30.', `החלפות בדקה ${H('A–D')}, פעם ביום. יעד: 30.`) },
    { id: 'chords-check', kind: 'self', text: L('Every day: build D and A string by string until all strings ring.', `כל יום: בנה ${H('D')} ו־${H('A')} מיתר אחרי מיתר עד שכל המיתרים מצלצלים.`) },
  ],
};

export const LESSONS = [
  lessonFirstChords,
  { id: 'g1-chord-E', level: 1, title: L('E chord and three-chord changes', `האקורד ${H('E')} ומעבר בין שלושה`), skills: ['chord-E', 'changes-AE', 'changes-DE'] },
  { id: 'g1-strumming', level: 1, title: L('Strumming in time', 'פריטה בזמן'), skills: ['strum-down'] },
  { id: 'g1-first-song', level: 1, title: L('Your first song', 'השיר הראשון שלך'), skills: [] },
  { id: 'g2-minor-chords', level: 2, title: L('Am, Em and Dm', `${H('Am')}, ${H('Em')} ו־${H('Dm')}`), skills: ['chord-Am', 'chord-Em', 'chord-Dm'] },
  { id: 'g2-G-C', level: 2, title: L('G and C', `${H('G')} ו־${H('C')}`), skills: ['chord-G', 'chord-C'] },
];

export const lessonById = (id) => LESSONS.find((l) => l.id === id);
