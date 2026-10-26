# SF2 pdta parser: preset (bank 0) -> for a key/vel, the instrument zones (global zones merged) that sound.
import struct, sys
sys.path.insert(0,'/home/claude/thedude/scripts/soundfont')
from sf2info import parse
def load(path):
    d,pd,sd=parse(path)
    def recs(cid,size):
        o,sz=pd[cid]; return [d[o+i:o+i+size] for i in range(0,sz,size)]
    P=dict(phdr=recs(b'phdr',38),pbag=recs(b'pbag',4),pgen=recs(b'pgen',4),inst=recs(b'inst',22),ibag=recs(b'ibag',4),igen=recs(b'igen',4),shdr=recs(b'shdr',46))
    return d,pd,P
def gens(P,bagkey,genkey,b):
    g0=struct.unpack('<H',P[bagkey][b][:2])[0]; g1=struct.unpack('<H',P[bagkey][b+1][:2])[0]
    out=[]
    for g in range(g0,g1):
        op=struct.unpack('<H',P[genkey][g][:2])[0]; raw=P[genkey][g][2:4]
        out.append((op,raw,g))
    return out
def rng(raw): return raw[0],raw[1]
def zones_for(P,program,key,vel=100,bank=0):
    res=[]
    for i in range(len(P['phdr'])-1):
        pre,bk,bag0=struct.unpack('<HHH',P['phdr'][i][20:26]); bag1=struct.unpack('<H',P['phdr'][i+1][24:26])[0]
        if pre!=program or bk!=bank: continue
        for b in range(bag0,bag1):
            G=gens(P,'pbag','pgen',b); kr=(0,127); vr=(0,127); inst=None
            for op,raw,g in G:
                if op==43: kr=rng(raw)
                elif op==44: vr=rng(raw)
                elif op==41: inst=struct.unpack('<H',raw)[0]
            if inst is None or not(kr[0]<=key<=kr[1] and vr[0]<=vel<=vr[1]): continue
            a0=struct.unpack('<H',P['inst'][inst][20:22])[0]; a1=struct.unpack('<H',P['inst'][inst+1][20:22])[0]
            for ib in range(a0,a1):
                IG=gens(P,'ibag','igen',ib); ikr=(0,127); ivr=(0,127); smp=None
                for op,raw,g in IG:
                    if op==43: ikr=rng(raw)
                    elif op==44: ivr=rng(raw)
                    elif op==53: smp=struct.unpack('<H',raw)[0]
                if smp is None: continue
                if ikr[0]<=key<=ikr[1] and ivr[0]<=vel<=ivr[1]: res.append((inst,ib,smp))
    return res
