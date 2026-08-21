import { useEffect, useRef, useState } from 'react';
import * as alphaTab from '@coderline/alphatab';
import { scoreToChordTimeline } from '../../music/parseGpChords';
import { activeChordEntry } from '../../hooks/useSongChordTimeline';
import { useLanguage } from '../../i18n/LanguageContext';
import './TabViewer.css';

// Songs -> Guitar Pro import: upload a .gp3/.gp4/.gp5/.gpx file and render
// it with alphaTab (MPL-2.0, https://github.com/CoderLine/alphaTab) — a
// mature, purpose-built Guitar Pro parser+renderer+player, not a
// hand-rolled binary-format parser. Everything happens client-side (the
// file never leaves the browser); title/artist come straight from the
// file's own embedded metadata when present.
//
// Deliberately self-contained and independent of every other Songs mode —
// the AlphaTabApi instance is created/destroyed entirely within this
// component's own lifecycle, so it can't affect Song/Solo/Video mode's
// state, and unmounting this component (switching Songs mode away from
// "tab") fully tears it down via api.destroy(), the same discipline this
// app already applies to mic streams and animation loops elsewhere.
//
// `onActiveChordChange` — same prop name/contract SongVideoPlayer.jsx
// already exposes — lets App.jsx highlight whatever chord is currently
// playing on the shared Stage Fretboard, same as Video mode, but driven by
// alphaTab's own playback clock (playerPositionChanged) instead of a
// YouTube player's.
export function TabViewer({ onActiveChordChange, externalFile, hideUpload }) {
  const { t } = useLanguage();
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [meta, setMeta] = useState(null); // { title, artist } | null
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chordTimeline, setChordTimeline] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const api = new alphaTab.AlphaTabApi(containerRef.current, {
      core: {
        engine: 'html5',
        // The @coderline/alphatab-vite plugin copies alphaTab's bundled
        // Bravura music font here (see vite.config.js) — alphaTab's own
        // default doesn't reliably resolve it without being told explicitly.
        fontDirectory: '/font/',
      },
      player: {
        enablePlayer: true,
        enableCursor: true,
        // Bundled SONiVOX soundfont — copied to /soundfont/ at build time by
        // the @coderline/alphatab-vite plugin (see vite.config.js).
        soundFont: '/soundfont/sonivox.sf2',
      },
    });
    apiRef.current = api;

    api.scoreLoaded.on((score) => {
      setMeta({ title: score.title || null, artist: score.artist || null });
      setError(null);
      setIsLoading(false);
      setCurrentTime(0);
      // Fire-and-forget — the tab itself is already visible/usable before
      // this resolves; the Fretboard cross-reference just lights up a beat
      // later once the chord timeline is ready.
      scoreToChordTimeline(score)
        .then(setChordTimeline)
        .catch(() => setChordTimeline([]));
    });
    api.error.on((err) => {
      setError(err?.message ?? String(err));
      setIsLoading(false);
    });
    // currentTime is in milliseconds (see alphaTab's PositionChangedEventArgs);
    // activeChordEntry (useSongChordTimeline.js) expects seconds, same unit
    // SongVideoPlayer's usePlaybackTime already provides it in.
    api.playerPositionChanged.on((e) => {
      setCurrentTime(e.currentTime / 1000);
    });

    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  // Bubble the active chord up for fretboard highlighting, same pattern
  // SongVideoPlayer.jsx uses for its own timeline.
  const active = activeChordEntry(chordTimeline, currentTime);
  useEffect(() => {
    onActiveChordChange?.(active?.chord ?? null);
  }, [active, onActiveChordChange]);

  // Clear the fretboard highlight when leaving this tab/unmounting.
  useEffect(() => () => onActiveChordChange?.(null), [onActiveChordChange]);

  async function loadFile(file) {
    if (!file || !apiRef.current) return;

    setIsLoading(true);
    setError(null);
    setMeta(null);
    setChordTimeline([]);
    try {
      const buffer = await file.arrayBuffer();
      apiRef.current.load(new Uint8Array(buffer));
    } catch (err) {
      setError(err?.message ?? String(err));
      setIsLoading(false);
    }
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    // Reset immediately (not after the async read below) so re-selecting
    // the exact same file still fires onChange — same pattern
    // SongVideoPlayer's own file import already uses.
    e.target.value = '';
    loadFile(file);
  }

  // Driven by TabUploadPanel's single shared file input (see that
  // component) instead of this one's own — only relevant when hideUpload
  // is set. Guarded against re-loading the exact same File on every
  // parent re-render.
  const lastExternalFileRef = useRef(null);
  useEffect(() => {
    if (!externalFile || externalFile === lastExternalFileRef.current) return;
    lastExternalFileRef.current = externalFile;
    loadFile(externalFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalFile]);

  return (
    <div className="tab-viewer">
      {!hideUpload && (
        <label className="tab-viewer-upload">
          {t('songs.tab.upload')}
          <input type="file" accept=".gp3,.gp4,.gp5,.gpx,.gp" onChange={handleFile} />
        </label>
      )}

      {isLoading && <p className="tab-viewer-status">{t('songs.tab.loading')}</p>}
      {error && (
        <p className="tab-viewer-status tab-viewer-error" dir="auto">
          {t('songs.tab.error', { message: error })}
        </p>
      )}

      {meta && (
        <div className="tab-viewer-meta">
          <strong>{meta.title || t('songs.tab.untitled')}</strong>
          {meta.artist && <span className="tab-viewer-artist"> — {meta.artist}</span>}
        </div>
      )}

      <div className="tab-viewer-surface" ref={containerRef} />
    </div>
  );
}
