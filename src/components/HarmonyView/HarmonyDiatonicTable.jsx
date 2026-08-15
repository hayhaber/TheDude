import { useEffect, useState } from 'react';
import { buildDiatonicChords, FUNCTION_LABELS } from '../../music/harmonyCurriculum';
import { HarmonyRootPicker } from './HarmonyRootPicker';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';

const FAMILY_LABELS = {
  major: { en: 'Major', he: 'מז\'ור' },
  naturalMinor: { en: 'Natural Minor', he: 'מינור טבעי' },
  harmonicMinor: { en: 'Harmonic Minor', he: 'מינור הרמוני' },
};

// All 7 diatonic chords of a key, one row of clickable Roman-numeral
// buttons — the demo widget for every "here are a key's own chords" lesson
// (plain triads, 7th chords, function coloring, or a natural-vs-harmonic
// minor comparison). Clicking a chord previews it; the notes always render
// as text (see harmonyCurriculum.js's noteNames) even for the rare
// diatonic 7th chords the shared chord engine can't render as a shape
// (half-diminished, minor-major7 — chordText is null for those, so no
// fretboard/piano preview fires, but the theory is still fully correct).
export function HarmonyDiatonicTable({ rootPitchClass, onRootChange, family, seventh, compareFamily, showFunction, onPreviewChord }) {
  const { t, lang } = useLanguage();
  const [activeFamily, setActiveFamily] = useState(family);
  const [activeDegree, setActiveDegree] = useState(0);

  useEffect(() => {
    setActiveFamily(family);
  }, [family]);

  const chords = buildDiatonicChords(rootPitchClass, activeFamily, seventh);
  const active = chords[activeDegree] ?? chords[0];

  useEffect(() => {
    onPreviewChord(active?.chordText ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.chordText]);

  return (
    <div className="harmony-demo">
      <div className="harmony-demo-controls">
        <HarmonyRootPicker rootPitchClass={rootPitchClass} onChange={onRootChange} />
        {compareFamily && (
          <div className="mode-toggle" role="group" aria-label={t('harmony.scaleType')}>
            <button type="button" className={activeFamily === family ? 'active' : ''} onClick={() => setActiveFamily(family)}>
              {localize(FAMILY_LABELS[family], lang)}
            </button>
            <button type="button" className={activeFamily === compareFamily ? 'active' : ''} onClick={() => setActiveFamily(compareFamily)}>
              {localize(FAMILY_LABELS[compareFamily], lang)}
            </button>
          </div>
        )}
      </div>

      <div className="harmony-diatonic-row">
        {chords.map((c, i) => (
          <button
            key={c.degreeIndex}
            type="button"
            className={'harmony-diatonic-chip' + (i === activeDegree ? ' active' : '') + (showFunction && c.function ? ' fn-' + c.function : '')}
            onClick={() => setActiveDegree(i)}
          >
            <span className="harmony-diatonic-roman">{c.roman}</span>
            {showFunction && c.function && <span className="harmony-diatonic-fn">{localize(FUNCTION_LABELS[c.function], lang)}</span>}
          </button>
        ))}
      </div>

      <p className="harmony-chord-readout" dir="ltr">
        {active?.noteNames.join(' - ')}
      </p>
    </div>
  );
}
