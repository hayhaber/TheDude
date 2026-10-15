import { useEffect, useRef, useState } from 'react';
import { AmpKnobArt } from '../AmpView/Knob';
import { TapeTransport } from './TapeTransport';
import { VuMeter } from './VuMeter';
import { usePlayhead } from './useStudio';

// The reel-to-reel deck: the project's transport. The reels show where the
// playhead is in the song (a jump is WOUND to, not jumped to), the counter
// shows the playhead, the keys drive the studio.

const WIND_TAP = 5; // s a tap on Rewind / Forward moves
const WIND_HOLD_STEP = 1.2; // s per 80 ms while held (~15x)

function counter(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function KeyIcon({ kind }) {
  const p = {
    rew: 'M11.5 6v12L3 12zM21 6v12l-8.5-6z',
    play: 'M7 5.5v13L18.5 12z',
    ff: 'M3 6v12l8.5-6zM12.5 6v12L21 12z',
  }[kind];
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      {kind === 'stop' ? (
        <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
      ) : kind === 'rec' ? (
        <circle cx="12" cy="12" r="6.5" fill="currentColor" />
      ) : (
        <path d={p} fill="currentColor" />
      )}
    </svg>
  );
}

/** A number field you can type into freely; commits valid values. */
function BpmInput({ value, min, max, disabled, onCommit }) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);
  const commit = (str) => {
    const v = Math.round(Number(str));
    if (Number.isFinite(v) && v >= min && v <= max) onCommit(v);
  };
  return (
    <input
      className="rec-bpm"
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft}
      disabled={disabled}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        commit(e.target.value);
      }}
      onBlur={() => {
        focused.current = false;
        setDraft(String(value));
      }}
    />
  );
}

/** Tape length the reels stand for: whole minutes, a little more than the song. */
function tapeLength(len, at) {
  return Math.max(120, Math.ceil((Math.max(len, at) * 1.2) / 60) * 60);
}

export function Deck({ t, lang, studio, songLength, metronome }) {
  const { phase, prefs, setPrefs, project, positionStore } = studio;
  const { position, counting, countLeft } = usePlayhead(positionStore);
  const busy = phase === 'recording' || phase === 'opening' || phase === 'saving';
  const playing = phase === 'playing';
  const recording = phase === 'recording';

  // ---- reels: wind to jumps ----
  const tape = tapeLength(songLength, position);
  const realShare = position / tape;
  const reel = useRef({ shown: realShare, winding: null, target: realShare, step: 0.01 });
  const [reelWind, setReelWind] = useState(null);
  const [, setTick] = useState(0);
  reel.current.target = realShare;
  reel.current.step = Math.max(0.002, 0.4 / tape);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const r = reel.current;
      const d = r.target - r.shown;
      if (!r.winding) {
        if (Math.abs(d) > r.step) {
          r.winding = d > 0 ? 'ff' : 'rew';
          setReelWind(r.winding);
        } else r.shown = r.target;
      }
      if (r.winding) {
        const move = d * (1 - Math.exp(-dt / 0.16)) + Math.sign(d) * 0.06 * dt;
        r.shown = Math.abs(move) >= Math.abs(d) ? r.target : r.shown + move;
        if (Math.abs(r.target - r.shown) < 0.0015) {
          r.shown = r.target;
          r.winding = null;
          setReelWind(null);
        }
        setTick((n) => n + 1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const share = reel.current.winding || Math.abs(realShare - reel.current.shown) > reel.current.step ? reel.current.shown : realShare;

  // ---- Rewind / Forward: tap = 5 s, hold = wind (playback pauses meanwhile) ----
  const [wind, setWind] = useState(null);
  const windRef = useRef(null);
  const live = useRef({ studio, position });
  live.current = { studio, position };
  const seekBy = (sec) => {
    const { studio: s, position: at } = live.current;
    s.seek(Math.max(0, at + sec));
  };
  const endWind = (commit) => {
    const w = windRef.current;
    if (!w) return;
    windRef.current = null;
    clearTimeout(w.timer);
    clearInterval(w.iv);
    if (!w.held && commit) seekBy(w.dir === 'ff' ? WIND_TAP : -WIND_TAP);
    setWind(null);
    if (w.held && w.wasPlaying) live.current.studio.play();
  };
  const startWind = (dir) => {
    endWind(false);
    const w = { dir, held: false, timer: null, iv: null, wasPlaying: false };
    windRef.current = w;
    w.timer = setTimeout(() => {
      w.held = true;
      if (live.current.studio.phase === 'playing') {
        w.wasPlaying = true;
        live.current.studio.pause();
      }
      setWind(dir);
      w.iv = setInterval(() => seekBy(dir === 'ff' ? WIND_HOLD_STEP : -WIND_HOLD_STEP), 80);
    }, 320);
  };
  useEffect(
    () => () => {
      const w = windRef.current;
      if (w) {
        clearTimeout(w.timer);
        clearInterval(w.iv);
      }
    },
    []
  );

  const motion = reelWind || wind || (recording && !counting ? 'play' : playing && !counting ? 'play' : 'stop');
  const beat = project ? 60 / project.bpm : 0.5;
  const status = !project
    ? '…'
    : phase === 'opening'
      ? t('rec.opening')
      : counting && (recording || playing)
        ? t('rec.countIn', { n: Math.max(1, Math.ceil(countLeft / beat)) })
        : recording
          ? t('rec.recording')
          : phase === 'saving'
            ? t('rec.saving')
            : project.name;

  const keys = [
    { kind: 'rew', label: t('rec.rewind'), disabled: busy, down: wind === 'rew' },
    { kind: 'play', label: t('rec.play'), aria: t(playing ? 'rec.pause' : 'rec.play'), disabled: busy || !project, down: playing },
    { kind: 'ff', label: t('rec.forward'), disabled: busy, down: wind === 'ff' },
    { kind: 'stop', label: t('rec.stop'), disabled: phase === 'opening' || phase === 'saving' || !project },
    { kind: 'rec', label: t('rec.record'), disabled: phase === 'opening' || phase === 'saving' || !project, down: recording },
  ];

  return (
    <section
      className={'rec-deck' + (recording && !counting ? ' is-recording' : '') + (recording && counting ? ' is-counting' : '') + (lang === 'he' ? ' is-he' : '')}
      dir="ltr"
      aria-label={t('rec.title')}
    >
      <div className="tape-cheek" aria-hidden="true" />
      <div className="tape-face">
        <div className="tape-plate">
          <span className="tape-brand">DudeStar</span>
          <span className="tape-model" dir="auto">
            {t('rec.deckModel')}
          </span>
        </div>
        <TapeTransport share={share} motion={motion} />
        <div className="tape-panel">
          <VuMeter label={t('rec.meterIn')} bind={studio.meterIn} />
          <div className="tape-center">
            <div className="tape-lamps" aria-hidden="true">
              <span className={'tape-lamp is-rec' + (recording ? (counting ? ' is-blink' : ' is-on') : '')}>REC</span>
              <span className={'tape-lamp is-play' + (playing ? ' is-on' : '')}>PLAY</span>
            </div>
            <div className="tape-counter rec-time" aria-label={fmt(position)}>
              {counter(position)
                .split('')
                .map((ch, i) =>
                  ch === ':' ? (
                    <span key={i} className="tape-counter-sep">
                      :
                    </span>
                  ) : (
                    <span key={i} className="tape-digit">
                      {ch}
                    </span>
                  )
                )}
            </div>
            <div className="rec-state" aria-live="polite" dir={lang === 'he' ? 'rtl' : 'ltr'}>
              {status}
            </div>
          </div>
          <VuMeter label={t('rec.meterOut')} bind={studio.meterOut} />
        </div>

        <div className="tape-keys" role="group" aria-label={t('rec.title')}>
          {keys.map((k) => {
            const windKey = k.kind === 'rew' || k.kind === 'ff';
            return (
              <div key={k.kind} className="tape-key-slot">
                <button
                  type="button"
                  className={`tape-key is-${k.kind}` + (k.down ? ' is-down' : '')}
                  aria-label={k.aria || k.label}
                  aria-pressed={k.kind === 'stop' ? undefined : !!k.down}
                  disabled={k.disabled}
                  onPointerDown={windKey ? (e) => (e.button === 0 ? startWind(k.kind) : undefined) : undefined}
                  onPointerUp={windKey ? () => endWind(true) : undefined}
                  onPointerLeave={windKey ? () => endWind(false) : undefined}
                  onPointerCancel={windKey ? () => endWind(false) : undefined}
                  onClick={(e) => {
                    if (windKey) {
                      if (e.detail === 0) seekBy(k.kind === 'ff' ? WIND_TAP : -WIND_TAP);
                      return;
                    }
                    if (k.kind === 'rec') (recording ? studio.stop : studio.record)();
                    else if (k.kind === 'play') (playing ? studio.pause : studio.play)();
                    else studio.stop();
                  }}
                >
                  <KeyIcon kind={k.kind} />
                </button>
                <span className="tape-engrave" dir="auto">
                  {k.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="rec-options">
          <div className="tape-source" role="radiogroup" aria-label={t('rec.sound')}>
            <span className="tape-engrave tape-source-title" dir="auto">
              {t('rec.sound')}
            </span>
            <div className="tape-source-row">
              <button
                type="button"
                role="radio"
                aria-checked={prefs.sound === 'dry'}
                className={'tape-source-pos' + (prefs.sound === 'dry' ? ' is-on' : '')}
                disabled={busy}
                onClick={() => setPrefs((p) => ({ ...p, sound: 'dry' }))}
              >
                {t('rec.soundDry')}
              </button>
              <button
                type="button"
                className="tape-source-knob"
                aria-label={t('rec.sound')}
                tabIndex={-1}
                disabled={busy}
                onClick={() => setPrefs((p) => ({ ...p, sound: p.sound === 'amp' ? 'dry' : 'amp' }))}
              >
                <AmpKnobArt angle={prefs.sound === 'amp' ? 45 : -45} uid="tape-src" scale={{ ticks: '', labels: [] }} />
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={prefs.sound === 'amp'}
                className={'tape-source-pos' + (prefs.sound === 'amp' ? ' is-on' : '')}
                disabled={busy}
                onClick={() => setPrefs((p) => ({ ...p, sound: 'amp' }))}
              >
                {t('rec.soundAmp')}
              </button>
            </div>
          </div>
          <label className="tape-field">
            <span className="tape-engrave" dir="auto">
              {t('rec.click')}
            </span>
            <select value={prefs.click} disabled={busy} onChange={(e) => setPrefs((p) => ({ ...p, click: e.target.value }))} dir={lang === 'he' ? 'rtl' : 'ltr'}>
              <option value="off">{t('rec.clickOff')}</option>
              <option value="count">{t('rec.clickCount')}</option>
              <option value="all">{t('rec.clickAll')}</option>
            </select>
          </label>
          <label className="tape-field">
            <span className="tape-engrave" dir="auto">
              {t('rec.bpm')}
            </span>
            <BpmInput
              value={project?.bpm ?? 100}
              min={metronome?.minBpm ?? 30}
              max={metronome?.maxBpm ?? 300}
              disabled={busy || !project}
              onCommit={(v) => studio.update((p) => ({ ...p, bpm: v }), { history: false })}
            />
          </label>
        </div>
      </div>
      <div className="tape-cheek" aria-hidden="true" />
    </section>
  );
}
