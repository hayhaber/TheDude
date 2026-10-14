import { useEffect, useState } from 'react';

// A 1/4" (6.35 mm) jack plug in the INPUT socket with its guitar cable — so
// the amp looks plugged in. Drawn in an SVG laid over the cabinet (clipped
// to it): the chrome plug points out of the socket towards the lower left,
// the black cable sags and leaves past the cabinet's left edge. Purely
// decorative; it follows the socket on every layout (ResizeObserver).
const ANGLE = 150; // plug direction, degrees (0 = right, 90 = down)

export function InputCable({ cabRef, jackRef }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const cab = cabRef.current;
    const jack = jackRef.current;
    if (!cab || !jack) return undefined;
    const measure = () => {
      const c = cab.getBoundingClientRect();
      const j = jack.getBoundingClientRect();
      setPos({ x: j.left + j.width / 2 - c.left, y: j.top + j.height / 2 - c.top, w: c.width, h: c.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(cab);
    ro.observe(jack);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [cabRef, jackRef]);

  if (!pos) return null;
  const rad = (ANGLE * Math.PI) / 180;
  const ux = Math.cos(rad);
  const uy = Math.sin(rad);
  const L = 50; // plug + strain relief length
  const ex = pos.x + ux * L;
  const ey = pos.y + uy * L;
  // Sag down a little, then off to the left past the cabinet edge.
  const cable = `M${ex.toFixed(1)} ${ey.toFixed(1)} C${(ex + ux * 22).toFixed(1)} ${(ey + uy * 22).toFixed(1)}, ${(ex - 26).toFixed(1)} ${(ey + 34).toFixed(1)}, ${(-30).toFixed(1)} ${(ey + 46).toFixed(1)}`;

  return (
    <svg className="amp-input-cable" width={pos.w} height={pos.h} viewBox={`0 0 ${pos.w} ${pos.h}`} aria-hidden="true">
      <defs>
        <linearGradient id="ampPlugChrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8d929a" />
          <stop offset="0.28" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#c6cad0" />
          <stop offset="0.8" stopColor="#6f747c" />
          <stop offset="1" stopColor="#a9aeb5" />
        </linearGradient>
        <linearGradient id="ampPlugRubber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a3c" />
          <stop offset="0.35" stopColor="#1c1c1e" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
        <filter id="ampCableShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* soft shadow of plug + cable on the panel */}
      <g opacity="0.45" transform="translate(3 5)" filter="url(#ampCableShadow)">
        <path d={cable} stroke="#000" strokeWidth="8" fill="none" strokeLinecap="round" />
        <line x1={pos.x} y1={pos.y} x2={ex} y2={ey} stroke="#000" strokeWidth="15" strokeLinecap="round" />
      </g>

      {/* the cable */}
      <path d={cable} stroke="#0d0d0e" strokeWidth="7.5" fill="none" strokeLinecap="round" />
      <path d={cable} stroke="rgba(255,255,255,0.16)" strokeWidth="1.6" fill="none" strokeLinecap="round" transform="translate(-0.8 -1.6)" />

      {/* the plug, drawn along +x and turned to point out of the socket */}
      <g transform={`translate(${pos.x} ${pos.y}) rotate(${ANGLE})`}>
        {/* collar seated in the socket */}
        <rect x="-2" y="-8.5" width="9" height="17" rx="2" fill="url(#ampPlugChrome)" stroke="#5b5f66" strokeWidth="0.6" />
        {/* knurled metal barrel */}
        <rect x="6" y="-7.5" width="22" height="15" rx="2.5" fill="url(#ampPlugChrome)" stroke="#5b5f66" strokeWidth="0.6" />
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1={9 + i * 2.6} y1="-7" x2={9 + i * 2.6} y2="7" stroke="rgba(60,64,70,0.45)" strokeWidth="0.8" />
        ))}
        {/* rubber strain relief, tapering into the cable */}
        <path d="M28 -6.5 L44 -4.6 Q50 -4.2 50 0 Q50 4.2 44 4.6 L28 6.5 Z" fill="url(#ampPlugRubber)" />
        <path d="M30 -5.6 L44 -3.9" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      </g>
    </svg>
  );
}
