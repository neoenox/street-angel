"""Cut an action sprite sheet by connected shapes (poses may overflow their grid cell).
Anchor x = midpoint of the planted shoes, baseline y = per-row median ground line, so lunges/jumps keep their real offset."""
import sys, json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, cols, rows, ref_idx, ref_h, outpng, outjs, name = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), float(sys.argv[5]), sys.argv[6], sys.argv[7], sys.argv[8]
MODE = sys.argv[9] if len(sys.argv) > 9 else 'shoes'
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
H, W, _ = im.shape
r, g, b = im[..., 0], im[..., 1], im[..., 2]
spill = g - np.maximum(r, b)
alpha = np.clip(1 - (spill - 30) / 70, 0, 1)
out = im.copy()
m = (spill > 0) & (alpha > 0)
out[..., 1] = np.where(m, g - spill * 0.92, g)
rgba = np.dstack([out, alpha * 255]).astype(np.uint8)
rgba[alpha < 0.02, :3] = (30, 24, 40)
mask = alpha > 0.5
lab, n = ndi.label(ndi.binary_dilation(mask, iterations=6))
cw, ch = W / cols, H / rows
cells = {}
for k in range(1, n + 1):
    ys, xs = np.where((lab == k) & mask)
    if len(ys) < 400:
        continue
    cells.setdefault((int(ys.mean() // ch), int(xs.mean() // cw)), []).append(k)

fr = []  # dict per frame, row-major
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
        fr.append(dict(row=j, col=i, top=t, bottom=bt, left=l, right=rr, crop=crop))

for j in range(rows):
    rf = [f for f in fr if f['row'] == j]
    base = float(np.median([f['bottom'] for f in rf]))
    figh = float(np.median([f['bottom'] - f['top'] for f in rf]))
    anchors = []
    for f in rf:
        c = f['crop']
        h, w = c.shape[:2]
        rgb = c[..., :3].astype(int)
        shoe = (c[..., 3] > 200) & (rgb[..., 0] > 185) & (rgb[..., 1] > 185) & (rgb[..., 2] > 185)
        band_top = int(base - f['top'] - 0.10 * figh)
        band_bot = int(base - f['top']) + 8
        band = np.zeros_like(shoe)
        band[max(0, band_top):max(0, band_bot)] = True
        xs = np.where(shoe & band)[1]
        f['ax_abs'] = (f['left'] + (xs.min() + xs.max()) / 2) if len(xs) > 30 else None
        anchors.append(f['ax_abs'] - f['col'] * cw if f['ax_abs'] is not None else None)
    med = float(np.median([a for a in anchors if a is not None]))
    for f, a in zip(rf, anchors):
        if f['ax_abs'] is None:
            f['ax_abs'] = f['col'] * cw + med
            f['fallback'] = True
        f['ax'] = f['ax_abs'] - f['left']
        f['ay'] = base - f['top']

if MODE == 'skirt':
    # anchor on the skirt (largest navy blob), bottom-aligned; offset so the reference stance frame keeps its shoe-midpoint anchor
    for f in fr:
        c = f['crop']; rgb = c[..., :3].astype(int)
        navy = (c[..., 3] > 200) & (rgb[..., 2] > rgb[..., 0] + 25) & (rgb[..., 2] > rgb[..., 1] + 8) & (rgb[..., 2] < 170)
        core = ndi.binary_erosion(navy, iterations=14)   # thin socks vanish, the skirt body stays
        if core.sum() < 200:
            core = navy
        lb, nn = ndi.label(core)
        sizes = ndi.sum(core, lb, range(1, nn + 1))
        k = int(np.argmax(sizes)) + 1
        f['skirt_ax'] = float(np.where(lb == k)[1].mean())
    delta = fr[ref_idx]['ax'] - fr[ref_idx]['skirt_ax']
    for f in fr:
        f['ax'] = f['skirt_ax'] + delta
        f['ay'] = f['bottom'] - f['top']
    print('skirt-anchor delta', round(delta, 1))

ref = fr[ref_idx]
scale = ref_h / (ref['bottom'] - ref['top'])
print('scale', round(scale, 4))
pad = 2
scaled = []
for f in fr:
    c = Image.fromarray(f['crop'], 'RGBA')
    nw, nh = max(1, round(c.width * scale)), max(1, round(c.height * scale))
    scaled.append((c.resize((nw, nh), Image.LANCZOS), f))
sheetW = sum(c.width + pad for c, _ in scaled)
sheetH = max(c.height for c, _ in scaled)
sheet = Image.new('RGBA', (sheetW, sheetH), (0, 0, 0, 0))
meta, x = [], 0
for c, f in scaled:
    sheet.paste(c, (x, 0))
    ax, ay = f['ax'] * scale, f['ay'] * scale
    meta.append({'x': x, 'y': 0, 'w': c.width, 'h': c.height, 'ax': round(ax, 1), 'ay': round(ay, 1),
                 'fx': round(c.width - ax, 1), 'bx': round(ax, 1), 'fb': bool(f.get('fallback'))})
    x += c.width + pad
sheet.save(outpng, optimize=True)
open(outjs, 'w', encoding='utf-8').write('window.SPR_%s=%s;\n' % (name, json.dumps({'frames': meta})))
for k, m_ in enumerate(meta):
    print(k, m_['w'], m_['h'], 'ax', m_['ax'], 'ay', m_['ay'], 'front', m_['fx'], 'back', m_['bx'], 'fallback' if m_['fb'] else '')
