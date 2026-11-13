import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { InfoSwitchRow } from '../components/SettingsPanel/SwitchRow';
import { useCloud } from '../cloud/useCloud';
import { getLink } from '../cloud/cloudState';
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

// The colours a monogram can take (Apple's system hues: blue, green, orange,
// purple, pink, teal, yellow, indigo, red, grey-blue).
export const AVATAR_HUES = [211, 145, 28, 280, 330, 185, 46, 245, 4, 215];
// Suggested emoji — music first, then a few faces / animals.
export const AVATAR_EMOJI = ['🎸', '🎹', '🎤', '🥁', '🎷', '🎻', '🎧', '🎵', '⭐️', '🔥', '🦊', '😎'];

/** The first emoji in a text (one grapheme), or ''. */
export function firstEmoji(text) {
  const s = String(text ?? '').trim();
  if (!s) return '';
  let first;
  try {
    first = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)][0]?.segment;
  } catch {
    first = Array.from(s)[0];
  }
  return first && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(first) ? first : '';
}

export function Avatar({ profile, name, size, avatar }) {
  const av = avatar !== undefined ? avatar : profile?.avatar;
  const hue = Number.isFinite(av?.hue) ? av.hue : hueOf(profile?.id);
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?';
  return (
    <span
      className={'profile-avatar' + (av?.emoji ? ' is-emoji' : '')}
      style={{ '--hue': hue, '--size': size ? `${size}px` : undefined }}
      aria-hidden="true"
    >
      {av?.emoji || initial}
    </span>
  );
}

/**
 * "Who's practising?" — the home screen's profile chip and its popover:
 * switch / add / rename / delete local profiles (src/profile/profileStorage).
 */
export function ProfileChip({ onSettings, compact = false }) {
  const { t, lang } = useLanguage();
  const { ready, profiles, active, activeId, create, rename, setAvatar, remove, switchTo } = useProfiles();
  const [open, setOpen] = useState(false);
  // null | { kind: 'new' } | { kind: 'rename', id } | { kind: 'delete', id }
  const [edit, setEdit] = useState(null);
  const [draft, setDraft] = useState('');
  const [draftAv, setDraftAv] = useState(null); // { hue, emoji } while editing a profile
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const popRef = useRef(null);
  const cloud = useCloud();
  const email = cloud.email || getLink()?.email;
  // Keep the popover on screen. Compact (inside an instrument): fixed under
  // the button, on <body> — the glass top bar is its own stacking context,
  // so a popover inside it went under the page.
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!open || !pop) return;
    const vw = document.documentElement.clientWidth;
    if (compact) {
      const btn = boxRef.current?.getBoundingClientRect();
      if (!btn) return;
      const w = pop.offsetWidth;
      let left = btn.left + btn.width / 2 > vw / 2 ? btn.right - w : btn.left;
      left = Math.max(8, Math.min(vw - 8 - w, left));
      pop.style.left = `${left}px`;
      pop.style.top = `${btn.bottom + 8}px`;
      pop.style.maxHeight = `${window.innerHeight - btn.bottom - 20}px`;
      return;
    }
    pop.style.transform = '';
    const r = pop.getBoundingClientRect();
    let dx = 0;
    if (r.left < 8) dx = 8 - r.left;
    else if (r.right > vw - 8) dx = vw - 8 - r.right;
    if (dx) pop.style.transform = `translateX(${dx}px)`;
  }, [open, compact]);

  const nameOf = (p) => (p?.name?.trim() ? p.name.trim() : t('profile.defaultName'));

  const close = () => {
    setOpen(false);
    setEdit(null);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target) && !popRef.current?.contains(e.target)) close();
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
  const portal = (node) => (compact ? createPortal(node, document.body) : node);

  const startEdit = (next, value = '') => {
    setDraft(value);
    if (next.kind === 'rename') {
      const p = profiles.find((x) => x.id === next.id);
      setDraftAv({ hue: Number.isFinite(p?.avatar?.hue) ? p.avatar.hue : hueOf(next.id), emoji: p?.avatar?.emoji ?? '' });
    }
    setEdit(next);
  };

  const save = () => {
    const name = draft.trim();
    // A new profile needs a name; editing may keep the default one (the
    // look can change on a profile that was never named).
    if (!name && edit.kind === 'new') return;
    if (edit.kind === 'new') create(name);
    else if (edit.kind === 'rename') {
      rename(edit.id, name);
      if (draftAv) setAvatar(edit.id, { hue: draftAv.hue, emoji: draftAv.emoji || undefined });
    }
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
      <button type="submit" className="profile-btn is-primary" disabled={edit?.kind === 'new' && !draft.trim()}>
        {t('profile.save')}
      </button>
      <button type="button" className="profile-btn" onClick={() => setEdit(null)}>
        {t('profile.cancel')}
      </button>
    </form>
  );

  return (
    <div
      className={'profile-chip-box' + (compact ? ' is-compact' : '')}
      ref={boxRef}
      // Keys typed here (arrows in the name field) mustn't turn the cards.
      onKeyDown={(e) => {
        if (e.key !== 'Escape') e.stopPropagation();
      }}
    >
      <button
        type="button"
        className={'profile-chip' + (compact ? ' is-compact glass' : '') + (open ? ' is-open' : '')}
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('profile.chipLabel', { name: nameOf(active) })}
        title={t('profile.chipLabel', { name: nameOf(active) })}
      >
        <Avatar profile={active} name={nameOf(active)} size={compact ? 29 : undefined} />
        {!compact && (
          <span className="profile-chip-name" dir="auto">
            {nameOf(active)}
          </span>
        )}
      </button>

      {open && portal(
        <div ref={popRef} className={'profile-pop' + (compact ? ' is-compact glass' : '')} role="dialog" aria-label={t('profile.title')} dir={lang === 'he' ? 'rtl' : 'ltr'}>
          {compact ? (
            <>
              {/* Inside an instrument (2026-11-06): the avatar replaces the
                  ⓘ button — who you are, Settings and the ⓘ switch. */}
              <div className="profile-pop-me">
                <Avatar profile={active} name={nameOf(active)} size={44} />
                <span className="profile-pop-me-text">
                  <span className="profile-pop-me-name" dir="auto">
                    {nameOf(active)}
                  </span>
                  <span className="profile-pop-hint" dir="auto">
                    {email ? t('settings.account.synced', { email }) : t('profile.local')}
                  </span>
                </span>
              </div>
              <div className="set-group profile-pop-group">
                {onSettings && (
                  <button
                    type="button"
                    className="set-row"
                    onClick={() => {
                      close();
                      onSettings();
                    }}
                  >
                    <span className="set-icon" style={{ background: '#8e8e93' }} aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
                      </svg>
                    </span>
                    <span className="set-row-label">{t('settings.title')}</span>
                  </button>
                )}
                <InfoSwitchRow />
              </div>
              <div className="profile-pop-section">{t('profile.title')}</div>
            </>
          ) : (
            <div className="profile-pop-head">
              <div className="profile-pop-title">{t('profile.title')}</div>
              <div className="profile-pop-hint">{t('profile.hint')}</div>
            </div>
          )}

          <ul className="profile-list">
            {profiles.map((p) => {
              const isActive = p.id === activeId;
              const editing = edit && edit.id === p.id;
              if (editing && edit.kind === 'rename') {
                return (
                  <li key={p.id} className="profile-item is-editing">
                    {nameForm}
                    <AvatarEditor
                      t={t}
                      name={draft.trim() || nameOf(p)}
                      profile={p}
                      value={draftAv}
                      onChange={setDraftAv}
                    />
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
                      {t('profile.edit')}
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
            {onSettings && !compact && edit?.kind !== 'new' && (
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

/**
 * The look of a profile (v1.0.169): a preview, the colour, and a letter or
 * one emoji — suggestions, or any emoji from the keyboard (the field takes
 * the first one typed).
 */
function AvatarEditor({ t, name, profile, value, onChange }) {
  const [own, setOwn] = useState('');
  if (!value) return null;
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="profile-look">
      <Avatar profile={profile} name={name} size={56} avatar={value} />
      <div className="profile-look-body">
        <div className="profile-look-row" role="radiogroup" aria-label={t('profile.look.color')}>
          {AVATAR_HUES.map((h) => (
            <button
              key={h}
              type="button"
              role="radio"
              aria-checked={value.hue === h}
              aria-label={t('profile.look.color')}
              className={'profile-swatch' + (value.hue === h ? ' is-on' : '')}
              style={{ '--hue': h }}
              onClick={() => set({ hue: h })}
            />
          ))}
        </div>
        <div className="profile-look-row is-emoji" role="radiogroup" aria-label={t('profile.look.emoji')}>
          <button
            type="button"
            role="radio"
            aria-checked={!value.emoji}
            className={'profile-emoji is-letter' + (!value.emoji ? ' is-on' : '')}
            onClick={() => set({ emoji: '' })}
            title={t('profile.look.letter')}
          >
            {Array.from(name.trim())[0]?.toUpperCase() ?? '?'}
          </button>
          {AVATAR_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={value.emoji === e}
              className={'profile-emoji' + (value.emoji === e ? ' is-on' : '')}
              onClick={() => set({ emoji: e })}
            >
              {e}
            </button>
          ))}
          <input
            className="profile-emoji-own"
            type="text"
            inputMode="text"
            value={own}
            placeholder={t('profile.look.other')}
            aria-label={t('profile.look.otherHint')}
            title={t('profile.look.otherHint')}
            onChange={(e) => {
              const em = firstEmoji(e.target.value);
              setOwn(em);
              if (em) set({ emoji: em });
            }}
          />
        </div>
      </div>
    </div>
  );
}
