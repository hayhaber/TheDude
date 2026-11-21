import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { isPdf, listSheets, onSheetsChange, setSheetLyrics, setSheetPrefs, sheetPrefs } from '../../music/sheets/sheetStore';
import { fmtDur, moveItem, useSetlists } from '../../music/sheets/setlists';
import { imagesToPdf, isImage } from '../../music/sheets/imageToPdf';
import {
  addCharts,
  addTextSong,
  bandSetlistApi,
  createBand,
  deleteBand,
  getChartCloud,
  joinBand,
  leaveBand,
  newInviteCode,
  removeChart,
  removeMember,
  renameBand,
  renameChart,
  setReady,
  shareChart,
  signedIn,
  subscribeChartCloud,
  syncCharts,
} from '../../music/sheets/chartCloud';
import { getLink } from '../../cloud/cloudState';
import { useCloud } from '../../cloud/useCloud';
import { BackButton } from '../HomeButton/BackButton';
import { MoreMenu } from '../MoreMenu/MoreMenu';
import { Performer } from './Performer';
import './Stage.css';
import { Select } from '../ui/Select';
import { ControlRow, Segmented } from '../ui/controls';
import { openBandLink } from '../../music/sheets/bandLink';
import { LyricsSheet } from './LyricsSheet';
import { SongNotes, SongTakes } from './SongExtras';
import { openCount, useNotesVersion } from '../../music/sheets/songNotes';
import { SuggestionsView } from './SuggestionsView';
import { cleanLink, embedOf, serviceOf } from '../../music/sheets/songLink';
import { openListen } from '../../music/sheets/listenStore';
import { ListenDock } from './ListenDock';
import { SongSearchField } from './SongSearchField';
import { linkFor, songLabel } from '../../music/sheets/songSearch';
import { clearJoinCode, inviteUrl, pendingJoinCode } from '../../music/sheets/joinLink';

// Stage (v1.0.176; user: "all the songs I play with the band, switch from
// chart to chart, auto-scroll"): the band's PDF charts and setlists.
// v1.0.177: in the cloud — signed in, every chart reaches all my devices,
// and a BAND (invite code) shares its charts + setlists with its members.
//   home    — Library select (My charts / each band) + its ••• (new / join
//             band, invite, members, leave / delete) · Setlists · Charts;
//   setlist — its songs in order, Add songs, one Start capsule;
//   perform — Performer (full screen).
// The charts are the same store GuitarPro / PianoPro's PDFs use.

const SCOPE_KEY = 'dudestar-stage-scope'; // device
const HINT_KEY = 'dudestar-stage-band-hint'; // device: '1' = the band row was hidden
// v1.0.206: the setlist opened last (the home card's Continue)
export const LAST_SET_KEY = 'dudestar-stage-last'; // device: {id, scope, name}
export function lastSetlist() {
  try {
    return JSON.parse(localStorage.getItem(LAST_SET_KEY) || 'null');
  } catch {
    return null;
  }
}

function WordsGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h9" />
    </svg>
  );
}

function Chevron() {
  return (
    <span className="ph-chev" aria-hidden="true">
      <svg viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1.5 1.5L6.5 7l-5 5.5" />
      </svg>
    </span>
  );
}

function PlayGlyph() {
  return (
    <svg className="stg-play" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
    </svg>
  );
}

/** A name that turns into a text field while renaming. */
function NameEdit({ value, onSave, onCancel }) {
  const [v, setV] = useState(value);
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const done = () => (v.trim() && v.trim() !== value ? onSave(v.trim()) : onCancel());
  return (
    <input
      ref={ref}
      className="stg-name-input"
      dir="auto"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={done}
      onKeyDown={(e) => {
        if (e.key === 'Enter') done();
        if (e.key === 'Escape') onCancel();
      }}
    />
  );
}

/**
 * Why a band action failed, in words (v1.0.213; the user saw a bare "That
 * didn't work" on the iPad): a wrong code, offline, the server's band setup
 * not run yet (002 / its functions missing), a sign-in that expired, else the
 * server's own message.
 */
function bandErr(e, t) {
  const code = e?.code || '';
  const m = e?.message || String(e || '');
  if (code === 'P0002' || /no band/i.test(m)) return t('stage.band.badCode');
  if (navigator.onLine === false || /Failed to fetch|NetworkError|Load failed/i.test(m)) return t('stage.cloud.offline');
  if (['PGRST202', 'PGRST205', '42883', '42P01'].includes(code) || /could not find the (function|table)|does not exist|schema cache/i.test(m)) return t('stage.cloud.setup');
  if (['PGRST301', '401', '42501'].includes(code) || /jwt|not authenticated|permission denied/i.test(m)) return t('stage.cloud.signAgain');
  return t('stage.cloud.failed') + (m ? ` (${m.slice(0, 140)})` : '');
}

/** A small sheet over the screen (Liquid Glass), closed by Done / a tap outside.
 *  A FORM sheet passes `action` {label, onClick, disabled, busy}: the header is
 *  then iOS's Cancel · title · Add (bold, disabled until the form is valid) and
 *  the sheet has no bottom button (v1.0.231). */
function Sheet({ title, onClose, children, dir, t, action = null }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="stg-sheet-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="stg-sheet glass" role="dialog" aria-label={title} dir={dir}>
        {action ? (
          <header className="stg-sheet-head is-form">
            <button type="button" className="stg-done is-cancel" onClick={onClose}>
              {t('stage.cancel')}
            </button>
            <strong>{title}</strong>
            <button type="button" className="stg-done" onClick={action.onClick} disabled={action.disabled || action.busy}>
              {action.busy ? '…' : action.label}
            </button>
          </header>
        ) : (
          <header className="stg-sheet-head">
            <strong>{title}</strong>
            <button type="button" className="stg-done" onClick={onClose}>
              {t('stage.done')}
            </button>
          </header>
        )}
        {children}
      </div>
    </div>
  );
}

const SEARCH_URL = {
  youtube: (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q),
  spotify: (q) => 'https://open.spotify.com/search/' + encodeURIComponent(q),
  apple: (q) => 'https://music.apple.com/search?term=' + encodeURIComponent(q),
};

function ListenGlyph({ size = 30 }) {
  // SF Symbols' play.circle.fill: a filled disc in the service's colour
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="currentColor" />
      <path d="M9.6 7.6v8.8l7.2-4.4z" fill="#fff" />
    </svg>
  );
}

/** The song's listening link (v1.0.227): a round key at the row's end. */
function ListenKey({ link, name, t }) {
  const url = cleanLink(link);
  if (!url) return null;
  const svc = serviceOf(url);
  const label = t('stage.listen.on.' + svc);
  // YouTube / Spotify / Apple Music play INSIDE the app (the dock), the
  // rest opens outside
  if (embedOf(url))
    return (
      <button type="button" className={'stg-listen is-' + svc} onClick={() => openListen(url, name)} aria-label={label} title={label}>
        <ListenGlyph />
      </button>
    );
  return (
    <a className={'stg-listen is-' + svc} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
      <ListenGlyph />
    </a>
  );
}

/** Add / change / remove a song's listening link. */
function ListenSheet({ name, link, onSave, onClose, dir, t }) {
  const [v, setV] = useState(link || '');
  const [q, setQ] = useState(name || '');
  const [finding, setFinding] = useState(false);
  const url = cleanLink(v);
  const bad = !!v.trim() && !url;
  const svc = url ? serviceOf(url) : null;
  return (
    <Sheet title={t('stage.listen.title')} onClose={onClose} dir={dir} t={t} action={{ label: t('stage.listen.save'), onClick: () => onSave(url), disabled: bad || !url }}>
      <p className="stg-sheet-sub" dir="auto">{name}</p>
      <SongSearchField
        label={t('stage.ss.find')}
        value={q}
        placeholder={t('stage.ss.findPh')}
        onChange={setQ}
        onPick={async (song) => {
          setQ(songLabel(song));
          if (song.apple) setV(song.apple);
          setFinding(true);
          const l = await linkFor(song);
          if (l) setV(l);
          setFinding(false);
        }}
      />
      {finding && <p className="stg-ss-note">{t('stage.ss.finding')}</p>}
      <label className="stg-field">
        <span>{t('stage.listen.label')}</span>
        <input
          autoFocus
          dir="ltr"
          type="url"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          maxLength={500}
          value={v}
          placeholder="https://"
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !bad && (url || link) && onSave(url)}
        />
      </label>
      {bad ? <p className="stg-err">{t('stage.listen.bad')}</p> : svc && <p className="stg-listen-found">{t('stage.listen.on.' + svc)}</p>}
      <p className="stg-listen-find">
        <span>{t('stage.listen.find')}</span>
        {['youtube', 'spotify', 'apple'].map((k) => (
          <a key={k} href={SEARCH_URL[k](name)} target="_blank" rel="noopener noreferrer">
            {t('stage.listen.svc.' + k)}
          </a>
        ))}
      </p>
      {link && (
        <div className="stg-sheet-foot">
          <button type="button" className="stg-capsule is-danger" onClick={() => onSave(null)}>
            {t('stage.listen.remove')}
          </button>
        </div>
      )}
    </Sheet>
  );
}

/** One text field + one action (new band / join band). */
function AskSheet({ title, label, placeholder, action, onSubmit, onClose, dir, t, upper = false, errorOf = null, inputMode }) {
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const go = async () => {
    if (!v.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(v.trim());
      onClose();
    } catch (e) {
      setErr(errorOf?.(e) || bandErr(e, t));
      setBusy(false);
    }
  };
  return (
    <Sheet title={title} onClose={onClose} dir={dir} t={t} action={{ label: action, onClick: go, disabled: !v.trim(), busy }}>
      <label className="stg-field">
        <span>{label}</span>
        <input
          autoFocus
          dir="auto"
          value={v}
          placeholder={placeholder}
          autoCapitalize={upper ? 'characters' : 'sentences'}
          autoCorrect="off"
          inputMode={inputMode}
          onChange={(e) => setV(upper ? e.target.value.toUpperCase() : e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()}
        />
      </label>
      {err && <p className="stg-err">{err}</p>}
    </Sheet>
  );
}

function sinceText(iso, t) {
  if (!iso) return '';
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return min < 1 ? t('stage.cloud.justNow') : min < 60 ? t('stage.cloud.minAgo', { n: min }) : t('stage.cloud.earlier');
}

function BandGlyph({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="8" cy="9" r="3" />
      <circle cx="16.5" cy="9.5" r="2.5" />
      <path d="M3 19c0-3 2.5-5 5-5s5 2 5 5M13.5 18.5c.3-2.4 1.6-4 3.5-4 2 0 3.5 1.6 3.5 4" />
    </svg>
  );
}

const AVATAR_TINTS = ['#007aff', '#ff9500', '#af52de', '#34c759', '#ff2d55', '#5856d6', '#30b0c7', '#a2845e'];
const initialOf = (name) => Array.from((name || '?').trim())[0]?.toUpperCase() || '?';
function tintOf(id = '') {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_TINTS[h % AVATAR_TINTS.length];
}
function MemberAvatar({ m, small = false }) {
  return (
    <span className={'stg-avatar' + (small ? ' is-small' : '')} style={{ background: tintOf(m.id || m.key || m.name) }} aria-hidden="true">
      {initialOf(m.name)}
    </span>
  );
}

/** "Dana is on stage now · Join" — SharePlay's join banner. */
function LiveBanner({ person, setName, onJoin, t }) {
  return (
    <div className="stg-live" role="status">
      <span className="stg-live-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14">
          <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
        </svg>
      </span>
      <span className="stg-live-text">
        <strong dir="auto">{t('stage.live.title', { name: person.name || t('stage.band.someone') })}</strong>
        {person.n > 0 && <span dir="auto">{setName ? t('stage.live.sub', { set: setName, i: person.i, n: person.n }) : t('stage.live.subNoSet', { i: person.i, n: person.n })}</span>}
      </span>
      <button type="button" className="stg-live-join" onClick={onJoin}>
        {t('stage.live.join')}
      </button>
    </div>
  );
}

/** The band sheet: what a band gives, then create one or join with a code. */
function BandJoinSheet({ isIn, onAccount, onCreate, onJoin, onClose, dir, t, initialCode = '' }) {
  const [tab, setTab] = useState(initialCode ? 'join' : 'new');
  const [v, setV] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const go = async () => {
    if (!v.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await (tab === 'new' ? onCreate(v.trim()) : onJoin(v.trim()));
      onClose();
    } catch (e) {
      setErr(bandErr(e, t));
      setBusy(false);
    }
  };
  const perks = [
    ['M6 3h9l4 4v14H6z M15 3v4h4', 'b1'],
    ['M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01', 'b2'],
    ['M12 4v13M7 12l5 5 5-5M5 20h14', 'b3'],
  ];
  return (
    <Sheet title={t('stage.band.title')} onClose={onClose} dir={dir} t={t}>
      <div className="stg-band-hero">
        <span className="stg-band-tile" aria-hidden="true">
          <BandGlyph size={34} />
        </span>
        <h2>{initialCode ? t('stage.band.invitedHead') : t('stage.band.headline')}</h2>
      </div>
      <ul className="stg-perks">
        {perks.map(([d, k]) => (
          <li key={k}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={d} />
            </svg>
            <span>
              <strong>{t('stage.band.' + k + 't')}</strong>
              {t('stage.band.' + k)}
            </span>
          </li>
        ))}
      </ul>
      {isIn ? (
        <>
          {!initialCode && <Segmented
            options={[
              { value: 'new', label: t('stage.band.tabNew') },
              { value: 'join', label: t('stage.band.tabJoin') },
            ]}
            value={tab}
            onChange={(x) => {
              setTab(x);
              setV('');
              setErr(null);
            }}
          />}
          <label className="stg-field">
            <span>{tab === 'new' ? t('stage.band.name') : t('stage.band.code')}</span>
            <input
              key={tab}
              dir={tab === 'new' ? 'auto' : 'ltr'}
              className={tab === 'join' ? 'is-code' : ''}
              value={v}
              placeholder={tab === 'new' ? t('stage.band.namePh') : 'ABCD2345'}
              autoCapitalize={tab === 'join' ? 'characters' : 'sentences'}
              autoCorrect="off"
              onChange={(e) => setV(tab === 'join' ? e.target.value.toUpperCase() : e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go()}
            />
          </label>
          {err && <p className="stg-err">{err}</p>}
          <div className="stg-sheet-foot is-col">
            <button type="button" className="stg-capsule is-primary is-wide" onClick={go} disabled={!v.trim() || busy}>
              {busy ? '…' : tab === 'new' ? t('stage.band.create') : t('stage.band.joinBtn')}
            </button>
            <span className="stg-fine">{t('stage.band.anytime')}</span>
          </div>
        </>
      ) : (
        <div className="stg-sheet-foot is-col">
          <p className="stg-sheet-text">{initialCode ? t('stage.band.invitedSignIn') : t('stage.band.signInFirst')}</p>
          {onAccount && (
            <button
              type="button"
              className="stg-capsule is-primary is-wide"
              onClick={() => {
                onClose();
                onAccount();
              }}
            >
              {initialCode ? t('stage.band.signInBtn') : t('stage.cloud.signIn')}
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}

/** The band's own sheet: invite code + Share, members, rename / new code / leave. */
/** The band's page (v1.0.242): pushed like an iOS Settings page (Family
    Sharing) — members first, "Invite Members" as the group's last row (the
    system share sheet opens only when that row is tapped), the code as a
    footnote, then the band's settings. Never a sheet over another screen. */
function BandManagePage({ band, uid, here, onShare, onNewCode, onRename, onRemove, onAnother, onLeave, t }) {
  const owner = band.owner === uid;
  const [renaming, setRenaming] = useState(false);
  const [sure, setSure] = useState(false);
  const hereIds = new Set(here.map((p) => (p.key || '').split(':')[0]));
  return (
    <>
      <h3 className="stg-sheet-sec">{t('stage.band.members') + ' · ' + band.members.length}</h3>
      <div className="ph-group stg-group">
        {band.members.map((m) => (
          <div key={m.id} className="stg-row">
            <span className="ph-row stg-row-main">
              <MemberAvatar m={m} />
              <span className="ph-text">
                <span className="ph-title" dir="auto">
                  {m.name || t('stage.band.someone')}
                  {m.id === uid ? ` (${t('stage.band.you')})` : ''}
                </span>
              </span>
              {m.id === band.owner ? (
                <span className="stg-detail">{t('stage.band.owner')}</span>
              ) : (
                m.id !== uid && hereIds.has(m.id) && <span className="stg-detail is-here">● {t('stage.band.here')}</span>
              )}
            </span>
            {owner && m.id !== uid && (
              <button type="button" className="stg-remove" onClick={() => onRemove(m.id)}>
                {t('stage.band.remove')}
              </button>
            )}
          </div>
        ))}
        <button type="button" className="ph-row stg-action stg-invite-row" onClick={onShare}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M19 8v6M16 11h6" />
          </svg>
          {t('stage.band.inviteRow')}
        </button>
      </div>
      <p className="stg-fine is-under">
        {t('stage.band.codeNote')}{' '}
        <span className="stg-code-inline" dir="ltr">
          {band.code}
        </span>
      </p>
      {owner && band.members.length > 1 && <p className="stg-fine is-under">{t('stage.band.ownerOnly')}</p>}

      <div className="ph-group stg-group stg-actions">
        {owner &&
          (renaming ? (
            <span className="ph-row">
              <NameEdit
                value={band.name}
                onSave={(v) => {
                  setRenaming(false);
                  onRename(v);
                }}
                onCancel={() => setRenaming(false)}
              />
            </span>
          ) : (
            <button type="button" className="ph-row stg-action" onClick={() => setRenaming(true)}>
              {t('stage.band.rename')}
            </button>
          ))}
        {owner && (
          <button type="button" className="ph-row stg-action" onClick={onNewCode}>
            {t('stage.band.newCodeRow')}
          </button>
        )}
        <button type="button" className="ph-row stg-action" onClick={onAnother}>
          {t('stage.band.another')}
        </button>
      </div>
      <div className="ph-group stg-group stg-actions">
        <button type="button" className="ph-row stg-action is-danger" onClick={() => (sure ? onLeave() : setSure(true))}>
          {sure ? t('stage.deleteSure') : owner ? t('stage.band.delete') : t('stage.band.leave')}
        </button>
      </div>
    </>
  );
}

// Search (v1.0.211): shown once a list is longer than this.
// ---- readiness + show length (v1.0.233) ---------------------------------------
const READY_STATES = ['know', 'learning', 'not'];
const DEFAULT_DUR = 210; // a song with no length set counts as 3:30 (the Performer's default)
const GAPS = [0, 15, 30, 60, 120];

/** "42 min" / "1 h 12 min" */
function fmtShow(sec, t) {
  const m = Math.max(1, Math.round(sec / 60));
  return m >= 60 ? t('stage.len.hm', { h: Math.floor(m / 60), m: m % 60 }) : t('stage.len.min', { m });
}

/** The row's readiness tag (v1.0.240): a word on a soft tinted capsule —
    iOS status-badge style — never a bare shape to decode. Band songs = how
    many members are ready; my own songs = my state. */
function ReadyMark({ k, n, mine, t }) {
  if (n != null) {
    if (!n) return null;
    const tone = k === n ? 'is-know' : k ? 'is-learning' : 'is-not';
    const label = k === n ? t('stage.rd.allReady') : t('stage.rd.tag', { k, n });
    return (
      <span className={'stg-ready ' + tone} title={t('stage.rd.of', { k, n })}>
        {label}
      </span>
    );
  }
  if (!mine) return null;
  return <span className={'stg-ready is-' + mine}>{t('stage.rd.' + mine)}</span>;
}

/** Before the show: who still needs which songs of this setlist. */
function ReadyPanel({ band, songs, readyOf, uid, t }) {
  const [open, setOpen] = useState(null);
  const ids = songs.filter((s) => !s.missing).map((s) => s.id);
  if (!ids.length) return null;
  const members = band.members;
  const allReady = ids.filter((id) => members.every((m) => readyOf(id, m.id) === 'know')).length;
  const rows = members
    .map((m) => {
      const pending = songs.filter((s) => !s.missing && readyOf(s.id, m.id) !== 'know').map((s) => ({ ...s, state: readyOf(s.id, m.id) || null }));
      return { m, pending };
    })
    .sort((a, b) => b.pending.length - a.pending.length || (a.m.name || '').localeCompare(b.m.name || ''));
  const count = (list, st) => list.filter((x) => x.state === st).length;
  return (
    <section className="ph-section stg-ready-panel">
      <h2 className="ph-section-title">{t('stage.rd.title')}</h2>
      <p className="stg-fine stg-ready-sum">{t('stage.rd.summary', { k: allReady, n: ids.length })}</p>
      <div className="ph-group stg-group">
        {rows.map(({ m, pending }) => {
          const isOpen = open === m.id && pending.length > 0;
          const detail = pending.length
            ? [
                count(pending, 'learning') && t('stage.rd.learningN', { n: count(pending, 'learning') }),
                count(pending, 'not') && t('stage.rd.notN', { n: count(pending, 'not') }),
                count(pending, null) && t('stage.rd.unmarkedN', { n: count(pending, null) }),
              ]
                .filter(Boolean)
                .join(' · ')
            : t('stage.rd.allReady');
          return (
            <div key={m.id} className="stg-ready-member">
              <button type="button" className="ph-row stg-row-main" aria-expanded={pending.length ? isOpen : undefined} disabled={!pending.length} onClick={() => setOpen(isOpen ? null : m.id)}>
                <MemberAvatar m={m} small />
                <span className="ph-text">
                  <span className="ph-title" dir="auto">
                    {(m.name || t('stage.band.someone')) + (m.id === uid ? ' ' + t('stage.rd.you') : '')}
                  </span>
                </span>
                <span className={'stg-detail' + (pending.length ? '' : ' is-ok')}>{detail}</span>
                {pending.length > 0 && (
                  <span className={'stg-sg-fold-chev' + (isOpen ? ' is-open' : '')} aria-hidden="true">
                    ›
                  </span>
                )}
              </button>
              {isOpen && (
                <ul className="stg-ready-songs">
                  {pending.map((s) => (
                    <li key={s.id}>
                      <span dir="auto">{s.name}</span>
                      <span className={'stg-ready-state is-' + (s.state || 'none')}>{s.state ? t('stage.rd.' + s.state) : t('stage.rd.unmarked')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <p className="stg-fine is-under">{t('stage.rd.hint')}</p>
    </section>
  );
}

const SEARCH_FROM = 8;
const fold = (x) =>
  String(x ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f\u0591-\u05c7]/g, '')
    .replace(/[\u05f3\u05f4'"״׳`’]/g, '');
/** true = the name matches; a string = a bit of the words that match; null = no match. */
function matchSong(s, q) {
  const n = fold(q).trim();
  if (!n) return true;
  if (fold(s.name).includes(n)) return true;
  if (!s.lyrics) return null;
  const plain = String(s.lyrics).replace(/\[[^\]]*\]|\{[^}]*\}/g, '');
  for (const line of plain.split('\n')) {
    if (fold(line).includes(n)) {
      const l = line.replace(/\s+/g, ' ').trim();
      return l.length > 60 ? l.slice(0, 58) + '…' : l;
    }
  }
  return null;
}

function SearchField({ value, onChange, t }) {
  return (
    <label className="stg-search">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="M15.5 15.5 20 20" />
      </svg>
      <input type="search" dir="auto" value={value} placeholder={t('stage.search')} aria-label={t('stage.search')} onChange={(e) => onChange(e.target.value)} enterKeyHint="search" />
      {value && (
        <button type="button" className="stg-search-clear" aria-label={t('stage.ly.cancel')} onClick={() => onChange('')}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <circle cx="8" cy="8" r="8" fill="currentColor" />
            <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="var(--bg, #fff)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </label>
  );
}

let fontsWarmed = false;
const PDF_FONTS = ['FoxitDingbats.pfb', 'FoxitFixed.pfb', 'FoxitFixedBold.pfb', 'FoxitFixedBoldItalic.pfb', 'FoxitFixedItalic.pfb', 'FoxitSerif.pfb', 'FoxitSerifBold.pfb', 'FoxitSerifBoldItalic.pfb', 'FoxitSerifItalic.pfb', 'FoxitSymbol.pfb', 'LiberationSans-Bold.ttf', 'LiberationSans-BoldItalic.ttf', 'LiberationSans-Italic.ttf', 'LiberationSans-Regular.ttf'];

export function StageView({ onAccount, start = null }) {
  const { t, lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const cloud = useSyncExternalStore(subscribeChartCloud, getChartCloud, getChartCloud);
  const account = useCloud();
  const isIn = signedIn();
  const uid = getLink()?.userId ?? null;
  const personal = useSetlists();
  const [scope, setScope] = useState(() => {
    try {
      if (start === 'continue' && lastSetlist()?.scope) return lastSetlist().scope;
      return localStorage.getItem(SCOPE_KEY) || 'me';
    } catch {
      return 'me';
    }
  });
  const band = scope !== 'me' && isIn ? (cloud.bands.find((b) => b.id === scope) ?? null) : null;
  const bandId = band?.id ?? null;
  const sets = band ? bandSetlistApi(band.id) : personal;
  const [sheets, setSheets] = useState(null); // [{id, name, band, cloud, ...}]
  const [openSet, setOpenSetRaw] = useState(() => {
    if (start !== 'continue') return null;
    const last = lastSetlist();
    return last?.id ?? null;
  }); // setlist id
  const [words, setWords] = useState(null); // {id?, name, text, pdf} — the words editor
  const [songPage, setSongPage] = useState(null); // a song's page: notes + recordings (v1.0.244)
  const byIdRef = useRef(new Map());
  useNotesVersion();
  const [listen, setListen] = useState(null); // {id, name, link} — the link sheet
  const [, setLinkTick] = useState(0);
  const linkOf = (id) => sheetPrefs(id).link || '';
  const openListen = (id, name) => setListen({ id, name, link: linkOf(id) });
  const saveListen = (url) => {
    setSheetPrefs(listen.id, { link: url || '' });
    setListen(null);
    setLinkTick((n) => n + 1);
  };
  // readiness (v1.0.233): band songs = the band's marks (cloud), my own
  // songs = my mark in the song's prefs
  const readyOf = (id, who) => cloud.ready.find((r) => r.chart === id && r.user === who)?.state ?? null;
  const canReady = band ? isIn && cloud.readyOk : true;
  const myReady = (id) => (band ? readyOf(id, uid) : sheetPrefs(id).ready || null);
  const markReady = (id, v) => {
    const next = myReady(id) === v ? null : v;
    if (band) setReady(id, band.id, next).catch(() => {});
    else {
      setSheetPrefs(id, { ready: next || '' });
      setLinkTick((n) => n + 1);
    }
  };
  const readyMark = (id) => {
    if (!canReady) return null;
    // v1.0.243: the row shows MY status (the word I chose in •••), the same
    // in every library — the band's overall picture is the "Ready for the
    // show" panel. Only when every member is ready does it say so.
    if (!band) return <ReadyMark mine={myReady(id)} t={t} />;
    const all = band.members.length > 1 && band.members.every((m) => readyOf(id, m.id) === 'know');
    if (all) return <ReadyMark k={band.members.length} n={band.members.length} t={t} />;
    return <ReadyMark mine={readyOf(id, uid)} t={t} />;
  };
  const readyItems = (id) =>
    canReady
      ? [<span key="h" className="more-menu-head">{t('stage.rd.myStatus')}</span>].concat(READY_STATES.map((st) => (
          <button key={st} type="button" className={'more-menu-item stg-ready-item' + (myReady(id) === st ? ' is-on' : '')} onClick={() => markReady(id, st)}>
            <span className="stg-check" aria-hidden="true">
              {myReady(id) === st ? '✓' : ''}
            </span>
            {t('stage.rd.' + st)}
          </button>
        )))
      : null;
  // open rehearsal notes on a song (v1.0.244): a small count on its row
  const notesBadge = (id) => {
    const n = openCount(id, byIdRef.current.get(id)?.band ?? null);
    return n ? (
      <span className="stg-notes-badge" aria-label={t('stage.nt.count', { n })} title={t('stage.nt.count', { n })}>
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
          <path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        {n}
      </span>
    ) : null;
  };
  const songItem = (id) => (
    <button type="button" className="more-menu-item" onClick={() => setSongPage(id)}>
      {t('stage.sp.open')}
    </button>
  );
  // a show's length: every song's length (3:30 when unset) + the pauses
  const showLength = (list, songsHere) => {
    const playable = songsHere.filter((s) => !s.missing);
    let guess = false;
    let sec = 0;
    for (const s of playable) {
      const d = sheetPrefs(s.id).dur;
      if (!d) guess = true;
      sec += d || DEFAULT_DUR;
    }
    sec += (list.gap || 0) * Math.max(0, playable.length - 1);
    return { sec, guess, n: playable.length };
  };
  const [perform, setPerform] = useState(null); // {songs, at, setId?}
  // a reorder on stage (v1.0.189) is saved to the setlist; songs missing on
  // this device keep their place at the end
  const reorderSet = (ids) => {
    const list = sets.lists.find((l) => l.id === perform?.setId);
    if (!list) return;
    sets.setItems(list.id, [...ids, ...list.items.filter((x) => !ids.includes(x))]);
  };
  const performer = perform && (
    <Performer
      songs={perform.songs}
      startAt={perform.at}
      onClose={() => setPerform(null)}
      onReorder={perform.setId ? reorderSet : undefined}
      band={band ? { id: band.id, name: band.name } : null}
      initialRole={perform.role || 'off'}
      setId={perform.setId ?? null}
    />
  );
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(null); // id of a sheet / setlist
  const [sureDelete, setSureDelete] = useState(null);
  // Setlist EDIT mode (v1.0.240, the iOS list pattern): Edit -> a red ⊖ to
  // remove and a ≡ grip to drag each row; Done saves the new order once.
  const [editItems, setEditItems] = useState(null); // the items being edited, or null
  const [removeAt, setRemoveAt] = useState(null); // the row whose ⊖ was tapped
  const editRef = useRef(null);
  const [dragAt, setDragAt] = useState(null);
  useEffect(() => {
    setEditItems(null);
    setRemoveAt(null);
  }, [openSet]);
  editRef.current = editItems;
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [pickQuery, setPickQuery] = useState('');
  const [dialog, setDialog] = useState(null); // 'newBand' | 'join' | 'invite' | 'members'
  const [msg, setMsg] = useState(null);
  const [photos, setPhotos] = useState(null); // several images: one chart or one each?
  const fileRef = useRef(null);
  // v1.0.210: the home is two lists, like Apple Music's library — Setlists |
  // Songs (the card's two shortcuts open one each)
  const [tab, setTab] = useState(start === 'songs' ? 'songs' : start === 'ideas' ? 'ideas' : 'sets');
  useEffect(() => {
    if (tab === 'ideas' && !band && (!isIn || cloud.lastSync)) setTab('sets');
  }, [tab, band, isIn, cloud.lastSync]);
  const [hintOff, setHintOff] = useState(() => {
    try {
      return localStorage.getItem(HINT_KEY) === '1';
    } catch {
      return false;
    }
  });
  const hideHint = () => {
    setHintOff(true);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* private mode */
    }
  };
  // who of the band is here right now (presence on the band's live channel;
  // the Performer takes the channel over while a chart is open)
  const [here, setHere] = useState([]);
  useEffect(() => {
    if (!bandId || perform) {
      setHere([]);
      return undefined;
    }
    let alive = true;
    let link = null;
    openBandLink(bandId, { people: (list) => alive && setHere(list.filter((x) => !x.me)) })
      .then((l) => {
        if (alive) link = l;
        else l.close();
      })
      .catch(() => {});
    return () => {
      alive = false;
      link?.close();
    };
  }, [bandId, !!perform]); // eslint-disable-line react-hooks/exhaustive-deps
  const leaderHere = here.find((x) => x.role === 'lead') ?? null;

  const chooseScope = (s) => {
    setScope(s);
    setOpenSet(null);
    try {
      localStorage.setItem(SCOPE_KEY, s);
    } catch {
      /* private mode */
    }
  };

  const reload = useCallback(() => listSheets().then(setSheets), []);
  useEffect(() => {
    reload();
    return onSheetsChange(reload);
  }, [reload]);

  // Sync when the screen opens, when signing in finishes, when the app
  // comes back to the front.
  useEffect(() => {
    if (!isIn) return undefined;
    syncCharts();
    const onVis = () => document.visibilityState === 'visible' && syncCharts();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [isIn, account.email]);

  // A band I'm no longer in: back to my charts.
  useEffect(() => {
    if (scope !== 'me' && isIn && cloud.lastSync && !cloud.bands.some((b) => b.id === scope)) chooseScope('me');
  }, [scope, isIn, cloud.bands, cloud.lastSync]);

  useEffect(() => {
    if (!msg) return undefined;
    const id = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(id);
  }, [msg]);

  const fail = (e) => setMsg(navigator.onLine === false ? t('stage.cloud.offline') : t('stage.cloud.failed') + (e?.message ? ` (${e.message})` : ''));

  const scoped = (sheets ?? []).filter((s) => (s.band ?? null) === bandId);
  const byId = new Map((sheets ?? []).map((s) => [s.id, s]));
  byIdRef.current = byId;
  const set = sets.lists.find((l) => l.id === openSet) ?? null;
  const setOpenSet = setOpenSetRaw;
  useEffect(() => {
    // a band's setlists arrive with the first sync: wait for them
    if (openSet && !set && (!band || cloud.lastSync)) setOpenSet(null);
  }, [openSet, set, band, cloud.lastSync]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!set) return;
    try {
      localStorage.setItem(LAST_SET_KEY, JSON.stringify({ id: set.id, scope: band ? band.id : 'me', name: set.name }));
    } catch {
      /* private mode */
    }
  }, [set?.id, set?.name, band?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Offline (v1.0.244): a setlist says whether every song is on this device;
  // pdf.js's fonts are fetched once while online (the service worker keeps
  // them), so the charts read right on a stage with no internet.
  const [getting, setGetting] = useState(false);
  useEffect(() => {
    if (!set || fontsWarmed || navigator.onLine === false) return;
    fontsWarmed = true;
    for (const f of PDF_FONTS) fetch('/pdfjs/standard_fonts/' + f).catch(() => {});
  }, [set?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const download = async () => {
    setGetting(true);
    try {
      await syncCharts();
    } finally {
      setGetting(false);
    }
  };

  // A band invite link (?band=CODE): the join sheet with the code typed in.
  // Signed out, the sheet asks to sign in first and the code waits — it is
  // offered again as soon as the sign-in lands (a Google sign-in reloads the
  // page; the code is kept on the device for that).
  const [joinCode, setJoinCode] = useState('');
  const openJoinFromLink = () => {
    const c = pendingJoinCode();
    if (!c) return;
    const mine = isIn && cloud.bands.find((b) => (b.code || '').toUpperCase() === c);
    if (mine) {
      chooseScope(mine.id);
      clearJoinCode();
      return;
    }
    setJoinCode(c);
    setDialog('band');
  };
  const wasInRef = useRef(isIn);
  useEffect(() => {
    if (isIn && !wasInRef.current && !dialog && pendingJoinCode()) openJoinFromLink();
    wasInRef.current = isIn;
  }, [isIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // The home card's shortcuts: Songs = the song list, Band = the band sheet.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || !sheets) return;
    // Members: a signed-in device that has never synced doesn't know its
    // bands yet — wait for the first sync instead of offering "create a band".
    const waitBands = start === 'band' && isIn && !cloud.bands.length && !cloud.lastSync && !['error', 'offline'].includes(cloud.status);
    if (waitBands) return;
    startedRef.current = true;
    if (start === 'join') {
      openJoinFromLink();
    } else if (start === 'band') {
      if (band) setDialog('manage');
      else if (isIn && cloud.bands.length) {
        chooseScope(cloud.bands[0].id);
        setDialog('manage');
      } else setDialog('band');
    }
  }, [sheets, cloud.lastSync, cloud.status, isIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const songsOf = (ids) => ids.map((id) => ({ id, name: byId.get(id)?.name ?? t('stage.missing'), missing: !byId.has(id) }));

  const addPdfs = async (pdfs) => {
    if (!pdfs.length) return;
    setBusy(true);
    const added = await addCharts(pdfs, bandId);
    await reload();
    if (set && added.length) sets.setItems(set.id, [...set.items, ...added]);
    setBusy(false);
  };
  // a camera photo is called "image.jpg" — give it a name the list can show
  const photoName = (f) => {
    const n = (f?.name || '').replace(/\.[a-z0-9]+$/i, '');
    return !n || /^(image|img[_-]?\d*|photo|screenshot|\d+)$/i.test(n) ? t('stage.photoName', { d: new Date().toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric' }) }) : n;
  };
  const addPhotos = async (images, together) => {
    setPhotos(null);
    setBusy(true);
    try {
      const pdfs = together ? [await imagesToPdf(images, photoName(images[0]))] : await Promise.all(images.map((f) => imagesToPdf([f], photoName(f))));
      await addPdfs(pdfs);
    } catch {
      setMsg(t('stage.photoFailed'));
    }
    setBusy(false);
  };
  const addFiles = async (files) => {
    const list = [...files];
    const images = list.filter((f) => !isPdf(f) && isImage(f));
    await addPdfs(list.filter(isPdf));
    if (images.length === 1) await addPhotos(images, true);
    else if (images.length > 1) setPhotos(images);
  };
  // a shared link (Dropbox / Drive / OneDrive / any PDF or image address)
  const addLink = async (url) => {
    const r = await fetch('/api/chart-link?url=' + encodeURIComponent(url));
    if (!r.ok) {
      const e = new Error('link');
      e.linkError = (await r.json().catch(() => ({}))).error || 'fetch';
      throw e;
    }
    const type = r.headers.get('content-type') || '';
    const name = decodeURIComponent(r.headers.get('x-chart-name') || '').replace(/\.[a-z0-9]+$/i, '') || t('stage.linkName');
    const blob = await r.blob();
    const file = new File([blob], name + (type.includes('pdf') ? '.pdf' : '.jpg'), { type });
    if (type.includes('pdf')) await addPdfs([file]);
    else await addPdfs([await imagesToPdf([file], name)]);
  };
  const linkError = (e) => (e?.linkError ? t('stage.link.err.' + (['bad-url', 'not-a-chart', 'too-big'].includes(e.linkError) ? e.linkError : 'fetch')) : null);

  const openWords = (id) => {
    const sh = byId.get(id);
    if (sh) setWords({ id, name: sh.name, text: sh.lyrics || '', pdf: sh.pdf });
  };

  const removeSheet = async (id) => {
    setSureDelete(null);
    try {
      await removeChart(id);
      sets.dropSheet(id);
    } catch (e) {
      fail(e);
    }
  };

  const newSet = () => {
    const list = sets.create(t('stage.setlistName', { n: sets.lists.length + 1 }));
    setOpenSet(list.id);
    setRenaming(list.id);
  };

  const durOf = (id) => {
    const d = sheetPrefs(id).dur;
    return d ? fmtDur(d) : null;
  };

  const addCapsule = (
    <>
      <button type="button" className="stg-capsule" onClick={() => fileRef.current?.click()} disabled={busy}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        {busy ? t('stage.adding') : t('stage.add')}
      </button>
      <button type="button" className="stg-capsule is-quiet" onClick={() => setDialog('link')} disabled={busy} aria-label={t('stage.link.title')} title={t('stage.link.title')}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span className="stg-cap-label">{t('stage.link')}</span>
      </button>
      <button type="button" className="stg-capsule is-quiet" onClick={() => setWords({ id: null, name: '', text: '', pdf: false })} disabled={busy} aria-label={t('stage.ly.newTitle')} title={t('stage.ly.newTitle')}>
        <WordsGlyph />
        <span className="stg-cap-label">{t('stage.ly.short')}</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf,image/*"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </>
  );

  const toast = msg && (
    <p className="stg-toast" role="status">
      {msg}
    </p>
  );

  // ---- band dialogs ----
  const owner = band && band.owner === uid;
  const inviteText = band ? t('stage.band.inviteText', { band: band.name, code: band.code, url: inviteUrl(band.code) }) : '';
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ text: inviteText });
      else {
        await navigator.clipboard.writeText(inviteText);
        setMsg(t('stage.band.copied'));
      }
    } catch {
      /* cancelled */
    }
  };
  const saveWords = async ({ name, text, start: first, link }) => {
    const w = words;
    setWords(null);
    try {
      if (w.id) {
        await setSheetLyrics(w.id, text);
        if (first != null && sheetPrefs(w.id).start == null) setSheetPrefs(w.id, { start: first });
      } else {
        const id = await addTextSong({ name, lyrics: text, band: bandId, start: first, link: link || null });
        if (set) sets.setItems(set.id, [...set.items, id]);
      }
      await reload();
    } catch (e) {
      fail(e);
    }
  };
  const dialogs = (
    <>
      <ListenDock />
      {listen && <ListenSheet name={listen.name} link={listen.link} onSave={saveListen} onClose={() => setListen(null)} dir={dir} t={t} />}
      {words && <LyricsSheet songId={words.id} name={words.name} text={words.text} hasPdf={words.pdf} onSave={saveWords} onClose={() => setWords(null)} />}
      {dialog === 'link' && (
        <AskSheet
          title={t('stage.link.title')}
          label={t('stage.link.label')}
          placeholder="https://"
          action={t('stage.add')}
          inputMode="url"
          errorOf={linkError}
          onSubmit={addLink}
          onClose={() => setDialog(null)}
          dir={dir}
          t={t}
        />
      )}
      {photos && (
        <Sheet title={t('stage.photos.title', { n: photos.length })} onClose={() => setPhotos(null)} dir={dir} t={t}>
          <p className="stg-sheet-text">{t('stage.photos.text')}</p>
          <div className="stg-sheet-foot">
            <button type="button" className="stg-capsule" onClick={() => addPhotos(photos, false)}>
              {t('stage.photos.apart')}
            </button>
            <button type="button" className="stg-capsule is-primary" onClick={() => addPhotos(photos, true)}>
              {t('stage.photos.together')}
            </button>
          </div>
        </Sheet>
      )}
      {dialog === 'band' && (
        <BandJoinSheet
          key={joinCode || 'plain'}
          initialCode={joinCode}
          isIn={isIn}
          onAccount={onAccount}
          onCreate={async (name) => {
            const b = await createBand(name);
            if (b?.id) chooseScope(b.id);
          }}
          onJoin={async (code) => {
            const b = await joinBand(code);
            if (b?.id) chooseScope(b.id);
            clearJoinCode();
            setJoinCode('');
          }}
          onClose={() => {
            setDialog(null);
            // signed out = the code waits for the sign-in; otherwise they chose
            if (isIn) {
              clearJoinCode();
              setJoinCode('');
            }
          }}
          dir={dir}
          t={t}
        />
      )}
    </>
  );

  // Join the member who leads: open their setlist (or the band's charts)
  // as a follower — the Performer then turns to their song and place.
  const joinLeader = () => {
    if (!leaderHere) return;
    const list = sets.lists.find((l) => l.id === leaderHere.set);
    const songs = list ? songsOf(list.items).filter((x) => !x.missing) : scoped.map((x) => ({ id: x.id, name: x.name }));
    if (!songs.length) return;
    setPerform({ songs, at: 0, setId: list?.id ?? null, role: 'follow' });
  };
  const liveBanner = band && leaderHere && (
    <LiveBanner person={leaderHere} setName={sets.lists.find((l) => l.id === leaderHere.set)?.name} onJoin={joinLeader} t={t} />
  );

  // ---- a song's page: rehearsal notes + recordings (v1.0.244) ----
  const pageSong = songPage ? byId.get(songPage) : null;
  if (songPage && pageSong) {
    const songBand = pageSong.band ? (cloud.bands.find((b) => b.id === pageSong.band) ?? { id: pageSong.band }) : null;
    return (
      <div className="stg" dir={dir}>
        <BackButton label={set ? set.name : band ? band.name : t('stage.back')} onClick={() => setSongPage(null)} />
        <header className="stg-head">
          <div className="stg-head-title">
            <h1 dir="auto">{pageSong.name}</h1>
            {durOf(pageSong.id) && <p className="subtitle">{durOf(pageSong.id)}</p>}
          </div>
          <div className="stg-head-actions">
            <button type="button" className="stg-capsule is-primary" onClick={() => setPerform({ songs: [{ id: pageSong.id, name: pageSong.name }], at: 0 })}>
              <PlayGlyph />
              {t('stage.start')}
            </button>
          </div>
        </header>
        <section className="ph-section">
          <h2 className="ph-section-title">{t('stage.sp.notes')}</h2>
          <SongNotes chart={pageSong.id} band={songBand} t={t} lang={lang} />
        </section>
        <section className="ph-section">
          <h2 className="ph-section-title">{t('stage.sp.takes')}</h2>
          <SongTakes song={pageSong} t={t} lang={lang} />
        </section>
        {toast}
        {perform && performer}
      </div>
    );
  }

  // ---- the band's page (members, invite, settings) ----
  if (dialog === 'manage' && band) {
    return (
      <div className="stg" dir={dir}>
        <BackButton label={t('stage.back')} onClick={() => setDialog(null)} />
        <header className="stg-head">
          <div className="stg-head-title">
            <h1 dir="auto">{band.name}</h1>
          </div>
        </header>
        <BandManagePage
          band={band}
          uid={uid}
          here={here}
          onShare={share}
          onNewCode={() => newInviteCode(band.id).catch(fail)}
          onRename={(v) => renameBand(band.id, v).catch(fail)}
          onRemove={(id) => removeMember(band.id, id).catch(fail)}
          onAnother={() => setDialog('band')}
          onLeave={() => {
            setDialog(null);
            (owner ? deleteBand(band.id) : leaveBand(band.id)).then(() => chooseScope('me')).catch(fail);
          }}
          t={t}
        />
        {toast}
      </div>
    );
  }

  // ---- a setlist ----
  if (set) {
    const editing = editItems != null;
    const songs = songsOf(editing ? editItems : set.items);
    const finishEdit = () => {
      if (editItems && editItems.join('\u0001') !== set.items.join('\u0001')) sets.setItems(set.id, editItems);
      setEditItems(null);
      setRemoveAt(null);
    };
    const startRowDrag = (e, from0) => {
      e.preventDefault();
      const rowH = e.currentTarget.closest('.stg-row')?.offsetHeight || 52;
      let y0 = e.clientY;
      let from = from0;
      setRemoveAt(null);
      setDragAt(from);
      const move = (ev) => {
        const list = editRef.current;
        if (!list) return;
        const dy = ev.clientY - y0;
        const to = Math.max(0, Math.min(list.length - 1, from + (dy > rowH / 2 ? 1 : dy < -rowH / 2 ? -1 : 0)));
        if (to !== from) {
          setEditItems(moveItem(list, from, to));
          y0 += (to - from) * rowH;
          from = to;
          setDragAt(to);
        }
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        setDragAt(null);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    };
    const notIn = scoped.filter((s) => !set.items.includes(s.id));
    const len = showLength(set, songs);
    const mineReadyN = songs.filter((s) => !s.missing && myReady(s.id) === 'know').length;
    return (
      <div className="stg" dir={dir}>
        <BackButton label={band ? band.name : t('stage.back')} onClick={() => (finishEdit(), setOpenSet(null))} />
        <header className="stg-head">
          <div className="stg-head-title">
            {renaming === set.id ? (
              <NameEdit value={set.name} onSave={(v) => (sets.rename(set.id, v), setRenaming(null))} onCancel={() => setRenaming(null)} />
            ) : (
              <h1 dir="auto">{set.name}</h1>
            )}
            <p className="subtitle">
              {songs.length === 1 ? t('stage.song1') : songs.length ? t('stage.songs', { n: songs.length }) : t('stage.noSongs')}
              {len.n > 0 ? ' · ' + (len.guess ? t('stage.len.about', { t: fmtShow(len.sec, t) }) : fmtShow(len.sec, t)) : ''}
              {!band && canReady && len.n > 0 && mineReadyN > 0 ? ' · ' + t('stage.rd.summaryMe', { k: mineReadyN, n: len.n }) : ''}
              {band ? ' · ' + band.name : ''}
            </p>
          </div>
          <div className="stg-head-actions">
            {editing ? (
              <button type="button" className="stg-edit-key is-done" onClick={finishEdit}>
                {t('stage.done')}
              </button>
            ) : (
              <>
            {!band && songs.some((s) => !s.missing) && (
              <button type="button" className="stg-capsule is-primary" onClick={() => setPerform({ songs: songs.filter((s) => !s.missing), at: 0, setId: set.id })}>
                <PlayGlyph />
                {t('stage.start')}
              </button>
            )}
            <MoreMenu label={t('stage.more')}>
              {songs.length > 0 && (
                <button type="button" className="more-menu-item" onClick={() => (setEditItems([...set.items]), setRemoveAt(null))}>
                  {t('stage.edit')}
                </button>
              )}
              <button type="button" className="more-menu-item" onClick={() => setRenaming(set.id)}>
                {t('stage.rename')}
              </button>
              {sureDelete === set.id ? (
                <button type="button" className="more-menu-item is-danger" onClick={() => (sets.remove(set.id), setSureDelete(null))}>
                  {t('stage.deleteSure')}
                </button>
              ) : (
                <button type="button" className="more-menu-item is-danger" data-keep="1" onClick={() => setSureDelete(set.id)}>
                  {t('stage.delete')}
                </button>
              )}
            </MoreMenu>
              </>
            )}
          </div>
        </header>

        {!editing && songs.length > 0 && (() => {
          const away = songs.filter((x) => x.missing).length;
          if (!away)
            return (
              <p className="stg-offline is-ok" role="status">
                <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" fill="currentColor" />
                  <path d="M7.5 12.4l3 3 6-6.4" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('stage.off.ready')}
              </p>
            );
          return (
            <p className="stg-offline" role="status">
              <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
                <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 7.5v8M8.5 12.5L12 16l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{away === 1 ? t('stage.off.missing1') : t('stage.off.missing', { n: away })}</span>
              {isIn && (navigator.onLine === false ? (
                <span className="stg-offline-sub">{t('stage.off.offline')}</span>
              ) : (
                <button type="button" className="stg-offline-get" onClick={download} disabled={getting}>
                  {getting ? t('stage.off.getting') : t('stage.off.get')}
                </button>
              ))}
            </p>
          );
        })()}
        {liveBanner}
        {band && songs.some((s) => !s.missing) && (
          <div className="stg-start">
            <button type="button" className="stg-capsule is-primary is-wide" onClick={() => setPerform({ songs: songs.filter((s) => !s.missing), at: 0, setId: set.id })}>
              <PlayGlyph />
              {t('stage.start')}
            </button>
            {!leaderHere && (
              <button type="button" className="stg-capsule is-wide" onClick={() => setPerform({ songs: songs.filter((s) => !s.missing), at: 0, setId: set.id, role: 'lead' })}>
                <BandGlyph />
                {t('stage.startBand')}
              </button>
            )}
            <p className="stg-presence">
              {here.length > 0 && (
                <span className="stg-faces" aria-hidden="true">
                  {here.slice(0, 4).map((p) => (
                    <MemberAvatar key={p.key} m={{ id: (p.key || '').split(':')[0], name: p.name }} small />
                  ))}
                </span>
              )}
              <span>{here.length ? t('stage.presence.some', { names: [...new Set(here.map((p) => p.name || t('stage.band.someone')))].join(', ') }) : t('stage.presence.none')}</span>
            </p>
          </div>
        )}

        <div className={'ph-group stg-group' + (editing ? ' is-editing' : '')}>
          {editing && songs.map((s, i) => (
            <div key={s.id + i} className={'stg-row is-edit' + (dragAt === i ? ' is-dragging' : '')}>
              <button type="button" className={'stg-minus' + (removeAt === i ? ' is-open' : '')} aria-label={t('stage.remove') + ' · ' + s.name} onClick={() => setRemoveAt(removeAt === i ? null : i)}>
                <span aria-hidden="true" />
              </button>
              <span className="stg-num">{i + 1}</span>
              <span className="ph-text">
                <span className="ph-title" dir="auto">
                  {s.name}
                </span>
              </span>
              {removeAt === i ? (
                <button type="button" className="stg-remove-key" onClick={() => (setEditItems(editItems.filter((_, k) => k !== i)), setRemoveAt(null))}>
                  {t('stage.removeShort')}
                </button>
              ) : (
                <span
                  className="stg-grip"
                  role="button"
                  tabIndex={0}
                  aria-label={t('stage.drag') + ' · ' + s.name}
                  onPointerDown={(e) => startRowDrag(e, i)}
                  onKeyDown={(e) => {
                    const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : null;
                    if (to == null || to < 0 || to >= editItems.length) return;
                    e.preventDefault();
                    setEditItems(moveItem(editItems, i, to));
                  }}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
                    <path d="M5 8h14M5 12h14M5 16h14" />
                  </svg>
                </span>
              )}
            </div>
          ))}
          {!editing && songs.map((s, i) => (
            <div key={s.id + i} className={'stg-row' + (s.missing ? ' is-missing' : '')}>
              <button
                type="button"
                className="ph-row stg-row-main"
                disabled={s.missing}
                onClick={() => {
                  const playable = songs.filter((x) => !x.missing);
                  setPerform({ songs: playable, at: playable.findIndex((x) => x.id === s.id), setId: set.id });
                }}
              >
                <span className="stg-num">{i + 1}</span>
                <span className="ph-text">
                  <span className="ph-title" dir="auto">
                    {s.name}
                  </span>
                </span>
                {!s.missing && notesBadge(s.id)}
                {!s.missing && readyMark(s.id)}
                {!s.missing && durOf(s.id) && <span className="stg-detail">{durOf(s.id)}</span>}
              </button>
              {!s.missing && <ListenKey link={linkOf(s.id)} name={s.name} t={t} />}
              <MoreMenu label={t('stage.more')}>
                {!s.missing && readyItems(s.id)}
                {!s.missing && canReady && <span className="more-menu-sep" aria-hidden="true" />}
                {!s.missing && songItem(s.id)}
                {!s.missing && (
                  <button type="button" className="more-menu-item" onClick={() => openWords(s.id)}>
                    {byId.get(s.id)?.lyrics ? t('stage.ly.edit') : t('stage.ly.add')}
                  </button>
                )}
                {!s.missing && (
                  <button type="button" className="more-menu-item" onClick={() => openListen(s.id, s.name)}>
                    {linkOf(s.id) ? t('stage.listen.edit') : t('stage.listen.add')}
                  </button>
                )}
                <button type="button" className="more-menu-item is-danger" onClick={() => sets.setItems(set.id, set.items.filter((_, k) => k !== i))}>
                  {t('stage.remove')}
                </button>
              </MoreMenu>
            </div>
          ))}
          {!editing && (
          <button type="button" className="ph-row stg-add-row" onClick={() => setPicking(true)}>
            <span className="stg-plus" aria-hidden="true">+</span>
            <span className="ph-title">{t('stage.addSongs')}</span>
          </button>
          )}
        </div>

        {len.n > 1 && (
          <section className="ph-section stg-len">
            <div className="ph-group stg-group stg-len-group">
              <ControlRow label={t('stage.len.gap')}>
                <Select value={String(set.gap || 0)} onChange={(e) => sets.setGap(set.id, Number(e.target.value))} aria-label={t('stage.len.gap')}>
                  {GAPS.map((g) => (
                    <option key={g} value={g}>
                      {t('stage.len.gap' + g)}
                    </option>
                  ))}
                </Select>
              </ControlRow>
            </div>
            <p className="stg-fine is-under">
              {t('stage.len.total', { t: fmtShow(len.sec, t) })}
              {len.guess ? ' ' + t('stage.len.defaults') : ''}
            </p>
          </section>
        )}

        {band && canReady && <ReadyPanel band={band} songs={songs} readyOf={readyOf} uid={uid} t={t} />}
        {band && isIn && !cloud.readyOk && songs.length > 0 && <p className="stg-fine is-under">{t('stage.rd.setup')}</p>}

        {picking && (
          <Sheet title={t('stage.pick')} onClose={() => (setPicking(false), setPickQuery(''))} dir={dir} t={t}>
            {notIn.length > SEARCH_FROM && <SearchField value={pickQuery} onChange={setPickQuery} t={t} />}
            {notIn.length === 0 ? (
              <p className="stg-empty-text">{scoped.length ? t('stage.allPicked') : t('stage.emptyText')}</p>
            ) : notIn.filter((s) => matchSong(s, pickQuery)).length === 0 ? (
              <p className="stg-empty-text">{t('stage.searchNone', { q: pickQuery.trim() })}</p>
            ) : (
              <div className="ph-group stg-group">
                {notIn.filter((s) => matchSong(s, pickQuery)).map((s) => (
                  <button key={s.id} type="button" className="ph-row" onClick={() => sets.setItems(set.id, [...set.items, s.id])}>
                    <span className="stg-plus" aria-hidden="true">+</span>
                    <span className="ph-title" dir="auto">
                      {s.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="stg-sheet-foot">{addCapsule}</div>
          </Sheet>
        )}

        {dialogs}
        {toast}
        {perform && performer}
      </div>
    );
  }

  // ---- home ----
  const shownSongs = scoped.flatMap((s, i) => {
    if (scoped.length <= SEARCH_FROM) return [{ s, i, inWords: null }];
    const m = matchSong(s, query);
    return m ? [{ s, i, inWords: m === true ? null : m }] : [];
  });
  const status = !isIn
    ? null
    : cloud.status === 'syncing'
      ? t('stage.cloud.syncing')
      : cloud.status === 'offline'
        ? t('stage.cloud.offlineCopy')
        : cloud.status === 'error'
          ? t('stage.cloud.error')
          : cloud.lastSync
            ? t('stage.cloud.synced', { when: sinceText(cloud.lastSync, t) })
            : '';
  return (
    <div className="stg" dir={dir}>
      <header className="stg-head">
        <div className="stg-head-title">
          <h1>{t('stage.title')}</h1>
        </div>
        <div className="stg-head-actions">
          {addCapsule}
          {hintOff && !(isIn && cloud.bands.length > 0) && (
            <MoreMenu label={t('stage.more')}>
              <button type="button" className="more-menu-item" onClick={() => setDialog('band')}>
                {t('stage.band.menu')}
              </button>
            </MoreMenu>
          )}
        </div>
      </header>
      {sheets && scoped.length === 0 && <p className="subtitle stg-sub">{t('stage.subtitle')}</p>}

      {isIn && cloud.bands.length > 0 &&
        (cloud.bands.length <= 2 ? (
          <Segmented
            className="stg-scope-seg"
            ariaLabel={t('stage.library')}
            options={[{ value: 'me', label: t('stage.mineShort') }, ...cloud.bands.map((b) => ({ value: b.id, label: b.name }))]}
            value={band ? band.id : 'me'}
            onChange={chooseScope}
          />
        ) : (
          <label className="stg-scope-select">
            <span className="stg-sr">{t('stage.library')}</span>
            <Select value={band ? band.id : 'me'} onChange={(e) => chooseScope(e.target.value)} aria-label={t('stage.library')}>
              <option value="me">{t('stage.mine')}</option>
              {cloud.bands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </label>
        ))}

      {liveBanner}

      {band && (
        <button type="button" className="ph-row stg-band-row" onClick={() => setDialog('manage')}>
          <span className="stg-faces" aria-hidden="true">
            {band.members.slice(0, 4).map((m) => (
              <MemberAvatar key={m.id} m={m} />
            ))}
          </span>
          <span className="ph-text">
            <span className="ph-title">{band.members.length === 1 ? t('stage.band.member1') : t('stage.band.membersCount', { n: band.members.length })}</span>
          </span>
          <span className="stg-band-invite">{t('stage.band.inviteShort')}</span>
          <Chevron />
        </button>
      )}

      {!band && !(isIn && cloud.bands.length > 0) && !hintOff && (
        <div className="stg-hint">
          <span className="stg-tile is-band" aria-hidden="true">
            <BandGlyph />
          </span>
          <button type="button" className="stg-hint-main" onClick={() => setDialog('band')}>
            <strong>{t('stage.band.hintTitle')}</strong>
            <span>{t('stage.band.hintText')}</span>
          </button>
          <button type="button" className="stg-hint-close" onClick={hideHint} aria-label={t('stage.band.hintClose')} title={t('stage.band.hintClose')}>
            <svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true">
              <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      <Segmented
        className="stg-tabs"
        ariaLabel={t('stage.title')}
        options={[
          { value: 'sets', label: t('stage.nav.sets') },
          { value: 'songs', label: t('stage.nav.songs') },
          ...(band ? [{ value: 'ideas', label: t('stage.nav.ideas') }] : []),
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'ideas' && band && (
        <SuggestionsView
          band={band}
          uid={uid}
          suggestions={cloud.suggestions}
          ready={cloud.suggestReady}
          songs={scoped}
          sets={sets}
          onOpenSet={setOpenSet}
          say={setMsg}
          Sheet={Sheet}
          ListenKey={ListenKey}
          dir={dir}
          t={t}
        />
      )}

      {tab !== 'ideas' && sheets && scoped.length === 0 && (tab === 'songs' || sets.lists.length === 0) && (
        <div className="stg-empty">
          <strong>{band ? t('stage.band.emptyTitle', { band: band.name }) : t('stage.emptyTitle')}</strong>
          <p className="stg-empty-text">{band ? t('stage.band.emptyText') : t('stage.emptyText')}</p>
        </div>
      )}

      {tab === 'sets' && (scoped.length > 0 || sets.lists.length > 0) && (
        <section className="ph-section">
          <h2 className="stg-sr">{t('stage.setlists')}</h2>
          <div className="ph-group stg-group">
            {sets.lists.map((l) => (
              <button key={l.id} type="button" className="ph-row" onClick={() => setOpenSet(l.id)}>
                <span className="stg-tile" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
                  </svg>
                </span>
                <span className="ph-text">
                  <span className="ph-title" dir="auto">
                    {l.name}
                  </span>
                </span>
                <span className="stg-detail">{l.items.length === 1 ? t('stage.song1') : l.items.length ? t('stage.songs', { n: l.items.length }) : t('stage.noSongs')}</span>
                <Chevron />
              </button>
            ))}
            <button type="button" className="ph-row stg-add-row" onClick={newSet}>
              <span className="stg-plus" aria-hidden="true">+</span>
              <span className="ph-title">{t('stage.newSetlist')}</span>
            </button>
          </div>
        </section>
      )}

      {tab === 'songs' && scoped.length > 0 && (
        <section className="ph-section" id="stg-songs">
          <h2 className="stg-sr">{t('stage.charts')}</h2>
          {scoped.length > SEARCH_FROM && <SearchField value={query} onChange={setQuery} t={t} />}
          {shownSongs.length === 0 && <p className="stg-empty-text stg-search-none">{t('stage.searchNone', { q: query.trim() })}</p>}
          <div className={"ph-group stg-group" + (shownSongs.length === 0 ? " stg-hidden" : "")}>
            {shownSongs.map(({ s, i, inWords }) => (
              <div key={s.id} className="stg-row">
                {renaming === s.id ? (
                  <span className="ph-row stg-row-main">
                    <NameEdit
                      value={s.name}
                      onSave={(v) => {
                        setRenaming(null);
                        renameChart(s.id, v).catch(fail);
                      }}
                      onCancel={() => setRenaming(null)}
                    />
                  </span>
                ) : (
                  <button type="button" className="ph-row stg-row-main" onClick={() => setPerform({ songs: scoped.map((x) => ({ id: x.id, name: x.name })), at: i })}>
                    {s.pdf ? (
                      <span className="stg-tile is-doc" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 3h7l4 4v14H7z" />
                          <path d="M14 3v4h4M9.5 12h6M9.5 15.5h6" />
                        </svg>
                      </span>
                    ) : (
                      <span className="stg-tile is-words" aria-hidden="true">
                        <WordsGlyph />
                      </span>
                    )}
                    <span className="ph-text">
                      <span className="ph-title" dir="auto">
                        {s.name}
                      </span>
                      {inWords && <span className="ph-desc stg-hit" dir="auto">{t('stage.inWords')} · {inWords}</span>}
                    </span>
                    {notesBadge(s.id)}
                    {readyMark(s.id)}
                    {(durOf(s.id) || (isIn && !s.cloud)) && (
                      <span className="stg-detail">{[durOf(s.id), isIn && !s.cloud ? t('stage.cloud.notYet') : null].filter(Boolean).join(' · ')}</span>
                    )}
                  </button>
                )}
                {renaming !== s.id && <ListenKey link={linkOf(s.id)} name={s.name} t={t} />}
                <MoreMenu label={t('stage.more')}>
                  {readyItems(s.id)}
                  {canReady && <span className="more-menu-sep" aria-hidden="true" />}
                  {songItem(s.id)}
                  <button type="button" className="more-menu-item" onClick={() => setRenaming(s.id)}>
                    {t('stage.rename')}
                  </button>
                  <button type="button" className="more-menu-item" onClick={() => openWords(s.id)}>
                    {s.lyrics ? t('stage.ly.edit') : t('stage.ly.add')}
                  </button>
                  <button type="button" className="more-menu-item" onClick={() => openListen(s.id, s.name)}>
                    {linkOf(s.id) ? t('stage.listen.edit') : t('stage.listen.add')}
                  </button>
                  {!band &&
                    cloud.bands.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className="more-menu-item"
                        onClick={() =>
                          shareChart(s.id, b.id)
                            .then(() => setMsg(t('stage.band.shared', { band: b.name })))
                            .catch(fail)
                        }
                      >
                        {t('stage.band.shareTo', { band: b.name })}
                      </button>
                    ))}
                  {sureDelete === s.id ? (
                    <button type="button" className="more-menu-item is-danger" onClick={() => removeSheet(s.id)}>
                      {t('stage.deleteSure')}
                    </button>
                  ) : (
                    <button type="button" className="more-menu-item is-danger" data-keep="1" onClick={() => setSureDelete(s.id)}>
                      {t('stage.delete')}
                    </button>
                  )}
                </MoreMenu>
              </div>
            ))}
          </div>
        </section>
      )}

      {status && <p className={'stg-status' + (cloud.status === 'error' ? ' is-error' : '')}>{status}</p>}

      {dialogs}
      {toast}
      {perform && performer}
    </div>
  );
}
