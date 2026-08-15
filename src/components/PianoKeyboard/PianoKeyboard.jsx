import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { playPianoNoteOn, playPianoNoteOff } from '../../audio/pianoPlayer';
import { NOTE_FUNCTION_COLORS, MUTED_DOT_COLOR } from '../../styles/colors';
import { useLanguage } from '../../i18n/LanguageContext';
import { PIANO_SOUND_PROFILES, DEFAULT_PIANO_PROFILE } from '../../audio/instrumentProfiles';
import './PianoKeyboard.css';

// Full 88-key model (A0..C8), built once. Rather than one big SVG scaled
// down to fit (the previous approach), each white key is a real DOM column
// at a real pixel width — that's what makes native overflow-x scrolling,
// touch momentum, mouse-drag panning, and CSS scroll-snap all work for
// free, and makes "clamp key width to 32-40px" a plain CSS/JS number
// instead of viewBox math.
const LOWEST_MIDI = 21; // A0
const HIGHEST_MIDI = 108; // C8
const WHITE_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]); // C D E F G A B
const BLACK_AFTER_PITCH_CLASS = new Set([0, 2, 5, 7, 9]); // C D F G A each have a black key right after
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MIDDLE_C_MIDI = 60;

// Ableton Live-style "computer keyboard as piano" mapping — one row of
// white keys (A..') plus the interspersed black keys above (W E _ T Y U _
// O P), semitone offsets from whatever the current octave's C is. Z/X
// shift that C up/down an octave, same convention Ableton itself uses.
const COMPUTER_KEY_TO_SEMITONE = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11,
  k: 12, o: 13, l: 14, p: 15, ';': 16, "'": 17,
};
const MIN_OCTAVE_OFFSET = -3;
const MAX_OCTAVE_OFFSET = 3;

// Practice-drill tiers — same 5 tiers and the same color choice per tier as
// Fretboard.css's own .drill-dot-* rules (see that file's comment), so a
// practice exercise reads identically whether it's rendered on the neck or
// the keyboard. Opacity mirrors Fretboard.jsx's DRILL_TIER_STYLE radii
// (a bigger/more-opaque dot there = a more-opaque key here).
const DRILL_TIER_COLOR = {
  all: 'var(--accent)',
  start: 'var(--accent)',
  current: 'var(--danger)',
  next: 'var(--accent)',
  past: 'var(--text-secondary)',
};
const DRILL_TIER_OPACITY = { all: 0.35, start: 0.9, current: 1, next: 0.55, past: 0.18 };

function octaveOf(midi) {
  return Math.floor(midi / 12) - 1;
}

function noteLabel(midi) {
  return `${NOTE_NAMES[((midi % 12) + 12) % 12]}${octaveOf(midi)}`;
}

function buildWhiteKeys() {
  const white = [];
  for (let midi = LOWEST_MIDI; midi <= HIGHEST_MIDI; midi += 1) {
    const pitchClass = ((midi % 12) + 12) % 12;
    if (WHITE_PITCH_CLASSES.has(pitchClass)) white.push({ midi, pitchClass });
  }
  return white.map((w, index) => ({
    ...w,
    index,
    blackKey: BLACK_AFTER_PITCH_CLASS.has(w.pitchClass) ? { midi: w.midi + 1, pitchClass: (w.pitchClass + 1) % 12 } : null,
  }));
}

const WHITE_KEYS = buildWhiteKeys();
const TOTAL_WHITE_KEYS = WHITE_KEYS.length;
const WHITE_INDEX_BY_MIDI = new Map(WHITE_KEYS.map((w) => [w.midi, w.index]));

// "Default Visible Range" per spec — an asymmetric range (F2..C6 is not
// centered on C4) is what was explicitly requested, so the initial scroll
// honors it literally; Middle C's own distinct styling (see
// .piano-key-middle-c below) is what makes it "an immediate visual anchor"
// regardless of where it lands in that range, rather than forcing a
// mathematically-different "centered" range that would contradict the
// named F2/C6/C3/C5 boundaries.
const DEFAULT_RANGE_DESKTOP = { from: 41, to: 84 }; // F2 .. C6, ~3.5 octaves
const DEFAULT_RANGE_MOBILE = { from: 48, to: 72 }; // C3 .. C5, 2 octaves
const MOBILE_MAX_WIDTH = 640;
const MIN_KEY_WIDTH = 32;
const MAX_KEY_WIDTH = 40;
const FALLBACK_KEY_WIDTH = 36; // used only for the one frame before the viewport is first measured
const WHITE_KEY_HEIGHT = 168;
const BLACK_KEY_HEIGHT = Math.round(WHITE_KEY_HEIGHT * 0.6);
const OCTAVE_SCROLL_STEP = 7; // white keys per nav-button press

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

const SHOW_LABELS_STORAGE_KEY = 'piano-show-all-labels';

function getInitialShowAllLabels() {
  return localStorage.getItem(SHOW_LABELS_STORAGE_KEY) === 'true';
}

// The piano's equivalent of Fretboard.jsx — same responsibility (render
// whatever set of highlighted/clickable notes it's given, play a note on
// click), same responsive/light-dark-themed behavior, different physical
// layout. `notes`/`colorMode`/`labelMode`/`onNoteClick` mirror Fretboard's
// chord/scale display props; `quizKeys`/`quizRevealKeys`/`quizFeedbackKey`/
// `onQuizKeyClick` mirror its Ear Training quiz props.
export function PianoKeyboard({
  notes = [],
  chordColor,
  colorMode = 'chord',
  labelMode = 'note',
  onNoteClick,
  quizKeys = null,
  quizRevealKeys = [],
  quizFeedbackKey = null,
  // Additive sibling of quizFeedbackKey above — flashes MULTIPLE keys at
  // once (`[{midi, state}]`, state: 'hit' | 'partial' | 'miss'), for a quiz
  // whose "answer" is a whole chord rather than one note (Practice ->
  // Chord Rhythm) and can be partially right (some notes correct, some
  // wrong/missing — shown gold vs red, not just a uniform pass/fail).
  // Existing single-note callers (Ear Training) are untouched; this is
  // simply checked first.
  quizFeedbackKeys = [],
  onQuizKeyClick,
  // Practice-drill overlay (Scales/Circle of Fifths' own metronome-timed
  // drills) — `{midi, tier}` per note, same tier vocabulary as Fretboard's
  // own drillNotes prop. Independent of `notes`/quiz — a caller only ever
  // passes one of these three at a time (see App.jsx's stagePianoProps).
  drillNotes = [],
  // Piano course's hand-position/five-finger-pattern lessons — `{midi,
  // finger}` (finger 1-5, thumb-to-pinky), shown as a small badge on the
  // key regardless of labelMode/showAllLabels, since it's teaching a
  // different thing (which finger plays this) than the note-name label is.
  fingerNumbers = [],
  // Sound profile (acoustic/electric/organ/synth — see
  // audio/instrumentProfiles.js's PIANO_SOUND_PROFILES). Owned by App.jsx
  // (same state the Settings drawer's own dropdown already reads/writes;
  // see audioSettingsStore.js) — this component just renders the on-panel
  // LCD readout + prev/next cycle buttons for it, so choosing a sound from
  // either place stays in sync automatically.
  pianoProfile = DEFAULT_PIANO_PROFILE,
  onPianoProfileChange,
  // Master volume for piano playback (0-100 — see audio/pianoPlayer.js's
  // own module-level setPianoVolume). Same "just renders the panel
  // control for state App.jsx owns" pattern as pianoProfile above.
  pianoVolume = 100,
  onPianoVolumeChange,
  // Metronome — a slim subset of useMetronome.js's full surface (App.jsx
  // already owns the one shared metronome instance MetronomeBar controls;
  // this panel is a second, always-visible way to reach the exact same
  // isRunning/bpm state, not a separate metronome).
  metronomeIsRunning = false,
  onMetronomeToggle,
  metronomeBpm = 120,
  onMetronomeBpmChange,
}) {
  const { t } = useLanguage();
  const viewportRef = useRef(null);
  const scrollRef = useRef(null);
  const dragRef = useRef({ dragging: false, startX: 0, startScrollLeft: 0, moved: false });
  // Multi-touch chord support — see handleTouchStartKey's comment.
  const activeTouchesRef = useRef(new Map());
  const lastTouchTimeRef = useRef(0);
  // Which key (if any) a mouse press is currently sustaining — released via
  // a single global `window` mouseup listener below, NOT a per-key
  // onMouseLeave. onMouseLeave fires the instant the cursor exits the key's
  // pixel bounds, button still held or not — a completely normal amount of
  // hand tremor while holding a note (or a black key's narrower hit area)
  // was enough to cross that boundary and cut the note early, which is
  // exactly the "sound stops before I lift my finger" bug. A global mouseup
  // listener only fires on the actual button release, wherever the cursor
  // is by then, matching a real key: it keeps ringing for as long as the
  // key is held down, full stop.
  const mouseHeldMidiRef = useRef(null);
  const didInitialScrollRef = useRef(false);
  // Remembers the volume slider's value from right before a mute click, so
  // unmute restores it exactly — write-only until the next mute/unmute, so
  // a ref (no re-render needed) rather than state.
  const lastVolumeRef = useRef(pianoVolume || 70);
  // Click-to-type BPM entry — the LCD readout swaps for a plain number
  // input while editing, same "click the value, type, commit" affordance
  // as any inline-editable field. Local text state (not the numeric BPM
  // directly) so a mid-edit value like "1" (on the way to "120") doesn't
  // get clamped/rejected before the user finishes typing.
  const [editingBpm, setEditingBpm] = useState(false);
  const [bpmDraft, setBpmDraft] = useState('');
  const bpmInputRef = useRef(null);

  const [viewportWidth, setViewportWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < MOBILE_MAX_WIDTH : false));
  const [scrollMetrics, setScrollMetrics] = useState({ scrollLeft: 0, canScrollLeft: false, canScrollRight: true });
  // Independent of `labelMode` (which only ever shows C-naturals + Middle C,
  // a fixed reference-point convention used everywhere piano renders) — this
  // is a separate, user-toggleable "show every key's name" overlay, on by
  // request rather than by default since it's fairly busy across 88 keys.
  const [showAllLabels, setShowAllLabels] = useState(getInitialShowAllLabels);

  useEffect(() => {
    localStorage.setItem(SHOW_LABELS_STORAGE_KEY, String(showAllLabels));
  }, [showAllLabels]);

  useEffect(() => {
    if (editingBpm) {
      bpmInputRef.current?.focus();
      bpmInputRef.current?.select();
    }
  }, [editingBpm]);

  // Web MIDI input (optional, opt-in) — connecting a real MIDI keyboard
  // controller routes its note-on/off messages through the exact same
  // click path a mouse/touch tap already uses (handleKeyClick/isClickable,
  // defined below), so every existing note-based interaction — Compose's
  // free play, the Piano course's Note Reading quiz, Ear Training's piano
  // quiz — works with a physical keyboard for free, with no per-feature
  // wiring. `midiHeldNotes` additionally drives a live "currently pressed"
  // glow, independent of chord/quiz/drill coloring, so playing on real
  // hardware gives instant visual feedback regardless of which course/quiz
  // is active.
  const midiSupported = typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
  const [midiStatus, setMidiStatus] = useState('disconnected'); // disconnected | connecting | connected | denied | noDevice | unsupported
  const [midiDeviceName, setMidiDeviceName] = useState(null);
  const [midiHeldNotes, setMidiHeldNotes] = useState(() => new Set());
  const midiMessageHandlerRef = useRef(null);

  // Computer-keyboard-as-piano (optional, opt-in, default off) — a THIRD
  // input method alongside mouse/touch clicks and Web MIDI above, not a
  // replacement for either: routes through the exact same
  // handleKeyClick/isClickable path, so it "just works" with every
  // existing note-based feature (Compose free play, the Note Reading quiz,
  // Ear Training's piano quiz, practice drills) with no per-feature wiring.
  const [computerKeyboardEnabled, setComputerKeyboardEnabled] = useState(false);
  const [octaveOffset, setOctaveOffset] = useState(0);
  const [computerKeyHeldNotes, setComputerKeyHeldNotes] = useState(() => new Set());
  const computerKeyDownHandlerRef = useRef(null);
  const computerKeyUpHandlerRef = useRef(null);

  // Mouse/touch press-and-hold visual feedback — deliberately its OWN state
  // (not relying on the browser's native :active pseudo-class the way a
  // single mouse-held key otherwise could). :active is unreliable across
  // SIMULTANEOUS multi-touch points on different elements — in practice
  // this meant playing a chord with 2-3 fingers on a real iPad sounded all
  // of them correctly (the JS handlers all fired fine) but only ever showed
  // ONE key visually pressed. Tracked explicitly here instead, exactly the
  // same reliable pattern midiHeldNotes/computerKeyHeldNotes above already
  // use for their own input methods.
  const [pressedNotes, setPressedNotes] = useState(() => new Set());
  function addPressedNote(midi) {
    setPressedNotes((prev) => (prev.has(midi) ? prev : new Set(prev).add(midi)));
  }
  function removePressedNote(midi) {
    setPressedNotes((prev) => {
      if (!prev.has(midi)) return prev;
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
  }

  const notesByMidi = useMemo(() => new Map(notes.map((n) => [n.midi, n])), [notes]);
  const quizSet = useMemo(() => new Set((quizKeys ?? []).map((n) => n.midi)), [quizKeys]);
  const revealSet = useMemo(() => new Set(quizRevealKeys.map((n) => n.midi)), [quizRevealKeys]);
  const feedbackKeysByMidi = useMemo(() => new Map(quizFeedbackKeys.map((f) => [f.midi, f.state])), [quizFeedbackKeys]);
  const drillByMidi = useMemo(() => new Map(drillNotes.map((n) => [n.midi, n])), [drillNotes]);
  const fingerByMidi = useMemo(() => new Map(fingerNumbers.map((f) => [f.midi, f.finger])), [fingerNumbers]);
  // Inverse lookup (midi -> key letter) for the on-key hint badges, only
  // built while the feature is actually on and recomputed when the octave
  // shifts, since which physical key maps to which midi note moves with it.
  const computerKeyByMidi = useMemo(() => {
    if (!computerKeyboardEnabled) return new Map();
    const m = new Map();
    Object.entries(COMPUTER_KEY_TO_SEMITONE).forEach(([key, semitone]) => {
      const midi = clamp(MIDDLE_C_MIDI + octaveOffset * 12 + semitone, LOWEST_MIDI, HIGHEST_MIDI);
      m.set(midi, key.toUpperCase());
    });
    return m;
  }, [computerKeyboardEnabled, octaveOffset]);

  // Measures the actual available width so key size and the default
  // visible-key count can both be computed from real screen space, per
  // "dynamically compute key widths based on screen width". Measured
  // synchronously on mount (useLayoutEffect + getBoundingClientRect)
  // rather than waiting on the ResizeObserver's first callback — that
  // callback is async by spec (fires on the next layout pass, not
  // immediately on observe()), so relying on it alone for the *initial*
  // size would mean the first paint briefly renders at the fallback width
  // and default scroll position, then jumps once the callback lands. The
  // ResizeObserver stays wired up for ongoing responsive updates (window
  // resize, the nav drawer or a panel opening/closing).
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const width = el.getBoundingClientRect().width;
    if (width > 0) {
      setViewportWidth(width);
      setIsMobile(width < MOBILE_MAX_WIDTH);
    }
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      if (width > 0) {
        setViewportWidth(width);
        setIsMobile(width < MOBILE_MAX_WIDTH);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const visibleWhiteKeyCount = isMobile ? 15 : 26; // C3..C5 vs F2..C6
  const keyWidth = viewportWidth > 0 ? clamp(viewportWidth / visibleWhiteKeyCount, MIN_KEY_WIDTH, MAX_KEY_WIDTH) : FALLBACK_KEY_WIDTH;
  const blackKeyWidth = Math.round(keyWidth * 0.62);
  const totalWidth = TOTAL_WHITE_KEYS * keyWidth;

  function updateScrollMetrics() {
    const el = scrollRef.current;
    if (!el) return;
    setScrollMetrics({
      scrollLeft: el.scrollLeft,
      canScrollLeft: el.scrollLeft > 2,
      canScrollRight: el.scrollLeft < el.scrollWidth - el.clientWidth - 2,
    });
  }

  // Sets the initial scroll position exactly once, the first time the
  // viewport has a real measured width — not on every later resize, so
  // resizing the window doesn't yank a user back to the default range
  // after they've scrolled elsewhere.
  useLayoutEffect(() => {
    if (didInitialScrollRef.current || !scrollRef.current || viewportWidth === 0) return;
    const range = isMobile ? DEFAULT_RANGE_MOBILE : DEFAULT_RANGE_DESKTOP;
    const fromIndex = WHITE_INDEX_BY_MIDI.get(range.from) ?? 0;
    scrollRef.current.scrollLeft = fromIndex * keyWidth;
    didInitialScrollRef.current = true;
    updateScrollMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportWidth, isMobile, keyWidth]);

  // Desktop mouse-drag panning — native overflow-x already gives touch
  // swipe/momentum and trackpad/wheel scrolling for free, but plain mouse
  // drag needs this explicitly. Listens on `window` while dragging so the
  // pan continues even if the cursor leaves the keyboard mid-drag.
  useEffect(() => {
    function onMouseMove(e) {
      const s = dragRef.current;
      if (!s.dragging || !scrollRef.current) return;
      const dx = e.clientX - s.startX;
      if (Math.abs(dx) > 4) s.moved = true;
      scrollRef.current.scrollLeft = s.startScrollLeft - dx;
    }
    function onMouseUp() {
      dragRef.current.dragging = false;
      if (mouseHeldMidiRef.current != null) {
        removePressedNote(mouseHeldMidiRef.current);
        handleReleaseKey(mouseHeldMidiRef.current);
        mouseHeldMidiRef.current = null;
      }
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleMouseDown(e) {
    if (e.button !== 0 || !scrollRef.current) return;
    dragRef.current = { dragging: true, startX: e.clientX, startScrollLeft: scrollRef.current.scrollLeft, moved: false };
  }

  function scrollByOctave(direction) {
    scrollRef.current?.scrollBy({ left: direction * OCTAVE_SCROLL_STEP * keyWidth, behavior: 'smooth' });
  }

  // Cycles the LCD sound selector — wraps at both ends, like a real
  // keyboard's Voice ‹ › buttons. No-op if the caller didn't wire up
  // onPianoProfileChange (defensive only; App.jsx always passes it).
  function cycleSound(direction) {
    if (!onPianoProfileChange) return;
    const keys = PIANO_SOUND_PROFILES.map((p) => p.key);
    const current = keys.indexOf(pianoProfile);
    const next = (current + direction + keys.length) % keys.length;
    onPianoProfileChange(keys[next]);
  }

  const currentSoundLabelKey = (PIANO_SOUND_PROFILES.find((p) => p.key === pianoProfile) ?? PIANO_SOUND_PROFILES[0]).labelKey;

  // Tempo ± — a fine 1 BPM step for the panel's own buttons (deliberately
  // finer than the global Ctrl+ArrowUp/Down shortcut's ±5 step in
  // shortcutActions.js — that one stays a coarser jump, this is for precise
  // manual dialing-in). setBpm itself clamps to useMetronome.js's
  // MIN_BPM/MAX_BPM.
  function stepTempo(direction) {
    onMetronomeBpmChange?.(metronomeBpm + direction * 1);
  }

  function startEditingBpm() {
    setBpmDraft(String(metronomeBpm));
    setEditingBpm(true);
  }

  function commitBpmDraft() {
    const n = Number(bpmDraft);
    if (Number.isFinite(n) && n > 0) onMetronomeBpmChange?.(n);
    setEditingBpm(false);
  }

  function handleBpmDraftKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitBpmDraft();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingBpm(false);
    }
  }

  // Clicking the speaker icon mutes/unmutes — remembers whatever the slider
  // was at right before muting (in a ref, not state, since it's write-only
  // until the next mute/unmute and shouldn't trigger a re-render on its
  // own) and restores exactly that value on unmute, the way a real
  // hardware mute button doesn't forget your last volume setting.
  function toggleVolumeMute() {
    if (!onPianoVolumeChange) return;
    if (pianoVolume > 0) {
      lastVolumeRef.current = pianoVolume;
      onPianoVolumeChange(0);
    } else {
      onPianoVolumeChange(lastVolumeRef.current || 70);
    }
  }

  function keyFill(midi) {
    if (drillByMidi.has(midi)) {
      return DRILL_TIER_COLOR[drillByMidi.get(midi).tier] ?? 'var(--accent)';
    }
    if (quizFeedbackKey && quizFeedbackKey.midi === midi) {
      return quizFeedbackKey.correct ? '#34c759' : 'var(--danger)';
    }
    if (feedbackKeysByMidi.has(midi)) {
      const state = feedbackKeysByMidi.get(midi);
      return state === 'hit' ? '#34c759' : state === 'partial' ? '#FFD60A' : 'var(--danger)';
    }
    if (quizKeys) {
      return revealSet.has(midi) ? NOTE_FUNCTION_COLORS.root : null;
    }
    const note = notesByMidi.get(midi);
    if (!note) return null;
    if (colorMode === 'function') return NOTE_FUNCTION_COLORS[note.role] ?? MUTED_DOT_COLOR;
    // Single-color-per-chord mode: every chord tone (root/3rd/5th/bass) gets
    // the same chordColor — only 7ths/extensions stay gray — matching
    // Fretboard.jsx's own `isColored` rule exactly (see its "chord tone
    // dots" comment). Previously only the root got chordColor here, which
    // made a piano chord read as "one colored key plus a pile of gray ones"
    // instead of one consistently-colored chord shape like the guitar neck
    // already shows.
    // Scale-note entries (computePianoScaleTones) carry `isRoot` but no
    // `role` at all — fall back to isRoot so the scale's root key still
    // gets colored the way it always did, only chord entries (which DO
    // carry role) get the full root/3rd/5th/bass treatment above.
    const isColored = note.role
      ? note.role === 'root' || note.role === 'third' || note.role === 'fifth' || note.role === 'bass'
      : note.isRoot;
    return isColored ? chordColor ?? NOTE_FUNCTION_COLORS.root : MUTED_DOT_COLOR;
  }

  function keyOpacity(midi) {
    const note = drillByMidi.get(midi);
    return note ? DRILL_TIER_OPACITY[note.tier] ?? 1 : 1;
  }

  function isClickable(midi) {
    return quizKeys ? quizSet.has(midi) : true;
  }

  // Shared by handleKeyClick (mouse) and the sustain pair below (MIDI/
  // computer-keyboard) — routes the click to the quiz or free-play prop,
  // deliberately WITHOUT playing any sound itself (matches this function's
  // existing behavior before the sustain feature existed): quiz mode's
  // sound (if any) is entirely up to whichever caller owns onQuizKeyClick
  // — Ear Training stays silent on purpose, Chord Rhythm plays one-shot
  // itself. Returns whether this was a quiz-gated click, so the caller
  // knows whether it's still responsible for playing a sound.
  function registerNoteClick(midi) {
    if (quizKeys) {
      if (quizSet.has(midi)) onQuizKeyClick?.(midi);
      return true;
    }
    onNoteClick?.(midi);
    return false;
  }

  // Quiz mode only — a discrete click answers a question, there's no "hold"
  // concept to a quiz answer, so this stays a plain one-shot regardless of
  // input device. Free-play mouse notes now go through handleSustainedNoteOn/
  // Off below instead (see handlePress/ReleaseKey).
  function handleKeyClick(midi) {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    registerNoteClick(midi);
  }

  // Press-and-hold sustain — MIDI, the computer-keyboard-as-piano feature,
  // AND mouse/touch press-and-hold on the actual keys all route through
  // this same pair now: play starts on press, and for every sound EXCEPT
  // acoustic (see playPianoNoteOn's own comment) keeps ringing for exactly
  // as long as the key is held, stopping only on release — not on any
  // fixed timer. Same quiz-mode carve-out as registerNoteClick: only
  // free-play (non-quiz) notes get PianoKeyboard's own sound at all.
  function handleSustainedNoteOn(midi) {
    const wasQuiz = registerNoteClick(midi);
    if (!wasQuiz) playPianoNoteOn(midi);
  }

  function handleSustainedNoteOff(midi) {
    if (!quizKeys) playPianoNoteOff(midi);
  }

  // Mouse/touch press-and-hold on an actual key — quiz mode stays exactly
  // as before (a plain click via handleKeyClick, no hold); free play now
  // sustains via handleSustainedNoteOn/Off, the same pair MIDI/computer-
  // keyboard already use, so all four input methods behave identically.
  //
  // Deliberately does NOT check dragRef.current.moved the way the old
  // onClick-based handleKeyClick did — that check only made sense fired
  // AFTER mouseup (so it could see whether THIS press-release cycle
  // involved a drag). Firing on mousedown instead, before any drag can
  // have happened yet, that check would only ever see stale state left
  // over from the PREVIOUS interaction. Triggering the note immediately on
  // press (even if the player then drags off to pan) matches how a real
  // instrument behaves anyway — touching a key sounds it.
  function handlePressKey(midi) {
    if (quizKeys) return;
    handleSustainedNoteOn(midi);
  }

  function handleReleaseKey(midi) {
    if (quizKeys) return;
    handleSustainedNoteOff(midi);
  }

  // Touch chords — each finger touching a DIFFERENT key button fires its
  // OWN native touchstart/touchend targeted at that button (unlike mouse,
  // where there's only ever one pointer), so simply wiring these per-key,
  // the same way onMouseDown/onMouseUp already are, is what makes holding
  // 3+ notes at once with 3+ fingers work — no manual hit-testing needed.
  // `activeTouchesRef` maps each touch's own identifier to the midi it
  // pressed, so touchend releases exactly the right note per finger
  // regardless of the order fingers lift in.
  function handleTouchStartKey(e, midi) {
    lastTouchTimeRef.current = Date.now();
    Array.from(e.changedTouches).forEach((touch) => activeTouchesRef.current.set(touch.identifier, midi));
    addPressedNote(midi);
    handlePressKey(midi);
  }

  function handleTouchEndKey(e) {
    lastTouchTimeRef.current = Date.now();
    Array.from(e.changedTouches).forEach((touch) => {
      const midi = activeTouchesRef.current.get(touch.identifier);
      if (midi != null) {
        activeTouchesRef.current.delete(touch.identifier);
        removePressedNote(midi);
        handleReleaseKey(midi);
      }
    });
  }

  // Touch browsers replay a synthetic mousedown/mouseup/click a few hundred
  // ms after the real touch sequence ends, purely for compatibility with
  // mouse-only sites. Without this guard, every tap would re-trigger
  // handlePressKey a second time — and worse, a 3-finger chord (three real
  // touchstart events, one per key) would collapse back down to a single
  // synthetic mousedown on whichever key the OS picks, defeating the whole
  // point of wiring touch separately.
  function handleMouseDownKey(midi) {
    if (Date.now() - lastTouchTimeRef.current < 800) return;
    mouseHeldMidiRef.current = midi;
    addPressedNote(midi);
    handlePressKey(midi);
  }

  function handleKeyDown(e, midi, clickable) {
    if (clickable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleKeyClick(midi);
    }
  }

  // Kept current on every render via the effect below (not in the
  // `connectMidi`-time closure) so a MIDI device connected once, early,
  // still reaches whichever quiz/notes/onNoteClick props are active NOW —
  // without this indirection, `input.onmidimessage` would keep calling the
  // stale handler from whenever connectMidi() happened to run.
  midiMessageHandlerRef.current = function handleMidiMessage(event) {
    const [statusByte, note, velocity] = event.data;
    const command = statusByte & 0xf0;
    const isNoteOn = command === 0x90 && velocity > 0;
    const isNoteOff = command === 0x80 || (command === 0x90 && velocity === 0);
    if (isNoteOn) {
      setMidiHeldNotes((prev) => new Set(prev).add(note));
      if (isClickable(note)) handleSustainedNoteOn(note);
    } else if (isNoteOff) {
      setMidiHeldNotes((prev) => {
        if (!prev.has(note)) return prev;
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      handleSustainedNoteOff(note);
    }
  };

  function attachMidiInputs(access) {
    const inputs = Array.from(access.inputs.values());
    inputs.forEach((input) => {
      input.onmidimessage = (e) => midiMessageHandlerRef.current?.(e);
    });
    setMidiDeviceName(inputs.length > 0 ? inputs.map((i) => i.name).join(', ') : null);
    setMidiStatus(inputs.length > 0 ? 'connected' : 'noDevice');
  }

  async function connectMidi() {
    if (!midiSupported) {
      setMidiStatus('unsupported');
      return;
    }
    setMidiStatus('connecting');
    try {
      const access = await navigator.requestMIDIAccess();
      attachMidiInputs(access);
      // A device plugged in/unplugged after the initial connect (or the
      // very first grant, before any input existed) re-attaches to
      // whatever's current rather than requiring the user to reconnect.
      access.onstatechange = () => attachMidiInputs(access);
    } catch {
      setMidiStatus('denied');
    }
  }

  // Same ref-indirection pattern as midiMessageHandlerRef above (assigned
  // fresh every render, not inside the effect below) — keeps the handler's
  // closure over isClickable/handleKeyClick/octaveOffset current without
  // having to re-attach the actual window listener on every keystroke.
  computerKeyDownHandlerRef.current = function handleComputerKeyDown(e) {
    const target = e.target;
    const isFormTarget = ['INPUT', 'SELECT', 'TEXTAREA'].includes(target?.tagName) || target?.isContentEditable;
    // e.repeat: ignore OS key-repeat entirely (both for notes and for Z/X
    // octave shift) so holding a key down doesn't re-trigger handleKeyClick
    // or spiral the octave — a fresh physical press is required each time.
    if (isFormTarget || e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
    const key = e.key.toLowerCase();
    if (key === 'z') {
      setOctaveOffset((o) => Math.max(MIN_OCTAVE_OFFSET, o - 1));
      return;
    }
    if (key === 'x') {
      setOctaveOffset((o) => Math.min(MAX_OCTAVE_OFFSET, o + 1));
      return;
    }
    if (!(key in COMPUTER_KEY_TO_SEMITONE)) return;
    e.preventDefault();
    const midi = clamp(MIDDLE_C_MIDI + octaveOffset * 12 + COMPUTER_KEY_TO_SEMITONE[key], LOWEST_MIDI, HIGHEST_MIDI);
    setComputerKeyHeldNotes((prev) => new Set(prev).add(midi));
    if (isClickable(midi)) handleSustainedNoteOn(midi);
  };

  computerKeyUpHandlerRef.current = function handleComputerKeyUp(e) {
    const key = e.key.toLowerCase();
    if (!(key in COMPUTER_KEY_TO_SEMITONE)) return;
    const midi = clamp(MIDDLE_C_MIDI + octaveOffset * 12 + COMPUTER_KEY_TO_SEMITONE[key], LOWEST_MIDI, HIGHEST_MIDI);
    setComputerKeyHeldNotes((prev) => {
      if (!prev.has(midi)) return prev;
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
    handleSustainedNoteOff(midi);
  };

  // The actual window listener only attaches/detaches when the toggle
  // itself flips (default off) — not on every keystroke or render — and
  // always calls through to whichever handler is current in the refs
  // above. Same FORM_TAGS-style guard as the global shortcuts listener
  // (useGlobalShortcutListener.js) so typing in Compose's chord input, a
  // text field, etc. is never hijacked into playing notes.
  useEffect(() => {
    if (!computerKeyboardEnabled) return undefined;
    function onKeyDown(e) {
      computerKeyDownHandlerRef.current?.(e);
    }
    function onKeyUp(e) {
      computerKeyUpHandlerRef.current?.(e);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      setComputerKeyHeldNotes(new Set());
    };
  }, [computerKeyboardEnabled]);

  return (
    <div className="piano-keyboard">
      {/* Styled like a real electric piano's control strip (brushed dark
          panel, screws, an LCD voice readout) rather than a plain row of
          web buttons — sits in the exact same spot the old plain controls
          row did, directly above the keys. Every underlying control is
          unchanged: same connectMidi/setComputerKeyboardEnabled/
          setShowAllLabels handlers and state as before, just restyled +
          the new sound-cycling LCD added alongside them. */}
      <div className="piano-panel">
        <div className="piano-panel-sound">
          <button type="button" className="piano-panel-chevron" onClick={() => cycleSound(-1)} aria-label={t('piano.sound.prev')}>
            ‹
          </button>
          <div className="piano-panel-lcd">
            <span className="piano-panel-lcd-value">{t(currentSoundLabelKey)}</span>
          </div>
          <button type="button" className="piano-panel-chevron" onClick={() => cycleSound(1)} aria-label={t('piano.sound.next')}>
            ›
          </button>
        </div>

        {/* Volume — a real slider, no LCD (per explicit request: this one
            control reads its own value directly off the handle rather than
            through a screen, the way a physical volume slider does). The
            speaker icon itself is a mute toggle, drawn with real
            sound-wave arcs (not an emoji) so the number of visible waves
            tracks the current level, and a muted state draws an X instead. */}
        <div className="piano-panel-volume">
          <button
            type="button"
            className="piano-panel-volume-icon"
            onClick={toggleVolumeMute}
            aria-label={pianoVolume === 0 ? t('piano.volume.unmute') : t('piano.volume.mute')}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path d="M4 9v6h4l5 5V4L8 9H4z" fill="#e8e8ea" />
              {pianoVolume > 0 && (
                <path d="M15.3 8.5a4.6 4.6 0 010 7" fill="none" stroke="#4dabf7" strokeWidth="1.6" strokeLinecap="round" />
              )}
              {pianoVolume >= 40 && (
                <path d="M18.1 5.7a8.6 8.6 0 010 12.6" fill="none" stroke="#4dabf7" strokeWidth="1.6" strokeLinecap="round" />
              )}
              {pianoVolume === 0 && (
                <>
                  <line x1="15" y1="8" x2="20" y2="16" stroke="#ff6b6b" strokeWidth="1.6" strokeLinecap="round" />
                  <line x1="20" y1="8" x2="15" y2="16" stroke="#ff6b6b" strokeWidth="1.6" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
          <input
            type="range"
            className="piano-panel-slider"
            min={0}
            max={100}
            value={pianoVolume}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (next > 0) lastVolumeRef.current = next;
              onPianoVolumeChange?.(next);
            }}
            aria-label={t('piano.volume.label')}
          />
        </div>

        <div className="piano-panel-metronome">
          <button
            type="button"
            className={'piano-panel-btn piano-panel-transport' + (metronomeIsRunning ? ' active' : '')}
            onClick={() => onMetronomeToggle?.()}
            aria-pressed={metronomeIsRunning}
            aria-label={metronomeIsRunning ? t('piano.metronome.stop') : t('piano.metronome.play')}
          >
            <span className="piano-panel-led" aria-hidden="true" />
            <span className="piano-panel-btn-icon" aria-hidden="true">
              {metronomeIsRunning ? '⏹' : '▶'}
            </span>
          </button>
          <button type="button" className="piano-panel-chevron" onClick={() => stepTempo(-1)} aria-label={t('piano.metronome.tempoDown')}>
            −
          </button>
          {editingBpm ? (
            <div className="piano-panel-lcd piano-panel-lcd-editing">
              <input
                ref={bpmInputRef}
                type="number"
                className="piano-panel-bpm-input"
                value={bpmDraft}
                onChange={(e) => setBpmDraft(e.target.value)}
                onBlur={commitBpmDraft}
                onKeyDown={handleBpmDraftKeyDown}
                aria-label={t('piano.metronome.label')}
              />
            </div>
          ) : (
            <div className="piano-panel-lcd piano-panel-lcd-clickable" onClick={startEditingBpm} title={t('piano.metronome.editHint')}>
              <span className="piano-panel-lcd-value">{t('piano.metronome.bpmValue', { bpm: metronomeBpm })}</span>
            </div>
          )}
          <button type="button" className="piano-panel-chevron" onClick={() => stepTempo(1)} aria-label={t('piano.metronome.tempoUp')}>
            +
          </button>
        </div>

        <div className="piano-panel-buttons">
          {/* Web MIDI is entirely unimplemented in every iOS browser (all of
              them run on WebKit, regardless of "Chrome"/"Firefox" branding
              on the App Store) — a plugged-in MIDI keyboard can never be
              detected there no matter what. Rather than show a button that
              can only ever fail with "not supported" on those devices, it's
              simply not rendered when midiSupported is false, the same way
              a feature gated by featureCapabilities.js doesn't show its tab
              at all rather than showing a disabled one. */}
          {midiSupported && (
            <button
              type="button"
              className={'piano-panel-btn' + (midiStatus === 'connected' ? ' active' : '') + (midiStatus === 'denied' ? ' warn' : '')}
              onClick={connectMidi}
              disabled={midiStatus === 'connecting' || midiStatus === 'connected'}
            >
              <span className="piano-panel-led" aria-hidden="true" />
              <span className="piano-panel-btn-icon" aria-hidden="true">
                🎹
              </span>
              <span className="piano-panel-btn-label">
                {midiStatus === 'connected'
                  ? t('piano.midi.connected', { device: midiDeviceName })
                  : midiStatus === 'connecting'
                  ? t('piano.midi.connecting')
                  : midiStatus === 'denied'
                  ? t('piano.midi.denied')
                  : midiStatus === 'noDevice'
                  ? t('piano.midi.noDevice')
                  : t('piano.midi.connect')}
              </span>
            </button>
          )}
          <button
            type="button"
            className={'piano-panel-btn' + (computerKeyboardEnabled ? ' active' : '')}
            onClick={() => setComputerKeyboardEnabled((v) => !v)}
            aria-pressed={computerKeyboardEnabled}
            title={t('piano.computerKeys.tooltip')}
          >
            <span className="piano-panel-led" aria-hidden="true" />
            <span className="piano-panel-btn-icon" aria-hidden="true">
              ⌨️
            </span>
            <span className="piano-panel-btn-label">
              {computerKeyboardEnabled
                ? t('piano.computerKeys.onLabel', { offset: octaveOffset >= 0 ? `+${octaveOffset}` : String(octaveOffset) })
                : t('piano.computerKeys.toggle')}
            </span>
          </button>
          <button
            type="button"
            className={'piano-panel-btn' + (showAllLabels ? ' active' : '')}
            onClick={() => setShowAllLabels((v) => !v)}
            aria-pressed={showAllLabels}
          >
            <span className="piano-panel-led" aria-hidden="true" />
            <span className="piano-panel-btn-icon" aria-hidden="true">
              🏷️
            </span>
            <span className="piano-panel-btn-label">{t('piano.labels')}</span>
          </button>
        </div>
      </div>

      {/* The physical seam between the panel and the keybed — see its own
          CSS comment. Purely decorative (aria-hidden), fixes the panel and
          keys reading as two disconnected floating pieces. */}
      <div className="piano-keyboard-connector" aria-hidden="true" />

      <div className="piano-keyboard-viewport" ref={viewportRef}>
        {scrollMetrics.canScrollLeft && (
          <button
            type="button"
            className="piano-keyboard-nav piano-keyboard-nav-left"
            onClick={() => scrollByOctave(-1)}
            aria-label={t('piano.prevOctaves')}
          >
            ‹
          </button>
        )}
        {scrollMetrics.canScrollRight && (
          <button
            type="button"
            className="piano-keyboard-nav piano-keyboard-nav-right"
            onClick={() => scrollByOctave(1)}
            aria-label={t('piano.nextOctaves')}
          >
            ›
          </button>
        )}

        <div
          className="piano-keyboard-scroll"
          ref={scrollRef}
          onScroll={updateScrollMetrics}
          onMouseDown={handleMouseDown}
          role="img"
          aria-label={t('piano.ariaLabel')}
        >
          <div className="piano-keyboard-keys" style={{ width: totalWidth, height: WHITE_KEY_HEIGHT }}>
            {WHITE_KEYS.map((w) => {
              const fill = keyFill(w.midi);
              const clickable = isClickable(w.midi);
              const isMiddleC = w.midi === MIDDLE_C_MIDI;
              return (
                <div key={w.midi} className="piano-white-key-col" style={{ width: keyWidth }}>
                  <button
                    type="button"
                    className={
                      'piano-key piano-key-white' +
                      (fill ? ' active' : '') +
                      (clickable ? '' : ' disabled') +
                      (isMiddleC ? ' piano-key-middle-c' : '') +
                      (midiHeldNotes.has(w.midi) || computerKeyHeldNotes.has(w.midi) || pressedNotes.has(w.midi) ? ' midi-held' : '')
                    }
                    style={fill ? { backgroundColor: fill, opacity: keyOpacity(w.midi) } : undefined}
                    onClick={() => clickable && quizKeys && handleKeyClick(w.midi)}
                    onMouseDown={() => clickable && handleMouseDownKey(w.midi)}
                    onTouchStart={(e) => clickable && handleTouchStartKey(e, w.midi)}
                    onTouchEnd={handleTouchEndKey}
                    onTouchCancel={handleTouchEndKey}
                    onKeyDown={(e) => handleKeyDown(e, w.midi, clickable)}
                    tabIndex={clickable ? 0 : -1}
                    aria-label={t('fretboard.playNote', { note: noteLabel(w.midi) })}
                  >
                    {(() => {
                      const isC = w.pitchClass === 0;
                      // `|| fill` — a colored chord/quiz-reveal tone shows its
                      // letter name regardless of showAllLabels/labelMode, so
                      // a colored key is never just an unlabeled color swatch.
                      const showLabel = isMiddleC || showAllLabels || fill || (labelMode === 'note' && isC);
                      if (!showLabel) return null;
                      // Every C, not just Middle C, gets the small dot-above-
                      // letter marker — C is the one reference point players
                      // read the whole keyboard from octave to octave, so the
                      // same landmark repeats everywhere it occurs. Middle C
                      // stays visually distinct on top of that (bold, accent
                      // color, the tinted top edge from .piano-key-middle-c).
                      return (
                        <span className={'piano-key-label' + (isMiddleC ? ' piano-key-label-middle-c' : '')}>
                          {isC && <span className="piano-key-c-dot" aria-hidden="true" />}
                          {isMiddleC ? noteLabel(w.midi) : NOTE_NAMES[w.pitchClass]}
                        </span>
                      );
                    })()}
                    {fingerByMidi.has(w.midi) && <span className="piano-key-finger">{fingerByMidi.get(w.midi)}</span>}
                    {computerKeyByMidi.has(w.midi) && <span className="piano-key-hint">{computerKeyByMidi.get(w.midi)}</span>}
                  </button>

                  {w.blackKey && (() => {
                    const blackMidi = w.blackKey.midi;
                    const blackFill = keyFill(blackMidi);
                    const blackClickable = isClickable(blackMidi);
                    return (
                      <button
                        type="button"
                        className={
                          'piano-key piano-key-black' +
                          (blackFill ? ' active' : '') +
                          (blackClickable ? '' : ' disabled') +
                          (midiHeldNotes.has(blackMidi) || computerKeyHeldNotes.has(blackMidi) || pressedNotes.has(blackMidi) ? ' midi-held' : '')
                        }
                        style={{
                          width: blackKeyWidth,
                          height: BLACK_KEY_HEIGHT,
                          left: keyWidth - blackKeyWidth / 2,
                          ...(blackFill ? { backgroundColor: blackFill, opacity: keyOpacity(blackMidi) } : undefined),
                        }}
                        onClick={() => blackClickable && quizKeys && handleKeyClick(blackMidi)}
                        onMouseDown={() => blackClickable && handleMouseDownKey(blackMidi)}
                        onTouchStart={(e) => blackClickable && handleTouchStartKey(e, blackMidi)}
                        onTouchEnd={handleTouchEndKey}
                        onTouchCancel={handleTouchEndKey}
                        onKeyDown={(e) => handleKeyDown(e, blackMidi, blackClickable)}
                        tabIndex={blackClickable ? 0 : -1}
                        aria-label={t('fretboard.playNote', { note: noteLabel(blackMidi) })}
                      >
                        {showAllLabels || blackFill ? (
                          <span className="piano-key-black-label">{NOTE_NAMES[w.blackKey.pitchClass]}</span>
                        ) : null}
                        {computerKeyByMidi.has(blackMidi) && (
                          <span className="piano-key-hint piano-key-hint-black">{computerKeyByMidi.get(blackMidi)}</span>
                        )}
                      </button>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
