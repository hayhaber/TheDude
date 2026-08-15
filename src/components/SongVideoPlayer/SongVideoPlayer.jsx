import { useEffect, useRef, useState } from 'react';
import { useYouTubePlayer } from '../../hooks/useYouTubePlayer';
import { usePlaybackTime } from '../../hooks/usePlaybackTime';
import { useSongChordTimeline, activeChordEntry, timelineToJson, parseTimelineJson } from '../../hooks/useSongChordTimeline';
import { useTabAudioChordGuesser } from '../../hooks/useTabAudioChordGuesser';
import { extractYouTubeVideoId } from '../../music/youtubeUrl';
import { generateTimelineFromBpm } from '../../music/chordTimelineSync';
import { parseMidiToChordTimeline } from '../../music/parseMidiChords';
import { parseGpToChordTimeline } from '../../music/parseGpChords';
import { searchYoutubeTopResult } from '../../music/youtubeSearch';
import { getYoutubeApiKey } from '../../audio/youtubeApiKeyStore';
import { useLanguage } from '../../i18n/LanguageContext';
import './SongVideoPlayer.css';

const GP_EXTENSION_RE = /\.(gp3|gp4|gp5|gpx|gp)$/i;

const BEATS_PER_CHORD_OPTIONS = [1, 2, 4, 8];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function downloadJson(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Paste a YouTube URL, watch it in-app via the official IFrame Player API,
// and get a timestamped chord timeline for it without any audio extraction
// (impossible anyway — a YouTube embed plays in a cross-origin iframe, so
// this app's Web Audio API can never see its audio signal, the same
// restriction that blocks reading pixels off a cross-origin canvas) and
// without any invented chord-database API. Three legitimate ways to build a
// timeline instead: tap along by ear one chord at a time (addEntry), import
// a JSON/MIDI file, or paste a chord sequence + BPM and tap Sync on beat 1
// to extrapolate the rest. All three save to the same per-video, persisted
// timeline. `onActiveChordChange` bubbles the currently-playing chord up to
// App.jsx so the shared Stage Fretboard can highlight its voicing live.
export function SongVideoPlayer({ onActiveChordChange }) {
  const { t } = useLanguage();
  const [urlInput, setUrlInput] = useState('');
  const [videoId, setVideoId] = useState(null);
  const [error, setError] = useState(null);
  const [chordInput, setChordInput] = useState('');
  const [syncSequence, setSyncSequence] = useState('');
  const [syncBpm, setSyncBpm] = useState(120);
  const [syncBeatsPerChord, setSyncBeatsPerChord] = useState(4);
  const [importError, setImportError] = useState(null);
  // Guitar Pro import: chords extracted from the file, held here until a
  // video is actually loaded (either via the suggestion below or a manual
  // paste) — a timeline is saved per-videoId (see useSongChordTimeline), so
  // there's nowhere to import into until one exists.
  const [gpImportError, setGpImportError] = useState(null);
  const [pendingGpChords, setPendingGpChords] = useState(null); // { chords, title, artist } | null
  const [ytSuggestion, setYtSuggestion] = useState(null); // { videoId, title, channelTitle, thumbnailUrl } | null
  const [ytSearchStatus, setYtSearchStatus] = useState('idle'); // 'idle' | 'searching' | 'error' | 'done'
  const [ytSearchError, setYtSearchError] = useState(null);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const gpFileInputRef = useRef(null);

  const { isReady, player } = useYouTubePlayer(containerRef, videoId);
  const currentTime = usePlaybackTime(player, isReady);
  const { entries, addEntry, removeEntry, clearAll, importEntries } = useSongChordTimeline(videoId);
  const tabAudio = useTabAudioChordGuesser();

  const active = activeChordEntry(entries, currentTime);
  const activeIndex = active ? entries.indexOf(active) : -1;

  // Bubble the active chord up for fretboard highlighting — a plain effect
  // rather than computing it in the parent, since only this component knows
  // about entries/currentTime.
  useEffect(() => {
    onActiveChordChange?.(active?.chord ?? null);
  }, [active, onActiveChordChange]);

  // Clear the fretboard highlight when leaving this video/unmounting.
  useEffect(() => () => onActiveChordChange?.(null), [onActiveChordChange]);

  // Attaches a pending Guitar-Pro-derived chord timeline to whichever video
  // is (or becomes) active — fires whether that video was set via the
  // auto-search suggestion below or a manual URL paste, and fires
  // immediately if a video is already loaded when the GP file finishes
  // parsing. `pendingGpChords` itself (not just `videoId`) is a dependency
  // so re-importing a second GP file while the same video is already loaded
  // still re-runs this, not just the first time videoId changes.
  useEffect(() => {
    if (!videoId || !pendingGpChords) return;
    importEntries(pendingGpChords.chords);
    setPendingGpChords(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, pendingGpChords]);

  // Keep the active chord scrolled into view as playback moves through the list.
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const activeEl = listRef.current.children[activeIndex];
    activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeIndex]);

  function handleLoad() {
    const id = extractYouTubeVideoId(urlInput);
    if (!id) {
      setError(t('songs.video.invalidUrl'));
      return;
    }
    setError(null);
    setVideoId(id);
  }

  function handleMark() {
    if (!chordInput.trim() || !isReady) return;
    addEntry(currentTime, chordInput);
    setChordInput('');
  }

  // Drops the live chroma-based suggestion into the chord input so the user
  // can just tap Mark to confirm it at the right moment — the guess is
  // never written into the timeline on its own, keeping a human in the loop
  // for something a from-scratch heuristic (no trained model) won't always
  // get right.
  function handleUseGuess() {
    if (tabAudio.guess) setChordInput(tabAudio.guess.chord);
  }

  // Extrapolates evenly-spaced chord changes from BPM + beats-per-chord,
  // anchored to whatever moment playback is at right now — the "paste a
  // chord sheet, tap Sync on beat 1" fallback for a song with no pre-made
  // timeline. Replaces the current timeline outright (importEntries), same
  // as a file import would.
  function handleSync() {
    if (!isReady || !syncSequence.trim()) return;
    const generated = generateTimelineFromBpm({
      chordSequence: syncSequence.split(/\s+/),
      bpm: syncBpm,
      beatsPerChord: syncBeatsPerChord,
      startOffset: currentTime,
    });
    importEntries(generated);
  }

  function handleExport() {
    if (entries.length === 0) return;
    downloadJson(`${videoId}-chords.json`, timelineToJson(entries, { videoId }));
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setImportError(null);
    try {
      const isMidi = /\.(mid|midi)$/i.test(file.name);
      if (isMidi) {
        const buffer = await file.arrayBuffer();
        const parsed = await parseMidiToChordTimeline(buffer);
        if (parsed.length === 0) throw new Error(t('songs.video.midiNoChords'));
        importEntries(parsed);
      } else {
        const text = await file.text();
        importEntries(parseTimelineJson(text));
      }
    } catch (err) {
      setImportError(err.message || String(err));
    }
  }

  // Guitar Pro import: extracts the chord timeline (via alphaTab, reusing
  // parseMidiToChordTimeline's own tempo-aware logic — see
  // music/parseGpChords.js) plus the file's own title/artist metadata when
  // present, then — only if the player has entered their own YouTube Data
  // API key in Settings — searches for a matching video. Never auto-loads a
  // search result on its own; it's always shown as a one-click suggestion
  // (handleUseSuggestion) since a GP file's metadata isn't guaranteed
  // accurate enough to trust blindly. With no API key configured, or no
  // match found, the extracted chords still wait in `pendingGpChords` for
  // whatever video the player loads manually via the URL field below.
  async function handleGpFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setGpImportError(null);
    setYtSuggestion(null);
    setYtSearchError(null);
    setYtSearchStatus('idle');
    try {
      const buffer = await file.arrayBuffer();
      const { chords, title, artist } = await parseGpToChordTimeline(buffer);
      if (chords.length === 0) throw new Error(t('songs.video.midiNoChords'));
      setPendingGpChords({ chords, title, artist });

      const apiKey = getYoutubeApiKey();
      const query = [artist, title].filter(Boolean).join(' ').trim();
      if (apiKey && query) {
        setYtSearchStatus('searching');
        try {
          const result = await searchYoutubeTopResult(query, apiKey);
          setYtSuggestion(result);
          setYtSearchStatus('done');
          if (!result) setYtSearchError(t('songs.video.gpNoYoutubeMatch'));
        } catch (err) {
          setYtSearchStatus('error');
          setYtSearchError(err.message || String(err));
        }
      }
    } catch (err) {
      setGpImportError(err.message || String(err));
    }
  }

  function handleUseSuggestion() {
    if (!ytSuggestion) return;
    setUrlInput(ytSuggestion.videoId);
    setError(null);
    setVideoId(ytSuggestion.videoId);
    setYtSuggestion(null);
  }

  return (
    <div className="song-video-player">
      <label className="song-video-input-row" htmlFor="song-video-url">
        <span className="song-video-label">{t('songs.video.urlLabel')}</span>
        <div className="song-video-input-group">
          <input
            id="song-video-url"
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            placeholder={t('songs.video.placeholder')}
            autoComplete="off"
          />
          <button type="button" className="play-button" onClick={handleLoad}>
            {t('songs.video.load')}
          </button>
        </div>
      </label>

      {error && (
        <p className="song-video-error" dir="auto">
          {error}
        </p>
      )}

      {/* Guitar Pro import — works whether or not a video is loaded yet
          (see the pendingGpChords effect above). Always visible, not nested
          inside the videoId conditional below, since this is exactly how a
          player would naturally start: upload the tab first, then either
          confirm a suggested video or paste one manually. */}
      <div className="song-gp-import-row">
        <input
          ref={gpFileInputRef}
          type="file"
          accept=".gp3,.gp4,.gp5,.gpx,.gp"
          className="song-chord-file-input"
          onChange={handleGpFile}
        />
        <button type="button" className="song-chord-import-btn" onClick={() => gpFileInputRef.current?.click()}>
          {t('songs.video.gpImport')}
        </button>
        <span className="song-chord-import-hint">{t('songs.video.gpImportHint')}</span>
      </div>

      {gpImportError && (
        <p className="song-video-error" dir="auto">
          {gpImportError}
        </p>
      )}

      {ytSearchStatus === 'searching' && (
        <p className="songs-empty-hint" dir="auto">
          {t('songs.video.searchingYoutube')}
        </p>
      )}

      {ytSuggestion && (
        <div className="song-yt-suggestion">
          {ytSuggestion.thumbnailUrl && <img src={ytSuggestion.thumbnailUrl} alt="" className="song-yt-suggestion-thumb" />}
          <div className="song-yt-suggestion-info">
            <strong>{ytSuggestion.title}</strong>
            <span>{ytSuggestion.channelTitle}</span>
          </div>
          <button type="button" className="play-button" onClick={handleUseSuggestion}>
            {t('songs.video.useSuggestion')}
          </button>
        </div>
      )}

      {ytSearchError && (
        <p className="song-video-error" dir="auto">
          {ytSearchError}
        </p>
      )}

      {pendingGpChords && !ytSuggestion && ytSearchStatus !== 'searching' && (
        <p className="songs-empty-hint" dir="auto">
          {t('songs.video.gpChordsReady', { count: pendingGpChords.chords.length })}
        </p>
      )}

      {videoId ? (
        <div className="song-video-layout">
          <div className="song-video-frame-wrap">
            <div ref={containerRef} className="song-video-frame" />
          </div>

          <div className="song-chord-timeline">
            <div className="song-chord-mark-row">
              <span className="song-chord-mark-time">{formatTime(currentTime)}</span>
              <input
                type="text"
                value={chordInput}
                onChange={(e) => setChordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleMark()}
                placeholder={t('songs.video.chordPlaceholder')}
                autoComplete="off"
                disabled={!isReady}
              />
              <button type="button" className="play-button" onClick={handleMark} disabled={!isReady}>
                {t('songs.video.mark')}
              </button>
            </div>

            {/* Live chroma-based chord suggestion from tab-audio you
                explicitly share (see useTabAudioChordGuesser.js) — an
                assistant, not an autopilot: "Use" only fills the input
                above, Mark still confirms it at the right time. */}
            <div className="song-listen-row">
              <button
                type="button"
                className={'song-listen-btn' + (tabAudio.isListening ? ' active' : '')}
                onClick={tabAudio.isListening ? tabAudio.stopListening : tabAudio.startListening}
                disabled={!isReady}
              >
                🎧 {tabAudio.isListening ? t('trainer.stop') : t('songs.video.listen')}
              </button>
              {tabAudio.isListening && (
                <span className="song-listen-guess" dir="auto">
                  {tabAudio.guess ? (
                    <>
                      {t('songs.video.suggested', { chord: tabAudio.guess.chord })}
                      <button type="button" className="song-listen-use" onClick={handleUseGuess}>
                        {t('songs.video.use')}
                      </button>
                    </>
                  ) : (
                    t('songs.video.listening')
                  )}
                </span>
              )}
            </div>
            {tabAudio.error && (
              <p className="song-video-error" dir="auto">
                {tabAudio.error}
              </p>
            )}
            <p className="song-chord-hint" dir="auto">
              {t('songs.video.listenHint')}
            </p>
            <p className="song-chord-hint" dir="auto">
              {t('songs.video.markHint')}
            </p>

            {entries.length > 0 ? (
              <>
                <ol className="song-chord-list" ref={listRef}>
                  {entries.map((entry, i) => (
                    <li key={`${entry.time}-${i}`} className={'song-chord-entry' + (i === activeIndex ? ' active' : '')}>
                      <button
                        type="button"
                        className="song-chord-entry-time"
                        onClick={() => player?.seekTo?.(entry.time, true)}
                      >
                        {formatTime(entry.time)}
                      </button>
                      <span className="song-chord-entry-chord" dir="auto">
                        {entry.chord}
                      </span>
                      <button
                        type="button"
                        className="song-chord-entry-remove"
                        onClick={() => removeEntry(i)}
                        aria-label={t('songs.video.remove')}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="song-chord-list-actions">
                  <button type="button" className="song-chord-clear" onClick={clearAll}>
                    {t('songs.video.clear')}
                  </button>
                  <button type="button" className="song-chord-export" onClick={handleExport}>
                    {t('songs.video.export')}
                  </button>
                </div>
              </>
            ) : (
              <p className="songs-empty-hint" dir="auto">
                {t('songs.video.noChordsHint')}
              </p>
            )}

            {/* Import — a JSON timeline (this app's own export shape, or a
                bare [{time,chord}] array) or a Standard MIDI File, detected
                by extension. */}
            <div className="song-chord-import-row">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.mid,.midi"
                className="song-chord-file-input"
                onChange={handleImportFile}
              />
              <button type="button" className="song-chord-import-btn" onClick={() => fileInputRef.current?.click()}>
                {t('songs.video.import')}
              </button>
              <span className="song-chord-import-hint">{t('songs.video.importHint')}</span>
            </div>
            {importError && (
              <p className="song-video-error" dir="auto">
                {importError}
              </p>
            )}

            {/* BPM/tap-sync fallback — paste a chord sequence, set BPM and
                how many beats each chord holds, then tap Sync exactly on
                beat 1 to extrapolate the rest of the timeline. */}
            <div className="song-sync-panel">
              <p className="song-chord-hint" dir="auto">
                {t('songs.video.syncHint')}
              </p>
              <input
                type="text"
                value={syncSequence}
                onChange={(e) => setSyncSequence(e.target.value)}
                placeholder={t('songs.video.syncSequencePlaceholder')}
                autoComplete="off"
                className="song-sync-sequence"
              />
              <div className="song-sync-controls">
                <label className="song-sync-field">
                  {t('songs.video.bpm')}
                  <input
                    type="number"
                    min="20"
                    max="300"
                    value={syncBpm}
                    onChange={(e) => setSyncBpm(Number(e.target.value))}
                  />
                </label>
                <label className="song-sync-field">
                  {t('songs.video.beatsPerChord')}
                  <select value={syncBeatsPerChord} onChange={(e) => setSyncBeatsPerChord(Number(e.target.value))}>
                    {BEATS_PER_CHORD_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="play-button" onClick={handleSync} disabled={!isReady || !syncSequence.trim()}>
                  {t('songs.video.sync')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        !error && (
          <p className="songs-empty-hint" dir="auto">
            {t('songs.video.emptyHint')}
          </p>
        )
      )}
    </div>
  );
}
