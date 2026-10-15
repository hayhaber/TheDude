import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as P from '../../audio/studio/project';
import { PEAKS_PER_SEC, usePlayhead } from './useStudio';

// The multitrack timeline. Time runs left to right in both languages. One
// horizontal scroller; each row has a sticky header on the left. Regions
// are dragged to move (also to another track), their edges to trim; a tap
// selects a region and puts the playhead there (where Split cuts). The
// ruler: tap = playhead, drag = the loop / punch range. Take lanes (every
// recording pass) open under a track: drag across a lane = use it there,
// tap = use the whole pass.

export const TRACK_COLORS = ['#0a84ff', '#ff9f0a', '#30d158', '#bf5af2'];
const ROW_H = 64;
const LANE_H = 40;

function useWidth(ref) {
  const [w, setW] = useState(800);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/** SVG path of a mirrored envelope for [offset, offset+length) of a take. */
function wavePath(env, offset, length, points) {
  if (!env || !env.length || points < 2) return '';
  const top = [];
  const bot = [];
  for (let i = 0; i < points; i++) {
    const a = Math.floor((offset + (length * i) / points) * PEAKS_PER_SEC);
    const b = Math.max(a + 1, Math.floor((offset + (length * (i + 1)) / points) * PEAKS_PER_SEC));
    let m = 0;
    for (let k = Math.max(0, a); k < Math.min(env.length, b); k++) if (env[k] > m) m = env[k];
    const v = Math.min(1, m * 1.15) * 46;
    top.push(`${i},${(50 - v).toFixed(1)}`);
    bot.push(`${i},${(50 + v).toFixed(1)}`);
  }
  return `M${top.join('L')}L${bot.reverse().join('L')}Z`;
}

const Region = memo(function Region({ region, scale, color, selected, env, name, laneLabel, onDown, tSplit }) {
  const w = Math.max(2, region.length * scale);
  const points = Math.min(1500, Math.max(2, Math.round(w / 2)));
  const d = useMemo(() => wavePath(env, region.offset, region.length, points), [env, region.offset, region.length, points]);
  const fi = (region.fadeIn || 0) * scale;
  const fo = (region.fadeOut || 0) * scale;
  return (
    <div
      className={'tl-region' + (selected ? ' is-selected' : '')}
      style={{ left: region.start * scale, width: w, '--trk': color }}
      onPointerDown={(e) => onDown(e, region, 'move')}
      role="button"
      aria-label={name}
      aria-pressed={selected}
      data-start={region.start.toFixed(4)}
      data-length={region.length.toFixed(4)}
      data-offset={region.offset.toFixed(4)}
      data-lane={region.laneId || ''}
    >
      <svg className="tl-wave" viewBox={`0 0 ${points} 100`} preserveAspectRatio="none" aria-hidden="true">
        {d && <path d={d} />}
        {fi > 4 && <path className="tl-fade" d={`M0,100 L${(fi / w) * points},0 L0,0 Z`} />}
        {fo > 4 && <path className="tl-fade" d={`M${points},100 L${points - (fo / w) * points},0 L${points},0 Z`} />}
      </svg>
      {w > 46 && (
        <span className="tl-region-name" dir="auto">
          {name}
          {laneLabel && region.laneId ? ` · ${laneLabel}` : ''}
          {region.gain && Math.abs(region.gain - 1) > 0.01 ? ` · ${region.gain > 1 ? '+' : ''}${(20 * Math.log10(region.gain)).toFixed(1)} dB` : ''}
        </span>
      )}
      {selected && (
        <>
          <span className="tl-handle is-start" onPointerDown={(e) => onDown(e, region, 'start')} aria-hidden="true" />
          <span className="tl-handle is-end" onPointerDown={(e) => onDown(e, region, 'end')} aria-hidden="true" />
        </>
      )}
      {tSplit != null && <span className="tl-split-mark" style={{ left: (tSplit - region.start) * scale }} aria-hidden="true" />}
    </div>
  );
});

function Playhead({ store, scale, header, scroller, follow }) {
  const { position } = usePlayhead(store);
  const x = header + position * scale;
  useEffect(() => {
    const el = scroller.current;
    if (!el || !follow) return;
    const vis = el.clientWidth - header;
    const rel = x - header - el.scrollLeft;
    if (rel > vis * 0.85 || rel < 0) el.scrollLeft = Math.max(0, x - header - vis * 0.25);
  }, [x, follow, header, scroller]);
  return <div className="tl-playhead" style={{ transform: `translateX(${x}px)` }} aria-hidden="true" />;
}

function RecordingBar({ store, scale, rec, rowTop }) {
  const { position, counting } = usePlayhead(store);
  if (!rec || counting) return null;
  const a = Math.max(rec.keep.from, 0);
  const b = Math.min(position, rec.keep.to);
  if (b <= a) return null;
  return <div className="tl-recbar" style={{ left: a * scale, width: (b - a) * scale, top: rowTop }} aria-hidden="true" />;
}

export function Timeline({ t, studio }) {
  const { project, selection, setSelection, prefs, peaks, takes, positionStore, phase } = studio;
  const wrapRef = useRef(null);
  const scroller = useRef(null);
  const width = useWidth(wrapRef);
  const header = width < 560 ? 112 : 136;
  const [zoom, setZoom] = useState(null); // px per second; null = fit
  const [drag, setDrag] = useState(null);
  const [rangeDrag, setRangeDrag] = useState(null);
  const [laneDrag, setLaneDrag] = useState(null);
  const [openLanes, setOpenLanes] = useState(() => new Set());
  const [renaming, setRenaming] = useState(null);
  const [draft, setDraft] = useState('');
  const rowRefs = useRef(new Map());
  const gesture = useRef(null);

  const len = project ? P.projectLength(project) : 0;
  const viewLen = Math.max(len + (width < 560 ? 3 : 6), width < 560 ? 12 : 24, project?.range ? project.range.out + 4 : 0);
  const fit = (width - header - 10) / viewLen;
  const scale = Math.max(2, zoom ?? fit);
  const contentW = Math.max(width - header, (viewLen + 90) * scale);
  const beat = project ? 60 / project.bpm : 0.5;
  const bar = beat * (project?.beats || 4);
  const snap = (x) => (prefs.snap ? Math.round(x / beat) * beat : x);
  const locked = phase === 'recording' || phase === 'saving' || phase === 'opening';

  const takeName = useMemo(() => new Map(takes.map((x) => [x.id, x.name])), [takes]);
  const takeDur = (id) => studio.engine.buffers.get(id)?.duration ?? takes.find((x) => x.id === id)?.duration ?? 1e6;

  const timeAt = (clientX) => {
    const el = scroller.current;
    const box = el.getBoundingClientRect();
    return Math.max(0, (clientX - box.left - header + el.scrollLeft) / scale);
  };

  // ---- the project shown (a drag in progress previews its result) ----
  const shown = useMemo(() => {
    if (!project || !drag?.moved) return project;
    if (drag.mode === 'move') return P.moveRegion(project, drag.id, drag.start, drag.trackId);
    return P.trimRegion(project, drag.id, drag.mode, drag.time, takeDur(drag.takeId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, drag]);

  // ---- region gestures ----
  const onRegionDown = (e, region, mode) => {
    if (locked || e.button > 0) return;
    e.stopPropagation();
    const f = P.findRegion(project, region.id);
    // Touch: an unselected region lets the finger scroll the timeline; a tap
    // selects it, and then it can be dragged (select first, like iOS).
    if (e.pointerType === 'touch' && mode === 'move' && selection !== region.id) {
      gesture.current = { kind: 'tapselect', id: region.id, x0: e.clientX, y0: e.clientY, time: timeAt(e.clientX) };
      return;
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    gesture.current = { kind: 'region', mode, id: region.id, takeId: region.takeId, trackId: f.track.id, x0: e.clientX, y0: e.clientY, start0: region.start, end0: P.regionEnd(region), moved: false, time: timeAt(e.clientX) };
  };

  const trackAtY = (y) => {
    for (const [id, el] of rowRefs.current) {
      const r = el?.getBoundingClientRect();
      if (r && y >= r.top && y < r.bottom) return id;
    }
    return null;
  };

  const onMove = (e) => {
    const g = gesture.current;
    if (!g) return;
    if (g.kind === 'region') {
      const dx = e.clientX - g.x0;
      const dy = e.clientY - g.y0;
      if (!g.moved && Math.hypot(dx, dy) < 5) return;
      g.moved = true;
      if (g.mode === 'move') {
        const start = Math.max(0, snap(g.start0 + dx / scale));
        setDrag({ id: g.id, mode: 'move', start, trackId: trackAtY(e.clientY) || g.trackId, moved: true });
      } else {
        const time = snap((g.mode === 'start' ? g.start0 : g.end0) + dx / scale);
        setDrag({ id: g.id, mode: g.mode, time, takeId: g.takeId, moved: true });
      }
    } else if (g.kind === 'ruler') {
      const at = timeAt(e.clientX);
      if (!g.moved && Math.abs(e.clientX - g.x0) < 6) return;
      g.moved = true;
      if (g.edge) {
        const r = project.range;
        const v = snap(at);
        setRangeDrag(g.edge === 'in' ? { in: Math.min(v, r.out - 0.05), out: r.out } : { in: r.in, out: Math.max(v, r.in + 0.05) });
      } else {
        const a = snap(g.t0);
        const b = snap(at);
        setRangeDrag({ in: Math.min(a, b), out: Math.max(a, b) });
      }
    } else if (g.kind === 'lane') {
      if (!g.moved && Math.abs(e.clientX - g.x0) < 6) return;
      g.moved = true;
      const at = timeAt(e.clientX);
      setLaneDrag({ laneId: g.laneId, a: Math.min(g.t0, at), b: Math.max(g.t0, at) });
    }
  };

  const onUp = (e) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    if (g.kind === 'tapselect') {
      if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 8) {
        setSelection(g.id);
        studio.seek(g.time);
      }
      return;
    }
    if (g.kind === 'region') {
      if (!g.moved) {
        setSelection(g.id);
        studio.seek(g.time);
      } else if (drag) {
        const d = drag;
        studio.update((p) => (d.mode === 'move' ? P.moveRegion(p, d.id, d.start, d.trackId) : P.trimRegion(p, d.id, d.mode, d.time, takeDur(g.takeId))));
        setSelection(g.id);
      }
      setDrag(null);
    } else if (g.kind === 'ruler') {
      if (!g.moved) studio.seek(timeAt(e.clientX));
      else if (rangeDrag && rangeDrag.out - rangeDrag.in > 0.05) studio.update((p) => ({ ...p, range: { ...rangeDrag } }));
      setRangeDrag(null);
    } else if (g.kind === 'lane') {
      const p0 = project;
      const tr = p0.tracks.find((x) => x.id === g.trackId);
      const lane = tr?.lanes.find((x) => x.id === g.laneId);
      if (lane) {
        if (!g.moved) studio.update((p) => P.compLane(p, g.trackId, lane.id, lane.from, lane.to));
        else if (laneDrag) studio.update((p) => P.compLane(p, g.trackId, lane.id, laneDrag.a, laneDrag.b));
      }
      setLaneDrag(null);
    } else if (g.kind === 'row') {
      if (Math.abs(e.clientX - g.x0) < 6) {
        setSelection(null);
        studio.seek(timeAt(e.clientX));
      }
    }
  };

  const onRulerDown = (e, edge = null) => {
    if (locked || e.button > 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    gesture.current = { kind: 'ruler', x0: e.clientX, t0: timeAt(e.clientX), edge, moved: false };
  };

  const onLaneDown = (e, trackId, lane) => {
    if (locked || e.button > 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    gesture.current = { kind: 'lane', trackId, laneId: lane.id, x0: e.clientX, t0: timeAt(e.clientX), moved: false };
  };

  const onRowDown = (e) => {
    if (locked || e.button > 0) return;
    gesture.current = { kind: 'row', x0: e.clientX };
  };

  // Zoom keeps the playhead in view.
  const setScale = (next) => {
    const el = scroller.current;
    const at = studio.positionStore.get().position;
    setZoom(next);
    requestAnimationFrame(() => {
      if (el && next) el.scrollLeft = Math.max(0, at * next - (el.clientWidth - header) * 0.3);
    });
  };

  if (!shown) return <div className="tl" ref={wrapRef} />;

  // ---- ruler marks ----
  const marks = [];
  const barPx = bar * scale;
  const every = barPx >= 40 ? 1 : barPx >= 20 ? 2 : barPx >= 10 ? 4 : barPx >= 5 ? 8 : 16;
  const totalBars = Math.ceil(contentW / scale / bar) + 1;
  for (let b = 0; b < totalBars; b++) {
    const x = b * barPx;
    if (b % every === 0) marks.push(<span key={`b${b}`} className="tl-bar" style={{ left: x }}>{b + 1}</span>);
    else if (every <= 4) marks.push(<span key={`b${b}`} className="tl-tick" style={{ left: x }} />);
    if (barPx >= 60) for (let k = 1; k < (project.beats || 4); k++) marks.push(<span key={`b${b}-${k}`} className="tl-tick is-beat" style={{ left: x + k * beat * scale }} />);
  }
  const range = rangeDrag || shown.range;
  const rec = studio.recording.current;

  return (
    <div className="tl" ref={wrapRef} dir="ltr" style={{ '--tl-header': `${header}px` }}>
      <div className="tl-scroll" ref={scroller} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { gesture.current = null; setDrag(null); setRangeDrag(null); setLaneDrag(null); }}>
        <div className="tl-inner" style={{ width: header + contentW }}>
          {/* Ruler */}
          <div className="tl-row tl-ruler-row">
            <div className="tl-head tl-corner">
              <button type="button" className="tl-zoom" aria-label={t('rec.zoomOut')} onClick={() => setScale(Math.max(2, scale / 1.6))}>
                −
              </button>
              <button type="button" className="tl-zoom" aria-label={t('rec.zoomIn')} onClick={() => setScale(Math.min(400, scale * 1.6))}>
                +
              </button>
              <button type="button" className="tl-zoom is-fit" aria-label={t('rec.zoomFit')} aria-pressed={zoom == null} onClick={() => setZoom(null)}>
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="tl-ruler" style={{ width: contentW }} onPointerDown={(e) => onRulerDown(e)} role="slider" aria-label={t('rec.ruler')} aria-valuenow={0}>
              {marks}
              {range && (
                <div className={'tl-range' + (shown.loop ? ' is-loop' : '') + (shown.punch ? ' is-punch' : '')} style={{ left: range.in * scale, width: (range.out - range.in) * scale }}>
                  <span className="tl-range-grip is-in" onPointerDown={(e) => onRulerDown(e, 'in')} aria-hidden="true" />
                  <span className="tl-range-grip is-out" onPointerDown={(e) => onRulerDown(e, 'out')} aria-hidden="true" />
                </div>
              )}
            </div>
          </div>

          {shown.tracks.map((tr, ti) => {
            const color = TRACK_COLORS[ti % TRACK_COLORS.length];
            const armed = shown.armed === tr.id;
            const lanesOpen = openLanes.has(tr.id) && tr.lanes.length > 0;
            return (
              <div key={tr.id} className="tl-track" style={{ '--trk': color }}>
                <div className={'tl-row tl-track-row' + (armed ? ' is-armed' : '')} ref={(el) => rowRefs.current.set(tr.id, el)}>
                  <div className="tl-head">
                    {renaming === tr.id ? (
                      <form
                        className="tl-rename"
                        onSubmit={(e) => {
                          e.preventDefault();
                          setRenaming(null);
                          if (draft.trim()) studio.update((p) => P.setTrack(p, tr.id, { name: draft.trim().slice(0, 24) }));
                        }}
                      >
                        <input autoFocus value={draft} maxLength={24} aria-label={t('rec.rename')} onChange={(e) => setDraft(e.target.value)} onBlur={(e) => e.currentTarget.form?.requestSubmit()} />
                        {shown.tracks.length > 1 && (
                          <button
                            type="button"
                            className="tl-mini is-danger"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setRenaming(null);
                              studio.update((p) => P.removeTrack(p, tr.id));
                            }}
                          >
                            {t('rec.delete')}
                          </button>
                        )}
                      </form>
                    ) : (
                      <button type="button" className="tl-track-name" dir="auto" disabled={locked} onClick={() => { setDraft(tr.name); setRenaming(tr.id); }}>
                        {tr.name}
                      </button>
                    )}
                    <div className="tl-track-btns">
                      <button type="button" className={'tl-mini is-arm' + (armed ? ' is-on' : '')} aria-pressed={armed} aria-label={t('rec.arm')} title={t('rec.arm')} disabled={locked} onClick={() => studio.update((p) => ({ ...p, armed: tr.id }), { history: false })}>
                        <span aria-hidden="true" />
                      </button>
                      <button type="button" className={'tl-mini' + (tr.mute ? ' is-on' : '')} aria-pressed={tr.mute} aria-label={t('rec.mute')} title={t('rec.mute')} onClick={() => studio.updateMix((p) => P.setTrack(p, tr.id, { mute: !tr.mute }))}>
                        M
                      </button>
                      <button type="button" className={'tl-mini is-solo' + (tr.solo ? ' is-on' : '')} aria-pressed={tr.solo} aria-label={t('rec.solo')} title={t('rec.solo')} onClick={() => studio.updateMix((p) => P.setTrack(p, tr.id, { solo: !tr.solo }))}>
                        S
                      </button>
                      {tr.lanes.length > 0 && (
                        <button
                          type="button"
                          className={'tl-mini is-lanes' + (lanesOpen ? ' is-on' : '')}
                          aria-pressed={lanesOpen}
                          aria-label={t('rec.lanes')}
                          title={t('rec.lanes')}
                          onClick={() =>
                            setOpenLanes((s) => {
                              const n = new Set(s);
                              if (n.has(tr.id)) n.delete(tr.id);
                              else n.add(tr.id);
                              return n;
                            })
                          }
                        >
                          {tr.lanes.length}
                        </button>
                      )}
                    </div>
                    <input
                      className="tl-vol"
                      type="range"
                      min="0"
                      max="1.2"
                      step="0.01"
                      value={tr.volume}
                      aria-label={t('rec.volume')}
                      onChange={(e) => studio.updateMix((p) => P.setTrack(p, tr.id, { volume: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="tl-lane-area" style={{ width: contentW }} onPointerDown={onRowDown}>
                    {tr.regions.map((r) => {
                      const sel = selection === r.id;
                      const playheadAt = sel ? studio.positionStore.get().position : null;
                      const lane = r.laneId ? tr.lanes.find((l) => l.id === r.laneId) : null;
                      return (
                        <Region
                          key={r.id}
                          region={r}
                          scale={scale}
                          color={color}
                          selected={sel}
                          env={peaks.get(r.takeId)}
                          name={takeName.get(r.takeId) || '—'}
                          laneLabel={lane && tr.lanes.length > 1 ? `${tr.lanes.indexOf(lane) + 1}` : null}
                          onDown={onRegionDown}
                          tSplit={playheadAt != null && playheadAt > r.start && playheadAt < P.regionEnd(r) ? playheadAt : null}
                        />
                      );
                    })}
                    {rec && rec.armed === tr.id && <RecordingBar store={positionStore} scale={scale} rec={rec} rowTop={0} />}
                  </div>
                </div>
                {lanesOpen &&
                  tr.lanes.map((lane, li) => {
                    const used = tr.regions.filter((r) => r.laneId === lane.id || (!r.laneId && r.takeId === lane.takeId));
                    const ld = laneDrag?.laneId === lane.id ? laneDrag : null;
                    return (
                      <div key={lane.id} className="tl-row tl-lane-row">
                        <div className="tl-head tl-lane-head">
                          <span className="tl-lane-label" dir="auto">
                            {li + 1}. {lane.label || takeName.get(lane.takeId)}
                            {lane.full === false ? ' …' : ''}
                          </span>
                          <button type="button" className="tl-mini is-x" aria-label={t('rec.removeLane')} title={t('rec.removeLane')} disabled={locked} onClick={() => studio.update((p) => P.removeLane(p, tr.id, lane.id))}>
                            ×
                          </button>
                        </div>
                        <div className="tl-lane-area" style={{ width: contentW }}>
                          <div
                            className="tl-lane-take"
                            style={{ left: lane.from * scale, width: Math.max(2, (lane.to - lane.from) * scale) }}
                            onPointerDown={(e) => onLaneDown(e, tr.id, lane)}
                            role="button"
                            aria-label={`${t('rec.useLane')} ${li + 1}`}
                          >
                            <svg className="tl-wave" viewBox={`0 0 ${Math.max(2, Math.round(((lane.to - lane.from) * scale) / 2))} 100`} preserveAspectRatio="none" aria-hidden="true">
                              <path d={wavePath(peaks.get(lane.takeId), lane.from - lane.base, lane.to - lane.from, Math.min(1500, Math.max(2, Math.round(((lane.to - lane.from) * scale) / 2))))} />
                            </svg>
                            {used.map((r) => {
                              const a = Math.max(r.start, lane.from);
                              const b = Math.min(P.regionEnd(r), lane.to);
                              return b > a ? <span key={r.id} className="tl-lane-used" style={{ left: (a - lane.from) * scale, width: (b - a) * scale }} /> : null;
                            })}
                            {ld && <span className="tl-lane-pick" style={{ left: (Math.max(ld.a, lane.from) - lane.from) * scale, width: Math.max(0, (Math.min(ld.b, lane.to) - Math.max(ld.a, lane.from)) * scale) }} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}

          {shown.drums?.on && (
            <div className="tl-row tl-drum-row">
              <div className="tl-head">
                <span className="tl-track-name is-static">{t('rec.drums')}</span>
              </div>
              <div className="tl-lane-area tl-drum-area" style={{ width: contentW, '--bar': `${barPx}px`, '--beat': `${beat * scale}px` }} aria-hidden="true" />
            </div>
          )}

          {shown.tracks.length < P.MAX_TRACKS && (
            <div className="tl-row tl-add-row">
              <div className="tl-head">
                <button type="button" className="tl-add" disabled={locked} onClick={() => studio.update((p) => P.addTrack(p))}>
                  <span aria-hidden="true">＋</span> {t('rec.track')}
                </button>
              </div>
              <div className="tl-lane-area" style={{ width: contentW }} />
            </div>
          )}

          {range && (
            <div className={'tl-range-shade' + (shown.loop ? ' is-loop' : '') + (shown.punch ? ' is-punch' : '')} style={{ left: header + range.in * scale, width: (range.out - range.in) * scale }} aria-hidden="true" />
          )}
          <Playhead store={positionStore} scale={scale} header={header} scroller={scroller} follow={phase === 'playing' || phase === 'recording'} />
        </div>
      </div>
    </div>
  );
}
