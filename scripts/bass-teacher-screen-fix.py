# Repaint the bass-teacher picture's GROOVE panel (PNG version, 2026-10-26):
# 3 real 4-string bass diagrams (root-5th-octave) with names, behind the
# player / bass neck. Usage: <src> [out]
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy.ndimage import gaussian_filter, binary_opening
SRC = sys.argv[1]; OUT = sys.argv[2] if len(sys.argv) > 2 else 'bass-teacher.png'
SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
img = Image.open(SRC).convert('RGB'); A = np.asarray(img).astype(float)
r, g, b = A[..., 0], A[..., 1], A[..., 2]; lum = A.mean(2)
H, W = r.shape
X0, Y0, X1, Y1 = 470, 252, 705, 435            # panel interior under the GROOVE rule
yy, xx = np.mgrid[0:H, 0:W]
box = (xx >= X0) & (xx < X1) & (yy >= Y0) & (yy < Y1)
screen = box & (b - r > 28)
screen = binary_opening(screen, iterations=1) | (box & (b - r > 45))
screen |= box & (lum > 110) & (b >= r - 5) & ((xx < 645) | (yy < 318))   # old white labels/dots
navy = box & (b - r > 28) & (lum < 75)
den = gaussian_filter(navy.astype(float), 10) + 1e-6
BG = np.stack([gaussian_filter(A[..., c] * navy, 10) / den for c in range(3)], 2)
S = 4
lay = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
LINE = (200, 232, 248, 255); NUT = (110, 210, 245, 255)
font = ImageFont.truetype(SANS, 15 * S)
diagrams = [  # name, dots [(string 1=E .. 4=G, fret)]
    ('G', [(1, 3), (2, 5), (3, 5)]),
    ('C', [(2, 3), (3, 5), (4, 5)]),
    ('F', [(1, 1), (2, 3), (3, 3)]),
]
dw, gap, top, ht = 50, 20, 284, 58
x = 478
for name, dots in diagrams:
    sx = [x + k * dw / 3 for k in range(4)]
    fy = [top + 5 + k * (ht - 5) / 5 for k in range(6)]
    d.text(((x + dw / 2) * S, (top - 7) * S), name, font=font, fill=(235, 245, 255, 255), anchor='ms')
    d.rectangle(((x - 1.5) * S, top * S, (x + dw + 1.5) * S, (top + 5) * S), fill=NUT)
    for xs in sx: d.line((xs * S, (top + 5) * S, xs * S, (top + ht) * S), fill=LINE, width=int(1.5 * S))
    for ys in fy[1:]: d.line((x * S, ys * S, (x + dw) * S, ys * S), fill=LINE, width=int(1.5 * S))
    for s, f in dots:
        cx = sx[s - 1]; cy = (fy[f - 1] + fy[f]) / 2; rr = 4.8
        d.ellipse(((cx - rr) * S, (cy - rr) * S, (cx + rr) * S, (cy + rr) * S), fill=(220, 242, 252, 255))
    x += dw + gap
lay = lay.resize((W, H), Image.LANCZOS)
a = lay.split()[3].filter(ImageFilter.GaussianBlur(3))
glow = Image.new('RGBA', (W, H), (90, 200, 255, 0)); glow.putalpha(a.point(lambda v: int(v * 0.5)))
full = Image.new('RGBA', (W, H), (0, 0, 0, 0)); full.alpha_composite(glow); full.alpha_composite(lay)
F = np.asarray(full).astype(float)
m = gaussian_filter(screen.astype(float), 0.7)[..., None]
out = A * (1 - m) + BG * m
fa = F[..., 3:] / 255 * m
out = out * (1 - fa) + F[..., :3] * fa
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(OUT)
