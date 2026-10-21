// The "what's inside" picture under the install guide (user's choice
// 2026-10-21: the instruments' stage + a tilted phone showing the app, no
// text, no purple backdrop, a soft shadow). One inline SVG, viewBox
// 358 x 450, so it scales as a whole; the instruments are the home cards'
// own art (HomeMenu/instrumentArt.js).
import { INSTRUMENT_ART } from '../components/HomeMenu/instrumentArt';

const ROLE = { R: '#ff6b3d', 3: '#2f7cf6', 5: '#1fa35a', 7: '#8b5cf6' };

/** An art string placed in a box (x, y, w, h) with a transform about its centre. */
function placed(svg, x, y, w, h, transform = '') {
  const inner = svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
  const cx = x + w / 2;
  const cy = y + h / 2;
  return `<g filter="url(#scShadow)"><g transform="translate(${cx} ${cy}) ${transform} translate(${-cx} ${-cy})">${inner}</g></g>`;
}

function chordBox(x, y, w) {
  // G7: 3 2 0 0 0 1 (roles R 3 5 R 3 7)
  const frets = [3, 2, 0, 0, 0, 1];
  const roles = ['R', 3, 5, 'R', 3, 7];
  const COL = 13;
  const ROW = 15;
  const TOP = 16;
  const LEFT = 10;
  const k = w / (LEFT * 2 + COL * 5);
  let s = `<g transform="translate(${x} ${y}) scale(${k})">`;
  for (let i = 0; i < 6; i++) s += `<line x1="${LEFT + i * COL}" x2="${LEFT + i * COL}" y1="${TOP}" y2="${TOP + ROW * 4}" stroke="#8e8e93" stroke-width="${i < 3 ? 1.2 : 0.8}"/>`;
  for (let r = 0; r <= 4; r++) s += `<line x1="${LEFT}" x2="${LEFT + COL * 5}" y1="${TOP + r * ROW}" y2="${TOP + r * ROW}" stroke="${r ? '#c7c7cc' : '#1c1c1e'}" stroke-width="${r ? 0.8 : 3}"/>`;
  frets.forEach((f, i) => {
    const cx = LEFT + i * COL;
    if (f === 0) s += `<circle cx="${cx}" cy="${TOP - 7}" r="3" fill="none" stroke="${ROLE[roles[i]]}" stroke-width="1.4"/>`;
    else s += `<circle cx="${cx}" cy="${TOP + (f - 0.5) * ROW}" r="5.2" fill="${ROLE[roles[i]]}"/>`;
  });
  return s + '</g>';
}

function neck(x, y, w) {
  const k = w / 320;
  let s = `<g transform="translate(${x} ${y}) scale(${k})"><rect x="0" y="4" width="320" height="62" rx="4" fill="url(#scNeck)"/><rect x="0" y="4" width="5" height="62" fill="#f2ead8"/>`;
  for (let f = 1; f <= 7; f++) s += `<line x1="${f * 45}" x2="${f * 45}" y1="4" y2="66" stroke="#c9ccd2" stroke-width="2"/>`;
  [3, 5, 7].forEach((f) => (s += `<circle cx="${f * 45 - 22}" cy="35" r="3.2" fill="#e8e2d0"/>`));
  for (let i = 0; i < 6; i++) s += `<line x1="0" x2="320" y1="${10 + i * 10}" y2="${10 + i * 10}" stroke="#d9dbe0" stroke-width="${0.6 + (5 - i) * 0.25}"/>`;
  [
    [0, 3, 'R'],
    [1, 2, 3],
    [5, 1, 7],
  ].forEach(([str, fr, r]) => (s += `<circle cx="${fr * 45 - 22}" cy="${60 - str * 10}" r="7" fill="${ROLE[r]}" stroke="#fff" stroke-width="1.5"/>`));
  return s + '</g>';
}

function keys(x, y, w) {
  const W = 14;
  const H = 52;
  const whites = 14;
  const lit = [7, 11, 14, 17];
  const wp = [0, 2, 4, 5, 7, 9, 11];
  const k = w / (whites * W);
  let s = `<g transform="translate(${x} ${y}) scale(${k})">`;
  for (let i = 0; i < whites; i++) {
    const pc = wp[i % 7] + 12 * Math.floor(i / 7);
    s += `<rect x="${i * W}" y="0" width="${W - 1}" height="${H}" rx="2" fill="${lit.includes(pc) ? '#34c759' : '#fff'}" stroke="#c7c7cc"/>`;
  }
  for (let i = 0; i < whites; i++) {
    const p = wp[i % 7];
    if ([0, 2, 5, 7, 9].includes(p)) {
      const pc = p + 1 + 12 * Math.floor(i / 7);
      s += `<rect x="${i * W + W * 0.66}" y="0" width="${W * 0.62}" height="${H * 0.6}" rx="1.5" fill="${lit.includes(pc) ? '#1fa35a' : '#1c1c1e'}"/>`;
    }
  }
  return s + '</g>';
}

function phone(x, y) {
  const W = 170;
  const H = 340;
  const sx = 7;
  const sy = 7;
  const sw = W - 14;
  let s = `<g filter="url(#scPhoneShadow)"><g transform="rotate(8 ${x + W / 2} ${y + H / 2}) translate(${x} ${y})">`;
  s += `<rect width="${W}" height="${H}" rx="30" fill="#1c1c1e"/>`;
  s += `<rect x="${sx}" y="${sy}" width="${sw}" height="${H - 14}" rx="24" fill="#fff"/>`;
  s += `<rect x="${W / 2 - 26}" y="13" width="52" height="14" rx="7" fill="#000"/>`;
  s += `<text x="${W / 2}" y="60" text-anchor="middle" font-size="22" font-weight="700" fill="#1c1c1e" font-family="-apple-system,'SF Pro Display','Helvetica Neue',Arial,sans-serif">G7</text>`;
  s += chordBox(W / 2 - 46, 66, 92);
  s += neck(sx + 6, 176, sw - 12);
  s += keys(sx + 8, 214, sw - 16);
  for (let i = 0; i < 4; i++) s += `<rect x="${16 + i * 36}" y="262" width="30" height="6" rx="3" fill="${i === 1 ? '#0a84ff' : '#e5e5ea'}"/>`;
  return s + '</g></g>';
}

const ICONS = {
  tuner: '<path d="M4 16a8 8 0 0 1 16 0"/><path d="m12 16 4-6"/><circle cx="12" cy="16" r="1.5" fill="#fff"/>',
  drums: '<ellipse cx="12" cy="9" rx="8" ry="3"/><path d="M4 9v6c0 1.7 3.6 3 8 3s8-1.3 8-3V9M7 3l3 6M17 3l-3 6"/>',
  ear: '<path d="M8 15c0 2 1.3 3 2.6 3 2.4 0 2.4-3 4.4-4.6A5.5 5.5 0 1 0 6.5 9"/><path d="M10 9a2 2 0 1 1 3 1.7"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>',
};

function orb(cx, cy, key, color) {
  return `<g filter="url(#scSoft)"><circle cx="${cx}" cy="${cy}" r="24" fill="#fff"/><circle cx="${cx}" cy="${cy}" r="20.5" fill="${color}"/><g transform="translate(${cx - 11} ${cy - 11}) scale(${22 / 24})" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[key]}</g></g>`;
}

function bubble(x, y, text) {
  const w = text.length * 9 + 22;
  return `<g filter="url(#scSoft)"><rect x="${x}" y="${y}" width="${w}" height="26" rx="13" fill="#fff"/><text x="${x + w / 2}" y="${y + 18}" text-anchor="middle" font-size="13.5" font-weight="800" fill="#5b2bd6" font-family="-apple-system,'SF Pro Text','Helvetica Neue',Arial,sans-serif">${text}</text></g>`;
}

let cached = null;
export function showcaseSvg() {
  if (cached) return cached;
  const A = INSTRUMENT_ART;
  cached = `<svg viewBox="0 0 358 450" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
<defs>
<filter id="scShadow" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="12" stdDeviation="9" flood-color="#000" flood-opacity=".2"/></filter>
<filter id="scPhoneShadow" x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="0" dy="18" stdDeviation="13" flood-color="#281e5a" flood-opacity=".28"/></filter>
<filter id="scSoft" x="-40%" y="-40%" width="180%" height="200%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#281e5a" flood-opacity=".16"/></filter>
<linearGradient id="scNeck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3a26"/><stop offset="1" stop-color="#3b2416"/></linearGradient>
</defs>
${placed(A.guitar, 18, 22, 120, 268, 'rotate(-18)')}
${placed(A.bass, 226, 14, 110, 268, 'rotate(18)')}
${placed(A.vocal, 154, 18, 64, 138, 'rotate(-6)')}
${phone(138, 120)}
${placed(A.piano, 4, 300, 200, 110, 'scale(1 .85) rotate(-6)')}
${bubble(20, 150, 'C')}
${bubble(54, 236, 'Am7')}
${bubble(304, 100, 'G7')}
${orb(144, 40, 'tuner', '#34c759')}
${orb(304, 424, 'drums', '#ff9500')}
${orb(164, 234, 'ear', '#2f7cf6')}
${orb(214, 84, 'mic', '#ff2d55')}
</svg>`;
  return cached;
}
