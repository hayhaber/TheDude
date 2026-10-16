import { useEffect, useRef, useState } from 'react';
import { usePitchDetection, BASS_PITCH_RANGE, TUNER_PITCH_RANGE } from '../../hooks/usePitchDetection';
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

// The meter: 41 LEDs (−50..+50 cents, 2.5 cents per LED) like a studio
// rack tuner, plus a strobe band whose drift speed shows the error.
const LED_HALF = 20;
const STROBE_PX_PER_CENT = 1.6; // px per second per cent of error
const STROBE_PERIOD = 24; // px — one stripe pair (matches the CSS pattern)

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
  const { isListening, startListening, stopListening, currentNote, frequency, error, deadInput } = usePitchDetection(
    bass ? BASS_PITCH_RANGE : TUNER_PITCH_RANGE
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

  // The LED meter: 41 LEDs from -50 to +50 cents (2.5 cents each) — one
  // "needle" LED lights at the reading (with a dim neighbour on each side
  // for a soft trail), the centre LED is always a faint reference.
  const ledIndex = currentNote ? Math.round(cents / (MAX_CENTS / LED_HALF)) + LED_HALF : null;
  const leds = Array.from({ length: LED_HALF * 2 + 1 }, (_, i) => {
    const off = Math.abs(i - LED_HALF);
    const color = off <= IN_TUNE_CENTS / (MAX_CENTS / LED_HALF) ? 'g' : off <= CLOSE_CENTS / (MAX_CENTS / LED_HALF) ? 'a' : 'r';
    const lit = ledIndex == null ? '' : i === ledIndex ? ' is-on' : Math.abs(i - ledIndex) === 1 ? ' is-dim' : '';
    return { key: i, cls: `tn-led c-${color}${i === LED_HALF ? ' is-center' : ''}${lit}` };
  });

  // Strobe band: the stripes drift at a speed proportional to how far off
  // the note is (left = flat, right = sharp) and stand still when it's in
  // tune — the way a strobe tuner reads. Moved in the DOM, not React state.
  const strobeRef = useRef(null);
  const strobeCents = useRef(null);
  strobeCents.current = currentNote ? cents : null;
  useEffect(() => {
    let raf = 0;
    let x = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const c = strobeCents.current;
      if (c != null) x = (x + c * STROBE_PX_PER_CENT * dt) % STROBE_PERIOD;
      const el = strobeRef.current;
      if (el) el.style.transform = `translateX(${(x - STROBE_PERIOD).toFixed(2)}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const list = tuningsFor(bass ? 'bass' : 'guitar');
  const at = Math.max(0, list.findIndex((x) => x.id === tuning.id));
  const stepTuning = (d) => setTuningId(list[(at + d + list.length) % list.length].id);
  const flatOn = currentNote && (isInTune || cents < 0);
  const sharpOn = currentNote && (isInTune || cents > 0);
  const centsText = currentNote ? `${rawCents > 0 ? '+' : rawCents < 0 ? '−' : '±'}${Math.abs(Math.round(rawCents))}` : '--';

  return (
    <div className={'guitar-tuner' + (bass ? ' is-bass' : '')}>
      {/* A studio desk tuner (always LTR, like the hardware: flat left). */}
      <div className={'tn-body' + (isListening ? ' is-on' : '')} dir="ltr">
        <div className="tn-head">
          <span className="tn-brand">DudeStar</span>
          <span className="tn-model">{bass ? 'BT-4' : 'GT-6'} · STROBE / CHROMATIC</span>
          <span className={'tn-power-led' + (isListening ? ' is-on' : '')} aria-hidden="true" />
        </div>

        <div className={`tn-screen guitar-tuner-screen${zone ? ` zone-${zone}` : ''}`}>
          <div className="tn-screen-top" aria-hidden="true">
            <span className={'tn-lamp' + (!bass ? ' is-on' : '')}>GUITAR</span>
            <span className={'tn-lamp' + (bass ? ' is-on' : '')}>BASS</span>
            <span className="tn-a4">A4 = 440 Hz</span>
          </div>

          <div className="tn-note-row">
            <span className={'tn-arrow is-flat' + (flatOn ? ' is-on' : '')} aria-hidden="true">
              ▶
            </span>
            {/* Letter name only, no octave digit (as on a hardware tuner). */}
            <span className="guitar-tuner-note tn-note" aria-live="polite">
              {shownName}
            </span>
            <span className={'tn-arrow is-sharp' + (sharpOn ? ' is-on' : '')} aria-hidden="true">
              ◀
            </span>
          </div>

          <div className="tn-meter" aria-hidden="true">
            <div className="tn-leds">
              {leds.map((l) => (
                <span key={l.key} className={l.cls} />
              ))}
            </div>
            <div className="tn-scale">
              <span>−50</span>
              <span>−25</span>
              <span>0</span>
              <span>+25</span>
              <span>+50</span>
            </div>
          </div>

          <div className={'tn-strobe' + (currentNote ? ' is-live' : '')} aria-hidden="true">
            <div className="tn-strobe-band" ref={strobeRef} />
          </div>

          <div className="tn-readouts">
            <span className="tn-readout">
              <span className="tn-readout-value">{centsText}</span>
              <span className="tn-readout-unit">CENT</span>
            </span>
            <span className={`tn-in-tune guitar-tuner-in-tune-badge${isInTune ? ' visible' : ''}`} dir="auto">{t('trainer.inTune')}</span>
            <span className="tn-readout">
              <span className="tn-readout-value">
                {frequency ? frequency.toFixed(1) : '---.-'}
                {string && Math.abs(rawCents) > MAX_CENTS && heardName ? ` ${heardName}` : ''}
              </span>
              <span className="tn-readout-unit">
                Hz
                <InfoTooltip text={t('tip.tools.tunerAccuracy')} />
              </span>
            </span>
          </div>

          {/* The tuning's strings, low to high — the one being tuned lit. */}
          <div className="tn-strings" aria-hidden="true">
            {tuning.names.map((name, i) => (
              <span key={i} className={'tn-string' + (string?.index === i ? ` is-on zone-${zone}` : '')}>
                <span className="tn-string-led" />
                {name}
              </span>
            ))}
          </div>
        </div>

        <div className="tn-controls">
          {/* TUNING: an LCD on the device (the <select> sits over it), with
              keys to step through the tunings. */}
          <div className="tn-tuning guitar-tuner-tuning">
            <span className="tn-engrave" dir="auto">
              {t('tuning.label')}
              <InfoTooltip text={t('tuning.tip.select')} />
            </span>
            <div className="tn-tuning-row">
              <button type="button" className="tn-key tn-step" onClick={() => stepTuning(-1)} aria-label={t('tuner.prev')} title={t('tuner.prev')}>
                ◀
              </button>
              <label className="tn-lcd">
                <span className="tn-lcd-name" dir="auto">
                  {t(`tuning.${tuning.id}`)}
                </span>
                <span className="tn-lcd-notes">{tuning.names.join(' ')}</span>
                <select value={tuning.id} onChange={(e) => setTuningId(e.target.value)} aria-label={t('tuning.label')}>
                  {list.map((x) => (
                    <option key={x.id} value={x.id}>
                      {t(`tuning.${x.id}`)} ({x.names.join(' ')})
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="tn-key tn-step" onClick={() => stepTuning(1)} aria-label={t('tuner.next')} title={t('tuner.next')}>
                ▶
              </button>
            </div>
          </div>
          <div className="tn-power-wrap">
            <span className="tn-engrave">POWER</span>
            <button type="button" className={'tn-key tn-power guitar-tuner-toggle' + (isListening ? ' is-on' : '')} onClick={isListening ? stopListening : startListening} aria-pressed={isListening}>
              <span className="tn-key-led" aria-hidden="true" />
              <span dir="auto">{isListening ? t('trainer.stop') : t('tuner.start')}</span>
            </button>
          </div>
        </div>
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
            : deadInput
              ? t('tuner.noSignal')
              : !currentNote
                ? t('trainer.silence')
                : null}
      </p>
    </div>
  );
}
