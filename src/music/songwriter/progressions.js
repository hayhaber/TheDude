// Chord progressions for a song's words, from the writer's VISION of the
// song (Songwriter -> "Suggest chords"): a short brief — the feeling, the
// style, how simple or colourful — picks proven progressions per section,
// the way songwriting courses teach them (Berklee's "Songwriting: Writing
// the Music", Hooktheory's common-progression data, Pattison's section
// contrast): the chorus lands on the tonic, the verse sets it up (often from
// vi / iv or on the same chords lower), the pre-chorus climbs (IV–V), the
// bridge goes somewhere new (IV, vi, ♭VI) and turns back to V. Pure.
import { KEY_NAMES_FLAT, KEY_NAMES_SHARP, beatsPerBar, lineBeats, noteSyllables, sortNotes, usesFlats } from './song';
import { joinLine, parseLine, syllables, words } from './lyrics';

export const MOODS = ['happy', 'emotional', 'sad', 'tense', 'dreamy', 'nostalgic'];
export const STYLES = ['pop', 'rock', 'ballad', 'folk', 'country', 'blues', 'reggae', 'jazz'];
export const COLORS = ['simple', 'flowing', 'rich'];

// The band style that goes with each song style (bandPlayer BAND_STYLES).
export const STYLE_BAND = { pop: 'pop', rock: 'rock', ballad: 'ballad', folk: 'pop', country: 'country', blues: 'blues', reggae: 'reggae', jazz: 'jazz' };
// A natural tempo for the style + feeling (used only when the writer
// hasn't set one).
const STYLE_BPM = { pop: 100, rock: 112, ballad: 72, folk: 96, country: 104, blues: 88, reggae: 80, jazz: 120 };

// mode: major | minor. roles: verse / prechorus / chorus / bridge.
// level: 1 simple (triads, 4 chords) · 2 flowing (more chords / movement) ·
// 3 rich (7ths, add9). Every progression is a standard one, named.
const LIB = [
  // ---- major ----
  { id: 'axis', mode: 'major', roles: ['verse', 'chorus'], moods: ['happy', 'emotional'], styles: ['pop', 'rock', 'ballad', 'folk', 'country', 'reggae'], level: 1, chords: ['I', 'V', 'vi', 'IV'] },
  { id: 'axisMinor', mode: 'major', roles: ['verse', 'chorus'], moods: ['emotional', 'sad', 'dreamy'], styles: ['pop', 'ballad', 'rock'], level: 1, chords: ['vi', 'IV', 'I', 'V'] },
  { id: 'fifties', mode: 'major', roles: ['verse', 'chorus'], moods: ['nostalgic', 'happy'], styles: ['pop', 'ballad', 'folk'], level: 1, chords: ['I', 'vi', 'IV', 'V'] },
  { id: 'liftPop', mode: 'major', roles: ['verse', 'chorus'], moods: ['happy', 'emotional'], styles: ['pop', 'folk', 'country'], level: 1, chords: ['I', 'IV', 'vi', 'V'] },
  { id: 'folkI', mode: 'major', roles: ['verse'], moods: ['happy', 'nostalgic'], styles: ['folk', 'country', 'pop'], level: 1, chords: ['I', 'IV', 'I', 'V'] },
  { id: 'threeChord', mode: 'major', roles: ['verse', 'chorus'], moods: ['happy'], styles: ['country', 'folk', 'rock'], level: 1, chords: ['I', 'IV', 'V', 'I'] },
  { id: 'mixo', mode: 'major', roles: ['verse', 'chorus'], moods: ['tense', 'happy'], styles: ['rock'], level: 1, chords: ['I', 'bVII', 'IV', 'I'] },
  { id: 'rockVIV', mode: 'major', roles: ['chorus'], moods: ['happy', 'tense'], styles: ['rock', 'pop'], level: 1, chords: ['I', 'V', 'IV', 'I'] },
  { id: 'chorusLift', mode: 'major', roles: ['chorus'], moods: ['emotional', 'happy'], styles: ['pop', 'ballad', 'rock'], level: 1, chords: ['IV', 'I', 'V', 'vi'] },
  { id: 'reggaeI', mode: 'major', roles: ['verse', 'chorus'], moods: ['happy'], styles: ['reggae', 'pop'], level: 1, chords: ['I', 'IV', 'V', 'IV'] },
  { id: 'climb', mode: 'major', roles: ['prechorus'], moods: ['happy', 'emotional', 'tense'], styles: ['pop', 'rock', 'ballad', 'folk', 'country'], level: 1, chords: ['IV', 'V', 'IV', 'V'] },
  { id: 'climbVi', mode: 'major', roles: ['prechorus'], moods: ['emotional', 'sad', 'nostalgic'], styles: ['pop', 'ballad'], level: 1, chords: ['vi', 'IV', 'V', 'V'] },
  { id: 'iiiClimb', mode: 'major', roles: ['verse', 'prechorus'], moods: ['nostalgic', 'emotional'], styles: ['pop', 'ballad', 'folk'], level: 2, chords: ['I', 'iii', 'IV', 'V'] },
  { id: 'royal', mode: 'major', roles: ['verse', 'prechorus', 'chorus'], moods: ['emotional', 'nostalgic', 'dreamy'], styles: ['pop', 'ballad'], level: 2, chords: ['IV', 'V', 'iii', 'vi'] },
  { id: 'canon', mode: 'major', roles: ['verse', 'chorus'], moods: ['nostalgic', 'emotional', 'happy'], styles: ['ballad', 'pop', 'folk'], level: 2, chords: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'] },
  { id: 'circle', mode: 'major', roles: ['verse'], moods: ['nostalgic', 'happy'], styles: ['pop', 'jazz', 'ballad'], level: 2, chords: ['I', 'vi', 'ii', 'V'] },
  { id: 'twoFive', mode: 'major', roles: ['verse', 'chorus'], moods: ['dreamy', 'nostalgic', 'happy'], styles: ['jazz', 'ballad'], level: 3, chords: ['ii7', 'V7', 'Imaj7', 'vi7'] },
  { id: 'dreamMaj7', mode: 'major', roles: ['verse'], moods: ['dreamy', 'emotional'], styles: ['ballad', 'pop', 'jazz'], level: 3, chords: ['Imaj7', 'IVmaj7', 'Imaj7', 'IVmaj7'] },
  { id: 'popColor', mode: 'major', roles: ['verse', 'chorus'], moods: ['emotional', 'dreamy'], styles: ['pop', 'ballad'], level: 3, chords: ['Iadd9', 'V', 'vi7', 'IVmaj7'] },
  { id: 'bridgeLift', mode: 'major', roles: ['bridge'], moods: ['emotional', 'dreamy', 'nostalgic'], styles: ['pop', 'ballad', 'folk'], level: 2, chords: ['IV', 'V', 'iii', 'vi'] },
  { id: 'bridgeVi', mode: 'major', roles: ['bridge'], moods: ['emotional', 'sad', 'happy', 'tense'], styles: ['pop', 'rock', 'ballad', 'folk', 'country', 'reggae'], level: 1, chords: ['vi', 'V', 'IV', 'V'] },
  { id: 'bridgeIi', mode: 'major', roles: ['bridge'], moods: ['happy', 'nostalgic'], styles: ['pop', 'folk', 'country', 'jazz'], level: 1, chords: ['ii', 'IV', 'V', 'V'] },
  { id: 'bridgeEpic', mode: 'major', roles: ['bridge'], moods: ['happy', 'tense', 'emotional'], styles: ['rock', 'pop'], level: 2, chords: ['bVI', 'bVII', 'I', 'I'] },
  { id: 'blues12', mode: 'major', roles: ['verse', 'chorus'], moods: ['happy', 'tense', 'nostalgic'], styles: ['blues', 'rock'], level: 1, form: true, perLine: 4, chords: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'] },
  { id: 'quickFour', mode: 'major', roles: ['bridge'], moods: ['happy', 'tense'], styles: ['blues', 'rock', 'country'], level: 1, chords: ['IV7', 'IV7', 'I7', 'V7'] },
  // ---- minor ----
  { id: 'epicMinor', mode: 'minor', roles: ['verse', 'chorus'], moods: ['sad', 'emotional', 'tense'], styles: ['pop', 'rock', 'ballad'], level: 1, chords: ['i', 'VI', 'III', 'VII'] },
  { id: 'andalusian', mode: 'minor', roles: ['verse', 'chorus'], moods: ['tense', 'sad'], styles: ['rock', 'folk', 'pop'], level: 1, chords: ['i', 'VII', 'VI', 'V'] },
  { id: 'folkMinor', mode: 'minor', roles: ['verse'], moods: ['sad', 'nostalgic'], styles: ['folk', 'ballad', 'country'], level: 1, chords: ['i', 'iv', 'v', 'i'] },
  { id: 'minorPull', mode: 'minor', roles: ['verse', 'chorus'], moods: ['tense', 'sad', 'emotional'], styles: ['pop', 'rock', 'ballad'], level: 1, chords: ['i', 'VI', 'iv', 'V'] },
  { id: 'minorFall', mode: 'minor', roles: ['verse', 'chorus'], moods: ['sad', 'emotional'], styles: ['pop', 'ballad', 'folk'], level: 1, chords: ['i', 'iv', 'VI', 'V'] },
  { id: 'minorRock', mode: 'minor', roles: ['verse', 'chorus'], moods: ['tense'], styles: ['rock', 'reggae'], level: 1, chords: ['i', 'VII', 'VI', 'VII'] },
  { id: 'minorAnthem', mode: 'minor', roles: ['chorus'], moods: ['emotional', 'tense', 'sad'], styles: ['pop', 'rock', 'ballad'], level: 1, chords: ['VI', 'VII', 'i', 'i'] },
  { id: 'minorSkank', mode: 'minor', roles: ['verse', 'chorus'], moods: ['tense', 'sad'], styles: ['reggae'], level: 1, chords: ['i', 'iv', 'i', 'VII'] },
  { id: 'minorClimb', mode: 'minor', roles: ['prechorus', 'bridge'], moods: ['emotional', 'tense', 'sad'], styles: ['pop', 'rock', 'ballad', 'folk'], level: 1, chords: ['iv', 'v', 'VI', 'VII'] },
  { id: 'minorPre', mode: 'minor', roles: ['prechorus'], moods: ['tense', 'emotional'], styles: ['pop', 'rock'], level: 1, chords: ['VI', 'VII', 'VI', 'VII'] },
  { id: 'minorBridge', mode: 'minor', roles: ['bridge'], moods: ['sad', 'emotional', 'nostalgic'], styles: ['pop', 'ballad', 'folk', 'rock'], level: 1, chords: ['III', 'VII', 'iv', 'V'] },
  { id: 'minorCanon', mode: 'minor', roles: ['verse'], moods: ['sad', 'nostalgic', 'emotional'], styles: ['ballad', 'pop'], level: 2, chords: ['i', 'v', 'VI', 'III', 'iv', 'i', 'iv', 'V'] },
  { id: 'minorDream', mode: 'minor', roles: ['verse', 'chorus'], moods: ['dreamy', 'sad'], styles: ['ballad', 'jazz', 'pop'], level: 3, chords: ['im7', 'VImaj7', 'IIImaj7', 'VII'] },
  { id: 'minorSway', mode: 'minor', roles: ['verse'], moods: ['dreamy', 'sad'], styles: ['jazz', 'ballad'], level: 3, chords: ['im7', 'iv7', 'im7', 'iv7'] },
  { id: 'minorTwoFive', mode: 'minor', roles: ['verse', 'chorus', 'bridge'], moods: ['sad', 'tense'], styles: ['jazz'], level: 3, chords: ['iiø7', 'V7', 'im7', 'im7'] },
  { id: 'minorBlues', mode: 'minor', roles: ['verse', 'chorus'], moods: ['sad', 'tense'], styles: ['blues'], level: 1, form: true, perLine: 4, chords: ['i', 'i', 'i', 'i', 'iv', 'iv', 'i', 'i', 'VI7', 'V7', 'i', 'V7'] },
];

// Which list a section kind draws from.
const ROLE_OF = { verse: 'verse', prechorus: 'prechorus', chorus: 'chorus', hook: 'chorus', bridge: 'bridge', intro: 'chorus', outro: 'chorus' };
const LEVEL_OF = { simple: 1, flowing: 2, rich: 3 };

// Roman numeral -> semitones above the tonic (major-key numerals on the
// major scale, minor-key numerals on the natural minor scale).
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];
const NUM = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };

/** 'bVII' / 'vi7' / 'Imaj7' / 'iiø7' in a key -> 'G' / 'Am7' / 'Cmaj7' / 'Bm7b5'. */
export function realize(token, key) {
  const m = /^(b|#)?([ivIV]+)(ø|°)?(.*)$/.exec(token);
  if (!m) return token;
  const [, acc, roman, mark, ext] = m;
  const n = NUM[roman.toLowerCase()];
  const steps = key.minor ? MINOR_STEPS : MAJOR_STEPS;
  let semis = steps[n - 1] + (acc === 'b' ? -1 : acc === '#' ? 1 : 0);
  semis = (semis + 12) % 12;
  const names = usesFlats(key) || acc === 'b' ? KEY_NAMES_FLAT : KEY_NAMES_SHARP;
  const root = names[(key.pc + semis) % 12];
  const lower = roman === roman.toLowerCase();
  let q;
  if (mark === 'ø') q = 'm7b5';
  else if (mark === '°') q = 'dim';
  else if (ext === 'maj7' || ext === 'add9' || ext === 'sus4' || ext === 'sus2' || ext === '6') q = (lower ? 'm' : '') + (lower && ext === 'maj7' ? 'maj7' : ext);
  else if (ext === '7' || ext === 'm7') q = lower || ext === 'm7' ? 'm7' : '7';
  else q = lower ? 'm' : '';
  if (q === 'mm7') q = 'm7';
  return root + q;
}

/** Colour for the "rich" brief on a plain progression: add9 / maj7 / m7. */
function enrich(tokens) {
  return tokens.map((t, i) => {
    if (/[0-9ø°]/.test(t)) return t;
    if (t === 'I') return i % 2 ? 'Imaj7' : 'Iadd9';
    if (t === 'IV') return 'IVmaj7';
    if (t === 'vi' || t === 'ii' || t === 'iii' || t === 'i' || t === 'iv') return t + '7';
    if (t === 'VI' || t === 'III') return t + 'maj7';
    return t;
  });
}

/** A suggested key for the brief (guitar-friendly), unless the song has one. */
export function suggestKey({ mood, style }) {
  const minor = mood === 'sad' || mood === 'tense';
  if (minor) {
    if (style === 'rock' || style === 'blues' || mood === 'tense') return { pc: 4, minor: true }; // Em
    if (style === 'ballad' || style === 'jazz') return { pc: 2, minor: true }; // Dm
    return { pc: 9, minor: true }; // Am
  }
  if (style === 'rock' || style === 'blues') return { pc: 4, minor: false }; // E
  if (style === 'folk' || style === 'country') return { pc: 7, minor: false }; // G
  if (style === 'jazz') return { pc: 5, minor: false }; // F
  if (style === 'reggae') return { pc: 9, minor: false }; // A
  if (style === 'ballad') return { pc: 2, minor: false }; // D
  return { pc: 0, minor: false }; // C
}

export function suggestBpm({ style, mood }) {
  const base = STYLE_BPM[style] ?? 96;
  return Math.round(base * (mood === 'sad' || mood === 'dreamy' ? 0.88 : mood === 'tense' ? 1.05 : 1));
}

/** Candidates for a role, best first, for a brief in a key. */
export function candidates(role, brief, key) {
  const mode = key.minor ? 'minor' : 'major';
  const want = LEVEL_OF[brief.color] ?? 1;
  const list = LIB.filter((p) => p.mode === mode && p.roles.includes(role)).map((p) => {
    let score = 0;
    if (p.moods.includes(brief.mood)) score += 3;
    if (p.styles.includes(brief.style)) score += 2.5;
    if (p.form && brief.style === 'blues') score += 3;
    // blues / jazz songs: their own forms first
    if ((brief.style === 'blues' || brief.style === 'jazz') && !p.styles.includes(brief.style)) score -= 2;
    if ((p.id === 'blues12' || p.id === 'minorBlues' || p.id === 'quickFour') && brief.style !== 'blues' && brief.style !== 'rock') score -= 4;
    const d = Math.abs(p.level - want);
    score += d === 0 ? 2 : d === 1 ? 0.5 : -2;
    return { p, score };
  });
  list.sort((a, b) => b.score - a.score || LIB.indexOf(a.p) - LIB.indexOf(b.p));
  return list.map(({ p, score }) => {
    const tokens = brief.color === 'rich' && p.level < 3 ? enrich(p.chords) : p.chords;
    return { id: p.id, score, tokens, form: !!p.form, perLine: p.perLine ?? 2, symbols: tokens.map((t) => realize(t, key)) };
  });
}

/**
 * Three plans for the song: each = one progression per section role found
 * in the song (verse, pre-chorus, chorus, bridge), contrasting with each
 * other (a verse never repeats the chorus's progression). Plan k takes the
 * k-th best chorus.
 */
export function plans(song, brief, key) {
  const roles = [...new Set(song.sections.map((s) => ROLE_OF[s.kind] ?? 'verse'))];
  if (!roles.includes('chorus') && !roles.includes('verse')) roles.push('verse');
  const byRole = Object.fromEntries(['verse', 'prechorus', 'chorus', 'bridge'].map((r) => [r, candidates(r, brief, key)]));
  const out = [];
  for (let k = 0; k < 3; k += 1) {
    const picks = {};
    const used = new Set();
    const main = roles.includes('chorus') ? 'chorus' : 'verse';
    const order = [main, ...['verse', 'chorus', 'prechorus', 'bridge'].filter((r) => r !== main && roles.includes(r))];
    for (const r of order) {
      const list = byRole[r];
      if (!list.length) continue;
      const start = r === main ? k : 0;
      let idx = start % list.length;
      for (let tries = 0; tries < list.length && used.has(list[idx].id); tries += 1) idx = (idx + 1) % list.length;
      picks[r] = idx;
      if (!list[idx].form) used.add(list[idx].id); // a blues form may repeat
    }
    const sig = JSON.stringify(picks);
    if (out.some((p) => JSON.stringify(p.picks) === sig)) continue;
    out.push({ picks });
  }
  return { roles, byRole, plans: out };
}

export function roleOf(kind) {
  return ROLE_OF[kind] ?? 'verse';
}

/**
 * A line with the given chords spread over it: a sung line gets one chord
 * per bar at the word sung on the bar's downbeat (cycling through the
 * progression from `offset`); a line without a melody gets two chords
 * spread by syllables. Returns { raw, used } (used = chords consumed).
 */
export function chordLine(line, symbols, offset, time, perLine = 2) {
  const { text } = parseLine(line.raw);
  const ws = words(text);
  if (!ws.length) return { raw: line.raw, used: 0 };
  const syl = syllables(text, line.syl);
  const notes = sortNotes(line.melody?.notes ?? []);
  const placed = [];
  const at = (wi) => ws[Math.max(0, Math.min(ws.length - 1, wi))].start;
  if (notes.length) {
    const bpb = beatsPerBar(time);
    const bars = Math.round(lineBeats(line, time) / bpb);
    const ofNote = noteSyllables(notes, syl.length);
    for (let b = 0; b < bars; b += 1) {
      const ni = notes.findIndex((n) => n.s >= b * bpb - 0.25 && n.s < (b + 1) * bpb);
      const si = ni >= 0 ? ofNote[ni] : -1;
      const wi = si >= 0 ? syl[si].word : b === 0 ? 0 : -1;
      if (wi < 0) continue;
      placed.push({ at: at(wi), symbol: symbols[(offset + placed.length) % symbols.length] });
    }
  } else {
    const n = Math.max(1, Math.min(perLine, syl.length));
    for (let k = 0; k < n; k += 1) {
      const si = Math.floor((k * syl.length) / n);
      const wi = syl[si]?.word ?? 0;
      placed.push({ at: at(wi), symbol: symbols[(offset + k) % symbols.length] });
    }
  }
  // one chord per word; a chord that repeats the one before just holds
  const used = placed.length;
  const seen = new Set();
  const chords = placed.filter((c, i) => !seen.has(c.at) && seen.add(c.at) && (i === 0 || c.symbol !== placed[i - 1].symbol));
  return { raw: joinLine(text, chords), used };
}

/**
 * The song with a plan's chords written over every section (old chords
 * replaced). choice = {role: candidate} (candidate.symbols / perLine).
 */
export function applyPlan(song, choice, time = song.time) {
  return {
    ...song,
    sections: song.sections.map((sec) => {
      const pick = choice[roleOf(sec.kind)];
      const symbols = pick?.symbols;
      if (!symbols?.length) return sec;
      let offset = 0;
      return {
        ...sec,
        lines: sec.lines.map((l) => {
          const { raw, used } = chordLine(l, symbols, offset, time, pick.perLine);
          offset += used;
          return { ...l, raw };
        }),
      };
    }),
  };
}

/** True when the song has words but not one chord. */
export function needsChords(song) {
  let text = false;
  for (const sec of song.sections) {
    for (const l of sec.lines) {
      const p = parseLine(l.raw);
      if (p.chords.length) return false;
      if (p.text.trim()) text = true;
    }
  }
  return text;
}
