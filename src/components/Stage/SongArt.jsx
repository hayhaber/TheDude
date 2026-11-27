import { artAt, artFor, splitName, useArtVersion } from '../../music/sheets/songArt';
import { sheetPrefs } from '../../music/sheets/sheetStore';

// A song's cover (v1.0.251), as Apple Music shows it beside a song: found
// by the song's name "Title – Artist". Without a cover: `fallback` (the
// row's own tile) or a grey music-note tile.
// v1.0.287: a song keeps the cover it got (sheet prefs `art`, or `url`
// given by the details sheet) even when its name / artist is edited later.
export function SongArt({ id, url: given, name, title, artist, size = 40, fallback = null }) {
  useArtVersion();
  const parts = title ? { title, artist } : splitName(name);
  const kept = given !== undefined ? given : id ? sheetPrefs(id).art || null : null;
  const url = kept || (given !== undefined ? null : artFor(parts.title, parts.artist));
  if (url) {
    return <img className="stg-art" src={artAt(url, size > 60 ? 600 : 120)} width={size} height={size} alt="" loading="lazy" decoding="async" draggable="false" style={{ width: size, height: size }} />;
  }
  if (fallback) return fallback;
  return (
    <span className="stg-art is-empty" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size * 0.45} height={size * 0.45} fill="currentColor">
        <path d="M9 17.5a2.5 2.5 0 1 1-2-2.45V5.5l11-2v11.5a2.5 2.5 0 1 1-2-2.45V7.1l-7 1.27z" />
      </svg>
    </span>
  );
}

/** "Zombie – The Cranberries" as Apple Music lists it: the title, the artist under it. */
export function SongName({ name, extra = null }) {
  const { title, artist } = splitName(name);
  return (
    <span className="ph-text">
      <span className="ph-title" dir="auto">
        {title}
      </span>
      {(artist || extra) && (
        <span className="ph-desc" dir="auto">
          {extra || artist}
        </span>
      )}
    </span>
  );
}
