import struct, sys, collections
def chunks(data, off, end):
    while off < end:
        cid = data[off:off+4]; size = struct.unpack('<I', data[off+4:off+8])[0]
        yield cid, off+8, size
        off += 8 + size + (size & 1)
def parse(path):
    d = open(path,'rb').read()
    assert d[:4]==b'RIFF' and d[8:12]==b'sfbk'
    lists={}
    for cid,o,sz in chunks(d,12,len(d)):
        if cid==b'LIST': lists[d[o:o+4]]=(o+4,o+sz)
    pdta={}
    for cid,o,sz in chunks(d,*lists[b'pdta']): pdta[cid]=(o,sz)
    sdta={}
    for cid,o,sz in chunks(d,*lists[b'sdta']): sdta[cid]=(o,sz)
    return d,pdta,sdta
if __name__=='__main__':
    d,pdta,sdta=parse(sys.argv[1])
    o,sz=pdta[b'shdr']; n=sz//46
    types=collections.Counter()
    for i in range(n-1):
        rec=d[o+i*46:o+(i+1)*46]
        name=rec[:20].split(b'\0')[0]; start,end,sl,el,rate,pitch,corr,link,typ=struct.unpack('<IIIIIBbHH',rec[20:46])
        types[typ]+=1
    print('samples',n-1,'types',dict(types),'smpl bytes',sdta[b'smpl'][1], 'sm24' in str(sdta.keys()))
    # presets
    o,sz=pdta[b'phdr']; 
    for i in range(sz//38-1):
        rec=d[o+i*38:o+(i+1)*38]; name=rec[:20].split(b'\0')[0].decode('latin1'); preset,bank=struct.unpack('<HH',rec[20:24])
        if bank in (0,128) and (24<=preset<=39 or bank==128 and preset in (0,1,16,25)): print(bank,preset,name)
