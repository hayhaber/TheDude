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
  { n: 4, grade: 'Grade 3–4', title: L('Lead techniques', 'טכניקות סולו') },
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
  Em: [0, 2, 3, 0, 0, 0],
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
  { id: 'open-strings', domain: 'picking', level: 0, title: L('Pick the six open strings', 'לפרוט את ששת המיתרים הפתוחים'), check: { kind: 'play', arp: 'open-strings' } },
  { id: 'clean-notes', domain: 'fretting', level: 0, after: ['open-strings'], title: L('Clean fretted notes: a first melody', 'צלילים נקיים: מנגינה ראשונה'), check: { kind: 'play', arp: 'ode' } },
  { id: 'finger-1234', domain: 'fretting', level: 0, title: L('Fingers 1-2-3-4 on one string', `אצבעות ${H('1-2-3-4')} על מיתר אחד`), check: { kind: 'play', arp: 'spider-1' } },
  { id: 'chord-D', domain: 'fretting', level: 1, after: ['posture'], title: L('D chord', `אקורד ${H('D')}`), check: { kind: 'chord', chord: 'D' } },
  { id: 'chord-A', domain: 'fretting', level: 1, after: ['posture'], title: L('A chord', `אקורד ${H('A')}`), check: { kind: 'chord', chord: 'A' } },
  { id: 'chord-E', domain: 'fretting', level: 1, after: ['posture'], title: L('E chord', `אקורד ${H('E')}`), check: { kind: 'chord', chord: 'E' } },
  { id: 'changes-AD', domain: 'fretting', level: 1, after: ['chord-D', 'chord-A'], title: L('A–D changes, 30 a minute', `החלפות ${H('A–D')}, 30 בדקה`), check: { kind: 'changes', pair: ['A', 'D'], min: 30 } },
  { id: 'changes-AE', domain: 'fretting', level: 1, after: ['chord-A', 'chord-E'], title: L('A–E changes, 30 a minute', `החלפות ${H('A–E')}, 30 בדקה`), check: { kind: 'changes', pair: ['A', 'E'], min: 30 } },
  { id: 'changes-DE', domain: 'fretting', level: 1, after: ['chord-D', 'chord-E'], title: L('D–E changes, 30 a minute', `החלפות ${H('D–E')}, 30 בדקה`), check: { kind: 'changes', pair: ['D', 'E'], min: 30 } },
  { id: 'strum-down', domain: 'rhythm', level: 0, title: L('Down strums in time', 'פריטה למטה בזמן'), check: { kind: 'self' } },
  { id: 'chord-Am', domain: 'fretting', level: 2, after: ['chord-A'], title: L('Am chord', `אקורד ${H('Am')}`), check: { kind: 'chord', chord: 'Am' } },
  { id: 'chord-Em', domain: 'fretting', level: 0, title: L('Em chord', `אקורד ${H('Em')}`), check: { kind: 'chord', chord: 'Em' } },
  { id: 'chord-Dm', domain: 'fretting', level: 2, after: ['chord-D'], title: L('Dm chord', `אקורד ${H('Dm')}`), check: { kind: 'chord', chord: 'Dm' } },
  { id: 'chord-G', domain: 'fretting', level: 2, title: L('G chord', `אקורד ${H('G')}`), check: { kind: 'chord', chord: 'G' } },
  { id: 'chord-C', domain: 'fretting', level: 2, title: L('C chord', `אקורד ${H('C')}`), check: { kind: 'chord', chord: 'C' } },
  { id: 'arp-tones', domain: 'fretboard', level: 3, title: L('Chord tones: root, 3rd, 5th', 'צלילי האקורד: יסוד, טרצה, קווינטה'), check: { kind: 'quiz', id: 'arp-tones' } },
  { id: 'arp-C-open', domain: 'picking', level: 3, title: L('Open C arpeggio', `ארפג׳יו ${H('C')} פתוח`), check: { kind: 'play', arp: 'C-open' } },
  { id: 'arp-G-E', domain: 'lead', level: 3, title: L('Arpeggio, root on string 6', 'ארפג׳יו, יסוד על מיתר 6'), check: { kind: 'play', arp: 'G-E' } },
  { id: 'arp-C-top', domain: 'fretboard', level: 3, title: L('C triads up the neck', `משולשי ${H('C')} לאורך הצוואר`), check: { kind: 'play', arp: ['C-top1', 'C-top2', 'C-top3'] } },
  { id: 'tap-basic', domain: 'lead', level: 4, after: ['arp-C-top'], title: L('Tap and pull off', 'הקשה ו־pull-off'), check: { kind: 'play', arp: 'tap-pull' } },
  { id: 'tap-triplet', domain: 'lead', level: 4, after: ['tap-basic'], title: L('Tapping triplets (tap, pull, hammer)', 'טריולות טאפינג (הקשה, pull, hammer)'), check: { kind: 'play', arp: 'tap-Am' } },
  { id: 'tap-formula', domain: 'fretboard', level: 4, title: L('Build a tapped chord on one string', 'לבנות אקורד בטאפינג על מיתר אחד'), check: { kind: 'quiz', id: 'tap-formula' } },
  { id: 'tap-chords', domain: 'lead', level: 4, after: ['tap-triplet'], title: L('Tapped arpeggios over Am–F–C–G', `ארפג׳יו בטאפינג על ${H('Am–F–C–G')}`), check: { kind: 'play', arp: ['tap-Am2', 'tap-F', 'tap-C', 'tap-G'] } },
  { id: 'tap-melody', domain: 'lead', level: 4, after: ['tap-basic'], title: L('A tapped melody over a pedal note', 'מנגינה בטאפינג מעל צליל עוגב'), check: { kind: 'play', arp: 'tap-melody' } },
  { id: 'tap-solo', domain: 'lead', level: 4, after: ['tap-triplet'], title: L('Tapping in a pentatonic solo', 'טאפינג בסולו פנטטוני'), check: { kind: 'play', arp: 'tap-penta' } },
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


// ---------------------------------------------------------------------------
// Level 4 — two-hand TAPPING (user's request 2026-10-26; one-finger tapping
// first, multi-finger / two-handed later). Method from published teaching:
// Premier Guitar "Cram Session: Two-Hand Tapping" (tapping = picking-hand
// hammer-ons extending a line; three-note-per-string arpeggios on one string
// with voice leading; pentatonic shapes + "hammer-ons from nowhere"),
// fretjam's beginner method (middle finger taps so the pick stays held; tap
// just behind the fret; pull off with a light downward pluck — too hard sounds
// like a bend; first a pedal exercise; steady rhythm with a metronome),
// GuitarLessons.com (mute the strings above with the picking hand, below with
// the fretting hand) and Rockschool (tapping in the Grade 4 syllabus). The
// Eruption-style triplet (tap - pull-off - hammer-on) is the standard first
// pattern. The chord-tone formula and all examples here are our own.
const lessonTapping = {
  id: 'g4-tapping',
  level: 4,
  title: L('Tapping: the picking hand on the fretboard', 'טאפינג: יד ימין על הצוואר'),
  objective: L(
    'Tap cleanly with the picking hand, play tapped triplets in time, build a tapped arpeggio for any chord on one string, and use a tapped note to extend a pentatonic solo.',
    'להקיש נקי ביד ימין, לנגן טריולות טאפינג בזמן, לבנות ארפג׳יו בטאפינג לכל אקורד על מיתר אחד, ולהשתמש בצליל מוקש כדי להרחיב סולו פנטטוני.'
  ),
  minutes: 35,
  skills: ['tap-basic', 'tap-triplet', 'tap-formula', 'tap-chords', 'tap-melody', 'tap-solo'],
  steps: [
    {
      kind: 'arp',
      arp: 'tap-Am',
      labels: 'finger',
      title: L('What is tapping?', 'מה זה טאפינג?'),
      text: L(
        'Tapping means the PICKING hand plays notes on the fretboard: it hammers a note on (the tap) and pulls off to a note the fretting hand holds. No pick stroke at all — the line flows like a keyboard part and can reach notes the fretting hand never could. Eddie Van Halen made it famous in 1978. Listen to the classic pattern: tap, pull off, hammer on, over and over.',
        'טאפינג הוא נגינה של יד ימין — היד הפורטת — על הצוואר: היא מקישה צליל (ה־tap) ואז עושה pull-off אל צליל שיד שמאל מחזיקה. בלי פריטה בכלל — הקו זורם כמו בקלידים ומגיע לצלילים שיד שמאל לא מגיעה אליהם. ⁦Eddie Van Halen⁩ הפך את זה למפורסם ב־⁦1978⁩. הקשב לתבנית הקלאסית: הקשה, ⁦pull-off⁩, ⁦hammer-on⁩, שוב ושוב.'
      ),
    },
    {
      kind: 'checklist',
      title: L('Set up the tap', 'הכנה להקשה'),
      text: L('How teachers set it up — tick each one as you try it:', 'כך מורים בונים את ההקשה — סמן כל אחד כשאתה מנסה:'),
      items: [
        L('Tap with the MIDDLE finger of the picking hand — keep holding the pick between thumb and index, so you can switch back to picking at once.', 'הקש באצבע האמה של יד ימין — המפרט נשאר בין האגודל לאצבע המורה, כדי שתוכל לחזור לפריטה מיד.'),
        L('Rest the thumb (or the side of the hand) on the top edge of the neck as an anchor.', 'הנח את האגודל (או את צד כף היד) על השפה העליונה של הצוואר, כעוגן.'),
        L('Tap just behind the fret, like a fretting finger — firm and fast, so the note sounds on its own.', 'הקש ממש מאחורי השריג, כמו אצבע של יד שמאל — חזק ומהיר, כך שהצליל יישמע בעצמו.'),
        L('Pull off with a small DOWNWARD flick (toward the floor), like plucking the string — too hard and it sounds like a bend.', 'עשה ⁦pull-off⁩ בתנועה קטנה כלפי מטה (לכיוון הרצפה), כמו פריטה של המיתר — חזק מדי וזה יישמע כמו כיפוף.'),
        L('Mute: the picking hand’s palm on the strings BELOW (lower strings), the fretting hand’s fingers lightly on the strings ABOVE.', 'השתקה: כף יד ימין על המיתרים הנמוכים, ואצבעות יד שמאל נוגעות בעדינות במיתרים הגבוהים.'),
      ],
    },
    {
      kind: 'play',
      arp: 'tap-pull',
      labels: 'finger',
      skill: 'tap-basic',
      title: L('First taps: tap and pull off', 'הקשות ראשונות: הקשה ו־pull-off'),
      text: L(
        'Index finger holds fret 5 on the B string (E). Tap fret 12 (B) and pull off to the 5: B – E – B – E… 8 notes. Both notes should sound equally loud — the pull-off is what makes the fretted note speak.',
        'אצבע 1 מחזיקה את שריג 5 על מיתר ⁦B⁩ (⁦E⁩). הקש על שריג 12 (⁦B⁩) ועשה ⁦pull-off⁩ אל ה־5: ⁦B – E – B – E⁩… 8 צלילים. שני הצלילים צריכים להישמע באותה עוצמה — ה־⁦pull-off⁩ הוא מה שגורם לצליל של יד שמאל להישמע.'
      ),
    },
    {
      kind: 'play',
      arp: 'tap-Am',
      labels: 'finger',
      skill: 'tap-triplet',
      title: L('The tapping triplet', 'טריולת הטאפינג'),
      text: L(
        'High E string: index on fret 5, pinky on 8. Tap 12 → pull off to 5 → hammer on 8, and again: three even notes per beat (a triplet). Count “1-trip-let, 2-trip-let”: the tap always falls on the number. 12 notes. Start slowly; speed comes only when every note is even.',
        'מיתר ⁦E⁩ הגבוה: אצבע 1 על שריג 5, זרת על 8. הקשה על 12 ← ⁦pull-off⁩ ל־5 ← ⁦hammer-on⁩ ל־8, ושוב: שלושה צלילים שווים בכל פעמה (טריולה). ספור "⁦1⁩־טרי־אולה, ⁦2⁩־טרי־אולה": ההקשה תמיד נופלת על המספר. 12 צלילים. התחל לאט; מהירות רק כשכל הצלילים שווים.'
      ),
    },
    {
      kind: 'arp',
      arp: 'tap-Am',
      labels: 'degree',
      title: L('The formula: three chord tones on one string', 'הנוסחה: שלושה צלילי אקורד על מיתר אחד'),
      text: L(
        'Why does that sound like A minor? Its three notes ARE the A minor chord: fret 5 = A (root, 1), fret 8 = C (minor 3rd, ♭3), fret 12 = E (5th, 5). The formula for any chord: 1) list its chord tones (A minor = A C E); 2) find three of them in a row up ONE string; 3) the fretting hand takes the two lower ones (index + ring or pinky), the tap takes the highest. Play tap – pull – hammer and you are playing that chord.',
        'למה זה נשמע ⁦A⁩ מינור? שלושת הצלילים הם אקורד ⁦A⁩ מינור: שריג 5 = ⁦A⁩ (יסוד, 1), שריג 8 = ⁦C⁩ (טרצה קטנה, ⁦♭3⁩), שריג 12 = ⁦E⁩ (קווינטה, 5). הנוסחה לכל אקורד: 1) רשום את צלילי האקורד (⁦A⁩ מינור = ⁦A C E⁩); 2) מצא שלושה מהם ברצף לאורך מיתר אחד; 3) יד שמאל לוקחת את שני הנמוכים (אצבע 1 + 3 או זרת), וההקשה את הגבוה. נגן הקשה – ⁦pull⁩ – ⁦hammer⁩ ואתה מנגן את האקורד.'
      ),
    },
    {
      kind: 'quiz',
      id: 'tap-formula',
      skill: 'tap-formula',
      title: L('Use the formula', 'השתמש בנוסחה'),
      question: L(
        'C major = C E G. On the high E string the fretting hand holds C (fret 8) and E (fret 12). Which fret do you tap?',
        '⁦C⁩ מז׳ור = ⁦C E G⁩. על מיתר ⁦E⁩ הגבוה יד שמאל מחזיקה ⁦C⁩ (שריג 8) ו־⁦E⁩ (שריג 12). על איזה שריג מקישים?'
      ),
      options: [L('13 (F)', '⁦13 (F)⁩'), L('15 (G)', '⁦15 (G)⁩'), L('17 (A)', '⁦17 (A)⁩')],
      answer: 1,
      why: L(
        'The next chord tone above E is G — the 5th of C — at fret 15. F and A are not in the C chord.',
        'צליל האקורד הבא מעל ⁦E⁩ הוא ⁦G⁩ — הקווינטה של ⁦C⁩ — בשריג 15. ⁦F⁩ ו־⁦A⁩ אינם באקורד ⁦C⁩.'
      ),
    },
    {
      kind: 'arp',
      arp: ['tap-Am2', 'tap-F', 'tap-C', 'tap-G'],
      labels: 'degree',
      title: L('Through a chord progression', 'לאורך מהלך אקורדים'),
      text: L(
        'Am – F – C – G, two triplets each, all on the high E string. Move as LITTLE as possible (voice leading): Am → F keeps A and C under the fretting hand, only the tap moves from 12 (E) to 13 (F). C = C E G (frets 8, 12, tap 15). G = B D G (frets 7, 10, tap 15) — the tap stays, the fretting hand moves down one fret. This is how tapped chord passages are built.',
        '⁦Am – F – C – G⁩, שתי טריולות לכל אקורד, הכול על מיתר ⁦E⁩ הגבוה. זזים כמה שפחות (הובלת קולות): ⁦Am → F⁩ — יד שמאל נשארת על ⁦A⁩ ו־⁦C⁩, ורק ההקשה זזה מ־12 (⁦E⁩) ל־13 (⁦F⁩). ⁦C = C E G⁩ (שריגים 8, 12, הקשה 15). ⁦G = B D G⁩ (שריגים 7, 10, הקשה 15) — ההקשה נשארת, ויד שמאל יורדת שריג אחד. כך בונים קטעי אקורדים בטאפינג.'
      ),
    },
    {
      kind: 'play',
      arp: ['tap-Am2', 'tap-F', 'tap-C', 'tap-G'],
      labels: 'finger',
      skill: 'tap-chords',
      title: L('Play the progression', 'נגן את המהלך'),
      text: L('24 notes: Am, F, C, G — tap, pull, hammer, twice per chord. Change shape without breaking the rhythm.', '24 צלילים: ⁦Am, F, C, G⁩ — הקשה, ⁦pull⁩, ⁦hammer⁩, פעמיים לכל אקורד. החלף צורה בלי לשבור את הקצב.'),
    },
    {
      kind: 'arp',
      arp: 'tap-melody',
      labels: 'degree',
      title: L('The melodic style: a melody over a pedal', 'הסגנון המלודי: מנגינה מעל צליל עוגב'),
      text: L(
        'Tapping is not only speed. Here the index holds one note — E on the B string (fret 5), the “pedal” — and the TAP plays a melody above it: B C D E D C B (frets 12 13 15 17 15 13 12), each tap pulled off back to the E. The melody is the E natural minor scale (5, ♭6, ♭7, 1); the pedal keeps the key in your ear. Players like Joe Satriani use this singing, legato sound.',
        'טאפינג הוא לא רק מהירות. כאן אצבע 1 מחזיקה צליל אחד — ⁦E⁩ על מיתר ⁦B⁩ (שריג 5), "צליל העוגב" — וההקשה מנגנת מעליו מנגינה: ⁦B C D E D C B⁩ (שריגים ⁦12 13 15 17 15 13 12⁩), וכל הקשה חוזרת ב־⁦pull-off⁩ אל ה־⁦E⁩. המנגינה היא סולם ⁦E⁩ מינור טבעי (⁦5, ♭6, ♭7, 1⁩); צליל העוגב שומר את הטונליות באוזן. נגנים כמו ⁦Joe Satriani⁩ משתמשים בצליל השר והרציף הזה.'
      ),
    },
    {
      kind: 'play',
      arp: 'tap-melody',
      labels: 'finger',
      skill: 'tap-melody',
      title: L('Play the melody', 'נגן את המנגינה'),
      text: L('14 notes. Let each tapped note sing a little before the pull-off; aim for the same volume on the melody and the pedal.', '14 צלילים. תן לכל צליל מוקש "לשיר" רגע לפני ה־⁦pull-off⁩; כוון לאותה עוצמה במנגינה ובצליל העוגב.'),
    },
    {
      kind: 'arp',
      arp: 'tap-penta',
      labels: 'degree',
      title: L('Tapping in a solo', 'טאפינג בסולו'),
      text: L(
        'In a solo, tapping extends the box you already know. A minor pentatonic, box 1 (frets 5–8). The rule: on the string you are on, tap a note of the SAME scale above the box — ideally a chord tone, so it lands strongly. High E: the box has A (5) and C (8); tap E (12), the 5th. B string: E (5) and G (8); tap A (10), the root. Play tap – pull – pull (12-8-5) as falling triplets, then the same on the B string (10-8-5), and land on A. Any scale, any box: tap the scale continuing up the string.',
        'בסולו, הטאפינג מרחיב את הקופסה שאתה כבר מכיר. ⁦A⁩ מינור פנטטוני, קופסה 1 (שריגים ⁦5–8⁩). הכלל: על המיתר שאתה נמצא בו, הקש צליל מאותו סולם מעל הקופסה — רצוי צליל אקורד, כדי שינחת חזק. מיתר ⁦E⁩ הגבוה: בקופסה יש ⁦A⁩ (5) ו־⁦C⁩ (8); מקישים ⁦E⁩ (12), הקווינטה. מיתר ⁦B⁩: ⁦E⁩ (5) ו־⁦G⁩ (8); מקישים ⁦A⁩ (10), היסוד. נגן הקשה – ⁦pull⁩ – ⁦pull⁩ (⁦12-8-5⁩) בטריולות יורדות, ואז אותו דבר על מיתר ⁦B⁩ (⁦10-8-5⁩), ונחת על ⁦A⁩. כל סולם, כל קופסה: מקישים את המשך הסולם במעלה המיתר.'
      ),
    },
    {
      kind: 'play',
      arp: 'tap-penta',
      labels: 'finger',
      skill: 'tap-solo',
      title: L('Play the solo lick', 'נגן את הליק'),
      text: L('13 notes, ending on A. Then try it in your own solos: one tapped phrase at the top of a pentatonic run.', '13 צלילים, עם סיום על ⁦A⁩. אחר כך נסה בסולואים שלך: משפט אחד בטאפינג בראש ריצה פנטטונית.'),
    },
    {
      kind: 'checklist',
      title: L('How to practise tapping', 'איך מתרגלים טאפינג'),
      text: L('The habits that make tapping clean:', 'ההרגלים שהופכים טאפינג לנקי:'),
      items: [
        L('Metronome at 60: one triplet per click. Up 4–5 bpm only after 3 clean, even repetitions.', 'מטרונום ב־⁦60⁩: טריולה בכל קליק. מעלים ⁦4–5 BPM⁩ רק אחרי 3 חזרות נקיות ושוות.'),
        L('Listen for the weak note — usually the hammer-on: all three notes of the triplet as loud as each other.', 'הקשב לצליל החלש — בדרך כלל ה־⁦hammer-on⁩: שלושת הצלילים בטריולה באותה עוצמה.'),
        L('Silence between strings: if other strings ring, fix the muting before going faster.', 'שקט בין המיתרים: אם מיתרים אחרים מצלצלים, תקן את ההשתקה לפני שמאיצים.'),
        L('More licks: Practice → Lick Trainer → Tapping (classic rock and melodic) — the trainer judges timing too.', 'עוד ליקים: תרגול ← מאמן ליקים ← טאפינג (רוק קלאסי ומלודי) — המאמן בודק גם את התזמון.'),
      ],
    },
  ],
  homework: [
    { id: 'tap-triplet-hw', kind: 'play', arp: 'tap-Am', labels: 'finger', skill: 'tap-triplet', text: L('The A minor tapping triplet (12-5-8) — once a day with the teacher listening.', 'טריולת הטאפינג של ⁦A⁩ מינור (⁦12-5-8⁩) — פעם ביום כשהמורה מקשיב.') },
    { id: 'tap-prog-hw', kind: 'play', arp: ['tap-Am2', 'tap-F', 'tap-C', 'tap-G'], labels: 'finger', skill: 'tap-chords', text: L('Am – F – C – G tapped — once a day.', '⁦Am – F – C – G⁩ בטאפינג — פעם ביום.') },
    { id: 'tap-solo-hw', kind: 'play', arp: 'tap-penta', labels: 'finger', skill: 'tap-solo', text: L('The pentatonic tapping lick — once a day.', 'ליק הטאפינג הפנטטוני — פעם ביום.') },
    { id: 'tap-metro', kind: 'self', text: L('5 minutes: triplets with the metronome at 60, then 64, 68 — only when even.', '5 דקות: טריולות עם מטרונום ב־⁦60⁩, ואז ⁦64, 68⁩ — רק כשהן שוות.') },
  ],
};


// ---------------------------------------------------------------------------
// Level 0 — first steps (2026-10-31, onboarding plan phase 2). For someone
// who has never held a guitar: a clean sound before any chord. Order follows
// common method books (Hal Leonard Guitar Method Book 1 starts on E F G on
// the high E string; JustinGuitar's beginner course on posture, tuning and a
// two-finger first chord); text and exercises are our own. "Ode to Joy" is
// Beethoven (public domain).
// ---------------------------------------------------------------------------

const lessonFirstNote = {
  id: 'g0-first-note',
  level: 0,
  title: L('The guitar and your first sound', 'הגיטרה והצליל הראשון'),
  objective: L(
    'Hold the guitar and the pick, tune, and play the six open strings by name.',
    'להחזיק את הגיטרה והמפרט, לכוון, ולנגן את ששת המיתרים הפתוחים בשמם.'
  ),
  minutes: 10,
  skills: ['posture', 'tuning', 'strings', 'open-strings'],
  steps: [
    {
      kind: 'explain',
      title: L('Today’s lesson', 'השיעור של היום'),
      text: L(
        'Ten minutes, no chords yet. You will learn to hold the guitar, tune it, and play its six strings one by one while the teacher listens. A guitar has a body, a neck with metal strips called frets, and a head with a tuning peg for each string. Turning a peg tightens or loosens its string: tighter = higher.',
        'עשר דקות, עוד בלי אקורדים. תלמד להחזיק את הגיטרה, לכוון אותה, ולנגן את ששת המיתרים שלה אחד אחד כשהמורה מקשיב. לגיטרה יש גוף, צוואר עם פסי מתכת שנקראים סריגים, וראש עם מפתח כיוון לכל מיתר. סיבוב מפתח מותח או משחרר את המיתר שלו: מתוח יותר = גבוה יותר.'
      ),
    },
    {
      kind: 'checklist',
      skill: 'posture',
      title: L('Sit and hold the guitar', 'ישיבה ואחיזה'),
      text: L('Check each point with the guitar in your hands.', 'בדוק כל נקודה כשהגיטרה בידיים שלך.'),
      items: [
        L('Sit upright, the guitar’s waist on your right leg, the neck slightly raised.', 'שב זקוף, המותן של הגיטרה על הרגל הימנית, הצוואר מורם מעט.'),
        L('Your right forearm rests on the edge of the body; the hand hangs over the strings near the sound hole.', 'האמה הימנית נחה על קצה הגוף; כף היד תלויה מעל המיתרים ליד חור התהודה.'),
        L('Pick between the thumb and the side of the index finger, only its tip showing.', 'המפרט בין האגודל לצד של האצבע המורה, רק הקצה שלו בחוץ.'),
        L('Left-hand thumb behind the neck, shoulders loose.', 'אגודל יד שמאל מאחורי הצוואר, כתפיים רפויות.'),
      ],
    },
    {
      kind: 'tune',
      skill: 'tuning',
      title: L('Tune the guitar', 'כיוון הגיטרה'),
      text: L(
        'Press Start and pick one open string at a time, from the thickest. Turn its peg slowly until the meter is green. The tuner shows which string it hears — if a string is far off, it may name a different note; keep turning toward the one it should be.',
        'לחץ התחל ופרוט מיתר פתוח אחד בכל פעם, מהעבה ביותר. סובב את המפתח שלו לאט עד שהמד ירוק. הטיונר מראה איזה מיתר הוא שומע — אם מיתר רחוק מאוד, ייתכן שיופיע שם של צליל אחר; המשך לסובב לכיוון הצליל שהוא אמור להיות.'
      ),
    },
    {
      kind: 'arp',
      arp: 'open-strings',
      labels: 'note',
      title: L('The six strings', 'ששת המיתרים'),
      text: L(
        'From the thickest to the thinnest: E A D G B E. The thickest is string 6, the thinnest string 1 — chord diagrams and lessons use these numbers. Listen, then look at them on the neck below.',
        `מהעבה לדק: ${H('E A D G B E')}. העבה ביותר הוא מיתר 6, הדק ביותר מיתר 1 — דיאגרמות אקורדים ושיעורים משתמשים במספרים האלה. הקשב, ואז מצא אותם על הצוואר למטה.`
      ),
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
        'Strings are numbered from the thinnest: 1 is high E, 6 is low E.',
        `המיתרים ממוספרים מהדק: 1 הוא ${H('E')} גבוה, 6 הוא ${H('E')} נמוך.`
      ),
    },
    {
      kind: 'play',
      arp: 'open-strings',
      updown: true,
      skill: 'open-strings',
      title: L('Play them', 'נגן אותם'),
      text: L(
        'Press Listen and pick each string once with a small down stroke of the pick: 6 to 1, then back to 6. Let each one ring. The teacher moves on when it hears the right string — say its name as you play it.',
        'לחץ הקשב ופרוט כל מיתר פעם אחת בתנועה קטנה של המפרט כלפי מטה: מ־6 עד 1, ובחזרה עד 6. תן לכל אחד לצלצל. המורה מתקדם כשהוא שומע את המיתר הנכון — אמור את השם שלו כשאתה מנגן.'
      ),
    },
  ],
  homework: [
    { id: 'open-strings-hw', kind: 'play', arp: 'open-strings', updown: true, skill: 'open-strings', text: L('Every day: tune, then the six strings down and up with the teacher listening.', 'כל יום: כיוון, ואז ששת המיתרים למטה ולמעלה כשהמורה מקשיב.') },
  ],
};

const lessonCleanNotes = {
  id: 'g0-clean-notes',
  level: 0,
  title: L('One finger, a clean note', 'אצבע אחת, צליל נקי'),
  objective: L(
    'Press a string so the note rings clean, play six notes and a first melody.',
    'ללחוץ על מיתר כך שהצליל מצלצל נקי, לנגן שישה צלילים ומנגינה ראשונה.'
  ),
  minutes: 12,
  skills: ['clean-notes', 'finger-1234'],
  steps: [
    {
      kind: 'explain',
      title: L('How a fret works', 'איך עובד סריג'),
      text: L(
        'Pressing a string behind a fret makes it shorter, so the note goes up — one fret = one step up. In the first frets each finger has its own fret: index (1) on fret 1, middle (2) on fret 2, ring (3) on fret 3, pinky (4) on fret 4.',
        'לחיצה על מיתר מאחורי סריג מקצרת אותו, ולכן הצליל עולה — סריג אחד = צעד אחד למעלה. בשריגים הראשונים לכל אצבע יש שריג משלה: מורה (1) על שריג 1, אמה (2) על שריג 2, קמיצה (3) על שריג 3, זרת (4) על שריג 4.'
      ),
    },
    {
      kind: 'checklist',
      title: L('A clean note', 'צליל נקי'),
      text: L('Press fret 1 on string 1 with your index finger and pick it. Check:', 'לחץ על שריג 1 במיתר 1 עם האצבע המורה ופרוט. בדוק:'),
      items: [
        L('The very tip of the finger presses, the finger curved.', 'קצה האצבע לוחץ, והאצבע מעוגלת.'),
        L('Just behind the fret wire — not on it, not in the middle of the gap.', 'ממש מאחורי הסריג — לא עליו ולא באמצע המרווח.'),
        L('If it buzzes, move closer to the fret before pressing harder.', 'אם יש זמזום, התקרב לסריג לפני שאתה לוחץ חזק יותר.'),
        L('The thumb stays behind the neck, not squeezing.', 'האגודל נשאר מאחורי הצוואר, בלי ללחוץ.'),
      ],
    },
    {
      kind: 'arp',
      arp: 'notes-E',
      labels: 'finger',
      title: L('Three notes on string 1', 'שלושה צלילים על מיתר 1'),
      text: L(
        'E is the open string, F is fret 1 with finger 1, G is fret 3 with finger 3. The small number under each note is the finger.',
        `${H('E')} הוא המיתר הפתוח, ${H('F')} הוא שריג 1 באצבע 1, ${H('G')} הוא שריג 3 באצבע 3. המספר הקטן מתחת לכל צליל הוא האצבע.`
      ),
    },
    {
      kind: 'play',
      arp: 'notes-E',
      labels: 'finger',
      title: L('Play E F G F E', `נגן ${H('E F G F E')}`),
      text: L(
        'Slowly, one note at a time. Keep finger 1 down on F while you add finger 3 for G — then lift 3 to go back to F.',
        `לאט, צליל אחרי צליל. השאר את אצבע 1 על ${H('F')} כשאתה מוסיף את אצבע 3 ל־${H('G')} — ואז הרם את 3 כדי לחזור ל־${H('F')}.`
      ),
    },
    {
      kind: 'play',
      arp: 'notes-B',
      labels: 'finger',
      title: L('Same on string 2: B C D C B', `אותו דבר על מיתר 2: ${H('B C D C B')}`),
      text: L(
        'The same fingers one string up: B open, C at fret 1 (finger 1), D at fret 3 (finger 3).',
        `אותן אצבעות מיתר אחד למעלה: ${H('B')} פתוח, ${H('C')} בשריג 1 (אצבע 1), ${H('D')} בשריג 3 (אצבע 3).`
      ),
    },
    {
      kind: 'play',
      arp: 'ode',
      labels: 'finger',
      skill: 'clean-notes',
      title: L('Your first melody', 'המנגינה הראשונה שלך'),
      text: L(
        'Those six notes are enough for the start of Beethoven’s “Ode to Joy”. Press Hear first, then play along with the teacher listening. The repeated notes are just picked again.',
        `ששת הצלילים האלה מספיקים לפתיחה של "המנון לשמחה" של בטהובן. לחץ שמע קודם, ואז נגן כשהמורה מקשיב. צליל שחוזר פשוט נפרט שוב.`
      ),
    },
    {
      kind: 'arp',
      arp: 'spider-1',
      labels: 'finger',
      title: L('Wake up all four fingers', 'להעיר את כל ארבע האצבעות'),
      text: L(
        'A warm-up guitarists play for years: on string 1, fret 1 with finger 1, fret 2 with finger 2, fret 3 with 3, fret 4 with 4, and back. One finger per fret, the others hovering close to the string.',
        'חימום שגיטריסטים מנגנים שנים: על מיתר 1, שריג 1 באצבע 1, שריג 2 באצבע 2, שריג 3 ב־3, שריג 4 ב־4, ובחזרה. אצבע אחת לכל שריג, והאחרות מרחפות קרוב למיתר.'
      ),
    },
    {
      kind: 'play',
      arp: 'spider-1',
      labels: 'finger',
      skill: 'finger-1234',
      title: L('Play 1-2-3-4-3-2-1', `נגן ${H('1-2-3-4-3-2-1')}`),
      text: L('Slow and even. The pinky is the weak one — that is exactly why it is here.', 'לאט ובאופן אחיד. הזרת היא החלשה — ובדיוק בשביל זה היא כאן.'),
    },
  ],
  homework: [
    { id: 'ode-hw', kind: 'play', arp: 'ode', skill: 'clean-notes', text: L('“Ode to Joy” once a day with the teacher listening.', '"המנון לשמחה" פעם ביום כשהמורה מקשיב.') },
    { id: 'spider-hw', kind: 'play', arp: 'spider-1', skill: 'finger-1234', text: L('Fingers 1-2-3-4 and back, once a day.', `אצבעות ${H('1-2-3-4')} ובחזרה, פעם ביום.`) },
  ],
};

const lessonFirstChord = {
  id: 'g0-first-chord',
  level: 0,
  title: L('Your first chord: Em', `האקורד הראשון שלך: ${H('Em')}`),
  objective: L(
    'Play E minor with all six strings ringing and strum it in time.',
    `לנגן ${H('E')} מינור כשכל ששת המיתרים מצלצלים, ולפרוט אותו בזמן.`
  ),
  minutes: 12,
  skills: ['chord-Em', 'strum-down'],
  steps: [
    {
      kind: 'explain',
      title: L('A chord = notes together', 'אקורד = צלילים יחד'),
      shape: 'Em',
      text: L(
        'A chord is several notes sounding together. E minor needs only two fingers, both on fret 2: middle finger (2) on string 5, ring finger (3) on string 4. All six strings are played — the other four stay open.',
        `אקורד הוא כמה צלילים שנשמעים יחד. ${H('E')} מינור צריך רק שתי אצבעות, שתיהן על שריג 2: אמה (2) על מיתר 5, קמיצה (3) על מיתר 4. מנגנים את כל ששת המיתרים — ארבעת האחרים נשארים פתוחים.`
      ),
    },
    {
      kind: 'chord',
      chord: 'Em',
      title: L('Play Em', `נגן ${H('Em')}`),
      text: L(
        'First pick string by string, 6 to 1: every string should ring. A dead string usually means a finger is lying on it — stand the finger up on its tip. Then strum all six with one slow down stroke and press Listen.',
        'קודם פרוט מיתר אחרי מיתר, מ־6 עד 1: כל מיתר צריך לצלצל. מיתר מת אומר בדרך כלל שאצבע שוכבת עליו — העמד את האצבע על הקצה. אז פרוט את כל השישה בתנועה איטית אחת למטה ולחץ הקשב.'
      ),
    },
    {
      kind: 'quiz',
      id: 'em-strings',
      title: L('Which strings?', 'אילו מיתרים?'),
      question: L('Which strings do you strum for Em?', `אילו מיתרים פורטים ב־${H('Em')}?`),
      options: [L('All six', 'כל השישה'), L('Strings 5 to 1', 'מיתרים 5 עד 1'), L('Strings 4 to 1', 'מיתרים 4 עד 1')],
      answer: 0,
      why: L('Em starts on the open low E (string 6), its root — so all six ring.', `${H('Em')} מתחיל ב־${H('E')} הנמוך הפתוח (מיתר 6), היסוד שלו — לכן כל השישה מצלצלים.`),
    },
    {
      kind: 'explain',
      title: L('Strumming down', 'פריטה למטה'),
      text: L(
        'Strum from string 6 to string 1 in one even motion, mostly from the wrist, the pick loose enough to glide over the strings. Count out loud “1 2 3 4” and strum on every number.',
        'פורטים ממיתר 6 עד מיתר 1 בתנועה אחידה אחת, בעיקר מפרק היד, והמפרט רפוי מספיק כדי להחליק על המיתרים. ספור בקול "1 2 3 4" ופרוט על כל מספר.'
      ),
    },
    {
      kind: 'checklist',
      skill: 'strum-down',
      title: L('With the metronome', 'עם המטרונום'),
      text: L(
        'Open the metronome (the pill at the bottom of the screen, or in the top bar on a computer), set 60 and start it. Strum Em on every click.',
        'פתח את המטרונום (הכפתור בתחתית המסך, או בסרגל העליון במחשב), קבע 60 והפעל. פרוט ' + H('Em') + ' על כל נקישה.'
      ),
      items: [
        L('Four strums in a row land on the clicks.', 'ארבע פריטות ברצף נופלות על הנקישות.'),
        L('All strums sound equally loud.', 'כל הפריטות נשמעות באותה עוצמה.'),
        L('The shape stays pressed — no string dies along the way.', 'הצורה נשארת לחוצה — אף מיתר לא מת בדרך.'),
      ],
    },
    {
      kind: 'checklist',
      title: L('Lift and land', 'הרם והנח'),
      text: L(
        'Changing chords starts here: take both fingers off, then put them back as one shape and strum. Ten times, slowly.',
        'מעבר בין אקורדים מתחיל כאן: הרם את שתי האצבעות, החזר אותן כצורה אחת ופרוט. עשר פעמים, לאט.'
      ),
      items: [
        L('Both fingers land at the same moment.', 'שתי האצבעות נוחתות באותו רגע.'),
        L('Every string rings on the strum after landing.', 'כל המיתרים מצלצלים בפריטה אחרי הנחיתה.'),
      ],
    },
    {
      kind: 'explain',
      title: L('Next: D and A', `הבא: ${H('D')} ו־${H('A')}`),
      text: L(
        'You can hold a guitar, play clean notes and a full chord in time. The next lesson adds two chords, D and A, and switching between them — after that, the first songs.',
        `אתה כבר יודע להחזיק גיטרה, לנגן צלילים נקיים ואקורד מלא בזמן. השיעור הבא מוסיף שני אקורדים, ${H('D')} ו־${H('A')}, ומעבר ביניהם — ואחריו, השירים הראשונים.`
      ),
    },
  ],
  homework: [
    { id: 'em-hw', kind: 'self', text: L('Every day: build Em string by string until all six ring, then lift and land 10 times.', `כל יום: בנה ${H('Em')} מיתר אחרי מיתר עד שכל השישה מצלצלים, ואז הרם והנח 10 פעמים.`) },
    { id: 'strum-hw', kind: 'self', text: L('2 minutes: Em down strums on the click at 60.', `2 דקות: פריטות ${H('Em')} למטה על הנקישה ב־60.`) },
  ],
};

export const LESSONS = [
  lessonFirstNote,
  lessonCleanNotes,
  lessonFirstChord,
  lessonFirstChords,
  { id: 'g1-chord-E', level: 1, title: L('E chord and three-chord changes', `האקורד ${H('E')} ומעבר בין שלושה`), skills: ['chord-E', 'changes-AE', 'changes-DE'] },
  { id: 'g1-strumming', level: 1, title: L('Strumming in time', 'פריטה בזמן'), skills: ['strum-down'] },
  { id: 'g1-first-song', level: 1, title: L('Your first song', 'השיר הראשון שלך'), skills: [] },
  { id: 'g2-minor-chords', level: 2, title: L('Am, Em and Dm', `${H('Am')}, ${H('Em')} ו־${H('Dm')}`), skills: ['chord-Am', 'chord-Em', 'chord-Dm'] },
  { id: 'g2-G-C', level: 2, title: L('G and C', `${H('G')} ו־${H('C')}`), skills: ['chord-G', 'chord-C'] },
  lessonArpeggios,
  lessonTapping,
];

export const lessonById = (id) => LESSONS.find((l) => l.id === id);
