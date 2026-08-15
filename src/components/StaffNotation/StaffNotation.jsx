import { useEffect, useRef } from 'react';
import { Renderer, RendererBackends, Stave, StaveNote, Voice, Formatter } from 'vexflow';
import './StaffNotation.css';

const STAVE_WIDTH = 200;
const STAVE_HEIGHT = 100;
const HIGHLIGHT_COLOR = '#34c759'; // same green GuitarNotation.jsx uses for "matched"
const DEFAULT_COLOR = 'var(--vex-note-color, #444)';

const LETTER_VEX = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];

// "60" (Middle C) -> "c/4" — VexFlow's own key format (letter/octave, same
// scientific-pitch-notation octave numbering PianoKeyboard.jsx's own
// noteLabel() already uses, so "c/4" here is always the same physical key
// as "C4" there).
export function midiToVexKey(midi) {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${LETTER_VEX[pitchClass]}/${octave}`;
}

// A single stave (treble or bass) showing one or more notes — the reusable
// "here's a note/notes on the page" teaching aid the piano curriculum's
// notation lessons and note-reading quiz both need. Same prop-driven,
// VexFlow-SVG-into-a-ref pattern as GuitarNotation.jsx (this app's existing,
// working VexFlow integration) — reused deliberately rather than a second,
// differently-shaped notation renderer.
export function StaffNotation({ notes = [], clef = 'treble', width = STAVE_WIDTH, height = STAVE_HEIGHT, highlightMidi = null }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    if (notes.length === 0) return;

    const renderer = new Renderer(container, RendererBackends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();

    const stave = new Stave(10, 0, width - 20);
    stave.addClef(clef);
    stave.setContext(context).draw();

    const staveNotes = notes.map((n) => {
      const staveNote = new StaveNote({ clef, keys: [midiToVexKey(n.midi)], duration: n.duration ?? 'q' });
      const color = highlightMidi != null && n.midi === highlightMidi ? HIGHLIGHT_COLOR : DEFAULT_COLOR;
      staveNote.setStyle({ fillStyle: color, strokeStyle: color });
      return staveNote;
    });

    // setStrict(false) means the voice doesn't need to exactly fill a
    // measure — numBeats just needs to be "big enough"; notes.length (each
    // duration defaults to a quarter note = 1 beat) is a safe upper bound
    // without needing to hand-parse VexFlow's own tick-duration values.
    const voice = new Voice({ numBeats: Math.max(1, notes.length), beatValue: 4 }).setStrict(false);
    voice.addTickables(staveNotes);
    new Formatter().joinVoices([voice]).format([voice], width - 60);
    voice.draw(context, stave);
  }, [notes, clef, width, height, highlightMidi]);

  return <div ref={containerRef} className="staff-notation" />;
}

// Two staves (treble above, bass below) — a simplified Grand Staff: each
// half is its own independent StaffNotation/VexFlow render rather than one
// literal braced/connected grand-stave object, which keeps this component
// simple and low-risk while still teaching the real concept (treble reads
// notes at and above Middle C, bass reads notes at and below it, and Middle
// C itself can appear on a ledger line under either).
export function GrandStaff({ trebleNotes = [], bassNotes = [], width = STAVE_WIDTH, highlightMidi = null }) {
  return (
    <div className="grand-staff">
      <StaffNotation notes={trebleNotes} clef="treble" width={width} highlightMidi={highlightMidi} />
      <StaffNotation notes={bassNotes} clef="bass" width={width} highlightMidi={highlightMidi} />
    </div>
  );
}
