import { useLanguage } from '../../i18n/LanguageContext';
import './PhraseBuilderPanel.css';

function NoteList({ notes, playingOrder }) {
  return (
    <span className="phrase-note-list">
      {notes.map((n) => (
        <span key={n.order} className={'phrase-note' + (playingOrder === n.order ? ' playing' : '')}>
          {n.label}
        </span>
      ))}
    </span>
  );
}

// Bars/call/response are text+audio only (not drawn on the fretboard) — a
// 4-bar phrase spans multiple chords/positions at once, which the
// fretboard's single-position-anchored rendering isn't built to show
// without real clutter; hearing it is the actual test of "does it sound
// musical" anyway.
export function PhraseBuilderPanel({
  disabled,
  phrase,
  flatPhraseNotes,
  onBuildPhrase,
  onPlayPhrase,
  phrasePlayingOrder,
  callResponse,
  onBuildCallResponse,
  onPlayCall,
  onPlayResponse,
  onPlayCallAndResponse,
  crPlaying,
}) {
  let cursor = 0;
  const { t } = useLanguage();

  return (
    <div className="phrase-builder-panel">
      <div className="phrase-section">
        <div className="phrase-section-header">
          <h2 className="phrase-section-title">{t('phraseBuilder.title')}</h2>
          <div className="phrase-buttons">
            <button type="button" className="play-button" onClick={onBuildPhrase} disabled={disabled}>
              {phrase ? t('phraseBuilder.rebuild') : t('phraseBuilder.build')}
            </button>
            <button type="button" className="play-button" onClick={onPlayPhrase} disabled={disabled || !phrase}>
              {t('phraseBuilder.playPhrase')}
            </button>
          </div>
        </div>

        {phrase && (
          <ol className="phrase-bar-list">
            {phrase.bars.map((bar, i) => {
              const barNotes = flatPhraseNotes.slice(cursor, cursor + bar.notes.length);
              cursor += bar.notes.length;
              return (
                <li key={i} className="phrase-bar">
                  <span className="phrase-bar-label">
                    {t('phraseBuilder.barLabel', { index: i + 1, barLabel: bar.barLabel, chord: bar.chordText })}
                  </span>
                  <NoteList notes={barNotes} playingOrder={phrasePlayingOrder} />
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="phrase-section">
        <div className="phrase-section-header">
          <h2 className="phrase-section-title">{t('phraseBuilder.callResponseTitle')}</h2>
          <div className="phrase-buttons">
            <button type="button" className="play-button" onClick={onBuildCallResponse} disabled={disabled}>
              {callResponse ? t('phraseBuilder.rebuildCr') : t('phraseBuilder.generateCr')}
            </button>
            {callResponse && (
              <>
                <button type="button" className="play-button" onClick={onPlayCall}>
                  {t('phraseBuilder.playCall')}
                </button>
                <button type="button" className="play-button" onClick={onPlayResponse}>
                  {t('phraseBuilder.playResponse')}
                </button>
                <button type="button" className="play-button" onClick={onPlayCallAndResponse}>
                  {t('phraseBuilder.playBoth')}
                </button>
              </>
            )}
          </div>
        </div>

        {callResponse && (
          <div className="phrase-bar-list">
            <div className="phrase-bar">
              <span className="phrase-bar-label">{t('phraseBuilder.call')}</span>
              <NoteList notes={callResponse.call.notes} playingOrder={crPlaying?.which === 'call' ? crPlaying.order : null} />
            </div>
            <div className="phrase-bar">
              <span className="phrase-bar-label">{t('phraseBuilder.response')}</span>
              <NoteList
                notes={callResponse.response.notes}
                playingOrder={crPlaying?.which === 'response' ? crPlaying.order : null}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
