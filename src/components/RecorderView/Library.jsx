import { useEffect, useRef, useState } from 'react';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { getTakeAudio } from '../../audio/recorderStore';

// The library: every take of this profile (recordings, imports, bounces) —
// listen, rename, add to the armed track (joining takes back to back),
// download (own format or MP3), delete (also from the songs that use it).

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

export function Library({ t, lang, studio }) {
  const { takes, phase } = studio;
  const [playing, setPlaying] = useState(null);
  const [paused, setPaused] = useState(true);
  const [progress, setProgress] = useState(0);
  const [renaming, setRenaming] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [deleting, setDeleting] = useState(null); // { id, used }
  const audioRef = useRef(null);
  const urls = useRef(new Map());
  const studioBusy = phase !== 'idle';

  // The studio starting playback / recording stops the preview.
  useEffect(() => {
    const stop = () => audioRef.current?.pause();
    window.addEventListener('dudestar-rec-preview-stop', stop);
    return () => window.removeEventListener('dudestar-rec-preview-stop', stop);
  }, []);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      for (const u of urls.current.values()) URL.revokeObjectURL(u);
      urls.current.clear();
    },
    []
  );

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
    if (studio.phase === 'playing') studio.pause();
    try {
      navigator.audioSession && (navigator.audioSession.type = 'playback');
    } catch {
      /* not supported */
    }
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
        if (at != null) a.currentTime = at * (a.duration || take.duration);
        await a.play();
      } else if (at != null) {
        a.currentTime = at * (a.duration || take.duration);
        setProgress(at);
      } else if (a.paused) {
        await a.play();
      } else {
        a.pause();
      }
    } catch (e) {
      studio.setError(e?.message || String(e));
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

  const commitRename = async (take) => {
    const name = draftName.trim();
    setRenaming(null);
    if (!name || name === take.name) return;
    await studio.renameTake(take.id, name);
  };

  const askDelete = async (take) => {
    setRenaming(null);
    setDeleting({ id: take.id, used: await studio.takeUsed(take.id) });
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
    await studio.deleteTake(take);
  };

  const dateFmt = new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const badge = (take) =>
    take.kind === 'import' ? t('rec.badgeImport') : take.kind === 'bounce' ? t('rec.badgeMix') : take.sound === 'amp' ? t('rec.soundAmp') : null;

  return (
    <section className="rec-takes">
      <h2 className="rec-takes-title">
        {t('rec.library')}
        <InfoTooltip text={t('rec.tip.format')} />
      </h2>
      {takes.length === 0 ? (
        <p className="rec-empty">{t('rec.empty')}</p>
      ) : (
        <ul className="rec-list">
          {takes.map((take) => {
            const isCur = playing === take.id;
            const isPlaying = isCur && !paused;
            const b = badge(take);
            return (
              <li key={take.id} className={'rec-take' + (isCur ? ' is-current' : '')}>
                <div className="rec-take-row">
                  <button type="button" className={'rec-play' + (isPlaying ? ' is-playing' : '')} aria-label={t(isPlaying ? 'rec.pause' : 'rec.play')} onClick={() => togglePlay(take)}>
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
                          {b && <span className="amp-badge rec-badge">{b}</span>}
                        </span>
                      </>
                    )}
                  </div>
                  {renaming !== take.id && (
                    <div className="rec-take-actions">
                      {deleting?.id === take.id ? (
                        <>
                          <span className="rec-confirm-q">{t(deleting.used ? 'rec.deleteUsedQ' : 'rec.deleteQ')}</span>
                          <button type="button" className="amp-btn amp-btn-danger" onClick={() => remove(take)}>
                            {t('rec.delete')}
                          </button>
                          <button type="button" className="amp-btn" onClick={() => setDeleting(null)}>
                            {t('rec.cancel')}
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="amp-btn amp-btn-primary" disabled={studioBusy} onClick={() => studio.addTakeToTrack(take)} title={t('rec.addHint')}>
                            {t('rec.add')}
                          </button>
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
                          <button type="button" className="amp-btn" onClick={() => studio.downloadTake(take)}>
                            {t('rec.download')}
                          </button>
                          <button type="button" className="amp-btn" disabled={studio.busyTask === 'export'} onClick={() => studio.downloadTake(take, 'mp3')}>
                            MP3
                          </button>
                          <button type="button" className="amp-btn" disabled={studioBusy} onClick={() => askDelete(take)}>
                            {t('rec.delete')}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div dir="ltr">
                  <Waveform peaks={take.peaks || []} progress={isCur ? progress : 0} id={take.id} label={take.name} onSeek={(f) => togglePlay(take, f)} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <audio ref={audioRef} preload="metadata" playsInline hidden />
    </section>
  );
}
