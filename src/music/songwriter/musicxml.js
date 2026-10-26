// The song as a lead sheet in MusicXML 3.1 (melody + lyrics + chord
// symbols): opens in GuitarPro (our own Import), MuseScore, Sibelius,
// Finale, Dorico… and is what the score view renders with alphaTab.

import { parseLine, syllables } from './lyrics';
import { beatsPerBar, beatUnit, chordParts, chordTimes, lineBeats, noteSyllables, sortNotes, usesFlats } from './song';

const DIV = 8; // divisions per quarter note: a 32nd = 1
const STEPS_SHARP = [['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0], ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0]];
const STEPS_FLAT = [['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0], ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0]];
const MAJOR_FIFTHS = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5];
// Durations (divisions) and their note type / dot, longest first.
const VALUES = [
  [32, 'whole', 0], [24, 'half', 1], [16, 'half', 0], [12, 'quarter', 1], [8, 'quarter', 0],
  [6, 'eighth', 1], [4, 'eighth', 0], [3, '16th', 1], [2, '16th', 0], [1, '32nd', 0],
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pieces(div) {
  const out = [];
  let left = Math.round(div);
  while (left > 0) {
    const v = VALUES.find(([d]) => d <= left);
    out.push(v);
    left -= v[0];
  }
  return out;
}

function pitchXml(midi, flats) {
  const [step, alter] = (flats ? STEPS_FLAT : STEPS_SHARP)[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${octave}</octave></pitch>`;
}

const KIND = [
  [/^$/, 'major'], [/^(m|min|-)$/, 'minor'], [/^7$/, 'dominant'], [/^(maj7|M7)$/, 'major-seventh'],
  [/^(m7|min7|-7)$/, 'minor-seventh'], [/^(dim|°)$/, 'diminished'], [/^(dim7|°7)$/, 'diminished-seventh'],
  [/^(m7b5|ø7?)$/, 'half-diminished'], [/^(aug|\+)$/, 'augmented'], [/^(sus4|sus)$/, 'suspended-fourth'],
  [/^sus2$/, 'suspended-second'], [/^6$/, 'major-sixth'], [/^m6$/, 'minor-sixth'], [/^9$/, 'dominant-ninth'],
  [/^maj9$/, 'major-ninth'], [/^m9$/, 'minor-ninth'], [/^5$/, 'power'],
];

function harmonyXml(symbol, flats) {
  const p = chordParts(symbol);
  if (!p || p.root == null) return '';
  const [step, alter] = (flats ? STEPS_FLAT : STEPS_SHARP)[p.root];
  const rest = p.rest.trim();
  const kind = (KIND.find(([re]) => re.test(rest)) ?? [null, 'major'])[1];
  let bass = '';
  if (p.bass != null) {
    const [bs, ba] = (flats ? STEPS_FLAT : STEPS_SHARP)[p.bass];
    bass = `<bass><bass-step>${bs}</bass-step>${ba ? `<bass-alter>${ba}</bass-alter>` : ''}</bass>`;
  }
  return `<harmony><root><root-step>${step}</root-step>${alter ? `<root-alter>${alter}</root-alter>` : ''}</root><kind text="${esc(rest)}">${kind}</kind>${bass}</harmony>`;
}

/**
 * Song -> MusicXML string. Lines follow each other; a line's pickup notes
 * sound before its downbeat (inside the line before).
 */
export function songToMusicXML(song, { title, labels = {} } = {}) {
  const bpb = beatsPerBar(song.time);
  const unit = beatUnit(song.time);
  const divPerBeat = (DIV * 4) / unit;
  const flats = usesFlats(song.key);

  // Everything on one beat line.
  const notes = [];
  const chords = [];
  const marks = [];
  let beat = 0;
  for (const sec of song.sections) {
    let firstOfSection = true;
    for (const l of sec.lines) {
      const ns = sortNotes(l.melody?.notes ?? []);
      if (!parseLine(l.raw).text.trim() && !ns.length) continue;
      const pickup = Math.min(0, ...ns.map((n) => n.s));
      if (beat === 0 && pickup < 0) beat = Math.ceil(-pickup / bpb) * bpb;
      if (firstOfSection) marks.push({ beat, kind: sec.kind });
      firstOfSection = false;
      const { text } = parseLine(l.raw);
      const syl = syllables(text, l.syl);
      const of = noteSyllables(ns, syl.length);
      ns.forEach((n, i) => {
        const si = of[i];
        let lyric = null;
        const isNew = si >= 0 && (i === 0 || !n.c || of[i - 1] !== si);
        if (isNew) {
          const s = syl[si];
          const syllabic = s.first && s.last ? 'single' : s.first ? 'begin' : s.last ? 'end' : 'middle';
          lyric = { text: s.text, syllabic };
        }
        notes.push({ midi: n.p, start: beat + n.s, end: beat + n.s + n.d, lyric });
      });
      for (const c of chordTimes(l, song.time)) chords.push({ beat: beat + c.beat, symbol: c.symbol });
      beat += lineBeats(l, song.time);
    }
  }
  const totalBars = Math.max(1, Math.ceil(beat / bpb - 1e-9));
  const ms = notes.map((n) => n.midi).sort((a, b) => a - b);
  const low = ms.length && ms[Math.floor(ms.length / 2)] < 60;

  // Cut points: bar lines + chord changes; notes are split there with ties.
  const toDiv = (b) => Math.round(b * divPerBeat);
  const barDiv = bpb * divPerBeat;
  const measures = [];
  for (let m = 0; m < totalBars; m += 1) {
    const from = m * barDiv;
    const to = from + barDiv;
    const cuts = new Set([from, to]);
    chords.forEach((c) => {
      const d = toDiv(c.beat);
      if (d > from && d < to) cuts.add(d);
    });
    const inBar = notes
      .map((n) => ({ ...n, a: toDiv(n.start), b: toDiv(n.end) }))
      .filter((n) => n.b > from && n.a < to);
    inBar.forEach((n) => {
      if (n.a > from) cuts.add(n.a);
      if (n.b < to) cuts.add(n.b);
    });
    const points = [...cuts].sort((a, b) => a - b);
    let xml = '';
    if (m === 0) {
      const fifths = song.key ? MAJOR_FIFTHS[(song.key.pc + (song.key.minor ? 3 : 0)) % 12] : 0;
      xml += `<attributes><divisions>${DIV}</divisions><key><fifths>${fifths}</fifths>${song.key ? `<mode>${song.key.minor ? 'minor' : 'major'}</mode>` : ''}</key><time><beats>${bpb}</beats><beat-type>${unit}</beat-type></time><clef><sign>G</sign><line>2</line>${low ? '<clef-octave-change>-1</clef-octave-change>' : ''}</clef></attributes>`;
      xml += `<direction placement="above"><direction-type><metronome><beat-unit>${unit === 8 ? 'eighth' : 'quarter'}</beat-unit><per-minute>${song.bpm}</per-minute></metronome></direction-type><sound tempo="${unit === 8 ? song.bpm / 2 : song.bpm}"/></direction>`;
    }
    for (const mk of marks) {
      if (toDiv(mk.beat) >= from && toDiv(mk.beat) < to) {
        xml += `<direction placement="above"><direction-type><rehearsal>${esc(labels[mk.kind] ?? mk.kind)}</rehearsal></direction-type></direction>`;
      }
    }
    for (let k = 0; k + 1 < points.length; k += 1) {
      const a = points[k];
      const b = points[k + 1];
      const chord = chords.find((c) => toDiv(c.beat) === a);
      if (chord) xml += harmonyXml(chord.symbol, flats);
      const n = inBar.find((x) => x.a <= a && x.b >= b);
      const parts = pieces(b - a);
      parts.forEach(([d, type, dot], pi) => {
        if (!n) {
          xml += `<note><rest/><duration>${d}</duration><type>${type}</type>${dot ? '<dot/>' : ''}</note>`;
          return;
        }
        const startsHere = n.a === a && pi === 0;
        const tieStart = !(n.b === b && pi === parts.length - 1);
        const tieStop = !startsHere;
        let ties = '';
        let tied = '';
        if (tieStop) {
          ties += '<tie type="stop"/>';
          tied += '<tied type="stop"/>';
        }
        if (tieStart) {
          ties += '<tie type="start"/>';
          tied += '<tied type="start"/>';
        }
        const lyric = startsHere && n.lyric ? `<lyric number="1"><syllabic>${n.lyric.syllabic}</syllabic><text>${esc(n.lyric.text)}</text></lyric>` : '';
        xml += `<note>${pitchXml(n.midi, flats)}<duration>${d}</duration>${ties}<voice>1</voice><type>${type}</type>${dot ? '<dot/>' : ''}${tied ? `<notations>${tied}</notations>` : ''}${lyric}</note>`;
      });
    }
    measures.push(`<measure number="${m + 1}">${xml}</measure>`);
  }

  const name = esc(title ?? song.title ?? 'Song');
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1"><work><work-title>${name}</work-title></work><identification><encoding><software>DudeStar</software></encoding></identification><part-list><score-part id="P1"><part-name>Melody</part-name><score-instrument id="P1-I1"><instrument-name>Voice</instrument-name></score-instrument><midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>1</midi-program></midi-instrument></score-part></part-list><part id="P1">${measures.join('')}</part></score-partwise>`;
}
