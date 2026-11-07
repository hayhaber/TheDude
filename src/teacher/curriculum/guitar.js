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

import { TRIAD_SKILLS } from './triads';

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
  Am: [0, 0, 2, 3, 1, 0],
  Dm: [0, 0, 0, 2, 3, 1],
  G: [2, 1, 0, 0, 0, 3],
  C: [0, 3, 2, 0, 1, 0],
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
  { id: 'tone-semitone', domain: 'fretboard', level: 0, title: L('Tone and semitone on the neck', 'טון וחצי טון על הצוואר'), check: { kind: 'quiz', id: 'tone-semitone' } },
  { id: 'clean-notes', domain: 'fretting', level: 0, after: ['open-strings'], title: L('Clean fretted notes: a first melody', 'צלילים נקיים: מנגינה ראשונה'), check: { kind: 'play', arp: 'ode' } },
  { id: 'finger-1234', domain: 'fretting', level: 0, title: L('Fingers 1-2-3-4 on one string', `אצבעות ${H('1-2-3-4')} על מיתר אחד`), check: { kind: 'play', arp: 'spider-1' } },
  { id: 'chord-D', domain: 'fretting', level: 1, after: ['posture'], title: L('D chord', `אקורד ${H('D')}`), check: { kind: 'chord', chord: 'D' } },
  { id: 'chord-A', domain: 'fretting', level: 1, after: ['posture'], title: L('A chord', `אקורד ${H('A')}`), check: { kind: 'chord', chord: 'A' } },
  { id: 'chord-E', domain: 'fretting', level: 1, after: ['posture'], title: L('E chord', `אקורד ${H('E')}`), check: { kind: 'chord', chord: 'E' } },
  { id: 'changes-AD', domain: 'fretting', level: 1, after: ['chord-D', 'chord-A'], title: L('A–D changes, 30 a minute', `החלפות ${H('A–D')}, 30 בדקה`), check: { kind: 'changes', pair: ['A', 'D'], min: 30 } },
  { id: 'changes-AE', domain: 'fretting', level: 1, after: ['chord-A', 'chord-E'], title: L('A–E changes, 30 a minute', `החלפות ${H('A–E')}, 30 בדקה`), check: { kind: 'changes', pair: ['A', 'E'], min: 30 } },
  { id: 'changes-DE', domain: 'fretting', level: 1, after: ['chord-D', 'chord-E'], title: L('D–E changes, 30 a minute', `החלפות ${H('D–E')}, 30 בדקה`), check: { kind: 'changes', pair: ['D', 'E'], min: 30 } },
  { id: 'strum-down', domain: 'rhythm', level: 0, title: L('Down strums in time', 'פריטה למטה בזמן'), check: { kind: 'self' } },
  { id: 'strum-eighths', domain: 'rhythm', level: 1, after: ['strum-down'], title: L('Down-up eighth strums', 'פריטות שמיניות למטה־למעלה'), check: { kind: 'self' } },
  { id: 'strum-pattern', domain: 'rhythm', level: 1, after: ['strum-eighths'], title: L('The common strum pattern', 'דפוס הפריטה הנפוץ'), check: { kind: 'self' } },
  { id: 'strum-change', domain: 'rhythm', level: 1, after: ['strum-pattern', 'changes-AD'], title: L('Changing chords without stopping the strum', 'החלפת אקורד בלי לעצור את הפריטה'), check: { kind: 'self' } },
  { id: 'song-chart', domain: 'repertoire', level: 1, title: L('Play a song from a chord chart', 'לנגן שיר מטבלת אקורדים'), check: { kind: 'self' } },
  { id: 'song-12bar', domain: 'repertoire', level: 1, after: ['changes-AE', 'changes-AD'], title: L('12-bar blues in A', `בלוז 12 תיבות ב־${H('A')}`), check: { kind: 'self' } },
  { id: 'chord-Am', domain: 'fretting', level: 2, after: ['chord-A'], title: L('Am chord', `אקורד ${H('Am')}`), check: { kind: 'chord', chord: 'Am' } },
  { id: 'chord-Em', domain: 'fretting', level: 0, title: L('Em chord', `אקורד ${H('Em')}`), check: { kind: 'chord', chord: 'Em' } },
  { id: 'chord-Dm', domain: 'fretting', level: 2, after: ['chord-D'], title: L('Dm chord', `אקורד ${H('Dm')}`), check: { kind: 'chord', chord: 'Dm' } },
  { id: 'chord-G', domain: 'fretting', level: 2, title: L('G chord', `אקורד ${H('G')}`), check: { kind: 'chord', chord: 'G' } },
  { id: 'chord-C', domain: 'fretting', level: 2, title: L('C chord', `אקורד ${H('C')}`), check: { kind: 'chord', chord: 'C' } },
  { id: 'changes-EAm', domain: 'fretting', level: 2, after: ['chord-E', 'chord-Am'], title: L('E–Am changes, 30 a minute', `החלפות ${H('E–Am')}, 30 בדקה`), check: { kind: 'changes', pair: ['E', 'Am'], min: 30 } },
  { id: 'changes-AmDm', domain: 'fretting', level: 2, after: ['chord-Am', 'chord-Dm'], title: L('Am–Dm changes, 30 a minute', `החלפות ${H('Am–Dm')}, 30 בדקה`), check: { kind: 'changes', pair: ['Am', 'Dm'], min: 30 } },
  { id: 'changes-GC', domain: 'fretting', level: 2, after: ['chord-G', 'chord-C'], title: L('G–C changes, 30 a minute', `החלפות ${H('G–C')}, 30 בדקה`), check: { kind: 'changes', pair: ['G', 'C'], min: 30 } },
  { id: 'changes-CAm', domain: 'fretting', level: 2, after: ['chord-C', 'chord-Am'], title: L('C–Am changes, 40 a minute', `החלפות ${H('C–Am')}, 40 בדקה`), check: { kind: 'changes', pair: ['C', 'Am'], min: 40 } },
  { id: 'song-G', domain: 'repertoire', level: 2, after: ['changes-GC'], title: L('A song in G: G, D, Em, C', `שיר ב־${H('G')}: ${H('G, D, Em, C')}`), check: { kind: 'self' } },
  { id: 'penta-shape', domain: 'lead', level: 2, title: L('A minor pentatonic, position 1', `פנטטוני ${H('A')} מינור, תנוחה 1`), check: { kind: 'play', arp: 'am-penta-1' } },
  { id: 'penta-roots', domain: 'fretboard', level: 2, title: L('The roots in the pentatonic box', 'היסודות בתיבה הפנטטונית'), check: { kind: 'quiz', id: 'penta-roots' } },
  { id: 'penta-improv', domain: 'lead', level: 2, after: ['penta-shape'], title: L('First improvisation over a blues', 'אלתור ראשון על בלוז'), check: { kind: 'self' } },
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

export const skillById = (id) => SKILLS.find((s) => s.id === id) ?? TRIAD_SKILLS.find((s) => s.id === id);

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
      metronome: 60,
      title: L('How to pick an arpeggio', 'איך פורטים ארפג׳יו'),
      text: L('The habits that make an arpeggio sound clean:', 'ההרגלים שגורמים לארפג׳יו להישמע נקי:'),
      items: [
        L('Start with alternate picking — down, up, down, up — one note per click at 60 bpm (Start below).', 'התחל בפריטה מתחלפת — למטה, למעלה, למטה, למעלה — צליל אחד בכל קליק ב־60 BPM (הפעל כאן למטה).'),
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
      metronome: 60,
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

// The very first lesson (2026-11-06, user-approved mockups on the Design
// canvas "יסודות הגיטרה — הדמיות"): the words and pictures every later lesson
// uses — parts of the guitar, string numbers, finger numbers, where to press,
// how the app draws the neck, how to read a chord diagram, strumming down and
// up. Each step is an animated picture (`kind: 'visual'`, BasicsVisual.jsx);
// nothing is measured. Skipped by anyone who already started another lesson.
const lessonBasics = {
  id: 'g0-basics',
  level: 0,
  onlyFirst: true,
  title: L('Meet the guitar', 'הכירו את הגיטרה'),
  objective: L(
    'Know the words and pictures every lesson uses: parts, strings, fingers, frets, the neck on screen, chord diagrams and strumming.',
    'להכיר את המילים והציורים שבכל שיעור: חלקי הגיטרה, המיתרים, האצבעות, השריגים, הצוואר במסך, שרטוט אקורד ופריטה.'
  ),
  minutes: 5,
  skills: [],
  steps: [
    {
      kind: 'visual',
      visual: 'parts',
      title: L('Meet the guitar', 'הכירו את הגיטרה'),
      text: L('Six words you will hear in every lesson. Each part lights up in turn.', 'שש מילים שתשמעו בכל שיעור. כל חלק נדלק בתורו.'),
    },
    {
      kind: 'visual',
      visual: 'strings',
      title: L('Six strings, six names', 'שישה מיתרים, שישה שמות'),
      text: L(
        'Strings are counted from the thinnest: string 1 is the thinnest, string 6 the thickest. With the guitar in your lap, the thickest is the one nearest you.',
        'סופרים מהדק אל העבה: מיתר 1 הוא הדק ביותר, מיתר 6 העבה. כשהגיטרה בחיקך, העבה הכי קרוב אליך.'
      ),
    },
    {
      kind: 'visual',
      visual: 'fingers',
      title: L('Every finger has a number', 'לכל אצבע מספר'),
      text: L(
        'On the hand that presses the strings (the left hand for most people) the fingers are numbered 1 to 4, from the index to the pinky. “Finger 2 on fret 2” means the middle finger.',
        `ביד שלוחצת על הצוואר (השמאלית אצל רוב האנשים) האצבעות ממוספרות ${H('1')} עד ${H('4')}, מהמורה אל הזרת. „אצבע ${H('2')} על שריג ${H('2')}” — זו האמה.`
      ),
    },
    {
      kind: 'visual',
      visual: 'fret',
      title: L('Where exactly to press', 'איפה בדיוק לוחצים'),
      text: L(
        '“Fret 2” = press with the fingertip just before the 2nd metal strip, on the head’s side — not on it and not in the middle.',
        `„שריג ${H('2')}” = לוחצים בקצה האצבע ממש לפני פס המתכת השני, בצד של הראש — לא עליו ולא באמצע.`
      ),
    },
    {
      kind: 'visual',
      visual: 'neck',
      stage: 'Em',
      title: L('The neck on screen = the guitar in your lap', 'הצוואר במסך = הגיטרה שבחיקך'),
      text: L(
        'The app draws the neck the way you see it when you look down at it while playing: the head on the left, the thin string at the top, the thick one at the bottom.',
        'הצוואר באפליקציה מצויר כמו שאתם רואים אותו כשמביטים עליו מלמעלה תוך כדי נגינה: הראש משמאל, המיתר הדק למעלה, העבה למטה.'
      ),
    },
    {
      kind: 'visual',
      visual: 'diagram',
      stage: 'Em',
      title: L('A chord diagram = the neck standing up', 'שרטוט אקורד = הצוואר בעמידה'),
      text: L(
        'Turn the neck a quarter turn: the head goes up and the thick string moves to the left.',
        'מסובבים את הצוואר רבע סיבוב: הראש עולה למעלה, והמיתר העבה עובר לשמאל.'
      ),
    },
    {
      kind: 'visual',
      visual: 'strum',
      title: L('Strumming down and up', 'פריטה למטה ולמעלה'),
      text: L(
        '↓ Down = from the thick string to the thin one, toward the floor. ↑ Up = back. The hand keeps moving all the time, like a pendulum.',
        '↓ למטה = מהמיתר העבה אל הדק, לכיוון הרצפה. ↑ למעלה = חזרה. היד זזה כל הזמן, כמו מטוטלת.'
      ),
    },
  ],
};

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
        'Ten minutes, no chords yet. You will learn to hold the guitar, tune it, and play its six strings one by one while the teacher listens. Each string has a tuning peg on the head: turning it tightens or loosens the string — tighter = higher.',
        'עשר דקות, עוד בלי אקורדים. תלמד להחזיק את הגיטרה, לכוון אותה, ולנגן את ששת המיתרים שלה אחד אחד כשהמורה מקשיב. לכל מיתר יש מפתח כיוון בראש: סיבוב המפתח מותח או משחרר את המיתר — מתוח יותר = גבוה יותר.'
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
  title: L('Notes on the neck: tone and semitone', 'הצלילים על הצוואר: טון וחצי טון'),
  objective: L(
    'Know the musical alphabet, how far a semitone and a tone are on the neck, and play clean notes and a first melody.',
    'להכיר את האלפבית המוזיקלי, לדעת כמה רחוק חצי טון וטון על הצוואר, ולנגן צלילים נקיים ומנגינה ראשונה.'
  ),
  minutes: 15,
  skills: ['tone-semitone', 'clean-notes', 'finger-1234'],
  steps: [
    {
      kind: 'explain',
      title: L('The musical alphabet', 'האלפבית המוזיקלי'),
      text: L(
        'Music uses seven letters: A B C D E F G, then A again, higher. Between most neighbours there is one more note, named with a sharp (♯, higher) or a flat (♭, lower): between F and G sits F♯. Two pairs have nothing between them: E–F and B–C. Twelve notes in all, then the circle starts again an octave higher.',
        `במוזיקה יש שבע אותיות: ${H('A B C D E F G')}, ואז שוב ${H('A')}, גבוה יותר. בין רוב השכנים יש עוד צליל אחד, שנקרא בדיאז (${H('♯')}, גבוה יותר) או במול (${H('♭')}, נמוך יותר): בין ${H('F')} ל־${H('G')} נמצא ${H('F♯')}. לשני זוגות אין שום דבר ביניהם: ${H('E–F')} ו־${H('B–C')}. סך הכול שנים־עשר צלילים, ואז המעגל מתחיל שוב אוקטבה גבוה יותר.`
      ),
    },
    {
      kind: 'arp',
      arp: 'string1-chrom',
      labels: 'note',
      title: L('Semitone and tone', 'חצי טון וטון'),
      text: L(
        'On the guitar every fret is a SEMITONE — the smallest step. Two frets are a TONE. Look at string 1: E (open) to F is one fret, a semitone; F to G is two frets, a tone. The small number under each note is its fret. Press Hear: six notes, each a semitone above the last.',
        `בגיטרה כל שריג הוא חצי טון — הצעד הקטן ביותר. שני שריגים הם טון. הסתכל על מיתר 1: מ־${H('E')} (פתוח) ל־${H('F')} זה שריג אחד, חצי טון; מ־${H('F')} ל־${H('G')} שני שריגים, טון. המספר הקטן מתחת לכל צליל הוא השריג שלו. לחץ שמע: שישה צלילים, כל אחד חצי טון מעל הקודם.`
      ),
    },
    {
      kind: 'quiz',
      id: 'tone-semitone',
      skill: 'tone-semitone',
      title: L('Find G', `מצא את ${H('G')}`),
      question: L('F is at fret 1 on string 1. G is a tone above F — at which fret?', `${H('F')} נמצא בשריג 1 על מיתר 1. ${H('G')} נמצא טון מעל ${H('F')} — באיזה שריג?`),
      options: [L('Fret 2', 'שריג 2'), L('Fret 3', 'שריג 3'), L('Fret 4', 'שריג 4')],
      answer: 1,
      why: L(
        'A tone = two frets: 1 + 2 = fret 3. Fret 2 is F♯, a semitone above F.',
        `טון = שני שריגים: 1 + 2 = שריג 3. בשריג 2 נמצא ${H('F♯')}, חצי טון מעל ${H('F')}.`
      ),
    },
    {
      kind: 'quiz',
      id: 'b-c',
      title: L('B to C', `מ־${H('B')} ל־${H('C')}`),
      question: L('String 2 is B. How far is C?', `מיתר 2 הוא ${H('B')}. כמה רחוק ${H('C')}?`),
      options: [L('A semitone — fret 1', 'חצי טון — שריג 1'), L('A tone — fret 2', 'טון — שריג 2')],
      answer: 0,
      why: L(
        'B–C is one of the two pairs with no note between them (with E–F), so C is only one fret up.',
        `${H('B–C')} הוא אחד משני הזוגות שאין ביניהם צליל (יחד עם ${H('E–F')}), ולכן ${H('C')} נמצא שריג אחד למעלה.`
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
        L('One finger per fret: index on fret 1, middle on 2, ring on 3, pinky on 4.', 'אצבע לכל שריג: מורה על שריג 1, אמה על 2, קמיצה על 3, זרת על 4.'),
      ],
    },
    {
      kind: 'play',
      arp: 'notes-E',
      labels: 'finger',
      title: L('Play E F G F E', `נגן ${H('E F G F E')}`),
      text: L(
        'E open, F at fret 1 (a semitone up, finger 1), G at fret 3 (a tone above F, finger 3). Keep finger 1 down on F while you add finger 3 — then lift 3 to go back to F.',
        `${H('E')} פתוח, ${H('F')} בשריג 1 (חצי טון למעלה, אצבע 1), ${H('G')} בשריג 3 (טון מעל ${H('F')}, אצבע 3). השאר את אצבע 1 על ${H('F')} כשאתה מוסיף את אצבע 3 — ואז הרם את 3 כדי לחזור ל־${H('F')}.`
      ),
    },
    {
      kind: 'play',
      arp: 'notes-B',
      labels: 'finger',
      title: L('Same on string 2: B C D C B', `אותו דבר על מיתר 2: ${H('B C D C B')}`),
      text: L(
        'B open, C at fret 1 (B–C is a semitone), D at fret 3 (a tone above C).',
        `${H('B')} פתוח, ${H('C')} בשריג 1 (${H('B–C')} הוא חצי טון), ${H('D')} בשריג 3 (טון מעל ${H('C')}).`
      ),
    },
    {
      kind: 'play',
      arp: 'ode',
      labels: 'finger',
      skill: 'clean-notes',
      title: L('Your first melody', 'המנגינה הראשונה שלך'),
      text: L(
        'Those six notes are enough for the start of Beethoven’s “Ode to Joy”. Press Hear first, then play along with the teacher listening. A repeated note is just picked again.',
        'ששת הצלילים האלה מספיקים לפתיחה של "המנון לשמחה" של בטהובן. לחץ שמע קודם, ואז נגן כשהמורה מקשיב. צליל שחוזר פשוט נפרט שוב.'
      ),
    },
    {
      kind: 'arp',
      arp: 'spider-1',
      labels: 'finger',
      title: L('Four semitones, four fingers', 'ארבעה חצאי טון, ארבע אצבעות'),
      text: L(
        'A warm-up guitarists play for years: frets 1-2-3-4 on string 1 with fingers 1-2-3-4, and back — four notes, each a semitone apart. The other fingers hover close to the string.',
        `חימום שגיטריסטים מנגנים שנים: שריגים ${H('1-2-3-4')} על מיתר 1 באצבעות ${H('1-2-3-4')}, ובחזרה — ארבעה צלילים, כל אחד חצי טון מהקודם. האצבעות האחרות מרחפות קרוב למיתר.`
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
        'A chord is three or more notes sounding together. E minor has three: E (the root, which names the chord), G (the minor 3rd — three semitones above E, which makes it sad-sounding “minor”) and B (the 5th, seven semitones above E). On the guitar it needs only two fingers, both on fret 2: middle finger (2) on string 5, ring finger (3) on string 4. All six strings are played — together they sound E B E G B E.',
        `אקורד הוא שלושה צלילים או יותר שנשמעים יחד. ל־${H('E')} מינור יש שלושה: ${H('E')} (היסוד, שנותן לאקורד את שמו), ${H('G')} (הטרצה הקטנה — שלושה חצאי טון מעל ${H('E')}, היא שעושה אותו "מינור", עצוב יותר) ו־${H('B')} (הקווינטה, שבעה חצאי טון מעל ${H('E')}). בגיטרה הוא צריך רק שתי אצבעות, שתיהן על שריג 2: אמה (2) על מיתר 5, קמיצה (3) על מיתר 4. מנגנים את כל ששת המיתרים — יחד הם נשמעים ${H('E B E G B E')}.`
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
      metronome: 60,
      title: L('With the metronome', 'עם המטרונום'),
      text: L(
        'Press Start below: the metronome clicks at 60. Strum Em on every click.',
        'לחץ הפעל כאן למטה: המטרונום מקיש ב־' + H('60') + '. פרוט ' + H('Em') + ' על כל נקישה.'
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

// ---------------------------------------------------------------------------
// LEVEL 1 (RSL Debut), written 2026-11-07. Method: JustinGuitar's beginner
// course order — D, A, then E; one-minute changes for each new pair; then
// strumming built on a hand that never stops (down on the numbers, up on
// "and"), quarter notes -> eighths -> the common pop pattern; then a first
// song from a chord chart and the 12-bar blues (I–IV–V in A) — the Debut
// grade's rhythm work in 4/4 with quarter and eighth strums. Text is our own.
// ---------------------------------------------------------------------------

const lessonChordE = {
  id: 'g1-chord-E',
  level: 1,
  title: L('E chord and three-chord changes', `האקורד ${H('E')} ומעבר בין שלושה`),
  objective: L(
    'Play E with all six strings ringing and change between A, D and E.',
    `לנגן ${H('E')} כשכל ששת המיתרים מצלצלים, ולעבור בין ${H('A')}, ${H('D')} ו־${H('E')}.`
  ),
  minutes: 20,
  skills: ['chord-E', 'changes-AE', 'changes-DE'],
  steps: [
    {
      kind: 'explain',
      title: L('Today’s lesson', 'השיעור של היום'),
      text: L(
        'One new chord, E — and with it you have A, D and E: the three main chords of the key of A. Hundreds of songs use only these three.',
        `אקורד חדש אחד, ${H('E')} — ואיתו יש לך ${H('A')}, ${H('D')} ו־${H('E')}: שלושת האקורדים העיקריים של סולם ${H('A')}. מאות שירים משתמשים רק בשלושה האלה.`
      ),
    },
    {
      kind: 'explain',
      title: L('E = Em plus one finger', `${H('E')} = ${H('Em')} ועוד אצבע אחת`),
      shape: 'E',
      text: L(
        'You already know Em: middle finger (2) on string 5, ring finger (3) on string 4, both at fret 2. Keep them and add the index finger (1) on string 3, fret 1. That finger turns G into G♯ — the minor 3rd becomes the major 3rd. E major = E (the root), G♯ (the major 3rd) and B (the 5th). All six strings are played.',
        `את ${H('Em')} אתה כבר מכיר: אמה (2) על מיתר 5, קמיצה (3) על מיתר 4, שתיהן בשריג 2. השאר אותן והוסף את האצבע המורה (1) על מיתר 3, שריג 1. האצבע הזו הופכת את ${H('G')} ל־${H('G♯')} — הטרצה הקטנה הופכת לטרצה גדולה. ${H('E')} מז׳ור = ${H('E')} (היסוד), ${H('G♯')} (הטרצה הגדולה) ו־${H('B')} (הקווינטה). מנגנים את כל ששת המיתרים.`
      ),
    },
    {
      kind: 'chord',
      chord: 'E',
      title: L('Play E', `נגן ${H('E')}`),
      text: L(
        'Pick string by string from 6 to 1 — every string rings. If string 2 or 1 is dead, the index finger is leaning on it: arch it and press with its very tip. Then strum and let the teacher listen.',
        'פרוט מיתר אחרי מיתר מ־6 עד 1 — כל מיתר מצלצל. אם מיתר 2 או 1 מת, האצבע המורה נשענת עליו: קשת אותה ולחץ עם הקצה ממש. אחר כך פרוט ותן למורה להקשיב.'
      ),
    },
    {
      kind: 'quiz',
      id: 'em-to-e',
      title: L('Minor to major', 'ממינור למז׳ור'),
      question: L('What makes E different from Em?', `מה מבדיל בין ${H('E')} ל־${H('Em')}?`),
      options: [
        L('The index finger on string 3, fret 1 — it raises the 3rd by a semitone', 'האצבע המורה על מיתר 3, שריג 1 — היא מעלה את הטרצה בחצי טון'),
        L('E is played on five strings only', `את ${H('E')} מנגנים רק על חמישה מיתרים`),
        L('The whole shape moves up one fret', 'כל הצורה זזה שריג אחד למעלה'),
      ],
      answer: 0,
      why: L(
        'Em has G, the minor 3rd. Pressing string 3 at fret 1 makes it G♯, the major 3rd — root and 5th stay the same. One semitone changes the whole colour of the chord.',
        `ב־${H('Em')} יש ${H('G')}, הטרצה הקטנה. לחיצה על מיתר 3 בשריג 1 הופכת אותו ל־${H('G♯')}, הטרצה הגדולה — היסוד והקווינטה נשארים. חצי טון אחד משנה את כל הצבע של האקורד.`
      ),
    },
    {
      kind: 'explain',
      title: L('Changing to E', `המעבר ל־${H('E')}`),
      text: L(
        'D to E: the index finger stays on string 3 — it just slides back from fret 2 to fret 1 while the other two fingers jump to strings 5 and 4. Keep it lightly touching the string: it is your guide finger. A to E: no finger stays, so move the shape as one — look at it in the air before you land, then press all three together.',
        `מ־${H('D')} ל־${H('E')}: האצבע המורה נשארת על מיתר 3 — היא רק מחליקה אחורה משריג 2 לשריג 1, ושתי האצבעות האחרות קופצות למיתרים 5 ו־4. השאר אותה נוגעת קלות במיתר: היא אצבע המנחה שלך. מ־${H('A')} ל־${H('E')}: אף אצבע לא נשארת, אז הזז את הצורה כיחידה אחת — ראה אותה באוויר לפני הנחיתה, ולחץ את שלוש האצבעות יחד.`
      ),
    },
    {
      kind: 'changes',
      pair: ['A', 'E'],
      title: L('One-minute changes: A and E', `החלפות בדקה: ${H('A')} ו־${H('E')}`),
      text: L(
        'One strum on A, one on E, for 60 seconds. Clean first, fast later.',
        `פריטה אחת על ${H('A')}, אחת על ${H('E')}, במשך 60 שניות. קודם נקי, מהר אחר כך.`
      ),
    },
    {
      kind: 'changes',
      pair: ['D', 'E'],
      title: L('One-minute changes: D and E', `החלפות בדקה: ${H('D')} ו־${H('E')}`),
      text: L(
        'Now D and E. Remember the guide finger on string 3.',
        `עכשיו ${H('D')} ו־${H('E')}. זכור את אצבע המנחה על מיתר 3.`
      ),
    },
    {
      kind: 'explain',
      title: L('Why these three?', 'למה דווקא שלושה אלה?'),
      text: L(
        'In the key of A, A is the I chord — the tonic, home. D is the IV — the subdominant, a step away. E is the V — the dominant: it leans back towards home, so a song often ends E → A. Next lesson: strumming, so these chords become music.',
        `בסולם ${H('A')}, ${H('A')} הוא האקורד ${H('I')} — הטוניקה, הבית. ${H('D')} הוא ${H('IV')} — הסובדומיננטה, צעד החוצה. ${H('E')} הוא ${H('V')} — הדומיננטה: הוא נמשך בחזרה הביתה, ולכן שיר נגמר הרבה פעמים ב־${H('E → A')}. בשיעור הבא: פריטה, כדי שהאקורדים יהפכו למוזיקה.`
      ),
    },
  ],
  homework: [
    { id: 'ae-changes', kind: 'changes', pair: ['A', 'E'], min: 30, perDay: 1, text: L('One-minute changes A–E, once a day. Goal: 30.', `החלפות בדקה ${H('A–E')}, פעם ביום. יעד: 30.`) },
    { id: 'de-changes', kind: 'changes', pair: ['D', 'E'], min: 30, perDay: 1, text: L('One-minute changes D–E, once a day. Goal: 30.', `החלפות בדקה ${H('D–E')}, פעם ביום. יעד: 30.`) },
    { id: 'e-check', kind: 'self', text: L('Every day: build E string by string until all six ring.', `כל יום: בנה ${H('E')} מיתר אחרי מיתר עד שכל השישה מצלצלים.`) },
  ],
};

const lessonStrumming = {
  id: 'g1-strumming',
  level: 1,
  title: L('Strumming in time', 'פריטה בזמן'),
  objective: L(
    'Keep the strumming hand moving down and up in time, play the common strum pattern and change chords without stopping.',
    'להחזיק את יד הפריטה בתנועה למטה ולמעלה בזמן, לנגן את דפוס הפריטה הנפוץ ולהחליף אקורד בלי לעצור.'
  ),
  minutes: 20,
  skills: ['strum-down', 'strum-eighths', 'strum-pattern', 'strum-change'],
  steps: [
    {
      kind: 'explain',
      title: L('The hand that never stops', 'היד שלא עוצרת'),
      text: L(
        'Good rhythm comes from one habit: the strumming hand swings like a pendulum — down on every number (1 2 3 4), up on every “and” between them — all the time, whether it hits the strings or not. The hand keeps the time; the pattern only decides which swings touch the strings.',
        'קצב טוב בא מהרגל אחד: יד הפריטה מתנדנדת כמו מטוטלת — למטה על כל מספר (1 2 3 4), למעלה על כל "ו" ביניהם — כל הזמן, בין אם היא פוגעת במיתרים ובין אם לא. היד מחזיקה את הזמן; הדפוס רק קובע אילו תנועות נוגעות במיתרים.'
      ),
    },
    {
      kind: 'checklist',
      skill: 'strum-down',
      metronome: 70,
      title: L('Quarter notes: down on the beat', 'רבעים: למטה על הפעמה'),
      text: L('Hold A. Strum down on every click; let the hand come back up between clicks without touching the strings.', `החזק ${H('A')}. פרוט למטה על כל נקישה; תן ליד לחזור למעלה בין הנקישות בלי לגעת במיתרים.`),
      strum: { pattern: 'D-D-D-D-', chord: 'A' },
      items: [
        L('Every down strum lands on a click.', 'כל פריטה למטה נוחתת על נקישה.'),
        L('The hand moves the whole time — it doesn’t freeze between strums.', 'היד זזה כל הזמן — היא לא קופאת בין הפריטות.'),
      ],
    },
    {
      kind: 'checklist',
      skill: 'strum-eighths',
      metronome: 60,
      title: L('Eighth notes: down and up', 'שמיניות: למטה ולמעלה'),
      text: L(
        'Same swing, now the up stroke touches the strings too: down on the number, up on “and”. Count out loud “1 and 2 and 3 and 4 and”. The up stroke catches only the thinner strings — that is right.',
        'אותה תנועה, עכשיו גם התנועה למעלה נוגעת במיתרים: למטה על המספר, למעלה על "ו". ספור בקול "1 ו 2 ו 3 ו 4 ו". התנועה למעלה תופסת רק את המיתרים הדקים — זה נכון.'
      ),
      strum: { pattern: 'DUDUDUDU', chord: 'A' },
      items: [
        L('Eight even strums per bar, two per click.', 'שמונה פריטות שוות בתיבה, שתיים בכל נקישה.'),
        L('The down strums on the numbers sound a little stronger.', 'הפריטות למטה על המספרים חזקות מעט יותר.'),
      ],
    },
    {
      kind: 'checklist',
      skill: 'strum-pattern',
      metronome: 60,
      groove: 'rock',
      title: L('The common strum pattern', 'דפוס הפריטה הנפוץ'),
      text: L(
        'Down, down-up, up-down-up: 1, 2 &, & 4 &. The hand still swings eight times a bar — it just misses the strings on the “and” after 1 and on 3. Hear it first, then play along. This one pattern fits a huge number of pop and rock songs.',
        'למטה, למטה־למעלה, למעלה־למטה־למעלה: 1, 2 ו, ו 4 ו. היד עדיין מתנדנדת שמונה פעמים בתיבה — היא רק מחטיאה את המיתרים על ה"ו" שאחרי 1 ועל 3. קודם שמע, אחר כך נגן יחד. הדפוס האחד הזה מתאים למספר עצום של שירי פופ ורוק.'
      ),
      strum: { pattern: 'D-DU-UDU', chord: 'A' },
      items: [
        L('Four bars in a row without stopping.', 'ארבע תיבות ברצף בלי לעצור.'),
        L('On beat 3 the hand passes down over the strings without touching them.', 'בפעמה 3 היד עוברת למטה מעל המיתרים בלי לגעת בהם.'),
        L('It still feels like the click is in the right place.', 'עדיין מרגיש שהנקישה במקום הנכון.'),
      ],
    },
    {
      kind: 'explain',
      title: L('Changing without stopping', 'להחליף בלי לעצור'),
      text: L(
        'The secret of changing in time: the very last up strum of the bar (the “and” of 4) is played on open strings while the fingers are already moving to the next chord. Nobody hears it — but the time never breaks. Land the new chord on the next “1”.',
        'הסוד של החלפה בזמן: הפריטה האחרונה למעלה בתיבה (ה"ו" של 4) מנוגנת על מיתרים פתוחים בזמן שהאצבעות כבר זזות לאקורד הבא. אף אחד לא שומע את זה — אבל הזמן לא נשבר. נחת על האקורד החדש ב"1" הבא.'
      ),
    },
    {
      kind: 'checklist',
      skill: 'strum-change',
      metronome: 60,
      title: L('A, D, A, E — one bar each', `${H('A, D, A, E')} — תיבה לכל אחד`),
      text: L('The common pattern, one bar per chord, round and round. Hear it first.', 'הדפוס הנפוץ, תיבה לכל אקורד, שוב ושוב. קודם שמע.'),
      chart: { bars: ['A', 'D', 'A', 'E'], pattern: 'D-DU-UDU' },
      items: [
        L('The strumming hand never stops, even during the change.', 'יד הפריטה לא עוצרת אף פעם, גם בזמן ההחלפה.'),
        L('Each new chord rings on the “1”.', 'כל אקורד חדש מצלצל ב"1".'),
        L('Three times round without a break.', 'שלושה סיבובים בלי הפסקה.'),
      ],
    },
  ],
  homework: [
    { id: 'strum-hw', kind: 'self', text: L('3 minutes a day: the common pattern on A at 60, then on the A–D–A–E loop.', `3 דקות ביום: הדפוס הנפוץ על ${H('A')} ב־60, ואז על הלולאה ${H('A–D–A–E')}.`) },
    { id: 'strum-speed', kind: 'self', text: L('When it is easy at 60, move the metronome up by 5 — never more.', 'כשזה קל ב־60, העלה את המטרונום ב־5 — לא יותר.') },
  ],
};

const lessonFirstSong = {
  id: 'g1-first-song',
  level: 1,
  title: L('Your first song', 'השיר הראשון שלך'),
  objective: L(
    'Read a chord chart and play two songs with A, D and E: an 8-bar song and the 12-bar blues.',
    `לקרוא טבלת אקורדים ולנגן שני שירים עם ${H('A')}, ${H('D')} ו־${H('E')}: שיר של 8 תיבות והבלוז של 12 תיבות.`
  ),
  minutes: 25,
  skills: ['song-chart', 'song-12bar'],
  steps: [
    {
      kind: 'explain',
      title: L('Reading a chord chart', 'לקרוא טבלת אקורדים'),
      text: L(
        'A chord chart shows a song as boxes: each box is one bar — four beats — and the chord written in it is held for the whole bar. Read left to right, row by row, like text in English. This song is ours, written for this lesson: two lines of four bars.',
        'טבלת אקורדים מציגה שיר כקופסאות: כל קופסה היא תיבה אחת — ארבע פעמות — והאקורד שכתוב בה מוחזק לאורך כל התיבה. קוראים משמאל לימין, שורה אחרי שורה, כמו טקסט באנגלית. השיר הזה שלנו, נכתב לשיעור הזה: שתי שורות של ארבע תיבות.'
      ),
      chart: { bars: ['A', 'A', 'D', 'A', 'A', 'E', 'D', 'A'], bpm: 70 },
    },
    {
      kind: 'checklist',
      skill: 'song-chart',
      metronome: 70,
      title: L('Play the 8-bar song', 'נגן את השיר של 8 התיבות'),
      text: L('Down strums on every beat first. When it flows, use the common pattern at 60.', 'קודם פריטה למטה על כל פעמה. כשזה זורם, השתמש בדפוס הנפוץ ב־60.'),
      chart: { bars: ['A', 'A', 'D', 'A', 'A', 'E', 'D', 'A'] },
      items: [
        L('All eight bars without stopping.', 'כל שמונה התיבות בלי לעצור.'),
        L('Every change lands on the “1” of its bar.', 'כל החלפה נוחתת ב"1" של התיבה שלה.'),
        L('Twice through in a row.', 'פעמיים ברצף.'),
      ],
    },
    {
      kind: 'explain',
      title: L('The 12-bar blues', 'הבלוז של 12 תיבות'),
      text: L(
        'The most played song form there is — blues, rock ’n’ roll, a thousand hits. Twelve bars, three chords: four bars of A (I, home), two of D (IV), two of A, then E (V) – D (IV) – A (I), and the last bar is E: the dominant that pulls you back to the top. Hear it.',
        `תבנית השיר הכי מנוגנת שיש — בלוז, רוקנרול, אלף להיטים. שתים־עשרה תיבות, שלושה אקורדים: ארבע תיבות של ${H('A')} (${H('I')}, הבית), שתיים של ${H('D')} (${H('IV')}), שתיים של ${H('A')}, ואז ${H('E')} (${H('V')}) – ${H('D')} (${H('IV')}) – ${H('A')} (${H('I')}), והתיבה האחרונה היא ${H('E')}: הדומיננטה שמושכת אותך חזרה להתחלה. שמע.`
      ),
      chart: { bars: ['A', 'A', 'A', 'A', 'D', 'D', 'A', 'A', 'E', 'D', 'A', 'E'], bpm: 80 },
    },
    {
      kind: 'quiz',
      id: 'blues-bar9',
      title: L('Know the form', 'להכיר את התבנית'),
      question: L('In the 12-bar blues in A, which chord is in bar 9?', `בבלוז של 12 תיבות ב־${H('A')}, איזה אקורד בתיבה 9?`),
      options: [L('E — the V', `${H('E')} — ה־${H('V')}`), L('D — the IV', `${H('D')} — ה־${H('IV')}`), L('A — the I', `${H('A')} — ה־${H('I')}`)],
      answer: 0,
      why: L(
        'Bars 9–12 are V – IV – I – V: the tension (E), a step back (D), home (A), and E again to start the next round.',
        `תיבות 9–12 הן ${H('V – IV – I – V')}: המתח (${H('E')}), צעד אחורה (${H('D')}), הבית (${H('A')}), ושוב ${H('E')} כדי להתחיל סיבוב חדש.`
      ),
    },
    {
      kind: 'checklist',
      skill: 'song-12bar',
      metronome: 80,
      groove: 'blues',
      title: L('Play the blues with the drums', 'נגן את הבלוז עם התופים'),
      text: L(
        'Down strums on every beat, with the drums (or the click). Say the bar numbers in your head — after a few rounds the form plays itself.',
        'פריטה למטה על כל פעמה, עם התופים (או הנקישה). ספור את מספרי התיבות בראש — אחרי כמה סיבובים התבנית מתנגנת לבד.'
      ),
      chart: { bars: ['A', 'A', 'A', 'A', 'D', 'D', 'A', 'A', 'E', 'D', 'A', 'E'] },
      items: [
        L('Twelve bars without getting lost.', 'שתים־עשרה תיבות בלי ללכת לאיבוד.'),
        L('Two rounds in a row.', 'שני סיבובים ברצף.'),
        L('The changes to E and back are on time.', `ההחלפות ל־${H('E')} ובחזרה בזמן.`),
      ],
    },
    {
      kind: 'explain',
      title: L('Level 1 done', 'רמה 1 הושלמה'),
      text: L(
        'Three chords, strumming in time, a song from a chart and the blues — that is the Debut grade. Next level: the minor chords Am, Em and Dm, then G and C, and with them most of the songs you know.',
        `שלושה אקורדים, פריטה בזמן, שיר מטבלה והבלוז — זו רמת הפתיחה. ברמה הבאה: אקורדי המינור ${H('Am')}, ${H('Em')} ו־${H('Dm')}, אחר כך ${H('G')} ו־${H('C')}, ואיתם רוב השירים שאתה מכיר.`
      ),
    },
  ],
  homework: [
    { id: 'blues-hw', kind: 'self', text: L('Once a day: the 12-bar blues twice through with the drums.', 'פעם ביום: הבלוז של 12 תיבות פעמיים ברצף עם התופים.') },
    { id: 'song-hw', kind: 'self', text: L('Once a day: the 8-bar song with the common pattern.', 'פעם ביום: השיר של 8 התיבות עם הדפוס הנפוץ.') },
  ],
};

// ---------------------------------------------------------------------------
// LEVEL 2 (RSL Grade 1), written 2026-11-07. Method: JustinGuitar's next
// stage — the minor chords Am, Em, Dm (each the major's "sister": one finger
// moves the 3rd down a semitone), then G and C with the anchor-finger change
// C–Am, songs in G (I–V–vi–IV), then the first scale: A minor pentatonic
// position 1, one finger per fret, played up and down to the click, roots
// named, and a first improvisation over the 12-bar blues — the Grade 1
// syllabus's open chords + one scale. Text is our own.
// ---------------------------------------------------------------------------

const lessonMinorChords = {
  id: 'g2-minor-chords',
  level: 2,
  title: L('Am, Em and Dm', `${H('Am')}, ${H('Em')} ו־${H('Dm')}`),
  objective: L(
    'Play the three open minor chords and hear the difference between major and minor.',
    'לנגן את שלושת אקורדי המינור הפתוחים ולשמוע את ההבדל בין מז׳ור למינור.'
  ),
  minutes: 25,
  skills: ['chord-Am', 'chord-Em', 'chord-Dm', 'changes-EAm', 'changes-AmDm'],
  steps: [
    {
      kind: 'explain',
      title: L('Major and minor', 'מז׳ור ומינור'),
      text: L(
        'A major chord and its minor share the root and the 5th — only the 3rd changes, one semitone lower in minor. That single note turns bright into dark. You met it already: E → Em lifts one finger. Today: Am, a new look at Em, and Dm.',
        `אקורד מז׳ור והמינור שלו חולקים את היסוד ואת הקווינטה — רק הטרצה משתנה, חצי טון נמוכה יותר במינור. הצליל האחד הזה הופך בהיר לכהה. כבר פגשת את זה: ${H('E → Em')} מרים אצבע אחת. היום: ${H('Am')}, מבט חדש על ${H('Em')}, ו־${H('Dm')}.`
      ),
    },
    {
      kind: 'explain',
      title: L('Am = the E shape, one string over', `${H('Am')} = הצורה של ${H('E')}, מיתר אחד הלאה`),
      shape: 'Am',
      text: L(
        'Make an E, then move all three fingers one string towards the floor: middle (2) on string 4 fret 2, ring (3) on string 3 fret 2, index (1) on string 2 fret 1. Strum from string 5 — string 6 stays silent. A minor = A (the root), C (the minor 3rd), E (the 5th).',
        `עשה ${H('E')}, והזז את שלוש האצבעות מיתר אחד לכיוון הרצפה: אמה (2) על מיתר 4 שריג 2, קמיצה (3) על מיתר 3 שריג 2, מורה (1) על מיתר 2 שריג 1. פורטים ממיתר 5 — מיתר 6 שקט. ${H('A')} מינור = ${H('A')} (היסוד), ${H('C')} (הטרצה הקטנה), ${H('E')} (הקווינטה).`
      ),
    },
    {
      kind: 'chord',
      chord: 'Am',
      title: L('Play Am', `נגן ${H('Am')}`),
      text: L('String by string from 5 to 1, then strum. If string 1 is dead, the index finger is touching it — arch it.', 'מיתר אחרי מיתר מ־5 עד 1, ואז פריטה. אם מיתר 1 מת, האצבע המורה נוגעת בו — קשת אותה.'),
    },
    {
      kind: 'chord',
      chord: 'Em',
      title: L('Em again', `שוב ${H('Em')}`),
      text: L(
        'E minor = E (root), G (minor 3rd), B (5th) — the E chord without the index finger. Play it, all six strings.',
        `${H('E')} מינור = ${H('E')} (יסוד), ${H('G')} (טרצה קטנה), ${H('B')} (קווינטה) — אקורד ${H('E')} בלי האצבע המורה. נגן אותו, כל ששת המיתרים.`
      ),
    },
    {
      kind: 'explain',
      title: L('Dm = D with one finger lower', `${H('Dm')} = ${H('D')} עם אצבע אחת נמוכה יותר`),
      shape: 'Dm',
      text: L(
        'In D the middle finger holds F♯ on string 1, fret 2 — the major 3rd. Lower it one fret to F and you have D minor = D (root), F (minor 3rd), A (5th). Because the 1st fret is now on string 1, the fingering changes: middle (2) on string 3 fret 2, ring (3) on string 2 fret 3, index (1) on string 1 fret 1. Strum strings 4 to 1.',
        `ב־${H('D')} האמה מחזיקה ${H('F♯')} על מיתר 1, שריג 2 — הטרצה הגדולה. הורד אותה שריג אחד ל־${H('F')} וקיבלת ${H('D')} מינור = ${H('D')} (יסוד), ${H('F')} (טרצה קטנה), ${H('A')} (קווינטה). כיוון ששריג 1 נמצא עכשיו על מיתר 1, האצבוע משתנה: אמה (2) על מיתר 3 שריג 2, קמיצה (3) על מיתר 2 שריג 3, מורה (1) על מיתר 1 שריג 1. פורטים מיתרים 4 עד 1.`
      ),
    },
    {
      kind: 'chord',
      chord: 'Dm',
      title: L('Play Dm', `נגן ${H('Dm')}`),
      text: L('Four strings only: 4 to 1. Check each one rings.', 'ארבעה מיתרים בלבד: 4 עד 1. בדוק שכל אחד מצלצל.'),
    },
    {
      kind: 'quiz',
      id: 'major-minor',
      title: L('Hear the difference', 'לשמוע את ההבדל'),
      question: L('What is the only difference between D and Dm?', `מה ההבדל היחיד בין ${H('D')} ל־${H('Dm')}?`),
      options: [
        L('The 3rd: F♯ in D, F in Dm — one semitone', `הטרצה: ${H('F♯')} ב־${H('D')}, ${H('F')} ב־${H('Dm')} — חצי טון`),
        L('The root moves up a tone', 'היסוד עולה בטון'),
        L('Dm has one string more', `ל־${H('Dm')} יש מיתר אחד יותר`),
      ],
      answer: 0,
      why: L('Root (D) and 5th (A) stay; the 3rd drops a semitone. That is what “minor” means.', `היסוד (${H('D')}) והקווינטה (${H('A')}) נשארים; הטרצה יורדת בחצי טון. זה מה ש"מינור" אומר.`),
    },
    {
      kind: 'changes',
      pair: ['E', 'Am'],
      title: L('One-minute changes: E and Am', `החלפות בדקה: ${H('E')} ו־${H('Am')}`),
      text: L('The same shape on two string sets — keep the fingers together and move the whole hand one string.', 'אותה צורה על שתי קבוצות מיתרים — שמור את האצבעות יחד והזז את כל היד מיתר אחד.'),
    },
    {
      kind: 'changes',
      pair: ['Am', 'Dm'],
      title: L('One-minute changes: Am and Dm', `החלפות בדקה: ${H('Am')} ו־${H('Dm')}`),
      text: L('Look at both shapes in the air before you land.', 'ראה את שתי הצורות באוויר לפני הנחיתה.'),
    },
    {
      kind: 'checklist',
      metronome: 70,
      title: L('A minor progression', 'מהלך במינור'),
      text: L('Am, Dm, Am, E — one bar each, down strums, then the common pattern. E here is the V of A minor: it pulls back to Am.', `${H('Am, Dm, Am, E')} — תיבה לכל אחד, פריטות למטה, ואז הדפוס הנפוץ. ${H('E')} כאן הוא ה־${H('V')} של ${H('A')} מינור: הוא מושך חזרה ל־${H('Am')}.`),
      chart: { bars: ['Am', 'Dm', 'Am', 'E'] },
      items: [L('Three rounds without stopping.', 'שלושה סיבובים בלי לעצור.'), L('Each chord rings on its “1”.', 'כל אקורד מצלצל ב"1" שלו.')],
    },
  ],
  homework: [
    { id: 'eam-hw', kind: 'changes', pair: ['E', 'Am'], min: 30, perDay: 1, text: L('One-minute changes E–Am, once a day. Goal: 30.', `החלפות בדקה ${H('E–Am')}, פעם ביום. יעד: 30.`) },
    { id: 'amdm-hw', kind: 'changes', pair: ['Am', 'Dm'], min: 30, perDay: 1, text: L('One-minute changes Am–Dm, once a day. Goal: 30.', `החלפות בדקה ${H('Am–Dm')}, פעם ביום. יעד: 30.`) },
  ],
};

const lessonGC = {
  id: 'g2-G-C',
  level: 2,
  title: L('G and C', `${H('G')} ו־${H('C')}`),
  objective: L(
    'Play G and C, change C–Am with anchor fingers, and play a song in G.',
    `לנגן ${H('G')} ו־${H('C')}, להחליף ${H('C–Am')} עם אצבעות עוגן, ולנגן שיר ב־${H('G')}.`
  ),
  minutes: 25,
  skills: ['chord-G', 'chord-C', 'changes-GC', 'changes-CAm', 'song-G'],
  steps: [
    {
      kind: 'explain',
      title: L('The G chord', `האקורד ${H('G')}`),
      shape: 'G',
      text: L(
        'Middle finger (2) on string 6 fret 3, index (1) on string 5 fret 2, ring (3) on string 1 fret 3; strings 4, 3 and 2 open. All six strings. G major = G (root), B (major 3rd), D (5th) — the open strings give you D, G and B for free.',
        `אמה (2) על מיתר 6 שריג 3, מורה (1) על מיתר 5 שריג 2, קמיצה (3) על מיתר 1 שריג 3; מיתרים 4, 3 ו־2 פתוחים. כל ששת המיתרים. ${H('G')} מז׳ור = ${H('G')} (יסוד), ${H('B')} (טרצה גדולה), ${H('D')} (קווינטה) — המיתרים הפתוחים נותנים לך ${H('D')}, ${H('G')} ו־${H('B')} בחינם.`
      ),
    },
    {
      kind: 'chord',
      chord: 'G',
      title: L('Play G', `נגן ${H('G')}`),
      text: L('The open strings 4–2 must ring: keep the index and middle fingers on their tips, away from string 4.', 'המיתרים הפתוחים 4–2 חייבים לצלצל: החזק את המורה והאמה על הקצות, הרחק ממיתר 4.'),
    },
    {
      kind: 'explain',
      title: L('The C chord', `האקורד ${H('C')}`),
      shape: 'C',
      text: L(
        'A diagonal: ring (3) on string 5 fret 3, middle (2) on string 4 fret 2, index (1) on string 2 fret 1; strings 3 and 1 open. Strum from string 5. C major = C (root), E (major 3rd), G (5th).',
        `אלכסון: קמיצה (3) על מיתר 5 שריג 3, אמה (2) על מיתר 4 שריג 2, מורה (1) על מיתר 2 שריג 1; מיתרים 3 ו־1 פתוחים. פורטים ממיתר 5. ${H('C')} מז׳ור = ${H('C')} (יסוד), ${H('E')} (טרצה גדולה), ${H('G')} (קווינטה).`
      ),
    },
    {
      kind: 'chord',
      chord: 'C',
      title: L('Play C', `נגן ${H('C')}`),
      text: L('The open G string (3) is the one that dies most — arch the middle finger over it.', `מיתר ${H('G')} הפתוח (3) הוא זה שמת הכי הרבה — קשת את האמה מעליו.`),
    },
    {
      kind: 'explain',
      title: L('Anchor fingers: C to Am', `אצבעות עוגן: מ־${H('C')} ל־${H('Am')}`),
      text: L(
        'Look at C and Am: index on string 2 fret 1, middle on string 4 fret 2 — the same in both! Leave them pressed and move only the ring finger, from string 5 fret 3 to string 3 fret 2. Fingers that stay are “anchors”: the fastest change is the one where fewer fingers move.',
        `הסתכל על ${H('C')} ועל ${H('Am')}: מורה על מיתר 2 שריג 1, אמה על מיתר 4 שריג 2 — אותו דבר בשניהם! השאר אותן לחוצות והזז רק את הקמיצה, ממיתר 5 שריג 3 למיתר 3 שריג 2. אצבעות שנשארות הן "עוגנים": ההחלפה המהירה ביותר היא זו שבה פחות אצבעות זזות.`
      ),
    },
    {
      kind: 'changes',
      pair: ['C', 'Am'],
      title: L('One-minute changes: C and Am', `החלפות בדקה: ${H('C')} ו־${H('Am')}`),
      text: L('Only the ring finger moves. Goal for this pair: 40.', 'רק הקמיצה זזה. היעד לזוג הזה: 40.'),
    },
    {
      kind: 'changes',
      pair: ['G', 'C'],
      title: L('One-minute changes: G and C', `החלפות בדקה: ${H('G')} ו־${H('C')}`),
      text: L('No anchors here — move the shape as one, ring finger first.', 'כאן אין עוגנים — הזז את הצורה כיחידה, הקמיצה ראשונה.'),
    },
    {
      kind: 'checklist',
      skill: 'song-G',
      metronome: 70,
      groove: 'rock',
      title: L('A song in G', `שיר ב־${H('G')}`),
      text: L(
        'G – D – Em – C: in the key of G these are I (tonic), V (dominant), vi (the relative minor) and IV (subdominant) — the four chords behind countless pop songs. One bar each, the common pattern. Hear it first.',
        `${H('G – D – Em – C')}: בסולם ${H('G')} אלה ${H('I')} (טוניקה), ${H('V')} (דומיננטה), ${H('vi')} (המינור המקביל) ו־${H('IV')} (סובדומיננטה) — ארבעת האקורדים שמאחורי אינספור שירי פופ. תיבה לכל אחד, הדפוס הנפוץ. קודם שמע.`
      ),
      chart: { bars: ['G', 'D', 'Em', 'C'], pattern: 'D-DU-UDU' },
      items: [L('Four rounds without stopping.', 'ארבעה סיבובים בלי לעצור.'), L('The strumming hand keeps moving through every change.', 'יד הפריטה ממשיכה לזוז בכל החלפה.')],
    },
  ],
  homework: [
    { id: 'cam-hw', kind: 'changes', pair: ['C', 'Am'], min: 40, perDay: 1, text: L('One-minute changes C–Am, once a day. Goal: 40.', `החלפות בדקה ${H('C–Am')}, פעם ביום. יעד: 40.`) },
    { id: 'gc-hw', kind: 'changes', pair: ['G', 'C'], min: 30, perDay: 1, text: L('One-minute changes G–C, once a day. Goal: 30.', `החלפות בדקה ${H('G–C')}, פעם ביום. יעד: 30.`) },
    { id: 'songg-hw', kind: 'self', text: L('Once a day: G – D – Em – C, four rounds with the drums.', `פעם ביום: ${H('G – D – Em – C')}, ארבעה סיבובים עם התופים.`) },
  ],
};

const lessonMinorPent = {
  id: 'g2-minor-pent',
  level: 2,
  title: L('Your first scale: A minor pentatonic', `הסולם הראשון שלך: פנטטוני ${H('A')} מינור`),
  objective: L(
    'Play the A minor pentatonic box up and down, know where its roots are, and improvise over the blues.',
    `לנגן את התיבה של פנטטוני ${H('A')} מינור למעלה ולמטה, לדעת איפה היסודות שלה, ולאלתר על הבלוז.`
  ),
  minutes: 25,
  skills: ['penta-shape', 'penta-roots', 'penta-improv'],
  steps: [
    {
      kind: 'explain',
      title: L('Five notes for solos', 'חמישה צלילים לסולו'),
      text: L(
        'A scale is a set of notes that sound good together. The minor pentatonic has five: in A they are A (the root, 1), C (minor 3rd, ♭3), D (4th), E (5th) and G (minor 7th, ♭7). It is the scale behind most rock and blues solos — and it has no “wrong” note over a blues in A.',
        `סולם הוא קבוצת צלילים שנשמעים טוב יחד. לפנטטוני המינורי יש חמישה: ב־${H('A')} הם ${H('A')} (היסוד, ${H('1')}), ${H('C')} (טרצה קטנה, ${H('♭3')}), ${H('D')} (קוורטה, ${H('4')}), ${H('E')} (קווינטה, ${H('5')}) ו־${H('G')} (ספטימה קטנה, ${H('♭7')}). זה הסולם שמאחורי רוב סולואי הרוק והבלוז — ואין בו צליל "שגוי" על בלוז ב־${H('A')}.`
      ),
    },
    {
      kind: 'arp',
      arp: 'am-penta-1',
      labels: 'degree',
      title: L('The box at fret 5', 'התיבה בשריג 5'),
      text: L(
        'Two notes on each string, at frets 5 and 7 or 5 and 8. One finger per fret: index (1) plays fret 5, ring (3) fret 7, pinky (4) fret 8. Hear it, then look at the numbers on the neck: each note’s role in the scale.',
        'שני צלילים על כל מיתר, בשריגים 5 ו־7 או 5 ו־8. אצבע לכל שריג: מורה (1) מנגנת שריג 5, קמיצה (3) שריג 7, זרת (4) שריג 8. שמע, ואז הסתכל על המספרים על הצוואר: התפקיד של כל צליל בסולם.'
      ),
    },
    {
      kind: 'play',
      arp: 'am-penta-1',
      skill: 'penta-shape',
      title: L('Play it up', 'נגן אותו למעלה'),
      text: L(
        'From string 6 fret 5 to string 1 fret 8, one note at a time. The teacher lights the next note when it hears the right one — go slowly, let each note ring.',
        'ממיתר 6 שריג 5 עד מיתר 1 שריג 8, צליל אחד בכל פעם. המורה מדליק את הצליל הבא כשהוא שומע את הנכון — לאט, תן לכל צליל לצלצל.'
      ),
    },
    {
      kind: 'play',
      arp: 'am-penta-1',
      updown: true,
      title: L('Up and back down', 'למעלה ובחזרה למטה'),
      text: L('All the way up and back down to string 6 fret 5 — the root.', 'כל הדרך למעלה ובחזרה למטה עד מיתר 6 שריג 5 — היסוד.'),
    },
    {
      kind: 'quiz',
      id: 'penta-roots',
      skill: 'penta-roots',
      title: L('Where is home?', 'איפה הבית?'),
      question: L('Where are the A roots in this box?', `איפה היסודות ${H('A')} בתיבה הזו?`),
      options: [
        L('String 6 fret 5, string 4 fret 7, string 1 fret 5', 'מיתר 6 שריג 5, מיתר 4 שריג 7, מיתר 1 שריג 5'),
        L('Every note at fret 5', 'כל צליל בשריג 5'),
        L('Only string 6 fret 5', 'רק מיתר 6 שריג 5'),
      ],
      answer: 0,
      why: L(
        'Three A’s in the box, an octave apart: string 6 fret 5, string 4 fret 7, string 1 fret 5. A solo sounds finished when it lands on one of them.',
        `שלושה ${H('A')} בתיבה, אוקטבה זה מזה: מיתר 6 שריג 5, מיתר 4 שריג 7, מיתר 1 שריג 5. סולו נשמע גמור כשהוא נוחת על אחד מהם.`
      ),
    },
    {
      kind: 'checklist',
      metronome: 60,
      title: L('With the click', 'עם הנקישה'),
      text: L('Up and down, one note on every click, alternate picking (down, up, down, up). When it is clean, two notes per click.', 'למעלה ולמטה, צליל אחד על כל נקישה, פריטה מתחלפת (למטה, למעלה, למטה, למעלה). כשזה נקי, שני צלילים לכל נקישה.'),
      items: [L('Every note lands on a click.', 'כל צליל נוחת על נקישה.'), L('Alternate picking all the way.', 'פריטה מתחלפת לאורך כל הדרך.'), L('Up and down twice without a mistake.', 'למעלה ולמטה פעמיים בלי טעות.')],
    },
    {
      kind: 'checklist',
      skill: 'penta-improv',
      metronome: 80,
      groove: 'blues',
      title: L('Your first improvisation', 'האלתור הראשון שלך'),
      text: L(
        'Start the drums and play any notes of the box, in any order, over the 12-bar blues in A in your head. Short phrases, leave space between them, end phrases on an A. There are no wrong notes here — only choices.',
        `הפעל את התופים ונגן כל צלילים מהתיבה, בכל סדר, על הבלוז של 12 תיבות ב־${H('A')} שבראש שלך. משפטים קצרים, השאר רווח ביניהם, סיים משפטים על ${H('A')}. אין כאן צלילים שגויים — רק בחירות.`
      ),
      chart: { bars: ['A', 'A', 'A', 'A', 'D', 'D', 'A', 'A', 'E', 'D', 'A', 'E'] },
      items: [L('Two minutes without stopping.', 'שתי דקות בלי לעצור.'), L('Phrases with silence between them.', 'משפטים עם שקט ביניהם.'), L('Most phrases end on an A.', `רוב המשפטים נגמרים על ${H('A')}.`)],
    },
  ],
  homework: [
    { id: 'penta-hw', kind: 'play', arp: 'am-penta-1', updown: true, skill: 'penta-shape', text: L('The box up and down once a day with the teacher listening.', 'התיבה למעלה ולמטה פעם ביום כשהמורה מקשיב.') },
    { id: 'improv-hw', kind: 'self', text: L('3 minutes a day: free improvisation over the blues drums.', '3 דקות ביום: אלתור חופשי על תופי הבלוז.') },
  ],
};

export const LESSONS = [
  lessonBasics,
  lessonFirstNote,
  lessonCleanNotes,
  lessonFirstChord,
  lessonFirstChords,
  lessonChordE,
  lessonStrumming,
  lessonFirstSong,
  lessonMinorChords,
  lessonGC,
  lessonMinorPent,
  lessonArpeggios,
  lessonTapping,
];

export const lessonById = (id) => LESSONS.find((l) => l.id === id);
