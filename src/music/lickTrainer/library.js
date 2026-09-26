// Lick Trainer library — licks with exact rhythm, so they can be played back
// in time and a take can be judged against them.
//
// Authoring format (tab-style, what a guitarist reads):
//   n(beat, beats, string, fret, opts)
//   - beat:   start, in quarter-note beats from the start of the lick
//   - beats:  length in beats (0.5 = eighth, 0.25 = sixteenth, 1/3 = triplet eighth)
//   - string: 1 = high e ... 6 = low E (tab numbering)
//   - opts:   { t: 'bend'|'release'|'slide'|'hammer'|'pull', bend: semitones, vib: true }
// Stored internally with the app's string index (0 = low E ... 5 = high e).
//
// `source` says where a lick comes from: 'user' = supplied by the player as
// a known, verified lick; 'dudestar' = written for this app from standard
// rock/blues vocabulary (common teaching licks, not transcriptions of a
// specific recording). `rhythmApprox` marks a lick whose source tab had no
// rhythm, so the rhythm here is a reasonable reading, not the original.
import { STANDARD_TUNING } from '../notes';
import { comfortablyNumb } from './imports/comfortablyNumb';

function n(beat, beats, string, fret, opts = {}) {
  return {
    start: beat,
    duration: beats,
    string: 6 - string,
    fret,
    technique: opts.t ?? null,
    bend: opts.t === 'bend' || opts.t === 'release' ? opts.bend ?? 2 : undefined,
    vibrato: !!opts.vib,
  };
}

const T = 1 / 3; // triplet eighth

export const LICK_GENRES = [
  { key: 'blues', label: { en: 'Blues', he: 'בלוז' } },
  { key: 'rock', label: { en: 'Rock', he: 'רוק' } },
  { key: 'metal', label: { en: 'Metal', he: 'מטאל' } },
];

export const LICK_LEVELS = [
  { key: 'beginner', label: { en: 'Beginner', he: 'מתחיל' } },
  { key: 'intermediate', label: { en: 'Intermediate', he: 'בינוני' } },
  { key: 'advanced', label: { en: 'Advanced', he: 'מתקדם' } },
];

const RAW_LICKS = [
  // ---- Blues ----------------------------------------------------------------
  {
    id: 'blues-open-e-run',
    title: { en: 'Open E Blues Run', he: 'ריצת בלוז ב-E פתוח' },
    genre: 'blues',
    level: 'beginner',
    key: 'E',
    scale: 'E blues',
    bpm: 80,
    source: 'user',
    rhythmApprox: true,
    about: {
      en: 'Chromatic approach from D to D# into the open E, a slide up to the blue note (Bb) and back, then down the top strings to finish on E.',
      he: 'גישה כרומטית מ-D ל-D# אל ה-E הפתוח, החלקה אל התו הכחול (Bb) וחזרה, ואז ירידה במיתרים העליונים וסיום על E.',
    },
    notes: [
      n(0, 0.5, 2, 3),
      n(0.5, 0.5, 2, 4),
      n(1, 0.5, 1, 0),
      n(1.5, 0.5, 1, 3),
      n(2, 0.25, 1, 5),
      n(2.25, 0.25, 1, 6, { t: 'slide' }),
      n(2.5, 0.5, 1, 5, { t: 'slide' }),
      n(3, 0.5, 1, 3),
      n(3.5, 0.5, 1, 0),
      n(4, 0.5, 2, 3),
      n(4.5, 0.5, 1, 3),
      n(5, 1, 1, 0, { vib: true }),
    ],
  },
  {
    id: 'blues-box1-descent',
    title: { en: 'Box 1 Descent', he: 'ירידה בקופסה 1' },
    genre: 'blues',
    level: 'beginner',
    key: 'A',
    scale: 'A minor pentatonic',
    bpm: 80,
    source: 'dudestar',
    about: {
      en: 'Straight eighths down the first pentatonic box, landing on the root with vibrato. The foundation phrase of blues soloing.',
      he: 'שמיניות ישרות במורד הקופסה הפנטטונית הראשונה, נחיתה על השורש עם ויברטו. משפט הבסיס של סולו בלוז.',
    },
    notes: [
      n(0, 0.5, 1, 8),
      n(0.5, 0.5, 1, 5),
      n(1, 0.5, 2, 8),
      n(1.5, 0.5, 2, 5),
      n(2, 0.5, 3, 7),
      n(2.5, 0.5, 3, 5),
      n(3, 1, 4, 7, { vib: true }),
    ],
  },
  {
    id: 'blues-slide-root',
    title: { en: 'Slide into the Root', he: 'החלקה אל השורש' },
    genre: 'blues',
    level: 'beginner',
    key: 'A',
    scale: 'A minor pentatonic',
    bpm: 75,
    source: 'dudestar',
    about: {
      en: 'Slide from the b7 (G) up to the root (A) and let it sing, then answer with a short pentatonic phrase back to the root.',
      he: 'החלקה מהספטימה (G) אל השורש (A) ולתת לו לשיר, ואז תשובה במשפט פנטטוני קצר חזרה לשורש.',
    },
    notes: [
      n(0, 0.5, 4, 5),
      n(0.5, 1.5, 4, 7, { t: 'slide', vib: true }),
      n(2, 0.5, 3, 5),
      n(2.5, 0.5, 3, 7),
      n(3, 1, 4, 7, { vib: true }),
    ],
  },
  {
    id: 'blues-bb-box',
    title: { en: 'B.B. King Box', he: 'הקופסה של B.B. King' },
    genre: 'blues',
    level: 'intermediate',
    key: 'A',
    scale: 'A minor pentatonic (B.B. box)',
    bpm: 70,
    source: 'dudestar',
    about: {
      en: 'The small "B.B. box" above the first position: bend the C a whole step to D, release, and resolve to the root with a wide vibrato.',
      he: 'ה"קופסה" הקטנה של B.B. מעל הפוזיציה הראשונה: כפיפה של C בטון שלם ל-D, שחרור, ופתרון לשורש עם ויברטו רחב.',
    },
    notes: [
      n(0, 0.5, 1, 10),
      n(0.5, 1, 2, 13, { t: 'bend', bend: 2 }),
      n(1.5, 0.5, 2, 13, { t: 'release', bend: 2 }),
      n(2, 2, 2, 10, { vib: true }),
    ],
  },
  {
    id: 'blues-blue-note-triplet',
    title: { en: 'Blue Note Triplet', he: 'טריולה עם התו הכחול' },
    genre: 'blues',
    level: 'intermediate',
    key: 'A',
    scale: 'A blues',
    bpm: 80,
    source: 'dudestar',
    about: {
      en: 'Triplet eighths that pass through the blue note (Eb) on the G string, up and back, then settle on the root.',
      he: 'שמיניות בטריולות שעוברות דרך התו הכחול (Eb) על מיתר G, למעלה וחזרה, ומתיישבות על השורש.',
    },
    notes: [
      n(0, T, 4, 7),
      n(T, T, 3, 5),
      n(2 * T, T, 3, 7),
      n(1, T, 3, 8),
      n(1 + T, T, 3, 7),
      n(1 + 2 * T, T, 3, 5),
      n(2, 2, 4, 7, { vib: true }),
    ],
  },
  {
    id: 'blues-minor-third-bend',
    title: { en: 'Bending the Minor 3rd', he: 'כפיפה של הטרצה הקטנה' },
    genre: 'blues',
    level: 'intermediate',
    key: 'A',
    scale: 'A minor pentatonic',
    bpm: 70,
    source: 'dudestar',
    about: {
      en: 'Bend the C on the high e a whole step to D and hold it with vibrato, then walk down to the root. Pitch-perfect bends are the point.',
      he: 'כפיפה של C על מיתר e הגבוה בטון שלם ל-D והחזקה עם ויברטו, ואז ירידה לשורש. הדיוק בגובה הכפיפה הוא העיקר.',
    },
    notes: [
      n(0, 1.5, 1, 8, { t: 'bend', bend: 2, vib: true }),
      n(1.5, 0.5, 1, 5),
      n(2, 0.5, 2, 8),
      n(2.5, 0.5, 2, 5),
      n(3, 1, 3, 7, { t: 'bend', bend: 2 }),
    ],
  },
  {
    id: 'blues-pull-roll',
    title: { en: 'Pull-Off Triplet Roll', he: 'גלגול טריולות עם פול-אוף' },
    genre: 'blues',
    level: 'advanced',
    key: 'A',
    scale: 'A minor pentatonic',
    bpm: 90,
    source: 'dudestar',
    about: {
      en: 'The classic repeating roll: C pulled off to A, then G on the B string, as even triplets. Evenness of the pull-off is what makes it groove.',
      he: 'הגלגול החוזר הקלאסי: C עם פול-אוף ל-A, ואז G על מיתר B, בטריולות אחידות. אחידות הפול-אוף היא מה שנותן לו גרוב.',
    },
    notes: [
      n(0, T, 1, 8),
      n(T, T, 1, 5, { t: 'pull' }),
      n(2 * T, T, 2, 8),
      n(1, T, 1, 8),
      n(1 + T, T, 1, 5, { t: 'pull' }),
      n(1 + 2 * T, T, 2, 8),
      n(2, T, 1, 8),
      n(2 + T, T, 1, 5, { t: 'pull' }),
      n(2 + 2 * T, T, 2, 8),
      n(3, 1, 1, 5, { vib: true }),
    ],
  },

  // ---- Rock -----------------------------------------------------------------
  {
    id: 'rock-open-e-riff',
    title: { en: 'Open E Riff Lick', he: 'ליק ריף ב-E פתוח' },
    genre: 'rock',
    level: 'beginner',
    key: 'E',
    scale: 'E minor pentatonic',
    bpm: 100,
    source: 'dudestar',
    about: {
      en: 'Up the open-position E minor pentatonic in eighths and back down to the low E. Keep every note even and let the last one ring.',
      he: 'עלייה בפנטטוני E מינור בפוזיציה פתוחה בשמיניות וחזרה ל-E הנמוך. כל תו אחיד, והאחרון מצלצל.',
    },
    notes: [
      n(0, 0.5, 6, 0),
      n(0.5, 0.5, 6, 3),
      n(1, 0.5, 5, 0),
      n(1.5, 0.5, 5, 2),
      n(2, 0.5, 4, 0),
      n(2.5, 0.5, 4, 2),
      n(3, 0.5, 5, 2),
      n(3.5, 0.5, 5, 0),
      n(4, 0.5, 6, 3),
      n(4.5, 1.5, 6, 0),
    ],
  },
  {
    id: 'rock-pentatonic-climb',
    title: { en: 'Pentatonic Climb', he: 'טיפוס פנטטוני' },
    genre: 'rock',
    level: 'beginner',
    key: 'A',
    scale: 'A minor pentatonic',
    bpm: 90,
    source: 'dudestar',
    about: {
      en: 'Two notes per string up the first box, then land on the E with vibrato. Great for steady alternate picking.',
      he: 'שני תווים לכל מיתר במעלה הקופסה הראשונה, ונחיתה על E עם ויברטו. מצוין לפריטה מתחלפת יציבה.',
    },
    notes: [
      n(0, 0.5, 6, 5),
      n(0.5, 0.5, 6, 8),
      n(1, 0.5, 5, 5),
      n(1.5, 0.5, 5, 7),
      n(2, 0.5, 4, 5),
      n(2.5, 0.5, 4, 7),
      n(3, 0.5, 3, 5),
      n(3.5, 0.5, 3, 7),
      n(4, 2, 2, 5, { vib: true }),
    ],
  },
  {
    id: 'rock-bend-release-pull',
    title: { en: 'Bend, Release, Pull', he: 'כפיפה, שחרור, פול-אוף' },
    genre: 'rock',
    level: 'intermediate',
    key: 'A',
    scale: 'A minor pentatonic',
    bpm: 90,
    source: 'dudestar',
    about: {
      en: 'Bend D up to E, release back to D, pull off to C, then down to the root. The core move of classic rock soloing.',
      he: 'כפיפה של D ל-E, שחרור חזרה ל-D, פול-אוף ל-C, ואז ירידה לשורש. התנועה המרכזית של סולו רוק קלאסי.',
    },
    notes: [
      n(0, 1, 3, 7, { t: 'bend', bend: 2 }),
      n(1, 0.5, 3, 7, { t: 'release', bend: 2 }),
      n(1.5, 0.5, 3, 5, { t: 'pull' }),
      n(2, 0.5, 4, 7),
      n(2.5, 0.5, 4, 5),
      n(3, 1, 5, 7, { vib: true }),
    ],
  },
  {
    id: 'rock-hammer-groups',
    title: { en: 'Hammer-On Groups', he: 'קבוצות האמר-און' },
    genre: 'rock',
    level: 'intermediate',
    key: 'A',
    scale: 'A minor pentatonic',
    bpm: 100,
    source: 'dudestar',
    about: {
      en: 'Sixteenth-note groups of pick, hammer-on, pull-off, pick. Keep the legato notes as loud and as in time as the picked ones.',
      he: 'קבוצות של שש-עשריות: פריטה, האמר-און, פול-אוף, פריטה. תווי הלגאטו צריכים להיות חזקים ומדויקים בקצב כמו התווים הפרוטים.',
    },
    notes: [
      n(0, 0.25, 3, 5),
      n(0.25, 0.25, 3, 7, { t: 'hammer' }),
      n(0.5, 0.25, 3, 5, { t: 'pull' }),
      n(0.75, 0.25, 4, 7),
      n(1, 0.25, 3, 5),
      n(1.25, 0.25, 3, 7, { t: 'hammer' }),
      n(1.5, 0.25, 3, 5, { t: 'pull' }),
      n(1.75, 0.25, 4, 7),
      n(2, 0.25, 2, 5),
      n(2.25, 0.25, 2, 8, { t: 'hammer' }),
      n(2.5, 0.25, 2, 5, { t: 'pull' }),
      n(2.75, 0.25, 3, 7),
      n(3, 1, 1, 5, { vib: true }),
    ],
  },
  {
    id: 'rock-e-minor-12',
    title: { en: 'E Minor at the 12th', he: 'E מינור בשריג 12' },
    genre: 'rock',
    level: 'intermediate',
    key: 'E',
    scale: 'E minor pentatonic',
    bpm: 100,
    source: 'dudestar',
    about: {
      en: 'Eighths down the 12th-fret box, finishing on a whole-step bend from D to E held with vibrato.',
      he: 'שמיניות במורד הקופסה בשריג 12, וסיום בכפיפה של טון שלם מ-D ל-E עם ויברטו.',
    },
    notes: [
      n(0, 0.5, 1, 15),
      n(0.5, 0.5, 1, 12),
      n(1, 0.5, 2, 15),
      n(1.5, 0.5, 2, 12),
      n(2, 0.5, 3, 14),
      n(2.5, 0.5, 3, 12),
      n(3, 1, 2, 15, { t: 'bend', bend: 2, vib: true }),
    ],
  },
  {
    id: 'rock-descending-sixes',
    title: { en: 'Descending Threes', he: 'שלשות יורדות' },
    genre: 'rock',
    level: 'advanced',
    key: 'A',
    scale: 'A minor pentatonic',
    bpm: 100,
    source: 'dudestar',
    about: {
      en: 'A three-note pattern stepping down the pentatonic box in triplets. Builds speed and shows the scale as a sequence, not a list.',
      he: 'תבנית של שלושה תווים שיורדת בקופסה הפנטטונית בטריולות. בונה מהירות ומראה את הסולם כרצף ולא כרשימה.',
    },
    notes: [
      n(0, T, 1, 8),
      n(T, T, 1, 5),
      n(2 * T, T, 2, 8),
      n(1, T, 1, 5),
      n(1 + T, T, 2, 8),
      n(1 + 2 * T, T, 2, 5),
      n(2, T, 2, 8),
      n(2 + T, T, 2, 5),
      n(2 + 2 * T, T, 3, 7),
      n(3, T, 2, 5),
      n(3 + T, T, 3, 7),
      n(3 + 2 * T, T, 3, 5),
      n(4, T, 3, 7),
      n(4 + T, T, 3, 5),
      n(4 + 2 * T, T, 4, 7),
      n(5, 1, 4, 5, { vib: true }),
    ],
  },
  {
    id: 'rock-repeating-bend',
    title: { en: 'Repeating Bend Triplets', he: 'טריולות כפיפה חוזרות' },
    genre: 'rock',
    level: 'advanced',
    key: 'A',
    scale: 'A minor pentatonic',
    bpm: 100,
    source: 'dudestar',
    about: {
      en: 'The hard-rock repeating lick: bend D up to E on the G string, then E and A on the B and e strings, as fast even triplets. Every bend must hit pitch.',
      he: 'הליק החוזר של הארד רוק: כפיפה של D ל-E על מיתר G, ואז E ו-A על מיתרי B ו-e, בטריולות מהירות ואחידות. כל כפיפה חייבת להגיע לגובה.',
    },
    notes: [
      n(0, T, 3, 7, { t: 'bend', bend: 2 }),
      n(T, T, 2, 5),
      n(2 * T, T, 1, 5),
      n(1, T, 3, 7, { t: 'bend', bend: 2 }),
      n(1 + T, T, 2, 5),
      n(1 + 2 * T, T, 1, 5),
      n(2, T, 3, 7, { t: 'bend', bend: 2 }),
      n(2 + T, T, 2, 5),
      n(2 + 2 * T, T, 1, 5),
      n(3, 1, 1, 5, { vib: true }),
    ],
  },

  // ---- Guitar Player: "22 Guitar Licks You Must Know" ------------------------
  // Transcribed from the article's notation + tab figures (user-supplied as
  // verified). Guitar notation sounds an octave below written; tab is exact.
  // 12/8 figures use the dotted quarter as the beat (beatUnit: 'dotted').
  {
    id: 'gp-fig1a',
    title: { en: 'E Minor Pentatonic Bends (Fig. 1A)', he: 'כפיפות בפנטטוני E מינור (איור 1A)' },
    genre: 'blues',
    level: 'intermediate',
    key: 'E',
    scale: 'E minor pentatonic',
    bpm: 100,
    source: 'user',
    credit: 'Guitar Player — 22 Guitar Licks You Must Know, Fig. 1A',
    about: {
      en: 'A triplet with a full bend from A to B, then a held full bend from D to E with vibrato.',
      he: 'טריולה עם כפיפה מלאה מ-A ל-B, ואז כפיפה מלאה מוחזקת מ-D ל-E עם ויברטו.',
    },
    notes: [
      n(0, T, 3, 14, { t: 'bend', bend: 2 }),
      n(T, T, 2, 12),
      n(2 * T, T, 1, 12),
      n(1, 2, 2, 15, { t: 'bend', bend: 2, vib: true }),
    ],
  },
  {
    id: 'gp-fig1b',
    title: { en: 'Pull-Offs & Half-Step Bend (Fig. 1B)', he: 'פול-אוף וכפיפת חצי טון (איור 1B)' },
    genre: 'blues',
    level: 'intermediate',
    key: 'E',
    scale: 'E minor pentatonic',
    bpm: 100,
    source: 'user',
    credit: 'Guitar Player — 22 Guitar Licks You Must Know, Fig. 1B',
    about: {
      en: 'Two triplets: a pull-off from D to B, then a half-step bend on the G string, its release and a pull-off, landing on E with vibrato.',
      he: 'שתי טריולות: פול-אוף מ-D ל-B, ואז כפיפת חצי טון על מיתר G, שחרור ופול-אוף, ונחיתה על E עם ויברטו.',
    },
    notes: [
      n(0, T, 1, 12),
      n(T, T, 2, 15),
      n(2 * T, T, 2, 12, { t: 'pull' }),
      n(1, T, 3, 14, { t: 'bend', bend: 1 }),
      n(1 + T, T, 3, 14, { t: 'release', bend: 1 }),
      n(1 + 2 * T, T, 3, 12, { t: 'pull' }),
      n(2, 2, 4, 14, { vib: true }),
    ],
  },
  {
    id: 'gp-fig2a',
    title: { en: 'The B.B. Box (Fig. 2A)', he: 'הקופסה של B.B. (איור 2A)' },
    genre: 'blues',
    level: 'intermediate',
    key: 'A',
    scale: 'A blues (B.B. box)',
    bpm: 60,
    beatUnit: 'dotted',
    source: 'user',
    credit: 'Guitar Player — 22 Guitar Licks You Must Know, Fig. 2A',
    about: {
      en: 'Slow 12/8 blues in the B.B. King box: bends from D to E and from B to C#, a pull-off, and a long A with vibrato.',
      he: 'בלוז איטי ב-12/8 בקופסה של B.B. King: כפיפות מ-D ל-E ומ-B ל-C#, פול-אוף, ו-A ארוך עם ויברטו.',
    },
    notes: [
      n(0, T, 1, 10, { t: 'bend', bend: 2 }),
      n(T, T, 1, 10),
      n(2 * T, T, 2, 12, { t: 'bend', bend: 2 }),
      n(1, 1 / 6, 2, 12),
      n(1 + 1 / 6, 1 / 6, 2, 10, { t: 'pull' }),
      n(1 + 2 / 6, 1 / 6, 3, 11),
      n(1.5, 1 / 6 + 1, 2, 10, { vib: true }),
    ],
  },
  {
    id: 'gp-fig2b',
    title: { en: 'The Albert Box (Fig. 2B)', he: 'הקופסה של אלברט (איור 2B)' },
    genre: 'blues',
    level: 'intermediate',
    key: 'A',
    scale: 'A blues (Albert box)',
    bpm: 60,
    beatUnit: 'dotted',
    source: 'user',
    credit: 'Guitar Player — 22 Guitar Licks You Must Know, Fig. 2B',
    about: {
      en: 'The Albert King box: two full bends on the high e (D to E, C to D), then a phrase around A, C and E that settles on G with vibrato.',
      he: 'הקופסה של אלברט קינג: שתי כפיפות מלאות על e הגבוה (D ל-E, C ל-D), ואז משפט סביב A, ‏C ו-E שמתיישב על G עם ויברטו.',
    },
    notes: [
      n(0, 1 / 6, 2, 10),
      n(1 / 6, 1 / 6, 2, 10),
      n(2 / 6, T, 1, 10, { t: 'bend', bend: 2 }),
      n(2 * T, T, 1, 8, { t: 'bend', bend: 2 }),
      n(1, 1 / 6, 1, 8),
      n(1 + 1 / 6, 1 / 6 + 2 / 3, 2, 10, { vib: true }),
      n(2, T, 1, 8),
      n(2 + T, T, 2, 10),
      n(2 + 2 * T, T, 3, 9),
      n(3, 1, 2, 8, { vib: true }),
    ],
  },
  {
    id: 'gp-fig3',
    title: { en: 'Crossroads-Style Major/Minor (Fig. 3)', he: 'מז׳ור/מינור בסגנון Crossroads (איור 3)' },
    genre: 'blues',
    level: 'intermediate',
    key: 'A',
    scale: 'A minor/major pentatonic',
    bpm: 120,
    source: 'user',
    credit: 'Guitar Player — 22 Guitar Licks You Must Know, Fig. 3 (Clapton style)',
    about: {
      en: 'Sixteenths mixing the minor 3rd (C) and major 3rd (C#) with hammer-ons, a pull-off from G to E, resolving to A.',
      he: 'שש-עשריות שמשלבות את הטרצה הקטנה (C) והגדולה (C#) עם האמר-און, פול-אוף מ-G ל-E, ופתרון ל-A.',
    },
    notes: [
      n(0, 0.25, 3, 5),
      n(0.25, 0.25, 3, 6, { t: 'hammer' }),
      n(0.5, 0.25, 2, 5),
      n(0.75, 0.25, 1, 5),
      n(1, 0.25, 2, 8),
      n(1.25, 0.25, 2, 5, { t: 'pull' }),
      n(1.5, 0.25, 3, 7),
      n(1.75, 0.25, 2, 5),
      n(2, 0.25, 3, 5),
      n(2.25, 0.25, 3, 6, { t: 'hammer' }),
      n(2.5, 1, 4, 7, { vib: true }),
    ],
  },
  {
    id: 'gp-fig4',
    title: { en: 'SRV / Albert King Style (Fig. 4)', he: 'בסגנון SRV / אלברט קינג (איור 4)' },
    genre: 'blues',
    level: 'advanced',
    key: 'E',
    scale: 'E minor hexatonic + b2',
    bpm: 112,
    beatUnit: 'dotted',
    source: 'user',
    credit: 'Guitar Player — 22 Guitar Licks You Must Know, Fig. 4 (Stevie Ray Vaughan style)',
    about: {
      en: 'Shuffle feel in 12/8: a full bend from A to B, pull-offs, the rub of F (b2) against E, a quarter-step bend and a final E with vibrato.',
      he: 'תחושת שאפל ב-12/8: כפיפה מלאה מ-A ל-B, פול-אופים, החיכוך של F (b2) מול E, כפיפת רבע טון ו-E אחרון עם ויברטו.',
    },
    notes: [
      n(0, 2 * T, 3, 14, { t: 'bend', bend: 2 }),
      n(2 * T, T, 2, 12),
      n(1, T, 1, 12),
      n(1 + T, T, 2, 15),
      n(1 + 2 * T, T, 2, 12, { t: 'pull' }),
      n(2, T, 1, 14),
      n(2 + T, 1 / 6, 1, 12),
      n(2.5, 1 / 6, 1, 13, { t: 'hammer' }),
      n(2 + 2 * T, T, 1, 12, { t: 'pull' }),
      n(3, T, 2, 15),
      n(3 + T, T, 2, 12, { t: 'pull' }),
      n(3 + 2 * T, T, 1, 15, { t: 'bend', bend: 0.5 }),
      n(4, 1, 1, 12, { vib: true }),
    ],
  },
  {
    id: 'gp-fig14a',
    title: { en: 'Repeating Bend Lick (Fig. 14A)', he: 'ליק כפיפה חוזר (איור 14A)' },
    genre: 'rock',
    level: 'advanced',
    key: 'E',
    scale: 'E minor pentatonic',
    bpm: 92,
    source: 'user',
    credit: 'Guitar Player — 22 Guitar Licks You Must Know, Fig. 14A',
    about: {
      en: 'A one-beat repeating "smear" lick, played 4 times: full bend A to B, then B, E and a pull-off from D to B in sixteenth-note triplets.',
      he: 'ליק "מריחה" חוזר באורך פעמה, מנוגן 4 פעמים: כפיפה מלאה מ-A ל-B, ואז B, ‏E ופול-אוף מ-D ל-B בטריולות של שש-עשריות.',
    },
    notes: [0, 1, 2, 3].flatMap((k) => [
      n(k, 1 / 3, 3, 14, { t: 'bend', bend: 2 }),
      n(k + 1 / 3, 1 / 6, 2, 12),
      n(k + 0.5, 1 / 6, 1, 12),
      n(k + 2 / 3, 1 / 6, 2, 15),
      n(k + 5 / 6, 1 / 6, 2, 12, { t: 'pull' }),
    ]),
  },
  {
    id: 'gp-fig14b',
    title: { en: 'Pull-Off Sextuplets (Fig. 14B)', he: 'סקסטולות פול-אוף (איור 14B)' },
    genre: 'rock',
    level: 'advanced',
    key: 'E',
    scale: 'E minor pentatonic',
    bpm: 92,
    source: 'user',
    credit: 'Guitar Player — 22 Guitar Licks You Must Know, Fig. 14B',
    about: {
      en: 'Sextuplets on the top two strings, played 4 times: G pulled off to E, then B, twice per beat. Keep all six notes even.',
      he: 'סקסטולות על שני המיתרים העליונים, מנוגן 4 פעמים: G עם פול-אוף ל-E, ואז B, פעמיים בכל פעמה. כל שישה תווים אחידים.',
    },
    notes: [0, 1, 2, 3].flatMap((k) => [
      n(k, 1 / 6, 1, 15),
      n(k + 1 / 6, 1 / 6, 1, 12, { t: 'pull' }),
      n(k + 2 / 6, 1 / 6, 2, 12),
      n(k + 3 / 6, 1 / 6, 1, 15),
      n(k + 4 / 6, 1 / 6, 1, 12, { t: 'pull' }),
      n(k + 5 / 6, 1 / 6, 2, 12),
    ]),
  },
  {
    id: 'gp-fig16',
    title: { en: 'Pentatonic Triplet Sequence (Fig. 16)', he: 'רצף טריולות פנטטוני (איור 16)' },
    genre: 'rock',
    level: 'advanced',
    key: 'E',
    scale: 'E minor pentatonic',
    bpm: 160,
    source: 'user',
    credit: 'Guitar Player — 22 Guitar Licks You Must Know, Fig. 16',
    about: {
      en: 'A fast descending sequence in triplets with pull-offs, down the 12th-fret box to a long E with vibrato.',
      he: 'רצף יורד מהיר בטריולות עם פול-אופים, במורד הקופסה בשריג 12, עד E ארוך עם ויברטו.',
    },
    notes: [
      n(0, T, 1, 15),
      n(T, T, 1, 12, { t: 'pull' }),
      n(2 * T, T, 2, 15),
      n(1, T, 1, 12),
      n(1 + T, T, 2, 15),
      n(1 + 2 * T, T, 2, 12, { t: 'pull' }),
      n(2, T, 2, 15),
      n(2 + T, T, 2, 12, { t: 'pull' }),
      n(2 + 2 * T, T, 3, 14),
      n(3, T, 2, 12),
      n(3 + T, T, 3, 14),
      n(3 + 2 * T, T, 3, 12, { t: 'pull' }),
      n(4, 4, 4, 14, { vib: true }),
    ],
  },
  {
    id: 'gp-fig17',
    title: { en: 'Legato Slide Run (Fig. 17)', he: 'ריצת לגאטו עם החלקות (איור 17)' },
    genre: 'rock',
    level: 'advanced',
    key: 'E',
    scale: 'E minor pentatonic',
    bpm: 116,
    source: 'user',
    credit: 'Guitar Player — 22 Guitar Licks You Must Know, Fig. 17',
    about: {
      en: 'Covers the whole neck in one bar: hammer-ons and slides up through the pentatonic shapes to a full bend on the high e with vibrato.',
      he: 'מכסה את כל הצוואר בתיבה אחת: האמר-און והחלקות במעלה הצורות הפנטטוניות עד כפיפה מלאה על e הגבוה עם ויברטו.',
    },
    notes: [
      n(0, 0.25, 6, 12),
      n(0.25, 0.25, 5, 10),
      n(0.5, 0.25, 5, 12),
      n(0.75, 0.25, 5, 14, { t: 'slide' }),
      n(1, 0.25, 4, 12),
      n(1.25, 0.25, 4, 14, { t: 'hammer' }),
      n(1.5, 0.25, 3, 12),
      n(1.75, 0.25, 3, 14),
      n(2, 0.25, 3, 16, { t: 'slide' }),
      n(2.25, 0.25, 2, 15),
      n(2.5, 0.25, 2, 17, { t: 'hammer' }),
      n(2.75, 0.25, 1, 15),
      n(3, 1, 1, 17, { t: 'bend', bend: 2, vib: true }),
    ],
  },

  // ---- Metal ----------------------------------------------------------------
  {
    id: 'metal-pedal-e',
    title: { en: 'Low E Pedal', he: 'פדאל על E נמוך' },
    genre: 'metal',
    level: 'intermediate',
    key: 'E',
    scale: 'E minor',
    bpm: 110,
    source: 'dudestar',
    about: {
      en: 'Sixteenths alternating the open low E with a climbing melody on the same string. Tight, even picking is everything.',
      he: 'שש-עשריות שמחליפות בין ה-E הנמוך הפתוח לבין מלודיה עולה על אותו מיתר. פריטה צמודה ואחידה היא הכול.',
    },
    notes: [
      n(0, 0.25, 6, 0),
      n(0.25, 0.25, 6, 3),
      n(0.5, 0.25, 6, 0),
      n(0.75, 0.25, 6, 5),
      n(1, 0.25, 6, 0),
      n(1.25, 0.25, 6, 7),
      n(1.5, 0.25, 6, 0),
      n(1.75, 0.25, 6, 8),
      n(2, 0.25, 6, 0),
      n(2.25, 0.25, 6, 7),
      n(2.5, 0.25, 6, 0),
      n(2.75, 0.25, 6, 5),
      n(3, 1, 6, 7, { vib: true }),
    ],
  },
];

// Seconds per beat at a tempo.
export function secondsPerBeat(bpm) {
  return 60 / bpm;
}

// Adds each note's play order and actual pitch. `tuningShift` covers licks
// written for a detuned guitar (e.g. -1 = half a step down): the fret stays
// what the player frets, the pitch is what actually sounds.
export function withDerived(lick) {
  const shift = lick.tuningShift ?? 0;
  const notes = lick.notes.map((note, i) => ({
    ...note,
    order: i + 1,
    midi: STANDARD_TUNING[note.string].baseMidi + note.fret + shift,
  }));
  const lastEnd = Math.max(...notes.map((x) => x.start + x.duration));
  return { ...lick, notes, lengthBeats: Math.ceil(lastEnd) };
}

export const LICKS = RAW_LICKS.map(withDerived);

// Full solos generated from the user's Guitar Pro files
// (scripts/gp-to-licks.mjs with solo: true). Each has practice `sections`.
export const SOLOS = [...comfortablyNumb].map(withDerived);

/**
 * The part of a solo to practice: sectionIndex -1 = the whole solo;
 * otherwise the notes starting inside that section, re-timed so the
 * section starts at beat 0 (sections start on a bar line, so the rhythm's
 * place in the bar is kept). `view` tells the tab where it sits in the solo.
 */
export function soloSection(solo, sectionIndex) {
  const sec = solo.sections?.[sectionIndex];
  if (!sec) return { ...solo, view: { fromBeat: 0, firstIndex: 0 } };
  const eps = 1e-6;
  const firstIndex = solo.notes.findIndex((n) => n.start >= sec.fromBeat - eps);
  const picked = solo.notes.filter((n) => n.start >= sec.fromBeat - eps && n.start < sec.toBeat - eps);
  const raw = {
    ...solo,
    id: `${solo.id}#${sectionIndex + 1}`,
    sectionLabel: sec.label,
    barPhase: 0, // sections start on a bar line
    notes: picked.map(({ order, midi, ...n }) => ({ ...n, start: n.start - sec.fromBeat })), // eslint-disable-line no-unused-vars
  };
  return { ...withDerived(raw), view: { fromBeat: sec.fromBeat, firstIndex: Math.max(0, firstIndex) } };
}

export function findLick(id) {
  return LICKS.find((l) => l.id === id) ?? null;
}
