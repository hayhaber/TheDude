import { useEffect, useRef } from 'react';
import { getAudioContext } from '../../audio/audioContext';
import { targetAt } from '../../music/vocal/exercises';
import { midiName } from '../../music/vocal/voiceRange';
import { centsOff, tolerance } from '../../music/vocal/vocalAnalysis';

// The voice drawn over the notes: target bars (one semitone tall = the
// "in tune" band) on a piano-roll grid, a playhead while singing, and the
// sung pitch as a line coloured by how close it is — green in tune, amber
// close, red off. After a round, each bar takes the colour of its result
// and shows how many cents it was off.

const COLORS = { good: '#30c25a', ok: '#ff9f0a', off: '#ff453a' };

function readTheme(el) {
  const cs = getComputedStyle(el);
  const v = (n, d) => cs.getPropertyValue(n).trim() || d;
  return {
    text: v('--text-secondary', '#6e6e73'),
    grid: v('--divider', 'rgba(0,0,0,0.1)'),
    accent: v('--accent', '#0071e3'),
    bar: v('--vocal-bar', 'rgba(0,113,227,0.22)'),
    barEdge: v('--vocal-bar-edge', 'rgba(0,113,227,0.55)'),
  };
}

export function PitchRoll({ viewRef, framesRef, level }) {
  const canvasRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      sizeRef.current = { w, h, dpr };
    });
    ro.observe(canvas);
    let raf = null;
    let theme = readTheme(canvas);
    let themeAt = 0;
    const tol = tolerance(level);

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const { w, h, dpr } = sizeRef.current;
      if (!w || !h) return;
      const ctx2 = canvas.getContext('2d');
      const now = performance.now();
      if (now - themeAt > 1000) {
        theme = readTheme(canvas);
        themeAt = now;
      }
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx2.clearRect(0, 0, w, h);
      const v = viewRef.current;
      const rep = v.rep;
      if (!rep) return;

      // Pitch window around the round's notes (at least 14 semitones).
      let lo = Infinity;
      let hi = -Infinity;
      for (const n of rep.targets) {
        for (const m of n.glide ? n.glide.map((p) => p[1]) : [n.midi]) {
          lo = Math.min(lo, m);
          hi = Math.max(hi, m);
        }
      }
      const pad = Math.max(3, (14 - (hi - lo)) / 2);
      const pLo = Math.floor(lo - pad);
      const pHi = Math.ceil(hi + pad);
      const left = 44;
      const tStart = -0.35;
      const tEnd = rep.length + 0.45;
      const x = (t) => left + ((t - tStart) / (tEnd - tStart)) * (w - left - 8);
      const y = (m) => 8 + ((pHi - m) / (pHi - pLo)) * (h - 16);
      const semi = (h - 16) / (pHi - pLo);

      // Grid: a line per semitone, labels on natural notes.
      ctx2.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx2.textBaseline = 'middle';
      for (let m = pLo; m <= pHi; m += 1) {
        const name = midiName(m);
        const natural = !name.includes('#') && !name.includes('b');
        ctx2.strokeStyle = theme.grid;
        ctx2.globalAlpha = name.startsWith('C') && !name.startsWith('C#') ? 1 : natural ? 0.55 : 0.25;
        ctx2.beginPath();
        ctx2.moveTo(left, y(m));
        ctx2.lineTo(w - 4, y(m));
        ctx2.stroke();
        ctx2.globalAlpha = 1;
        if (natural && semi >= 9) {
          ctx2.fillStyle = theme.text;
          ctx2.fillText(name, 6, y(m));
        }
      }

      const singing = v.phase === 'sing';
      const showResult = v.last?.result && (v.phase === 'gap' || v.phase === 'done');
      const resultNotes = showResult ? v.last.result.notes : null;

      // Target bars / slide lines.
      rep.targets.forEach((n, i) => {
        const res = resultNotes?.[i];
        const color = res ? (res.good ? COLORS.good : res.hit ? COLORS.ok : COLORS.off) : null;
        ctx2.globalAlpha = v.phase === 'cue' ? 0.55 : 1;
        if (n.glide) {
          ctx2.strokeStyle = color ?? theme.barEdge;
          ctx2.lineWidth = Math.max(6, semi * 0.9);
          ctx2.lineCap = 'round';
          ctx2.lineJoin = 'round';
          ctx2.globalAlpha *= 0.35;
          ctx2.beginPath();
          n.glide.forEach(([t, m], k) => (k ? ctx2.lineTo(x(n.start + t), y(m)) : ctx2.moveTo(x(n.start + t), y(m))));
          ctx2.stroke();
        } else {
          const x0 = x(n.start) + 1;
          const x1 = x(n.start + n.dur) - 1;
          const bh = Math.max(6, semi * 0.9);
          ctx2.fillStyle = color ? color + '33' : theme.bar;
          ctx2.strokeStyle = color ?? theme.barEdge;
          ctx2.lineWidth = 1.5;
          ctx2.beginPath();
          ctx2.roundRect(x0, y(n.midi) - bh / 2, Math.max(4, x1 - x0), bh, Math.min(6, bh / 2));
          ctx2.fill();
          ctx2.stroke();
          if (res?.sung && !res.glide && x1 - x0 > 26) {
            ctx2.fillStyle = color;
            ctx2.globalAlpha = 1;
            ctx2.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
            ctx2.textBaseline = 'bottom';
            const c = res.cents;
            ctx2.fillText(Math.abs(c) <= 4 ? '✓' : `${c > 0 ? '+' : ''}${c}`, x0 + 3, y(n.midi) - bh / 2 - 2);
            ctx2.textBaseline = 'middle';
            ctx2.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
          }
        }
        ctx2.globalAlpha = 1;
      });

      // The sung line.
      let frames = null;
      if (singing) {
        frames = [];
        const fr = framesRef.current;
        for (let i = fr.length - 1; i >= 0; i -= 1) {
          const f = fr[i];
          if (f.ct < v.singStart + tStart) break;
          frames.push({ t: f.ct - v.singStart, midi: f.midi });
        }
        frames.reverse();
      } else if (showResult) frames = v.last.frames;
      if (frames?.length) {
        ctx2.lineWidth = 3;
        ctx2.lineCap = 'round';
        let prev = null;
        for (const f of frames) {
          if (f.midi == null || f.midi < pLo - 1 || f.midi > pHi + 1) {
            prev = null;
            continue;
          }
          let err = Infinity;
          for (const lag of [0, 0.12, 0.25]) {
            const tg = targetAt(rep, f.t - lag);
            if (tg != null) err = Math.min(err, Math.abs(centsOff(f.midi, tg).cents));
          }
          ctx2.strokeStyle = err <= tol.good ? COLORS.good : err <= tol.ok * 1.4 ? COLORS.ok : err === Infinity ? theme.text : COLORS.off;
          const px = x(f.t);
          const py = y(f.midi);
          if (prev && f.t - prev.t < 0.08) {
            ctx2.beginPath();
            ctx2.moveTo(prev.px, prev.py);
            ctx2.lineTo(px, py);
            ctx2.stroke();
          } else {
            ctx2.fillStyle = ctx2.strokeStyle;
            ctx2.beginPath();
            ctx2.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx2.fill();
          }
          prev = { t: f.t, px, py };
        }
      }

      // Playhead.
      if (singing) {
        const t = getAudioContext().currentTime - v.singStart;
        ctx2.strokeStyle = theme.accent;
        ctx2.lineWidth = 2;
        ctx2.beginPath();
        ctx2.moveTo(x(t), 4);
        ctx2.lineTo(x(t), h - 4);
        ctx2.stroke();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [viewRef, framesRef, level]);

  return <canvas ref={canvasRef} className="vocal-roll" aria-hidden="true" />;
}
