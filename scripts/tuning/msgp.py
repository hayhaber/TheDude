import json, subprocess, numpy as np
from multiprocessing import Pool
L=json.load(open('layers.json'))
def dec(f):
    p=subprocess.run(['ffmpeg','-loglevel','error','-i',f,'-f','f32le','-ac','1','-ar','48000','pipe:1'],capture_output=True); return np.frombuffer(p.stdout,dtype=np.float32)
SR=48000
def m(args):
    midi,name=args; x=dec(name.replace(' ','_')+'.ogg'); f=440*2**((midi-69)/12)
    a=0.08; b=1.4 if midi<48 else (0.9 if midi<84 else 0.4)
    seg=x[int(a*SR):int(b*SR)]; seg=seg*np.hanning(len(seg)); N=1<<21
    X=np.abs(np.fft.rfft(seg,N)); fr=np.fft.rfftfreq(N,1/SR)
    res=[]
    for k in (1,2,3):
        lo,hi=np.searchsorted(fr,[f*k*0.96,f*k*1.04]); i=lo+np.argmax(X[lo:hi])
        a_,b_,c_=np.log(X[i-1]+1e-12),np.log(X[i]+1e-12),np.log(X[i+1]+1e-12); dd=0.5*(a_-c_)/(a_-2*b_+c_)
        res.append(((fr[i]+dd*(fr[1]-fr[0]))/k,X[i]))
    mx=max(r[1] for r in res)
    if res[0][1]>=0.15*mx: c=1200*np.log2(res[0][0]/f); q='h1'
    else: c=1200*np.log2(res[1][0]/f); q='h2'
    # periodicity (YIN) on the same part
    T=SR/f; seg2=x[int(a*SR):int(b*SR)].astype(np.float64); lags=np.arange(max(2,int(T*0.94)),int(T*1.06)+2); n=len(seg2)-lags[-1]
    dfun=np.array([np.mean((seg2[:n]-seg2[L:L+n])**2) for L in lags]); i=int(np.argmin(dfun))
    dd=0.5*(dfun[i-1]-dfun[i+1])/(dfun[i-1]-2*dfun[i]+dfun[i+1]) if 0<i<len(dfun)-1 else 0
    y=1200*np.log2((SR/(lags[i]+dd))/f)
    return (midi,name,round(float(c),1),q,round(float(y),1))
if __name__=='__main__':
    jobs=sorted({(s[0],s[1]) for l in L for s in l['samples']})
    res=[m(j) for j in jobs]
    json.dump(res,open('sgp.json','w'))
    by={r[1]:r for r in res}
    for l in L:
        rows=[by[s[1]] for s in l['samples']]
        ag=[r for r in rows if abs(r[2]-r[4])<=8]; corr=[(r[0],round((r[2]+r[4])/2)) for r in ag if abs((r[2]+r[4])/2)>=4]
        print(l['name'],'agree',len(ag),'/',len(rows),'to fix',len(corr),corr[:25])
