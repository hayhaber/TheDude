import { useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Switch } from '../ui/controls';
import { LineIcon } from '../LineIcon/LineIcon';
import { setCardOrder, setCardShown, useHomeCards } from './homeCards';
import './HomeCards.css';

// The home cards as an iOS list: a switch per card (show / hide) and, in the
// home screen's Edit sheet, a grip to drag it to another place (v1.0.206).
const LOOK = {
  guitar: ['#ff9500', 'guitarpro'],
  piano: ['#007aff', 'pianoChords'],
  bass: ['#34c759', 'practice'],
  vocal: ['#ff2d55', 'vocal'],
  stage: ['#5856d6', 'stage'],
  songwriter: ['#af52de', 'lyrics'],
  tools: ['#8e8e93', 'metronome'],
};

export function HomeCardsList({ reorder = false }) {
  const { t } = useLanguage();
  const cards = useHomeCards();
  const [order, setOrder] = useState(null); // while dragging
  const shown = order ?? cards.ordered;
  const orderRef = useRef(null);
  const [dragKey, setDragKey] = useState(null);

  const startDrag = (e, key) => {
    e.preventDefault();
    const rowH = e.currentTarget.closest('li')?.offsetHeight || 52;
    let y0 = e.clientY;
    orderRef.current = [...cards.ordered];
    setOrder(orderRef.current);
    setDragKey(key);
    const move = (ev) => {
      const list = orderRef.current;
      const from = list.indexOf(key);
      const dy = ev.clientY - y0;
      const to = Math.max(0, Math.min(list.length - 1, from + (dy > rowH / 2 ? 1 : dy < -rowH / 2 ? -1 : 0)));
      if (to !== from) {
        const next = [...list];
        next.splice(from, 1);
        next.splice(to, 0, key);
        orderRef.current = next;
        setOrder(next);
        y0 += (to - from) * rowH;
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      setCardOrder(orderRef.current);
      setOrder(null);
      setDragKey(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const onlyOne = cards.visible.length <= 1;
  return (
    <ul className="hc-list">
      {shown.map((key) => {
        const on = !cards.hidden.includes(key) && cards.visible.includes(key);
        const [color, icon] = LOOK[key] ?? ['#8e8e93', 'settings'];
        return (
          <li key={key} className={'hc-row' + (dragKey === key ? ' is-drag' : '') + (on ? '' : ' is-off')}>
            {reorder && (
              <span className="hc-grip" onPointerDown={(e) => startDrag(e, key)} role="button" aria-label={t('home.cards.drag')} title={t('home.cards.drag')}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path d="M5 8h14M5 12h14M5 16h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
            )}
            <span className="hc-tile" style={{ background: color }} aria-hidden="true">
              <LineIcon name={icon} size={18} />
            </span>
            <span className="hc-name">{t(`home.${key}.title`)}</span>
            <Switch checked={on} disabled={on && onlyOne} onChange={(v) => setCardShown(key, v)} aria-label={t(`home.${key}.title`)} />
          </li>
        );
      })}
    </ul>
  );
}
