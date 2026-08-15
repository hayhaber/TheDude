import { Fretboard } from '../Fretboard/Fretboard';
import { PianoKeyboard } from '../PianoKeyboard/PianoKeyboard';
import { useInstrument } from '../../instruments/useInstrument';
import './Stage.css';

// The persistent core of the app — rendered once, pinned at the bottom of
// the content area (see AppShell.css) so the instrument is always visible
// no matter which section is active above it. `fretboardProps`/`pianoProps`
// are single resolved objects from App.jsx describing "what's currently
// shown" for whichever section/tab is active and whichever instrument is
// selected; Stage itself has no opinion about that, it just renders
// whichever renderer matches the current instrument with the props it was
// given — this is the one place Guitar and Piano visually diverge, per the
// app's instrument-agnostic architecture (see docs/PIANO_MODE_ARCHITECTURE.md).
export function Stage({ fretboardProps, pianoProps, legendSlot = null }) {
  const { instrument } = useInstrument();
  return (
    <div className="stage">
      {instrument === 'piano' ? <PianoKeyboard {...pianoProps} /> : <Fretboard {...fretboardProps} />}
      {/* Fixed-height reserve, always rendered (empty or not) — .app-stage-anchor
          is pinned to the bottom of a fixed-height viewport (see AppShell.css),
          so if this slot's height came and went with legendSlot itself, the
          Fretboard/PianoKeyboard above it would visibly shift up every time the
          legend appeared (which is exactly what used to happen). Reserving the
          same height unconditionally keeps the instrument's on-screen position
          fixed regardless of what's showing underneath it. */}
      <div className="stage-legend-reserve">{legendSlot}</div>
    </div>
  );
}
