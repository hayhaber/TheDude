import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { useProfiles } from './profileStorage';
import './ProfileChip.css';

// A soft colour per profile, from its id.
const HUES = [211, 145, 28, 280, 350, 190, 48, 255];
function hueOf(id = '') {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

function Avatar({ profile, name, size }) {
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?';
  return (
    <span className="profile-avatar" style={{ '--hue': hueOf(profile?.id), '--size': size ? `${size}px` : undefined }} aria-hidden="true">
      {initial}
    </span>
  );
}

/**
 * "Who's practising?" — the home screen's profile chip and its popover:
 * switch / add / rename / delete local profiles (src/profile/profileStorage).
 */
export function ProfileChip({ onSettings }) {
  const { t, lang } = useLanguage();
  const { ready, profiles, active, activeId, create, rename, remove, switchTo } = useProfiles();
  const [open, setOpen] = useState(false);
  // null | { kind: 'new' } | { kind: 'rename', id } | { kind: 'delete', id }
  const [edit, setEdit] = useState(null);
  const [draft, setDraft] = useState('');
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const nameOf = (p) => (p?.name?.trim() ? p.name.trim() : t('profile.defaultName'));

  const close = () => {
    setOpen(false);
    setEdit(null);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (edit && edit.kind !== 'delete') inputRef.current?.focus();
  }, [edit]);

  if (!ready || !active) return null;

  const startEdit = (next, value = '') => {
    setDraft(value);
    setEdit(next);
  };

  const save = () => {
    const name = draft.trim();
    if (!name) return;
    if (edit.kind === 'new') create(name);
    else if (edit.kind === 'rename') rename(edit.id, name);
    setEdit(null);
  };

  const nameForm = (
    <form
      className="profile-form"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={draft}
        maxLength={40}
        placeholder={t('profile.namePlaceholder')}
        aria-label={t('profile.namePlaceholder')}
        onChange={(e) => setDraft(e.target.value)}
        dir="auto"
        autoComplete="off"
      />
      <button type="submit" className="profile-btn is-primary" disabled={!draft.trim()}>
        {t('profile.save')}
      </button>
      <button type="button" className="profile-btn" onClick={() => setEdit(null)}>
        {t('profile.cancel')}
      </button>
    </form>
  );

  return (
    <div
      className="profile-chip-box"
      ref={boxRef}
      // Keys typed here (arrows in the name field) mustn't turn the cards.
      onKeyDown={(e) => {
        if (e.key !== 'Escape') e.stopPropagation();
      }}
    >
      <button
        type="button"
        className={'profile-chip' + (open ? ' is-open' : '')}
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('profile.chipLabel', { name: nameOf(active) })}
        title={t('profile.chipLabel', { name: nameOf(active) })}
      >
        <Avatar profile={active} name={nameOf(active)} />
        <span className="profile-chip-name" dir="auto">
          {nameOf(active)}
        </span>
      </button>

      {open && (
        <div className="profile-pop" role="dialog" aria-label={t('profile.title')} dir={lang === 'he' ? 'rtl' : 'ltr'}>
          <div className="profile-pop-head">
            <div className="profile-pop-title">{t('profile.title')}</div>
            <div className="profile-pop-hint">{t('profile.hint')}</div>
          </div>

          <ul className="profile-list">
            {profiles.map((p) => {
              const isActive = p.id === activeId;
              const editing = edit && edit.id === p.id;
              if (editing && edit.kind === 'rename') {
                return (
                  <li key={p.id} className="profile-item is-editing">
                    {nameForm}
                  </li>
                );
              }
              if (editing && edit.kind === 'delete') {
                return (
                  <li key={p.id} className="profile-item is-confirm">
                    <div className="profile-confirm-text">{t('profile.confirmDelete', { name: nameOf(p) })}</div>
                    <div className="profile-confirm-actions">
                      <button
                        type="button"
                        className="profile-btn is-danger"
                        onClick={() => {
                          remove(p.id);
                          setEdit(null);
                        }}
                      >
                        {t('profile.delete')}
                      </button>
                      <button type="button" className="profile-btn" onClick={() => setEdit(null)}>
                        {t('profile.cancel')}
                      </button>
                    </div>
                  </li>
                );
              }
              return (
                <li key={p.id} className={'profile-item' + (isActive ? ' is-active' : '')}>
                  <button
                    type="button"
                    className="profile-row"
                    onClick={() => (isActive ? close() : switchTo(p.id))}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <Avatar profile={p} name={nameOf(p)} size={30} />
                    <span className="profile-row-name" dir="auto">
                      {nameOf(p)}
                    </span>
                    {isActive && (
                      <span className="profile-check" aria-label={t('profile.current')}>
                        ✓
                      </span>
                    )}
                  </button>
                  <div className="profile-row-actions">
                    <button type="button" className="profile-btn is-quiet" onClick={() => startEdit({ kind: 'rename', id: p.id }, p.name)}>
                      {t('profile.rename')}
                    </button>
                    {profiles.length > 1 && (
                      <button type="button" className="profile-btn is-quiet is-danger-text" onClick={() => startEdit({ kind: 'delete', id: p.id })}>
                        {t('profile.delete')}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="profile-pop-foot">
            {edit?.kind === 'new' ? (
              nameForm
            ) : (
              <button type="button" className="profile-btn profile-new" onClick={() => startEdit({ kind: 'new' })}>
                <span aria-hidden="true">+</span>
                {t('profile.new')}
              </button>
            )}
            {/* Stage 6: Settings reachable from the profile too. */}
            {onSettings && edit?.kind !== 'new' && (
              <button
                type="button"
                className="profile-btn profile-settings"
                onClick={() => {
                  close();
                  onSettings();
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
                </svg>
                {t('settings.title')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
