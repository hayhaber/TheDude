import json, struct, sys, numpy as np
from sf2map import load, zones_for
from collections import defaultdict
sys.path.insert(0,'/home/claude/thedude/scripts/soundfont')
from sf2info import chunks
def corrections(sf2, measfile, base=None):
    d,pd,P=load(sf2); D=json.load(open(measfile)); acc=defaultdict(list)
    for prog,r in D.items():
        for m,v in r.items():
            if not v or abs(v[0]-v[1])>8: continue
            c=(v[0]+v[1])/2
            for inst,ib,smp in zones_for(P,int(prog),int(m)): acc[ib].append(c)
    fix={}
    for ib,cs in acc.items():
        cs=np.array(cs); med=float(np.median(cs)); iqr=float(np.percentile(cs,75)-np.percentile(cs,25))
        if abs(med)>=4 and iqr<=6: fix[ib]=-int(round(med))
    if base: 
        for k,v in base.items(): fix[k]=fix.get(k,0)+v
    return fix
def apply(src,dst,fix):
    d=open(src,'rb').read(); lists={}
    for cid,o,sz in chunks(d,12,len(d)):
        if cid==b'LIST': lists[d[o:o+4]]=(o+4,o+sz)
    pd={}
    for cid,o,sz in chunks(d,*lists[b'pdta']): pd[cid]=d[o:o+sz]
    recs=lambda b,s:[b[i:i+s] for i in range(0,len(b),s)]
    ibag=recs(pd[b'ibag'],4); igen=recs(pd[b'igen'],4)
    new_igen=[]; starts=[]
    for b in range(len(ibag)-1):
        g0=struct.unpack('<H',ibag[b][:2])[0]; g1=struct.unpack('<H',ibag[b+1][:2])[0]
        starts.append(len(new_igen))
        G=[struct.unpack('<Hh',igen[g]) for g in range(g0,g1)]
        if b in fix:
            if any(o==52 for o,_ in G): G=[(o,max(-99,min(99,a+fix[b])) if o==52 else a) for o,a in G]
            else:
                ops=[o for o,_ in G]; pos=ops.index(53) if 53 in ops else len(G)
                G.insert(pos,(52,max(-99,min(99,fix[b]))))
        new_igen+=[struct.pack('<Hh',o,a) for o,a in G]
    starts.append(len(new_igen)); new_igen.append(igen[-1])
    new_ibag=[struct.pack('<H',starts[b])+ibag[b][2:4] for b in range(len(ibag))]
    pd[b'ibag']=b''.join(new_ibag); pd[b'igen']=b''.join(new_igen)
    def chunk(cid,p): return cid+struct.pack('<I',len(p))+p+(b'\0' if len(p)&1 else b'')
    out=[]
    for cid,lo,lsz in chunks(d,12,len(d)):
        kind=d[lo:lo+4]
        if kind==b'pdta':
            body=b'pdta'
            for c,co,csz in chunks(d,lo+4,lo+lsz): body+=chunk(c,pd[c])
        else: body=d[lo:lo+lsz]
        out.append(chunk(b'LIST',body))
    riff=b'sfbk'+b''.join(out); open(dst,'wb').write(b'RIFF'+struct.pack('<I',len(riff))+riff)
if __name__=='__main__':
    src,meas,dst,out=sys.argv[1:5]
    base=json.load(open(sys.argv[5])) if len(sys.argv)>5 else None
    if base: base={int(k):v for k,v in base.items()}
    fix=corrections(src if not base else sys.argv[6], meas, base)
    json.dump(fix,open(out,'w')); print('zones fixed',len(fix), 'max',max(map(abs,fix.values())) if fix else 0)
    apply(sys.argv[6] if base else src, dst, fix)
