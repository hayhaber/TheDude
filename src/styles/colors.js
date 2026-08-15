// Apple's iOS/macOS system color palette — enough visual separation to tell
// chords apart at a glance, while staying consistent with the app's look.
const PALETTE = [
  '#ff3b30', // systemRed
  '#ff9500', // systemOrange
  '#ffcc00', // systemYellow
  '#34c759', // systemGreen
  '#00c7be', // systemMint
  '#30b0c7', // systemTeal
  '#007aff', // systemBlue
  '#5856d6', // systemIndigo
  '#af52de', // systemPurple
  '#ff2d55', // systemPink
];

function indexForChord(chordSymbol) {
  let hash = 0;
  for (let i = 0; i < chordSymbol.length; i += 1) {
    hash = (hash * 31 + chordSymbol.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % PALETTE.length;
}

// Deterministic: the same chord symbol always gets the same color.
export function colorForChord(chordSymbol) {
  return PALETTE[indexForChord(chordSymbol)];
}

// How many steps apart two palette entries sit going around the wheel in
// either direction — PALETTE is ordered by hue (red -> orange -> ... ->
// pink -> wraps back to red), so a small circular distance means the two
// colors actually look close (e.g. systemMint next to systemTeal).
function circularDistance(a, b, len) {
  const diff = Math.abs(a - b) % len;
  return Math.min(diff, len - diff);
}

// Color for a chord shown alongside another chord that's already using
// `currentColor` (e.g. the fretboard's "next chord" landing-note preview
// next to the current chord's own dots) — plain colorForChord() has no idea
// what's already on screen, so two independently-hashed chords can land on
// neighboring hues (mint/teal, blue/indigo) that read as nearly the same
// color side by side. This nudges the second color at least 2 steps around
// the wheel from the first whenever they'd otherwise collide.
export function colorForNextChord(nextChordSymbol, currentColor) {
  const nextIndex = indexForChord(nextChordSymbol);
  const currentIndex = PALETTE.indexOf(currentColor);
  if (currentIndex === -1 || circularDistance(nextIndex, currentIndex, PALETTE.length) >= 2) {
    return PALETTE[nextIndex];
  }
  return PALETTE[(nextIndex + Math.floor(PALETTE.length / 2)) % PALETTE.length];
}

// Chord-tone dot color whenever a caller doesn't supply its own chordColor
// (e.g. Studies -> CAGED's shape lessons, which show one fixed reference
// chord rather than a hashed-per-chord color) — without this, Fretboard's
// `fill` ends up unset and SVG's own built-in default (plain black) shows
// through instead, which reads as flat and hard to distinguish from text.
export const DEFAULT_CHORD_COLOR = '#4073bd';

export const MUTED_DOT_COLOR = '#8e8e93'; // systemGray

// Doesn't collide with any PALETTE entry or MUTED_DOT_COLOR — used for lick
// note markers so they read as distinct from chord-tone dots.
export const LICK_MARKER_COLOR = '#a2845e'; // systemBrown

// Studies -> Technique & Guitar Masters fretboard overlay (Note/Chord dots,
// Slide/HammerOn/PullOff arrows, Bend arcs) — distinct from every other
// dot/marker color already in use above.
export const TECHNIQUE_ACTION_COLOR = '#ff2d55'; // systemPink

// Chord Tone Highlighting mode: color by harmonic function instead of by
// chord. Root=gold, 3rd=green, 5th=blue, 7th=purple, extensions=yellow,
// passing tones=gray — matches src/music/noteFunction.js's role names.
// Root is deliberately NOT red: red is reserved app-wide (--danger, the
// scale-degree "clashing borrowed chord" marker in ScaleAnalysisPanel) for
// "this tone doesn't fit, avoid it" — the exact opposite meaning of "this is
// the root," so sharing that color made the root note read as a warning.
export const NOTE_FUNCTION_COLORS = {
  root: '#d4af37', // gold — distinct from extension's #ffcc00 yellow below
  third: '#34c759', // systemGreen
  fifth: '#007aff', // systemBlue
  seventh: '#af52de', // systemPurple
  extension: '#ffcc00', // systemYellow
  passing: '#8e8e93', // systemGray
};

// Compose -> Smooth (triad voice-leading) overlay: pivot notes (fingers that
// stay put between chords) vs. moving notes (the finger(s) that shift) need
// to read as clearly different from each other at a glance, and from the
// TECHNIQUE_ACTION_COLOR dots this same overlay area can otherwise show —
// a warm gold vs. the app's own --accent blue keeps them apart without
// reusing any PALETTE hue.
export const VOICE_LEADING_PIVOT_COLOR = '#ffd60a';
export const VOICE_LEADING_MOVING_COLOR = 'var(--accent)';
