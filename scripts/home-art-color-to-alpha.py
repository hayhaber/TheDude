# Colour-to-alpha from white (like GIMP's): every pixel becomes the colour that,
# laid over white, gives the original — glows and soft shadows stay as tints.
import sys
from PIL import Image
import numpy as np
src, out, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
a = np.asarray(Image.open(src).convert('RGB')).astype(float) / 255
a = np.clip((a - 0.012) / 0.988, 0, 1)        # the near-white page (JPEG noise) -> pure white
alpha = (1 - a).max(axis=2)
alpha[alpha < 0.02] = 0
safe = np.where(alpha > 0, alpha, 1)[..., None]
rgb = np.clip((a - (1 - alpha[..., None])) / safe, 0, 1)
im = Image.fromarray(np.dstack([rgb, alpha[..., None]]).__mul__(255).round().astype(np.uint8), 'RGBA')
bb = Image.fromarray((alpha > 0.06).astype(np.uint8) * 255).getbbox()
im = im.crop(bb)
im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
im.save(out, 'WEBP', quality=88, method=6)
print(Image.open(src).size, bb, im.size)
