import { parseChordSymbol } from './chordSymbolParser';
import { spellTone, accidentalSymbol } from './spelling';
import {
  LICKS,
  resolveLickQuality,
  ARTIST_STYLE,
  ARTIST_DIFFICULTY,
  ARTIST_PACE,
  scaleLabelForQuality,
} from './licks';
import { nearestFretForPitch } from './computeChordPositions';
import { classifyChordTone } from './noteFunction';
import { emotionProfile } from './emotionEngine';
import { mod, MAX_FRET } from './notes';

const TECHNIQUE_LABEL = {
  bend: 'Bend',
  slide: 'Slide',
  hammer: 'Hammer-on',
  pull: 'Pull-off',
  vibrato: 'Vibrato',
};

// A rough, standard guitar "position" name from the fret range actually
// used — position is a property of *where the shape landed*, not something
// fixed per lick, since the same lick anchors to wherever the current chord
// shape is.
function positionLabel(frets) {
  if (frets.length === 0) return 'Open position';
  const minFret = Math.min(...frets);
  if (minFret <= 3) return 'Open position';
  return `${minFret}th position`;
}

// Techniques actually present in the notes, plus the two spec techniques
// that describe the *overall* playing approach rather than a single note:
// Legato when the lick strings hammer-ons/pull-offs together, Alternate
// Picking as the default when it doesn't use either.
function techniquesUsed(template) {
  const set = new Set(template.map((n) => n.technique).filter(Boolean).map((t) => TECHNIQUE_LABEL[t]));
  const hasHammer = template.some((n) => n.technique === 'hammer');
  const hasPull = template.some((n) => n.technique === 'pull');
  if (hasHammer && hasPull) set.add('Legato');
  if (!hasHammer && !hasPull && !template.some((n) => n.technique === 'slide')) set.add('Alternate Picking');
  return [...set];
}

// Picks a variation index different from `excludeIndex` when there's more
// than one option (this is what "Regenerate" relies on to avoid repeats).
function pickVariationIndex(count, excludeIndex) {
  if (count <= 1) return 0;
  let index = Math.floor(Math.random() * count);
  if (index === excludeIndex) index = (index + 1) % count;
  return index;
}

// Drops one interior note (never first/last) for emotions whose density is
// 'sparse' — a more deliberate, spacious phrase — renumbering afterward.
// Mirrors motifDevelopment.js's Variation transform; kept local since this
// runs at generation time, before a "lick" object exists to hand it to.
function thinOut(notes) {
  if (notes.length <= 3) return notes;
  const dropIndex = Math.floor(notes.length / 2);
  return notes.filter((_, i) => i !== dropIndex).map((n, i) => ({ ...n, order: i + 1 }));
}

// Resolves one specific (artist, quality, variation) template into concrete
// frets near `referenceFret`/`chordSymbol`'s root, reusing the same
// "closest occurrence of this pitch class to a reference fret" logic
// already used for slash-chord bass placement. Shared by generateLick
// (random/excludable variation, tied to whatever's active in Compose) below
// and music/lickLibrary.js (every variation, resolved once at a fixed
// reference key/position, for browsing independent of Compose).
function resolveLickNotes({ artistKey, qualityKey, variationIndex, parsed, referenceFret, emotionKey }) {
  const template = LICKS[artistKey][qualityKey][variationIndex];
  const emotion = emotionProfile(emotionKey);
  const pace = (ARTIST_PACE[artistKey] ?? 1) * (emotion?.pace ?? 1);

  let notes = template
    .map((noteTone, order) => {
      const pitchClass = mod(parsed.root.pitchClass + noteTone.semitones, 12);
      const { fret } = nearestFretForPitch(pitchClass, noteTone.string, referenceFret);
      if (fret > MAX_FRET) return null;
      const spelled = spellTone(parsed.root.letter, parsed.root.pitchClass, noteTone.degree, noteTone.semitones);
      // Classified against the chord actually being played (parsed.qualityKey),
      // not the lick-template quality used above — those can differ when a
      // lick was borrowed via the fallback chain (e.g. a sus4 chord playing
      // a major-quality lick template).
      const role = classifyChordTone(parsed.qualityKey, noteTone.degree, noteTone.semitones);
      const note = {
        order: order + 1,
        string: noteTone.string,
        fret,
        label: spelled.label,
        technique: noteTone.technique,
        role,
        degree: noteTone.degree,
        durationMultiplier: pace,
      };
      if (emotion && noteTone.technique === 'bend') note.bendSemitones = emotion.bendSemitones;
      if (emotion && noteTone.technique === 'vibrato') {
        note.vibratoRate = emotion.vibratoRate;
        note.vibratoDepth = emotion.vibratoDepth;
      }
      return note;
    })
    .filter(Boolean);

  if (emotion?.density === 'sparse') notes = thinOut(notes);

  return { notes, template };
}

function buildLickResult({ artistKey, qualityKey, chordSymbol, parsed, variationIndex, notes, template, emotionKey }) {
  const rootLabel = parsed.root.letter + accidentalSymbol(parsed.root.accidental);
  return {
    artistKey,
    qualityKey,
    chordSymbol,
    variationIndex,
    emotionKey,
    notes,
    difficulty: ARTIST_DIFFICULTY[artistKey],
    style: ARTIST_STYLE[artistKey],
    scale: `${rootLabel} ${scaleLabelForQuality(qualityKey)}`,
    position: positionLabel(notes.map((n) => n.fret).filter((f) => f !== 0)),
    techniques: techniquesUsed(template),
  };
}

// `emotionKey` (spec #9) adapts pace, density, and bend/vibrato intensity —
// see music/emotionEngine.js — without ever changing which pitches are
// played, so the result never clashes with the chord's actual harmony.
export function generateLick({ artistKey, chordSymbol, position, excludeIndex = -1, emotionKey = null }) {
  const parsed = parseChordSymbol(chordSymbol);
  if (!parsed || !position) return null;

  const qualityKey = resolveLickQuality(artistKey, parsed.qualityKey);
  if (!qualityKey) return null;

  const variationIndex = pickVariationIndex(LICKS[artistKey][qualityKey].length, excludeIndex);
  const referenceFret = position.baseFret ?? 0;
  const { notes, template } = resolveLickNotes({ artistKey, qualityKey, variationIndex, parsed, referenceFret, emotionKey });

  return buildLickResult({ artistKey, qualityKey, chordSymbol, parsed, variationIndex, notes, template, emotionKey });
}

// Resolves one exact variation (no random pick) at a fixed reference
// key/position — what music/lickLibrary.js uses to pre-build a full,
// browsable catalog of every curated lick, independent of whatever chord
// happens to be active in Compose.
export function resolveLickVariation({ artistKey, qualityKey, variationIndex, chordSymbol, referenceFret = 0 }) {
  const parsed = parseChordSymbol(chordSymbol);
  if (!parsed) return null;
  const { notes, template } = resolveLickNotes({ artistKey, qualityKey, variationIndex, parsed, referenceFret, emotionKey: null });
  return buildLickResult({ artistKey, qualityKey, chordSymbol, parsed, variationIndex, notes, template, emotionKey: null });
}
