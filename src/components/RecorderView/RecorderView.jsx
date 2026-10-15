import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { AmpKnobArt } from '../AmpView/Knob';
import { TapeTransport } from './TapeTransport';
import { VuMeter } from './VuMeter';
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

// Tape counter: mm:ss.
function counter(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const WIND_TAP = 5; // seconds a tap on Rewind / Forward moves
const WIND_HOLD_STEP = 1.2; // seconds per 80 ms while held (~15x)

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

// iOS sends ALL sound to the earpiece while the microphone is open, so the
// mic is closed as soon as a take is saved and before anything plays, and
// (Safari 16.4+) the page's audio session is set back to plain playback —
// the loudspeaker. Other browsers ignore this.
function setAudioSession(type) {
  try {
    if (navigator.audioSession) navigator.audioSession.type = type;
  } catch {
    /* not supported */
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
  const playMeterRef = useRef(null);
  const [wind, setWind] = useState(null); // 'rew' | 'ff' while winding
  // Reels: a jump (seek on the waveform, a Rewind/Forward tap, a new
  // recording) is WOUND to, not jumped to — the tape runs from one reel to
  // the other at winding speed until it reaches the new point. `reel.shown`
  // is the share drawn; `target` the real one. Small steps (normal play,
  // recording) are followed exactly.
  const reel = useRef({ shown: 0, winding: null, target: 0, step: 0.01 });
  const [reelWind, setReelWind] = useState(null);
  const [, setReelTick] = useState(0);
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
        // Fast at first, braking into the spot (plus a minimum speed so it
        // arrives): about 0.5-0.9 s whatever the distance.
        const move = d * (1 - Math.exp(-dt / 0.16)) + Math.sign(d) * 0.06 * dt;
        r.shown = Math.abs(move) >= Math.abs(d) ? r.target : r.shown + move;
        if (Math.abs(r.target - r.shown) < 0.0015) {
          r.shown = r.target;
          r.winding = null;
          setReelWind(null);
        }
        setReelTick((n) => n + 1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const windRef = useRef(null);
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

  const curPeaks = useRef(null);
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
      // Playback meter from the take's stored peaks (no audio routing).
      const a = audioRef.current;
      const pk = curPeaks.current;
      if (a && !a.paused && a.duration && pk?.length) {
        const v = pk[Math.min(pk.length - 1, Math.floor((a.currentTime / a.duration) * pk.length))] || 0;
        playMeterRef.current?.({ peak: v, rms: v * 0.35 });
      } else playMeterRef.current?.(null);
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
      closeRig();
      setAudioSession('playback');
      setPhase('idle');
      return;
    }
    if (phaseRef.current !== 'recording' || !r?.capture) return;
    setPhase('saving');
    if (prefsRef.current.click !== 'off') metroRef.current.stop();
    const { samples, sampleRate } = await r.capture.stop();
    // Mic off right away: playback on a phone must come from the speaker.
    closeRig();
    setAudioSession('playback');
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
  }, [profileId, refresh, t, closeRig]);

  const record = useCallback(async () => {
    setError(null);
    setNotice(null);
    audioRef.current?.pause();
    const { sound, click } = prefsRef.current;
    if (!rig.current || rig.current.sound !== sound) {
      closeRig();
      setPhase('opening');
      // In the tap: a fresh context (iOS unlock) + the shared one's nudge.
      setAudioSession('auto');
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
    // Mic still open (e.g. a failed take): close it so the speaker is used.
    if (rig.current && phaseRef.current === 'idle') closeRig();
    setAudioSession('playback');
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

  const busy = phase === 'counting' || phase === 'recording';
  const current = takes.find((x) => x.id === playing) || null;
  curPeaks.current = current?.peaks || null;

  // ---- transport keys --------------------------------------------------------
  const seekBy = (sec) => {
    const a = audioRef.current;
    if (!a || !current || !a.duration) return;
    a.currentTime = Math.min(a.duration, Math.max(0, a.currentTime + sec));
    setProgress(a.currentTime / a.duration);
  };
  const seekRef = useRef(seekBy);
  seekRef.current = seekBy;

  const endWind = (commit) => {
    const w = windRef.current;
    if (!w) return;
    windRef.current = null;
    clearTimeout(w.timer);
    clearInterval(w.iv);
    if (!w.held && commit) {
      // A tap: jump, with a short burst of the reels.
      // (The reels wind to the new spot by themselves.)
      seekRef.current(w.dir === 'ff' ? WIND_TAP : -WIND_TAP);
      return;
    }
    setWind(null);
  };
  const startWind = (dir) => {
    endWind(false);
    const w = { dir, held: false, timer: null, iv: null };
    windRef.current = w;
    // Held: keep winding until released.
    w.timer = setTimeout(() => {
      w.held = true;
      setWind(dir);
      w.iv = setInterval(() => seekRef.current(dir === 'ff' ? WIND_HOLD_STEP : -WIND_HOLD_STEP), 80);
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

  const pressPlay = () => {
    const take = current || takes[0];
    if (take) togglePlay(take);
  };
  const pressStop = () => {
    if (busy) finish();
    else audioRef.current?.pause();
  };

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
  // Reels: while recording the tape runs off a 15-minute reel; a loaded take
  // sits where it is played to.
  const realShare = busy || phase === 'saving' ? elapsed / MAX_SECONDS : current ? progress : 0;
  // A jump bigger than ~0.4 s of tape is wound to (see `reel` above).
  reel.current.target = realShare;
  reel.current.step = Math.max(0.004, 0.4 / (busy || phase === 'saving' || !current ? MAX_SECONDS : current.duration || 1));
  // Until the reel loop picks a jump up (next frame), keep drawing where the
  // tape was — otherwise one frame would show the jump.
  const share = reel.current.winding || Math.abs(realShare - reel.current.shown) > reel.current.step ? reel.current.shown : realShare;
  const motion = reelWind || (phase === 'recording' ? 'play' : wind || (current && !paused ? 'play' : 'stop'));
  // The counter rolls with the tape while it winds.
  const shownTime = busy || phase === 'saving' ? elapsed : current ? share * current.duration : 0;
  const dateFmt = new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rec-view">
      <section
        className={'rec-deck' + (phase === 'recording' ? ' is-recording' : '') + (phase === 'counting' ? ' is-counting' : '') + (lang === 'he' ? ' is-he' : '')}
        dir="ltr"
        aria-label={t('rec.title')}
      >
        <div className="tape-cheek" aria-hidden="true" />
        <div className="tape-face">
          <div className="tape-plate">
            <span className="tape-brand">DudeStar</span>
            <span className="tape-model" dir="auto">{t('rec.deckModel')}</span>
          </div>
          <TapeTransport share={share} motion={motion} />
          <div className="tape-panel">
            <VuMeter label={t('rec.meterIn')} bind={meterRef} />
            <div className="tape-center">
              <div className="tape-lamps" aria-hidden="true">
                <span className={'tape-lamp is-rec' + (phase === 'recording' ? ' is-on' : phase === 'counting' ? ' is-blink' : '')}>REC</span>
                <span className={'tape-lamp is-play' + (motion === 'play' && !busy ? ' is-on' : '')}>PLAY</span>
              </div>
              <div className="tape-counter rec-time" aria-label={fmt(shownTime)}>
                {counter(shownTime)
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
                {phase === 'counting'
                  ? t('rec.countIn', { n: countLeft ?? '' })
                  : phase === 'recording'
                    ? t('rec.recording')
                    : phase === 'saving'
                      ? t('rec.saving')
                      : current
                        ? current.name
                        : t('rec.ready')}
              </div>
            </div>
            <VuMeter label={t('rec.meterOut')} bind={playMeterRef} />
          </div>

          <div className="tape-keys" role="group" aria-label={t('rec.title')}>
            {[
              { kind: 'rew', label: t('rec.rewind'), disabled: busy || !current, down: wind === 'rew' },
              { kind: 'play', label: t('rec.play'), aria: t(motion === 'play' && !busy ? 'rec.pause' : 'rec.play'), disabled: busy || phase === 'opening' || phase === 'saving' || !takes.length, down: !busy && !!current && !paused },
              { kind: 'ff', label: t('rec.forward'), disabled: busy || !current, down: wind === 'ff' },
              { kind: 'stop', label: t('rec.stop'), disabled: phase === 'opening' || phase === 'saving' || (!busy && paused) },
              { kind: 'rec', label: t('rec.record'), disabled: phase === 'opening' || phase === 'saving', down: busy },
            ].map((k) => {
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
                        // Keyboard (no pointer): one jump.
                        if (e.detail === 0) seekBy(k.kind === 'ff' ? WIND_TAP : -WIND_TAP);
                        return;
                      }
                      if (k.kind === 'rec') (busy ? finish : record)();
                      else if (k.kind === 'play') pressPlay();
                      else pressStop();
                    }}
                  >
                    <KeyIcon kind={k.kind} />
                  </button>
                  <span className="tape-engrave" dir="auto">{k.label}</span>
                </div>
              );
            })}
          </div>

          <div className="rec-options">
            <div className="tape-source" role="radiogroup" aria-label={t('rec.sound')}>
              <span className="tape-engrave tape-source-title" dir="auto">{t('rec.sound')}</span>
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
              <span className="tape-engrave" dir="auto">{t('rec.click')}</span>
              <select value={prefs.click} disabled={busy} onChange={(e) => setPrefs((p) => ({ ...p, click: e.target.value }))} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                <option value="off">{t('rec.clickOff')}</option>
                <option value="count">{t('rec.clickCount')}</option>
                <option value="all">{t('rec.clickAll')}</option>
              </select>
            </label>
            {prefs.click !== 'off' && (
              <label className="tape-field">
                <span className="tape-engrave" dir="auto">{t('rec.bpm')}</span>
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
          </div>
        </div>
        <div className="tape-cheek" aria-hidden="true" />
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
