import { useEffect, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const STRINGS = [
  { key: 'low-e', stringIndex: 0, labelKey: 'chordsByEar.string.lowE' },
  { key: 'a', stringIndex: 1, labelKey: 'chordsByEar.string.a' },
];

// Prerequisite #1 (matches the source video's own opening chapter): every
// note name along one string, frets 0-12, so "slide the root to fret X"
// (used constantly from here on — the movable scale/chord/Find-the-Key
// lessons) actually means something concrete. Reuses the shared Fretboard's
// scaleNotes overlay via resolveChordsByEarStageProps' chromatic branch —
// all 12 notes, filtered to just this one string, not a second note-naming
// display.
export function NoteNamesDemo({ onPreviewScale }) {
  const { t } = useLanguage();
  const [stringChoice, setStringChoice] = useState(0);

  useEffect(() => {
    onPreviewScale({ chromatic: true, stringIndexes: [STRINGS[stringChoice].stringIndex], fretStart: 0, fretEnd: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stringChoice]);

  useEffect(() => () => onPreviewScale(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="cbe-demo">
      <div className="mode-toggle" role="group" aria-label={t('chordsByEar.anchorString')}>
        {STRINGS.map((s, i) => (
          <button key={s.key} type="button" className={stringChoice === i ? 'active' : ''} onClick={() => setStringChoice(i)}>
            {t(s.labelKey)}
          </button>
        ))}
      </div>
      <p className="cbe-hint" dir="auto">
        {t('chordsByEar.noteNames.halfStepHint')}
      </p>
    </div>
  );
}
