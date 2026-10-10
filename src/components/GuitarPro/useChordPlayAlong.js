import { useCallback, useEffect, useRef, useState } from 'react';
import { useMicChordDetector } from '../../hooks/useMicChordDetector';
import { chordAt, chordsMatch } from '../../music/chordChart';
import { logPerf } from '../../coach/perfLog';

// GuitarPro -> Chords -> Mic: strum along with the song; the mic (the same
// chord detector as Practice -> Chord Changes) checks every chord change of
// the chart. A change counts when the chord is heard at any moment while it
// is the one sounding in the song. Very short chords (< MIN_JUDGE_MS) that
// weren't caught aren't counted. One perf-log entry per run (on Stop / mic
// off), tool 'chordChanges', item `gp:<file>`.
const POLL_MS = 100;
const MIN_JUDGE_MS = 600;
const MIN_TO_LOG = 3;
const MAX_PAIRS = 120;

function newRun() {
  return { hits: 0, misses: 0, latencies: [], pairs: [], startedAt: null };
}

export function useChordPlayAlong({ chart, posRef, playing, fileId, tempoPct, bpm, simple }) {
  const mic = useMicChordDetector();
  const [on, setOn] = useState(false);
  const [live, setLive] = useState({ expected: null, heard: null, match: null });
  const [tally, setTally] = useState({ hits: 0, judged: 0 });
  const [summary, setSummary] = useState(null);
  const runRef = useRef(newRun());
  const segRef = useRef(null);
  const chartRef = useRef(chart);
  chartRef.current = chart;
  const metaRef = useRef({});
  metaRef.current = { fileId, tempoPct, bpm, simple };

  const judge = useCallback((seg, now) => {
    if (!seg) return;
    const dur = now - seg.startedAt;
    if (!seg.matchedAt && dur < MIN_JUDGE_MS) return;
    const run = runRef.current;
    const ok = !!seg.matchedAt;
    const latencyMs = ok ? Math.round(seg.matchedAt - seg.startedAt) : null;
    if (ok) {
      run.hits += 1;
      run.latencies.push(latencyMs);
    } else run.misses += 1;
    if (seg.prev) run.pairs.push({ from: seg.prev, to: seg.name, ok, latencyMs });
    if (run.pairs.length > MAX_PAIRS) run.pairs.splice(0, run.pairs.length - MAX_PAIRS);
    setTally({ hits: run.hits, judged: run.hits + run.misses });
  }, []);

  // Ends a run: the summary, and one entry in the performance log.
  const finish = useCallback(() => {
    const now = performance.now();
    judge(segRef.current, now);
    segRef.current = null;
    const run = runRef.current;
    runRef.current = newRun();
    const judged = run.hits + run.misses;
    setTally({ hits: 0, judged: 0 });
    setLive({ expected: null, heard: null, match: null });
    if (judged === 0) return;
    const misses = new Map();
    for (const p of run.pairs) {
      if (p.ok) continue;
      const k = `${p.from} → ${p.to}`;
      misses.set(k, (misses.get(k) ?? 0) + 1);
    }
    const hardest = [...misses.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const lat = run.latencies;
    const result = {
      hits: run.hits,
      judged,
      pct: Math.round((run.hits / judged) * 100),
      meanLatencyMs: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null,
      hardest: hardest ? { pair: hardest[0], misses: hardest[1] } : null,
    };
    setSummary(result);
    if (judged >= MIN_TO_LOG) {
      const m = metaRef.current;
      logPerf({
        tool: 'chordChanges',
        item: `gp:${m.fileId}`,
        bpm: m.bpm,
        durationMs: run.startedAt != null ? now - run.startedAt : undefined,
        metrics: {
          source: 'gp',
          tempoPct: m.tempoPct,
          simple: !!m.simple,
          hits: run.hits,
          misses: run.misses,
          accuracyPct: result.pct,
          meanLatencyMs: result.meanLatencyMs,
          pairs: run.pairs,
          completed: true,
        },
      });
    }
  }, [judge]);

  const start = useCallback(async () => {
    setSummary(null);
    runRef.current = newRun();
    segRef.current = null;
    setTally({ hits: 0, judged: 0 });
    setOn(true);
    await mic.startListening();
  }, [mic]);

  const stop = useCallback(() => {
    finish();
    mic.stopListening();
    setOn(false);
  }, [finish, mic]);

  // While the song plays: which chord should sound, and what the mic hears.
  useEffect(() => {
    if (!on || !playing) {
      // Paused: the chord in progress isn't judged (it would count the pause).
      segRef.current = null;
      return undefined;
    }
    if (runRef.current.startedAt == null) runRef.current.startedAt = performance.now();
    const id = setInterval(() => {
      const pos = posRef.current;
      const c = chartRef.current;
      if (!pos || !c) return;
      const cur = chordAt(c, pos.bar, pos.inBar);
      const now = performance.now();
      const key = cur ? `${cur.bar}:${cur.idx}` : null;
      let seg = segRef.current;
      if ((seg?.key ?? null) !== key) {
        judge(seg, now);
        seg = cur ? { key, name: cur.name, prev: seg?.name ?? null, startedAt: now, matchedAt: null } : null;
        segRef.current = seg;
      }
      const g = mic.guessRef.current;
      const match = seg && g ? chordsMatch(seg.name, g) : null;
      if (seg && match && !seg.matchedAt) seg.matchedAt = now;
      const heard = g?.chord ?? null;
      const expected = seg?.name ?? null;
      setLive((l) => (l.expected === expected && l.heard === heard && l.match === match ? l : { expected, heard, match }));
    }, POLL_MS);
    return () => clearInterval(id);
  }, [on, playing, judge, mic.guessRef, posRef]);

  // Leaving the view / file: end the run.
  useEffect(() => () => mic.stopListening(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    on,
    start,
    stop,
    finish,
    live,
    tally,
    summary,
    clearSummary: () => setSummary(null),
    error: mic.error,
    listening: mic.isListening,
  };
}
