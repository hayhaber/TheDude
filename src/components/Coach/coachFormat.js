// Formatting shared by the coach page and the banner.

/** {en, he} -> the current language's text (plain strings pass through). */
export function pick(text, lang) {
  if (text == null) return '';
  if (typeof text === 'string') return text;
  return text[lang] ?? text.en ?? '';
}

/** A measured value in its unit: 32/min, 85 %, 82. */
export function formatValue(measure, value, t) {
  if (!Number.isFinite(value)) return '—';
  const v = Math.round(value);
  switch (measure?.field) {
    case 'perMinute':
      return `${v}${t('coach.unit.perMin')}`;
    case 'accuracyPct':
      return `${v}%`;
    default:
      return String(v);
  }
}

/** The target of a measure ("30/min", "90% @ 75 BPM"), or '' when it has none. */
export function formatTarget(measure, t) {
  if (!measure || !Number.isFinite(measure.target)) return '';
  const base = formatValue(measure, measure.target, t);
  return measure.bpm ? `${base} @ ${measure.bpm} BPM` : base;
}

/** m:ss */
export function clock(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatDate(isoOrMs, lang, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (isoOrMs == null) return '';
  // 'YYYY-MM-DD' is a local date: build it at local noon (no time-zone slip).
  const d =
    typeof isoOrMs === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(isoOrMs)
      ? new Date(Number(isoOrMs.slice(0, 4)), Number(isoOrMs.slice(5, 7)) - 1, Number(isoOrMs.slice(8, 10)), 12)
      : new Date(isoOrMs);
  try {
    return d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', opts);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
