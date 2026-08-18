import { usePitchDetection } from '../../hooks/usePitchDetection';
import { useLanguage } from '../../i18n/LanguageContext';
import './GuitarTuner.css';

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
export function GuitarTuner() {
  const { t } = useLanguage();
  const { isListening, startListening, stopListening, currentNote, frequency, error } = usePitchDetection();

  const cents = currentNote?.centsOff ?? 0;
  const zone = currentNote ? tuningZone(cents) : null;
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
    <div className="guitar-tuner">
      <div className={`guitar-tuner-screen${zone ? ` zone-${zone}` : ''}`}>
        <div className="guitar-tuner-note-row">
          <span className={`guitar-tuner-flat-arrow${zone === 'off' && cents < 0 ? ' active' : ''}`} aria-hidden="true">
            ♭
          </span>
          {/* Letter name only, no octave digit — a tuner tells you WHICH
              string/pitch class you're on and how far off it is, not which
              octave (a player already knows that; e.g. the low E string
              reads "E", not "E2"). */}
          <span className="guitar-tuner-note">{currentNote ? currentNote.name.replace(/-?\d+$/, '') : '–'}</span>
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

        <div className="guitar-tuner-frequency">{frequency ? `${frequency.toFixed(1)} Hz` : '—'}</div>

        <div className={`guitar-tuner-in-tune-badge${isInTune ? ' visible' : ''}`}>{t('trainer.inTune')}</div>
      </div>

      <p className="guitar-tuner-status" dir="auto">
        {error ? t('trainer.micError', { message: error }) : !isListening ? t('tuner.micPermission') : !currentNote ? t('trainer.silence') : null}
      </p>

      <button type="button" className="guitar-tuner-toggle" onClick={isListening ? stopListening : startListening}>
        {isListening ? t('trainer.stop') : t('tuner.start')}
      </button>
    </div>
  );
}
