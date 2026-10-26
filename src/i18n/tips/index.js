// Extra text files kept apart from strings.js (one file per area, so
// parallel work never collides), looked up by t() after STRINGS:
// ⓘ explanations ('tip.<area>.<name>') and newer feature areas.
import { TIPS_COMPOSE } from './compose';
import { TIPS_PRACTICE } from './practice';
import { TIPS_TOOLS } from './tools';
import { TIPS_PROFILE } from './profile';
import { TIPS_COACH } from './coach';
import { TIPS_MINUTE } from './minute';
import { TIPS_TRAINER2 } from './trainer2';
import { TIPS_GPX } from './gpx';
import { TIPS_ACHIEVE } from './achieve';
import { TIPS_AMP } from './amp';
import { TIPS_TRAINERX } from './trainerx';
import { TIPS_NOISE } from './noise';
import { TIPS_TUNING } from './tuning';
import { TIPS_CHALLENGE } from './challenge';
import { TIPS_CHORDLIB } from './chordlib';
import { TIPS_CHORDBUILDER } from './chordbuilder';
import { TIPS_INSTALL } from './install';
import { TIPS_CLOUD } from './cloud';
import { TIPS_TEACHER } from './teacher';
import { TIPS_BASSPRACTICE } from './basspractice';
import { TIPS_SONGWRITER } from './songwriter';

const ALL = [TIPS_COMPOSE, TIPS_PRACTICE, TIPS_TOOLS, TIPS_PROFILE, TIPS_COACH, TIPS_MINUTE, TIPS_TRAINER2, TIPS_GPX, TIPS_ACHIEVE, TIPS_AMP, TIPS_TRAINERX, TIPS_NOISE, TIPS_TUNING, TIPS_CHALLENGE, TIPS_CHORDLIB, TIPS_CHORDBUILDER, TIPS_INSTALL, TIPS_CLOUD, TIPS_TEACHER, TIPS_BASSPRACTICE, TIPS_SONGWRITER];

export const TIPS = {
  en: Object.assign({}, ...ALL.map((x) => x.en)),
  he: Object.assign({}, ...ALL.map((x) => x.he)),
};
