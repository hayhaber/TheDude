import { useEffect, useState } from 'react';
import { MAX_CAPO_FRET } from '../../music/capo';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import './CapoInput.css';

// A number field, not a dropdown, despite having 12 possible values (0-11)
// — this app's own >2-options-gets-a-dropdown rule is about discrete named
// choices; a fret number is a continuous-feeling numeric quantity a player
// wants to type or nudge directly (like BPM elsewhere), not pick from a list
// of labels.
//
// type="text" (not "number") — the "N-" cancel-capo shorthand (see
// onCancelCapo below) needs to accept a trailing "-" mid-typing, which a
// native number input simply won't let you type at all. Local `raw` state
// mirrors capoFret when it changes from elsewhere (e.g. right after a
// cancel resets it to 0), but otherwise echoes exactly what's been typed so
// far, including a bare trailing "-" with no digit yet.
export function CapoInput({ capoFret, setCapoFret, onCancelCapo }) {
  const { t } = useLanguage();
  const [raw, setRaw] = useState(capoFret ? String(capoFret) : '');

  useEffect(() => {
    setRaw(capoFret ? String(capoFret) : '');
  }, [capoFret]);

  function handleChange(e) {
    const value = e.target.value;
    if (!/^\d*-?$/.test(value)) return; // digits, optionally followed by one trailing "-"
    setRaw(value);

    const isCancel = value.endsWith('-');
    const digits = value.slice(0, isCancel ? -1 : undefined);
    if (digits === '') {
      if (!isCancel) setCapoFret(0);
      return;
    }
    const n = Math.max(0, Math.min(MAX_CAPO_FRET, Math.round(Number(digits))));

    // "N-" — a shorthand for a progression that was written assuming a capo
    // on fret N (e.g. copied from someone else's chord chart) that the
    // player now wants to play with NO capo at all: it rewrites the typed
    // chords themselves (transposing down N semitones, the same math
    // Compose -> Transpose already uses) instead of setting an actual capo,
    // then clears this field back to 0 — there is no capo in effect
    // afterward, by design, only different chord letters.
    if (isCancel) {
      onCancelCapo(n);
      // Clear the draft directly rather than relying on the capoFret prop
      // round-trip — capoFret may already BE 0 (this field was never a real
      // capo to begin with, just used for the "N-" shorthand), in which
      // case the sync effect above never fires since nothing changed.
      setRaw('');
      return;
    }
    setCapoFret(n);
  }

  return (
    <div className="capo-input">
      <span className="capo-input-label-row">
        <label htmlFor="capo-fret">{t('capo.label')}</label>
        {/* Usage example for InfoTooltip (src/components/InfoTooltip) — a
            sibling of the <label>, not nested inside it, so clicking the
            info icon doesn't also trigger the label's own "focus my
            associated input" click behavior. */}
        <InfoTooltip text={t('capo.tooltip')} label={t('capo.tooltipLabel')} />
      </span>
      <input
        id="capo-fret"
        type="text"
        inputMode="numeric"
        value={raw}
        onChange={handleChange}
        // Selects the existing digit(s) on focus so typing a new value
        // replaces it outright — without this, clicking in (cursor lands at
        // the end) and typing "0" to clear a capo of "3" would concatenate
        // into "30" instead, silently clamping to MAX_CAPO_FRET (11) rather
        // than the 0 the player meant to type.
        onFocus={(e) => e.target.select()}
        placeholder="0"
        aria-label={t('capo.label')}
      />
    </div>
  );
}
