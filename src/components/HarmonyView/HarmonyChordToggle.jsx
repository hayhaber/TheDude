import { useEffect, useState } from 'react';
import { chordTextFor, QUALITY_LABELS } from '../../music/harmonyCurriculum';
import { HarmonyRootPicker } from './HarmonyRootPicker';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';

// Root + a toggle among a fixed set of chord qualities (e.g. major/minor/
// dim/aug, or the 4 seventh-chord types) — the demo widget for any lesson
// that's teaching "here's what quality X sounds/looks like," on a root the
// learner picks. Always calls back with a chordText the shared chord engine
// understands, since every option list this course uses is drawn from
// QUALITY_SUFFIX's supported set.
export function HarmonyChordToggle({ rootPitchClass, onRootChange, options, onPreviewChord }) {
  const { t, lang } = useLanguage();
  const [quality, setQuality] = useState(options[0]);

  useEffect(() => {
    if (!options.includes(quality)) setQuality(options[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  const chordText = chordTextFor(rootPitchClass, quality);

  useEffect(() => {
    onPreviewChord(chordText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chordText]);

  return (
    <div className="harmony-demo">
      <div className="harmony-demo-controls">
        <HarmonyRootPicker rootPitchClass={rootPitchClass} onChange={onRootChange} />
        <div className={'mode-toggle' + (options.length > 3 ? ' wrap' : '')} role="group" aria-label={t('harmony.quality')}>
          {options.map((q) => (
            <button key={q} type="button" className={quality === q ? 'active' : ''} onClick={() => setQuality(q)}>
              {localize(QUALITY_LABELS[q], lang)}
            </button>
          ))}
        </div>
      </div>
      <p className="harmony-chord-readout" dir="ltr">
        {chordText}
      </p>
    </div>
  );
}
