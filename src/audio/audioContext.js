let audioContext = null;

// Shared across chord playback and the metronome so they don't fight over
// separate AudioContexts (and so one user gesture unlocks both).
export function getAudioContext() {
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctor();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}
