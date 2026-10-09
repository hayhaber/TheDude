import { useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useVocalMic } from '../../hooks/useVocalMic';
import { CATEGORIES, EXERCISES, buildReps, dailyWorkout, exerciseById } from '../../music/vocal/exercises';
import { DEFAULT_RANGE, comfortRange, loadRange, midiName, rangeAgeDays, voiceOf } from '../../music/vocal/voiceRange';
import {
  exerciseStats,
  lastWeek,
  loadLevel,
  loadProgress,
  recordWorkout,
  saveLevel,
  streak,
  dayKey,
} from '../../music/vocal/vocalProgress';
import { VocalRunner } from './VocalRunner';
import { RangeTest } from './RangeTest';
import { RangeBar } from './RangeBar';
import './VocalTrainingView.css';

// Vocal section: a daily workout and an exercise library in the singer's own
// range (piano call, voice response, feedback per note). Self-contained —
// its own mic pipeline, never the shared Stage fretboard/keys.

function estimateMinutes(ids, range, level) {
  let s = 0;
  for (const id of ids) {
    const ex = exerciseById(id);
    for (const r of buildReps(ex, range, { level })) s += r.cueLength + r.length + 1.4;
    s += 20; // reading the how-to
  }
  return Math.max(1, Math.round(s / 60));
}

export function VocalTrainingView() {
  const { t, lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const mic = useVocalMic();
  const [screen, setScreen] = useState({ name: 'home' });
  const [range, setRange] = useState(() => loadRange());
  // "Skip" on the first range test: typical range for this visit only.
  const [skipped, setSkipped] = useState(false);
  const [level, setLevelState] = useState(loadLevel);
  const [progress, setProgress] = useState(loadProgress);
  const useRange = range ?? DEFAULT_RANGE;

  const workout = useMemo(() => dailyWorkout(level), [level]);
  const minutes = useMemo(() => estimateMinutes(workout, useRange, level), [workout, useRange, level]);
  const week = lastWeek(progress);
  const days = streak(progress);
  const weekScores = week.map((d) => d.score).filter((x) => x != null);
  const weekAvg = weekScores.length ? Math.round(weekScores.reduce((a, b) => a + b, 0) / weekScores.length) : null;
  const doneToday = progress.workouts?.includes(dayKey());
  const maxMin = Math.max(5, ...week.map((d) => d.minutes));

  const setLevel = (lv) => {
    setLevelState(lv);
    saveLevel(lv);
  };
  // Practice needs the singer's range first (a teacher's first lesson).
  const open = (next) => {
    if (!range && !skipped) setScreen({ name: 'range', then: next });
    else setScreen(next);
  };
  const goHome = () => {
    mic.stop();
    setProgress(loadProgress());
    setScreen({ name: 'home' });
  };

  if (screen.name === 'range') {
    return (
      <div className="vocal-training-view" dir={dir}>
        <RangeTest
          mic={mic}
          first={!!screen.then}
          onCancel={goHome}
          onSkip={
            screen.then
              ? () => {
                  setSkipped(true);
                  setScreen(screen.then);
                }
              : null
          }
          onDone={(r) => {
            setRange(r);
            if (screen.then) setScreen(screen.then);
            else goHome();
          }}
        />
      </div>
    );
  }

  if (screen.name === 'run') {
    const queue = screen.queue;
    const id = queue ? queue[screen.index] : screen.id;
    const ex = exerciseById(id);
    const isLast = queue ? screen.index === queue.length - 1 : true;
    return (
      <div className="vocal-training-view" dir={dir}>
        <VocalRunner
          key={`${id}-${screen.index ?? 0}`}
          ex={ex}
          range={useRange}
          level={level}
          mic={mic}
          step={queue ? { index: screen.index, count: queue.length } : null}
          onBack={goHome}
          isLast={isLast}
          onNext={
            queue
              ? () => {
                  if (isLast) {
                    recordWorkout();
                    goHome();
                  } else setScreen({ ...screen, index: screen.index + 1 });
                }
              : null
          }
        />
      </div>
    );
  }

  const voice = voiceOf(range);
  const comfort = range ? comfortRange(range) : null;
  const age = rangeAgeDays(range);

  return (
    <div className="vocal-training-view" dir={dir}>
      <header className="vocal-header">
        <div>
          <h1>{t('vocal.title')}</h1>
          <p className="subtitle">{t('vocal.subtitle')}</p>
        </div>
        <div className="mode-toggle" role="group" aria-label={t('vocal.level')}>
          {[1, 2].map((lv) => (
            <button key={lv} type="button" className={level === lv ? 'active' : ''} onClick={() => setLevel(lv)}>
              {t(`vocal.level${lv}`)}
            </button>
          ))}
        </div>
      </header>

      <div className="vocal-overview">
        <section className="vocal-card vocal-today">
          <span className="vocal-eyebrow">{t('vocal.today')}</span>
          <h2>{doneToday ? t('vocal.doneToday') : t('vocal.minutes', { n: minutes })}</h2>
          <ol className="vocal-today-list">
            {workout.map((id) => (
              <li key={id}>{t(`vocal.ex.${id}.title`)}</li>
            ))}
          </ol>
          <button type="button" className="primary vocal-cta" onClick={() => open({ name: 'run', queue: workout, index: 0 })}>
            {t('vocal.start')}
          </button>
        </section>

        <section className="vocal-card vocal-voice">
          <span className="vocal-eyebrow">{t('vocal.yourVoice')}</span>
          {range ? (
            <>
              <h2>{voice ? t(`vocal.voice.${voice}`) : '–'}</h2>
              <p className="vocal-range-notes">
                {midiName(comfort.low)} – {midiName(comfort.high)}
              </p>
              <RangeBar low={range.low} high={range.high} comfortLow={comfort.low} comfortHigh={comfort.high} compact />
              {age != null && age >= 60 && <p className="vocal-muted">{t('vocal.range.old', { n: age })}</p>}
            </>
          ) : (
            <>
              <h2>{t('vocal.noRange')}</h2>
              <p className="vocal-muted">{t('vocal.noRangeHint')}</p>
            </>
          )}
          <button type="button" className={range ? 'vocal-cta' : 'primary vocal-cta'} onClick={() => setScreen({ name: 'range' })}>
            {t('vocal.test')}
          </button>
        </section>

        <section className="vocal-card vocal-progress">
          <span className="vocal-eyebrow">{t('vocal.progress')}</span>
          <h2>{days ? t('vocal.streak', { n: days }) : t('vocal.noStreak')}</h2>
          <div className="vocal-week" dir="ltr" aria-label={t('vocal.week')}>
            {week.map((d) => (
              <div key={d.day} className={'vocal-week-day' + (d.day === dayKey() ? ' is-today' : '')} title={`${d.minutes}′`}>
                <span className="vocal-week-bar" style={{ height: `${d.minutes ? Math.max(8, (d.minutes / maxMin) * 100) : 0}%` }} />
              </div>
            ))}
          </div>
          <p className="vocal-muted">{weekAvg != null ? t('vocal.avgScore', { n: weekAvg }) : t('vocal.noScores')}</p>
        </section>
      </div>

      <h2 className="vocal-section-title">{t('vocal.library')}</h2>
      <div className="vocal-library">
        {CATEGORIES.map((cat) => {
          const list = EXERCISES.filter((e) => e.category === cat && e.level <= level);
          if (!list.length) return null;
          return (
            <section key={cat} className="vocal-card vocal-cat">
              <h3>{t(`vocal.cat.${cat}`)}</h3>
              {list.map((ex) => {
                const st = exerciseStats(progress, ex.id);
                return (
                  <button key={ex.id} type="button" className="vocal-row" onClick={() => open({ name: 'run', id: ex.id })}>
                    <span className="vocal-row-text">
                      <strong>{t(`vocal.ex.${ex.id}.title`)}</strong>
                      <span>{t(`vocal.ex.${ex.id}.desc`)}</span>
                    </span>
                    <span className="vocal-row-meta">
                      {ex.level === 2 && <em>{t('vocal.level2')}</em>}
                      {st && <b>{t('vocal.best', { n: st.best })}</b>}
                      <span className="vocal-chevron" aria-hidden="true">
                        ›
                      </span>
                    </span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>

      <p className="vocal-tipline">{t('vocal.headphones')}</p>
    </div>
  );
}
