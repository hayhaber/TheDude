// ⓘ explanations (compose area) — EN + HE, keys 'tip.compose.*'.
export const TIPS_COMPOSE = {
  en: {
    'tip.compose.keyTranspose':
      'The key detected from your typed chords (needs 2 or more) — not a setting. − / + rewrite every typed chord a half step down or up, e.g. to fit a singer. Unlike a capo, the chords themselves change.',
    'tip.compose.position':
      'The same chord can be played in several places on the neck. Back / Next and the numbers switch between them. Each is named after the open chord its shape comes from: an E-shape is the open E chord moved up the neck.',
    'tip.compose.inversion':
      'Which chord tone is at the bottom. Root position: the root is lowest (C-E-G). 1st inversion: the 3rd is lowest (E-G-C). 2nd inversion: the 5th is lowest (G-C-E). Same notes, different colour.',
    'tip.compose.displayMode':
      'Chord: the full chord shape across the strings. Triad: only the 3 core notes — root, 3rd and 5th — on 3 neighbouring strings, as small shapes you can move around.',
    'tip.compose.noteColoring':
      'Chord: every note in the chord’s own colour. Function: each note coloured by its role in the chord — root, 3rd, 5th, 7th or extension (9th, 11th, 13th) — so you can see where, say, the 3rd sits in each shape.',
    'tip.compose.heatMap':
      'Shades the frets around the current chord shape by how well each note fits the key: scale tones are safe, passing tones (outside the key) work on the way through, avoid notes clash if you hold them.',
    'tip.compose.heatMapLegend':
      'From most to least important: chord tones (the chord’s own notes), scale tones (in the key), passing tones (outside the key), avoid notes (a half step above a chord tone — F over a C chord, against its 3rd E).',
    'tip.compose.detectedKey':
      'The key the app infers from your chords. The strip shows its 7 notes with degree numbers and chord numerals (I, ii, iii…). Rings mark the chords you use: blue = in the key, green = borrowed, red = borrowed with a clash.',
    'tip.compose.suggestedScales':
      'Scales that fit the whole progression: the key’s own scale, its relative (same 7 notes, different home note — C major = A natural minor) and a minor pentatonic. Bold = best match for the chosen Emotion.',
    'tip.compose.borrowedChords':
      'Chords from outside the key, often borrowed from the parallel minor — e.g. B♭ (♭VII) or Fm (iv) in C major. Green = blends in; red = one of its notes is a half step below the in-key one (Fm’s A♭ against F’s A).',
    'tip.compose.positionRoadmap':
      'Where your hand sits for each chord, using the shapes now shown. Between chords: Stay = same fret, Shift = move 1–2 frets, Slide = 3 frets or more. Fewer slides = easier changes.',
    'tip.compose.landingNotes':
      'The next chord’s root, 3rd and 5th, in the shape Next will show — the strongest notes to land on when the chord changes. Am → F: aim for F, A or C. Tap a note on the neck to see how far to move.',
    'tip.compose.emotion':
      'Changes how generated licks and phrases are played — pace, how many notes, bend width and vibrato — without adding notes that clash with the chord. Also bolds the matching suggested scale. Changing it clears the current lick and phrase.',
    'tip.compose.motifKinds':
      'Develop the lick: Variation drops a middle note; Sequence moves it 2 frets up; Inversion mirrors the melody around its first note (up becomes down); Octave moves it 12 frets; Rhythmic plays it long-short; Ending lands on the root.',
    'tip.compose.phraseBuilder':
      'Builds a 4-bar solo, one bar per chord: 1) a short motif, 2) a variation (a middle note dropped), 3) the motif 2 frets higher to build tension, 4) a resolution that ends on the chord’s root.',
    'tip.compose.callResponse':
      'A question and its answer. The Call ends on the chord’s 5th, so it sounds open, like a question. The Response repeats the idea 2 frets lower and ends on the root, so it sounds finished. Over C: Call ends on G, Response on C.',
    'tip.compose.soloCoach':
      'Checks the generated lick or phrase (not your own playing) and scores it: 100 minus 15 per issue — too repetitive, one rhythm throughout, no bends or vibrato, stuck in one position, or not ending on the root.',
    'tip.compose.blueNote':
      'Adds the ♭5 — the “blue note” — to the minor pentatonic, making a 6-note blues scale. In A: A C D E G plus E♭, a tense note usually slid through rather than held.',
    'tip.compose.cagedCycle':
      'CAGED: any chord can be played with the shapes of the open C, A, G, E and D chords. They follow each other up the neck in that order and then repeat. This workout climbs through all five and back down.',
    'tip.compose.progressionArea':
      'Plays I–IV–V–I without leaving one area of the neck. Each area starts from one shape of the I chord (the tonic); the IV and V chords use their shapes closest to it. In G: G–C–D–G.',
  },
  he: {
    'tip.compose.keyTranspose':
      'הסולם שזוהה מהאקורדים שהקלדתם (צריך 2 לפחות) — זו לא הגדרה. − / + כותבים מחדש כל אקורד חצי טון למטה או למעלה, למשל כדי להתאים לזמר. בניגוד לקאפו, האקורדים עצמם משתנים.',
    'tip.compose.position':
      'אותו אקורד אפשר לנגן בכמה מקומות על הצוואר. חזרה / הבא והמספרים עוברים ביניהם. כל צורה נקראת על שם האקורד הפתוח שממנו היא באה: E-shape היא האקורד הפתוח E שהוזז במעלה הצוואר.',
    'tip.compose.inversion':
      'איזה תו של האקורד נמצא למטה. מצב יסוד: השורש הכי נמוך (C-E-G). היפוך ראשון: השלישית הכי נמוכה (E-G-C). היפוך שני: החמישית הכי נמוכה (G-C-E). אותם תווים, צבע אחר.',
    'tip.compose.displayMode':
      'אקורד: צורת האקורד המלאה על המיתרים. טריאדה: רק 3 תווי הליבה — שורש, שלישית וחמישית — על 3 מיתרים סמוכים, כצורות קטנות שאפשר להזיז.',
    'tip.compose.noteColoring':
      'אקורד: כל התווים בצבע של האקורד. פונקציה: כל תו נצבע לפי תפקידו באקורד — שורש, שלישית, חמישית, שביעית או הרחבה (9, 11, 13) — כך רואים, למשל, איפה השלישית יושבת בכל צורה.',
    'tip.compose.heatMap':
      'צובעת את השריגים סביב צורת האקורד הנוכחית לפי מידת ההתאמה של כל תו לסולם: תווי סולם בטוחים, תווי מעבר (מחוץ לסולם) טובים בדרך, ותווים להימנעות מתנגשים אם מחזיקים אותם.',
    'tip.compose.heatMapLegend':
      'מהחשוב ביותר לפחות חשוב: תווי אקורד (התווים של האקורד עצמו), תווי סולם (בתוך הסולם), תווי מעבר (מחוץ לסולם), תווים להימנעות (חצי טון מעל תו אקורד — F מעל אקורד C, מול השלישית E).',
    'tip.compose.detectedKey':
      'הסולם שהאפליקציה מסיקה מהאקורדים שלכם. הפס מציג את 7 התווים שלו עם מספרי דרגות וספרות רומיות (I, ii, iii…). טבעות מסמנות את האקורדים שבשימוש: כחול = בסולם, ירוק = שאול, אדום = שאול עם התנגשות.',
    'tip.compose.suggestedScales':
      'סולמות שמתאימים לכל המהלך: הסולם של המפתח עצמו, הסולם המקביל לו (אותם 7 תווים, תו בית אחר — C מז׳ור = A מינור טבעי) ופנטטוני מינורי. מודגש = ההתאמה הטובה לרגש שנבחר.',
    'tip.compose.borrowedChords':
      'אקורדים מחוץ לסולם, לרוב שאולים מהמינור המקביל — למשל B♭ (♭VII) או Fm (iv) ב-C מז׳ור. ירוק = משתלב; אדום = אחד התווים שלו נמוך בחצי טון מהתו שבסולם (ה-A♭ של Fm מול ה-A של F).',
    'tip.compose.positionRoadmap':
      'איפה היד יושבת בכל אקורד, לפי הצורות שמוצגות עכשיו. בין אקורדים: הישאר = אותו שריג, הזזה = 1–2 שריגים, סליידה = 3 שריגים ומעלה. פחות סליידים = מעברים קלים יותר.',
    'tip.compose.landingNotes':
      'השורש, השלישית והחמישית של האקורד הבא, בצורה שהבא יציג — התווים החזקים ביותר לנחות עליהם כשהאקורד מתחלף. Am → F: כוונו ל-F, A או C. הקישו על תו בצוואר כדי לראות כמה לזוז.',
    'tip.compose.emotion':
      'משנה את אופן הנגינה של ליקים ופראזות שנוצרים — קצב, כמות תווים, רוחב כפיפות וויברטו — בלי להוסיף תווים שמתנגשים באקורד. גם מדגיש את הסולם המומלץ המתאים. שינוי שלו מנקה את הליק והפראזה הנוכחיים.',
    'tip.compose.motifKinds':
      'פיתוח הליק: Variation משמיט תו מהאמצע; Sequence מזיז אותו 2 שריגים למעלה; Inversion משקף את המנגינה סביב התו הראשון (עלייה הופכת לירידה); Octave מזיז 12 שריגים; Rhythmic מנגן ארוך-קצר; Ending נוחת על השורש.',
    'tip.compose.phraseBuilder':
      'בונה סולו של 4 תיבות, תיבה לכל אקורד: 1) מוטיב קצר, 2) וריאציה (תו מהאמצע מושמט), 3) המוטיב 2 שריגים גבוה יותר כדי לבנות מתח, 4) פתרון שמסתיים על שורש האקורד.',
    'tip.compose.callResponse':
      'שאלה ותשובה. הקריאה מסתיימת על החמישית של האקורד, ולכן נשמעת פתוחה, כמו שאלה. התשובה חוזרת על הרעיון 2 שריגים נמוך יותר ומסתיימת על השורש, ולכן נשמעת סגורה. מעל C: הקריאה מסתיימת ב-G, התשובה ב-C.',
    'tip.compose.soloCoach':
      'בודק את הליק או הפראזה שנוצרו (לא את הנגינה שלכם) ונותן ציון: 100 פחות 15 על כל בעיה — חזרתיות, אותו קצב לאורך כל הדרך, בלי כפיפות או ויברטו, תקיעה בפוזיציה אחת, או סיום שלא על השורש.',
    'tip.compose.blueNote':
      'מוסיף את ה-♭5 — "תו הבלוז" — לפנטטוני המינורי, וכך נוצר סולם בלוז של 6 תווים. ב-A: A C D E G ועוד E♭, תו מתוח שבדרך כלל מחליקים דרכו ולא מחזיקים.',
    'tip.compose.cagedCycle':
      'CAGED: כל אקורד אפשר לנגן בצורות של האקורדים הפתוחים C, A, G, E ו-D. הן באות זו אחרי זו במעלה הצוואר בסדר הזה וחוזרות חלילה. האימון הזה מטפס דרך כל החמש וחוזר למטה.',
    'tip.compose.progressionArea':
      'מנגן I–IV–V–I בלי לעזוב אזור אחד בצוואר. כל אזור מתחיל מצורה אחת של אקורד ה-I (הטוניקה); אקורדי ה-IV וה-V משתמשים בצורות הקרובות אליה ביותר. ב-G: G–C–D–G.',
  },
};
