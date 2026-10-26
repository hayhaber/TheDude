import json, sys, numpy as np
from multiprocessing import Pool
exec(open('meas.py').read().split("def measure(args):")[0])
def centroid(X,fr,f,w_c=40):
    lo,hi=np.searchsorted(fr,[f*2**(-w_c/1200),f*2**(w_c/1200)])
    seg=X[lo:hi]; 
    if len(seg)==0 or seg.max()<=0: return None,0
    pw=seg**2; mask=seg>=0.3*seg.max(); 
    fc=np.sum(fr[lo:hi][mask]*pw[mask])/np.sum(pw[mask]); return fc, seg.max()
def measure(args):
    path,n,b64=args
    m=midi(n); f=440*2**((m-69)/12); x=decode(b64); dur=len(x)/SR
    a=0.06; bnd=min(0.9 if m<72 else 0.45, dur)
    if m<36: bnd=min(1.4,dur)
    X,fr=spec(x,a,bnd)
    if X is None: return (path,m,None,'short',None)
    # coarse locate each harmonic peak first (±3%), then centroid around it
    hs=[]
    for k in (1,2,3):
        pf,pa=peak(X,fr,f*k,0.03); c,amp=centroid(X,fr,pf,25); hs.append((c/k if c else None,amp))
    mx=max(a_ for _,a_ in hs)+1e-12
    c1=1200*np.log2(hs[0][0]/f) if hs[0][0] else None
    c2=1200*np.log2(hs[1][0]/f) if hs[1][0] else None
    if c1 is not None and hs[0][1]>=0.12*mx: c=c1; q='h1'
    else: c=c2; q='h2'
    agree=None if (c1 is None or c2 is None) else round(c2-c1,1)
    return (path,m,round(float(c),1),q,agree)
if __name__=='__main__':
    out_name=sys.argv[1]; jobs=[]
    for spec_ in sys.argv[2:]:
        path,lo,hi=spec_.split(':'); d=load(path)
        for n,b in d.items():
            mm=midi(n)
            if int(lo)<=mm<=int(hi): jobs.append((path,n,b))
    with Pool(2) as p: res=p.map(measure,jobs)
    out={}
    for path,m,c,q,ag in res: out.setdefault(path,{})[m]=[c,q,ag]
    json.dump(out,open(out_name,'w'))
    for path,d in out.items():
        cs=np.array([v[0] for v in d.values() if v[0] is not None]); bad=[(m,v[0]) for m,v in sorted(d.items()) if v[0] is not None and abs(v[0])>8]
        dis=[(m,v[2]) for m,v in sorted(d.items()) if v[2] is not None and abs(v[2])>15 and v[1]=='h1']
        print(f"{path}: mean|c|={np.mean(abs(cs)):.1f} max={np.max(abs(cs)):.1f} >8c={len(bad)} disagree(h2-h1>15c)={dis[:8]}")
