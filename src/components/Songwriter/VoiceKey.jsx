import { useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { loadRange, comfortRange, midiName } from '../../music/vocal/voiceRange';
import { rankKeys, songNotes } from '../../music/songwriter/keyFit';
import { keyName } from '../../music/songwriter/song';

// "Your key" (v1.0.168): the key that fits THIS voice best, from the range
// test (comfortable range, steadiest notes, register break) and the song's
// melody. Shown in the editor's key / tempo panel.

// Latin key / note names inside Hebrew text: isolated, or bidi scrambles them.
const iso = (x) => `\u2066${x}\u2069`;

export function VoiceKey({ song, onApply }) {
  const { t } = useLanguage();
  const range = useMemo(() => loadRange(), []);
  const notes = useMemo(() => songNotes(song), [song]);
  const ranked = useMemo(() => (range && notes.length ? rankKeys(notes, range, song.key) : []), [notes, range, song.key]);
  const [pick, setPick] = useState(null);

  if (!notes.length) return <p className="sw-vk-note">{t('sw.vk.noMelody')}</p>;
  if (!range) return <p className="sw-vk-note">{t('sw.vk.noRange')}</p>;

  const c = comfortRange(range);
  const best = ranked[0];
  const now = ranked.find((r) => r.shift === 0);
  const options = ranked.slice(0, 6);
  if (!options.includes(now)) options.push(now);
  const chosen = ranked.find((r) => r.shift === (pick ?? best.shift)) ?? best;

  const name = (r) => (r.key ? keyName(r.key) : r.shift === 0 ? t('sw.vk.asIs') : `${r.shift > 0 ? '+' : '−'}${Math.abs(r.shift)}`);
  const span = (r) => `${midiName(r.bottom)}–${midiName(r.top)}`;
  const verdict = (r) => {
    let v;
    if (r.over) v = t('sw.vk.high', { n: r.over });
    else if (r.under) v = t('sw.vk.low', { n: r.under });
    else if (r.topRoom === 0) v = t('sw.vk.tight');
    else v = t('sw.vk.fits', { n: r.topRoom });
    if (r.onBreak) v += ' · ' + t('sw.vk.break', { n: r.onBreak });
    return v;
  };

  return (
    <div className="sw-vk">
      <div className="sw-vk-head">
        <span className="sw-vk-title">{t('sw.vk.title')}</span>
        <span className="sw-vk-ranges" dir="auto">
          {t('sw.vk.ranges', { you: `${midiName(c.low)}–${midiName(c.high)}` })}
        </span>
      </div>
      {best.shift === 0 ? (
        <p className="sw-vk-best is-ok" dir="auto">
          {t('sw.vk.already')} {iso(`(${span(now)})`)}
        </p>
      ) : (
        <p className="sw-vk-best" dir="auto">
          {t('sw.vk.now', { key: iso(`${name(now)} (${span(now)})`) })}
          <br />
          <span className="sw-vk-verdict">{verdict(now)}</span>
        </p>
      )}
      <div className="sw-vk-row">
        <select value={chosen.shift} onChange={(e) => setPick(Number(e.target.value))} aria-label={t('sw.vk.title')}>
          {options.map((r, i) => (
            <option key={r.shift} value={r.shift}>
              {iso(`${name(r)} · ${span(r)}`)} · {r.shift === 0 ? t('sw.vk.current') : i === 0 ? t('sw.vk.bestTag') : verdict(r)}
            </option>
          ))}
        </select>
        <button type="button" className="sw-btn is-small is-tint" disabled={chosen.shift === 0} onClick={() => {
            setPick(null);
            onApply(chosen);
          }}>
          {t('sw.vk.use')}
        </button>
      </div>
      {chosen.shift !== 0 && (
        <p className="sw-vk-note" dir="auto">
          {verdict(chosen)}
        </p>
      )}
    </div>
  );
}
