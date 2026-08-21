import { DEFAULT_GUITAR_PROFILE, DEFAULT_PIANO_PROFILE, DEFAULT_BASS_PROFILE } from './instrumentProfiles';

// A tiny module-level mirror of the user's current guitar/piano sound
// profile choice (kept in sync by useAudioSettings.js, the source of truth /
// localStorage owner). Lets chordPlayer.js/lickPlayer.js/earTrainingPlayer.js/
// pianoPlayer.js read "what sound should play right now" without threading a
// `profile` prop through every component between Settings and every
// note-playing call site (Fretboard, PianoKeyboard, drills, ear training,
// licks, chord strums) — those call sites' signatures stay exactly as they
// were before this feature.
let currentGuitarProfile = DEFAULT_GUITAR_PROFILE;
let currentPianoProfile = DEFAULT_PIANO_PROFILE;
let currentBassProfile = DEFAULT_BASS_PROFILE;

export function setCurrentGuitarProfile(key) {
  currentGuitarProfile = key;
}

export function getCurrentGuitarProfile() {
  return currentGuitarProfile;
}

export function setCurrentPianoProfile(key) {
  currentPianoProfile = key;
}

export function getCurrentPianoProfile() {
  return currentPianoProfile;
}

export function setCurrentBassProfile(key) {
  currentBassProfile = key;
}

export function getCurrentBassProfile() {
  return currentBassProfile;
}
