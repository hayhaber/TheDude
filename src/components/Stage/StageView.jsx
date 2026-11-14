import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { isPdf, listSheets, onSheetsChange, sheetPrefs } from '../../music/sheets/sheetStore';
import { fmtDur, moveItem, useSetlists } from '../../music/sheets/setlists';
import {
  addCharts,
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
  shareChart,
  signedIn,
  subscribeChartCloud,
  syncCharts,
} from '../../music/sheets/chartCloud';
import { getLink } from '../../cloud/cloudState';
import { useCloud } from '../../cloud/useCloud';
import { BackButton } from '../PracticeView/PracticeHome';
import { MoreMenu } from '../MoreMenu/MoreMenu';
import { Performer } from './Performer';
import './Stage.css';

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

/** A small sheet over the screen (Liquid Glass), closed by Done / a tap outside. */
function Sheet({ title, onClose, children, dir, t }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="stg-sheet-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="stg-sheet glass" role="dialog" aria-label={title} dir={dir}>
        <header className="stg-sheet-head">
          <strong>{title}</strong>
          <button type="button" className="stg-done" onClick={onClose}>
            {t('stage.done')}
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

/** One text field + one action (new band / join band). */
function AskSheet({ title, label, placeholder, action, onSubmit, onClose, dir, t, upper = false }) {
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
      setErr(e?.code === 'P0002' || /no band/i.test(e?.message || '') ? t('stage.band.badCode') : navigator.onLine === false ? t('stage.cloud.offline') : t('stage.cloud.failed'));
      setBusy(false);
    }
  };
  return (
    <Sheet title={title} onClose={onClose} dir={dir} t={t}>
      <label className="stg-field">
        <span>{label}</span>
        <input
          autoFocus
          dir="auto"
          value={v}
          placeholder={placeholder}
          autoCapitalize={upper ? 'characters' : 'sentences'}
          autoCorrect="off"
          onChange={(e) => setV(upper ? e.target.value.toUpperCase() : e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()}
        />
      </label>
      {err && <p className="stg-err">{err}</p>}
      <div className="stg-sheet-foot">
        <button type="button" className="stg-capsule is-primary" onClick={go} disabled={!v.trim() || busy}>
          {busy ? '…' : action}
        </button>
      </div>
    </Sheet>
  );
}

function sinceText(iso, t) {
  if (!iso) return '';
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  return min < 1 ? t('stage.cloud.justNow') : min < 60 ? t('stage.cloud.minAgo', { n: min }) : t('stage.cloud.earlier');
}

export function StageView({ onAccount }) {
  const { t, lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const cloud = useSyncExternalStore(subscribeChartCloud, getChartCloud, getChartCloud);
  const account = useCloud();
  const isIn = signedIn();
  const uid = getLink()?.userId ?? null;
  const personal = useSetlists();
  const [scope, setScope] = useState(() => {
    try {
      return localStorage.getItem(SCOPE_KEY) || 'me';
    } catch {
      return 'me';
    }
  });
  const band = scope !== 'me' && isIn ? (cloud.bands.find((b) => b.id === scope) ?? null) : null;
  const bandId = band?.id ?? null;
  const sets = band ? bandSetlistApi(band.id) : personal;
  const [sheets, setSheets] = useState(null); // [{id, name, band, cloud, ...}]
  const [openSet, setOpenSet] = useState(null); // setlist id
  const [perform, setPerform] = useState(null); // {songs, at}
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(null); // id of a sheet / setlist
  const [sureDelete, setSureDelete] = useState(null);
  const [picking, setPicking] = useState(false);
  const [dialog, setDialog] = useState(null); // 'newBand' | 'join' | 'invite' | 'members'
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

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
  const set = sets.lists.find((l) => l.id === openSet) ?? null;
  useEffect(() => {
    if (openSet && !set) setOpenSet(null);
  }, [openSet, set]);

  const songsOf = (ids) => ids.map((id) => ({ id, name: byId.get(id)?.name ?? t('stage.missing'), missing: !byId.has(id) }));

  const addFiles = async (files) => {
    const pdfs = [...files].filter(isPdf);
    if (!pdfs.length) return;
    setBusy(true);
    const added = await addCharts(pdfs, bandId);
    await reload();
    if (set && added.length) sets.setItems(set.id, [...set.items, ...added]);
    setBusy(false);
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
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
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
  const inviteText = band ? t('stage.band.inviteText', { band: band.name, code: band.code, url: 'https://the-dude.vercel.app' }) : '';
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
  const dialogs = (
    <>
      {dialog === 'newBand' && (
        <AskSheet
          title={t('stage.band.new')}
          label={t('stage.band.name')}
          placeholder={t('stage.band.namePh')}
          action={t('stage.band.create')}
          onSubmit={async (name) => {
            const b = await createBand(name);
            if (b?.id) chooseScope(b.id);
          }}
          onClose={() => setDialog(null)}
          dir={dir}
          t={t}
        />
      )}
      {dialog === 'join' && (
        <AskSheet
          title={t('stage.band.join')}
          label={t('stage.band.code')}
          placeholder="ABCD2345"
          action={t('stage.band.joinBtn')}
          upper
          onSubmit={async (code) => {
            const b = await joinBand(code);
            if (b?.id) chooseScope(b.id);
          }}
          onClose={() => setDialog(null)}
          dir={dir}
          t={t}
        />
      )}
      {dialog === 'invite' && band && (
        <Sheet title={t('stage.band.invite')} onClose={() => setDialog(null)} dir={dir} t={t}>
          <p className="stg-empty-text">{t('stage.band.inviteHow', { band: band.name })}</p>
          <div className="stg-code" dir="ltr">
            {band.code}
          </div>
          <div className="stg-sheet-foot">
            <button type="button" className="stg-capsule is-primary" onClick={share}>
              {t('stage.band.share')}
            </button>
            {owner && (
              <button type="button" className="stg-capsule" onClick={() => newInviteCode(band.id).catch(fail)}>
                {t('stage.band.newCode')}
              </button>
            )}
          </div>
        </Sheet>
      )}
      {dialog === 'members' && band && (
        <Sheet title={t('stage.band.members')} onClose={() => setDialog(null)} dir={dir} t={t}>
          <div className="ph-group stg-group">
            {band.members.map((m) => (
              <div key={m.id} className="stg-row">
                <span className="ph-row stg-row-main">
                  <span className="stg-avatar" aria-hidden="true">
                    {Array.from((m.name || '?').trim())[0]?.toUpperCase()}
                  </span>
                  <span className="ph-text">
                    <span className="ph-title" dir="auto">
                      {m.name || t('stage.band.someone')}
                      {m.id === uid ? ` (${t('stage.band.you')})` : ''}
                    </span>
                    {m.id === band.owner && <span className="ph-desc">{t('stage.band.owner')}</span>}
                  </span>
                </span>
                {owner && m.id !== uid && (
                  <button type="button" className="stg-remove" onClick={() => removeMember(band.id, m.id).catch(fail)}>
                    {t('stage.band.remove')}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="stg-sheet-foot">
            <button type="button" className="stg-capsule" onClick={() => setDialog('invite')}>
              {t('stage.band.invite')}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );

  // ---- a setlist ----
  if (set) {
    const songs = songsOf(set.items);
    const notIn = scoped.filter((s) => !set.items.includes(s.id));
    return (
      <div className="stg" dir={dir}>
        <BackButton label={band ? band.name : t('stage.back')} onClick={() => setOpenSet(null)} />
        <header className="stg-head">
          <div className="stg-head-title">
            {renaming === set.id ? (
              <NameEdit value={set.name} onSave={(v) => (sets.rename(set.id, v), setRenaming(null))} onCancel={() => setRenaming(null)} />
            ) : (
              <h1 dir="auto">{set.name}</h1>
            )}
            <p className="subtitle">
              {songs.length === 1 ? t('stage.song1') : songs.length ? t('stage.songs', { n: songs.length }) : t('stage.noSongs')}
              {band ? ' · ' + band.name : ''}
            </p>
          </div>
          <div className="stg-head-actions">
            {songs.some((s) => !s.missing) && (
              <button type="button" className="stg-capsule is-primary" onClick={() => setPerform({ songs: songs.filter((s) => !s.missing), at: 0 })}>
                <PlayGlyph />
                {t('stage.start')}
              </button>
            )}
            <MoreMenu label={t('stage.more')}>
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
          </div>
        </header>

        <div className="ph-group stg-group">
          {songs.map((s, i) => (
            <div key={s.id + i} className={'stg-row' + (s.missing ? ' is-missing' : '')}>
              <button
                type="button"
                className="ph-row stg-row-main"
                disabled={s.missing}
                onClick={() => {
                  const playable = songs.filter((x) => !x.missing);
                  setPerform({ songs: playable, at: playable.findIndex((x) => x.id === s.id) });
                }}
              >
                <span className="stg-num">{i + 1}</span>
                <span className="ph-text">
                  <span className="ph-title" dir="auto">
                    {s.name}
                  </span>
                  {(s.missing || durOf(s.id)) && <span className="ph-desc">{s.missing ? t('stage.missing') : durOf(s.id)}</span>}
                </span>
              </button>
              <MoreMenu label={t('stage.more')}>
                {i > 0 && (
                  <button type="button" className="more-menu-item" onClick={() => sets.setItems(set.id, moveItem(set.items, i, i - 1))}>
                    {t('stage.up')}
                  </button>
                )}
                {i < songs.length - 1 && (
                  <button type="button" className="more-menu-item" onClick={() => sets.setItems(set.id, moveItem(set.items, i, i + 1))}>
                    {t('stage.down')}
                  </button>
                )}
                <button type="button" className="more-menu-item is-danger" onClick={() => sets.setItems(set.id, set.items.filter((_, k) => k !== i))}>
                  {t('stage.remove')}
                </button>
              </MoreMenu>
            </div>
          ))}
          <button type="button" className="ph-row stg-add-row" onClick={() => setPicking(true)}>
            <span className="stg-plus" aria-hidden="true">+</span>
            <span className="ph-title">{t('stage.addSongs')}</span>
          </button>
        </div>

        {picking && (
          <Sheet title={t('stage.pick')} onClose={() => setPicking(false)} dir={dir} t={t}>
            {notIn.length === 0 ? (
              <p className="stg-empty-text">{scoped.length ? t('stage.allPicked') : t('stage.emptyText')}</p>
            ) : (
              <div className="ph-group stg-group">
                {notIn.map((s) => (
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

        {toast}
        {perform && <Performer songs={perform.songs} startAt={perform.at} onClose={() => setPerform(null)} />}
      </div>
    );
  }

  // ---- home ----
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
          <p className="subtitle">{t('stage.subtitle')}</p>
        </div>
        <div className="stg-head-actions">{addCapsule}</div>
      </header>

      {isIn ? (
        <div className="stg-scope">
          <label className="stg-scope-select">
            <span className="stg-sr">{t('stage.library')}</span>
            <select value={band ? band.id : 'me'} onChange={(e) => chooseScope(e.target.value)} aria-label={t('stage.library')}>
              <option value="me">{t('stage.mine')}</option>
              {cloud.bands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <MoreMenu label={t('stage.more')}>
            {band && (
              <>
                <button type="button" className="more-menu-item" onClick={() => setDialog('invite')}>
                  {t('stage.band.invite')}
                </button>
                <button type="button" className="more-menu-item" onClick={() => setDialog('members')}>
                  {t('stage.band.membersN', { n: band.members.length })}
                </button>
                {owner && (
                  <button type="button" className="more-menu-item" onClick={() => setRenaming(band.id)}>
                    {t('stage.band.rename')}
                  </button>
                )}
              </>
            )}
            <button type="button" className="more-menu-item" onClick={() => setDialog('newBand')}>
              {t('stage.band.new')}
            </button>
            <button type="button" className="more-menu-item" onClick={() => setDialog('join')}>
              {t('stage.band.join')}
            </button>
            {band &&
              (sureDelete === band.id ? (
                <button
                  type="button"
                  className="more-menu-item is-danger"
                  onClick={() => {
                    setSureDelete(null);
                    (owner ? deleteBand(band.id) : leaveBand(band.id)).then(() => chooseScope('me')).catch(fail);
                  }}
                >
                  {t('stage.deleteSure')}
                </button>
              ) : (
                <button type="button" className="more-menu-item is-danger" data-keep="1" onClick={() => setSureDelete(band.id)}>
                  {owner ? t('stage.band.delete') : t('stage.band.leave')}
                </button>
              ))}
          </MoreMenu>
          {renaming === band?.id && (
            <NameEdit
              value={band.name}
              onSave={(v) => {
                setRenaming(null);
                renameBand(band.id, v).catch(fail);
              }}
              onCancel={() => setRenaming(null)}
            />
          )}
          {status && <span className={'stg-status' + (cloud.status === 'error' ? ' is-error' : '')}>{status}</span>}
        </div>
      ) : (
        <div className="stg-invite">
          <span>{t('stage.cloud.signInWhy')}</span>
          {onAccount && (
            <button type="button" className="stg-capsule" onClick={onAccount}>
              {t('stage.cloud.signIn')}
            </button>
          )}
        </div>
      )}

      {sheets && scoped.length === 0 && (
        <div className="stg-empty">
          <strong>{band ? t('stage.band.emptyTitle', { band: band.name }) : t('stage.emptyTitle')}</strong>
          <p className="stg-empty-text">{band ? t('stage.band.emptyText') : t('stage.emptyText')}</p>
        </div>
      )}

      {(scoped.length > 0 || sets.lists.length > 0) && (
        <section className="ph-section">
          <h2 className="ph-section-title">{t('stage.setlists')}</h2>
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
                  <span className="ph-desc">{l.items.length === 1 ? t('stage.song1') : l.items.length ? t('stage.songs', { n: l.items.length }) : t('stage.noSongs')}</span>
                </span>
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

      {scoped.length > 0 && (
        <section className="ph-section">
          <h2 className="ph-section-title">{t('stage.charts')}</h2>
          <div className="ph-group stg-group">
            {scoped.map((s, i) => (
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
                    <span className="stg-tile is-doc" aria-hidden="true">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 3h7l4 4v14H7z" />
                        <path d="M14 3v4h4M9.5 12h6M9.5 15.5h6" />
                      </svg>
                    </span>
                    <span className="ph-text">
                      <span className="ph-title" dir="auto">
                        {s.name}
                      </span>
                      {(durOf(s.id) || (isIn && !s.cloud)) && (
                        <span className="ph-desc">{[durOf(s.id), isIn && !s.cloud ? t('stage.cloud.notYet') : null].filter(Boolean).join(' · ')}</span>
                      )}
                    </span>
                  </button>
                )}
                <MoreMenu label={t('stage.more')}>
                  <button type="button" className="more-menu-item" onClick={() => setRenaming(s.id)}>
                    {t('stage.rename')}
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

      {dialogs}
      {toast}
      {perform && <Performer songs={perform.songs} startAt={perform.at} onClose={() => setPerform(null)} />}
    </div>
  );
}
