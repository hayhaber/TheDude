// Timed free writing for the Songwriter (v1.0.163). The method: write
// without stopping for a set time, never judge or fix while writing, then
// read it back and keep only the "diamonds" — Pat Pattison's object writing
// (Berklee), Jeff Tweedy's daily practice ("How to Write One Song"), Bernie
// Taupin's early "brain-to-pencil freeform" lyrics. Prompts are objects and
// moments to dive into with every sense (Pattison: sight, sound, smell, taste,
// touch, the body inside, the body in space). Text is our own. Pure.

const P = (en, he) => ({ en, he });

// Prompts by WORLD (v1.0.164; user: "topics from all kinds of worlds").
// The worlds follow where songwriting teachers say ideas come from: Pattison's
// object writing (objects, places, the senses), a character's point of view
// and the reversed point of view, overheard speech / a first line,
// "what if", metaphor collisions (two unrelated things), memory, nature, the
// city, journeys, music itself. Every prompt is concrete — a thing, a place,
// a person, a moment — so the feeling comes out of the details. Text ours.
export const WORLDS = [
  {
    key: 'objects',
    label: P('Objects', 'חפצים'),
    prompts: [
      P('An old key you no longer know what it opens', 'מפתח ישן שכבר לא ידוע מה הוא פותח'),
      P('Your father’s watch', 'השעון של אבא שלך'),
      P('A letter you never sent', 'מכתב שלא שלחת'),
      P('Two cups on a table, one still full', 'שתי כוסות על שולחן, אחת עדיין מלאה'),
      P('A photo with someone cut out of it', 'תמונה שמישהו נחתך ממנה'),
      P('A coat that still smells of someone', 'מעיל שעדיין מריח ממישהו'),
      P('A guitar with one broken string', 'גיטרה עם מיתר אחד קרוע'),
      P('A suitcase that was never unpacked', 'מזוודה שאף פעם לא פורקה'),
      P('A ring at the bottom of a drawer', 'טבעת בתחתית מגירה'),
      P('A cassette with your handwriting on it', 'קלטת עם כתב היד שלך'),
      P('A chair nobody sits on any more', 'כיסא שאף אחד כבר לא יושב עליו'),
      P('A lighter that only works on the third try', 'מצית שעובד רק בניסיון השלישי'),
    ],
  },
  {
    key: 'places',
    label: P('Places', 'מקומות'),
    prompts: [
      P('The kitchen window at six in the morning', 'חלון המטבח בשש בבוקר'),
      P('A bus station after the last bus', 'תחנת אוטובוס אחרי האוטובוס האחרון'),
      P('An empty stage after the show', 'במה ריקה אחרי ההופעה'),
      P('A hospital corridor at night', 'מסדרון של בית חולים בלילה'),
      P('A balcony in summer, the city still awake', 'מרפסת בקיץ, העיר עוד ערה'),
      P('A petrol station in the middle of nowhere', 'תחנת דלק באמצע שום מקום'),
      P('A laundromat at midnight', 'מכבסה אוטומטית בחצות'),
      P('The roof of the building you grew up in', 'הגג של הבניין שגדלת בו'),
      P('A waiting room', 'חדר המתנה'),
      P('A hotel room in a city you don’t know', 'חדר מלון בעיר שאתה לא מכיר'),
      P('The last row of an empty cinema', 'השורה האחרונה בקולנוע ריק'),
    ],
  },
  {
    key: 'moments',
    label: P('Moments', 'רגעים'),
    prompts: [
      P('A phone screen lighting up at 2 a.m.', 'מסך טלפון שנדלק בשתיים בלילה'),
      P('A door you closed too hard', 'דלת שטרקת חזק מדי'),
      P('The moment before you say it', 'הרגע לפני שאומרים את זה'),
      P('The last message in a chat', 'ההודעה האחרונה בצ׳אט'),
      P('The second after the lights go out', 'השנייה אחרי שהאור נכבה'),
      P('Waking up and forgetting for a second', 'להתעורר ולשכוח לשנייה'),
      P('A plane taking off, your face at the window', 'מטוס ממריא, הפנים שלך בחלון'),
      P('The silence after an argument', 'השקט אחרי ויכוח'),
      P('Hearing your name called in a crowd', 'לשמוע מישהו קורא בשמך בתוך המון'),
      P('The first step into cold water', 'הצעד הראשון למים קרים'),
      P('A goodbye at a car window', 'פרידה דרך חלון של מכונית'),
    ],
  },
  {
    key: 'people',
    label: P('People', 'אנשים'),
    prompts: [
      P('A night-shift nurse at four in the morning', 'אחות במשמרת לילה בארבע לפנות בוקר'),
      P('The driver of the last bus of the night', 'הנהג של האוטובוס האחרון בלילה'),
      P('An old man feeding pigeons in the same spot every day', 'זקן שמאכיל יונים באותו מקום כל יום'),
      P('A waitress who has heard every story', 'מלצרית ששמעה כבר כל סיפור'),
      P('A child seeing the sea for the first time', 'ילד שרואה את הים בפעם הראשונה'),
      P('A street musician nobody stops for', 'נגן רחוב שאף אחד לא עוצר בשבילו'),
      P('The neighbour you only know by their music', 'השכן שאתה מכיר רק לפי המוזיקה שלו'),
      P('Someone packing to leave home at eighteen', 'מישהו שאורז לעזוב את הבית בגיל שמונה־עשרה'),
      P('A soldier on a train home', 'חייל ברכבת הביתה'),
      P('Your grandmother, at your age', 'סבתא שלך, בגיל שלך'),
    ],
  },
  {
    key: 'reverse',
    label: P('The other side', 'הצד השני'),
    prompts: [
      P('The breakup, told by the one who left', 'הפרידה, מפי מי שעזב'),
      P('Your hometown, describing you', 'עיר הולדתך, מתארת אותך'),
      P('The house, the night everyone moved out', 'הבית, בלילה שכולם עזבו אותו'),
      P('The phone that keeps ringing unanswered', 'הטלפון שממשיך לצלצל בלי מענה'),
      P('The villain of a song you love', 'הרע בשיר שאתה אוהב'),
      P('Your guitar, about the years in its case', 'הגיטרה שלך, על השנים בתוך התיק'),
      P('The person you were ten years ago, writing to you now', 'מי שהיית לפני עשר שנים, כותב לך עכשיו'),
      P('The sea, about the people who come to it at night', 'הים, על האנשים שבאים אליו בלילה'),
    ],
  },
  {
    key: 'nature',
    label: P('Nature and seasons', 'טבע ועונות'),
    prompts: [
      P('The sea in winter', 'הים בחורף'),
      P('Rain on a car roof', 'גשם על גג של מכונית'),
      P('The first cold night of the year', 'הלילה הקר הראשון של השנה'),
      P('A tree that survived a fire', 'עץ ששרד שריפה'),
      P('The desert just before sunrise', 'המדבר רגע לפני הזריחה'),
      P('A storm you watched from inside', 'סערה שראית מבפנים'),
      P('The smell of earth after the first rain', 'ריח האדמה אחרי הגשם הראשון'),
      P('A full moon over a parking lot', 'ירח מלא מעל חניון'),
      P('Wind that won’t stop for three days', 'רוח שלא נרגעת שלושה ימים'),
      P('The last hot day of summer', 'היום החם האחרון של הקיץ'),
    ],
  },
  {
    key: 'city',
    label: P('The city', 'העיר'),
    prompts: [
      P('Your street at four in the afternoon', 'הרחוב שלך בארבע אחר הצהריים'),
      P('A song playing in a shop you walked past', 'שיר שהתנגן בחנות שעברת לידה'),
      P('Traffic lights changing on an empty street', 'רמזור שמתחלף ברחוב ריק'),
      P('A kiosk open all night', 'קיוסק שפתוח כל הלילה'),
      P('Windows lit across the street', 'חלונות מוארים בבניין ממול'),
      P('A Friday afternoon as the city goes quiet', 'שישי בצהריים, כשהעיר משתתקת'),
      P('Graffiti nobody has painted over', 'גרפיטי שאף אחד לא צבע מעליו'),
      P('The sound of the fridge in an empty flat', 'הרעש של המקרר בדירה ריקה'),
      P('A crowded train where nobody looks up', 'רכבת מלאה שבה אף אחד לא מרים את הראש'),
    ],
  },
  {
    key: 'memory',
    label: P('Memory and childhood', 'זיכרון וילדות'),
    prompts: [
      P('The smell of a house you grew up in', 'הריח של הבית שגדלת בו'),
      P('Something you lost and never found', 'משהו שאיבדת ולא מצאת'),
      P('Your first bicycle', 'האופניים הראשונים שלך'),
      P('A summer holiday that felt endless', 'חופש גדול שהרגיש בלי סוף'),
      P('The song that was playing in the car on long trips', 'השיר שהתנגן באוטו בנסיעות ארוכות'),
      P('A friend you lost touch with', 'חבר שאיבדת איתו קשר'),
      P('The hiding place no one ever found', 'המחבוא שאף אחד לא מצא'),
      P('Your parents dancing in the kitchen', 'ההורים שלך רוקדים במטבח'),
      P('The first time you heard your favourite song', 'הפעם הראשונה ששמעת את השיר האהוב עליך'),
      P('A word only your family used', 'מילה שרק במשפחה שלך השתמשו בה'),
    ],
  },
  {
    key: 'love',
    label: P('Love and people close', 'אהבה וקרובים'),
    prompts: [
      P('A wedding from the back row', 'חתונה מהשורה האחרונה'),
      P('A promise made on a beach', 'הבטחה שניתנה על חוף'),
      P('Their side of the bed', 'הצד שלו או שלה במיטה'),
      P('Cooking for two after years of cooking for one', 'לבשל לשניים אחרי שנים של בישול לאחד'),
      P('A voice message you still haven’t deleted', 'הודעה קולית שעדיין לא מחקת'),
      P('An old couple holding hands on a bench', 'זוג זקנים מחזיקים ידיים על ספסל'),
      P('The fight you both knew was coming', 'הריב ששניכם ידעתם שיגיע'),
      P('Seeing an ex in the supermarket', 'לפגוש אקס בסופרמרקט'),
      P('Your child asleep in the back seat', 'הילד שלך ישן במושב האחורי'),
    ],
  },
  {
    key: 'roads',
    label: P('Roads and journeys', 'דרכים ומסעות'),
    prompts: [
      P('A road at the moment the sun goes down', 'כביש ברגע שהשמש שוקעת'),
      P('An airport, someone waving', 'שדה תעופה, מישהו מנופף'),
      P('Leaving a city for good', 'לעזוב עיר לתמיד'),
      P('Hitchhiking with a stranger', 'טרמפ עם זר'),
      P('A border crossing at dawn', 'מעבר גבול עם שחר'),
      P('The last kilometre before home', 'הקילומטר האחרון לפני הבית'),
      P('A night train through a country you don’t know', 'רכבת לילה דרך ארץ שאתה לא מכיר'),
      P('A map with your route drawn in pen', 'מפה עם המסלול שלך מסומן בעט'),
      P('Missing the last boat', 'לפספס את הסירה האחרונה'),
    ],
  },
  {
    key: 'music',
    label: P('Music and stage', 'מוזיקה ובמה'),
    prompts: [
      P('Your hands', 'הידיים שלך'),
      P('The band van at three in the morning', 'הוואן של הלהקה בשלוש לפנות בוקר'),
      P('A sound check in an empty hall', 'בדיקת סאונד באולם ריק'),
      P('The record that changed everything for you', 'התקליט ששינה לך הכל'),
      P('Playing for just one person', 'לנגן בשביל אדם אחד בלבד'),
      P('A song you can’t listen to any more', 'שיר שאתה כבר לא יכול לשמוע'),
      P('The applause that didn’t come', 'מחיאות הכפיים שלא הגיעו'),
      P('A piano in a house where nobody plays', 'פסנתר בבית שאף אחד לא מנגן בו'),
    ],
  },
  {
    key: 'firstline',
    label: P('Start with this line', 'התחילו במשפט'),
    prompts: [
      P('“I left the light on for you.”', '״השארתי לך את האור דולק.״'),
      P('“Nobody told me it would be this quiet.”', '״אף אחד לא אמר לי שיהיה כל כך שקט.״'),
      P('“We were never good at goodbyes.”', '״אף פעם לא היינו טובים בפרידות.״'),
      P('“The coffee went cold an hour ago.”', '״הקפה התקרר כבר לפני שעה.״'),
      P('“This town is smaller than I remember.”', '״העיר הזאת קטנה ממה שאני זוכר.״'),
      P('“I still know your number by heart.”', '״אני עדיין זוכר את המספר שלך בעל פה.״'),
      P('“Tell me again how it ends.”', '״תספר לי שוב איך זה נגמר.״'),
      P('“It was the year the river froze.”', '״זאת הייתה השנה שבה הנהר קפא.״'),
      P('“Don’t wait up.”', '״אל תחכי ערה.״'),
    ],
  },
  {
    key: 'whatif',
    label: P('What if', 'מה אם'),
    prompts: [
      P('What if you could hear what people think for one day?', 'מה אם היית שומע מה אנשים חושבים, ליום אחד?'),
      P('What if the clocks stopped at the best moment of your life?', 'מה אם השעונים היו נעצרים ברגע הכי טוב בחיים שלך?'),
      P('What if you met yourself at twenty?', 'מה אם היית פוגש את עצמך בגיל עשרים?'),
      P('What if the song on the radio was about you?', 'מה אם השיר ברדיו היה עליך?'),
      P('What if you had stayed?', 'מה אם היית נשאר?'),
      P('What if the sea took back everything it ever gave?', 'מה אם הים היה לוקח בחזרה כל מה שאי פעם נתן?'),
      P('What if every lie you told became true?', 'מה אם כל שקר שסיפרת היה הופך לאמת?'),
      P('What if this were the last song anyone heard?', 'מה אם זה היה השיר האחרון שמישהו ישמע?'),
    ],
  },
  {
    key: 'collide',
    label: P('Two worlds collide', 'שני עולמות נפגשים'),
    prompts: [
      P('Love as an old car that still starts', 'אהבה כמו מכונית ישנה שעדיין מניעה'),
      P('Missing someone as a house with one light on', 'געגוע כמו בית עם אור אחד דולק'),
      P('Your heart as a waiting room', 'הלב שלך כחדר המתנה'),
      P('Hope as a weather forecast', 'תקווה כמו תחזית מזג אוויר'),
      P('Memory as a radio between stations', 'זיכרון כמו רדיו בין תחנות'),
      P('A relationship as a building under construction', 'מערכת יחסים כמו בניין בבנייה'),
      P('Time as a tide that leaves things on the sand', 'הזמן כמו גאות שמשאירה דברים על החול'),
      P('Fear as an uninvited guest who knows the house', 'פחד כמו אורח לא מוזמן שמכיר את הבית'),
    ],
  },
];

/** Every prompt, flat, with its world (index into PROMPTS = what the screen keeps). */
export const PROMPTS = WORLDS.flatMap((w) => w.prompts.map((p) => ({ ...p, world: w.key })));

export const DURATIONS = [3, 5, 10]; // minutes

/** A prompt different from the current one (index into PROMPTS), from one world or any (world = null). */
export function nextPrompt(current = -1, rnd = Math.random, world = null) {
  const pool = PROMPTS.map((p, i) => i).filter((i) => !world || PROMPTS[i].world === world);
  const options = pool.length > 1 ? pool.filter((i) => i !== current) : pool;
  return options[Math.floor(rnd() * options.length)] ?? 0;
}

export const worldOf = (key) => WORLDS.find((w) => w.key === key) ?? null;

/**
 * The written text as pieces to choose from: every line, and a long line
 * (a phone writes one paragraph) broken at sentence ends and commas into
 * pieces of a few words. Each piece = { text, line } (line = the source line).
 */
export function pieces(text) {
  const out = [];
  (text ?? '').split('\n').forEach((raw, line) => {
    const t = raw.trim();
    if (!t) return;
    const words = t.split(/\s+/).length;
    if (words <= 12) {
      out.push({ text: t, line });
      return;
    }
    // long: at . ! ? … ; then at commas when still long
    for (const sentence of t.split(/(?<=[.!?…;])\s+/)) {
      const s = sentence.trim();
      if (!s) continue;
      if (s.split(/\s+/).length <= 12) {
        out.push({ text: s, line });
        continue;
      }
      for (const part of s.split(/(?<=,)\s+/)) if (part.trim()) out.push({ text: part.trim(), line });
    }
  });
  return out;
}

export const wordCount = (text) => ((text ?? '').trim() ? text.trim().split(/\s+/).length : 0);
