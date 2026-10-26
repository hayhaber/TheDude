import math
from collections import deque
from PIL import Image, ImageFilter, ImageDraw
import numpy as np
import sys
SRC = sys.argv[1]  # the user's bass photo on white -> bass.webp (copy to public/home/bass-pb<n>.webp, a new name per picture)
im=Image.open(SRC).convert('RGB'); a=np.asarray(im).astype(np.int16); h,w,_=a.shape
mn=a.min(2); mx=a.max(2); lum=a.mean(2); ys=np.arange(h)[:,None]
neutral=(mx-mn<16)
bg=neutral&((mn>222)|((ys>880)&(lum>110)))   # the floor shadow under the body too
seen=np.zeros((h,w),bool); q=deque()
for x in range(w):
    for y in (0,h-1):
        if bg[y,x]: seen[y,x]=True; q.append((y,x))
for y in range(h):
    for x in (0,w-1):
        if bg[y,x] and not seen[y,x]: seen[y,x]=True; q.append((y,x))
while q:
    y,x=q.popleft()
    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny,nx=y+dy,x+dx
        if 0<=ny<h and 0<=nx<w and not seen[ny,nx] and bg[ny,nx]:
            seen[ny,nx]=True; q.append((ny,nx))
alpha=np.where(seen,0,255).astype(np.uint8)
am=Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
rgba=Image.fromarray(a.astype(np.uint8)).convert('RGBA'); rgba.putalpha(am)
# same lean as the electric guitar photo (23.1 deg from vertical; this one 42.4)
rot=rgba.rotate(42.4-23.1, resample=Image.BICUBIC, expand=True)
rot=rot.crop(rot.getbbox())
# a soft floor shadow under the lowest point, like the guitar photo's
W,H=rot.size; pad=40
canvas=Image.new('RGBA',(W,H+pad),(0,0,0,0))
al=np.asarray(rot)[...,3]; cols=np.where(al[H-25:,:].max(0)>40)[0]
cx=int(cols.mean()) if len(cols) else W//2
sh=Image.new('L',(W,H+pad),0); d=ImageDraw.Draw(sh)
d.ellipse((cx-W*0.30,H-14,cx+W*0.30,H+14),fill=70)
sh=sh.filter(ImageFilter.GaussianBlur(10))
shadow=Image.new('RGBA',(W,H+pad),(0,0,0,0)); shadow.putalpha(sh)
canvas.alpha_composite(shadow); canvas.alpha_composite(rot,(0,0))
canvas=canvas.crop(canvas.getbbox())
out=canvas.resize((640,round(canvas.height*640/canvas.width)),Image.LANCZOS) if canvas.width>640 else canvas
# match the guitar file's height ratio: scale to 1059 tall max
if out.height>1100: out=out.resize((round(out.width*1100/out.height),1100),Image.LANCZOS)
out.save('bass.webp','WEBP',quality=86,method=6)
print('rotated size',rot.size,'final',out.size)
for bgc,name in [('#f4f4f6','bass_light.png'),('#202022','bass_dark2.png')]:
    b=Image.new('RGBA',out.size,bgc); b.alpha_composite(out); b.convert('RGB').save(name)
