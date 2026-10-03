# Adds a "speaker cabinet" low-pass (SF2 generator 8, initialFilterFc) to the
# instrument zones used by the GM guitar presets, so the electric guitars lose
# the fizzy/metallic top end. Rewrites pdta (ibag/igen) consistently.
import struct, sys, math
from sf2info import chunks

src, dst = sys.argv[1], sys.argv[2]
TARGET_HZ = {24: 6000, 25: 6500, 26: 3200, 27: 4500, 28: 3200, 29: 3000, 30: 2800}
cents = lambda hz: int(round(1200 * math.log2(hz / 8.176)))

d = open(src, 'rb').read()
lists = {}
for cid, o, sz in chunks(d, 12, len(d)):
    if cid == b'LIST': lists[d[o:o+4]] = (o + 4, o + sz)
pd = {}
for cid, o, sz in chunks(d, *lists[b'pdta']): pd[cid] = d[o:o+sz]

def recs(b, size): return [b[i:i+size] for i in range(0, len(b), size)]
phdr = recs(pd[b'phdr'], 38); pbag = recs(pd[b'pbag'], 4); pgen = recs(pd[b'pgen'], 4)
inst = recs(pd[b'inst'], 22); ibag = recs(pd[b'ibag'], 4); igen = recs(pd[b'igen'], 4)

# instrument index -> lowest target among guitar presets using it
want = {}
for i in range(len(phdr) - 1):
    preset, bank, bag0 = struct.unpack('<HHH', phdr[i][20:26]); bag1 = struct.unpack('<H', phdr[i+1][24:26])[0]
    if bank != 0 or preset not in TARGET_HZ: continue
    for b in range(bag0, bag1):
        g0 = struct.unpack('<H', pbag[b][:2])[0]; g1 = struct.unpack('<H', pbag[b+1][:2])[0]
        for g in range(g0, g1):
            oper, amt = struct.unpack('<HH', pgen[g])
            if oper == 41:  # instrument
                want[amt] = min(want.get(amt, 99999), cents(TARGET_HZ[preset]))
                name = phdr[i][:20].split(b'\0')[0].decode('latin1')
                print('preset', preset, name, '-> inst', amt, inst[amt][:20].split(b'\0')[0].decode('latin1'), TARGET_HZ[preset], 'Hz')

pgen = list(pgen)
for i in range(len(phdr) - 1):
    preset, bank, bag0 = struct.unpack('<HHH', phdr[i][20:26]); bag1 = struct.unpack('<H', phdr[i+1][24:26])[0]
    if bank != 0 or preset not in TARGET_HZ: continue
    for b in range(bag0, bag1):
        g0 = struct.unpack('<H', pbag[b][:2])[0]; g1 = struct.unpack('<H', pbag[b+1][:2])[0]
        for g in range(g0, g1):
            oper = struct.unpack('<H', pgen[g][:2])[0]
            if oper in (8, 11, 10):  # filter cutoff offset, modEnv->filter, modLfo->filter
                pgen[g] = struct.pack('<Hh', oper, 0)
pd[b'pgen'] = b''.join(pgen)
# rebuild igen / ibag
new_igen = []; new_ibag_gen = []
changed = 0
for b in range(len(ibag) - 1):
    g0 = struct.unpack('<H', ibag[b][:2])[0]; g1 = struct.unpack('<H', ibag[b+1][:2])[0]
    new_ibag_gen.append(len(new_igen))
    gens = [struct.unpack('<Hh', igen[g]) for g in range(g0, g1)]
    # which instrument owns bag b?
    owner = None
    for k in range(len(inst) - 1):
        a0 = struct.unpack('<H', inst[k][20:22])[0]; a1 = struct.unpack('<H', inst[k+1][20:22])[0]
        if a0 <= b < a1: owner = k; break
    has_sample = any(o == 53 for o, _ in gens)
    if owner in want:
        target = want[owner]
        gens = [(o, 0 if o in (10, 11) else (target if o == 8 else a)) for o, a in gens]
        if has_sample and not any(o == 8 for o, _ in gens):
            gens.insert([o for o, _ in gens].index(53), (8, target))  # before sampleID
        changed += 1
    new_igen += [struct.pack('<Hh', o, a) for o, a in gens]
new_ibag_gen.append(len(new_igen))
# terminal igen record
new_igen.append(igen[-1])
new_ibag = [struct.pack('<H', new_ibag_gen[b]) + ibag[b][2:4] for b in range(len(ibag) - 1)]
new_ibag.append(struct.pack('<H', new_ibag_gen[-1]) + ibag[-1][2:4])
pd[b'ibag'] = b''.join(new_ibag); pd[b'igen'] = b''.join(new_igen)
print('zones changed', changed)

def chunk(cid, payload):
    return cid + struct.pack('<I', len(payload)) + payload + (b'\0' if len(payload) & 1 else b'')
out = []
for cid, lo, lsz in chunks(d, 12, len(d)):
    kind = d[lo:lo+4]
    if kind == b'pdta':
        body = b'pdta'
        for c, co, csz in chunks(d, lo+4, lo+lsz): body += chunk(c, pd[c])
    else:
        body = d[lo:lo+lsz]
    out.append(chunk(b'LIST', body))
riff = b'sfbk' + b''.join(out)
open(dst, 'wb').write(b'RIFF' + struct.pack('<I', len(riff)) + riff)
