import { useEffect, useState } from 'react';
import { PENTASCALE_INTERVALS, FINGER_NUMBERS_RIGHT_HAND } from '../../music/pianoCurriculum';
import { playPianoNote, playPianoSequence } from '../../audio/pianoPlayer';
import { StaffNotation, GrandStaff } from '../StaffNotation/StaffNotation';
import { useLanguage } from '../../i18n/LanguageContext';
import '../ModeToggle/ModeToggle.css';

const MIDDLE_C = 60;
const KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// Step 1 — no interaction beyond what the shared keyboard already offers
// (every C is already dot-marked; "Show Labels" is the keyboard's own
// built-in toggle) — this widget's only job is giving a reason to look at
// a few different C's, low and high.
export function KeyboardGeographyDemo({ onPreviewNotes }) {
  const { t } = useLanguage();
  const [octave, setOctave] = useState(4);

  const midi = MIDDLE_C + (octave - 4) * 12;

  useEffect(() => {
    onPreviewNotes([{ midi, isRoot: true }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [octave]);

  useEffect(() => () => onPreviewNotes([]), []); // eslint-disable-line react-hooks/exhaustive-deps

  function play() {
    playPianoNote(midi);
    onPreviewNotes([{ midi, isRoot: true }]);
  }

  return (
    <div className="cbe-demo">
      <div className="cbe-controls">
        <label className="cbe-field">
          {t('piano.octave')}
          <select value={octave} onChange={(e) => setOctave(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((o) => (
              <option key={o} value={o}>
                C{o}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="button" className="play-button" onClick={play}>
        {t('chordsByEar.play')}
      </button>
    </div>
  );
}

// Step 2 — right-hand finger numbers 1-5 laid over 5 neighboring white keys
// starting from a selectable root, via PianoKeyboard's new fingerNumbers
// prop (App.jsx's resolvePianoCurriculumStageProps reads previewFingers the
// same way it reads previewNotes).
export function HandPositionDemo({ onPreviewNotes, onPreviewFingers }) {
  const { t } = useLanguage();
  const [rootPitchClass, setRootPitchClass] = useState(0);

  useEffect(() => {
    const rootMidi = MIDDLE_C + rootPitchClass;
    const spanNotes = PENTASCALE_INTERVALS.map((iv) => ({ midi: rootMidi + iv, isRoot: iv === 0 }));
    const fingers = PENTASCALE_INTERVALS.map((iv, i) => ({ midi: rootMidi + iv, finger: FINGER_NUMBERS_RIGHT_HAND[i] }));
    onPreviewNotes(spanNotes);
    onPreviewFingers(fingers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootPitchClass]);

  useEffect(
    () => () => {
      onPreviewNotes([]);
      onPreviewFingers([]);
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
      <p className="cbe-hint" dir="auto">
        {t('piano.handPosition.hint')}
      </p>
    </div>
  );
}

// Step 3 — the actual playable five-finger pattern: same PENTASCALE_INTERVALS
// as pianoPractice.js's own pentascale exercise, played up then down via
// playPianoSequence, with finger numbers shown throughout.
export function FiveFingerDemo({ onPreviewNotes, onPreviewFingers }) {
  const { t } = useLanguage();
  const [rootPitchClass, setRootPitchClass] = useState(0);

  const rootMidi = MIDDLE_C + rootPitchClass;
  const upNotes = PENTASCALE_INTERVALS.map((iv) => rootMidi + iv);
  const sequence = [...upNotes, ...[...upNotes].reverse().slice(1)];

  function showHand() {
    const fingers = PENTASCALE_INTERVALS.map((iv, i) => ({ midi: rootMidi + iv, finger: FINGER_NUMBERS_RIGHT_HAND[i] }));
    onPreviewFingers(fingers);
    onPreviewNotes(upNotes.map((midi) => ({ midi, isRoot: midi === rootMidi })));
  }

  useEffect(() => {
    showHand();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootPitchClass]);

  useEffect(
    () => () => {
      onPreviewNotes([]);
      onPreviewFingers([]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  function play() {
    showHand();
    playPianoSequence(sequence);
  }

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
      <button type="button" className="play-button" onClick={play}>
        {t('chordsByEar.play')}
      </button>
    </div>
  );
}

// Step 4 — one example note per clef, StaffNotation.jsx (VexFlow) rendering
// alongside the shared keyboard highlighting the matching key, so the
// staff-to-key correspondence is visible at a glance, not just described.
const STAFF_EXAMPLES = {
  treble: { midi: 67, clef: 'treble' }, // G4, sits ON the treble staff's own middle line
  bass: { midi: 53, clef: 'bass' }, // F3, sits ON the bass staff's own middle line
};

export function StaffBasicsDemo({ onPreviewNotes }) {
  const { t } = useLanguage();
  const [clefKey, setClefKey] = useState('treble');
  const example = STAFF_EXAMPLES[clefKey];

  useEffect(() => {
    onPreviewNotes([{ midi: example.midi, isRoot: true }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clefKey]);

  useEffect(() => () => onPreviewNotes([]), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="cbe-demo">
      <div className="mode-toggle" role="group" aria-label={t('piano.clef')}>
        <button type="button" className={clefKey === 'treble' ? 'active' : ''} onClick={() => setClefKey('treble')}>
          {t('piano.clef.treble')}
        </button>
        <button type="button" className={clefKey === 'bass' ? 'active' : ''} onClick={() => setClefKey('bass')}>
          {t('piano.clef.bass')}
        </button>
      </div>
      <StaffNotation notes={[{ midi: example.midi }]} clef={example.clef} />
      <button type="button" className="play-button" onClick={() => playPianoNote(example.midi)}>
        {t('chordsByEar.play')}
      </button>
    </div>
  );
}

// Step 5 — Middle C on its own ledger line, between the two staves, plus one
// neighbor note on each side so the "treble reads above, bass reads below"
// rule from the lesson text is visible, not just Middle C in isolation.
const GRAND_STAFF_TREBLE_NOTES = [{ midi: 62 }, { midi: MIDDLE_C }]; // D4, C4(ledger)
const GRAND_STAFF_BASS_NOTES = [{ midi: MIDDLE_C }, { midi: 55 }]; // C4(ledger), G3

export function GrandStaffDemo({ onPreviewNotes }) {
  const { t } = useLanguage();

  useEffect(() => {
    onPreviewNotes([{ midi: MIDDLE_C, isRoot: true }]);
    return () => onPreviewNotes([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="cbe-demo">
      <GrandStaff trebleNotes={GRAND_STAFF_TREBLE_NOTES} bassNotes={GRAND_STAFF_BASS_NOTES} highlightMidi={MIDDLE_C} />
      <p className="cbe-hint" dir="auto">
        {t('piano.grandStaff.hint')}
      </p>
      <button type="button" className="play-button" onClick={() => playPianoNote(MIDDLE_C)}>
        {t('chordsByEar.play')}
      </button>
    </div>
  );
}

// Lines & Spaces — the 4 mnemonic sets, one line/space at a time. Each
// group is bottom-to-top (the same direction the mnemonic sentences are
// always recited in), so "Next" always means "up the staff."
const LINE_SPACE_NOTES = {
  treble: {
    lines: [64, 67, 71, 74, 77], // E4 G4 B4 D5 F5
    spaces: [65, 69, 72, 76], // F4 A4 C5 E5
  },
  bass: {
    lines: [43, 47, 50, 53, 57], // G2 B2 D3 F3 A3
    spaces: [45, 48, 52, 55], // A2 C3 E3 G3
  },
};
const MNEMONIC_HINT_KEY = {
  treble: { lines: 'piano.linesSpaces.trebleLines', spaces: 'piano.linesSpaces.trebleSpaces' },
  bass: { lines: 'piano.linesSpaces.bassLines', spaces: 'piano.linesSpaces.bassSpaces' },
};

export function LinesSpacesDemo({ onPreviewNotes }) {
  const { t } = useLanguage();
  const [clefKey, setClefKey] = useState('treble');
  const [groupKey, setGroupKey] = useState('lines');
  const [index, setIndex] = useState(0);

  const notes = LINE_SPACE_NOTES[clefKey][groupKey];
  const midi = notes[index];

  useEffect(() => {
    setIndex(0);
  }, [clefKey, groupKey]);

  useEffect(() => {
    onPreviewNotes([{ midi, isRoot: true }]);
    playPianoNote(midi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midi]);

  useEffect(() => () => onPreviewNotes([]), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="cbe-demo">
      <div className="cbe-controls">
        <div className="mode-toggle" role="group" aria-label={t('piano.clef')}>
          <button type="button" className={clefKey === 'treble' ? 'active' : ''} onClick={() => setClefKey('treble')}>
            {t('piano.clef.treble')}
          </button>
          <button type="button" className={clefKey === 'bass' ? 'active' : ''} onClick={() => setClefKey('bass')}>
            {t('piano.clef.bass')}
          </button>
        </div>
        <div className="mode-toggle" role="group" aria-label={t('piano.linesSpaces.group')}>
          <button type="button" className={groupKey === 'lines' ? 'active' : ''} onClick={() => setGroupKey('lines')}>
            {t('piano.linesSpaces.lines')}
          </button>
          <button type="button" className={groupKey === 'spaces' ? 'active' : ''} onClick={() => setGroupKey('spaces')}>
            {t('piano.linesSpaces.spaces')}
          </button>
        </div>
      </div>
      <StaffNotation notes={[{ midi }]} clef={clefKey} />
      <p className="cbe-hint" dir="auto">
        {t(MNEMONIC_HINT_KEY[clefKey][groupKey])}
      </p>
      <div className="cbe-fret-row">
        <button type="button" className="cbe-fret-btn" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index <= 0}>
          {t('positionControls.back')}
        </button>
        <button
          type="button"
          className="cbe-fret-btn"
          onClick={() => setIndex((i) => Math.min(notes.length - 1, i + 1))}
          disabled={index >= notes.length - 1}
        >
          {t('positionControls.next')}
        </button>
      </div>
    </div>
  );
}

// Ledger Lines Beyond the Staff — 2 concrete examples (one each direction),
// same reasoning as the lesson text: real playing rarely needs more than
// 2-3 ledger lines, so a couple of clear examples teach the pattern better
// than an exhaustive sweep would.
const LEDGER_EXAMPLES = [
  { key: 'highC', midi: 84, clef: 'treble' }, // C6, 2 ledger lines above treble
  { key: 'lowC', midi: 36, clef: 'bass' }, // C2, 3 ledger lines below bass
];

export function LedgerLinesDemo({ onPreviewNotes }) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const example = LEDGER_EXAMPLES[index];

  useEffect(() => {
    onPreviewNotes([{ midi: example.midi, isRoot: true }]);
    playPianoNote(example.midi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [example.midi]);

  useEffect(() => () => onPreviewNotes([]), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="cbe-demo">
      <div className="mode-toggle" role="group" aria-label={t('piano.ledger.example')}>
        {LEDGER_EXAMPLES.map((ex, i) => (
          <button key={ex.key} type="button" className={index === i ? 'active' : ''} onClick={() => setIndex(i)}>
            {t(`piano.ledger.${ex.key}`)}
          </button>
        ))}
      </div>
      <StaffNotation notes={[{ midi: example.midi }]} clef={example.clef} height={140} />
    </div>
  );
}
