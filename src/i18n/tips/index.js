// Extra text files kept apart from strings.js (one file per area, so
// parallel work never collides), looked up by t() after STRINGS:
// ⓘ explanations ('tip.<area>.<name>') and newer feature areas.
import { TIPS_COMPOSE } from './compose';
import { TIPS_PRACTICE } from './practice';
import { TIPS_TOOLS } from './tools';
import { TIPS_PROFILE } from './profile';
import { TIPS_COACH } from './coach';
import { TIPS_MINUTE } from './minute';

const ALL = [TIPS_COMPOSE, TIPS_PRACTICE, TIPS_TOOLS, TIPS_PROFILE, TIPS_COACH, TIPS_MINUTE];

export const TIPS = {
  en: Object.assign({}, ...ALL.map((x) => x.en)),
  he: Object.assign({}, ...ALL.map((x) => x.he)),
};
