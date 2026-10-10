"""Generic green-screen sprite sheet cutter (connected shapes, bottom-aligned, colour-blob anchor).
usage: slice3.py src cols rows ref_idx ref_h outpng outjs NAME anchor_rgb_rule
anchor rule: 'red' (shirt) | 'navy' | 'teal' ... the largest eroded blob of that colour is the x anchor."""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

USAGE = ('usage: slice3.py src cols rows ref_idx ref_h out.png out.js NAME anchor_rule\n'
         '  anchor rule: red (shirt) | teal | brown | navy   [+ strict]')
if len(sys.argv) < 10:
    sys.exit(USAGE)
try:
    src, cols, rows, ref_idx, ref_h, outpng, outjs, name, rule = (
        sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]),
        float(sys.argv[5]), sys.argv[6], sys.argv[7], sys.argv[8], sys.argv[9])
except ValueError:
    sys.exit('error: cols/rows/ref_idx must be int, ref_h must be number\n' + USAGE)
if cols < 1 or rows < 1:
    sys.exit('error: cols and rows must be >= 1')
if not (0 <= ref_idx < cols * rows):
    sys.exit('error: ref_idx %d out of range for %dx%d sheet' % (ref_idx, cols, rows))
if ref_h <= 0:
    sys.exit('error: ref_h must be > 0')
RULES = {
    'red': lambda rgb: (rgb[..., 0] > 140) & (rgb[..., 1] < 95) & (rgb[..., 2] < 105),
    'teal': lambda rgb: (rgb[..., 1] > rgb[..., 0] + 45) & (rgb[..., 2] > rgb[..., 0] + 35) & (rgb[..., 1] < 190),
    'brown': lambda rgb: (rgb[..., 0] > rgb[..., 1] + 15) & (rgb[..., 1] > rgb[..., 2] + 8) & (rgb[..., 0] < 140) & (rgb[..., 0] > 55),
    'navy': lambda rgb: (rgb[..., 2] > rgb[..., 0] + 25) & (rgb[..., 2] > rgb[..., 1] + 8) & (rgb[..., 2] < 170),
}
if rule not in RULES:
    sys.exit('error: unknown anchor rule %r (choose from %s)\n' % (rule, ', '.join(sorted(RULES))) + USAGE)
try:
    im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
except FileNotFoundError:
    sys.exit('error: source image not found: %s' % src)
except OSError as e:
    sys.exit('error: cannot open source image %s: %s' % (src, e))
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]
spill = g - np.maximum(r, b)
STRICT = len(sys.argv) > 10 and sys.argv[10] == 'strict'   # also drop faint ground shadows
alpha = np.clip(1 - (spill - 5) / 40, 0, 1) if STRICT else np.clip(1 - (spill - 30) / 70, 0, 1)
out = im.copy()
m = (spill > 0) & (alpha > 0)
out[..., 1] = np.where(m, g - spill * 0.92, g)
rgba = np.dstack([out, alpha * 255]).astype(np.uint8)
rgba[alpha < 0.02, :3] = (30, 24, 40)
mask = alpha > 0.5
lab, n = ndi.label(ndi.binary_dilation(mask, iterations=2 if STRICT else 6))
cw, ch = W / cols, H / rows
cells = {}
for k in range(1, n + 1):
    ys, xs = np.where((lab == k) & mask)
    if len(ys) < (120 if STRICT else 400):
        continue
    cells.setdefault((int(ys.mean() // ch), int(xs.mean() // cw)), []).append(k)

fr = []
for j in range(rows):
    for i in range(cols):
        ks = cells.get((j, i))
        if not ks:
            raise SystemExit('missing pose at row %d col %d' % (j, i))
        comp = np.isin(lab, ks)
        a = np.where(comp, rgba[..., 3], 0).astype(np.uint8)
        ys, xs = np.where(a > 40)
        t, bt, l, rr = ys.min(), ys.max(), xs.min(), xs.max()
        crop = rgba[t:bt + 1, l:rr + 1].copy()
        crop[..., 3] = a[t:bt + 1, l:rr + 1]
        rgb = crop[..., :3].astype(int)
        col = RULES[rule](rgb) & (crop[..., 3] > 200)
        if col.sum() == 0:
            raise SystemExit('anchor colour %r not found in frame row %d col %d' % (rule, j, i))
        core = ndi.binary_erosion(col, iterations=10)
        if core.sum() < 150:
            core = col
        lb, nn = ndi.label(core)
        if nn == 0:
            raise SystemExit('anchor blob vanished in frame row %d col %d' % (j, i))
        k = int(np.argmax(ndi.sum(core, lb, range(1, nn + 1)))) + 1
        ax = float(np.where(lb == k)[1].mean())
        fr.append(dict(crop=crop, ax=ax, top=t, bottom=bt))

ref = fr[ref_idx]
scale = ref_h / (ref['bottom'] - ref['top'])
print('scale', round(scale, 4))
pad = 2
scaled = []
for f in fr:
    c = Image.fromarray(f['crop'], 'RGBA')
    scaled.append((c.resize((max(1, round(c.width * scale)), max(1, round(c.height * scale))), Image.LANCZOS), f))
sheet = Image.new('RGBA', (sum(c.width + pad for c, _ in scaled), max(c.height for c, _ in scaled)), (0, 0, 0, 0))
meta, x = [], 0
for c, f in scaled:
    sheet.paste(c, (x, 0))
    ax = f['ax'] * scale
    meta.append({'x': x, 'y': 0, 'w': c.width, 'h': c.height, 'ax': round(ax, 1), 'ay': c.height, 'fx': round(c.width - ax, 1), 'bx': round(ax, 1)})
    x += c.width + pad
sheet.save(outpng, optimize=True)
open(outjs, 'w', encoding='utf-8').write('window.SPR_%s=%s;\n' % (name, json.dumps({'frames': meta})))
for k, m_ in enumerate(meta):
    print(k, m_['w'], m_['h'], 'ax', m_['ax'], 'front', m_['fx'], 'back', m_['bx'])
