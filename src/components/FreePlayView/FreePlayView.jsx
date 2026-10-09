import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { PianoKeyboard } from '../PianoKeyboard/PianoKeyboard';
import { getAudioContext } from '../../audio/audioContext';
import { schedulePianoNotes } from '../../audio/pianoPlayer';
import { identifyChord } from '../../music/chordFromNotes';
import './FreePlayView.css';

// Piano -> FreePlay: a big keyboard to play anything on — the keys fill the
// width for the chosen number of octaves (around middle C by default), with
// a sustain pedal, the chord being played named live, and a simple
// record / play back.
const OCTAVE_CHOICES = [1, 1.5, 2, 3];
// Where each view starts (a white key): centred on the middle of the piano.
const START_FOR = { 1: 60, 1.5: 55, 2: 48, 3: 48 }; // C4 / G3 / C3 / C3
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const RECORDING_KEY = 'dudestar-freeplay-recording';

function loadRecording() {
  try {
    const r = JSON.parse(localStorage.getItem(RECORDING_KEY));
    return Array.isArray(r) && r.length ? r : null;
  } catch {
    return null;
  }
}

function defaultOctaves() {
  return typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 2;
}

export function FreePlayView({ pianoProps }) {
  const { t, lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const [octaves, setOctaves] = useState(defaultOctaves);
  const [pedal, setPedal] = useState(false);
  const [sounding, setSounding] = useState(() => new Set());
  const [recState, setRecState] = useState('idle'); // idle | recording | playing
  const [recording, setRecording] = useState(loadRecording);
  const [playKeys, setPlayKeys] = useState([]);
  const [clock, setClock] = useState(0);
  const pedalRef = useRef(false);
  pedalRef.current = pedal;
  const downRef = useRef(new Set()); // keys physically held
  const pedalNotesRef = useRef(new Set()); // released keys the pedal holds
  const recRef = useRef({ start: 0, open: new Map(), events: [] });
  const playRef = useRef({ stop: null, raf: null });
  // The keys may grow down to the bottom of the screen (minus the panel
  // above them, the tip below and, on phones/tablets, the bottom bars).
  const boardRef = useRef(null);
  const [maxKeyHeight, setMaxKeyHeight] = useState(420);
  useEffect(() => {
    const measure = () => {
      const el = boardRef.current;
      if (!el) return;
      const keys = el.querySelector('.piano-keyboard-keys');
      const top = (keys ?? el).getBoundingClientRect().top + window.scrollY;
      const bottomBars = window.innerWidth < 900 ? 150 : 0;
      setMaxKeyHeight(Math.max(180, Math.round(window.innerHeight - top - bottomBars - 56)));
    };
    measure();
    const t1 = setTimeout(measure, 300);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t1);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const refresh = () => setSounding(new Set([...downRef.current, ...pedalNotesRef.current]));

  const onNoteEvent = useCallback(({ type, midi }) => {
    const now = getAudioContext().currentTime;
    const rec = recRef.current;
    if (type === 'on') {
      downRef.current.add(midi);
      pedalNotesRef.current.delete(midi);
      if (rec.active) rec.open.set(midi, now - rec.start);
    } else {
      downRef.current.delete(midi);
      if (pedalRef.current) pedalNotesRef.current.add(midi);
      if (rec.active && rec.open.has(midi)) {
        const start = rec.open.get(midi);
        rec.open.delete(midi);
        // With the pedal down the note rings on — record it as heard.
        rec.events.push({ midi, start, dur: Math.max(0.12, now - rec.start - start), pedal: pedalRef.current });
      }
    }
    refresh();
  }, []);

  // Pedal up: what it held stops (the keyboard silences them itself).
  useEffect(() => {
    if (pedal) return;
    const rec = recRef.current;
    if (rec.active) {
      const now = getAudioContext().currentTime - rec.start;
      // Pedalled notes in the recording end when the pedal is released.
      rec.events.forEach((e) => {
        if (e.pedal && e.start + e.dur < now) {
          e.dur = now - e.start;
          e.pedal = false;
        }
      });
    }
    pedalNotesRef.current.clear();
    refresh();
  }, [pedal]);

  // Space bar = the pedal (held), like a real foot pedal.
  useEffect(() => {
    const isField = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA');
    const down = (e) => {
      if (e.code !== 'Space' || e.repeat || isField(e.target)) return;
      e.preventDefault();
      setPedal(true);
    };
    const up = (e) => {
      if (e.code !== 'Space' || isField(e.target)) return;
      e.preventDefault();
      setPedal(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // The chord (or note / two notes) sounding right now.
  const readout = useMemo(() => {
    const midis = [...sounding];
    if (!midis.length) return null;
    const pcs = new Set(midis.map((m) => m % 12));
    if (pcs.size >= 3) return identifyChord(midis, { flats: true }) ?? null;
    return [...midis]
      .sort((a, b) => a - b)
      .map((m) => NAMES[m % 12] + (Math.floor(m / 12) - 1))
      .slice(0, 2)
      .join(' · ');
  }, [sounding]);

  // ---- record / play back ----
  const stopPlayback = useCallback(() => {
    const p = playRef.current;
    p.stop?.();
    if (p.raf) cancelAnimationFrame(p.raf);
    playRef.current = { stop: null, raf: null };
    setPlayKeys([]);
  }, []);

  const startRecording = () => {
    stopPlayback();
    recRef.current = { active: true, start: getAudioContext().currentTime, open: new Map(), events: [] };
    setRecState('recording');
    setClock(0);
  };

  const stopRecording = () => {
    const rec = recRef.current;
    const end = getAudioContext().currentTime - rec.start;
    rec.open.forEach((start, midi) => rec.events.push({ midi, start, dur: Math.max(0.12, end - start) }));
    rec.active = false;
    const events = rec.events.sort((a, b) => a.start - b.start).map(({ midi, start, dur }) => ({ midi, start, dur }));
    setRecState('idle');
    if (events.length) {
      setRecording(events);
      try {
        localStorage.setItem(RECORDING_KEY, JSON.stringify(events));
      } catch {
        /* storage unavailable: kept for this visit */
      }
    }
  };

  const play = () => {
    if (!recording?.length) return;
    stopPlayback();
    const ctx = getAudioContext();
    const at = ctx.currentTime + 0.1;
    const stop = schedulePianoNotes(recording, at, { velocity: 96 });
    const length = Math.max(...recording.map((e) => e.start + e.dur));
    const frame = () => {
      const now = ctx.currentTime - at;
      setPlayKeys(recording.filter((e) => now >= e.start && now < e.start + e.dur).map((e) => ({ midi: e.midi, hand: 'right' })));
      setClock(Math.max(0, now));
      if (now > length + 0.2) {
        playRef.current = { stop: null, raf: null };
        setPlayKeys([]);
        setRecState('idle');
        return;
      }
      playRef.current.raf = requestAnimationFrame(frame);
    };
    playRef.current = { stop, raf: requestAnimationFrame(frame) };
    setRecState('playing');
  };

  const stopAll = () => {
    if (recState === 'recording') stopRecording();
    else {
      stopPlayback();
      setRecState('idle');
    }
  };

  const remove = () => {
    stopPlayback();
    setRecording(null);
    setRecState('idle');
    try {
      localStorage.removeItem(RECORDING_KEY);
    } catch {
      /* nothing */
    }
  };

  // Recording clock.
  useEffect(() => {
    if (recState !== 'recording') return undefined;
    const id = setInterval(() => setClock(getAudioContext().currentTime - recRef.current.start), 200);
    return () => clearInterval(id);
  }, [recState]);

  useEffect(() => stopPlayback, [stopPlayback]);

  const recLength = recording?.length ? Math.max(...recording.map((e) => e.start + e.dur)) : 0;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="freeplay-view" dir={dir}>
      <div className="freeplay-head">
        <div>
          <h1>{t('freeplay.title')}</h1>
          <p className="subtitle">{t('freeplay.subtitle')}</p>
        </div>
      </div>

      <div className="freeplay-controls">
        <label className="freeplay-field">
          <span>{t('freeplay.octaves')}</span>
          <select value={octaves} onChange={(e) => setOctaves(Number(e.target.value))}>
            {OCTAVE_CHOICES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={'freeplay-pedal' + (pedal ? ' is-on' : '')}
          aria-pressed={pedal}
          onClick={() => setPedal((p) => !p)}
          title={t('freeplay.pedalHint')}
        >
          <span className="freeplay-pedal-dot" aria-hidden="true" />
          {t('freeplay.pedal')}
        </button>

        <div className="freeplay-recorder" role="group" aria-label={t('freeplay.recorder')}>
          {recState === 'idle' ? (
            <>
              <button type="button" className="freeplay-rec" onClick={startRecording}>
                <span className="freeplay-rec-dot" aria-hidden="true" />
                {t('freeplay.record')}
              </button>
              <button type="button" onClick={play} disabled={!recording?.length}>
                {t('freeplay.play')}
              </button>
              {recording?.length > 0 && (
                <button type="button" onClick={remove}>
                  {t('freeplay.delete')}
                </button>
              )}
            </>
          ) : (
            <button type="button" className={recState === 'recording' ? 'freeplay-rec is-recording' : ''} onClick={stopAll}>
              {recState === 'recording' && <span className="freeplay-rec-dot" aria-hidden="true" />}
              {t('freeplay.stop')}
            </button>
          )}
          <span className="freeplay-clock" dir="ltr">
            {recState === 'recording'
              ? fmt(clock)
              : recState === 'playing'
                ? `${fmt(clock)} / ${fmt(recLength)}`
                : recording?.length
                  ? fmt(recLength)
                  : ''}
          </span>
        </div>
      </div>

      <div className="freeplay-keyboard" dir="ltr" ref={boardRef}>
        <PianoKeyboard
          {...pianoProps}
          notes={[]}
          visibleOctaves={octaves}
          startMidi={START_FOR[octaves]}
          maxKeyHeight={maxKeyHeight}
          sustain={pedal}
          onNoteEvent={onNoteEvent}
          chordReadout={readout}
          playNotes={playKeys}
        />
      </div>

      <p className="freeplay-tip">{t('freeplay.tip')}</p>
    </div>
  );
}
