# Teacher card art: a black orchestral music stand holding an open lesson
# book (chord box on the left page, a staff on the right), a pencil on the lip.
def chordbox(x0, y0):
    cw, rh = 9, 13
    out = [f'<text x="{x0+22}" y="{y0-17}" font-family="Georgia,serif" font-size="15" font-weight="700" fill="#3a2f25" text-anchor="middle">D</text>']
    out.append(f'<rect x="{x0-1}" y="{y0-3}" width="{cw*5+2}" height="3.2" fill="#3a2f25"/>')
    for s in range(6):
        out.append(f'<line x1="{x0+s*cw}" y1="{y0}" x2="{x0+s*cw}" y2="{y0+rh*4}" stroke="#5b4e42" stroke-width="{1.3 if s<3 else 0.9}"/>')
    for r in range(1,5):
        out.append(f'<line x1="{x0}" y1="{y0+r*rh}" x2="{x0+cw*5}" y2="{y0+r*rh}" stroke="#7d6f62" stroke-width="0.9"/>')
    # x x o on strings 6 5 4
    for s in (0,1):
        out.append(f'<text x="{x0+s*cw}" y="{y0-6}" font-family="Arial" font-size="7" fill="#3a2f25" text-anchor="middle">×</text>')
    out.append(f'<circle cx="{x0+2*cw}" cy="{y0-8}" r="2.3" fill="none" stroke="#3a2f25" stroke-width="0.9"/>')
    for s, f, n in ((3,2,'1'),(4,3,'3'),(5,2,'2')):
        cy = y0 + (f-0.5)*rh
        out.append(f'<circle cx="{x0+s*cw}" cy="{cy}" r="3.9" fill="#d9692b"/>')
        out.append(f'<text x="{x0+s*cw}" y="{cy+2.4}" font-family="Arial" font-size="6" font-weight="700" fill="#fff" text-anchor="middle">{n}</text>')
    return ''.join(out)

def staff(x0, x1, y0, notes):
    out = []
    for i in range(5):
        out.append(f'<line x1="{x0}" y1="{y0+i*4.2}" x2="{x1}" y2="{y0+i*4.2}" stroke="#8a7d70" stroke-width="0.7"/>')
    out.append(f'<line x1="{x1}" y1="{y0}" x2="{x1}" y2="{y0+16.8}" stroke="#8a7d70" stroke-width="0.9"/>')
    for (x, step) in notes:
        cy = y0 + 16.8 - step*2.1
        out.append(f'<ellipse cx="{x}" cy="{cy}" rx="2.6" ry="1.9" transform="rotate(-20 {x} {cy})" fill="#3a2f25"/>')
        out.append(f'<line x1="{x+2.4}" y1="{cy}" x2="{x+2.4}" y2="{cy-11}" stroke="#3a2f25" stroke-width="0.8"/>')
    return ''.join(out)

svg = f'''<svg viewBox="0 0 240 330" xmlns="http://www.w3.org/2000/svg"><defs>
<linearGradient id="hmSdesk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b3d42"/><stop offset=".5" stop-color="#1d1e21"/><stop offset="1" stop-color="#0d0d0f"/></linearGradient>
<linearGradient id="hmSmetal" x1="0" x2="1"><stop offset="0" stop-color="#121214"/><stop offset=".35" stop-color="#55585e"/><stop offset=".55" stop-color="#2a2b2f"/><stop offset="1" stop-color="#0c0c0e"/></linearGradient>
<linearGradient id="hmSlip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4c52"/><stop offset=".4" stop-color="#1f2023"/><stop offset="1" stop-color="#0a0a0b"/></linearGradient>
<linearGradient id="hmSpageL" x1="0" x2="1"><stop offset="0" stop-color="#f3ead8"/><stop offset=".82" stop-color="#fbf6ea"/><stop offset="1" stop-color="#d9ccb2"/></linearGradient>
<linearGradient id="hmSpageR" x1="0" x2="1"><stop offset="0" stop-color="#d6c8ad"/><stop offset=".16" stop-color="#fbf6ea"/><stop offset="1" stop-color="#efe5d0"/></linearGradient>
<linearGradient id="hmSpencil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd85a"/><stop offset=".5" stop-color="#f2b316"/><stop offset="1" stop-color="#b97e08"/></linearGradient>
</defs>
<path d="M120 288 L34 324" stroke="url(#hmSmetal)" stroke-width="5" stroke-linecap="round"/>
<path d="M120 288 L206 324" stroke="url(#hmSmetal)" stroke-width="5" stroke-linecap="round"/>
<path d="M120 288 L120 316" stroke="url(#hmSmetal)" stroke-width="5" stroke-linecap="round"/>
<rect x="112" y="276" width="16" height="16" rx="3" fill="url(#hmSmetal)"/>
<rect x="116" y="196" width="8" height="84" fill="url(#hmSmetal)"/>
<rect x="114" y="232" width="12" height="9" rx="2" fill="#2b2c30"/>
<path d="M126 236.5 h10 a3 3 0 0 1 0 6 h-10z" fill="#3c3e44"/>
<rect x="14" y="18" width="212" height="172" rx="5" fill="url(#hmSdesk)"/>
<rect x="18" y="22" width="204" height="164" rx="3" fill="none" stroke="#000" stroke-opacity=".35"/>
<path d="M120 30 Q76 18 26 25 L26 182 Q76 175 120 186 Z" fill="#c8b998"/>
<path d="M120 30 Q164 18 214 25 L214 182 Q164 175 120 186 Z" fill="#c8b998"/>
<path d="M120 33 Q76 21 29 28 L29 178 Q76 171 120 182 Z" fill="url(#hmSpageL)"/>
<path d="M120 33 Q164 21 211 28 L211 178 Q164 171 120 182 Z" fill="url(#hmSpageR)"/>
<line x1="120" y1="33" x2="120" y2="182" stroke="#a8977a" stroke-width="1"/>
<rect x="44" y="40" width="58" height="2" rx="1" fill="#b9ab92"/>
{chordbox(51, 80)}
<rect x="42" y="150" width="62" height="2" rx="1" fill="#cfc3ac"/>
<rect x="42" y="157" width="48" height="2" rx="1" fill="#cfc3ac"/>
<rect x="138" y="40" width="54" height="2" rx="1" fill="#b9ab92"/>
{staff(134, 200, 58, [(146,4),(158,6),(170,5),(184,7)])}
{staff(134, 200, 92, [(146,2),(160,4),(174,3),(188,1)])}
{staff(134, 200, 126, [(146,5),(158,3),(172,4),(186,2)])}
<path d="M123 31 L129 31 L129 196 L126 191 L123 196 Z" fill="#c0392b"/>
<path d="M123 31 L125 31 L125 196 L123 196 Z" fill="#8e2a20"/>
<rect x="10" y="184" width="220" height="14" rx="4" fill="url(#hmSlip)"/>
<rect x="12" y="185" width="216" height="2" rx="1" fill="#6a6d73" opacity=".6"/>
<g transform="rotate(-3 150 182)">
<rect x="96" y="177" width="96" height="7" fill="url(#hmSpencil)"/>
<rect x="190" y="177" width="9" height="7" fill="#c9c9cc"/><rect x="198" y="177" width="7" height="7" rx="2" fill="#e8848a"/>
<path d="M96 177 L84 180.5 L96 184 Z" fill="#f1d3a6"/><path d="M88 179.3 L84 180.5 L88 181.7 Z" fill="#3a3a3a"/>
</g>
</svg>'''
import sys, json, re
open('teacher-art.svg','w').write(svg)
if len(sys.argv) > 1:
    p = '/home/claude/thedude/src/components/HomeMenu/instrumentArt.js'
    src = open(p).read()
    one = re.sub(r'\s*\n\s*', ' ', svg)
    line = '  "teacher": ' + json.dumps(one) + ',\n'
    src = re.sub(r'  "teacher": .*\n', '', src)
    src = src.replace('\n};', '\n' + line.rstrip(',\n') + ',\n};', 1) if False else src.replace('  "tools":', line + '  "tools":', 1)
    open(p,'w').write(src)
