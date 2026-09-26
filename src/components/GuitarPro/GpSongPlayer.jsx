import { useEffect, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';
import { TEMPO_OPTIONS } from '../../hooks/useLickTrainer';

const TICKS_PER_BEAT = 960;

// GuitarPro -> Song: the whole file, rendered as tab by alphaTab and played
// by its own synth with the track mixer applied — play along with the band.
// The practiced part's current note also lights up on the shared Stage
// fretboard (through the trainer's playhead).
export function GpSongPlayer({ trainer, t }) {
  const hostRef = useRef(null);
  const scrollRef = useRef(null);
  const apiRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [looping, setLooping] = useState(false);
  const [error, setError] = useState(null);
  const song = trainer.songSource;
  const songKey = song ? `${song.source.key}#${song.trackIndex}` : null;
  const { followPlayhead } = trainer;

  // One alphaTab instance per file shown.
  useEffect(() => {
    if (!song || !hostRef.current) return undefined;
    setReady(false);
    setLoading(true);
    setPlaying(false);
    setError(null);
    const api = new alphaTab.AlphaTabApi(hostRef.current, {
      core: { engine: 'svg', fontDirectory: '/font/' },
      display: { staveProfile: alphaTab.StaveProfile.Tab, scale: 0.95 },
      player: {
        enablePlayer: true,
        enableCursor: true,
        enableUserInteraction: true,
        soundFont: '/soundfont/sonivox.sf2',
        scrollElement: scrollRef.current,
      },
    });
    apiRef.current = api;
    const tickStart = song.startTick;
    api.renderFinished.on(() => setLoading(false));
    api.playerReady.on(() => setReady(true));
    api.playerStateChanged.on((e) => {
      const isPlaying = e.state === alphaTab.synth.PlayerState.Playing;
      setPlaying(isPlaying);
      if (!isPlaying && e.stopped) followPlayhead(null);
    });
    api.playerPositionChanged.on((e) => {
      if (api.playerState === alphaTab.synth.PlayerState.Playing) followPlayhead((e.currentTick - tickStart) / TICKS_PER_BEAT);
    });
    api.error.on((e) => setError(e?.message ?? String(e)));
    let alive = true;
    (async () => {
      try {
        const bytes = song.source.bytes
          ? new Uint8Array(song.source.bytes)
          : new Uint8Array(await (await fetch(song.source.url)).arrayBuffer());
        if (alive) api.load(bytes, [song.trackIndex]);
      } catch (err) {
        if (alive) setError(err?.message ?? String(err));
      }
    })();
    return () => {
      alive = false;
      followPlayhead(null);
      api.destroy();
      apiRef.current = null;
    };
  }, [songKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // The mixer: exactly the checked tracks sound.
  const mixKey = trainer.mix.join(',');
  useEffect(() => {
    const api = apiRef.current;
    if (!ready || !api?.score) return;
    const on = new Set(trainer.mix);
    const tracks = api.score.tracks;
    api.changeTrackMute(tracks.filter((tr) => !on.has(tr.index)), true);
    api.changeTrackMute(tracks.filter((tr) => on.has(tr.index)), false);
  }, [ready, mixKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (apiRef.current) apiRef.current.playbackSpeed = trainer.tempoPct / 100;
  }, [trainer.tempoPct, ready]);

  useEffect(() => {
    if (apiRef.current) apiRef.current.isLooping = looping;
  }, [looping, ready]);

  if (!song) return null;
  const api = apiRef.current;

  return (
    <section className="gp-song">
      <div className="gp-transport">
        <button type="button" className="primary" onClick={() => api?.playPause()} disabled={!ready}>
          {t(playing ? 'gp.pause' : 'gp.play')}
        </button>
        <button type="button" onClick={() => api?.stop()} disabled={!ready}>
          {t('gp.stop')}
        </button>
        <button
          type="button"
          onClick={() => {
            if (!api) return;
            api.tickPosition = song.startTick;
          }}
          disabled={!ready}
          title={t('gp.toSoloHint')}
        >
          {t('gp.toSolo')}
        </button>
        <label className="lt-field">
          <span>{t('lickTrainer.tempo')}</span>
          <select dir="ltr" value={trainer.tempoPct} onChange={(e) => trainer.setTempoPct(Number(e.target.value))}>
            {TEMPO_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}%
              </option>
            ))}
          </select>
        </label>
        <label className="lt-check">
          <input type="checkbox" checked={looping} onChange={(e) => setLooping(e.target.checked)} />
          {t('gp.loop')}
        </label>
      </div>
      <p className="lt-muted lt-small">{t('gp.songHint')}</p>
      {error && <p className="lt-warning">{t('lickTrainer.error.import', { message: error })}</p>}
      <div className="gp-score-scroll" ref={scrollRef} dir="ltr">
        {loading && <p className="gp-score-loading">{t('gp.loading')}</p>}
        <div className="gp-score" ref={hostRef} />
      </div>
    </section>
  );
}
