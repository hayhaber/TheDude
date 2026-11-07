import { useLayoutEffect } from 'react';

/**
 * A drawer that never scrolls: when its content is taller than the room the
 * drawer may take (its max-height, else the window), the content is scaled
 * down with CSS zoom (taps stay where they are drawn). Used by the tuner,
 * metronome and drum machine drawers.
 */
export function useFitDrawer(open, drawerRef, bodyRef, { min = 0.55 } = {}) {
  useLayoutEffect(() => {
    if (!open) return undefined;
    const fit = () => {
      const drawer = drawerRef.current;
      const content = bodyRef.current; // zoom the body we own (React never restyles it)
      if (!drawer || !content?.firstElementChild) return;
      content.style.zoom = '';
      const cs = getComputedStyle(drawer);
      const maxH = parseFloat(cs.maxHeight) || window.innerHeight;
      const room = Math.min(maxH, window.innerHeight - drawer.getBoundingClientRect().top - 8);
      let chrome = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const kids = [...drawer.children];
      for (const k of kids) if (k !== bodyRef.current) chrome += k.offsetHeight;
      chrome += (parseFloat(cs.rowGap) || 0) * Math.max(0, kids.length - 1);
      const natural = content.offsetHeight;
      const z = natural ? Math.min(1, (room - chrome - 6) / natural) : 1;
      if (z >= 0.995) return;
      let zz = Math.max(min, z);
      content.style.zoom = String(zz);
      // a zoomed body lays out wider (percent widths grow), so check again
      for (let i = 0; i < 4 && drawer.scrollHeight > drawer.clientHeight + 1 && zz > min; i += 1) {
        zz = Math.max(min, zz * (drawer.clientHeight / drawer.scrollHeight) - 0.005);
        content.style.zoom = String(zz);
      }
    };
    fit();
    const raf = requestAnimationFrame(fit);
    const tm = setTimeout(fit, 350);
    const tm2 = setTimeout(fit, 1000);
    window.addEventListener('resize', fit);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(tm);
      clearTimeout(tm2);
      window.removeEventListener('resize', fit);
    };
  }, [open, drawerRef, bodyRef, min]);
}
