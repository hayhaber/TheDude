import struct, sys, json, numpy as np
sys.path.insert(0,'/home/claude/thedude/scripts/soundfont')
from sf2info import parse
from multiprocessing import Pool
d,pd,sd=parse('GU.sf2'); so,ssz=sd[b'smpl']; pcm=np.frombuffer(d[so:so+ssz],dtype='<i2')
o,sz=pd[b'shdr']; n=sz//46
S=[]
for i in range(n-1):
    rec=d[o+i*46:o+i*46+46]; name=rec[:20].split(b'\0')[0].decode('latin1')
    S.append((i,name)+struct.unpack('<IIIIIBbHH',rec[20:46]))
def cents_of(x, rate, f):
    seg=x*np.hanning(len(x)); N=1<<21
    X=np.abs(np.fft.rfft(seg,N)); fr=np.fft.rfftfreq(N,1/rate)
    out=[]
    for k in (1,2,3):
        lo,hi=np.searchsorted(fr,[f*k*0.95,f*k*1.05])
        if hi<=lo+2: out.append((None,0)); continue
        i=lo+np.argmax(X[lo:hi])
        a,b,c=np.log(X[i-1]+1e-12),np.log(X[i]+1e-12),np.log(X[i+1]+1e-12); dd=0.5*(a-c)/(a-2*b+c) if (a-2*b+c)!=0 else 0
        out.append(((fr[i]+dd*(fr[1]-fr[0]))/k, X[i]))
    mx=max(a for _,a in out)+1e-12
    if out[0][0] and out[0][1]>=0.15*mx: return 1200*np.log2(out[0][0]/f),'h1'
    if out[1][0]: return 1200*np.log2(out[1][0]/f),'h2'
    return None,'-'
def meas(s):
    i,name,start,end,sl,el,rate,pitch,corr,link,typ=s
    if pitch>127 or rate<8000 or end-start<1000: return (i,name,None,'skip',pitch,corr)
    x=pcm[start:end].astype(np.float32)/32768
    if el>sl+50 and sl>=start and el<=end:
        loop=pcm[sl:el].astype(np.float32)/32768
        head=pcm[start:sl].astype(np.float32)/32768
        reps=int(np.ceil(1.6*rate/len(loop)))+1
        x=np.concatenate([head]+[loop]*reps)
    a=int(0.12*rate); b=min(len(x),int(1.2*rate))
    if b-a<int(0.15*rate): a=0
    f=440*2**((pitch-69)/12)
    c,q=cents_of(x[a:b],rate,f)
    if c is None: return (i,name,None,q,pitch,corr)
    return (i,name,round(float(c+corr),1),q,pitch,corr)
if __name__=='__main__':
    with Pool(2) as p: res=p.map(meas,S)
    json.dump(res,open('gusamp.json','w'))
    ok=[r for r in res if r[2] is not None]
    bad=[r for r in ok if 4<=abs(r[2])<=60]
    print('samples',len(S),'measured',len(ok),'>=4c',len(bad),'>60 (override/unpitched?)',len([r for r in ok if abs(r[2])>60]))
    for r in sorted(bad,key=lambda r:-abs(r[2]))[:40]: print(r)
