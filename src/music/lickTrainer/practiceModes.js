// Lick Trainer practice modes — pure helpers (no React / Web Audio).
//
//   Wait  — note by note: the app waits for the right pitch before moving on
//           (Rocksmith "Note by Note", Yousician "Wait To Play").
//   Build — the lick in growing chunks: the first few notes, then two more
//           each time a take passes, until the whole lick (chunking).
//   Auto tempo — after a good take the tempo goes up a step, after a poor
//           one it comes down a step (optionally in a loop of takes).
//   Section mastery — per solo section, the best score and tempo reached.
//   Take export — a recorded take as a 16-bit WAV file.

export const BUILD_PASS = 85; // a Build step passes at this score
export const AUTO_UP = 85; // auto tempo: this score or better -> faster
export const AUTO_DOWN = 70; // below this -> slower
export const AUTO_TARGET = 100; // default target tempo (%)
export const LOOP_GAP_S = 3; // loop: time to read the result before the next take

// ---- Wait ------------------------------------------------------------------

// The pitch the player must reach on a note: a bend's target (the pitch the
// string is pushed to), otherwise the note itself — for a double stop or a
// chord that's the top note, the same one the take analysis follows.
export function waitTarget(note) {
  if (!note) return null;
  return note.technique === 'bend' ? note.midi + (note.bend ?? 2) : note.midi;
}

// The lowest pitch that still counts as "on the way" to the target (a bend
// starts at the fretted note) — not a wrong note.
export function waitFloor(note) {
  return note?.technique === 'bend' ? note.midi : waitTarget(note);
}

export const WAIT_TOLERANCE = 0.5; // semitones (±50 cents)
export const WAIT_HOLD_S = 0.08; // the right pitch held this long = played
const WRONG_HOLD_S = 0.14; // a different pitch held this long = a wrong attempt
const MIN_CLARITY = 0.86;
const GATE_RMS = 0.008;

/**
 * Live "wait for the right note" matcher. Feed it one pitch frame at a time
 * ({ time (s), hz, clarity, rms }); it says when the current target was
 * played and counts wrong attempts. The caller moves it on with next().
 */
export function createWaitMatcher() {
  let target = null; // midi
  let floor = null;
  let prevTarget = null; // the note just played may still ring — not "wrong"
  let hitStart = null;
  let wrongStart = null;
  let wrongMidi = null;
  let wrongCounted = false;
  let needAttack = false; // the same pitch twice in a row: wait for a new attack
  const recentRms = [];

  return {
    setTarget(note, previous = null) {
      prevTarget = previous ? waitTarget(previous) : null;
      target = waitTarget(note);
      floor = waitFloor(note);
      hitStart = null;
      wrongStart = null;
      wrongCounted = false;
      needAttack = prevTarget != null && Math.abs(prevTarget - target) < WAIT_TOLERANCE;
    },
    /** -> { hit: bool, wrong: null | 'higher' | 'lower' | 'octave', midi } */
    feed({ time, hz, clarity, rms }) {
      const out = { hit: false, wrong: null, midi: null };
      // A new attack (the level jumps above its recent minimum).
      const min = recentRms.length ? Math.min(...recentRms) : rms;
      recentRms.push(rms);
      if (recentRms.length > 8) recentRms.shift();
      if (needAttack && rms > GATE_RMS && rms > min * 1.8) needAttack = false;
      if (rms < GATE_RMS || !(clarity >= MIN_CLARITY) || !(hz > 60 && hz < 1500)) {
        hitStart = null;
        wrongStart = null;
        if (rms < GATE_RMS) needAttack = false; // silence: the next sound is a new note
        return out;
      }
      const midi = 69 + 12 * Math.log2(hz / 440);
      out.midi = midi;
      if (target == null) return out;
      const diff = midi - target;
      if (Math.abs(diff) <= WAIT_TOLERANCE) {
        wrongStart = null;
        if (needAttack) return out;
        if (hitStart == null) hitStart = time;
        if (time - hitStart >= WAIT_HOLD_S - 1e-6) {
          out.hit = true;
          hitStart = null;
        }
        return out;
      }
      hitStart = null;
      needAttack = false;
      // Not wrong: the previous note still ringing, or a bend on its way up.
      const ringing = prevTarget != null && Math.abs(midi - prevTarget) <= WAIT_TOLERANCE;
      const rising = midi >= floor - WAIT_TOLERANCE && midi <= target + WAIT_TOLERANCE;
      if (ringing || rising) {
        wrongStart = null;
        return out;
      }
      if (wrongStart == null || Math.abs(midi - wrongMidi) > WAIT_TOLERANCE) {
        wrongStart = time;
        wrongMidi = midi;
        wrongCounted = false;
      }
      if (!wrongCounted && time - wrongStart >= WRONG_HOLD_S) {
        wrongCounted = true;
        const semis = Math.round(diff);
        out.wrong = semis !== 0 && semis % 12 === 0 ? 'octave' : diff < 0 ? 'higher' : 'lower';
      }
      return out;
    },
  };
}

// ---- Build -----------------------------------------------------------------

// Where each Build step ends (exclusive note index): the first beat group
// (3–6 notes) or 4 notes, then two more each step, then the whole lick.
export function buildSteps(notes) {
  const n = notes.length;
  if (n <= 4) return [n];
  let first = 4;
  // Notes up to the first beat boundary after the first note's beat + 1.
  const firstBeat = Math.floor(notes[0].start + 1e-6);
  const groupEnd = notes.findIndex((x) => x.start >= firstBeat + 1 - 1e-6);
  if (groupEnd >= 3 && groupEnd <= 6) first = groupEnd;
  const ends = [];
  for (let e = first; e < n; e += 2) ends.push(e);
  if (n - ends[ends.length - 1] < 2) ends.pop(); // no 1-note last step (a 5-note lick: one step)
  ends.push(n);
  return ends;
}

// The first `end` notes of a lick, as a lick of their own (the notes keep
// their order numbers and positions, so tab / neck / results line up).
export function chunkLick(lick, end) {
  if (!lick || end >= lick.notes.length) return lick;
  const notes = lick.notes.slice(0, end);
  const lastEnd = Math.max(...notes.map((x) => x.start + x.duration));
  return { ...lick, id: `${lick.id}~${end}`, notes, lengthBeats: Math.max(1, Math.ceil(lastEnd - 1e-6)), chunkOf: lick.id };
}

// The beat where a chunk's last note ends (for highlighting it on the tab).
export function chunkEndBeat(lick, end) {
  if (!lick || end >= lick.notes.length) return lick?.lengthBeats ?? 0;
  const next = lick.notes[end];
  return next ? next.start : lick.lengthBeats;
}

// ---- Auto tempo --------------------------------------------------------------

/**
 * The tempo after a take: one step up the tempo list after a good take (up
 * to the target), one step down after a poor one, otherwise the same.
 * `options` is the ascending list of tempos (%) the trainer offers.
 */
export function nextAutoTempo(pct, score, { to }, options) {
  const up = options.find((v) => v > pct);
  const down = [...options].reverse().find((v) => v < pct);
  if (score >= AUTO_UP) return pct < to && up != null ? Math.min(up, Math.max(to, pct)) : pct;
  if (score < AUTO_DOWN) return down ?? pct;
  return pct;
}

/** Loop: the target is reached and held (a good take at the target tempo). */
export function autoTargetHeld(pct, score, { to }) {
  return pct >= to && score >= AUTO_UP;
}

// ---- Section mastery (solos) ---------------------------------------------------

export const MASTERED_SCORE = 85;
export const OK_SCORE = 70;

/**
 * Per section of a solo, from the performance log (tool 'lick', item
 * '<soloId>#<section>'; Wait runs carry no score and are skipped):
 * { index, takes, best, bestTempo, topTempo, status }
 *   best      — best score at any tempo; bestTempo — the tempo of that take
 *   topTempo  — the fastest tempo with a passing take (>= OK_SCORE)
 *   status    — 'mastered' (>= MASTERED_SCORE at 100%+) | 'close' (>= OK_SCORE)
 *               | 'weak' (tried, below) | 'none' (not tried)
 */
export function sectionMastery(perf, soloId, sectionCount) {
  const out = Array.from({ length: sectionCount }, (_, index) => ({ index, takes: 0, best: null, bestTempo: null, topTempo: null, status: 'none' }));
  const prefix = `${soloId}#`;
  for (const e of perf) {
    if (e.tool !== 'lick' || typeof e.item !== 'string' || !e.item.startsWith(prefix)) continue;
    const k = Number(e.item.slice(prefix.length));
    const s = e.metrics?.score;
    if (!Number.isInteger(k) || k < 0 || k >= sectionCount || !Number.isFinite(s)) continue;
    const tempo = Number.isFinite(e.metrics?.tempoPct) ? e.metrics.tempoPct : 100;
    const m = out[k];
    m.takes += 1;
    if (m.best == null || s > m.best || (s === m.best && tempo > m.bestTempo)) {
      m.best = s;
      m.bestTempo = tempo;
    }
    if (s >= OK_SCORE && (m.topTempo == null || tempo > m.topTempo)) m.topTempo = tempo;
    if (s >= MASTERED_SCORE && tempo >= 100) m.status = 'mastered';
  }
  for (const m of out) {
    if (m.status === 'mastered' || m.takes === 0) continue;
    m.status = m.best >= OK_SCORE ? 'close' : 'weak';
  }
  return out;
}

/** The section to practise next: the weakest tried one, else the first untried, else the least good. */
export function weakestSection(mastery) {
  const by = (st) => mastery.filter((m) => m.status === st);
  const weak = by('weak').sort((a, b) => a.best - b.best)[0];
  if (weak) return weak.index;
  const none = by('none')[0];
  if (none) return none.index;
  const close = by('close').sort((a, b) => a.best - b.best || (a.topTempo ?? 0) - (b.topTempo ?? 0))[0];
  return close ? close.index : null;
}

// ---- Take export -------------------------------------------------------------

/** Mono float samples -> a 16-bit PCM WAV Blob. */
export function encodeWav(samples, sampleRate) {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}
