import { useEffect, useRef } from 'react';
import { useVexflow } from './vexflow';
import './StaffNotation.css';

const STAVE_WIDTH = 200;
const STAVE_HEIGHT = 100;
const HIGHLIGHT_COLOR = '#34c759'; // same green GuitarNotation.jsx uses for "matched"
const DEFAULT_COLOR = 'var(--vex-note-color, #444)';

const LETTER_VEX = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
const LETTER_VEX_FLAT = ['c', 'db', 'd', 'eb', 'e', 'f', 'gb', 'g', 'ab', 'a', 'bb', 'b'];
// v1.0.299: pitch classes a key signature already sharpens / flattens.
const KEY_SIG_PCS = { C: [], Am: [], G: [6], Em: [6], D: [6, 1], Bm: [6, 1], F: [10], Dm: [10], Bb: [10, 3], Gm: [10, 3] };
const FLAT_KEYS = new Set(['F', 'Dm', 'Bb', 'Gm']);

// "60" (Middle C) -> "c/4" — VexFlow's own key format (letter/octave, same
// scientific-pitch-notation octave numbering PianoKeyboard.jsx's own
// noteLabel() already uses, so "c/4" here is always the same physical key
// as "C4" there).
export function midiToVexKey(midi, flats = false) {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${(flats ? LETTER_VEX_FLAT : LETTER_VEX)[pitchClass]}/${octave}`;
}

// A single stave (treble or bass) showing one or more notes — the reusable
// "here's a note/notes on the page" teaching aid the piano curriculum's
// notation lessons and note-reading quiz both need. Same prop-driven,
// VexFlow-SVG-into-a-ref pattern as GuitarNotation.jsx (this app's existing,
// working VexFlow integration) — reused deliberately rather than a second,
// differently-shaped notation renderer.
export function StaffNotation({ notes = [], clef = 'treble', width = STAVE_WIDTH, height = STAVE_HEIGHT, highlightMidi = null, keySig = null }) {
  const containerRef = useRef(null);

  const VF = useVexflow();
  useEffect(() => {
    if (!VF) return;
    const { Renderer, RendererBackends, Stave, StaveNote, Voice, Formatter, Accidental, Dot } = VF;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    if (notes.length === 0) return;

    const renderer = new Renderer(container, RendererBackends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();

    const stave = new Stave(10, 0, width - 20);
    stave.addClef(clef);
    if (keySig && KEY_SIG_PCS[keySig]?.length) stave.addKeySignature(keySig);
    stave.setContext(context).draw();

    const staveNotes = notes.map((n) => {
      // v1.0.299: accidentals outside the key signature and dotted notes are drawn.
      const flats = keySig ? FLAT_KEYS.has(keySig) : !!n.flat;
      const key = midiToVexKey(n.midi, flats);
      const staveNote = new StaveNote({ clef, keys: [key], duration: n.duration ?? 'q' });
      const pc = ((n.midi % 12) + 12) % 12;
      const acc = key.split('/')[0].slice(1);
      if (acc && Accidental && !(KEY_SIG_PCS[keySig] ?? []).includes(pc)) staveNote.addModifier(new Accidental(acc), 0);
      if (/d$/.test(n.duration ?? '') && Dot) Dot.buildAndAttach([staveNote], { all: true });
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
    // v1.0.299: format into the room after the clef / key signature, so the last note isn't cut
    new Formatter().joinVoices([voice]).format([voice], Math.max(60, stave.getNoteEndX() - stave.getNoteStartX() - 16));
    voice.draw(context, stave);
  }, [VF, notes, clef, width, height, highlightMidi, keySig]);

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
