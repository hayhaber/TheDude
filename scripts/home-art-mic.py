import json, re

def mic(p):
    cx, cy, r = 100, 96, 54
    return f'''<svg viewBox="0 0 200 420" xmlns="http://www.w3.org/2000/svg">
<defs>
<clipPath id="{p}ball"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath>
<pattern id="{p}mesh" width="4.2" height="4.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45 {cx} {cy})">
  <rect width="4.2" height="4.2" fill="#b9bcc3"/>
  <path d="M0,0 H4.2 M0,0 V4.2" stroke="#4d5058" stroke-width="1.05"/>
</pattern>
<pattern id="{p}meshFine" width="2.1" height="2.1" patternUnits="userSpaceOnUse" patternTransform="rotate(45 {cx} {cy})">
  <path d="M0,1.05 H2.1 M1.05,0 V2.1" stroke="#ffffff" stroke-opacity=".25" stroke-width=".35"/>
</pattern>
<radialGradient id="{p}shade" cx="40%" cy="34%" r="72%">
  <stop offset="0" stop-color="#fff" stop-opacity=".55"/>
  <stop offset=".35" stop-color="#fff" stop-opacity=".08"/>
  <stop offset=".72" stop-color="#000" stop-opacity=".28"/>
  <stop offset="1" stop-color="#000" stop-opacity=".7"/>
</radialGradient>
<radialGradient id="{p}spec" cx="50%" cy="50%" r="50%">
  <stop offset="0" stop-color="#fff" stop-opacity=".95"/>
  <stop offset="1" stop-color="#fff" stop-opacity="0"/>
</radialGradient>
<linearGradient id="{p}chrome" x1="0" x2="1">
  <stop offset="0" stop-color="#55585f"/><stop offset=".18" stop-color="#d9dce1"/><stop offset=".32" stop-color="#ffffff"/>
  <stop offset=".55" stop-color="#9da1a9"/><stop offset=".8" stop-color="#e4e6ea"/><stop offset="1" stop-color="#4a4d54"/>
</linearGradient>
<linearGradient id="{p}body" x1="0" x2="1">
  <stop offset="0" stop-color="#0b0b0d"/><stop offset=".2" stop-color="#2b2c31"/><stop offset=".33" stop-color="#4b4d54"/>
  <stop offset=".5" stop-color="#222327"/><stop offset=".85" stop-color="#151518"/><stop offset="1" stop-color="#070708"/>
</linearGradient>
<linearGradient id="{p}bodyV" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".12" stop-color="#000" stop-opacity="0"/>
  <stop offset=".9" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/>
</linearGradient>
<linearGradient id="{p}band" x1="0" x2="1">
  <stop offset="0" stop-color="#3c3f45"/><stop offset=".25" stop-color="#c9ccd2"/><stop offset=".38" stop-color="#f4f5f7"/>
  <stop offset=".62" stop-color="#8f939b"/><stop offset=".85" stop-color="#c3c6cc"/><stop offset="1" stop-color="#3a3d43"/>
</linearGradient>
<radialGradient id="{p}drop" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>
<!-- handle: tapered, matte -->
<path d="M66,160 C66,170 70,178 72,190 L83,374 Q84,382 92,383 L108,383 Q116,382 117,374 L128,190 C130,178 134,170 134,160 Z" fill="url(#{p}body)"/>
<path d="M66,160 C66,170 70,178 72,190 L83,374 Q84,382 92,383 L108,383 Q116,382 117,374 L128,190 C130,178 134,170 134,160 Z" fill="url(#{p}bodyV)"/>
<path d="M78,196 L88,372" stroke="#fff" stroke-opacity=".09" stroke-width="3" stroke-linecap="round"/>
<!-- seam where the flare meets the handle -->
<path d="M71.5,186 Q100,192 128.5,186" fill="none" stroke="#000" stroke-opacity=".55" stroke-width="1.2"/>
<path d="M71.8,188 Q100,194 128.2,188" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width=".8"/>
<!-- XLR end: chrome ring + black cap -->
<path d="M84,372 L116,372 L115.4,384 Q100,388 84.6,384 Z" fill="url(#{p}chrome)"/>
<path d="M85.5,384 Q100,388 114.5,384 L113.5,393 Q100,397 86.5,393 Z" fill="#0d0d0f"/>
<!-- collar under the grille -->
<path d="M58,140 L142,140 L139,162 Q100,168 61,162 Z" fill="url(#{p}chrome)"/>
<ellipse cx="100" cy="142" rx="40" ry="8" fill="url(#{p}drop)"/>
<path d="M60,149 Q100,154 140,149" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".8"/>
<path d="M61,162 Q100,168 139,162" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="1.1"/>
<!-- the ball grille: woven mesh, spherical shading, equator band, specular -->
<g clip-path="url(#{p}ball)">
  <rect x="40" y="36" width="120" height="120" fill="url(#{p}mesh)"/>
  <rect x="40" y="36" width="120" height="120" fill="url(#{p}meshFine)"/>
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#{p}shade)"/>
  <!-- the solid band round the grille's middle -->
  <path d="M{cx-r},{cy+2} Q{cx},{cy+15} {cx+r},{cy+2} L{cx+r},{cy+9} Q{cx},{cy+22} {cx-r},{cy+9} Z" fill="url(#{p}band)"/>
  <path d="M{cx-r},{cy+2} Q{cx},{cy+15} {cx+r},{cy+2}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".7"/>
  <path d="M{cx-r},{cy+9} Q{cx},{cy+22} {cx+r},{cy+9}" fill="none" stroke="#1d1f23" stroke-opacity=".7" stroke-width=".9"/>
  <ellipse cx="82" cy="68" rx="18" ry="11" fill="url(#{p}spec)" transform="rotate(-28 82 68)" opacity=".85"/>
</g>
<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#3a3d43" stroke-width="1.4"/>
<circle cx="{cx}" cy="{cy}" r="{r-1.4}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width=".8"/>
</svg>'''

def clean(s):
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    return re.sub(r'\s+', ' ', s).strip()

if __name__ == '__main__':
    import sys
    svg = mic('pv')
    open('mic.html', 'w').write(f'<body style="margin:0;background:#f5f5f7;padding:10px;display:flex;gap:30px">{svg.replace("<svg ", "<svg style=height:840px ")}<div style="background:#1e1e22;padding:30px">{svg.replace("<svg ", "<svg style=height:300px;transform:rotate(-24deg) ")}</div></body>')
    if len(sys.argv) > 1:
        path = '/home/claude/thedude/src/components/HomeMenu/instrumentArt.js'
        src = open(path).read().split('\n')
        i = [k for k, l in enumerate(src) if l.lstrip().startswith('"vocal":')][0]
        src[i] = '  "vocal": ' + json.dumps(clean(mic('hmM')), ensure_ascii=False) + ','
        open(path, 'w').write('\n'.join(src)); print('written')
