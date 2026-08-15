import { useEffect, useRef, useState } from 'react';

// The YouTube IFrame Player API has no "timeupdate" event — polling
// getCurrentTime() every animation frame is the pattern YouTube's own docs
// use for tracking playback position. State updates are throttled to a
// meaningful time delta (not every single frame) since chord changes happen
// on the order of seconds, not milliseconds — this keeps the render rate
// sane without losing any real responsiveness for a chord-sync display.
const UPDATE_THRESHOLD_S = 0.1;

export function usePlaybackTime(player, isReady) {
  const [currentTime, setCurrentTime] = useState(0);
  const rafRef = useRef(null);
  const lastReportedRef = useRef(-1);

  useEffect(() => {
    if (!player || !isReady) return undefined;

    function tick() {
      const t = player.getCurrentTime?.();
      if (typeof t === 'number' && Math.abs(t - lastReportedRef.current) >= UPDATE_THRESHOLD_S) {
        lastReportedRef.current = t;
        setCurrentTime(t);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [player, isReady]);

  return currentTime;
}
