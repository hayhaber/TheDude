import { useState } from 'react';
import { MoreMenu } from '../MoreMenu/MoreMenu';
import { cleanLink } from '../../music/sheets/songLink';
import { SongSearchField } from './SongSearchField';
import { linkFor } from '../../music/sheets/songSearch';
import { setSheetPrefs, sheetPrefs } from '../../music/sheets/sheetStore';
import { addSuggestion, addTextSong, removeSuggestion, updateSuggestion, voteSuggestion } from '../../music/sheets/chartCloud';

// A band's song suggestions (v1.0.212; user: "building a cover band's
// repertoire — every member suggests a few songs, one shared list everyone
// sees, and from it we choose the songs to rehearse"). The way bands do it:
// suggest -> everyone votes (one each) -> pick for rehearsal. A pick becomes
// a band song (words-only until someone adds words or a chart), so it can go
// into a setlist; "Rehearsal setlist" makes one from all the picks.
//   For rehearsal  — the picks (+ Rehearsal setlist)
//   Suggestions    — the open ones, most votes first
//   N not chosen   — folded
// Data: band_suggestions (supabase/migrations/005_band_suggestions.sql).

const songName = (s) => (s.artist ? `${s.title} – ${s.artist}` : s.title);
const safeLink = (l) => (/^https?:\/\//i.test(l || '') ? l : null);

function ThumbGlyph({ on }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M7 10.5v9H4.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zM7 10.5l3.6-6.3a1.7 1.7 0 0 1 3.1 1.2L13 9.5h5.3a2 2 0 0 1 2 2.3l-1.1 6.4a2 2 0 0 1-2 1.8H7"
        fill={on ? 'currentColor' : 'none'}
        fillOpacity={on ? 0.18 : 0}
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The suggest / edit sheet. `item` null = a new suggestion. */
function SuggestSheet({ item, voters, onSave, onClose, Sheet, dir, t }) {
  const [v, setV] = useState({ title: item?.title ?? '', artist: item?.artist ?? '', link: item?.link ?? '', note: item?.note ?? '' });
  const [busy, setBusy] = useState(false);
  const [finding, setFinding] = useState(false);
  const [err, setErr] = useState(null);
  const ch = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const linkBad = v.link.trim() && !safeLink(v.link.trim());
  const go = async () => {
    if (!v.title.trim() || busy || linkBad) return;
    setBusy(true);
    setErr(null);
    try {
      await onSave(v);
      onClose();
    } catch {
      setErr(navigator.onLine === false ? t('stage.cloud.offline') : t('stage.cloud.failed'));
      setBusy(false);
    }
  };
  return (
    <Sheet
      title={item ? t('stage.sg.editTitle') : t('stage.sg.newTitle')}
      onClose={onClose}
      dir={dir}
      t={t}
      action={{ label: item ? t('stage.sg.save') : t('stage.sg.addBtn'), onClick: go, disabled: !v.title.trim() || linkBad, busy }}
    >
      <SongSearchField
        label={t('stage.sg.song')}
        value={v.title}
        placeholder={t('stage.sg.songPh')}
        autoFocus={!item}
        onChange={(title) => setV((o) => ({ ...o, title: title.slice(0, 120) }))}
        onPick={async (song) => {
          setV((o) => ({ ...o, title: song.title, artist: song.artist, link: song.apple || o.link }));
          setFinding(true);
          const l = await linkFor(song);
          if (l) setV((o) => ({ ...o, link: l }));
          setFinding(false);
        }}
      />
      <label className="stg-field">
        <span>{t('stage.sg.artist')}</span>
        <input dir="auto" value={v.artist} maxLength={120} placeholder={t('stage.sg.artistPh')} onChange={ch('artist')} onKeyDown={(e) => e.key === 'Enter' && go()} />
      </label>
      <label className="stg-field">
        <span>{t('stage.sg.link')}</span>
        <input dir="ltr" type="url" inputMode="url" autoCapitalize="off" autoCorrect="off" value={v.link} maxLength={500} placeholder="https://" onChange={ch('link')} />
      </label>
      {finding && <p className="stg-ss-note">{t('stage.ss.finding')}</p>}
      {linkBad && <p className="stg-err">{t('stage.sg.linkBad')}</p>}
      <label className="stg-field">
        <span>{t('stage.sg.note')}</span>
        <textarea dir="auto" rows={2} value={v.note} maxLength={500} placeholder={t('stage.sg.notePh')} onChange={ch('note')} />
      </label>
      {item && <p className="stg-fine stg-sg-by">{[t('stage.sg.by', { name: item.byName || '—' }), voters.length ? t('stage.sg.likedBy', { names: voters.join(', ') }) : null].filter(Boolean).join(' · ')}</p>}
      {err && <p className="stg-err">{err}</p>}
    </Sheet>
  );
}

export function SuggestionsView({ band, uid, suggestions, ready, songIds, sets, onOpenSet, say, Sheet, dir, t }) {
  const [editing, setEditing] = useState(null); // null | 'new' | suggestion
  const [sure, setSure] = useState(null);
  const [showDropped, setShowDropped] = useState(false);
  const mine = suggestions.filter((s) => s.band === band.id);
  const nameOf = new Map(band.members.map((m) => [m.id, m.name || '—']));
  const isOwner = band.owner === uid;
  const byVotes = (a, b) => b.votes.length - a.votes.length || String(a.at).localeCompare(String(b.at));
  const picked = mine.filter((s) => s.status === 'picked').sort(byVotes);
  const open = mine.filter((s) => s.status === 'open').sort(byVotes);
  const dropped = mine.filter((s) => s.status === 'dropped').sort(byVotes);
  const failed = () => say(navigator.onLine === false ? t('stage.cloud.offline') : t('stage.cloud.failed'));

  if (!ready)
    return (
      <div className="stg-empty">
        <strong>{t('stage.sg.setupTitle')}</strong>
        <p className="stg-empty-text">{t('stage.sg.setupText')}</p>
      </div>
    );

  const pick = async (s) => {
    try {
      let song = s.song && songIds.has(s.song) ? s.song : null;
      if (!song) song = await addTextSong({ name: songName(s), lyrics: '', band: band.id, link: cleanLink(s.link) });
      else if (cleanLink(s.link) && !sheetPrefs(song).link) setSheetPrefs(song, { link: cleanLink(s.link) });
      await updateSuggestion(s.id, { status: 'picked', song });
      say(t('stage.sg.pickedToast', { name: s.title }));
    } catch {
      failed();
    }
  };
  const setStatus = (s, status) => updateSuggestion(s.id, { status }).catch(failed);
  const rehearsalSet = () => {
    const items = picked.map((s) => s.song).filter((id) => id && songIds.has(id));
    const d = new Date();
    const list = sets.create(t('stage.sg.rehearsalName', { d: `${d.getDate()}.${d.getMonth() + 1}` }));
    if (items.length) sets.setItems(list.id, items);
    onOpenSet(list.id);
  };

  const row = (s) => {
    const voted = uid && s.votes.includes(uid);
    const canDelete = s.by === uid || isOwner;
    const link = safeLink(s.link);
    return (
      <div key={s.id} className={'stg-row stg-sg-row' + (s.status === 'dropped' ? ' is-dropped' : '')}>
        <button
          type="button"
          className={'stg-sg-vote' + (voted ? ' is-on' : '')}
          aria-pressed={!!voted}
          aria-label={t(voted ? 'stage.sg.unvote' : 'stage.sg.vote') + ' · ' + s.title}
          title={t(voted ? 'stage.sg.unvote' : 'stage.sg.vote')}
          onClick={() => voteSuggestion(s.id)}
        >
          <ThumbGlyph on={voted} />
          <span>{s.votes.length}</span>
        </button>
        <button type="button" className="ph-row stg-row-main" onClick={() => setEditing(s)}>
          <span className="ph-text">
            <span className="ph-title" dir="auto">
              {s.title}
            </span>
            <span className="ph-desc" dir="auto">
              {[s.artist, t('stage.sg.byShort', { name: s.byName || '—' })].filter(Boolean).join(' · ')}
            </span>
            {s.note && (
              <span className="ph-desc stg-sg-note" dir="auto">
                {s.note}
              </span>
            )}
          </span>
        </button>
        <MoreMenu label={t('stage.more')}>
          {link && (
            <a className="more-menu-item" href={link} target="_blank" rel="noopener noreferrer">
              {t('stage.sg.listen')}
            </a>
          )}
          {s.status !== 'picked' && (
            <button type="button" className="more-menu-item" onClick={() => pick(s)}>
              {t('stage.sg.pick')}
            </button>
          )}
          {s.status !== 'open' && (
            <button type="button" className="more-menu-item" onClick={() => setStatus(s, 'open')}>
              {t('stage.sg.reopen')}
            </button>
          )}
          {s.status !== 'dropped' && (
            <button type="button" className="more-menu-item" onClick={() => setStatus(s, 'dropped')}>
              {t('stage.sg.drop')}
            </button>
          )}
          <button type="button" className="more-menu-item" onClick={() => setEditing(s)}>
            {t('stage.sg.edit')}
          </button>
          {canDelete && (
            <button
              type="button"
              className="more-menu-item is-danger"
              data-keep={sure === s.id ? undefined : ''}
              onClick={() => {
                if (sure !== s.id) return setSure(s.id);
                setSure(null);
                removeSuggestion(s.id).catch(failed);
              }}
            >
              {sure === s.id ? t('stage.deleteSure') : t('stage.delete')}
            </button>
          )}
        </MoreMenu>
      </div>
    );
  };

  const addRow = (
    <button type="button" className="ph-row stg-add-row" onClick={() => setEditing('new')}>
      <span className="stg-plus" aria-hidden="true">
        +
      </span>
      <span className="ph-title">{t('stage.sg.add')}</span>
    </button>
  );

  return (
    <div className="stg-sg">
      {mine.length === 0 ? (
        <div className="stg-empty">
          <strong>{t('stage.sg.emptyTitle')}</strong>
          <p className="stg-empty-text">{t('stage.sg.emptyText', { band: band.name })}</p>
          <button type="button" className="stg-capsule is-primary" onClick={() => setEditing('new')}>
            {t('stage.sg.suggest')}
          </button>
        </div>
      ) : (
        <p className="stg-fine stg-sg-how">{t('stage.sg.how')}</p>
      )}

      {picked.length > 0 && (
        <section className="ph-section">
          <div className="stg-sg-head">
            <h2 className="ph-section-title">{t('stage.sg.picked', { n: picked.length })}</h2>
            <button type="button" className="stg-capsule is-quiet" onClick={rehearsalSet}>
              {t('stage.sg.makeSet')}
            </button>
          </div>
          <div className="ph-group stg-group">{picked.map(row)}</div>
        </section>
      )}

      {mine.length > 0 && (
        <section className="ph-section">
          <h2 className="ph-section-title">{t('stage.sg.open', { n: open.length })}</h2>
          <div className="ph-group stg-group">
            {open.map(row)}
            {addRow}
          </div>
        </section>
      )}

      {dropped.length > 0 && (
        <section className="ph-section">
          <div className="ph-group stg-group">
            <button type="button" className="ph-row stg-sg-fold" aria-expanded={showDropped} onClick={() => setShowDropped(!showDropped)}>
              <span className="ph-title">{t('stage.sg.dropped', { n: dropped.length })}</span>
              <span className={'stg-sg-fold-chev' + (showDropped ? ' is-open' : '')} aria-hidden="true">
                ›
              </span>
            </button>
            {showDropped && dropped.map(row)}
          </div>
        </section>
      )}

      {editing && (
        <SuggestSheet
          item={editing === 'new' ? null : editing}
          voters={editing === 'new' ? [] : editing.votes.map((v) => nameOf.get(v) || '—')}
          onSave={(v) => (editing === 'new' ? addSuggestion(band.id, v) : updateSuggestion(editing.id, v))}
          onClose={() => setEditing(null)}
          Sheet={Sheet}
          dir={dir}
          t={t}
        />
      )}
    </div>
  );
}
