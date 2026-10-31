// First run, once per profile: name + language, instrument, level, goals,
// and (guitarists who already play) a short mic check of the chords they
// know. Ends on one clear next step. Answers: onboarding/onboardingState.js.
import { useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { AppLogo } from '../AppLogo/AppLogo';
import { activeProfile, renameProfile } from '../../profile/profileStorage';
import { CHECK_CHORDS, GOALS, INSTRUMENTS, LEVELS, MINUTES, STYLES, finishOnboarding, skipOnboarding } from '../../onboarding/onboardingState';
import { getTeacher } from '../../teacher/teacherState';
import { nextLesson } from '../../teacher/mastery';
import { ChordStep } from '../Teacher/LessonPlayer';
import { useLeftHanded } from '../Fretboard/handedness';
import '../ModeToggle/ModeToggle.css';
import '../Teacher/Teacher.css';
import './Onboarding.css';

const ART = {
  guitar: '/home/guitar-lp.webp',
  piano: '/home/piano-grand.webp',
  bass: '/home/bass-pb2.webp',
  vocal: '/home/vocal-mic4.webp',
};

export function Onboarding({ onDone }) {
  const { t, lang, setLang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const [leftHanded] = useLeftHanded();
  const [name, setName] = useState(() => activeProfile()?.name ?? '');
  const [a, setA] = useState({ instrument: null, level: null, goals: [], style: 'pop', minutes: 20, heard: [] });
  const [step, setStep] = useState('welcome');
  const [checking, setChecking] = useState(null); // chord being checked
  const [result, setResult] = useState(null); // after finish: {lesson}
  const set = (patch) => setA((x) => ({ ...x, ...patch }));
  const tx = (x) => (x ? x[lang] ?? x.en : '');

  const withCheck = a.instrument === 'guitar' && a.level && a.level !== 'new';
  const steps = useMemo(() => ['welcome', 'instrument', 'level', 'goals', ...(withCheck ? ['check'] : [])], [withCheck]);
  const at = steps.indexOf(step);

  const lv = (key, part) => {
    const k = `onb.level.${a.instrument}.${key}.${part}`;
    const v = t(k);
    return v === k ? t(`onb.level.guitar.${key}.${part}`) : v;
  };

  const finish = () => {
    if (name.trim() && name.trim() !== (activeProfile()?.name ?? '')) {
      const p = activeProfile();
      if (p) renameProfile(p.id, name);
    }
    const v = finishOnboarding(a);
    if (v.instrument === 'guitar') {
      const lesson = nextLesson(getTeacher());
      setResult({ lesson: lesson?.steps ? lesson : null });
    } else setResult({});
    setStep('done');
  };

  const next = () => {
    if (at < steps.length - 1) setStep(steps.at(at + 1));
    else finish();
  };
  const back = () => at > 0 && setStep(steps.at(at - 1));
  const canNext = step === 'instrument' ? !!a.instrument : step === 'level' ? !!a.level : step === 'goals' ? a.goals.length > 0 : true;

  const skip = () => {
    skipOnboarding();
    onDone({ action: 'home', card: 'guitar' });
  };

  let body = null;
  if (step === 'welcome') {
    body = (
      <>
        <div className="onb-logo">
          <AppLogo size={56} />
        </div>
        <h1>{t('onb.welcome.title')}</h1>
        <p className="onb-lead">{t('onb.welcome.text')}</p>
        <label className="onb-field">
          <span>{t('onb.welcome.name')}</span>
          <input type="text" dir="auto" value={name} maxLength={40} placeholder={t('onb.welcome.namePh')} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="onb-field">
          <span>{t('languageToggle.label')}</span>
          <div className="mode-toggle" role="group" dir="ltr">
            <button type="button" className={lang === 'he' ? 'active' : ''} onClick={() => setLang('he')}>
              עברית
            </button>
            <button type="button" className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>
              English
            </button>
          </div>
        </div>
      </>
    );
  } else if (step === 'instrument') {
    body = (
      <>
        <h1>{t('onb.instrument.title')}</h1>
        <p className="onb-lead">{t('onb.instrument.text')}</p>
        <div className="onb-tiles">
          {INSTRUMENTS.map((k) => (
            <button
              key={k}
              type="button"
              className={'onb-tile' + (a.instrument === k ? ' is-on' : '')}
              aria-pressed={a.instrument === k}
              onClick={() => set({ instrument: k, goals: [], heard: [] })}
            >
              <span className={'onb-tile-art is-' + k}>
                <img src={ART[k]} alt="" draggable="false" />
              </span>
              <span className="onb-tile-name">{t(`onb.instrument.${k}`)}</span>
            </button>
          ))}
        </div>
      </>
    );
  } else if (step === 'level') {
    body = (
      <>
        <h1>{t('onb.level.title')}</h1>
        <p className="onb-lead">{t('onb.level.text')}</p>
        <div className="onb-rows">
          {LEVELS.map((k) => (
            <button key={k} type="button" className={'onb-row' + (a.level === k ? ' is-on' : '')} aria-pressed={a.level === k} onClick={() => set({ level: k })}>
              <strong>{lv(k, 'title')}</strong>
              <span>{lv(k, 'sub')}</span>
            </button>
          ))}
        </div>
      </>
    );
  } else if (step === 'goals') {
    const list = GOALS[a.instrument] ?? GOALS.guitar;
    const toggle = (g) => set({ goals: a.goals.includes(g) ? a.goals.filter((x) => x !== g) : [...a.goals, g] });
    body = (
      <>
        <h1>{t('onb.goals.title')}</h1>
        <p className="onb-lead">{t('onb.goals.text')}</p>
        <div className="onb-chips">
          {list.map((g) => (
            <button key={g} type="button" className={'onb-chip' + (a.goals.includes(g) ? ' is-on' : '')} aria-pressed={a.goals.includes(g)} onClick={() => toggle(g)}>
              {t(`onb.goal.${g}`)}
            </button>
          ))}
        </div>
        <div className="onb-pair">
          <label className="onb-field">
            <span>{t('onb.goals.style')}</span>
            <select value={a.style} onChange={(e) => set({ style: e.target.value })}>
              {STYLES.map((x) => (
                <option key={x} value={x}>
                  {t(`teacher.style.${x}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="onb-field">
            <span>{t('onb.goals.minutes')}</span>
            <select value={a.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })}>
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {t('teacher.min', { n: m })}
                </option>
              ))}
            </select>
          </label>
        </div>
      </>
    );
  } else if (step === 'check') {
    body = (
      <>
        <h1>{t('onb.check.title')}</h1>
        <p className="onb-lead">{t('onb.check.text')}</p>
        <div className="onb-chips" dir="ltr">
          {CHECK_CHORDS.map((c) => (
            <button
              key={c}
              type="button"
              className={'onb-chip is-chord' + (checking === c ? ' is-on' : '') + (a.heard.includes(c) ? ' is-heard' : '')}
              aria-pressed={checking === c}
              onClick={() => setChecking(c)}
            >
              {a.heard.includes(c) ? '✓ ' : ''}
              {c}
            </button>
          ))}
        </div>
        {checking ? (
          <div className="onb-check tc-card">
            <ChordStep
              key={checking}
              step={{ chord: checking, text: { en: t('onb.check.play', { chord: checking }), he: t('onb.check.play', { chord: '⁦' + checking + '⁩' }) } }}
              tx={tx}
              leftHanded={leftHanded}
              passed={a.heard.includes(checking)}
              onPass={() => setA((x) => (x.heard.includes(checking) ? x : { ...x, heard: [...x.heard, checking] }))}
            />
          </div>
        ) : (
          <p className="onb-hint">{t('onb.check.pick')}</p>
        )}
        {a.heard.length > 0 && <p className="onb-heard">{t('onb.check.heard', { n: a.heard.length })}</p>}
      </>
    );
  } else if (step === 'done') {
    const isGuitar = a.instrument === 'guitar';
    const lesson = result?.lesson;
    body = (
      <>
        <div className="onb-done-mark" aria-hidden="true">
          ✓
        </div>
        <h1>{t('onb.done.title', { name: name.trim() || t('profile.defaultName') })}</h1>
        {isGuitar && lesson ? (
          <div className="onb-next">
            <span className="onb-eyebrow">{t('onb.done.first')}</span>
            <strong>{tx(lesson.title)}</strong>
            {lesson.minutes ? <span className="onb-muted">{t('teacher.next.min', { n: lesson.minutes })}</span> : null}
          </div>
        ) : isGuitar ? (
          <p className="onb-lead">{t('onb.done.plan')}</p>
        ) : (
          <p className="onb-lead">{t(`onb.done.${a.instrument}`)}</p>
        )}
      </>
    );
  }

  const isGuitar = a.instrument === 'guitar';
  const startAction = step === 'done' ? (isGuitar ? (result?.lesson ? 'lesson' : 'coach') : 'home') : null;
  const card = a.instrument === 'guitar' ? (a.level === 'songs' ? 'guitar' : 'teacher') : a.instrument;

  return (
    <div className="onb" dir={dir}>
      <div className="onb-card">
        {step !== 'done' && (
          <div className="onb-top">
            <div className="onb-dots" aria-hidden="true">
              {steps.map((s, i) => (
                <span key={s} className={i <= at ? 'is-on' : ''} />
              ))}
            </div>
            <button type="button" className="onb-skip" onClick={skip}>
              {t('onb.skip')}
            </button>
          </div>
        )}
        <div className="onb-body" key={step}>
          {body}
        </div>
        <div className="onb-actions">
          {step === 'done' ? (
            <>
              <button type="button" className="onb-btn is-quiet" onClick={() => onDone({ action: 'home', card })}>
                {t('onb.home')}
              </button>
              <button type="button" className="onb-btn is-primary" onClick={() => onDone({ action: startAction, card })}>
                {t('onb.start')}
              </button>
            </>
          ) : (
            <>
              {at > 0 ? (
                <button type="button" className="onb-btn is-quiet" onClick={back}>
                  {t('onb.back')}
                </button>
              ) : (
                <span />
              )}
              <button type="button" className="onb-btn is-primary" disabled={!canNext} onClick={next}>
                {step === 'check' ? t('onb.finish') : t('onb.next')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
