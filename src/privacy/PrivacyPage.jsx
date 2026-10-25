// /privacy — the privacy policy (Hebrew + English), required for Google
// sign-in's consent screen and linked from Settings -> "Your account".
// Text approved by the user 2026-10-25 (no operator name: contact by email;
// minors with a parent's consent). Keep it true to what the app does.
import { LanguageToggle } from '../components/LanguageToggle/LanguageToggle';
import { useLanguage } from '../i18n/LanguageContext';
import './PrivacyPage.css';

const MAIL = 'dudestar365@gmail.com';
const Mail = () => (
  <bdi className="privacy-ltr">
    <a href={`mailto:${MAIL}`}>{MAIL}</a>
  </bdi>
);

const HE = {
  title: 'מדיניות פרטיות',
  updated: 'עודכן לאחרונה: 25 באוקטובר 2026',
  back: 'חזרה',
  sections: [
    ['1. מי אנחנו', <>DudeStar (״האפליקציה״) היא אפליקציית אינטרנט ללימוד ולתרגול נגינה ושירה, בכתובת <bdi className="privacy-ltr">the-dude.vercel.app</bdi>. בכל נושא אפשר לפנות אלינו בכתובת <Mail />.</>],
    ['2. שימוש בלי חשבון', 'אפשר להשתמש באפליקציה בלי להירשם. במצב הזה ההגדרות, ההתקדמות, התוצאות וההקלטות נשמרים רק בדפדפן שבמכשיר שלך, ואינם נשלחים אלינו.'],
    ['3. המיקרופון', 'תכונות כמו הטיונר, תרגילי השירה, זיהוי האקורדים וההקלטה משתמשות במיקרופון רק לאחר שתאשר זאת בדפדפן. הצליל מעובד במכשיר שלך בלבד — איננו מעלים אותו לשרת ואיננו שומרים אותו. הקלטות שתבחר לשמור נשמרות במכשיר שלך בלבד.'],
    [
      '4. חשבון וסנכרון בין מכשירים',
      <>
        <p>פתיחת חשבון היא רשות, והיא מאפשרת להשתמש באותם נתונים בטלפון, בטאבלט ובמחשב. אם תפתח חשבון, יישמרו:</p>
        <ul>
          <li>
            <b>פרטי החשבון:</b> כתובת האימייל; אם נכנסת עם ⁦Google⁩ — גם השם ותמונת הפרופיל ש־⁦Google⁩ מעבירה; אם נרשמת עם סיסמה — הסיסמה נשמרת בצורה מוצפנת חד־כיוונית בלבד, ואיננו יכולים לראות אותה.
          </li>
          <li>
            <b>נתוני התרגול שמסונכרנים:</b> הגדרות (כמו יד מנגנת וצלילים), התקדמות בתרגילים ובקורסים, תוצאות והיסטוריית תרגול, טווח קולי, ומהלכים ותבניות ששמרת.
          </li>
          <li>
            <b>הקלטות אינן מסונכרנות</b> ונשארות במכשיר.
          </li>
        </ul>
        <p>המידע משמש רק כדי לספק לך את החשבון והסנכרון. איננו מוכרים אותו, איננו משתמשים בו לפרסום, ואיננו מעבירים אותו לאיש מלבד ספקי השירות שבסעיף 5.</p>
      </>,
    ],
    [
      '5. ספקי שירות',
      <>
        <ul>
          <li>
            <b>⁦Supabase⁩</b> — אחסון החשבון והנתונים המסונכרנים, בשרתים באירלנד (האיחוד האירופי).
          </li>
          <li>
            <b>⁦Google⁩</b> — כניסה עם חשבון ⁦Google⁩, ושליחת מיילי האימות דרך ⁦Gmail⁩.
          </li>
          <li>
            <b>⁦Vercel⁩</b> — אירוח האתר; עשויה לרשום ביומני השרת כתובת ⁦IP⁩ ונתונים טכניים.
          </li>
          <li>
            <b>שירותי תוכן</b> — קובצי צליל של כלי הנגינה נטענים מ־⁦GitHub Pages⁩ ומאתרים נוספים המספקים דגימות צליל; סרטוני ⁦YouTube⁩, אם תבחר להשתמש בהם, נטענים מ־⁦YouTube⁩ וכפופים למדיניות הפרטיות של ⁦Google⁩. שירותים אלה עשויים לראות את כתובת ה־⁦IP⁩ שלך.
          </li>
        </ul>
        <p>איננו משתמשים בכלי מדידה (אנליטיקה) או פרסום.</p>
      </>,
    ],
    ['6. כמה זמן נשמר המידע, ואיך מוחקים', 'המידע נשמר כל עוד החשבון קיים. אפשר למחוק את החשבון בכל עת: הגדרות ← ״החשבון שלך״ ← ״מחיקת החשבון״. המחיקה מסירה מיד מהשרת את החשבון ואת כל הנתונים המסונכרנים; עותקי גיבוי אצל ספק האחסון, אם קיימים, נמחקים במחזור הגיבוי הרגיל שלו. הנתונים שבמכשיר שלך נשארים בו עד שתמחק אותם.'],
    ['7. הזכויות שלך', <>אתה רשאי לעיין במידע שנשמר עליך, לבקש לתקנו ולבקש למחקו — לפי חוק הגנת הפרטיות, התשמ״א־1981, ולמשתמשים באיחוד האירופי גם לפי ה־⁦GDPR⁩. פניות: <Mail />.</>],
    ['8. אבטחה', 'התקשורת עם האפליקציה מוצפנת (⁦HTTPS⁩), ובשרת כל משתמש יכול לגשת רק לנתונים שלו. אף מערכת אינה חסינה לחלוטין, ולכן מומלץ לבחור סיסמה שאינך משתמש בה במקום אחר.'],
    ['9. קטינים', 'השימוש באפליקציה בלי חשבון פתוח לכולם. פתיחת חשבון על ידי קטין (מתחת לגיל 18) — בהסכמת הורה.'],
    ['10. שינויים במדיניות', 'עדכונים למדיניות יפורסמו בדף זה, עם תאריך העדכון.'],
  ],
};

const EN = {
  title: 'Privacy Policy',
  updated: 'Last updated: 25 October 2026',
  back: 'Back',
  sections: [
    ['1. Who we are', <>DudeStar (“the app”) is a web app for learning and practising music, at the-dude.vercel.app. For any matter, contact us at <Mail />.</>],
    ['2. Using the app without an account', 'You can use the app without signing up. In that case your settings, progress, results and recordings stay only in the browser on your device and are not sent to us.'],
    ['3. Microphone', 'The tuner, singing exercises, chord detection and recorder use the microphone only after you allow it in your browser. Audio is processed on your device only — we do not upload or store it. Recordings you choose to save stay on your device.'],
    [
      '4. Account and sync',
      <>
        <p>An account is optional; it lets you use the same data on your phone, tablet and computer. If you create one, we store:</p>
        <ul>
          <li>
            <b>Account details:</b> your email address; with Google sign-in also the name and profile picture Google provides; with a password, only a one-way hash of it — we cannot see it.
          </li>
          <li>
            <b>Practice data you sync:</b> settings (such as playing hand and sounds), progress in exercises and courses, results and practice history, vocal range, and saved progressions and patterns.
          </li>
          <li>
            <b>Recordings are not synced</b> and stay on your device.
          </li>
        </ul>
        <p>We use this data only to provide your account and sync. We do not sell it, do not use it for advertising, and do not share it with anyone except the service providers in section 5.</p>
      </>,
    ],
    [
      '5. Service providers',
      <>
        <ul>
          <li>
            <b>Supabase</b> — stores your account and synced data, on servers in Ireland (EU).
          </li>
          <li>
            <b>Google</b> — sign-in with Google, and sending verification emails through Gmail.
          </li>
          <li>
            <b>Vercel</b> — hosts the website; may log IP addresses and technical data.
          </li>
          <li>
            <b>Content services</b> — instrument sound samples load from GitHub Pages and other sample hosts; YouTube videos, if you choose to use them, load from YouTube and are subject to Google’s privacy policy. These services may see your IP address.
          </li>
        </ul>
        <p>We use no analytics and no advertising tools.</p>
      </>,
    ],
    ['6. Retention and deletion', 'Data is kept as long as your account exists. You can delete your account at any time in Settings → “Your account” → “Delete account”. This immediately removes the account and all synced data from our server; backup copies held by the hosting provider, if any, are removed in its normal backup cycle. Data on your device stays there until you remove it.'],
    ['7. Your rights', <>You may access the data we hold about you and ask us to correct or delete it — under Israel’s Protection of Privacy Law, 5741-1981, and, for users in the EU, the GDPR. Contact: <Mail />.</>],
    ['8. Security', 'Communication with the app is encrypted (HTTPS), and on the server each user can access only their own data. No system is completely secure, so use a password you don’t use anywhere else.'],
    ['9. Minors', 'Anyone may use the app without an account. A minor (under 18) may create an account with a parent’s consent.'],
    ['10. Changes', 'Updates to this policy will be posted on this page with the date of the update.'],
  ],
};

export function PrivacyPage({ onBack }) {
  const { lang } = useLanguage();
  const c = lang === 'he' ? HE : EN;
  return (
    <div className="privacy-page" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <main className="privacy-card">
        <div className="privacy-top">
          <button type="button" className="privacy-back" onClick={onBack}>
            <span aria-hidden="true">{lang === 'he' ? '›' : '‹'}</span> {c.back}
          </button>
          <div className="privacy-lang">
            <LanguageToggle />
          </div>
        </div>
        <img className="privacy-icon" src="/pwa-192.png" alt="" width="56" height="56" />
        <h1>{c.title}</h1>
        <p className="privacy-updated">{c.updated}</p>
        {c.sections.map(([h, body]) => (
          <section key={h}>
            <h2>{h}</h2>
            {typeof body === 'string' ? <p>{body}</p> : body}
          </section>
        ))}
      </main>
    </div>
  );
}
