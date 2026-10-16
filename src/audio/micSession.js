// iOS (Safari 16.4+): navigator.audioSession.type = 'playback' sends sound to
// the loudspeaker — the Recorder sets it after a take — but in that mode the
// microphone delivers SILENCE. It stayed set after leaving the Recorder, so
// the tuner (and every other mic feature) heard nothing. Every mic open in
// the app goes through getUserMedia: patched once here so a 'playback'
// session is switched back to 'auto' first. Other browsers have no
// audioSession: nothing changes there.

let installed = false;

export function allowMicSession() {
  try {
    const s = navigator.audioSession;
    if (s && s.type === 'playback') s.type = 'auto';
  } catch {
    /* not supported */
  }
}

export function installMicSessionGuard() {
  if (installed || typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
  installed = true;
  const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = (constraints) => {
    if (constraints?.audio) allowMicSession();
    return original(constraints);
  };
}
