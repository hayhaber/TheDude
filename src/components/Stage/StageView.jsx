import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { deleteSheet, isPdf, listSheets, renameSheet, saveSheet, sheetPrefs } from '../../music/sheets/sheetStore';
import { fmtDur, moveItem, useSetlists } from '../../music/sheets/setlists';
import { BackButton } from '../PracticeView/PracticeHome';
import { MoreMenu } from '../MoreMenu/MoreMenu';
import { Performer } from './Performer';
import './Stage.css';

// Stage (v1.0.176; user: "all the songs I play with the band, switch from
// chart to chart, auto-scroll"): the band's PDF charts and setlists.
//   home    — Setlists (rows) + All charts (rows), one Add capsule;
//   setlist — its songs in order (••• move up / down / remove), Add songs,
//             one Start capsule; a row starts the set from that song;
//   perform — Performer (full screen).
// The charts are the same store GuitarPro / PianoPro's PDFs use.

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

export function StageView() {
  const { t, lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const sets = useSetlists();
  const [sheets, setSheets] = useState(null); // [{id, name, ...}]
  const [openSet, setOpenSet] = useState(null); // setlist id
  const [perform, setPerform] = useState(null); // {songs, at}
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState(null); // id of a sheet / setlist
  const [sureDelete, setSureDelete] = useState(null);
  const [picking, setPicking] = useState(false);
  const fileRef = useRef(null);

  const reload = useCallback(() => listSheets().then(setSheets), []);
  useEffect(() => {
    reload();
  }, [reload]);

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
    const added = [];
    for (const f of pdfs) {
      try {
        added.push((await saveSheet(f)).id);
      } catch {
        /* storage full */
      }
    }
    await reload();
    if (set && added.length) sets.setItems(set.id, [...set.items, ...added]);
    setBusy(false);
  };

  const removeSheet = async (id) => {
    await deleteSheet(id);
    sets.dropSheet(id);
    setSureDelete(null);
    reload();
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

  // ---- a setlist ----
  if (set) {
    const songs = songsOf(set.items);
    const notIn = (sheets ?? []).filter((s) => !set.items.includes(s.id));
    return (
      <div className="stg" dir={dir}>
        <BackButton label={t('stage.back')} onClick={() => setOpenSet(null)} />
        <header className="stg-head">
          <div className="stg-head-title">
            {renaming === set.id ? (
              <NameEdit value={set.name} onSave={(v) => (sets.rename(set.id, v), setRenaming(null))} onCancel={() => setRenaming(null)} />
            ) : (
              <h1 dir="auto">{set.name}</h1>
            )}
            <p className="subtitle">{songs.length === 1 ? t('stage.song1') : songs.length ? t('stage.songs', { n: songs.length }) : t('stage.noSongs')}</p>
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
          <div className="stg-sheet-scrim" onClick={(e) => e.target === e.currentTarget && setPicking(false)}>
            <div className="stg-sheet glass" role="dialog" aria-label={t('stage.pick')} dir={dir}>
              <header className="stg-sheet-head">
                <strong>{t('stage.pick')}</strong>
                <button type="button" className="stg-done" onClick={() => setPicking(false)}>
                  {t('stage.done')}
                </button>
              </header>
              {notIn.length === 0 ? (
                <p className="stg-empty-text">{(sheets ?? []).length ? t('stage.allPicked') : t('stage.emptyText')}</p>
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
            </div>
          </div>
        )}

        {perform && <Performer songs={perform.songs} startAt={perform.at} onClose={() => setPerform(null)} />}
      </div>
    );
  }

  // ---- home ----
  const all = sheets ?? [];
  return (
    <div className="stg" dir={dir}>
      <header className="stg-head">
        <div className="stg-head-title">
          <h1>{t('stage.title')}</h1>
          <p className="subtitle">{t('stage.subtitle')}</p>
        </div>
        <div className="stg-head-actions">{addCapsule}</div>
      </header>

      {sheets && all.length === 0 && (
        <div className="stg-empty">
          <strong>{t('stage.emptyTitle')}</strong>
          <p className="stg-empty-text">{t('stage.emptyText')}</p>
        </div>
      )}

      {all.length > 0 && (
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

      {all.length > 0 && (
        <section className="ph-section">
          <h2 className="ph-section-title">{t('stage.charts')}</h2>
          <div className="ph-group stg-group">
            {all.map((s, i) => (
              <div key={s.id} className="stg-row">
                {renaming === s.id ? (
                  <span className="ph-row stg-row-main">
                    <NameEdit
                      value={s.name}
                      onSave={async (v) => {
                        await renameSheet(s.id, v);
                        setRenaming(null);
                        reload();
                      }}
                      onCancel={() => setRenaming(null)}
                    />
                  </span>
                ) : (
                  <button type="button" className="ph-row stg-row-main" onClick={() => setPerform({ songs: all.map((x) => ({ id: x.id, name: x.name })), at: i })}>
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
                      {durOf(s.id) && <span className="ph-desc">{durOf(s.id)}</span>}
                    </span>
                  </button>
                )}
                <MoreMenu label={t('stage.more')}>
                  <button type="button" className="more-menu-item" onClick={() => setRenaming(s.id)}>
                    {t('stage.rename')}
                  </button>
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

      {perform && <Performer songs={perform.songs} startAt={perform.at} onClose={() => setPerform(null)} />}
    </div>
  );
}
