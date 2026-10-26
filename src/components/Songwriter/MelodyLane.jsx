import { useMemo, useRef, useState } from 'react';
import { sortNotes } from '../../music/songwriter/song';

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

/**
 * A line's melody as a small piano roll: time left -> right (as in notation,
 * in both languages), one row per semitone, bar / beat lines, chord names on
 * top, the syllable each note sings under it.
 *
 * Read-only (`compact`, in the lyric sheet) or editable (the melody editor):
 * tap a note = select, drag = move (snaps to the grid / a semitone), drag its
 * end = length, tap an empty spot = a new note.
 */
export function MelodyLane({
  notes,
  sylOf = [],
  sylText = [],
  chords = [],
  beatsPerBar = 4,
  fromBeat = 0,
  toBeat = 4,
  grid = 0.5,
  compact = false,
  selected = -1,
  onSelect,
  onChange,
  playBeat = null,
  inKey = null,
  width = 320,
}) {
  const sorted = notes;
  const pitches = sorted.map((n) => n.p);
  const lo0 = pitches.length ? Math.min(...pitches) : 60;
  const hi0 = pitches.length ? Math.max(...pitches) : 72;
  const pad = compact ? 1 : 3;
  let lo = lo0 - pad;
  let hi = hi0 + pad;
  const minRows = compact ? 8 : 15;
  if (hi - lo + 1 < minRows) {
    const extra = minRows - (hi - lo + 1);
    lo -= Math.floor(extra / 2);
    hi += Math.ceil(extra / 2);
  }
  const rows = hi - lo + 1;
  const padL = compact ? 0 : 38;
  const chordH = compact ? 0 : 20;
  const sylH = compact ? 0 : 22;
  const rowH = compact ? Math.max(3, Math.min(6, 48 / rows)) : 18;
  const beats = Math.max(beatsPerBar, toBeat - fromBeat);
  const pxPerBeat = compact ? (width - 2) / beats : Math.max(44, (width - padL - 8) / beats);
  const W = padL + beats * pxPerBeat + (compact ? 2 : 8);
  const H = chordH + rows * rowH + sylH;
  const xOf = (b) => padL + (b - fromBeat) * pxPerBeat;
  const yOf = (p) => chordH + (hi - p) * rowH;

  const svgRef = useRef(null);
  const drag = useRef(null);
  const [ghost, setGhost] = useState(null); // live drag preview { i, p, s, d }

  const shown = useMemo(() => {
    if (!ghost) return sorted;
    return sorted.map((n, i) => (i === ghost.i ? { ...n, p: ghost.p, s: ghost.s, d: ghost.d } : n));
  }, [sorted, ghost]);

  const toLocal = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const snap = (b) => Math.round(b / grid) * grid;

  const onDown = (e) => {
    if (compact || !onChange) return;
    const { x, y } = toLocal(e);
    if (y < chordH || y > chordH + rows * rowH) return;
    const beat = fromBeat + (x - padL) / pxPerBeat;
    const pitch = hi - Math.floor((y - chordH) / rowH);
    const hit = shown.findIndex((n) => beat >= n.s && beat <= n.s + n.d && n.p === pitch);
    svgRef.current.setPointerCapture?.(e.pointerId);
    if (hit >= 0) {
      const n = shown[hit];
      const edge = xOf(n.s + n.d) - x < Math.min(12, (n.d * pxPerBeat) / 3);
      drag.current = { i: hit, mode: edge ? 'len' : 'move', x0: x, y0: y, n, moved: false };
    } else {
      drag.current = { i: -1, mode: 'add', x0: x, y0: y, beat, pitch, moved: false };
    }
  };

  const onMove = (e) => {
    const d = drag.current;
    if (!d || d.i < 0) return;
    const { x, y } = toLocal(e);
    const dx = x - d.x0;
    const dy = y - d.y0;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    if (d.mode === 'move') {
      const s = snap(d.n.s + dx / pxPerBeat);
      const p = Math.max(24, Math.min(108, d.n.p - Math.round(dy / rowH)));
      setGhost({ i: d.i, p, s: Math.max(fromBeat - beatsPerBar, s), d: d.n.d });
    } else {
      const len = Math.max(grid, snap(d.n.d + dx / pxPerBeat));
      setGhost({ i: d.i, p: d.n.p, s: d.n.s, d: len });
    }
  };

  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.mode === 'add') {
      const s = Math.floor((d.beat) / grid) * grid;
      const n = { p: d.pitch, s, d: Math.max(grid, Math.min(1, grid * 2)) };
      const next = sortNotes([...sorted, n]);
      onChange(fixOverlaps(next), next.indexOf(n));
      return;
    }
    if (!d.moved) {
      onSelect?.(d.i === selected ? -1 : d.i);
      setGhost(null);
      return;
    }
    const g = ghost;
    setGhost(null);
    if (!g) return;
    const moved = { ...sorted[d.i], p: g.p, s: g.s, d: g.d };
    const rest = sorted.filter((_, i) => i !== d.i);
    const next = sortNotes([...rest, moved]);
    onChange(fixOverlaps(next), next.indexOf(moved));
  };

  // Grid lines.
  const lines = [];
  for (let b = Math.ceil(fromBeat / grid) * grid; b <= toBeat + 1e-9; b += grid) {
    const isBar = Math.abs(b / beatsPerBar - Math.round(b / beatsPerBar)) < 1e-9;
    const isBeat = Math.abs(b - Math.round(b)) < 1e-9;
    if (compact && !isBar) continue;
    lines.push(
      <line
        key={'g' + b}
        x1={xOf(b)}
        x2={xOf(b)}
        y1={chordH}
        y2={chordH + rows * rowH}
        className={isBar ? 'sw-lane-bar' : isBeat ? 'sw-lane-beat' : 'sw-lane-sub'}
      />
    );
  }

  return (
    <svg
      ref={svgRef}
      className={'sw-lane' + (compact ? ' is-compact' : ' is-edit')}
      viewBox={`0 0 ${W} ${H}`}
      width={compact ? '100%' : W}
      height={compact ? H : H}
      preserveAspectRatio="none"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={() => {
        drag.current = null;
        setGhost(null);
      }}
      role={compact ? 'img' : 'application'}
      dir="ltr"
    >
      {/* rows */}
      {!compact &&
        Array.from({ length: rows }, (_, k) => {
          const p = hi - k;
          const pc = ((p % 12) + 12) % 12;
          const black = [1, 3, 6, 8, 10].includes(pc);
          const out = inKey && !inKey.includes(pc);
          return (
            <g key={'r' + p}>
              <rect x={padL} y={yOf(p)} width={W - padL} height={rowH} className={'sw-lane-row' + (black ? ' is-black' : '') + (out ? ' is-out' : '')} />
              <text x={padL - 5} y={yOf(p) + rowH * 0.72} className={'sw-lane-name' + (pc === 0 ? ' is-c' : '')} textAnchor="end">
                {pc === 0 || !black ? noteName(p) : ''}
              </text>
            </g>
          );
        })}
      {lines}
      {/* chords */}
      {!compact &&
        chords.map((c, i) => (
          <text key={'c' + i} x={xOf(c.beat) + 2} y={14} className="sw-lane-chord">
            {c.symbol}
          </text>
        ))}
      {/* notes */}
      {shown.map((n, i) => {
        const extra = sylOf[i] === -1;
        return (
          <rect
            key={'n' + i}
            x={xOf(n.s) + 1}
            y={yOf(n.p) + (compact ? 0 : 1)}
            width={Math.max(3, n.d * pxPerBeat - 2)}
            height={Math.max(2, rowH - (compact ? 0 : 2))}
            rx={compact ? 1.5 : 4}
            className={'sw-lane-note' + (i === selected ? ' is-selected' : '') + (n.c ? ' is-cont' : '') + (extra ? ' is-extra' : '')}
          />
        );
      })}
      {/* syllables */}
      {!compact &&
        shown.map((n, i) => {
          const si = sylOf[i];
          const prev = sylOf[i - 1];
          const txt = si === -1 ? '?' : n.c && si === prev ? '–' : sylText[si] ?? '';
          return (
            <text key={'s' + i} x={xOf(n.s) + 2} y={chordH + rows * rowH + 16} className={'sw-lane-syl' + (si === -1 ? ' is-extra' : '')} dir="auto">
              {txt}
            </text>
          );
        })}
      {playBeat != null && playBeat >= fromBeat && playBeat <= toBeat && (
        <line x1={xOf(playBeat)} x2={xOf(playBeat)} y1={0} y2={H} className="sw-lane-head" />
      )}
    </svg>
  );
}

/** Shortens notes that run into the next one. */
export function fixOverlaps(notes) {
  return notes.map((n, i) => {
    const next = notes[i + 1];
    if (next && n.s + n.d > next.s) return { ...n, d: Math.max(0.25, next.s - n.s) };
    return n;
  });
}
