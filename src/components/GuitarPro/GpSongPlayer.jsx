import { useEffect, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';
import { TEMPO_OPTIONS } from '../../hooks/useLickTrainer';
import { loadGpSoundFont, tuneVibrato } from '../../audio/alphaTabSound';

const TICKS_PER_BEAT = 960;

// What kind of instrument a track is, for its icon in the rail.
function trackKind(tr) {
  const name = tr.name || '';
  if (tr.percussion || /drum|perc/i.test(name)) return 'drums';
  if (/voice|vocal|vox|sing/i.test(name)) return 'vocal';
  if (/bass/i.test(name) || (tr.program >= 32 && tr.program <= 39)) return 'bass';
  if (/piano|key|organ|synth|rhodes|clav/i.test(name) || (tr.program >= 0 && tr.program <= 23 && !/guitar|gtr/i.test(name))) return 'keys';
  if (/string|violin|cello|viola|orch/i.test(name) || (tr.program >= 40 && tr.program <= 55)) return 'strings';
  return 'guitar';
}
const KIND_ICON = { drums: '🥁', vocal: '🎤', bass: '🎸', keys: '🎹', strings: '🎻', guitar: '🎸' };

// The file's tracks down the left side of the score (like Songsterr /
// Guitar Pro): tap a track to mute or unmute it. Leaves the score the full
// height and nearly the full width.
function TrackRail({ trainer, t }) {
  const tracks = trainer.tracks.filter((tr) => tr.noteCount > 0);
  if (tracks.length === 0) return null;
  const on = new Set(trainer.mix);
  return (
    <div className="gp-rail" role="group" aria-label={t('gp.tracks')}>
      <span className="gp-rail-title">{t('gp.tracksShort')}</span>
      {tracks.map((tr) => {
        const active = on.has(tr.index);
        const kind = trackKind(tr);
        return (
          <button
            key={tr.index}
            type="button"
            className={'gp-rail-track' + (active ? ' active' : '') + (tr.index === trainer.practiceTrack ? ' yours' : '')}
            aria-pressed={active}
            title={`${tr.name} — ${t(active ? 'gp.trackOn' : 'gp.trackOff')}`}
            onClick={() => trainer.toggleTrack(tr.index)}
          >
            <span className={'gp-rail-icon kind-' + kind} aria-hidden="true">
              {KIND_ICON[kind]}
            </span>
            <span className="gp-rail-name" dir="auto">
              {tr.name}
            </span>
            {tr.index === trainer.practiceTrack && <span className="gp-track-you">{t('gp.yourPart')}</span>}
          </button>
        );
      })}
    </div>
  );
}

// GuitarPro -> Song: the whole file, rendered as tab by alphaTab and played
// by its own synth with the track mixer applied — play along with the band.
// The practiced part's current note also lights up on the shared Stage
// fretboard (through the trainer's playhead).
export function GpSongPlayer({ trainer, t }) {
  const hostRef = useRef(null);
  const scrollRef = useRef(null);
  const apiRef = useRef(null);
  const songRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [midiVersion, setMidiVersion] = useState(0); // bumps on every (re)loaded MIDI
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
        scrollElement: scrollRef.current,
        // Scrolling is ours (below): line by line, current line on top.
        scrollMode: alphaTab.ScrollMode.Off,
      },
    });
    apiRef.current = api;
    loadGpSoundFont(api).catch((err) => setError(err?.message ?? String(err)));
    const tickStart = song.startTick;
    api.renderFinished.on(() => setLoading(false));
    // Page-turn scrolling: whenever playback reaches a new line, that line
    // goes to the top of the score area, so the line being played and the
    // next one are always fully in view.
    let lastSystem = -1;
    api.playedBeatChanged.on((beat) => {
      const sys = api.boundsLookup?.findBeat(beat)?.barBounds?.masterBarBounds?.staffSystemBounds;
      const box = scrollRef.current;
      const host = hostRef.current;
      if (!sys || !box || !host || sys.index === lastSystem) return;
      lastSystem = sys.index;
      const hostTop = host.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
      const padTop = parseFloat(getComputedStyle(host).paddingTop) || 0;
      box.scrollTo({ top: Math.max(0, hostTop + padTop + sys.realBounds.y - 6), behavior: 'smooth' });
    });
    // Re-lay the score out to the box's width whenever it changes (track
    // rail appearing, window resize…), so it never needs sideways scrolling.
    let lastWidth = 0;
    let relayout = null;
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(([entry]) => {
            const w = Math.round(entry.contentRect.width);
            if (Math.abs(w - lastWidth) < 4) return;
            const first = lastWidth === 0;
            lastWidth = w;
            if (first) return;
            clearTimeout(relayout);
            relayout = setTimeout(() => {
              lastSystem = -1;
              if (api.score) api.render();
            }, 150);
          });
    resizeObserver?.observe(scrollRef.current);
    api.playerReady.on(() => {
      setReady(true);
      setMidiVersion((v) => v + 1);
    });
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
      resizeObserver?.disconnect();
      clearTimeout(relayout);
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
  }, [ready, mixKey, midiVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const api = apiRef.current;
    if (!api || !ready || !api.score) return;
    api.playbackSpeed = trainer.tempoPct / 100;
    // Keep the vibrato at a real-time rate at this speed (regenerating the
    // MIDI stops playback, so carry on from the same spot).
    if (tuneVibrato(api.settings, api.score.tempo, trainer.tempoPct / 100)) {
      const resumeAt = api.playerState === alphaTab.synth.PlayerState.Playing ? api.tickPosition : null;
      api.loadMidiForScore();
      // The synth worker handles messages in order, so the new MIDI is in
      // place before these run.
      if (resumeAt != null) {
        api.tickPosition = resumeAt;
        api.play();
      }
    }
  }, [trainer.tempoPct, ready]);

  useEffect(() => {
    if (apiRef.current) apiRef.current.isLooping = looping;
  }, [looping, ready]);

  if (!song) return null;
  const api = apiRef.current;

  return (
    <section className="gp-song" ref={songRef}>
      <div className="gp-transport">
        <button
          type="button"
          className="primary"
          onClick={() => {
            if (!api) return;
            // Starting: bring the player to the top of the screen, so the
            // whole score area (which auto-scrolls with the cursor) is in view.
            if (!playing) {
              const bring = () => songRef.current?.scrollIntoView({ block: 'start' });
              bring();
              setTimeout(bring, 250); // again, once anything above has settled
            }
            api.playPause();
          }}
          disabled={!ready}
        >
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
        <label className="gp-inline-field">
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
      {error && <p className="lt-warning">{t('lickTrainer.error.import', { message: error })}</p>}
      <div className="gp-song-body" dir="ltr">
        <TrackRail trainer={trainer} t={t} />
        <div className="gp-score-scroll" ref={scrollRef}>
          {loading && <p className="gp-score-loading">{t('gp.loading')}</p>}
          <div className="gp-score" ref={hostRef} />
        </div>
      </div>
      <p className="lt-muted lt-small">{t('gp.songHint')}</p>
    </section>
  );
}
