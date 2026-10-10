// GuitarPro -> Chords: a chord sheet of a whole song (Rocksmith's "chords
// arrangement"), from an alphaTab Score. Pure logic, no React.
//
// Where the chords come from:
//   1. the file's own chord symbols (Guitar Pro "chord names") when it has
//      them — on any track; names this app writes itself (labelChords ids
//      'dudestar-…') don't count;
//   2. otherwise (and for long stretches the file leaves unnamed) they are
//      worked out from the music: every pitched part except drums and
//      vocals, per beat, weighted by how long each note sounds — so a
//      strummed / held / arpeggiated rhythm part outweighs a lead line.
//
// buildChordChart(score) -> {
//   source: 'file' | 'derived' | 'mixed',
//   bars: [{ index, start, ticks, num, den, section, chords: [{ at, name, held }] }]
// }  `at` = ticks from the bar's start; `held` = carried over from the bar
// before (drawn dimmer, not a change).
import { identifyChord } from './chordFromNotes';
import { describeScore, trackKind, inFlatKey, pianoPartOf } from './lickTrainer/gpImport';
import { computeChordPositions } from './computeChordPositions';
import { parseChordSymbol } from './chordSymbolParser';
import { CHORD_QUALITIES } from './chordQualities';

const TPB = 960; // ticks per quarter note
const NAME_RE = /^([A-G])(#|b)?(.*?)(?:\/([A-G](?:#|b)?))?$/;
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
// A stretch this long (bars) with no chord names in a file that has some is
// filled from the music instead of holding the last name.
const GAP_BARS = 4;
// Worked-out chords are looked for every eighth note.
const STEP = TPB / 2;

/** { root (pitch class), rest (quality text), bass (pc|null) } or null. */
export function parseChordName(name) {
  const m = NAME_RE.exec(String(name ?? '').trim());
  if (!m) return null;
  const root = (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? 11 : 0)) % 12;
  let bass = null;
  if (m[4]) {
    const b = /^([A-G])(#|b)?$/.exec(m[4]);
    bass = (PC[b[1]] + (b[2] === '#' ? 1 : b[2] === 'b' ? 11 : 0)) % 12;
  }
  return { root, rootName: m[1] + (m[2] ?? ''), rest: m[3] ?? '', bass };
}

/**
 * The chord's "family" for strumming and for judging what the mic hears:
 * 'm' (any minor), 'dim', 'any' (power chords / sus — neither major nor
 * minor) or 'M' (everything else: 7, maj7, add9, 6…).
 */
export function chordFamily(rest) {
  const r = String(rest ?? '');
  if (/^(dim|°|o(?!\w))/.test(r)) return 'dim';
  if (/^(m(?!aj)|min|-)/.test(r)) return 'm';
  if (/^(5|sus|no3)/.test(r)) return 'any';
  return 'M';
}

/** "Simple" names for strumming: Cmaj7 -> C, Am7 -> Am, G/B -> G, E5 -> E. */
export function simplifyChordName(name) {
  const p = parseChordName(name);
  if (!p) return name;
  const fam = chordFamily(p.rest);
  return p.rootName + (fam === 'm' ? 'm' : fam === 'dim' ? 'dim' : '');
}

/** Same chord for play-along purposes: same root, compatible family. */
export function chordsMatch(expectedName, heard) {
  const e = parseChordName(expectedName);
  if (!e || !heard) return false;
  const h = typeof heard === 'string' ? parseChordName(heard) : { root: heard.root, rest: heardRest(heard.qualityKey) };
  if (!h || h.root !== e.root) return false;
  const fe = chordFamily(e.rest);
  const fh = chordFamily(h.rest);
  return fe === 'any' || fh === 'any' || fe === fh;
}

function heardRest(qualityKey) {
  if (qualityKey === 'minor' || qualityKey === 'minor7') return 'm';
  if (qualityKey === 'dim' || qualityKey === 'dim7') return 'dim';
  if (qualityKey === 'sus2' || qualityKey === 'sus4') return 'sus';
  return '';
}

// ---- reading the file's own chord names ----

function fileChords(score) {
  // tick -> name (the first track that names a beat wins)
  const out = new Map();
  for (const track of score.tracks) {
    if (track.__suggestedBass) continue;
    for (const staff of track.staves) {
      for (const bar of staff.bars) {
        const mb = score.masterBars[bar.index];
        for (const voice of bar.voices) {
          for (const beat of voice.beats) {
            const id = beat.chordId;
            if (!id || String(id).startsWith('dudestar-')) continue;
            const name = staff.chords?.get(id)?.name?.trim();
            if (!name) continue;
            const tick = mb.start + beat.playbackStart;
            if (!out.has(tick)) out.set(tick, name);
          }
        }
      }
    }
  }
  return out;
}

// ---- working the chords out from the notes ----

function chordFromWeights(weights, lowest, flats) {
  let max = 0;
  for (const w of weights) max = Math.max(max, w);
  if (max <= 0) return null;
  const pick = (frac) => {
    const midis = [];
    for (let pc = 0; pc < 12; pc += 1) if (weights[pc] >= max * frac) midis.push(lowest[pc]);
    return midis;
  };
  for (const frac of [0.3, 0.15]) {
    const midis = pick(frac);
    const pcs = new Set(midis.map((m) => m % 12));
    if (pcs.size >= 3) {
      const name = identifyChord(midis, { flats });
      if (name) return name;
    }
    if (pcs.size === 2) {
      // A power chord: root + fifth.
      const [a, b] = [...pcs];
      const names = flats ? FLATS : SHARPS;
      if ((b - a + 12) % 12 === 7) return names[a] + '5';
      if ((a - b + 12) % 12 === 7) return names[b] + '5';
    }
  }
  return null;
}

/** Per eighth: [{ tick, name|null }] over the whole score, from the notes. */
function derivedBeats(score) {
  const info = describeScore(score);
  const notes = [];
  for (const t of info.tracks) {
    const kind = trackKind(t);
    if (t.percussion || t.noteCount === 0 || kind === 'vocal' || kind === 'drums') continue;
    if (score.tracks[t.index]?.__suggestedBass) continue;
    // Notes struck together (a strum, a held chord, a piano voicing) say
    // more about the harmony than a melody line's single notes.
    const part = pianoPartOf(score, t.index);
    const together = new Map();
    for (const n of part) together.set(n.start, (together.get(n.start) ?? 0) + 1);
    for (const n of part) notes.push({ ...n, w: together.get(n.start) >= 3 ? 3 : together.get(n.start) === 2 ? 1.5 : 1 });
  }
  notes.sort((a, b) => a.start - b.start);
  const out = [];
  let first = 0;
  for (const mb of score.masterBars) {
    const barTicks = mb.calculateDuration();
    for (let at = 0; at < barTicks; at += STEP) {
      const from = mb.start + at;
      const to = Math.min(from + STEP, mb.start + barTicks);
      while (first < notes.length && notes[first].end <= from - 16 * TPB) first += 1;
      const weights = new Array(12).fill(0);
      const lowest = new Array(12).fill(Infinity);
      for (let i = first; i < notes.length && notes[i].start < to; i += 1) {
        const n = notes[i];
        const overlap = Math.min(n.end, to) - Math.max(n.start, from);
        if (overlap <= 0) continue;
        const pc = n.midi % 12;
        weights[pc] += overlap * n.w;
        lowest[pc] = Math.min(lowest[pc], n.midi);
      }
      out.push({ tick: from, name: chordFromWeights(weights, lowest, inFlatKey(score, from)) });
    }
  }
  // Fill silences with the chord before. An eighth-long chord is mostly a
  // neighbour plus a stray note (a melody note over a strum, a chord still
  // ringing into the next): one between two of the same chord, or one that
  // holds all of a neighbour's notes, becomes that neighbour.
  let last = null;
  for (const b of out) {
    if (b.name) last = b.name;
    else b.name = last;
  }
  for (let i = 1; i < out.length - 1; i += 1) {
    const prev = out[i - 1].name;
    const cur = out[i].name;
    const next = out[i + 1].name;
    if (cur === prev || cur === next || !cur) continue;
    if (prev === next) {
      out[i].name = prev;
      continue;
    }
    const mine = chordPcs(cur);
    const holds = (other) => {
      const pcs = chordPcs(other);
      return pcs.length > 0 && pcs.every((pc) => mine.includes(pc));
    };
    if (next && holds(next)) out[i].name = next;
    else if (prev && holds(prev)) out[i].name = prev;
  }
  return out;
}

/** The pitch classes of a chord name (root + quality tones), [] if unknown. */
export function chordPcs(name) {
  const p = parseChordName(name);
  if (!p) return [];
  if (p.rest === '5') return [p.root, (p.root + 7) % 12];
  const parsed = parseChordSymbol(String(name).replace(/\/.*$/, ''));
  const q = parsed && CHORD_QUALITIES[parsed.qualityKey];
  if (!q) return [];
  return q.tones.map((t) => (p.root + t.semitones) % 12);
}

function changesFrom(list) {
  const out = [];
  let prev = null;
  for (const c of list) {
    if (!c.name || c.name === prev) continue;
    prev = c.name;
    out.push(c);
  }
  return out;
}

/**
 * The whole chart. `simple`: strumming names (and repeated simple names
 * merged).
 */
export function buildChordChart(score, { simple = false } = {}) {
  if (!score?.masterBars?.length) return { source: 'derived', bars: [] };
  const own = fileChords(score);
  let changes;
  let source;
  if (own.size > 0) {
    const named = new Set();
    for (const tick of own.keys()) {
      const mb = score.masterBars.find((m) => tick >= m.start && tick < m.start + m.calculateDuration());
      if (mb) named.add(mb.index);
    }
    // Bars far from any name (before the first, or in a long unnamed
    // stretch) take the worked-out chords.
    const fill = new Set();
    const n = score.masterBars.length;
    let i = 0;
    while (i < n) {
      if (named.has(i)) {
        i += 1;
        continue;
      }
      let j = i;
      while (j < n && !named.has(j)) j += 1;
      const before = [...named].some((b) => b < i);
      if (!before || j - i >= GAP_BARS) for (let k = i; k < j; k += 1) fill.add(k);
      i = j;
    }
    const list = [...own.entries()].map(([tick, name]) => ({ tick, name }));
    let derivedUsed = false;
    if (fill.size) {
      for (const b of derivedBeats(score)) {
        const mb = score.masterBars.find((m) => b.tick >= m.start && b.tick < m.start + m.calculateDuration());
        if (mb && fill.has(mb.index) && b.name) {
          list.push(b);
          derivedUsed = true;
        }
      }
    }
    list.sort((a, b) => a.tick - b.tick);
    changes = list;
    source = derivedUsed ? 'mixed' : 'file';
  } else {
    changes = derivedBeats(score);
    source = 'derived';
  }
  if (simple) changes = changes.map((c) => ({ ...c, name: simplifyChordName(c.name) }));
  changes = changesFrom(changes);

  const bars = [];
  let ci = 0;
  let current = null;
  for (const mb of score.masterBars) {
    const ticks = mb.calculateDuration();
    const end = mb.start + ticks;
    const chords = [];
    while (ci < changes.length && changes[ci].tick < mb.start) current = changes[ci++].name;
    if (current && !(ci < changes.length && changes[ci].tick === mb.start)) chords.push({ at: 0, name: current, held: true });
    while (ci < changes.length && changes[ci].tick < end) {
      const c = changes[ci++];
      current = c.name;
      chords.push({ at: c.tick - mb.start, name: c.name, held: false });
    }
    const sec = mb.section;
    bars.push({
      index: mb.index,
      start: mb.start,
      ticks,
      num: mb.timeSignatureNumerator,
      den: mb.timeSignatureDenominator,
      section: sec ? (sec.text || sec.marker || '').trim() || null : null,
      repeatStart: !!mb.isRepeatStart,
      repeatCount: mb.repeatCount || 0,
      chords,
    });
  }
  return { source, bars };
}

/** The distinct chord names of a chart, in order of first appearance. */
export function chartChordNames(chart) {
  const seen = [];
  for (const b of chart.bars) for (const c of b.chords) if (!seen.includes(c.name)) seen.push(c.name);
  return seen;
}

/**
 * The chord sounding at `inBar` ticks into written bar `barIndex`:
 * { bar, idx, name } where (bar, idx) is the CHANGE that started it (an
 * earlier bar for a held chord), or null.
 */
export function chordAt(chart, barIndex, inBar) {
  const bar = chart.bars[barIndex];
  if (!bar) return null;
  for (let i = bar.chords.length - 1; i >= 0; i -= 1) {
    const c = bar.chords[i];
    if (c.at <= inBar) {
      if (!c.held) return { bar: barIndex, idx: i, name: c.name };
      for (let b = barIndex - 1; b >= 0; b -= 1) {
        const prev = chart.bars[b].chords;
        for (let k = prev.length - 1; k >= 0; k -= 1) if (!prev[k].held) return { bar: b, idx: k, name: prev[k].name };
      }
      return { bar: barIndex, idx: i, name: c.name };
    }
  }
  return null;
}

/** The next chord change after (barIndex, inBar) in written order, or null. */
export function nextChordAfter(chart, barIndex, inBar) {
  const cur = chordAt(chart, barIndex, inBar)?.name;
  for (let b = barIndex; b < chart.bars.length; b += 1) {
    for (const c of chart.bars[b].chords) {
      if (c.held || (b === barIndex && c.at <= inBar)) continue;
      if (c.name !== cur) return { bar: b, name: c.name };
    }
  }
  return null;
}

// ---- a playable shape for each chord ----

// Common open shapes (string 0 = low E … 5 = high E; null = not played).
const X = null;
const OPEN = {
  'G/B': [X, 2, 0, 0, 0, 3],
  'D/F#': [2, X, 0, 2, 3, 2],
  'C/G': [3, 3, 2, 0, 1, 0],
  'C/E': [0, 3, 2, 0, 1, 0],
  'C/B': [X, 2, 2, 0, 1, 0],
  'Am/G': [3, 0, 2, 2, 1, 0],
  'Am/E': [0, 0, 2, 2, 1, 0],
  'G/F#': [2, 2, 0, 0, 0, 3],
  'D/A': [X, 0, 0, 2, 3, 2],
  'E/G#': [4, X, 2, 1, 0, 0],
  'F/C': [X, 3, 3, 2, 1, 1],
  C: [X, 3, 2, 0, 1, 0],
  D: [X, X, 0, 2, 3, 2],
  E: [0, 2, 2, 1, 0, 0],
  G: [3, 2, 0, 0, 0, 3],
  A: [X, 0, 2, 2, 2, 0],
  F: [1, 3, 3, 2, 1, 1],
  Am: [X, 0, 2, 2, 1, 0],
  Em: [0, 2, 2, 0, 0, 0],
  Dm: [X, X, 0, 2, 3, 1],
  Bm: [X, 2, 4, 4, 3, 2],
  E7: [0, 2, 0, 1, 0, 0],
  A7: [X, 0, 2, 0, 2, 0],
  D7: [X, X, 0, 2, 1, 2],
  G7: [3, 2, 0, 0, 0, 1],
  C7: [X, 3, 2, 3, 1, 0],
  B7: [X, 2, 1, 2, 0, 2],
  Am7: [X, 0, 2, 0, 1, 0],
  Em7: [0, 2, 0, 0, 0, 0],
  Dm7: [X, X, 0, 2, 1, 1],
  Cmaj7: [X, 3, 2, 0, 0, 0],
  Fmaj7: [X, X, 3, 2, 1, 0],
  Gmaj7: [3, 2, 0, 0, 0, 2],
  Amaj7: [X, 0, 2, 1, 2, 0],
  Dmaj7: [X, X, 0, 2, 2, 2],
  Asus2: [X, 0, 2, 2, 0, 0],
  Asus4: [X, 0, 2, 2, 3, 0],
  Dsus2: [X, X, 0, 2, 3, 0],
  Dsus4: [X, X, 0, 2, 3, 3],
  Esus4: [0, 2, 2, 2, 0, 0],
  Cadd9: [X, 3, 2, 0, 3, 0],
  E5: [0, 2, 2, X, X, X],
  A5: [X, 0, 2, 2, X, X],
  D5: [X, X, 0, 2, 3, X],
};
// Movable barre shapes, relative to the root's fret.
const E_SHAPE = { '': [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], 7: [0, 2, 0, 1, 0, 0], m7: [0, 2, 0, 0, 0, 0], 5: [0, 2, 2, X, X, X], sus4: [0, 2, 2, 2, 0, 0] };
const A_SHAPE = {
  '': [X, 0, 2, 2, 2, 0],
  m: [X, 0, 2, 2, 1, 0],
  7: [X, 0, 2, 0, 2, 0],
  m7: [X, 0, 2, 0, 1, 0],
  maj7: [X, 0, 2, 1, 2, 0],
  sus2: [X, 0, 2, 2, 0, 0],
  sus4: [X, 0, 2, 2, 3, 0],
  5: [X, 0, 2, 2, X, X],
};

function shapeKey(rest) {
  const r = String(rest ?? '');
  if (r === '' || /^(maj|M)$/.test(r)) return '';
  if (/^(m|min|-)$/.test(r)) return 'm';
  if (r === '7') return '7';
  if (/^(m7|min7|-7)$/.test(r)) return 'm7';
  if (/^(maj7|Maj7|Δ7)$/.test(r)) return 'maj7';
  if (r === 'sus2') return 'sus2';
  if (r === 'sus4' || r === 'sus') return 'sus4';
  if (r === '5') return '5';
  return null;
}

const ENHARMONIC = { 'C#': 'Db', Db: 'C#', 'D#': 'Eb', Eb: 'D#', 'F#': 'Gb', Gb: 'F#', 'G#': 'Ab', Ab: 'G#', 'A#': 'Bb', Bb: 'A#' };

/**
 * A common way to play `name` on guitar: [fret|null × 6] (low E first), or
 * null when there is none. Open shapes first, then an E- or A-shape barre
 * (whichever sits lower), then whatever the app's voicing search finds.
 */
export function chordShape(name) {
  const p = parseChordName(name);
  if (!p) return null;
  const key = shapeKey(p.rest);
  const plain = p.rootName + p.rest;
  const full = String(name).trim();
  if (OPEN[full]) return OPEN[full].slice();
  if (!p.bass && OPEN[plain]) return OPEN[plain].slice();
  if (key != null) {
    if (!p.bass && OPEN[p.rootName + key]) return OPEN[p.rootName + key].slice();
    const shapes = [];
    if (E_SHAPE[key]) shapes.push({ fret: (p.root - 4 + 12) % 12 || 12, shape: E_SHAPE[key] });
    if (A_SHAPE[key]) shapes.push({ fret: (p.root - 9 + 12) % 12 || 12, shape: A_SHAPE[key] });
    shapes.sort((a, b) => a.fret - b.fret);
    if (shapes.length) {
      const { fret, shape } = shapes[0];
      const out = shape.map((f) => (f == null ? null : f + fret));
      if (p.bass != null && out[0] != null && (40 + out[0]) % 12 !== p.bass && out[1] != null) {
        // Slash chord: a bass on the low E if it's within reach, else leave it out.
        const low = (p.bass - 4 + 12) % 12;
        const near = [low, low + 12].find((f) => Math.abs(f - fret) <= 3);
        out[0] = near ?? null;
      }
      return out;
    }
  }
  for (const n of [name, ENHARMONIC[p.rootName] ? ENHARMONIC[p.rootName] + p.rest : null]) {
    if (!n) continue;
    try {
      const res = computeChordPositions(n.replace(/\/.*$/, ''));
      const pos = res?.positions?.[0];
      if (pos) return pos.strings.map((s) => (s.fret == null ? null : s.fret));
    } catch {
      /* not a chord the parser knows */
    }
  }
  return null;
}
