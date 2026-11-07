import mido, subprocess, numpy as np, json, sys
SR=44100
SF='gu.sf2'
NOTES={'kick':(36,0.9),'snare':(38,0.9),'rim':(37,0.35),'clap':(39,0.6),'hihatClosed':(42,0.5),'hihatPedal':(44,0.5),'hihatOpen':(46,1.3),
 'tomLow':(45,1.3),'tomMid':(47,1.2),'tomHigh':(50,1.1),'crash':(49,3.0),'ride':(51,2.2),'rideBell':(53,2.2),'tambourine':(54,0.6),'cowbell':(56,0.6),'shaker':(70,0.35)}
VELS=[64,112]
def render(prog, tag):
    mf=mido.MidiFile(ticks_per_beat=480); tr=mido.MidiTrack(); mf.tracks.append(tr)
    tr.append(mido.MetaMessage('set_tempo',tempo=1000000))  # 1 beat = 1 s, 480 ticks
    tr.append(mido.Message('control_change',channel=9,control=0,value=0,time=0))
    tr.append(mido.Message('program_change',channel=9,program=prog,time=0))
    order=[]
    for k,(n,d) in NOTES.items():
        for v in VELS:
            order.append((k,v,d))
            tr.append(mido.Message('note_on',channel=9,note=n,velocity=v,time=0))
            tr.append(mido.Message('note_off',channel=9,note=n,velocity=0,time=480*4))  # 4 s slot
    tr.append(mido.Message('note_on',channel=9,note=36,velocity=0,time=480))
    mf.save(f'{tag}.mid')
    subprocess.run(['fluidsynth','-ni','-F',f'{tag}.wav','-r',str(SR),'-g','0.8','-o','synth.reverb.active=0','-o','synth.chorus.active=0',SF,f'{tag}.mid'],capture_output=True,check=True)
    x=subprocess.run(['ffmpeg','-loglevel','error','-i',f'{tag}.wav','-f','f32le','-ac','1','-ar',str(SR),'pipe:1'],capture_output=True).stdout
    x=np.frombuffer(x,dtype=np.float32).copy()
    segs=[]; mp={}; pos=0
    for i,(k,v,d) in enumerate(order):
        s=x[int(i*4*SR):int(i*4*SR+d*SR)].copy()
        # start at the onset
        th=max(1e-4,np.max(np.abs(s))*0.02); on=int(np.argmax(np.abs(s)>th)); on=max(0,on-8); s=s[on:]
        # cut once quiet (-60 dB from peak), fade 25 ms
        pk=np.max(np.abs(s)); env=np.abs(s)>pk*0.001; last=len(s)-int(np.argmax(env[::-1])); s=s[:max(int(0.05*SR),last)]
        f=min(len(s),int(0.025*SR)); s[-f:]*=np.linspace(1,0,f)
        mp.setdefault(k,{})[str(v)]=[pos,len(s),round(float(pk),4)]
        segs.append(s); segs.append(np.zeros(64,dtype=np.float32)); pos+=len(s)+64
    allx=np.concatenate(segs); g=0.98/np.max(np.abs(allx)); allx*=g
    for k in mp:
        for v in mp[k]: mp[k][v][2]=round(float(mp[k][v][2]*g),4)
    import wave
    w=wave.open(f'{tag}-kit.wav','wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((allx*32767).astype(np.int16).tobytes()); w.close()
    subprocess.run(['ffmpeg','-loglevel','error','-y','-i',f'{tag}-kit.wav','-c:a','flac','-compression_level','8',f'{tag}.flac'],check=True)
    json.dump({'sr':SR,'map':mp},open(f'{tag}.json','w'))
    print(tag, len(allx)/SR, 's', round(sum(1 for _ in [0])), flush=True)
for prog,tag in [(0,'studio'),(16,'rock'),(32,'jazz')]:
    render(prog,tag)
