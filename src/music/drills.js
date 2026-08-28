// Curated practice-exercise library, in the same spirit as licks.js (hand-
// authored data + small pure helpers, not derived). Each sequence step uses
// the same 0-5 low-to-high string convention as STANDARD_TUNING/position.strings
// everywhere else in the app, so it plugs directly into Fretboard.jsx's
// existing fretX/stringY coordinate helpers.

export const DRILL_CATEGORIES = [
  { key: 'warmup', label: { en: 'Warm-ups', he: 'חימום' } },
  { key: 'speed', label: { en: 'Speed & Technique', he: 'אימון למהירות' } },
  { key: 'position_switch', label: { en: 'Position Switching', he: 'מעבר בין פוזיציות' } },
  { key: 'pro_drills', label: { en: 'Pedagogy / Pro Drills', he: 'תרגילי מקצוענים' } },
];

export const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

function step(string, fret, finger, noteName) {
  return { string, fret, finger, noteName };
}

export const DRILLS = [
  {
    id: 'spider-walk-1234',
    title: { en: 'The Spider Walk (1-2-3-4)', he: 'הליכת העכביש (1-2-3-4)' },
    category: 'warmup',
    source: 'Classic warm-up exercise',
    description: {
      en: 'One finger per fret, crawling up each string before moving to the next. Keep your thumb behind the neck and minimize finger movement.',
      he: 'אצבע אחת לכל שריג, זוחלים במעלה כל מיתר לפני המעבר לבא. השאירו את האגודל מאחורי הצוואר וצמצמו את תנועת האצבעות.',
    },
    difficulty: 'Beginner',
    bpmSuggested: 80,
    noteValue: 'quarter',
    sequence: [
      step(0, 1, 1, 'F'), step(0, 2, 2, 'F#'), step(0, 3, 3, 'G'), step(0, 4, 4, 'G#'),
      step(1, 1, 1, 'A#'), step(1, 2, 2, 'B'), step(1, 3, 3, 'C'), step(1, 4, 4, 'C#'),
      step(2, 1, 1, 'D#'), step(2, 2, 2, 'E'), step(2, 3, 3, 'F'), step(2, 4, 4, 'F#'),
    ],
  },
  {
    id: 'chromatic-string-skip',
    title: { en: 'Chromatic String-Skipping Basics', he: 'יסודות דילוג מיתרים כרומטי' },
    category: 'warmup',
    source: 'Classic warm-up exercise',
    description: {
      en: 'The same one-finger-per-fret idea, but skipping a string each time — builds picking-hand accuracy for jumps you can\'t just slide into.',
      he: 'אותו רעיון של אצבע אחת לכל שריג, אך תוך דילוג על מיתר בכל פעם — בונה דיוק ליד הפורטת עבור קפיצות שאי אפשר פשוט להחליק אליהן.',
    },
    difficulty: 'Beginner',
    bpmSuggested: 75,
    noteValue: 'quarter',
    sequence: [
      step(0, 1, 1, 'F'), step(2, 1, 1, 'D#'), step(4, 1, 1, 'C'), step(1, 2, 2, 'B'),
      step(3, 2, 2, 'A'), step(5, 2, 2, 'F#'), step(0, 3, 3, 'G'), step(2, 3, 3, 'F'),
    ],
  },
  {
    id: 'petrucci-legato-run',
    title: { en: '3-Note-Per-String Legato Run', he: 'ריצת לגאטו 3 תווים למיתר' },
    category: 'speed',
    source: "Inspired by John Petrucci's Rock Discipline mechanics",
    description: {
      en: 'Pick only the first note per string, hammer-on the rest — focus on even volume between picked and hammered notes.',
      he: 'פרטו רק את התו הראשון בכל מיתר, ובצעו האמר-און על השאר — התמקדו בעוצמה אחידה בין תווים מפורטים לתווי האמר-און.',
    },
    difficulty: 'Advanced',
    bpmSuggested: 100,
    noteValue: '16th',
    sequence: [
      step(0, 5, 1, 'A'), step(0, 7, 3, 'B'), step(0, 8, 4, 'C'),
      step(1, 5, 1, 'D'), step(1, 7, 3, 'E'), step(1, 8, 4, 'F'),
      step(2, 5, 1, 'G'), step(2, 7, 3, 'A'), step(2, 8, 4, 'A#'),
    ],
  },
  {
    id: 'stetina-economy-pentatonic',
    title: { en: 'Economy Picking Pentatonic Sequence', he: 'רצף פנטטוני בפריטה חסכונית' },
    category: 'speed',
    source: "Inspired by Troy Stetina's speed-building method",
    description: {
      en: 'Sweep the pick in one direction across the string change instead of alternating — minimizes wasted pick motion at speed.',
      he: 'החליקו את המפרט בכיוון אחד דרך מעבר המיתרים במקום פריטה מתחלפת — ממזער תנועת מפרט מיותרת במהירות.',
    },
    difficulty: 'Intermediate',
    bpmSuggested: 110,
    noteValue: '8th',
    sequence: [
      step(1, 5, 1, 'D'), step(1, 8, 4, 'F'), step(2, 5, 1, 'G'),
      step(2, 7, 3, 'A'), step(3, 5, 1, 'C'), step(3, 7, 3, 'D'),
      step(4, 5, 1, 'E'), step(4, 8, 4, 'G'),
    ],
  },
  {
    id: 'pentatonic-box-shift-5-8',
    title: { en: 'Pentatonic Box Shift (Position 5 → 8)', he: 'מעבר קופסה פנטטונית (פוזיציה 5 → 8)' },
    category: 'position_switch',
    source: 'Position-shifting drill',
    description: {
      en: 'Slide the same finger up the neck on one string to relocate the whole hand — keep the slide smooth and land in tune.',
      he: 'החליקו את אותה האצבע במעלה הצוואר על מיתר אחד כדי להעביר את כל היד — שמרו על החלקה חלקה ונחיתה מדויקת.',
    },
    difficulty: 'Intermediate',
    bpmSuggested: 90,
    noteValue: 'quarter',
    sequence: [
      step(2, 5, 1, 'G'), step(2, 7, 3, 'A'), step(2, 8, 1, 'A#'), step(2, 10, 3, 'C'),
      step(1, 8, 1, 'F'), step(1, 10, 3, 'G'),
    ],
  },
  {
    id: 'govan-string-tracking',
    title: { en: 'String Tracking Drill', he: 'תרגיל מעקב מיתרים' },
    category: 'pro_drills',
    source: "Inspired by Guthrie Govan's string-tracking exercises",
    description: {
      en: 'The same fret, alternating strings — trains your picking hand to track accurately across strings without looking.',
      he: 'אותו שריג, מיתרים מתחלפים — מאמן את יד הפריטה לעקוב בדיוק בין מיתרים בלי להסתכל.',
    },
    difficulty: 'Advanced',
    bpmSuggested: 95,
    noteValue: 'triplet',
    sequence: [
      step(0, 5, 1, 'A'), step(1, 5, 1, 'D'), step(2, 5, 1, 'G'),
      step(1, 5, 1, 'D'), step(0, 5, 1, 'A'), step(2, 5, 1, 'G'),
    ],
  },
  {
    id: 'vai-linear-cascade',
    title: { en: 'Linear Chromatic Cascade', he: 'מפל כרומטי ליניארי' },
    category: 'speed',
    source: "Inspired by Steve Vai's 10-Hour Guitar Workout",
    description: {
      en:
        "Vai's famous regimen builds raw alternate-picking speed with strict one-finger-per-fret chromatic runs straight " +
        'across the top strings, in position, at a fixed tempo — no shortcuts, just clean down-up picking.',
      he:
        'שגרת האימון המפורסמת של ואי בונה מהירות פריטה מתחלפת גולמית באמצעות ריצות כרומטיות קפדניות של אצבע אחת ' +
        'לכל שריג, לאורך המיתרים העליונים, בפוזיציה קבועה ובקצב קבוע — בלי קיצורי דרך, רק פריטה נקייה למטה-למעלה.',
    },
    difficulty: 'Advanced',
    bpmSuggested: 100,
    noteValue: '16th',
    sequence: [
      step(3, 8, 1, 'D#'), step(3, 9, 2, 'E'), step(3, 10, 3, 'F'), step(3, 11, 4, 'F#'),
      step(4, 8, 1, 'G'), step(4, 9, 2, 'G#'), step(4, 10, 3, 'A'), step(4, 11, 4, 'A#'),
      step(5, 8, 1, 'C'), step(5, 9, 2, 'C#'), step(5, 10, 3, 'D'), step(5, 11, 4, 'D#'),
    ],
  },
  {
    id: 'grady-pickslant-isolation',
    title: { en: 'Single-String Pickslant Isolation', he: 'בידוד זווית פריטה על מיתר בודד' },
    category: 'speed',
    source: "Inspired by Troy Grady's Cracking the Code pickslanting method",
    description: {
      en:
        "Two frets, one string, strict alternate picking — removes the fretting hand from the equation so all your " +
        "attention goes to a single, consistent picking motion, the foundation Grady's analysis identifies behind " +
        'high-speed alternate picking.',
      he:
        'שני שריגים, מיתר אחד, פריטה מתחלפת קפדנית — מסיר את יד ההצמדה מהמשוואה כך שכל תשומת הלב מופנית לתנועת ' +
        'פריטה יחידה ועקבית, היסוד שהניתוח של גריידי מזהה מאחורי פריטה מתחלפת במהירות גבוהה.',
    },
    difficulty: 'Intermediate',
    bpmSuggested: 100,
    noteValue: '16th',
    sequence: [
      step(3, 5, 1, 'C'), step(3, 7, 3, 'D'), step(3, 5, 1, 'C'), step(3, 7, 3, 'D'),
      step(3, 5, 1, 'C'), step(3, 7, 3, 'D'), step(3, 5, 1, 'C'), step(3, 7, 3, 'D'),
    ],
  },
  {
    id: 'beato-scale-in-thirds',
    title: { en: 'Major Scale in Thirds', he: 'סולם מז\'ורי בשלישיות' },
    category: 'pro_drills',
    source: "Inspired by Rick Beato's systematic interval-mapping method (Beato Book / Scale Matrix)",
    description: {
      en:
        "Play the major scale as ascending thirds instead of straight up the neck — the core idea behind Beato's " +
        'approach to ear training and fretboard fluency: hearing and seeing each scale tone as an interval relationship, ' +
        'not just a rote finger pattern.',
      he:
        'נגנו את הסולם המז\'ורי כשלישיות עולות במקום ישר במעלה הצוואר — הרעיון המרכזי מאחורי הגישה של ביאטו לאימון ' +
        'שמיעה ושליטה במסרגה: לשמוע ולראות כל תו בסולם כיחס אינטרוולי, לא רק כתבנית אצבעות שגרתית.',
    },
    difficulty: 'Intermediate',
    bpmSuggested: 80,
    noteValue: '8th',
    sequence: [
      step(1, 3, 1, 'C'), step(1, 7, 4, 'E'),
      step(1, 5, 2, 'D'), step(2, 3, 1, 'F'),
      step(1, 7, 4, 'E'), step(2, 5, 2, 'G'),
      step(2, 3, 1, 'F'), step(2, 7, 4, 'A'),
      step(2, 5, 2, 'G'), step(2, 9, 4, 'B'),
      step(2, 7, 3, 'A'), step(2, 10, 4, 'C'),
    ],
  },
  // Jeff Beck-inspired set — originally-authored sequences built around the
  // techniques he's known for (whammy bar, fingerstyle, harmonics, slide,
  // trills), not transcriptions of any specific recording or published tab.
  {
    id: 'beck-whammy-melody-sustain',
    title: { en: 'Whammy-Bar Melody Over Sustain', he: 'מנגינת ידית רעד מעל תו מתמשך' },
    category: 'pro_drills',
    source: "Inspired by Jeff Beck's whammy-bar melodic phrasing",
    description: {
      en: 'Play the phrase on open, resonant strings, then use the whammy bar (not the fretting hand) to bend each sustained note up and settle it back to pitch before it decays — control and sustain matter far more here than speed.',
      he: 'נגנו את הפרזה על מיתרים פתוחים ומהדהדים, ואז השתמשו בידית הרעד (לא ביד ההצמדה) כדי לכופף כל תו מתמשך כלפי מעלה ולהחזיר אותו לגובה הצליל לפני שהוא דועך — שליטה וסאסטיין חשובים כאן הרבה יותר ממהירות.',
    },
    difficulty: 'Advanced',
    bpmSuggested: 70,
    noteValue: 'quarter',
    sequence: [
      step(5, 0, 0, 'E'), step(4, 0, 0, 'B'), step(5, 3, 3, 'G'),
      step(4, 2, 2, 'C#'), step(3, 0, 0, 'G'), step(5, 0, 0, 'E'),
    ],
  },
  {
    id: 'beck-tremolo-rhythm-taps',
    title: { en: 'Floating-Tremolo Rhythm Taps', he: 'הקשות קצב על ידית רעד צפה' },
    category: 'pro_drills',
    source: "Inspired by Jeff Beck's floating-tremolo rhythmic technique",
    description: {
      en: 'Strike the chord tones once, then keep the notes ringing and tap a steady rhythm into a floating tremolo bar — small dips both flat and sharp — instead of picking again. The bar becomes a second rhythm instrument.',
      he: 'פרטו את תווי האקורד פעם אחת, השאירו אותם מצלצלים והקישו קצב יציב על ידית רעד צפה — טלטולים קטנים גם כלפי מטה וגם כלפי מעלה — במקום לפרוט שוב. הידית הופכת לכלי קצב נוסף.',
    },
    difficulty: 'Advanced',
    bpmSuggested: 65,
    noteValue: '8th',
    sequence: [
      step(3, 0, 0, 'G'), step(4, 0, 0, 'B'), step(5, 0, 0, 'E'),
      step(3, 0, 0, 'G'), step(4, 0, 0, 'B'), step(5, 0, 0, 'E'),
    ],
  },
  {
    id: 'beck-open-string-trill',
    title: { en: 'Fast Open-String Trill', he: 'טריל מהיר על מיתר פתוח' },
    category: 'speed',
    source: "Inspired by Jeff Beck's fast trill technique",
    description: {
      en: 'Rapid hammer-on/pull-off between two frets, starting from the open string — clean, even trills with no pick attack after the first note, and no scuffing on the idle strings around it.',
      he: 'האמר-און/פול-אוף מהיר בין שני שריגים, החל מהמיתר הפתוח — טריל נקי ואחיד ללא פגיעת מפרט אחרי התו הראשון, ובלי חיכוך במיתרים הסמוכים הדוממים.',
    },
    difficulty: 'Intermediate',
    bpmSuggested: 100,
    noteValue: '16th',
    sequence: [
      step(5, 0, 0, 'E'), step(5, 2, 2, 'F#'), step(5, 0, 0, 'E'), step(5, 2, 2, 'F#'),
      step(5, 0, 0, 'E'), step(5, 2, 2, 'F#'), step(5, 0, 0, 'E'), step(5, 2, 2, 'F#'),
    ],
  },
  {
    id: 'beck-bottleneck-slide-phrasing',
    title: { en: 'Bottleneck-Style Slide Phrasing', he: 'פרזות סטייל בקבוק (סליידר)' },
    category: 'pro_drills',
    source: "Inspired by Jeff Beck's bottleneck slide playing (e.g. 'Rice Pudding')",
    description: {
      en: "Slide smoothly between each target note on a single string instead of picking every one fresh — even without a literal slide, this internalizes the vocal, bluesy phrasing Beck's slide work is known for.",
      he: 'החליקו בצורה חלקה בין כל תו יעד על מיתר בודד במקום לפרוט כל תו מחדש — גם בלי סליידר פיזי, זה מטמיע את הפרזות הבלוזית והוקאלית שמאפיינת את נגינת הסליידר שלו.',
    },
    difficulty: 'Intermediate',
    bpmSuggested: 75,
    noteValue: '8th',
    sequence: [
      step(3, 3, 1, 'A#'), step(3, 5, 3, 'C'), step(3, 7, 4, 'D'), step(3, 5, 3, 'C'), step(3, 3, 1, 'A#'),
    ],
  },
  {
    id: 'beck-thumb-fingerstyle',
    title: { en: 'Thumb-Only Fingerstyle Pattern', he: 'תבנית פינגרסטייל באגודל בלבד' },
    category: 'pro_drills',
    source: "Inspired by Jeff Beck's thumb-only fingerstyle approach (no pick)",
    description: {
      en: 'Play the arpeggio pattern with just the picking-hand thumb, no pick — the approach Beck used from the \'80s on, which freed his other fingers for the volume/tone knobs and the whammy bar at the same time.',
      he: 'נגנו את תבנית הארפג\'יו רק עם האגודל של יד הפריטה, בלי מפרט — הגישה שבק אימץ משנות ה-80 ואילך, ששחררה את שאר האצבעות לשליטה בווליום/טון ובידית הרעד בו-זמנית.',
    },
    difficulty: 'Intermediate',
    bpmSuggested: 85,
    noteValue: '8th',
    sequence: [
      step(1, 0, 0, 'A'), step(3, 2, 1, 'A'), step(2, 2, 2, 'E'),
      step(4, 1, 1, 'C'), step(3, 2, 1, 'A'), step(2, 2, 2, 'E'),
    ],
  },
  {
    id: 'beck-whammy-scoop',
    title: { en: 'Whammy-Bar Scoop Attack', he: 'תקיפת תו עם "קימור" ידית רעד' },
    category: 'pro_drills',
    source: "Inspired by Jeff Beck's whammy-bar 'scoop' note attack",
    description: {
      en: "Before picking, press the bar down to flatten the pitch, then pick and slowly let the bar rise back to true pitch — a vocal 'scoop' into the note instead of a straight attack. Practice each note in isolation.",
      he: 'לפני הפריטה, לחצו את הידית כלפי מטה כדי להנמיך את הצליל, ואז פרטו ותנו לידית לעלות באיטיות בחזרה לגובה הצליל האמיתי — "קימור" וקאלי אל התו במקום תקיפה ישרה. תרגלו כל תו בנפרד.',
    },
    difficulty: 'Advanced',
    bpmSuggested: 65,
    noteValue: 'quarter',
    sequence: [
      step(5, 5, 1, 'A'), step(4, 5, 1, 'E'), step(3, 5, 1, 'C'), step(5, 8, 4, 'C'),
    ],
  },
  {
    id: 'beck-fuzz-riff-drive',
    title: { en: 'Fuzz-Driven Syncopated Riff', he: 'ריף סינקופי בטון פאז' },
    category: 'speed',
    source: "Inspired by Jeff Beck's fuzz-tone riffing (Blow by Blow / Wired era)",
    description: {
      en: 'A tight, syncopated low-string riff meant for a fuzz/overdrive tone — palm-mute between hits and focus on rhythmic precision over raw speed.',
      he: 'ריף סינקופי וקומפקטי על המיתרים הנמוכים, מיועד לטון פאז/עיוות — עשו פאלם-מיוט בין הפגיעות והתמקדו בדיוק קצבי ולא במהירות גולמית.',
    },
    difficulty: 'Intermediate',
    bpmSuggested: 95,
    noteValue: '8th',
    sequence: [
      step(0, 0, 0, 'E'), step(0, 3, 3, 'G'), step(0, 0, 0, 'E'),
      step(1, 2, 2, 'B'), step(0, 0, 0, 'E'), step(0, 3, 3, 'G'),
    ],
  },
  {
    id: 'beck-harmonics-melody',
    title: { en: 'Natural-Harmonics Melody (5th/7th/12th)', he: 'מנגינת הרמוניות טבעיות (שריג 5/7/12)' },
    category: 'pro_drills',
    source: "Inspired by Jeff Beck's use of natural harmonics in melodic lines",
    description: {
      en: 'Touch the string lightly directly over the fret wire at each position (never press down) and pluck — a bell-like melodic line built entirely from natural harmonics at the 5th, 7th, and 12th frets.',
      he: 'געו במיתר בעדינות ישירות מעל חוט השריג בכל מיקום (לעולם לא ללחוץ) ופרטו — קו מלודי מצלצל כמו פעמון, בנוי כולו מהרמוניות טבעיות בשריגים 5, 7 ו-12.',
    },
    difficulty: 'Advanced',
    bpmSuggested: 60,
    noteValue: 'quarter',
    sequence: [
      step(0, 12, 0, 'E'), step(1, 12, 0, 'A'), step(2, 12, 0, 'D'),
      step(3, 7, 0, 'D'), step(4, 5, 0, 'E'), step(5, 5, 0, 'A'),
    ],
  },
  {
    id: 'beck-rockabilly-picking',
    title: { en: 'Rockabilly String-Skip Picking', he: 'פריטת דילוג-מיתרים בסגנון רוקבילי' },
    category: 'speed',
    source: "Inspired by Cliff Gallup's rockabilly picking style, a formative influence on Jeff Beck",
    description: {
      en: 'Fast, bright alternate-picked string-skipping over two strings — favor snappy attack and syncopation over a straight scalar run, the rockabilly-picking spirit that shaped Beck\'s earliest influences.',
      he: 'פריטה מתחלפת, מהירה ובהירה תוך דילוג בין שני מיתרים — העדיפו תקיפה חדה וסינקופה על פני ריצה סולמית ישרה, רוח הפריטה הרוקבילית שעיצבה את ההשפעות המוקדמות ביותר של בק.',
    },
    difficulty: 'Advanced',
    bpmSuggested: 110,
    noteValue: '8th',
    sequence: [
      step(3, 5, 1, 'C'), step(1, 5, 1, 'D'), step(3, 7, 3, 'D'),
      step(1, 7, 3, 'E'), step(3, 5, 1, 'C'), step(1, 5, 1, 'D'),
    ],
  },
  {
    id: 'beck-blues-bend-phrasing',
    title: { en: 'Blues Bend-and-Release Phrasing', he: 'פרזת בלוז כפיפה-ושחרור' },
    category: 'pro_drills',
    source: "Inspired by Jeff Beck's blues-based string-bending phrasing",
    description: {
      en: 'Bend the target note up a whole step, let it ring, then release smoothly back down — a foundational expressive move behind Beck\'s soloing. Aim for pitch accuracy at the top of the bend before releasing.',
      he: 'כופפו את תו היעד טון כלפי מעלה, תנו לו לצלצל, ואז שחררו בצורה חלקה בחזרה למטה — תנועה אקספרסיבית יסודית מאחורי הסולואים של בק. שאפו לדיוק בגובה הצליל בשיא הכפיפה לפני השחרור.',
    },
    difficulty: 'Intermediate',
    bpmSuggested: 70,
    noteValue: 'quarter',
    sequence: [
      step(3, 8, 1, 'D#'), step(3, 10, 3, 'F'), step(3, 8, 1, 'D#'), step(4, 8, 4, 'G'),
    ],
  },
];

export function filterDrills({ category = null, difficulty = null } = {}) {
  return DRILLS.filter((d) => (!category || d.category === category) && (!difficulty || d.difficulty === difficulty));
}
