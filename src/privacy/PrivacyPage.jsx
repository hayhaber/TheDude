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
  updated: 'עודכן לאחרונה: 28 בנובמבר 2026',
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
            <b>קובצי ⁦Guitar Pro⁩ / ⁦MusicXML⁩ שתוסיף ב־⁦GuitarPro⁩ כשאתה מחובר</b> נשמרים בחשבון שלך, גלויים רק לך, כדי שיגיעו לכל המכשירים שלך.{' '}
            <b>צ׳ארטים (קובצי ⁦PDF⁩) שתוסיף במסך ״במה״ כשאתה מחובר</b> נשמרים בענן כדי שיגיעו לכל המכשירים שלך. צ׳ארט ורשימת שירים שתוסיף ללהקה גלויים לחברי אותה להקה בלבד (מי שהצטרף עם קוד ההזמנה שלה), יחד עם השם שבחרת בפרופיל ותמונת הפרופיל שבחרת (צבע או אמוג׳י). מי שמנהל להקה יכול להסיר ממנה חברים ולמחוק אותה, וכל חבר יכול לצאת ממנה. תמונה של צ׳ארט הופכת לקובץ ⁦PDF⁩ במכשיר עצמו. צ׳ארט שמוסיפים מקישור עובר דרך השרת של האפליקציה רק כדי להוריד אותו — הקישור והקובץ לא נשמרים שם. כשמנגנים יחד (״אני מוביל״ / ״עוקב״), המכשירים של חברי הלהקה מעבירים זה לזה בזמן אמת איזה שיר מוצג, היכן הגלילה והשם שבפרופיל — דרך שירות הזמן האמת של Supabase, בלי לשמור דבר. לשיר אפשר לצרף קישור להאזנה (YouTube‏, Spotify‏, Apple Music) — הוא נשמר עם השיר וגלוי לחברי הלהקה. כשמשמיעים אותו בתוך האפליקציה, הנגן נטען ישירות מאותו שירות, ותנאי הפרטיות שלו חלים עליו. כשמחפשים שיר לפי שם, מה שהקלדת נשלח דרך השרת של האפליקציה לחיפוש של Apple Music (ולאחר בחירה — של YouTube), בלי שנשמר שם. הערות שכותבים על שיר של להקה — וגם שינוי סולם, קצב או אורך שנרשם בהן מעצמו — נשמרות בענן וגלויות לחברי הלהקה, עם השם שבפרופיל. הקלטה של חזרה על שיר של להקה (טייק) עולה לענן כקובץ שמע וגלויה לחברי הלהקה בלבד, עם השם שבפרופיל; מי שהקליט אותה או מנהל הלהקה יכולים למחוק אותה. הקלטות חזרה של שירים שלך בלבד עולות לענן לחשבון שלך ורק אתה רואה אותן. טייק נשמר במכשיר רק עד שהוא עולה, ואז העותק במכשיר נמחק. צ׳ארט סרוק או מצולם (בלי טקסט) נשלח, כשאתה מחובר, כתמונות של העמודים דרך השרת של האפליקציה לשירות הבינה המלאכותית של Anthropic (Claude), שמחזיר את המילים והאקורדים; שום דבר לא נשמר בשרת שלנו. קופת הלהקה היא רישום בלבד — סכומים, תאריכים ומי הפקיד — היא נשמרת בענן וגלויה לחברי הלהקה; שום תשלום אינו עובר דרך האפליקציה. עטיפות האלבום שליד שירי קאבר נמצאות לפי שם השיר והאמן דרך החיפוש של Apple Music ונטענות ישירות מהשרתים של Apple. כדי שהמילים יעקבו אחרי ההקלטה, שם השיר והאמן נשלחים דרך השרת של האפליקציה לארכיון התזמונים הציבורי LRCLIB; נשמרים רק הזמנים של השורות, יחד עם השיר, וגלויים לחברי הלהקה.
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
  updated: 'Last updated: 28 November 2026',
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
            <b>Guitar Pro / MusicXML files you add in GuitarPro while signed in</b> are stored in your account, visible only to you, so they reach all your devices.{' '}
            <b>Charts (PDF files) you add to Stage while signed in</b> are stored in the cloud so they reach all your devices. A chart or setlist you add to a band is visible only to that band’s members (people who joined with its invite code), together with the name and the avatar (colour or emoji) you chose for your profile. A band’s manager can remove members and delete the band; any member can leave it. A photo of a chart is turned into a PDF on the device itself. A chart added from a link passes through the app’s server only to be downloaded — neither the link nor the file is kept there. When you play together (“I lead” / “Follow”), the band members’ devices pass each other, live, which song is shown, where the scroll is and your profile name — through Supabase’s realtime service, with nothing stored. A song can carry a listening link (YouTube, Spotify, Apple Music) — it is saved with the song and visible to the band’s members. When you play it inside the app, the player is loaded directly from that service, and its own privacy terms apply. When you search for a song by name, what you typed passes through the app’s server to Apple Music’s search (and, once you choose a song, YouTube’s), without being kept there. Notes written on a band song — and a key, tempo or length change logged in them by itself — are stored in the cloud and visible to the band’s members, with your profile name. A rehearsal recording (take) of a band song is uploaded to the cloud as an audio file and is visible only to the band’s members, with your profile name; whoever recorded it or the band’s manager can delete it. Rehearsal recordings of your own songs are uploaded to your account and only you can see them. A take is kept on the device only until it is up; then the copy on the device is deleted. A scanned or photographed chart (with no text) is sent, while you’re signed in, as pictures of its pages through the app’s server to Anthropic’s AI service (Claude), which returns the words and chords; nothing is kept on our server. The band’s kitty is a record only — amounts, dates and who put money in — stored in the cloud and visible to the band’s members; no payment passes through the app. Album covers shown beside cover songs are found by the song’s title and artist through Apple Music’s search and load directly from Apple’s servers. So the words can follow the recording, the song’s title and artist pass through the app’s server to LRCLIB, a public archive of lyrics timings; only the lines’ times are kept, with the song, visible to the band’s members.
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
