import json, base64, subprocess, numpy as np, sys, re
from multiprocessing import Pool
SR=44100
NAMES={'C':0,'Db':1,'D':2,'Eb':3,'E':4,'F':5,'Gb':6,'G':7,'Ab':8,'A':9,'Bb':10,'B':11}
def midi(n):
    m=re.match(r'([A-G]b?)(-?\d)',n); return NAMES[m[1]]+12*(int(m[2])+1)
def load(path):
    s=open(path).read(); a=s.index('=',s.index('MIDI.Soundfont.'))+2; b=s.rindex(','); return json.loads(s[a:b]+'}')
def decode(b64):
    raw=base64.b64decode(b64.split(',',1)[1])
    p=subprocess.run(['ffmpeg','-loglevel','error','-i','pipe:0','-f','f32le','-ac','1','-ar','44100','pipe:1'],input=raw,capture_output=True)
    return np.frombuffer(p.stdout,dtype=np.float32)
def spec(x,a,b):
    seg=x[int(a*SR):int(b*SR)]
    if len(seg)<2048: return None,None
    seg=seg*np.hanning(len(seg)); N=1<<20
    return np.abs(np.fft.rfft(seg,N)), np.fft.rfftfreq(N,1/SR)
def peak(X,fr,f,w=0.03):
    lo,hi=np.searchsorted(fr,[f*(1-w),f*(1+w)])
    if hi<=lo: return f,0
    i=lo+np.argmax(X[lo:hi])
    # parabolic
    if 0<i<len(X)-1:
        a,b_,c=np.log(X[i-1]+1e-12),np.log(X[i]+1e-12),np.log(X[i+1]+1e-12); d=0.5*(a-c)/(a-2*b_+c) if (a-2*b_+c)!=0 else 0
        return fr[i]+d*(fr[1]-fr[0]), X[i]
    return fr[i],X[i]
def measure(args):
    path,n,b64=args
    m=midi(n); f=440*2**((m-69)/12); x=decode(b64)
    dur=len(x)/SR
    # window: skip attack; high notes decay fast
    a=0.06; bnd=min(0.9 if m<72 else 0.45, dur)
    X,fr=spec(x,a,bnd)
    if X is None: return (path,m,None,'short')
    h=[peak(X,fr,f*k) for k in range(1,5)]
    amps=[p[1] for p in h]; mx=max(amps)+1e-12
    if amps[0]>=0.12*mx: c=1200*np.log2(h[0][0]/f); q='h1'
    else:
        c=float(np.median([1200*np.log2(h[k][0]/(f*(k+1))) for k in (1,2)])); q='h2/3'
    # stability: second window
    X2,fr2=spec(x,bnd,min(bnd+0.6,dur)) if dur>bnd+0.2 else (None,None)
    c2=None
    if X2 is not None:
        p2=peak(X2,fr2,f*(1 if q=='h1' else 2)); c2=1200*np.log2(p2[0]/(f*(1 if q=='h1' else 2)))
    return (path,m,round(float(c),1),q,None if c2 is None else round(float(c2),1))
if __name__=='__main__':
    jobs=[]
    for spec_ in sys.argv[1:]:
        path,lo,hi=spec_.split(':'); d=load(path)
        for n,b in d.items():
            mm=midi(n)
            if int(lo)<=mm<=int(hi): jobs.append((path,n,b))
    with Pool(8) as p: res=p.map(measure,jobs)
    out={}
    for path,m,c,q,*r in res: out.setdefault(path,{})[m]=[c,q,r[0] if r else None]
    json.dump(out,open('meas-'+str(abs(hash(tuple(sys.argv[1:])))%10**6)+'.json','w'))
    for path,d in out.items():
        cs=np.array([v[0] for v in d.values() if v[0] is not None]); bad=[(m,v[0]) for m,v in sorted(d.items()) if v[0] is not None and abs(v[0])>8]
        print(f"{path}: n={len(cs)} mean|c|={np.mean(abs(cs)):.1f} max={np.max(abs(cs)):.1f} >8c={len(bad)} {bad[:14]}")
