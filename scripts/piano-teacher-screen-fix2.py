# Repaint the piano-teacher picture's screen: correct grand staff (C Am F G,
# Bravura glyphs) and C / Am keyboard diagrams. Usage: <src> [out]
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import sys
SRC=sys.argv[1]  # the user's original picture (2026-10-26)
BRAV='/home/claude/thedude/node_modules/@coderline/alphatab/dist/font/Bravura.otf'
SANS='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
img=Image.open(SRC).convert('RGB')
A=np.asarray(img).astype(float)
lum=A.mean(2)
m=((lum<75)&(A[:,:,2]>A[:,:,0]+30)).astype(float)
from scipy.ndimage import gaussian_filter
def blur(a,r): return gaussian_filter(a.astype(float),r)
den=blur(m,18)+1e-6
BG=np.stack([blur(A[:,:,c]*m,18)/den for c in range(3)],2).clip(0,255)
INK=(215,236,250); S=4

def coeffs(dst,src):
    a,b=[],[]
    for (x,y),(u,v) in zip(dst,src):
        a.append([x,y,1,0,0,0,-u*x,-u*y]);b.append(u)
        a.append([0,0,0,x,y,1,-v*x,-v*y]);b.append(v)
    return np.linalg.solve(np.array(a,float),np.array(b,float)).tolist()
def glow(layer,r,k,col=(80,190,255)):
    a=layer.split()[3].filter(ImageFilter.GaussianBlur(r))
    g=Image.new('RGBA',layer.size,col+(0,)); g.putalpha(a.point(lambda v:int(v*k)))
    o=Image.new('RGBA',layer.size,(0,0,0,0)); o.alpha_composite(g); o.alpha_composite(layer); return o
def paste(layer,quad,clear=True,feather=1.0):
    """layer: RGBA drawing in a W x H canvas mapped onto quad (TL,TR,BR,BL). clear = repaint the quad with background first."""
    global img
    W,H=layer.size
    c=coeffs(quad,[(0,0),(W,0),(W,H),(0,H)])
    warped=layer.transform(img.size,Image.PERSPECTIVE,c,Image.BICUBIC)
    base=np.asarray(img).astype(float)
    if clear:
        mk=Image.new('L',img.size,0); ImageDraw.Draw(mk).polygon(quad,fill=255)
        mk=np.asarray(mk.filter(ImageFilter.GaussianBlur(feather))).astype(float)[:,:,None]/255
        base=base*(1-mk)+BG*mk
    w=np.asarray(warped).astype(float); a=w[:,:,3:]/255
    base=base*(1-a)+w[:,:,:3]*a
    img=Image.fromarray(base.clip(0,255).astype(np.uint8))

# ---------------- grand staff (canvas in source-pixel units x S)
W,H=445,158
lay=Image.new('RGBA',(W*S,H*S),(0,0,0,0)); d=ImageDraw.Draw(lay)
sp=7.5*S; tt=40*S; bt=tt+9.6*sp; x0=15*S; x1=(W-6)*S; lw=int(0.9*S)
for top in (tt,bt):
    for k in range(5): d.line((x0,top+k*sp,x1,top+k*sp),fill=INK,width=lw)
f=ImageFont.truetype(BRAV,int(4*sp))
d.line((x0,tt,x0,bt+4*sp),fill=INK,width=lw)
hgt=bt+4*sp-tt
d.text((x0-0.4*S,bt+4*sp),'',font=ImageFont.truetype(BRAV,int(hgt)),fill=INK,anchor='rs') if False else d.text((x0-1*S,bt+4*sp),'\ue000',font=ImageFont.truetype(BRAV,int(hgt)),fill=INK,anchor='rs')
d.text((x0+0.7*sp,tt+3*sp),'',font=f,fill=INK,anchor='ls')
d.text((x0+0.7*sp,bt+1*sp),'',font=f,fill=INK,anchor='ls')
for top in (tt,bt):
    d.text((x0+4.3*sp,top+1*sp),'',font=f,fill=INK,anchor='ls')
    d.text((x0+4.3*sp,top+3*sp),'',font=f,fill=INK,anchor='ls')
bx0=x0+7.0*sp; bw=(x1-bx0)/4
for b in range(1,5):
    xb=bx0+b*bw; d.line((xb,tt,xb,bt+4*sp),fill=INK,width=lw)
xe=x1; d.line((xe-0.5*sp,tt,xe-0.5*sp,bt+4*sp),fill=INK,width=lw); d.line((xe,tt,xe,bt+4*sp),fill=INK,width=int(lw*2.6))
# whole notes. treble steps from E4 (bottom line), bass steps from G2 (bottom line)
tre=[(-2,0,2),(-2,0,3),(-2,1,3),(-3,-1,2)]   # C4 E4 G4 | C4 E4 A4 | C4 F4 A4 | B3 D4 G4
bas=[3,1,-1,0]                               # C3 | A2 | F2 | G2
names=['C','Am','F','G']
wn=''; nw=d.textbbox((0,0),wn,font=f)[2]-d.textbbox((0,0),wn,font=f)[0]
lf=ImageFont.truetype(SANS,int(17*S))
for b in range(4):
    cx=bx0+b*bw+bw*0.30
    for st in tre[b]:
        y=tt+4*sp-st*sp/2
        d.text((cx,y),wn,font=f,fill=INK,anchor='ls')
    for st in range(-2,min(tre[b])-1,-2):        # ledger lines below the treble staff
        y=tt+4*sp-st*sp/2; d.line((cx-0.35*nw,y,cx+1.35*nw,y),fill=INK,width=lw)
    st=bas[b]; y=bt+4*sp-st*sp/2
    d.text((cx,y),wn,font=f,fill=INK,anchor='ls')
    d.text((cx+nw/2,tt-2.6*sp),names[b],font=lf,fill=(235,245,255),anchor='ms')
staff=glow(lay,2*S,0.5).resize((W,H),Image.LANCZOS)
paste(staff,[(745,203),(1192,189),(1192,361),(745,363)])

# ---------------- keyboards
def kbd(nw_,lit,blacks,w,h,col=(60,200,250)):
    lay=Image.new('RGBA',(w*S,h*S),(0,0,0,0)); d=ImageDraw.Draw(lay)
    kw=w*S/nw_; top=0; bot=h*S
    for k in range(nw_):
        x=k*kw; d.rectangle((x+0.6*S,top,x+kw-0.6*S,bot),fill=col if k in lit else (200,220,234))
    gl=Image.new('RGBA',lay.size,(0,0,0,0)); gd=ImageDraw.Draw(gl)
    for k in lit: gd.rectangle((k*kw,top,(k+1)*kw,bot),fill=col+(255,))
    gl=gl.filter(ImageFilter.GaussianBlur(2.5*S)); gl.putalpha(gl.split()[3].point(lambda v:int(v*0.6)))
    out=Image.new('RGBA',lay.size,(0,0,0,0)); out.alpha_composite(gl); out.alpha_composite(lay)
    d=ImageDraw.Draw(out)
    for k in blacks:
        cx=(k+1)*kw; bwd=kw*0.6
        d.rectangle((cx-bwd/2,top,cx+bwd/2,bot*0.62),fill=(16,30,42))
    return out.resize((w,h),Image.LANCZOS),kw/S
# small: F G A B C D E F G (9 whites), blacks after F G A, C D, F
SB=[0,1,2,4,5,7]
k1,_=kbd(9,[4,6,8],SB,80,44); paste(k1,[(523,233),(603,231),(603,275),(523,276)])     # C = C E G
k2,_=kbd(9,[2,4,6],SB,86,47); paste(k2,[(626,228),(712,226),(712,273),(626,274)])     # Am = A C E
# big: 14 whites F..E, C E G = 4,6,8
BB=[0,1,2,4,5,7,8,9,11,12]
k3,kw=kbd(14,[4,6,8],BB,194,60); paste(k3,[(521,307),(715,303),(715,365),(521,367)])
# labels under the big keyboard
L=Image.new('RGBA',(194*S,16*S),(0,0,0,0)); d=ImageDraw.Draw(L)
lf=ImageFont.truetype(SANS,int(12*S))
for k,n in ((4,'C'),(6,'E'),(8,'G')): d.text(((k+0.5)*kw*S,13*S),n,font=lf,fill=(235,245,255),anchor='ms')
paste(L.resize((194,16),Image.LANCZOS),[(521,371),(715,369),(715,387),(521,389)])
img.save(sys.argv[2] if len(sys.argv) > 2 else 'piano-teacher.png')
