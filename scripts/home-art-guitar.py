import json, re, math

S = 11.0          # px per inch
NUT = 82.0        # nut line (y)
SCALE = 24.75     # inches
CX = 100.0

def fy(inch):            # distance from nut (inches) -> y
    return NUT + inch * S

def fret_y(n):
    return fy(SCALE * (1 - 2 ** (-n / 12)))

BRIDGE = fy(SCALE)            # saddle line
BOARD_END = fret_y(22) + 3.2
def board_half(y):            # fretboard half-width, 1.69" at the nut -> 2.25" at the end
    t = (y - NUT) / (BOARD_END - NUT)
    return (1.69 + (2.25 - 1.69) * t) * S / 2

def string_x(i, y):           # i 0..5 = low E..high E
    tail = 375.0
    nut_w = 1.4 * S
    br_w = 2.0 * S
    t = (y - NUT) / (BRIDGE - NUT)
    w = nut_w + (br_w - nut_w) * t
    return CX - w / 2 + w * i / 5

def lp(p):
    out = []
    # ---- headstock: open-book, black gloss, 3+3 tuners
    hs = "M87,82 L80.5,18 C80,10 84,5.5 90.5,7 L100,10.5 L109.5,7 C116,5.5 120,10 119.5,18 L113,82 Z"
    posts = []
    for side in (-1, 1):
        for k, y in enumerate((60, 40, 21)):        # nearest nut first
            x_edge = 81.5 + (y - 18) * (6.5 / 64) if side < 0 else 118.5 - (y - 18) * (6.5 / 64)
            bx = x_edge + side * 0.0
            # tuner button (keystone) outside the edge
            kx = bx - 11 if side < 0 else bx + 1
            out.append(f'<rect x="{kx:.1f}" y="{y-3.6:.1f}" width="10" height="7.2" rx="3.4" fill="url(#{p}key)" stroke="#bdb39a" stroke-width=".4"/>')
            out.append(f'<rect x="{(bx-2.5 if side<0 else bx-0.5):.1f}" y="{y-1.2:.1f}" width="3" height="2.4" fill="url(#{p}ch)"/>')
            px = bx + side * -5.5
            posts.append((px, y))
    head = [f'<path d="{hs}" fill="url(#{p}hs)"/>',
            f'<path d="{hs}" fill="none" stroke="#ece2c8" stroke-width="1" opacity=".9"/>',
            f'<path d="M84,20 C84,14 88,11 92,12" stroke="#fff" stroke-opacity=".18" stroke-width="2" fill="none"/>',
            # truss-rod cover (bell)
            f'<path d="M96,64 Q100,60 104,64 L106,78 Q100,80 94,78 Z" fill="#141414" stroke="#ece2c8" stroke-width=".6"/>']
    bushings = ''.join(f'<circle cx="{x:.1f}" cy="{y}" r="2.6" fill="url(#{p}ch)"/><circle cx="{x:.1f}" cy="{y}" r="1" fill="#7c8088"/>' for x, y in posts)

    # ---- body (single cutaway, carved maple top, sunburst)
    # Two-circle outline (upper bout r=4.9" / lower bout r=6.5"), soft waist,
    # cutaway on the treble side — sampled, then smoothed (Catmull-Rom).
    import math as _m
    def arc(cx, cy, r, a0, a1, n):
        return [(cx + r * _m.cos(_m.radians(a0 + (a1 - a0) * k / n)), cy + r * _m.sin(_m.radians(a0 + (a1 - a0) * k / n))) for k in range(n + 1)]
    # (distance below the body's top edge, half-width), inches
    bass = [(0.0, 1.05), (0.35, 2.6), (1.0, 3.75), (2.1, 4.65), (3.4, 5.0), (4.9, 4.75), (6.3, 4.2),
            (7.6, 4.55), (9.1, 5.55), (10.7, 6.25), (12.2, 6.45), (13.7, 6.25), (15.1, 5.45), (16.3, 4.1), (17.0, 2.3), (17.25, 0.0)]
    treble = [(17.0, 2.3), (16.3, 4.1), (15.1, 5.45), (13.7, 6.25), (12.2, 6.45), (10.7, 6.25), (9.1, 5.55), (7.6, 4.55),
              (6.3, 4.2), (4.9, 4.75), (3.4, 4.9), (2.2, 4.45), (1.2, 3.55), (0.45, 2.7), (0.08, 1.95),
              # the cutaway horn's tip rounds over and its inner wall runs
              # right against the fretboard edge (no gap between horn and neck)
              (0.12, 1.45), (0.5, 1.12), (1.5, 1.1), (3.05, 1.1)]
    Y0 = 247.0
    pts = [(CX - hw * S, Y0 + d * S) for d, hw in bass] + [(CX + hw * S, Y0 + d * S) for d, hw in treble]
    def smooth(P):
        d = f"M{P[0][0]:.1f},{P[0][1]:.1f} "
        for i in range(len(P) - 1):
            p0 = P[i - 1] if i > 0 else P[i]
            p1, p2 = P[i], P[i + 1]
            p3 = P[i + 2] if i + 2 < len(P) else P[i + 1]
            c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
            c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
            d += f"C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f} "
        return d + "Z"
    body = smooth(pts)
    # ---- fretboard (rosewood, bound) over the body to fret 22
    hn, he = board_half(NUT), board_half(BOARD_END)
    board = f"M{CX-hn:.2f},{NUT} L{CX+hn:.2f},{NUT} L{CX+he:.2f},{BOARD_END:.2f} L{CX-he:.2f},{BOARD_END:.2f} Z"
    frets = ''
    for n in range(1, 23):
        y = fret_y(n); h = board_half(y)
        frets += (f'<line x1="{CX-h+0.6:.2f}" x2="{CX+h-0.6:.2f}" y1="{y+0.55:.2f}" y2="{y+0.55:.2f}" stroke="#000" stroke-opacity=".35" stroke-width=".6"/>'
                  f'<line x1="{CX-h+0.6:.2f}" x2="{CX+h-0.6:.2f}" y1="{y:.2f}" y2="{y:.2f}" stroke="#d4d6db" stroke-width="1"/>')
    inlays = ''
    for n in (3, 5, 7, 9, 12, 15, 17, 19, 21):      # trapezoids between fret n-1 and n
        y0, y1 = fret_y(n - 1), fret_y(n)
        gap = y1 - y0
        top, bot = y0 + gap * 0.2, y1 - gap * 0.2
        ht, hb = board_half(top) * 0.62, board_half(bot) * 0.74
        inlays += (f'<path d="M{CX-ht:.2f},{top:.2f} L{CX+ht:.2f},{top:.2f} L{CX+hb:.2f},{bot:.2f} L{CX-hb:.2f},{bot:.2f} Z" '
                   f'fill="url(#{p}pearl)"/>')
    grain = ''.join(f'<line x1="{CX-6+i*3:.1f}" x2="{CX-6.8+i*3.3:.1f}" y1="{NUT}" y2="{BOARD_END:.1f}" stroke="#000" stroke-opacity=".12" stroke-width=".5"/>' for i in range(5))

    def humbucker(cy):
        rw, rh = 3.45 * S, 1.95 * S
        cw, chh = 2.72 * S, 1.48 * S
        poles = ''
        for i in range(6):
            x = CX - 2.0 * S / 2 + 2.0 * S * i / 5
            poles += f'<circle cx="{x:.1f}" cy="{cy-chh/4:.1f}" r="1.25" fill="url(#{p}pole)"/>'
        return (f'<rect x="{CX-rw/2:.1f}" y="{cy-rh/2:.1f}" width="{rw:.1f}" height="{rh:.1f}" rx="3" fill="#efe5cc" stroke="#b9ab88" stroke-width=".5"/>'
                f'<rect x="{CX-cw/2:.1f}" y="{cy-chh/2:.1f}" width="{cw:.1f}" height="{chh:.1f}" rx="2.2" fill="url(#{p}ch)" stroke="#6d7179" stroke-width=".4"/>'
                f'<line x1="{CX-cw/2+2:.1f}" x2="{CX+cw/2-2:.1f}" y1="{cy+chh/4:.1f}" y2="{cy+chh/4:.1f}" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>'
                + poles)
    neck_pu = BOARD_END + 1.95 * S / 2 + 2
    bridge_pu = BRIDGE - 1.95 * S / 2 - 6
    # pickguard: raised, treble side, beside both pickups
    guard = (f"M113,{BOARD_END+1:.1f} C121,{BOARD_END-1:.1f} 129,{BOARD_END+5:.1f} 132,{BOARD_END+16:.1f} "
             f"C135,{BOARD_END+30:.1f} 133,{bridge_pu-2:.1f} 125,{bridge_pu+10:.1f} L120,{bridge_pu+9:.1f} "
             f"C120,{bridge_pu-12:.1f} 118,{neck_pu+4:.1f} 113,{BOARD_END+1:.1f} Z")
    # tune-o-matic bridge (slightly angled) and stop tailpiece
    tom = (f'<g transform="rotate(-2.2 {CX} {BRIDGE:.1f})">'
           f'<rect x="{CX-1.45*S:.1f}" y="{BRIDGE-2.6:.1f}" width="{2.9*S:.1f}" height="5.2" rx="1.6" fill="url(#{p}ch)" stroke="#5f636b" stroke-width=".4"/>'
           + ''.join(f'<rect x="{string_x(i, BRIDGE)-1.3:.1f}" y="{BRIDGE-1.6:.1f}" width="2.6" height="3.2" rx=".6" fill="#d9dce1" stroke="#7a7e86" stroke-width=".3"/>' for i in range(6))
           + f'<circle cx="{CX-1.55*S:.1f}" cy="{BRIDGE:.1f}" r="2.2" fill="url(#{p}ch)"/><circle cx="{CX+1.55*S:.1f}" cy="{BRIDGE:.1f}" r="2.2" fill="url(#{p}ch)"/></g>')
    TAIL = 375.0
    tail = (f'<rect x="{CX-1.6*S:.1f}" y="{TAIL-3.4:.1f}" width="{3.2*S:.1f}" height="6.8" rx="3.4" fill="url(#{p}ch)" stroke="#5f636b" stroke-width=".4"/>'
            f'<circle cx="{CX-1.6*S+2.6:.1f}" cy="{TAIL:.1f}" r="2.6" fill="url(#{p}ch)" stroke="#5f636b" stroke-width=".3"/>'
            f'<circle cx="{CX+1.6*S-2.6:.1f}" cy="{TAIL:.1f}" r="2.6" fill="url(#{p}ch)" stroke="#5f636b" stroke-width=".3"/>')
    knobs = ''.join(
        f'<circle cx="{x}" cy="{y}" r="5.2" fill="url(#{p}gold)" stroke="#5e420c" stroke-width=".5"/>'
        f'<circle cx="{x}" cy="{y}" r="2.6" fill="url(#{p}goldtop)"/>'
        for x, y in [(130, 380), (148, 371), (136, 401), (154, 392)])
    switch = (f'<circle cx="62" cy="270" r="5" fill="#ece2c8" stroke="#b9ab88" stroke-width=".5"/>'
              f'<circle cx="62" cy="270" r="2" fill="url(#{p}ch)"/><line x1="62" y1="270" x2="58" y2="262" stroke="#c9ccd2" stroke-width="1.4" stroke-linecap="round"/>'
              f'<circle cx="58" cy="262" r="2.2" fill="#efe6cf"/>')
    strings = ''
    gauges = [1.35, 1.15, 0.95, 0.75, 0.6, 0.5]
    for i in range(6):
        x0, x1 = string_x(i, NUT), string_x(i, TAIL)
        strings += f'<line x1="{x0:.2f}" y1="{NUT}" x2="{x1:.2f}" y2="{TAIL}" stroke="#e6e7eb" stroke-width="{gauges[i]}"/>'
        # over the nut to the tuner posts (E,A,D left from the nut up; e,B,G right)
        side = -1 if i < 3 else 1
        k = i if i < 3 else 5 - i
        px, py = posts[(0 if side < 0 else 3) + k]
        strings += f'<line x1="{x0:.2f}" y1="{NUT}" x2="{px:.1f}" y2="{py}" stroke="#e6e7eb" stroke-width="{gauges[i]*0.9:.2f}"/>'
    nut = f'<rect x="{CX-hn-0.6:.2f}" y="{NUT-2.2}" width="{2*hn+1.2:.2f}" height="2.6" rx=".6" fill="#f3ecda"/>'

    return f'''<svg viewBox="0 0 200 446" xmlns="http://www.w3.org/2000/svg">
<defs>
<linearGradient id="{p}ch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fafbfc"/><stop offset=".45" stop-color="#c3c6cc"/><stop offset=".55" stop-color="#959aa2"/><stop offset="1" stop-color="#e8eaee"/></linearGradient>
<radialGradient id="{p}sb" cx="55%" cy="63%" r="60%"><stop offset="0" stop-color="#f6c55a"/><stop offset=".35" stop-color="#e3922f"/><stop offset=".66" stop-color="#9c3d17"/><stop offset=".9" stop-color="#3a1608"/><stop offset="1" stop-color="#1c0904"/></radialGradient>
<radialGradient id="{p}gl" cx="40%" cy="34%" r="48%"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="{p}carve" cx="50%" cy="55%" r="55%"><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>
<linearGradient id="{p}rw" x1="0" x2="1"><stop offset="0" stop-color="#24120a"/><stop offset=".5" stop-color="#3f2316"/><stop offset="1" stop-color="#24120a"/></linearGradient>
<linearGradient id="{p}hs" x1="0" x2="1"><stop offset="0" stop-color="#050505"/><stop offset=".5" stop-color="#2a2a2e"/><stop offset="1" stop-color="#050505"/></linearGradient>
<linearGradient id="{p}fw" x1="0" x2="1"><stop offset="0" stop-color="#8d9097"/><stop offset=".5" stop-color="#f1f2f4"/><stop offset="1" stop-color="#8d9097"/></linearGradient>
<linearGradient id="{p}pearl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf6ea"/><stop offset=".4" stop-color="#e6dcc6"/><stop offset=".7" stop-color="#f6f0e2"/><stop offset="1" stop-color="#d9ccb0"/></linearGradient>
<linearGradient id="{p}key" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf7ec"/><stop offset="1" stop-color="#d9cfb5"/></linearGradient>
<radialGradient id="{p}gold" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff0b0"/><stop offset=".55" stop-color="#d6a12c"/><stop offset="1" stop-color="#6e4c0e"/></radialGradient>
<radialGradient id="{p}goldtop" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#fff6cf"/><stop offset="1" stop-color="#c9952a"/></radialGradient>
<radialGradient id="{p}pole" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#6c7078"/></radialGradient>
<linearGradient id="{p}str" x1="0" x2="1"><stop offset="0" stop-color="#cfd2d8"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#b8bcc4"/></linearGradient>
</defs>
{''.join(head)}
{''.join(out)}
{bushings}
<path d="{body}" fill="url(#{p}sb)"/>
<path d="{body}" fill="url(#{p}carve)"/>
<path d="{body}" fill="url(#{p}gl)"/>
<path d="{body}" fill="none" stroke="#f1e6cc" stroke-width="2.4"/>
<path d="{body}" fill="none" stroke="#1a0a04" stroke-width=".5" opacity=".6"/>
<path d="{board}" fill="url(#{p}rw)"/>
{grain}
<path d="{board}" fill="none" stroke="#efe6cf" stroke-width="1"/>
{frets}{inlays}
{nut}
<path d="{guard}" fill="#efe3c6" opacity=".93" stroke="#cbbb94" stroke-width=".5"/>
{humbucker(neck_pu)}{humbucker(bridge_pu)}
{switch}
{tom}{tail}
{knobs}
{strings}
</svg>'''

def clean(s):
    return re.sub(r'\s+', ' ', s).strip()

if __name__ == '__main__':
    import sys
    svg = lp('pv')
    open('lp.html', 'w').write(f'<body style="margin:0;background:#f5f5f7;padding:10px">{svg.replace("<svg ", "<svg style=height:1300px ")}</body>')
    if len(sys.argv) > 1:
        path = '/home/claude/thedude/src/components/HomeMenu/instrumentArt.js'
        src = open(path).read()
        i = src.index('export const INSTRUMENT_ART = ')
        head = src[:i]
        data = json.loads(src[src.index('{', i):src.rindex('}') + 1])
        data['guitar'] = clean(lp('hmG'))
        open(path, 'w').write(head + 'export const INSTRUMENT_ART = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n')
        print('written')
    print('fret ys', [round(fret_y(n),1) for n in (1,3,5,12,22)], 'bridge', round(BRIDGE,1))
