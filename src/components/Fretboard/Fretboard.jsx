import { useEffect, useMemo, useState } from 'react';
import { STANDARD_TUNING, MAX_FRET, FRET_MARKERS, DOUBLE_DOT_FRETS } from '../../music/notes';
import { MUTED_DOT_COLOR, LICK_MARKER_COLOR, NOTE_FUNCTION_COLORS, TECHNIQUE_ACTION_COLOR, VOICE_LEADING_PIVOT_COLOR, VOICE_LEADING_MOVING_COLOR, DEFAULT_CHORD_COLOR, colorForChord } from '../../styles/colors';
import { assignFingers } from '../../music/fingering';
import { playNote } from '../../audio/chordPlayer';
import { useLanguage } from '../../i18n/LanguageContext';
import { translateTransitionLabel } from '../../i18n/roadmapLabels';
import './Fretboard.css';

// Back to the original, larger scale, now bumped up twice more by 10% each
// time (1.1 * 1.1 — see NECK_SCALE). It was shrunk earlier to fit more of
// the 24-fret neck in view without scrolling, but now that the Fretboard
// pages through a fixed WINDOW_FRETS-wide slice instead of scrolling
// through the whole neck at once (see windowStart below), "frets visible at
// once" is already capped independently of this scale — so there's no
// longer a tradeoff.
const NECK_SCALE = 1.331;
// Narrows the neck (string spacing, dot size, top/bottom margins) by 10%
// without touching its length — FRET_WIDTH/NECK_LEFT (how far the neck
// extends per fret) still use NECK_SCALE alone, unchanged.
const NECK_WIDTH_SCALE = NECK_SCALE * 0.9;
const FRET_WIDTH = 60 * NECK_SCALE;
const STRING_GAP = 28 * NECK_WIDTH_SCALE;
const NECK_LEFT = 70 * NECK_SCALE;
const NECK_TOP = 40 * NECK_WIDTH_SCALE;
const NUT_WIDTH = 8 * NECK_SCALE;
const FRET_WIRE_WIDTH = 3 * NECK_SCALE;
const DOT_RADIUS = 12 * NECK_WIDTH_SCALE;
const LICK_DOT_RADIUS = 9 * NECK_WIDTH_SCALE;
const SURFACE_MARGIN = 16 * NECK_WIDTH_SCALE; // wood/binding overhang above/below the outer strings
// Position Roadmap track, in the margin above the nut (NECK_TOP ≈ 53) —
// spaced out further than a first pass (12/21/31) so the chord label, pin,
// and transition label each get more room to stay legible on their own,
// independent of how close two adjacent roadmap steps land horizontally.
const ROADMAP_CHORD_Y = 11;
const ROADMAP_PIN_Y = 26;
const ROADMAP_TRANSITION_Y = 42;
// The roadmap chord label's own glyph ascent (17px bold, baseline at
// ROADMAP_CHORD_Y=11) plus its halo's 4px stroke reach a little above y=0 —
// this pads the viewBox's top edge so that's never clipped, the same way
// SURFACE_MARGIN pads the other 3 edges of the visible neck.
const VIEWBOX_TOP_MARGIN = 8;
// Contextual paging instead of a permanently-scrollable neck: only this many
// frets are visible at once (via the SVG viewBox, not browser scroll — see
// the windowStart state below), with Prev/Next controls that only render
// when there's actually more neck in that direction.
//
// Lowered from 19 (previous session) so the +10%-bigger request actually
// shows up on screen: at typical desktop widths the neck's natural size
// already exceeds its container, so .fretboard-svg's max-width:100% clamps
// it down regardless of NECK_SCALE — under that clamp, rendered per-fret
// size is container-width / WINDOW_FRETS, independent of NECK_SCALE
// entirely. 19 -> 17 gives ~+12% per-fret width at a typical container size
// (measured), matching the requested increase; NECK_SCALE alone (1.21 ->
// 1.331) could not, on its own, produce any visible change.
const WINDOW_FRETS_DESKTOP = 17;

// Showing all 17 frets on a narrow phone squeezes the whole neck (and every
// label on it — fret numbers, note names, the roadmap track) down to a
// fraction of its natural size, which is what actually made those labels
// unreadable/crowded on mobile — not a positioning bug at any single size.
// Fewer frets per "page" on a narrow viewport keeps each fret (and its
// labels) closer to a legible physical size, at the cost of more paging.
function useWindowFrets() {
  const getCount = () => {
    if (typeof window === 'undefined') return WINDOW_FRETS_DESKTOP;
    const w = window.innerWidth;
    if (w < 480) return 7;
    if (w < 768) return 11;
    return WINDOW_FRETS_DESKTOP;
  };
  const [count, setCount] = useState(getCount);
  useEffect(() => {
    function onResize() {
      setCount(getCount());
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return count;
}

const TECHNIQUE_GLYPH = { bend: 'b', slide: '/', hammer: 'h', pull: 'p', vibrato: '~' };

// Technique & Guitar Masters overlay: fretboardMapping.positions use real
// guitar string numbers (1-6, per the data schema) — Fretboard's own
// stringY()/positionsByString elsewhere all index by STANDARD_TUNING's
// array position instead (0 = string 6/low E ... 5 = string 1/high E), so
// every overlay position needs this conversion before it can be drawn.
function overlayStringIndex(stringNumber) {
  return STANDARD_TUNING.length - stringNumber;
}

const BEND_STEP_LABELS = { 0.5: '½', 1: '1', 1.5: '1½', 2: '2' };
function bendStepLabel(step) {
  return BEND_STEP_LABELS[step] ?? String(step);
}

// Real electric-guitar string gauges are roughly a 4:1 thickness ratio
// low-E to high-E — index 0..2 (STANDARD_TUNING's low-E/A/D) are wound,
// 3..5 (G/B/high-E) are plain, matching a standard electric set (plain G).
// Pre-NECK_SCALE px; multiplied by NECK_SCALE at render time like every
// other dimension on this neck.
const STRING_GAUGE = [4.6, 3.8, 3.0, 2.2, 1.6, 1.2];
const WOUND_STRING_COUNT = 3;

// Heat Map note-importance tiers — chord tones already get the full-size
// dots elsewhere, so this only covers what's layered underneath them.
// Radii bumped up across the board (per explicit feedback that the markers
// were hard to make out on the actual neck), and avoid notes bumped further
// still plus taken to full opacity — that's the one tier a player most needs
// to actually notice, not just another faint tier dot (see the matching
// .heat-map-avoid glow in Fretboard.css).
const HEAT_MAP_TIER_STYLE = {
  scale: { radius: 7, opacity: 0.55, className: 'heat-map-scale' },
  // Opacity raised from 0.3 — the new purple needs a bit more strength than
  // the old plain gray did to actually read as its own color rather than a
  // faint smudge.
  passing: { radius: 5, opacity: 0.6, className: 'heat-map-passing' },
  avoid: { radius: 7, opacity: 0.9, className: 'heat-map-avoid' },
};

// Practice Drill note tiers — Static Overview uses 'all'/'start'; Live
// Playback uses 'current'/'next'/'past'.
// Radii scaled by NECK_WIDTH_SCALE (like DOT_RADIUS etc. above) rather than
// fixed — kept in step with the rest of the neck's (narrowed) string
// spacing, and roomy enough for a 2-digit sequence number (noteLabelMode:
// 'order', see usePracticeDrill) to actually fit inside the dot, not just a
// single note-name letter.
const DRILL_TIER_STYLE = {
  all: { radius: 11 * NECK_WIDTH_SCALE, opacity: 0.35, className: 'drill-dot-all' },
  start: { radius: 14 * NECK_WIDTH_SCALE, opacity: 0.9, className: 'drill-dot-start' },
  current: { radius: 15 * NECK_WIDTH_SCALE, opacity: 1, className: 'drill-dot-current' },
  next: { radius: 11 * NECK_WIDTH_SCALE, opacity: 0.55, className: 'drill-dot-next' },
  past: { radius: 9 * NECK_WIDTH_SCALE, opacity: 0.18, className: 'drill-dot-past' },
};

// STANDARD_TUNING is low-to-high (string 6 -> string 1). We draw string 6
// (low E) at the bottom and string 1 (high E) at the top — the player's-eye
// view of the neck when looking down at the guitar in playing position.
export function Fretboard({
  position,
  chordColor = DEFAULT_CHORD_COLOR,
  labelMode = 'note',
  lick = null,
  playingNoteOrder = null,
  colorMode = 'chord',
  onNoteClick = null,
  landingNotes = [],
  // Falls back to the accent color if the caller doesn't know the upcoming
  // chord's own color (e.g. there's no "next chord" to derive one from).
  landingNotesColor = 'var(--accent)',
  heatMapNotes = [],
  roadmap = null,
  drillNotes = [],
  // Ear Training Quiz overlay — entirely additive/optional, used only by the
  // dedicated quiz Fretboard instance in EarTrainingModal (the main
  // chord-progression Fretboard never passes these, so its behavior is
  // unchanged). quizCells are clickable hit-targets restricted to the
  // current difficulty's strings/frets; quizRevealCells are non-interactive
  // markers (already-correct call & response notes, or an interval/triad
  // answer reveal); quizFeedbackCell flashes green/red at the clicked cell.
  quizCells = [],
  quizRevealCells = [],
  quizFeedbackCell = null,
  onQuizCellClick = null,
  // Studies -> Scales overlay — every fretboard position belonging to the
  // scale currently being shown, tagged with a degree label and whether
  // it's the root (see music/scaleShapes.js's computeScaleNotes). Entirely
  // additive, same pattern as drillNotes/heatMapNotes above.
  scaleNotes = [],
  // Studies -> Technique & Guitar Masters overlay — one exercise's
  // fretboardMapping.positions (see music/techniqueMastersCurriculum.js),
  // each tagged with an action (Note/Chord = plain dot, Slide/HammerOn/
  // PullOff = an arrow from fret to targetFret, Bend = a short upward arc
  // labeled with the bend's step size). activeOverlayStep highlights just
  // the position(s) belonging to the step currently animating; null shows
  // every step at full opacity (the static "preview all" state before
  // pressing Play in TechniqueMastersView).
  actionOverlay = [],
  activeOverlayStep = null,
  // Compose -> Smooth (triad voice-leading) overlay: one entry per fretted
  // string of the current step's chosen triad shape, already positioned by
  // App.jsx/ComposeView (see music/triadVoiceLeading.js) — this component
  // just draws it. `{string (STANDARD_TUNING index), fret, label, finger,
  // isPivot}`. Keyed by string index (not by note identity) so that when the
  // caller steps to the next chord and a note on the same string changes
  // fret, React reuses the same DOM node instead of remounting it — that's
  // what lets the CSS `transition: cx/cy` in Fretboard.css actually animate
  // the marker sliding to its new fret instead of just popping there. A note
  // that moves to a *different* string necessarily gets a new key (there's
  // no meaningful single element to slide between two different strings),
  // so that case still just appears/disappears rather than animating.
  voiceLeadingNotes = [],
  // Compose -> Capo: which fret (1-MAX_CAPO_FRET) a capo sits on, or 0/null
  // for none. Purely visual here — the actual pitch shift happens in
  // audio/chordPlayer.js's playPosition, and the chord-identity shift in
  // music/capo.js's soundingChordText; this just draws the bar so the neck
  // matches what Compose says.
  capoFret = 0,
}) {
  const { t } = useLanguage();
  const WINDOW_FRETS = useWindowFrets();
  const WINDOW_STEP = WINDOW_FRETS - 1; // one fret of overlap when paging, for context
  const neckHeight = NECK_TOP + STRING_GAP * (STANDARD_TUNING.length - 1) + 60;

  const stringY = (stringIndex) => NECK_TOP + (STANDARD_TUNING.length - 1 - stringIndex) * STRING_GAP;
  const fretX = (fretNumber) => NECK_LEFT + FRET_WIDTH * fretNumber;

  // The wood/binding surface's bounds — a real Les Paul fretboard extends a
  // little past the outer strings (top and bottom) and a little past the
  // last fret, so this is intentionally slightly larger than the
  // string1-to-string6 / nut-to-last-fret box everything else is measured
  // against.
  const surfaceTop = stringY(STANDARD_TUNING.length - 1) - SURFACE_MARGIN;
  const surfaceBottom = stringY(0) + SURFACE_MARGIN;
  const surfaceLeft = fretX(0) - 4;
  const surfaceRight = fretX(MAX_FRET) + SURFACE_MARGIN * 0.6;
  const bindingWidth = 3;

  const positionsByString = position?.strings ?? [];

  // Computed whenever there's a position, regardless of labelMode — the
  // barre bar below (drawn whenever one finger frets 2+ strings) is useful
  // in Note mode too, not just Fingering mode; only the dot *label* text
  // itself (labelFor, below) actually depends on labelMode.
  const fingers = useMemo(() => (position ? assignFingers(position) : null), [position]);

  function playStringNote(stringIndex, fret, info) {
    playNote(STANDARD_TUNING[stringIndex].baseMidi + fret);
    if (onNoteClick && info) onNoteClick({ string: stringIndex, fret, ...info });
  }

  // Chord Tone Highlighting: color by harmonic function instead of by chord.
  // Falls back to the muted/lick colors for a role we don't have a function
  // color for (shouldn't happen — every role in noteFunction.js is covered).
  function colorForRole(role, defaultColor) {
    if (colorMode !== 'function') return defaultColor;
    return NOTE_FUNCTION_COLORS[role] ?? defaultColor;
  }

  function labelFor(s, index) {
    if (labelMode !== 'finger') return s.label;
    if (s.fret === 0) return '0';
    return fingers?.[index] != null ? String(fingers[index]) : '';
  }

  // When the same finger frets 2+ strings at the same fret (a barre), draw a
  // bar connecting them — the standard chord-chart way of showing a barre.
  // Excludes a barre sitting exactly on the capo's fret: `position` here has
  // already been shifted by the capo (see App.jsx's applyCapoToPosition), so
  // a shape's former open strings (finger 0, never barred) now land exactly
  // at fret === capoFret and can get mistaken for a real finger barre by the
  // logic above — but the capo itself is already doing that barre, there's
  // nothing left for a finger to press there.
  const barres = useMemo(() => {
    if (!fingers) return [];
    const byFinger = new Map();
    positionsByString.forEach((s, i) => {
      if (s.fret === null || s.fret === 0) return;
      const finger = fingers[i];
      if (finger == null) return;
      if (!byFinger.has(finger)) byFinger.set(finger, []);
      byFinger.get(finger).push({ index: i, fret: s.fret });
    });

    const groups = [];
    byFinger.forEach((entries) => {
      if (entries.length < 2) return;
      const fret = entries[0].fret;
      if (!entries.every((e) => e.fret === fret)) return;
      if (capoFret && fret === capoFret) return;
      const indices = entries.map((e) => e.index);
      groups.push({ fret, minIndex: Math.min(...indices), maxIndex: Math.max(...indices) });
    });
    return groups;
  }, [fingers, positionsByString, capoFret]);

  // Compose -> Capo bar geometry — narrowed to 85% of a fret's width
  // (per explicit user feedback that a full-fret-width bar still read as
  // too thick/blocky) and re-centered on the same fret line so narrowing it
  // doesn't shift where it visually sits.
  const capoBarWidth = (FRET_WIDTH - 12 * NECK_SCALE) * 0.85;
  const capoBarX = capoFret > 0 ? fretX(capoFret) - FRET_WIDTH / 2 - capoBarWidth / 2 : 0;

  // Which WINDOW_FRETS-wide slice of the neck is currently visible — the
  // "camera," moved via the SVG viewBox below rather than browser scroll.
  const [windowStart, setWindowStart] = useState(0);
  const maxWindowStart = Math.max(0, MAX_FRET - WINDOW_FRETS);

  // Auto-frame the neck so the current shape/lick/drill/quiz is actually in
  // view whenever it *actually changes* — otherwise switching chords/
  // positions could leave the active shape off the edge of the visible
  // window with no feedback. Doesn't move at all if it's already fully
  // inside the current window (so paging via the Prev/Next buttons isn't
  // fought by this effect re-centering).
  //
  // The effect below depends on frameFretsKey (a primitive string), not on
  // the raw arrays/props directly — several of those (drillNotes, quizCells,
  // scaleNotes, actionOverlay, landingNotes when a caller doesn't pass them)
  // default to a fresh `[]` on every single render. With the raw arrays as
  // deps, that new-but-empty reference made the effect re-run on *every*
  // render, including the one right after a manual pageWindow() call — which
  // then always found the real chord position no longer "comfortably
  // visible" in the freshly-paged window and immediately snapped it back,
  // making Prev/Next look like it did nothing. Keying off content instead of
  // identity fixes that without changing the auto-frame behavior itself.
  const frameFrets = useMemo(
    () => [
      ...positionsByString.filter((s) => s.fret !== null && s.fret !== 0).map((s) => s.fret),
      ...(lick?.notes.map((n) => n.fret).filter((f) => f !== 0) ?? []),
      ...landingNotes.map((n) => n.fret).filter((f) => f !== 0),
      ...drillNotes.map((n) => n.fret).filter((f) => f !== 0),
      ...quizCells.map((c) => c.fret).filter((f) => f !== 0),
      ...scaleNotes.map((n) => n.fret).filter((f) => f !== 0),
      ...actionOverlay.flatMap((p) => [p.fret, p.targetFret]).filter((f) => f != null && f !== 0),
      ...voiceLeadingNotes.map((n) => n.fret).filter((f) => f !== 0),
      ...(capoFret ? [capoFret] : []),
    ],
    [position, lick, landingNotes, drillNotes, quizCells, scaleNotes, actionOverlay, voiceLeadingNotes, capoFret]
  );
  const frameFretsKey = frameFrets.join(',');

  useEffect(() => {
    if (frameFrets.length === 0) {
      setWindowStart(0);
      return;
    }

    const minFret = Math.min(...frameFrets);
    const maxFret = Math.max(...frameFrets);

    setWindowStart((prevStart) => {
      if (minFret >= prevStart && maxFret <= prevStart + WINDOW_FRETS) {
        return prevStart; // already comfortably visible — don't move
      }
      const span = maxFret - minFret;
      const desired = span >= WINDOW_FRETS ? minFret : minFret - Math.floor((WINDOW_FRETS - span) / 2);
      return Math.max(0, Math.min(maxWindowStart, desired));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameFretsKey]);

  function pageWindow(direction) {
    setWindowStart((prev) => Math.max(0, Math.min(maxWindowStart, prev + direction * WINDOW_STEP)));
  }

  const windowEndFret = windowStart + WINDOW_FRETS;
  // Leading margin kept identical on every page (not just windowStart===0)
  // — it used to be NECK_LEFT (~93 units, room for the nut + open-string
  // labels) on the first page but only 14 units on every later page. Since
  // windowEndFret - windowStart is always exactly WINDOW_FRETS (windowStart
  // is clamped to maxWindowStart so it never runs past MAX_FRET), that
  // mismatch made every non-first page's viewBox ~79 units (one fret)
  // narrower for the same WINDOW_FRETS worth of content — and since the SVG
  // is scaled to a fixed container width via .fretboard-svg's max-width, a
  // narrower viewBox for the same content rendered visibly bigger, so the
  // neck's apparent size changed depending on scroll position. Reserving
  // NECK_LEFT on every page makes the total viewBoxWidth a true constant
  // (NECK_LEFT + FRET_WIDTH*WINDOW_FRETS + SURFACE_MARGIN*0.6 + 14)
  // regardless of windowStart — later pages just reveal a bit more of the
  // previous frets on the left edge instead of blank space, since the whole
  // neck 0..MAX_FRET is always fully drawn underneath the viewBox "camera".
  const viewBoxX0 = fretX(windowStart) - NECK_LEFT;
  const viewBoxX1 = fretX(Math.min(windowEndFret, MAX_FRET)) + SURFACE_MARGIN * 0.6 + 14;
  const viewBoxWidth = viewBoxX1 - viewBoxX0;

  // Position Roadmap labels: several consecutive chords commonly share the
  // same baseFret (e.g. a run of open-position chords), which puts their
  // pins at the exact same cx — with plain center-anchored text that means
  // the labels stack directly on top of each other, unreadable regardless
  // of font size (the actual bug behind them appearing "on top of each
  // other"). Pins stay at their true, meaningful position; only the label
  // text is nudged rightward just enough to keep each one legible,
  // left-to-right in step order, with a short connector drawn back to the
  // real pin whenever a label had to move.
  const ROADMAP_LABEL_MIN_GAP = 26 * NECK_SCALE;
  const roadmapLabelX = useMemo(() => {
    if (!roadmap) return [];
    let lastX = -Infinity;
    return roadmap.steps.map((step) => {
      const trueCx = step.baseFret === 0 ? fretX(0) : fretX(step.baseFret) - FRET_WIDTH / 2;
      const x = Math.max(trueCx, lastX + ROADMAP_LABEL_MIN_GAP);
      lastX = x;
      return x;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap]);

  return (
    <div className="fretboard-scroll">
      {windowStart > 0 && (
        <button type="button" className="fretboard-page-btn fretboard-page-prev" onClick={() => pageWindow(-1)} aria-label={t('fretboard.pageDown')}>
          ‹
        </button>
      )}
      {windowEndFret < MAX_FRET && (
        <button type="button" className="fretboard-page-btn fretboard-page-next" onClick={() => pageWindow(1)} aria-label={t('fretboard.pageUp')}>
          ›
        </button>
      )}
      <svg
        className="fretboard-svg"
        viewBox={`${viewBoxX0} ${-VIEWBOX_TOP_MARGIN} ${viewBoxWidth} ${neckHeight + VIEWBOX_TOP_MARGIN}`}
        width={viewBoxWidth}
        height={neckHeight + VIEWBOX_TOP_MARGIN}
        role="img"
        aria-label={t('fretboard.aria')}
      >
        <defs>
          {/* Procedural rosewood grain: fractal noise reshaped into a dark,
              streaky alpha mask, then flooded with a wood-shadow color and
              merged over the solid wood base. Kept low-amplitude (see the
              feFuncA slope below) so it reads as texture, not noise. */}
          <filter id="wood-grain" x="-10%" y="-20%" width="120%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.011 0.09" numOctaves="4" seed="7" result="noise" />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.33 0.33 0.33 0 0"
              result="noiseAlpha"
            />
            <feComponentTransfer in="noiseAlpha" result="grainMask">
              <feFuncA type="linear" slope="0.4" intercept="0" />
            </feComponentTransfer>
            <feFlood floodColor="#140b07" floodOpacity="0.55" result="grainColor" />
            <feComposite in="grainColor" in2="grainMask" operator="in" result="grainLayer" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="grainLayer" />
            </feMerge>
          </filter>

          <linearGradient id="wood-base" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--fret-wood-light)" />
            <stop offset="45%" stopColor="var(--fret-wood-mid)" />
            <stop offset="100%" stopColor="var(--fret-wood-dark)" />
          </linearGradient>

          {/* Soft overhead sheen suggesting the fretboard's radiused camber. */}
          <linearGradient id="neck-sheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
          </linearGradient>

          <linearGradient id="fret-metal" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--fret-metal-dark)" />
            <stop offset="45%" stopColor="var(--fret-metal-light)" />
            <stop offset="100%" stopColor="var(--fret-metal-dark)" />
          </linearGradient>

          <linearGradient id="nut-bone" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--fret-metal-dark)" />
            <stop offset="30%" stopColor="var(--fret-nut)" />
            <stop offset="100%" stopColor="var(--fret-nut)" />
          </linearGradient>

          <linearGradient id="pearl-inlay" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="var(--fret-inlay-pearl)" />
            <stop offset="100%" stopColor="#cfc6ac" />
          </linearGradient>

          {/* Arrowhead for Technique & Guitar Masters overlay arrows (Slide/
              HammerOn/PullOff/Bend) — orient="auto-start-reverse" points it
              along whichever direction the path is drawn. */}
          <marker id="action-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={TECHNIQUE_ACTION_COLOR} />
          </marker>

          {/* String materials — plain strings (G/B/high-E) get a bright
              nickel/steel gradient reading as a rounded, polished cylinder;
              wound strings (low-E/A/D) get a duller base plus a diagonal
              ridge pattern layered on top to suggest the wound-wire coil.
              Both are objectBoundingBox gradients (the default), which only
              works because strings are now <rect>s with real height — a
              <line> has a zero-height bounding box and silently fails to
              paint a gradient at all (see the old comment this replaced). */}
          <linearGradient id="plain-string-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6e6e73" />
            <stop offset="32%" stopColor="#f2f2f4" />
            <stop offset="50%" stopColor="#fbfbfc" />
            <stop offset="68%" stopColor="#c8c8cc" />
            <stop offset="100%" stopColor="#5a5a5e" />
          </linearGradient>

          <linearGradient id="wound-string-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a4a4d" />
            <stop offset="30%" stopColor="#9d9da1" />
            <stop offset="50%" stopColor="#b8b8bc" />
            <stop offset="70%" stopColor="#87878b" />
            <stop offset="100%" stopColor="#3c3c3f" />
          </linearGradient>

          {/* Diagonal ridge tiles, repeated along the string's length —
              thicker (lower) strings show more repeats of this pattern
              stacked within their own height, reading as tighter/denser
              winding, which is actually how a real wound string looks. */}
          <pattern id="wound-string-texture" patternUnits="userSpaceOnUse" width={4.5 * NECK_SCALE} height={20} patternTransform="rotate(28)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="#1c1c1e" strokeWidth={1.1 * NECK_SCALE} opacity="0.35" />
          </pattern>

          {/* Compose -> Capo bar — a graphite-metal cylinder gradient (same
              light/dark/light banding technique as the string gradients
              above, just wider), deliberately lighter than a near-black
              rubber tone would be so it actually reads clearly against the
              reddish-brown fretboard wood instead of blending into its own
              shadow. */}
          <linearGradient id="capo-rubber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c7c7cc" />
            <stop offset="14%" stopColor="#6e6e73" />
            <stop offset="50%" stopColor="#48484a" />
            <stop offset="86%" stopColor="#6e6e73" />
            <stop offset="100%" stopColor="#38383a" />
          </linearGradient>

          <filter id="string-shadow" x="-20%" y="-20%" width="140%" height="300%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" result="blurred" />
            <feOffset in="blurred" dx="0" dy="2.2" result="offset" />
            <feComponentTransfer in="offset" result="shadow">
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="shadow" />
            </feMerge>
          </filter>
        </defs>

        {/* Rosewood fretboard surface, cream binding, and a soft overhead
            sheen — purely visual, drawn first so every existing overlay
            (frets/strings/dots/lick markers/etc.) layers on top unchanged. */}
        <rect
          x={surfaceLeft}
          y={surfaceTop}
          width={surfaceRight - surfaceLeft}
          height={surfaceBottom - surfaceTop}
          rx={6}
          className="fretboard-wood"
          fill="url(#wood-base)"
          filter="url(#wood-grain)"
        />
        {/* Flush with the true top/bottom edge of the wood, not inset from
            it — they were previously drawn a bindingWidth in from the edge,
            which read as sitting too close to the outer strings. */}
        <rect
          x={surfaceLeft}
          y={surfaceTop}
          width={surfaceRight - surfaceLeft}
          height={bindingWidth}
          className="fretboard-binding"
        />
        <rect
          x={surfaceLeft}
          y={surfaceBottom - bindingWidth}
          width={surfaceRight - surfaceLeft}
          height={bindingWidth}
          className="fretboard-binding"
        />
        <rect
          x={surfaceLeft}
          y={surfaceTop}
          width={surfaceRight - surfaceLeft}
          height={surfaceBottom - surfaceTop}
          rx={6}
          fill="url(#neck-sheen)"
          className="fretboard-sheen"
        />

        {/* pearloid dot position markers, at the same FRET_MARKERS/
            DOUBLE_DOT_FRETS positions/logic as before. */}
        {FRET_MARKERS.map((fret) => {
          const x = fretX(fret) - FRET_WIDTH / 2;
          const isDouble = DOUBLE_DOT_FRETS.includes(fret);
          const midY = NECK_TOP + (STRING_GAP * (STANDARD_TUNING.length - 1)) / 2;
          if (isDouble) {
            return (
              <g key={fret}>
                <circle cx={x} cy={midY - STRING_GAP} r={5 * NECK_SCALE} className="fret-inlay" fill="url(#pearl-inlay)" />
                <circle cx={x} cy={midY + STRING_GAP} r={5 * NECK_SCALE} className="fret-inlay" fill="url(#pearl-inlay)" />
              </g>
            );
          }
          return <circle key={fret} cx={x} cy={midY} r={5 * NECK_SCALE} className="fret-inlay" fill="url(#pearl-inlay)" />;
        })}

        {/* frets — metal wire rects spanning the full binding-to-binding
            width, at the same fretX positions the old <line>s used. */}
        {Array.from({ length: MAX_FRET + 1 }, (_, fret) =>
          fret === 0 ? (
            <rect
              key={fret}
              x={fretX(0) - NUT_WIDTH / 2}
              y={surfaceTop}
              width={NUT_WIDTH}
              height={surfaceBottom - surfaceTop}
              rx={1.5}
              fill="url(#nut-bone)"
              className="nut-bar"
            />
          ) : (
            <rect
              key={fret}
              x={fretX(fret) - FRET_WIRE_WIDTH / 2}
              y={surfaceTop + bindingWidth}
              width={FRET_WIRE_WIDTH}
              height={surfaceBottom - surfaceTop - bindingWidth * 2}
              fill="url(#fret-metal)"
              className="fret-wire"
            />
          )
        )}

        {/* fret number labels */}
        {FRET_MARKERS.map((fret) => (
          <text key={fret} x={fretX(fret) - FRET_WIDTH / 2} y={neckHeight - 15 * NECK_SCALE} className="fret-number" textAnchor="middle">
            {fret}
          </text>
        ))}

        {/* Strings — a soft blurred shadow rect per string first (drawn
            behind, same span, offset a couple px down) so each string reads
            as sitting slightly above the wood, then the real string on top:
            plain strings (G/B/high-E) get a bright rounded-metal gradient,
            wound strings (low-E/A/D) get a duller base gradient plus the
            diagonal ridge pattern layered over it for the wound-wire look.
            Now <rect>s (real height) rather than <line>s (zero-height
            bounding box) specifically so these gradients/pattern actually
            render — see STRING_GAUGE's comment for the thickness ratio. */}
        {STANDARD_TUNING.map((string, i) => {
          const gauge = STRING_GAUGE[i] * NECK_SCALE;
          const y = stringY(i) - gauge / 2;
          return (
            <rect
              key={`string-shadow-${string.stringNumber}`}
              x={fretX(0)}
              y={y}
              width={fretX(MAX_FRET) - fretX(0)}
              height={gauge}
              fill="#000"
              filter="url(#string-shadow)"
            />
          );
        })}
        {STANDARD_TUNING.map((string, i) => {
          const gauge = STRING_GAUGE[i] * NECK_SCALE;
          const isWound = i < WOUND_STRING_COUNT;
          const y = stringY(i) - gauge / 2;
          return (
            <g key={string.stringNumber}>
              <rect x={fretX(0)} y={y} width={fretX(MAX_FRET) - fretX(0)} height={gauge} rx={gauge / 2} className="string-line" fill={isWound ? 'url(#wound-string-metal)' : 'url(#plain-string-metal)'} />
              {isWound && (
                <rect x={fretX(0)} y={y} width={fretX(MAX_FRET) - fretX(0)} height={gauge} rx={gauge / 2} fill="url(#wound-string-texture)" />
              )}
            </g>
          );
        })}

        {/* Compose -> Capo — a metal-clamp bar drawn ON TOP of the strings
            (not behind them like the wood/frets above), since that's what a
            real capo actually does: it clamps down over the strings,
            pressing them onto the fret, not sitting underneath them.
            Narrowed via capoBarWidth (see its own comment). No separate
            text label — a previous version's "Capo, fret N" label sat right
            on top of the neck's own fret-number row (they land at almost
            the exact same y), garbling both; the fret-number ruler already
            visible below the neck plus the Capo field above the chord input
            already say which fret unambiguously. */}
        {capoFret > 0 && (
          <g className="fretboard-capo">
            <rect
              x={capoBarX}
              y={surfaceTop + 2}
              width={capoBarWidth}
              height={surfaceBottom - surfaceTop - 4}
              rx={8 * NECK_SCALE}
              className="fretboard-capo-bar"
            />
            {/* Glossy highlight stripe along the top edge of the clamp. */}
            <rect
              x={capoBarX + 3 * NECK_SCALE}
              y={surfaceTop + 4}
              width={capoBarWidth - 6 * NECK_SCALE}
              height={3 * NECK_SCALE}
              rx={1.5 * NECK_SCALE}
              className="fretboard-capo-sheen"
            />
          </g>
        )}

        {/* open-string labels at the nut */}
        {STANDARD_TUNING.map((string, i) => (
          <text key={string.stringNumber} x={NECK_LEFT - 45 * NECK_SCALE} y={stringY(i) + 5} className="string-label" textAnchor="middle">
            {string.openNote}
          </text>
        ))}

        {/* mute (x) marker above the nut; open strings get a ring drawn at fret 0 below */}
        {positionsByString.map((s, i) =>
          s.fret === null ? (
            <text key={i} x={fretX(0) - 20 * NECK_SCALE} y={stringY(i) + 5} className="mute-open-marker" textAnchor="middle">
              ×
            </text>
          ) : null
        )}

        {/* Heat Map — note-importance overlay (scale/passing/avoid tones;
            chord tones are already the normal dots below), drawn first so
            everything else layers on top of it. Purely visual, not clickable. */}
        {heatMapNotes.map((n) => {
          const style = HEAT_MAP_TIER_STYLE[n.tier];
          if (!style) return null;
          const cx = n.fret === 0 ? fretX(0) : fretX(n.fret) - FRET_WIDTH / 2;
          const cy = stringY(n.string);
          return (
            <circle
              key={`heat-${n.string}-${n.fret}`}
              cx={cx}
              cy={cy}
              r={style.radius}
              className={`heat-map-dot ${style.className}`}
              opacity={style.opacity}
            />
          );
        })}

        {/* barre bar — behind the dots — connecting strings fretted by the same finger */}
        {barres.map((bar, i) => (
          <line
            key={`barre-${i}`}
            x1={fretX(bar.fret) - FRET_WIDTH / 2}
            y1={stringY(bar.minIndex)}
            x2={fretX(bar.fret) - FRET_WIDTH / 2}
            y2={stringY(bar.maxIndex)}
            stroke={chordColor}
            strokeWidth={DOT_RADIUS * 1.6}
            strokeLinecap="round"
            opacity={0.55}
          />
        ))}

        {/* chord tone dots (root/third/fifth/bass colored, other tones gray).
            The slash-chord bass note is drawn as a diamond, everything else
            as a circle, so it reads as "this is the specified bass note". */}
        {positionsByString.map((s, i) => {
          if (s.fret === null || s.fret === 0) return null;
          const cx = fretX(s.fret) - FRET_WIDTH / 2;
          const cy = stringY(i);
          const isColored = s.role === 'root' || s.role === 'third' || s.role === 'fifth' || s.role === 'bass';
          const defaultFill = isColored ? chordColor : MUTED_DOT_COLOR;
          const fill = colorForRole(s.role, defaultFill);
          const noteInfo = { label: s.label, role: s.role, degree: s.degree };
          return (
            <g
              key={i}
              className="playable-note"
              role="button"
              tabIndex={0}
              aria-label={t('fretboard.playNote', { note: s.label })}
              onClick={() => playStringNote(i, s.fret, noteInfo)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && playStringNote(i, s.fret, noteInfo)}
            >
              {s.role === 'bass' ? (
                <rect
                  x={cx - DOT_RADIUS}
                  y={cy - DOT_RADIUS}
                  width={DOT_RADIUS * 2}
                  height={DOT_RADIUS * 2}
                  transform={`rotate(45 ${cx} ${cy})`}
                  fill={fill}
                  className="chord-dot"
                />
              ) : (
                <circle cx={cx} cy={cy} r={DOT_RADIUS} fill={fill} className="chord-dot" />
              )}
              <text x={cx} y={cy + 4} className="chord-dot-label" textAnchor="middle">
                {labelFor(s, i)}
              </text>
            </g>
          );
        })}

        {/* open-string chord tones get a ring (or diamond outline for bass) at the nut */}
        {positionsByString.map((s, i) => {
          if (s.fret !== 0) return null;
          const cx = fretX(0);
          const cy = stringY(i);
          const isColored = s.role === 'root' || s.role === 'third' || s.role === 'fifth' || s.role === 'bass';
          const defaultStroke = isColored ? chordColor : MUTED_DOT_COLOR;
          const stroke = colorForRole(s.role, defaultStroke);
          const noteInfo = { label: s.label, role: s.role, degree: s.degree };
          return (
            <g
              key={`open-${i}`}
              className="playable-note"
              role="button"
              tabIndex={0}
              aria-label={t('fretboard.playNote', { note: s.label })}
              onClick={() => playStringNote(i, 0, noteInfo)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && playStringNote(i, 0, noteInfo)}
            >
              {s.role === 'bass' ? (
                <rect
                  x={cx - DOT_RADIUS}
                  y={cy - DOT_RADIUS}
                  width={DOT_RADIUS * 2}
                  height={DOT_RADIUS * 2}
                  transform={`rotate(45 ${cx} ${cy})`}
                  fill="var(--fret-wood-mid)"
                  stroke={stroke}
                  strokeWidth={3}
                />
              ) : (
                <circle cx={cx} cy={cy} r={DOT_RADIUS} fill="var(--fret-wood-mid)" stroke={stroke} strokeWidth={3} />
              )}
              <text x={cx} y={cy + 4} className="chord-dot-label chord-dot-label-open" textAnchor="middle">
                {labelFor(s, i)}
              </text>
            </g>
          );
        })}

        {/* lick note markers — sit directly on the string/fret they're
            played at (same coordinates as chord dots), numbered in play
            order with a small technique glyph when one applies. */}
        {lick?.notes.map((n) => {
          const cx = n.fret === 0 ? fretX(0) : fretX(n.fret) - FRET_WIDTH / 2;
          const cy = stringY(n.string);
          const glyph = TECHNIQUE_GLYPH[n.technique];
          const isPlaying = playingNoteOrder === n.order;
          const fill = colorForRole(n.role, LICK_MARKER_COLOR);
          const noteInfo = { label: n.label, role: n.role, degree: n.degree };
          return (
            <g
              key={`lick-${n.order}`}
              className={'playable-note' + (isPlaying ? ' playing' : '')}
              role="button"
              tabIndex={0}
              aria-label={t('fretboard.playNote', { note: n.label })}
              onClick={() => playStringNote(n.string, n.fret, noteInfo)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && playStringNote(n.string, n.fret, noteInfo)}
            >
              {isPlaying && (
                <circle cx={cx} cy={cy} r={LICK_DOT_RADIUS + 5} fill="none" className="lick-dot-playing-ring" />
              )}
              <circle cx={cx} cy={cy} r={LICK_DOT_RADIUS} fill={fill} className="lick-dot" />
              <text x={cx} y={cy + 3} className="lick-dot-label" textAnchor="middle">
                {n.order}
              </text>
              {glyph && (
                <text x={cx + LICK_DOT_RADIUS + 2} y={cy - LICK_DOT_RADIUS + 2} className="lick-technique-glyph">
                  {glyph}
                </text>
              )}
            </g>
          );
        })}

        {/* suggested landing notes — the next chord's root/3rd/5th, drawn as
            an outline-only ring (never filled) so they read as "target",
            distinct from both chord dots and lick markers. */}
        {landingNotes.map((n, i) => {
          const cx = n.fret === 0 ? fretX(0) : fretX(n.fret) - FRET_WIDTH / 2;
          const cy = stringY(n.string);
          const stroke = colorForRole(n.role, landingNotesColor);
          return (
            <g
              key={`landing-${i}`}
              className="playable-note"
              role="button"
              tabIndex={0}
              aria-label={t('fretboard.playLandingNote', { note: n.label })}
              onClick={() => playStringNote(n.string, n.fret, { label: n.label, role: n.role, degree: n.degree })}
              onKeyDown={(e) =>
                (e.key === 'Enter' || e.key === ' ') &&
                playStringNote(n.string, n.fret, { label: n.label, role: n.role, degree: n.degree })
              }
            >
              <circle cx={cx} cy={cy} r={DOT_RADIUS + 6} fill="none" stroke={stroke} className="landing-note-ring" />
              <text x={cx} y={cy - DOT_RADIUS - 9} className="landing-note-label" textAnchor="middle">
                {n.label}
              </text>
            </g>
          );
        })}

        {/* Position Roadmap — recommended left-hand movement across the
            whole progression, drawn as a track of pins in the margin above
            the strings, connected by lines labeled with the transition type
            (Stay/Shift/Slide) between each pair of positions. */}
        {roadmap?.steps.map((step, i) => {
          const cx = step.baseFret === 0 ? fretX(0) : fretX(step.baseFret) - FRET_WIDTH / 2;
          const labelX = roadmapLabelX[i];
          const needsConnector = Math.abs(labelX - cx) > 0.5;
          const next = roadmap.steps[i + 1];
          const transition = roadmap.transitions[i];
          return (
            <g key={`roadmap-${i}`}>
              {next && (
                <>
                  <line x1={cx} y1={ROADMAP_PIN_Y} x2={next.baseFret === 0 ? fretX(0) : fretX(next.baseFret) - FRET_WIDTH / 2} y2={ROADMAP_PIN_Y} className="roadmap-line" />
                  <text x={(labelX + roadmapLabelX[i + 1]) / 2} y={ROADMAP_TRANSITION_Y} className="roadmap-transition-label-halo" textAnchor="middle">
                    {translateTransitionLabel(t, transition.label)}
                  </text>
                  <text x={(labelX + roadmapLabelX[i + 1]) / 2} y={ROADMAP_TRANSITION_Y} className="roadmap-transition-label" textAnchor="middle">
                    {translateTransitionLabel(t, transition.label)}
                  </text>
                </>
              )}
              {/* A label nudged away from its pin (see roadmapLabelX above,
                  for a run of same-fret chords) gets a short tick connecting
                  it back to the real position it describes. */}
              {needsConnector && <line x1={cx} y1={ROADMAP_PIN_Y - 3} x2={labelX} y2={ROADMAP_CHORD_Y + 4} className="roadmap-label-connector" />}
              <circle cx={cx} cy={ROADMAP_PIN_Y} r={5 * NECK_SCALE} className="roadmap-pin" fill={step.color ?? colorForChord(step.chordText)} />
              {/* Halo (a stroked duplicate behind the fill) keeps each label
                  independently readable even against a neighboring label or
                  the neck's own texture. */}
              <text x={labelX} y={ROADMAP_CHORD_Y} className="roadmap-chord-label-halo" textAnchor="middle">
                {step.chordText}
              </text>
              <text x={labelX} y={ROADMAP_CHORD_Y} className="roadmap-chord-label" textAnchor="middle">
                {step.chordText}
              </text>
            </g>
          );
        })}

        {/* Practice Drill overlay — Static Overview shows every note in the
            exercise at once (dimmed, start note emphasized); Live Playback
            shows only current/next/past around the active step. See
            hooks/usePracticeDrill.js for how tiers are assigned. */}
        {drillNotes.map((n, i) => {
          const style = DRILL_TIER_STYLE[n.tier];
          if (!style) return null;
          const cx = n.fret === 0 ? fretX(0) : fretX(n.fret) - FRET_WIDTH / 2;
          const cy = stringY(n.string);
          return (
            <g
              key={`drill-${i}`}
              className="playable-note"
              role="button"
              tabIndex={0}
              aria-label={t('fretboard.playNote', { note: n.noteName })}
              onClick={() => playNote(STANDARD_TUNING[n.string].baseMidi + n.fret)}
              onKeyDown={(e) =>
                (e.key === 'Enter' || e.key === ' ') && playNote(STANDARD_TUNING[n.string].baseMidi + n.fret)
              }
            >
              {n.tier === 'current' && (
                <circle cx={cx} cy={cy} r={style.radius + 5} fill="none" className="drill-dot-current-ring" />
              )}
              <circle cx={cx} cy={cy} r={style.radius} className={`drill-dot ${style.className}`} opacity={style.opacity} />
              <text x={cx} y={cy + 4} className="drill-dot-label" textAnchor="middle">
                {labelMode === 'order' && n.order != null
                  ? n.order
                  : labelMode === 'finger' && n.finger != null
                  ? n.finger
                  : n.noteName}
              </text>
            </g>
          );
        })}

        {/* Studies -> Scales overlay — every note of the scale currently
            shown, root notes tinted distinctly from the rest so the "home"
            note is always obvious regardless of position/key. */}
        {scaleNotes.map((n, i) => {
          const cx = n.fret === 0 ? fretX(0) : fretX(n.fret) - FRET_WIDTH / 2;
          const cy = stringY(n.string);
          return (
            <g
              key={`scale-${i}`}
              className="playable-note"
              role="button"
              tabIndex={0}
              aria-label={t('fretboard.playNote', { note: n.noteName })}
              onClick={() => playNote(STANDARD_TUNING[n.string].baseMidi + n.fret)}
              onKeyDown={(e) =>
                (e.key === 'Enter' || e.key === ' ') && playNote(STANDARD_TUNING[n.string].baseMidi + n.fret)
              }
            >
              <circle
                cx={cx}
                cy={cy}
                r={DOT_RADIUS}
                className={n.isBlueNote ? 'scale-dot-blue' : n.isRoot ? 'scale-dot-root' : 'scale-dot'}
              />
              <text x={cx} y={cy + 4} className="scale-dot-label" textAnchor="middle">
                {labelMode === 'degree'
                  ? n.degreeLabel
                  : labelMode === 'finger' && n.finger != null
                  ? n.finger
                  : n.noteName}
              </text>
            </g>
          );
        })}

        {/* Studies -> Technique & Guitar Masters overlay — see the
            actionOverlay prop comment above for what each action draws. */}
        {actionOverlay.map((p, i) => {
          const stringIndex = overlayStringIndex(p.string);
          const cx = p.fret === 0 ? fretX(0) : fretX(p.fret) - FRET_WIDTH / 2;
          const cy = stringY(stringIndex);
          const isDimmed = activeOverlayStep != null && p.step !== activeOverlayStep;
          const opacity = isDimmed ? 0.28 : 1;
          const noteInfo = { label: p.label ?? '', role: null, degree: null };

          function playThisNote() {
            playStringNote(stringIndex, p.fret, noteInfo);
          }

          if ((p.action === 'Slide' || p.action === 'HammerOn' || p.action === 'PullOff') && p.targetFret != null) {
            const tx = p.targetFret === 0 ? fretX(0) : fretX(p.targetFret) - FRET_WIDTH / 2;
            const curved = p.action !== 'Slide';
            const midY = cy - 22 * NECK_SCALE;
            const path = curved ? `M ${cx} ${cy} Q ${(cx + tx) / 2} ${midY} ${tx} ${cy}` : `M ${cx} ${cy} L ${tx} ${cy}`;
            return (
              <g key={`action-${i}`} opacity={opacity} className={`fretboard-action fretboard-action-${p.action.toLowerCase()}`}>
                <path d={path} stroke={TECHNIQUE_ACTION_COLOR} className="fretboard-action-arrow" markerEnd="url(#action-arrow)" />
                <circle
                  cx={cx}
                  cy={cy}
                  r={DOT_RADIUS}
                  fill={TECHNIQUE_ACTION_COLOR}
                  className="fretboard-action-dot playable-note"
                  role="button"
                  tabIndex={0}
                  aria-label={t('fretboard.playNote', { note: p.label ?? '' })}
                  onClick={playThisNote}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && playThisNote()}
                />
                <circle cx={tx} cy={cy} r={DOT_RADIUS} stroke={TECHNIQUE_ACTION_COLOR} className="fretboard-action-target-ring" />
                {p.label && (
                  <text x={cx} y={cy + 4} className="chord-dot-label" textAnchor="middle">
                    {p.label}
                  </text>
                )}
              </g>
            );
          }

          if (p.action === 'Bend') {
            const archTop = cy - 34 * NECK_SCALE;
            const path = `M ${cx} ${cy - DOT_RADIUS} Q ${cx + 12} ${archTop} ${cx} ${archTop}`;
            return (
              <g key={`action-${i}`} opacity={opacity} className="fretboard-action fretboard-action-bend">
                <circle
                  cx={cx}
                  cy={cy}
                  r={DOT_RADIUS}
                  fill={TECHNIQUE_ACTION_COLOR}
                  className="fretboard-action-dot playable-note"
                  role="button"
                  tabIndex={0}
                  aria-label={t('fretboard.playNote', { note: p.label ?? '' })}
                  onClick={playThisNote}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && playThisNote()}
                />
                <path d={path} stroke={TECHNIQUE_ACTION_COLOR} className="fretboard-action-arrow" markerEnd="url(#action-arrow)" />
                <text x={cx} y={archTop - 6} className="fretboard-bend-label" textAnchor="middle">
                  {bendStepLabel(p.bendStep)}
                </text>
                {p.label && (
                  <text x={cx} y={cy + 4} className="chord-dot-label" textAnchor="middle">
                    {p.label}
                  </text>
                )}
              </g>
            );
          }

          // Note / Chord — a plain dot, same visual language as chord tones elsewhere.
          return (
            <g
              key={`action-${i}`}
              opacity={opacity}
              className="fretboard-action fretboard-action-note playable-note"
              role="button"
              tabIndex={0}
              aria-label={t('fretboard.playNote', { note: p.label ?? '' })}
              onClick={playThisNote}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && playThisNote()}
            >
              <circle cx={cx} cy={cy} r={DOT_RADIUS} fill={TECHNIQUE_ACTION_COLOR} className="fretboard-action-dot" />
              {p.label && (
                <text x={cx} y={cy + 4} className="chord-dot-label" textAnchor="middle">
                  {p.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Compose -> Smooth (triad voice-leading) overlay — pivot notes
            (unchanged from the previous chord) in gold, moving notes in the
            app's accent blue, both labeled with a finger number. Keyed by
            string index (see the voiceLeadingNotes prop comment above) so a
            note staying on the same string but changing fret animates via
            the CSS transition on .voice-leading-dot instead of jump-cutting. */}
        {voiceLeadingNotes.map((n) => {
          const cx = n.fret === 0 ? fretX(0) : fretX(n.fret) - FRET_WIDTH / 2;
          const cy = stringY(n.string);
          const fill = n.isPivot ? VOICE_LEADING_PIVOT_COLOR : VOICE_LEADING_MOVING_COLOR;
          const noteInfo = { label: n.label, role: null, degree: null };
          return (
            <g
              key={`voice-lead-${n.string}`}
              className={'playable-note voice-leading-note' + (n.isPivot ? ' pivot' : ' moving')}
              role="button"
              tabIndex={0}
              aria-label={t('fretboard.playNote', { note: n.label })}
              onClick={() => playStringNote(n.string, n.fret, noteInfo)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && playStringNote(n.string, n.fret, noteInfo)}
            >
              {n.isPivot && <circle cx={cx} cy={cy} r={DOT_RADIUS + 5} fill="none" className="voice-leading-pivot-ring" />}
              <circle cx={cx} cy={cy} r={DOT_RADIUS} fill={fill} className="voice-leading-dot" />
              <text x={cx} y={cy + 4} className="chord-dot-label voice-leading-dot-label" textAnchor="middle">
                {/* finger is 0 for an open string (a real, correct finger
                    value — see music/fingering.js), not "unknown" — only an
                    actual null/undefined (unassigned) should fall back to
                    the note letter instead of a finger number. */}
                {n.finger != null ? n.finger : n.label}
              </text>
            </g>
          );
        })}

        {/* Ear Training Quiz — clickable hit-targets for the current
            difficulty's allowed cells (mostly invisible; a faint ring so the
            playable area is discoverable without giving away the answer). */}
        {quizCells.map((cell) => {
          const cx = cell.fret === 0 ? fretX(0) : fretX(cell.fret) - FRET_WIDTH / 2;
          const cy = stringY(cell.stringIndex);
          return (
            <g
              key={`quiz-${cell.stringIndex}-${cell.fret}`}
              className="playable-note quiz-hit-target"
              role="button"
              tabIndex={0}
              aria-label={t('fretboard.answerCell', { string: cell.stringIndex, fret: cell.fret })}
              onClick={() => onQuizCellClick?.(cell.stringIndex, cell.fret)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onQuizCellClick?.(cell.stringIndex, cell.fret)}
            >
              <circle cx={cx} cy={cy} r={DOT_RADIUS} className="quiz-hit-target-dot" />
            </g>
          );
        })}

        {/* Non-interactive reveal markers — call & response notes already
            answered correctly, or a choice question's actual chord/interval/
            scale, shown once answered. `cell.correct` (set by
            useEarTraining's quizRevealCells) colors these green when the
            submitted answer was right, gold when it was wrong — either way
            this always shows the true correct notes, never the user's own
            (text-button) wrong guess, since that guess has no fretboard
            position of its own to draw. */}
        {quizRevealCells.map((cell, i) => {
          const cx = cell.fret === 0 ? fretX(0) : fretX(cell.fret) - FRET_WIDTH / 2;
          const cy = stringY(cell.stringIndex);
          const resultClass = cell.correct === true ? ' correct' : cell.correct === false ? ' incorrect' : '';
          return (
            <circle
              key={`quiz-reveal-${i}`}
              cx={cx}
              cy={cy}
              r={DOT_RADIUS}
              className={'quiz-reveal-dot' + resultClass}
            />
          );
        })}

        {/* Correct/incorrect flash at the cell the user just clicked. */}
        {quizFeedbackCell && (
          <circle
            cx={quizFeedbackCell.cell.fret === 0 ? fretX(0) : fretX(quizFeedbackCell.cell.fret) - FRET_WIDTH / 2}
            cy={stringY(quizFeedbackCell.cell.stringIndex)}
            r={DOT_RADIUS}
            className={quizFeedbackCell.correct ? 'quiz-feedback-correct' : 'quiz-feedback-incorrect'}
          />
        )}
      </svg>
    </div>
  );
}
