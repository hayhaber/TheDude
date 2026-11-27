// A chord tapped in a chart (the Band's Performer, v1.0.281): the symbol as
// written ("F#m7", "Bb/D", "C(add9)", "E7(#9)") -> the Chord Library's
// {rootPc, typeKey, bassPc}, and the shape to show for each instrument.
// Pure — no React.
import { NATURAL_PITCH_CLASS, chordTones, libraryVoicings, toPosition, typeByKey } from '../chordLibrary';
import { inversionCount, pianoVoicing } from '../pianoChordLibrary';

const mod = (n, m) => ((n % m) + m) % m;

// suffix as written -> library type key (case matters: "M7" = maj7, "m7" = minor 7)
const SUFFIX = {
  '': 'major', M: 'major', maj: 'major', Maj: 'major', MAJ: 'major',
  m: 'minor', mi: 'minor', min: 'minor', Min: 'minor', '-': 'minor',
  5: 'power',
  sus2: 'sus2', sus4: 'sus4', sus: 'sus4',
  dim: 'dim', '°': 'dim', o: 'dim',
  aug: 'aug', '+': 'aug', '#5': 'aug',
  add9: 'add9', add2: 'add9', 2: 'add9',
  madd9: 'madd9', madd2: 'madd9', 'm2': 'madd9',
  6: 'six', m6: 'm6', '-6': 'm6',
  69: 'six9', '6/9': 'six9', 'm69': 'six9',
  7: 'dom7', dom7: 'dom7',
  maj7: 'maj7', Maj7: 'maj7', MAJ7: 'maj7', M7: 'maj7', ma7: 'maj7', j7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7',
  m7: 'm7', mi7: 'm7', min7: 'm7', '-7': 'm7',
  mmaj7: 'mMaj7', mMaj7: 'mMaj7', mM7: 'mMaj7', 'm/maj7': 'mMaj7', '-maj7': 'mMaj7', 'mΔ7': 'mMaj7',
  m7b5: 'm7b5', 'm7-5': 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5', '-7b5': 'm7b5',
  dim7: 'dim7', '°7': 'dim7', o7: 'dim7',
  '7sus4': 'sus7', '7sus': 'sus7', sus7: 'sus7',
  '7#5': 'aug7', '7+5': 'aug7', '7+': 'aug7', aug7: 'aug7', '+7': 'aug7',
  '7b5': 'dom7b5', '7-5': 'dom7b5',
  9: 'dom9', maj9: 'maj9', M9: 'maj9', 'Δ9': 'maj9', m9: 'm9', '-9': 'm9',
  '7b9': 'dom7b9', '7-9': 'dom7b9', '7#9': 'dom7s9', '7+9': 'dom7s9',
  11: 'dom11', m11: 'm11', '-11': 'm11',
  13: 'dom13',
};

/** "F#m7/A" -> { rootPc: 6, typeKey: 'm7', bassPc: 9, text } | null. */
export function parseChartChord(token) {
  let s = String(token ?? '')
    .trim()
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b')
    .replace(/^[|[(]+|[|\],.]+$/g, '');
  if (s.startsWith('(') && s.endsWith(')')) s = s.slice(1, -1);
  const m = /^([A-G])([#b]?)(.*)$/.exec(s);
  if (!m) return null;
  const rootPc = mod(NATURAL_PITCH_CLASS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), 12);
  let rest = m[3];
  let bassPc = null;
  // "6/9" is a chord, not a slash bass
  const slash = /^(.*?)\/([A-G])([#b]?)$/.exec(rest);
  if (slash && slash[1] !== '6' && slash[1] !== 'm6') {
    rest = slash[1];
    bassPc = mod(NATURAL_PITCH_CLASS[slash[2]] + (slash[3] === '#' ? 1 : slash[3] === 'b' ? -1 : 0), 12);
  }
  let suf = rest.replace(/[()]/g, '');
  let typeKey = SUFFIX[suf] ?? SUFFIX[suf.toLowerCase()];
  // an unknown colour ("add11", "7alt"): the longest known start of it
  while (!typeKey && suf.length) {
    suf = suf.slice(0, -1);
    typeKey = SUFFIX[suf];
  }
  typeKey = typeKey ?? 'major';
  if (bassPc === rootPc) bassPc = null;
  return { rootPc, typeKey, bassPc, text: s };
}

/** The chord's tones, named as the Chord Library names them (root first). */
export const chordNotes = (c) => chordTones(c.rootPc, c.typeKey).map((t) => t.name);

// ---- guitar --------------------------------------------------------------------
export const GUITAR_TUNING = [40, 45, 50, 55, 59, 64];

/** The guitar shapes (open first, up the neck) and the easiest one's index. */
export function guitarShapes(c) {
  let list = libraryVoicings(c.rootPc, c.typeKey, { tuning: GUITAR_TUNING, bassPc: c.bassPc }, 8);
  // a slash bass the guitar can't reach in a shape: the chord itself
  if (!list.length && c.bassPc != null) list = libraryVoicings(c.rootPc, c.typeKey, { tuning: GUITAR_TUNING }, 8);
  const shapes = list.map((v) => {
    const pos = toPosition(c.rootPc, c.typeKey, v.frets, GUITAR_TUNING, 'note', c.bassPc);
    return {
      frets: v.frets,
      fingers: v.fing.fingers,
      barre: v.fing.barre,
      names: pos.strings.map((x) => x.label ?? ''),
      roles: pos.strings.map((x) => x.role),
      position: pos.baseFret,
      midis: v.frets.map((f, i) => (f == null ? null : GUITAR_TUNING[i] + f)).filter((x) => x != null),
    };
  });
  return { shapes, start: Math.max(0, list.findIndex((v) => v.easiest)) };
}

// ---- bass ----------------------------------------------------------------------
export const BASS_TUNING = [28, 33, 38, 43];

/** The bass player's shape: root, 5th, octave and the 3rd above it — the
    R-5-8 box every bass method starts from — from the root on E, and on A. */
export function bassShapes(c) {
  const tones = chordTones(c.rootPc, c.typeKey);
  const semis = (role, dflt) => {
    const t = typeByKey(c.typeKey).tones.find((x) => x.role === role);
    return t ? t.semitones : dflt;
  };
  const fifth = semis('fifth', 7);
  const third = typeByKey(c.typeKey).power ? null : semis('third', 4);
  const bassPc = c.bassPc ?? c.rootPc;
  const out = [];
  for (const s of [0, 1]) {
    // root on string s (E or A), between frets 1 and 12 (open only for E / A)
    let r = mod(bassPc - BASS_TUNING[s], 12);
    const frets = [null, null, null, null];
    frets[s] = r;
    if (c.bassPc == null) {
      frets[s + 1] = r + fifth - 5; // the 5th on the next string
      frets[s + 2] = r + 2; // the octave two strings up
      if (s === 0 && third != null) frets[3] = r + 2 + third - 5; // the 3rd above the octave
    } else {
      frets[s + 1] = r + 2; // a slash bass: its octave only
    }
    const used = frets.filter((f) => f != null);
    if (Math.min(...used) < 0) for (let i = 0; i < 4; i++) if (frets[i] != null) frets[i] += 12;
    const lo = Math.min(...frets.filter((f) => f != null && f > 0));
    const pos = toPosition(c.rootPc, c.typeKey, frets, BASS_TUNING, 'note', c.bassPc);
    out.push({
      frets,
      // one finger per fret, the bass way (1-2-4 across three frets)
      fingers: frets.map((f) => (f == null || f === 0 ? null : [1, 2, 4, 4][Math.min(3, f - lo)])),
      barre: null,
      names: pos.strings.map((x) => x.label ?? ''),
      roles: pos.strings.map((x) => x.role),
      position: Math.max(...used) <= 4 ? 0 : lo,
      midis: frets.map((f, i) => (f == null ? null : BASS_TUNING[i] + f)).filter((x) => x != null),
    });
  }
  void tones;
  return { shapes: out, start: out[0].position <= out[1].position ? 0 : 1 };
}

// ---- piano ---------------------------------------------------------------------
/** Root position and the inversions, close voicing, around middle C. */
export function pianoShapes(c) {
  const n = Math.max(1, inversionCount(c.typeKey, 'close'));
  const shapes = [];
  for (let i = 0; i < n; i++) {
    const keys = pianoVoicing(c.rootPc, c.typeKey, { voicing: 'close', inversion: i, bassPc: c.bassPc });
    if (keys.length) shapes.push({ keys, midis: keys.map((k) => k.midi) });
    if (c.bassPc != null) break; // a slash chord: one voicing
  }
  return { shapes, start: 0 };
}
