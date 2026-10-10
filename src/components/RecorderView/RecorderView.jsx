import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { LevelMeter } from '../AmpView/LevelMeter';
import { createLiveContext, openLiveInput, readLevel } from '../../audio/amp/liveInput';
import { createAmpEngine } from '../../audio/amp/ampEngine';
import { headphonesConfirmed, loadCurrentSettings } from '../../audio/amp/ampSettings';
import { prepareAudioOutput } from '../../audio/audioContext';
import { computePeaks, createCapture, encodeWav } from '../../audio/recorder';
import { currentProfileId, deleteTake, getTakeAudio, listTakes, newTakeId, renameTake, saveTake } from '../../audio/recorderStore';
import '../ModeToggle/ModeToggle.css';
import '../AmpView/AmpView.css';
import './RecorderView.css';

const MAX_SECONDS = 15 * 60;
const PREFS_KEY = 'dudestar-p-rec-prefs'; // per profile (profileStorage prefix)

function loadPrefs() {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
    return { sound: p.sound === 'amp' ? 'amp' : 'dry', click: ['off', 'count', 'all'].includes(p.click) ? p.click : 'off' };
  } catch {
    return { sound: 'dry', click: 'off' };
  }
}

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Waveform({ id, peaks, progress, onSeek, label }) {
  const ref = useRef(null);
  const n = peaks.length || 1;
  const seekAt = (e) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    // Time runs left to right in both languages (like any player).
    onSeek(Math.min(1, Math.max(0, (e.clientX - box.left) / box.width)));
  };
  const bars = peaks.map((p, i) => {
    const h = Math.max(1.5, p * 40);
    return <rect key={i} x={i * 3 + 0.5} y={22 - h / 2} width="2" height={h} rx="1" />;
  });
  return (
    <svg
      ref={ref}
      className="rec-wave"
      viewBox={`0 0 ${n * 3} 44`}
      preserveAspectRatio="none"
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={0}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        seekAt(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons) seekAt(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onSeek(Math.min(1, progress + 0.05));
        if (e.key === 'ArrowLeft') onSeek(Math.max(0, progress - 0.05));
      }}
    >
      <defs>
        <clipPath id={`clip-${id}`}>
          <rect x="0" y="0" width={progress * n * 3} height="44" />
        </clipPath>
      </defs>
      <g className="rec-wave-base">{bars}</g>
      <g className="rec-wave-played" clipPath={`url(#clip-${id})`}>
        {bars}
      </g>
    </svg>
  );
}

/**
 * Record yourself (Tools card -> Record): takes from the Settings input,
 * dry or through the Amp settings, kept in IndexedDB per profile; play,
 * rename, download (WAV), delete. Leaving the screen closes the mic.
 */
export function RecorderView({ metronome }) {
  const { t, lang } = useLanguage();
  const [prefs, setPrefs] = useState(loadPrefs);
  const [phase, setPhase] = useState('idle'); // idle | opening | counting | recording | saving
  const [countLeft, setCountLeft] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [takes, setTakes] = useState([]);
  const [playing, setPlaying] = useState(null); // take id loaded in the player
  const [paused, setPaused] = useState(true);
  const [progress, setProgress] = useState(0);
  const [renaming, setRenaming] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [deleting, setDeleting] = useState(null);

  const rig = useRef(null); // { ctx, input, engine, capture, analyser, sound }
  const meterRef = useRef(null);
  const audioRef = useRef(null);
  const urls = useRef(new Map());
  const countRef = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const profileId = useRef(currentProfileId()).current;
  const metroRef = useRef(metronome);
  metroRef.current = metronome;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const tRef = useRef(t);
  tRef.current = t;
  const refresh = useCallback(async () => {
    try {
      setTakes(await listTakes(profileId));
    } catch (e) {
      setError(tRef.current('rec.errSave', { msg: e?.message || String(e) }));
    }
  }, [profileId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  // ---- input rig -------------------------------------------------------------
  const closeRig = useCallback(() => {
    const r = rig.current;
    rig.current = null;
    if (!r) return;
    r.capture?.dispose();
    r.engine?.dispose();
    r.input?.close();
    r.ctx.close().catch(() => {});
    meterRef.current?.(null);
  }, []);

  const openRig = useCallback(async (sound, ctx) => {
    const r = { ctx, input: null, engine: null, capture: null, analyser: null, sound };
    rig.current = r;
    try {
      r.input = await openLiveInput(ctx);
      let node = r.input.input;
      if (sound === 'amp') {
        r.engine = await createAmpEngine(ctx, r.input.input, loadCurrentSettings(), { monitor: headphonesConfirmed() });
        node = r.engine.recordOut;
      }
      r.analyser = ctx.createAnalyser();
      r.analyser.fftSize = 1024;
      node.connect(r.analyser);
      r.capture = await createCapture(ctx, node);
      if (ctx.state !== 'running') await ctx.resume();
      return r;
    } catch (e) {
      if (rig.current === r) closeRig();
      else {
        r.input?.close();
        ctx.close().catch(() => {});
      }
      throw e;
    }
  }, [closeRig]);

  // Meter while the input is open.
  useEffect(() => {
    let raf = 0;
    const buf = new Float32Array(1024);
    const tick = () => {
      const r = rig.current;
      if (r?.analyser) meterRef.current?.(readLevel(r.analyser, buf));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---- record / stop -------------------------------------------------------
  const beginCapture = useCallback(() => {
    const r = rig.current;
    if (!r?.capture) return;
    countRef.current = null;
    setCountLeft(null);
    if (prefsRef.current.click === 'count') metroRef.current.stop();
    r.capture.start();
    setElapsed(0);
    setPhase('recording');
  }, []);

  const finish = useCallback(async () => {
    const r = rig.current;
    if (phaseRef.current === 'counting') {
      countRef.current?.timer && clearTimeout(countRef.current.timer);
      countRef.current = null;
      setCountLeft(null);
      metroRef.current.stop();
      setPhase('idle');
      return;
    }
    if (phaseRef.current !== 'recording' || !r?.capture) return;
    setPhase('saving');
    if (prefsRef.current.click !== 'off') metroRef.current.stop();
    const { samples, sampleRate } = await r.capture.stop();
    if (samples.length < sampleRate * 0.3) {
      setPhase('idle');
      return;
    }
    const blob = encodeWav(samples, sampleRate);
    const existing = await listTakes(profileId).catch(() => []);
    const meta = {
      id: newTakeId(),
      profileId,
      name: t('rec.take', { n: existing.length + 1 }),
      createdAt: Date.now(),
      duration: samples.length / sampleRate,
      sampleRate,
      sound: r.sound,
      peaks: computePeaks(samples),
    };
    try {
      await saveTake(meta, blob);
    } catch (e) {
      setError(t('rec.errSave', { msg: e?.message || String(e) }));
    }
    setPhase((p) => (p === 'saving' ? 'idle' : p));
    refresh();
  }, [profileId, refresh, t]);

  const record = useCallback(async () => {
    setError(null);
    setNotice(null);
    audioRef.current?.pause();
    const { sound, click } = prefsRef.current;
    if (!rig.current || rig.current.sound !== sound) {
      closeRig();
      setPhase('opening');
      // In the tap: a fresh context (iOS unlock) + the shared one's nudge.
      const ctx = createLiveContext();
      ctx.resume().catch(() => {});
      prepareAudioOutput();
      try {
        await openRig(sound, ctx);
      } catch (e) {
        setPhase('idle');
        setError(t('rec.errMic', { msg: e?.message || String(e) }));
        return;
      }
    }
    if (click === 'off') {
      beginCapture();
      return;
    }
    // Count-in on the app's metronome: one bar from its first click.
    const m = metroRef.current;
    countRef.current = { first: null, timer: null };
    setCountLeft(m.beatsPerMeasure);
    setPhase('counting');
    if (!m.isRunning) m.start();
    // If no click is reported (e.g. the shared context is blocked), go anyway.
    countRef.current.timer = setTimeout(() => {
      if (countRef.current && countRef.current.first == null) beginCapture();
    }, 1500 + (60000 / m.bpm) * m.beatsPerMeasure);
  }, [beginCapture, closeRig, openRig, t]);

  // Count-in clock: follow the metronome's clicks.
  useEffect(() => {
    const c = countRef.current;
    if (phase !== 'counting' || !c || metronome.currentBeat == null) return;
    if (c.first == null) {
      c.first = performance.now();
      clearTimeout(c.timer);
      const barMs = (60000 / metronome.bpm) * metronome.beatsPerMeasure;
      c.timer = setTimeout(beginCapture, barMs);
      setCountLeft(metronome.beatsPerMeasure);
    } else {
      setCountLeft(Math.max(1, metronome.beatsPerMeasure - metronome.currentBeat));
    }
  }, [metronome.currentBeat, metronome.bpm, metronome.beatsPerMeasure, phase, beginCapture]);

  // Elapsed time + the length limit.
  useEffect(() => {
    if (phase !== 'recording') return undefined;
    const id = setInterval(() => {
      const s = rig.current?.capture?.elapsed() ?? 0;
      setElapsed(s);
      if (s >= MAX_SECONDS) {
        setNotice(t('rec.maxLen'));
        finish();
      }
    }, 200);
    return () => clearInterval(id);
  }, [phase, finish, t]);

  // Leaving: keep a take that was being recorded, then close everything.
  useEffect(
    () => () => {
      if (countRef.current?.timer) clearTimeout(countRef.current.timer);
      const done = phaseRef.current === 'recording' ? finish() : Promise.resolve();
      done.catch(() => {}).finally(closeRig);
      audioRef.current?.pause();
      for (const u of urls.current.values()) URL.revokeObjectURL(u);
      urls.current.clear();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ---- playback ------------------------------------------------------------
  const urlFor = async (id) => {
    if (urls.current.has(id)) return urls.current.get(id);
    const blob = await getTakeAudio(id);
    if (!blob) throw new Error('missing audio');
    const u = URL.createObjectURL(blob);
    urls.current.set(id, u);
    return u;
  };

  const togglePlay = async (take, at) => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (playing !== take.id) {
        a.pause();
        a.src = await urlFor(take.id);
        setPlaying(take.id);
        setProgress(at ?? 0);
        await new Promise((res) => {
          if (a.readyState >= 1) res();
          else a.addEventListener('loadedmetadata', res, { once: true });
        });
        if (at != null) a.currentTime = at * take.duration;
        await a.play();
      } else if (at != null) {
        a.currentTime = at * take.duration;
        setProgress(at);
      } else if (a.paused) {
        await a.play();
      } else {
        a.pause();
      }
    } catch (e) {
      setError(e?.message || String(e));
    }
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return undefined;
    let raf = 0;
    const loop = () => {
      if (a.duration) setProgress(a.currentTime / a.duration);
      if (!a.paused) raf = requestAnimationFrame(loop);
    };
    const onPlay = () => {
      setPaused(false);
      raf = requestAnimationFrame(loop);
    };
    const onPause = () => {
      setPaused(true);
      cancelAnimationFrame(raf);
    };
    const onEnded = () => {
      setPaused(true);
      setProgress(0);
    };
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', onEnded);
    return () => {
      cancelAnimationFrame(raf);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', onEnded);
    };
  }, []);

  const download = async (take) => {
    try {
      const a = document.createElement('a');
      a.href = await urlFor(take.id);
      a.download = `${take.name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'take'}.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setError(e?.message || String(e));
    }
  };

  const commitRename = async (take) => {
    const name = draftName.trim();
    setRenaming(null);
    if (!name || name === take.name) return;
    await renameTake(take.id, name).catch((e) => setError(e?.message || String(e)));
    refresh();
  };

  const remove = async (take) => {
    setDeleting(null);
    if (playing === take.id) {
      audioRef.current?.pause();
      audioRef.current?.removeAttribute('src');
      setPlaying(null);
    }
    const u = urls.current.get(take.id);
    if (u) {
      URL.revokeObjectURL(u);
      urls.current.delete(take.id);
    }
    await deleteTake(take.id).catch((e) => setError(e?.message || String(e)));
    refresh();
  };

  // ---- render --------------------------------------------------------------
  const busy = phase === 'counting' || phase === 'recording';
  const dateFmt = new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rec-view">
      <section className={'rec-deck' + (phase === 'recording' ? ' is-recording' : '')}>
        <button
          type="button"
          className={'rec-button' + (busy ? ' is-busy' : '')}
          onClick={() => (busy ? finish() : record())}
          disabled={phase === 'opening' || phase === 'saving'}
          aria-pressed={busy}
        >
          <span className="rec-button-icon" aria-hidden="true" />
          <span className="rec-button-label">{t(busy ? 'rec.stop' : 'rec.record')}</span>
        </button>
        <div className="rec-deck-info">
          <div className="rec-time" dir="ltr">
            {fmt(elapsed)}
          </div>
          <div className="rec-state" aria-live="polite">
            {phase === 'counting'
              ? t('rec.countIn', { n: countLeft ?? '' })
              : phase === 'recording'
                ? t('rec.recording')
                : phase === 'saving'
                  ? t('rec.saving')
                  : t('rec.ready')}
          </div>
          <LevelMeter label={t('amp.in')} bind={meterRef} />
        </div>
      </section>

      <section className="rec-options">
        <div className="rec-option">
          <span className="rec-option-label">{t('rec.sound')}</span>
          <div className="mode-toggle rec-toggle" role="group" aria-label={t('rec.sound')}>
            {['dry', 'amp'].map((s) => (
              <button
                key={s}
                type="button"
                className={prefs.sound === s ? 'active' : ''}
                disabled={busy}
                onClick={() => setPrefs((p) => ({ ...p, sound: s }))}
              >
                {t(s === 'dry' ? 'rec.soundDry' : 'rec.soundAmp')}
              </button>
            ))}
          </div>
        </div>
        <label className="rec-option">
          <span className="rec-option-label">{t('rec.click')}</span>
          <select value={prefs.click} disabled={busy} onChange={(e) => setPrefs((p) => ({ ...p, click: e.target.value }))}>
            <option value="off">{t('rec.clickOff')}</option>
            <option value="count">{t('rec.clickCount')}</option>
            <option value="all">{t('rec.clickAll')}</option>
          </select>
        </label>
        {prefs.click !== 'off' && (
          <label className="rec-option">
            <span className="rec-option-label">{t('rec.bpm')}</span>
            <input
              className="rec-bpm"
              type="number"
              inputMode="numeric"
              min={metronome.minBpm}
              max={metronome.maxBpm}
              value={metronome.bpm}
              disabled={busy}
              onChange={(e) => metronome.setBpm(e.target.value)}
            />
          </label>
        )}
      </section>
      <p className="rec-note">{t(prefs.sound === 'amp' ? 'rec.ampNote' : 'rec.dryNote')}</p>
      {notice && <p className="rec-note">{notice}</p>}
      {error && (
        <p className="amp-error" role="alert">
          {error}
        </p>
      )}

      <section className="rec-takes">
        <h2 className="rec-takes-title">
          {t('rec.takes')}
          <InfoTooltip text={t('rec.tip.format')} />
        </h2>
        {takes.length === 0 ? (
          <p className="rec-empty">{t('rec.empty')}</p>
        ) : (
          <ul className="rec-list">
            {takes.map((take) => {
              const isCur = playing === take.id;
              const isPlaying = isCur && !paused;
              return (
                <li key={take.id} className={'rec-take' + (isCur ? ' is-current' : '')}>
                  <div className="rec-take-row">
                    <button
                      type="button"
                      className={'rec-play' + (isPlaying ? ' is-playing' : '')}
                      aria-label={t(isPlaying ? 'rec.pause' : 'rec.play')}
                      onClick={() => togglePlay(take)}
                    >
                      {isPlaying ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                          <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                          <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                          <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                        </svg>
                      )}
                    </button>
                    <div className="rec-take-text">
                      {renaming === take.id ? (
                        <form
                          className="rec-rename"
                          onSubmit={(e) => {
                            e.preventDefault();
                            commitRename(take);
                          }}
                        >
                          <input
                            autoFocus
                            maxLength={60}
                            value={draftName}
                            aria-label={t('rec.rename')}
                            onChange={(e) => setDraftName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                e.stopPropagation();
                                setRenaming(null);
                              }
                            }}
                          />
                          <button type="submit" className="amp-btn amp-btn-primary">
                            {t('rec.save')}
                          </button>
                          <button type="button" className="amp-btn" onClick={() => setRenaming(null)}>
                            {t('rec.cancel')}
                          </button>
                        </form>
                      ) : (
                        <>
                          <span className="rec-take-name" dir="auto">
                            {take.name}
                          </span>
                          <span className="rec-take-meta">
                            {dateFmt.format(new Date(take.createdAt))} · <span dir="ltr">{fmt(take.duration)}</span>
                            {take.sound === 'amp' && <span className="amp-badge rec-badge">{t('rec.soundAmp')}</span>}
                          </span>
                        </>
                      )}
                    </div>
                    {renaming !== take.id && (
                      <div className="rec-take-actions">
                        {deleting === take.id ? (
                          <>
                            <span className="rec-confirm-q">{t('rec.deleteQ')}</span>
                            <button type="button" className="amp-btn amp-btn-danger" onClick={() => remove(take)}>
                              {t('rec.delete')}
                            </button>
                            <button type="button" className="amp-btn" onClick={() => setDeleting(null)}>
                              {t('rec.cancel')}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="amp-btn"
                              onClick={() => {
                                setDraftName(take.name);
                                setRenaming(take.id);
                                setDeleting(null);
                              }}
                            >
                              {t('rec.rename')}
                            </button>
                            <button type="button" className="amp-btn" onClick={() => download(take)}>
                              {t('rec.download')}
                            </button>
                            <button type="button" className="amp-btn" onClick={() => setDeleting(take.id)}>
                              {t('rec.delete')}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div dir="ltr">
                    <Waveform
                      peaks={take.peaks || []}
                      progress={isCur ? progress : 0}
                      id={take.id}
                      label={take.name}
                      onSeek={(f) => togglePlay(take, f)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <audio ref={audioRef} preload="metadata" playsInline hidden />
    </div>
  );
}
