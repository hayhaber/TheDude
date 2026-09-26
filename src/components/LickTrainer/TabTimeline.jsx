import { useEffect, useRef } from 'react';

// Rhythm-true tab: horizontal position = time. Six string lines (high e on
// top, as tab is read), beat and bar lines, each note's fret number with a
// faint sustain bar showing how long it lasts, technique marks, a moving
// playhead, and — after a take — each note colored by how it went, with a
// tick where it was actually played.
const MIN_PX_PER_BEAT = 92;
const MAX_PX_PER_BEAT = 220;
const MIN_NOTE_GAP_PX = 36; // room for a two-digit fret box plus a legato mark
const LEFT = 30;
const TOP = 30;
const GAP = 22;
const BOTTOM = 26;
const NOTE_PAD = 10;
const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];

const BEND_LABEL = { 0.5: '¼', 1: '½', 2: 'full', 3: '1½', 4: '2' };

function y(stringIndex) {
  return TOP + (5 - stringIndex) * GAP;
}

function vibratoPath(x0, x1, yy) {
  let d = `M ${x0} ${yy}`;
  const w = 6;
  for (let x = x0, up = true; x < x1; x += w, up = !up) d += ` Q ${x + w / 2} ${yy + (up ? -4 : 4)} ${Math.min(x + w, x1)} ${yy}`;
  return d;
}

export function TabTimeline({ lick, playheadBeat, result, resultOffset = 0, highlight = null }) {
  const scrollRef = useRef(null);
  const beats = lick.lengthBeats;
  const phase = Math.round(lick.barPhase ?? 0); // where bar lines fall (beat 0 isn't always a bar line)
  // Widen the grid for fast subdivisions so 16ths/sextuplets never overlap.
  const starts = [...new Set(lick.notes.map((n) => Math.round(n.start * 1000) / 1000))].sort((a, b) => a - b);
  // Sized for the typical short gap (10th percentile), not the single
  // shortest one — one fast 32nd-note flourish in a long solo shouldn't
  // stretch the whole tab — and capped so a solo stays navigable.
  const gaps = starts.slice(1).map((x, i) => x - starts[i]).sort((a, b) => a - b);
  const typicalGap = gaps.length ? gaps[Math.floor(gaps.length * 0.1)] : null;
  const PX_PER_BEAT = Math.min(MAX_PX_PER_BEAT, Math.max(MIN_PX_PER_BEAT, typicalGap ? MIN_NOTE_GAP_PX / typicalGap : MIN_PX_PER_BEAT));
  const width = LEFT + beats * PX_PER_BEAT + 20;
  const height = TOP + 5 * GAP + BOTTOM;
  const xOf = (beat) => LEFT + NOTE_PAD + beat * PX_PER_BEAT;
  const spb = 60 / (result?.bpm ?? lick.bpm);

  // Keep the playhead in view on narrow screens.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || playheadBeat == null || playheadBeat < 0) return;
    const x = xOf(playheadBeat);
    if (x < el.scrollLeft + 40 || x > el.scrollLeft + el.clientWidth - 60) el.scrollLeft = Math.max(0, x - 60);
  }, [playheadBeat]); // eslint-disable-line react-hooks/exhaustive-deps

  // With a section of a longer piece, result note j is the piece's note
  // resultOffset + j; notes outside the section have no result.
  const resultFor = (i) => {
    const j = i - resultOffset;
    return result && j >= 0 && j < result.notes.length ? result.notes[j] : null;
  };
  const status = (i) => resultFor(i)?.status ?? null;
  const inHighlight = (n) => !highlight || (n.start >= highlight.fromBeat - 1e-6 && n.start < highlight.toBeat - 1e-6);

  // Bring the selected section into view.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !highlight) return;
    el.scrollLeft = Math.max(0, xOf(highlight.fromBeat) - 40);
  }, [highlight?.fromBeat]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="tab-timeline" ref={scrollRef} dir="ltr">
      <svg width={width} height={height} role="img" aria-label={lick.title.en}>
        {/* beat & bar grid */}
        {Array.from({ length: beats + 1 }, (_, b) => (
          <g key={`g${b}`}>
            <line
              x1={xOf(b) - NOTE_PAD / 2}
              x2={xOf(b) - NOTE_PAD / 2}
              y1={TOP}
              y2={TOP + 5 * GAP}
              className={(((b - phase) % 4) + 4) % 4 === 0 ? 'tt-bar' : 'tt-beat'}
            />
            {b < beats && (
              <text x={xOf(b) - NOTE_PAD / 2 + 4} y={TOP - 14} className="tt-beat-num">
                {((((b - phase) % 4) + 4) % 4) + 1}
              </text>
            )}
          </g>
        ))}
        {highlight && (
          <rect
            x={xOf(highlight.fromBeat) - NOTE_PAD / 2}
            y={TOP - 22}
            width={(highlight.toBeat - highlight.fromBeat) * PX_PER_BEAT}
            height={5 * GAP + 30}
            rx={6}
            className="tt-highlight"
          />
        )}
        {/* strings */}
        {STRING_LABELS.map((label, s) => (
          <g key={`s${s}`}>
            <text x={8} y={y(s) + 4} className="tt-string-label">
              {label}
            </text>
            <line x1={LEFT} x2={width - 10} y1={y(s)} y2={y(s)} className="tt-string" />
          </g>
        ))}

        {/* sustain bars (rhythm at a glance) */}
        {lick.notes.map((n, i) => (
          <rect
            key={`d${i}`}
            x={xOf(n.start)}
            y={y(n.string) - 3}
            width={Math.max(4, n.duration * PX_PER_BEAT - 6)}
            height={6}
            rx={3}
            className={'tt-sustain' + (status(i) ? ` is-${status(i)}` : '')}
          />
        ))}

        {/* legato connectors: slides as lines, hammer/pull as arcs */}
        {lick.notes.map((n, i) => {
          const prev = lick.notes[i - 1];
          if (!prev || prev.string !== n.string) return null;
          const x0 = xOf(prev.start) + 8;
          const x1 = xOf(n.start) - 8;
          const yy = y(n.string);
          if (n.technique === 'slide') {
            const up = n.fret > prev.fret;
            return <line key={`c${i}`} x1={x0 + 6} x2={x1 + 2} y1={yy + (up ? 5 : -5)} y2={yy + (up ? -5 : 5)} className="tt-slide" />;
          }
          if (n.technique === 'hammer' || n.technique === 'pull') {
            const mx = (x0 + x1) / 2;
            return (
              <g key={`c${i}`}>
                <path d={`M ${x0} ${yy - 10} Q ${mx} ${yy - 20} ${x1} ${yy - 10}`} className="tt-arc" />
                <text x={mx} y={yy - 19} className="tt-tech" textAnchor="middle">
                  {n.technique === 'hammer' ? 'h' : 'p'}
                </text>
              </g>
            );
          }
          return null;
        })}

        {/* notes */}
        {lick.notes.map((n, i) => {
          const x = xOf(n.start);
          const yy = y(n.string);
          const st = status(i);
          const label = String(n.fret);
          const w = label.length > 1 ? 20 : 14;
          const noteRes = resultFor(i);
          const offsetBeats = noteRes?.offsetMs != null ? noteRes.offsetMs / 1000 / spb : null;
          return (
            <g key={`n${i}`} className={'tt-note' + (st ? ` is-${st}` : '') + (inHighlight(n) ? '' : ' is-dim')}>
              <rect x={x - w / 2} y={yy - 9} width={w} height={18} rx={5} className="tt-note-box" />
              <text x={x} y={yy + 4} textAnchor="middle" className="tt-fret">
                {label}
              </text>
              {n.technique === 'bend' && (
                <g>
                  <path d={`M ${x + w / 2} ${yy - 2} Q ${x + w / 2 + 12} ${yy - 4} ${x + w / 2 + 12} ${yy - 20}`} className="tt-bend" />
                  <path d={`M ${x + w / 2 + 9} ${yy - 16} L ${x + w / 2 + 12} ${yy - 21} L ${x + w / 2 + 15} ${yy - 16}`} className="tt-bend" />
                  <text x={x + w / 2 + 12} y={yy - 24} textAnchor="middle" className="tt-tech">
                    {BEND_LABEL[n.bend] ?? n.bend}
                  </text>
                </g>
              )}
              {n.technique === 'release' && (
                <text x={x} y={yy - 14} textAnchor="middle" className="tt-tech">
                  r
                </text>
              )}
              {n.vibrato && (
                <path d={vibratoPath(x + w / 2 + (n.technique === 'bend' ? 18 : 4), xOf(n.start + n.duration) - 8, yy - 14)} className="tt-vibrato" />
              )}
              {offsetBeats != null && Math.abs(noteRes.offsetMs) > 15 && (
                <line
                  x1={x + offsetBeats * PX_PER_BEAT}
                  x2={x + offsetBeats * PX_PER_BEAT}
                  y1={yy + 11}
                  y2={yy + 17}
                  className="tt-offset"
                />
              )}
              <text x={x} y={TOP + 5 * GAP + 18} textAnchor="middle" className="tt-order">
                {n.order}
              </text>
            </g>
          );
        })}

        {playheadBeat != null && playheadBeat >= 0 && playheadBeat <= beats && (
          <line x1={xOf(playheadBeat)} x2={xOf(playheadBeat)} y1={TOP - 6} y2={TOP + 5 * GAP + 6} className="tt-playhead" />
        )}
      </svg>
    </div>
  );
}
