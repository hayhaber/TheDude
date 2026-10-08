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
import { STANDARD_TUNING, BASS_TUNING } from '../notes';
import * as alphaTab from '@coderline/alphatab';
import { identifyChord } from '../chordFromNotes';

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
function trackNotes(score, trackIndex, tuning = STANDARD_TUNING) {
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
      if (stringIndex < 0 || stringIndex >= tuning.length) continue;
      const shift = note.realValue - (tuning[stringIndex].baseMidi + note.fret);
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
        // Left-hand finger written in the file (1 index .. 4 pinky), if any.
        ...(note.leftHandFinger >= 1 && note.leftHandFinger <= 4 ? { finger: note.leftHandFinger } : {}),
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
    tracks: score.tracks.map((t, i) => ({
      index: i,
      name: t.name || `Track ${i + 1}`,
      program: t.playbackInfo?.program ?? null,
      percussion: !!t.staves[0].isPercussion,
      strings: t.staves[0].tuning?.length ?? 0,
      noteCount: t.staves[0].bars.reduce((a, b) => a + b.voices[0].beats.filter((x) => !x.isRest).length, 0),
    })),
  };
}

// The track a guitarist most likely wants from a full-band file: not the
// vocal/piano/bass/drums tracks (they come first in many files — importing
// "Voice" by default plays the vocal melody instead of the solo), preferring
// a lead/solo guitar, then any guitar (GM programs 24-31), then the busiest.
export function defaultTrackIndex(info) {
  const notGuitar = /voice|vocal|vox|piano|key|string|bass|drum|perc|synth|organ|pad|brass|sax|flute/i;
  const candidates = info.tracks.filter((t) => t.noteCount > 0 && !t.percussion);
  const score = (t) =>
    (/lead|solo/i.test(t.name) ? 4 : 0) +
    (/guitar|gtr|git/i.test(t.name) ? 2 : 0) +
    (t.program != null && t.program >= 24 && t.program <= 31 ? 2 : 0) -
    (notGuitar.test(t.name) ? 5 : 0);
  const ranked = [...candidates].sort((a, b) => score(b) - score(a) || b.noteCount - a.noteCount);
  return ranked[0]?.index ?? 0;
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
      gpRef: { track: trackIndex, tickStart: offset * TICKS_PER_BEAT },
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
export function scoreToSolo(score, { trackIndex = 0, barsPerSection = 2, base = {}, bass = false } = {}) {
  const info = describeScore(score);
  const { notes, simplified, tuningShift } = trackNotes(score, trackIndex, bass ? BASS_TUNING : STANDARD_TUNING);
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
    // A 4-string bass part: drawn on the bass neck (notes' strings are bass strings).
    ...(bass ? { neck: 'bass' } : {}),
    id: `${base.idPrefix ?? 'solo'}-solo`,
    title: { en: title, he: title },
    artist: base.artist || info.artist,
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
    // Where this solo sits in the original file, so the reference can be
    // played by alphaTab's own synth straight from the file (see
    // audio/gpReferencePlayer.js). The file itself is attached by the caller.
    gpRef: { track: trackIndex, tickStart: offset * TICKS_PER_BEAT },
    notes: clean(notes, offset),
  };
}

// The trainer follows one note per beat (the top one: the melody), but a
// beat can be a double stop or chord. All of a beat's notes, by tick, for
// the neck and tab to show the full shape.
export function chordNotesByTick(score, trackIndex) {
  const map = new Map();
  const staff = score?.tracks[trackIndex]?.staves[0];
  if (!staff) return map;
  for (const bar of staff.bars) {
    const master = score.masterBars[bar.index];
    for (const beat of bar.voices[0].beats) {
      if (beat.isRest || beat.graceType !== 0) continue;
      const notes = beat.notes.filter((n) => !n.isDead && n.fret >= 0 && n.string >= 1 && n.string <= 6);
      if (notes.length < 2) continue;
      map.set(
        master.start + beat.playbackStart,
        notes.map((n) => ({
          string: n.string - 1,
          fret: n.fret,
          ...(n.leftHandFinger >= 1 && n.leftHandFinger <= 4 ? { finger: n.leftHandFinger } : {}),
        }))
      );
    }
  }
  return map;
}

/** Adds `also` (the beat's other notes) to every note that's part of a chord. */
export function withChordNotes(solo, chords) {
  if (!solo?.gpRef || chords.size === 0) return solo;
  let changed = false;
  const notes = solo.notes.map((n) => {
    const all = chords.get(Math.round(solo.gpRef.tickStart + n.start * TICKS_PER_BEAT));
    const also = all?.filter((x) => !(x.string === n.string && x.fret === n.fret));
    if (!also?.length) return n;
    changed = true;
    return { ...n, also };
  });
  return changed ? { ...solo, notes } : solo;
}

// Older Guitar Pro files (gp3-gp5) have no real piano staff: a piano part
// is typed onto guitar strings, and transcribers write it the way guitar
// music is written — an octave above how it sounds — so it plays (and
// shows) an octave too low. Raise such keyboard tracks an octave, in
// sound and notation. Real piano staves (gp/gpx) are left alone. Mutates
// the score once; call when it's loaded, before it's played or drawn.
export function fixKeysOctave(score) {
  if (!score || score.__keysOctaveFixed) return;
  score.__keysOctaveFixed = true;
  const info = describeScore(score);
  for (const t of score.tracks) {
    const stringed = t.staves[0]?.tuning?.length > 0;
    if (stringed && trackKind(info.tracks[t.index]) === 'keys') {
      for (const staff of t.staves) staff.transpositionPitch -= 12; // realValue = fret + tuning - transpositionPitch
    }
  }
}

// What kind of instrument a track (from describeScore) is.
export function trackKind(tr) {
  const name = tr.name || '';
  if (tr.percussion || /drum|perc/i.test(name)) return 'drums';
  if (/voice|vocal|vox|sing/i.test(name)) return 'vocal';
  if (/bass/i.test(name) || (tr.program >= 32 && tr.program <= 39)) return 'bass';
  if (/piano|key|organ|synth|rhodes|clav/i.test(name) || (tr.program >= 0 && tr.program <= 23 && !/guitar|gtr/i.test(name))) return 'keys';
  if (/string|violin|cello|viola|orch/i.test(name) || (tr.program >= 40 && tr.program <= 55)) return 'strings';
  return 'guitar';
}

// A part that can be played on a 6-string guitar (shown on the neck,
// practiced in the trainer). Anything else is shown as notation only.
export function isGuitarTrack(tr) {
  if (!tr || tr.noteCount === 0 || tr.strings !== 6 || trackKind(tr) !== 'guitar') return false;
  return tr.program == null || (tr.program >= 24 && tr.program <= 31) || /guitar|gtr|git|lead|rhythm|solo/i.test(tr.name);
}

// The file's piano track for the keyboard view: a piano by name or GM
// program (0-7) first, then any keys track; null when there is none.
export function pianoTrackIndex(info) {
  const rank = (t) => {
    if (t.noteCount === 0 || t.percussion) return 0;
    if (/piano/i.test(t.name) || (t.program != null && t.program >= 0 && t.program <= 7 && !/guitar|gtr|bass|voice|vocal/i.test(t.name))) return 2;
    return trackKind(t) === 'keys' ? 1 : 0;
  };
  let best = null;
  for (const t of info.tracks) if (rank(t) > 0 && (best == null || rank(t) > rank(best))) best = t;
  return best ? best.index : null;
}

/**
 * Every note of a track for the piano keyboard, in ticks: [{ start, end,
 * midi, hand }], sorted by start. A two-staff (grand staff) part marks the
 * lower staff as the left hand (one-staff piano: below middle C). Drums give
 * nothing.
 */
export function pianoPartOf(score, trackIndex) {
  const track = score?.tracks[trackIndex];
  if (!track || track.staves[0]?.isPercussion) return [];
  const twoHands = track.staves.length >= 2;
  // Older files (GP3-5) write a piano on ONE staff: split the hands at
  // middle C. Any other instrument is one color.
  const keys = !twoHands && trackKind(describeScore(score).tracks[trackIndex]) === 'keys';
  const out = [];
  track.staves.forEach((staff, si) => {
    for (const bar of staff.bars) {
      const master = score.masterBars[bar.index];
      for (const voice of bar.voices) {
        for (const beat of voice.beats) {
          if (beat.isRest || beat.graceType !== 0) continue;
          const start = master.start + beat.playbackStart;
          const end = start + beat.playbackDuration;
          for (const n of beat.notes) {
            const midi = n.realValue;
            if (n.isDead || !(midi >= 21 && midi <= 108)) continue;
            out.push({ start, end, midi, hand: (twoHands ? si > 0 : keys && midi < 60) ? 'left' : 'right' });
          }
        }
      }
    }
  });
  return out.sort((a, b) => a.start - b.start);
}

/**
 * A file with no guitar part to practice (e.g. piano only), kept as a
 * "solo" so it can be opened, played and shown on the piano.
 */
export function fileOnlySolo(score, trackIndex = 0, base = {}) {
  const info = describeScore(score);
  const last = score.masterBars[score.masterBars.length - 1];
  const totalTicks = last ? last.start + last.calculateDuration() : 0;
  const title = base.title || info.title || 'Imported';
  return {
    kind: 'solo',
    id: `${base.idPrefix ?? 'solo'}-solo`,
    title: { en: title, he: title },
    artist: base.artist || info.artist,
    genre: base.genre ?? 'rock',
    level: base.level ?? 'advanced',
    key: '',
    scale: '',
    bpm: info.tempo,
    source: base.source ?? 'import',
    credit: base.credit,
    about: base.about ?? { en: '', he: '' },
    simplified: false,
    tuningShift: 0,
    sections: [],
    barPhase: 0,
    gpRef: { track: trackIndex, tickStart: 0 },
    notes: [],
    lengthBeats: Math.ceil(totalTicks / TICKS_PER_BEAT),
    practiceOff: true,
  };
}

/**
 * Writes chord names above the score for a track: wherever 3+ different
 * notes sound together (all staves/voices — both piano hands), the chord
 * they make, shown each time it changes. A track that already carries
 * chord names from the file is left as the file has it. Drums: nothing.
 * Mutates the score (display only — the sound doesn't use chords).
 * Returns the names added, in time order: [{ tick, name }] (empty when the
 * file has its own).
 */
export function labelChords(score, trackIndex) {
  const track = score?.tracks[trackIndex];
  if (!track || track.staves[0]?.isPercussion) return [];
  const byTick = new Map();
  for (const [si, staff] of track.staves.entries()) {
    for (const bar of staff.bars) {
      const master = score.masterBars[bar.index];
      for (const [vi, voice] of bar.voices.entries()) {
        for (const beat of voice.beats) {
          if (beat.chordId) return []; // the file has its own chord names
          if (beat.isRest || beat.graceType !== 0) continue;
          const tick = master.start + beat.playbackStart;
          let e = byTick.get(tick);
          if (!e) byTick.set(tick, (e = { midis: [], anchor: null, rank: Infinity }));
          for (const n of beat.notes) if (!n.isDead && n.realValue > 0) e.midis.push(n.realValue);
          // Name goes on the top staff's main voice where there is one.
          const rank = si * 10 + vi;
          if (rank < e.rank) {
            e.rank = rank;
            e.anchor = beat;
          }
        }
      }
    }
  }
  let previous = null;
  const added = [];
  for (const tick of [...byTick.keys()].sort((a, b) => a - b)) {
    const { midis, anchor } = byTick.get(tick);
    if (new Set(midis.map((m) => m % 12)).size < 3) continue;
    const name = identifyChord(midis);
    if (!name || name === previous) continue;
    previous = name;
    const id = `dudestar-${name}`;
    const staff = anchor.voice.bar.staff;
    if (!staff.chords?.has(id)) {
      const chord = new alphaTab.model.Chord();
      chord.name = name;
      chord.showDiagram = false;
      chord.showFingering = false;
      staff.addChord(id, chord);
    }
    anchor.chordId = id;
    added.push({ tick, name });
  }
  return added;
}

// A 4-string bass part: shown on the bass neck (not practiced).
export function isBassTrack(tr) {
  return !!tr && tr.noteCount > 0 && tr.strings === 4 && trackKind(tr) === 'bass';
}

// The backing band that plays along by default: drums, bass and keys (the
// rhythm section) — never vocals. Everything else is the player's choice.
export function isRhythmSection(t) {
  if (!t || t.noteCount === 0 || /voice|vocal|vox/i.test(t.name)) return false;
  if (t.percussion || /drum|perc/i.test(t.name)) return true;
  if (/bass/i.test(t.name) || (t.program != null && t.program >= 32 && t.program <= 39)) return true;
  if (/piano|keys?\b|keyboard|organ|synth|rhodes|clav/i.test(t.name)) return true;
  if (/guitar|gtr|git/i.test(t.name)) return false;
  return t.program != null && ((t.program >= 0 && t.program <= 7) || (t.program >= 16 && t.program <= 23));
}

/** Track indexes that sound by default: the practiced track + the rhythm section. */
export function defaultMix(tracks, practiceTrack) {
  return tracks.filter((t) => t.index === practiceTrack || isRhythmSection(t)).map((t) => t.index);
}
