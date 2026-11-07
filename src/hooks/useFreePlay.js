import { useCallback, useEffect, useRef, useState } from 'react';
import { usePitchDetection } from './usePitchDetection';
import { logPerf } from '../coach/perfLog';
import { midiToNoteName } from '../music/pitchUtils';

// FREE PLAY on a scale (Practice -> Scales "Free", Bass Practice "Free"):
// the neck shows the scale, the player plays ANY notes in ANY order and
// rhythm, and the mic checks only that each note belongs to the scale (the
// teachers' "noodle inside the box" exercise). Every note heard lights its
// place in the shown shape (coverage: which notes of the box you have used),
// a note outside the scale flashes red with the nearest scale notes named.
//
// The mic hears a PITCH, not a place on the neck: the same A sits on 3–5
// strings. A note is drawn where the shown shape has that pitch (the one
// nearest the last note when there are two), else at the nearest place to
// the shape — an estimate, said so in the UI. Bends / slides: only a pitch
// held steady (3 frames, within ±35 cents of a semitone) counts, so the way
// up a bend is not judged — its landing note is.

const STEADY_FRAMES = 3;
const MAX_CENTS = 35;
const FLASH_MS = 520;
const MIN_TO_LOG = 8;

const pcOf = (m) => ((m % 12) + 12) % 12;

/** Note onsets: a new steady pitch, or the same pitch picked again. */
function useSteadyOnsets(onNote, range) {
  const pitch = usePitchDetection(range);
  const cb = useRef(onNote);
  cb.current = onNote;
  const st = useRef({ armed: true, midi: null, frames: 0, minLevel: 1 });
  useEffect(() => {
    const s = st.current;
    const n = pitch.currentNote;
    const level = pitch.inputLevel ?? 0;
    if (!n || Math.abs(n.centsOff ?? 0) > MAX_CENTS) {
      if (!n) {
        s.armed = true;
        s.midi = null;
      }
      s.frames = 0;
      s.minLevel = Math.min(s.minLevel, level);
      return;
    }
    s.minLevel = Math.min(s.minLevel, level);
    if (!s.armed && level > s.minLevel * 1.6 && level - s.minLevel > 0.03) {
      s.armed = true;
      s.frames = 0;
    }
    if (n.midi !== s.midi) {
      s.midi = n.midi;
      s.frames = 0;
      s.armed = true;
    }
    s.frames += 1;
    if (s.armed && s.frames >= STEADY_FRAMES) {
      s.armed = false;
      s.minLevel = level;
      cb.current(n.midi);
    }
  }, [pitch.currentNote, pitch.inputLevel]);
  return pitch;
}

/**
 * Where a heard pitch goes on the neck: the shape's own place for it (or for
 * its octave — the detector's octave slips), else the nearest playable place
 * to the shape. Pure.
 */
export function placeNote(midi, shape, tuning, near = null) {
  const midiAt = (n) => tuning[n.string].baseMidi + n.fret;
  const center = near ?? centerOf(shape);
  const dist = (n) => Math.abs(n.string - center.string) * 1.4 + Math.abs(n.fret - center.fret);
  for (const m of [midi, midi - 12, midi + 12]) {
    const same = shape.filter((n) => midiAt(n) === m);
    if (same.length) return { ...same.sort((a, b) => dist(a) - dist(b))[0], inShape: true };
  }
  const cells = [];
  tuning.forEach((s, string) => {
    const fret = midi - s.baseMidi;
    if (fret >= 0 && fret <= 21) cells.push({ string, fret });
  });
  if (!cells.length) return null;
  return { ...cells.sort((a, b) => dist(a) - dist(b))[0], inShape: false };
}

function centerOf(shape) {
  if (!shape.length) return { string: 2, fret: 5 };
  const s = shape.reduce((a, n) => a + n.string, 0) / shape.length;
  const f = shape.reduce((a, n) => a + n.fret, 0) / shape.length;
  return { string: s, fret: f };
}

/** The nearest scale notes to a wrong pitch class: [{pc, dir: 'up'|'down', semis}]. */
export function nearestInScale(pc, pcs) {
  for (let d = 1; d <= 2; d += 1) {
    const out = [];
    if (pcs.has(pcOf(pc + d))) out.push({ pc: pcOf(pc + d), dir: 'up', semis: d });
    if (pcs.has(pcOf(pc - d))) out.push({ pc: pcOf(pc - d), dir: 'down', semis: d });
    if (out.length) return out;
  }
  return [];
}

/**
 * target = { shape: [{string, fret, noteName, degreeLabel, isRoot}], tuning,
 *            rootPc, log: {tool, item} }
 */
export function useFreePlay({ range } = {}) {
  const [phase, setPhase] = useState('idle'); // idle | run | done
  const [live, setLive] = useState(null); // { notes, inScale, wrong, last }
  const [hits, setHits] = useState(() => new Set()); // "string:fret" of shape notes played
  const [feedback, setFeedback] = useState(null); // { cell: {stringIndex, fret}, correct }
  const [result, setResult] = useState(null);
  const target = useRef(null);
  const S = useRef(null);
  const flashT = useRef(null);

  const onNote = useCallback((midi) => {
    const T = target.current;
    const R = S.current;
    if (!T || !R) return;
    const pc = pcOf(midi);
    const ok = T.pcs.has(pc);
    const cell = placeNote(midi, T.shape, T.tuning, R.lastCell);
    if (cell) R.lastCell = cell;
    R.notes += 1;
    if (ok) {
      R.inScale += 1;
      R.pcsPlayed.add(pc);
      if (pc === T.rootPc) R.roots += 1;
      if (cell?.inShape) {
        R.cells.add(cell.string + ':' + cell.fret);
        setHits(new Set(R.cells));
      } else R.outside += 1;
    } else {
      R.wrong += 1;
      R.wrongPcs[pc] = (R.wrongPcs[pc] ?? 0) + 1;
    }
    const last = { midi, name: midiToNoteName(midi), ok, inShape: !!cell?.inShape, near: ok ? [] : nearestInScale(pc, T.pcs) };
    setLive({ notes: R.notes, inScale: R.inScale, wrong: R.wrong, cover: R.cells.size, last });
    if (cell) {
      setFeedback({ cell: { stringIndex: cell.string, fret: cell.fret }, correct: ok });
      clearTimeout(flashT.current);
      flashT.current = setTimeout(() => setFeedback(null), FLASH_MS);
    }
  }, []);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const pitch = useSteadyOnsets((m) => phaseRef.current === 'run' && onNote(m), range);

  const start = useCallback(
    async (t) => {
      const pcs = new Set(t.shape.map((n) => pcOf(t.tuning[n.string].baseMidi + n.fret)));
      target.current = { ...t, pcs };
      S.current = { notes: 0, inScale: 0, wrong: 0, roots: 0, outside: 0, cells: new Set(), pcsPlayed: new Set(), wrongPcs: {}, lastCell: null, startedAt: Date.now() };
      setHits(new Set());
      setLive({ notes: 0, inScale: 0, wrong: 0, cover: 0, last: null });
      setResult(null);
      setFeedback(null);
      setPhase('run');
      if (!pitch.isListening) await pitch.startListening();
    },
    [pitch]
  );

  const stop = useCallback(() => {
    pitch.stopListening();
    const T = target.current;
    const R = S.current;
    if (!T || !R || phaseRef.current !== 'run') {
      setPhase('idle');
      return;
    }
    const inScalePct = R.notes ? Math.round((R.inScale / R.notes) * 100) : 0;
    const shapeCells = new Set(T.shape.map((n) => n.string + ':' + n.fret)).size;
    const coverPct = shapeCells ? Math.round((R.cells.size / shapeCells) * 100) : 0;
    // scale degrees never played (by pitch class, anywhere on the neck)
    const degreeOf = new Map();
    for (const n of T.shape) degreeOf.set(pcOf(T.tuning[n.string].baseMidi + n.fret), { label: n.degreeLabel, name: n.noteName });
    const missing = [...degreeOf.entries()].filter(([pc]) => !R.pcsPlayed.has(pc)).map(([, d]) => d);
    const wrongList = Object.entries(R.wrongPcs)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pc, count]) => ({ name: midiToNoteName(60 + Number(pc)).replace(/\d+$/, ''), count, near: nearestInScale(Number(pc), T.pcs) }));
    const res = { notes: R.notes, inScalePct, coverPct, cover: R.cells.size, shapeCells, missing, wrongList, roots: R.roots, outside: R.outside, durationMs: Date.now() - R.startedAt };
    setResult(res);
    setPhase('done');
    if (R.notes >= MIN_TO_LOG && T.log?.tool) {
      logPerf({ tool: T.log.tool, item: T.log.item ?? '', durationMs: res.durationMs, metrics: { notes: R.notes, inScalePct, coverPct, mode: 'free' } });
    }
  }, [pitch]);

  const reset = useCallback(() => {
    if (phaseRef.current === 'run') pitch.stopListening();
    setPhase('idle');
    setLive(null);
    setResult(null);
    setHits(new Set());
    setFeedback(null);
  }, [pitch]);

  useEffect(() => () => clearTimeout(flashT.current), []);

  return { phase, live, hits, feedback, result, start, stop, reset, pitch, isPlaying: phase === 'run' };
}
