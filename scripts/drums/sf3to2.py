import struct, sys, io
sys.path.insert(0, '/home/claude/thedude/scripts/soundfont')
import numpy as np, soundfile as sf
from sf2info import parse, chunks
src, dst = sys.argv[1], sys.argv[2]
d, pdta, sdta = parse(src)
so, ssz = sdta[b'smpl']
o, sz = pdta[b'shdr']; n = sz // 46
pcm = bytearray(); new_shdr = bytearray()
for i in range(n):
    rec = bytearray(d[o+i*46:o+(i+1)*46])
    if i == n - 1:
        new_shdr += rec; continue
    start, end, sl, el, rate, pitch, corr, link, typ = struct.unpack('<IIIIIBbHH', rec[20:46])
    if typ & 0x10:
        data, r = sf.read(io.BytesIO(d[so+start:so+end]), dtype='int16')
        if data.ndim > 1: data = data[:, 0]
        b0 = len(pcm) // 2; pcm += data.astype('<i2').tobytes(); b1 = len(pcm) // 2
        pcm += b'\0' * 92
        struct.pack_into('<IIIIIBbHH', rec, 20, b0, b1, b0 + sl, b0 + el, rate, pitch, corr, link, typ & ~0x10)
    new_shdr += rec
def chunk(cid, payload):
    pad = b'\0' if len(payload) & 1 else b''
    return cid + struct.pack('<I', len(payload)) + payload + pad
out = []
for cid, lo, lsz in chunks(d, 12, len(d)):
    kind = d[lo:lo+4]
    if kind == b'sdta': body = b'sdta' + chunk(b'smpl', bytes(pcm))
    elif kind == b'pdta':
        body = b'pdta'
        for c, co, csz in chunks(d, lo+4, lo+lsz):
            body += chunk(c, bytes(new_shdr) if c == b'shdr' else d[co:co+csz])
    else: body = d[lo:lo+lsz]
    out.append(chunk(b'LIST', body))
riff = b'sfbk' + b''.join(out)
open(dst, 'wb').write(b'RIFF' + struct.pack('<I', len(riff)) + riff)
print('ok', n, len(pcm))
