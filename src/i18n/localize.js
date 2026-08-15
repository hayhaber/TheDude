// Picks the current language out of a bilingual content-file field
// ({ en, he }), falling back to English. Plain strings pass through
// untouched — lets fields be migrated to bilingual one at a time without
// breaking call sites that haven't been converted yet.
export function localize(value, lang) {
  if (value == null || typeof value === 'string') return value;
  return value[lang] ?? value.en;
}
