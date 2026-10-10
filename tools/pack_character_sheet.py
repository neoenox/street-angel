"""Pack generated pose grids without changing the source artwork.

Preserves existing alpha; chroma-keys only opaque green-screen sources.
Connected components allow a tall pose to cross an imaginary grid boundary.
One scale per sheet preserves head size in crouched/knocked-down poses.
"""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi


def key_background(image):
    rgba = np.array(image.convert('RGBA')).copy()
    if rgba[..., 3].min() < 255:
        return rgba  # Native transparency must not be chroma-keyed again.
    rgb = rgba[..., :3].astype(float)
    spill = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
    alpha = np.clip(1 - (spill - 5) / 40, 0, 1)
    edge = (spill > 0) & (alpha > 0)
    rgba[..., 1] = np.where(edge, rgb[..., 1] - spill * .92, rgb[..., 1])
    rgba[..., 3] = np.round(alpha * 255)
    return rgba


def extract_poses(image, cols, rows, anchor):
    rgba = key_background(image)
    mask = rgba[..., 3] > 40
    labels, count = ndi.label(ndi.binary_dilation(mask, iterations=2))
    cells = {}
    for label in range(1, count + 1):
        ys, xs = np.where((labels == label) & mask)
        if len(xs) < 80:
            continue
        cell = (min(rows - 1, int(ys.mean() * rows / image.height)),
                min(cols - 1, int(xs.mean() * cols / image.width)))
        cells.setdefault(cell, []).append(label)
    poses = []
    for row in range(rows):
        for col in range(cols):
            if (row, col) not in cells:
                raise ValueError(f'missing pose at row {row} col {col}')
            selected = np.isin(labels, cells[row, col])
            ys, xs = np.where(selected & mask)
            left, top, right, bottom = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
            crop = rgba[top:bottom, left:right].copy()
            crop[..., 3] = np.where(selected[top:bottom, left:right], crop[..., 3], 0)
            r, g, b = crop[..., :3].astype(int).transpose(2, 0, 1)
            rules = {
                'red': (r > 110) & (r > g * 1.4) & (r > b * 1.25),
                'teal': (g > r + 25) & (b > r + 15) & (g < 200),
                'navy': (b > r + 12) & (b > g + 4) & (b < 180),
            }
            core = rules[anchor] & (crop[..., 3] > 200)
            color_labels, n = ndi.label(ndi.binary_erosion(core, iterations=2))
            if not n:
                raise ValueError(f'anchor {anchor} missing in pose {row * cols + col}')
            largest = 1 + np.argmax(ndi.sum(core, color_labels, range(1, n + 1)))
            ax = float(np.where(color_labels == largest)[1].mean())
            poses.append((Image.fromarray(crop), ax, [int(left), int(top), int(right), int(bottom)]))
    return poses


def pack(poses, reference_frame, reference_height):
    scale = reference_height / poses[reference_frame][0].height
    scaled = [(im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))),
                         Image.Resampling.LANCZOS), ax * scale, bounds)
              for im, ax, bounds in poses]
    atlas = Image.new('RGBA', (sum(im.width + 4 for im, _, _ in scaled),
                               max(im.height for im, _, _ in scaled)), (0, 0, 0, 0))
    frames, x = [], 0
    for im, ax, bounds in scaled:
        atlas.paste(im, (x, 0))
        frames.append(dict(x=x, y=0, w=im.width, h=im.height,
                           ax=round(ax, 2), ay=im.height, sourceBounds=bounds))
        x += im.width + 4
    return atlas, frames, scale


def main():
    root = Path(__file__).resolve().parents[1]
    source = root / 'source_art/character-v2'
    dest = root / 'assets/characters'
    dest.mkdir(parents=True, exist_ok=True)
    recipes = json.loads((source / 'recipes.json').read_text(encoding='utf-8'))
    report = []
    for recipe in recipes['assets']:
        path = source / recipe['source']
        image = Image.open(path)
        poses = extract_poses(image, recipe['cols'], recipe['rows'], recipe['anchor'])
        atlas, frames, scale = pack(poses, recipe['referenceFrame'], recipe['referenceHeight'])
        png = dest / (recipe['output'] + '.png')
        atlas.save(png, optimize=True)
        metadata = dict(frames=frames)
        (dest / (recipe['output'] + '.js')).write_text(
            'window.' + recipe['global'] + '=' + json.dumps(metadata) + ';\n', encoding='utf-8')
        report.append(dict(id=recipe['id'], sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                           atlasSha256=hashlib.sha256(png.read_bytes()).hexdigest(),
                           sourceSize=list(image.size), atlasSize=list(atlas.size),
                           frameCount=len(frames), scale=round(scale, 6),
                           alphaPreserved=image.mode == 'RGBA' and image.getextrema()[3][0] < 255))
        print(recipe['id'], len(frames), atlas.size)
    (dest / 'validation.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
