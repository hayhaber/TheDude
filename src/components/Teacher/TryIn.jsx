import { useLanguage } from '../../i18n/LanguageContext';
import { launch } from '../../coach/launchBus';
import { LibraryRow } from '../PracticeView/PracticeHome';
import '../PracticeView/PracticeHome.css';

// "Try it in…" rows (stage 6): a launchBus spec -> an iOS list row.
const LOOK = {
  chordLibrary: { icon: 'chords', color: '#AF52DE' },
  minuteChanges: { icon: 'stopwatch', color: '#AF52DE' },
  chordChanges: { icon: 'changes', color: '#FF9500' },
  drill: { icon: 'hand', color: '#30B0C7' },
  lick: { icon: 'note', color: '#007AFF' },
  lesson: { icon: 'teacher', color: '#FF2D55' },
};

function rowText(spec, t) {
  switch (spec.tool) {
    case 'chordLibrary':
      return [t('try.chord', { name: spec.name }), t('try.chordDesc')];
    case 'minuteChanges':
      return [t('try.minute', { a: spec.chords[0], b: spec.chords[1] }), t('try.minuteDesc')];
    case 'chordChanges':
      return [t('try.changes'), t('try.changesDesc')];
    case 'drill':
      return [t('try.drills'), t('try.drillsDesc')];
    case 'lick':
      return [t('try.lick'), t(spec.kind === 'tap' ? 'try.lickTapDesc' : 'try.lickArpDesc')];
    case 'lesson':
      return [t('try.lesson'), spec.title];
    default:
      return [spec.tool, null];
  }
}

export function TryIn({ specs, title = true, className = '' }) {
  const { t } = useLanguage();
  if (!specs?.length) return null;
  return (
    <section className={'try-in ' + className}>
      {title && <h3 className="try-in-title">{t('try.title')}</h3>}
      <div className="ph-group try-in-group">
        {specs.map((spec, k) => {
          const [main, desc] = rowText(spec, t);
          const look = LOOK[spec.tool] ?? LOOK.drill;
          return <LibraryRow key={k} color={look.color} icon={look.icon} title={main} desc={desc} onClick={() => launch(spec)} />;
        })}
      </div>
    </section>
  );
}
