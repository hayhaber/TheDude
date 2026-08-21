import { useEffect, useState } from 'react';
import {
  GUITAR_SOUND_PROFILES,
  DEFAULT_GUITAR_PROFILE,
  resolveGuitarProfile,
  PIANO_SOUND_PROFILES,
  DEFAULT_PIANO_PROFILE,
  resolvePianoProfile,
  BASS_SOUND_PROFILES,
  DEFAULT_BASS_PROFILE,
  resolveBassProfile,
} from '../audio/instrumentProfiles';
import { preloadSoundfontInstrument } from '../audio/instrumentEngine';
import { setCurrentGuitarProfile, setCurrentPianoProfile, setCurrentBassProfile } from '../audio/audioSettingsStore';
import { setPianoVolume as setPianoPlayerVolume } from '../audio/pianoPlayer';

const STORAGE_KEY = 'audio-settings';
const PIANO_STORAGE_KEY = 'piano-audio-settings';
const BASS_STORAGE_KEY = 'bass-audio-settings';
const PIANO_VOLUME_STORAGE_KEY = 'piano-volume';
const DEFAULT_PIANO_VOLUME = 100;

function getInitialPianoVolume() {
  // localStorage.getItem returns null when unset, and Number(null) is 0
  // (not NaN) — checked explicitly so a first-ever visit defaults to 100,
  // not a silently-muted keyboard.
  const raw = localStorage.getItem(PIANO_VOLUME_STORAGE_KEY);
  if (raw === null) return DEFAULT_PIANO_VOLUME;
  const stored = Number(raw);
  return Number.isFinite(stored) && stored >= 0 && stored <= 100 ? stored : DEFAULT_PIANO_VOLUME;
}

function getInitialProfile() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return GUITAR_SOUND_PROFILES.some((p) => p.key === stored) ? stored : DEFAULT_GUITAR_PROFILE;
}

function getInitialPianoProfile() {
  const stored = localStorage.getItem(PIANO_STORAGE_KEY);
  return PIANO_SOUND_PROFILES.some((p) => p.key === stored) ? stored : DEFAULT_PIANO_PROFILE;
}

function getInitialBassProfile() {
  const stored = localStorage.getItem(BASS_STORAGE_KEY);
  return BASS_SOUND_PROFILES.some((p) => p.key === stored) ? stored : DEFAULT_BASS_PROFILE;
}

// Persists the user's chosen guitar/piano sound profile (same localStorage
// pattern as useTheme.js) and kicks off a background sample preload the
// moment a sampled profile is selected, so the first note played
// afterward isn't the one paying the full download latency.
export function useAudioSettings() {
  const [guitarProfile, setGuitarProfile] = useState(getInitialProfile);
  const [pianoProfile, setPianoProfile] = useState(getInitialPianoProfile);
  const [bassProfile, setBassProfile] = useState(getInitialBassProfile);
  // Master volume for piano note playback (0-100) — the on-keyboard
  // panel's Volume control. Persisted the same way as the sound profiles;
  // actually applied via pianoPlayer.js's own module-level setter (see its
  // comment), not through any audio-graph state kept here.
  const [pianoVolume, setPianoVolume] = useState(getInitialPianoVolume);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, guitarProfile);
    setCurrentGuitarProfile(guitarProfile);
    const profile = resolveGuitarProfile(guitarProfile);
    if (profile.soundfontName) preloadSoundfontInstrument(profile.soundfontName);
  }, [guitarProfile]);

  useEffect(() => {
    localStorage.setItem(PIANO_STORAGE_KEY, pianoProfile);
    setCurrentPianoProfile(pianoProfile);
    const profile = resolvePianoProfile(pianoProfile);
    if (profile.soundfontName) preloadSoundfontInstrument(profile.soundfontName);
  }, [pianoProfile]);

  useEffect(() => {
    localStorage.setItem(BASS_STORAGE_KEY, bassProfile);
    setCurrentBassProfile(bassProfile);
    const profile = resolveBassProfile(bassProfile);
    if (profile.soundfontName) preloadSoundfontInstrument(profile.soundfontName);
  }, [bassProfile]);

  useEffect(() => {
    localStorage.setItem(PIANO_VOLUME_STORAGE_KEY, String(pianoVolume));
    setPianoPlayerVolume(pianoVolume);
  }, [pianoVolume]);

  return {
    guitarProfile,
    setGuitarProfile,
    pianoProfile,
    setPianoProfile,
    bassProfile,
    setBassProfile,
    pianoVolume,
    setPianoVolume,
  };
}
