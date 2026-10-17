"""Tools card art (home screen): a drum kit at the back, a combo amp in front
with the wooden metronome on it, a floor tuner pedal (user's choice, option 1
of the 3rd round, 2026-10-17). The metronome comes from
home-art-tools-base.svg (the earlier art). `python3 home-art-tools.py` writes
tools.html for a look; with any argument it also writes instrumentArt.js."""
import re, json, sys
HERE = __file__.rsplit('/', 1)[0]
base = open(f'{HERE}/home-art-tools-base.svg').read()
defs = re.search(r'<defs>(.*?)</defs>', base).group(1)
body = base.split('</defs>')[1].rsplit('</svg>', 1)[0]
CUT = body.index('<g transform="translate(206 150)')
METRO = '<g transform="translate(-150 -282)">' + body[:CUT] + '</g>'
P = 'hmTs'
D2 = f'''
<linearGradient id="{P}tolex" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2d2d30"/><stop offset="1" stop-color="#111113"/></linearGradient>
<pattern id="{P}grille" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#3d3326"/><path d="M0 0L3 3M3 0L0 3" stroke="#6a5a42" stroke-width=".5"/></pattern>
<linearGradient id="{P}gold" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ecd7a0"/><stop offset="1" stop-color="#b8923e"/></linearGradient>
<linearGradient id="{P}chrome" x1="0" x2="1"><stop offset="0" stop-color="#7f848c"/><stop offset=".3" stop-color="#f4f6f8"/><stop offset=".55" stop-color="#a8adb5"/><stop offset=".8" stop-color="#eef0f3"/><stop offset="1" stop-color="#70757d"/></linearGradient>
<linearGradient id="{P}shell" x1="0" x2="1"><stop offset="0" stop-color="#3a0808"/><stop offset=".35" stop-color="#a51c1c"/><stop offset=".6" stop-color="#701212"/><stop offset="1" stop-color="#300606"/></linearGradient>
<radialGradient id="{P}head" cx=".45" cy=".4"><stop offset="0" stop-color="#fbf8f1"/><stop offset="1" stop-color="#d6cfbf"/></radialGradient>
<radialGradient id="{P}cym" cx=".4" cy=".35"><stop offset="0" stop-color="#fff0b8"/><stop offset=".55" stop-color="#d4a945"/><stop offset="1" stop-color="#8a6a1c"/></radialGradient>
<radialGradient id="{P}floor" cx=".5" cy=".5"><stop offset="0" stop-color="#cfc9bf" stop-opacity=".55"/><stop offset="1" stop-color="#cfc9bf" stop-opacity="0"/></radialGradient>
<linearGradient id="{P}pedal" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3a3d44"/><stop offset="1" stop-color="#121317"/></linearGradient>
'''
G = '#a7acb3'
def knob(x, y, r=3.4): return f'<circle cx="{x}" cy="{y}" r="{r}" fill="#161616"/><circle cx="{x-.8}" cy="{y-1}" r="{r*.45:.2f}" fill="#555"/>'
AMP = (f'<g transform="translate(-60 -100)"><rect x="0" y="0" width="120" height="100" rx="7" fill="url(#{P}tolex)"/>'
       f'<rect x="5" y="5" width="110" height="17" rx="3" fill="url(#{P}gold)"/>' + ''.join(knob(15 + i * 13, 13.5) for i in range(6)) +
       f'<circle cx="106" cy="13.5" r="2.2" fill="#ff3b2f"/><rect x="8" y="27" width="104" height="66" rx="4" fill="url(#{P}grille)" stroke="#0a0a0a" stroke-width="1.2"/>'
       '<text x="60" y="64" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="12" fill="#ecd7a0">DudeStar</text>'
       '<rect x="44" y="-4" width="32" height="5" rx="2.5" fill="#0d0d0d"/></g>')
def drum(cx, top, w, h, shell=f'url(#{P}shell)'):
    ry = w * 0.14
    return (f'<path d="M{cx-w/2} {top} L{cx-w/2} {top+h} A{w/2} {ry:.2f} 0 0 0 {cx+w/2} {top+h} L{cx+w/2} {top}" fill="{shell}"/>'
            f'<path d="M{cx-w/2} {top+h} A{w/2} {ry:.2f} 0 0 0 {cx+w/2} {top+h}" fill="none" stroke="url(#{P}chrome)" stroke-width="1.6"/>'
            f'<ellipse cx="{cx}" cy="{top}" rx="{w/2}" ry="{ry:.2f}" fill="url(#{P}head)" stroke="url(#{P}chrome)" stroke-width="1.6"/>')
def stand(x, top, spread=14): return f'<path d="M{x} {top} L{x} -12 L{x-spread} 0 M{x} -12 L{x+spread} 0" stroke="{G}" stroke-width="1.8" fill="none"/>'
def cym(x, y, w, tilt): return f'<g transform="translate({x} {y}) rotate({tilt})"><ellipse rx="{w/2}" ry="{w*0.09:.2f}" fill="url(#{P}cym)" stroke="#7a5a14" stroke-width=".5"/><circle cy="-1" r="2.2" fill="#6b5212"/></g>'
# Kit as the audience sees it (right-handed drummer): hi-hat + snare on the
# viewer's right, floor tom + ride on the left.
KIT = (stand(62, -150, 16) + cym(62, -150, 58, 12) + stand(-84, -128, 16) + cym(-84, -128, 66, -10) + stand(98, -104, 14)
       + f'<ellipse cx="98" cy="-100" rx="21" ry="3.6" fill="url(#{P}cym)" stroke="#7a5a14" stroke-width=".5"/><ellipse cx="98" cy="-104" rx="21" ry="3.6" fill="url(#{P}cym)" stroke="#7a5a14" stroke-width=".5"/>'
       + f'<path d="M-58 -18 L-56 0 M-86 -18 L-88 0" stroke="{G}" stroke-width="1.8"/>' + drum(-72, -62, 44, 44)
       + f'<circle cy="-42" r="42" fill="url(#{P}shell)"/><circle cy="-42" r="38" fill="#1a1a1d" stroke="url(#{P}chrome)" stroke-width="2.2"/><circle cy="-42" r="31" fill="#f2ede2"/>'
       + '<text y="-38" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-weight="700" font-size="12" fill="#a31c1c">DudeStar</text>'
       + f'<path d="M-30 -4 L-38 0 M30 -4 L38 0" stroke="{G}" stroke-width="1.8"/><path d="M-12 -84 L-16 -96 M12 -84 L16 -96" stroke="{G}" stroke-width="1.6"/>'
       + drum(-20, -104, 34, 22) + drum(20, -104, 30, 20) + stand(56, -62, 12) + drum(56, -70, 40, 14, f'url(#{P}chrome)'))
PEDAL = (f'<g transform="translate(-13 -36)"><rect width="26" height="36" rx="4" fill="url(#{P}pedal)" stroke="#000" stroke-opacity=".5"/>'
         '<rect x="3" y="3" width="20" height="13" rx="2" fill="#071009"/><path d="M6 13 A7 7 0 0 1 20 13" fill="none" stroke="#2c3a32" stroke-width="1.4"/><path d="M13 13 L13 6" stroke="#34c759" stroke-width="1.4"/>'
         '<circle cx="13" cy="27" r="5" fill="#8d9097" stroke="#2a2a2a"/><circle cx="12" cy="26" r="2" fill="#d5d7db"/></g>')
def T(x, y, s, c, op=1):
    o = '' if op == 1 else f' opacity="{op}"'
    return f'<g transform="translate({x} {y}) scale({s})"{o}>{c}</g>'
def sh(cx, cy, rx, o=.16): return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx:.1f}" ry="{rx*0.11:.1f}" fill="#000" opacity="{o}"/>'

def art():
    kx, ky, ks = 186, 210, .88     # kit, at the back
    ax, ay, a_s = 74, 286, 1.1     # amp, in front
    px, py, ps = 186, 288, 1.25    # tuner pedal
    inner = (f'<ellipse cx="150" cy="262" rx="150" ry="44" fill="url(#{P}floor)"/>'
             + sh(kx, ky, 112 * ks, .1) + T(kx, ky, ks, KIT, .86)
             + sh(ax, ay, 66 * a_s) + T(ax, ay, a_s, AMP) + T(ax + 28 * a_s, ay - 100 * a_s, .2 * a_s, METRO)
             + sh(px, py, 16 * ps) + T(px, py + 1, ps, PEDAL))
    return f'<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><defs>{defs}{D2}</defs>{inner}</svg>'

if __name__ == '__main__':
    svg = re.sub(r'\s+', ' ', art()).strip()
    big = svg.replace('<svg ', '<svg style=width:600px;height:600px;background:#fff ')
    small = svg.replace('<svg ', '<svg style=width:200px;height:200px ')
    open('tools.html', 'w').write('<body style="margin:0;background:#f5f5f7;display:flex;gap:20px;padding:20px">' + big + small + '</body>')
    if len(sys.argv) > 1:
        path = f'{HERE}/../src/components/HomeMenu/instrumentArt.js'
        src = open(path).read().split('\n')
        i = [k for k, l in enumerate(src) if l.lstrip().startswith('"tools":')][0]
        src[i] = '  "tools": ' + json.dumps(svg, ensure_ascii=False) + ','
        open(path, 'w').write('\n'.join(src)); print('written')
