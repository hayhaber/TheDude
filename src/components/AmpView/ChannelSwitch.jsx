import { useLanguage } from '../../i18n/LanguageContext';

// The channel selector as a real 3-way bat toggle — the same chrome lever and
// nut as the Power/Standby switches. Lever up = LEAD, centre = CRUNCH (the
// lever points straight out, so only its ball shows over the nut), down =
// CLEAN. Tap the upper / middle / lower part of the switch (or a position's
// engraved name) to throw it there; arrow keys step it.
const POSITIONS = ['lead', 'crunch', 'clean']; // top -> bottom

export function ChannelSwitch({ value, onChange }) {
  const { t } = useLanguage();
  const index = Math.max(0, POSITIONS.indexOf(value));
  const set = (i) => {
    const v = POSITIONS[Math.max(0, Math.min(POSITIONS.length - 1, i))];
    if (v !== value) onChange(v);
  };
  const onPointer = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    set(y < 1 / 3 ? 0 : y < 2 / 3 ? 1 : 2);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault();
      set(index - 1);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault();
      set(index + 1);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      set((index + 1) % POSITIONS.length);
    }
  };
  const pos = POSITIONS[index];
  return (
    <div className="amp-channel-switch">
      <div className="amp-channel-row">
        <button
          type="button"
          role="slider"
          aria-label={t('amp.voicing')}
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={2 - index}
          aria-valuetext={t(`amp.voicing.${pos}`)}
          className={`amp-toggle is-${pos === 'lead' ? 'up' : pos === 'clean' ? 'down' : 'mid'}`}
          onClick={onPointer}
          onKeyDown={onKey}
        >
          <span className="amp-toggle-nut" aria-hidden="true" />
          <span className="amp-toggle-bat" aria-hidden="true" />
        </button>
        <div className="amp-channel-names" aria-hidden="true">
          {POSITIONS.map((p, i) => (
            <span key={p} className={'amp-engrave' + (p === pos ? ' is-on' : '')} onClick={() => set(i)}>
              {p.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
      <span className="amp-engrave amp-toggle-caption">CHANNEL</span>
    </div>
  );
}
