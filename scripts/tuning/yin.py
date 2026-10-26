import sys, json, numpy as np
exec(open('meas2.py').read().split("if __name__")[0])
def yin_cents(x, f, a=0.1, b=0.9, win=0.2, thr=0.5):
    vals=[]
    t=a
    while t+win<=min(b,len(x)/SR):
        seg=x[int(t*SR):int((t+win)*SR)].astype(np.float64)
        T=SR/f; lags=np.arange(max(2,int(T*0.94)),int(T*1.06)+2)
        if lags[-1]>=len(seg)//2: break
        n=len(seg)-lags[-1]
        dfun=np.array([np.mean((seg[:n]-seg[L:L+n])**2) for L in lags])/ (np.mean(seg[:n]**2)+1e-12)
        i=int(np.argmin(dfun))
        if 0<i<len(dfun)-1:
            a_,b_,c_=dfun[i-1],dfun[i],dfun[i+1]; dd=0.5*(a_-c_)/(a_-2*b_+c_) if (a_-2*b_+c_)!=0 else 0
            if dfun[i]<thr: vals.append(1200*np.log2((SR/(lags[i]+dd))/f))
        t+=win/2
    if not vals and thr<5: return yin_cents(x,f,a,b,win,99)
    return (round(float(np.median(vals)),1), round(float(np.std(vals)),1)) if vals else (None,None)
if __name__=='__main__':
    # validate
    for m in (28,45,64,90):
        f=440*2**((m-69)/12); t=np.arange(int(1.5*SR))/SR
        x=sum(np.sin(2*np.pi*f*k*t)/k for k in range(1,8))*np.exp(-t)
        print('synthetic',m,yin_cents(x,f))
    for spec_ in sys.argv[1:]:
        path,lo,hi=spec_.split(':'); d=load(path); out={}
        for n,b in d.items():
            m=midi(n)
            if int(lo)<=m<=int(hi):
                x=decode(b); f=440*2**((m-69)/12); bb=1.4 if m<40 else (0.9 if m<76 else 0.5)
                out[m]=yin_cents(x,f,0.1,bb, 0.25 if m<40 else 0.15)
        cs=[v[0] for v in out.values() if v[0] is not None]
        print(path,'yin mean|c|',round(np.mean(np.abs(cs)),1) if cs else None,'max',max(cs,key=abs) if cs else None,' >8:',[(m,v[0]) for m,v in sorted(out.items()) if v[0] is not None and abs(v[0])>8][:16])
        json.dump(out,open('yin-'+path.replace('.js','')+'.json','w'))
