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
  { id: 'arp-tones', domain: 'fretboard', level: 3, title: L('Chord tones: root, 3rd, 5th', 'צלילי האקורד: יסוד, טרצה, קווינטה'), check: { kind: 'quiz', id: 'arp-tones' } },
  { id: 'arp-C-open', domain: 'picking', level: 3, title: L('Open C arpeggio', `ארפג׳יו ${H('C')} פתוח`), check: { kind: 'play', arp: 'C-open' } },
  { id: 'arp-G-E', domain: 'lead', level: 3, title: L('Arpeggio, root on string 6', 'ארפג׳יו, יסוד על מיתר 6'), check: { kind: 'play', arp: 'G-E' } },
  { id: 'arp-C-top', domain: 'fretboard', level: 3, title: L('C triads up the neck', `משולשי ${H('C')} לאורך הצוואר`), check: { kind: 'play', arp: ['C-top1', 'C-top2', 'C-top3'] } },
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
//   arp       {arp: id | [ids], labels, hear?, compare?, title, text}
//                                                    arpeggio notes on the neck (teacher/arpeggios.js) + Hear
//   play      {arp, updown?, skill, title, text}   the mic follows the notes one by one (wait mode)
// homework: [{id, kind:'changes', pair, min, perDay} | {id, kind:'play', arp, updown, skill} | {id, kind:'self', text}]
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

// Arpeggios (2026-10-25, user's request). Method: hear the chord, name its
// tones by role, play it in one place, then the same chord in several places
// along the neck, then use it over a progression. Built on the published
// outlines of Rick Beato's "Arpeggio Masterclass" (close- and open-position
// triads first, three-string sets, then application; the goal is to hear the
// chord tones, not to memorise patterns) and JustinGuitar's triad arpeggios
// (root-6 and root-5 shapes, the top three strings first, roll a finger when
// two notes share a fret). All text and shapes here are our own.
const lessonArpeggios = {
  id: 'g3-arpeggios',
  level: 3,
  title: L('Arpeggios: the chord one note at a time', 'ארפג׳יו: האקורד צליל אחרי צליל'),
  objective: L(
    'Know the root, 3rd and 5th of a chord, play two movable arpeggio shapes, and find one chord in three places up the neck.',
    'לזהות יסוד, טרצה וקווינטה של אקורד, לנגן שתי צורות ארפג׳יו ניידות, ולמצוא אקורד אחד בשלושה מקומות לאורך הצוואר.'
  ),
  minutes: 30,
  skills: ['arp-tones', 'arp-C-open', 'arp-G-E', 'arp-C-top'],
  steps: [
    {
      kind: 'arp',
      arp: 'C-open',
      labels: 'note',
      compare: true,
      title: L('What is an arpeggio?', 'מה זה ארפג׳יו?'),
      text: L(
        'An arpeggio is a chord played one note at a time instead of all together. Listen: first C strummed, then the same C picked note by note. Same notes, a completely different feel — arpeggios are how chords become melody, in accompaniment and in solos.',
        `ארפג׳יו הוא אקורד שמנוגן צליל אחרי צליל, במקום כל הצלילים יחד. הקשב: קודם ${H('C')} בפריטה, ואחר כך אותו ${H('C')} צליל אחרי צליל. אותם צלילים, תחושה אחרת לגמרי — כך אקורד הופך למנגינה, בליווי ובסולו.`
      ),
    },
    {
      kind: 'arp',
      arp: 'C-open',
      labels: 'degree',
      title: L('Only three notes', 'רק שלושה צלילים'),
      text: L(
        'A major chord has three notes, each with a job: the ROOT (1) names the chord, the 3rd (3) makes it major or minor, the 5th (5) makes it full. C major = C (root), E (3rd), G (5th). The open C chord you know is just these three in different octaves: C E G C E. On the neck below, each dot shows its role.',
        `לאקורד מז׳ור יש שלושה צלילים, ולכל אחד תפקיד: היסוד (1) נותן לאקורד את שמו, הטרצה (3) קובעת אם הוא מז׳ור או מינור, והקווינטה (5) ממלאת אותו. ${H('C')} מז׳ור = ${H('C')} (יסוד), ${H('E')} (טרצה), ${H('G')} (קווינטה). אקורד ${H('C')} הפתוח שאתה מכיר הוא רק שלושת אלה באוקטבות שונות: ${H('C E G C E')}. על הצוואר למטה, כל נקודה מראה את התפקיד שלה.`
      ),
    },
    {
      kind: 'quiz',
      id: 'arp-tones',
      skill: 'arp-tones',
      title: L('Find the 3rd', 'מצא את הטרצה'),
      question: L('G major = G B D. Which note is the 3rd?', `${H('G')} מז׳ור = ${H('G B D')}. איזה צליל הוא הטרצה?`),
      options: [L('G', H('G')), L('B', H('B')), L('D', H('D'))],
      answer: 1,
      why: L(
        'G is the root (1), B the 3rd (3), D the 5th (5). Count letters from the root: G-a-B = 3, G-a-b-c-D = 5.',
        `${H('G')} הוא היסוד (1), ${H('B')} הטרצה (3), ${H('D')} הקווינטה (5). סופרים אותיות מהיסוד: ${H('G-A-B')} = 3, ${H('G-A-B-C-D')} = 5.`
      ),
    },
    {
      kind: 'play',
      arp: 'C-open',
      updown: true,
      skill: 'arp-C-open',
      title: L('Your first arpeggio', 'הארפג׳יו הראשון שלך'),
      text: L(
        'Hold the open C chord and pick its strings one by one: from string 5 down to string 1, then back up to 5. Slowly — one note, let it ring, the next. The teacher listens and lights the next note on the neck when it hears the right one.',
        `החזק את אקורד ${H('C')} הפתוח ופרוט את המיתרים שלו אחד אחד: ממיתר 5 עד מיתר 1, ובחזרה עד 5. לאט — צליל, לתת לו לצלצל, הבא. המורה מקשיב, ומדליק על הצוואר את הצליל הבא כשהוא שומע את הנכון.`
      ),
    },
    {
      kind: 'arp',
      arp: 'G-E',
      labels: 'degree',
      title: L('Shape 1: root on string 6', 'צורה 1: היסוד על מיתר 6'),
      text: L(
        'This shape lives inside the barre chord with its root on string 6 (the “E shape”). Here it is G at fret 3, two octaves: 1 3 5 1 3 5 1 = G B D G B D G. Keep one finger per fret: index on fret 2, middle on 3, ring on 4, pinky on 5. Strings 5 and 4 both use fret 5 — play the first with the pinky tip, then roll the same finger flat onto the next string; strings 2 and 1 at fret 3 work the same with the middle finger. It is movable: start at fret 5 and it is A, at fret 8 it is C.',
        `הצורה הזו נמצאת בתוך אקורד הברה שהיסוד שלו על מיתר 6 ("צורת ${H('E')}"). כאן זה ${H('G')} בשריג 3, שתי אוקטבות: ${H('1 3 5 1 3 5 1')} = ${H('G B D G B D G')}. אצבע אחת לכל שריג: אצבע 1 על שריג 2, אצבע 2 על 3, אצבע 3 על 4, אצבע 4 על 5. מיתרים 5 ו־4 שניהם בשריג 5 — נגן את הראשון בקצה הזרת, ואז גלגל את אותה אצבע אל המיתר הבא; כך גם מיתרים 2 ו־1 בשריג 3, עם אצבע 2. הצורה ניידת: מתחילים בשריג 5 וזה ${H('A')}, בשריג 8 זה ${H('C')}.`
      ),
    },
    {
      kind: 'play',
      arp: 'G-E',
      updown: true,
      skill: 'arp-G-E',
      title: L('Play shape 1', 'נגן את צורה 1'),
      text: L(
        'Up and back down, 13 notes. Lift each finger as soon as the next note sounds, so the notes stay separate. If the teacher waits on a note, check that it is the right string and fret and that it rings clean.',
        'למעלה ובחזרה למטה, 13 צלילים. הרם כל אצבע ברגע שהצליל הבא נשמע, כדי שהצלילים יישארו נפרדים. אם המורה ממתין על צליל, בדוק שזה המיתר והשריג הנכונים ושהוא מצלצל נקי.'
      ),
    },
    {
      kind: 'arp',
      arp: 'C-A',
      labels: 'degree',
      title: L('Shape 2: root on string 5', 'צורה 2: היסוד על מיתר 5'),
      text: L(
        'The second shape comes from the barre chord with its root on string 5 (the “A shape”). C at fret 3: C E G C E G = 1 3 5 1 3 5. Three notes sit on fret 5 (strings 4, 3, 2) — use the ring finger for the first and roll it; many players use the pinky for string 2. With these two shapes you can play an arpeggio for any major chord: find its root on string 6 or 5.',
        `הצורה השנייה באה מאקורד הברה שהיסוד שלו על מיתר 5 ("צורת ${H('A')}"). ${H('C')} בשריג 3: ${H('C E G C E G')} = ${H('1 3 5 1 3 5')}. שלושה צלילים יושבים על שריג 5 (מיתרים 4, 3, 2) — נגן את הראשון באצבע 3 וגלגל אותה; נגנים רבים מנגנים את מיתר 2 בזרת. עם שתי הצורות האלה אפשר לנגן ארפג׳יו לכל אקורד מז׳ור: מוצאים את היסוד שלו על מיתר 6 או 5.`
      ),
    },
    {
      kind: 'checklist',
      title: L('How to pick an arpeggio', 'איך פורטים ארפג׳יו'),
      text: L('The habits that make an arpeggio sound clean:', 'ההרגלים שגורמים לארפג׳יו להישמע נקי:'),
      items: [
        L('Start with alternate picking — down, up, down, up — one note per click at 60 bpm (the metronome is in the bar).', 'התחל בפריטה מתחלפת — למטה, למעלה, למטה, למעלה — צליל אחד בכל קליק ב־60 BPM (המטרונום בסרגל).'),
        L('Only notes that are clean go faster: when it is clean 3 times in a row, add 4–5 bpm.', 'מהירות רק אחרי ניקיון: כשזה נקי 3 פעמים ברצף, הוסף 4–5 BPM.'),
        L('Mute what you are not playing: the side of the picking hand rests lightly on the low strings.', 'השתק את מה שלא מנגנים: צד כף יד ימין נח בעדינות על המיתרים הנמוכים.'),
        L('Later: when two notes in a row go to the next string in the same direction, one stroke can play both (economy / sweep picking).', 'בהמשך: כשני צלילים ברצף עוברים למיתר הבא באותו כיוון, תנועה אחת יכולה לנגן את שניהם (פריטת אקונומי / סוויפ).'),
      ],
    },
    {
      kind: 'arp',
      arp: ['C-top1', 'C-top2', 'C-top3'],
      labels: 'degree',
      title: L('One chord, three places', 'אקורד אחד, שלושה מקומות'),
      text: L(
        'Now the same chord along the neck, on the top three strings only. Shape A (fret 3–5) starts on the root: C E G. Shape B (fret 8–9) starts on the 3rd: E G C. Shape C (fret 12–13) starts on the 5th: G C E. Each shape begins on the next chord tone of the one before, so the neck is just C E G repeating up to fret 12, where it starts again. Small shapes like these are what players use to solo over chords anywhere on the neck.',
        `עכשיו אותו אקורד לאורך הצוואר, רק על שלושת המיתרים העליונים. צורה א (שריג 3–5) מתחילה ביסוד: ${H('C E G')}. צורה ב (שריג 8–9) מתחילה בטרצה: ${H('E G C')}. צורה ג (שריג 12–13) מתחילה בקווינטה: ${H('G C E')}. כל צורה מתחילה בצליל האקורד הבא אחרי זו שלפניה, כך שהצוואר הוא בסך הכול ${H('C E G')} שחוזרים על עצמם עד שריג 12, ושם מתחילים שוב. צורות קטנות כאלה הן מה שנגנים משתמשים בו כדי לאלתר מעל אקורדים בכל מקום על הצוואר.`
      ),
    },
    {
      kind: 'play',
      arp: ['C-top1', 'C-top2', 'C-top3'],
      skill: 'arp-C-top',
      title: L('Climb the neck', 'לטפס על הצוואר'),
      text: L(
        'Play shape A, B, then C — three notes each, low to high, sliding your hand up between them. 9 notes. Say the role in your head as you play: 1 3 5, 3 5 1, 5 1 3.',
        `נגן צורה א, ב ואז ג — שלושה צלילים בכל אחת, מהנמוך לגבוה, ולהחליק את היד למעלה ביניהן. 9 צלילים. אמור בראש את התפקיד בזמן הנגינה: ${H('1 3 5, 3 5 1, 5 1 3')}.`
      ),
    },
    {
      kind: 'quiz',
      id: 'arp-shape-b',
      title: L('Which role?', 'איזה תפקיד?'),
      question: L('Shape B starts on E. In C major, E is the…', `צורה ב מתחילה ב־${H('E')}. ב־${H('C')} מז׳ור, ${H('E')} הוא ה…`),
      options: [L('Root', 'יסוד'), L('3rd', 'טרצה'), L('5th', 'קווינטה')],
      answer: 1,
      why: L('C (1), E (3), G (5). The lowest note of a shape tells you which shape it is.', `${H('C')} (1), ${H('E')} (3), ${H('G')} (5). הצליל הנמוך בצורה אומר לך איזו צורה זו.`),
    },
    {
      kind: 'arp',
      arp: 'Am-open',
      labels: 'degree',
      hear: ['C-open', 'Am-open'],
      title: L('Use it in music', 'שימוש במוזיקה'),
      text: L(
        'Arpeggios turn a chord progression into a picked accompaniment. Hear C, then Am, each picked note by note. Am = A (1), C (♭3), E (5): the minor 3rd is one fret lower than a major 3rd — that is the whole difference between major and minor. Try it on a song you know: hold each chord and pick its notes instead of strumming.',
        `ארפג׳יו הופך מהלך אקורדים לליווי בפריטה. הקשב ל־${H('C')} ואחר כך ל־${H('Am')}, כל אחד צליל אחרי צליל. ${H('Am = A (1), C (♭3), E (5)')}. הטרצה הקטנה נמוכה בשריג אחד מהטרצה הגדולה — זה כל ההבדל בין מז׳ור למינור. נסה את זה על שיר שאתה מכיר: החזק כל אקורד ופרוט את הצלילים שלו במקום פריטה מלאה.`
      ),
    },
  ],
  homework: [
    { id: 'arp-g-e', kind: 'play', arp: 'G-E', updown: true, skill: 'arp-G-E', text: L('Shape 1 (G, root on string 6), up and down — once a day with the teacher listening.', `צורה 1 (${H('G')}, יסוד על מיתר 6), למעלה ולמטה — פעם ביום כשהמורה מקשיב.`) },
    { id: 'arp-c-top', kind: 'play', arp: ['C-top1', 'C-top2', 'C-top3'], skill: 'arp-C-top', text: L('C triads up the neck (shapes A, B, C) — once a day.', `משולשי ${H('C')} לאורך הצוואר (צורות א, ב, ג) — פעם ביום.`) },
    { id: 'arp-tempo', kind: 'self', text: L('5 minutes with the metronome: one note per click at 60 bpm, then two per click.', '5 דקות עם מטרונום: צליל בכל קליק ב־60 BPM, ואז שניים בכל קליק.') },
  ],
};

export const LESSONS = [
  lessonFirstChords,
  { id: 'g1-chord-E', level: 1, title: L('E chord and three-chord changes', `האקורד ${H('E')} ומעבר בין שלושה`), skills: ['chord-E', 'changes-AE', 'changes-DE'] },
  { id: 'g1-strumming', level: 1, title: L('Strumming in time', 'פריטה בזמן'), skills: ['strum-down'] },
  { id: 'g1-first-song', level: 1, title: L('Your first song', 'השיר הראשון שלך'), skills: [] },
  { id: 'g2-minor-chords', level: 2, title: L('Am, Em and Dm', `${H('Am')}, ${H('Em')} ו־${H('Dm')}`), skills: ['chord-Am', 'chord-Em', 'chord-Dm'] },
  { id: 'g2-G-C', level: 2, title: L('G and C', `${H('G')} ו־${H('C')}`), skills: ['chord-G', 'chord-C'] },
  lessonArpeggios,
];

export const lessonById = (id) => LESSONS.find((l) => l.id === id);
