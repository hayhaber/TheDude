// ⓘ explanations (tools area) — EN + HE, keys 'tip.tools.*'.
// Covers GuitarPro / PianoPro, Vocal, Tools (metronome, tuner), FreePlay,
// Settings, Studies and Songs.
export const TIPS_TOOLS = {
  en: {
    // GuitarPro
    'tip.tools.gpJumpToPart':
      'Jumps to just before the first note of the part being shown — handy when it comes in after a long intro. Not the same as Solo in the mixer.',
    'tip.tools.gpMixer':
      "Solo: only the soloed tracks play (you can solo several; it resets when you change file). Mute takes a track out of the mix. The fader sets its level — a muted track shows 0, and raising it unmutes it.",
    'tip.tools.gpTracks':
      "The file's parts. Tap a name to show that part in the score and on the neck or keys. The speaker mutes it. A grey icon means you don't hear that track right now.",
    'tip.tools.gpView':
      'Song plays the whole file with every track, the score and neck following along. Practice is a trainer for the shown guitar part: play it into the mic with the band and get feedback on each note.',
    'tip.tools.pianoOctave':
      'Moves the part being shown up or down by whole octaves — both what you hear and the notation. The other tracks stay as they are.',
    'tip.tools.chordReadout':
      'Names the chord once 3 or more different notes sound, e.g. C + E + G = C. In FreePlay one or two keys show as notes with octave numbers (C4 = middle C).',
    // Vocal
    'tip.tools.vocalLevel':
      'Advanced adds harder exercises (vibrato, octave scale, minor arpeggio, runs, leaps, range builder) and grades stricter: in tune means within 15 cents instead of 25.',
    'tip.tools.vocalRange':
      'The notes shown are your comfortable range (the solid band). Hatched keys you can reach, but with strain. The exercises stay in the comfortable range; only the range builder goes to the edges.',
    'tip.tools.vocalGuide':
      'The piano softly plays the target notes while you sing. Use headphones, or the mic will hear the piano too. On iPhone it comes out of the earpiece.',
    'tip.tools.vocalLive':
      'The note you are singing and how far it is from the target, in cents (100 cents = a semitone). Green within 25, amber within 50; far off, an arrow says go up or down.',
    'tip.tools.vocalScore':
      "The exercise's score, 0–100. Each bar is one round: green from 85, amber from 60. A note's score combines how in tune it was and how much of it you actually sang.",
    'tip.tools.vocalRoll':
      'The bars are the target notes (each about a semitone tall); the line is your voice — green in tune, amber close, red off. After a round each note shows ✓ or how many cents it was off.',
    // Tools
    'tip.tools.drumFills':
      'Every 4th bar the drums play a short fill (toms or snare) on the last beat instead of the groove, then a crash on the next downbeat.',
    'tip.tools.tunerAccuracy':
      'Hz is the pitch the tuner hears. In tune = within 5 cents of the note (100 cents = one fret); within 15 the note turns amber (close). The meter spans ±50 cents.',
    'tip.tools.pedal':
      'Sustain pedal: keys you let go keep ringing until you lift the pedal. Tap Pedal to switch it on or off, or hold the space bar like a real pedal.',
    // Settings
    'tip.tools.inputGain':
      "Boosts or lowers the mic / instrument signal before the app listens to it — for the tuner, trainers and singing. Raise it if notes aren't picked up, lower it if the meter turns red.",
    'tip.tools.pianoSound':
      "The piano's sound. In PianoPro it also replaces the file's own instrument for the keyboard part being shown (e.g. Rhodes instead of the file's organ).",
    'tip.tools.bassSound':
      "The bass's sound. In GuitarPro on the bass it also replaces the file's own instrument for the bass part being shown.",
    // Studies
    'tip.tools.stringSet':
      'Which 3 neighbouring strings the triad inversions are drawn on: 3-2-1 = G-B-E, 4-3-2 = D-G-B, 5-4-3 = A-D-G.',
    'tip.tools.chordToneLabels':
      "Notes shows each dot's note name; Degrees shows its role in the chord. In C major: C = 1 (root), E = 3 (3rd), G = 5 (5th).",
    // Songs
    'tip.tools.songsMode':
      'Song, Solo and GP Files open a search on chord, tab or Guitar Pro sites in a new tab. Video plays a YouTube link here so you can play along and mark the chords. Tab opens a Guitar Pro file or TAB PDF you upload.',
  },
  he: {
    // GuitarPro
    'tip.tools.gpJumpToPart':
      'קופץ לרגע שלפני התו הראשון של התפקיד המוצג — שימושי כשהוא נכנס אחרי פתיחה ארוכה. זה לא ה"סולו" שבמיקסר.',
    'tip.tools.gpMixer':
      'סולו: רק הערוצים המסומנים מתנגנים (אפשר כמה; מתאפס כשמחליפים קובץ). השתק מוציא ערוץ מהמיקס. הפיידר קובע את העוצמה — ערוץ מושתק מראה 0, והרמת הפיידר מבטלת את ההשתקה.',
    'tip.tools.gpTracks':
      'התפקידים שבקובץ. הקישו על שם כדי להציג את התפקיד בתווים ועל הצוואר או הקלידים. הרמקול משתיק אותו. אייקון אפור = הערוץ לא נשמע כרגע.',
    'tip.tools.gpView':
      'שיר מנגן את כל הקובץ עם כל הערוצים, והתווים והצוואר עוקבים. תרגול הוא מאמן לתפקיד הגיטרה המוצג: נגנו אותו למיקרופון יחד עם הלהקה וקבלו משוב על כל תו.',
    'tip.tools.pianoOctave':
      'מזיז את התפקיד המוצג אוקטבות שלמות למעלה או למטה — גם בצליל וגם בתווים. שאר הערוצים נשארים כמו שהם.',
    'tip.tools.chordReadout':
      'מציג את שם האקורד ברגע שנשמעים 3 תווים שונים או יותר, למשל C + E + G = C. במסך נגינה קליד אחד או שניים מוצגים כתווים עם מספר אוקטבה (C4 = דו האמצעי).',
    // Vocal
    'tip.tools.vocalLevel':
      'מתקדמים מוסיף תרגילים קשים יותר (ויברטו, סולם באוקטבה, ארפג\'ו מינורי, ריצות, קפיצות, הרחבת מנעד) ובודק בקפדנות רבה יותר: מכוון = עד 15 סנט במקום 25.',
    'tip.tools.vocalRange':
      'התווים המוצגים הם המנעד הנוח שלכם (הפס המלא). לקלידים המקווקווים אתם מגיעים, אבל במאמץ. התרגילים נשארים במנעד הנוח; רק הרחבת המנעד מגיעה לקצוות.',
    'tip.tools.vocalGuide':
      'הפסנתר מנגן בשקט את תווי המטרה בזמן שאתם שרים. השתמשו באוזניות, אחרת המיקרופון ישמע גם את הפסנתר. באייפון הצליל יוצא מהרמקול של השיחות.',
    'tip.tools.vocalLive':
      'התו שאתם שרים וכמה הוא רחוק מתו המטרה, בסנטים (100 סנט = חצי טון). ירוק עד 25, כתום עד 50; כשרחוקים מאוד, חץ מראה אם לעלות או לרדת.',
    'tip.tools.vocalScore':
      'הציון של התרגיל, 0–100. כל עמודה היא סבב אחד: ירוק מ-85, כתום מ-60. הציון של כל תו משלב כמה הוא היה מכוון וכמה ממנו באמת שרתם.',
    'tip.tools.vocalRoll':
      'המלבנים הם תווי המטרה (כל אחד בגובה של כחצי טון); הקו הוא הקול שלכם — ירוק מכוון, כתום קרוב, אדום רחוק. אחרי כל סבב מופיע ליד כל תו ✓ או בכמה סנטים הוא סטה.',
    // Tools
    'tip.tools.drumFills':
      'כל תיבה רביעית התופים מנגנים פיל קצר (טומים או סנר) בפעמה האחרונה במקום הקצב הרגיל, ואחריו מצילה בפעמה הראשונה של התיבה הבאה.',
    'tip.tools.tunerAccuracy':
      'Hz הוא הצליל שהטיונר שומע. מכוון = עד 5 סנט מהתו (100 סנט = שריג אחד); עד 15 סנט התו נצבע בכתום (קרוב). המד מכסה ±50 סנט.',
    'tip.tools.pedal':
      'פדל סוסטיין: קלידים ששחררתם ממשיכים להדהד עד שמרימים את הפדל. הקישו על פדל כדי להפעיל או לכבות, או החזיקו את מקש הרווח כמו פדל אמיתי.',
    // Settings
    'tip.tools.inputGain':
      'מגביר או מחליש את האות מהמיקרופון / הכלי לפני שהאפליקציה מקשיבה לו — בטיונר, במאמנים ובשירה. הגבירו אם תווים לא נקלטים, והנמיכו אם המד נצבע באדום.',
    'tip.tools.pianoSound':
      'הצליל של הפסנתר. ב-PianoPro הוא גם מחליף את הכלי המקורי של הקובץ בתפקיד הקלידים המוצג (למשל רודס במקום האורגן שבקובץ).',
    'tip.tools.bassSound':
      'הצליל של הבס. ב-GuitarPro בעמוד הבס הוא גם מחליף את הכלי המקורי של הקובץ בתפקיד הבס המוצג.',
    // Studies
    'tip.tools.stringSet':
      'על אילו 3 מיתרים סמוכים מוצגים היפוכי הטריאדה: 3-2-1 = G-B-E,‏ 4-3-2 = D-G-B,‏ 5-4-3 = A-D-G.',
    'tip.tools.chordToneLabels':
      'תווים מציג את שם התו בכל נקודה; דרגות מציג את התפקיד שלו באקורד. ב-C מז\'ור: C = 1 (שורש), E = 3 (טרצה), G = 5 (קווינטה).',
    // Songs
    'tip.tools.songsMode':
      'שיר, סולו וקבצי GP פותחים חיפוש באתרי אקורדים, טאבים או Guitar Pro בלשונית חדשה. וידאו מנגן כאן קישור מיוטיוב כדי לנגן איתו ולסמן את האקורדים. טאב פותח קובץ Guitar Pro או PDF של טאב שאתם מעלים.',
  },
};
