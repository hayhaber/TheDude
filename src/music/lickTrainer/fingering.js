// Left-hand fingering for a single-note line (lick / solo).
//
// Fingers written in the Guitar Pro file are kept as they are. When the file
// has none (most don't), a fingering is suggested the way a teacher would:
// one finger per fret inside a hand position, moving the hand as little as
// possible, bends with the 3rd finger (2nd/1st as backup — never the pinky),
// vibrato off the pinky, and a slide keeps the same finger.
//
// Dynamic programming over hand positions: state = the fret under the index
// finger (1..MAX_POS); a fretted note at fret f in position p is played by
// finger f - p + 1 (1..4; a one-fret stretch of the index or pinky is
// allowed at a cost). Open strings take no finger (0) and don't move the
// hand. Cost = hand shifts + stretches + technique preferences.

const MAX_POS = 22;
const SHIFT_BASE = 2.0; // any shift at all
const SHIFT_PER_FRET = 0.6;
const STRETCH = 1.6; // index one fret below / pinky one fret above the box

function fingerCost(finger, note, prev, prevFinger) {
  let c = 0;
  if (note.technique === 'bend' || note.technique === 'release') {
    c += finger === 3 ? 0 : finger === 2 ? 1.0 : finger === 1 ? 3.2 : 6;
  }
  if (note.vibrato) c += finger === 4 ? 2.5 : finger === 1 ? 0.6 : 0;
  // A legato slide keeps the finger that started it.
  if (note.technique === 'slide' && prev && prevFinger > 0 && finger !== prevFinger) c += 4;
  // Hammer-ons/pull-offs need two different fingers on the same string.
  if ((note.technique === 'hammer' || note.technique === 'pull') && prev && prevFinger === finger) c += 5;
  return c;
}

// The finger(s) a fretted note can take in position p, with their cost.
function options(fret, p) {
  const d = fret - p; // 0 = index finger's fret
  if (d >= 0 && d <= 3) return [{ finger: d + 1, cost: 0 }];
  if (d === -1) return [{ finger: 1, cost: STRETCH }];
  if (d === 4) return [{ finger: 4, cost: STRETCH }];
  return [];
}

/**
 * @param notes  [{ fret, string, technique, vibrato, finger? }] in play order
 * @returns      [{ finger: 0..4 (0 = open), auto: boolean }] per note
 */
export function assignFingers(notes) {
  const n = notes.length;
  if (n === 0) return [];
  const fixed = notes.map((x) => (Number.isInteger(x.finger) && x.finger >= 0 && x.finger <= 4 ? x.finger : null));
  const positions = Array.from({ length: MAX_POS }, (_, i) => i + 1);

  // cost[i][p], back[i][p] = previous position, fing[i][p] = finger used
  const INF = 1e9;
  let cost = new Map(positions.map((p) => [p, 0]));
  const backs = [];
  const fingers = [];
  let prevFingerAt = new Map(positions.map((p) => [p, 0]));

  for (let i = 0; i < n; i++) {
    const note = notes[i];
    const prev = i > 0 ? notes[i - 1] : null;
    const next = new Map();
    const back = new Map();
    const fing = new Map();
    const fingerNow = new Map();
    for (const p of positions) {
      // Which finger plays note i if the hand is at p?
      let best = null;
      if (note.fret === 0) best = { finger: 0, cost: 0 };
      else {
        for (const o of options(note.fret, p)) {
          if (fixed[i] != null && o.finger !== fixed[i]) continue;
          if (!best || o.cost < best.cost) best = o;
        }
        // A written finger outside the box: trust the file anyway.
        if (!best && fixed[i] != null) {
          const d = note.fret - p - (fixed[i] - 1);
          if (d === 0) best = { finger: fixed[i], cost: 0 };
        }
      }
      if (!best) continue;
      // Best way to arrive at p.
      let arrive = INF;
      let from = p;
      for (const [q, cq] of cost) {
        if (cq >= INF) continue;
        // Open strings don't need the hand anywhere: no shift charged to/from them.
        const moved = note.fret === 0 ? 0 : Math.abs(p - q);
        const shift = moved === 0 ? 0 : SHIFT_BASE + SHIFT_PER_FRET * moved;
        const tech = note.fret === 0 ? 0 : fingerCost(best.finger, note, prev, prevFingerAt.get(q) ?? 0);
        const total = cq + shift + tech + best.cost;
        if (total < arrive) {
          arrive = total;
          from = q;
        }
      }
      next.set(p, arrive);
      back.set(p, from);
      fing.set(p, best.finger);
      fingerNow.set(p, best.finger);
    }
    // Keep the hand where it was across an open string (any p is fine there).
    cost = next.size ? next : cost;
    prevFingerAt = fingerNow;
    backs.push(back);
    fingers.push(fing);
  }

  // Trace back the cheapest path.
  let p = null;
  let bestCost = INF;
  for (const [q, c] of cost) {
    if (c < bestCost) {
      bestCost = c;
      p = q;
    }
  }
  const out = new Array(n);
  for (let i = n - 1; i >= 0; i--) {
    const finger = fingers[i].get(p) ?? (notes[i].fret === 0 ? 0 : 1);
    out[i] = { finger, auto: fixed[i] == null };
    p = backs[i].get(p) ?? p;
  }
  return out;
}
