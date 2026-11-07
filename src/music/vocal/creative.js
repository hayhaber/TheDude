// Creative singing (the Vocal library's "Create" group): harmony, question
// & answer, and improvising over a chord loop. The methods are the ones
// voice teachers and choirs use:
//  - HARMONY: hear a melody, sing the line a diatonic third above (or,
//    advanced, below) it — the first harmony part a choir singer learns
//    (Kodály two-part singing, parallel thirds), with the starting note
//    given, as a choir director gives it.
//  - QUESTION & ANSWER: the piano sings a one-bar phrase that stops "open"
//    (on the 2nd or 5th); the singer answers with an own bar that comes
//    home (on a note of the tonic chord) — the call-and-response phrasing
//    of jazz and gospel vocal improvisation (Bob Stoloff's "Scat!",
//    Berklee; Michele Weir's "Vocal Improvisation").
//  - IMPROVISE (scat): a I–vi–IV–V loop, a soft tick on each beat (above
//    the mic's pitch range, never a note), the chord tones lit on the roll:
//    sing freely, aim for chord tones on the chord changes (chord-tone
//    targeting, the first rule of every improvisation method).
// Free singing has no right notes, so it is scored on what those methods
// teach: in the key, chord tones, an ending that comes home, using more
// than two notes, notes held in tune.

export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const pitchOf = (step) => MAJOR[((step % 7) + 7) % 7] + 12 * Math.floor(step / 7);
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function chordName(rootPc, minor) {
  return NAMES[((rootPc % 12) + 12) % 12] + (minor ? 'm' : '');
}

function pickKey(keys, rand) {
  // From the middle of the possible keys (comfortable), not the edges.
  const mid = Math.floor(keys.length / 2);
  const spread = Math.max(1, Math.floor(keys.length / 3));
  return keys[Math.max(0, Math.min(keys.length - 1, mid - spread + Math.floor(rand() * (spread * 2 + 1))))];
}

/** Harmony: the melody plays, the singer sings the third above / below. */
export function buildHarmonyReps(ex, work, { level, beat, rand, keysForPattern }) {
  const below = !!ex.below;
  const reps = [];
  const count = ex.reps ?? 5;
  const RHYTHMS = level >= 2 ? [[1, 1, 1, 1, 2], [1, 0.5, 0.5, 1, 1, 2], [1, 1, 2, 1, 2]] : [[1, 1, 1, 2], [1, 1, 1, 1, 2]];
  for (let i = 0; i < count; i += 1) {
    const rhythm = RHYTHMS[Math.floor(rand() * RHYTHMS.length)];
    // A stepwise melody (a melody choirs harmonise), inside 1..6 of the scale.
    let s = [0, 2, 4][Math.floor(rand() * 3)];
    const steps = [s];
    while (steps.length < rhythm.length) {
      let next = s + (rand() < 0.5 ? -1 : 1) * (level >= 2 && rand() < 0.25 ? 2 : 1);
      if (next < 0) next = s + 1;
      if (next > 6) next = s - 1;
      s = next;
      steps.push(s);
    }
    // End on a stable note (1, 3 or 5) so the harmony lands too.
    const last = steps[steps.length - 1];
    if (![0, 2, 4].includes(last)) steps[steps.length - 1] = last > 2 ? 4 : 2;
    const hOffs = steps.map((st) => pitchOf(st + (below ? -2 : 2)));
    const keys = keysForPattern(hOffs, work, { maxKeys: 20 });
    const key = pickKey(keys, rand);
    let t = 0;
    const melody = [];
    const targets = [];
    steps.forEach((st, j) => {
      const dur = rhythm[j] * beat;
      melody.push({ midi: key + pitchOf(st), start: t, dur: dur * 0.95 });
      targets.push({ midi: key + hOffs[j], start: t, dur });
      t += dur;
    });
    const lead = beat * 1.5;
    const chord = [0, 4, 7].map((d, k) => ({ midi: key + d - 12 * (key + d > work.high ? 1 : 0), start: k * 0.01, dur: beat * 1.2 }));
    const givenAt = lead + t + beat * 0.6;
    reps.push({
      key,
      // Chord, the melody, then the harmony's first note (the given pitch).
      cue: [...chord, ...melody.map((n) => ({ ...n, start: lead + n.start })), { midi: targets[0].midi, start: givenAt, dur: beat * 1.1 }],
      cueLength: givenAt + beat * 1.3,
      targets,
      length: t,
      // Drawn as grey bars behind the targets, and played under the
      // singing when Guide is on (the real harmony experience).
      melody,
      guide: melody,
    });
  }
  return reps;
}

const QUESTION_RHYTHMS = [
  [1, 1, 1, 1],
  [0.5, 0.5, 1, 2],
  [1, 0.5, 0.5, 2],
  [1.5, 0.5, 1, 1],
  [0.5, 0.5, 0.5, 0.5, 2],
];

/** Question & answer: the piano asks one bar, the singer answers one bar. */
export function buildAnswerReps(ex, work, { level, beat, rand, keysForPattern }) {
  const reps = [];
  const count = ex.reps ?? 4;
  for (let i = 0; i < count; i += 1) {
    const rhythm = QUESTION_RHYTHMS[Math.floor(rand() * QUESTION_RHYTHMS.length)];
    let s = [0, 2, 4][Math.floor(rand() * 3)];
    const steps = [s];
    while (steps.length < rhythm.length) {
      const leap = level >= 2 && rand() < 0.3 ? 2 : 1;
      let next = s + (rand() < 0.5 ? -leap : leap);
      if (next < -1) next = s + 1;
      if (next > 7) next = s - 1;
      s = next;
      steps.push(s);
    }
    // A question stays open: it stops on the 2nd or the 5th.
    steps[steps.length - 1] = rand() < 0.5 ? 1 : 4;
    const qOffs = steps.map(pitchOf);
    // The singer's answer needs the space around the key (a 6th below to a
    // 9th above covers every natural answer).
    const keys = keysForPattern([...qOffs, -3, 9], work, { maxKeys: 20 });
    const key = pickKey(keys, rand);
    const lead = beat * 1.5;
    let t = 0;
    const question = rhythm.map((b, j) => {
      const n = { midi: key + qOffs[j], start: lead + t, dur: b * beat * 0.93 };
      t += b * beat;
      return n;
    });
    const chord = [0, 4, 7].map((d, k) => ({ midi: key + d - 12 * (key + d > work.high ? 1 : 0), start: k * 0.01, dur: beat * 1.2 }));
    const length = 5 * beat; // one bar + the last note held
    const lo = Math.max(work.low, key - 5);
    const hi = Math.min(work.high, key + 12);
    reps.push({
      key,
      cue: [...chord, ...question],
      cueLength: lead + t + beat * 0.4,
      targets: [],
      length,
      melody: [],
      // Guide on (headphones): the tonic chord softly under the answer.
      guide: [0, 4, 7].map((d) => ({ midi: key + d - 12, start: 0, dur: length })),
      span: { lo, hi },
      free: {
        root: key,
        scale: MAJOR,
        chords: [{ start: 0, end: length, pcs: [0, 4, 7], name: chordName(key, false) }],
        home: [0, 4, 7],
        beat,
      },
    });
  }
  return reps;
}

// I – vi – IV – V, one chord per bar (4 beats). Pitch classes RELATIVE to
// the key's root.
const LOOP = [
  { deg: 0, pcs: [0, 4, 7], minor: false },
  { deg: 9, pcs: [9, 0, 4], minor: true },
  { deg: 5, pcs: [5, 9, 0], minor: false },
  { deg: 7, pcs: [7, 11, 2], minor: false },
];

/** Improvise over a chord loop (scat). */
export function buildImproviseReps(ex, work, { beat, rand, keysForPattern }) {
  const reps = [];
  const count = ex.reps ?? 2;
  const keys = keysForPattern([-3, 0, 4, 7, 9], work, { maxKeys: 20 });
  for (let i = 0; i < count; i += 1) {
    const key = pickKey(keys, rand);
    const bar = beat * 4;
    const length = bar * LOOP.length;
    const chords = LOOP.map((c, k) => ({ start: k * bar, end: (k + 1) * bar, pcs: c.pcs, name: chordName(key + c.deg, c.minor) }));
    // The cue: the loop once, two beats a chord (bass + chord), so the
    // singer hears the changes before improvising over them.
    const half = beat * 2;
    const voice = (c, start, dur) => {
      const bass = key + c.deg - 24 + (key + c.deg - 24 < 36 ? 12 : 0);
      const tones = c.pcs.map((p) => {
        let m = key + p - 12;
        while (m < key - 12) m += 12;
        return m;
      });
      return [{ midi: bass, start, dur }, ...tones.map((m, j) => ({ midi: m, start: start + j * 0.01, dur }))];
    };
    const cue = LOOP.flatMap((c, k) => voice(c, k * half, half * 0.96));
    const backing = LOOP.flatMap((c, k) => [0, 2].flatMap((b) => voice(c, k * bar + b * beat, beat * 1.9)));
    const ticks = [];
    for (let b = 0; b < LOOP.length * 4; b += 1) ticks.push({ t: b * beat, high: b % 4 === 0 });
    reps.push({
      key,
      cue,
      cueLength: LOOP.length * half + 0.2,
      targets: [],
      length,
      melody: [],
      guide: backing,
      ticks,
      span: { lo: Math.max(work.low, key - 5), hi: Math.min(work.high, key + 12) },
      free: { root: key, scale: MAJOR, chords, home: null, beat, improv: true },
    });
  }
  return reps;
}

/** The chord sounding at time t of a free rep. */
export function chordAt(free, t) {
  return free.chords.find((c) => t >= c.start && t < c.end) ?? free.chords[free.chords.length - 1];
}

/**
 * How a sung pitch sits in a free rep at time t: 'chord' (a chord tone,
 * in tune), 'scale' (in the key), 'out' (outside the key), or 'slide'
 * (between notes — more than 35 cents from any semitone).
 */
export function freeClass(free, t, midi) {
  const near = Math.round(midi);
  if (Math.abs(midi - near) > 0.35) return 'slide';
  const pc = (((near - free.root) % 12) + 12) % 12;
  if (chordAt(free, t)?.pcs.includes(pc)) return 'chord';
  return free.scale.includes(pc) ? 'scale' : 'out';
}

function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** The settled notes of a free take: runs of frames on one pitch, >= 0.12 s. */
export function segmentNotes(frames) {
  const notes = [];
  let cur = [];
  const close = () => {
    if (cur.length >= 2) {
      const dur = cur[cur.length - 1].t - cur[0].t + 0.02;
      if (dur >= 0.12) {
        const m = median(cur.map((f) => f.midi));
        notes.push({ start: cur[0].t, dur, midi: m });
      }
    }
    cur = [];
  };
  for (const f of frames) {
    if (f.midi == null) {
      close();
      continue;
    }
    const last = cur[cur.length - 1];
    if (last && (f.t - last.t > 0.09 || Math.abs(f.midi - median(cur.slice(-6).map((x) => x.midi))) > 0.6)) close();
    cur.push(f);
  }
  close();
  return notes;
}

/** Score a free take (question & answer, improvising). */
export function analyzeFree(frames, rep) {
  const free = rep.free;
  const inside = frames.filter((f) => f.t >= -0.1 && f.t <= rep.length + 0.4);
  const voiced = inside.filter((f) => f.midi != null);
  const notes = segmentNotes(inside);
  const total = notes.reduce((a, n) => a + n.dur, 0);
  const heard = voiced.length >= 6 && total >= Math.min(0.8, rep.length * 0.15);
  if (!heard || notes.length < 2) {
    return { key: rep.key, notes: [], free: { heard: false, count: notes.length, segs: notes }, score: 0, lag: 0 };
  }
  let inKey = 0;
  let chordDur = 0;
  let centsSum = 0;
  let strongN = 0;
  let strongChord = 0;
  for (const n of notes) {
    const near = Math.round(n.midi);
    const pc = (((near - free.root) % 12) + 12) % 12;
    const isChord = chordAt(free, n.start).pcs.includes(pc);
    if (free.scale.includes(pc)) inKey += n.dur;
    if (isChord) chordDur += n.dur;
    centsSum += Math.abs(n.midi - near) * 100 * n.dur;
    // A note that starts on a chord change (a bar's first beat ± 1/3 beat).
    if (free.improv) {
      const barT = free.beat * 4;
      const into = n.start % barT;
      if (into < free.beat / 3 || barT - into < free.beat / 3) {
        strongN += 1;
        if (isChord) strongChord += 1;
      }
    }
  }
  const lastNote = notes[notes.length - 1];
  const lastPc = (((Math.round(lastNote.midi) - free.root) % 12) + 12) % 12;
  const homeSet = free.home ?? chordAt(free, lastNote.start).pcs;
  const endsHome = homeSet.includes(lastPc);
  const span = Math.max(...notes.map((n) => n.midi)) - Math.min(...notes.map((n) => n.midi));
  const inKeyShare = inKey / total;
  const chordShare = chordDur / total;
  const cents = centsSum / total;
  const tune = Math.max(0, Math.min(1, 1 - (cents - 12) / 30));
  const variety = Math.min(1, (notes.length - 1) / 3) * Math.min(1, span / 3);
  const target = free.improv ? (strongN ? strongChord / strongN : chordShare) : endsHome ? 1 : 0;
  const score = Math.round(100 * (0.45 * inKeyShare + 0.2 * chordShare + 0.15 * target + 0.1 * tune + 0.1 * variety));
  return {
    key: rep.key,
    notes: [],
    free: {
      heard: true,
      count: notes.length,
      inKey: inKeyShare,
      chordTones: chordShare,
      onChange: strongN ? strongChord / strongN : null,
      endsHome,
      span,
      cents: Math.round(cents),
      segs: notes,
    },
    score,
    lag: 0,
  };
}

/** The 1–3 tips for a free exercise (keys `vocal.tip.<key>`). */
export function diagnoseFree(results, ex) {
  const all = results.map((r) => r.free).filter(Boolean);
  if (!all.length) return [{ key: 'skipped' }];
  const heard = all.filter((f) => f.heard);
  if (heard.length / all.length < 0.5) return [{ key: 'freeNotHeard' }];
  const avg = (k) => heard.reduce((a, f) => a + (f[k] ?? 0), 0) / heard.length;
  const tips = [];
  const inKey = avg('inKey');
  if (inKey < 0.75) tips.push({ key: 'freeOutKey', pct: Math.round(inKey * 100) });
  if (ex.kind === 'improv') {
    const ch = heard.map((f) => f.onChange).filter((x) => x != null);
    const onChange = ch.length ? ch.reduce((a, b) => a + b, 0) / ch.length : avg('chordTones');
    if (onChange < 0.5) tips.push({ key: 'freeChange', pct: Math.round(onChange * 100) });
  } else if (heard.filter((f) => !f.endsHome).length / heard.length > 0.5) tips.push({ key: 'freeHome' });
  if (avg('count') < 3) tips.push({ key: 'freeFew' });
  else if (avg('span') < 3) tips.push({ key: 'freeNarrow' });
  if (avg('cents') > 30) tips.push({ key: 'freeSettle' });
  if (!tips.length) tips.push({ key: 'freeGreat', pct: Math.round(inKey * 100) });
  return tips.slice(0, 3);
}
