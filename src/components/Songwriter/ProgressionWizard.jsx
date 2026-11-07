import { useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { keyName } from '../../music/songwriter/song';
import { COLORS, MOODS, STYLES, STYLE_BAND, applyPlan, plans, suggestBpm, suggestKey } from '../../music/songwriter/progressions';
import { parseLine } from '../../music/songwriter/lyrics';
import { Icon } from './icons';

const QUESTIONS = [
  { id: 'mood', options: MOODS },
  { id: 'style', options: STYLES },
  { id: 'color', options: COLORS },
];
const ROLE_ORDER = ['verse', 'prechorus', 'chorus', 'bridge'];

/**
 * "Suggest chords" for a song written as words only: three short questions
 * about the writer's vision of the song (feeling, style, how colourful),
 * then one progression per section kind — proven ones, chosen for that
 * vision, the chorus landing home and the verse / bridge contrasting with
 * it. ‹ › tries another progression for a section, Hear plays it (with the
 * band of the chosen style), Apply writes the chords over the words.
 */
export function ProgressionWizard({ song, audio, onApply, onClose }) {
  const { t, lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const [brief, setBrief] = useState(() => ({ ...(song.vision ?? {}) }));
  const [step, setStep] = useState(() => (song.vision?.mood && song.vision?.style && song.vision?.color ? 3 : 0));
  const [key, setKey] = useState(() => song.key ?? null);
  const [idx, setIdx] = useState(null); // {role: candidate index}

  const done = step >= 3;
  const theKey = key ?? (done ? suggestKey(brief) : null);
  const result = useMemo(() => (done ? plans(song, brief, theKey) : null), [done, song, brief, theKey]);
  const picks = idx ?? result?.plans[0]?.picks ?? {};
  const roles = result ? ROLE_ORDER.filter((r) => result.roles.includes(r) && result.byRole[r].length) : [];
  const choice = Object.fromEntries(roles.map((r) => [r, result.byRole[r][picks[r] ?? 0]]));
  const hadChords = useMemo(() => song.sections.some((s) => s.lines.some((l) => parseLine(l.raw).chords.length)), [song]);
  const bandStyle = song.band?.style || STYLE_BAND[brief.style] || 'pop';

  const answer = (q, v) => {
    setBrief((b) => ({ ...b, [q]: v }));
    setIdx(null);
    setStep((s) => s + 1);
  };

  const cycle = (role, d) => {
    const n = result.byRole[role].length;
    setIdx({ ...picks, [role]: ((picks[role] ?? 0) + d + n) % n });
  };

  const stopAudio = () => {
    if (audio.playing?.scope?.startsWith('pw')) audio.stopAll();
  };

  // The finished song (chords + key, and a band / tempo only where the writer set none).
  const built = () => {
    const next = applyPlan(song, choice);
    return {
      ...next,
      key: theKey,
      bpm: song.bpmSet ? song.bpm : suggestBpm(brief),
      band: { ...(song.band ?? {}), style: song.band?.style || STYLE_BAND[brief.style] || null },
      vision: { mood: brief.mood, style: brief.style, color: brief.color },
    };
  };

  const hearRole = (role) => {
    const c = choice[role];
    const temp = {
      ...song,
      key: theKey,
      bpm: song.bpmSet ? song.bpm : suggestBpm(brief),
      band: { style: bandStyle, melody: false },
      sections: [{ id: 'pw-sec', kind: role, lines: [{ id: 'pw-line', raw: c.symbols.map((s) => `[${s}]·`).join(' ') }] }],
    };
    audio.play(temp, 'pw:' + role);
  };

  const hearAll = () => {
    const s = built();
    audio.play({ ...s, band: { ...s.band, style: s.band.style || bandStyle } }, 'pw:all');
  };

  const close = () => {
    stopAudio();
    onClose();
  };

  const q = QUESTIONS[step];
  const keys = [false, true].flatMap((minor) => Array.from({ length: 12 }, (_, pc) => ({ pc, minor })));

  return (
    <div className="sw-sheet-back" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="sw-sheet sw-pw" role="dialog" aria-label={t('sw.pw.title')} dir={dir}>
        <header className="sw-sheet-head">
          <div>
            <p className="sw-pw-eyebrow">{done ? t('sw.pw.title') : t('sw.pw.step', { n: step + 1, of: QUESTIONS.length })}</p>
            <h2>{done ? t('sw.pw.result') : t('sw.pw.q.' + q.id)}</h2>
            {done ? (
              <p className="sw-sheet-line">{[t('sw.pw.mood.' + brief.mood), t('sw.pw.style.' + brief.style), t('sw.pw.color.' + brief.color)].join(' · ')}</p>
            ) : (
              step === 0 && <p className="sw-sheet-line">{t('sw.pw.intro')}</p>
            )}
          </div>
          <span className="sw-pw-head-actions">
            {step > 0 && (
              <button
                type="button"
                className="sw-btn is-quiet"
                onClick={() => {
                  stopAudio();
                  setStep(done ? 0 : step - 1);
                }}
              >
                {done ? t('sw.pw.change') : t('sw.pw.back')}
              </button>
            )}
            <button type="button" className="sw-btn" onClick={close}>
              {t('sw.cancel')}
            </button>
          </span>
        </header>

        {!done && (
          <ul className="sw-group sw-pw-options">
            {q.options.map((v) => (
              <li key={v}>
                <button type="button" className={'sw-pw-row' + (brief[q.id] === v ? ' is-chosen' : '')} onClick={() => answer(q.id, v)}>
                  <span className="sw-pw-row-text">
                    <span className="sw-pw-row-title">{t(`sw.pw.${q.id}.${v}`)}</span>
                    <span className="sw-pw-row-sub">{t(`sw.pw.${q.id}.${v}.sub`)}</span>
                  </span>
                  {brief[q.id] === v ? <Icon name="check" /> : <span className="sw-chev"><Icon name="next" size={16} /></span>}
                </button>
              </li>
            ))}
          </ul>
        )}

        {done && (
          <>
            <div className="sw-pw-key">
              <label className="sw-field is-inline">
                <span>{t('sw.key')}</span>
                <select
                  value={`${theKey.pc}:${theKey.minor ? 'm' : ''}`}
                  onChange={(e) => {
                    const [pc, m] = e.target.value.split(':');
                    stopAudio();
                    setKey({ pc: Number(pc), minor: m === 'm' });
                    setIdx(null);
                  }}
                >
                  {keys.map((k) => (
                    <option key={`${k.pc}${k.minor}`} value={`${k.pc}:${k.minor ? 'm' : ''}`}>
                      {keyName(k)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="sw-pw-note">{!song.key && !key ? t('sw.pw.keyGuess') : theKey.minor !== suggestKey(brief).minor ? t(theKey.minor ? 'sw.pw.keyMinor' : 'sw.pw.keyMajor') : ''}</p>
            </div>

            <ul className="sw-group sw-pw-plan">
              {roles.map((role) => {
                const c = choice[role];
                const n = result.byRole[role].length;
                const scope = 'pw:' + role;
                return (
                  <li key={role} className="sw-pw-sec">
                    <div className="sw-pw-sec-head">
                      <span className="sw-pw-sec-text">
                        <span className="sw-pw-row-title">{t('sw.kind.' + role)}</span>
                        <span className="sw-pw-row-sub">{t('sw.pw.role.' + role)}</span>
                      </span>
                      <button type="button" className={'sw-icon-btn' + (audio.playing?.scope === scope ? ' is-on' : '')} onClick={() => hearRole(role)} aria-label={t('sw.pw.hear')}>
                        <Icon name={audio.playing?.scope === scope ? 'stop' : 'play'} />
                      </button>
                    </div>
                    <div className="sw-pw-chords" dir="ltr">
                      {c.symbols.map((s, i) => (
                        <span key={i} className="sw-pw-chord">
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="sw-pw-sec-foot">
                      <bdi className="sw-pw-roman" dir="ltr">
                        {c.tokens.join(' – ')}
                      </bdi>
                      {n > 1 && (
                        <span className="sw-pw-cycle" dir="ltr">
                          <button type="button" className="sw-icon-btn" onClick={() => cycle(role, -1)} aria-label={t('sw.pw.prev')}>
                            <Icon name="prev" />
                          </button>
                          <span className="sw-pw-count">
                            {(picks[role] ?? 0) + 1} / {n}
                          </span>
                          <button type="button" className="sw-icon-btn" onClick={() => cycle(role, 1)} aria-label={t('sw.pw.next')}>
                            <Icon name="next" />
                          </button>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="sw-pw-note">
              {t('sw.pw.how')}
              {hadChords ? ' ' + t('sw.pw.replace') : ''}
            </p>
            <div className="sw-pw-actions">
              <button type="button" className={'sw-btn' + (audio.playing?.scope === 'pw:all' ? ' is-on' : '')} onClick={hearAll}>
                <Icon name={audio.playing?.scope === 'pw:all' ? 'stop' : 'play'} />
                {audio.playing?.scope === 'pw:all' ? t('sw.stop') : t('sw.pw.hearAll')}
              </button>
              <button
                type="button"
                className="sw-btn is-primary"
                onClick={() => {
                  stopAudio();
                  onApply(built());
                }}
              >
                <Icon name="check" />
                {t('sw.pw.apply')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

