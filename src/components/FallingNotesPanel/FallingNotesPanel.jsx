import { useMemo } from 'react';
import { playPianoNote } from '../../audio/pianoPlayer';
import { useLanguage } from '../../i18n/LanguageContext';
import './FallingNotesPanel.css';

const WHITE_PITCH_CLASSES = new Set([0, 2, 4, 5, 7, 9, 11]);
const BLACK_AFTER_PITCH_CLASS = new Set([0, 2, 5, 7, 9]);
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteLabel(midi) {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pc]}${octave}`;
}

const KEY_WIDTH = 42;
const BLACK_KEY_WIDTH = 26;
const WHITE_KEY_HEIGHT = 130;
const BLACK_KEY_HEIGHT = 82;
const LANE_HEIGHT = 260;
const FALL_TIME_S = 2.5; // must match music/fallingNotesSongs.js's own FALL_TIME_S
const HIT_WINDOW_S = 0.35; // must match hooks/useFallingNotes.js's own HIT_WINDOW_S
const NOTE_BLOCK_HEIGHT = 22;

// Deliberately NOT the shared PianoKeyboard component — that's an 88-key,
// scrolling/draggable, minimap-having component used all over the app
// (Compose, Ear Training, Studies...), and changing it to grow a falling-
// notes overlay would risk every one of those call sites. A short practice
// song only ever spans a couple of octaves anyway, so this owns a small,
// fixed-range, non-scrolling keyboard built just for this panel — same
// isolation choice String Bending's own mini fretboard made earlier.
function buildKeyboardLayout(minMidi, maxMidi) {
  let lo = minMidi - 1;
  let hi = maxMidi + 1;
  while (!WHITE_PITCH_CLASSES.has(((lo % 12) + 12) % 12)) lo -= 1;
  while (!WHITE_PITCH_CLASSES.has(((hi % 12) + 12) % 12)) hi += 1;

  const whiteKeys = [];
  for (let midi = lo; midi <= hi; midi += 1) {
    const pitchClass = ((midi % 12) + 12) % 12;
    if (WHITE_PITCH_CLASSES.has(pitchClass)) whiteKeys.push({ midi, pitchClass });
  }

  const positioned = whiteKeys.map((w, i) => ({
    ...w,
    x: i * KEY_WIDTH,
    blackKey: BLACK_AFTER_PITCH_CLASS.has(w.pitchClass) && w.midi + 1 <= hi ? { midi: w.midi + 1 } : null,
  }));

  const xCenterByMidi = new Map();
  positioned.forEach((w) => {
    xCenterByMidi.set(w.midi, w.x + KEY_WIDTH / 2);
    if (w.blackKey) xCenterByMidi.set(w.blackKey.midi, w.x + KEY_WIDTH);
  });

  return { whiteKeys: positioned, totalWidth: whiteKeys.length * KEY_WIDTH, xCenterByMidi };
}

function keyStateForMidi(midi, song, results, now) {
  const pending = song.notes.find((n) => n.midi === midi && results[n.id] == null && Math.abs(now - n.time) <= HIT_WINDOW_S);
  if (pending) return 'target';
  const recent = song.notes.find((n) => n.midi === midi && results[n.id] != null && Math.abs(now - n.time) <= 0.5);
  return recent ? results[recent.id] : null;
}

export function FallingNotesPanel({ fallingNotes }) {
  const { t } = useLanguage();
  const { song, songs, songKey, setSongKey, isPlaying, isComplete, now, results, score, midiState, enableMidi, start, stop, handleNotePlayed } =
    fallingNotes;

  const layout = useMemo(() => buildKeyboardLayout(song.minMidi, song.maxMidi), [song]);

  const visibleNotes = song.notes.filter((n) => n.time - now >= -0.3 && n.time - now <= FALL_TIME_S);

  function handleKeyClick(midi) {
    playPianoNote(midi);
    handleNotePlayed(midi);
  }

  const midiStatusKey = {
    idle: null,
    connecting: 'fallingNotes.midi.connecting',
    connected: 'fallingNotes.midi.connected',
    unsupported: 'fallingNotes.midi.unsupported',
    denied: 'fallingNotes.midi.denied',
  }[midiState];

  return (
    <div className="falling-notes-panel">
      <div>
        <h1>{t('fallingNotes.title')}</h1>
        <p className="subtitle">{t('fallingNotes.subtitle')}</p>
      </div>

      <div className="falling-notes-controls">
        <label className="falling-notes-field">
          {t('fallingNotes.songLabel')}
          <select value={songKey} onChange={(e) => setSongKey(e.target.value)} disabled={isPlaying}>
            {songs.map((s) => (
              <option key={s.key} value={s.key}>
                {t(s.labelKey)}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="falling-notes-midi-btn" onClick={enableMidi} disabled={midiState === 'connected'}>
          {t('fallingNotes.midi')}
        </button>

        <button type="button" className="play-button" onClick={isPlaying ? stop : start}>
          {isPlaying ? t('vocal.stop') : t('vocal.start')}
        </button>
      </div>

      {midiStatusKey && <p className={'falling-notes-midi-status' + (midiState === 'connected' ? ' connected' : '')}>{t(midiStatusKey)}</p>}

      <div className="falling-notes-stage" style={{ width: layout.totalWidth }}>
        <div className="falling-notes-lane" style={{ height: LANE_HEIGHT }}>
          {visibleNotes.map((note) => {
            const isBlack = !WHITE_PITCH_CLASSES.has(((note.midi % 12) + 12) % 12);
            const width = isBlack ? BLACK_KEY_WIDTH : KEY_WIDTH * 0.8;
            const xCenter = layout.xCenterByMidi.get(note.midi) ?? 0;
            const top = LANE_HEIGHT - (note.time - now) * (LANE_HEIGHT / FALL_TIME_S);
            const result = results[note.id];
            return (
              <div
                key={note.id}
                className={'falling-note-block' + (result ? ` ${result}` : '') + (isBlack ? ' black' : '')}
                style={{ left: xCenter - width / 2, width, top, height: NOTE_BLOCK_HEIGHT }}
              >
                {noteLabel(note.midi)}
              </div>
            );
          })}
          <div className="falling-notes-hit-line" style={{ top: LANE_HEIGHT }} />
        </div>

        <div className="falling-notes-keyboard" style={{ height: WHITE_KEY_HEIGHT }}>
          {layout.whiteKeys.map((w) => {
            const state = keyStateForMidi(w.midi, song, results, now);
            return (
              <div key={w.midi} className="falling-key-col" style={{ width: KEY_WIDTH }}>
                <button
                  type="button"
                  className={'falling-key falling-key-white' + (state ? ` ${state}` : '')}
                  onClick={() => handleKeyClick(w.midi)}
                  aria-label={t('fretboard.playNote', { note: noteLabel(w.midi) })}
                />
                {w.blackKey &&
                  (() => {
                    const blackState = keyStateForMidi(w.blackKey.midi, song, results, now);
                    return (
                      <button
                        type="button"
                        className={'falling-key falling-key-black' + (blackState ? ` ${blackState}` : '')}
                        style={{ width: BLACK_KEY_WIDTH, height: BLACK_KEY_HEIGHT, left: KEY_WIDTH - BLACK_KEY_WIDTH / 2 }}
                        onClick={() => handleKeyClick(w.blackKey.midi)}
                        aria-label={t('fretboard.playNote', { note: noteLabel(w.blackKey.midi) })}
                      />
                    );
                  })()}
              </div>
            );
          })}
        </div>
      </div>

      {(isPlaying || isComplete) && (
        <p className="falling-notes-score">
          {t('fallingNotes.score')}: {score.hits} / {score.hits + score.misses}
        </p>
      )}

      {isComplete && <p className="falling-notes-complete">{t('vocal.complete')}</p>}
    </div>
  );
}
