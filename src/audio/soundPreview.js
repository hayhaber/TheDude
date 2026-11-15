// Settings -> Instrument sounds (v1.0.204; user: "when I change a sound,
// play a few notes of it so I can hear whether it's the one I want"):
// choosing a guitar / piano / bass sound plays a short phrase in THAT sound
// — a few picked notes, then the chord (the bass: a short line). It waits
// (up to 4 s) for the new samples so the phrase isn't the stand-in synth,
// and a new choice cuts the phrase still playing.
import { getAudioContext } from './audioContext';
import { getSoundfontInstrument, getSplendidPiano } from './instrumentEngine';
import { resolveGuitarProfile, resolvePianoProfile, resolveBassProfile, bassSoundOptions } from './instrumentProfiles';
import { setCurrentGuitarProfile, setCurrentPianoProfile, setCurrentBassProfile } from './audioSettingsStore';
import { scheduleGuitarNotes } from './chordPlayer';
import { schedulePianoNotes } from './pianoPlayer';
import { scheduleBassNotes } from './bassPlayer';

const LOAD_WAIT_MS = 4000;

// [midi, start s, duration s]
const PHRASES = {
  // C major: picked C E G C E, then the open C chord strummed
  guitar: [
    [48, 0, 0.6], [52, 0.28, 0.6], [55, 0.56, 0.6], [60, 0.84, 0.6], [64, 1.12, 0.9],
    [48, 1.7, 1.6], [52, 1.73, 1.6], [55, 1.76, 1.6], [60, 1.79, 1.6], [64, 1.82, 1.6],
  ],
  // C E G C up, then the chord in two hands
  piano: [
    [60, 0, 0.45], [64, 0.3, 0.45], [67, 0.6, 0.45], [72, 0.9, 0.7],
    [48, 1.45, 1.6], [60, 1.45, 1.6], [64, 1.45, 1.6], [67, 1.45, 1.6],
  ],
  // root - 5th - octave - 6th - 5th - root, the bass player's first groove
  bass: [
    [36, 0, 0.35], [43, 0.33, 0.35], [48, 0.66, 0.35], [45, 1.0, 0.35], [43, 1.33, 0.35], [36, 1.66, 1.2],
  ],
};

const SETTERS = { guitar: setCurrentGuitarProfile, piano: setCurrentPianoProfile, bass: setCurrentBassProfile };

function entryFor(kind, key) {
  if (kind === 'guitar') {
    const p = resolveGuitarProfile(key);
    return p.soundfontName ? getSoundfontInstrument(p.soundfontName) : null;
  }
  if (kind === 'piano') {
    const p = resolvePianoProfile(key);
    return p.soundfontName ? getSoundfontInstrument(p.soundfontName) : getSplendidPiano();
  }
  const p = resolveBassProfile(key);
  return p.soundfontName ? getSoundfontInstrument(p.soundfontName, bassSoundOptions(p)) : null;
}

let stopLast = null;
let token = 0;

/** Plays a short phrase in the given sound. `kind` = guitar | piano | bass. */
export async function previewSound(kind, key) {
  const my = ++token;
  stopLast?.();
  stopLast = null;
  // the players read the current sound from the store: set it now (the
  // settings hook writes it again after its render)
  SETTERS[kind]?.(key);
  const ctx = getAudioContext();
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  const entry = entryFor(kind, key);
  if (entry && !entry.isReady) {
    await Promise.race([entry.ready, new Promise((r) => setTimeout(r, LOAD_WAIT_MS))]);
  }
  if (my !== token) return; // another sound was chosen meanwhile
  const notes = PHRASES[kind].map(([midi, start, dur]) => ({ midi, start, dur }));
  const at = ctx.currentTime + 0.05;
  stopLast = kind === 'guitar' ? scheduleGuitarNotes(notes, at) : kind === 'piano' ? schedulePianoNotes(notes, at) : scheduleBassNotes(notes, at);
}

export function stopPreview() {
  token++;
  stopLast?.();
  stopLast = null;
}
