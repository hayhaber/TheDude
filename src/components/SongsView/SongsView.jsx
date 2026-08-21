import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useInstrument } from '../../instruments/useInstrument';
import { SongVideoPlayer } from '../SongVideoPlayer/SongVideoPlayer';
import { TabUploadPanel } from '../TabUploadPanel/TabUploadPanel';
import './SongsView.css';

// Query-builder only — this app can't legitimately host chord charts, lyrics,
// or TAB transcriptions for real/commercial songs (copyright lives in the
// underlying song, not in whoever wrote the chart), so "search" here means
// opening the destination site's own search-results page in a new tab, not
// fetching/displaying anything in-app. URL patterns verified live before
// shipping this.
const DESTINATIONS = {
  song: [
    {
      key: 'ug-chords',
      labelKey: 'songs.dest.ugChords',
      url: (q) => `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}`,
    },
  ],
  solo: [
    {
      key: 'songsterr',
      labelKey: 'songs.dest.songsterr',
      url: (q) => `https://www.songsterr.com/?pattern=${encodeURIComponent(q)}`,
    },
    {
      key: 'ug-tabs',
      labelKey: 'songs.dest.ugTabs',
      url: (q) => `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}`,
    },
  ],
  // Guitar Pro FILE search specifically (not chord charts) — each URL
  // pattern was verified live by actually submitting a search on the real
  // site and reading back the resulting address, not guessed. type=500 on
  // Ultimate Guitar is specifically its "Guitar Pro" result-type filter, not
  // its general chord-chart search (which .song above already covers).
  gpFiles: [
    {
      key: 'ug-gp',
      labelKey: 'songs.dest.ugGp',
      url: (q) => `https://www.ultimate-guitar.com/search.php?title=${encodeURIComponent(q)}&page=1&type=500`,
    },
    {
      key: 'gprotab',
      labelKey: 'songs.dest.gprotab',
      url: (q) => `https://gprotab.net/en/search?type=song&q=${encodeURIComponent(q)}`,
    },
    {
      key: 'guitarprotabs-org',
      labelKey: 'songs.dest.guitarprotabsOrg',
      url: (q) => `https://guitarprotabs.org/search.php?search=${encodeURIComponent(q)}&in=songs&page=1`,
    },
    {
      key: 'theguitarlesson',
      labelKey: 'songs.dest.theguitarlesson',
      url: (q) => `https://www.theguitarlesson.com/guitar-pro-tabs/?s=${encodeURIComponent(q)}`,
    },
  ],
};

// Per-mode field label/placeholder/empty-hint i18n keys — every mode here
// shares the exact same "type a query, get a list of destination links"
// layout below, just with different copy and a different DESTINATIONS list.
const SEARCH_MODE_TEXT = {
  song: { fieldLabelKey: 'songs.songFieldLabel', placeholderKey: 'songs.songPlaceholder', emptyHintKey: 'songs.emptyHintSong' },
  solo: { fieldLabelKey: 'songs.soloFieldLabel', placeholderKey: 'songs.soloPlaceholder', emptyHintKey: 'songs.emptyHintSolo' },
  gpFiles: { fieldLabelKey: 'songs.gpFilesFieldLabel', placeholderKey: 'songs.gpFilesPlaceholder', emptyHintKey: 'songs.emptyHintGpFiles' },
};

export function SongsView({ onSongActiveChordChange, onSongTabLickChange, onSongTabPlayingOrderChange }) {
  const [mode, setMode] = useState('song');
  const [query, setQuery] = useState('');
  const { t } = useLanguage();
  const { instrument } = useInstrument();

  const trimmed = query.trim();
  const destinations = DESTINATIONS[mode];
  const modeText = SEARCH_MODE_TEXT[mode];

  return (
    <div className="songs-view">
      <div>
        <h1>{t('songs.title')}</h1>
        <p className="subtitle">{t('songs.subtitle')}</p>
      </div>

      {/* 4 options (Song / Solo / Video / Tab / GP Files) — a dropdown
          rather than a segmented toggle, per this app's own convention that
          a control with more than 2 choices is a <select>. "Tab" is a
          single upload point covering BOTH Guitar Pro files and TAB PDFs
          (previously two separate options) — TabUploadPanel tells them
          apart by file extension, so the player just uploads the file
          they have without needing to know which engine reads it. */}
      <label className="songs-mode-field">
        {t('songs.modeLabel')}
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="song">{t('songs.mode.song')}</option>
          <option value="solo">{t('songs.mode.solo')}</option>
          <option value="video">{t('songs.mode.video')}</option>
          <option value="tabUpload">{t('songs.mode.tabUpload')}</option>
          <option value="gpFiles">{t('songs.mode.gpFiles')}</option>
        </select>
      </label>

      {mode === 'video' ? (
        <SongVideoPlayer onActiveChordChange={onSongActiveChordChange} />
      ) : mode === 'tabUpload' ? (
        <TabUploadPanel
          onActiveChordChange={onSongActiveChordChange}
          onLickChange={onSongTabLickChange}
          onPlayingOrderChange={onSongTabPlayingOrderChange}
          instrument={instrument}
        />
      ) : (
        <>
          <div className="songs-search-field">
            <label htmlFor="songs-query">{t(modeText.fieldLabelKey)}</label>
            <input
              id="songs-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                // A single Enter opens the first (most relevant) destination
                // directly — same one-click convenience as SongVideoPlayer's
                // URL field, instead of requiring a click down into the list
                // every time for what's usually the site you'd pick anyway.
                if (e.key === 'Enter' && trimmed && destinations[0]) {
                  window.open(destinations[0].url(trimmed), '_blank', 'noopener,noreferrer');
                }
              }}
              placeholder={t(modeText.placeholderKey)}
              autoComplete="off"
            />
          </div>

          {trimmed ? (
            <div className="songs-destinations">
              <p className="songs-destinations-label">{t('songs.openOn')}</p>
              {destinations.map((d) => (
                <a
                  key={d.key}
                  className="songs-destination-card"
                  href={d.url(trimmed)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>{t(d.labelKey)}</span>
                  <span className="songs-destination-arrow" aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          ) : (
            <p className="songs-empty-hint" dir="auto">
              {t(modeText.emptyHintKey)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
