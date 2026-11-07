// Theory -> Triads: a full course on guitar triads (user, 2026-11-07: "a
// comprehensive, professional triads course, taught the way a certified
// teacher would"). Runs in the Teacher's LessonPlayer (same step kinds as
// curriculum/guitar.js: explain / arp / play (the mic follows the notes) /
// quiz / checklist (+ metronome)). Shapes are COMPUTED from theory
// (teacher/triadShapes.js), never typed by hand.
//
// ORDER AND METHOD (rule 14 — the sequence the established methods use):
//   • JustinGuitar, "Triad chord grips" (IM-151) + "Introduction to triads"
//     (Grade 4): the three MAJOR shapes on strings 1-2-3 first, moved by
//     their root; then all three chords of a key in ONE area of the neck;
//     mute the low strings with the picking hand; practise up the neck and
//     back (1 2 3 8 3 2); minor = flatten the 3rd of each major shape; then
//     strings 2-3-4, 3-4-5, 4-5-6 = 4 sets x 3 shapes = 12 shapes.
//   • Ryan Naylor, "Triads Inside Out" (course outline): the qualities as
//     stacked thirds (major = M3 + m3, minor = m3 + M3, dim = m3 + m3, aug =
//     M3 + M3); I-IV-I-V per string set with COMMON TONES and voice leading;
//     triad chord scales; augmented as a symmetric shape; spread triads;
//     triad cycles (cycle of 4ths) as the practice routine.
//   • Mark Goldenberg / Peghead Nation, "Guitar Chord Theory": harmonize the
//     major scale on the top three strings (by inversion), then cycle-of-4ths
//     drills C F B° Em Am Dm G C; hear the separate voices, not block shapes.
//   • Berklee "Guitar Chords 201": open (spread) triads, diatonic open
//     triads, open dim / aug.
//   • Open Sauce Guitar "Triad Quadrilogy": every inversion in all four
//     qualities, a tempo ladder (40 -> 70 -> 100 bpm).
// Lesson shape = a private teacher's: hear it -> understand it (named roles,
// one worked example) -> see it -> play it with the mic listening -> use it
// in music -> homework. Accuracy first; tempo up only after clean repeats.
// All text is our own.

const L = (en, he) => ({ en, he });
const H = (s) => `⁦${s}⁩`; // isolate a Latin token inside Hebrew

export const TRIAD_SKILLS = [
  { id: 'tri-build', title: L('Build any triad from stacked thirds', 'לבנות כל טריאדה משתי טרצות'), check: { kind: 'quiz', id: 'tri-build' } },
  { id: 'tri-inv', title: L('Name an inversion by its lowest note', 'לזהות היפוך לפי הצליל הנמוך'), check: { kind: 'quiz', id: 'tri-inv' } },
  { id: 'tri-321', title: L('Major triads on strings 3-2-1', 'טריאדות מז׳ור על מיתרים 3-2-1'), check: { kind: 'play' } },
  { id: 'tri-move', title: L('Move a shape to any root', 'להזיז צורה לכל יסוד'), check: { kind: 'quiz', id: 'tri-move' } },
  { id: 'tri-area', title: L('I-IV-V in one area', 'I-IV-V באזור אחד'), check: { kind: 'play' } },
  { id: 'tri-432', title: L('Major triads on strings 4-3-2', 'טריאדות מז׳ור על מיתרים 4-3-2'), check: { kind: 'play' } },
  { id: 'tri-low', title: L('Triads on strings 5-4-3 and 6-5-4', 'טריאדות על מיתרים 5-4-3 ו־6-5-4'), check: { kind: 'play' } },
  { id: 'tri-minor', title: L('Minor triads in every inversion', 'טריאדות מינור בכל ההיפוכים'), check: { kind: 'play' } },
  { id: 'tri-dimaug', title: L('Diminished and augmented triads', 'טריאדות מוקטנות ומוגדלות'), check: { kind: 'play' } },
  { id: 'tri-scale', title: L('The chord scale of a major key', 'סולם האקורדים של מפתח מז׳ור'), check: { kind: 'play' } },
  { id: 'tri-qual', title: L('The quality of every degree', 'הסוג של כל דרגה'), check: { kind: 'quiz', id: 'tri-qual' } },
  { id: 'tri-lead', title: L('Voice leading through a progression', 'הובלת קולות במהלך'), check: { kind: 'play' } },
  { id: 'tri-cycle', title: L('The cycle-of-4ths drill', 'תרגיל מעגל הקוורטות'), check: { kind: 'play' } },
  { id: 'tri-spread', title: L('Spread (open) triads', 'טריאדות פתוחות'), check: { kind: 'play' } },
  { id: 'tri-use', title: L('Triads in a song progression', 'טריאדות במהלך של שיר'), check: { kind: 'play' } },
  { id: 'tri-final', title: L('Final test', 'מבחן מסכם'), check: { kind: 'quiz', id: 'tri-final' } },
];

const ids = (prefix, n) => Array.from({ length: n }, (_, k) => `${prefix}-${k + 1}`);

// ---------------------------------------------------------------------------
// 1 — What a triad is
const unit1 = {
  id: 'tri-1-what',
  unit: 1,
  title: L('What a triad is', 'מהי טריאדה'),
  objective: L(
    'Know the three notes of a triad by their roles, build the four qualities from thirds, and name an inversion from its lowest note.',
    'להכיר את שלושת הצלילים של טריאדה לפי התפקיד שלהם, לבנות את ארבעת הסוגים מטרצות, ולזהות היפוך לפי הצליל הנמוך.'
  ),
  minutes: 20,
  skills: ['tri-build', 'tri-inv'],
  steps: [
    {
      kind: 'arp',
      arp: 't-C321-r',
      labels: 'degree',
      compare: true,
      title: L('Three notes, three jobs', 'שלושה צלילים, שלושה תפקידים'),
      text: L(
        'A triad is the smallest complete chord: three notes stacked in thirds. Each note has a job. The ROOT (1) gives the chord its name. The 3rd (3) decides major or minor. The 5th (5) makes it solid. Worked example — C major: C is the root, E the 3rd, G the 5th. Every C major chord you have ever played, open or barre, is only these three notes doubled in other octaves. Listen to them picked, then strummed.',
        `טריאדה היא האקורד השלם הקטן ביותר: שלושה צלילים שנבנים בטרצות. לכל צליל תפקיד. היסוד (1) נותן לאקורד את שמו. הטרצה (3) קובעת אם הוא מז׳ור או מינור. הקווינטה (5) נותנת לו יציבות. דוגמה — ${H('C')} מז׳ור: ${H('C')} הוא היסוד, ${H('E')} הטרצה, ${H('G')} הקווינטה. כל אקורד ${H('C')} מז׳ור שניגנת אי פעם, פתוח או ברה, הוא רק שלושת הצלילים האלה בהכפלות באוקטבות אחרות. הקשב להם בפריטה צליל־צליל ואחר כך יחד.`
      ),
    },
    {
      kind: 'explain',
      title: L('Thirds: 3 or 4 frets', 'טרצות: 3 או 4 שריגים'),
      text: L(
        'A third is the distance from one chord tone to the next. On one string you measure it in frets: a MAJOR third (M3) is 4 frets (two whole tones), a MINOR third (m3) is 3 frets (a tone and a half). C to E = 4 frets = major third. E to G = 3 frets = minor third. So C major = M3 + m3. Every triad is two thirds on top of each other — only their order changes.',
        `טרצה היא המרחק מצליל אקורד אחד לבא. על מיתר אחד מודדים אותה בשריגים: טרצה גדולה (${H('M3')}) היא 4 שריגים (שני טונים), טרצה קטנה (${H('m3')}) היא 3 שריגים (טון וחצי). מ־${H('C')} ל־${H('E')} = 4 שריגים = טרצה גדולה. מ־${H('E')} ל־${H('G')} = 3 שריגים = טרצה קטנה. לכן ${H('C')} מז׳ור = ${H('M3 + m3')}. כל טריאדה היא שתי טרצות זו על זו — רק הסדר שלהן משתנה.`
      ),
    },
    {
      kind: 'arp',
      arp: 't1-C-major',
      labels: 'degree',
      hear: ['t1-C-major', 't1-C-minor', 't1-C-dim', 't1-C-aug'],
      title: L('The four qualities', 'ארבעת הסוגים'),
      text: L(
        'From the same root, four kinds of triad. MAJOR = M3 + m3 (1 3 5): C E G — bright. MINOR = m3 + M3 (1 ♭3 5): C E♭ G — darker; only the 3rd moved down a fret. DIMINISHED = m3 + m3 (1 ♭3 ♭5): C E♭ G♭ — tense, wants to move. AUGMENTED = M3 + M3 (1 3 ♯5): C E G♯ — floating, unresolved. Hear all four in that order; the neck shows C major.',
        `מאותו יסוד יש ארבעה סוגי טריאדה. מז׳ור = ${H('M3 + m3')} (${H('1 3 5')}): ${H('C E G')} — בהיר. מינור = ${H('m3 + M3')} (${H('1 ♭3 5')}): ${H('C E♭ G')} — כהה יותר; רק הטרצה ירדה שריג. מוקטן = ${H('m3 + m3')} (${H('1 ♭3 ♭5')}): ${H('C E♭ G♭')} — מתוח, רוצה להמשיך. מוגדל = ${H('M3 + M3')} (${H('1 3 ♯5')}): ${H('C E G♯')} — מרחף, לא נפתר. הקשב לארבעתם בסדר הזה; הצוואר מראה ${H('C')} מז׳ור.`
      ),
    },
    {
      kind: 'quiz',
      id: 'tri-build',
      skill: 'tri-build',
      title: L('Build it', 'בנה אותה'),
      question: L('D major: D, then a major third up, then a minor third up. Which notes?', `${H('D')} מז׳ור: ${H('D')}, טרצה גדולה למעלה, ואז טרצה קטנה למעלה. אילו צלילים?`),
      options: [L('D F A', H('D F A')), L('D F♯ A', H('D F♯ A')), L('D F♯ A♯', H('D F♯ A♯'))],
      answer: 1,
      why: L(
        'D -> F♯ is 4 frets (M3), F♯ -> A is 3 frets (m3): D F♯ A = root, 3rd, 5th. D F A is D minor (m3 + M3); D F♯ A♯ is D augmented (M3 + M3).',
        `${H('D → F♯')} הם 4 שריגים (${H('M3')}), ${H('F♯ → A')} הם 3 שריגים (${H('m3')}): ${H('D F♯ A')} = יסוד, טרצה, קווינטה. ${H('D F A')} הוא ${H('D')} מינור (${H('m3 + M3')}); ${H('D F♯ A♯')} הוא ${H('D')} מוגדל (${H('M3 + M3')}).`
      ),
    },
    {
      kind: 'quiz',
      id: 'tri-qual-1',
      title: L('Which quality?', 'איזה סוג?'),
      question: L('B D F: B -> D is 3 frets, D -> F is 3 frets. This triad is…', `${H('B D F')}: ${H('B → D')} הם 3 שריגים, ${H('D → F')} הם 3 שריגים. הטריאדה הזו היא…`),
      options: [L('Minor', 'מינור'), L('Diminished', 'מוקטנת'), L('Augmented', 'מוגדלת')],
      answer: 1,
      why: L('Two minor thirds = diminished (1 ♭3 ♭5). It is the triad built on the 7th degree of C major.', `שתי טרצות קטנות = מוקטנת (${H('1 ♭3 ♭5')}). זו הטריאדה שנבנית על הדרגה השביעית של ${H('C')} מז׳ור.`),
    },
    {
      kind: 'arp',
      arp: ['t-C321-r', 't-C321-1', 't-C321-2'],
      labels: 'degree',
      title: L('Inversions: who is at the bottom', 'היפוכים: מי למטה'),
      text: L(
        'The same three notes can be stacked in three orders. The LOWEST note names the inversion. ROOT POSITION: the root is lowest — C E G (1 3 5). 1st INVERSION: the 3rd is lowest — E G C (3 5 1). 2nd INVERSION: the 5th is lowest — G C E (5 1 3). All three are C major; each sounds a little different and sits in a different place on the neck. Hear them one after another.',
        `את אותם שלושה צלילים אפשר לסדר בשלושה סדרים. הצליל הנמוך ביותר נותן את שם ההיפוך. מצב יסודי: היסוד למטה — ${H('C E G')} (${H('1 3 5')}). היפוך ראשון: הטרצה למטה — ${H('E G C')} (${H('3 5 1')}). היפוך שני: הקווינטה למטה — ${H('G C E')} (${H('5 1 3')}). שלושתם ${H('C')} מז׳ור; כל אחד נשמע קצת אחרת ויושב במקום אחר על הצוואר. הקשב להם בזה אחר זה.`
      ),
    },
    {
      kind: 'quiz',
      id: 'tri-inv',
      skill: 'tri-inv',
      title: L('Name the inversion', 'מה ההיפוך?'),
      question: L('A chord is played G (lowest), C, E. Which inversion of C major is it?', `אקורד מנוגן ${H('G')} (הנמוך), ${H('C')}, ${H('E')}. איזה היפוך של ${H('C')} מז׳ור זה?`),
      options: [L('Root position', 'מצב יסודי'), L('1st inversion', 'היפוך ראשון'), L('2nd inversion', 'היפוך שני')],
      answer: 2,
      why: L('G is the 5th of C, and the 5th in the bass = 2nd inversion (5 1 3).', `${H('G')} הוא הקווינטה של ${H('C')}, וקווינטה בבס = היפוך שני (${H('5 1 3')}).`),
    },
  ],
  homework: [
    { id: 'tri1-hw', kind: 'self', text: L('Spell the triads of G, A, E and F (major and minor) aloud, root -> 3rd -> 5th, counting the frets of each third.', `אמור בקול את הטריאדות של ${H('G')}, ${H('A')}, ${H('E')} ו־${H('F')} (מז׳ור ומינור), יסוד → טרצה → קווינטה, וספור את השריגים של כל טרצה.`) },
  ],
};

// ---------------------------------------------------------------------------
// 2 — Major triads on strings 3-2-1
const unit2 = {
  id: 'tri-2-top',
  unit: 2,
  title: L('Major triads on strings 3-2-1', 'טריאדות מז׳ור על מיתרים 3-2-1'),
  objective: L(
    'Play the three major shapes on the top three strings, know where the root is in each, and move them to any key.',
    'לנגן את שלוש צורות המז׳ור על שלושת המיתרים העליונים, לדעת איפה היסוד בכל אחת, ולהזיז אותן לכל מפתח.'
  ),
  minutes: 30,
  skills: ['tri-321', 'tri-move'],
  steps: [
    {
      kind: 'checklist',
      title: L('Set up the hands', 'הכנת הידיים'),
      text: L('Triads use only three strings, so the others must stay silent:', 'טריאדה משתמשת בשלושה מיתרים בלבד, ולכן כל השאר צריכים לשתוק:'),
      items: [
        L('Rest the side of the picking hand lightly on strings 6, 5 and 4 — they must not ring.', 'הנח את צד כף יד ימין בעדינות על מיתרים 6, 5 ו־4 — הם לא אמורים לצלצל.'),
        L('Fret with the fingertips, close behind the fret, thumb behind the neck.', 'לחץ בקצות האצבעות, קרוב לשריג, אגודל מאחורי הצוואר.'),
        L('Pick each string separately first; strum the three together only when every note rings.', 'פרוט קודם כל מיתר לחוד; רק כשכל צליל מצלצל — פרוט את שלושתם יחד.'),
      ],
    },
    {
      kind: 'arp',
      arp: 't-C321-r',
      labels: 'degree',
      compare: true,
      title: L('Shape 1 — root position (root on string 3)', 'צורה 1 — מצב יסודי (יסוד על מיתר 3)'),
      text: L(
        'C major, frets 5-5-3: string 3 fret 5 = C (root), string 2 fret 5 = E (3rd), string 1 fret 3 = G (5th). Fingers: index on string 1 (fret 3), ring on string 3 and pinky on string 2 (fret 5) — or a small ring-finger barre over strings 3 and 2. The root is on the LOWEST string of the shape.',
        `${H('C')} מז׳ור, שריגים ${H('5-5-3')}: מיתר 3 שריג 5 = ${H('C')} (יסוד), מיתר 2 שריג 5 = ${H('E')} (טרצה), מיתר 1 שריג 3 = ${H('G')} (קווינטה). אצבעות: אצבע 1 על מיתר 1 (שריג 3), אצבע 3 על מיתר 3 ואצבע 4 על מיתר 2 (שריג 5) — או ברה קטן באצבע 3 על מיתרים 3 ו־2. היסוד נמצא על המיתר הנמוך של הצורה.`
      ),
    },
    {
      kind: 'play',
      arp: 't-C321-r',
      updown: true,
      title: L('Play shape 1', 'נגן את צורה 1'),
      text: L('Pick it up and back down (5 notes). The teacher listens and moves on when each note is clean.', 'פרוט למעלה ובחזרה למטה (5 צלילים). המורה מקשיב ומתקדם כשכל צליל נקי.'),
    },
    {
      kind: 'arp',
      arp: 't-C321-1',
      labels: 'degree',
      compare: true,
      title: L('Shape 2 — 1st inversion (root on string 1)', 'צורה 2 — היפוך ראשון (יסוד על מיתר 1)'),
      text: L(
        'Up the neck, frets 9-8-8: E (3rd) on string 3, G (5th) on string 2, C (root) on string 1. Fingers: middle on string 3, index barring strings 2 and 1 at fret 8. The root is on the HIGHEST string — the 3rd is in the bass.',
        `למעלה בצוואר, שריגים ${H('9-8-8')}: ${H('E')} (טרצה) על מיתר 3, ${H('G')} (קווינטה) על מיתר 2, ${H('C')} (יסוד) על מיתר 1. אצבעות: אצבע 2 על מיתר 3, אצבע 1 בברה על מיתרים 2 ו־1 בשריג 8. היסוד על המיתר הגבוה — הטרצה בבס.`
      ),
    },
    {
      kind: 'play',
      arp: 't-C321-1',
      updown: true,
      title: L('Play shape 2', 'נגן את צורה 2'),
      text: L('Up and down. Keep the index-finger barre flat so strings 2 and 1 both ring.', 'למעלה ולמטה. השאר את הברה של אצבע 1 שטוח כדי שמיתרים 2 ו־1 יצלצלו.'),
    },
    {
      kind: 'arp',
      arp: 't-C321-2',
      labels: 'degree',
      compare: true,
      title: L('Shape 3 — 2nd inversion (root on string 2)', 'צורה 3 — היפוך שני (יסוד על מיתר 2)'),
      text: L(
        'Higher again, frets 12-13-12: G (5th) on string 3, C (root) on string 2, E (3rd) on string 1. Fingers: the index barres strings 3 to 1 at fret 12, the middle finger presses string 2 at fret 13. The root is in the MIDDLE. The same shape at fret 0-1-0 is the top of your open C chord.',
        `גבוה יותר, שריגים ${H('12-13-12')}: ${H('G')} (קווינטה) על מיתר 3, ${H('C')} (יסוד) על מיתר 2, ${H('E')} (טרצה) על מיתר 1. אצבעות: אצבע 1 בברה על מיתרים 3 עד 1 בשריג 12, ואצבע 2 על מיתר 2 בשריג 13. היסוד באמצע. אותה צורה בשריגים ${H('0-1-0')} היא החלק העליון של אקורד ${H('C')} הפתוח.`
      ),
    },
    {
      kind: 'play',
      arp: 't-C321-2',
      updown: true,
      title: L('Play shape 3', 'נגן את צורה 3'),
      text: L('Up and down, clean.', 'למעלה ולמטה, נקי.'),
    },
    {
      kind: 'arp',
      arp: ['t-C321-r', 't-C321-1', 't-C321-2', 't-C321-8'],
      labels: 'degree',
      title: L('The ladder: 1 2 3 8', 'הסולם: 1 2 3 8'),
      text: L(
        'Line the shapes up: root position (fret 5) -> 1st inversion (fret 8) -> 2nd inversion (fret 12) -> root position again an octave up (fret 15-17). Each shape begins on the next chord tone of the one below it: C, E, G, C. That is the whole map of C major on these strings — it repeats every 12 frets.',
        `סדר את הצורות: מצב יסודי (שריג 5) ← היפוך ראשון (שריג 8) ← היפוך שני (שריג 12) ← שוב מצב יסודי אוקטבה למעלה (שריג ${H('15-17')}). כל צורה מתחילה בצליל האקורד הבא אחרי זו שמתחתיה: ${H('C, E, G, C')}. זו כל המפה של ${H('C')} מז׳ור על המיתרים האלה — והיא חוזרת כל 12 שריגים.`
      ),
    },
    {
      kind: 'play',
      arp: ['t-C321-r', 't-C321-1', 't-C321-2', 't-C321-8'],
      skill: 'tri-321',
      title: L('Climb the ladder', 'טפס בסולם'),
      text: L('All four shapes, low to high in each, sliding up between them (12 notes). Say the bass role as you go: 1, 3, 5, 1.', 'ארבע הצורות, מהנמוך לגבוה בכל אחת, והחלקה למעלה ביניהן (12 צלילים). אמור את תפקיד הבס תוך כדי: 1, 3, 5, 1.'),
    },
    {
      kind: 'arp',
      arp: ['t-G321-1', 't-G321-2', 't-G321-r'],
      labels: 'degree',
      title: L('Same shapes, new root: G', `אותן צורות, יסוד חדש: ${H('G')}`),
      text: L(
        'Shapes are movable: put the ROOT on the right note and the shape is that chord. G is on string 1 at fret 3, so shape 2 sits at frets 4-3-3 (B D G). G on string 2 is fret 8: shape 3 at 7-8-7 (D G B). G on string 3 is fret 12: shape 1 at 12-12-10 (G B D). Find the root first, then hang the shape on it.',
        `הצורות ניידות: שים את היסוד על הצליל הנכון והצורה היא האקורד הזה. ${H('G')} על מיתר 1 בשריג 3, ולכן צורה 2 יושבת בשריגים ${H('4-3-3')} (${H('B D G')}). ${H('G')} על מיתר 2 בשריג 8: צורה 3 ב־${H('7-8-7')} (${H('D G B')}). ${H('G')} על מיתר 3 בשריג 12: צורה 1 ב־${H('12-12-10')} (${H('G B D')}). קודם מוצאים את היסוד, ואז תולים עליו את הצורה.`
      ),
    },
    {
      kind: 'quiz',
      id: 'tri-move',
      skill: 'tri-move',
      title: L('Move it', 'הזז אותה'),
      question: L('A major in root position on strings 3-2-1: the root A on string 3 is at fret 2. Which frets?', `${H('A')} מז׳ור במצב יסודי על מיתרים 3-2-1: היסוד ${H('A')} על מיתר 3 בשריג 2. אילו שריגים?`),
      options: [L('2-2-0', H('2-2-0')), L('2-1-0', H('2-1-0')), L('2-3-2', H('2-3-2'))],
      answer: 0,
      why: L(
        'Shape 1 is root-root-fret minus 2 (C was 5-5-3). With the root at 2: 2-2-0 = A C♯ E. (2-1-0 lowers the 3rd = A minor.)',
        `צורה 1 היא יסוד, אותו שריג, ושני שריגים פחות (${H('C')} היה ${H('5-5-3')}). עם יסוד בשריג 2: ${H('2-2-0')} = ${H('A C♯ E')}. (${H('2-1-0')} מוריד את הטרצה = ${H('A')} מינור.)`
      ),
    },
    {
      kind: 'checklist',
      metronome: 60,
      title: L('Practise with the click', 'תרגול עם הקליק'),
      text: L('The teachers’ routine for new shapes (start the metronome below):', 'שגרת המורים לצורות חדשות (הפעל את המטרונום כאן למטה):'),
      items: [
        L('At 60 bpm: strum each C shape 4 times (one per click), then move to the next — up the ladder and back (1 2 3 8 3 2).', 'ב־60 BPM: פרוט כל צורת C ארבע פעמים (אחת בכל קליק), ואז עבור לבאה — למעלה בסולם ובחזרה (1 2 3 8 3 2).'),
        L('Change on beat 1 without stopping the click — if you are late, slow down rather than stop.', 'החלף בפעמה 1 בלי לעצור את הקליק — אם אתה מאחר, האט במקום לעצור.'),
        L('When it is clean 3 times in a row, add 5 bpm; the goal is 2 strums per click at 70.', 'כשזה נקי 3 פעמים ברצף, הוסף 5 BPM; המטרה היא 2 פריטות בכל קליק ב־70.'),
        L('Do the same with G (frets 3 -> 7 -> 10/12).', `עשה אותו דבר עם ${H('G')} (שריגים 3 ← 7 ← ${H('10/12')}).`),
      ],
    },
  ],
  homework: [
    { id: 'tri2-climb', kind: 'play', arp: ['t-C321-r', 't-C321-1', 't-C321-2', 't-C321-8'], skill: 'tri-321', text: L('The C ladder on strings 3-2-1 — once a day with the teacher listening.', `סולם ${H('C')} על מיתרים 3-2-1 — פעם ביום כשהמורה מקשיב.`) },
    { id: 'tri2-keys', kind: 'self', text: L('Find the three shapes of D, E and F on your own: root first, then the shape.', `מצא לבד את שלוש הצורות של ${H('D')}, ${H('E')} ו־${H('F')}: קודם היסוד, אחר כך הצורה.`) },
  ],
};

// ---------------------------------------------------------------------------
// 3 — I-IV-V in one area
const unit3 = {
  id: 'tri-3-area',
  unit: 3,
  title: L('A key in one area: I-IV-V', 'מפתח באזור אחד: I-IV-V'),
  objective: L(
    'Play the I, IV and V chords of a key in one place on the neck by choosing the nearest shape of each, keeping the common tones still.',
    'לנגן את אקורדי I, IV ו־V של מפתח במקום אחד על הצוואר, בבחירת הצורה הקרובה של כל אחד, והשארת הצלילים המשותפים במקומם.'
  ),
  minutes: 30,
  skills: ['tri-area'],
  steps: [
    {
      kind: 'explain',
      title: L('Don’t slide — choose', 'לא להחליק — לבחור'),
      text: L(
        'In C major the three main chords are C (I, the tonic — home), F (IV, the subdominant — moving away) and G (V, the dominant — pulling back home). A beginner slides one shape up and down the neck for them. A player picks, for each chord, the shape that is closest to where the hand already is. With three shapes per chord there is always one within a fret or two — and the chords start to sound connected instead of jumping.',
        `ב־${H('C')} מז׳ור שלושת האקורדים העיקריים הם ${H('C')} (${H('I')}, הטוניקה — הבית), ${H('F')} (${H('IV')}, הסובדומיננטה — יציאה מהבית) ו־${H('G')} (${H('V')}, הדומיננטה — שמושכת חזרה הביתה). מתחיל מחליק צורה אחת למעלה ולמטה בצוואר. נגן בוחר לכל אקורד את הצורה הקרובה ביותר למקום שבו היד כבר נמצאת. עם שלוש צורות לכל אקורד תמיד יש אחת במרחק שריג או שניים — והאקורדים מתחילים להישמע מחוברים במקום לקפוץ.`
      ),
    },
    {
      kind: 'arp',
      arp: ['t3-C', 't3-F', 't3-G'],
      labels: 'note',
      title: L('Area 1: around fret 4', 'אזור 1: סביב שריג 4'),
      text: L(
        'C root position (5-5-3: C E G), F 2nd inversion (5-6-5: C F A), G 1st inversion (4-3-3: B D G). Look at string 3: C and F share the note C — it does not move. From C to F only two fingers move one fret each. From C to G every note moves one step down. This is what “one area” means.',
        `${H('C')} במצב יסודי (${H('5-5-3')}: ${H('C E G')}), ${H('F')} בהיפוך שני (${H('5-6-5')}: ${H('C F A')}), ${H('G')} בהיפוך ראשון (${H('4-3-3')}: ${H('B D G')}). הסתכל על מיתר 3: ל־${H('C')} ול־${H('F')} יש צליל משותף, ${H('C')} — הוא לא זז. מ־${H('C')} ל־${H('F')} רק שתי אצבעות זזות שריג אחד כל אחת. מ־${H('C')} ל־${H('G')} כל צליל יורד צעד אחד. זו המשמעות של "אזור אחד".`
      ),
    },
    {
      kind: 'quiz',
      id: 'tri-common',
      title: L('Common tone', 'צליל משותף'),
      question: L('Which note do C major (C E G) and G major (G B D) share?', `איזה צליל משותף ל־${H('C')} מז׳ור (${H('C E G')}) ול־${H('G')} מז׳ור (${H('G B D')})?`),
      options: [L('C', H('C')), L('E', H('E')), L('G', H('G'))],
      answer: 2,
      why: L('G is the 5th of C and the root of G. Chords a 4th or 5th apart always share one note; keep it under the same finger when you can.', `${H('G')} הוא הקווינטה של ${H('C')} והיסוד של ${H('G')}. לאקורדים במרחק קוורטה או קווינטה תמיד יש צליל אחד משותף; השאר אותו תחת אותה אצבע כשאפשר.`),
    },
    {
      kind: 'play',
      arp: ['t3-C', 't3-F', 't3-C', 't3-G'],
      skill: 'tri-area',
      title: L('C - F - C - G', 'C - F - C - G'),
      text: L('Play I-IV-I-V in area 1, each chord low to high (12 notes). Keep the hand in place — only the fingers move.', `נגן ${H('I-IV-I-V')} באזור 1, כל אקורד מהנמוך לגבוה (12 צלילים). היד נשארת במקום — רק האצבעות זזות.`),
    },
    {
      kind: 'arp',
      arp: ['t3b-C', 't3b-F', 't3b-G'],
      labels: 'note',
      title: L('Area 2: around fret 8', 'אזור 2: סביב שריג 8'),
      text: L(
        'The same three chords higher up: C 1st inversion (9-8-8: E G C), F root position (10-10-8: F A C), G 2nd inversion (7-8-7: D G B). Again the common tones stay: C and F share C (string 1, fret 8). Two areas = the whole key covered from fret 3 to fret 10.',
        `אותם שלושה אקורדים גבוה יותר: ${H('C')} בהיפוך ראשון (${H('9-8-8')}: ${H('E G C')}), ${H('F')} במצב יסודי (${H('10-10-8')}: ${H('F A C')}), ${H('G')} בהיפוך שני (${H('7-8-7')}: ${H('D G B')}). שוב הצלילים המשותפים נשארים: ל־${H('C')} ול־${H('F')} משותף ${H('C')} (מיתר 1, שריג 8). שני אזורים = כל המפתח מכוסה משריג 3 עד שריג 10.`
      ),
    },
    {
      kind: 'play',
      arp: ['t3b-C', 't3b-F', 't3b-C', 't3b-G'],
      title: L('Area 2: C - F - C - G', 'אזור 2: C - F - C - G'),
      text: L('The same progression in area 2.', 'אותו מהלך באזור 2.'),
    },
    {
      kind: 'checklist',
      metronome: 70,
      title: L('In time', 'בזמן'),
      text: L('Make it music (start the metronome below):', 'הפוך את זה למוזיקה (הפעל את המטרונום כאן למטה):'),
      items: [
        L('C - F - C - G, one bar each (4 strums), in area 1, at 70 bpm.', `${H('C - F - C - G')}, תיבה לכל אקורד (4 פריטות), באזור 1, ב־70 BPM.`),
        L('Then play it in area 2 without stopping between the areas.', 'ואז נגן באזור 2 בלי לעצור בין האזורים.'),
        L('Songs built on I-IV-V use exactly these moves — try any three-chord song you know with triads instead of full chords.', 'שירים שבנויים על I-IV-V משתמשים בדיוק בתנועות האלה — נסה שיר שלושה אקורדים שאתה מכיר עם טריאדות במקום אקורדים מלאים.'),
      ],
    },
  ],
  homework: [
    { id: 'tri3-area', kind: 'play', arp: ['t3-C', 't3-F', 't3-C', 't3-G'], skill: 'tri-area', text: L('C - F - C - G in area 1 — once a day.', `${H('C - F - C - G')} באזור 1 — פעם ביום.`) },
    { id: 'tri3-g', kind: 'self', text: L('Work out I-IV-V in G (G C D) in one area on strings 3-2-1.', `מצא לבד את ${H('I-IV-V')} ב־${H('G')} (${H('G C D')}) באזור אחד על מיתרים 3-2-1.`) },
  ],
};

// ---------------------------------------------------------------------------
// 4 — Strings 4-3-2
const unit4 = {
  id: 'tri-4-mid',
  unit: 4,
  title: L('Strings 4-3-2 (and why the shapes change)', 'מיתרים 4-3-2 (ולמה הצורות משתנות)'),
  objective: L(
    'Play the three major shapes on strings 4-3-2, understand the B-string shift, and play I-IV-V there.',
    `לנגן את שלוש צורות המז׳ור על מיתרים ${H('4-3-2')}, להבין את ההזזה של מיתר ${H('B')}, ולנגן שם ${H('I-IV-V')}.`
  ),
  minutes: 30,
  skills: ['tri-432'],
  steps: [
    {
      kind: 'explain',
      title: L('The B-string shift', `ההזזה של מיתר ${H('B')}`),
      text: L(
        'Every pair of neighbouring strings is tuned a 4th apart (5 frets) — except G to B, which is a major 3rd (4 frets). So any note that crosses from string 3 to string 2 sits ONE FRET HIGHER than the pattern on the other strings would suggest. That is why the shapes on 4-3-2 look different from those on 3-2-1, even though the notes are the same chord tones in the same orders.',
        `כל זוג מיתרים שכנים מכוון בקוורטה (5 שריגים) — חוץ מ־${H('G')} ל־${H('B')}, שהם טרצה גדולה (4 שריגים). לכן כל צליל שעובר ממיתר 3 למיתר 2 יושב שריג אחד גבוה יותר ממה שהדפוס במיתרים האחרים היה מנבא. זו הסיבה שהצורות על ${H('4-3-2')} נראות אחרת מאלה של ${H('3-2-1')}, למרות שאלה אותם צלילי אקורד באותם סדרים.`
      ),
    },
    {
      kind: 'arp',
      arp: 't-C432-1',
      labels: 'degree',
      compare: true,
      title: L('1st inversion: frets 2-0-1', 'היפוך ראשון: שריגים 2-0-1'),
      text: L(
        'C major with E (3rd) on string 4 fret 2, G (5th) open string 3, C (root) on string 2 fret 1 — the middle of your open C chord. The root is on the top string of the set.',
        `${H('C')} מז׳ור עם ${H('E')} (טרצה) על מיתר 4 שריג 2, ${H('G')} (קווינטה) מיתר 3 פתוח, ${H('C')} (יסוד) על מיתר 2 שריג 1 — האמצע של אקורד ${H('C')} הפתוח. היסוד על המיתר העליון של הקבוצה.`
      ),
    },
    {
      kind: 'arp',
      arp: 't-C432-2',
      labels: 'degree',
      compare: true,
      title: L('2nd inversion: frets 5-5-5', 'היפוך שני: שריגים 5-5-5'),
      text: L(
        'G (5th) string 4, C (root) string 3, E (3rd) string 2 — all at fret 5: a one-finger barre (or three fingers). The root is in the middle. Note how the B-string shift made a straight line here.',
        `${H('G')} (קווינטה) מיתר 4, ${H('C')} (יסוד) מיתר 3, ${H('E')} (טרצה) מיתר 2 — כולם בשריג 5: ברה של אצבע אחת (או שלוש אצבעות). היסוד באמצע. שים לב שהזזת מיתר ${H('B')} יצרה כאן קו ישר.`
      ),
    },
    {
      kind: 'arp',
      arp: 't-C432-r',
      labels: 'degree',
      compare: true,
      title: L('Root position: frets 10-9-8', 'מצב יסודי: שריגים 10-9-8'),
      text: L(
        'C (root) string 4 fret 10, E (3rd) string 3 fret 9, G (5th) string 2 fret 8 — a diagonal: ring, middle, index. The root is on the lowest string. Three shapes = C at frets 2, 5 and 10, repeating every 12.',
        `${H('C')} (יסוד) מיתר 4 שריג 10, ${H('E')} (טרצה) מיתר 3 שריג 9, ${H('G')} (קווינטה) מיתר 2 שריג 8 — אלכסון: אצבעות 3, 2, 1. היסוד על המיתר הנמוך. שלוש צורות = ${H('C')} בשריגים 2, 5 ו־10, וחוזר כל 12.`
      ),
    },
    {
      kind: 'play',
      arp: ['t-C432-1', 't-C432-2', 't-C432-r'],
      skill: 'tri-432',
      title: L('Climb on 4-3-2', 'טפס על 4-3-2'),
      text: L('1st inversion, 2nd inversion, root position — low to high in each (9 notes). Mute string 1 with the underside of the index finger.', 'היפוך ראשון, היפוך שני, מצב יסודי — מהנמוך לגבוה בכל אחת (9 צלילים). השתק את מיתר 1 בצד התחתון של אצבע 1.'),
    },
    {
      kind: 'arp',
      arp: ['t4-C', 't4-F', 't4-G'],
      labels: 'note',
      title: L('I-IV-V around fret 5', 'I-IV-V סביב שריג 5'),
      text: L(
        'C 2nd inversion (5-5-5: G C E), F 1st inversion (7-5-6: A C F), G root position (5-4-3: G B D). C and F share C (string 3, fret 5); C and G share G (string 4, fret 5) — the hand barely moves.',
        `${H('C')} בהיפוך שני (${H('5-5-5')}: ${H('G C E')}), ${H('F')} בהיפוך ראשון (${H('7-5-6')}: ${H('A C F')}), ${H('G')} במצב יסודי (${H('5-4-3')}: ${H('G B D')}). ל־${H('C')} ול־${H('F')} משותף ${H('C')} (מיתר 3, שריג 5); ל־${H('C')} ול־${H('G')} משותף ${H('G')} (מיתר 4, שריג 5) — היד כמעט לא זזה.`
      ),
    },
    {
      kind: 'play',
      arp: ['t4-C', 't4-F', 't4-C', 't4-G'],
      title: L('C - F - C - G on 4-3-2', 'C - F - C - G על 4-3-2'),
      text: L('I-IV-I-V, each chord low to high.', `${H('I-IV-I-V')}, כל אקורד מהנמוך לגבוה.`),
    },
  ],
  homework: [
    { id: 'tri4-climb', kind: 'play', arp: ['t-C432-1', 't-C432-2', 't-C432-r'], skill: 'tri-432', text: L('C on strings 4-3-2, three shapes — once a day.', `${H('C')} על מיתרים 4-3-2, שלוש צורות — פעם ביום.`) },
  ],
};

// ---------------------------------------------------------------------------
// 5 — Strings 5-4-3 and 6-5-4
const unit5 = {
  id: 'tri-5-low',
  unit: 5,
  title: L('The low sets: 5-4-3 and 6-5-4', 'הקבוצות הנמוכות: 5-4-3 ו־6-5-4'),
  objective: L(
    'Play major triads on the two lower sets and see that they share one set of shapes — completing the 12 major shapes.',
    'לנגן טריאדות מז׳ור על שתי הקבוצות הנמוכות ולראות שיש להן אותן צורות — וכך להשלים את 12 צורות המז׳ור.'
  ),
  minutes: 25,
  skills: ['tri-low'],
  steps: [
    {
      kind: 'explain',
      title: L('No B string, no shift', `בלי מיתר ${H('B')}, בלי הזזה`),
      text: L(
        'Strings 6-5-4 and 5-4-3 are all tuned in 4ths, so they share ONE set of three shapes: the same shape one string set higher is the chord a 4th higher (G on 5-4-3 -> the same frets on 6-5-4 = D). These low triads sound thick — use them for a bass-register part, riffs, or when a keyboard already covers the top. Together with 3-2-1 and 4-3-2 they complete the map: 4 sets x 3 shapes = 12 major shapes.',
        `מיתרים ${H('6-5-4')} ו־${H('5-4-3')} כולם מכוונים בקוורטות, ולכן יש להם סט אחד של שלוש צורות: אותה צורה בקבוצה אחת למטה היא אקורד קוורטה מתחת (${H('G')} על ${H('5-4-3')} ← אותם שריגים על ${H('6-5-4')} = ${H('D')}). הטריאדות הנמוכות נשמעות עבות — משתמשים בהן לקו נמוך, לריפים, או כשקלידים כבר מכסים את הגבוה. יחד עם ${H('3-2-1')} ו־${H('4-3-2')} הן משלימות את המפה: 4 קבוצות × 3 צורות = 12 צורות מז׳ור.`
      ),
    },
    {
      kind: 'arp',
      arp: ['t-G543-1', 't-G543-2', 't-G543-r'],
      labels: 'degree',
      title: L('G on strings 5-4-3', `${H('G')} על מיתרים 5-4-3`),
      text: L(
        '1st inversion at 2-0-0 (B D G — the middle of an open G chord), 2nd inversion at 5-5-4 (D G B), root position at 10-9-7 (G B D). The root moves: top string, middle string, bottom string — the same order as on every other set.',
        `היפוך ראשון ב־${H('2-0-0')} (${H('B D G')} — האמצע של אקורד ${H('G')} פתוח), היפוך שני ב־${H('5-5-4')} (${H('D G B')}), מצב יסודי ב־${H('10-9-7')} (${H('G B D')}). היסוד זז: מיתר עליון, אמצעי, תחתון — אותו סדר כמו בכל קבוצה אחרת.`
      ),
    },
    {
      kind: 'play',
      arp: ['t-G543-1', 't-G543-2', 't-G543-r'],
      title: L('Climb on 5-4-3', 'טפס על 5-4-3'),
      text: L('Three shapes, low to high in each (9 notes).', 'שלוש צורות, מהנמוך לגבוה בכל אחת (9 צלילים).'),
    },
    {
      kind: 'arp',
      arp: ['t-D654-1', 't-D654-2', 't-D654-r'],
      labels: 'degree',
      title: L('The same frets on 6-5-4 = D', `אותם שריגים על 6-5-4 = ${H('D')}`),
      text: L(
        'Move the three shapes down one string set without changing a fret: 2-0-0 is now F♯ A D, 5-5-4 is A D F♯, 10-9-7 is D F♯ A — D major, a 4th below G.',
        `הזז את שלוש הצורות קבוצה אחת למטה בלי לשנות שריג: ${H('2-0-0')} הוא עכשיו ${H('F♯ A D')}, ${H('5-5-4')} הוא ${H('A D F♯')}, ${H('10-9-7')} הוא ${H('D F♯ A')} — ${H('D')} מז׳ור, קוורטה מתחת ל־${H('G')}.`
      ),
    },
    {
      kind: 'play',
      arp: ['t-D654-1', 't-D654-2', 't-D654-r'],
      skill: 'tri-low',
      title: L('Climb on 6-5-4', 'טפס על 6-5-4'),
      text: L('Three shapes of D. Keep the pick light — low strings get muddy when hit hard.', `שלוש הצורות של ${H('D')}. פריטה קלה — מיתרים נמוכים נהיים עכורים כשמכים בהם חזק.`),
    },
    {
      kind: 'quiz',
      id: 'tri-sets',
      title: L('Across the sets', 'בין הקבוצות'),
      question: L('A shape on strings 5-4-3 is C major. The same frets on strings 6-5-4 give…', `צורה על מיתרים 5-4-3 היא ${H('C')} מז׳ור. אותם שריגים על מיתרים 6-5-4 נותנים…`),
      options: [L('F major', `${H('F')} מז׳ור`), L('G major', `${H('G')} מז׳ור`), L('C minor', `${H('C')} מינור`)],
      answer: 1,
      why: L(
        'One set lower = every note a 4th lower: C -> G. (Across the G-B pair this does NOT work — the shape changes.)',
        `קבוצה אחת למטה = כל צליל קוורטה מתחת: ${H('C → G')}. (בין ${H('G')} ל־${H('B')} זה לא עובד — הצורה משתנה.)`
      ),
    },
  ],
  homework: [
    { id: 'tri5-all', kind: 'self', text: L('Play C major on all four sets, three shapes each (12 shapes), naming the bass note of each.', `נגן ${H('C')} מז׳ור על ארבע הקבוצות, שלוש צורות בכל אחת (12 צורות), ואמור את צליל הבס של כל אחת.`) },
  ],
};

// ---------------------------------------------------------------------------
// 6 — Minor, diminished, augmented
const unit6 = {
  id: 'tri-6-quality',
  unit: 6,
  title: L('Minor, diminished, augmented', 'מינור, מוקטן, מוגדל'),
  objective: L(
    'Turn every major shape into minor by lowering the 3rd; build diminished and augmented from it; know the augmented triad is symmetric.',
    'להפוך כל צורת מז׳ור למינור בהורדת הטרצה; לבנות ממנה מוקטן ומוגדל; ולדעת שהמוגדל סימטרי.'
  ),
  minutes: 30,
  skills: ['tri-minor', 'tri-dimaug'],
  steps: [
    {
      kind: 'arp',
      arp: 't1-C-minor',
      labels: 'degree',
      hear: ['t1-C-major', 't1-C-minor'],
      title: L('Minor = the 3rd one fret down', 'מינור = הטרצה שריג למטה'),
      text: L(
        'Take any major shape, find its 3rd, and lower it ONE fret: that is the minor triad (1 ♭3 5). C major 5-5-3 -> C minor 5-4-3 (the E became E♭). Nothing else moves. Hear major, then minor.',
        `קח כל צורת מז׳ור, מצא את הטרצה שלה והורד אותה שריג אחד: זו טריאדת המינור (${H('1 ♭3 5')}). ${H('C')} מז׳ור ${H('5-5-3')} ← ${H('C')} מינור ${H('5-4-3')} (ה־${H('E')} הפך ל־${H('E♭')}). שום דבר אחר לא זז. הקשב למז׳ור ואז למינור.`
      ),
    },
    {
      kind: 'arp',
      arp: ['t-Am321-r', 't-Am321-1', 't-Am321-2'],
      labels: 'degree',
      title: L('A minor on strings 3-2-1', `${H('A')} מינור על מיתרים 3-2-1`),
      text: L(
        'Root position 2-1-0 (A C E — the top of an open Am chord), 1st inversion 5-5-5 (C E A, one-finger barre), 2nd inversion 9-10-8 (E A C). Compare each with the major shape at the same place: only the ♭3 moved.',
        `מצב יסודי ${H('2-1-0')} (${H('A C E')} — החלק העליון של אקורד ${H('Am')} פתוח), היפוך ראשון ${H('5-5-5')} (${H('C E A')}, ברה של אצבע אחת), היפוך שני ${H('9-10-8')} (${H('E A C')}). השווה כל אחת לצורת המז׳ור באותו מקום: רק ה־${H('♭3')} זז.`
      ),
    },
    {
      kind: 'play',
      arp: ['t-Am321-r', 't-Am321-1', 't-Am321-2'],
      skill: 'tri-minor',
      title: L('Climb A minor', `טפס ב־${H('A')} מינור`),
      text: L('Three shapes, low to high in each (9 notes).', 'שלוש צורות, מהנמוך לגבוה בכל אחת (9 צלילים).'),
    },
    {
      kind: 'arp',
      arp: ['t-Am432-2', 't-Am432-r', 't-Am432-1'],
      labels: 'degree',
      title: L('A minor on strings 4-3-2', `${H('A')} מינור על מיתרים 4-3-2`),
      text: L(
        '2nd inversion 2-2-1 (E A C), root position 7-5-5 (A C E), 1st inversion 10-9-10 (C E A). The B-string shift applies to minor exactly as to major.',
        `היפוך שני ${H('2-2-1')} (${H('E A C')}), מצב יסודי ${H('7-5-5')} (${H('A C E')}), היפוך ראשון ${H('10-9-10')} (${H('C E A')}). הזזת מיתר ${H('B')} חלה על מינור בדיוק כמו על מז׳ור.`
      ),
    },
    {
      kind: 'play',
      arp: ['t-Am432-2', 't-Am432-r', 't-Am432-1'],
      title: L('Climb A minor on 4-3-2', `טפס ב־${H('A')} מינור על 4-3-2`),
      text: L('9 notes, clean.', '9 צלילים, נקי.'),
    },
    {
      kind: 'arp',
      arp: 't-Bdim321',
      labels: 'degree',
      hear: ['t-Bdim321', 't3-C'],
      title: L('Diminished: lower the 5th too', 'מוקטן: להוריד גם את הקווינטה'),
      text: L(
        'From a minor triad, lower the 5th one fret: 1 ♭3 ♭5, two minor thirds. B diminished = B D F, root position at 4-3-1. In a major key it is the chord on the 7th degree, and it pulls hard to the tonic: hear B° resolve to C (B goes up to C, F goes down to E).',
        `ממינור, הורד גם את הקווינטה שריג: ${H('1 ♭3 ♭5')}, שתי טרצות קטנות. ${H('B')} מוקטן = ${H('B D F')}, מצב יסודי ב־${H('4-3-1')}. במפתח מז׳ור זה האקורד של הדרגה השביעית, והוא מושך חזק לטוניקה: הקשב ל־${H('B°')} שנפתר ל־${H('C')} (${H('B')} עולה ל־${H('C')}, ${H('F')} יורד ל־${H('E')}).`
      ),
    },
    {
      kind: 'arp',
      arp: ['t-Caug-a', 't-Caug-b', 't-Caug-c'],
      labels: 'degree',
      title: L('Augmented: one shape, every 4 frets', 'מוגדל: צורה אחת, כל 4 שריגים'),
      text: L(
        'From a major triad, raise the 5th one fret: 1 3 ♯5, two major thirds. C augmented = C E G♯ (5-5-4). Because M3 + M3 + M3 = an octave, every inversion has the SAME shape, just 4 frets higher (9-9-8, 13-13-12) — and the same notes also spell E+ and G♯+. One shape, three names.',
        `ממז׳ור, הרם את הקווינטה שריג: ${H('1 3 ♯5')}, שתי טרצות גדולות. ${H('C')} מוגדל = ${H('C E G♯')} (${H('5-5-4')}). מכיוון ש־${H('M3 + M3 + M3')} = אוקטבה, לכל היפוך יש אותה צורה בדיוק, רק 4 שריגים גבוה יותר (${H('9-9-8')}, ${H('13-13-12')}) — ואותם צלילים הם גם ${H('E+')} ו־${H('G♯+')}. צורה אחת, שלושה שמות.`
      ),
    },
    {
      kind: 'play',
      arp: ['t-Bdim321', 't-Caug-a', 't-Caug-b', 't-Caug-c'],
      skill: 'tri-dimaug',
      title: L('Play B° and C+', `נגן ${H('B°')} ו־${H('C+')}`),
      text: L('B diminished, then C augmented in its three places (12 notes).', `${H('B')} מוקטן, ואחריו ${H('C')} מוגדל בשלושת המקומות שלו (12 צלילים).`),
    },
    {
      kind: 'quiz',
      id: 'tri-q6',
      title: L('From major', 'ממז׳ור'),
      question: L('G major on 3-2-1 at 4-3-3 is B D G (1st inversion). To make G minor you move…', `${H('G')} מז׳ור על 3-2-1 ב־${H('4-3-3')} הוא ${H('B D G')} (היפוך ראשון). כדי לקבל ${H('G')} מינור מזיזים…`),
      options: [L('String 3 down a fret (B -> B♭)', `את מיתר 3 שריג למטה (${H('B → B♭')})`), L('String 2 down a fret (D -> C♯)', `את מיתר 2 שריג למטה (${H('D → C♯')})`), L('String 1 down a fret (G -> F♯)', `את מיתר 1 שריג למטה (${H('G → F♯')})`)],
      answer: 0,
      why: L('B is the 3rd of G, and in 1st inversion the 3rd is the lowest note: 3-3-3 = B♭ D G = G minor.', `${H('B')} הוא הטרצה של ${H('G')}, ובהיפוך ראשון הטרצה היא הצליל הנמוך: ${H('3-3-3')} = ${H('B♭ D G')} = ${H('G')} מינור.`),
    },
  ],
  homework: [
    { id: 'tri6-am', kind: 'play', arp: ['t-Am321-r', 't-Am321-1', 't-Am321-2'], skill: 'tri-minor', text: L('A minor on strings 3-2-1 — once a day.', `${H('A')} מינור על מיתרים 3-2-1 — פעם ביום.`) },
    { id: 'tri6-self', kind: 'self', text: L('Take each C major shape from units 2 and 4 and make it minor by finding and lowering the 3rd.', `קח כל צורת ${H('C')} מז׳ור מיחידות 2 ו־4 והפוך אותה למינור: מצא את הטרצה והורד אותה.`) },
  ],
};

// ---------------------------------------------------------------------------
// 7 — The chord scale
const SCALE7 = ids('t7', 8);
const unit7 = {
  id: 'tri-7-scale',
  unit: 7,
  title: L('The chord scale of a key', 'סולם האקורדים של מפתח'),
  objective: L(
    'Harmonize the C major scale with triads on one string set, and know the quality of every degree: I ii iii IV V vi vii°.',
    `להרמן את סולם ${H('C')} מז׳ור בטריאדות על קבוצת מיתרים אחת, ולדעת את הסוג של כל דרגה: ${H('I ii iii IV V vi vii°')}.`
  ),
  minutes: 30,
  skills: ['tri-scale', 'tri-qual'],
  steps: [
    {
      kind: 'explain',
      title: L('Every scale note gets a triad', 'לכל צליל בסולם יש טריאדה'),
      text: L(
        'Stack two thirds on each note of C major using ONLY notes of the scale (C D E F G A B), and you get the seven chords of the key: C (I), Dm (ii), Em (iii), F (IV), G (V), Am (vi), B° (vii°). The pattern of qualities is the same in every major key: major, minor, minor, major, major, minor, diminished. Roman numerals: capitals = major, small = minor, ° = diminished.',
        `בנה שתי טרצות על כל צליל של ${H('C')} מז׳ור, רק מצלילי הסולם (${H('C D E F G A B')}), ותקבל את שבעת האקורדים של המפתח: ${H('C (I), Dm (ii), Em (iii), F (IV), G (V), Am (vi), B° (vii°)')}. סדר הסוגים זהה בכל מפתח מז׳ור: מז׳ור, מינור, מינור, מז׳ור, מז׳ור, מינור, מוקטן. ספרות רומיות: גדולות = מז׳ור, קטנות = מינור, ${H('°')} = מוקטן.`
      ),
    },
    {
      kind: 'arp',
      arp: SCALE7,
      labels: 'note',
      title: L('C major, 2nd inversion, strings 3-2-1', `${H('C')} מז׳ור, היפוך שני, מיתרים 3-2-1`),
      text: L(
        'Keep ONE inversion and walk it up the scale: G C E (0-1-0) C, A D F (2-3-1) Dm, B E G (4-5-3) Em, C F A (5-6-5) F, D G B (7-8-7) G, E A C (9-10-8) Am, F B D (10-12-10) B°, G C E (12-13-12) C. Every note of each shape simply steps up to the next scale note. Hear the ladder.',
        `שמור על היפוך אחד ועלה איתו בסולם: ${H('G C E (0-1-0) C')}, ${H('A D F (2-3-1) Dm')}, ${H('B E G (4-5-3) Em')}, ${H('C F A (5-6-5) F')}, ${H('D G B (7-8-7) G')}, ${H('E A C (9-10-8) Am')}, ${H('F B D (10-12-10) B°')}, ${H('G C E (12-13-12) C')}. כל צליל בכל צורה פשוט עולה לצליל הבא בסולם. הקשב לסולם.`
      ),
    },
    {
      kind: 'play',
      arp: SCALE7,
      skill: 'tri-scale',
      title: L('Climb the chord scale', 'טפס בסולם האקורדים'),
      text: L('Eight triads, low to high in each (24 notes). Name each chord as you play it: C, Dm, Em, F, G, Am, B°, C.', `שמונה טריאדות, מהנמוך לגבוה בכל אחת (24 צלילים). אמור את שם כל אקורד בזמן הנגינה: ${H('C, Dm, Em, F, G, Am, B°, C')}.`),
    },
    {
      kind: 'quiz',
      id: 'tri-qual',
      skill: 'tri-qual',
      title: L('Degrees', 'דרגות'),
      question: L('In G major, what is the chord on the 6th degree (vi)?', `ב־${H('G')} מז׳ור, מהו האקורד על הדרגה השישית (${H('vi')})?`),
      options: [L('E major', `${H('E')} מז׳ור`), L('E minor', `${H('E')} מינור`), L('E diminished', `${H('E')} מוקטן`)],
      answer: 1,
      why: L('G A B C D E F♯: the 6th note is E, and vi is always minor: E G B.', `${H('G A B C D E F♯')}: הצליל השישי הוא ${H('E')}, ו־${H('vi')} תמיד מינור: ${H('E G B')}.`),
    },
    {
      kind: 'quiz',
      id: 'tri-qual-2',
      title: L('The odd one', 'היוצא דופן'),
      question: L('Which degree of a major key gives the diminished triad?', 'איזו דרגה במפתח מז׳ור נותנת את הטריאדה המוקטנת?'),
      options: [L('ii', H('ii')), L('V', H('V')), L('vii', H('vii'))],
      answer: 2,
      why: L('vii° (B D F in C): the only triad of the key with two minor thirds.', `${H('vii°')} (${H('B D F')} ב־${H('C')}): הטריאדה היחידה במפתח עם שתי טרצות קטנות.`),
    },
    {
      kind: 'checklist',
      metronome: 70,
      title: L('Chord scale in time', 'סולם האקורדים בזמן'),
      text: L('Start the metronome below:', 'הפעל את המטרונום כאן למטה:'),
      items: [
        L('Strum the 8 chords up and back down, 2 strums each, at 70 bpm.', 'פרוט את 8 האקורדים למעלה ובחזרה, 2 פריטות לכל אחד, ב־70 BPM.'),
        L('Then do it in G major: start on D G B (fret 7) and keep the same inversion.', `ואז ב־${H('G')} מז׳ור: התחל ב־${H('D G B')} (שריג 7) והשאר את אותו היפוך.`),
      ],
    },
  ],
  homework: [
    { id: 'tri7-scale', kind: 'play', arp: SCALE7, skill: 'tri-scale', text: L('The C chord scale on 3-2-1 — once a day.', `סולם האקורדים של ${H('C')} על 3-2-1 — פעם ביום.`) },
    { id: 'tri7-other', kind: 'self', text: L('Build the chord scale of C in root position and in 1st inversion on 3-2-1 yourself.', `בנה לבד את סולם האקורדים של ${H('C')} במצב יסודי ובהיפוך ראשון על 3-2-1.`) },
  ],
};

// ---------------------------------------------------------------------------
// 8 — Voice leading
const unit8 = {
  id: 'tri-8-lead',
  unit: 8,
  title: L('Voice leading', 'הובלת קולות'),
  objective: L(
    'Connect chords so every voice moves as little as possible: keep common tones, step the others, and hear the top note as a melody.',
    'לחבר אקורדים כך שכל קול זז כמה שפחות: להשאיר צלילים משותפים, להזיז את האחרים בצעד, ולשמוע את הצליל העליון כמנגינה.'
  ),
  minutes: 35,
  skills: ['tri-lead', 'tri-cycle'],
  steps: [
    {
      kind: 'explain',
      title: L('Three voices, not three shapes', 'שלושה קולות, לא שלוש צורות'),
      text: L(
        'Think of a triad as three singers: low, middle, high. Between two chords each singer moves to the NEAREST note of the new chord — a common tone stays where it is, the others move by a step (1-2 frets). The rules teachers give: 1) keep common tones, 2) move the other voices by the smallest step, 3) listen to the top voice — it becomes a melody of its own. The inversion you end up in is a result, not a choice.',
        'חשוב על טריאדה כעל שלושה זמרים: נמוך, אמצעי, גבוה. בין שני אקורדים כל זמר עובר לצליל הקרוב ביותר באקורד החדש — צליל משותף נשאר במקום, האחרים זזים בצעד (1–2 שריגים). הכללים שמורים נותנים: 1) להשאיר צלילים משותפים, 2) להזיז את שאר הקולות בצעד הקטן ביותר, 3) להקשיב לקול העליון — הוא הופך למנגינה בפני עצמו. ההיפוך שאליו מגיעים הוא תוצאה, לא בחירה.'
      ),
    },
    {
      kind: 'arp',
      arp: ids('t8a', 4),
      labels: 'note',
      title: L('I - vi - IV - V: C Am F G', `${H('I - vi - IV - V')}: ${H('C Am F G')}`),
      text: L(
        'On 3-2-1 from C (5-5-3: C E G): to Am only the top voice moves, G -> A (5-5-5: C E A — C and E are common). To F the middle voice steps E -> F (5-6-5: C F A). To G every voice steps down (4-3-3: B D G). Top voice melody: G A A G. Four chords, and the hand never leaves frets 3-6.',
        `על ${H('3-2-1')} מ־${H('C')} (${H('5-5-3')}: ${H('C E G')}): ל־${H('Am')} רק הקול העליון זז, ${H('G → A')} (${H('5-5-5')}: ${H('C E A')} — ${H('C')} ו־${H('E')} משותפים). ל־${H('F')} הקול האמצעי עולה ${H('E → F')} (${H('5-6-5')}: ${H('C F A')}). ל־${H('G')} כל הקולות יורדים צעד (${H('4-3-3')}: ${H('B D G')}). מנגינת הקול העליון: ${H('G A A G')}. ארבעה אקורדים, והיד לא עוזבת את שריגים ${H('3-6')}.`
      ),
    },
    {
      kind: 'play',
      arp: ids('t8a', 4),
      skill: 'tri-lead',
      title: L('Play C Am F G', `נגן ${H('C Am F G')}`),
      text: L('Each chord low to high (12 notes). Feel which fingers stay down.', 'כל אקורד מהנמוך לגבוה (12 צלילים). הרגש אילו אצבעות נשארות לחוצות.'),
    },
    {
      kind: 'quiz',
      id: 'tri-lead-q',
      title: L('Common tones', 'צלילים משותפים'),
      question: L('C major (C E G) to A minor (A C E): how many notes stay?', `${H('C')} מז׳ור (${H('C E G')}) ל־${H('A')} מינור (${H('A C E')}): כמה צלילים נשארים?`),
      options: [L('None', 'אף אחד'), L('One', 'אחד'), L('Two', 'שניים')],
      answer: 2,
      why: L('C and E are in both. Chords a 3rd apart share two notes — only one voice moves (G -> A).', `${H('C')} ו־${H('E')} נמצאים בשניהם. לאקורדים במרחק טרצה יש שני צלילים משותפים — רק קול אחד זז (${H('G → A')}).`),
    },
    {
      kind: 'arp',
      arp: ids('t8b', 3),
      labels: 'note',
      title: L('ii - V - I: Dm G C on 4-3-2', `${H('ii - V - I')}: ${H('Dm G C')} על 4-3-2`),
      text: L(
        'The most important cadence in jazz and much pop. Dm 2nd inversion (7-7-6: A D F), G 1st inversion (9-7-8: B D G — D stays), C root position (10-9-8: C E G — G stays). Each step: one common tone, the other voices move a fret or two.',
        `הקדנצה החשובה ביותר בג׳אז ובהרבה פופ. ${H('Dm')} בהיפוך שני (${H('7-7-6')}: ${H('A D F')}), ${H('G')} בהיפוך ראשון (${H('9-7-8')}: ${H('B D G')} — ${H('D')} נשאר), ${H('C')} במצב יסודי (${H('10-9-8')}: ${H('C E G')} — ${H('G')} נשאר). בכל צעד: צליל משותף אחד, ושאר הקולות זזים שריג או שניים.`
      ),
    },
    {
      kind: 'play',
      arp: ids('t8b', 3),
      title: L('Play Dm G C', `נגן ${H('Dm G C')}`),
      text: L('9 notes.', '9 צלילים.'),
    },
    {
      kind: 'arp',
      arp: ids('t8c', 8),
      labels: 'note',
      title: L('The cycle of 4ths drill', 'תרגיל מעגל הקוורטות'),
      text: L(
        'The classic triad workout: the chords of C in 4ths — C F B° Em Am Dm G C — each led to the nearest inversion. Every move keeps one common tone. Here it climbs on 3-2-1 from C 1st inversion (fret 8) to fret 17. It trains all three inversions, all qualities of the key, and voice leading at once.',
        `אימון הטריאדות הקלאסי: אקורדי ${H('C')} בקוורטות — ${H('C F B° Em Am Dm G C')} — כל אחד מובל להיפוך הקרוב. בכל מעבר נשאר צליל משותף אחד. כאן הוא עולה על ${H('3-2-1')} מ־${H('C')} בהיפוך ראשון (שריג 8) עד שריג 17. הוא מאמן את שלושת ההיפוכים, את כל הסוגים במפתח והובלת קולות — בבת אחת.`
      ),
    },
    {
      kind: 'play',
      arp: ids('t8c', 8),
      skill: 'tri-cycle',
      title: L('Play the cycle', 'נגן את המעגל'),
      text: L('Eight chords, low to high in each (24 notes).', 'שמונה אקורדים, מהנמוך לגבוה בכל אחד (24 צלילים).'),
    },
    {
      kind: 'checklist',
      metronome: 60,
      title: L('The tempo ladder', 'סולם הקצב'),
      text: L('Make the voice leading automatic (start the metronome below):', 'הפוך את הובלת הקולות לאוטומטית (הפעל את המטרונום כאן למטה):'),
      items: [
        L('C Am F G: one strum per click at 60, then 70, then 80 — only go up after 3 clean rounds.', `${H('C Am F G')}: פריטה אחת בכל קליק ב־60, ואז 70, ואז 80 — עולים רק אחרי 3 סבבים נקיים.`),
        L('The same progression on 4-3-2: work it out yourself from C at 10-9-8.', `אותו מהלך על ${H('4-3-2')}: מצא אותו לבד, החל מ־${H('C')} ב־${H('10-9-8')}.`),
        L('The cycle of 4ths: one chord per bar, then two per bar.', 'מעגל הקוורטות: אקורד בתיבה, ואחר כך שניים בתיבה.'),
      ],
    },
  ],
  homework: [
    { id: 'tri8-lead', kind: 'play', arp: ids('t8a', 4), skill: 'tri-lead', text: L('C Am F G led on 3-2-1 — once a day.', `${H('C Am F G')} בהובלת קולות על 3-2-1 — פעם ביום.`) },
    { id: 'tri8-cycle', kind: 'play', arp: ids('t8c', 8), skill: 'tri-cycle', text: L('The cycle of 4ths in C — once a day.', `מעגל הקוורטות ב־${H('C')} — פעם ביום.`) },
  ],
};

// ---------------------------------------------------------------------------
// 9 — Spread triads
const unit9 = {
  id: 'tri-9-spread',
  unit: 9,
  title: L('Spread (open) triads', 'טריאדות פתוחות'),
  objective: L(
    'Play triads spread over more than an octave (skipping a string), and lead them through a progression.',
    'לנגן טריאדות שמתפרשות על יותר מאוקטבה (בדילוג על מיתר), ולהוביל אותן במהלך.'
  ),
  minutes: 25,
  skills: ['tri-spread'],
  steps: [
    {
      kind: 'arp',
      arp: 't9-G',
      labels: 'degree',
      hear: ['t9-close', 't9-G'],
      title: L('Close vs spread', 'צפופה מול פתוחה'),
      text: L(
        'A close triad keeps its three notes inside one octave (G B D). A SPREAD triad takes the middle note up an octave: G D B (1 5 3) — the same chord, wider, like a string section or a piano’s two hands. On guitar it means skipping a string: root on string 6 (fret 3), 5th on string 4 (open D), 3rd on string 3 (fret 4). Hear close, then spread.',
        `טריאדה צפופה שומרת את שלושת הצלילים בתוך אוקטבה אחת (${H('G B D')}). טריאדה פתוחה מעלה את הצליל האמצעי אוקטבה: ${H('G D B')} (${H('1 5 3')}) — אותו אקורד, רחב יותר, כמו כלי קשת או שתי ידיים בפסנתר. בגיטרה זה אומר לדלג על מיתר: יסוד על מיתר 6 (שריג 3), קווינטה על מיתר 4 (${H('D')} פתוח), טרצה על מיתר 3 (שריג 4). הקשב לצפופה ואחר כך לפתוחה.`
      ),
    },
    {
      kind: 'arp',
      arp: ['t9-G', 't9-C', 't9-F'],
      labels: 'degree',
      title: L('Root on 6, 5 and 4', 'יסוד על 6, 5 ו־4'),
      text: L(
        'The spread root-position shape (1 5 3) on three string groups: G on 6-4-3 (3-0-4), C on 5-3-2 (3-0-5), F on 4-2-1 (3-1-5). Mute the skipped string with the underside of the finger on the string below it; pick or pluck with fingers (thumb + two fingers is the natural way).',
        `הצורה הפתוחה במצב יסודי (${H('1 5 3')}) על שלוש קבוצות מיתרים: ${H('G')} על ${H('6-4-3')} (${H('3-0-4')}), ${H('C')} על ${H('5-3-2')} (${H('3-0-5')}), ${H('F')} על ${H('4-2-1')} (${H('3-1-5')}). השתק את המיתר המדולג בצד התחתון של האצבע שעל המיתר שמתחתיו; פרוט במפרט או באצבעות (אגודל ושתי אצבעות הוא הדרך הטבעית).`
      ),
    },
    {
      kind: 'play',
      arp: ['t9-G', 't9-C', 't9-F'],
      title: L('Play G, C, F spread', `נגן ${H('G, C, F')} פתוחים`),
      text: L('9 notes, each chord low to high.', '9 צלילים, כל אקורד מהנמוך לגבוה.'),
    },
    {
      kind: 'arp',
      arp: ['t9-G1', 't9-G2'],
      labels: 'degree',
      title: L('Spread inversions', 'היפוכים פתוחים'),
      text: L(
        'Spread triads invert too: 3 1 5 (B G D on 5-3-2: 2-0-3) and 5 3 1 (D B G on 4-2-1: 0-0-3). Same G major, three bass notes, three colours.',
        `גם טריאדות פתוחות מתהפכות: ${H('3 1 5')} (${H('B G D')} על ${H('5-3-2')}: ${H('2-0-3')}) ו־${H('5 3 1')} (${H('D B G')} על ${H('4-2-1')}: ${H('0-0-3')}). אותו ${H('G')} מז׳ור, שלושה צלילי בס, שלושה צבעים.`
      ),
    },
    {
      kind: 'arp',
      arp: ids('t9p', 4),
      labels: 'note',
      title: L('Leading spread triads: G C D G', `הובלת טריאדות פתוחות: ${H('G C D G')}`),
      text: L(
        'On 6-4-3: G (3-0-4: G D B) -> C (3-2-5: G E C — G stays in the bass) -> D (2-0-2: F♯ D A) -> G (3-0-4). The voice-leading rules work the same, and the low string now draws a bass line: G G F♯ G.',
        `על ${H('6-4-3')}: ${H('G')} (${H('3-0-4')}: ${H('G D B')}) ← ${H('C')} (${H('3-2-5')}: ${H('G E C')} — ${H('G')} נשאר בבס) ← ${H('D')} (${H('2-0-2')}: ${H('F♯ D A')}) ← ${H('G')} (${H('3-0-4')}). כללי הובלת הקולות עובדים אותו דבר, והמיתר הנמוך מצייר עכשיו קו בס: ${H('G G F♯ G')}.`
      ),
    },
    {
      kind: 'play',
      arp: ids('t9p', 4),
      skill: 'tri-spread',
      title: L('Play G C D G spread', `נגן ${H('G C D G')} פתוחים`),
      text: L('12 notes. Let the notes ring into each other.', '12 צלילים. תן לצלילים לצלצל זה לתוך זה.'),
    },
  ],
  homework: [
    { id: 'tri9-prog', kind: 'play', arp: ids('t9p', 4), skill: 'tri-spread', text: L('G C D G in spread triads — once a day.', `${H('G C D G')} בטריאדות פתוחות — פעם ביום.`) },
  ],
};

// ---------------------------------------------------------------------------
// 10 — Using triads in music + final test
const unit10 = {
  id: 'tri-10-use',
  unit: 10,
  title: L('Using triads in music', 'טריאדות במוזיקה'),
  objective: L(
    'Use triads the way players do: as upper structures over a bass, with sus colours, in rhythm parts and through a song progression — then pass the final test.',
    'להשתמש בטריאדות כמו נגנים: כמבנה עליון מעל בס, עם צבעי sus, בליווי קצבי ובמהלך של שיר — ולעבור את המבחן המסכם.'
  ),
  minutes: 35,
  skills: ['tri-use', 'tri-final'],
  steps: [
    {
      kind: 'arp',
      arp: 't10-Cover',
      labels: 'note',
      title: L('A triad over another bass', 'טריאדה מעל בס אחר'),
      text: L(
        'In a band the bass player often plays a note that is not your root. A triad over a different bass makes a new, richer chord: a C triad (C E G) over an A in the bass = A C E G = Am7. An F triad over D = Dm7. This is how guitarists get colourful chords from simple shapes: play the triad, let the bass do the rest.',
        `בלהקה הבסיסט מנגן לעיתים קרובות צליל שאינו היסוד שלך. טריאדה מעל בס אחר יוצרת אקורד חדש ועשיר יותר: טריאדת ${H('C')} (${H('C E G')}) מעל ${H('A')} בבס = ${H('A C E G')} = ${H('Am7')}. טריאדת ${H('F')} מעל ${H('D')} = ${H('Dm7')}. כך גיטריסטים מקבלים אקורדים צבעוניים מצורות פשוטות: מנגנים את הטריאדה, והבס עושה את השאר.`
      ),
    },
    {
      kind: 'quiz',
      id: 'tri-over',
      title: L('Upper structure', 'מבנה עליון'),
      question: L('An F triad (F A C) over a D bass note makes…', `טריאדת ${H('F')} (${H('F A C')}) מעל צליל בס ${H('D')} יוצרת…`),
      options: [L('Dm7 (D F A C)', H('Dm7 (D F A C)')), L('D7 (D F♯ A C)', H('D7 (D F♯ A C)')), L('Fmaj7', H('Fmaj7'))],
      answer: 0,
      why: L('D + F A C = D F A C: root, ♭3, 5, ♭7 = D minor 7.', `${H('D')} + ${H('F A C')} = ${H('D F A C')}: יסוד, ${H('♭3')}, 5, ${H('♭7')} = ${H('D')} מינור 7.`),
    },
    {
      kind: 'arp',
      arp: 't10-D',
      labels: 'degree',
      hear: ['t10-D', 't10-Dsus4', 't10-D', 't10-Dsus2', 't10-D'],
      title: L('Sus colours: the soul / rock move', 'צבעי sus: התנועה של סול ורוק'),
      text: L(
        'Replace the 3rd with the 4th (sus4) or the 2nd (sus2) for a moment and come back: D (A D F♯) -> Dsus4 (A D G) -> D -> Dsus2 (A D E) -> D. On the top string: hammer the 4th, pull back to the 3rd, pull off to the open E for sus2. This embellishment is the heart of countless soul, Motown and rock rhythm parts.',
        `החלף את הטרצה לרגע בקוורטה (${H('sus4')}) או בסקונדה (${H('sus2')}) וחזור: ${H('D (A D F♯) → Dsus4 (A D G) → D → Dsus2 (A D E) → D')}. על המיתר העליון: hammer לקוורטה, pull חזרה לטרצה, pull-off ל־${H('E')} הפתוח בשביל ${H('sus2')}. הקישוט הזה הוא הלב של אינספור ליוויי סול, מוטאון ורוק.`
      ),
    },
    {
      kind: 'checklist',
      metronome: 80,
      title: L('Rhythm parts with triads', 'ליווי קצבי בטריאדות'),
      text: L('Three standard ways players use small triads (start the metronome below):', 'שלוש דרכים מקובלות שבהן נגנים משתמשים בטריאדות קטנות (הפעל את המטרונום כאן למטה):'),
      items: [
        L('Reggae / ska “skank”: C - F - G on 3-2-1, a short down-strum ONLY on the off-beats (the “and”), choked by releasing the fingers.', `"סקאנק" של רגאיי / סקא: ${H('C - F - G')} על ${H('3-2-1')}, פריטה קצרה למטה רק על ההפסקים (ה"ו"), שנחנקת בשחרור האצבעות.`),
        L('Funk: 16th-note strumming with the hand always moving, the triad sounding only on a few accents, muted strokes between.', 'פאנק: פריטה בשש־עשריות כשהיד זזה כל הזמן, הטריאדה נשמעת רק בכמה הדגשות, ובאמצע פריטות מושתקות.'),
        L('Second guitar: while a friend (or a recording) plays full chords, play the same progression as triads high on the neck.', 'גיטרה שנייה: בזמן שחבר (או הקלטה) מנגן אקורדים מלאים, נגן את אותו מהלך כטריאדות גבוה בצוואר.'),
      ],
    },
    {
      kind: 'arp',
      arp: ids('t10s', 4),
      labels: 'note',
      title: L('A song progression: G Em C D', `מהלך של שיר: ${H('G Em C D')}`),
      text: L(
        'I - vi - IV - V in G, the progression of hundreds of songs, led on 3-2-1 around fret 10-13: G (12-12-10), Em (12-12-12), C (12-13-12), D (11-10-10). Two common tones from G to Em and from Em to C; one step down to D.',
        `${H('I - vi - IV - V')} ב־${H('G')}, המהלך של מאות שירים, בהובלת קולות על ${H('3-2-1')} סביב שריגים ${H('10-13')}: ${H('G (12-12-10)')}, ${H('Em (12-12-12)')}, ${H('C (12-13-12)')}, ${H('D (11-10-10)')}. שני צלילים משותפים מ־${H('G')} ל־${H('Em')} ומ־${H('Em')} ל־${H('C')}; צעד אחד למטה ל־${H('D')}.`
      ),
    },
    {
      kind: 'play',
      arp: ids('t10s', 4),
      skill: 'tri-use',
      title: L('Play G Em C D', `נגן ${H('G Em C D')}`),
      text: L('12 notes. Then strum it with a song you know in G.', `12 צלילים. ואחר כך פרוט את זה עם שיר שאתה מכיר ב־${H('G')}.`),
    },
    {
      kind: 'quiz',
      id: 'tri-final',
      skill: 'tri-final',
      title: L('Final test 1/3', 'מבחן מסכם 1/3'),
      question: L('A triad on strings 3-2-1 has the root on string 2. Which inversion is it?', 'לטריאדה על מיתרים 3-2-1 יש יסוד על מיתר 2. איזה היפוך זה?'),
      options: [L('Root position', 'מצב יסודי'), L('1st inversion', 'היפוך ראשון'), L('2nd inversion', 'היפוך שני')],
      answer: 2,
      why: L('Root in the middle -> the 5th is in the bass -> 2nd inversion (5 1 3).', `יסוד באמצע ← הקווינטה בבס ← היפוך שני (${H('5 1 3')}).`),
    },
    {
      kind: 'quiz',
      id: 'tri-final-2',
      title: L('Final test 2/3', 'מבחן מסכם 2/3'),
      question: L('In F major, which triads are minor?', `ב־${H('F')} מז׳ור, אילו טריאדות הן מינור?`),
      options: [L('Gm, Am, Dm', H('Gm, Am, Dm')), L('Gm, Bbm, Dm', H('Gm, B♭m, Dm')), L('Am, Cm, Em', H('Am, Cm, Em'))],
      answer: 0,
      why: L('F G A B♭ C D E: ii = Gm, iii = Am, vi = Dm (B♭ and C are major, E is diminished).', `${H('F G A B♭ C D E')}: ${H('ii = Gm')}, ${H('iii = Am')}, ${H('vi = Dm')} (${H('B♭')} ו־${H('C')} מז׳ור, ${H('E')} מוקטן).`),
    },
    {
      kind: 'arp',
      arp: ids('t10f', 4),
      labels: 'note',
      title: L('Final test 3/3: Am F C G', `מבחן מסכם 3/3: ${H('Am F C G')}`),
      text: L(
        'The last task, on strings 4-3-2: Am (10-9-10: C E A), F (10-10-10: C F A — C and A stay), C (10-9-8: C E G — C and E stay), G (9-7-8: B D G — G stays). Hear it, then play it on the next screen and feel which fingers stay down.',
        `המשימה האחרונה, על ${H('4-3-2')}: ${H('Am (10-9-10: C E A)')}, ${H('F (10-10-10: C F A')} — ${H('C')} ו־${H('A')} נשארים), ${H('C (10-9-8: C E G')} — ${H('C')} ו־${H('E')} נשארים), ${H('G (9-7-8: B D G')} — ${H('G')} נשאר). הקשב, ואז נגן את זה במסך הבא והרגש אילו אצבעות נשארות לחוצות.`
      ),
    },
    {
      kind: 'play',
      arp: ids('t10f', 4),
      title: L('Play Am F C G', `נגן ${H('Am F C G')}`),
      text: L('12 notes on strings 4-3-2. When this is clean, you have covered the whole triad syllabus.', '12 צלילים על מיתרים 4-3-2. כשזה נקי — עברת את כל תוכנית הטריאדות.'),
    },
  ],
  homework: [
    { id: 'tri10-song', kind: 'play', arp: ids('t10s', 4), skill: 'tri-use', text: L('G Em C D on 3-2-1 — once a day.', `${H('G Em C D')} על 3-2-1 — פעם ביום.`) },
    { id: 'tri10-songs', kind: 'self', text: L('Take three songs you know and play them only with triads, in one area of the neck.', 'קח שלושה שירים שאתה מכיר ונגן אותם רק בטריאדות, באזור אחד של הצוואר.') },
  ],
};

export const TRIAD_LESSONS = [unit1, unit2, unit3, unit4, unit5, unit6, unit7, unit8, unit9, unit10];
export const triadLessonById = (id) => TRIAD_LESSONS.find((l) => l.id === id);
