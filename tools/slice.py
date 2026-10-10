"""Cut a green-screen sprite sheet into frames: key out the green, trim, find the skirt centre (x anchor), scale, pack into one atlas."""
import sys, json
import numpy as np
from PIL import Image

src, cols, rows, scale_arg, outpng, outjs, name = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4], sys.argv[5], sys.argv[6], sys.argv[7]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]
spill = g - np.maximum(r, b)
alpha = np.clip(1 - (spill - 30) / 70, 0, 1)
# despill edge pixels
out = im.copy()
m = (spill > 0) & (alpha > 0)
out[..., 1] = np.where(m, g - spill * 0.92, g)
rgba = np.dstack([out, alpha * 255]).astype(np.uint8)
rgba[alpha < 0.02, :3] = (30, 24, 40)

frames = []
cw, ch = W / cols, H / rows
for j in range(rows):
    for i in range(cols):
        x0, x1 = int(i * cw), int((i + 1) * cw)
        y0, y1 = int(j * ch), int((j + 1) * ch)
        cell = rgba[y0:y1, x0:x1]
        a = cell[..., 3]
        ys, xs = np.where(a > 40)
        if len(ys) == 0:
            continue
        t, bm, l, rr = ys.min(), ys.max(), xs.min(), xs.max()
        crop = cell[t:bm + 1, l:rr + 1].copy()
        h, w = crop.shape[:2]
        # anchor on the white blouse (torso): the steadiest part of the body between poses
        rgb = crop[..., :3].astype(np.int32)
        band = np.zeros((h, w), bool)
        band[int(h * .25):int(h * .40)] = True
        white = band & (rgb[..., 0] > 200) & (rgb[..., 1] > 200) & (rgb[..., 2] > 200) & (crop[..., 3] > 200)
        ax = float(np.where(white)[1].mean()) if white.any() else w / 2
        frames.append((Image.fromarray(crop, 'RGBA'), ax))

# scale: either a number, or hNNN = make the median frame height NNN px
if scale_arg.startswith('h'):
    scale = float(scale_arg[1:]) / float(np.median([im_.height for im_, _ in frames]))
else:
    scale = float(scale_arg)
print('scale', round(scale, 4))
# scale and pack in one row with padding
pad = 2
scaled = []
for img, ax in frames:
    nw, nh = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    scaled.append((img.resize((nw, nh), Image.LANCZOS), ax * scale))
sheetW = sum(f.width + pad for f, _ in scaled)
sheetH = max(f.height for f, _ in scaled)
sheet = Image.new('RGBA', (sheetW, sheetH), (0, 0, 0, 0))
meta, x = [], 0
for f, ax in scaled:
    sheet.paste(f, (x, 0))
    meta.append({'x': x, 'y': 0, 'w': f.width, 'h': f.height, 'ax': round(ax, 1)})
    x += f.width + pad
sheet.save(outpng, optimize=True)
with open(outjs, 'w', encoding='utf-8') as fh:
    fh.write('window.SPR_%s=%s;\n' % (name, json.dumps({'frames': meta}, ensure_ascii=False)))
print(len(meta), 'frames', sheet.size, [ (m['w'], m['h'], m['ax']) for m in meta])
