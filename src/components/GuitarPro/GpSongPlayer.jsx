import { useEffect, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';
import { TEMPO_OPTIONS } from '../../hooks/useLickTrainer';
import { loadGpSoundFont, tuneVibrato, wakeAudio, GP_MASTER_VOLUME } from '../../audio/alphaTabSound';
import { PIANO_PROFILE_GM_PROGRAM, BASS_PROFILE_GM_PROGRAM } from '../../audio/instrumentProfiles';
import { describeScore, isGuitarTrack, trackKind, labelChords, fixKeysOctave, bassTrackIndex, suggestedBassLine, addSuggestedBassTrack } from '../../music/lickTrainer/gpImport';

const TICKS_PER_BEAT = 960;

// Chord names get a row of their own: alphaTab lets them share the top row
// with section markers ("Guitar Solo 1") and the two then print on top of
// each other. Patched on the main thread, so the song view renders there
// (core.useWorkers: false) — the synth still runs in its own worker.
let chordRowPatched = false;
function giveChordNamesTheirOwnRow() {
  if (chordRowPatched) return;
  chordRowPatched = true;
  for (const factory of alphaTab.Environment?.defaultRenderers ?? []) {
    for (const band of factory.effectBands ?? []) {
      if (band.effect?.notationElement === alphaTab.NotationElement.EffectChordNames) {
        Object.defineProperty(band.effect, 'canShareBand', { get: () => false });
      }
    }
  }
}

// The chord names' font carries this made-up family first, so they can be
// told apart from every other text in the score's SVG (and styled).
const CHORD_FONT_TAG = 'DSChordName';

const KIND_ICON = { drums: '🥁', vocal: '🎤', bass: '🎸', keys: '🎹', strings: '🎻', guitar: '🎸' };

function SpeakerIcon({ on }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
      {on ? (
        <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.3 6.3 0 0 1 0 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      ) : (
        <path d="M10.5 6l4 4M14.5 6l-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      )}
    </svg>
  );
}

// The file's tracks down the left side of the score (like Songsterr /
// Guitar Pro): tap a track to show its part (score + neck, and it's the one
// practiced); the speaker beside it mutes / unmutes it.
function TrackRail({ trainer, t, open, onToggle, solo }) {
  const tracks = trainer.tracks.filter((tr) => tr.noteCount > 0);
  if (tracks.length === 0) return null;
  const on = new Set(trainer.mix);
  return (
    <div className="gp-rail" role="group" aria-label={t('gp.tracks')}>
      <div className="gp-rail-head">
        <span className="gp-rail-title">{t('gp.tracksShort')}</span>
        {/* Opens the mixer (each track's level) to the right. */}
        <button
          type="button"
          className={'gp-rail-expand' + (open ? ' is-open' : '')}
          onClick={onToggle}
          aria-expanded={open}
          aria-label={t(open ? 'gp.mixerClose' : 'gp.mixerOpen')}
          title={t(open ? 'gp.mixerClose' : 'gp.mixerOpen')}
        >
          <MixerIcon />
        </button>
      </div>
      {tracks.map((tr) => {
        const sounding = on.has(tr.index);
        // Heard right now: in the mix, and not silenced by another track's solo.
        const heard = sounding && (solo.size === 0 || solo.has(tr.index));
        const shown = tr.index === trainer.displayTrack;
        const kind = trackKind(tr);
        return (
          <div key={tr.index} className={'gp-rail-row' + (shown ? ' shown' : '') + (heard ? '' : ' muted')}>
            <button
              type="button"
              className="gp-rail-track"
              aria-pressed={shown}
              title={`${tr.name} — ${t('gp.trackShow')}`}
              onClick={() => !shown && trainer.setDisplayTrack(tr.index)}
            >
              <span className={'gp-rail-icon kind-' + kind} aria-hidden="true">
                {KIND_ICON[kind]}
              </span>
              <span className="gp-rail-name" dir="auto">
                {tr.suggested ? t('gp.suggestedBass') : tr.name}
              </span>
            </button>
            <button
              type="button"
              className="gp-rail-mute"
              aria-pressed={!sounding}
              aria-label={`${tr.name} — ${t(sounding ? 'gp.trackOn' : 'gp.trackOff')}`}
              title={`${tr.name} — ${t(sounding ? 'gp.trackOn' : 'gp.trackOff')}`}
              onClick={() => trainer.toggleTrack(tr.index)}
            >
              <SpeakerIcon on={sounding} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MixerIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 2v12M8 2v12M12 2v12" opacity=".45" />
      <rect x="2.4" y="8.5" width="3.2" height="2.6" rx=".8" fill="currentColor" stroke="none" />
      <rect x="6.4" y="4" width="3.2" height="2.6" rx=".8" fill="currentColor" stroke="none" />
      <rect x="10.4" y="10" width="3.2" height="2.6" rx=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}

// The mixer, opened to the right of the rail over the score: per track,
// show it, mute, solo, and its level — to keep the band audible but quieter
// under the part you're playing.
function TrackMixerPanel({ trainer, t, solo, onSolo, onClose, open }) {
  const tracks = trainer.tracks.filter((tr) => tr.noteCount > 0);
  const on = new Set(trainer.mix);
  return (
    <div
      className={'gp-mixer-panel' + (open ? ' is-open' : '')}
      role="dialog"
      aria-label={t('gp.mixerTitle')}
      aria-hidden={!open}
      inert={!open}
      dir="auto"
    >
      <div className="gp-mixer-head">
        <b>{t('gp.mixerTitle')}</b>
        <button type="button" className="gp-mixer-close" onClick={onClose} aria-label={t('gp.mixerClose')}>
          ‹
        </button>
      </div>
      <div className="gp-mixer-rows">
        {tracks.map((tr) => {
          const kind = trackKind(tr);
          const sounding = on.has(tr.index);
          // The icon is in colour while the track is heard, grey when it's
          // muted or another track is soloed.
          const heard = sounding && (solo.size === 0 || solo.has(tr.index));
          const shown = tr.index === trainer.displayTrack;
          const level = trainer.volumes[tr.index] ?? 1;
          // Muted: the fader shows 0; unmuting brings back the level it had.
          const shownLevel = sounding ? level : 0;
          return (
            <div key={tr.index} className={'gp-mix-row' + (shown ? ' shown' : '') + (heard ? '' : ' muted')}>
              <button
                type="button"
                className="gp-mix-name"
                onClick={() => !shown && trainer.setDisplayTrack(tr.index)}
                title={`${tr.name} — ${t('gp.trackShow')}`}
              >
                <span className={'gp-rail-icon kind-' + kind} aria-hidden="true">
                  {KIND_ICON[kind]}
                </span>
                <span dir="auto">{tr.suggested ? t('gp.suggestedBass') : tr.name}</span>
              </button>
              <div className="gp-mix-controls">
                <button
                  type="button"
                  className={'gp-mix-btn' + (solo.has(tr.index) ? ' on' : '')}
                  aria-pressed={solo.has(tr.index)}
                  onClick={() => onSolo(tr.index)}
                >
                  {t('gp.solo')}
                </button>
                <button
                  type="button"
                  className={'gp-mix-btn mute' + (sounding ? '' : ' on')}
                  aria-pressed={!sounding}
                  onClick={() => trainer.toggleTrack(tr.index)}
                >
                  {t('gp.mute')}
                </button>
                <input
                  type="range"
                  dir="ltr"
                  className="gp-mix-level"
                  min={0}
                  max={100}
                  value={Math.round(shownLevel * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100;
                    // Raising a muted track's fader unmutes it.
                    if (!sounding && v > 0) trainer.toggleTrack(tr.index);
                    if (sounding || v > 0) trainer.setTrackVolume(tr.index, v);
                  }}
                  aria-label={`${tr.name} — ${t('gp.volume')}`}
                />
                <span className="gp-mix-pct" dir="ltr">{Math.round(shownLevel * 100)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// How a track's part is drawn: guitar as tab, bass as notation + tab,
// everything else (keys, vocals, drums…) as notation.
function staveProfileFor(tr) {
  if (!tr) return alphaTab.StaveProfile.Tab;
  const kind = trackKind(tr);
  if (isGuitarTrack(tr)) return alphaTab.StaveProfile.Tab;
  if (kind === 'bass' && tr.strings > 0) return alphaTab.StaveProfile.Default;
  return alphaTab.StaveProfile.Score;
}

// Small transport glyphs (drawn, so they look the same on every device).
function TransportIcon({ kind }) {
  return (
    <svg className="gp-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      {kind === 'play' && <path d="M4 2.5v11l9-5.5z" fill="currentColor" />}
      {kind === 'pause' && (
        <>
          <rect x="3.5" y="2.5" width="3" height="11" rx="0.8" fill="currentColor" />
          <rect x="9.5" y="2.5" width="3" height="11" rx="0.8" fill="currentColor" />
        </>
      )}
      {kind === 'stop' && <rect x="3" y="3" width="10" height="10" rx="1.2" fill="currentColor" />}
      {kind === 'solo' && <path d="M3 2.5v11M5.5 8l8-5.5v11z" stroke="currentColor" strokeWidth="1.6" fill="currentColor" strokeLinejoin="round" />}
      {kind === 'loop' && (
        <path
          d="M4 6.5a3.5 3.5 0 0 1 3.5-3.5h4M10 1l2 2-2 2M12 9.5a3.5 3.5 0 0 1-3.5 3.5h-4M6 15l-2-2 2-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

// GuitarPro -> Song: the whole file, rendered as tab by alphaTab and played
// by its own synth with the track mixer applied — play along with the band.
// The practiced part's current note also lights up on the shared Stage
// fretboard (through the trainer's playhead).
export function GpSongPlayer({ trainer, t, pianoProfile, bassProfile }) {
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
  // One alphaTab instance per FILE: switching the shown track just redraws.
  const songKey = song ? song.source.key : null;
  const trackIndex = song?.trackIndex ?? null;
  const [scoreVersion, setScoreVersion] = useState(0);
  const [mixerOpen, setMixerOpen] = useState(false);
  const [solo, setSolo] = useState(() => new Set());
  const { followPlayhead } = trainer;
  // Where the shown part's beat 0 is (changes with the shown track).
  const tickStartRef = useRef(0);
  tickStartRef.current = song?.startTick ?? 0;
  const trackIndexRef = useRef(null);
  trackIndexRef.current = trackIndex;
  // Tracks whose chord names were already written into this file's score.
  const labeledRef = useRef(new Set());

  // One alphaTab instance per file shown.
  useEffect(() => {
    if (!song || !hostRef.current) return undefined;
    setReady(false);
    setLoading(true);
    setPlaying(false);
    setSolo(new Set());
    setError(null);
    giveChordNamesTheirOwnRow();
    const api = new alphaTab.AlphaTabApi(hostRef.current, {
      // Main-thread rendering (see giveChordNamesTheirOwnRow). Lazy loading
      // stays off: with it on (and no workers) playback wouldn't start.
      core: { engine: 'svg', fontDirectory: '/font/', useWorkers: false, enableLazyLoading: false },
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
    // Chord names above the staff: upright and bold, so they read at a glance.
    api.settings.display.resources.elementFonts.set(
      alphaTab.NotationElement.EffectChordNames,
      new alphaTab.model.Font(`${CHORD_FONT_TAG}, Arial, sans-serif`, 13, alphaTab.model.FontStyle.Plain, alphaTab.model.FontWeight.Bold)
    );
    api.masterVolume = GP_MASTER_VOLUME;
    loadGpSoundFont(api).catch((err) => setError(err?.message ?? String(err)));
    let lastSystem = -1;
    labeledRef.current = new Set();
    api.scoreLoaded.on((score) => {
      fixKeysOctave(score); // before the MIDI and the drawing
      // No bass part: a suggested bass line as an extra track (heard and
      // shown only in bass mode — muted otherwise, see the mixer effect).
      if (!score.__bassChecked) {
        score.__bassChecked = true;
        if (bassTrackIndex(describeScore(score)) == null) {
          const line = suggestedBassLine(score);
          if (line.length) addSuggestedBassTrack(score, line, t('gp.suggestedBass'), api.settings);
        }
      }
      // Chord names for the first track shown, before it's drawn.
      const shownTrack = trackIndexRef.current;
      if (shownTrack != null && !labeledRef.current.has(shownTrack) && score.tracks[shownTrack]) {
        labeledRef.current.add(shownTrack);
        labelChords(score, shownTrack);
      }
      setScoreVersion((v) => v + 1);
    });
    api.renderFinished.on(() => {
      lastSystem = -1;
      setLoading(false);
    });
    // Page-turn scrolling: whenever playback reaches a new line, that line
    // goes to the top of the score area, so the line being played and the
    // next one are always fully in view.
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
      if (api.playerState === alphaTab.synth.PlayerState.Playing) followPlayhead((e.currentTick - tickStartRef.current) / TICKS_PER_BEAT);
    });
    api.error.on((e) => setError(e?.message ?? String(e)));
    let alive = true;
    (async () => {
      try {
        const bytes = song.source.bytes
          ? new Uint8Array(song.source.bytes)
          : new Uint8Array(await (await fetch(song.source.url)).arrayBuffer());
        // A track added on load (the suggested bass line) doesn't exist yet:
        // start on the first and switch once it's there.
        const first = song.trackIndex === trainer.suggestedBassIndex ? 0 : song.trackIndex;
        if (alive) api.load(bytes, [first]);
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

  // Draw the shown track (and in the right notation for its instrument).
  useEffect(() => {
    const api = apiRef.current;
    const score = api?.score;
    if (!score || trackIndex == null || !score.tracks[trackIndex]) return;
    const profile = staveProfileFor(describeScore(score).tracks[trackIndex]);
    let named = 0;
    if (!labeledRef.current.has(trackIndex)) {
      labeledRef.current.add(trackIndex);
      named = labelChords(score, trackIndex).length;
    }
    const drawn = api.tracks?.length === 1 && api.tracks[0].index === trackIndex;
    if (drawn && !named && api.settings.display.staveProfile === profile) return;
    setLoading(true);
    api.settings.display.staveProfile = profile;
    api.updateSettings();
    api.renderTracks([score.tracks[trackIndex]]);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [scoreVersion, trackIndex]);

  // Piano: the shown track an octave up/down (sound + notation). Every
  // staff keeps its loaded transposition (incl. fixKeysOctave) as the base.
  const octave = trainer.pianoMode ? trainer.pianoOctave ?? 0 : 0;
  // Piano: a keyboard part shown plays with the sound picked on the panel
  // (Rhodes, harpsichord…) — its GM program; null = the file's own.
  const program =
    trainer.pianoMode && pianoProfile
      ? PIANO_PROFILE_GM_PROGRAM[pianoProfile] ?? null
      : trainer.bassMode && bassProfile
      ? BASS_PROFILE_GM_PROGRAM[bassProfile] ?? null
      : null;
  // Which kind of part takes the panel's/settings' sound in this mode.
  const programKind = trainer.pianoMode ? 'keys' : trainer.bassMode ? 'bass' : null;
  useEffect(() => {
    const api = apiRef.current;
    const score = api?.score;
    if (!score || !ready) return undefined;
    // Quick taps (−, −) settle into one reload.
    const timer = setTimeout(() => applyOctave(api, score), 220);
    return () => clearTimeout(timer);
  }, [octave, program, trackIndex, ready, scoreVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  function applyOctave(api, score) {
    let changed = false;
    for (const tr of score.tracks) {
      for (const st of tr.staves) {
        if (st.__baseTransposition === undefined) st.__baseTransposition = st.transpositionPitch;
        const want = st.__baseTransposition - (tr.index === trackIndex ? 12 * octave : 0);
        if (st.transpositionPitch !== want) {
          st.transpositionPitch = want;
          changed = true;
        }
      }
    }
    const keysShown = programKind != null && trackKind(describeScore(score).tracks[trackIndex] ?? {}) === programKind;
    for (const tr of score.tracks) {
      const info = tr.playbackInfo;
      if (info.__fileProgram === undefined) info.__fileProgram = info.program;
      const want = program != null && keysShown && tr.index === trackIndex ? program : info.__fileProgram;
      if (info.program !== want) {
        info.program = want;
        changed = true;
      }
    }
    if (!changed) return;
    const resumeAt = api.playerState === alphaTab.synth.PlayerState.Playing ? api.tickPosition : null;
    api.loadMidiForScore();
    api.render();
    setMidiVersion((v) => v + 1); // re-apply the mutes
    if (resumeAt != null) {
      api.tickPosition = resumeAt;
      api.play();
    }
  }

  // The mixer: exactly the checked tracks sound.
  const mixKey = trainer.mix.join(',');
  useEffect(() => {
    const api = apiRef.current;
    if (!ready || !api?.score) return;
    const on = new Set(trainer.mix);
    const tracks = api.score.tracks;
    // The suggested bass line only plays in bass mode.
    const hears = (tr) => on.has(tr.index) && (!tr.__suggestedBass || trainer.bassMode);
    api.changeTrackMute(tracks.filter((tr) => !hears(tr)), true);
    api.changeTrackMute(tracks.filter((tr) => hears(tr)), false);
  }, [ready, mixKey, midiVersion, trainer.bassMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Solo (this view only) and each track's level.
  const soloKey = [...solo].join(',');
  useEffect(() => {
    const api = apiRef.current;
    if (!ready || !api?.score) return;
    const tracks = api.score.tracks;
    api.changeTrackSolo(tracks.filter((tr) => !solo.has(tr.index)), false);
    api.changeTrackSolo(tracks.filter((tr) => solo.has(tr.index)), true);
  }, [ready, soloKey, midiVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const volumesKey = JSON.stringify(trainer.volumes);
  useEffect(() => {
    const api = apiRef.current;
    if (!ready || !api?.score) return;
    for (const tr of api.score.tracks) api.changeTrackVolume([tr], trainer.volumes[tr.index] ?? 1);
  }, [ready, volumesKey, midiVersion]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Space bar = Play / Pause (as in Guitar Pro), unless typing in a field.
  const playPauseRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target;
      if (el?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName ?? '')) return;
      if (!playPauseRef.current) return;
      // Also stops a focused button from "clicking" itself and the page scrolling.
      e.preventDefault();
      playPauseRef.current();
    };
    // A focused button would also "click" on the space's key-up.
    const onKeyUp = (e) => {
      if ((e.code === 'Space' || e.key === ' ') && e.target?.tagName === 'BUTTON' && playPauseRef.current) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  if (!song) return null;
  const api = apiRef.current;
  const togglePlay = () => {
    if (!api) return;
    // A real tap: make sure the player's audio is awake.
    wakeAudio();
    // Starting: bring the player to the top of the screen, so the
    // whole score area (which auto-scrolls with the cursor) is in view.
    if (!playing) {
      const bring = () => songRef.current?.scrollIntoView({ block: 'start' });
      bring();
      setTimeout(bring, 250); // again, once anything above has settled
    }
    api.playPause();
  };
  playPauseRef.current = ready ? togglePlay : null;

  return (
    <section className={'gp-song' + (trainer.pianoMode ? ' is-piano' : '')} ref={songRef}>
      <div className="gp-transport">
        <button
          type="button"
          className="primary"
          onClick={togglePlay}
          disabled={!ready}
        >
          <TransportIcon kind={playing ? 'pause' : 'play'} />
          {t(playing ? 'gp.pause' : 'gp.play')}
        </button>
        <button type="button" onClick={() => api?.stop()} disabled={!ready}>
          <TransportIcon kind="stop" />
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
          <TransportIcon kind="solo" />
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
        <button
          type="button"
          className={'gp-toggle' + (looping ? ' active' : '')}
          aria-pressed={looping}
          onClick={() => setLooping((l) => !l)}
        >
          <TransportIcon kind="loop" />
          {t('gp.loop')}
        </button>
      </div>
      {trainer.activeSolo?.displayOnly && !trainer.activeSolo.pending && !trainer.pianoMode && (
        <p className="lt-muted lt-small">{t(trainer.bassMode ? 'gp.notBassPart' : 'gp.notationOnly')}</p>
      )}
      {trainer.bassMode && trainer.activeSolo?.suggestedBass && <p className="lt-muted lt-small">{t('gp.suggestedBassHint')}</p>}
      {trainer.bassMode && trainer.activeSolo?.octaveFolded && <p className="lt-muted lt-small">{t('gp.bassFolded')}</p>}
      {error && <p className="lt-warning">{t('lickTrainer.error.import', { message: error })}</p>}
      <div className="gp-song-body" dir="ltr">
        <TrackRail trainer={trainer} t={t} open={mixerOpen} onToggle={() => setMixerOpen((o) => !o)} solo={solo} />
        {trainer.tracks.length > 0 && (
          <TrackMixerPanel
            open={mixerOpen}
            trainer={trainer}
            t={t}
            solo={solo}
            onSolo={(i) =>
              setSolo((s) => {
                const next = new Set(s);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              })
            }
            onClose={() => setMixerOpen(false)}
          />
        )}
        <div className="gp-score-scroll" ref={scrollRef}>
          {loading && <p className="gp-score-loading">{t('gp.loading')}</p>}
          <div className="gp-score" ref={hostRef} />
        </div>
      </div>
      <p className="lt-muted lt-small">{t('gp.songHint')}</p>
    </section>
  );
}
