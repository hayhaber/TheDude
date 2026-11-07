import { useLanguage } from '../../i18n/LanguageContext';
import './PlayAlong.css';

const MIC = (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
    <path d="M6 11a6 6 0 0 0 12 0M12 17v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const bare = (name) => String(name ?? '').replace(/-?\d+$/, '').replace('#', '♯');

/**
 * The free-play strip (Practice -> Scales "Free", Bass Practice "Free"): no
 * click, no order — the player plays any notes, the mic checks each one is
 * in the scale. Status (what to do / listening + the last note heard, green
 * or red with the nearest scale notes), ONE Start / Stop key, live counts,
 * and after Stop the result: in the scale %, how much of the box was used,
 * the degrees never played, the wrong notes. Logic: hooks/useFreePlay.js.
 */
export function FreePlay({ free, onStart, total, idleText = null }) {
  const { t, lang } = useLanguage();
  const { phase, live, result } = free;
  const running = phase === 'run';
  const last = live?.last;

  let status;
  if (running && last) status = { kind: last.ok ? 'ok' : 'bad', text: last.ok ? t(last.inShape ? 'fp.ok' : 'fp.okOutside', { note: bare(last.name) }) : wrongText(t, bare(last.name), last.near) };
  else if (running) status = { kind: 'run', text: t('fp.run') };
  else if (phase === 'done') status = { kind: 'done', text: t('fp.done') };
  else status = { kind: 'idle', text: idleText ?? t('fp.idle') };

  return (
    <div className="pa fp" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <div className={'pa-status is-' + status.kind} aria-live="polite">
        {running && <span className="pa-ico is-mic">{MIC}</span>}
        <span className="pa-status-text">{status.text}</span>
        {running && live && (
          <span className="pa-live">
            {t('fp.live', { n: live.notes, cover: live.cover, total })}
          </span>
        )}
      </div>
      <div className="pa-transport">
        <button type="button" className={'pa-go' + (running ? ' is-on' : '')} onClick={running ? free.stop : onStart}>
          <span className="pa-go-glyph" aria-hidden="true" />
          <span>{running ? t('vocal.stop') : phase === 'done' ? t('pa.again') : t('vocal.start')}</span>
        </button>
        {running && live && (
          <div className="fp-counts">
            <span className="fp-count is-ok">
              <b>{live.inScale}</b> {t('fp.inScale')}
            </span>
            <span className="fp-count is-bad">
              <b>{live.wrong}</b> {t('fp.outside')}
            </span>
          </div>
        )}
      </div>
      {phase === 'idle' && <p className="pa-note">{t('fp.placeNote')}</p>}
      {result && phase === 'done' && <FreeResult r={result} t={t} />}
      {running && free.pitch?.error && <p className="pa-warn">{t('trainer.micError', { message: free.pitch.error })}</p>}
    </div>
  );
}

function wrongText(t, note, near) {
  if (!near?.length) return t('fp.bad', { note });
  const parts = near.map((n) => t(n.dir === 'up' ? 'fp.nearUp' : 'fp.nearDown', { note: NAMES[n.pc], d: t(n.semis === 1 ? 'fp.half' : 'fp.whole') }));
  return t('fp.badNear', { note, near: parts.join(t('fp.or')) });
}

function FreeResult({ r, t }) {
  if (!r.notes) return <div className="pa-result"><p className="pa-verdict">{t('fp.none')}</p></div>;
  const pass = r.inScalePct >= 90;
  return (
    <div className={'pa-result' + (pass ? ' is-pass' : '')}>
      <div className="pa-tiles">
        <div className="pa-tile">
          <span className="pa-tile-v">{r.inScalePct}%</span>
          <span className="pa-tile-l">{t('fp.tile.in', { n: r.notes })}</span>
        </div>
        <div className="pa-tile">
          <span className="pa-tile-v">{r.coverPct}%</span>
          <span className="pa-tile-l">{t('fp.tile.cover', { n: r.cover, total: r.shapeCells })}</span>
        </div>
        <div className="pa-tile">
          <span className="pa-tile-v">{r.roots}</span>
          <span className="pa-tile-l">{t('fp.tile.roots')}</span>
        </div>
      </div>
      <p className="pa-verdict">{pass ? (r.coverPct >= 80 ? t('fp.pass') : t('fp.passNarrow')) : t('fp.fail')}</p>
      {r.missing.length > 0 && (
        <p className="pa-line">
          {t('fp.missing')}{' '}
          <bdi dir="ltr">{r.missing.map((d) => `${bare(d.name)} (${d.label})`).join(' · ')}</bdi>
        </p>
      )}
      {r.wrongList.length > 0 && (
        <p className="pa-line">
          {t('fp.wrongList')}{' '}
          <bdi dir="ltr">{r.wrongList.map((w) => `${w.name.replace('#', '♯')} ×${w.count}`).join(' · ')}</bdi>
        </p>
      )}
      {r.outside > 0 && <p className="pa-line">{t('fp.outsideBox', { n: r.outside })}</p>}
    </div>
  );
}
