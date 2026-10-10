// The coach's goal catalog. Each goal is a MEASURABLE target with a ladder
// of rungs (intermediate targets), the test that measures it, and the
// practice blocks that move it — taken from qualified teachers' methods:
//   • One-minute changes, ≥30/min to move on, 60/min = mastered
//     (JustinGuitar, justinguitar.com/guitar-lessons/one-minute-changes-exercise-b1-110)
//   • "Chord Perfect" / anchor fingers / move the shape as a block (JustinGuitar)
//   • Barre chords: fingers first, roll the barre, pull the arm back (JustinGuitar F chord)
//   • Accuracy before speed; 5 clean reps before raising the tempo
//     (Duke via Music Mark; Molly Gebrian), +4–5 % steps (Eastman School)
//   • Minor pentatonic pattern 1 first, in a musical context; exam tempos
//     70 → 100 BPM (Rockschool syllabus, JustinGuitar)
//   • Bending: play the target fret first, then bend to match it
//     (Fundamental Changes)
//   • Ear: perfect 4th, 5th and octave first (JustinGuitar Ear Training)
// Weeks per rung are ESTIMATES (no qualified source publishes a table) at a
// reference of 30 min/day, 6 days/week, half of it on the goal; the engine
// scales them to the student's real time.
//
// Text is inline {en, he} (like music/drills.js).

export const REF_WEEKLY_GOAL_MIN = 30 * 6 * 0.5; // minutes/week on the goal at the reference

const L = (en, he) => ({ en, he });

// Chord sets for the changes goal (open chords, the order teachers use).
export const CHORD_SETS = [
  { key: 'ADE', chords: ['A', 'D', 'E'], label: L('A · D · E', 'A · D · E') },
  { key: 'GCD', chords: ['G', 'C', 'D'], label: L('G · C · D', 'G · C · D') },
  { key: 'minor', chords: ['Am', 'Em', 'Dm'], label: L('Am · Em · Dm', 'Am · Em · Dm') },
  { key: 'pop', chords: ['G', 'D', 'Em', 'C'], label: L('G · D · Em · C (pop)', 'G · D · Em · C (פופ)') },
  { key: 'mixed', chords: ['C', 'Am', 'G', 'Em'], label: L('C · Am · G · Em', 'C · Am · G · Em') },
];

/** All unordered pairs of a chord list ('A>D' style, alphabetical inside the pair for matching). */
export function pairsOf(chords) {
  const out = [];
  for (let i = 0; i < chords.length; i += 1) for (let j = i + 1; j < chords.length; j += 1) out.push([chords[i], chords[j]]);
  return out;
}

export const pairKey = (a, b) => `${a}>${b}`;
export const samePair = (item, a, b) => item === `${a}>${b}` || item === `${b}>${a}`;

// ---------------------------------------------------------------------------
// Goals
//
// rung = { label, target: { tool, items(params) -> [item] | null (any),
//          field, min, bpmMin?, minCount? } , weeks }
// blocks(params, rung, ctx) -> technique blocks for the goal (see engine)
// placement(params) -> [test]  (each test is a block with measure)
// ---------------------------------------------------------------------------

export const GOALS = [
  {
    key: 'changes',
    icon: '🎸',
    level: ['new', 'beginner'],
    title: L('Clean open-chord changes', 'החלפות נקיות של אקורדים פתוחים'),
    desc: L(
      'Change between open chords in time, without stopping — the foundation of playing songs.',
      'להחליף בין אקורדים פתוחים בזמן ובלי לעצור — הבסיס לנגינת שירים.'
    ),
    keywords: ['chord', 'change', 'changes', 'switch', 'open', 'strum', 'song', 'אקורד', 'החלפ', 'מעבר', 'פתוח', 'שיר', 'פריטה'],
    params: { chordSet: 'ADE' },
    metric: L('changes per minute (weakest pair)', 'החלפות לדקה (הזוג החלש)'),
    unit: '/min',
    rungs: [
      { min: 20, weeks: 1, label: L('20 changes/min on every pair', '20 החלפות לדקה בכל זוג') },
      { min: 30, weeks: 1.5, label: L('30/min — ready for songs', '30 לדקה — מוכנים לשירים') },
      { min: 45, weeks: 3, label: L('45/min', '45 לדקה') },
      { min: 60, weeks: 4, label: L('60/min — mastered', '60 לדקה — שליטה') },
    ],
    measure: 'minuteChangesWeakestPair',
  },
  {
    key: 'barre',
    icon: '✋',
    level: ['beginner', 'intermediate'],
    title: L('First barre chords (F and Bm)', 'אקורדי ברה ראשונים (F ו-Bm)'),
    desc: L(
      'Make the E-shape (F) and A-shape (Bm) barre chords ring and change to them from open chords.',
      'לגרום לאקורדי הברה בצורת E (F) ובצורת A (Bm) לצלצל, ולעבור אליהם מאקורדים פתוחים.'
    ),
    keywords: ['barre', 'bar chord', ' f ', 'f chord', 'bm', 'ברה', 'בארה', 'אקורד f', 'פה'],
    params: { chordSet: 'barre', chords: ['C', 'F', 'G', 'Bm'] },
    pairs: [
      ['C', 'F'],
      ['Am', 'F'],
      ['G', 'Bm'],
    ],
    metric: L('changes per minute into the barre chord (weakest pair)', 'החלפות לדקה אל אקורד הברה (הזוג החלש)'),
    unit: '/min',
    rungs: [
      { min: 10, weeks: 3, label: L('10/min — the barre rings', '10 לדקה — הברה מצלצל') },
      { min: 20, weeks: 3, label: L('20/min', '20 לדקה') },
      { min: 30, weeks: 4, label: L('30/min — usable in songs', '30 לדקה — שמיש בשירים') },
    ],
    measure: 'minuteChangesWeakestPair',
  },
  {
    key: 'timing',
    icon: '⏱',
    level: ['new', 'beginner', 'intermediate'],
    title: L('Play in time with the metronome', 'לנגן בזמן עם המטרונום'),
    desc: L(
      'Land every note on the click at rising tempos — the skill every band notices first.',
      'לנחות על כל קליק בטמפו עולה — הדבר הראשון שכל להקה שומעת.'
    ),
    keywords: ['time', 'timing', 'tempo', 'rhythm', 'metronome', 'groove', 'rush', 'drag', 'קצב', 'זמן', 'מטרונום', 'טמפו', 'גרוב'],
    params: { drillId: 'spider-walk-1234' },
    metric: L('notes on time (%) at the rung tempo', 'תווים בזמן (%) בטמפו של השלב'),
    unit: '%',
    rungs: [
      { min: 90, bpm: 60, weeks: 1, label: L('90 % at 60 BPM', '90% ב-60 BPM') },
      { min: 90, bpm: 75, weeks: 1.5, label: L('90 % at 75 BPM', '90% ב-75 BPM') },
      { min: 90, bpm: 90, weeks: 2, label: L('90 % at 90 BPM', '90% ב-90 BPM') },
      { min: 90, bpm: 105, weeks: 2.5, label: L('90 % at 105 BPM', '90% ב-105 BPM') },
      { min: 90, bpm: 120, weeks: 3, label: L('90 % at 120 BPM', '90% ב-120 BPM') },
    ],
    measure: 'rhythmAccuracy',
    tool: 'rhythm',
  },
  {
    key: 'speed',
    icon: '⚡',
    level: ['intermediate', 'advanced'],
    title: L('Alternate-picking speed', 'מהירות פריטה מתחלפת'),
    desc: L(
      'Clean, even alternate picking at higher tempos — accuracy first, speed second.',
      'פריטה מתחלפת נקייה ואחידה בטמפו גבוה — קודם דיוק, אחר כך מהירות.'
    ),
    keywords: ['speed', 'fast', 'faster', 'picking', 'alternate', 'shred', 'מהיר', 'מהירות', 'פריטה', 'שרד'],
    params: { drillId: 'grady-pickslant-isolation' },
    metric: L('notes clean (%) at the rung tempo', 'תווים נקיים (%) בטמפו של השלב'),
    unit: '%',
    rungs: [
      { min: 90, bpm: 80, weeks: 2, label: L('90 % at 80 BPM', '90% ב-80 BPM') },
      { min: 90, bpm: 95, weeks: 3, label: L('90 % at 95 BPM', '90% ב-95 BPM') },
      { min: 90, bpm: 110, weeks: 4, label: L('90 % at 110 BPM', '90% ב-110 BPM') },
      { min: 90, bpm: 125, weeks: 5, label: L('90 % at 125 BPM', '90% ב-125 BPM') },
      { min: 90, bpm: 140, weeks: 6, label: L('90 % at 140 BPM', '90% ב-140 BPM') },
    ],
    measure: 'rhythmAccuracy',
    tool: 'rhythm',
  },
  {
    key: 'pentatonic',
    icon: '🗺',
    level: ['beginner', 'intermediate'],
    title: L('Minor pentatonic — all 5 positions', 'פנטטוני מינורי — כל 5 הפוזיציות'),
    desc: L(
      'The soloing scale of rock and blues, in every position across the neck (A minor).',
      'סולם הסולואים של הרוק והבלוז, בכל הפוזיציות לאורך הצוואר (לה מינור).'
    ),
    keywords: ['pentatonic', 'scale', 'scales', 'position', 'box', 'solo', 'פנטטוני', 'סולם', 'סולמות', 'פוזיציה', 'קופסה'],
    params: { root: 9 },
    metric: L('notes right (%) in the position, at tempo', 'תווים נכונים (%) בפוזיציה, בטמפו'),
    unit: '%',
    rungs: [0, 1, 2, 3, 4].flatMap((p) => [
      { min: 90, bpm: 70, position: p, weeks: p === 0 ? 1.5 : 2, label: L(`Position ${p + 1} at 70 BPM`, `פוזיציה ${p + 1} ב-70 BPM`) },
      { min: 90, bpm: 90, position: p, weeks: 1, label: L(`Position ${p + 1} at 90 BPM`, `פוזיציה ${p + 1} ב-90 BPM`) },
    ]),
    measure: 'scaleAccuracy',
    tool: 'scale',
  },
  {
    key: 'blues',
    icon: '🎷',
    level: ['beginner', 'intermediate'],
    title: L('Improvise over a 12-bar blues', 'לאלתר על בלוז 12 תיבות'),
    desc: L(
      'Real blues vocabulary — licks with bends and vibrato played in time — then your own phrases.',
      'אוצר מילים של בלוז — ליקים עם כפיפות וויברטו, בזמן — ואז משפטים משלכם.'
    ),
    keywords: ['blues', 'improv', 'improvise', 'improvisation', 'solo', 'lick', 'licks', 'בלוז', 'אלתור', 'לאלתר', 'סולו', 'ליק'],
    params: { genre: 'blues' },
    metric: L('lick score at the rung tempo', 'ציון ליקים בטמפו של השלב'),
    unit: '',
    rungs: [
      { min: 80, tempoPct: 70, level: 'beginner', weeks: 2, label: L('Beginner licks: 80 at 70 % tempo', 'ליקים למתחילים: 80 ב-70% טמפו') },
      { min: 85, tempoPct: 100, level: 'beginner', weeks: 2, label: L('Beginner licks: 85 at full tempo', 'ליקים למתחילים: 85 בטמפו מלא') },
      { min: 80, tempoPct: 80, level: 'intermediate', weeks: 3, label: L('Intermediate licks: 80 at 80 %', 'ליקים בינוניים: 80 ב-80%') },
      { min: 85, tempoPct: 100, level: 'intermediate', weeks: 3, label: L('Intermediate licks: 85 at full tempo', 'ליקים בינוניים: 85 בטמפו מלא') },
    ],
    measure: 'lickScore',
    tool: 'lick',
  },
  {
    key: 'bending',
    icon: '〽️',
    level: ['beginner', 'intermediate'],
    title: L('Bends in tune', 'כפיפות מדויקות'),
    desc: L(
      'Half, whole and 1½-step bends that land on the pitch and stay there.',
      'כפיפות של חצי, שלם וטון וחצי שנוחתות על הצליל ונשארות עליו.'
    ),
    keywords: ['bend', 'bends', 'bending', 'vibrato', 'in tune', 'כפיפ', 'בנד', 'ויברטו'],
    params: {},
    metric: L('bends held in tune (%)', 'כפיפות שהוחזקו מדויק (%)'),
    unit: '%',
    rungs: [
      { min: 50, weeks: 1.5, label: L('50 % of bends in tune', '50% מהכפיפות מדויקות') },
      { min: 70, weeks: 2, label: L('70 %', '70%') },
      { min: 85, weeks: 3, label: L('85 % — reliable', '85% — אמין') },
    ],
    measure: 'bendAccuracy',
    tool: 'bending',
  },
  {
    key: 'ear',
    icon: '👂',
    level: ['new', 'beginner', 'intermediate', 'advanced'],
    title: L('Recognise intervals by ear', 'לזהות מרווחים בשמיעה'),
    desc: L(
      'Hear the distance between two notes — the base for playing by ear and learning songs faster.',
      'לשמוע את המרחק בין שני צלילים — הבסיס לנגינה בשמיעה וללימוד שירים מהר יותר.'
    ),
    keywords: ['ear', 'interval', 'intervals', 'by ear', 'listen', 'hearing', 'שמיעה', 'מרווח', 'אוזן', 'בשמיעה'],
    params: { mode: 'interval' },
    metric: L('correct answers (%)', 'תשובות נכונות (%)'),
    unit: '%',
    rungs: [
      { min: 90, difficulty: 'beginner', weeks: 2, label: L('90 % — beginner set', '90% — סט מתחילים') },
      { min: 85, difficulty: 'intermediate', weeks: 3, label: L('85 % — intermediate set', '85% — סט בינוני') },
      { min: 85, difficulty: 'advanced', weeks: 4, label: L('85 % — all intervals', '85% — כל המרווחים') },
    ],
    measure: 'earAccuracy',
    tool: 'ear',
  },
];

export function goalByKey(key) {
  return GOALS.find((g) => g.key === key) ?? null;
}

/** The chord pairs a changes/barre goal works on. */
export function goalPairs(goal, params = goal.params) {
  if (goal.pairs) return goal.pairs;
  const set = CHORD_SETS.find((s) => s.key === params?.chordSet) ?? CHORD_SETS[0];
  return pairsOf(set.chords);
}

// Latin keywords match at a word start ("chord" in "chords"; short ones
// as whole words, so "ear" isn't found in "learn");
// Hebrew ones match anywhere (prefixes like ה/ל/ב glue onto words).
function keywordHit(text, k) {
  const kw = k.toLowerCase();
  if (/^[\x20-\x7e]+$/.test(kw)) {
    const esc = kw.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z])${esc}${kw.trim().length <= 3 ? '([^a-z]|$)' : ''}`).test(text);
  }
  return text.includes(kw);
}

/**
 * Free-text goal → catalog goals, best first (keyword overlap, EN + HE).
 * Returns [{goal, score}] with score > 0.
 */
export function matchGoalText(text) {
  const s = ` ${String(text || '').toLowerCase()} `;
  if (!s.trim()) return [];
  return GOALS.map((goal) => ({
    goal,
    score: goal.keywords.reduce((n, k) => (keywordHit(s, k) ? n + (k.trim().length > 4 ? 2 : 1) : n), 0),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}
