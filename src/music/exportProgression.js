// Plain-text and PNG export for the current progression — both are pure
// client-side operations (no backend, nothing leaves the device).

function triggerDownload(href, filename) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// "C  G  Am  F" -> a plain-text chord chart, one line per chord plus a
// header line with the key/capo context if there is any — readable as-is
// in a text editor, no markup.
export function progressionToText(progression, { capoFret, soundingKey } = {}) {
  const lines = [];
  if (soundingKey) lines.push(`Key: ${soundingKey}`);
  if (capoFret) lines.push(`Capo: ${capoFret}`);
  if (lines.length) lines.push('');
  lines.push(progression.map((chord) => chord.text).join('  '));
  return lines.join('\n');
}

export function downloadProgressionText(progression, options) {
  const text = progressionToText(progression, options);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, 'progression.txt');
  URL.revokeObjectURL(url);
}

// The Fretboard renders as one self-contained <svg> (Fretboard.jsx) — no
// html2canvas or similar needed, an SVG can be serialized straight to a
// data URL and drawn onto a canvas to rasterize it as PNG. Piano's own
// Stage is DOM-based (divs, not one SVG), so this only covers guitar; the
// caller only offers this button in guitar mode for that reason.
export function downloadFretboardPng() {
  const svg = document.querySelector('.fretboard-svg');
  if (!svg) return false;

  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--fret-wood-dark').trim() || '#241511';
  clone.style.background = bg;
  const svgString = new XMLSerializer().serializeToString(clone);
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

  const viewBox = svg.viewBox.baseVal;
  const scale = 2; // export at 2x for crisper output than the on-screen render
  const width = Math.round((viewBox?.width || svg.clientWidth) * scale);
  const height = Math.round((viewBox?.height || svg.clientHeight) * scale);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      triggerDownload(url, 'fretboard.png');
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  img.src = svgUrl;
  return true;
}

// A URL that fully restores the progression + capo + mode on load (see
// App.jsx's share-link mount effect) — encoded as query params rather than
// a hash so it reads clearly if pasted/inspected.
export function buildShareUrl(progressionText, { capoFret, mode } = {}) {
  const params = new URLSearchParams();
  params.set('p', progressionText);
  if (capoFret) params.set('capo', String(capoFret));
  if (mode && mode !== 'chord') params.set('mode', mode);
  const url = new URL(window.location.href);
  url.search = params.toString();
  return url.toString();
}
