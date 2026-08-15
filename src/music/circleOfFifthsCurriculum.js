// The Studies -> Circle of Fifths course's content model — same
// hand-authored-data + small-pure-helpers pattern as cagedCurriculum.js/
// scalesCurriculum.js. Reuses the existing scale engine (scaleShapes.js's
// computeScaleNotes, scalesCurriculum.js's SCALE_FAMILIES) and chord engine
// (voicings.js's computeChordPositions, called from App.jsx exactly like
// CAGED's cagedPositions) rather than adding a second one.
import { computeScaleNotes, noteNameForPitchClass } from './scaleShapes';
import { SCALE_FAMILIES } from './scalesCurriculum';
import { mod } from './notes';

// --- The circle itself -----------------------------------------------------
// 12 keys, one per perfect-fifth step (7 semitones), starting at C (0
// sharps/flats) and moving clockwise through the sharp keys, then wrapping
// through the enharmonic seam into the flat keys back to C. This is the
// standard order every printed circle-of-fifths diagram uses (12 o'clock =
// C, clockwise = sharps).
//
// sharps/flats counts and which spelling is "primary" at each position
// follow standard key-signature convention: B major (5 sharps) is used far
// more often than its enharmonic twin Cb major (7 flats), so pos 5 shows
// sharps; Db major (5 flats) is used far more often than C# major (7
// sharps), so pos 7 shows flats. Pos 6 (F#/Gb, 6 of either accidental) is
// the traditional "seam" — genuinely a coin flip in real usage — so it's
// the one key on the circle presented with both names.
const SHARPS_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLATS_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

function key(position, pitchClass, majorName, relativeMinorName, sharps, flats, enharmonic = null) {
  return { position, pitchClass, majorName, relativeMinorName, sharps, flats, enharmonic };
}

export const KEY_CIRCLE = [
  key(0, 0, 'C', 'Am', 0, 0),
  key(1, 7, 'G', 'Em', 1, 0),
  key(2, 2, 'D', 'Bm', 2, 0),
  key(3, 9, 'A', 'F#m', 3, 0),
  key(4, 4, 'E', 'C#m', 4, 0),
  key(5, 11, 'B', 'G#m', 5, 0, { majorName: 'Cb', relativeMinorName: 'Abm', flats: 7 }),
  key(6, 6, 'F#', 'D#m', 6, 0, { majorName: 'Gb', relativeMinorName: 'Ebm', flats: 6 }),
  key(7, 1, 'Db', 'Bbm', 0, 5, { majorName: 'C#', relativeMinorName: 'A#m', sharps: 7 }),
  key(8, 8, 'Ab', 'Fm', 0, 4),
  key(9, 3, 'Eb', 'Cm', 0, 3),
  key(10, 10, 'Bb', 'Gm', 0, 2),
  key(11, 5, 'F', 'Dm', 0, 1),
];

export function keyByPosition(position) {
  return KEY_CIRCLE[mod(position, 12)];
}

// Sharp/flat count for whichever spelling KEY_CIRCLE uses as primary — the
// number actually printed at a key signature, regardless of enharmonic name.
export function accidentalCountFor(k) {
  return k.sharps > 0 ? { count: k.sharps, kind: 'sharps' } : k.flats > 0 ? { count: k.flats, kind: 'flats' } : { count: 0, kind: 'none' };
}

export const SHARPS_MNEMONIC = { en: 'Father Charles Goes Down And Ends Battle', he: 'סדר הדיאזים: F, C, G, D, A, E, B' };
export const FLATS_MNEMONIC = { en: 'Battle Ends And Down Goes Charles’ Father', he: 'סדר הבמולים הוא ההיפוך המדויק של סדר הדיאזים' };
export { SHARPS_ORDER, FLATS_ORDER };

// --- Curriculum stages -------------------------------------------------
export const CIRCLE_STAGES = {
  FOUNDATION: 'foundation',
  KEY_SIGNATURES: 'keySignatures',
  RELATIVE_KEYS: 'relativeKeys',
  HARMONY: 'harmony',
  PRACTICE: 'practice',
};

export const CIRCLE_STAGE_LABELS = {
  [CIRCLE_STAGES.FOUNDATION]: { en: 'Foundation', he: 'יסודות' },
  [CIRCLE_STAGES.KEY_SIGNATURES]: { en: 'Key Signatures', he: 'סימני מפתח' },
  [CIRCLE_STAGES.RELATIVE_KEYS]: { en: 'Relative Keys', he: 'סולמות קרובים' },
  [CIRCLE_STAGES.HARMONY]: { en: 'Using It Musically', he: 'שימוש הרמוני' },
  [CIRCLE_STAGES.PRACTICE]: { en: 'Practice', he: 'תרגול' },
};

export const CIRCLE_DIFFICULTY_LABELS = {
  beginner: { en: 'Beginner', he: 'מתחילים' },
  intermediate: { en: 'Intermediate', he: 'בינוני' },
  advanced: { en: 'Advanced', he: 'מתקדמים' },
};

function lesson(id, stage, title, description, extra = {}) {
  return { id, stage, title, description, ...extra };
}

export const CIRCLE_LESSONS = [
  lesson(
    'circle-overview',
    CIRCLE_STAGES.FOUNDATION,
    { en: 'What Is the Circle of Fifths?', he: 'מהו מעגל החמישיות?' },
    {
      en:
        'The Circle of Fifths arranges all 12 major keys in a circle, where each key sitting next to another is a ' +
        'perfect fifth away from it. It packs three things every musician needs into one diagram: how many sharps ' +
        'or flats a key has, which minor key shares that same key signature, and which keys sound most naturally ' +
        'related to one another. It looks abstract at first, but it is really just a map — once you can read it, ' +
        'questions like "how many sharps does A major have?" or "what chord comes after this one?" become things ' +
        'you can look up instead of memorize one at a time.',
      he:
        'מעגל החמישיות מסדר את כל 12 הסולמות המז\'וריים במעגל, כך שכל שני סולמות סמוכים נמצאים במרחק של חמישית ' +
        'צרה זה מזה. הוא דוחס לתוך דיאגרמה אחת שלושה דברים שכל מוזיקאי צריך: כמה דיאזים או במולים יש לסולם, איזה ' +
        'סולם מינורי חולק איתו את אותו סימן מפתח, ואילו סולמות נשמעים הכי "קרובים" זה לזה מבחינה הרמונית. זה נראה ' +
        'מופשט בהתחלה, אבל זו בעצם רק מפה — ברגע שיודעים לקרוא אותה, שאלות כמו "כמה דיאזים יש לסולם לה מז\'ור?" או ' +
        '"איזה אקורד בא אחרי זה?" הופכות מדברים שצריך לשנן בעל פה למשהו שפשוט בודקים על המפה.',
    },
    { kind: 'overview' }
  ),
  lesson(
    'circle-building',
    CIRCLE_STAGES.FOUNDATION,
    { en: 'How the Circle Is Built', he: 'איך בונים את המעגל' },
    {
      en:
        'A perfect fifth is 7 semitones — the distance from C up to G, for example. Start on C and stack fifth on ' +
        'top of fifth: C, G, D, A, E, B... keep going and, after all 12 major keys, you land back on C exactly one ' +
        'octave higher. Arrange those 12 keys around a circle in that order and you get the Circle of Fifths — ' +
        'clockwise is "up a fifth," counter-clockwise is "down a fifth" (the same as "up a perfect fourth"). Select ' +
        'a key below to see the interval that connects it to its clockwise neighbor.',
      he:
        'חמישית צרה היא 7 חצאי טון — המרחק מדו (C) לסול (G), למשל. התחילו ב-דו וערמו חמישית ' +
        'על גבי חמישית: דו, סול, רה, לה, מי, סי... המשיכו כך, ואחרי כל 12 הסולמות המז\'וריים, תגיעו בחזרה לדו, ' +
        'בדיוק אוקטבה אחת למעלה. סדרו את 12 הסולמות האלה במעגל, לפי הסדר הזה, ותקבלו את מעגל החמישיות — כיוון ' +
        'השעון הוא "חמישית למעלה", וכיוון הפוך לשעון הוא "חמישית למטה" (זהה ל"רביעית למעלה"). בחרו סולם למטה ' +
        'כדי לראות את המרווח המחבר אותו לשכן שלו בכיוון השעון.',
    },
    { kind: 'interval', fretboard: { type: 'interval' } }
  ),
  lesson(
    'circle-sharps',
    CIRCLE_STAGES.KEY_SIGNATURES,
    { en: 'Sharp Keys', he: 'סולמות עם דיאזים' },
    {
      en:
        'Moving clockwise from C, each key picks up exactly one more sharp than the key before it — G has 1 (F#), ' +
        'D has 2 (F#, C#), A has 3, and so on. The sharps are always added in the same fixed order, which spells ' +
        `out the mnemonic "${SHARPS_MNEMONIC.en}": F#, C#, G#, D#, A#, E#, B#. That order is not a coincidence — ` +
        'each new sharp is itself a fifth above the previous one, the same relationship that builds the circle. ' +
        'So a key\'s position clockwise from C tells you both how many sharps it has, and exactly which ones.',
      he:
        'בכיוון השעון מדו, כל סולם מוסיף בדיוק דיאז אחד נוסף על פני הסולם שלפניו — לסול (G) יש 1 (פה-דיאז), לרה ' +
        '(D) יש 2 (פה-דיאז, דו-דיאז), ללה (A) יש 3, וכן הלאה. הדיאזים תמיד מתווספים באותו סדר קבוע: פה, דו, סול, ' +
        'רה, לה, מי, סי (כולם בדיאז). הסדר הזה אינו מקרי — כל דיאז חדש הוא בעצמו חמישית מעל הדיאז הקודם, אותו ' +
        'יחס שבונה את המעגל עצמו. אז המקום של סולם בכיוון השעון מדו אומר לכם גם כמה דיאזים יש לו, וגם בדיוק אילו.',
    },
    { kind: 'keySig', fretboard: { type: 'scale', family: 'major' } }
  ),
  lesson(
    'circle-flats',
    CIRCLE_STAGES.KEY_SIGNATURES,
    { en: 'Flat Keys', he: 'סולמות עם במולים' },
    {
      en:
        'Moving counter-clockwise from C works the same way with flats: F has 1 (Bb), Bb has 2 (Bb, Eb), Eb has 3, ' +
        'and so on. The flats are added in the order B, E, A, D, G, C, F — the exact reverse of the sharps order, ' +
        'which is a genuinely useful shortcut: learn the sharps order once, and the flats order is just that ' +
        'sentence read backwards.',
      he:
        'בכיוון הפוך לשעון מדו, אותו עיקרון עובד עם במולים: לפה (F) יש 1 (סי-במול), לסי-במול (Bb) יש 2 (סי-במול, ' +
        'מי-במול), למי-במול (Eb) יש 3, וכן הלאה. הבמולים מתווספים בסדר סי, מי, לה, רה, סול, דו, פה — בדיוק ההפך ' +
        'מסדר הדיאזים, וזהו קיצור דרך שימושי מאוד: לומדים את סדר הדיאזים פעם אחת, וסדר הבמולים הוא פשוט אותו סדר ' +
        'הפוך.',
    },
    { kind: 'keySig', fretboard: { type: 'scale', family: 'major' } }
  ),
  lesson(
    'circle-enharmonic',
    CIRCLE_STAGES.KEY_SIGNATURES,
    { en: 'The Enharmonic Seam', he: 'התפר האנהרמוני' },
    {
      en:
        'The sharp side and the flat side meet at the bottom of the circle. F# major (6 sharps) and Gb major (6 ' +
        'flats) are the same pitches, spelled two different ways — an "enharmonic" pair. The same is true just to ' +
        'either side: B major (5 sharps) sounds identical to Cb major (7 flats), and Db major (5 flats) sounds ' +
        'identical to C# major (7 sharps). Musicians almost always use whichever spelling has fewer accidentals — ' +
        'that is exactly why the circle presents B and Db, not their more awkward twins, as the "normal" names on ' +
        'either side of the seam.',
      he:
        'הצד עם הדיאזים והצד עם הבמולים נפגשים בתחתית המעגל. F#‏ מז\'ור (6 דיאזים) ו-Gb מז\'ור (6 במולים) הם אותם ' +
        'צלילים בדיוק, מאויתים בשתי דרכים שונות — זוג "אנהרמוני". אותו דבר נכון בדיוק משני הצדדים: סי מז\'ור (5 ' +
        'דיאזים) נשמע זהה ל-Cb מז\'ור (7 במולים), ו-Db מז\'ור (5 במולים) נשמע זהה ל-C# מז\'ור (7 דיאזים). מוזיקאים ' +
        'כמעט תמיד משתמשים באיות עם פחות סימני מקרה — ולכן בדיוק מסיבה זו המעגל מציג את סי ו-Db, ולא את התאומים ' +
        'המסורבלים יותר שלהם, כ"שמות הרגילים" משני צידי התפר.',
    },
    { kind: 'enharmonic', fretboard: { type: 'scale', family: 'major' } }
  ),
  lesson(
    'circle-relative-minor',
    CIRCLE_STAGES.RELATIVE_KEYS,
    { en: 'Relative Minor Keys', he: 'סולמות המינור הקרובים' },
    {
      en:
        'Every major key has a "relative minor" — a minor key built from the exact same notes and the exact same ' +
        'key signature, starting 3 semitones (a minor third) below the major root. On the circle this relative ' +
        'minor sits on the inner ring, directly next to its major key: A minor shares C major\'s empty key ' +
        'signature, E minor shares G major\'s single sharp, and so on all the way around. They are not two ' +
        'unrelated keys that happen to match — they are the same 7 notes, described from two different starting ' +
        'points.',
      he:
        'לכל סולם מז\'ורי יש "מינור קרוב" — סולם מינורי הבנוי מאותם התווים בדיוק ואותו סימן מפתח בדיוק, המתחיל 3 ' +
        'חצאי טון (שלישית מינורית) מתחת לשורש המז\'ורי. במעגל, המינור הקרוב הזה יושב בטבעת הפנימית, ממש ליד ' +
        'הסולם המז\'ורי שלו: לה מינור חולק את סימן המפתח הריק של דו מז\'ור, מי מינור חולק את הדיאז היחיד של סול ' +
        'מז\'ור, וכן הלאה סביב כל המעגל. אלה לא שני סולמות לא קשורים שבמקרה מתאימים — אלה אותם 7 תווים בדיוק, ' +
        'מתוארים משתי נקודות התחלה שונות.',
    },
    { kind: 'relativeMinor', fretboard: { type: 'scale', family: 'naturalMinor', relative: true } }
  ),
  lesson(
    'circle-major-or-minor',
    CIRCLE_STAGES.RELATIVE_KEYS,
    { en: 'Major or Minor? Finding the Real Key', he: 'מז\'ור או מינור? למצוא את הסולם האמיתי' },
    {
      en:
        'Since a major key and its relative minor share one key signature, the key signature alone cannot tell you ' +
        'which one a piece is actually in — 1 sharp could be G major or E minor. Teachers generally point students ' +
        'to two practical clues instead: which chord the piece keeps returning "home" to (especially the very last ' +
        'chord), and whether that chord sounds resolved (major) or unresolved/sad (minor). The key signature narrows ' +
        'it to 2 candidates; your ear and the final chord pick between them.',
      he:
        'מכיוון שסולם מז\'ורי והמינור הקרוב שלו חולקים סימן מפתח אחד, סימן המפתח לבדו לא יכול לומר לכם באיזה סולם ' +
        'יצירה נמצאת בפועל — דיאז אחד יכול להיות סול מז\'ור או מי מינור. מורים בדרך כלל מפנים תלמידים לשני רמזים ' +
        'מעשיים במקום: לאיזה אקורד היצירה כל הזמן "חוזרת הביתה" (במיוחד האקורד האחרון ממש), והאם אקורד זה נשמע ' +
        'פתור (מז\'ור) או לא-פתור/עצוב (מינור). סימן המפתח מצמצם ל-2 מועמדים; האוזן שלכם והאקורד האחרון בוחרים ' +
        'ביניהם.',
    },
    { kind: 'overview' }
  ),
  lesson(
    'circle-neighbors',
    CIRCLE_STAGES.HARMONY,
    { en: 'Neighbor Keys: Your IV and V', he: 'שכנים במעגל: ה-IV וה-V שלכם' },
    {
      en:
        'This is the single most useful trick the circle offers a working musician: for any major key, its ' +
        'counter-clockwise neighbor is that key\'s IV chord (the subdominant), and its clockwise neighbor is its V ' +
        'chord (the dominant). In C major, F sits counter-clockwise (IV) and G sits clockwise (V) — exactly the ' +
        'I-IV-V that almost every simple song is built from. This works in every key: find the key on the circle, ' +
        'look one step either side, and you already know two of its three most important chords.',
      he:
        'זה הטריק השימושי ביותר שהמעגל מציע למוזיקאי עובד: עבור כל סולם מז\'ורי, השכן שלו בכיוון הפוך לשעון הוא ' +
        'אקורד ה-IV שלו (סאב-דומיננטה), והשכן שלו בכיוון השעון הוא אקורד ה-V שלו (דומיננטה). בדו מז\'ור, פה (F) ' +
        'יושב בכיוון הפוך לשעון (IV) וסול (G) יושב בכיוון השעון (V) — בדיוק ה-I-IV-V שכמעט כל שיר פשוט בנוי ' +
        'עליו. זה עובד בכל סולם: מוצאים את הסולם על המעגל, מסתכלים צעד אחד לכל צד, וכבר יודעים שניים משלושת ' +
        'האקורדים החשובים ביותר שלו.',
    },
    { kind: 'neighbors', fretboard: { type: 'chord' } }
  ),
  lesson(
    'circle-progressions',
    CIRCLE_STAGES.HARMONY,
    { en: 'Building ii-V-I and vi-ii-V-I', he: 'בניית ii-V-I ו-vi-ii-V-I' },
    {
      en:
        'The circle also maps out the most common jazz and pop progression, ii-V-I, as three consecutive ' +
        'counter-clockwise steps landing on the tonic — for example in C major: D minor (ii) to G (V) to C (I). ' +
        'Add the relative minor from the inner ring as a starting point and you get vi-ii-V-I (A minor - D minor - ' +
        'G - C), the backbone of countless standards. Because every step is a counter-clockwise move on the same ' +
        'circle, once this shape is memorized in one key it transposes to any other key by simply starting the ' +
        'same shape somewhere else on the wheel.',
      he:
        'המעגל גם ממפה את הרצף הנפוץ ביותר בג\'אז ובפופ, ii-V-I, כשלושה צעדים רצופים בכיוון הפוך לשעון שנוחתים על ' +
        'הטוניקה — למשל בדו מז\'ור: רה מינור (ii) אל סול (V) אל דו (I). הוסיפו את המינור הקרוב מהטבעת הפנימית ' +
        'כנקודת התחלה ותקבלו vi-ii-V-I (לה מינור - רה מינור - סול - דו), עמוד השדרה של אינספור סטנדרטים. מכיוון ' +
        'שכל צעד הוא תזוזה בכיוון הפוך לשעון על אותו מעגל, ברגע שהצורה הזו משוננת בסולם אחד, מעבירים אותה לכל ' +
        'סולם אחר פשוט על ידי התחלת אותה צורה במקום אחר על הגלגל.',
    },
    { kind: 'progressionMap', fretboard: { type: 'chord' } }
  ),
  lesson(
    'circle-modulation',
    CIRCLE_STAGES.HARMONY,
    { en: 'Modulating with the Circle', he: 'מודולציה בעזרת המעגל' },
    {
      en:
        'When a song changes key ("modulates"), how far it jumps on the circle predicts how smooth or dramatic the ' +
        'change will feel. Moving to a close neighbor (one step either way) changes only one note in the key ' +
        'signature, so it usually sounds natural and almost unnoticed. Moving to a key on the opposite side of the ' +
        'circle shares almost no notes with the original key, so it lands as a bold, noticeable shift. Neither is ' +
        '"better" — they are different tools, and the circle is what lets you choose on purpose instead of by ' +
        'accident.',
      he:
        'כאשר שיר משנה סולם ("מודולציה"), המרחק שהוא קופץ על המעגל מנבא עד כמה השינוי ירגיש חלק או דרמטי. מעבר ' +
        'לשכן קרוב (צעד אחד לכל כיוון) משנה רק תו אחד בסימן המפתח, ולכן זה בדרך כלל נשמע טבעי וכמעט לא מורגש. ' +
        'מעבר לסולם בצד הנגדי של המעגל חולק כמעט אף תו עם הסולם המקורי, ולכן זה נוחת כשינוי בולט ומורגש. אף אחד ' +
        'מהם אינו "טוב יותר" — אלה כלים שונים, והמעגל הוא מה שמאפשר לכם לבחור בכוונה במקום במקרה.',
    },
    { kind: 'overview' }
  ),
  lesson(
    'circle-quiz',
    CIRCLE_STAGES.PRACTICE,
    { en: 'Practice: Key Signature Flashcards', he: 'תרגול: כרטיסיות סימני מפתח' },
    {
      en:
        'A classic flashcard drill, the same method certified theory teachers use for key-signature memorization: ' +
        'you are shown a key, and asked how many sharps or flats it has (or the reverse — shown a count, asked ' +
        'which key it is). Quick, low-pressure repetition is what makes this stick — better to run it for a few ' +
        'minutes daily than to cram it once.',
      he:
        'תרגיל כרטיסיות קלאסי, אותה שיטה שמורי תיאוריה מוסמכים משתמשים בה לשינון סימני מפתח: מוצג לכם סולם, ' +
        'ונשאלים כמה דיאזים או במולים יש לו (או להפך — מוצג מספר, ונשאלים איזה סולם זה). חזרה מהירה וללא לחץ היא ' +
        'מה שגורם לזה להיטמע — עדיף להריץ זאת כמה דקות ביום מאשר לדחוס פעם אחת.',
    },
    { kind: 'quiz', difficulty: 'beginner' }
  ),
  lesson(
    'circle-drill-triad',
    CIRCLE_STAGES.PRACTICE,
    { en: 'Practice: I-IV-V Circle Drill', he: 'תרגול: תרגיל I-IV-V על המעגל' },
    {
      en:
        'A metronome-timed drill (the same practice engine the Scales course uses) that steps through the root ' +
        'notes of I, IV, and V for whichever key you select — the same neighbor relationship from the "Neighbor ' +
        'Keys" lesson, now under a click track. Play each root in time and say its Roman numeral out loud; this is ' +
        'the standard first drill music teachers assign once a student can name a key\'s neighbors.',
      he:
        'תרגיל בקצב מטרונום (אותו מנוע תרגול שקורס הסולמות משתמש בו) שעובר על תווי השורש של I, IV, ' +
        'ו-V עבור הסולם שתבחרו — אותו יחס שכנות מהשיעור "שכנים במעגל", הפעם תחת קליק. נגנו כל שורש בקצב ואמרו ' +
        'בקול את המספר הרומי שלו; זהו התרגיל הראשון הסטנדרטי שמורי מוזיקה נותנים ברגע שתלמיד יודע לומר את שכניו ' +
        'של סולם.',
    },
    { kind: 'exercise', difficulty: 'intermediate', drillDegrees: [0, 3, 4] }
  ),
  lesson(
    'circle-drill-progression',
    CIRCLE_STAGES.PRACTICE,
    { en: 'Practice: vi-ii-V-I Circle Drill', he: 'תרגול: תרגיל vi-ii-V-I על המעגל' },
    {
      en:
        'The same metronome drill engine, extended to the full vi-ii-V-I progression from the "Building ii-V-I" ' +
        'lesson — 4 roots instead of 3, moving counter-clockwise around the circle back to the tonic. A harder, ' +
        'more musical follow-up once the 3-chord I-IV-V drill feels automatic.',
      he:
        'אותו מנוע תרגול מטרונום, מורחב לרצף המלא vi-ii-V-I מהשיעור "בניית ii-V-I" — 4 שורשים במקום 3, בתנועה ' +
        'בכיוון הפוך לשעון סביב המעגל בחזרה לטוניקה. המשך קשה ומוזיקלי יותר ברגע שתרגיל ה-3 אקורדים I-IV-V מרגיש ' +
        'אוטומטי.',
    },
    { kind: 'exercise', difficulty: 'advanced', drillDegrees: [9, 2, 7, 0] }
  ),
];

// --- Fretboard integration ------------------------------------------------
// Same "one function turns (lesson, current state) into Fretboard props"
// role as resolveCagedStageProps/resolveScaleStageProps. Chord-shape lessons
// return a chordText for App.jsx to run through the existing
// computeChordPositions engine (same call site pattern as
// CAGED_REFERENCE_CHORD), since that engine lives at the App level, not here.
export function resolveCircleStageProps(lesson, selectedKey, labelMode, tonicPositions) {
  if (!lesson?.fretboard) return { position: null };

  if (lesson.fretboard.type === 'interval') {
    const scaleNotes = computeScaleNotes({
      rootPitchClass: selectedKey.pitchClass,
      intervals: [0, 7],
      degreeLabels: ['1', '5'],
      fretStart: 0,
      fretEnd: 12,
    });
    return { position: null, scaleNotes, labelMode: 'degree' };
  }

  if (lesson.fretboard.type === 'scale') {
    const family = SCALE_FAMILIES[lesson.fretboard.family];
    const root = lesson.fretboard.relative ? mod(selectedKey.pitchClass + 9, 12) : selectedKey.pitchClass;
    const scaleNotes = computeScaleNotes({
      rootPitchClass: root,
      intervals: family.intervals,
      degreeLabels: family.degreeLabels,
      fretStart: 0,
      fretEnd: 12,
    });
    return { position: null, scaleNotes, labelMode };
  }

  if (lesson.fretboard.type === 'chord') {
    return { position: tonicPositions?.[0] ?? null, labelMode: 'note' };
  }

  return { position: null };
}

// --- Practice drills -------------------------------------------------------
// Builds a metronome-timed root-note sequence for the given scale degrees
// (0-based semitone offsets from the major scale, e.g. [0,3,4] for I-IV-V),
// placed on the low-E/A strings for easy, unambiguous fretting — same
// {string,fret,finger,noteName} shape usePracticeDrill/PracticeDrillPanel
// already consume everywhere else (CAGED workout, Scales practice).
const MAJOR_SCALE_SEMITONES = SCALE_FAMILIES.major.intervals;

function lowestFretFor(stringIndex, pitchClass) {
  const STANDARD_TUNING_PITCH_CLASSES = [4, 9, 2, 7, 11, 4]; // E A D G B E, low to high
  return mod(pitchClass - STANDARD_TUNING_PITCH_CLASSES[stringIndex], 12);
}

export function buildCircleDrillExercise(lessonOrDegrees, selectedKey, bpm = 76) {
  const degrees = Array.isArray(lessonOrDegrees) ? lessonOrDegrees : lessonOrDegrees.drillDegrees;
  if (!degrees) return null;
  // Alternates low-E/A strings so consecutive roots are never on the exact
  // same string right on top of each other — a small, deliberate playability
  // choice, not a theory requirement.
  const sequence = degrees.map((degreeIndex, i) => {
    const semitone = MAJOR_SCALE_SEMITONES[degreeIndex];
    const pitchClass = mod(selectedKey.pitchClass + semitone, 12);
    const stringIndex = i % 2;
    const fret = lowestFretFor(stringIndex, pitchClass);
    return { string: stringIndex, fret, finger: null, noteName: noteNameForPitchClass(pitchClass) };
  });
  return { bpmSuggested: bpm, noteValue: 'quarter', sequence };
}
