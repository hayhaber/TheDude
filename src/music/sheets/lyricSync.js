// Lyrics in time with the recording (v1.0.260; user: "the lit words come a
// little late — can it follow the song exactly?"). An even pace can't: a
// song has an intro, solos and dense / sparse verses. So each SUNG line gets
// the second it starts in the song's recording:
//   1. automatically, from LRCLIB (a free public archive of time-stamped
//      lyrics — the kind Spotify / Apple Music show), matched line by line
//      to the words the user pasted (his text stays; only the times are used);
//   2. or by hand: the recording plays and he taps as each line starts.
// Stored per song in sheet prefs `sync` = {v, src: 'lrclib' | 'tap', off,
// lines: [[seconds, key], …]} — `key` = the start of the line's text, so the
// times still find their lines after the words are edited.

/** A line's text for comparing: no chords, niqqud, punctuation or case. */
export function lineKey(text) {
  return String(text || '')
    .replace(/\[[^\]]*\]/g, ' ')
    .normalize('NFKD')
    .replace(/[̀-֑ͯ-ׇ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .slice(0, 60);
}

/** "[01:02.50] words" lines -> [{t, text}] in time order (empty lines dropped). */
export function parseLrc(lrc) {
  const out = [];
  for (const raw of String(lrc || '').split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,2}):(\d{1,2}(?:[.:]\d{1,3})?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    if (!lineKey(text)) continue; // ♪ instrumental marks
    for (const m of stamps) out.push({ t: Number(m[1]) * 60 + Number(m[2].replace(':', '.')), text });
  }
  return out.sort((a, b) => a.t - b.t);
}

function grams(s) {
  const g = new Map();
  const x = ' ' + s + ' ';
  for (let i = 0; i < x.length - 1; i += 1) {
    const k = x.slice(i, i + 2);
    g.set(k, (g.get(k) || 0) + 1);
  }
  return g;
}
/** Dice similarity of two keys, 0..1. */
export function similar(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const ga = grams(a);
  const gb = grams(b);
  let both = 0;
  let na = 0;
  let nb = 0;
  for (const v of ga.values()) na += v;
  for (const v of gb.values()) nb += v;
  for (const [k, v] of ga) both += Math.min(v, gb.get(k) || 0);
  return (2 * both) / (na + nb);
}

/**
 * Line up two lists in order (like a diff): each item of `a` may take one item
 * of `b` further on than the last one taken, when they are alike enough.
 * Returns for every item of `a` the index into `b` or -1.
 */
export function alignKeys(a, b, min = 0.55) {
  const n = a.length;
  const m = b.length;
  const S = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const sims = a.map((x) => b.map((y) => similar(x, y)));
  for (let i = n - 1; i >= 0; i -= 1)
    for (let j = m - 1; j >= 0; j -= 1) {
      const s = sims[i][j];
      S[i][j] = Math.max(S[i + 1][j], S[i][j + 1], s >= min ? s + S[i + 1][j + 1] : 0);
    }
  const pick = new Array(n).fill(-1);
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const s = sims[i][j];
    if (s >= min && Math.abs(S[i][j] - (s + S[i + 1][j + 1])) < 1e-9) {
      pick[i] = j;
      i += 1;
      j += 1;
    } else if (S[i + 1][j] >= S[i][j + 1]) i += 1;
    else j += 1;
  }
  return pick;
}

/** Times from an LRC for the user's lines; null when too few lines match. */
export function timesFromLrc(keys, lrc) {
  const rows = parseLrc(lrc);
  if (!rows.length || !keys.length) return null;
  const pick = alignKeys(keys, rows.map((r) => lineKey(r.text)));
  const times = pick.map((j) => (j >= 0 ? rows[j].t : null));
  const found = times.filter((x) => x != null).length;
  return found >= Math.max(2, Math.ceil(keys.length * 0.5)) ? times : null;
}

/** Fill the lines with no time between their timed neighbours (never back in time). */
export function fillTimes(times, dur) {
  const t = times.slice();
  const n = t.length;
  const end = Math.max(dur || 0, ...t.filter((x) => x != null)) || n * 4;
  let prev = -1;
  for (let i = 0; i <= n; i += 1) {
    if (i < n && t[i] == null) continue;
    const a = prev >= 0 ? t[prev] : 0;
    const b = i < n ? t[i] : end;
    const gap = i - prev;
    for (let k = prev + 1; k < i; k += 1) t[k] = a + ((b - a) * (k - prev)) / gap;
    prev = i;
  }
  for (let i = 1; i < n; i += 1) if (t[i] < t[i - 1]) t[i] = t[i - 1];
  return t;
}

/** The stored form. */
export function makeSync(keys, times, src, off = 0) {
  return { v: 1, src, off: Math.round(off * 10) / 10, lines: keys.map((k, i) => [times[i] == null ? null : Math.round(times[i] * 100) / 100, k.slice(0, 40)]) };
}

/** The stored times laid on the song's lines as they are now (words may have changed). */
export function timesFor(sync, keys, dur) {
  if (!sync?.lines?.length || !keys.length) return null;
  const stored = sync.lines;
  let times;
  if (stored.length === keys.length && stored.every((s, i) => similar(s[1], keys[i].slice(0, 40)) >= 0.8)) times = stored.map((s) => s[0]);
  else {
    const pick = alignKeys(keys.map((k) => k.slice(0, 40)), stored.map((s) => s[1]), 0.8);
    times = pick.map((j) => (j >= 0 ? stored[j][0] : null));
    if (times.filter((x) => x != null).length < Math.max(2, keys.length * 0.5)) return null;
  }
  const off = Number(sync.off) || 0;
  return fillTimes(times, dur).map((x) => x + off);
}

/**
 * Where the reading line should be at time `now`: the top of the line being
 * sung reaches it exactly when that line starts, gliding between lines.
 * tops = each line's top in the words box; end = the box's height.
 */
export function posAt(now, times, tops, end) {
  const n = Math.min(times.length, tops.length);
  if (!n) return 0;
  if (now <= times[0]) return times[0] > 0 ? Math.max(0, (tops[0] * now) / times[0]) : tops[0];
  for (let i = 0; i < n - 1; i += 1) {
    if (now < times[i + 1]) {
      const span = times[i + 1] - times[i];
      // hold on the line while it is sung, then move on in the last part
      const f = span > 0 ? (now - times[i]) / span : 1;
      const ease = f < 0.6 ? 0 : (f - 0.6) / 0.4;
      return tops[i] + (tops[i + 1] - tops[i]) * ease * ease * (3 - 2 * ease);
    }
  }
  return tops[n - 1];
}
