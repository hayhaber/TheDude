import { useMemo, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useVocalMic } from '../../hooks/useVocalMic';
import { EXERCISES, buildReps, dailyWorkout, exerciseById } from '../../music/vocal/exercises';
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
import { LibraryRow } from '../PracticeView/PracticeHome';
import { LineIcon } from '../LineIcon/LineIcon';
import { MoreMenu } from '../MoreMenu/MoreMenu';
import { RangeTest } from './RangeTest';
import { RangeBar } from './RangeBar';
import { VocalEarTraining } from './VocalEarTraining';
import './VocalTrainingView.css';

// Vocal section: a daily workout and an exercise library in the singer's own
// range (piano call, voice response, feedback per note). Self-contained —
// its own mic pipeline, never the shared Stage fretboard/keys.

// Library look: Apple system colours + one icon per group (rows as in
// Practice / Theory). Create comes right after the warm-up's neighbours so
// it isn't buried at the bottom.
const CATEGORY_ORDER = ['warmup', 'pitch', 'scales', 'create', 'ear', 'agility', 'range'];
const CATEGORY_LOOK = {
  warmup: { color: '#FF9500', icon: 'vocal' },
  pitch: { color: '#007AFF', icon: 'note' },
  scales: { color: '#34C759', icon: 'falling' },
  agility: { color: '#AF52DE', icon: 'stopwatch' },
  range: { color: '#FF3B30', icon: 'bend' },
  ear: { color: '#30B0C7', icon: 'ear' },
  create: { color: '#FF2D55', icon: 'create' },
};
const EXERCISE_ICON = { siren: 'bend', ngSlide: 'bend', vibrato: 'changes', echo: 'play', harmony: 'chords', harmonyLow: 'chords', answer: 'idea', scat: 'improvise' };

function estimateMinutes(ids, range, level) {
  let s = 0;
  for (const id of ids) {
    const ex = exerciseById(id);
    for (const r of buildReps(ex, range, { level })) s += r.cueLength + r.length + 1.4;
    s += 20; // reading the how-to
  }
  return Math.max(1, Math.round(s / 60));
}

// `initialScreen` 'ear' = opened from the Singing card's Ear Training.
export function VocalTrainingView({ initialScreen = 'home' }) {
  const { t, lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const mic = useVocalMic();
  const [screen, setScreen] = useState(() => ({ name: initialScreen === 'ear' ? 'ear' : 'home' }));
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

  if (screen.name === 'ear') {
    return (
      <div className="vocal-training-view" dir={dir}>
        <VocalEarTraining
          range={useRange}
          onBack={goHome}
          // Sing back = the 'echo' exercise; its Back returns here.
          onSingBack={() => open({ name: 'run', id: 'echo', back: { name: 'ear' } })}
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
          onBack={
            screen.back
              ? () => {
                  mic.stop();
                  setProgress(loadProgress());
                  setScreen(screen.back);
                }
              : goHome
          }
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
  const hasHistory = progress.results.length > 0;
  const workoutNames = workout.map((id) => t(`vocal.ex.${id}.title`)).join(' · ');

  return (
    <div className="vocal-training-view vocal-home" dir={dir}>
      <header className="vocal-header">
        <div className="vocal-header-text">
          <h1>{t('vocal.title')}</h1>
          <p className="subtitle">{t('vocal.subtitle')}</p>
        </div>
        <MoreMenu label={t('vocal.h.more')}>
          {(close) => (
            <>
              <div className="vocal-menu-label">{t('vocal.h.level')}</div>
              <div className="mode-toggle" role="group" aria-label={t('vocal.level')}>
                {[1, 2].map((lv) => (
                  <button key={lv} type="button" className={level === lv ? 'active' : ''} onClick={() => setLevel(lv)}>
                    {t(`vocal.level${lv}`)}
                  </button>
                ))}
              </div>
              <p className="vocal-menu-note">{t('tip.tools.vocalLevel')}</p>
              <button
                type="button"
                className="more-menu-item"
                onClick={() => {
                  close();
                  setScreen({ name: 'range' });
                }}
              >
                {t('vocal.h.retest')}
              </button>
            </>
          )}
        </MoreMenu>
      </header>

      {/* Today: one hero, one primary action. */}
      <section className="vocal-hero">
        <span className="vocal-hero-tile" aria-hidden="true">
          <LineIcon name="vocal" size={24} strokeWidth={1.9} />
        </span>
        <div className="vocal-hero-text">
          <h2>{t('vocal.today')}</h2>
          <p className="vocal-hero-caption">
            {doneToday ? t('vocal.h.doneCaption') : t('vocal.h.caption', { n: workout.length, m: minutes })}
          </p>
          <p className="vocal-hero-list" dir="auto">
            {workoutNames}
          </p>
        </div>
        <button type="button" className="vocal-capsule" onClick={() => open({ name: 'run', queue: workout, index: 0 })}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="vocal-capsule-play">
            <path d="M7 4.8v14.4L19 12z" fill="currentColor" />
          </svg>
          {doneToday ? t('vocal.again') : t('vocal.start')}
        </button>
      </section>

      <div className="vocal-home-cols">
        <section className="ph-section">
          <h2 className="ph-section-title">{t('vocal.yourVoice')}</h2>
          <div className="ph-group">
            <LibraryRow
              color="#5856D6"
              icon="tuner"
              title={range ? (voice ? t(`vocal.voice.${voice}`) : '–') : t('vocal.h.findRange')}
              desc={range ? t('vocal.h.rangeDesc', { low: midiName(comfort.low), high: midiName(comfort.high) }) : t('vocal.noRangeHint')}
              tag={range && age != null && age >= 60 ? t('vocal.h.retestTag') : null}
              onClick={() => setScreen({ name: 'range' })}
            />
            {range && (
              <div className="vocal-range-row">
                <RangeBar low={range.low} high={range.high} comfortLow={comfort.low} comfortHigh={comfort.high} compact />
              </div>
            )}
          </div>
        </section>

        {hasHistory && (
          <section className="ph-section">
            <h2 className="ph-section-title">{t('vocal.progress')}</h2>
            <div className="ph-group">
              <div className="vocal-stat-row">
                <span className="ph-tile" style={{ background: '#34C759' }} aria-hidden="true">
                  <LineIcon name="stopwatch" size={19} strokeWidth={1.9} />
                </span>
                <span className="ph-text">
                  <span className="ph-title">{days ? t('vocal.streak', { n: days }) : t('vocal.noStreak')}</span>
                  <span className="ph-desc">{weekAvg != null ? t('vocal.avgScore', { n: weekAvg }) : t('vocal.noScores')}</span>
                </span>
                <span className="vocal-week" dir="ltr" aria-label={t('vocal.week')}>
                  {week.map((d) => (
                    <span key={d.day} className={'vocal-week-day' + (d.day === dayKey() ? ' is-today' : '')} title={`${d.minutes}′`}>
                      <span className="vocal-week-bar" style={{ height: `${d.minutes ? Math.max(12, (d.minutes / maxMin) * 100) : 0}%` }} />
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="vocal-library">
        {CATEGORY_ORDER.map((cat) => {
          const list = EXERCISES.filter((e) => e.category === cat && e.level <= level);
          if (!list.length) return null;
          const look = CATEGORY_LOOK[cat];
          return (
            <section key={cat} className={'ph-section vocal-sec is-' + cat}>
              <h2 className="ph-section-title">{t(`vocal.cat.${cat}`)}</h2>
              {cat === 'create' && <p className="vocal-cat-lead">{t('vocal.h.createLead')}</p>}
              <div className="ph-group">
                {cat === 'ear' && (
                  <LibraryRow color={look.color} icon="ear" title={t('vocal.ear.title')} desc={t('vocal.ear.rowDesc')} onClick={() => setScreen({ name: 'ear' })} />
                )}
                {list.map((ex) => {
                  const st = exerciseStats(progress, ex.id);
                  return (
                    <LibraryRow
                      key={ex.id}
                      color={look.color}
                      icon={EXERCISE_ICON[ex.id] ?? look.icon}
                      title={t(`vocal.ex.${ex.id}.title`)}
                      desc={t(`vocal.ex.${ex.id}.desc`)}
                      tag={st ? t('vocal.best', { n: st.best }) : ex.level === 2 ? t('vocal.level2') : null}
                      tagTone={st ? 'neutral' : null}
                      onClick={() => open({ name: 'run', id: ex.id })}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="vocal-tipline">{t('vocal.headphones')}</p>
    </div>
  );
}
