import { useEffect, useRef, useState } from 'react';
import { chordTextFor, QUALITY_LABELS } from '../../music/harmonyCurriculum';
import { diatonicChordsForKey, COMMON_PROGRESSIONS, realizeProgression, buildVoicing, referenceToneMidi } from '../../music/chordsByEar';
import { playChordVoicing, playFunctionalQuestionAudio, playProgression } from '../../audio/chordsByEarPlayer';
import { KEY_NAMES } from '../../music/scaleAnalyzer';
import { useLanguage } from '../../i18n/LanguageContext';
import { localize } from '../../i18n/localize';

function RootPicker({ rootPitchClass, onChange }) {
  const { t } = useLanguage();
  return (
    <label className="cbe-field">
      {t('chordsByEar.key')}
      <select value={rootPitchClass} onChange={(e) => onChange(Number(e.target.value))}>
        {KEY_NAMES.map((name, i) => (
          <option key={name} value={i}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

// Teaching demo for the two "hear the quality" lessons — a root picker plus
// a quality toggle (major/minor, or major/minor/dominant7/dim), playing the
// real guitar voicing every time either control changes (buildVoicing is
// the same shared-chord-engine helper the graded drills use, so what's
// heard here always matches a real playable shape). No "answer" here,
// purely illustrative — the graded version is ChordsByEarDrills.jsx's
// QualityDrill.
export function QualityToggleDemo({ options, onPreviewChord }) {
  const { t, lang } = useLanguage();
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [quality, setQuality] = useState(options[0]);

  useEffect(() => {
    if (!options.includes(quality)) setQuality(options[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  const chordText = chordTextFor(rootPitchClass, quality);

  useEffect(() => {
    onPreviewChord(chordText);
    const voicing = buildVoicing(chordText);
    if (voicing) playChordVoicing(voicing);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chordText]);

  return (
    <div className="cbe-demo">
      <div className="cbe-controls">
        <RootPicker rootPitchClass={rootPitchClass} onChange={setRootPitchClass} />
        <div className={'mode-toggle' + (options.length > 3 ? ' wrap' : '')} role="group" aria-label={t('chordsByEar.quality')}>
          {options.map((q) => (
            <button key={q} type="button" className={quality === q ? 'active' : ''} onClick={() => setQuality(q)}>
              {localize(QUALITY_LABELS[q], lang)}
            </button>
          ))}
        </div>
      </div>
      <p className="cbe-readout" dir="ltr">
        {chordText}
      </p>
    </div>
  );
}

// Teaching demo for "the key as home" — pick a key and a diatonic degree,
// Play sounds reference tone -> I chord -> the target chord, the exact same
// sequence + helper (playFunctionalQuestionAudio) the graded functional-
// hearing drills use, so the FEEL of the exercise is already familiar by
// the time the learner reaches the graded version.
export function HomeReferenceDemo({ onPreviewChord }) {
  const { t } = useLanguage();
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const [degreeIndex, setDegreeIndex] = useState(0);
  const cancelRef = useRef(null);

  const diatonic = diatonicChordsForKey(rootPitchClass);
  const target = diatonic[degreeIndex];

  useEffect(() => {
    onPreviewChord(target.chordText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.chordText]);

  useEffect(() => () => cancelRef.current?.(), []);

  function play() {
    cancelRef.current?.();
    const referenceNotesToPlay = buildVoicing(diatonic[0].chordText);
    const targetNotesToPlay = buildVoicing(target.chordText);
    if (!referenceNotesToPlay || !targetNotesToPlay) return;
    cancelRef.current = playFunctionalQuestionAudio({
      referenceToneMidi: referenceToneMidi(rootPitchClass),
      referenceNotesToPlay,
      targetNotesToPlay,
    });
  }

  return (
    <div className="cbe-demo">
      <div className="cbe-controls">
        <RootPicker rootPitchClass={rootPitchClass} onChange={setRootPitchClass} />
        <label className="cbe-field">
          {t('chordsByEar.degree')}
          <select value={degreeIndex} onChange={(e) => setDegreeIndex(Number(e.target.value))}>
            {diatonic.map((c, i) => (
              <option key={i} value={i}>
                {c.roman}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="play-button" onClick={play}>
          {t('chordsByEar.play')}
        </button>
      </div>
      <p className="cbe-readout" dir="ltr">
        {target.roman} — {target.chordText}
      </p>
    </div>
  );
}

// Teaching demo for the 4 "common progression shapes" lessons — plays the
// whole progression (real voicings, via buildVoicing) in the selected key
// and lists its chords with their roman numerals, so the learner can both
// hear and see the shape.
export function ProgressionDemo({ progressionId, onPreviewChord }) {
  const { t } = useLanguage();
  const [rootPitchClass, setRootPitchClass] = useState(0);
  const cancelRef = useRef(null);
  const progression = COMMON_PROGRESSIONS.find((p) => p.id === progressionId);
  const realized = realizeProgression(progression, rootPitchClass);

  useEffect(() => {
    onPreviewChord(realized[0].chordText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressionId, rootPitchClass]);

  useEffect(() => () => cancelRef.current?.(), []);

  function play() {
    cancelRef.current?.();
    const voicings = realized.map((c) => buildVoicing(c.chordText)).filter(Boolean);
    if (voicings.length !== realized.length) return;
    cancelRef.current = playProgression(voicings, { bpm: 96 });
  }

  return (
    <div className="cbe-demo">
      <div className="cbe-controls">
        <RootPicker rootPitchClass={rootPitchClass} onChange={setRootPitchClass} />
        <button type="button" className="play-button" onClick={play}>
          {t('chordsByEar.play')}
        </button>
      </div>
      <div className="cbe-chip-row">
        {realized.map((c, i) => (
          <div key={i} className="cbe-chip">
            <span className="cbe-chip-roman">{c.roman}</span>
            <span className="cbe-chip-text" dir="ltr">
              {c.chordText}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
