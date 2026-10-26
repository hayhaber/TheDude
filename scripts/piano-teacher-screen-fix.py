# Repaint the piano-teacher picture's screen with correct music: a real grand
# staff (Bravura glyphs) and real C / Am keyboard diagrams, glowing like the rest.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = '/mnt/user-data/attachments/a2fe8c5a-307b-5582-b3ee-d823895b9c38/11cdb159-image.jpg'
BRAV = '/home/claude/thedude/node_modules/@coderline/alphatab/dist/font/Bravura.otf'
img = Image.open(SRC).convert('RGB')
INK = (170, 232, 255)
S = 3  # supersampling


def glow_layer(layer, radius=4, strength=0.9):
    a = layer.split()[3].filter(ImageFilter.GaussianBlur(radius))
    g = Image.new('RGBA', layer.size, (90, 200, 255, 0))
    g.putalpha(a.point(lambda v: int(v * strength)))
    out = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    out.alpha_composite(g)
    out.alpha_composite(layer)
    return out


def perspective_coeffs(dst, src):
    # maps output (dst) points to input (src) points, for Image.transform
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); B.append(v)
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()


def paste_quad(canvas, quad, feather=1.5):
    W, H = canvas.size
    coeffs = perspective_coeffs(quad, [(0, 0), (W, 0), (W, H), (0, H)])
    warped = canvas.transform(img.size, Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).polygon(quad, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(feather))
    a = np.asarray(warped.split()[3]).astype(float) * np.asarray(mask).astype(float) / 255
    warped.putalpha(Image.fromarray(a.astype(np.uint8)))
    base = img.convert('RGBA'); base.alpha_composite(warped)
    return base.convert('RGB')


def bg(W, H, left, right):
    x = np.linspace(0, 1, W)[None, :, None]
    arr = np.array(left)[None, None, :] * (1 - x) + np.array(right)[None, None, :] * x
    arr = np.repeat(arr, H, axis=0)
    return Image.fromarray(arr.astype(np.uint8)).convert('RGBA')


# ------------------------------------------------------------ grand staff
W, H = 590 * S, 170 * S
sp = 10 * S                      # staff space
tre_top = 22 * S                 # treble top line
bas_top = tre_top + 4 * sp + 5.5 * sp
x0 = 18 * S                      # system start
x1 = W - 10 * S
lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(lay)
lw = max(2, int(1.2 * S))
for top in (tre_top, bas_top):
    for k in range(5):
        y = top + k * sp
        d.line((x0, y, x1, y), fill=INK, width=lw)
f = ImageFont.truetype(BRAV, 4 * sp)
d.line((x0, tre_top, x0, bas_top + 4 * sp), fill=INK, width=lw + 1)
d.text((x0 - 2.2 * sp, bas_top + 4 * sp), '', font=ImageFont.truetype(BRAV, int(4 * sp * (bas_top + 4 * sp - tre_top) / (4 * sp))), fill=INK, anchor='ls')
d.text((x0 + 0.8 * sp, tre_top + 3 * sp), '', font=f, fill=INK, anchor='ls')   # G clef on the G line
d.text((x0 + 0.8 * sp, bas_top + 1 * sp), '', font=f, fill=INK, anchor='ls')   # F clef on the F line
for top in (tre_top, bas_top):
    d.text((x0 + 4.6 * sp, top + 1 * sp), '', font=f, fill=INK, anchor='ls')
    d.text((x0 + 4.6 * sp, top + 3 * sp), '', font=f, fill=INK, anchor='ls')
bar_x0 = x0 + 7.2 * sp
bars = 4
bw = (x1 - bar_x0) / bars
for b in range(1, bars + 1):
    xb = bar_x0 + b * bw
    d.line((xb, tre_top, xb, bas_top + 4 * sp), fill=INK, width=lw + (1 if b == bars else 0))
# melody (steps above E4) and chords (steps above G2), quarter notes, 4 per bar
melody = [[0, 1, 2, 0], [2, 0, 1, 0], [1, 2, 3, 1], [2, 1, 0, 0]]
chords = [(3, 5), (3, 5), (6, 8), (3, 5)]          # C-E, C-E, F-A, C-E
nh = ''
nw = d.textbbox((0, 0), nh, font=f)[2]
for b in range(bars):
    for q in range(4):
        cx = bar_x0 + b * bw + (q + 0.65) * bw / 4.3
        # treble, stems up on the right
        st = melody[b][q]
        y = tre_top + 4 * sp - st * sp / 2
        d.text((cx, y), nh, font=f, fill=INK, anchor='ls')
        d.line((cx + nw - 1, y - 0.2 * sp, cx + nw - 1, y - 3.5 * sp), fill=INK, width=lw)
        # bass chord, stems down on the left
        lo, hi = chords[b]
        ylo = bas_top + 4 * sp - lo * sp / 2
        yhi = bas_top + 4 * sp - hi * sp / 2
        d.text((cx, ylo), nh, font=f, fill=INK, anchor='ls')
        d.text((cx, yhi), nh, font=f, fill=INK, anchor='ls')
        d.line((cx + 1, yhi + 0.2 * sp, cx + 1, ylo + 3.5 * sp), fill=INK, width=lw)
staff = bg(W, H, (3, 36, 56), (13, 49, 71))
staff.alpha_composite(glow_layer(lay, radius=3 * S, strength=0.55))
staff = staff.resize((W, H))
quad = [(601, 157), (1189, 141), (1189, 312), (601, 321)]
img = paste_quad(staff, quad)


# ------------------------------------------------------------ keyboards
def keyboard(lit, w=176, h=60):
    W, H = w * S, h * S
    can = bg(W, H, (30, 72, 96), (12, 52, 76))
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    n = 14
    pad = 2 * S
    kw = (W - 2 * pad) / n
    top, bot = 3 * S, H - 3 * S
    for k in range(n):
        x = pad + k * kw
        on = k in lit
        d.rectangle((x + 1, top, x + kw - 1, bot), fill=(90, 255, 160) if on else (196, 216, 228))
    glow = glow_layer(Image.new('RGBA', (W, H), (0, 0, 0, 0)))
    blacks = [0, 1, 3, 4, 5]  # after C, D, F, G, A
    for octv in range(2):
        for b in blacks:
            k = octv * 7 + b
            cxk = pad + (k + 1) * kw
            bwid = kw * 0.58
            d.rectangle((cxk - bwid / 2, top, cxk + bwid / 2, top + (bot - top) * 0.62), fill=(14, 26, 34))
    # green glow around lit keys
    gl = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gl)
    for k in lit:
        x = pad + k * kw
        gd.rectangle((x, top, x + kw, bot), fill=(70, 255, 150, 255))
    gl = gl.filter(ImageFilter.GaussianBlur(4 * S))
    gl.putalpha(gl.split()[3].point(lambda v: int(v * 0.7)))
    can.alpha_composite(gl)
    can.alpha_composite(lay)
    return can


img = paste_quad(keyboard([0, 2, 4]), [(396, 212), (571, 212), (571, 272), (396, 272)], feather=1.2)      # C: C E G
img = paste_quad(keyboard([5, 7, 9]), [(402, 297), (569, 297), (569, 355), (402, 355)], feather=1.2)      # Am: A C E
img.save('piano_fixed.png')
img.crop((380, 120, 1210, 380)).resize((1660, 520)).save('pf_zoom.png')
