// Theory check of every Bass Practice exercise in every key: bundle with
// npx esbuild scripts/bass-practice-test.mjs --bundle --platform=node --format=esm --outfile=/tmp/bpt.mjs && node /tmp/bpt.mjs
import { EXERCISES, buildExercise, DEGREE_SEMITONES, KEY_NAMES } from '../src/music/bass/bassPractice.js';
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL', m); };
const CH = { '': [0,4,7], m: [0,3,7], '7': [0,4,7,10], m7: [0,3,7,10], maj7: [0,4,7,11] };
for (const ex of EXERCISES) {
  const keys = ex.keyed ? [...Array(12).keys()] : [0];
  for (const key of keys) for (const rs of (ex.keyed ? [0,1] : [0])) {
    const b = buildExercise(ex, { key, rootString: rs });
    if (!b.steps.length) fail(ex.id + ' empty');
    for (const s of b.steps) {
      if (s.fret < 0 || s.fret > 17) fail(`${ex.id} k${key} rs${rs} fret ${s.fret}`);
      if (s.string < 0 || s.string > 3) fail(`${ex.id} string ${s.string}`);
      if (!(s.beats > 0)) fail(ex.id + ' beats');
    }
    if (ex.shape) {
      const root = b.shapeNotes[0].midi;
      if (root % 12 !== key) fail(`${ex.id} root pc ${root%12} != ${key}`);
      for (const n of b.shapeNotes) {
        const want = DEGREE_SEMITONES[n.degreeLabel];
        if (n.midi - root !== want) fail(`${ex.id} k${key} rs${rs} ${n.degreeLabel} = ${n.midi-root}`);
      }
      const fr = b.shapeNotes.filter(n=>n.fret>0).map(n=>n.fret);
      if (Math.max(...fr) - Math.min(...fr) > 3) fail(`${ex.id} span ${Math.max(...fr)-Math.min(...fr)}`);
      // fingers consistent with OFPF: finger - fret constant
      const d = new Set(b.shapeNotes.map(n => n.finger - n.fret));
      if (d.size > 1 && ex.cat !== 'arpeggios') fail(`${ex.id} fingers not OFPF ${[...d]}`);
      if (b.shapeNotes.some(n => n.finger - (n.fret - Math.min(...fr)) - 1 > (ex.cat==='arpeggios'?1:0) || n.finger < 1)) fail(`${ex.id} finger > position ${JSON.stringify(b.shapeNotes.map(n=>[n.fret,n.finger]))}`);
    }
    if (ex.groove) {
      const lastBeat = b.steps[b.steps.length-1];
      if (b.totalBeats !== b.bars.length * 4) fail(`${ex.id} bar beats ${b.totalBeats}`);
      b.bars.forEach((bar, i) => {
        const inBar = b.steps.filter(s => s.bar === i);
        const sum = inBar.reduce((a, s) => a + s.beats, 0);
        if (sum !== 4) fail(`${ex.id} bar ${i} sum ${sum}`);
        const suffix = bar.name.replace(/^[A-G][♯♭]?/, '');
        const rootName = bar.name.slice(0, bar.name.length - suffix.length);
        const rootMidi = [28,33,38,43][bar.rootString] + bar.rootFret; if ((rootMidi - key) % 12 < 0) {}
        for (const s of inBar) {
          const iv = ((s.midi - rootMidi) % 12 + 12) % 12;
          if (s.degreeLabel === '→') {
            const next = b.bars[(i+1)%b.bars.length];
            const nextRoot = [28,33,38,43][next.rootString] + next.rootFret;
            const d = ((nextRoot - s.midi) % 12 + 12) % 12;
            if (d !== 1) fail(`${ex.id} k${key} approach ${s.noteName} -> ${next.name} is ${d} st below`);
            continue;
          }
          const want = DEGREE_SEMITONES[s.degreeLabel] % 12;
          if (iv !== want) fail(`${ex.id} k${key} ${bar.name} ${s.degreeLabel} got ${iv}`);
          // chord tone check (6 allowed in boogie)
          if (s.degreeLabel !== '6' && !CH[suffix].includes(iv) && iv !== 0) fail(`${ex.id} ${bar.name} non chord tone ${iv}`);
        }
        // groove placement: hand span within a bar
        const fr = inBar.filter(s=>s.fret>0 && s.degreeLabel!=='→').map(s=>s.fret);
        if (fr.length && Math.max(...fr)-Math.min(...fr) > 4) fail(`${ex.id} k${key} rs${rs} bar ${i} span ${Math.max(...fr)-Math.min(...fr)} ${inBar.map(s=>s.string+':'+s.fret).join(' ')}`);
      });
    }
  }
}
// print some samples
const show = (id, o) => { const b = buildExercise(EXERCISES.find(e=>e.id===id), o); console.log(id, JSON.stringify(o), (b.bars||[]).map(x=>x.name).join(' '), '|', b.steps.slice(0,16).map(s=>`${s.noteName}(${'EADG'[s.string]}${s.fret}/${s.finger}/${s.degreeLabel})`).join(' ')); };
show('scale-major', {key:7, rootString:0}); show('scale-minor',{key:9,rootString:0}); show('arp-dom7',{key:7,rootString:0});
show('groove-walk',{key:0,rootString:1}); show('groove-boogie',{key:9,rootString:0}); show('groove-twofeel',{key:7,rootString:0}); show('groove-roots',{key:0,rootString:1});
show('simandl-124',{}); show('octaves',{});
console.log('exercises', EXERCISES.length, 'failures', bad);
