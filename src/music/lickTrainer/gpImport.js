// Guitar Pro -> Lick Trainer licks.
//
// Takes an alphaTab Score (any GP3/4/5/GPX/GP7 file alphaTab can read) and
// turns one track into licks in the same shape as library.js's RAW_LICKS
// (start/duration in beats, app string index 0 = low E, fret, technique,
// bend in semitones, vibrato) — the exact rhythm, bends, slides and legato
// written in the file, no manual transcription.
//
// Conventions that differ between alphaTab and this app:
//   - alphaTab string 1 = lowest string; app index 0 = low E  -> index = string - 1
//   - alphaTab bend values are quarter tones                    -> semitones = value / 2
//   - time in ticks, 960 per quarter note                       -> beats = ticks / 960
// The Lick Trainer's analysis is monophonic, so a chord/double-stop keeps
// only its highest note and the lick is flagged `simplified`.
import { STANDARD_TUNING } from '../notes';

const TICKS_PER_BEAT = 960;
const SLIDE_SHIFT = 1;
const SLIDE_LEGATO = 2;

function bendInfo(note) {
  const pts = note.bendPoints;
  if (!note.hasBend || !pts || pts.length === 0) return null;
  const values = pts.map((p) => p.value);
  const start = values[0];
  const peak = Math.max(...values);
  const end = values[values.length - 1];
  if (peak <= 0) return null;
  if (start > 0 && end < start) return { technique: 'release', bend: start / 2 }; // pre-bend, then let it down
  return { technique: 'bend', bend: peak / 2 }; // bend (a bend-and-release is judged on its bend)
}

// One track's playable notes as a flat, time-ordered list.
function trackNotes(score, trackIndex) {
  const track = score.tracks[trackIndex];
  const staff = track.staves[0];
  const out = [];
  let simplified = false;
  let shifts = new Map();
  for (const bar of staff.bars) {
    const master = score.masterBars[bar.index];
    const voice = bar.voices[0];
    for (const beat of voice.beats) {
      if (beat.isRest || beat.graceType !== 0) continue;
      const notes = beat.notes.filter((n) => !n.isDead && n.fret >= 0);
      if (notes.length === 0) continue;
      if (notes.length > 1) simplified = true;
      const note = notes.reduce((a, b) => (b.realValue > a.realValue ? b : a));
      const start = (master.start + beat.playbackStart) / TICKS_PER_BEAT;
      const duration = beat.playbackDuration / TICKS_PER_BEAT;
      const stringIndex = note.string - 1;
      if (stringIndex < 0 || stringIndex > 5) continue;
      const shift = note.realValue - (STANDARD_TUNING[stringIndex].baseMidi + note.fret);
      shifts.set(shift, (shifts.get(shift) ?? 0) + 1);

      const prev = out[out.length - 1];
      // A tied note just lengthens the one before it.
      if (note.isTieDestination && prev && prev.string === stringIndex && prev.fret === note.fret) {
        prev.duration = start + duration - prev.start;
        if (note.vibrato) prev.vibrato = true;
        continue;
      }
      const b = bendInfo(note);
      // A bend held into the next beat (a "hold": starts and stays at the
      // height the previous bend reached) is the same sounding note.
      if (b && prev && prev.string === stringIndex && prev.fret === note.fret && prev.technique === 'bend') {
        const pts = note.bendPoints.map((p) => p.value);
        if (pts.every((v) => v === pts[0]) && pts[0] / 2 === prev.bend) {
          prev.duration = start + duration - prev.start;
          if (note.vibrato !== 0 || beat.vibrato !== 0) prev.vibrato = true;
          continue;
        }
      }
      let technique = null;
      let bend;
      if (b) {
        technique = b.technique;
        bend = b.bend;
      } else if (prev && prev.string === stringIndex && prev._slideOut) {
        technique = 'slide';
      } else if (prev && prev.string === stringIndex && prev._hammerOrigin && prev.fret !== note.fret) {
        technique = note.fret > prev.fret ? 'hammer' : 'pull';
      }
      out.push({
        start,
        duration,
        string: stringIndex,
        fret: note.fret,
        technique,
        bend,
        vibrato: note.vibrato !== 0 || beat.vibrato !== 0,
        barIndex: bar.index,
        _slideOut: note.slideOutType === SLIDE_SHIFT || note.slideOutType === SLIDE_LEGATO,
        _hammerOrigin: note.isHammerPullOrigin,
      });
    }
  }
  // The tuning offset most notes agree on (0 = standard, -1 = half step down …).
  let tuningShift = 0;
  let best = -1;
  for (const [s, count] of shifts) {
    if (count > best) {
      best = count;
      tuningShift = s;
    }
  }
  return { notes: out, simplified, tuningShift };
}

function clean(notes, offset) {
  return notes.map(({ _slideOut, _hammerOrigin, barIndex, ...n }) => ({ ...n, start: +(n.start - offset).toFixed(4), duration: +n.duration.toFixed(4) })); // eslint-disable-line no-unused-vars
}

export function describeScore(score) {
  return {
    title: score.title || '',
    artist: score.artist || '',
    tempo: Math.round(score.tempo) || 90,
    barCount: score.masterBars.length,
    tracks: score.tracks.map((t, i) => ({ index: i, name: t.name || `Track ${i + 1}`, noteCount: t.staves[0].bars.reduce((a, b) => a + b.voices[0].beats.filter((x) => !x.isRest).length, 0) })),
  };
}

/**
 * @param score        alphaTab Score
 * @param opts.trackIndex
 * @param opts.barsPerPhrase  0 = the whole track as one lick
 * @param opts.base    fields copied onto every lick: { idPrefix, title (string), genre, level, key, scale, source, credit, about }
 */
export function scoreToLicks(score, { trackIndex = 0, barsPerPhrase = 0, base = {} } = {}) {
  const info = describeScore(score);
  const { notes, simplified, tuningShift } = trackNotes(score, trackIndex);
  if (notes.length === 0) return [];
  const bpm = info.tempo;
  const title = base.title || info.title || 'Imported';

  const make = (group, label, suffix) => {
    const [en, he] = label;
    // Start on the beat just before the first note, so the count-in lands
    // naturally and a long pickup rest isn't waited out.
    const offset = Math.floor(group[0].start);
    const lickNotes = clean(group, offset);
    const barLine = score.masterBars[group[0].barIndex].start / TICKS_PER_BEAT;
    const barPhase = (((barLine - offset) % 4) + 4) % 4;
    return {
      id: `${base.idPrefix ?? 'import'}-${suffix}`,
      title: { en, he },
      genre: base.genre ?? 'rock',
      level: base.level ?? 'intermediate',
      key: base.key ?? '',
      scale: base.scale ?? '',
      bpm,
      source: base.source ?? 'import',
      credit: base.credit,
      about: base.about ?? { en: '', he: '' },
      simplified,
      tuningShift,
      barPhase,
      notes: lickNotes,
    };
  };

  const licks = [];
  if (barsPerPhrase > 0) {
    const groups = new Map();
    for (const n of notes) {
      const g = Math.floor(n.barIndex / barsPerPhrase);
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(n);
    }
    let part = 1;
    for (const [g, group] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
      const from = g * barsPerPhrase + 1;
      const to = Math.min(info.barCount, from + barsPerPhrase - 1);
      licks.push(make(group, [`${title} — ${part} (bars ${from}–${to})`, `${title} — ${part} (תיבות ${from}–${to})`], `p${part}`));
      part += 1;
    }
  }
  // A lone lick (no split) is just the title; with phrases, the complete
  // piece is marked as such.
  licks.push(make(notes, barsPerPhrase > 0 ? [`${title} — full`, `${title} — מלא`] : [title, title], 'full'));
  return licks;
}

/**
 * The whole track as ONE solo, with practice sections every
 * `barsPerSection` bars (only sections that contain notes). Section
 * boundaries are in beats on the solo's own timeline.
 */
export function scoreToSolo(score, { trackIndex = 0, barsPerSection = 2, base = {} } = {}) {
  const info = describeScore(score);
  const { notes, simplified, tuningShift } = trackNotes(score, trackIndex);
  if (notes.length === 0) return null;
  const offset = Math.floor(notes[0].start);
  const barStart = (i) => (i < score.masterBars.length ? score.masterBars[i].start / TICKS_PER_BEAT : notes[notes.length - 1].start + notes[notes.length - 1].duration + 1);
  const sections = [];
  const lastBar = notes[notes.length - 1].barIndex;
  for (let b = notes[0].barIndex - (notes[0].barIndex % barsPerSection); b <= lastBar; b += barsPerSection) {
    const inSection = notes.some((n) => n.barIndex >= b && n.barIndex < b + barsPerSection);
    if (!inSection) continue;
    const from = Math.max(0, barStart(b) - offset);
    const to = barStart(b + barsPerSection) - offset;
    const barFrom = b + 1;
    const barTo = Math.min(info.barCount, b + barsPerSection);
    sections.push({
      fromBeat: +from.toFixed(4),
      toBeat: +to.toFixed(4),
      label: {
        en: barFrom === barTo ? `Bar ${barFrom}` : `Bars ${barFrom}–${barTo}`,
        he: barFrom === barTo ? `תיבה ${barFrom}` : `תיבות ${barFrom}–${barTo}`,
      },
    });
  }
  const title = base.title || info.title || 'Imported solo';
  // Beat 0 is the beat just before the first note, not necessarily a bar
  // line: barPhase says where the bar lines fall (4/4) so the tab draws them
  // in the right place.
  const barPhase = (((barStart(notes[0].barIndex) - offset) % 4) + 4) % 4;
  return {
    kind: 'solo',
    id: `${base.idPrefix ?? 'solo'}-solo`,
    title: { en: title, he: title },
    artist: info.artist,
    genre: base.genre ?? 'rock',
    level: base.level ?? 'advanced',
    key: base.key ?? '',
    scale: base.scale ?? '',
    bpm: info.tempo,
    source: base.source ?? 'import',
    credit: base.credit,
    about: base.about ?? { en: '', he: '' },
    simplified,
    tuningShift,
    sections,
    barPhase,
    notes: clean(notes, offset),
  };
}
