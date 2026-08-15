import { useEffect, useState } from 'react';
import { chordTextFor } from '../../music/harmonyCurriculum';
import { mod } from '../../music/notes';
import { HarmonyRootPicker } from './HarmonyRootPicker';
import { useLanguage } from '../../i18n/LanguageContext';

// A short, fixed chord sequence (I-IV-V, ii-V-I, a secondary-dominant pair,
// a modal-interchange trio, ...) on a root the learner picks — the demo
// widget for every "here's a specific progression" lesson. Each chord is
// { offset (semitones from the selected root), quality, roman (display
// label, already carries any "(borrowed)"/"/V" annotation the lesson
// wants) } — see harmonyCurriculum.js's HARMONY_LESSONS for the exact
// sequences.
export function HarmonyProgressionRow({ rootPitchClass, onRootChange, chords, onPreviewChord }) {
  const { t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [chords]);

  const resolved = chords.map((c) => ({ ...c, chordText: chordTextFor(mod(rootPitchClass + c.offset, 12), c.quality) }));
  const active = resolved[activeIndex] ?? resolved[0];

  useEffect(() => {
    onPreviewChord(active?.chordText ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.chordText]);

  return (
    <div className="harmony-demo">
      <div className="harmony-demo-controls">
        <HarmonyRootPicker rootPitchClass={rootPitchClass} onChange={onRootChange} />
      </div>

      <div className="harmony-progression-row">
        {resolved.map((c, i) => (
          <button key={i} type="button" className={'harmony-progression-chip' + (i === activeIndex ? ' active' : '')} onClick={() => setActiveIndex(i)}>
            <span className="harmony-diatonic-roman">{c.roman}</span>
            <span className="harmony-progression-chordtext" dir="ltr">
              {c.chordText}
            </span>
          </button>
        ))}
      </div>

      <p className="harmony-demo-hint">{t('harmony.progressionHint')}</p>
    </div>
  );
}
