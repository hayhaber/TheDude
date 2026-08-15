import { parseChordSymbol } from './chordSymbolParser';
import { enumeratePositions, dedupePositions } from './voicings';
import { enumerateTriadPositions } from './triads';
import { CHORD_QUALITIES } from './chordQualities';
import { spellTone, accidentalSymbol } from './spelling';
import { STANDARD_TUNING, MAX_FRET, mod } from './notes';

const TRIAD_ROLES = ['root', 'third', 'fifth'];

// Picks whichever octave of the bass pitch class lands closest to referenceFret,
// so the bass note stays within reach of the hand instead of always defaulting
// to the open-position fret.
export function nearestFretForPitch(pitchClass, stringIndex, referenceFret) {
  const openPitch = STANDARD_TUNING[stringIndex].pitchClass;
  const base = mod(pitchClass - openPitch, 12);
  let best = base;
  let bestDistance = Math.abs(base - referenceFret);
  for (const candidate of [base + 12, base + 24]) {
    if (candidate > MAX_FRET) continue;
    const distance = Math.abs(candidate - referenceFret);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return { fret: best, distance: bestDistance };
}

// A slash chord's bass note doesn't have to go on the low E string — it just
// has to be the lowest-sounding note. Try placing it on each of the two
// lowest strings (muting everything below it) and keep whichever requires
// the smallest stretch from the rest of the shape, so e.g. "A/D" puts the D
// on the A string (fret 5) instead of a five-fret reach on the low E.
function placeBassNote(position, bassPitchClass, bassLabel) {
  const candidates = [0, 1].map((stringIndex) => {
    const rest = position.strings.slice(stringIndex + 1).map((s) => s.fret).filter((f) => f !== null);
    const referenceFret = rest.length > 0
      ? rest.reduce((sum, f) => sum + f, 0) / rest.length
      : position.baseFret;
    const { fret, distance } = nearestFretForPitch(bassPitchClass, stringIndex, referenceFret);
    return { stringIndex, fret, distance };
  });

  candidates.sort((a, b) => a.distance - b.distance || a.stringIndex - b.stringIndex);
  const best = candidates[0];

  const mutedBelow = Array.from({ length: best.stringIndex }, () => ({ fret: null }));
  return {
    ...position,
    strings: [
      ...mutedBelow,
      { fret: best.fret, role: 'bass', label: bassLabel },
      ...position.strings.slice(best.stringIndex + 1),
    ],
  };
}

function attachLabels(rawPositions, tones, root) {
  return rawPositions.map((position) => ({
    ...position,
    strings: position.strings.map((s) => {
      if (s.fret === null) return s;
      const tone = tones.find((t) => t.role === s.role) ?? tones[0];
      const spelled = spellTone(root.letter, root.pitchClass, tone.degree, tone.semitones);
      return { ...s, label: spelled.label, degree: tone.degree };
    }),
  }));
}

// Pure computation of a chord symbol's playable positions — no React. Used
// both for a single active chord and, in App.jsx, for every chord in a
// progression at once (so their positions can be compared and synced by
// fret proximity). `mode` is 'chord' (full 6-string shapes) or 'triad'
// (3-notes-per-string-set, no duplicate pitches).
export function computeChordPositions(chordSymbol, mode = 'chord') {
  const parsed = parseChordSymbol(chordSymbol);
  if (!parsed) return { isValid: false, positions: [], bassNotInTriad: false, parsed: null };

  const quality = CHORD_QUALITIES[parsed.qualityKey];

  if (mode === 'triad') {
    const triadTones = quality.tones.filter((t) => TRIAD_ROLES.includes(t.role));
    const raw = enumerateTriadPositions(parsed.root.pitchClass, triadTones);
    const labeled = attachLabels(raw, triadTones, parsed.root);

    if (!parsed.bass) return { isValid: true, positions: labeled, bassNotInTriad: false, parsed };

    const matchingTone = triadTones.find(
      (t) => mod(parsed.root.pitchClass + t.semitones, 12) === parsed.bass.pitchClass
    );
    if (!matchingTone) return { isValid: true, positions: labeled, bassNotInTriad: true, parsed };

    const filtered = labeled.filter((p) => p.lowestRole === matchingTone.role);
    return { isValid: true, positions: filtered, bassNotInTriad: false, parsed };
  }

  const raw = enumeratePositions(parsed.root.pitchClass, parsed.qualityKey);
  let labeled = attachLabels(raw, quality.tones, parsed.root);

  // Slash chord (e.g. "C/G"): make the requested note the lowest-sounding
  // note, choosing whichever of the two lowest strings is most comfortable.
  if (parsed.bass) {
    const bassLabel = parsed.bass.letter + accidentalSymbol(parsed.bass.accidental);
    labeled = dedupePositions(
      labeled.map((position) => placeBassNote(position, parsed.bass.pitchClass, bassLabel))
    );
  }

  return { isValid: true, positions: labeled, bassNotInTriad: false, parsed };
}
