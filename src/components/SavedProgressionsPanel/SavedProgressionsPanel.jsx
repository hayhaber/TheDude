import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../i18n/LanguageContext';
import { downloadFretboardPng, downloadProgressionText, buildShareUrl } from '../../music/exportProgression';
import './SavedProgressionsPanel.css';

// Same right-side, top-anchored drawer chrome as DisplayOptionsMenu — see
// that component's own CSS comment for the full containing-block/portal
// rationale. This drawer bundles four related "do something with the
// CURRENT progression" actions (save, share, export) plus two browsable
// lists (named saves, auto-tracked recents) behind one trigger, the same
// way Display Options bundles several toggles behind one icon button.
export function SavedProgressionsPanel({
  progression,
  progressionText,
  setProgressionText,
  capoFret,
  setCapoFret,
  mode,
  setMode,
  soundingKey,
  isGuitar,
  savedProgressions,
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();
  const { saved, recent, saveCurrent, renameSaved, deleteSaved, toggleFavorite, deleteRecent } = savedProgressions;

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const hasProgression = progression.length > 0;

  function handleSave() {
    saveCurrent({ name, text: progressionText, capoFret, mode });
    setName('');
  }

  function loadEntry(entry) {
    setProgressionText(entry.text);
    setCapoFret(entry.capoFret ?? 0);
    if (entry.mode) setMode(entry.mode);
    setOpen(false);
  }

  async function handleCopyLink() {
    const url = buildShareUrl(progressionText, { capoFret, mode });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt(t('savedProgressions.copyFallback'), url);
    }
  }

  function handleRename(entry) {
    const next = window.prompt(t('savedProgressions.renamePrompt'), entry.name);
    if (next && next.trim()) renameSaved(entry.id, next);
  }

  // Favorites float to the top of the saved list — the whole point of
  // starring one is finding it again without scrolling past everything else.
  const sortedSaved = [...saved].sort((a, b) => (b.favorite === a.favorite ? 0 : b.favorite ? 1 : -1));

  return (
    <div className="saved-progressions-menu">
      <button
        type="button"
        className={'saved-progressions-trigger' + (open ? ' active' : '')}
        onClick={() => setOpen(true)}
        aria-label={t('savedProgressions.label')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h9l3 3v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
          <path d="M6.5 4v4h6V4" />
        </svg>
        {t('savedProgressions.button')}
      </button>

      {createPortal(
        <>
          <div className={'saved-progressions-drawer-scrim' + (open ? ' open' : '')} aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            className={'saved-progressions-drawer' + (open ? ' open' : '')}
            role="dialog"
            aria-modal="true"
            aria-label={t('savedProgressions.label')}
            inert={!open}
          >
            <div className="saved-progressions-drawer-header">
              <h2 className="saved-progressions-drawer-title">{t('savedProgressions.label')}</h2>
              <button type="button" className="saved-progressions-drawer-close" onClick={() => setOpen(false)} aria-label={t('savedProgressions.close')}>
                ×
              </button>
            </div>

            <div className="saved-progressions-drawer-body">
              <div className="saved-progressions-section">
                <span className="saved-progressions-section-title">{t('savedProgressions.saveSection')}</span>
                <div className="saved-progressions-save-row">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('savedProgressions.namePlaceholder')}
                    disabled={!hasProgression}
                    dir="auto"
                  />
                  <button type="button" onClick={handleSave} disabled={!hasProgression || !name.trim()}>
                    {t('savedProgressions.saveButton')}
                  </button>
                </div>
              </div>

              <div className="saved-progressions-section">
                <span className="saved-progressions-section-title">{t('savedProgressions.shareExportSection')}</span>
                <div className="saved-progressions-action-row">
                  <button type="button" onClick={handleCopyLink} disabled={!hasProgression}>
                    {copied ? t('savedProgressions.linkCopied') : t('savedProgressions.copyLink')}
                  </button>
                  <button type="button" onClick={() => downloadProgressionText(progression, { capoFret, soundingKey })} disabled={!hasProgression}>
                    {t('savedProgressions.exportText')}
                  </button>
                  {isGuitar && (
                    <button type="button" onClick={() => downloadFretboardPng()} disabled={!hasProgression}>
                      {t('savedProgressions.exportPng')}
                    </button>
                  )}
                </div>
              </div>

              <div className="saved-progressions-divider" />

              <div className="saved-progressions-section">
                <span className="saved-progressions-section-title">{t('savedProgressions.savedListSection')}</span>
                {sortedSaved.length === 0 ? (
                  <p className="saved-progressions-empty">{t('savedProgressions.emptySaved')}</p>
                ) : (
                  <ul className="saved-progressions-list">
                    {sortedSaved.map((entry) => (
                      <li key={entry.id} className="saved-progressions-list-item">
                        <button type="button" className="saved-progressions-favorite" aria-pressed={entry.favorite} onClick={() => toggleFavorite(entry.id)} aria-label={t('savedProgressions.favorite')}>
                          {entry.favorite ? '★' : '☆'}
                        </button>
                        <button type="button" className="saved-progressions-item-main" onClick={() => loadEntry(entry)}>
                          <span className="saved-progressions-item-name">{entry.name}</span>
                          <span className="saved-progressions-item-text" dir="ltr">{entry.text}</span>
                        </button>
                        <button type="button" className="saved-progressions-icon-button" onClick={() => handleRename(entry)} aria-label={t('savedProgressions.rename')}>
                          ✎
                        </button>
                        <button type="button" className="saved-progressions-icon-button" onClick={() => deleteSaved(entry.id)} aria-label={t('savedProgressions.delete')}>
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="saved-progressions-section">
                <span className="saved-progressions-section-title">{t('savedProgressions.recentListSection')}</span>
                {recent.length === 0 ? (
                  <p className="saved-progressions-empty">{t('savedProgressions.emptyRecent')}</p>
                ) : (
                  <ul className="saved-progressions-list">
                    {recent.map((entry) => (
                      <li key={entry.id} className="saved-progressions-list-item">
                        <button type="button" className="saved-progressions-item-main recent" onClick={() => loadEntry(entry)}>
                          <span className="saved-progressions-item-text" dir="ltr">{entry.text}</span>
                        </button>
                        <button type="button" className="saved-progressions-icon-button" onClick={() => deleteRecent(entry.id)} aria-label={t('savedProgressions.delete')}>
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
