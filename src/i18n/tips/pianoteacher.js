// The piano teacher (v1.0.294).
const LRI = '⁦';
const PDI = '⁩';
const L = (s) => LRI + s + PDI;

export const TIPS_PIANOTEACHER = {
  en: {
    // the hello card says it all — no first-visit note on top of it
    'intro.teacher.piano': '',
    'pt.title': 'Piano Teacher',
    'pt.helloEyebrow': 'Your piano teacher',
    'pt.hello': 'Hi — let’s start at the right place',
    'pt.helloText': 'Short lessons in the order piano teachers use (Faber, Alfred, the ABRSM / Trinity grades). Play on a real piano or keyboard and the teacher listens through the microphone — or play the keys on the screen.',
    'pt.startTitle': 'Where do you start?',
    'pt.startText': 'You can change this any time; lessons you finished stay finished.',
    'pt.listen': 'Listen',
    'pt.next': 'Note {n} of {m}: {note}',
    'pt.finger': 'finger {f}',
    'pt.done': 'All {n} played!',
    'pt.hint': 'Play the lit key on the keyboard below — or tap Listen and play it on your piano.',
    'pt.hintMic': 'Listening — play the lit key on your piano. Keys played together must sound together.',
    'pt.doneText': 'Your practice for the coming days is on the teacher’s page. A skill counts as learned when you play it on 2 different days.',
  },
  he: {
    'intro.teacher.piano': '',
    'pt.title': 'מורה לפסנתר',
    'pt.helloEyebrow': 'המורה שלך לפסנתר',
    'pt.hello': 'שלום — בוא נתחיל מהמקום הנכון',
    'pt.helloText': `שיעורים קצרים בסדר שמורים לפסנתר משתמשים בו (פייבר, אלפרד, דרגות ${L('ABRSM')} / ${L('Trinity')}). נגן על פסנתר אמיתי או אורגן והמורה מקשיב דרך המיקרופון — או נגן על הקלידים במסך.`,
    'pt.startTitle': 'מאיפה מתחילים?',
    'pt.startText': 'אפשר לשנות את זה בכל זמן; שיעורים שסיימת נשארים מסומנים.',
    'pt.listen': 'הקשבה',
    'pt.next': 'צליל {n} מתוך {m}: {note}',
    'pt.finger': 'אצבע {f}',
    'pt.done': 'כל ה־{n} נוגנו!',
    'pt.hint': 'נגן את הקליד המואר במקלדת למטה — או הקש „הקשבה” ונגן אותו בפסנתר שלך.',
    'pt.hintMic': 'מקשיב — נגן בפסנתר את הקליד המואר. קלידים שמנגנים יחד צריכים להישמע יחד.',
    'pt.doneText': 'התרגול לימים הקרובים נמצא בעמוד של המורה. מיומנות נחשבת נלמדת כשאתה מנגן אותה ב־2 ימים שונים.',
  },
};
