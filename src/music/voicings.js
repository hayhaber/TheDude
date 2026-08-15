import { STANDARD_TUNING, MAX_FRET, mod } from './notes';
import { SHAPE_TEMPLATES } from './shapeTemplates';

// Slides a shape template up the neck so its root lands on targetRootPitchClass.
// Returns every octave-transposition that still fits within MAX_FRET (0-24).
function transposeShape(template, targetRootPitchClass) {
  const anchorIndex = template.strings.findIndex((s) => s.role === 'root');
  if (anchorIndex === -1) {
    throw new Error(`Shape "${template.name}" has no string tagged role: 'root'`);
  }
  const anchorOpenPitch = STANDARD_TUNING[anchorIndex].pitchClass;
  const anchorFret = template.strings[anchorIndex].fret;
  const templateRootPitch = mod(anchorOpenPitch + anchorFret, 12);

  // Always 0-11 because of the mod — this is what guarantees we never
  // produce a negative fret below.
  const baseOffset = mod(targetRootPitchClass - templateRootPitch, 12);

  const results = [];
  for (let octave = 0; octave <= 2; octave += 1) {
    const offset = baseOffset + 12 * octave;
    const strings = template.strings.map((s) =>
      s.fret === null ? { fret: null } : { fret: s.fret + offset, role: s.role }
    );
    const maxFretUsed = Math.max(...strings.filter((s) => s.fret !== null).map((s) => s.fret));
    if (maxFretUsed <= MAX_FRET) {
      results.push({
        shapeName: offset === 0 ? 'Open' : template.name,
        baseFret: offset,
        strings,
      });
    }
  }
  return results;
}

export function dedupePositions(positions) {
  const seen = new Map();
  for (const p of positions) {
    const key = p.strings.map((s) => (s.fret === null ? 'x' : s.fret)).join('-');
    if (!seen.has(key)) seen.set(key, p);
  }
  return [...seen.values()];
}

// Returns every playable position for a chord, sorted low-fret-first.
export function enumeratePositions(rootPitchClass, qualityKey) {
  const templates = SHAPE_TEMPLATES[qualityKey] ?? [];
  const all = templates.flatMap((t) => transposeShape(t, rootPitchClass));
  const deduped = dedupePositions(all);
  deduped.sort((a, b) => a.baseFret - b.baseFret);
  return deduped;
}
