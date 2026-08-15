import { useEffect, useState } from 'react';
import { chordTextFor, QUALITY_LABELS } from '../../music/harmonyCurriculum';
import { CHORD_INVERSIONS, DEFAULT_INVERSION } from '../../music/pianoInversions';
import { HarmonyRootPicker } from './HarmonyRootPicker';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';

const TRIAD_QUALITIES = ['major', 'minor', 'dim', 'aug'];

// Root + quality + inversion (root/1st/2nd position) — piano is where
// inversions actually mean something (reuses the app's existing
// pianoInversions.js engine, applied at the App.jsx resolver level exactly
// like Compose's own inversion picker); the guitar fretboard alongside it
// just shows the plain chord shape, since a fretboard voicing isn't the
// same kind of "which note's on the bottom" choice a piano voicing is (the
// lesson text explains that distinction).
export function HarmonyInversionPicker({ rootPitchClass, onRootChange, onPreviewChord, onInversionChange }) {
  const { t, lang } = useLanguage();
  const [quality, setQuality] = useState('major');
  const [inversion, setInversion] = useState(DEFAULT_INVERSION);

  const chordText = chordTextFor(rootPitchClass, quality);

  useEffect(() => {
    onPreviewChord(chordText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chordText]);

  useEffect(() => {
    onInversionChange(inversion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inversion]);

  // Leaving this lesson must not leave some other course's piano display
  // silently inverted — same "reset the shared thing you touched" discipline
  // as usePracticeDrill's exit()/commitSession.
  useEffect(() => () => onInversionChange(DEFAULT_INVERSION), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="harmony-demo">
      <div className="harmony-demo-controls">
        <HarmonyRootPicker rootPitchClass={rootPitchClass} onChange={onRootChange} />
        <div className="mode-toggle wrap" role="group" aria-label={t('harmony.quality')}>
          {TRIAD_QUALITIES.map((q) => (
            <button key={q} type="button" className={quality === q ? 'active' : ''} onClick={() => setQuality(q)}>
              {localize(QUALITY_LABELS[q], lang)}
            </button>
          ))}
        </div>
        <div className="mode-toggle" role="group" aria-label={t('harmony.inversion')}>
          {CHORD_INVERSIONS.map((inv) => (
            <button key={inv.key} type="button" className={inversion === inv.key ? 'active' : ''} onClick={() => setInversion(inv.key)}>
              {t(inv.labelKey)}
            </button>
          ))}
        </div>
      </div>
      <p className="harmony-chord-readout" dir="ltr">
        {chordText}
      </p>
      <p className="harmony-demo-hint">{t('harmony.inversionHint')}</p>
    </div>
  );
}
