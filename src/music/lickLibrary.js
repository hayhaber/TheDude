import { ARTISTS, ARTIST_STYLE, ARTIST_DIFFICULTY, LICKS } from './licks';
import { resolveLickVariation } from './generateLick';

// Every curated (artist, quality, variation) combination in LICKS, pre-
// resolved once at a fixed reference key so the library is browsable
// on its own — independent of whatever chord happens to be active in
// Compose (unlike generateLick, which resolves relative to the live chord).
// E is the reference key for major/minor entries (the most idiomatic open-
// position blues/rock key on guitar) and A for dominant7 (a classic 12-bar
// blues I-chord); referenceFret 0 keeps every entry in a low, approachable
// position by default.
const QUALITY_CHORD_SYMBOL = { major: 'E', minor: 'Em', dominant7: 'A7' };
const QUALITY_LABEL = { major: 'Major', minor: 'Minor', dominant7: 'Dominant 7th' };

function buildLibrary() {
  const entries = [];
  ARTISTS.forEach(({ key: artistKey, name: artistName }) => {
    const artistLicks = LICKS[artistKey];
    if (!artistLicks) return;

    Object.keys(artistLicks).forEach((qualityKey) => {
      const chordSymbol = QUALITY_CHORD_SYMBOL[qualityKey];
      if (!chordSymbol) return;

      artistLicks[qualityKey].forEach((_, variationIndex) => {
        const resolved = resolveLickVariation({ artistKey, qualityKey, variationIndex, chordSymbol });
        if (!resolved) return;

        entries.push({
          id: `${artistKey}-${qualityKey}-${variationIndex}`,
          title: `${artistName} — ${QUALITY_LABEL[qualityKey]} Lick ${variationIndex + 1}`,
          artist: artistName,
          artistKey,
          genre: ARTIST_STYLE[artistKey],
          difficulty: ARTIST_DIFFICULTY[artistKey],
          key: chordSymbol,
          ...resolved,
        });
      });
    });
  });
  return entries;
}

// Built once at module load — every entry is a pure function of static data
// (LICKS + the fixed reference chords above), so there's nothing to
// recompute per render.
export const LICK_LIBRARY = buildLibrary();

export const LICK_GENRES = [...new Set(Object.values(ARTIST_STYLE))].sort();
export const LICK_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

export function filterLickLibrary({ artistKey = null, genre = null, difficulty = null } = {}) {
  return LICK_LIBRARY.filter(
    (entry) =>
      (!artistKey || entry.artistKey === artistKey) &&
      (!genre || entry.genre === genre) &&
      (!difficulty || entry.difficulty === difficulty)
  );
}
