import { useEffect, useRef } from 'react';
import { Renderer, RendererBackends, TabStave, TabNote, Voice, Formatter, Annotation } from 'vexflow';
import { STANDARD_TUNING } from '../../music/notes';
import { TECHNIQUE_ACTION_COLOR } from '../../styles/colors';
import './LickNotation.css';

const NOTE_WIDTH = 55;
const STAVE_PADDING = 60;
const STAVE_HEIGHT = 140;
const TECHNIQUE_GLYPH = { bend: 'b', slide: '/', hammer: 'h', pull: 'p', vibrato: '~' };

// A lick's notes use STANDARD_TUNING's own 0-5 array index (0 = low E ... 5
// = high E — see music/licks.js's header comment), not VexFlow's traditional
// tab string number (1 = highest string). Same conversion direction as
// Fretboard.jsx's overlayStringIndex, just inverted (that one goes the other
// way, real string number -> array index).
function vexflowString(arrayIndex) {
  return STANDARD_TUNING.length - arrayIndex;
}

// Multi-note guitar tab renderer for a full lick (as opposed to
// GuitarNotation.jsx's single-target-note tuner display) — one measure,
// one note per beat (rhythm isn't notated precisely, matching this app's
// existing "read the sequence, hear the real timing on playback" approach
// already used by LickPanel's note-chip row). `activeIndex` highlights
// whichever note is currently sounding during playback.
export function LickNotation({ notes, activeIndex = null }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    if (!notes || notes.length === 0) return;

    const width = STAVE_PADDING + notes.length * NOTE_WIDTH;
    const renderer = new Renderer(container, RendererBackends.SVG);
    renderer.resize(width, STAVE_HEIGHT);
    const context = renderer.getContext();

    const stave = new TabStave(10, 10, width - 20);
    stave.addClef('tab');
    stave.setContext(context).draw();

    const tabNotes = notes.map((n, i) => {
      const tabNote = new TabNote({
        positions: [{ str: vexflowString(n.string), fret: n.fret }],
        duration: 'q',
      });
      const isActive = activeIndex === i;
      const color = isActive ? TECHNIQUE_ACTION_COLOR : '#888';
      tabNote.setStyle({ fillStyle: color, strokeStyle: color });

      const glyph = TECHNIQUE_GLYPH[n.technique];
      if (glyph) {
        const annotation = new Annotation(glyph).setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
        tabNote.addModifier(annotation, 0);
      }
      return tabNote;
    });

    const voice = new Voice({ numBeats: notes.length, beatValue: 4 }).setStrict(false);
    voice.addTickables(tabNotes);
    new Formatter().joinVoices([voice]).format([voice], width - STAVE_PADDING);
    voice.draw(context, stave);
  }, [notes, activeIndex]);

  return <div ref={containerRef} className="lick-notation" />;
}
