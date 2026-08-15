import { useState } from 'react';
import { ARTISTS } from '../../music/licks';
import { LICK_GENRES, LICK_DIFFICULTIES, filterLickLibrary } from '../../music/lickLibrary';
import { MOTIF_KINDS } from '../../music/motifDevelopment';
import { LickNotation } from '../LickNotation/LickNotation';
import { useLanguage } from '../../i18n/LanguageContext';
import './LickLibraryPanel.css';

const TEMPO_OPTIONS = [0.5, 0.75, 1];

// Curated, browsable replacement for the old "generate a random lick"
// LickPanel — Browse/filter (Artist/Genre/Difficulty, all local UI state:
// this is a display filter, independent of the global selectedArtist that
// Phrase Builder/Call & Response still use for generation), pick one, see
// real tab notation (LickNotation), play it back with tempo control. The
// selected entry becomes App.jsx's `lick` state exactly like a generated
// one did, so Motif Development / Solo Coach / the Fretboard sync below all
// keep working unchanged — only how a lick gets chosen changed.
export function LickLibraryPanel({ selectedLick, onSelectLick, onPlay, tempo, onTempoChange, motifKind, onMotifChange, playingNoteOrder }) {
  const [artistFilter, setArtistFilter] = useState(null);
  const [genreFilter, setGenreFilter] = useState(null);
  const [difficultyFilter, setDifficultyFilter] = useState(null);
  const { t } = useLanguage();

  const results = filterLickLibrary({ artistKey: artistFilter, genre: genreFilter, difficulty: difficultyFilter });
  const activeIndex = selectedLick && playingNoteOrder != null ? playingNoteOrder - 1 : null;

  return (
    <div className="lick-library-panel">
      <div className="lick-library-filters">
        <label className="lick-library-field">
          {t('lickLibrary.artist')}
          <select value={artistFilter ?? ''} onChange={(e) => setArtistFilter(e.target.value || null)}>
            <option value="">{t('lickLibrary.all')}</option>
            {ARTISTS.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="lick-library-field">
          {t('lickLibrary.genre')}
          <select value={genreFilter ?? ''} onChange={(e) => setGenreFilter(e.target.value || null)}>
            <option value="">{t('lickLibrary.all')}</option>
            {LICK_GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className="lick-library-field">
          {t('lickLibrary.difficulty')}
          <select value={difficultyFilter ?? ''} onChange={(e) => setDifficultyFilter(e.target.value || null)}>
            <option value="">{t('lickLibrary.all')}</option>
            {LICK_DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {t(`difficulty.${d}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="lick-library-list">
        {results.length === 0 && <p className="lick-library-empty">{t('lickLibrary.empty')}</p>}
        {results.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={'lick-library-item' + (selectedLick?.id === entry.id ? ' active' : '')}
            onClick={() => onSelectLick(entry)}
          >
            <span className="lick-library-item-title">{entry.title}</span>
            <span className="lick-library-item-tags">
              <span className="lick-library-tag">{t(`difficulty.${entry.difficulty}`)}</span>
              <span className="lick-library-tag">{entry.genre}</span>
              <span className="lick-library-tag">{entry.key}</span>
            </span>
          </button>
        ))}
      </div>

      {selectedLick && (
        <div className="lick-library-detail">
          <p className="lick-meta">
            <span className="lick-meta-tag">{t(`difficulty.${selectedLick.difficulty}`)}</span>
            <span className="lick-meta-tag">{selectedLick.style}</span>
            <span className="lick-meta-tag">{selectedLick.position}</span>
            <span className="lick-meta-tag">{selectedLick.scale}</span>
            {selectedLick.techniques.map((tech) => (
              <span key={tech} className="lick-meta-tag">
                {tech}
              </span>
            ))}
          </p>

          <LickNotation notes={selectedLick.notes} activeIndex={activeIndex} />

          <div className="lick-library-controls">
            <button type="button" className="play-button" onClick={onPlay}>
              {t('lickLibrary.play')}
            </button>

            <div className="mode-toggle lick-library-tempo" role="group" aria-label={t('lickLibrary.tempo')}>
              {TEMPO_OPTIONS.map((option) => (
                <button key={option} type="button" className={tempo === option ? 'active' : ''} onClick={() => onTempoChange(option)}>
                  {option}×
                </button>
              ))}
            </div>
          </div>

          <div className="lick-motif-row">
            {MOTIF_KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                className={'lick-motif-chip' + (motifKind === k.key ? ' active' : '')}
                onClick={() => onMotifChange(k.key)}
              >
                {k.label}
              </button>
            ))}
          </div>

          <p className="lick-legend">{t('lickPanel.legend')}</p>
        </div>
      )}
    </div>
  );
}
