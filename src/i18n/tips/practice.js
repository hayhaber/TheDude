// ⓘ explanations (practice area) — EN + HE, keys 'tip.practice.*'.
export const TIPS_PRACTICE = {
  en: {
    // Practice -> Chord Rhythm (piano)
    'tip.practice.judging':
      'Lenient: play every note of the chord in any octave; extra keys don\'t hurt. Strict: exactly root, 3rd and 5th upward from the root above middle C (C = C4 E4 G4), nothing extra. Both accept a press up to 0.25 s early.',
    // Lick Trainer results
    'tip.practice.lickScore':
      '0–100: 55% right notes, 30% timing, 15% technique (bends, vibrato). In a lick with no techniques: 62% notes, 38% timing. Each extra note you play costs 3 points, up to 15.',
    'tip.practice.lickTiming':
      'Only notes at the right pitch are timed. Within ±25 ms of the beat = full credit (±55 ms for hammer-ons, pull-offs, slides and releases); the credit drops evenly to zero at 150 ms off.',
    'tip.practice.lickTechnique':
      'Bends: within ±25 cents of the target = full credit, within ±50 = half (a whole-step bend is 200 cents). Releases must come back to the unbent note. Vibrato must swing at least ~15 cents each way.',
    'tip.practice.lickClick':
      'Keeps the metronome clicking through the take, not just the count-in. On by default with Direct/Interface input, off with Microphone input — a room mic would also hear the click from your speakers.',
    'tip.practice.lickSource':
      'Verified: a known lick supplied and checked by a player. Standard lick: written for DudeStar from common rock/blues vocabulary, not transcribed from a recording. Imported: from a Guitar Pro or MusicXML file you added.',
    // Practice stats bar
    'tip.practice.statsToday':
      'Stats count drills only: time while Play runs in Practice → Drills or a Studies practice drill; Rhythm, Ear Training, Lick Trainer etc. aren\'t counted. Day streak = days in a row with a drill; not practising yet today doesn\'t break it.',
    'tip.practice.statsCompleted':
      'Drill sessions logged today — not exercises finished. A session is logged when you press Exit or load another exercise, as long as its timer ran.',
    'tip.practice.statsRecommended':
      'The first drill or Studies exercise you haven\'t practised today. Once you\'ve done them all, the one you practised longest ago. Tap to open it.',
    // Bending
    'tip.practice.bendSize':
      'How far to bend: ½ step = 1 semitone, 1 step = 2, 1½ steps = 3. The bent note should sound like the note 1, 2 or 3 frets higher, shown as the target fret — e.g. bend fret 7 up to sound like fret 9.',
    'tip.practice.bendHold':
      'A bend counts when the pitch stays within ±15 cents of the target, steadily, for half a second — the bar fills while you hold. Drifting out of the target or wobbling empties the bar.',
    // Drill panel
    'tip.practice.drillView':
      'Static Overview: every note of the exercise at once, with the starting note and the current step marked. Live Playback: only the current note, the next one and the previous one, moving with the metronome.',
    'tip.practice.drillHear':
      'Plays each note\'s pitch on the beat as the drill steps through it, so you hear the line you\'re playing. While it\'s on, the metronome click is muted — the notes keep the time.',
    // Rhythm Practice
    'tip.practice.rhythmHits':
      'Hit = the mic hears the highlighted note (same pitch and octave) within 600 ms after its beat. Combo = hits in a row. Accuracy = hits ÷ (hits + misses).',
    // Chord Changes (guitar)
    'tip.practice.chordPool':
      'Which chords come up. Open only: C D E G A, Am Dm Em, A7 D7 E7 G7. Open + barre: adds major and minor in all 12 keys. Triads: major and minor in all 12 keys (the mic can\'t tell a triad from a full chord). Everything: adds 7th chords.',
    'tip.practice.chordHearing':
      'The chord the mic thinks you\'re playing; % = how sure it is (how much of the sound sits on that chord\'s notes). Any voicing or position counts if the root and quality match — any G major shape is G.',
    // Scale Practice
    'tip.practice.scalePosition':
      'Five overlapping 5-fret boxes taken from the CAGED shapes, numbered from the lowest on the neck upward — so in a given key Position 1 isn\'t always the classic "box 1". Each box holds the root twice, an octave apart.',
    'tip.practice.blueNote':
      'Adds the ♭5 to the minor pentatonic — the "blue note" between the 4th and the 5th. In A minor pentatonic (A C D E G) that\'s E♭, marked b5.',
    // Ear Training
    'tip.practice.earPace':
      'Standard: no clock — interval and scale questions wait for Next so you can study the answer. Timed: 60 seconds on the clock, questions move on by themselves, then a summary of the run.',
    'tip.practice.earAllTime':
      'Your accuracy in this quiz mode across every session. Best streak is also kept per mode; the other numbers start from zero each session.',
    // Flow (falling notes)
    'tip.practice.midi':
      'Connect a USB/MIDI keyboard and play on real keys (Web MIDI — Chrome or Edge; not Safari or iPhone). A note counts if you play that exact key within 0.35 s of it reaching the line.',
    // Piano practice
    'tip.practice.pianoExercise':
      'Five-Finger Scales: hear 5 notes up the major scale (root, 2nd, 3rd, 4th, 5th — C D E F G) and name the starting note. Inversion Drills: hear a triad and tell which tone is lowest — root, 3rd (1st inversion) or 5th (2nd).',
  },
  he: {
    'tip.practice.judging':
      'סלחני: נגנו את כל תווי האקורד, בכל אוקטבה; קלידים נוספים לא מזיקים. מדויק: בדיוק יסוד, טרצה וקווינטה כלפי מעלה מהיסוד שמעל ה-C האמצעי (C = C4 E4 G4), בלי קלידים נוספים. בשני המצבים לחיצה עד 0.25 שנ\' לפני הזמן נחשבת.',
    'tip.practice.lickScore':
      'ציון 0–100: ‏55% תווים נכונים, 30% תזמון, 15% טכניקה (כפיפות, ויברטו). בליק בלי טכניקות: 62% תווים ו-38% תזמון. כל תו מיותר שתנגנו מוריד 3 נקודות, עד 15.',
    'tip.practice.lickTiming':
      'רק תווים בגובה הנכון נמדדים בתזמון. עד ‎±25 מ"ש מהפעמה = ניקוד מלא (‎±55 מ"ש בהאמר-און, פול-אוף, סלייד ושחרור כפיפה); הניקוד יורד בהדרגה לאפס בסטייה של 150 מ"ש.',
    'tip.practice.lickTechnique':
      'כפיפות: עד ‎±25 סנט מהיעד = ניקוד מלא, עד ‎±50 = חצי (כפיפה של טון שלם היא 200 סנט). בשחרור צריך לחזור לתו המקורי. ויברטו צריך לנוע לפחות כ-15 סנט לכל כיוון.',
    'tip.practice.lickClick':
      'המטרונום ממשיך לתקתק לאורך כל ההקלטה, לא רק בספירה. פעיל כברירת מחדל בקלט "חיבור ישיר / ממשק", כבוי בקלט "מיקרופון" — מיקרופון בחדר היה קולט גם את הקליק מהרמקולים.',
    'tip.practice.lickSource':
      'מאומת: ליק מוכר שנגן סיפק ובדק. ליק סטנדרטי: נכתב עבור DudeStar מאוצר המילים המקובל של רוק ובלוז, לא תעתיק של הקלטה מסוימת. יובא: מקובץ Guitar Pro או MusicXML שהוספתם.',
    'tip.practice.statsToday':
      'הנתונים סופרים רק תרגילים: הזמן שבו "נגן" פועל בתרגול → תרגילים או בתרגיל של קורס בלימודים. תרגול קצב, אימון שמיעה, מאמן ליקים ושאר הלשוניות לא נספרים. רצף ימים = ימים רצופים עם תרגיל; אם עוד לא תרגלתם היום, הרצף לא נשבר.',
    'tip.practice.statsCompleted':
      'מספר סשנים של תרגילים שנרשמו היום — לא תרגילים שהושלמו. סשן נרשם כשלוחצים יציאה או טוענים תרגיל אחר, בתנאי שהטיימר רץ.',
    'tip.practice.statsRecommended':
      'התרגיל הראשון (מהתרגילים או מהלימודים) שעוד לא תרגלתם היום. אם תרגלתם את כולם — זה שתרגלתם הכי מזמן. לחצו כדי לפתוח אותו.',
    'tip.practice.bendSize':
      'כמה לכופף: ½ טון = חצי טון אחד, טון = 2 חצאי טונים, טון וחצי = 3. התו המכופף צריך להישמע כמו התו 1, 2 או 3 סריגים מעליו, שמוצג כסריג היעד — למשל כפיפה בסריג 7 שנשמעת כמו סריג 9.',
    'tip.practice.bendHold':
      'הכפיפה נחשבת כשהצליל נשאר בטווח ‎±15 סנט מהיעד, ביציבות, חצי שנייה — הפס מתמלא בזמן ההחזקה. יציאה מהטווח או רעידות מרוקנות את הפס.',
    'tip.practice.drillView':
      'תצוגה סטטית: כל תווי התרגיל בבת אחת, עם תו ההתחלה והצעד הנוכחי מסומנים. ניגון חי: רק התו הנוכחי, הבא והקודם, בהתקדמות עם המטרונום.',
    'tip.practice.drillHear':
      'מנגן את הצליל של כל תו על הפעמה בזמן שהתרגיל מתקדם, כדי שתשמעו את הקו שאתם מנגנים. כשהוא פעיל הקליק של המטרונום מושתק — התווים עצמם שומרים על הקצב.',
    'tip.practice.rhythmHits':
      'פגיעה = המיקרופון שומע את התו המסומן (אותו צליל ואותה אוקטבה) עד 600 מ"ש אחרי הפעמה שלו. רצף = פגיעות ברצף. דיוק = פגיעות ÷ (פגיעות + החטאות).',
    'tip.practice.chordPool':
      'אילו אקורדים יופיעו. פתוחים בלבד: C D E G A, ‏Am Dm Em, ‏A7 D7 E7 G7. פתוחים + ברה: מוסיף מז\'ור ומינור בכל 12 הסולמות. טריאדים: מז\'ור ומינור בכל 12 הסולמות (המיקרופון לא מבדיל בין טריאדה לאקורד מלא). הכל: מוסיף אקורדי ספטימה.',
    'tip.practice.chordHearing':
      'האקורד שהמיקרופון חושב שאתם מנגנים; האחוז = עד כמה הוא בטוח (כמה מהצליל יושב על תווי האקורד). כל מיקום או וויסינג נחשב אם היסוד והסוג נכונים — כל צורה של G מז\'ור היא G.',
    'tip.practice.scalePosition':
      'חמש תיבות חופפות ברוחב 5 סריגים, לפי צורות CAGED, ממוספרות מהנמוכה על הצוואר כלפי מעלה — לכן בסולם מסוים פוזיציה 1 היא לא תמיד "התיבה הראשונה" הקלאסית. בכל תיבה היסוד מופיע פעמיים, באוקטבות שונות.',
    'tip.practice.blueNote':
      'מוסיף את ה-♭5 לפנטטוני המינורי — "התו הכחול" שבין הדרגה הרביעית לחמישית. בפנטטוני של A מינור (A C D E G) זה E♭, מסומן b5.',
    'tip.practice.earPace':
      'רגיל: בלי שעון — שאלות על מרווחים וסולמות מחכות ל"הבא" כדי שתוכלו ללמוד מהתשובה. מתוזמן: 60 שניות על השעון, השאלות מתחלפות לבד, ובסוף סיכום.',
    'tip.practice.earAllTime':
      'אחוז הדיוק שלכם בסוג החידון הזה בכל הסשנים יחד. גם רצף השיא נשמר לכל סוג; שאר המספרים מתחילים מאפס בכל סשן.',
    'tip.practice.midi':
      'חברו מקלדת USB/MIDI ונגנו על קלידים אמיתיים (Web MIDI — כרום או אדג\'; לא ספארי ולא אייפון). תו נחשב אם מנגנים בדיוק את הקליד שלו עד 0.35 שנ\' מהרגע שהוא מגיע לקו.',
    'tip.practice.pianoExercise':
      'סולמות חמש-אצבעות: שומעים 5 תווים עולים בסולם מז\'ור (יסוד, 2, 3, 4, 5 — C D E F G) ומזהים את תו הפתיחה. תרגילי היפוך: שומעים טריאדה ומזהים איזה צליל הכי נמוך — היסוד, הטרצה (היפוך ראשון) או הקווינטה (היפוך שני).',
  },
};
