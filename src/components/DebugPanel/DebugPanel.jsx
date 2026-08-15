import { useEffect, useState } from 'react';
import { getAudioContext, onAudioEvent } from '../../audio/audioContext';
import './DebugPanel.css';

// TEMPORARY diagnostic overlay for tracking down iOS-specific audio/touch
// bugs that can't be reproduced or inspected locally — the fastest way to
// get real signal off a device with no attached devtools is to put the
// signal ON the screen itself so it can just be screenshotted. Remove this
// entire component (and its one mount point in App.jsx), plus the
// logAudioEvent/onAudioEvent pub/sub in audioContext.js and its call sites
// in pianoPlayer.js/chordPlayer.js, once the iOS audio/touch issues are
// confirmed fixed; none of this has a reason to ship permanently.
export function DebugPanel() {
  const [audioState, setAudioState] = useState('not created yet');
  const [audioTime, setAudioTime] = useState(0);
  // { text, kind: 'error' | 'info' } — kind drives color (see CSS): real
  // thrown exceptions/unhandled rejections in red, everything else
  // (successful test tones, real note-play attempts) in green, so a
  // screenshot doesn't read as "everything is an error" the way an
  // all-red log did.
  const [log, setLog] = useState([]);
  const [touchInfo] = useState({
    maxTouchPoints: navigator.maxTouchPoints,
    userAgent: navigator.userAgent,
    standalone: window.navigator.standalone,
  });

  function addLog(text, kind) {
    setLog((prev) => [...prev, { text, kind }].slice(-8));
  }

  useEffect(() => {
    function onError(e) {
      addLog(`Error: ${e.message} (${e.filename}:${e.lineno})`, 'error');
    }
    function onRejection(e) {
      addLog(`Unhandled rejection: ${e.reason}`, 'error');
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    const unsubscribeAudio = onAudioEvent((msg) => addLog(msg, 'info'));

    const interval = setInterval(() => {
      try {
        const ctx = getAudioContext();
        setAudioState(ctx.state);
        setAudioTime(ctx.currentTime);
      } catch (e) {
        setAudioState('ctx creation threw: ' + e.message);
      }
    }, 500);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      unsubscribeAudio();
      clearInterval(interval);
    };
  }, []);

  function playTestTone() {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.2;
      osc.connect(gain).connect(ctx.destination);
      osc.frequency.value = 440;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
      addLog(`Test tone fired OK at ctx.currentTime=${ctx.currentTime.toFixed(2)}, state=${ctx.state}`, 'info');
    } catch (e) {
      addLog(`Test tone threw: ${e.message}`, 'error');
    }
  }

  return (
    <div className="debug-panel">
      <div className="debug-panel-row">
        <strong>build:</strong> {typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'unknown'}
      </div>
      <div className="debug-panel-row">
        <strong>audioContext.state:</strong> {audioState} · <strong>currentTime:</strong> {audioTime.toFixed(2)}
      </div>
      <div className="debug-panel-row">
        <strong>maxTouchPoints:</strong> {touchInfo.maxTouchPoints} · <strong>standalone:</strong> {String(touchInfo.standalone)}
      </div>
      <div className="debug-panel-row debug-panel-ua">{touchInfo.userAgent}</div>
      <button type="button" className="debug-panel-test-btn" onClick={playTestTone}>
        Play test tone
      </button>
      {log.length > 0 && (
        <div className="debug-panel-errors">
          {log.map((entry, i) => (
            <div key={i} className={entry.kind === 'error' ? 'debug-panel-error-line' : 'debug-panel-info-line'}>
              {entry.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
