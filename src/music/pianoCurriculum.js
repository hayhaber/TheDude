// The Studies -> Piano course's content model — same hand-authored-data +
// small-pure-helpers pattern as every other Studies course (cagedCurriculum
// .js/scalesCurriculum.js/harmonyCurriculum.js/chordsByEarCurriculum.js).
// Unlike Scales/Circle of Fifths/Harmony/Chords by Ear (all instrument-
// neutral or guitar-authored-then-reworded), this course is piano-NATIVE:
// keyboard geography, hand position and finger numbering, staff reading,
// and a note-reading quiz — none of which those other courses teach, and
// none of which has a meaningful guitar equivalent. Gated `['piano']`-only
// in featureCapabilities.js, the same mechanism CAGED uses in reverse.
//
// This is Level 1 ("Absolute Beginner") of the fuller beginner-to-advanced
// curriculum proposed in conversation — five-finger patterns, primary
// chords/inversions, full scale fingering, sight-reading, technique, and
// repertoire are later levels, not built yet.
export const PIANO_STAGES = {
  FOUNDATION: 'foundation',
  NOTATION: 'notation',
  PRACTICE: 'practice',
};

export const PIANO_STAGE_LABELS = {
  [PIANO_STAGES.FOUNDATION]: { en: 'Foundation', he: 'יסודות' },
  [PIANO_STAGES.NOTATION]: { en: 'Reading Music', he: 'קריאת תווים' },
  [PIANO_STAGES.PRACTICE]: { en: 'Practice', he: 'תרגול' },
};

// Major 5-finger pattern (root, M2, M3, P4, P5) — same interval set
// pianoPractice.js's own pentascale exercise already uses, reused here
// rather than a second copy of "what is a five-finger pattern."
export const PENTASCALE_INTERVALS = [0, 2, 4, 5, 7];
export const FINGER_NUMBERS_RIGHT_HAND = [1, 2, 3, 4, 5];

function lesson(id, stage, title, description, extra = {}) {
  return { id, stage, title, description, ...extra };
}

export const PIANO_LESSONS = [
  // ---------------- FOUNDATION ----------------
  lesson(
    'piano-keyboard-geography',
    PIANO_STAGES.FOUNDATION,
    { en: 'Finding Your Way Around the Keyboard', he: 'התמצאות על המקלדת' },
    {
      en:
        'The whole keyboard is one repeating pattern: a group of 2 black keys, then a group of 3 black keys, over ' +
        'and over. That pattern is your map — you never have to count 88 keys one at a time. C is always the white ' +
        'key immediately to the LEFT of a group of 2 black keys; that\'s true in every octave, which is why every C ' +
        'on the keyboard below is marked the same way. Find a few C\'s below, low and high, before moving on — this ' +
        'single landmark is what every other note gets located relative to.',
      he:
        'כל המקלדת היא תבנית אחת חוזרת: קבוצה של 2 קלידים שחורים, ואז קבוצה של 3 קלידים שחורים, שוב ושוב. התבנית ' +
        'הזו היא המפה שלכם — לעולם אין צורך לספור 88 קלידים אחד אחד. דו (C) הוא תמיד הקליד הלבן מיד משמאל לקבוצה ' +
        'של 2 קלידים שחורים — זה נכון בכל אוקטבה, ולכן כל דו במקלדת למטה מסומן באותו אופן. מצאו כמה דו\'ים למטה, ' +
        'נמוכים וגבוהים, לפני שממשיכים הלאה — הציון-דרך הבודד הזה הוא מה שכל תו אחר ממוקם ביחס אליו.',
    },
    { kind: 'demo', demo: { type: 'keyboardGeography' } }
  ),
  lesson(
    'piano-hand-position',
    PIANO_STAGES.FOUNDATION,
    { en: 'Hand Position & Finger Numbers', he: 'תנוחת ידיים ומספור אצבעות' },
    {
      en:
        'Piano fingering is numbered 1 through 5 on EACH hand, always thumb = 1, pinky = 5 — regardless of which ' +
        'hand. Rest your hand as if lightly holding a small ball: curved fingers, relaxed wrist, not flat and not ' +
        'clenched. Good hand position is what lets you move between notes smoothly instead of straining for every ' +
        'one — it matters from your very first five-finger pattern onward, so it\'s worth getting comfortable with ' +
        'now rather than fixing later. Look at the right-hand finger numbers marked on the keyboard below.',
      he:
        'אצבוע פסנתר ממוספר 1 עד 5 בכל יד, כאשר האגודל תמיד = 1 והזרת תמיד = 5 — בלי קשר לאיזו יד. הניחו את היד ' +
        'כאילו אתם אוחזים בעדינות כדור קטן: אצבעות מעוגלות, פרק כף יד רפוי, לא שטוחה ולא קפוצה. תנוחת יד טובה היא ' +
        'מה שמאפשר לכם לנוע בין תווים בחלקות במקום להתאמץ על כל אחד — זה משנה כבר מתבנית חמש-האצבעות הראשונה ' +
        'שלכם, אז כדאי להתרגל לזה עכשיו ולא לתקן אחר כך. הסתכלו על מספרי האצבעות של יד ימין המסומנים על המקלדת ' +
        'למטה.',
    },
    { kind: 'demo', demo: { type: 'handPosition' } }
  ),
  lesson(
    'piano-five-finger',
    PIANO_STAGES.FOUNDATION,
    { en: 'Five-Finger Patterns', he: 'תבניות חמש-אצבעות' },
    {
      en:
        'A five-finger pattern is the first real "playable shape": place fingers 1-2-3-4-5 on 5 neighboring white ' +
        'keys starting from any root, and you\'ve got a major pattern — root, 2nd, 3rd, 4th, 5th. This is the piano\'s ' +
        'equivalent of a guitar\'s first open chord: one shape, moved to a new starting key, that you\'ll use for ' +
        'weeks of early repertoire before ever touching a full scale. Pick a key below and play up and down it, ' +
        'finger 1 through 5 and back — notice it\'s the exact same hand shape no matter which key you started on.',
      he:
        'תבנית חמש-אצבעות היא ה"צורה הניתנת לנגינה" האמיתית הראשונה: הניחו את אצבעות 1-2-3-4-5 על 5 קלידים לבנים ' +
        'סמוכים החל מכל שורש שתבחרו, ותקבלו תבנית מז\'ורית — שורש, שנייה, שלישית, רביעית, חמישית. זו המקבילה ' +
        'הפסנתרית לאקורד הפתוח הראשון בגיטרה: צורה אחת, שמוזזת לתחלת חדשה, שתשתמשו בה שבועות של רפרטואר מוקדם ' +
        'לפני שתיגעו בסולם מלא. בחרו סולם למטה ונגנו במעלה ובמורד, אצבע 1 עד 5 ובחזרה — שימו לב שזו אותה צורת יד ' +
        'בדיוק לא משנה מאיזה קליד התחלתם.',
    },
    { kind: 'demo', demo: { type: 'fiveFinger' } }
  ),

  // ---------------- NOTATION ----------------
  lesson(
    'piano-staff-basics',
    PIANO_STAGES.NOTATION,
    { en: 'The Staff: Treble & Bass Clef', he: 'סרגל התווים: תו-סול ותו-פה' },
    {
      en:
        'Written music sits on a 5-line staff. The treble clef (𝄞, "G clef" — its spiral curls around the G line) ' +
        'is read by your right hand and covers notes at and above Middle C; the bass clef (𝄢, "F clef" — its two ' +
        'dots sit either side of the F line) is read by your left hand and covers notes at and below Middle C. ' +
        'Same 7 letter names (A-G) as everywhere else in this app — the staff just shows WHERE each one sits by ' +
        'height, higher on the page always meaning a higher-pitched key.',
      he:
        'תווים כתובים יושבים על סרגל בן 5 קווים. תו-הסול (𝄞, "G clef" — הספירלה שלו מתפתלת סביב קו הסול) נקרא ' +
        'ביד ימין ומכסה תווים בגובה דו-אמצעי ומעליו; תו-הפה (𝄢, "F clef" — שתי הנקודות שלו יושבות משני צידי קו ' +
        'הפה) נקרא ביד שמאל ומכסה תווים בגובה דו-אמצעי ומתחתיו. אותם 7 שמות אותיות (A-G / דו-סי) כמו בכל מקום ' +
        'אחר באפליקציה הזו — הסרגל רק מראה איפה כל אחד יושב לפי גובה: גבוה יותר בעמוד תמיד אומר קליד בגובה צליל ' +
        'גבוה יותר.',
    },
    { kind: 'demo', demo: { type: 'staffBasics' } }
  ),
  lesson(
    'piano-grand-staff',
    PIANO_STAGES.NOTATION,
    { en: 'The Grand Staff & Middle C', he: 'הסרגל הגדול ודו-אמצעי' },
    {
      en:
        'Piano music uses BOTH clefs stacked together — the "Grand Staff" — treble on top for the right hand, bass ' +
        'below for the left. Middle C sits exactly between them, on its own short "ledger line" — one small line ' +
        'added just for that one note, since it\'s too high for the bass staff and too low for the treble staff. ' +
        'Middle C is why it\'s marked on the keyboard throughout this app: it\'s the one fixed anchor both staves ' +
        'are read relative to.',
      he:
        'תווי פסנתר משתמשים בשני התווים יחד, אחד מעל השני — "הסרגל הגדול" — תו-סול למעלה עבור יד ימין, תו-פה ' +
        'למטה עבור יד שמאל. דו-אמצעי יושב בדיוק ביניהם, על "קו עזר" קצר משלו — קו קטן אחד שמתווסף רק בשביל התו ' +
        'הבודד הזה, כי הוא גבוה מדי לסרגל הפה ונמוך מדי לסרגל הסול. זו הסיבה שדו-אמצעי מסומן על המקלדת לאורך כל ' +
        'האפליקציה הזו: הוא נקודת העיגון הקבועה שביחס אליה קוראים את שני הסרגלים.',
    },
    { kind: 'demo', demo: { type: 'grandStaff' } }
  ),
  lesson(
    'piano-lines-spaces',
    PIANO_STAGES.NOTATION,
    { en: 'Lines & Spaces: Naming Notes by Position', he: 'קווים ורווחים: שם התו לפי המקום' },
    {
      en:
        'Every line and every space on a staff has a fixed letter name, and there\'s a classic memory trick for ' +
        'each. Treble lines (bottom to top): E-G-B-D-F — "Every Good Boy Does Fine." Treble spaces: F-A-C-E — they ' +
        'literally spell "FACE." Bass lines: G-B-D-F-A — "Good Boys Do Fine Always." Bass spaces: A-C-E-G — "All ' +
        'Cows Eat Grass." You don\'t have to count up from Middle C every time — once these are memorized, you can ' +
        'name any note on the staff instantly, which is the actual goal of sight-reading.',
      he:
        'לכל קו ולכל רווח על הסרגל יש שם אות קבוע, ויש טריק זיכרון קלאסי לכל אחד. קווי תו-הסול (מלמטה למעלה): ' +
        'E-G-B-D-F — "Every Good Boy Does Fine". רווחי תו-הסול: F-A-C-E — הם ממש מאייתים "FACE". קווי תו-הפה: ' +
        'G-B-D-F-A — "Good Boys Do Fine Always". רווחי תו-הפה: A-C-E-G — "All Cows Eat Grass". אין צורך לספור ' +
        'מדו-אמצעי כל פעם מחדש — ברגע שאלה שמורים בזיכרון, אפשר לתת שם לכל תו על הסרגל מיידית, וזו המטרה האמיתית ' +
        'של קריאה לפי מבט.',
    },
    { kind: 'demo', demo: { type: 'linesSpaces' } }
  ),
  lesson(
    'piano-ledger-lines',
    PIANO_STAGES.NOTATION,
    { en: 'Ledger Lines Beyond the Staff', he: 'קווי עזר מעבר לסרגל' },
    {
      en:
        'Middle C wasn\'t a one-off — ANY note higher or lower than a staff can reach just keeps adding short ' +
        '"ledger lines," one per line/space, continuing the exact same up-the-musical-alphabet pattern the staff ' +
        'itself uses. Two ledger lines above the treble staff lands on C (an octave above Middle C — "High C"); ' +
        'three ledger lines below the bass staff lands on C two octaves below Middle C ("Low C"). You\'ll rarely ' +
        'need to count past 2-3 ledger lines in real playing — beyond that, music just switches to a different, ' +
        'more comfortable staff/octave marking instead.',
      he:
        'דו-אמצעי לא היה מקרה חד-פעמי — כל תו גבוה או נמוך יותר ממה שסרגל יכול להכיל פשוט ממשיך להוסיף "קווי עזר" ' +
        'קצרים, אחד לכל קו/רווח, וממשיך בדיוק את אותה תבנית עלייה באלף-בית המוזיקלי שהסרגל עצמו משתמש בה. שני קווי ' +
        'עזר מעל תו-הסול נופלים על דו (אוקטבה מעל דו-אמצעי — "דו גבוה"); שלושה קווי עזר מתחת לתו-הפה נופלים על דו ' +
        'שתי אוקטבות מתחת לדו-אמצעי ("דו נמוך"). לרוב לא תצטרכו לספור מעבר ל-2-3 קווי עזר בנגינה אמיתית — מעבר לזה, ' +
        'המוזיקה פשוט עוברת לסימון סרגל/אוקטבה אחר ונוח יותר.',
    },
    { kind: 'demo', demo: { type: 'ledgerLines' } }
  ),

  // ---------------- PRACTICE ----------------
  lesson(
    'piano-quiz-note-reading',
    PIANO_STAGES.PRACTICE,
    { en: 'Practice: Note Reading', he: 'תרגול: קריאת תווים' },
    {
      en:
        'A note appears on the staff — find and play the matching key on the keyboard below. Start slow and check ' +
        'yourself against the C landmarks rather than guessing; speed comes later, accuracy first. This is the ' +
        'single most-repeated drill in every beginner method book, because sight-reading fluency really is just ' +
        'this exact exercise done hundreds of times.',
      he:
        'תו מופיע על הסרגל — מצאו ונגנו את הקליד המתאים על המקלדת למטה. התחילו לאט ובדקו את עצמכם מול ציוני-הדרך ' +
        'של הדו במקום לנחש — מהירות תגיע אחר כך, דיוק קודם. זהו התרגיל החוזר-ביותר בכל ספר שיטה למתחילים, כי ' +
        'שטף קריאה לפי מבט הוא באמת בדיוק התרגיל הזה, חוזר על עצמו מאות פעמים.',
    },
    { kind: 'quiz', quizType: 'noteReading' }
  ),
];
