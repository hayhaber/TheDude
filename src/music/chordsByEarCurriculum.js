// The Studies -> Chords by Ear course's content model — same hand-authored-
// data + small-pure-helpers pattern as every other Studies course
// (cagedCurriculum.js/scalesCurriculum.js/circleOfFifthsCurriculum.js/
// harmonyCurriculum.js). This course teaches ONE specific, high-value goal:
// hearing a song for the first time and being able to play along with its
// chords well enough to jam with other people — arguably the single most
// requested "real musician" skill, and a genuinely different curriculum
// from the Harmony course (which teaches how chords are BUILT) or the
// generic Ear Training quiz in Practice (which trains absolute pitch/
// interval/chord recognition in isolation, no rhythm or key-context, no
// song-application). The methodology here is the one real ear-training
// teachers and working musicians actually use — relative/functional
// pitch ("what is this, relative to the song's own home chord"), the same
// principle behind the Nashville Number System session musicians use on
// the job — NOT absolute-pitch memorization, which doesn't scale to an
// unfamiliar song in an unknown key.
import { SCALE_FAMILIES } from './scalesCurriculum';
import { computeScaleNotes } from './scaleShapes';
import { KEY_NAMES } from './scaleAnalyzer';

export const CHORDS_BY_EAR_STAGES = {
  FOUNDATION: 'foundation',
  QUALITY: 'quality',
  FUNCTION: 'function',
  FRETBOARD_MAP: 'fretboardMap',
  CHANGES: 'changes',
  PATTERNS: 'patterns',
  STRATEGY: 'strategy',
  PRACTICE: 'practice',
};

export const CHORDS_BY_EAR_STAGE_LABELS = {
  [CHORDS_BY_EAR_STAGES.FOUNDATION]: { en: 'Foundation', he: 'יסודות' },
  [CHORDS_BY_EAR_STAGES.QUALITY]: { en: 'Hearing Chord Color', he: 'שמיעת צבע האקורד' },
  [CHORDS_BY_EAR_STAGES.FUNCTION]: { en: 'Hearing "Home" (Function)', he: 'שמיעת ה"בית" (פונקציה)' },
  [CHORDS_BY_EAR_STAGES.FRETBOARD_MAP]: { en: 'The 3-Step System on the Neck', he: 'שיטת 3 הצעדים על הצוואר' },
  [CHORDS_BY_EAR_STAGES.CHANGES]: { en: 'Hearing Chord Changes', he: 'שמיעת מעברי אקורדים' },
  [CHORDS_BY_EAR_STAGES.PATTERNS]: { en: 'Recognizing Progressions', he: 'זיהוי רצפי אקורדים' },
  [CHORDS_BY_EAR_STAGES.STRATEGY]: { en: 'Putting It Together', he: 'הרכבת הכל יחד' },
  [CHORDS_BY_EAR_STAGES.PRACTICE]: { en: 'Real-Song Practice', he: 'תרגול על שירים אמיתיים' },
};

function lesson(id, stage, title, description, extra = {}) {
  return { id, stage, title, description, ...extra };
}

export const CHORDS_BY_EAR_LESSONS = [
  // ---------------- FOUNDATION ----------------
  lesson(
    'cbe-why',
    CHORDS_BY_EAR_STAGES.FOUNDATION,
    { en: 'Why Learn to Play by Ear?', he: 'למה ללמוד לנגן לפי שמיעה?' },
    {
      en:
        'One of the biggest jumps a musician can make is from "I can only play a song if I have the chord sheet" to ' +
        '"I hear a song I know and I can just start playing it." That single skill is what lets you jam with other ' +
        'people — around a fire, at a party, in a band rehearsal — without everyone stopping to look something up. ' +
        'You almost never need 100% accuracy for this to work: playing close enough, confidently, in time, is what ' +
        'actually makes a jam feel good. This course builds that skill from the ground up, in the same order real ' +
        'ear-training teachers use: first learn to hear the pieces (chord color, "home," rhythm), then learn to ' +
        'recognize whole familiar shapes, then apply it to real songs.',
      he:
        'אחת הקפיצות הגדולות ביותר שמוזיקאי יכול לעשות היא מ"אני יכול לנגן שיר רק אם יש לי דף אקורדים" ל"אני שומע ' +
        'שיר שאני מכיר ואני יכול פשוט להתחיל לנגן אותו". היכולת הבודדת הזו היא זו שמאפשרת לכם לג\'אם עם אנשים ' +
        'אחרים — סביב מדורה, במסיבה, בחזרת להקה — בלי שכולם יעצרו כדי לחפש משהו. כמעט אף פעם לא צריך דיוק של 100% ' +
        'כדי שזה יעבוד: לנגן קרוב מספיק, בביטחון, בקצב, זה מה שבאמת גורם לג\'אם להרגיש טוב. הקורס הזה בונה את ' +
        'היכולת הזו מהיסוד, באותו סדר שמורים מוסמכים לאימון שמיעה משתמשים: קודם ללמוד לשמוע את החלקים (צבע ' +
        'האקורד, "הבית", הקצב), אחר כך ללמוד לזהות צורות שלמות ומוכרות, ולבסוף ליישם את זה על שירים אמיתיים.',
    },
    { kind: 'overview' }
  ),
  lesson(
    'cbe-method',
    CHORDS_BY_EAR_STAGES.FOUNDATION,
    { en: 'How This Course Trains Your Ear', he: 'איך הקורס הזה מאמן את האוזן שלכם' },
    {
      en:
        'There are two very different kinds of "ear": absolute pitch (rare, mostly inborn — instantly naming a note ' +
        'with zero reference) and RELATIVE pitch (learnable by anyone — hearing how one note or chord relates to ' +
        'another). This course trains relative pitch exclusively, because it\'s the one that actually works for ' +
        '"figure out an unfamiliar song": you don\'t need to know a chord is literally "D major," you need to know ' +
        'it\'s "the IV chord" — 4 steps up from wherever the song\'s home base is. This is exactly the logic behind ' +
        'the Nashville Number System, which professional session musicians use on the job to sight-read a song they\'ve ' +
        'never heard before in any key, on the spot. Every drill in this course plays a reference "home" sound first, ' +
        'then asks you to place something relative to it — never "name this note in isolation."',
      he:
        'יש שני סוגים שונים מאוד של "אוזן": פיץ\' אבסולוטי (נדיר, לרוב מולד — לזהות תו מיידית ללא כל התייחסות) ' +
        'ופיץ\' יחסי (RELATIVE PITCH, שכל אחד יכול ללמוד — לשמוע איך תו או אקורד אחד קשור לאחר). הקורס הזה מאמן ' +
        'פיץ\' יחסי בלבד, כי זה היחיד שבאמת עובד עבור "לפענח שיר לא מוכר": אתם לא צריכים לדעת שאקורד הוא ממש "רה ' +
        'מז\'ור", אתם צריכים לדעת שהוא "אקורד ה-IV" — 4 צעדים מעל איפה שהבית של השיר נמצא. זהו בדיוק ההיגיון מאחורי ' +
        'ה-Nashville Number System, שנגני סשן מקצועיים משתמשים בו בעבודה כדי לקרוא לפי שמיעה שיר שהם מעולם לא שמעו, ' +
        'בכל סולם, במקום. כל תרגיל בקורס הזה מנגן קודם צליל "בית" ייחוס, ואז מבקש מכם למקם משהו יחסית אליו — אף ' +
        'פעם לא "תנו שם לתו הזה בבידוד".',
    },
    { kind: 'overview' }
  ),

  // ---------------- QUALITY ----------------
  lesson(
    'cbe-major-minor',
    CHORDS_BY_EAR_STAGES.QUALITY,
    { en: 'The Most Important Sound: Major vs Minor', he: 'הצליל הכי חשוב: מז\'ור מול מינור' },
    {
      en:
        'Before you can guess WHICH chord you\'re hearing, you need the single most useful piece of information a ' +
        'chord gives away: is it major (bright, "happy," resolved) or minor (darker, "sad" or moodier)? This one ' +
        'judgment call, made instantly and by feel rather than analysis, immediately cuts your guessing in half for ' +
        'every chord in a song. Play the toggle below on the same root and really listen to the character change — ' +
        'not the notes, the FEELING.',
      he:
        'לפני שאתם יכולים לנחש איזה אקורד אתם שומעים, אתם צריכים את פיסת המידע השימושית ביותר שאקורד חושף: האם ' +
        'הוא מז\'ור (בהיר, "שמח", פתור) או מינור (כהה יותר, "עצוב" או קודר יותר)? שיקול הדעת הבודד הזה, שנעשה מיידית ' +
        'ולפי תחושה ולא ניתוח, חותך מיד את הניחוש שלכם לחצי עבור כל אקורד בשיר. נגנו את המתג למטה על אותו שורש ' +
        'והקשיבו באמת לשינוי באופי — לא לתווים, לתחושה.',
    },
    { kind: 'demo', demo: { type: 'qualityToggle', options: ['major', 'minor'] } }
  ),
  lesson(
    'cbe-more-qualities',
    CHORDS_BY_EAR_STAGES.QUALITY,
    { en: 'Beyond Major/Minor: Dominant 7th and Diminished', he: 'מעבר למז\'ור/מינור: דומיננטי 7 ודימיניושד' },
    {
      en:
        'Two more colors show up constantly in real songs. Dominant 7th sounds bluesy and restless — like it ' +
        'urgently wants to resolve somewhere, common in blues, funk, and classic rock. Diminished sounds tense and ' +
        'unstable, almost eerie — much rarer as a full song chord, but a very recognizable, distinctive color when ' +
        'it does show up (often as a quick passing chord between two others). You don\'t need to identify these ' +
        'perfectly yet — just start noticing that they sound different from plain major/minor.',
      he:
        'שני צבעים נוספים מופיעים כל הזמן בשירים אמיתיים. דומיננטי 7 נשמע בלוזי וחסר מנוחה — כאילו הוא רוצה בדחיפות ' +
        'להיפתר למשהו, נפוץ בבלוז, פאנק, ורוק קלאסי. דימיניושד נשמע מתוח ולא יציב, כמעט מסתורי — נדיר הרבה יותר ' +
        'כאקורד מלא בשיר, אבל צבע מזוהה ומובחן מאוד כשהוא כן מופיע (לרוב כאקורד מעבר מהיר בין שניים אחרים). אתם לא ' +
        'צריכים לזהות אותם בצורה מושלמת עדיין — רק להתחיל לשים לב שהם נשמעים שונה ממז\'ור/מינור רגילים.',
    },
    { kind: 'demo', demo: { type: 'qualityToggle', options: ['major', 'minor', 'dominant7', 'dim'] } }
  ),
  lesson(
    'cbe-quiz-quality',
    CHORDS_BY_EAR_STAGES.QUALITY,
    { en: 'Practice: Chord Quality by Ear', he: 'תרגול: זיהוי צבע אקורד לפי שמיעה' },
    {
      en:
        'A chord plays — no root note is given, since quality is a feeling, not a pitch-matching task. Pick the ' +
        'quality by ear. Start on Foundation (major/minor only) and move to Full once that feels easy — the whole ' +
        'point is to get this instant and automatic, since you\'ll be making this exact judgment call, without even ' +
        'thinking about it, on every single chord of a real song later in this course.',
      he:
        'אקורד מתנגן — אין נתון תו שורש, כי צבע הוא תחושה, לא משימת התאמת גובה צליל. בחרו את הצבע לפי שמיעה. ' +
        'התחילו ב"יסודות" (מז\'ור/מינור בלבד) ועברו ל"מלא" ברגע שזה מרגיש קל — כל הרעיון הוא שזה יהיה מיידי ואוטומטי, ' +
        'כי תעשו את שיקול הדעת המדויק הזה, בלי אפילו לחשוב על זה, על כל אקורד ואקורד בשיר אמיתי בהמשך הקורס.',
    },
    { kind: 'quiz', quizType: 'quality' }
  ),

  // ---------------- FUNCTION ----------------
  lesson(
    'cbe-relative-pitch',
    CHORDS_BY_EAR_STAGES.FUNCTION,
    { en: 'Relative Pitch: The Real Secret', he: 'פיץ\' יחסי: הסוד האמיתי' },
    {
      en:
        'Here\'s the idea that makes "playing by ear" actually achievable instead of a rare gift: you almost never ' +
        'need to know a chord\'s absolute name. You need to know its relationship to the song\'s "home" chord (its ' +
        'key). A song\'s home chord is usually the one that feels the most resolved and stable — often (not always) ' +
        'the very first or very last chord. Once your ear locks onto "home," every other chord becomes a question of ' +
        'DISTANCE from it, not a cold guess out of 12 possible notes.',
      he:
        'הנה הרעיון שהופך את "לנגן לפי שמיעה" ליכולת בת-השגה במקום מתנה נדירה: כמעט אף פעם אתם לא צריכים לדעת את ' +
        'השם האבסולוטי של אקורד. אתם צריכים לדעת את היחס שלו לאקורד ה"בית" של השיר (הסולם שלו). אקורד הבית של שיר ' +
        'הוא לרוב זה שמרגיש הכי פתור ויציב — לעיתים קרובות (לא תמיד) האקורד הראשון ממש או האחרון ממש. ברגע שהאוזן ' +
        'שלכם נועלת על "הבית", כל אקורד אחר הופך לשאלה של מרחק ממנו, לא ניחוש קר מתוך 12 תווים אפשריים.',
    },
    { kind: 'overview' }
  ),
  lesson(
    'cbe-nashville',
    CHORDS_BY_EAR_STAGES.FUNCTION,
    { en: 'Scale Degrees & the Nashville Number System', he: 'דרגות סולם ומערכת המספרים של נאשוויל' },
    {
      en:
        'Number every chord of the key by its distance from home: the home chord itself is "1" (written I), and the ' +
        'others are II, III, IV, V, VI, VII counting up the scale. This is literally how Nashville session ' +
        'musicians write charts — "1, 4, 5, 1" instead of committing to one key on paper, so the same chart works ' +
        'no matter which key the singer wants that day. Play the reference tone below, then the target chord, and ' +
        'try to feel which numbered "step away from home" it is — that feeling, not math, is the actual skill.',
      he:
        'מספרו כל אקורד בסולם לפי המרחק שלו מהבית: אקורד הבית עצמו הוא "1" (נכתב I), והשאר הם II, III, IV, V, VI, ' +
        'VII בספירה מעלה בסולם. זו ממש הדרך שבה נגני סשן בנאשוויל כותבים תווים — "1, 4, 5, 1" במקום להתחייב לסולם ' +
        'אחד על הנייר, כך שאותו תו עובד לא משנה באיזה סולם הזמר/ת רוצה באותו יום. נגנו את תו הייחוס למטה, ואז את ' +
        'אקורד היעד, ונסו להרגיש איזה "צעד מהבית" הוא — התחושה הזו, לא חשבון, היא המיומנות האמיתית.',
    },
    { kind: 'demo', demo: { type: 'homeReference' } }
  ),
  lesson(
    'cbe-quiz-sing-root',
    CHORDS_BY_EAR_STAGES.FUNCTION,
    { en: 'Practice: Sing the Root', he: 'תרגול: שירו את השורש' },
    {
      en:
        'The single most-recommended exercise in every certified relative-pitch method (Kodály solfège, David ' +
        'Lucas Burge\'s well-known Ear Training courses): don\'t just PICK the answer, SING it — out loud, hummed ' +
        'is fine. A multiple-choice answer can be reached by elimination without truly hearing anything; a note you ' +
        'can accurately sing back is a note you\'ve actually internalized. A chord plays — sing/hum its root note ' +
        'back into the mic (any octave; your voice range has nothing to do with where the guitar happens to voice ' +
        'it) and this app listens and grades it the same way the Tuner does.',
      he:
        'התרגיל המומלץ ביותר בכל שיטה מוסמכת לפיץ\' יחסי (סולפז\' של קודאי, קורסי אימון-השמיעה המוכרים של David ' +
        'Lucas Burge): אל תבחרו את התשובה, שירו אותה — בקול, גם המהום מספיק. תשובה של בחירה מרובה אפשר להגיע ' +
        'אליה על ידי אלימינציה בלי לשמוע באמת שום דבר; תו שאתם יכולים לשיר בחזרה במדויק הוא תו שבאמת הפנמתם. ' +
        'אקורד מתנגן — שירו/המהמו את תו השורש שלו בחזרה לתוך המיקרופון (בכל אוקטבה; טווח הקול שלכם לא קשור לאיפה ' +
        'שהגיטרה במקרה מנגנת אותו) והאפליקציה מקשיבה ומדרגת בדיוק כמו הטיונר.',
    },
    { kind: 'quiz', quizType: 'singRoot' }
  ),
  lesson(
    'cbe-quiz-function-basic',
    CHORDS_BY_EAR_STAGES.FUNCTION,
    { en: 'Practice: Find the I, IV, and V by Ear', he: 'תרגול: זיהוי I, IV, ו-V לפי שמיעה' },
    {
      en:
        'I, IV, and V alone cover an enormous share of popular music — start here. A reference tone and the I chord ' +
        'establish "home," then a target chord plays; decide by ear whether it IS home, or a step toward IV or V. ' +
        'This is the single most valuable listening skill in this entire course — most jam-along situations only ' +
        'ever need exactly this.',
      he:
        'I, IV, ו-V לבדם מכסים נתח עצום מהמוזיקה הפופולרית — התחילו כאן. תו ייחוס ואקורד ה-I מבססים "בית", ואז ' +
        'אקורד יעד מתנגן; החליטו לפי שמיעה האם זה הבית עצמו, או צעד לכיוון IV או V. זו מיומנות ההאזנה השימושית ' +
        'ביותר בכל הקורס הזה — רוב מצבי הג\'אם צריכים בדיוק את זה ותו לא.',
    },
    { kind: 'quiz', quizType: 'functionBasic' }
  ),
  lesson(
    'cbe-quiz-function-full',
    CHORDS_BY_EAR_STAGES.FUNCTION,
    { en: 'Practice: Full 7-Chord Functional Hearing', he: 'תרגול: שמיעה פונקציונלית מלאה על 7 אקורדים' },
    {
      en:
        'Once I/IV/V feels automatic, open it up to all 7 diatonic chords (I through vii°) — the same drill, now ' +
        'testing every degree a real song\'s key can call on, including the minor chords (ii, iii, vi) that give a ' +
        'progression its more emotional or unexpected moments.',
      he:
        'ברגע ש-I/IV/V מרגישים אוטומטיים, פתחו את זה לכל 7 האקורדים הדיאטוניים (I עד vii°) — אותו תרגיל, בודק ' +
        'עכשיו כל דרגה שסולם של שיר אמיתי יכול לקרוא לה, כולל האקורדים המינוריים (ii, iii, vi) שנותנים לרצף את ' +
        'הרגעים הרגשיים או הבלתי-צפויים יותר שלו.',
    },
    { kind: 'quiz', quizType: 'functionFull' }
  ),
  lesson(
    'cbe-bass-motion',
    CHORDS_BY_EAR_STAGES.FUNCTION,
    { en: 'Tracking the Bass Line', he: 'מעקב אחר קו הבס' },
    {
      en:
        'One more piece of the "home" puzzle: the DIRECTION the bass moves between chords is often easier to catch ' +
        'than the chords themselves, and it\'s a genuine head start — a bass leaping down a 5th (or up a 4th) is the ' +
        'classic sound of V resolving to I, one of the strongest cues there is for "we just landed back home." Try ' +
        'humming just the lowest note as the two chords play, before even trying to name either one.',
      he:
        'עוד חלק מפאזל ה"בית": הכיוון שבו הבס זז בין אקורדים לרוב קל יותר לתפוס מהאקורדים עצמם, וזו התחלה אמיתית ' +
        'טובה — בס שקופץ חמישית כלפי מטה (או רביעית כלפי מעלה) הוא הצליל הקלאסי של V הנפתר ל-I, אחד הרמזים ' +
        'החזקים ביותר ל"בדיוק נחתנו בחזרה בבית". נסו להמהם רק את התו הכי נמוך תוך כדי שני האקורדים מתנגנים, עוד ' +
        'לפני שאתם מנסים לתת שם לאף אחד מהם.',
    },
    { kind: 'quiz', quizType: 'bassMotion' }
  ),

  // ---------------- FRETBOARD_MAP ----------------
  // Everything above trained the EAR in isolation; these lessons put the
  // exact same 3-step system on the actual neck, on the shared Fretboard —
  // the spatial companion to the aural skills already built, not a
  // separate curriculum. Opens with the same 2 prerequisites the source
  // methodology itself starts with (note names on the low E/A strings, the
  // major/minor formula) before the 3 steps themselves.
  lesson(
    'cbe-note-names',
    CHORDS_BY_EAR_STAGES.FRETBOARD_MAP,
    { en: 'Prerequisite: Note Names on the Low E & A Strings', he: 'תנאי מוקדם: שמות התווים על מיתרי המי הנמוך והלה' },
    {
      en:
        'Everything from here on means "slide to fret X" — so knowing what note actually lives at fret X, on the ' +
        '2 strings this whole system anchors to, is the one real prerequisite. The musical alphabet (A-G) repeats, and ' +
        'is entirely half-steps (1 fret) apart EXCEPT two places where it\'s already right next to each other with ' +
        'no sharp/flat between: B→C and E→F (there\'s no "B#" or "E#" in normal use — they ARE C and F). Play up ' +
        'the string below and say each name out loud as you go; that\'s the whole exercise.',
      he:
        'מכאן והלאה הכל אומר "החליקו לשריג X" — אז לדעת איזה תו באמת נמצא בשריג X, על 2 המיתרים שכל השיטה הזו ' +
        'מעוגנת אליהם, זה התנאי המוקדם היחיד באמת. האלף-בית המוזיקלי (A-G) חוזר על עצמו, וכולו במרחק חצי-טון ' +
        '(שריג אחד) אחד מהשני, חוץ משני מקומות שכבר צמודים זה לזה בלי דיאז/במול ביניהם: B→C ו-E→F (אין "B#" או ' +
        '"E#" בשימוש רגיל — הם פשוט C ו-F). נגנו במעלה המיתר למטה ואמרו כל שם בקול תוך כדי; זה כל התרגיל.',
    },
    { kind: 'demo', demo: { type: 'noteNames' } }
  ),
  lesson(
    'cbe-major-minor-formula',
    CHORDS_BY_EAR_STAGES.FRETBOARD_MAP,
    { en: 'Prerequisite: The Major/Minor Formula', he: 'תנאי מוקדם: נוסחת המז\'ור/מינור' },
    {
      en:
        'The last piece before the roadmap itself: every major key\'s 7 diatonic chords follow the exact same ' +
        'quality pattern, always — 1(Major) 2(minor) 3(minor) 4(Major) 5(Major) 6(minor) 7(Diminished). This is ' +
        'WHY the 6-chord road map\'s shapes are what they are (3 major, 3 minor, off exactly those degrees) — see ' +
        'the Harmony course\'s own "Diatonic Triads" lesson for the full derivation (stacking 3rds on the scale) ' +
        'if you want the theory underneath this pattern, not just the pattern itself.',
      he:
        'החלק האחרון לפני המפה עצמה: 7 האקורדים הדיאטוניים של כל סולם מז\'ורי עוקבים אחרי אותה תבנית איכות בדיוק, ' +
        'תמיד — 1(מז\'ור) 2(מינור) 3(מינור) 4(מז\'ור) 5(מז\'ור) 6(מינור) 7(דימיניושד). זו הסיבה שהצורות של מפת ' +
        '6 האקורדים הן מה שהן (3 מז\'ור, 3 מינור, בדיוק בדרגות האלה) — ראו את שיעור "טריאדות דיאטוניות" של קורס ' +
        'ההרמוניה עצמו לגזירה המלאה (הנחת שלישיות על הסולם) אם אתם רוצים את התיאוריה שמתחת לתבנית הזו, לא רק ' +
        'את התבנית עצמה.',
    },
    { kind: 'overview' }
  ),
  lesson(
    'cbe-movable-scale-shape',
    CHORDS_BY_EAR_STAGES.FRETBOARD_MAP,
    { en: 'The Movable Major Scale Shape', he: 'צורת סולם המז\'ור הנעה' },
    {
      en:
        'The exact same major-scale shape works in every key — only WHERE it sits on the neck changes, anchored by ' +
        'its root landing on either the low E string or the A string. This is "Step 1" made physical: once you\'ve ' +
        'heard which key a song is in (see the Function stage above), THIS is the shape you slide to that root and ' +
        'play through to confirm it, and the same shape every solo/scale idea over that key starts from. Try both ' +
        'anchors below on a few different roots — notice it\'s genuinely the same hand shape every time, just moved. ' +
        'A 3rd option (top 3 strings) is offered too — not another anchor for finding the key, but a compact ' +
        'lead/solo box for once the key is already known.',
      he:
        'אותה צורת סולם מז\'ור בדיוק עובדת בכל סולם — רק איפה היא יושבת על הצוואר משתנה, מעוגנת לפי איפה השורש שלה ' +
        'נופל, על מיתר המי הנמוך או על מיתר הלה. זהו "צעד 1" הופך לפיזי: ברגע ששמעתם באיזה סולם שיר נמצא (ראו את ' +
        'שלב הפונקציה למעלה), זו הצורה שאתם מחליקים לשורש הזה ומנגנים דרכה כדי לאשר אותו, ואותה הצורה בדיוק שכל ' +
        'רעיון סולו/סולם מעל הסולם הזה מתחיל ממנה. נסו את שני העיגונים למטה על כמה שורשים שונים — שימו לב שזו ' +
        'ממש אותה צורת יד בכל פעם, רק מוזזת. אופציה שלישית (3 המיתרים העליונים) מוצגת גם היא — זו לא עוד עוגן ' +
        'למציאת הסולם, אלא קופסת סולו/ליד קומפקטית לשימוש ברגע שהסולם כבר ידוע.',
    },
    { kind: 'demo', demo: { type: 'scaleShape' } }
  ),
  lesson(
    'cbe-chord-roadmap',
    CHORDS_BY_EAR_STAGES.FRETBOARD_MAP,
    { en: 'The 6-Chord Road Map', he: 'מפת 6 האקורדים' },
    {
      en:
        'Once you know the key, "Step 2" is knowing exactly where its 6 most useful chords (I, ii, iii, IV, V, vi) ' +
        'physically live on the neck — without hunting. The trick: I, ii, iii all anchor off the low E string (root, ' +
        'root+2 frets, root+4 frets), and IV, V, vi anchor off the A string at those SAME 3 fret offsets — real ' +
        'guitar geometry, not a coincidence (the A string sits a 4th above the low E, exactly the same distance IV ' +
        'sits above I). Click through all 6 below to build the map in your hand.',
      he:
        'ברגע שאתם יודעים את הסולם, "צעד 2" הוא לדעת בדיוק איפה 6 האקורדים השימושיים ביותר שלו (I, ii, iii, IV, V, ' +
        'vi) יושבים פיזית על הצוואר — בלי לחפש. הטריק: I, ii, iii כולם מעוגנים ממיתר המי הנמוך (שורש, שורש+2 ' +
        'שריגים, שורש+4 שריגים), ו-IV, V, vi מעוגנים ממיתר הלה באותם 3 היסטים של שריגים בדיוק — גאומטריית גיטרה ' +
        'אמיתית, לא צירוף מקרים (מיתר הלה יושב רביעית מעל מיתר המי הנמוך, בדיוק אותו מרחק ש-IV יושב מעל I). לחצו ' +
        'על כל 6 למטה כדי לבנות את המפה ביד שלכם.',
    },
    { kind: 'demo', demo: { type: 'chordRoadMap' } }
  ),
  lesson(
    'cbe-quiz-find-key',
    CHORDS_BY_EAR_STAGES.FRETBOARD_MAP,
    { en: 'Practice: Find the Key on the Neck', he: 'תרגול: מצאו את הסולם על הצוואר' },
    {
      en:
        'A clear I-IV-V-I cadence plays in a random key — slide the candidate root along the low E string (each tap ' +
        'previews that root\'s movable scale shape live) and submit your guess. Afterward, confirm the real answer ' +
        'by actually playing that root note on your own guitar into the mic — closing the loop from "I think I hear ' +
        'it" to "I can find it and play it," the whole point of this course.',
      he:
        'רצף קדנציה ברור של I-IV-V-I מתנגן בסולם אקראי — הזיזו את השורש המועמד לאורך מיתר המי הנמוך (כל הקשה ' +
        'מציגה בזמן אמת את צורת הסולם הנעה של השורש הזה) והגישו את הניחוש שלכם. לאחר מכן, אשרו את התשובה האמיתית ' +
        'על ידי ניגון בפועל של תו השורש הזה על הגיטרה שלכם לתוך המיקרופון — סוגר את המעגל מ"אני חושב ששמעתי את ' +
        'זה" ל"אני יכול למצוא את זה ולנגן את זה", כל הרעיון של הקורס הזה.',
    },
    { kind: 'quiz', quizType: 'findKey' }
  ),
  lesson(
    'cbe-3-step-summary',
    CHORDS_BY_EAR_STAGES.FRETBOARD_MAP,
    { en: '3-Step System Summary', he: 'סיכום שיטת 3 הצעדים' },
    {
      en:
        'Everything above in one place:\n' +
        'Step 1 — Identify the Key. Listen for "home," slide the movable major-scale shape to that root on the low ' +
        'E or A string, play through it to confirm.\n' +
        'Step 2 — Apply the Road Map. From that same root, the 6-chord map (I-ii-iii off the low E, IV-V-vi off ' +
        'the A) tells you exactly where every likely chord physically sits — no more hunting the whole neck.\n' +
        'Step 3 — Listen & Locate. Play the song\'s actual progression against those 6 candidates and pick the ' +
        'ones that match, building the real chord sequence one section at a time.\n' +
        'The Changes/Patterns/Strategy stages ahead sharpen each of these further — timing, common shapes, and the ' +
        'full listening process — before the Real-Song Practice lesson puts all of it together on an actual song.',
      he:
        'הכל למעלה במקום אחד:\n' +
        'צעד 1 — זיהוי הסולם. הקשיבו ל"בית", הזיזו את צורת סולם המז\'ור הנעה לשורש הזה על מיתר המי הנמוך או הלה, ' +
        'נגנו דרכה כדי לאשר.\n' +
        'צעד 2 — יישום המפה. מאותו שורש, מפת 6 האקורדים (I-ii-iii ממיתר המי הנמוך, IV-V-vi ממיתר הלה) אומרת ' +
        'לכם בדיוק איפה כל אקורד סביר יושב פיזית — בלי עוד חיפוש בכל הצוואר.\n' +
        'צעד 3 — הקשבה ואיתור. נגנו את הרצף האמיתי של השיר מול 6 המועמדים האלה ובחרו את אלה שמתאימים, ובנו את ' +
        'רצף האקורדים האמיתי קטע אחר קטע.\n' +
        'שלבי המעברים/הרצפים/האסטרטגיה שלפניכם מחדדים כל אחד מאלה עוד יותר — תזמון, צורות נפוצות, ותהליך ההקשבה ' +
        'המלא — לפני ששיעור התרגול על שיר אמיתי מרכיב את כל זה יחד על שיר בפועל.',
    },
    { kind: 'overview' }
  ),

  // ---------------- CHANGES ----------------
  lesson(
    'cbe-changes',
    CHORDS_BY_EAR_STAGES.CHANGES,
    { en: 'Catching the Change: Listening in Time', he: 'תפיסת המעבר: הקשבה בזמן' },
    {
      en:
        'Identifying a chord in isolation isn\'t enough to jam — you need to catch the exact MOMENT it changes to ' +
        'the next one, while the song keeps moving. The good news: real songs are almost always predictable about ' +
        'this. Chords overwhelmingly change on strong beats, and hold for a whole bar (4 beats) far more often than ' +
        'any other length. Tap your foot on the beat and count "1-2-3-4" in your head as you listen — that habit, ' +
        'more than anything else, is what lets you anticipate a change instead of being surprised by it.',
      he:
        'זיהוי אקורד בבידוד לא מספיק כדי לג\'אם — אתם צריכים לתפוס את הרגע המדויק שבו הוא עובר לבא אחריו, בזמן ' +
        'שהשיר ממשיך לזוז. החדשות הטובות: שירים אמיתיים כמעט תמיד צפויים בעניין הזה. אקורדים משתנים ברוב המכריע ' +
        'של המקרים על פעימות חזקות, ומחזיקים במשך שריג שלם (4 פעימות) הרבה יותר מכל אורך אחר. הקישו ברגל על ' +
        'הפעימה וספרו "1-2-3-4" בראש שלכם תוך כדי הקשבה — ההרגל הזה, יותר מכל דבר אחר, הוא מה שנותן לכם לצפות ' +
        'מעבר במקום להיות מופתעים ממנו.',
    },
    { kind: 'overview' }
  ),
  lesson(
    'cbe-quiz-change',
    CHORDS_BY_EAR_STAGES.CHANGES,
    { en: 'Practice: Count the Beats', he: 'תרגול: ספרו את הפעימות' },
    {
      en:
        'A chord loop plays, holding on one chord for a while and then switching to another — count along and say ' +
        'how many beats passed before the change. This builds the exact "internal metronome + listening" combo real ' +
        'playing-along requires, independent of which chords are actually used.',
      he:
        'לולאת אקורדים מתנגנת, מחזיקה על אקורד אחד לזמן מה ואז עוברת לאחר — ספרו יחד ואמרו כמה פעימות עברו לפני ' +
        'המעבר. זה בונה את הקומבינציה המדויקת של "מטרונום פנימי + הקשבה" שנגינה-יחד אמיתית דורשת, בלתי תלוי באילו ' +
        'אקורדים בפועל בשימוש.',
    },
    { kind: 'quiz', quizType: 'change' }
  ),

  // ---------------- PATTERNS ----------------
  lesson(
    'cbe-patterns-intro',
    CHORDS_BY_EAR_STAGES.PATTERNS,
    { en: 'You Already Know More Songs Than You Think', he: 'אתם כבר מכירים יותר שירים ממה שאתם חושבים' },
    {
      en:
        'A remarkably small handful of progressions accounts for a huge share of popular music — the same I-V-vi-IV ' +
        'shape (sometimes called "the 4 chords" or "the Axis progression") underlies hundreds of well-known hit ' +
        'songs across completely different genres and decades. Once your ear knows a handful of these SHAPES, you ' +
        'stop guessing chord-by-chord and start recognizing "oh, this is that one" within the first few seconds of ' +
        'a song — the single biggest speed-up in this entire skill.',
      he:
        'קומץ קטן להפליא של רצפי אקורדים מהווה נתח עצום מהמוזיקה הפופולרית — אותה צורת I-V-vi-IV (המכונה לעיתים ' +
        '"4 האקורדים" או "רצף ה-Axis") עומדת בבסיס מאות שירי להיט מוכרים בז\'אנרים ועשורים שונים לחלוטין. ברגע ' +
        'שהאוזן שלכם מכירה קומץ מהצורות האלה, אתם מפסיקים לנחש אקורד-אקורד ומתחילים לזהות "אה, זה האחד ההוא" ' +
        'תוך הכמה שניות הראשונות של שיר — הקפיצה הגדולה ביותר במיומנות הזו כולה.',
    },
    { kind: 'overview' }
  ),
  lesson(
    'cbe-pattern-I-IV-V',
    CHORDS_BY_EAR_STAGES.PATTERNS,
    { en: 'Shape #1: I – IV – V', he: 'צורה #1: I – IV – V' },
    {
      en:
        'The backbone of blues, folk, and rock — 3 chords, and countless songs are built almost entirely from just ' +
        'these. Listen a few times, then try to hum along with which one is playing.',
      he:
        'עמוד השדרה של בלוז, פולק, ורוק — 3 אקורדים, ואינספור שירים בנויים כמעט כולם רק מאלה. הקשיבו כמה פעמים, ' +
        'ואז נסו לזמזם יחד עם מי מהם מתנגן.',
    },
    { kind: 'demo', demo: { type: 'progressionDemo', progressionId: 'I-IV-V' } }
  ),
  lesson(
    'cbe-pattern-axis',
    CHORDS_BY_EAR_STAGES.PATTERNS,
    { en: 'Shape #2: I – V – vi – IV ("the 4 chords")', he: 'צורה #2: I – V – vi – IV ("4 האקורדים")' },
    {
      en:
        'Probably the most-recycled 4-chord loop in modern pop — famous enough that comedy sketches have been built ' +
        'entirely around how many hit songs share it. Notice how it moves from bright (I) to strong pull (V) to a ' +
        'more emotional minor moment (vi) to a warm lift (IV), then repeats.',
      he:
        'ככל הנראה לולאת ה-4-האקורדים הכי ממוחזרת בפופ המודרני — מפורסמת מספיק שקטעי קומדיה נבנו כולם סביב כמה ' +
        'שירי להיט חולקים אותה. שימו לב איך היא זזה מבהיר (I) למשיכה חזקה (V) לרגע מינורי רגשי יותר (vi) להרמה ' +
        'חמימה (IV), ואז חוזרת חלילה.',
    },
    { kind: 'demo', demo: { type: 'progressionDemo', progressionId: 'I-V-vi-IV' } }
  ),
  lesson(
    'cbe-pattern-50s',
    CHORDS_BY_EAR_STAGES.PATTERNS,
    { en: 'Shape #3: I – vi – IV – V (the \'50s progression)', he: 'צורה #3: I – vi – IV – V (רצף שנות ה-50)' },
    {
      en:
        'The doo-wop/\'50s ballad staple — same 4 chords as the Axis progression above, just reordered, which is a ' +
        'great lesson on its own: the exact same 4-chord vocabulary can sound completely different depending on ' +
        'which order and which chord starts the loop.',
      he:
        'המנה העיקרית של בלדות דו-ווופ/שנות ה-50 — אותם 4 אקורדים כמו רצף ה-Axis למעלה, רק בסדר שונה, וזה שיעור ' +
        'נהדר בפני עצמו: אותו אוצר מילים של 4 אקורדים בדיוק יכול להישמע שונה לגמרי בהתאם לסדר ולאיזה אקורד פותח ' +
        'את הלולאה.',
    },
    { kind: 'demo', demo: { type: 'progressionDemo', progressionId: 'I-vi-IV-V' } }
  ),
  lesson(
    'cbe-pattern-ii-V-I',
    CHORDS_BY_EAR_STAGES.PATTERNS,
    { en: 'Shape #4: ii – V – I (jazz)', he: 'צורה #4: ii – V – I (ג\'אז)' },
    {
      en:
        'Less common in pop/rock, but the single most important shape in jazz — and once you can hear it, you\'ll ' +
        'start noticing it borrowed into pop and R&B bridges too. The bass line steps down a 5th twice in a row, ' +
        'the strongest root motion in tonal music (see the Harmony course\'s own ii-V-I lesson for the theory behind ' +
        'why).',
      he:
        'פחות נפוץ בפופ/רוק, אבל הצורה החשובה ביותר בג\'אז — וברגע שתוכלו לשמוע אותה, תתחילו לשים לב שהיא מושאלת ' +
        'גם לגשרים בפופ ו-R&B. קו הבס צועד חמישית כלפי מטה פעמיים ברציפות, תנועת השורש החזקה ביותר במוזיקה טונלית ' +
        '(ראו את שיעור ה-ii-V-I של קורס ההרמוניה עצמו לתיאוריה שמאחורי הסיבה).',
    },
    { kind: 'demo', demo: { type: 'progressionDemo', progressionId: 'ii-V-I' } }
  ),
  lesson(
    'cbe-pattern-12-bar-blues',
    CHORDS_BY_EAR_STAGES.PATTERNS,
    { en: 'Shape #5: The 12-Bar Blues', he: 'צורה #5: בלוז 12 השריגים' },
    {
      en:
        'The single most-named form in guitar teaching, full stop — every blues, rock, and country method book ' +
        'covers it by this exact name. Same I-IV-V vocabulary as Shape #1, but stretched into a specific, ' +
        'predictable 12-bar timing: 4 bars of I, 2 of IV, 2 back on I, then a V-IV-I-V "turnaround." Once this ' +
        'exact shape is in your ear, you can jam a blues in ANY key the moment someone calls it, no chart needed.',
      he:
        'הצורה הכי בעלת-שם בהוראת גיטרה, נקודה — כל ספר שיטה לבלוז, רוק, וקאנטרי מכסה אותה בשם המדויק הזה. אותו ' +
        'אוצר מילים של I-IV-V כמו צורה #1, אבל נמתח לתזמון ספציפי וצפוי של 12 שריגים: 4 שריגי I, 2 של IV, 2 חזרה ' +
        'ל-I, ואז "טרנראונד" של V-IV-I-V. ברגע שהצורה המדויקת הזו נמצאת באוזן שלכם, תוכלו לג\'אם בלוז בכל סולם ' +
        'ברגע שמישהו קורא לו, בלי צורך בתו.',
    },
    { kind: 'demo', demo: { type: 'progressionDemo', progressionId: '12-bar-blues' } }
  ),
  lesson(
    'cbe-pattern-turnaround',
    CHORDS_BY_EAR_STAGES.PATTERNS,
    { en: 'Shape #6: I – vi – ii – V (the classic turnaround)', he: 'צורה #6: I – vi – ii – V (הטוויסט הקלאסי)' },
    {
      en:
        'The doo-wop and early-jazz "turnaround" — walks all the way around the 3 functional families (tonic, ' +
        'tonic-substitute, subdominant, dominant) before landing back home, which is why it shows up so often as a ' +
        'song\'s very last 4 bars, setting up a repeat. Close cousin of Shape #4\'s ii-V-I, just with an extra ' +
        '"delay home" step (vi) added before it.',
      he:
        'ה"טוויסט" של דו-ווופ וג\'אז מוקדם — הולך כל הדרך סביב 3 המשפחות ההרמוניות (טוניקה, תחליף-טוניקה, ' +
        'סאב-דומיננטה, דומיננטה) לפני שהוא נוחת בחזרה בבית, וזו הסיבה שהוא מופיע כל כך הרבה כ-4 השריגים האחרונים ' +
        'של שיר, שמכינים לחזרה. בן דוד קרוב לצורה #4 (ii-V-I), רק עם צעד "דחיית הבית" נוסף (vi) שנוסף לפניה.',
    },
    { kind: 'demo', demo: { type: 'progressionDemo', progressionId: 'I-vi-ii-V' } }
  ),
  lesson(
    'cbe-pattern-minor-blues',
    CHORDS_BY_EAR_STAGES.PATTERNS,
    { en: 'Shape #7: Minor Blues (i – iv – V)', he: 'צורה #7: בלוז מינורי (i – iv – V)' },
    {
      en:
        'Same 12-bar timing as Shape #5, built in minor instead — a darker, more brooding blues color (think ' +
        '"House of the Rising Sun" or "Since I\'ve Been Loving You"). Notice V still comes out MAJOR here even ' +
        'though the key is minor — that\'s the same harmonic-minor raised-7th trick the Harmony course\'s own ' +
        'minor-key lesson covers, giving the progression a real, strongly-pulling dominant instead of a weaker ' +
        'minor v.',
      he:
        'אותו תזמון של 12 שריגים כמו צורה #5, בנוי במינור במקום — צבע בלוז כהה ומהורהר יותר (חשבו על "House of ' +
        'the Rising Sun" או "Since I\'ve Been Loving You"). שימו לב ש-V עדיין יוצא מז\'ורי כאן למרות שהסולם מינורי ' +
        '— זהו אותו טריק של הדרגה השביעית המוגבהת של המינור ההרמוני ששיעור הסולם המינורי של קורס ההרמוניה עצמו ' +
        'מכסה, ונותן לרצף דומיננטה אמיתית ומושכת חזק במקום v מינורי חלש יותר.',
    },
    { kind: 'demo', demo: { type: 'progressionDemo', progressionId: 'minor-blues' } }
  ),
  lesson(
    'cbe-quiz-pattern',
    CHORDS_BY_EAR_STAGES.PATTERNS,
    { en: 'Practice: Name That Progression', he: 'תרגול: זהו את הרצף' },
    {
      en:
        'A full progression plays, transposed to a random key every time (so you can never just memorize "it\'s ' +
        'always in C") — pick which of the common shapes you just heard. This is the drill that most directly ' +
        'trains "recognize a song\'s changes within the first few seconds."',
      he:
        'רצף שלם מתנגן, מוסבר לסולם אקראי בכל פעם (כך שלעולם אי אפשר פשוט לשנן "זה תמיד בדו") — בחרו איזו מהצורות ' +
        'הנפוצות שזה עתה שמעתם. זה התרגיל שמאמן בצורה הכי ישירה "לזהות את המעברים של שיר תוך הכמה שניות הראשונות".',
    },
    { kind: 'quiz', quizType: 'pattern' }
  ),
  lesson(
    'cbe-quiz-sequence',
    CHORDS_BY_EAR_STAGES.PATTERNS,
    { en: 'Practice: Transcribe the Progression', he: 'תרגול: תמלול הרצף' },
    {
      en:
        'The real test: a genuinely random chord sequence plays (not one of the named shapes above) — write down ' +
        'every chord in it, in order. Choose a level: Beginner is 2 chords, major/minor only, answered as ' +
        'multiple-choice per chord (like an American test — one right answer among a few). Intermediate and ' +
        'Advanced add more chords and more colors (7ths, diminished), still multiple-choice. Expert goes to 6 ' +
        'chords with the full quality set and drops the choices entirely — type the whole sequence yourself ' +
        '(e.g. "C Am F G7"), the same way you\'d type it into Compose. Each chord is graded on its own, so you\'ll ' +
        'see exactly which ones you got and which you missed.',
      he:
        'המבחן האמיתי: רצף אקורדים אקראי באמת מתנגן (לא אחת מהצורות בעלות השם למעלה) — רשמו כל אקורד ברצף, ' +
        'לפי הסדר. בחרו רמה: מתחילים הם 2 אקורדים, מז\'ור/מינור בלבד, נענים בבחירה מרובה לכל אקורד (כמו מבחן ' +
        'אמריקאי — תשובה נכונה אחת מתוך כמה). בינוני ומתקדם מוסיפים יותר אקורדים ויותר צבעים (7, דימיניושד), ' +
        'עדיין בבחירה מרובה. מומחה עולה ל-6 אקורדים עם מלוא מגוון האיכויות ומוותר על אפשרויות הבחירה לגמרי — ' +
        'הקלידו את כל הרצף בעצמכם (למשל "C Am F G7"), באותו אופן שהייתם מקלידים אותו ל-Compose. כל אקורד מדורג ' +
        'בנפרד, כך שתראו בדיוק באילו צדקתם ובאילו טעיתם.',
    },
    { kind: 'quiz', quizType: 'sequence' }
  ),

  // ---------------- STRATEGY ----------------
  lesson(
    'cbe-non-diatonic',
    CHORDS_BY_EAR_STAGES.STRATEGY,
    { en: 'When a Chord Doesn\'t Fit What You Expect', he: 'כשאקורד לא מתאים למה שציפיתם' },
    {
      en:
        'Real songs sometimes use a chord OUTSIDE the key\'s 7 diatonic chords (on guitar, that means a chord off ' +
        'your 6-chord road map) — a secondary dominant borrowing another key\'s V for a moment, or a chord borrowed ' +
        'from the parallel minor (see the Harmony course\'s own Secondary Dominants and Modal Interchange lessons ' +
        'for the theory). That does NOT mean you found the wrong key — it means the songwriter reached outside it ' +
        'briefly, on purpose, for color. If 5 of 6 chords match what you expect and one clearly doesn\'t, trust the ' +
        '5 and treat the odd one as a deliberate exception, not a sign to start over.',
      he:
        'שירים אמיתיים לפעמים משתמשים באקורד מחוץ ל-7 האקורדים הדיאטוניים של הסולם (בגיטרה, זה אומר אקורד מחוץ ' +
        'למפת 6 האקורדים שלכם) — דומיננטה משנית ששואלת את ה-V של סולם אחר לרגע, או אקורד שאול מהמינור המקביל ' +
        '(ראו את שיעורי הדומיננטות המשניות וההשאלה המודאלית של קורס ההרמוניה עצמו לתיאוריה). זה לא אומר שמצאתם ' +
        'את הסולם הלא נכון — זה אומר שכותב השיר הגיע החוצה ממנו לרגע, בכוונה, לצבע. אם 5 מתוך 6 אקורדים מתאימים ' +
        'למה שציפיתם ואחד בבירור לא, סמכו על ה-5 והתייחסו לאחד המוזר כחריגה מכוונת, לא כסימן להתחיל מחדש.',
    },
    { kind: 'overview' }
  ),
  lesson(
    'cbe-multi-section',
    CHORDS_BY_EAR_STAGES.STRATEGY,
    { en: 'Songs With More Than One Progression', he: 'שירים עם יותר מרצף אקורדים אחד' },
    {
      en:
        'Verse, chorus, and bridge don\'t have to share the same chords — many songs run a different progression ' +
        'per section (sometimes even a different key). That\'s not a failure of the process, it just means running ' +
        'it again per section: find THAT section\'s home, work out its expected chords from there (on guitar, apply ' +
        'the road map), listen and locate its own chords. A song with 2-3 progressions is really just 2-3 short ' +
        'songs stitched together, each one small enough for everything you\'ve already practiced.',
      he:
        'בית, פזמון, וגשר לא חייבים לחלוק את אותם אקורדים — הרבה שירים מריצים רצף שונה לכל קטע (לפעמים אפילו ' +
        'סולם שונה). זו לא כשל בתהליך, זה פשוט אומר להריץ אותו שוב לכל קטע: מצאו את הבית של הקטע ההוא, גזרו ממנו ' +
        'את האקורדים הצפויים (בגיטרה, יישמו את המפה), הקשיבו ואתרו את האקורדים שלו. שיר עם 2-3 רצפים הוא באמת פשוט ' +
        '2-3 שירים קצרים שתפורים יחד, כל אחד קטן מספיק לכל מה שכבר תרגלתם.',
    },
    { kind: 'overview' }
  ),
  lesson(
    'cbe-strategy',
    CHORDS_BY_EAR_STAGES.STRATEGY,
    { en: 'Your Step-by-Step Listening Process', he: 'תהליך ההקשבה שלכם, צעד אחר צעד' },
    {
      en:
        'Here\'s the actual routine to run in your head the next time an unfamiliar song comes on and you want to ' +
        'play along:\n' +
        '1. Find the beat. Tap your foot, count "1-2-3-4," find where the bars start.\n' +
        '2. Find "home." Listen for the chord that feels most resolved — often the very first or last chord of a ' +
        'section.\n' +
        '3. Check its color. Is home major or minor? That tells you the whole key\'s flavor.\n' +
        '4. Count how many DIFFERENT chords you actually hear across a verse or chorus — most songs use only 3-4.\n' +
        '5. Try the common shapes first. I-IV-V? I-V-vi-IV? I-vi-IV-V? Test the ones you\'ve trained against what ' +
        'you\'re hearing before assuming something exotic.\n' +
        '6. Play along and adjust by ear. Your first guess doesn\'t have to be perfect — correcting a chord after ' +
        'a few seconds of "that\'s not quite it" IS the skill, not a failure of it.\n' +
        '7. Good enough beats perfect. The goal is a confident, in-time jam with other people, not a transcription-\n' +
        'accurate chart.',
      he:
        'הנה השגרה בפועל להריץ בראש שלכם בפעם הבאה ששיר לא מוכר מתנגן ואתם רוצים להצטרף:\n' +
        '1. מצאו את הפעימה. הקישו ברגל, ספרו "1-2-3-4", מצאו איפה מתחילים השריגים.\n' +
        '2. מצאו את ה"בית". הקשיבו לאקורד שמרגיש הכי פתור — לעיתים קרובות האקורד הראשון ממש או האחרון של קטע.\n' +
        '3. בדקו את הצבע שלו. האם הבית מז\'ור או מינור? זה אומר לכם את הטעם של הסולם כולו.\n' +
        '4. ספרו כמה אקורדים שונים בפועל אתם שומעים לאורך בית או פזמון — רוב השירים משתמשים רק ב-3-4.\n' +
        '5. נסו קודם את הצורות הנפוצות. I-IV-V? I-V-vi-IV? I-vi-IV-V? בדקו את אלה שאימנתם מול מה שאתם שומעים ' +
        'לפני שאתם מניחים משהו אקזוטי.\n' +
        '6. נגנו יחד ותקנו לפי שמיעה. הניחוש הראשון שלכם לא חייב להיות מושלם — לתקן אקורד אחרי כמה שניות של "זה ' +
        'לא בדיוק זה" זו המיומנות עצמה, לא כישלון שלה.\n' +
        '7. מספיק טוב מנצח מושלם. המטרה היא ג\'אם בביטחון ובקצב עם אנשים אחרים, לא תיוו מדויק כמו תמלול.',
    },
    { kind: 'overview' }
  ),
  lesson(
    'cbe-quiz-mixed',
    CHORDS_BY_EAR_STAGES.STRATEGY,
    { en: 'Practice: Mixed Review', he: 'תרגול: חזרה מעורבת' },
    {
      en:
        'A real song never announces "this next bit tests your quality-hearing" — it just plays. This final drill ' +
        'mixes every skill from this course into one session, a random question type each round (quality, ' +
        'function, progressions, changes, bass motion), the same "cumulative review before the real thing" any ' +
        'structured method book ends its lesson section with. Comfortable here means you\'re ready for a real song.',
      he:
        'שיר אמיתי אף פעם לא מכריז "הקטע הבא בודק את שמיעת הצבע שלכם" — הוא פשוט מתנגן. התרגיל הסופי הזה מערבב ' +
        'כל מיומנות מהקורס הזה למפגש אחד, סוג שאלה אקראי בכל סיבוב (צבע, פונקציה, רצפים, מעברים, תנועת בס) — אותה ' +
        '"חזרה מצטברת לפני הדבר האמיתי" שכל ספר שיטה מובנה מסיים איתה את חלק השיעורים שלו. נוחות כאן אומרת שאתם ' +
        'מוכנים לשיר אמיתי.',
    },
    { kind: 'quiz', quizType: 'mixed' }
  ),

  // ---------------- PRACTICE (real songs) ----------------
  lesson(
    'cbe-real-song-practice',
    CHORDS_BY_EAR_STAGES.PRACTICE,
    { en: 'Real-Song Practice', he: 'תרגול על שיר אמיתי' },
    {
      en:
        'Time to apply everything on an actual song. Paste a YouTube link below and run through the process from ' +
        'the previous lesson: find the beat, find home, check its color, count the chords, guess a common shape, ' +
        'and mark down what you land on as you go. Turn on Listen for a live, chroma-based "here\'s what this app ' +
        'currently hears" suggestion — treat it as a second opinion to check your own ear against, not an answer key.',
      he:
        'הגיע הזמן ליישם הכל על שיר אמיתי. הדביקו קישור יוטיוב למטה ועברו את התהליך מהשיעור הקודם: מצאו את ' +
        'הפעימה, מצאו את הבית, בדקו את הצבע שלו, ספרו את האקורדים, נחשו צורה נפוצה, וסמנו את מה שאתם מגיעים אליו ' +
        'תוך כדי. הפעילו "האזנה" לקבלת הצעה חיה, מבוססת-כרומה, על "מה האפליקציה שומעת כרגע" — התייחסו אליה כדעה ' +
        'שנייה לבדוק מולה את האוזן שלכם, לא כתשובון.',
    },
    { kind: 'practice' }
  ),
];

// Same "one function turns (currently previewed chord) into Fretboard
// props" role as harmonyCurriculum.js's resolveHarmonyStageProps — every
// demo widget and drill in this course, and the real-song practice lesson's
// active timeline chord, all reduce to one previewed chord text by the time
// they reach here (see useChordsByEarLesson.js). `scaleContext`/
// `explicitPosition` (both from the same hook) are checked first — the
// movable-scale-shape lesson shows a scaleNotes overlay, and the
// chord-road-map lesson needs a SPECIFIC string-anchored position
// (chordsByEar.js's anchoredPosition), neither of which is "whichever
// voicing computeChordPositions happens to return first" the way plain
// previewChordText's generic tonicPositions lookup resolves. Only one of
// the three is ever set at a time (each demo widget owns exactly one), so
// the check order below doesn't matter functionally — it's just the
// fallback chain down to the plain chord-text case every other lesson uses.
export function resolveChordsByEarStageProps(previewChordText, tonicPositions, scaleContext, explicitPosition) {
  if (scaleContext) {
    // The "note names" prerequisite lesson needs every chromatic note
    // (not just the 7 in some key) on ONE specific string — reuses the
    // same computeScaleNotes engine with all 12 semitones as its own
    // "scale" and absolute note names (KEY_NAMES) as the labels (root
    // fixed at pitch class 0/C, so degreeLabels line up 1:1 with absolute
    // pitch class), then filters down to just the requested string(s).
    if (scaleContext.chromatic) {
      const notes = computeScaleNotes({
        rootPitchClass: 0,
        intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        degreeLabels: KEY_NAMES,
        fretStart: scaleContext.fretStart,
        fretEnd: scaleContext.fretEnd,
      }).filter((n) => !scaleContext.stringIndexes || scaleContext.stringIndexes.includes(n.string));
      return { position: null, scaleNotes: notes, labelMode: 'note' };
    }
    const family = SCALE_FAMILIES.major;
    return {
      position: null,
      scaleNotes: computeScaleNotes({
        rootPitchClass: scaleContext.rootPitchClass,
        intervals: family.intervals,
        degreeLabels: family.degreeLabels,
        fretStart: scaleContext.fretStart,
        fretEnd: scaleContext.fretEnd,
      }).filter((n) => !scaleContext.stringIndexes || scaleContext.stringIndexes.includes(n.string)),
      // Degree numbers (1-7) by default, not note letters — this is the
      // whole point of a "movable" shape and matches this course's own
      // Nashville-number-system framing: the same shape/numbers work in
      // any key, only the letter names change. scaleContext.labelMode lets
      // the demo widget itself offer a Note-Names toggle (same pattern
      // ScalesView's own Degrees/Note Names control already uses).
      labelMode: scaleContext.labelMode ?? 'degree',
    };
  }
  if (explicitPosition) return { position: explicitPosition, labelMode: 'note' };
  if (!previewChordText) return { position: null };
  return { position: tonicPositions?.[0] ?? null, labelMode: 'note' };
}
