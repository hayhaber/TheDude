// Declarative registry mapping user-facing sound choices to instrumentEngine
// calls. Adding a new instrument (piano, bass, a new guitar articulation, a
// new drum kit) is adding an entry here — nothing in instrumentEngine.js or
// the call sites that use these profiles needs to change.

// `soundfontName` is one of smplr's General MIDI Soundfont instrument names
// (verified against the actual package: `getSoundfontNames()` includes all
// of these). `key: 'synth'` has no soundfontName — it's the explicit,
// always-available fallback that keeps using the existing oscillator pluck
// in chordPlayer.js/lickPlayer.js, exactly as it worked before this feature.
export const GUITAR_SOUND_PROFILES = [
  { key: 'acoustic', labelKey: 'audioSettings.guitar.acoustic', soundfontName: 'acoustic_guitar_steel' },
  { key: 'electric', labelKey: 'audioSettings.guitar.electric', soundfontName: 'electric_guitar_clean' },
  { key: 'overdrive', labelKey: 'audioSettings.guitar.overdrive', soundfontName: 'overdriven_guitar' },
  { key: 'synth', labelKey: 'audioSettings.guitar.synth', soundfontName: null },
];

export const DEFAULT_GUITAR_PROFILE = 'acoustic';

export function resolveGuitarProfile(key) {
  return GUITAR_SOUND_PROFILES.find((p) => p.key === key) ?? GUITAR_SOUND_PROFILES.find((p) => p.key === DEFAULT_GUITAR_PROFILE);
}

// `soundfontName: null` on 'acoustic' means "use the dedicated
// SplendidGrandPiano sampled instrument" (instrumentEngine.getSplendidPiano())
// rather than a General MIDI Soundfont — a real Steinway sample set, not a
// generic GM patch, which is why it's special-cased instead of just another
// soundfontName entry. The other three are genuine GM Soundfont instrument
// names, verified against the installed smplr package's own instrument list
// (`node_modules/smplr/dist/index.mjs`) rather than guessed.
// The 6 entries after 'synth' were added for the on-keyboard Voice
// selector's "a few more sounds" request — every soundfontName here is
// verified against the actually-installed smplr package's own instrument
// list (node_modules/smplr/dist/index.mjs), same standard the original 4
// were held to, not guessed GM patch names.
export const PIANO_SOUND_PROFILES = [
  { key: 'acoustic', labelKey: 'audioSettings.piano.acoustic', soundfontName: null },
  { key: 'electric', labelKey: 'audioSettings.piano.electric', soundfontName: 'electric_piano_1' },
  { key: 'organ', labelKey: 'audioSettings.piano.organ', soundfontName: 'drawbar_organ' },
  { key: 'synth', labelKey: 'audioSettings.piano.synth', soundfontName: 'pad_2_warm' },
  { key: 'brightAcoustic', labelKey: 'audioSettings.piano.brightAcoustic', soundfontName: 'bright_acoustic_piano' },
  { key: 'honkytonk', labelKey: 'audioSettings.piano.honkytonk', soundfontName: 'honkytonk_piano' },
  { key: 'rhodes', labelKey: 'audioSettings.piano.rhodes', soundfontName: 'electric_piano_2' },
  { key: 'harpsichord', labelKey: 'audioSettings.piano.harpsichord', soundfontName: 'harpsichord' },
  { key: 'churchOrgan', labelKey: 'audioSettings.piano.churchOrgan', soundfontName: 'church_organ' },
  { key: 'vibraphone', labelKey: 'audioSettings.piano.vibraphone', soundfontName: 'vibraphone' },
];

export const DEFAULT_PIANO_PROFILE = 'acoustic';

export function resolvePianoProfile(key) {
  return PIANO_SOUND_PROFILES.find((p) => p.key === key) ?? PIANO_SOUND_PROFILES.find((p) => p.key === DEFAULT_PIANO_PROFILE);
}

// Every soundfontName here is verified against the actually-installed smplr
// package's own instrument list (node_modules/smplr/dist/index.mjs), same
// standard the guitar/piano profiles above are held to.
export const BASS_SOUND_PROFILES = [
  { key: 'acoustic', labelKey: 'audioSettings.bass.acoustic', soundfontName: 'acoustic_bass' },
  { key: 'electricFinger', labelKey: 'audioSettings.bass.electricFinger', soundfontName: 'electric_bass_finger' },
  { key: 'electricPick', labelKey: 'audioSettings.bass.electricPick', soundfontName: 'electric_bass_pick' },
  { key: 'fretless', labelKey: 'audioSettings.bass.fretless', soundfontName: 'fretless_bass' },
  { key: 'slap', labelKey: 'audioSettings.bass.slap', soundfontName: 'slap_bass_1' },
  { key: 'synth', labelKey: 'audioSettings.bass.synth', soundfontName: null },
];

export const DEFAULT_BASS_PROFILE = 'electricFinger';

export function resolveBassProfile(key) {
  return BASS_SOUND_PROFILES.find((p) => p.key === key) ?? BASS_SOUND_PROFILES.find((p) => p.key === DEFAULT_BASS_PROFILE);
}

// Metronome percussion options, each backed by a specific sample in a
// specific smplr DrumMachine kit (verified against the kits' actual sample
// manifests — see docs/AUDIO_ENGINE.md). `click`/`beep`/`tick` stay
// synth-only (see audio/metronome.js's CLICK_SOUNDS) and remain the
// default/fallback set; these are additional, opt-in realistic options.
// Wood Block uses TR-808's "clave" — vintage drum machines of that era
// don't ship a literal woodblock sample, and a clave hit is the standard
// stand-in (disclosed here rather than silently mislabeled).
export const METRONOME_PERCUSSION_OPTIONS = [
  { key: 'hihat', labelKey: 'metronome.sound.hihat', kit: 'TR-808', sample: 'hihat-open' },
  { key: 'hihatClosed', labelKey: 'metronome.sound.hihatClosed', kit: 'TR-808', sample: 'hihat-close' },
  { key: 'rim', labelKey: 'metronome.sound.rim', kit: 'TR-808', sample: 'rimshot' },
  { key: 'stick', labelKey: 'metronome.sound.stick', kit: 'LM-2', sample: 'stick' },
  { key: 'snareSample', labelKey: 'metronome.sound.snareSample', kit: 'TR-808', sample: 'snare' },
  { key: 'kickSample', labelKey: 'metronome.sound.kickSample', kit: 'TR-808', sample: 'kick' },
  { key: 'woodblock', labelKey: 'metronome.sound.woodblock', kit: 'TR-808', sample: 'clave' },
  { key: 'shaker', labelKey: 'metronome.sound.shaker', kit: 'TR-808', sample: 'maraca' },
];

export function resolveMetronomePercussion(key) {
  return METRONOME_PERCUSSION_OPTIONS.find((p) => p.key === key) ?? null;
}
