# SF2 -> SF3 (Ogg Vorbis per sample, MuseScore/alphaTab layout):
# shdr start/end = byte range of the sample's Ogg stream in smpl,
# startLoop/endLoop = frames relative to the sample start, sampleType |= 0x10.
import struct, sys, io
import numpy as np, soundfile as sf
from sf2info import parse, chunks

src, dst, level = sys.argv[1], sys.argv[2], float(sys.argv[3])
d, pdta, sdta = parse(src)
so, ssz = sdta[b'smpl']
pcm = np.frombuffer(d[so:so+ssz], dtype='<i2')
o, sz = pdta[b'shdr']; n = sz // 46
new_smpl = bytearray(); new_shdr = bytearray()
for i in range(n):
    rec = bytearray(d[o+i*46:o+(i+1)*46])
    if i == n - 1:  # EOS terminal record
        new_shdr += rec; continue
    start, end, sl, el, rate, pitch, corr, link, typ = struct.unpack('<IIIIIBbHH', rec[20:46])
    data = pcm[start:end].astype(np.float32) / 32768.0
    buf = io.BytesIO()
    sf.write(buf, data, rate, format='OGG', subtype='VORBIS', compression_level=level)
    ogg = buf.getvalue()
    b0 = len(new_smpl); new_smpl += ogg; b1 = len(new_smpl)
    struct.pack_into('<IIIIIBbHH', rec, 20, b0, b1, max(0, sl - start), max(0, el - start), rate, pitch, corr, link, typ | 0x10)
    new_shdr += rec
# rebuild RIFF: copy INFO + pdta (with new shdr), new sdta
def chunk(cid, payload):
    pad = b'\0' if len(payload) & 1 else b''
    return cid + struct.pack('<I', len(payload)) + payload + pad
out_lists = []
for cid, lo, lsz in chunks(d, 12, len(d)):
    kind = d[lo:lo+4]
    if kind == b'sdta':
        body = b'sdta' + chunk(b'smpl', bytes(new_smpl))
    elif kind == b'pdta':
        body = b'pdta'
        for c, co, csz in chunks(d, lo+4, lo+lsz):
            body += chunk(c, bytes(new_shdr) if c == b'shdr' else d[co:co+csz])
    else:
        body = d[lo:lo+lsz]
    out_lists.append(chunk(b'LIST', body))
riff = b'sfbk' + b''.join(out_lists)
open(dst, 'wb').write(b'RIFF' + struct.pack('<I', len(riff)) + riff)
print('samples', n-1, 'smpl', len(new_smpl), 'file', 8 + len(riff))
