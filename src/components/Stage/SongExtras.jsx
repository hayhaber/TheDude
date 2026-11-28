// A song's rehearsal notes and recordings (v1.0.244) — the two sections of
// the song's page (StageView) — and the Performer's record key.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { addNote, canDelete, notesOf, notesReady, updateNote, useNotesVersion } from '../../music/sheets/songNotes';
import { deleteTake, isSending, listTakes, onRehearsal, onTakesChange, rehearsalElapsed, rehearsalState, startRehearsal, stopRehearsal, takeAudio } from '../../audio/rehearsal';
import { deleteBandTake, downloadBandTake, getChartCloud, signedIn, subscribeChartCloud, takeUrl } from '../../music/sheets/chartCloud';
import { fmtDur } from '../../music/sheets/setlists';
import { getLink } from '../../cloud/cloudState';
import { MoreMenu } from '../MoreMenu/MoreMenu';

const L = '⁦';
const P = '⁩';
const iso = (s) => L + s + P;
const mmss = (s) => {
  const n = Math.max(0, Math.round(s));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};

function dateOf(at, lang) {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  const loc = lang === 'he' ? 'he-IL' : 'en-GB';
  return same ? d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(loc, { day: 'numeric', month: 'numeric' });
}

/** "Changed the key: +2 semitones (was the original)" */
function changeText(n, t) {
  const { field, from, to } = n.data || {};
  const fmt = (v) => {
    if (field === 'tr') {
      if (!v) return t('stage.nt.trOrig');
      const s = (v > 0 ? '+' : '−') + Math.abs(v);
      return t(Math.abs(v) === 1 ? 'stage.nt.trSemi1' : 'stage.nt.trSemi', { n: iso(s) });
    }
    if (v == null) return '—';
    if (field === 'bpm') return iso(`${v} BPM`);
    if (field === 'dur') return iso(fmtDur(v));
    return String(v);
  };
  return t('stage.nt.ch.' + field, { to: fmt(to), from: fmt(from) });
}

function ChangeGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h11M4 17h7M18 4v6M15 7h6M14 14v6M11 17h6" />
    </svg>
  );
}

/** The song's rehearsal notes: open ones, a composer, the done ones folded. */
export function SongNotes({ chart, band, t, lang }) {
  useNotesVersion();
  const [text, setText] = useState('');
  const [showDone, setShowDone] = useState(false);
  const bandId = band?.id ?? null;
  const ready = notesReady(bandId);
  const all = notesOf(chart, bandId);
  const open = all.filter((n) => !n.done);
  const doneList = all.filter((n) => n.done);
  const uid = getLink()?.userId;
  const send = () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    addNote(chart, bandId, { body }).catch(() => {});
  };
  const row = (n) => {
    const who = n.band ? (n.by && n.by === uid ? t('stage.nt.you') : n.byName || t('stage.band.someone')) : '';
    return (
      <div key={n.id} className={'stg-row stg-note' + (n.done ? ' is-done' : '')}>
        <span className="ph-row stg-row-main stg-note-main">
          {n.kind === 'change' && (
            <span className="stg-note-icon" aria-hidden="true">
              <ChangeGlyph />
            </span>
          )}
          <span className="ph-text">
            <span className={'stg-note-body' + (n.kind === 'change' ? ' is-change' : '')} dir="auto">
              {n.kind === 'change' ? changeText(n, t) : n.body}
            </span>
            <span className="ph-desc">{[who, dateOf(n.at, lang)].filter(Boolean).join(' · ')}</span>
          </span>
        </span>
        <MoreMenu label={t('stage.more')}>
          <button type="button" className="more-menu-item" onClick={() => updateNote(n, { done: !n.done }).catch(() => {})}>
            {n.done ? t('stage.nt.reopen') : t('stage.nt.markDone')}
          </button>
          {canDelete(n, band) && (
            <button type="button" className="more-menu-item is-danger" onClick={() => updateNote(n, { deleted: true }).catch(() => {})}>
              {t('stage.nt.delete')}
            </button>
          )}
        </MoreMenu>
      </div>
    );
  };
  if (!ready) return <p className="stg-fine is-under">{t('stage.nt.setup')}</p>;
  return (
    <>
      <div className="ph-group stg-group stg-notes">
        {open.map(row)}
        <form
          className="ph-row stg-note-new"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            className="stg-note-input"
            dir="auto"
            rows={1}
            maxLength={1000}
            value={text}
            placeholder={t('stage.nt.add')}
            aria-label={t('stage.nt.add')}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
          />
          {text.trim() && (
            <button type="submit" className="stg-note-send">
              {t('stage.nt.send')}
            </button>
          )}
        </form>
      </div>
      <p className="stg-fine is-under">{open.length || doneList.length ? t('stage.nt.auto') : t('stage.nt.empty') + ' ' + t('stage.nt.auto')}</p>
      {doneList.length > 0 && (
        <div className="ph-group stg-group">
          <button type="button" className="ph-row stg-action stg-fold" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
            <span className="ph-title">{t('stage.nt.doneHead', { n: doneList.length })}</span>
            <span className={'stg-fold-chev' + (showDone ? ' is-open' : '')} aria-hidden="true">
              ›
            </span>
          </button>
          {showDone && doneList.map(row)}
        </div>
      )}
    </>
  );
}

// ---- recordings ---------------------------------------------------------------------

export function useRehearsal() {
  return useSyncExternalStore(onRehearsal, rehearsalState, rehearsalState);
}

/** A ticking "m:ss" while recording. */
function useElapsed(on) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    const id = setInterval(() => tick((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [on]);
  return mmss(rehearsalElapsed());
}

let player = null; // one take plays at a time
let playerUrl = null;

function RecDot() {
  return <span className="stg-rec-dot" aria-hidden="true" />;
}

/**
 * A song's takes, newest first. A band song's takes are the band's (every
 * member's, from the cloud — migration 009) plus mine still going up; my own
 * song's takes stay on this device. Takes of one day are numbered in the
 * order they were played ("Take 2 · 21.11").
 */
export function SongTakes({ song, band, t, lang }) {
  const rh = useRehearsal();
  const cloud = useSyncExternalStore(subscribeChartCloud, getChartCloud, getChartCloud);
  const [local, setLocal] = useState(null);
  const [playing, setPlaying] = useState(null); // take id
  const [loading, setLoading] = useState(null);
  const [pos, setPos] = useState(0);
  const [sure, setSure] = useState(null);
  const elapsed = useElapsed(rh.on);
  const uid = getLink()?.userId;
  const bandId = band?.id ?? null;
  useEffect(() => {
    let alive = true;
    const load = () => listTakes(song.id).then((x) => alive && setLocal(x));
    load();
    const off = onTakesChange(load);
    return () => {
      alive = false;
      off();
    };
  }, [song.id]);
  useEffect(
    () => () => {
      player?.pause();
    },
    []
  );
  // every take lives in the cloud (v1.0.291): a band song's for the band, my
  // own song's for my account (018); this device only holds takes not up yet
  const inCloud = signedIn() && cloud.takesOk && (bandId ? true : cloud.myTakesOk !== false);
  const rows = signedIn() && cloud.takesOk ? cloud.takes.filter((x) => x.chart === song.id && (bandId ? x.band === bandId : !x.band)) : [];
  const rowIds = new Set(rows.map((r) => r.id));
  const localById = new Map((local ?? []).map((x) => [x.id, x]));
  // a copy here of a take that is up (older versions kept one) isn't listed twice
  const pending = (local ?? []).filter((x) => !rowIds.has(x.id) && !x.cloud);
  const items = [
    ...rows.map((r) => ({ ...r, shared: true, here: localById.has(r.id) })),
    ...pending.map((x) => ({ ...x, chart: x.song, shared: false, here: true, waiting: true })),
  ].sort((x, y) => y.at - x.at);
  // number per day, oldest first
  const num = new Map();
  const perDay = new Map();
  for (const it of [...items].sort((x, y) => x.at - y.at)) {
    const day = new Date(it.at).toDateString();
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
    num.set(it.id, perDay.get(day));
  }
  const stopPlay = () => {
    player?.pause();
    setPlaying(null);
  };
  // the audio for sharing (in memory only)
  const blobOf = async (it) => {
    let blob = it.here ? await takeAudio(it.id) : null;
    if (!blob && it.shared) {
      setLoading(it.id);
      try {
        blob = await downloadBandTake(it.path);
      } catch {
        blob = null;
      } finally {
        setLoading(null);
      }
    }
    return blob;
  };
  // a take that is up plays straight from the cloud — nothing is kept here
  const play = async (it) => {
    if (playing === it.id) return stopPlay();
    player?.pause();
    let src = null;
    if (it.here) {
      const blob = await takeAudio(it.id);
      if (blob) {
        if (playerUrl) URL.revokeObjectURL(playerUrl);
        playerUrl = URL.createObjectURL(blob);
        src = playerUrl;
      }
    }
    if (!src && it.shared) {
      setLoading(it.id);
      try {
        src = await takeUrl(it.path);
      } catch {
        src = null;
      } finally {
        setLoading(null);
      }
    }
    if (!src) return;
    player = new Audio(src);
    player.preload = 'auto';
    player.ontimeupdate = () => setPos(player.duration ? player.currentTime / player.duration : 0);
    player.onended = () => setPlaying(null);
    setPos(0);
    setPlaying(it.id);
    player.play().catch(() => setPlaying(null));
  };
  const share = async (it) => {
    const blob = await blobOf(it);
    if (!blob) return;
    const ext = blob.type === 'audio/mpeg' ? 'mp3' : 'wav';
    const file = new File([blob], `${song.name} – ${t('stage.rh.takeN', { n: num.get(it.id), d: dateOf(it.at, 'en') }).replace(/[\u2066\u2069]/g, '').replace(/[/:]/g, '.')}.${ext}`, { type: blob.type });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: song.name });
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    } catch {
      /* cancelled */
    }
  };
  const remove = (it) => {
    if (playing === it.id) stopPlay();
    setSure(null);
    if (it.shared) deleteBandTake(it).catch(() => {});
    if (it.here) deleteTake(it.id);
  };
  const mayDelete = (it) => !it.shared || !it.band || it.by === uid || (band && band.owner === uid);
  const here = rh.on && rh.song === song.id;
  const elsewhere = rh.on && !here;
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  return (
    <>
      <div className="ph-group stg-group stg-takes">
        {here ? (
          <div className="ph-row stg-rec-row is-on" role="status">
            <RecDot />
            <span className="ph-title stg-rec-time">{t('stage.rh.recording', { t: iso(elapsed) })}</span>
            <button type="button" className="stg-rec-stop" onClick={() => stopRehearsal()}>
              {t('stage.rh.stop')}
            </button>
          </div>
        ) : (
          <button type="button" className="ph-row stg-action stg-rec-row" disabled={elsewhere} onClick={() => startRehearsal({ id: song.id, name: song.name })}>
            <RecDot />
            <span className="ph-title">{elsewhere ? t('stage.rh.elsewhere', { name: rh.name }) : t('stage.rh.record')}</span>
          </button>
        )}
        {items.map((it) => {
          const who = it.shared && it.band ? (it.by && it.by === uid ? t('stage.nt.you') : it.byName || t('stage.band.someone')) : '';
          const state = !it.waiting
            ? ''
            : !signedIn()
              ? t('stage.rh.signIn')
              : !inCloud
                ? t('stage.rh.onDevice')
                : isSending(it.id) || !offline
                  ? t(bandId ? 'stage.rh.uploading' : 'stage.rh.uploadingMine')
                  : t(bandId ? 'stage.rh.later' : 'stage.rh.laterMine');
          return (
            <div key={it.id} className={'stg-row stg-take' + (playing === it.id ? ' is-playing' : '')}>
              <span className="ph-row stg-row-main">
                <button
                  type="button"
                  className={'stg-take-play' + (loading === it.id ? ' is-loading' : '')}
                  onClick={() => play(it)}
                  aria-label={playing === it.id ? t('stage.rh.pause') : t('stage.rh.play')}
                  title={playing === it.id ? t('stage.rh.pause') : t('stage.rh.play')}
                >
                  {playing === it.id ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                      <path d="M8 5v14l11-7z" fill="currentColor" />
                    </svg>
                  )}
                </button>
                <span className="ph-text">
                  <span className="ph-title">{t('stage.rh.takeN', { n: iso(String(num.get(it.id))), d: dateOf(it.at, lang) })}</span>
                  {(who || state) && <span className="ph-desc">{[who, state].filter(Boolean).join(' · ')}</span>}
                  {it.peaks && (
                    <span className="stg-take-wave" aria-hidden="true">
                      {it.peaks.map((p, i) => (
                        <i key={i} style={{ height: `${Math.max(8, p * 100)}%` }} className={playing === it.id && i / it.peaks.length < pos ? 'is-past' : ''} />
                      ))}
                    </span>
                  )}
                </span>
                <span className="stg-detail">{mmss(it.duration)}</span>
              </span>
              <MoreMenu label={t('stage.more')}>
                {canShare && (
                  <button type="button" className="more-menu-item" onClick={() => share(it)}>
                    {t('stage.rh.share')}
                  </button>
                )}
                {mayDelete(it) &&
                  (it.shared && it.band && sure !== it.id ? (
                    <button type="button" className="more-menu-item is-danger" data-keep="1" onClick={() => setSure(it.id)}>
                      {t('stage.rh.deleteAll')}
                    </button>
                  ) : (
                    <button type="button" className="more-menu-item is-danger" onClick={() => remove(it)}>
                      {it.shared && it.band ? t('stage.deleteSure') : t('stage.rh.delete')}
                    </button>
                  ))}
              </MoreMenu>
            </div>
          );
        })}
        {rh.saving > 0 && (
          <div className="ph-row stg-take-saving" role="status">
            <span className="ph-desc">{t('stage.rh.saving')}</span>
          </div>
        )}
      </div>
      <p className="stg-fine is-under">
        {rh.error === 'denied'
          ? t('stage.rh.denied')
          : rh.error === 'failed'
            ? t('stage.rh.failed')
            : (items.length ? '' : t('stage.rh.empty') + ' ') +
              (!signedIn() ? t('stage.rh.local') : !inCloud ? t(bandId ? 'stage.rh.setup' : 'stage.rh.setupMine') : t(bandId ? 'stage.rh.band' : 'stage.rh.mine'))}
      </p>
    </>
  );
}

/** The Performer's record key: records the rehearsal, a take per song. */
export function PerformerRecKey({ song, t }) {
  const rh = useRehearsal();
  const elapsed = useElapsed(rh.on);
  const ref = useRef(song);
  ref.current = song;
  if (rh.on) {
    return (
      <button type="button" className="stage-key stage-rec-key is-on" onClick={() => stopRehearsal()} aria-label={t('stage.rh.perfStop')} title={t('stage.rh.perfStop')}>
        <span className="stg-rec-dot" aria-hidden="true" />
        <span dir="ltr">{elapsed}</span>
      </button>
    );
  }
  return (
    <button type="button" className="stage-key is-round stage-rec-key" onClick={() => startRehearsal({ id: ref.current.id, name: ref.current.name })} aria-label={t('stage.rh.perf')} title={t('stage.rh.perf')}>
      <span className="stg-rec-dot" aria-hidden="true" />
    </button>
  );
}
