// The ⓘ explanation texts, kept apart from strings.js (one file per area)
// and looked up by t() after STRINGS. Keys: 'tip.<area>.<name>'.
import { TIPS_COMPOSE } from './compose';
import { TIPS_PRACTICE } from './practice';
import { TIPS_TOOLS } from './tools';

export const TIPS = {
  en: { ...TIPS_COMPOSE.en, ...TIPS_PRACTICE.en, ...TIPS_TOOLS.en },
  he: { ...TIPS_COMPOSE.he, ...TIPS_PRACTICE.he, ...TIPS_TOOLS.he },
};
