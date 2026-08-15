import { useEffect, useState } from 'react';
import { buildChordRoadMap } from '../../music/chordsByEar';
import { playChordVoicing } from '../../audio/chordsByEarPlayer';
import { buildVoicing } from '../../music/chordsByEar';
import { KEY_NAMES } from '../../music/scaleAnalyzer';
import { MiniChordDiagram } from './MiniChordDiagram';
import { useLanguage } from '../../i18n/LanguageContext';

// Step 2 material — the "6-chord road map": I, ii, iii built off the low E
// string, IV, V, vi off the A string (see chordsByEar.js's buildChordRoadMap
// for the real guitar-geometry reason IV/V/vi fall at the SAME 3 fret
// offsets one string over). Clicking a chip shows that exact anchored
// shape on the shared Fretboard (via previewPosition, not the generic
// chord-text lookup — see useChordsByEarLesson.js) and plays it.
export function ChordRoadMapDemo({ onPreviewPosition, onPreviewChord }) {
  const { t } = useLanguage();
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const roadMap = buildChordRoadMap(rootPitchClass);
  const active = roadMap[activeIndex];

  useEffect(() => {
    onPreviewPosition(active.position);
    onPreviewChord(active.chordText);
    if (active.position) playChordVoicing(buildVoicing(active.chordText) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootPitchClass, activeIndex]);

  useEffect(
    () => () => {
      onPreviewPosition(null);
      onPreviewChord(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="cbe-demo">
      <label className="cbe-field">
        {t('chordsByEar.key')}
        <select value={rootPitchClass} onChange={(e) => setRootPitchClass(Number(e.target.value))}>
          {KEY_NAMES.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div className="cbe-mini-chord-row">
        {roadMap.map((c, i) => (
          <MiniChordDiagram
            key={c.roman}
            position={c.position}
            degreeLabel={i + 1}
            romanLabel={c.roman}
            chordText={c.chordText}
            active={i === activeIndex}
            onClick={() => setActiveIndex(i)}
          />
        ))}
      </div>

      <p className="cbe-hint" dir="auto">
        {t('chordsByEar.roadMap.hint', { string: active.stringIndex === 0 ? t('chordsByEar.string.lowE') : t('chordsByEar.string.a') })}
      </p>
    </div>
  );
}
