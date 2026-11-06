// The first lesson's animated pictures (curriculum g0-basics, `kind: 'visual'`):
// parts / strings / fingers / fret / neck / diagram / strum. Built from the
// mockups the user approved on the Design canvas; the guitar and hand are the
// user's own photos (logo and background removed) in public/teacher/.
// Pictures are physical objects: drawn LTR in both languages; text is
// translated. Animations loop in CSS; "Again" / "Hear" restart them.
import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { playMidis } from '../../audio/chordPlayer';
import './Basics.css';

const L = (en, he) => ({ en, he });
const OPEN = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
const EM = [40, 47, 52, 55, 59, 64];

function Again({ onClick, label }) {
  return (
    <button type="button" className="tc-btn" onClick={onClick}>
      {label}
    </button>
  );
}

// ---- 1. parts ----------------------------------------------------------------

const PARTS = [
  // [side, x %, y %, title, sub, accent]
  ['r', 49.4, 5.4, L('Head', 'ראש'), L('tuning pegs', 'מפתחות כיוון')],
  ['l', 48, 14.8, L('Nut', 'אוכף'), L('the string starts here', 'המיתר מתחיל כאן')],
  ['r', 48, 24.7, L('Fret', 'שריג'), L('metal strip — press just before it', 'פס המתכת — לוחצים לפניו'), true],
  ['l', 48, 38.5, L('Neck', 'צוואר'), L('the dots help you find your way', 'הנקודות עוזרות להתמצא')],
  ['l', 34.5, 79, L('Bridge', 'גשר'), L('the string ends here', 'המיתר נגמר כאן')],
  ['r', 72, 86, L('Body', 'גוף'), L('strum over the sound hole', 'פורטים מעל הפתח')],
];

function Parts({ tx }) {
  return (
    <div className="tb-parts" dir="ltr">
      <img src="/teacher/guitar-front-v.webp" alt={tx(L('An acoustic guitar', 'גיטרה אקוסטית'))} width="504" height="1297" />
      {PARTS.map(([side, x, y, title, sub, accent], k) => (
        <span key={k} className={'tb-part is-' + side + (accent ? ' is-accent' : '')} style={{ '--x': x + '%', '--y': y + '%', '--d': k * 1.1 + 's' }}>
          <span className="tb-part-line" />
          <span className="tb-part-dot" />
          <span className="tb-part-text" dir="auto">
            {tx(title)}
            <small>{tx(sub)}</small>
          </span>
        </span>
      ))}
    </div>
  );
}

// ---- 2. strings ---------------------------------------------------------------

const STRINGS = [
  [1, 'E', L('high E · thinnest', 'מי · הדק'), 1],
  [2, 'B', L('B', 'סי'), 1.5],
  [3, 'G', L('G', 'סול'), 2],
  [4, 'D', L('D', 'רה'), 3],
  [5, 'A', L('A', 'לה'), 4],
  [6, 'E', L('low E · thickest', 'מי · העבה'), 5],
];

function Strings({ tx, t }) {
  const [n, setN] = useState(0);
  return (
    <>
      <div className="tb-strings" key={n}>
        {STRINGS.map(([num, name, sub, w]) => (
          <div key={num} className="tb-string" style={{ '--d': (6 - num) * 1.2 + 's' }}>
            <span className="tb-num">{num}</span>
            <span className="tb-sname">
              <strong dir="ltr">{name}</strong>
              <small>{tx(sub)}</small>
            </span>
            <span className={'tb-wire' + (num >= 4 ? ' is-wound' : '')} style={{ height: w + 'px' }} />
          </div>
        ))}
      </div>
      <div className="tb-note">
        <span>
          {tx(L('From thick to thin:', 'מהעבה לדק:'))} <strong dir="ltr">E A D G B E</strong>.{' '}
          {tx(L('A sentence that helps:', 'משפט שעוזר לזכור:'))}
        </span>
        <span className="tb-mnemonic" dir="ltr">
          <u>E</u>ddie <u>A</u>te <u>D</u>ynamite, <u>G</u>ood <u>B</u>ye <u>E</u>ddie
        </span>
        <span className="tb-quiet">
          {tx(L('The two E strings are the same note, two octaves apart.', 'שני מיתרי ה־⁦E⁩ הם אותו צליל, בהפרש של שתי אוקטבות.'))}
        </span>
      </div>
      <span className="tc-actions">
        <Again
          label={t('teacher.step.hear')}
          onClick={() => {
            setN(n + 1);
            playMidis(OPEN, 1.2);
          }}
        />
      </span>
    </>
  );
}

// ---- 3. fingers ---------------------------------------------------------------

const FINGERS = [
  [1, 38.7, 7.2, L('index', 'מורה')],
  [2, 58.1, 2, L('middle', 'אמה')],
  [3, 76.5, 8.2, L('ring', 'קמיצה')],
  [4, 95.2, 23.7, L('pinky', 'זרת')],
];

function Fingers({ tx, t }) {
  const [n, setN] = useState(0);
  return (
    <>
      <div className="tb-hand" dir="ltr" key={n}>
        <img src="/teacher/hand-left.webp" alt={tx(L('The left hand', 'כף היד השמאלית'))} width="375" height="388" />
        {FINGERS.map(([num, x, y, name]) => (
          <span key={num} className="tb-finger" style={{ '--x': x + '%', '--y': y + '%', '--d': (num - 1) * 1.5 + 's' }}>
            <span className="tb-finger-name" dir="auto">{tx(name)}</span>
            <span className="tb-finger-num">{num}</span>
          </span>
        ))}
        <span className="tb-thumb">
          <span dir="auto">{tx(L('thumb', 'אגודל'))}</span>
          <span className="tb-thumb-num">T</span>
        </span>
      </div>
      <div className="tb-note">
        <span>
          <strong>{tx(L('The other hand', 'היד השנייה'))}</strong>{' '}
          {tx(L(
            'strums: hold the pick between the thumb and the index finger, with only a small tip showing.',
            'פורטת: מחזיקים את המפרט בין האגודל לאצבע המורה, וקצה קטן ממנו בולט החוצה.'
          ))}
        </span>
        <span className="tb-quiet">
          {tx(L('In chord diagrams and on the app’s neck you will see these numbers inside the dots.', 'בשרטוט אקורד ועל הצוואר באפליקציה תראו את המספרים האלה בתוך העיגולים.'))}
        </span>
      </div>
      <span className="tc-actions">
        <Again label={t('teacher.step.again')} onClick={() => setN(n + 1)} />
      </span>
    </>
  );
}

// ---- 4. where to press --------------------------------------------------------

function Fret({ tx, t }) {
  const [n, setN] = useState(0);
  return (
    <>
      <div className="tb-figure" dir="ltr" key={n}>
        <svg viewBox="0 0 340 250" role="img" aria-label={tx(L('A finger pressing just before the fret', 'אצבע לוחצת לפני השריג'))}>
          <rect x="10" y="30" width="320" height="110" rx="6" fill="#5b3a22" />
          <rect x="10" y="30" width="6" height="110" fill="#f2ead8" />
          <g fill="#d9d9de">
            <rect x="96" y="30" width="5" height="110" />
            <rect x="200" y="30" width="5" height="110" />
            <rect x="296" y="30" width="5" height="110" />
          </g>
          <g className="tb-svg-quiet" fontSize="12" fontWeight="700" textAnchor="middle">
            <text x="56" y="154">1</text>
            <text x="150" y="154">2</text>
            <text x="250" y="154">3</text>
          </g>
          <rect x="172" y="34" width="27" height="102" rx="4" fill="#34c759" opacity="0.28" />
          <rect x="108" y="34" width="56" height="102" rx="4" fill="#ff9500" opacity="0.16" />
          <g stroke="#e8e8ec">
            {[1, 1.3, 1.6, 2, 2.4, 2.8].map((w, k) => (
              <line key={k} x1="16" y1={48 + k * 16} x2="330" y2={48 + k * 16} strokeWidth={w} />
            ))}
          </g>
          <g className="tb-fin">
            <circle cx="186" cy="96" r="15" fill="#f2d3bd" stroke="#c99f86" strokeWidth="2" />
            <text x="186" y="101" fontSize="14" fontWeight="800" textAnchor="middle" fill="#1d1d1f">
              1
            </text>
          </g>
          <circle className="tb-wave" cx="186" cy="96" r="24" fill="none" stroke="#34c759" strokeWidth="2" />
          <circle className="tb-wave is-late" cx="186" cy="96" r="24" fill="none" stroke="#34c759" strokeWidth="2" />
          <g fontSize="12" fontWeight="600" textAnchor="middle">
            <text x="186" y="26" fill="#248a3d">{tx(L('here ✓', 'כאן ✓'))}</text>
            <text x="136" y="12" fill="#c25e00">{tx(L('too far — buzz', 'רחוק — זמזום'))}</text>
            <text x="206" y="12" fill="#d70015" textAnchor="start">{tx(L('on the strip ✗', 'על הפס ✗'))}</text>
          </g>
          <g transform="translate(0 170)">
            <text className="tb-svg-quiet" x="10" y="0" fontSize="11" fontWeight="600" textAnchor="start">
              {tx(L('from the side', 'מהצד'))}
            </text>
            <rect x="10" y="30" width="320" height="18" fill="#5b3a22" />
            <g fill="#a9a9b0">
              <rect x="96" y="22" width="5" height="8" rx="2" />
              <rect x="200" y="22" width="5" height="8" rx="2" />
              <rect x="296" y="22" width="5" height="8" rx="2" />
            </g>
            <path d="M10 14 L 200 20 L 330 14" fill="none" stroke="#8e8e93" strokeWidth="2" />
            <path d="M178 2 c 6 -2 14 -2 18 4 l -4 14 c -4 2 -10 2 -14 -2 z" fill="#f2d3bd" stroke="#c99f86" strokeWidth="1.5" />
            <text className="tb-svg-text" x="250" y="70" fontSize="12" fontWeight="600" textAnchor="middle">
              {tx(L('The string rests on the strip — a clean note', 'המיתר נשען על הפס — הצליל נקי'))}
            </text>
          </g>
        </svg>
      </div>
      <div className="tb-ok">{tx(L('A clean note: E — string 4, fret 2. Press Hear.', 'צליל נקי: ⁦E⁩ — מיתר 4, שריג 2. לחצו שמע.'))}</div>
      <div className="tb-note">
        <span>• {tx(L('Press with the fingertip, almost upright — then it doesn’t touch the next string.', 'לוחצים בקצה האצבע, כמעט אנכית — כך היא לא נוגעת במיתר הסמוך.'))}</span>
        <span>• {tx(L('Press only until the note is clean. Harder just tires the hand.', 'מספיק ללחוץ עד שהצליל נקי. יותר חזק רק מעייף את היד.'))}</span>
      </div>
      <span className="tc-actions">
        <Again
          label={t('teacher.step.hear')}
          onClick={() => {
            setN(n + 1);
            setTimeout(() => playMidis([52]), 1350);
          }}
        />
      </span>
    </>
  );
}

// ---- 5. the neck on screen ----------------------------------------------------

function Neck({ tx, t }) {
  const [n, setN] = useState(0);
  return (
    <>
      <div className="tb-figure tb-neck" dir="ltr" key={n}>
        <svg viewBox="0 0 340 260" role="img" aria-label={tx(L('The app’s neck with E minor', 'הצוואר באפליקציה עם אקורד מי מינור'))}>
          <g className="tb-scr">
            <rect x="20" y="40" width="310" height="150" rx="8" fill="#4a3020" />
            <rect x="20" y="40" width="7" height="150" fill="#f2ead8" />
            <g fill="#cfcfd4">
              <rect x="98" y="40" width="4" height="150" />
              <rect x="176" y="40" width="4" height="150" />
              <rect x="250" y="40" width="4" height="150" />
              <rect x="320" y="40" width="4" height="150" />
            </g>
            <g stroke="#e8e8ec">
              {[1, 1.3, 1.7, 2.1, 2.6, 3.1].map((w, k) => (
                <line key={k} x1="27" y1={55 + k * 24} x2="330" y2={55 + k * 24} strokeWidth={w} />
              ))}
            </g>
            <g className="tb-svg-quiet" fontSize="11" fontWeight="700" textAnchor="middle">
              <text x="62" y="206">1</text>
              <text x="139" y="206">2</text>
              <text x="214" y="206">3</text>
              <text x="286" y="206">4</text>
              <text x="170" y="222" fontWeight="600">{tx(L('fret numbers', 'מספרי השריגים'))}</text>
            </g>
            <g className="tb-dot">
              <circle cx="139" cy="151" r="11" fill="var(--accent-fill)" />
              <text x="139" y="155.5" fontSize="12" fontWeight="800" fill="#fff" textAnchor="middle">2</text>
            </g>
            <g className="tb-dot is-late">
              <circle cx="139" cy="127" r="11" fill="var(--accent-fill)" />
              <text x="139" y="131.5" fontSize="12" fontWeight="800" fill="#fff" textAnchor="middle">3</text>
            </g>
            <g className="tb-tag tb-svg-text" fontSize="12" fontWeight="700">
              <text x="336" y="32" textAnchor="end">{tx(L('string 1 · thin ↑', 'מיתר 1 · הדק ↑'))}</text>
              <text x="20" y="252">{tx(L('↑ head of the guitar', '↑ ראש הגיטרה'))}</text>
              <text x="336" y="252" textAnchor="end">{tx(L('string 6 · thick ↓', 'מיתר 6 · העבה ↓'))}</text>
            </g>
          </g>
        </svg>
        <div className="tb-lap">
          <img src="/teacher/guitar-front.webp" alt={tx(L('An acoustic guitar', 'גיטרה אקוסטית'))} width="1297" height="504" />
          <span dir="auto">{tx(L('Looking down at the guitar…', 'מביטים על הגיטרה מלמעלה…'))}</span>
        </div>
      </div>
      <div className="tb-note">
        <span>
          <strong>{tx(L('A blue dot', 'עיגול כחול'))}</strong> = {tx(L('press there.', 'לחצו שם.'))}{' '}
          <strong>{tx(L('The number in it', 'המספר בתוכו'))}</strong> = {tx(L('which finger.', 'איזו אצבע.'))}
        </span>
        <span>
          {tx(L(
            'In the example, E minor (Em): finger 2 on string 5 and finger 3 on string 4, both at fret 2.',
            'בדוגמה: האקורד מי מינור (⁦Em⁩) — אצבע 2 על מיתר 5 ואצבע 3 על מיתר 4, שתיהן בשריג 2.'
          ))}
        </span>
        <span className="tb-quiet">
          {tx(L('Left-handed? Settings → Display → Playing hand, and the neck flips.', 'נגנים שמאליים: בהגדרות ← תצוגה ← יד נגינה, והצוואר מתהפך.'))}
        </span>
      </div>
      <span className="tc-actions">
        <Again label={t('teacher.step.again')} onClick={() => setN(n + 1)} />
      </span>
    </>
  );
}

// ---- 6. chord diagram ---------------------------------------------------------

function Diagram({ tx, t }) {
  const [n, setN] = useState(0);
  const items = [
    [L('Upright lines', 'קווים עומדים'), L('= the strings. The left one is string 6, the thick one.', '= המיתרים. השמאלי הוא מיתר 6, העבה.')],
    [L('Lying lines', 'קווים שוכבים'), L('= the frets. The thick line at the top is the nut.', '= השריגים. הקו העבה למעלה הוא האוכף.')],
    [L('A dot with a number', 'עיגול עם מספר'), L('= where to press, and with which finger.', '= איפה לוחצים ואיזו אצבע.')],
    [L('O above a string', 'O מעל מיתר'), L('= play it open. X = don’t play it.', '= מנגנים אותו פתוח. X = לא מנגנים אותו.')],
  ];
  return (
    <>
      <div className="tb-figure" dir="ltr" key={n}>
        <svg viewBox="0 0 340 240" role="img" aria-label={tx(L('The E minor chord diagram', 'שרטוט האקורד מי מינור'))}>
          <g className="tb-turn">
            <rect x="60" y="80" width="220" height="80" rx="6" fill="#4a3020" />
            <rect x="60" y="80" width="6" height="80" fill="#f2ead8" />
            <g fill="#cfcfd4">
              <rect x="120" y="80" width="3" height="80" />
              <rect x="180" y="80" width="3" height="80" />
              <rect x="240" y="80" width="3" height="80" />
            </g>
            <g stroke="#e8e8ec">
              {[1, 1.3, 1.6, 2, 2.4, 2.8].map((w, k) => (
                <line key={k} x1="66" y1={88 + k * 13} x2="280" y2={88 + k * 13} strokeWidth={w} />
              ))}
            </g>
            <circle cx="151" cy="140" r="7" fill="var(--accent-fill)" />
            <circle cx="151" cy="127" r="7" fill="var(--accent-fill)" />
          </g>
          <g className="tb-box tb-svg-ink">
            <text x="170" y="22" fontSize="18" fontWeight="800" textAnchor="middle">Em</text>
            <g fontSize="13" fontWeight="700" textAnchor="middle">
              <text x="120" y="44">O</text>
              <text x="192" y="44">O</text>
              <text x="216" y="44">O</text>
              <text x="240" y="44">O</text>
            </g>
            <rect x="118" y="50" width="124" height="6" />
            <g strokeWidth="1.4" className="tb-svg-stroke">
              {[120, 144, 168, 192, 216, 240].map((x) => (
                <line key={x} x1={x} y1="56" x2={x} y2="206" />
              ))}
            </g>
            <g strokeWidth="1.2" className="tb-svg-stroke is-quiet">
              {[94, 132, 170, 206].map((y) => (
                <line key={y} x1="120" y1={y} x2="240" y2={y} />
              ))}
            </g>
            <circle cx="144" cy="113" r="10" fill="var(--accent-fill)" />
            <text x="144" y="117.5" fontSize="12" fontWeight="800" fill="#fff" textAnchor="middle">2</text>
            <circle cx="168" cy="113" r="10" fill="var(--accent-fill)" />
            <text x="168" y="117.5" fontSize="12" fontWeight="800" fill="#fff" textAnchor="middle">3</text>
            <g className="tb-svg-quiet" fontSize="10.5" fontWeight="700" textAnchor="middle">
              {[6, 5, 4, 3, 2, 1].map((s, k) => (
                <text key={s} x={120 + k * 24} y="224">{s}</text>
              ))}
            </g>
            <g className="tb-svg-quiet" fontSize="10" fontWeight="600">
              <text x="96" y="236" textAnchor="start">{tx(L('thick', 'עבה'))}</text>
              <text x="262" y="236" textAnchor="end">{tx(L('thin', 'דק'))}</text>
            </g>
          </g>
        </svg>
      </div>
      <div className="tb-note" key={'i' + n}>
        {items.map(([a, b], k) => (
          <span key={k} className="tb-item" style={{ '--d': k * 0.4 + 's' }}>
            <strong>{tx(a)}</strong> {tx(b)}
          </span>
        ))}
        <span className="tb-item tb-quiet" style={{ '--d': '1.6s' }}>
          {tx(L('“5fr” next to a diagram = it starts at fret 5, not at the nut.', '„⁦5fr⁩” ליד השרטוט = השרטוט מתחיל בשריג 5, לא באוכף.'))}
        </span>
      </div>
      <span className="tc-actions">
        <Again
          label={t('teacher.step.hear')}
          onClick={() => {
            setN(n + 1);
            setTimeout(() => playMidis(EM), 4300);
          }}
        />
      </span>
    </>
  );
}

// ---- 7. strumming -------------------------------------------------------------

// ↓ · ↓ ↑ · ↑ ↓ ↑ on 1 & 2 & 3 & 4 &
const PATTERN = ['d', '', 'd', 'u', '', 'u', 'd', 'u'];

function Strum({ tx }) {
  const { lang } = useLanguage();
  const [slow, setSlow] = useState(false);
  const and = lang === 'he' ? 'ו' : '&';
  return (
    <>
      <div className={'tb-strum' + (slow ? ' is-slow' : '')} dir="ltr">
        <svg viewBox="0 0 150 210" width="150" role="img" aria-label={tx(L('A pick moving down and up across the strings', 'מפרט נע למטה ולמעלה על המיתרים'))}>
          <g className="tb-svg-quiet" fontSize="10" fontWeight="700">
            <text x="4" y="40">6</text>
            <text x="4" y="184">1</text>
          </g>
          <g stroke="#8e8e93">
            {[3, 2.5, 2, 1.6, 1.2, 0.9].map((w, k) => (
              <line key={k} x1="18" y1={36 + k * 29} x2="146" y2={36 + k * 29} strokeWidth={w} />
            ))}
          </g>
          <g className="tb-pick">
            <path d="M70 16 l16 0 l-8 18 z" fill="#ff9500" stroke="#c25e00" strokeWidth="1.5" />
          </g>
        </svg>
        <span className="tb-strum-note" dir="auto">
          {tx(L(
            'Here the guitar stands as in your lap: the thick string (6) on top, nearest the ceiling, the thin one (1) at the bottom. The pick moves at the exercise’s pace.',
            'כאן הגיטרה עומדת כמו בחיקך: המיתר העבה (6) למעלה, קרוב לתקרה, והדק (1) למטה. המפרט נע בקצב התרגיל.'
          ))}
        </span>
      </div>
      <div className="tb-note">
        <strong dir="auto">{tx(L('The first rhythm: ↓ ↓↑ ↑↓↑', 'הקצב הראשון: ↓ ↓↑ ↑↓↑'))}</strong>
        <div className={'tb-slots' + (slow ? ' is-slow' : '')} dir="ltr">
          {PATTERN.map((p, k) => (
            <span key={k} className={'tb-slot' + (p ? '' : ' is-rest')} style={{ '--k': k }}>
              <span className="tb-slot-arrow">{p === 'd' ? '↓' : p === 'u' ? '↑' : '·'}</span>
              <span className="tb-slot-count">{k % 2 ? and : k / 2 + 1}</span>
            </span>
          ))}
        </div>
        <span>
          {tx(L(
            'Count “1 & 2 & 3 & 4 &”. On a grey dot the hand keeps moving but doesn’t touch the strings.',
            'סופרים „1 ו 2 ו 3 ו 4 ו”. בנקודה האפורה היד ממשיכה לזוז, רק לא נוגעת במיתרים.'
          ))}
        </span>
      </div>
      <span className="tc-actions">
        <button type="button" className={'tc-btn' + (slow ? ' is-on' : '')} aria-pressed={slow} onClick={() => setSlow(!slow)}>
          {tx(L('Slow', 'איטי'))}
        </button>
      </span>
    </>
  );
}

const VISUALS = { parts: Parts, strings: Strings, fingers: Fingers, fret: Fret, neck: Neck, diagram: Diagram, strum: Strum };

export function BasicsVisual({ name, tx }) {
  const { t } = useLanguage();
  const V = VISUALS[name];
  return V ? (
    <div className="tb-visual">
      <V tx={tx} t={t} />
    </div>
  ) : null;
}
