import mido, subprocess, sys, json, numpy as np
from sf2map import load, zones_for
SR=44100
def make_mid(prog, notes, path):
    mf=mido.MidiFile(ticks_per_beat=480); tr=mido.MidiTrack(); mf.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo',tempo=500000)); tr.append(mido.Message('program_change',program=prog,time=0))
    for m in notes:
        tr.append(mido.Message('note_on',note=m,velocity=100,time=0)); tr.append(mido.Message('note_off',note=m,velocity=0,time=480*3)); tr.append(mido.Message('note_on',note=m,velocity=0,time=480))
    mf.save(path)
def rd(f):
    p=subprocess.run(['ffmpeg','-loglevel','error','-i',f,'-f','f32le','-ac','1','-ar',str(SR),'pipe:1'],capture_output=True); return np.frombuffer(p.stdout,dtype=np.float32)
def both(seg,f):
    if len(seg)<SR*0.2 or np.sqrt(np.mean(seg**2))<1e-4: return None
    w=seg*np.hanning(len(seg)); N=1<<20; X=np.abs(np.fft.rfft(w,N)); fr=np.fft.rfftfreq(N,1/SR)
    hs=[]
    for k in (1,2,3):
        lo,hi=np.searchsorted(fr,[f*k*0.96,f*k*1.04]); i=lo+np.argmax(X[lo:hi]); a,b,c=np.log(X[i-1]+1e-12),np.log(X[i]+1e-12),np.log(X[i+1]+1e-12); dd=0.5*(a-c)/(a-2*b+c) if a-2*b+c else 0; hs.append(((fr[i]+dd*(fr[1]-fr[0]))/k,X[i]))
    mx=max(h[1] for h in hs); c1=1200*np.log2((hs[0][0] if hs[0][1]>=0.15*mx else hs[1][0])/f)
    s=seg.astype(np.float64); T=SR/f; lags=np.arange(max(2,int(T*0.94)),int(T*1.06)+2); n=len(s)-lags[-1]
    if n<SR*0.05: return None
    dfun=np.array([np.mean((s[:n]-s[L:L+n])**2) for L in lags]); k=int(np.argmin(dfun)); dd=0.5*(dfun[k-1]-dfun[k+1])/(dfun[k-1]-2*dfun[k]+dfun[k+1]) if 0<k<len(dfun)-1 else 0
    y=1200*np.log2((SR/(lags[k]+dd))/f)
    return (round(float(c1),1),round(float(y),1))
def measure(sf2, progs, tag):
    out={}
    for prog in progs:
        lo,hi=(28,67) if 32<=prog<=39 else (21,108) if prog<=7 else (40,88) if 24<=prog<=31 else (36,96)
        notes=list(range(lo,hi+1,1 if prog<40 else 2))
        make_mid(prog,notes,f'p{prog}.mid')
        subprocess.run(['fluidsynth','-ni','-F',f'p{prog}-{tag}.wav','-r',str(SR),'-o','synth.reverb.active=0','-o','synth.chorus.active=0',sf2,f'p{prog}.mid'],capture_output=True)
        x=rd(f'p{prog}-{tag}.wav'); r={}
        for k,m in enumerate(notes):
            t0=k*2.0; f=440*2**((m-69)/12); a=0.25; b=1.1 if m<84 else 0.6
            r[m]=both(x[int((t0+a)*SR):int((t0+b)*SR)],f)
        out[prog]=r
        print(tag,prog,'done',flush=True)
    return out
if __name__=='__main__':
    sf2,tag,a,b=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4])
    json.dump(measure(sf2,range(a,b),tag),open(f'meas-{tag}-{a}-{b}.json','w'))
