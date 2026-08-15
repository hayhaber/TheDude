import { KEY_CIRCLE } from '../../music/circleOfFifthsCurriculum';
import './CircleOfFifthsDiagram.css';

const SIZE = 340;
const CENTER = SIZE / 2;
const OUTER_R = 160;
const OUTER_INNER_R = 108;
const INNER_OUTER_R = 104;
const INNER_R = 62;
const SEGMENT_DEG = 30;

// Angle 0 = straight up (12 o'clock, where C sits), clockwise positive —
// matches how every printed circle-of-fifths diagram is drawn, and how
// KEY_CIRCLE's `position` field (0 = C, increasing clockwise) is defined.
function angleForPosition(position) {
  return position * SEGMENT_DEG - 90;
}

function polar(radius, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

// One donut-segment wedge path, between innerR/outerR and startAngle/endAngle.
function wedgePath(innerR, outerR, position) {
  const start = angleForPosition(position) - SEGMENT_DEG / 2;
  const end = angleForPosition(position) + SEGMENT_DEG / 2;
  const o1 = polar(outerR, start);
  const o2 = polar(outerR, end);
  const i1 = polar(innerR, end);
  const i2 = polar(innerR, start);
  return `M ${o1.x} ${o1.y} A ${outerR} ${outerR} 0 0 1 ${o2.x} ${o2.y} L ${i1.x} ${i1.y} A ${innerR} ${innerR} 0 0 0 ${i2.x} ${i2.y} Z`;
}

function labelPos(radius, position) {
  return polar(radius, angleForPosition(position));
}

// selectedPosition: 0-11 (KEY_CIRCLE index of the currently selected key).
// highlightNeighbors: when true, tags the selected key's counter-clockwise
// neighbor (IV) and clockwise neighbor (V) with their own classes — used by
// the "Neighbor Keys" / progression lessons, a no-op prop everywhere else.
export function CircleOfFifthsDiagram({ selectedPosition, onSelectPosition, highlightNeighbors = false }) {
  const ivPosition = (selectedPosition + 11) % 12;
  const vPosition = (selectedPosition + 1) % 12;

  function classFor(position) {
    if (position === selectedPosition) return 'circle-segment selected';
    if (highlightNeighbors && position === ivPosition) return 'circle-segment neighbor-iv';
    if (highlightNeighbors && position === vPosition) return 'circle-segment neighbor-v';
    return 'circle-segment';
  }

  return (
    <svg
      className="circle-of-fifths-diagram"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="group"
      aria-label="Circle of Fifths"
      dir="ltr"
    >
      {KEY_CIRCLE.map((k) => {
        const majorLabelP = labelPos((OUTER_R + OUTER_INNER_R) / 2, k.position);
        const minorLabelP = labelPos((INNER_OUTER_R + INNER_R) / 2, k.position);
        return (
          <g key={k.position}>
            <path
              d={wedgePath(OUTER_INNER_R, OUTER_R, k.position)}
              className={classFor(k.position)}
              onClick={() => onSelectPosition(k.position)}
            />
            <path
              d={wedgePath(INNER_R, INNER_OUTER_R, k.position)}
              className={classFor(k.position) + ' circle-segment-minor'}
              onClick={() => onSelectPosition(k.position)}
            />
            <text x={majorLabelP.x} y={majorLabelP.y} className="circle-label-major" textAnchor="middle" dominantBaseline="middle">
              {k.majorName}
            </text>
            <text x={minorLabelP.x} y={minorLabelP.y} className="circle-label-minor" textAnchor="middle" dominantBaseline="middle">
              {k.relativeMinorName}
            </text>
          </g>
        );
      })}

      {highlightNeighbors && (
        <>
          <text {...labelPos(OUTER_R + 16, ivPosition)} className="circle-degree-tag" textAnchor="middle" dominantBaseline="middle">
            IV
          </text>
          <text {...labelPos(OUTER_R + 16, selectedPosition)} className="circle-degree-tag" textAnchor="middle" dominantBaseline="middle">
            I
          </text>
          <text {...labelPos(OUTER_R + 16, vPosition)} className="circle-degree-tag" textAnchor="middle" dominantBaseline="middle">
            V
          </text>
        </>
      )}
    </svg>
  );
}
