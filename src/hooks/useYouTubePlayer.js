import { useEffect, useRef, useState } from 'react';

let apiLoadPromise = null;

// Loads the official YouTube IFrame Player API script exactly once no
// matter how many times this hook mounts across the app — the script calls
// a single global window.onYouTubeIframeAPIReady, so every caller shares
// one loader promise instead of racing to inject duplicate <script> tags.
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return apiLoadPromise;
}

// Thin wrapper around YouTube's own IFrame Player API — embeds and plays a
// video the user chose (pasted URL/ID), nothing more. This only ever talks
// to YouTube's own embed endpoint, the same way any other website embeds a
// YouTube video; no audio extraction, no download, no analysis.
export function useYouTubePlayer(containerRef, videoId) {
  const playerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!videoId || !containerRef.current) return undefined;
    let cancelled = false;
    setIsReady(false);

    loadYouTubeApi().then(() => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0 },
        events: {
          onReady: () => {
            if (!cancelled) setIsReady(true);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return { isReady, player: playerRef.current };
}
