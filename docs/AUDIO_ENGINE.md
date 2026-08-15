# Audio Engine: Sample-Based Realistic Instrument Playback

This document is the deliverable for the "realistic guitar/piano/drum audio engine" work: a comparison of candidate open-source libraries, the licensing terms for each, a performance summary, the recommended architecture (and why it's instrument-agnostic, not guitar-specific), the migration path from the previous oscillator-only engine, and the concrete path to adding Piano/Bass/Drums later without touching the playback core.

## 1. Library comparison

Researched and verified live against GitHub/npm (not from training-data memory) as of the date of this work.

| Library | Realism | Bundle/load cost | License | Maintenance | Verdict |
|---|---|---|---|---|---|
| **smplr** (`danigb/smplr`) | Real sampled instruments: General MIDI Soundfont set (incl. every guitar articulation needed), a dedicated Steinway piano (`SplendidGrandPiano`), and multiple real drum-machine sample kits (`DrumMachine`, `DrumAbuse`) | ~541 kB package; instrument audio streamed from CDN on demand, not bundled; browser `CacheStorage`-cached after first load | **MIT** | v1.0.0, actively maintained (pushed within the last 2 months at research time), TypeScript-native, 312+ stars | **Chosen** |
| `soundfont-player` (danigb's earlier project) | Same underlying samples | Similar | MIT | **Archived**; its own README now says "use smplr instead" | Superseded — do not adopt |
| `gleitz/midi-js-soundfonts` (the sample CDN smplr's `Soundfont` pulls from) | FluidR3_GM / MusyngKite soundfont audio (mp3/ogg), includes every guitar variant needed | N/A — a static sample archive, not a JS library | Repo MIT; **audio itself CC-BY 3.0 (FluidR3)** | Dormant since 2022 but stable ("done" — soundfont conversions don't need churn) | Used transitively via smplr |
| Tone.js + `nbrosowsky/tonejs-instruments` | Real samples via `Tone.Sampler` | Tone.js itself is a full synthesis/effects framework, heavier than needed just for a sampler | MIT (code), CC-BY 3.0 (samples) | Tone.js very active; the instrument sample repo dormant since 2023, smaller guitar/piano set than smplr | Solid alternative, not chosen — would pull in Tone.js's whole synthesis graph just for `Sampler` |
| SFZ web players (`sfz-web-player`, `sfizz-webaudio`) | Real samples (raw SFZ parsing) | Adds SFZ-parsing complexity | Varies | Low activity, niche | Not worth it — smplr already wraps SFZ-based content (VCSL) internally |

## 2. Recommended repository to reuse

**[`danigb/smplr`](https://github.com/danigb/smplr)** (npm: `smplr`), MIT licensed.

Why it won on every evaluation criterion:
- **Audio realism**: real recorded/sampled instruments, not synthesis — the whole point of this work.
- **Performance**: samples are fetched lazily per instrument (only the guitar articulation actually selected downloads), cached by the browser after first load, and the package itself adds ~541 kB to the dependency tree (not the runtime bundle — audio assets are separate network fetches).
- **Browser/mobile compatibility**: pure Web Audio API, no platform-specific code; works anywhere the app already runs (it already requires Web Audio for the existing oscillator engine).
- **License**: MIT code; CC-BY 3.0 attribution requirement on the underlying FluidR3/MusyngKite soundfont audio, satisfied by the attribution line in Settings (`settings.audioAttribution`) and here.
- **Ease of integration**: it accepts an **externally-created `AudioContext`** rather than making its own — this app already has exactly one shared `AudioContext` (`src/audio/audioContext.js`), so smplr instruments schedule against the same clock the metronome/drum engine already use. Its `start({ note, time, velocity, duration })` API's `time` parameter was verified (by reading smplr's own TypeScript source, `scheduler.ts` → `voice.ts` → `AudioBufferSourceNode.start()`) to be an **absolute `audioContext.currentTime`-relative timestamp** — exactly the value this app's lookahead schedulers (`nextBeatTime`/`nextStepTime`) already compute. No timing-model translation was needed anywhere.
- **Long-term maintainability**: actively developed (danigb also maintains `tonal.js`); TypeScript types ship in the package.

## 3. Licensing summary

- **smplr package code**: MIT (permissive, commercial use OK, no attribution technically required but given anyway as good practice).
- **Guitar/piano/drum sample audio** (served via smplr's `Soundfont`/`DrumMachine`/`SplendidGrandPiano` modules from `smpldsnds.github.io`, itself derived from the FluidR3_GM and MusyngKite General MIDI soundfonts): **CC-BY 3.0**, which requires attribution but otherwise permits commercial use, modification, and redistribution. Attribution is provided:
  - In the app itself: a small print line in Settings, next to the Guitar Sound picker (`settings.audioAttribution`).
  - Here, in this document.

No GPL/AGPL/copyleft or commercial-license-required components were introduced.

## 4. Performance

- **No bundle-size cost for unused instruments** — smplr only downloads the specific articulation/kit actually selected (e.g. choosing "Acoustic" guitar only fetches `acoustic_guitar_steel` samples, never the other three profiles).
- **First play of a newly-selected profile** pays real network latency (sample download); `useAudioSettings.js` starts this download the moment the user picks a profile in Settings (not on first note), so by the time they actually play something it's typically already loaded.
- **Zero risk of scheduling drift**: `instrumentEngine.js` tracks each instrument's readiness with a *synchronous* flag (`entry.isReady`), not just a Promise. Every playback call (`playNote`, `playPosition`'s strum, `playLick`'s sequence, the metronome's lookahead scheduler) computes its absolute `AudioContext` time up front and checks `isReady` synchronously — if samples aren't loaded yet for *that specific call*, it falls back to the original oscillator synth immediately rather than ever awaiting a Promise mid-schedule (which would let real time drift past the intended moment while waiting, and cause notes to fire late or out of order).
- **Repeat notes are effectively free** — once an instrument's `ready` Promise has resolved, `isReady` is cached `true` forever; no per-note network or decode cost.
- **Caching**: smplr uses the browser's `CacheStorage` API for fetched samples (HTTPS only), so a returning user on the same profile doesn't re-download anything.

## 5. Architecture

```
src/audio/
  audioContext.js          # unchanged — the one shared AudioContext, everything schedules against it
  instrumentEngine.js       # NEW — generic core: getSoundfontInstrument(name), getDrumMachine(kit),
                             #        getSplendidPiano(), each lazily-cached with a synchronous isReady flag
  instrumentProfiles.js     # NEW — declarative registry: GUITAR_SOUND_PROFILES, PIANO_SOUND_PROFILES
                             #        (reserved), METRONOME_PERCUSSION_OPTIONS — the ONLY place that
                             #        knows concrete smplr instrument/kit/sample names
  audioSettingsStore.js     # NEW — tiny module-level mirror of "which guitar profile is selected right
                             #        now", kept in sync by useAudioSettings.js, read by chordPlayer.js/
                             #        lickPlayer.js so no component between Settings and a note-playing
                             #        call site needs a `profile` prop threaded through it
  chordPlayer.js            # MODIFIED — playNote/playPosition: sampled instrument if ready, else the
                             #        original (untouched) oscillator pluck
  lickPlayer.js              # MODIFIED — same pattern for playLick; bend/vibrato-tagged notes fall back
                             #        to a clean sustained sample under a sampled profile (no per-note
                             #        pitch automation on a sample player — disclosed trade-off)
  metronome.js               # MODIFIED — CLICK_SOUND_OPTIONS gains sampled percussion entries
                             #        (hi-hat, rim, stick, snare, kick, wood block, shaker) alongside the
                             #        existing click/beep/tick oscillator set, same isReady fallback
  drumSounds.js, drumEngine.js  # untouched — the Drum Machine backing-track feature is out of scope
```

**Why this is instrument-agnostic, not guitar-specific:** `instrumentEngine.js` has zero knowledge of "guitar" — it only knows "Soundfont instrument names", "DrumMachine kit names", and "the piano". `instrumentProfiles.js` is the *only* file that maps a user-facing concept ("Acoustic Guitar", "Rim Click") to a concrete sample name. Adding **Piano Learning Mode** later means:
1. Add a `PIANO_SOUND_PROFILES` entry (already stubbed) pointing at `getSplendidPiano()`.
2. Reuse the same `start({ note, time, velocity, duration })` scheduling pattern `chordPlayer.js` already established.
3. Zero changes to `instrumentEngine.js`.

Adding **Bass** or further **Drum kits** follows the identical pattern — a new profile entry, no core changes. This is the concrete fulfillment of "the playback layer should be modular so that changing instruments requires only switching the instrument profile or sample set."

## 6. Migration plan (what actually changed, and what didn't)

- **Added dependency**: `smplr` (first non-React dependency in the project).
- **New files**: `instrumentEngine.js`, `instrumentProfiles.js`, `audioSettingsStore.js`, `src/hooks/useAudioSettings.js`, this document.
- **Modified**: `chordPlayer.js`, `lickPlayer.js`, `metronome.js` — each gained a sampled-playback branch with the original synthesis code kept **unchanged** as the fallback path (not rewritten, not deleted). `App.jsx`/`SettingsPanel.jsx` gained the Guitar Sound picker.
- **Unchanged call sites** (deliberately, via the `audioSettingsStore.js` indirection): `Fretboard.jsx`'s note-click handler, `usePracticeDrill.js`'s "Hear It" playback, `earTrainingPlayer.js`'s quiz-question audio, and every `playPosition`/`playLick` call in `App.jsx` — none of them needed a signature change or a new prop, because they already call `playNote(midi)`/`playPosition(strings)`/`playLick(notes, opts)` exactly as before; the currently-selected guitar profile is read internally rather than threaded through the component tree. This means the "significantly more realistic... everywhere" requirement is satisfied by construction — every existing call site upgrades automatically.
- **Fallback preserved literally**: selecting "Classic" in the Guitar Sound picker (`GUITAR_SOUND_PROFILES`'s `synth` entry) uses the exact original oscillator code path, unchanged. The same fallback also triggers automatically and silently (no error, no broken UI) if a sampled instrument hasn't finished loading yet or its samples fail to fetch (offline, blocked CDN).

## 7. Future expansion path

To add a new instrument (Piano, Bass, a new Drum kit, anything else):
1. Confirm smplr already ships it (`getSoundfontNames()`/`getDrumMachineNames()`, or one of its dedicated instrument classes) — it likely does, given its broad General MIDI + drum-machine + piano coverage.
2. Add one entry to `instrumentProfiles.js` (a name + which `instrumentEngine.js` getter it uses).
3. Reuse the existing `start({ note, time, velocity, duration })` scheduling pattern already established in `chordPlayer.js`/`metronome.js` for the new feature's playback calls.

No changes to `instrumentEngine.js`, `audioContext.js`, or any existing playback call site are required — this is the "solid foundation... without major refactoring" the architecture was designed for.

### Piano research (for the upcoming Piano Learning Mode)

smplr's `SplendidGrandPiano` module is the recommended starting point: sampled from a Steinway grand (via the Salamander Grand Piano recordings, Alexander Holm, **CC-BY 3.0**, 48kHz/24-bit, originally 16 velocity layers), already wrapped with the same lazy-load + shared-`AudioContext` pattern as the guitar soundfonts, and already reachable via `instrumentEngine.getSplendidPiano()` (built in this task, not yet wired to any UI). This sounds like a real acoustic piano, not a synthesized keyboard, satisfying that requirement directly when the Piano feature is built.

### Drum/percussion research (for the metronome, delivered in this task)

Sourced from smplr's `DrumMachine` sample kits (manifests fetched and verified directly from `smpldsnds.github.io/drum-machines/*/dm.json`):

| Requested sound | Kit | Sample group used |
|---|---|---|
| Hi-Hat | TR-808 | `hihat-open` |
| Closed Hi-Hat | TR-808 | `hihat-close` |
| Rim Click | TR-808 | `rimshot` |
| Stick | LM-2 | `stick` |
| Snare | TR-808 | `snare` |
| Kick | TR-808 | `kick` |
| Wood Block | TR-808 | `clave` (vintage drum machines of this era don't ship a literal woodblock sample; a clave hit is the standard stand-in — disclosed rather than mislabeled) |
| Shaker | TR-808 | `maraca` |

All are real recorded/sampled drum-machine hits (not synthesized noise/oscillators, unlike the existing `drumSounds.js` backing-track engine), available as opt-in metronome click sounds alongside the original click/beep/tick set.
