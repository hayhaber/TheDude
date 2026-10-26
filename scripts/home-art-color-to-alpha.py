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
bb = list(Image.fromarray((alpha > 0.06).astype(np.uint8) * 255).getbbox())
# keep the soft floor shadow under the object (it fades out below)
low = np.where((alpha > 0.015).any(axis=1))[0]
bb[3] = min(alpha.shape[0], max(bb[3] + 8, int(low.max()) + 1))
im = im.crop(bb)
# a soft shadow cut by the crop would end in a straight line: fade the bottom 6 %
arr = np.asarray(im).astype(float); n = max(1, int(arr.shape[0] * 0.035))
arr[-n:, :, 3] *= np.linspace(1, 0, n)[:, None]
im = Image.fromarray(arr.round().astype(np.uint8), 'RGBA')
im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
im.save(out, 'WEBP', quality=88, method=6)
print(Image.open(src).size, bb, im.size)
