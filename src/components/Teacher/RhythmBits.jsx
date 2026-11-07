import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { playMidis } from '../../audio/chordPlayer';
import { STD_TUNING } from '../../music/chordBuilder';
import { SHAPES } from '../../teacher/curriculum/guitar';

// Level-1 rhythm pictures for the teacher's lessons (v1.0.156):
//   StrumPattern — one bar as 8 slots (1 & 2 & 3 & 4 &): ↓ down, ↑ up,
//                  · = the hand moves but misses the strings.
//   ChordChart   — a song's bars as boxes (4 a row), the playing bar lit.
// Both have Hear: the teacher plays it first (hear before you play).

const countsFor = (lang) => ['1', '2', '3', '4'].flatMap((n) => [n, lang === 'he' ? 'ו' : '&']);

function strum(chord, dir) {
  const sh = SHAPES[chord];
  if (!sh) return;
  const midis = sh.frets.map((f, s) => (f == null ? null : STD_TUNING[s] + f)).filter((m) => m != null);
  // an up strum catches only the higher strings, high to low
  playMidis(dir === 'U' ? midis.slice(-4).reverse() : midis, dir === 'U' ? 0.018 : 0.025);
}

/** Plays bars of chords with a pattern; calls onSlot(bar, slot); returns stop(). */
function playBars(bars, pattern, bpm, onSlot, onEnd) {
  const slotMs = 60000 / bpm / 2;
  const timers = [];
  bars.forEach((chord, b) => {
    for (let k = 0; k < 8; k += 1) {
      timers.push(
        setTimeout(() => {
          onSlot(b, k);
          const p = pattern[k];
          if (p === 'D' || p === 'U') strum(chord, p);
        }, (b * 8 + k) * slotMs)
      );
    }
  });
  timers.push(setTimeout(onEnd, bars.length * 8 * slotMs));
  return () => timers.forEach(clearTimeout);
}

function useBarPlayer() {
  const [at, setAt] = useState(null); // {bar, slot}
  const stopRef = useRef(null);
  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setAt(null);
  };
  useEffect(() => () => stopRef.current?.(), []);
  const play = (bars, pattern, bpm) => {
    stop();
    stopRef.current = playBars(bars, pattern, bpm, (bar, slot) => setAt({ bar, slot }), () => {
      stopRef.current = null;
      setAt(null);
    });
  };
  return { at, play, stop, playing: at != null };
}

export function StrumPattern({ pattern, chord = 'A', bpm = 70, bars = 2 }) {
  const { t, lang } = useLanguage();
  const COUNTS = countsFor(lang);
  const pl = useBarPlayer();
  const slots = pattern.split('');
  return (
    <div className="tc-strum" dir="ltr">
      <div className="tc-strum-row" role="img" aria-label={pattern}>
        {slots.map((p, k) => (
          <div key={k} className={'tc-strum-slot' + (k % 2 === 0 ? ' is-beat' : '') + (pl.at?.slot === k ? ' is-on' : '')}>
            <span className={'tc-strum-arrow' + (p === '-' ? ' is-miss' : '')}>{p === 'D' ? '↓' : p === 'U' ? '↑' : '·'}</span>
            <span className="tc-strum-count">{COUNTS[k]}</span>
          </div>
        ))}
      </div>
      <button type="button" className="tc-btn" onClick={() => (pl.playing ? pl.stop() : pl.play(Array(bars).fill(chord), slots, bpm))}>
        {pl.playing ? t('teacher.step.stop') : t('teacher.step.hear')}
      </button>
    </div>
  );
}

export function ChordChart({ bars, pattern = 'D-D-D-D-', bpm = 70 }) {
  const { t } = useLanguage();
  const pl = useBarPlayer();
  return (
    <div className="tc-chart" dir="ltr">
      <ol className="tc-chart-bars">
        {bars.map((c, b) => (
          <li key={b} className={pl.at?.bar === b ? 'is-on' : ''}>
            <span className="tc-chart-n">{b + 1}</span>
            <span className="tc-chart-chord">{c}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="tc-btn" onClick={() => (pl.playing ? pl.stop() : pl.play(bars, pattern.split(''), bpm))}>
        {pl.playing ? t('teacher.step.stop') : t('teacher.step.hear')}
      </button>
    </div>
  );
}
