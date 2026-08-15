import { useEffect, useState } from 'react';
import { fivePositionWindows } from '../../music/scaleShapes';
import { KEY_NAMES } from '../../music/scaleAnalyzer';
import { useLanguage } from '../../i18n/LanguageContext';

const ANCHORS = [
  { key: 'E-shape', stringIndex: 0, labelKey: 'chordsByEar.string.lowE' },
  { key: 'A-shape', stringIndex: 1, labelKey: 'chordsByEar.string.a' },
  // Same 5-position CAGED math as the other 2 anchors (fivePositionWindows'
  // own "G-shape" entry) — not a new pattern, just displayed on only the top
  // 3 strings (G/B/e) instead of all 6. A genuinely different USE CASE from
  // the other 2 (which are for the video's "find the key, low on the neck"
  // step): this one is a compact lead/solo box once the key is already
  // known, which is why it's offered as an extra option rather than
  // replacing either of the video's own 2 anchors.
  { key: 'G-shape', stringIndexes: [3, 4, 5], labelKey: 'chordsByEar.string.top3' },
];

// Step 1 material — "slide this one shape up and down the neck": the major
// scale rendered on the shared Fretboard as a scaleNotes overlay (see
// resolveChordsByEarStageProps), anchored at whichever fret the chosen root
// falls on the low E or A string. Reuses fivePositionWindows (the exact
// same CAGED-anchor math the Studies -> CAGED course itself uses) rather
// than a second copy of "where does this shape sit for this root" — this
// picks out just the E-shape/A-shape window from the 5 it already computes.
// Defaults to DEGREE numbers (1-7), not note letters — the whole point of a
// movable shape is that the same numbered pattern works in any key; a
// Note Names toggle is offered for players who want to see the actual
// letters too (same Degrees/Note Names control ScalesView already uses).
export function MovableScaleShapeDemo({ onPreviewScale }) {
  const { t } = useLanguage();
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [anchorIndex, setAnchorIndex] = useState(0);
  const [labelMode, setLabelMode] = useState('degree');

  const windows = fivePositionWindows(rootPitchClass);
  const anchor = ANCHORS[anchorIndex];
  const window_ = windows.find((w) => w.shapeName === anchor.key);

  useEffect(() => {
    onPreviewScale(
      window_
        ? { rootPitchClass, fretStart: window_.fretStart, fretEnd: window_.fretEnd, labelMode, stringIndexes: anchor.stringIndexes }
        : null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootPitchClass, anchorIndex, labelMode]);

  useEffect(() => () => onPreviewScale(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="cbe-demo">
      <div className="cbe-controls">
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

        <div className="mode-toggle" role="group" aria-label={t('chordsByEar.anchorString')}>
          {ANCHORS.map((a, i) => (
            <button key={a.key} type="button" className={anchorIndex === i ? 'active' : ''} onClick={() => setAnchorIndex(i)}>
              {t(a.labelKey)}
            </button>
          ))}
        </div>

        <div className="mode-toggle" role="group" aria-label={t('scales.labelMode')}>
          <button type="button" className={labelMode === 'degree' ? 'active' : ''} onClick={() => setLabelMode('degree')}>
            {t('scales.degrees')}
          </button>
          <button type="button" className={labelMode === 'note' ? 'active' : ''} onClick={() => setLabelMode('note')}>
            {t('scales.noteNames')}
          </button>
        </div>
      </div>
      <p className="cbe-hint" dir="auto">
        {anchor.stringIndexes
          ? t('chordsByEar.movableScale.hintTop3', { key: KEY_NAMES[rootPitchClass] })
          : t('chordsByEar.movableScale.hint', { key: KEY_NAMES[rootPitchClass], fret: window_?.rootFret, string: t(anchor.labelKey) })}
      </p>
    </div>
  );
}
