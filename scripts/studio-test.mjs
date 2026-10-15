import { capturePasses, timelineAt, measureClickDelays } from '../src/audio/studio/studioEngine.js';
// Recorder studio regression test (pure logic): project model + timeline mapping.
// Run: npx esbuild scripts/studio-test.mjs --bundle --platform=node --format=esm --outfile=/tmp/st.mjs && node /tmp/st.mjs
import * as P from '../src/audio/studio/project.js';
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const near = (a, b) => Math.abs(a - b) < 1e-6;
let p = P.newProject();
const tk = p.tracks[0].id;
const take = { id: 'A', duration: 10 };
p = P.appendTake(p, tk, take);
ok(p.tracks[0].regions.length === 1 && near(P.projectLength(p), 10), 'append');
p = P.appendTake(p, tk, { id: 'B', duration: 5 });
ok(near(p.tracks[0].regions[1].start, 10) && near(P.projectLength(p), 15), 'join back to back');
// split
const r0 = p.tracks[0].regions[0].id;
let s = P.splitAt(p, r0, 4); p = s.project;
const [a, b] = p.tracks[0].regions;
ok(p.tracks[0].regions.length === 3 && near(a.length, 4) && near(b.start, 4) && near(b.offset, 4) && near(b.length, 6), 'split');
// trim start of right piece to 6 -> offset 6
p = P.trimRegion(p, b.id, 'start', 6, 10);
const b2 = P.findRegion(p, b.id).region;
ok(near(b2.start, 6) && near(b2.offset, 6) && near(b2.length, 4), 'trim start');
// trim start back past the left neighbour end (4) -> clamp at 4
p = P.trimRegion(p, b.id, 'start', 1, 10);
ok(near(P.findRegion(p, b.id).region.start, 4), 'trim clamps at neighbour');
// trim end beyond take end -> clamp at take end (start 4 + (10-4)) = 10
p = P.trimRegion(p, b.id, 'end', 30, 10);
ok(near(P.regionEnd(P.findRegion(p, b.id).region), 10), 'trim end clamps at take');
// move region B (at 10) to 2 -> overwrites, cuts others
const rb = p.tracks[0].regions.find((x) => x.takeId === 'B');
p = P.moveRegion(p, rb.id, 2);
const rs = p.tracks[0].regions;
ok(rs.length === 3 && near(rs[0].length, 2) && rs[1].takeId === 'B' && near(rs[2].start, 7) && near(rs[2].offset, 7), 'move wins: ' + JSON.stringify(rs.map(r=>[r.takeId,r.start,r.offset,r.length])));
// no overlaps
const noOverlap = (t) => t.regions.every((r, i) => i === 0 || t.regions[i - 1].start + t.regions[i - 1].length <= r.start + 1e-9);
ok(noOverlap(p.tracks[0]), 'no overlaps');
// delete
p = P.deleteRegion(p, rb.id);
ok(p.tracks[0].regions.length === 2, 'delete');
// loop recording: 3 passes of [20,24), take C (base for pass k)
let q = P.newProject(); const t1 = q.tracks[0].id;
q = P.addRecording(q, t1, { id: 'C', duration: 14 }, [
  { base: 18, from: 20, to: 24 }, { base: 14, from: 20, to: 24 }, { base: 10, from: 20, to: 22, full: false }], 'Take 1');
ok(q.tracks[0].lanes.length === 3, 'lanes');
const rr = q.tracks[0].regions;
ok(rr.length === 1 && near(rr[0].start, 20) && near(rr[0].offset, 6) && near(rr[0].length, 4), 'last full pass placed ' + JSON.stringify(rr));
// comp lane 1 (first pass) for [21,22)
const l1 = q.tracks[0].lanes[0];
q = P.compLane(q, t1, l1.id, 21, 22);
const cr = q.tracks[0].regions.map((r) => [r.takeId, r.start, r.offset, r.length, r.laneId === l1.id]);
ok(cr.length === 3 && near(cr[1][1], 21) && near(cr[1][2], 3) && cr[1][4] && near(cr[2][2], 8), 'comp ' + JSON.stringify(cr));
ok(P.laneAt(q.tracks[0], 21.5).id === l1.id && P.laneAt(q.tracks[0], 23).id === q.tracks[0].lanes[1].id, 'laneAt');
// partial lane comp clipped to lane part
q = P.compLane(q, t1, q.tracks[0].lanes[2].id, 20, 24);
const last = q.tracks[0].regions;
ok(near(last[0].start, 20) && near(last[0].length, 2) && near(last[0].offset, 10), 'partial lane clipped ' + JSON.stringify(last.map(r=>[r.start,r.offset,r.length])));
// tracks
let m = P.newProject(); for (let i = 0; i < 6; i++) m = P.addTrack(m);
ok(m.tracks.length === 4, 'max 4 tracks');
m = P.setTrack(m, m.tracks[1].id, { solo: true });
ok(P.audibleTracks(m).length === 1, 'solo');
// history
const h = P.createHistory(); h.push(1); h.push(2);
ok(h.undo(3) === 2 && h.undo(2) === 1 && h.redo(1) === 2, 'history');
const f1 = fails;
let f=0; const ok2=(c,m)=>{if(!c){f++;console.log('FAIL',m)}}; const near2=(a,b,e=1e-6)=>Math.abs(a-b)<e;
// plain: transport from timeline 8 at ctx 100; capture started ctx 99.9; latency 0.05; 10 s
let cp = capturePasses({ segments:[{from:8,to:15,when:100}], startTime:99.9, latency:0.05, duration:10, keep:{from:10,to:Infinity} });
ok2(cp.length===1 && near2(cp[0].base, 8-0.15) && near2(cp[0].from,10) && near2(cp[0].to,15), 'plain '+JSON.stringify(cp));
// loop [10,14) with 2s pre-roll: segs [8,14)@100, [10,14)@106, [10,12)@110 (stopped mid)
const segs=[{from:8,to:14,when:100},{from:10,to:14,when:106},{from:10,to:12,when:110}];
cp = capturePasses({ segments:segs, startTime:99.9, latency:0.05, duration:12.1, keep:{from:10,to:14} });
ok2(cp.length===3, 'loop passes '+cp.length);
ok2(near2(cp[0].base, 8-0.15) && cp[0].full && near2(cp[1].base, 10+(99.9-0.05-106)) && cp[1].full && !cp[2].full && near2(cp[2].to,11.95), 'loop '+JSON.stringify(cp));
// a sample that played at timeline 11 in pass 2 => ctx 107; heard + latency => captured at 107.05 => take time 7.15 ; base+7.15 should be 11
ok2(near2(cp[1].base+7.15, 11), 'pass2 maps');
ok2(near2(timelineAt(segs,107),11) && timelineAt(segs,200)===null, 'timelineAt');
// click delay detection
const sr=48000, st=1.0, sig=new Float32Array(sr*3); const clicks=[1.5,2.0,2.5];
for(const c of clicks){ const i=Math.round((c-st+0.023)*sr); for(let k=0;k<200;k++) sig[i+k]=0.5*Math.sin(k/3); }
for(let i=0;i<sig.length;i++) sig[i]+= (Math.random()-0.5)*0.002;
const d=measureClickDelays(sig,sr,st,clicks); ok2(d.length===3 && d.every(x=>Math.abs(x-0.023)<0.0005), 'click delays '+d);
console.log(f1 + f ? (f1 + f) + ' FAILED' : 'ALL OK'); if (f1 + f) process.exit(1);
