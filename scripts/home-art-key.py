# Key out the white background (flood fill from the border), soft edge.
import sys
from collections import deque
from PIL import Image
import numpy as np
src, out, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
POCKET_X = int(sys.argv[4]) if len(sys.argv) > 4 else 0
SHADOW = len(sys.argv) > 5 and sys.argv[5] == 'shadow'
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.int16)
h, w, _ = a.shape
mn = a.min(axis=2); mx = a.max(axis=2)
bgish = (mn > 222) & (mx - mn < 14)          # near-white, neutral
seen = np.zeros((h, w), bool)
q = deque()
for x in range(w):
    for y in (0, h - 1):
        if bgish[y, x]: seen[y, x] = True; q.append((y, x))
for y in range(h):
    for x in (0, w - 1):
        if bgish[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny, nx = y+dy, x+dx
        if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and bgish[ny, nx]:
            seen[ny, nx] = True; q.append((ny, nx))
# enclosed white pockets left of the screen (between arm and body)
lab = np.zeros((h, w), bool)
for y0 in range(h):
    for x0 in range(0, POCKET_X):
        if bgish[y0, x0] and not seen[y0, x0] and not lab[y0, x0] and mn[y0, x0] > 240:
            comp = []; q2 = deque([(y0, x0)]); lab[y0, x0] = True
            while q2:
                y, x = q2.popleft(); comp.append((y, x))
                for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                    ny, nx = y+dy, x+dx
                    if 0 <= ny < h and 0 <= nx < w and not lab[ny, nx] and not seen[ny, nx] and bgish[ny, nx]:
                        lab[ny, nx] = True; q2.append((ny, nx))
            if len(comp) > 150 and max(p[1] for p in comp) < POCKET_X + 5:
                for p in comp: seen[p] = True
alpha = np.full((h, w), 255, np.uint8)
# background: alpha from darkness (keeps faint glow / shadow), 0 for pure white
lum = a.mean(axis=2)
if SHADOW:
    # background = black with alpha = darkness: a soft shadow stays exactly as it looked on white
    dark = 255 - lum[seen]
    alpha[seen] = np.where(dark < 7, 0, np.clip(dark, 0, 255)).astype(np.uint8)
    a[seen] = 0
else:
    alpha[seen] = np.clip((246 - lum[seen]) * 255 / 40, 0, 255).astype(np.uint8)
# feather the boundary 1px
from PIL import ImageFilter
am = Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.6))
rgba = Image.fromarray(a.astype(np.uint8)).convert('RGBA'); rgba.putalpha(am)
bbox = rgba.getbbox(); rgba = rgba.crop(bbox)
rgba = rgba.resize((width, round(rgba.height * width / rgba.width)), Image.LANCZOS)
rgba.save(out, 'WEBP', quality=86, method=6)
print(rgba.size, bbox)
