import { useEffect, useState } from 'react';
import { getAudioContext } from '../../audio/audioContext';
import './DebugPanel.css';

// TEMPORARY diagnostic overlay for tracking down iOS-specific audio/touch
// bugs that can't be reproduced or inspected locally — the fastest way to
// get real signal off a device with no attached devtools is to put the
// signal ON the screen itself so it can just be screenshotted. Remove this
// entire component (and its one mount point in App.jsx) once the
// iOS audio/touch issues are confirmed fixed; it has no reason to ship
// permanently.
export function DebugPanel() {
  const [audioState, setAudioState] = useState('not created yet');
  const [errors, setErrors] = useState([]);
  const [touchInfo] = useState({
    maxTouchPoints: navigator.maxTouchPoints,
    userAgent: navigator.userAgent,
    standalone: window.navigator.standalone,
  });

  useEffect(() => {
    function onError(e) {
      setErrors((prev) => [...prev, `Error: ${e.message} (${e.filename}:${e.lineno})`].slice(-5));
    }
    function onRejection(e) {
      setErrors((prev) => [...prev, `Unhandled rejection: ${e.reason}`].slice(-5));
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    const interval = setInterval(() => {
      try {
        const ctx = getAudioContext();
        setAudioState(ctx.state);
      } catch (e) {
        setAudioState('ctx creation threw: ' + e.message);
      }
    }, 500);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
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
      setErrors((prev) => [...prev, `Test tone fired OK at ctx.currentTime=${ctx.currentTime.toFixed(2)}, state=${ctx.state}`].slice(-5));
    } catch (e) {
      setErrors((prev) => [...prev, `Test tone threw: ${e.message}`].slice(-5));
    }
  }

  return (
    <div className="debug-panel">
      <div className="debug-panel-row">
        <strong>build:</strong> {typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'unknown'}
      </div>
      <div className="debug-panel-row">
        <strong>audioContext.state:</strong> {audioState}
      </div>
      <div className="debug-panel-row">
        <strong>maxTouchPoints:</strong> {touchInfo.maxTouchPoints} · <strong>standalone:</strong> {String(touchInfo.standalone)}
      </div>
      <div className="debug-panel-row debug-panel-ua">{touchInfo.userAgent}</div>
      <button type="button" className="debug-panel-test-btn" onClick={playTestTone}>
        Play test tone
      </button>
      {errors.length > 0 && (
        <div className="debug-panel-errors">
          {errors.map((err, i) => (
            <div key={i} className="debug-panel-error-line">
              {err}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
