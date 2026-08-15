// "Studies -> Technique & Guitar Masters" — artist-specific technique
// breakdowns, a third Studies course alongside CAGED and Scales. Unlike
// those two, entries here aren't fretboard-position/sequence data (there's
// no single "shape" a signature technique like behind-the-beat phrasing or
// palm-muted pull-offs reduces to) — they're structured lesson content:
// what the technique is, the musical context it comes from, and how to
// practice it, filterable by `artist` so more players can be added later
// without touching the UI (see TechniqueMastersView.jsx).
//
// Slash's entries are originally-authored practice write-ups built around
// techniques/concepts independently confirmed (via web search — the source
// article itself repeatedly failed to fetch in full, only returning site
// navigation/paywall boilerplate) to be covered in "Learn 10 of Slash's key
// rhythm and lead guitar approaches" (guitarworld.com). Not a transcription
// of the article's own text, tab, or exercises — same "extract the named
// concepts, author original practice material around them" approach used
// for the Jeff Beck exercise set in music/drills.js.
//
// Each entry's fretboardMapping.positions are, likewise, illustrative
// fingerings authored to correctly demonstrate the named technique (correct
// action type, plausible neck position, real music theory for any named
// scale/chord) — not coordinates transcribed from tab, since none was
// fetchable. `string` is a real guitar string number (1 = high E ... 6 =
// low E, matching the fretboardMapping schema), converted to Fretboard's
// own array-index convention by Fretboard.jsx itself. `step` groups
// positions that render/animate together (e.g. both notes of a doublestop);
// TechniqueMastersView's Play control steps through them in order.

export const TECHNIQUE_MASTERS_ARTISTS = ['Slash'];

export const TECHNIQUE_MASTERS_EXERCISES = [
  {
    id: 'slash-tech-01',
    category: 'Studies',
    subCategory: 'Technique & Guitar Masters',
    artist: 'Slash',
    title: { en: 'Dorian Doublestop Riffing', he: 'ריפים בדאבל-סטופ במוד דוריאן' },
    focusArea: { en: 'Rhythm · Doublestops · Dorian Mode', he: 'ריתמיקה · דאבל-סטופ · מוד דוריאן' },
    description: {
      en: "Slash colors straight rock rhythm parts with doublestops (two notes played together) built from the Dorian mode rather than plain power chords — a technique heard in his 2022 track 'Call Off the Dogs'. The minor-but-brighter Dorian color gives the riff a bluesy edge power chords alone don't have.",
      he: 'סלאש צובע קטעי ריתם רוקיים ישרים עם דאבל-סטופס (שני תווים המנוגנים יחד) הבנויים ממוד דוריאן במקום אקורדי פאוור פשוטים — טכניקה שנשמעת בשיר "Call Off the Dogs" משנת 2022. הצליל הדוריאני, מינורי אך בהיר יותר, נותן לריף חדות בלוזית שאין באקורדי פאוור לבדם.',
    },
    practiceRoutine: {
      en: 'Pick a root note and build doublestops a 3rd or 6th apart using only Dorian-mode scale tones. Play the doublestop riff along with a static root-note drone (bass note or open string) so the Dorian color is audible against the tonic. Start slow (70-80 BPM) focusing on both notes ringing cleanly together before building speed.',
      he: 'בחרו תו שורש ובנו דאבל-סטופס במרחק שלישית או שישית זה מזה, תוך שימוש בתווי מוד דוריאן בלבד. נגנו את ריף הדאבל-סטופ לצד תו בס קבוע (תו בס או מיתר פתוח) כך שהצליל הדוריאני יישמע ביחס לטוניקה. התחילו לאט (70-80 BPM) והתמקדו בכך ששני התווים מצלצלים יחד בנקיון לפני העלאת המהירות.',
    },
    fretboardMapping: {
      positions: [
        { step: 0, string: 3, fret: 5, action: 'Chord', label: 'C' },
        { step: 0, string: 2, fret: 5, action: 'Chord', label: 'E' },
        { step: 1, string: 3, fret: 7, action: 'Chord', label: 'D' },
        { step: 1, string: 2, fret: 7, action: 'Chord', label: 'F#' },
        { step: 2, string: 3, fret: 9, action: 'Chord', label: 'E' },
        { step: 2, string: 2, fret: 8, action: 'Chord', label: 'G' },
        { step: 3, string: 3, fret: 10, action: 'Chord', label: 'F#' },
        { step: 3, string: 2, fret: 10, action: 'Chord', label: 'A' },
      ],
    },
  },
  {
    id: 'slash-tech-02',
    category: 'Studies',
    subCategory: 'Technique & Guitar Masters',
    artist: 'Slash',
    title: { en: "'70s Blues-Rock Riff: Mute, Sustain, Pull-off", he: 'ריף בלוז-רוק שנות ה-70: מיוט, סאסטיין, פול-אוף' },
    focusArea: { en: 'Rhythm · Palm Muting · Pull-offs', he: 'ריתמיקה · פאלם-מיוט · פול-אוף' },
    description: {
      en: "Inspired by the tight, driving rhythm riffs in songs like 'Mr. Brownstone' and 'The River Is Rising' — a classic '70s blues-rock riff shape: open with tight, palm-muted alternate-picked notes, let an A5 power chord ring out to full sustain, then use pull-offs to slide bluesy phrasing off the end of the riff rather than picking every note.",
      he: 'בהשראת ריפי ריתם הדוקים ומניעים בשירים כמו "Mr. Brownstone" ו-"The River Is Rising" — תבנית ריף קלאסית של בלוז-רוק משנות ה-70: פתחו בתווים הדוקים בפאלם-מיוט ובפריטה מתחלפת, תנו לאקורד A5 להישמע בסאסטיין מלא, ואז השתמשו בפול-אוף כדי להחליק פרזה בלוזית בסוף הריף במקום לפרוט כל תו.',
    },
    practiceRoutine: {
      en: 'Palm-mute the opening notes tightly (heel of picking hand resting lightly on the bridge), alternate-pick evenly, then lift the palm mute right as you strike the A5 chord and let it ring. Finish the phrase with a pull-off (no new pick attack) into a bluesy target note. Loop the riff at 90-100 BPM, focusing on the contrast between the tight muted notes and the open sustained chord.',
      he: 'עשו פאלם-מיוט הדוק לתווים הפותחים (עקב יד הפריטה נשען בעדינות על הגשר), פרטו בפריטה מתחלפת אחידה, ואז הרימו את הפאלם-מיוט בדיוק כשאתם מכים את אקורד ה-A5 ותנו לו לצלצל. סיימו את הפרזה בפול-אוף (בלי תקיפת מפרט חדשה) אל תו יעד בלוזי. לולאו את הריף ב-90-100 BPM, תוך התמקדות בניגוד בין התווים ההדוקים המושתקים לאקורד הפתוח המתמשך.',
    },
    fretboardMapping: {
      positions: [
        { step: 0, string: 6, fret: 5, action: 'Note', label: 'A' },
        { step: 1, string: 6, fret: 5, action: 'Note', label: 'A' },
        { step: 2, string: 6, fret: 5, action: 'Chord', label: 'A' },
        { step: 2, string: 5, fret: 7, action: 'Chord', label: 'E' },
        { step: 3, string: 6, fret: 7, action: 'PullOff', targetFret: 5, label: 'B→A' },
      ],
    },
  },
  {
    id: 'slash-tech-03',
    category: 'Studies',
    subCategory: 'Technique & Guitar Masters',
    artist: 'Slash',
    title: { en: 'Behind-the-Beat Lead Phrasing', he: 'פרזור סולו "מאחורי הפעימה"' },
    focusArea: { en: 'Lead · Feel · Timing', he: 'סולו · פילינג · תזמון' },
    description: {
      en: "One of the most important (and least tab-able) parts of Slash's style: a loose, 'behind-the-beat' sense of timing on lead lines — placing notes a hair late against the click rather than locking in metronomically, which is what gives his phrasing its laid-back, vocal-like feel.",
      he: 'אחד המרכיבים החשובים (והכי פחות ניתנים לתיאור בתווים) בסגנון של סלאש: תחושת תזמון רפויה, "מאחורי הפעימה", בקווי הסולו — הצבת תווים מעט מאוחר ביחס לקליק במקום נעילה מטרונומית, וזה בדיוק מה שנותן לפרזור שלו את התחושה הרגועה והוקאלית.',
    },
    practiceRoutine: {
      en: "Take a simple pentatonic lick you already know well. Practice it first dead-on with a metronome, then deliberately practice playing each phrase's first note slightly late (a fraction behind the click) while still landing the phrase's final note on time — the goal is a relaxed pull against the beat, not just playing sloppily off-time. Use a slow tempo (60-70 BPM) so the timing shift is a deliberate choice, not a mistake.",
      he: 'קחו ליק פנטטוני פשוט שאתם כבר מכירים היטב. תרגלו אותו קודם בדיוק מלא עם מטרונום, ואז תרגלו במכוון לנגן את התו הראשון של כל פרזה מעט מאוחר (שבריר שנייה מאחורי הקליק) תוך נחיתה על התו האחרון של הפרזה בזמן — המטרה היא משיכה רגועה כנגד הפעימה, לא נגינה רשלנית מחוץ לזמן. השתמשו בקצב איטי (60-70 BPM) כך שהשינוי בתזמון יהיה בחירה מכוונת, לא טעות.',
    },
    fretboardMapping: {
      positions: [
        { step: 0, string: 1, fret: 5, action: 'Note', label: 'A' },
        { step: 1, string: 1, fret: 8, action: 'Note', label: 'C' },
        { step: 2, string: 2, fret: 8, action: 'Note', label: 'G' },
        { step: 3, string: 2, fret: 5, action: 'Note', label: 'E' },
      ],
    },
  },
  {
    id: 'slash-tech-04',
    category: 'Studies',
    subCategory: 'Technique & Guitar Masters',
    artist: 'Slash',
    title: { en: 'Strum-and-Arpeggio Acoustic Pattern', he: 'תבנית אקוסטית של סטראם וארפג\'יו' },
    focusArea: { en: 'Rhythm · Acoustic · Strumming', he: 'ריתמיקה · אקוסטי · סטראמינג' },
    description: {
      en: "Slash's acoustic rhythm parts often mix full strums with arpeggiated (one-note-at-a-time) picking within the same pattern, rather than doing one or the other — a common approach in his unplugged/acoustic sections. A frequently-used strumming skeleton is down-down-up-up-up.",
      he: 'קטעי הריתם האקוסטיים של סלאש משלבים לעיתים קרובות סטראמים מלאים עם פריטת ארפג\'יו (תו אחד בכל פעם) באותה התבנית, במקום רק אחד מהם — גישה נפוצה בקטעים האקוסטיים/הלא-מוגברים שלו. שלד סטראמינג נפוץ הוא למטה-למטה-למעלה-למעלה-למעלה.',
    },
    practiceRoutine: {
      en: "On any open chord, play a down-down-up-up-up strumming pattern, but on the first 'down' stroke, break the chord into an arpeggio (pick the individual notes low to high) instead of a full strum, then strum normally for the rest of the pattern. Practice at a relaxed acoustic tempo (75-85 BPM), keeping the arpeggiated stroke smooth and even before speeding up.",
      he: 'על כל אקורד פתוח, נגנו תבנית סטראמינג של למטה-למטה-למעלה-למעלה-למעלה, אך במכה ה"למטה" הראשונה, פרקו את האקורד לארפג\'יו (פרטו את התווים בנפרד מהנמוך לגבוה) במקום סטראם מלא, ולאחר מכן סטראמו כרגיל בשאר התבנית. תרגלו בקצב אקוסטי נינוח (75-85 BPM), ושמרו על המכה המפורקת חלקה ואחידה לפני העלאת המהירות.',
    },
    fretboardMapping: {
      positions: [
        { step: 0, string: 6, fret: 3, action: 'Note', label: 'G' },
        { step: 1, string: 5, fret: 2, action: 'Note', label: 'B' },
        { step: 2, string: 4, fret: 0, action: 'Note', label: 'D' },
        { step: 3, string: 3, fret: 0, action: 'Note', label: 'G' },
        { step: 4, string: 6, fret: 3, action: 'Chord', label: 'G' },
        { step: 4, string: 5, fret: 2, action: 'Chord', label: 'B' },
        { step: 4, string: 4, fret: 0, action: 'Chord', label: 'D' },
        { step: 4, string: 3, fret: 0, action: 'Chord', label: 'G' },
        { step: 4, string: 2, fret: 0, action: 'Chord', label: 'B' },
        { step: 4, string: 1, fret: 3, action: 'Chord', label: 'G' },
      ],
    },
  },
  {
    id: 'slash-tech-05',
    category: 'Studies',
    subCategory: 'Technique & Guitar Masters',
    artist: 'Slash',
    title: { en: 'Beyond Pentatonics: Harmonic Minor Run', he: 'מעבר לפנטטוני: ריצה בסולם מינור הרמוני' },
    focusArea: { en: 'Lead · Harmonic Minor · Scales', he: 'סולו · מינור הרמוני · סולמות' },
    description: {
      en: "Slash doesn't stay confined to pentatonic boxes — he'll reach for a harmonic minor run for a darker, more dramatic color, most famously in the outro solo of 'Sweet Child O' Mine'. The raised 7th degree of harmonic minor (compared to natural minor) is what gives these runs their distinctive, slightly exotic pull toward the root.",
      he: 'סלאש לא נשאר כלוא בתוך קופסאות פנטטוניות — הוא נוטה לפנות לריצה בסולם מינור הרמוני לצבע כהה ודרמטי יותר, בעיקר בסולו הסיום המפורסם של "Sweet Child O\' Mine". הדרגה השביעית המוגבהת של המינור ההרמוני (בהשוואה למינור טבעי) היא זו שנותנת לריצות האלו את המשיכה הייחודית והמעט אקזוטית שלהן חזרה לשורש.',
    },
    practiceRoutine: {
      en: 'Play a harmonic minor scale ascending and descending in one position, emphasizing the half-step pull from the raised 7th degree back up to the root — that interval is the whole character of the sound. Once comfortable, try soloing over a static minor chord using only harmonic minor for a full pass, so your ear learns to reach for it deliberately instead of defaulting back to pentatonic.',
      he: 'נגנו סולם מינור הרמוני עולה ויורד בפוזיציה אחת, תוך הדגשת המשיכה בחצי-טון מהדרגה השביעית המוגבהת בחזרה לשורש — האינטרוול הזה הוא כל האופי של הצליל. כשמרגישים בנוח, נסו לאלתר מעל אקורד מינור סטטי תוך שימוש במינור הרמוני בלבד למעבר מלא, כך שהאוזן תלמד לפנות אליו במכוון במקום לחזור כברירת מחדל לפנטטוני.',
    },
    fretboardMapping: {
      positions: [
        { step: 0, string: 1, fret: 5, action: 'Note', label: 'A' },
        { step: 1, string: 1, fret: 7, action: 'Note', label: 'B' },
        { step: 2, string: 1, fret: 8, action: 'Note', label: 'C' },
        { step: 3, string: 1, fret: 10, action: 'Note', label: 'D' },
        { step: 4, string: 1, fret: 12, action: 'Note', label: 'E' },
        { step: 5, string: 1, fret: 13, action: 'Note', label: 'F' },
        { step: 6, string: 1, fret: 15, action: 'Note', label: 'G#' },
        { step: 7, string: 1, fret: 17, action: 'Note', label: 'A' },
      ],
    },
  },
  {
    id: 'slash-tech-06',
    category: 'Studies',
    subCategory: 'Technique & Guitar Masters',
    artist: 'Slash',
    title: { en: 'Pentatonic-to-Major Scale Switch Shape', he: 'תבנית מעבר מפנטטוני לסולם מז\'ורי' },
    focusArea: { en: 'Lead · Pentatonic · Major Scale', he: 'סולו · פנטטוני · סולם מז\'ורי' },
    description: {
      en: "One of Slash's favorite melodic devices: a fretboard shape that lets him pivot between minor/major pentatonic and the full major scale mid-phrase without shifting position — widening a pentatonic lick into fuller major-scale color for just a beat or two before returning to the pentatonic 'home' shape.",
      he: 'אחד המכשירים המלודיים האהובים על סלאש: תבנית על המסרגה המאפשרת לו לעבור בין פנטטוני מינורי/מז\'ורי לבין הסולם המז\'ורי המלא באמצע פרזה בלי לשנות פוזיציה — הרחבת ליק פנטטוני לצבע מז\'ורי מלא לפעימה או שתיים בלבד לפני החזרה לתבנית הפנטטונית ה"ביתית".',
    },
    practiceRoutine: {
      en: "In one pentatonic box, identify the extra major-scale notes that fall within reach of the same position (the 2nd and 6th degrees relative to the pentatonic's root). Play a short pentatonic lick, then on the next phrase deliberately reach for one of those extra major-scale tones as a passing note before resolving back into the pentatonic shape. Keep it to one extra note per phrase at first so it stays melodic rather than scalar.",
      he: 'בתוך קופסה פנטטונית אחת, זהו את תווי הסולם המז\'ורי הנוספים הנמצאים בטווח אותה הפוזיציה (הדרגות השנייה והשישית ביחס לשורש הפנטטוני). נגנו ליק פנטטוני קצר, ואז בפרזה הבאה פנו במכוון לאחד מהתווים המז\'וריים הנוספים כתו מעבר לפני החזרה לתבנית הפנטטונית. הישארו עם תו נוסף אחד בלבד לפרזה בהתחלה, כך שזה יישאר מלודי ולא סולמי.',
    },
    fretboardMapping: {
      positions: [
        { step: 0, string: 1, fret: 5, action: 'Note', label: 'A' },
        { step: 1, string: 1, fret: 8, action: 'Note', label: 'C' },
        { step: 2, string: 1, fret: 7, action: 'Note', label: 'B' },
        { step: 3, string: 1, fret: 8, action: 'Note', label: 'C' },
        { step: 4, string: 2, fret: 5, action: 'Note', label: 'E' },
      ],
    },
  },
  {
    id: 'slash-tech-07',
    category: 'Studies',
    subCategory: 'Technique & Guitar Masters',
    artist: 'Slash',
    title: { en: 'Vibrato, Bend & Legato Combination Study', he: 'תרגיל שילוב: ויברטו, כפיפה ולגאטו' },
    focusArea: { en: 'Lead · Bending · Vibrato · Legato', he: 'סולו · כפיפות · ויברטו · לגאטו' },
    description: {
      en: "Vibrato, string bending, and legato (hammer-ons/pull-offs) sit at the top of Slash's expressive toolkit — often stacked together on a single sustained note rather than used in isolation: bend into a note, add vibrato while it rings, then release into a legato phrase.",
      he: 'ויברטו, כפיפות מיתר ולגאטו (האמר-און/פול-אוף) נמצאים בראש ארגז הכלים האקספרסיבי של סלאש — לעיתים קרובות משולבים יחד על תו מתמשך יחיד במקום שימוש בנפרד: כפיפה אל תוך תו, הוספת ויברטו בזמן שהוא מצלצל, ואז שחרור לתוך פרזת לגאטו.',
    },
    practiceRoutine: {
      en: 'Pick a target note and bend up to pitch from a whole step below. Once at pitch, add a wide, slow vibrato (aim for roughly one full oscillation per beat at a relaxed tempo). Release the bend and immediately follow with a short legato run (hammer-ons/pull-offs, no picking) down through 2-3 notes. Practice each of the three pieces (bend, vibrato, legato exit) separately first, then chain them together slowly before adding tempo.',
      he: 'בחרו תו יעד וכפפו אליו מטון מתחתיו. כשמגיעים לגובה הצליל, הוסיפו ויברטו רחב ואיטי (שאפו לתנודה מלאה אחת בערך לכל פעימה בקצב נינוח). שחררו את הכפיפה והמשיכו מיד בריצת לגאטו קצרה (האמר-און/פול-אוף, בלי פריטה) דרך 2-3 תווים כלפי מטה. תרגלו כל אחד משלושת החלקים (כפיפה, ויברטו, יציאת לגאטו) בנפרד תחילה, ואז שרשרו אותם יחד לאט לפני הוספת קצב.',
    },
    fretboardMapping: {
      positions: [
        { step: 0, string: 1, fret: 8, action: 'Bend', bendStep: 1, label: 'C' },
        { step: 1, string: 1, fret: 8, action: 'Note', label: 'vib.' },
        { step: 2, string: 1, fret: 8, action: 'PullOff', targetFret: 5, label: 'C→A' },
        { step: 3, string: 1, fret: 5, action: 'PullOff', targetFret: 3, label: 'A→G' },
      ],
    },
  },
  {
    id: 'slash-tech-08',
    category: 'Studies',
    subCategory: 'Technique & Guitar Masters',
    artist: 'Slash',
    title: { en: 'Palm-Muted Legato Lead Lick (Pentatonic Mix)', he: 'ליק סולו בפאלם-מיוט ולגאטו (מיקס פנטטוני)' },
    focusArea: { en: 'Lead · Legato · Pedal Tones · Palm Muting', he: 'סולו · לגאטו · תווי פדל · פאלם-מיוט' },
    description: {
      en: "Slash's lead style regularly combines fast legato runs, palm-muted picking, and pedal tones (a repeated note interspersed between moving notes), while freely mixing minor and major pentatonic shapes from the same root rather than picking just one — a combination that (with a wah pedal, if you have one) is close to his signature lead voice.",
      he: 'סגנון הסולו של סלאש משלב לעיתים קרובות ריצות לגאטו מהירות, פריטה עם פאלם-מיוט, ותווי פדל (תו חוזר המשולב בין תווים נעים), תוך שילוב חופשי של תבניות פנטטוני מינורי ומז\'ורי מאותו השורש במקום בחירה באחת בלבד — שילוב שקרוב (עם פדל וואה, אם יש לכם) לקול הסולו החתום שלו.',
    },
    practiceRoutine: {
      en: 'Pick a repeated open or low-fret note as your pedal tone. Between each pedal-tone hit, hammer-on/pull-off a short run using notes from both the minor and major pentatonic scales of the same root, palm-muting the pedal-tone hits for a percussive contrast against the smoother legato notes. Start at a slow, deliberate tempo (70 BPM) to keep the pedal tone rhythmically even, then increase speed once the pattern is solid.',
      he: 'בחרו תו פתוח או בשריג נמוך שחוזר על עצמו כתו הפדל שלכם. בין כל פגיעה בתו הפדל, בצעו האמר-און/פול-אוף לריצה קצרה תוך שימוש בתווים משני הסולמות הפנטטוניים, המינורי והמז\'ורי, מאותו השורש, ועשו פאלם-מיוט לפגיעות תו הפדל ליצירת ניגוד פרקושיבי מול תווי הלגאטו החלקים יותר. התחילו בקצב איטי ומכוון (70 BPM) כדי לשמור על תו הפדל אחיד קצבית, ואז הגבירו מהירות ברגע שהתבנית יציבה.',
    },
    fretboardMapping: {
      positions: [
        { step: 0, string: 2, fret: 0, action: 'Note', label: 'B' },
        { step: 1, string: 1, fret: 5, action: 'HammerOn', targetFret: 8, label: 'A→C' },
        { step: 2, string: 2, fret: 0, action: 'Note', label: 'B' },
        { step: 3, string: 1, fret: 7, action: 'HammerOn', targetFret: 8, label: 'B→C' },
        { step: 4, string: 2, fret: 0, action: 'Note', label: 'B' },
      ],
    },
  },
];

// The single function TechniqueMastersView calls to turn "which artist is
// selected" into the filtered exercise list — keeps the filtering logic
// out of the component, same role as music/drills.js's filterDrills.
export function filterTechniqueMasters({ artist = null } = {}) {
  return TECHNIQUE_MASTERS_EXERCISES.filter((e) => !artist || e.artist === artist);
}
