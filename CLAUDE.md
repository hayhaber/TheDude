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
