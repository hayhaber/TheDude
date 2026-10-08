import json, re

def mic(p):
    cx, cy, rx, ry = 100, 118, 50, 78     # capsule head
    slats = ''
    y = cy - ry + 10
    while y < cy + ry - 8:
        slats += f'<rect x="{cx-rx}" y="{y:.1f}" width="{2*rx}" height="4.2" rx="2.1" fill="url(#{p}slat)"/>'
        y += 9.2
    return f'''<svg viewBox="0 0 200 420" xmlns="http://www.w3.org/2000/svg">
<defs>
<clipPath id="{p}head"><ellipse cx="{cx}" cy="{cy}" rx="{rx-5}" ry="{ry-5}"/></clipPath>
<linearGradient id="{p}chromeH" x1="0" x2="1">
  <stop offset="0" stop-color="#4b4e55"/><stop offset=".14" stop-color="#cfd2d8"/><stop offset=".3" stop-color="#ffffff"/>
  <stop offset=".5" stop-color="#8e929a"/><stop offset=".72" stop-color="#eef0f3"/><stop offset=".9" stop-color="#9a9ea6"/><stop offset="1" stop-color="#3f4248"/>
</linearGradient>
<linearGradient id="{p}chromeV" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#f4f5f7"/><stop offset=".45" stop-color="#a7abb3"/><stop offset=".55" stop-color="#6f737b"/><stop offset="1" stop-color="#d9dce1"/>
</linearGradient>
<linearGradient id="{p}slat" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#b8bcc4"/><stop offset="1" stop-color="#6c7078"/>
</linearGradient>
<radialGradient id="{p}round" cx="42%" cy="38%" r="68%">
  <stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/>
</radialGradient>
<pattern id="{p}mesh" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#17181b"/><circle cx="1.5" cy="1.5" r=".7" fill="#33363c"/></pattern>
<radialGradient id="{p}spec" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="{p}knob" cx="38%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#a3a7af"/><stop offset="1" stop-color="#3d4046"/></radialGradient>
</defs>
<!-- stand stem + swivel -->
<rect x="91" y="232" width="18" height="104" rx="3" fill="url(#{p}chromeH)"/>
<rect x="85" y="300" width="30" height="12" rx="3" fill="url(#{p}chromeH)"/>
<g stroke="#000" stroke-opacity=".25" stroke-width=".7">{''.join(f'<line x1="{86+i*2.2:.1f}" y1="301" x2="{86+i*2.2:.1f}" y2="311"/>' for i in range(13))}</g>
<path d="M80,336 L120,336 L124,352 Q100,358 76,352 Z" fill="url(#{p}chromeH)"/>
<path d="M76,352 Q100,358 124,352 L123,364 Q100,371 77,364 Z" fill="#141416"/>
<!-- yoke: U bracket holding the head at its sides -->
<path d="M{cx-rx-9},{cy+4} L{cx-rx-9},{cy+62} Q{cx-rx-9},{cy+112} {cx},{cy+112} Q{cx+rx+9},{cy+112} {cx+rx+9},{cy+62} L{cx+rx+9},{cy+4}"
      fill="none" stroke="url(#{p}chromeH)" stroke-width="10" stroke-linecap="round"/>
<path d="M{cx-rx-9},{cy+4} L{cx-rx-9},{cy+62} Q{cx-rx-9},{cy+112} {cx},{cy+112} Q{cx+rx+9},{cy+112} {cx+rx+9},{cy+62} L{cx+rx+9},{cy+4}"
      fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1" transform="translate(0 4.5)"/>
<!-- head: chrome rim, dark mesh, horizontal chrome slats, round shading -->
<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#{p}chromeH)"/>
<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="none" stroke="#3a3d43" stroke-width="1"/>
<g clip-path="url(#{p}head)">
  <rect x="{cx-rx}" y="{cy-ry}" width="{2*rx}" height="{2*ry}" fill="url(#{p}mesh)"/>
  {slats}
  <ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#{p}round)"/>
  <ellipse cx="{cx-16}" cy="{cy-40}" rx="12" ry="22" fill="url(#{p}spec)" opacity=".7"/>
</g>
<ellipse cx="{cx}" cy="{cy}" rx="{rx-5}" ry="{ry-5}" fill="none" stroke="#2a2c31" stroke-width="1.2"/>
<!-- pivot knobs on the yoke -->
<circle cx="{cx-rx-9}" cy="{cy+4}" r="8.5" fill="url(#{p}knob)" stroke="#3a3d43" stroke-width=".6"/>
<circle cx="{cx+rx+9}" cy="{cy+4}" r="8.5" fill="url(#{p}knob)" stroke="#3a3d43" stroke-width=".6"/>
<circle cx="{cx-rx-9}" cy="{cy+4}" r="3" fill="#5d6168"/><circle cx="{cx+rx+9}" cy="{cy+4}" r="3" fill="#5d6168"/>
</svg>'''

def clean(s):
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    return re.sub(r'\s+', ' ', s).strip()

if __name__ == '__main__':
    import sys
    svg = mic('pv')
    open('mic.html', 'w').write(f'<body style="margin:0;background:#f5f5f7;padding:10px;display:flex;gap:30px">{svg.replace("<svg ", "<svg style=height:840px ")}<div style="background:#1e1e22;padding:30px">{svg.replace("<svg ", "<svg style=height:270px;transform:rotate(-12deg) ")}</div></body>')
    if len(sys.argv) > 1:
        path = '/home/claude/thedude/src/components/HomeMenu/instrumentArt.js'
        src = open(path).read().split('\n')
        i = [k for k, l in enumerate(src) if l.lstrip().startswith('"vocal":')][0]
        src[i] = '  "vocal": ' + json.dumps(clean(mic('hmM')), ensure_ascii=False) + ','
        open(path, 'w').write('\n'.join(src)); print('written')
