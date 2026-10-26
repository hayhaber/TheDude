import sys
from collections import deque
from PIL import Image, ImageFilter
import numpy as np
SRC=sys.argv[1]
a=np.asarray(Image.open(SRC).convert('RGB')).astype(np.int16); h,w,_=a.shape
mn=a.min(2); mx=a.max(2); lum=a.mean(2)
bg=(mx-mn<14)&(mn>222)
keep=np.zeros((h,w),bool)   # object whites that must stay: drum heads, the tape deck
for x0,y0,x1,y1 in [(175,400,540,680),(560,385,945,650)]:
    keep[y0:y1,x0:x1]=True
seen=np.zeros((h,w),bool)
def flood(starts, limit_keep):
    comp=[]; q=deque(starts)
    for p in starts: seen[p]=True
    while q:
        y,x=q.popleft(); comp.append((y,x))
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<h and 0<=nx<w and not seen[ny,nx] and bg[ny,nx] and not (limit_keep and keep[ny,nx]):
                seen[ny,nx]=True; q.append((ny,nx))
    return comp
border=[(y,x) for x in range(w) for y in (0,h-1) if bg[y,x]]+[(y,x) for y in range(h) for x in (0,w-1) if bg[y,x]]
flood([p for p in set(border)], False)
# white pockets closed in by cables / stands
for y in range(h):
    for x in range(w):
        if bg[y,x] and not seen[y,x] and not keep[y,x]:
            comp=flood([(y,x)], True)
            if len(comp)<40:
                for p in comp: seen[p]=False
dark=np.clip(236-lum,0,255)*1.4
alpha=np.full((h,w),255.0)
alpha[seen]=np.where(dark[seen]<7,0,dark[seen])
out=a.copy(); out[seen]=0
am=Image.fromarray(alpha.astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.5))
im=Image.fromarray(out.astype(np.uint8)).convert('RGBA'); im.putalpha(am)
al=np.asarray(am); im=im.crop(Image.fromarray(np.where(al>14,255,0).astype(np.uint8)).getbbox())
im=im.resize((900,round(im.height*900/im.width)),Image.LANCZOS)
im.save(sys.argv[2],'WEBP',quality=86,method=6); print(im.size)
