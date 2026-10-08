# DudeStar — Chord Progression App

A React 19 + Vite guitar/piano/bass chord-progression learning app ("DudeStar"),
repo `hayhaber/TheDude`, auto-deployed to Vercel on push to `main`
(https://the-dude.vercel.app/). All user communication is in Hebrew.

## Standing rules (apply to every session, every computer)

**1. Auto-push.** After finishing and verifying a code change, `git add` /
`git commit` / `git push origin main` without asking first — Vercel
auto-deploys, and the user tests live on phone/tablet. Still use judgment:
never push obviously broken/untested code, never force-push or rewrite
history without asking.

**2. New-work-only UI conventions** (do NOT retrofit onto existing UI):
   - Every button label is exactly one word, for NEW buttons.
   - Any NEW selection control with more than 2 options is a `<select>`
     dropdown, not radio/tabs/segmented-toggle — UNLESS it's a genuinely
     global, always-visible switcher (like the Guitar/Piano/Bass instrument
     toggle), which stays as individual pill buttons per explicit user
     preference (confirmed twice: a dropdown redesign was tried and reverted).
   - Existing multi-word labels and existing ≤3-option toggles are left as-is.
     Only retrofit when explicitly asked, as its own dedicated pass.

**3. Shared tab-bar/toggle styling.** Every tab bar / mode switcher / segmented
control uses `src/components/ModeToggle/ModeToggle.css`'s `.mode-toggle`
class. For 2–3 short options use the bare grid variant; for 4+ options or a
long label, use `.mode-toggle.wrap` (bordered individual pills — the bare
variant's transparent-inactive-button look visually merges into one flat bar
once there are that many options or a long label).

**4. Menu/list-item buttons.** Any `<button>` used as a menu/submenu/list row
(icon + label, meant to read left-aligned) must explicitly set
`justify-content: flex-start` — `src/index.css`'s global button reset
defaults to `center` and silently wins if not overridden.

**5. Theory content clarity.** When writing Studies-course lesson text, name
the resulting tones explicitly by their theory role (root/3rd/5th, tonic/
subdominant/dominant, ...), not just the interval-stacking motion used to
reach them — anchor with one concrete worked example.

**6. Zero regression.** Verify thoroughly (build + live browser check) before
calling anything done. Never break existing features/calculations/layouts as
a side effect of unrelated work. Keep visual changes isolated from logic.

**7. Realistic visuals.** Guitar/bass neck graphics (strings/frets/wood
grain/inlays) should look real — proper proportions, string gauges, and
material differences between instruments (see Bass's maple neck vs Guitar's
rosewood, below).

## Architecture essentials

- **Home screen** (`components/HomeMenu/`): opens first (App `home` state;
  rendered INSTEAD of AppShell). A light carousel of instrument cards
  (guitar, piano, bass, singing — art in `instrumentArt.js`, static SVG)
  in the style of a GarageBand-like instrument browser: art + title +
  description, shortcut row filtered by `supportsInstrument()`, swipe /
  arrows / dots / arrow keys / mouse wheel, scroll-snap (scrolled with
  `scrollBy`, not scrollIntoView, so the page doesn't move). It LOOPS: the
  cards are rendered 3x (`SLIDES`), and once a scroll settles in an outer
  copy it jumps instantly to the same card in the middle copy. Each card
  sits in an untransformed `.home-slot` (measured + snapped) and the card
  inside gets a per-frame "drum" transform from its distance to the centre
  (`applyDepth`: rotateY ±20°, scale, fade; no rotation with reduced
  motion; copies >2 cards away get no transform). WebKit (iPhone/Safari)
  rules for anything inside a card: NO nested 3D transforms (the piano art
  is a 2D `scaleY rotate` — a perspective/rotateX there was thrown into the
  card's corner on iPhone) and no `background-clip: text` + filter titles
  (flicker) — dark titles use text-shadow. No WebKit in this container to
  test with; the user checks on his iPhone. `onOpen({instrument, section,
  practiceTab})` sets them in App. The logo (drawer header + phone brand,
  AppShell `onHome`) returns to it; "Back to where I was" appears after the
  first visit. A 5th card, **Tools** (not an instrument), has Metronome /
  Tuner shortcuts: `onOpen({tool})` opens `components/ToolScreen/` — the tool
  ALONE on its own screen (App `toolScreen` state, rendered instead of home /
  AppShell; Metronome | Tuner switch, Back / logo / Escape -> home on the
  Tools card via `initialCard`; leaving stops the metronome). It uses the
  same `metronome`/`drums` instances as the app pills. The Tools card's 3rd
  shortcut is Settings: the same `SettingsBody` (exported from
  SettingsPanel.jsx, shared with the app's settings drawer via App's
  `settingsProps`) on its own page, with `allSounds` (guitar/piano/bass
  sound pickers all shown). Tuner title = "Guitar Tuner"/"Bass Tuner".
- **Tuner, guitar + bass**: `GuitarTuner mode='guitar'|'bass'`. Bass =
  `usePitchDetection(BASS_PITCH_RANGE)` (4096 window, 35–500 Hz; other
  callers keep the guitar default 2048 / 60–1500) and its own blue display
  (`.is-bass`: ice-blue in tune, amber close, rose off). The pill shows on
  guitar AND bass pages (bass pages -> bass mode; piano hides it). Tool
  screen: Guitar | Bass switch, default guitar; the Bass card's own Tuner
  shortcut opens it in bass (App `tunerMode`, returns to that card).
  Switching mode while listening restarts the mic.
- **Metronome + Tuner pills** (`MetronomeBar`, `TunerBar`) live only in the app
  pages: desktop (>=900px) fixed top-right (`.app-desktop-tools`, across from
  the menu button — NOT in the nav drawer); tablet/phone in the bar above the
  bottom tabs. Each is mounted twice (one hidden by CSS), so anything that
  opens a drawer programmatically must pick the visible one. Home also
  scrolls the carousel with the mouse wheel (one card per flick). GuitarPro's
  `.gp-song` scroll-margin-top is 60px on desktop to clear them.

- **Three instruments**: Guitar (6-string), Piano, Bass (4-string, E-A-D-G,
  Compose-only for now). Registered in
  `src/instruments/instrumentRegistry.js`; which app sections/features each
  instrument supports is declared in `src/instruments/featureCapabilities.js`
  (`supportsInstrument()` — unlisted feature keys default to "supported
  everywhere"; add a top-level entry for a whole nav section, not just its
  sub-tabs, or an instrument with no real content there will still see it
  unfiltered). `InstrumentGate.jsx` shows an inline fallback for
  finer-grained in-page gating.
- **Shared Fretboard** (`src/components/Fretboard/Fretboard.jsx`) takes an
  optional `tuning` prop (defaults to guitar's `STANDARD_TUNING` from
  `music/notes.js`) — Bass passes `BASS_TUNING`. String gauge/wound-count and
  wood color/grain (maple vs rosewood) are derived from tuning length inside
  the component. `Stage.jsx` is the single mount point
  (`instrument === 'piano' ? <PianoKeyboard> : <Fretboard>`).
  `computeChordPositions.js`/`triads.js`/etc. are guitar-only and untouched
  by Bass — Bass's root-note-only position math lives in its own
  `music/bassPositions.js`.
- **Audio**: one shared `AudioContext` (`audio/audioContext.js`), sampled
  instruments via `smplr` through the generic `audio/instrumentEngine.js`
  (`getSoundfontInstrument`/`preloadSoundfontInstrument` — verify any new
  soundfont name against `node_modules/smplr/dist/index.mjs`'s own list, not
  guessed). Per-instrument profile registries live in
  `audio/instrumentProfiles.js` (`GUITAR_SOUND_PROFILES`/
  `PIANO_SOUND_PROFILES`/`BASS_SOUND_PROFILES`), current selection mirrored
  in `audio/audioSettingsStore.js`, persisted via `hooks/useAudioSettings.js`.
- **i18n**: `src/i18n/strings.js`, EN + HE side by side, looked up via `t()`
  from `useLanguage()`.
- **Isolated testing pattern**: for pure music-theory/parsing logic, write a
  throwaway `.mjs` test directly in `src/music/` (for relative-import
  resolution), bundle with
  `npx esbuild <file>.mjs --bundle --platform=node --format=esm --outfile=<bundle>.mjs`,
  run with `node`, delete both files after. Much faster than live-browser
  verification for pure logic.
- **Live verification**: use the Browser pane against a **production build**
  (`npm run build` + `vite preview`), not the dev server — the dev server has
  a known pre-existing, unrelated React StrictMode console error that
  doesn't reproduce in production and isn't worth chasing.
- **Lick Trainer** (Practice -> Lick Trainer): library with exact rhythm in
  `music/lickTrainer/library.js` (tab-style authoring; `source: 'user'` =
  licks the user supplied as verified), offline take analysis in
  `music/lickTrainer/analysis.js` (spectral-flux onsets + pitchy pitch track
  + DP alignment + bend/vibrato checks), playback/capture in
  `audio/lickTrainerAudio.js`, state in `hooks/useLickTrainer.js`. Engine
  regression test on synthetic guitar audio: `scripts/lick-analysis-test.mjs`
  (bundle with esbuild, run with node) — run it after any analysis change.
- **Guitar Pro licks**: `music/lickTrainer/gpImport.js` converts an alphaTab
  Score to licks (exact rhythm/bends/slides/legato; chords reduced to the top
  note; the other notes of a double stop/chord are attached at runtime as
  `note.also` via `chordNotesByTick()`/`withChordNotes()` from the loaded
  score — the neck lights the whole shape, TabTimeline draws it; analysis
  still follows the top note). In-app "Import" saves to IndexedDB (`userLickStore.js`, this device
  only). For the built-in library, the user drops files in
  `C:\Users\hay\Downloads\GuitarPro` on their computer; convert with
  `scripts/gp-to-licks.mjs` into `music/lickTrainer/imports/*.js` and add the
  export to `SOLOS` (full solos, `solo: true` -> one entry with bar-based
  `sections`) or to the licks list in `library.js`. The trainer has a
  Licks | Solos switch; a solo is practiced whole or per section
  (`soloSection()`), with the whole solo shown in the tab and the section
  highlighted. `barPhase` marks where bar lines fall when beat 0 is a pickup.
  **Listen** for anything from a GP file (built-in solos carry `gpUrl` ->
  `public/gp/`, in-app imports store the file's `gpBytes` in IndexedDB, both
  plus `gpRef {track, tickStart}`) plays the file itself through alphaTab's
  synth (`audio/gpReferencePlayer.js`, one hidden AlphaTabApi) so it sounds
  exactly like the original; licks without a file use `lickTrainerAudio.js`.
  alphaTab gotchas: `scoreLoaded`/`midiLoaded` replay to new listeners and
  `isReadyForPlayback` stays true across loads — wait for the next
  `playerReady` after `load()`. Import defaults to `defaultTrackIndex()`
  (skips vocal/piano/bass/drum tracks).
- **Shared library (all devices)**: `api/library.js` (Vercel function +
  Vercel Blob, one JSON per imported file incl. the GP bytes as base64),
  guarded by the `DUDESTAR_KEY` env var (the user types it once per device in
  Settings -> "Sync between devices" — `LibraryBar bare` via SettingsPanel's
  `syncTrainer` prop; GuitarPro only shows a one-line warning on a sync
  problem; kept in localStorage). Client sync in
  `music/lickTrainer/cloudLibrary.js`: IndexedDB stays the local/offline
  copy; records marked `cloud: true` that vanish remotely were deleted on
  another device; unmarked local imports get uploaded. Needs
  `BLOB_READ_WRITE_TOKEN` or `BLOB_STORE_ID` (+ OIDC, how newer Vercel projects
  connect a Blob store — the user's project uses this) from connecting the
  `dudestar-library` Blob store; `DUDESTAR_KEY` is set for Production.
- **Keys octave fix**: gp3-5 files have no piano staff; a keyboard part is
  typed on guitar strings and transcribed an octave low (guitar writing).
  `fixKeysOctave(score)` (gpImport) lowers `staff.transpositionPitch` by 12
  for stringed tracks whose `trackKind` is 'keys' (realValue +12; the synth's
  channel transposition follows) — called in scoreLoaded (before MIDI/render)
  of the hidden reference api and the song view api. Real piano staves
  (gp/gpx) are untouched.
- **GuitarPro on Piano**: the section is also enabled for piano
  (featureCapabilities `guitarpro: ['guitar','piano']`). `useLickTrainer({instrument})`
  -> `pianoMode`: Song view only (no Practice / neck-label toggles), the
  display track defaults to `pianoTrackIndex()` (remembered under
  `<soloId>|piano`), and `pianoKeys` (from `pianoPartOf()`: all notes of the
  shown track in ticks, hands by staff, or split at middle C for one-staff
  GP3-5 pianos) feed PianoKeyboard's `playNotes` prop (right green / left
  blue, the keyboard scrolls to follow); `pianoChord` (identifyChord over
  3+ pitch classes, held until the next chord, cleared on Stop) feeds the
  panel's chord LCD via the `chordReadout` prop (undefined elsewhere = no LCD). Any pitched track shows on the
  keys; drums show nothing. Importing a file with no guitar part makes a
  `fileOnlySolo()` (no notes, `practiceOff`).
- **GuitarPro on Bass**: featureCapabilities `guitarpro: ['guitar','piano','bass']`.
  `useLickTrainer` -> `bassMode`: Song view only (no Practice yet), neck-label
  toggle shown, display track remembered under `<soloId>|bass`, default =
  the file's bass track (`bassTrackIndex()`, prefers 4-string), drawn on the
  bass neck with the panel's bass profile as GM program
  (`BASS_PROFILE_GM_PROGRAM`, via the same debounced `applyOctave` reload).
  A 5-string bass is folded an octave up onto the 4-string neck
  (`trackNotes` -> `folded`, hint `gp.bassFolded`). No bass part in the file:
  `suggestedBassLine(score)` (chord roots, one per quarter beat, from all
  pitched non-drum/vocal tracks) -> `addSuggestedBassTrack()` appends a real
  alphaTab track (`__suggestedBass`, F clef + tab) in the SONG VIEW's
  scoreLoaded only (once per score); it is muted outside bass mode, so guitar/
  piano never hear or list it. Its index = `trainer.suggestedBassIndex`
  (= original track count); load the api with track 0 first, then
  renderTracks — loading with a not-yet-existing index crashes alphaTab.
  The hidden reference player always loads `[0]`. No chords found ->
  notation-only "not a bass part" view. Bass-mode mix default: every track
  except vocals.
- **GuitarPro section** (nav key `guitarpro`, guitar + piano + bass):
  `components/GuitarPro/GuitarProView.jsx` — file select (built-in SOLOS +
  imports), Import (always as a solo), shared library bar, Song | Practice.
  Track mixer (`trainer.mix`, per file in localStorage; default = practiced
  track + rhythm section via `defaultMix()`/`isRhythmSection()` in
  gpImport.js — drums, bass, keys, never vocals). Song = `GpSongPlayer.jsx`
  (visible alphaTab tab, own AlphaTabApi, mixer via changeTrackMute, drives
  the Stage fretboard through `trainer.followPlayhead`). Practice = the
  `LickTrainer` component with `variant="solos"` (Practice -> Lick Trainer is
  `variant="licks"`, licks only). During a take the band (mix minus your
  part) is rendered OFFLINE with `renderBacking()` (alphaTab `exportAudio`,
  tempo scaled by patching tempo automations just for the MIDI generation)
  into an AudioBuffer started on the trainer's own clock — sample-exact vs.
  the analysis timeline. Never play the backing through the live alphaTab
  player during a take (separate clock -> smeared timing feedback).
- **GP sound**: every alphaTab player (hidden reference, GuitarPro song view,
  Songs -> Tab) uses GeneralUser GS v2.0.3 converted to SF3
  (`public/soundfont/generaluser-gs-v2.sf3`, ~9 MB, license next to it; built
  with `scripts/soundfont/` — sf2to3.py, then sftone.py which gives the GM
  guitar presets a static "cab" low-pass and drops their filter envelopes,
  which alphaTab plays wide open = fizzy/metallic. Cached 30 days by
  vercel.json, so a changed file needs a new name),
  fetched ONCE and shared via `loadGpSoundFont(api)` in
  `audio/alphaTabSound.js` (don't give an api a `player.soundFont` URL — each
  would download it). alphaTab only plays mono samples (sampleType & 1).
  `alphaTabSound.js` also patches MidiFileGenerator's note vibrato to a
  finger vibrato (pitch only rises, ~5.5 Hz real time) and `tuneVibrato()`
  sets its tick length for tempo x speed — after changing it call
  `loadMidiForScore()` (no need to wait for playerReady: the worker
  processes messages in order; playerReady does NOT refire for a reload
  while playing).
- **Trainer neck**: lick markers with `lick.style === 'trainer'` are light
  blue, the sounding note green with a glow. Markers show note names or
  left-hand fingers (`trainer.neckLabel`): fingers come from the GP file
  (`leftHandFinger`) or `music/lickTrainer/fingering.js` (DP over hand
  positions; `fingerAuto`), assigned in `withDerived()`. Screens with a tab
  (Lick Trainer, GuitarPro, Songs -> Tab) pass `compact` to the Fretboard:
  20% smaller (not on phones <=480px), markers scaled back up. AppShell
  publishes `--stage-height` for panels that fill the space above the neck.
- **GuitarPro Song view layout**: no sticky bar. Play scrolls `.gp-song` to
  the top (scroll-margin) and `.gp-score-scroll` is sized to the room left
  above the neck (`--stage-height`); alphaTab auto-scrolls inside it
  with OUR page-turn scrolling (`scrollMode: Off`; on `playedBeatChanged`, a
  new staff system is scrolled to the top via `boundsLookup.findBeat()`), and
  a ResizeObserver re-renders the score to the box width (overflow-x hidden,
  no sideways scrollbar). Phones get extra bottom padding so the scroll
  can reach.
  Tracks are a rail on the LEFT of the score (`TrackRail` in
  GpSongPlayer.jsx, icon per kind, tap = mute/unmute; icons only on phones);
  the pill mixer is shown only in Practice.
  Rail row = tap the name to SHOW that track (score + neck + the practiced
  part; `trainer.setDisplayTrack`, per solo in localStorage, unmutes it),
  the speaker icon mutes. Another guitar track is rebuilt with
  `scoreToSolo` (`soloForTrack()` in useLickTrainer, id `<soloId>@t<n>`;
  `activeSoloId` = the base id); non-guitar tracks (`isGuitarTrack()` false:
  bass/keys/vocals/drums) are `displayOnly` — notation only (Score/Default
  stave profile), empty neck, no Practice. A 4-string bass track (`isBassTrack()`) is
  built with `scoreToSolo({bass: true})` -> `neck: 'bass'` (BASS_TUNING strings),
  `practiceOff`; App draws it on the bass neck (`tuning` = shifted BASS_TUNING)
  and passes `noteSound: 'bass'` so tapped markers use `playBassNote`.
  Chord names: `labelChords(score, track)` (gpImport) writes a name above
  the staff wherever 3+ pitch classes sound together (both hands), on each
  change, unless the track already has the file's own chords; the song
  view's api renders on the MAIN thread (`core.useWorkers: false`) so
  `giveChordNamesTheirOwnRow()` can stop alphaTab sharing the chord row
  with section markers (they overlapped); chord font is bold sans 13, family
  starts with the tag `DSChordName` so the SVG <text> can be found; the
  song view uses `enableLazyLoading: false` so all names are in the DOM in
  time order (lazy loading must stay OFF anyway: with main-thread rendering
  and lazy loading on, Play didn't start). Piano mode (`.gp-song.is-piano`):
  chord names blue (no glow — removed at the user's request).
  Piano octave control: panel −/+ "Octave" LCD (PianoKeyboard `octaveShift`/
  `onOctaveShiftChange`, GuitarPro only) -> `trainer.pianoOctave` (-2..2, per
  `<file>#<track>` in localStorage); the song view sets the shown track's
  `staff.transpositionPitch` = base − 12·shift (debounced, reloads MIDI,
  re-renders, resumes); the keys add 12·shift in `pianoPart`.
  Piano sound: the panel's piano profile (App `pianoProfile` -> GuitarProView
  -> GpSongPlayer) sets the shown track's `playbackInfo.program` via
  `PIANO_PROFILE_GM_PROGRAM` when that track is keys (file program kept as
  `__fileProgram`), same debounced reload as the octave.
  Mixer: the rail head's mixer button opens `TrackMixerPanel` to the right
  of the rail over the score (show / Solo / Mute / level per track). Levels
  (`trainer.volumes`, 0..1 per file in localStorage `lick-trainer-gp-volume`,
  `setTrackVolume`) apply via `changeTrackVolume` in the song view, in
  `playReference` (applyMix) and in `renderBacking` (trackVolume); Solo is
  song-view state only (`changeTrackSolo`), reset per file.
  Muted = fader shows 0 (the stored level is kept; unmute restores it;
  raising a muted fader unmutes). Icons are in colour while a track is heard
  (in the mix and not silenced by a solo), grey otherwise — rail and mixer.
  Space bar = Play/Pause in Song view (GpSongPlayer keydown, skips form fields). Song view keeps ONE AlphaTabApi
  per file and switches with `renderTracks()` (no MIDI reload). The mix is
  per file (`gpKey`), and the hidden reference player loads once per file. The view is full width (controls
  above capped at 980px).

