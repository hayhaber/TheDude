import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { suggestChords, applyChords, chordsTimeline } from '../../music/songwriter/harmonize';
import { beatsPerBar, keyName, lineBeats, sortNotes } from '../../music/songwriter/song';
import { parseLine, syllables } from '../../music/songwriter/lyrics';
import { playHarmony } from '../../audio/songwriter/harmonyPlayer';
import { prepareGuitar } from '../../audio/chordPlayer';
import { Icon } from './icons';

const INSTRUMENTS = ['guitar', 'piano'];
const STYLES = ['strum', 'arp', 'block'];

/**
 * Suggested chords for a sung line (inside the melody sheet): 2–3 options per
 * bar — tap one to hear that bar with it —, Play = the whole line with the
 * choices, Apply = the chords go over the words at each bar's start.
 * Instrument / accompaniment / melody voice are kept per song.
 */
export function ChordSuggest({ song, line, onApply, onPrefs, onClose }) {
  const { t, lang } = useLanguage();
  const prefs = { instrument: 'guitar', style: 'strum', voice: 'mine', ...(song.harmony ?? {}) };
  const notes = useMemo(() => sortNotes(line.melody?.notes ?? []), [line.melody]);
  const [key, setKey] = useState(() => song.key ?? suggestChords(line, { time: song.time }).key);
  const res = useMemo(() => suggestChords(line, { key, time: song.time }), [line, key, song.time]);
  const [picks, setPicks] = useState(() => res.bars.map((b) => b.options[0]?.symbol ?? null));
  const [playing, setPlaying] = useState(null); // 'all' | bar index
  const handle = useRef(null);
  const timer = useRef(null);
  const bpb = beatsPerBar(song.time);
  const total = lineBeats(line, song.time);

  // A new key = new suggestions.
  useEffect(() => setPicks(res.bars.map((b) => b.options[0]?.symbol ?? null)), [res]);
  useEffect(() => {
    if (prefs.instrument === 'guitar') prepareGuitar();
  }, [prefs.instrument]);
  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // the take the melody came from — usable when it was sung to the click at this tempo
  const take = (line.takes ?? []).find((x) => x.id === line.melody?.from);
  const voiceOk = !!take && take.downbeat != null && (take.bpm ?? song.bpm) === song.bpm;
  const useVoice = voiceOk && prefs.voice === 'mine';

  function stop() {
    handle.current?.stop();
    handle.current = null;
    clearTimeout(timer.current);
    setPlaying(null);
  }

  async function play(which, list = picks) {
    stop();
    const from = which === 'all' ? Math.min(0, notes[0]?.s ?? 0) : res.bars[which].beat;
    const to = which === 'all' ? total : Math.min(total, res.bars[which].beat + bpb);
    setPlaying(which);
    const h = await playHarmony({
      bpm: song.bpm,
      time: song.time,
      notes,
      chords: chordsTimeline(res.bars, list, bpb),
      fromBeat: from,
      toBeat: to,
      instrument: prefs.instrument,
      style: prefs.style,
      voice: useVoice ? { takeId: take.id, downbeat: take.downbeat } : null,
    });
    handle.current = h;
    timer.current = setTimeout(() => setPlaying(null), h.duration * 1000);
  }

  const { text } = parseLine(line.raw);
  const syl = syllables(text, line.syl);
  const wordText = (wi) => (wi >= 0 ? text.split(/\s+/).filter(Boolean)[wi] : null);
  const keys = [false, true].flatMap((minor) => Array.from({ length: 12 }, (_, pc) => ({ pc, minor })));

  if (!res.bars.length) return <p className="sw-muted">{t('sw.harm.none')}</p>;

  return (
    <div className="sw-harm" role="group" aria-label={t('sw.harm.title')}>
      <div className="sw-harm-head">
        <h3>{t('sw.harm.title')}</h3>
        <label className="sw-field is-inline">
          <span>{t('sw.key')}</span>
          <select
            value={`${key.pc}:${key.minor ? 'm' : ''}`}
            onChange={(e) => {
              const [pc, m] = e.target.value.split(':');
              setKey({ pc: Number(pc), minor: m === 'm' });
            }}
          >
            {keys.map((k) => (
              <option key={`${k.pc}${k.minor}`} value={`${k.pc}:${k.minor ? 'm' : ''}`}>
                {keyName(k)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!song.key && <p className="sw-harm-note">{t('sw.harm.keyGuess', { key: keyName(key) })}</p>}

      <div className="sw-harm-prefs">
        <label className="sw-field is-inline">
          <span>{t('sw.harm.instrument')}</span>
          <select value={prefs.instrument} onChange={(e) => onPrefs({ instrument: e.target.value })}>
            {INSTRUMENTS.map((x) => (
              <option key={x} value={x}>
                {t('sw.harm.inst.' + x)}
              </option>
            ))}
          </select>
        </label>
        <label className="sw-field is-inline">
          <span>{t('sw.harm.style')}</span>
          <select value={prefs.style} onChange={(e) => onPrefs({ style: e.target.value })}>
            {STYLES.map((x) => (
              <option key={x} value={x}>
                {t('sw.harm.style.' + x)}
              </option>
            ))}
          </select>
        </label>
        <label className="sw-field is-inline">
          <span>{t('sw.harm.melody')}</span>
          <select value={useVoice ? 'mine' : 'piano'} disabled={!voiceOk} onChange={(e) => onPrefs({ voice: e.target.value })}>
            <option value="mine">{t('sw.harm.voice.mine')}</option>
            <option value="piano">{t('sw.harm.voice.piano')}</option>
          </select>
        </label>
      </div>
      {!voiceOk && <p className="sw-harm-note">{t(take ? 'sw.harm.voiceOff' : 'sw.harm.voiceNone')}</p>}

      <ol className="sw-harm-bars">
        {res.bars.map((b, i) => (
          <li key={i} className={'sw-harm-bar' + (playing === i ? ' is-playing' : '')}>
            <span className="sw-harm-bar-head">
              <span>{t('sw.harm.bar', { n: i + 1 })}</span>
              {wordText(b.word) ? <bdi className="sw-harm-word">{wordText(b.word)}</bdi> : <span className="sw-harm-word is-none">{t('sw.harm.noWord')}</span>}
            </span>
            <span className="sw-harm-opts" dir="ltr">
              {b.options.map((o) => (
                <button
                  key={o.symbol}
                  type="button"
                  className={'sw-harm-chip' + (picks[i] === o.symbol ? ' is-on' : '')}
                  aria-pressed={picks[i] === o.symbol}
                  onClick={() => {
                    const next = picks.map((p, k) => (k === i ? o.symbol : p));
                    setPicks(next);
                    play(i, next);
                  }}
                >
                  {o.symbol}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ol>
      <p className="sw-harm-note">{t('sw.harm.hint')}</p>

      <div className="sw-harm-actions">
        <button type="button" className="sw-btn" onClick={onClose}>
          {t('sw.cancel')}
        </button>
        <button type="button" className={'sw-btn' + (playing === 'all' ? ' is-on' : '')} onClick={() => (playing === 'all' ? stop() : play('all'))}>
          <Icon name={playing === 'all' ? 'stop' : 'play'} />
          {playing === 'all' ? t('sw.stop') : t('sw.play')}
        </button>
        <button
          type="button"
          className="sw-btn is-primary"
          onClick={() => {
            stop();
            onApply(applyChords(line, res.bars, picks), lang);
          }}
        >
          {t('sw.harm.apply')}
        </button>
      </div>
      {syl.length === 0 && <p className="sw-harm-note">{t('sw.harm.noLyrics')}</p>}
    </div>
  );
}
