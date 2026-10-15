// The recorder's project ("song") model — pure data and pure operations, no
// audio and no storage, so every edit is testable in node.
//
// A project has up to 4 tracks. Recordings are never changed: a take (the
// audio in IndexedDB) is referenced by REGIONS on a track's timeline —
// { takeId, start (timeline s), offset (into the take, s), length, gain,
//   fadeIn, fadeOut } — so cutting, trimming, moving and comping only change
// numbers, and every step can be undone.
// A track also keeps LANES: every recording pass (a plain take, or each pass
// of a loop recording) placed on the timeline — { takeId, base (timeline
// position of the take's sample 0), from, to (the part that counts) }.
// Comping = choosing, per stretch of time, which lane the track plays.

export const MAX_TRACKS = 4;
export const MIN_REGION = 0.02; // shortest region kept (s)
export const EDGE_FADE = 0.008; // automatic fade at every region edge (no clicks)

let seq = 0;
export function uid(prefix) {
  seq = (seq + 1) % 1e6;
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

const TRACK_NAMES = ['Track 1', 'Track 2', 'Track 3', 'Track 4'];

export function newTrack(index = 0) {
  return { id: uid('trk'), name: TRACK_NAMES[index] || `Track ${index + 1}`, volume: 0.9, mute: false, solo: false, regions: [], lanes: [] };
}

export function newProject({ name = 'Song 1', profileId = '', bpm = 100, beats = 4 } = {}) {
  const t = newTrack(0);
  return {
    id: uid('prj'),
    profileId,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    bpm,
    beats,
    tracks: [t],
    armed: t.id,
    drums: { on: false, style: 'rock', volume: 0.7, fills: false },
    range: null, // { in, out } — loop / punch range
    loop: false,
    punch: false,
    preRoll: 1, // bars before the range (or the playhead) while recording
    postRoll: 0, // bars played after the punch-out
    playhead: 0,
  };
}

// ---- small helpers -----------------------------------------------------------
export const regionEnd = (r) => r.start + r.length;
const byStart = (a, b) => a.start - b.start;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function barSeconds(p) {
  return (60 / p.bpm) * p.beats;
}

/** End of the last region on any track (0 if empty). */
export function projectLength(p) {
  let end = 0;
  for (const t of p.tracks) for (const r of t.regions) end = Math.max(end, regionEnd(r));
  return end;
}

export function findRegion(p, regionId) {
  for (const t of p.tracks) {
    const r = t.regions.find((x) => x.id === regionId);
    if (r) return { track: t, region: r };
  }
  return null;
}

function mapTrack(p, trackId, fn) {
  return { ...p, tracks: p.tracks.map((t) => (t.id === trackId ? fn(t) : t)), updatedAt: Date.now() };
}

/** Regions of `regions` with [a, b) cut out (pieces outside it are kept). */
function cutOut(regions, a, b) {
  const out = [];
  for (const r of regions) {
    const e = regionEnd(r);
    if (e <= a + 1e-9 || r.start >= b - 1e-9) {
      out.push(r);
      continue;
    }
    if (r.start < a - MIN_REGION / 2) {
      out.push({ ...r, length: a - r.start, fadeOut: EDGE_FADE });
    }
    if (e > b + MIN_REGION / 2) {
      const cut = b - r.start;
      out.push({ ...r, id: uid('rgn'), start: b, offset: r.offset + cut, length: e - b, fadeIn: EDGE_FADE });
    }
  }
  return out.filter((r) => r.length >= MIN_REGION).sort(byStart);
}

// ---- tracks ---------------------------------------------------------------------
export function addTrack(p) {
  if (p.tracks.length >= MAX_TRACKS) return p;
  const t = newTrack(p.tracks.length);
  return { ...p, tracks: [...p.tracks, t], updatedAt: Date.now() };
}

export function removeTrack(p, trackId) {
  if (p.tracks.length <= 1) return p;
  const tracks = p.tracks.filter((t) => t.id !== trackId);
  return { ...p, tracks, armed: p.armed === trackId ? tracks[0].id : p.armed, updatedAt: Date.now() };
}

export function setTrack(p, trackId, patch) {
  return mapTrack(p, trackId, (t) => ({ ...t, ...patch }));
}

/** Tracks you hear: solo wins over mute. */
export function audibleTracks(p) {
  const anySolo = p.tracks.some((t) => t.solo);
  return p.tracks.filter((t) => (anySolo ? t.solo : !t.mute));
}

// ---- regions ----------------------------------------------------------------------
export function makeRegion(takeId, start, offset, length, extra = {}) {
  return { id: uid('rgn'), takeId, start, offset, length, gain: 1, fadeIn: EDGE_FADE, fadeOut: EDGE_FADE, ...extra };
}

/** Put a region on a track; whatever was under it is cut away (it wins). */
export function placeRegion(p, trackId, region) {
  const r = { ...region, start: Math.max(0, region.start) };
  if (r.length < MIN_REGION) return p;
  return mapTrack(p, trackId, (t) => ({ ...t, regions: [...cutOut(t.regions, r.start, regionEnd(r)), r].sort(byStart) }));
}

export function deleteRegion(p, regionId) {
  const f = findRegion(p, regionId);
  if (!f) return p;
  return mapTrack(p, f.track.id, (t) => ({ ...t, regions: t.regions.filter((r) => r.id !== regionId) }));
}

export function setRegion(p, regionId, patch) {
  const f = findRegion(p, regionId);
  if (!f) return p;
  return mapTrack(p, f.track.id, (t) => ({ ...t, regions: t.regions.map((r) => (r.id === regionId ? { ...r, ...patch } : r)) }));
}

/** Split the region under time `at` on a track (or a given region). Returns { project, rightId }. */
export function splitAt(p, regionId, at) {
  const f = findRegion(p, regionId);
  if (!f) return { project: p, rightId: null };
  const r = f.region;
  if (at <= r.start + MIN_REGION || at >= regionEnd(r) - MIN_REGION) return { project: p, rightId: null };
  const cut = at - r.start;
  const left = { ...r, length: cut, fadeOut: EDGE_FADE };
  const right = { ...r, id: uid('rgn'), start: at, offset: r.offset + cut, length: r.length - cut, fadeIn: EDGE_FADE };
  const project = mapTrack(p, f.track.id, (t) => ({
    ...t,
    regions: t.regions.map((x) => (x.id === r.id ? left : x)).concat(right).sort(byStart),
  }));
  return { project, rightId: right.id };
}

/** Region under time t on a track, or null. */
export function regionAt(track, t) {
  return track.regions.find((r) => t >= r.start && t < regionEnd(r)) || null;
}

/**
 * Move a region to `start` (and optionally another track). The moved region
 * wins over whatever it lands on.
 */
export function moveRegion(p, regionId, start, toTrackId = null) {
  const f = findRegion(p, regionId);
  if (!f) return p;
  const moved = { ...f.region, start: Math.max(0, start) };
  const removed = deleteRegion(p, regionId);
  return placeRegion(removed, toTrackId || f.track.id, moved);
}

/**
 * Drag one edge of a region to time `t`. Bounded by the take itself
 * (`takeDuration`) and by the neighbouring regions on the same track.
 */
export function trimRegion(p, regionId, edge, t, takeDuration) {
  const f = findRegion(p, regionId);
  if (!f) return p;
  const r = f.region;
  const others = f.track.regions.filter((x) => x.id !== r.id);
  const prevEnd = Math.max(0, ...others.filter((x) => regionEnd(x) <= r.start + 1e-6).map(regionEnd));
  const nextStart = Math.min(Infinity, ...others.filter((x) => x.start >= regionEnd(r) - 1e-6).map((x) => x.start));
  let patch;
  if (edge === 'start') {
    const lo = Math.max(prevEnd, r.start - r.offset);
    const s = clamp(t, lo, regionEnd(r) - MIN_REGION);
    patch = { start: s, offset: r.offset + (s - r.start), length: regionEnd(r) - s };
  } else {
    const hi = Math.min(nextStart, r.start + (takeDuration - r.offset));
    const e = clamp(t, r.start + MIN_REGION, hi);
    patch = { length: e - r.start };
  }
  patch.fadeIn = Math.min(r.fadeIn, (patch.length ?? r.length) / 2);
  patch.fadeOut = Math.min(r.fadeOut, (patch.length ?? r.length) / 2);
  return setRegion(p, regionId, patch);
}

/** Place a take at the end of a track (joining recordings back to back). */
export function appendTake(p, trackId, take) {
  const t = p.tracks.find((x) => x.id === trackId);
  if (!t) return p;
  const end = Math.max(0, ...t.regions.map(regionEnd));
  return placeRegion(p, trackId, makeRegion(take.id, end, 0, take.duration));
}

// ---- lanes / comping ----------------------------------------------------------------
export function addLane(p, trackId, lane) {
  const l = { id: uid('lane'), ...lane };
  return { project: mapTrack(p, trackId, (t) => ({ ...t, lanes: [...t.lanes, l] })), laneId: l.id };
}

export function removeLane(p, trackId, laneId) {
  return mapTrack(p, trackId, (t) => ({ ...t, lanes: t.lanes.filter((l) => l.id !== laneId) }));
}

/** Use lane `laneId` for [a, b) on its track (clipped to the lane's own part). */
export function compLane(p, trackId, laneId, a, b) {
  const t = p.tracks.find((x) => x.id === trackId);
  const l = t?.lanes.find((x) => x.id === laneId);
  if (!l) return p;
  const s = Math.max(a, l.from);
  const e = Math.min(b, l.to);
  if (e - s < MIN_REGION) return p;
  return placeRegion(p, trackId, makeRegion(l.takeId, s, s - l.base, e - s, { laneId }));
}

/** Which lane is heard at time t on a track (by region.laneId / takeId). */
export function laneAt(track, t) {
  const r = regionAt(track, t);
  if (!r) return null;
  return track.lanes.find((l) => l.id === r.laneId) || track.lanes.find((l) => l.takeId === r.takeId && t >= l.from && t < l.to) || null;
}

// ---- recording results ----------------------------------------------------------------
/**
 * Fold a finished recording into the project.
 *  passes: [{ base, from, to }] — where the take sits on the timeline and the
 *  part that counts (one pass for a plain/punch recording, one per loop pass).
 * Every pass becomes a lane; the LAST complete pass (or the only one) is
 * placed on the track. A punch recording keeps only [from, to).
 */
export function addRecording(p, trackId, take, passes, label = 'Take') {
  let q = p;
  let lastFull = null;
  passes.forEach((ps, i) => {
    const res = addLane(q, trackId, { takeId: take.id, base: ps.base, from: ps.from, to: ps.to, label: passes.length > 1 ? `${label} · ${i + 1}` : label, full: ps.full !== false });
    q = res.project;
    if (ps.full !== false || passes.length === 1) lastFull = { laneId: res.laneId, ...ps };
  });
  if (!lastFull) {
    const ps = passes[passes.length - 1];
    lastFull = { laneId: q.tracks.find((t) => t.id === trackId).lanes.at(-1).id, ...ps };
  }
  return compLane(q, trackId, lastFull.laneId, lastFull.from, lastFull.to);
}

/** Every take id the project uses (regions and lanes). */
export function usedTakeIds(p) {
  const s = new Set();
  for (const t of p.tracks) {
    for (const r of t.regions) s.add(r.takeId);
    for (const l of t.lanes) s.add(l.takeId);
  }
  return s;
}

// ---- undo / redo ------------------------------------------------------------------
export function createHistory(limit = 60) {
  let past = [];
  let future = [];
  return {
    push(prev) {
      past.push(prev);
      if (past.length > limit) past = past.slice(-limit);
      future = [];
    },
    undo(current) {
      if (!past.length) return null;
      future.push(current);
      return past.pop();
    },
    redo(current) {
      if (!future.length) return null;
      past.push(current);
      return future.pop();
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    clear() {
      past = [];
      future = [];
    },
  };
}

/** Remove every use of a take (its regions and lanes) — when it is deleted. */
export function removeTake(p, takeId) {
  if (!usedTakeIds(p).has(takeId)) return p;
  return {
    ...p,
    tracks: p.tracks.map((t) => ({ ...t, regions: t.regions.filter((r) => r.takeId !== takeId), lanes: t.lanes.filter((l) => l.takeId !== takeId) })),
    updatedAt: Date.now(),
  };
}
