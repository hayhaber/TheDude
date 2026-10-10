import { useEffect, useMemo, useRef, useState } from 'react';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { useLanguage } from '../../i18n/LanguageContext';
import { ChordShapeDiagram } from './ChordShapeDiagram';
import { chordShape, chordAt, nextChordAfter } from '../../music/chordChart';
import { playPosition } from '../../audio/chordPlayer';

const BARS_PER_LINE = 4;

function strum(name) {
  const shape = chordShape(name);
  if (shape) playPosition(shape.map((fret) => ({ fret })));
}

// The song's sections (a marker starts a new one), each a grid of bars.
function sectionsOf(chart) {
  const out = [];
  let cur = null;
  for (const bar of chart.bars) {
    if (!cur || bar.section) {
      cur = { title: bar.section, bars: [] };
      out.push(cur);
    }
    cur.bars.push(bar);
  }
  return out;
}

function ShapeCard({ label, name, t, onHear }) {
  const shape = name ? chordShape(name) : null;
  return (
    // The whole card plays the chord too (phones show no Hear button).
    <div className="gpc-shape" onClick={() => name && onHear?.(name)}>
      <span className="gpc-shape-text">
        <span className="gpc-shape-label">{label}</span>
        <b className="gpc-shape-name" dir="ltr">
          {name ?? '—'}
        </b>
      </span>
      {shape ? <ChordShapeDiagram shape={shape} /> : <span className="gpc-shape-none">{name ? t('gpx.shapeNone') : ''}</span>}
      {name && onHear && (
        <button
          type="button"
          className="gpc-hear"
          onClick={(e) => {
            e.stopPropagation();
            onHear(name);
          }}
        >
          {t('gpx.hear')}
        </button>
      )}
    </div>
  );
}

// GuitarPro -> Chords: the song as a chord sheet (Rocksmith's chords
// arrangement): bars in lines of 4, the chord at its beat, section markers
// as headings; the bar being played lights up and stays in view.
export function ChordChartView({ chart, pos, playing, simple, onSimple, onSeek, playAlong, t }) {
  const { lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const boxRef = useRef(null);
  const [picked, setPicked] = useState(null);
  const sections = useMemo(() => sectionsOf(chart), [chart]);
  const cur = pos ? chordAt(chart, pos.bar, pos.inBar) : null;
  const next = pos ? nextChordAfter(chart, pos.bar, pos.inBar) : null;
  const activeBar = pos?.bar ?? null;

  // Playing again: the shapes follow the song, not the last tapped chord.
  useEffect(() => {
    if (playing) setPicked(null);
  }, [playing]);

  // The bar being played stays in view: when it leaves the visible part of
  // the chart, its line moves to the top third.
  useEffect(() => {
    const box = boxRef.current;
    if (!box || activeBar == null || !playing) return;
    const el = box.querySelector(`[data-bar="${activeBar}"]`);
    if (!el) return;
    const top = el.offsetTop - box.offsetTop;
    const head = box.querySelector('.gpc-sticky')?.offsetHeight ?? 0;
    const visibleTop = box.scrollTop + head;
    const visibleBottom = box.scrollTop + box.clientHeight;
    if (top < visibleTop || top + el.offsetHeight > visibleBottom - 8) {
      box.scrollTo({ top: Math.max(0, top - head - box.clientHeight * 0.2), behavior: 'smooth' });
    }
  }, [activeBar, playing]);

  const nowName = picked ?? cur?.name ?? null;
  const pa = playAlong;
  const sourceKey = chart.source === 'file' ? 'gpx.sourceFile' : chart.source === 'mixed' ? 'gpx.sourceMixed' : 'gpx.sourceDerived';

  if (!chart.bars.some((b) => b.chords.length)) {
    return (
      <div className="gpc-chart" ref={boxRef} dir={dir}>
        <p className="lt-muted">{t('gpx.noChords')}</p>
      </div>
    );
  }

  return (
    <div className="gpc-chart" ref={boxRef} dir={dir}>
      <div className="gpc-sticky">
        <div className="gpc-tools">
          <button type="button" className={'gpc-pill' + (simple ? ' active' : '')} aria-pressed={simple} onClick={() => onSimple(!simple)}>
            {t('gpx.simple')}
          </button>
          <button
            type="button"
            className={'gpc-pill' + (pa.on ? ' active' : '')}
            aria-pressed={pa.on}
            onClick={() => (pa.on ? pa.stop() : pa.start())}
          >
            <MicIcon />
            {t('gpx.mic')}
          </button>
          <InfoTooltip text={t('gpx.tip.mic')} />
          <span className="gpc-source lt-muted lt-small">
            {t(sourceKey)}
            <InfoTooltip text={t('gpx.tip.source')} />
          </span>
        </div>
        <div className="gpc-shapes">
          <ShapeCard label={picked ? t('gpx.picked') : t('gpx.now')} name={nowName} t={t} onHear={strum} />
          {!picked && next && <ShapeCard label={t('gpx.next')} name={next.name} t={t} onHear={strum} />}
          {pa.on && (
            <div className={'gpc-judge' + (pa.live.match === true ? ' ok' : pa.live.match === false ? ' off' : '')} role="status">
              <span className="gpc-judge-row">
                <span className="gpc-shape-label">{t('gpx.heard')}</span>
                <b dir="ltr">
                  {pa.live.heard ?? (playing ? '…' : '—')}
                  {pa.live.match === true ? ' ✓' : ''}
                </b>
              </span>
              <span className="gpc-judge-score" dir="ltr">
                {pa.tally.judged > 0 ? `${pa.tally.hits}/${pa.tally.judged} · ${Math.round((pa.tally.hits / pa.tally.judged) * 100)}%` : ''}
              </span>
              {!playing && <span className="lt-muted lt-small">{t('gpx.micReady')}</span>}
            </div>
          )}
        </div>
        {pa.error && <p className="lt-warning lt-small">{t('gpx.micError', { message: pa.error })}</p>}
        {pa.on && !playing && <p className="lt-muted lt-small gpc-hint">{t('gpx.micHint')}</p>}
        {pa.summary && (
          <div className="gpc-summary" role="status">
            <b>{t('gpx.summary', { pct: pa.summary.pct, hits: pa.summary.hits, judged: pa.summary.judged })}</b>
            {pa.summary.meanLatencyMs != null && <span>{t('gpx.latency', { ms: pa.summary.meanLatencyMs })}</span>}
            {pa.summary.hardest && (
              <span>
                {t('gpx.hardest')} <b dir="ltr">{pa.summary.hardest.pair}</b>
              </span>
            )}
            <button type="button" className="gpc-close" onClick={pa.clearSummary} aria-label={t('gpx.close')}>
              ×
            </button>
          </div>
        )}
      </div>

      {sections.map((sec, si) => (
        <section key={si} className="gpc-section">
          {sec.title && (
            <h3 className="gpc-section-title" dir="auto">
              {sec.title}
            </h3>
          )}
          <div className="gpc-grid" dir="ltr" style={{ '--gpc-cols': BARS_PER_LINE }}>
            {sec.bars.map((bar) => {
              const active = bar.index === activeBar;
              return (
                <div
                  key={bar.index}
                  data-bar={bar.index}
                  className={'gpc-bar' + (active ? ' is-active' : '') + (bar.repeatStart ? ' rep-start' : '') + (bar.repeatCount ? ' rep-end' : '')}
                  onClick={() => onSeek(bar.index)}
                  role="button"
                  tabIndex={-1}
                  aria-label={t('gpx.bar', { n: bar.index + 1 })}
                >
                  <span className="gpc-bar-no">{bar.index + 1}</span>
                  {bar.repeatCount > 1 && <span className="gpc-rep">×{bar.repeatCount}</span>}
                  <span className="gpc-bar-chords">
                  {bar.chords[0]?.at > 0 && <span className="gpc-gap" style={{ flexGrow: bar.chords[0].at }} />}
                  {bar.chords.map((c, ci) => {
                    const isCur = active && cur && ((cur.bar === bar.index && cur.idx === ci) || (c.held && ci === 0 && cur.bar !== bar.index));
                    // Each name takes the share of the bar its chord lasts.
                    const until = bar.chords[ci + 1]?.at ?? bar.ticks;
                    return (
                      <button
                        key={ci}
                        type="button"
                        className={'gpc-chord' + (c.held ? ' held' : '') + (isCur ? ' is-current' : '') + (picked === c.name ? ' is-picked' : '')}
                        style={{ flexGrow: Math.max(1, until - c.at) }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPicked(c.name);
                          strum(c.name);
                        }}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <p className="lt-muted lt-small gpc-hint">{t('gpx.tapHint')}</p>
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="5.5" y="1.5" width="5" height="8.5" rx="2.5" />
      <path d="M3 7.5a5 5 0 0 0 10 0M8 12.5v2.2" />
    </svg>
  );
}
