import { useEffect, useRef } from 'react';
import { Renderer, RendererBackends, TabStave, TabNote, Voice, Formatter } from 'vexflow';
import './GuitarNotation.css';

const STAVE_WIDTH = 260;
const STAVE_HEIGHT = 140;
const MATCHED_COLOR = '#34c759'; // same green used for correct feedback in PianoKeyboard.jsx

// Renders a single-note guitar tab target (string + fret) via VexFlow, in
// the app's "reusable, prop-driven" component style — accepts a target and
// a matched flag rather than owning any pitch-detection state itself, so it
// can be reused for other "here's a note, did you play it" contexts later.
export function GuitarNotation({ targetNote, isMatched, width = STAVE_WIDTH, height = STAVE_HEIGHT }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    if (!targetNote) return;

    const renderer = new Renderer(container, RendererBackends.SVG);
    renderer.resize(width, height);
    const context = renderer.getContext();

    const stave = new TabStave(10, 10, width - 20);
    stave.addClef('tab');
    stave.setContext(context).draw();

    const note = new TabNote({
      positions: [{ str: targetNote.stringNumber, fret: targetNote.fret }],
      duration: 'q',
    });
    const color = isMatched ? MATCHED_COLOR : '#888';
    note.setStyle({ fillStyle: color, strokeStyle: color });

    const voice = new Voice({ numBeats: 1, beatValue: 4 }).setStrict(false);
    voice.addTickables([note]);
    new Formatter().joinVoices([voice]).format([voice], width - 60);
    voice.draw(context, stave);
  }, [targetNote, isMatched, width, height]);

  return <div ref={containerRef} className="guitar-notation" />;
}
