// Timed free writing for the Songwriter (v1.0.163). The method: write
// without stopping for a set time, never judge or fix while writing, then
// read it back and keep only the "diamonds" — Pat Pattison's object writing
// (Berklee), Jeff Tweedy's daily practice ("How to Write One Song"), Bernie
// Taupin's early "brain-to-pencil freeform" lyrics. Prompts are objects and
// moments to dive into with every sense (Pattison: sight, sound, smell, taste,
// touch, the body inside, the body in space). Text is our own. Pure.

const P = (en, he) => ({ en, he });

export const PROMPTS = [
  P('An old key you no longer know what it opens', 'מפתח ישן שכבר לא ידוע מה הוא פותח'),
  P('The kitchen window at six in the morning', 'חלון המטבח בשש בבוקר'),
  P('A bus station after the last bus', 'תחנת אוטובוס אחרי האוטובוס האחרון'),
  P('Your father’s watch', 'השעון של אבא שלך'),
  P('The sea in winter', 'הים בחורף'),
  P('A phone screen lighting up at 2 a.m.', 'מסך טלפון שנדלק בשתיים בלילה'),
  P('Rain on a car roof', 'גשם על גג של מכונית'),
  P('An empty stage after the show', 'במה ריקה אחרי ההופעה'),
  P('A letter you never sent', 'מכתב שלא שלחת'),
  P('The smell of a house you grew up in', 'הריח של הבית שגדלת בו'),
  P('A hospital corridor at night', 'מסדרון של בית חולים בלילה'),
  P('Two cups on a table, one still full', 'שתי כוסות על שולחן, אחת עדיין מלאה'),
  P('A road at the moment the sun goes down', 'כביש ברגע שהשמש שוקעת'),
  P('A door you closed too hard', 'דלת שטרקת חזק מדי'),
  P('The first cold night of the year', 'הלילה הקר הראשון של השנה'),
  P('A photo with someone cut out of it', 'תמונה שמישהו נחתך ממנה'),
  P('Your hands', 'הידיים שלך'),
  P('A song playing in a shop you walked past', 'שיר שהתנגן בחנות שעברת לידה'),
  P('An airport, someone waving', 'שדה תעופה, מישהו מנופף'),
  P('The last message in a chat', 'ההודעה האחרונה בצ׳אט'),
  P('A balcony in summer, the city still awake', 'מרפסת בקיץ, העיר עוד ערה'),
  P('Something you lost and never found', 'משהו שאיבדת ולא מצאת'),
  P('A coat that still smells of someone', 'מעיל שעדיין מריח ממישהו'),
  P('The moment before you say it', 'הרגע לפני שאומרים את זה'),
  P('A wedding from the back row', 'חתונה מהשורה האחרונה'),
  P('Your street at four in the afternoon', 'הרחוב שלך בארבע אחר הצהריים'),
  P('A guitar with one broken string', 'גיטרה עם מיתר אחד קרוע'),
  P('The sound of the fridge in an empty flat', 'הרעש של המקרר בדירה ריקה'),
  P('A promise made on a beach', 'הבטחה שניתנה על חוף'),
  P('Leaving a city for good', 'לעזוב עיר לתמיד'),
];

export const DURATIONS = [3, 5, 10]; // minutes

/** A prompt different from the current one (index into PROMPTS). */
export function nextPrompt(current = -1, rnd = Math.random) {
  if (PROMPTS.length < 2) return 0;
  let i = current;
  while (i === current) i = Math.floor(rnd() * PROMPTS.length);
  return i;
}

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
