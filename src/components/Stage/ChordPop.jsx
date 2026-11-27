import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChordBox } from '../ChordLibrary/ChordBox';
import { KeysBox } from '../ChordLibrary/KeysBox';
import '../ChordLibrary/ChordLibraryView.css';
import { Segmented } from '../ui/controls';
import { useLeftHanded } from '../Fretboard/handedness';
import { playMidis } from '../../audio/chordPlayer';
import { playPianoChord } from '../../audio/pianoPlayer';
import { playBassNote } from '../../audio/bassPlayer';
import { bassShapes, chordNotes, guitarShapes, parseChartChord, pianoShapes } from '../../music/sheets/chordView';

const INST_KEY = 'dudestar-stage-chord-inst';
export const CHORD_INSTRUMENTS = ['guitar', 'piano', 'bass'];

export function readChordInst() {
  try {
    const v = localStorage.getItem(INST_KEY);
    return CHORD_INSTRUMENTS.includes(v) ? v : null;
  } catch {
    return null;
  }
}

/** Which instrument's picture a tapped chord opens on: the one chosen here
    before, else my part in the band (keys -> piano, bass -> bass, a singer ->
    the keyboard = the chord's notes), else the instrument picked in the app. */
export function chordInstFor(roles, appInstrument) {
  const saved = readChordInst();
  if (saved) return saved;
  if (roles.includes('keys') || roles.includes('accordion')) return 'piano';
  if (roles.includes('bass')) return 'bass';
  if (roles.some((r) => ['guitar', 'lead', 'acoustic', 'ukulele', 'mandolin'].includes(r))) return 'guitar';
  if (roles.includes('vocals') || roles.includes('backing')) return 'piano';
  return CHORD_INSTRUMENTS.includes(appInstrument) ? appInstrument : 'guitar';
}

function sound(inst, shape) {
  if (!shape) return;
  if (inst === 'guitar') playMidis(shape.midis, 0.035);
  else if (inst === 'piano') playPianoChord(shape.midis);
  else shape.midis.forEach((m, i) => setTimeout(() => playBassNote(m), i * 260)); // the bass plays its shape note by note
}

/**
 * The tapped chord, drawn for an instrument (v1.0.281): a Liquid Glass
 * popover beside the chord (a card at the bottom on a phone) — the shape,
 * ‹ › to the others, a tap on it plays it, and Guitar | Piano | Bass.
 */
export function ChordPop({ chord, anchor, defaultInst, onClose, t, dir }) {
  const c = useMemo(() => parseChartChord(chord), [chord]);
  const [inst, setInst] = useState(defaultInst);
  const [leftHanded] = useLeftHanded();
  const data = useMemo(() => {
    if (!c) return { shapes: [], start: 0 };
    return inst === 'piano' ? pianoShapes(c) : inst === 'bass' ? bassShapes(c) : guitarShapes(c);
  }, [c, inst]);
  const [i, setI] = useState(data.start);
  useEffect(() => setI(data.start), [data]);
  const shape = data.shapes[i] ?? data.shapes[0];
  const n = data.shapes.length;

  // a new chord / instrument sounds once (as the Chord Library's ‹ › do)
  useEffect(() => {
    sound(inst, data.shapes[data.start]);
  }, [data, inst]);

  const choose = (v) => {
    setInst(v);
    try {
      localStorage.setItem(INST_KEY, v);
    } catch {
      /* private mode */
    }
  };
  const step = (d) => {
    const next = (i + d + n) % n;
    setI(next);
    sound(inst, data.shapes[next]);
  };

  // close: a tap outside (not on another chord — that one opens instead), Escape
  const boxRef = useRef(null);
  useEffect(() => {
    const down = (e) => {
      if (boxRef.current?.contains(e.target) || e.target.closest?.('[data-chord]')) return;
      onClose();
    };
    const key = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.stopPropagation();
        e.preventDefault();
        step(e.key === 'ArrowRight' ? 1 : -1);
      }
    };
    document.addEventListener('pointerdown', down, true);
    window.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('pointerdown', down, true);
      window.removeEventListener('keydown', key, true);
    };
  });

  // beside the chord on a wide screen; a card above the controls on a phone
  const [place, setPlace] = useState(null);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || !anchor) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw < 600) {
      // a card just above the control bubble (or the screen's foot)
      const bar = document.querySelector('.stage-perf-bar');
      const top = bar && bar.offsetParent ? bar.getBoundingClientRect().top : vh - 20;
      setPlace({ bottom: Math.max(12, vh - top + 10), card: true });
      return;
    }
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const r = anchor;
    let left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), vw - w - 12);
    let top = r.bottom + 10;
    if (top + h > vh - 90) top = Math.max(12, r.top - h - 10);
    setPlace({ left, top });
  }, [anchor, inst, n]);

  if (!c) return null;
  const notes = chordNotes(c);
  return createPortal(
    <div
      ref={boxRef}
      className={'stage-chordpop' + (place && !place.card ? ' is-pop' : ' is-card')}
      style={place ? (place.card ? { bottom: place.bottom } : { left: place.left, top: place.top }) : undefined}
      role="dialog"
      aria-label={chord}
      dir={dir}
    >
      <div className="stage-chordpop-head">
        <strong dir="ltr">{chord}</strong>
        <span className="stage-chordpop-notes" dir="ltr">
          {notes.join(' · ')}
        </span>
        <button type="button" className="stage-chordpop-x" onClick={onClose} aria-label={t('stage.close')}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <Segmented
        className="stage-chordpop-seg"
        ariaLabel={t('stage.cv.inst')}
        value={inst}
        onChange={choose}
        options={CHORD_INSTRUMENTS.map((v) => ({ value: v, label: t('stage.cv.' + v) }))}
      />
      <div className="stage-chordpop-stage" dir="ltr">
        <button type="button" className="stage-chordpop-arrow" onClick={() => step(-1)} disabled={n < 2} aria-label={t('stage.cv.prev')}>
          ‹
        </button>
        <button type="button" className={'stage-chordpop-diagram is-' + inst} onClick={() => sound(inst, shape)} aria-label={t('stage.cv.hear')}>
          {shape && inst === 'piano' ? (
            <KeysBox keys={shape.keys} />
          ) : shape ? (
            <ChordBox frets={shape.frets} fingers={shape.fingers} barre={shape.barre} roles={shape.roles} names={shape.names} position={shape.position} leftHanded={leftHanded} />
          ) : (
            <span className="stage-chordpop-none">{t('stage.cv.none')}</span>
          )}
        </button>
        <button type="button" className="stage-chordpop-arrow" onClick={() => step(1)} disabled={n < 2} aria-label={t('stage.cv.next')}>
          ›
        </button>
      </div>
      <p className="stage-chordpop-foot">
        {n > 1 && (
          <span dir="ltr">
            {i + 1} / {n}
          </span>
        )}
        <span>{inst === 'piano' ? (n > 1 ? t('stage.cv.inversions') : t('stage.cv.tapHear')) : inst === 'bass' ? t('stage.cv.bassHint') : t('stage.cv.tapHear')}</span>
      </p>
    </div>,
    document.body
  );
}
