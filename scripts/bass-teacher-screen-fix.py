# Repaint the bass-teacher picture's GROOVE panel: 3 real 4-string bass
# diagrams (root-5th-octave patterns), drawn behind the player / bass neck.
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter, binary_opening
SRC = sys.argv[1]; OUT = sys.argv[2] if len(sys.argv) > 2 else 'bass-teacher.png'
img = Image.open(SRC).convert('RGB'); A = np.asarray(img).astype(float)
r, g, b = A[..., 0], A[..., 1], A[..., 2]
H, W = r.shape
X0, Y0, X1, Y1 = 377, 186, 576, 381          # panel interior below the title
box = np.zeros((H, W), bool); box[Y0:Y1, X0:X1] = True
screen = box & (b - r > 28)
screen = binary_opening(screen, iterations=1) | (box & (b - r > 45))
navy = screen & (A.mean(2) < 95)
den = gaussian_filter(navy.astype(float), 10) + 1e-6
BG = np.stack([gaussian_filter(A[..., c] * navy, 10) / den for c in range(3)], 2)
S = 4
lay = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
LINE = (200, 232, 248, 255); NUT = (160, 218, 242, 255)
# string 1 = low E (left) .. 4 = G (right); dots [(string, fret)]
diagrams = [
    [(1, 3), (2, 5), (3, 5)],   # G: root E3, 5th A5, octave D5
    [(2, 3), (3, 5), (4, 5)],   # C: root A3, 5th D5, octave G5
    [(1, 1), (2, 3), (3, 3)],   # F: root E1, 5th A3, octave D3
]
dw, gap, top, ht = 40, 15, 200, 80
x = 419
for dots in diagrams:
    sx = [x + k * dw / 3 for k in range(4)]
    fy = [top + 6 + k * (ht - 6) / 5 for k in range(6)]
    d.rectangle((x * S - 2 * S, top * S, (x + dw) * S + 2 * S, (top + 6) * S), fill=NUT)
    for xx in sx: d.line((xx * S, (top + 6) * S, xx * S, (top + ht) * S), fill=LINE, width=int(1.4 * S))
    for yy in fy[1:]: d.line((x * S, yy * S, (x + dw) * S, yy * S), fill=LINE, width=int(1.4 * S))
    for s, f in dots:
        cx = sx[s - 1]; cy = (fy[f - 1] + fy[f]) / 2; rr = 4.6
        d.ellipse(((cx - rr) * S, (cy - rr) * S, (cx + rr) * S, (cy + rr) * S), fill=(215, 240, 252, 255))
    x += dw + gap
lay = lay.resize((W, H), Image.LANCZOS)
a = lay.split()[3].filter(ImageFilter.GaussianBlur(3))
glow = Image.new('RGBA', (W, H), (90, 200, 255, 0)); glow.putalpha(a.point(lambda v: int(v * 0.45)))
full = Image.new('RGBA', (W, H), (0, 0, 0, 0)); full.alpha_composite(glow); full.alpha_composite(lay)
F = np.asarray(full).astype(float)
m = gaussian_filter(screen.astype(float), 0.7)[..., None]
out = A * (1 - m) + BG * m
fa = F[..., 3:] / 255 * m
out = out * (1 - fa) + F[..., :3] * fa
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(OUT)
