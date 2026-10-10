import { useEffect, useRef, useState } from 'react';
import { usePitchDetection, BASS_PITCH_RANGE } from '../../hooks/usePitchDetection';
import { useInfoTooltipsEnabled } from '../../hooks/useInfoTooltipsEnabled';
import { useLanguage } from '../../i18n/LanguageContext';
import { InfoTooltip } from '../InfoTooltip/InfoTooltip';
import { tuningsFor, findTuning, loadTuningId, saveTuningId, nearestString } from '../../music/tunings';
import './GuitarTuner.css';

// Both tuner instances (TunerBar mounts one per layout) follow a change.
const TUNING_EVENT = 'dudestar:tuner-tuning';

function useTunerTuning(mode) {
  const [id, setId] = useState(() => loadTuningId(mode));
  useEffect(() => {
    setId(loadTuningId(mode));
    const onChange = () => setId(loadTuningId(mode));
    window.addEventListener(TUNING_EVENT, onChange);
    return () => window.removeEventListener(TUNING_EVENT, onChange);
  }, [mode]);
  const choose = (next) => {
    saveTuningId(mode, next);
    setId(next);
    window.dispatchEvent(new Event(TUNING_EVENT));
  };
  return [findTuning(mode, id), choose];
}

const IN_TUNE_CENTS = 5; // vibrant-green "In Tune!" threshold
const CLOSE_CENTS = 15; // amber "getting close" threshold; beyond this is red
const MAX_CENTS = 50; // pitchUtils.frequencyToNote never returns more than +/-50

// Segmented LED-style meter, not a swinging analog needle — modeled on a
// real clip-on tuner's tri-color LED bar (e.g. D'Addario's Micro Headstock
// Tuner: a dark display, a big color-coded note letter, and a row of LED
// segments filling in from center toward however sharp/flat the note is,
// red at the outer ends fading to green in the middle). SEGMENT_COUNT is
// odd so there's a true center segment sitting exactly at 0 cents.
const SEGMENT_COUNT = 15;
const SEGMENT_CENTS_SPAN = (MAX_CENTS * 2) / SEGMENT_COUNT;

function tuningZone(cents) {
  const abs = Math.abs(cents);
  if (abs <= IN_TUNE_CENTS) return 'in-tune';
  if (abs <= CLOSE_CENTS) return 'close';
  return 'off';
}

// Standalone, reusable tuner UI built on usePitchDetection — this component
// is purely presentational (a note name + a cents-off number in, pixels
// out); ALL pitch-detection/accuracy math lives in usePitchDetection.js and
// music/pitchUtils.js, untouched here. Minimalist by design: no reference
// list of open-string names — just the meter and whatever single note is
// actually being heard right now, the same way a real clip-on tuner works.
//
// `mode` 'bass' tunes a 4-string bass: a lower floor and a longer analysis
// window (see BASS_PITCH_RANGE), and its own blue display. Switching mode
// while listening restarts the mic so the new window size applies.
export function GuitarTuner({ mode = 'guitar' }) {
  const { t } = useLanguage();
  const { enabled: infoTooltipsEnabled } = useInfoTooltipsEnabled();
  const bass = mode === 'bass';
  const { isListening, startListening, stopListening, currentNote, frequency, error } = usePitchDetection(
    bass ? BASS_PITCH_RANGE : undefined
  );
  const [tuning, setTuningId] = useTunerTuning(bass ? 'bass' : 'guitar');
  const listeningRef = useRef(isListening);
  listeningRef.current = isListening;
  const firstModeRef = useRef(true);
  useEffect(() => {
    if (firstModeRef.current) {
      firstModeRef.current = false;
      return;
    }
    if (listeningRef.current) {
      stopListening();
      startListening();
    }
  }, [bass]); // eslint-disable-line react-hooks/exhaustive-deps

  // String mode: a pitch near one of the chosen tuning's strings is read
  // against THAT string's target (so a low E heard in Drop D reads "D, too
  // sharp", not an in-tune E). Further from every string (a fretted note)
  // the reading stays chromatic, exactly as before. Same zones/thresholds.
  const string = currentNote && frequency ? nearestString(frequency, tuning) : null;
  const rawCents = string ? string.cents : (currentNote?.centsOff ?? 0);
  const cents = Math.max(-MAX_CENTS, Math.min(MAX_CENTS, rawCents));
  const zone = currentNote ? tuningZone(rawCents) : null;
  const heardName = currentNote ? currentNote.name.replace(/-?\d+$/, '').replace('#', '♯') : null;
  const shownName = string ? string.name : currentNote ? currentNote.name.replace(/-?\d+$/, '') : '–';
  const isInTune = zone === 'in-tune';

  // Segment index 0 is the leftmost (most-flat) segment, SEGMENT_COUNT-1 the
  // rightmost (most-sharp); the exact center index is always "lit" as a
  // reference tick even with no note playing. A segment "fills" when it
  // sits between 0 cents and the current reading — i.e. the lit segments
  // always form one continuous bar growing outward from center, the same
  // visual language a real LED tuner bar uses.
  const centerIndex = (SEGMENT_COUNT - 1) / 2;
  const segments = Array.from({ length: SEGMENT_COUNT }, (_, i) => {
    const segmentCents = (i - centerIndex) * SEGMENT_CENTS_SPAN;
    const isCenter = i === centerIndex;
    const lit =
      isCenter || (currentNote != null && (cents >= 0 ? segmentCents > 0 && segmentCents <= cents : segmentCents < 0 && segmentCents >= cents));
    return { key: i, isCenter, lit };
  });

  return (
    <div className={'guitar-tuner' + (bass ? ' is-bass' : '')}>
      <label className="guitar-tuner-tuning">
        <span className="guitar-tuner-tuning-label">
          {t('tuning.label')}
          <InfoTooltip text={t('tuning.tip.select')} />
        </span>
        <select value={tuning.id} onChange={(e) => setTuningId(e.target.value)}>
          {tuningsFor(bass ? 'bass' : 'guitar').map((x) => (
            <option key={x.id} value={x.id}>
              {t(`tuning.${x.id}`)} ({x.names.join(' ')})
            </option>
          ))}
        </select>
      </label>
      {/* Always LTR (also in Hebrew): flat on the left, sharp on the right,
          like every hardware tuner — in RTL the meter used to run backwards. */}
      <div className={`guitar-tuner-screen${zone ? ` zone-${zone}` : ''}`} dir="ltr">
        <span className="guitar-tuner-mode" aria-hidden="true">
          {bass ? 'BASS' : 'GUITAR'}
        </span>
        <div className="guitar-tuner-note-row">
          <span className={`guitar-tuner-flat-arrow${zone === 'off' && cents < 0 ? ' active' : ''}`} aria-hidden="true">
            ♭
          </span>
          {/* Letter name only, no octave digit — a tuner tells you WHICH
              string/pitch class you're on and how far off it is, not which
              octave (a player already knows that; e.g. the low E string
              reads "E", not "E2"). */}
          <span className="guitar-tuner-note">{shownName}</span>
          <span className={`guitar-tuner-sharp-arrow${zone === 'off' && cents > 0 ? ' active' : ''}`} aria-hidden="true">
            ♯
          </span>
        </div>

        <div className="guitar-tuner-meter" role="img" aria-hidden="true">
          {segments.map((seg) => (
            <span
              key={seg.key}
              className={
                'guitar-tuner-segment' +
                (seg.isCenter ? ' center' : '') +
                (seg.lit ? ' lit' : '')
              }
            />
          ))}
        </div>

        {/* The tuning's strings, low to high — the one being tuned lit. */}
        <div className="guitar-tuner-strings" dir="ltr" aria-hidden="true">
          {tuning.names.map((name, i) => (
            <span
              key={i}
              className={'guitar-tuner-string' + (string?.index === i ? ` active zone-${zone}` : '')}
            >
              {name}
            </span>
          ))}
        </div>

        <div className="guitar-tuner-frequency">
          {frequency ? `${frequency.toFixed(1)} Hz` : '—'}
          {/* Off by more than a semitone: which note is actually sounding. */}
          {string && Math.abs(rawCents) > MAX_CENTS && heardName ? ` · ${heardName}` : ''}
          <InfoTooltip text={t('tip.tools.tunerAccuracy')} />
        </div>

        <div className={`guitar-tuner-in-tune-badge${isInTune ? ' visible' : ''}`}>{t('trainer.inTune')}</div>
      </div>

      <p className="guitar-tuner-status" dir="auto">
        {/* The "press Start / allow the mic" line is just a hint — only
            shown while the ⓘ info-tooltips switch is on. Real states
            (mic error, listening-but-silent) always show. */}
        {error
          ? t('trainer.micError', { message: error })
          : !isListening
            ? infoTooltipsEnabled
              ? t('tuner.micPermission')
              : null
            : !currentNote
              ? t('trainer.silence')
              : null}
      </p>

      <button type="button" className="guitar-tuner-toggle" onClick={isListening ? stopListening : startListening}>
        {isListening ? t('trainer.stop') : t('tuner.start')}
      </button>
    </div>
  );
}
