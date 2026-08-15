import { useState } from 'react';
import { EmotionSelector } from '../EmotionSelector/EmotionSelector';
import { LickLibraryPanel } from '../LickLibraryPanel/LickLibraryPanel';
import { PhraseBuilderPanel } from '../PhraseBuilderPanel/PhraseBuilderPanel';
import { SoloCoachPanel } from '../SoloCoachPanel/SoloCoachPanel';
import { ARTISTS } from '../../music/licks';
import { useLanguage } from '../../i18n/LanguageContext';
import './ImproviseView.css';

const TABS = [
  { key: 'lick', labelKey: 'improvise.tab.lick' },
  { key: 'phrase', labelKey: 'improvise.tab.phrase' },
  { key: 'coach', labelKey: 'improvise.tab.coach' },
];

// Generates melodic content over whatever's currently active in Compose.
// Emotion and Artist are shared context across every generator here (Artist
// specifically drives Phrase Builder/Call & Response — the Lick Library tab
// below has its own independent artist FILTER, since browsing "all artists"
// is a valid filter state that wouldn't make sense for those generators),
// so both are pinned at the top rather than repeated per tab. Sub-tab
// choice is purely local UI state — nothing else in the app depends on
// which generator is showing.
export function ImproviseView({
  emotionKey,
  handleEmotionChange,
  selectedArtist,
  handleArtistChange,
  displayedLick,
  handleSelectLibraryLick,
  handlePlayLick,
  lickTempo,
  handleLickTempoChange,
  currentPosition,
  motifKind,
  handleMotifChange,
  playingNoteOrder,
  phrase,
  flatPhraseNotes,
  handleBuildPhrase,
  handlePlayPhrase,
  phrasePlayingOrder,
  callResponse,
  handleBuildCallResponse,
  handlePlayCall,
  handlePlayResponse,
  handlePlayCallAndResponse,
  crPlaying,
  progressionLength,
  soloCoachSubject,
  soloFeedback,
  handleAnalyzeSolo,
}) {
  const [tab, setTab] = useState('lick');
  const { t } = useLanguage();

  return (
    <div className="improvise-view">
      <div>
        <h1>{t('improvise.title')}</h1>
        <p className="subtitle">{t('improvise.subtitle')}</p>
      </div>

      <div className="improvise-top-controls">
        <EmotionSelector emotionKey={emotionKey} onChange={handleEmotionChange} />

        <label className="improvise-field">
          {t('lickPanel.artistStyle')}
          <select value={selectedArtist} onChange={(e) => handleArtistChange(e.target.value)}>
            {ARTISTS.map((artist) => (
              <option key={artist.key} value={artist.key}>
                {artist.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mode-toggle wrap improvise-tabs" role="group" aria-label={t('improvise.tabsLabel')}>
        {TABS.map((tab_) => (
          <button key={tab_.key} type="button" className={tab === tab_.key ? 'active' : ''} onClick={() => setTab(tab_.key)}>
            {t(tab_.labelKey)}
          </button>
        ))}
      </div>

      {tab === 'lick' && (
        <LickLibraryPanel
          selectedLick={displayedLick}
          onSelectLick={handleSelectLibraryLick}
          onPlay={handlePlayLick}
          tempo={lickTempo}
          onTempoChange={handleLickTempoChange}
          motifKind={motifKind}
          onMotifChange={handleMotifChange}
          playingNoteOrder={playingNoteOrder}
        />
      )}

      {tab === 'phrase' && (
        <PhraseBuilderPanel
          disabled={!currentPosition || progressionLength === 0}
          phrase={phrase}
          flatPhraseNotes={flatPhraseNotes}
          onBuildPhrase={handleBuildPhrase}
          onPlayPhrase={handlePlayPhrase}
          phrasePlayingOrder={phrasePlayingOrder}
          callResponse={callResponse}
          onBuildCallResponse={handleBuildCallResponse}
          onPlayCall={handlePlayCall}
          onPlayResponse={handlePlayResponse}
          onPlayCallAndResponse={handlePlayCallAndResponse}
          crPlaying={crPlaying}
        />
      )}

      {tab === 'coach' && (
        <SoloCoachPanel
          disabled={!soloCoachSubject}
          subjectLabel={soloCoachSubject?.label ?? null}
          feedback={soloFeedback}
          onAnalyze={handleAnalyzeSolo}
        />
      )}
    </div>
  );
}
