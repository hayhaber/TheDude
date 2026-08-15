# Multi-Instrument Learning Platform: Piano Mode & the Instrument-Agnostic Architecture

This document is the full deliverable for turning the app from a guitar-only tool into a multi-instrument learning platform where Guitar and Piano are two implementations of one shared educational engine. It covers: the proposed architecture, the refactoring plan, a complete feature-by-feature mapping, the module structure, and the implementation roadmap.

## 1. Proposed architecture

```
Music Theory (instrument-agnostic — unchanged)
  chordQualities.js · scaleAnalyzer.js · scalesCurriculum.js's SCALE_FAMILIES ·
  chordSymbolParser.js · noteFunction.js · spelling.js · tensionMeter.js · earTraining.js's audio side
        │
        ├── Guitar-specific consumers (unchanged)
        │     computeChordPositions.js · scaleShapes.js · triads.js · cagedCurriculum.js ·
        │     positionRoadmap.js · fingering.js · heatMap.js · licks.js · generateLick.js · soloCoach.js
        │         → rendered by <Fretboard>
        │
        └── Piano-specific consumers (new, thin)
              pianoChordTones.js · pianoScaleTones.js · earTraining.js's pianoQuizKeys()
                  → rendered by <PianoKeyboard>

Instrument selection   instruments/InstrumentContext.jsx + useInstrument.js (Context, mirrors LanguageContext)
Capability system      instruments/featureCapabilities.js (declarative support map) + InstrumentGate.jsx
Stage.jsx              picks <Fretboard> or <PianoKeyboard> based on useInstrument()
```

### Key finding that shaped this design

The codebase already separated music theory from guitar-rendering more than it first appeared:

- `chordQualities.js`'s `CHORD_QUALITIES[qualityKey].tones` is `[{ degree, semitones, role }]` — already the pure, instrument-agnostic "what notes are in this chord, and what role does each play (root/third/fifth/seventh/extension)" table, with zero fret/string concept in it. `computeChordPositions.js` is the guitar-specific consumer that fits those tones onto fretboard positions. Piano needed only a much simpler consumer of the *same table* — `pitchClass = (root + semitones) % 12`, no fret-fitting/shape search.
- `scalesCurriculum.js`'s `SCALE_FAMILIES[key].intervals` (plain ascending semitone arrays, e.g. major = `[0,2,4,5,7,9,11]`) is the same story — `scaleShapes.js`'s `computeScaleNotes()` is the guitar-fret-windowing consumer of it.
- `chordSymbolParser.js` already parses slash chords into `{ root, qualityKey, bass }` — the `bass` field is exactly what a piano slash-chord bass-note highlight needed, with no changes to that parser at all.
- `noteFunction.js`'s role→color mapping (root/third/fifth/seventh/extension) is reused as-is for the piano's "clearly distinguish root from other chord tones" requirement.
- Ear Training's *audio* generation (`audio/earTrainingPlayer.js`) already worked in plain MIDI note numbers; only its *visual* click-target generation (`quizCells`, fretboard-cell-shaped) needed a piano-key equivalent.

This meant "avoid duplicating musical logic — music theory should exist only once" was **already true** for this codebase's data layer; the work was adding new, small, piano-specific *consumers* of existing agnostic tables and a new *renderer*, not extracting theory out of guitar-specific code.

## 2. Refactoring plan

Executed in this order, so the app stayed fully functional and unregressed after every single step:

1. **`InstrumentProvider` added to `main.jsx`**, wrapping `<App />` alongside the existing `LanguageProvider`. Zero behavior change on its own — nothing reads the new context yet.
2. **`InstrumentToggle` added to `AppShell`**'s top controls (nav drawer + mobile corner), next to `LanguageToggle`. The global instrument switch now exists and persists (`localStorage`), but nothing downstream reacts to it yet.
3. **`PianoKeyboard` built as a new, independent component** (`components/PianoKeyboard/`). Zero risk to guitar code — nothing imports it yet.
4. **New piano music/audio files built** (`music/pianoChordTones.js`, `music/pianoScaleTones.js`, `audio/pianoPlayer.js`) — new files, zero changes to any existing guitar music/audio file.
5. **`Stage.jsx` made instrument-aware** — the one place Guitar and Piano visually diverge: `instrument === 'piano' ? <PianoKeyboard/> : <Fretboard/>`.
6. **`App.jsx` gained a `stagePianoProps` resolver**, sibling to the existing (untouched) `stageFretboardProps`, built from the same state via the new piano tone helpers.
7. **Guitar-only UI gated** with `<InstrumentGate feature="...">`: `ImproviseView` (entirely guitar-only, gated at its `App.jsx` call site), `PracticeView`'s Drills tab, `StudiesSection`'s CAGED course tab (both gated internally, since their sibling tabs — Ear Training, Scales — stay available).
8. **Ear Training extended, not replaced**: `music/earTraining.js` gained `pianoQuizKeys(difficulty)` (derived from the *same* guitar string/fret ranges the question generators already use, guaranteeing every possible answer is always among the offered piano keys) and `useEarTraining.js` gained `handlePianoKeyClick(midi)`, sharing the exact same scoring/feedback/streak logic as `handleFretClick` via one shared internal `handleAnsweredMidi()`.
9. **No new Settings UI** for instrument choice — it lives in the nav bar as a top-level, always-visible concern, exactly like Language, not tucked into a Settings popover.

## 3. Feature mapping

| Feature / Component | Category | Notes |
|---|---|---|
| Compose (chord input, chord chips, chord display) | **Shared** | Piano: chord tones highlighted directly via `pianoChordTones.js`; no "position/inversion browsing" concept needed the way guitar has (piano has no analogous fingering-shape choice per chord) |
| Chord Finder *(= Compose's type-a-chord flow — no separately-named "Chord Finder" tool exists in this app)* | **Shared** | Same component, same `chordSymbolParser`/`CHORD_QUALITIES` |
| Scale Explorer *(= Studies → Scales)* | **Shared** | Reuses `SCALE_FAMILIES` directly via `pianoScaleTones.js` |
| Ear Training — pitch/interval/triad/call-response/scale-id | **Shared** | Choice-based modes (interval/triad/scale-id) needed no interaction change at all — only *reveal* highlighting changes renderer; pitch/call-response gained `pianoQuizKeys`/`handlePianoKeyClick` |
| Note-click playback (Fretboard dot / PianoKeyboard key) | **Shared** | `chordPlayer.js`/`pianoPlayer.js` both route through the same generic `audio/instrumentEngine.js` built in the prior audio-engine task |
| Metronome, Drum Machine backing track | **Shared** | Already instrument-agnostic (rhythm, not pitch) — untouched |
| Songs (outbound search links) | **Shared** | Already instrument-neutral — untouched |
| Practice Timer / Dashboard, streaks, progress tracking | **Shared** | Session-based, not instrument-specific — untouched |
| Settings (theme, sound profile, language), navigation, achievements/history/favorites patterns | **Shared** | Framework-level, identical for both instruments |
| Improvise — Lick generator, Motif Development | **Guitar-only** | Licks are string/fret sequences carrying bend/vibrato/technique tags |
| Improvise — Phrase Builder, Call & Response builder | **Guitar-only** | Built on the same lick engine |
| Improvise — Solo Coach | **Guitar-only** | Analyzes guitar position-roadmap data |
| Emotion Mode (bend/vibrato injection) | **Guitar-only** | Explicitly technique-based, matches the request's own exclusion list |
| Practice → Drills (`music/drills.js`) | **Guitar-only** | Picking/speed/position-switch technique, explicitly excluded by the request |
| Studies → CAGED course | **Guitar-only** | The CAGED system is guitar-specific by definition |
| Position Roadmap / Voice Leading Assistant | **Guitar-only** | Fretboard-position-shift concept has no piano analogue |
| Chord Progressions as a *dedicated, animated* tool | **Piano-specific (future)** *— not yet its own feature on either instrument; Compose already shows one chord at a time* | Roadmap |
| Song Lessons | **Piano-specific (future)** *— doesn't exist as a distinct feature on either instrument yet* | Roadmap |
| Hand positioning, fingering, left/right-hand exercises, two-hand coordination, arpeggio practice, sight reading, chord-inversion drills, voice leading, pedal exercises | **Piano-specific (future)** | New lesson catalog, gated `['piano']` only — the capability system already supports this direction, not just guitar-only gating |

## 4. Module structure (implemented)

```
src/instruments/
  instrumentRegistry.js          # INSTRUMENTS list, DEFAULT_INSTRUMENT
  instrumentContextInstance.js   # the raw Context object
  InstrumentContext.jsx          # InstrumentProvider (component only, Fast-Refresh-clean)
  useInstrument.js               # the hook (function only, Fast-Refresh-clean)
  featureCapabilities.js         # FEATURE_CAPABILITIES map, supportsInstrument()
  InstrumentGate.jsx + .css      # <InstrumentGate feature="..."> wrapper + "Guitar Mode only" message

src/components/PianoKeyboard/
  PianoKeyboard.jsx              # the Fretboard-equivalent renderer
  PianoKeyboard.css

src/components/InstrumentToggle/
  InstrumentToggle.jsx + .css    # the global nav-bar selector

src/music/
  pianoChordTones.js             # (parsedChord) -> [{ midi, role, isRoot, isBass }]
  pianoScaleTones.js             # (rootPitchClass, scaleKey) -> [{ midi, degreeLabel, isRoot }]
  earTraining.js                 # + pianoQuizKeys() alongside the existing quizCells generation

src/audio/
  pianoPlayer.js                 # playPianoNote/playPianoChord, mirrors chordPlayer.js exactly
```

Note the split of `InstrumentContext`/`useInstrument`/the raw Context object into three small files rather than one — this keeps every file exporting *either* only components *or* only non-component values, avoiding the Fast-Refresh lint warning that `i18n/LanguageContext.jsx` already has as a pre-existing, tolerated exception (mixing a Provider component and a hook in one file). New code holds to the stricter pattern rather than repeating that exception.

## 5. Implementation roadmap

**Built in this task** (see §2/§3 above for exactly what): the full instrument abstraction, capability system, and global selector; a complete `PianoKeyboard` (88-key, responsive/windowed exactly like Fretboard's fret-paging, light+dark themed via the app's existing CSS custom properties, smooth key-press animation, click-to-play); Piano wired into Compose, Studies → Scales, and Ear Training; guitar-only surfaces (Improvise, Drills, CAGED) cleanly gated with a "Guitar Mode only" message; piano audio via the existing generic `instrumentEngine.js`/`getSplendidPiano()` (built in the prior audio-engine task and unused until this one — validating that architecture immediately).

**Documented roadmap, same architecture, no core rework needed:**
- A dedicated, animated Chord Progressions tool — shared, built once against the existing `Chord`/tone-list data model, works on both renderers without new theory logic.
- A Song Lessons feature.
- A `pianoCurriculum.js` lesson catalog (hand positioning, fingering, two-hand coordination, arpeggios, sight reading, voice leading, pedal exercises) — structurally parallel to `cagedCurriculum.js`, registered in `featureCapabilities.js` as `['piano']`-only (the same gating mechanism already used for guitar-only features, just inverted).
- The existing Guitar Sound profile picker in Settings becoming instrument-aware, showing Piano-specific sound-profile options when Piano is selected (today Piano always uses `SplendidGrandPiano`, with the same oscillator fallback pattern as guitar).
- Additional instruments (Bass, Ukulele, Mandolin, Violin, other MIDI-compatible instruments): each is one new `INSTRUMENTS` entry, one new renderer component, one new `audio/xPlayer.js`, and — where the instrument's chord/scale vocabulary differs (e.g. a 4-string bass) — one new thin tone-consumer file mirroring `pianoChordTones.js`. The music-theory engine, progress tracking, lesson framework, and every "Shared" feature in §3 require zero changes for any of these.

## Licensing note

Piano audio reuses `smplr`'s `SplendidGrandPiano` (built in the prior audio-engine task) — Steinway grand piano samples (via the Salamander Grand Piano recordings, Alexander Holm, **CC-BY 3.0**), served from the same CDN and cached the same way as the guitar Soundfont samples. No new licensing terms beyond what's already disclosed in `docs/AUDIO_ENGINE.md`.
