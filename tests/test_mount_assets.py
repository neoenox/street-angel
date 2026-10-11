import hashlib
import json
import unittest
from pathlib import Path
from PIL import Image

class MountAssetsTests(unittest.TestCase):
    def test_six_frames_are_bounded_transparent_and_source_is_reproducible(self):
        root=Path(__file__).parents[1]
        source=root/'source_art/character-v2/mount-source.png'
        atlas=root/'assets/characters/mount_v1.png'
        report=json.loads((atlas.parent/'mount-validation.json').read_text())
        self.assertEqual(report['sourceSha256'],hashlib.sha256(source.read_bytes()).hexdigest())
        self.assertEqual(report['armSourceSha256'],hashlib.sha256((source.parent/'mount-arms-v2-source.png').read_bytes()).hexdigest())
        self.assertEqual(report['atlasSha256'],hashlib.sha256(atlas.read_bytes()).hexdigest())
        im=Image.open(atlas)
        self.assertEqual(im.mode,'RGBA');self.assertEqual(im.getextrema()[3],(0,255))
        frames=json.loads(atlas.with_suffix('.js').read_text().split('=',1)[1].rstrip(';\n'))['frames']
        self.assertEqual(len(frames),6)
        for f in frames:
            self.assertLessEqual(f['x']+f['w'],im.width)
            self.assertLessEqual(f['h'],im.height)
            self.assertTrue(0<f['ax']<f['w'])
            self.assertEqual(f['ay'],f['h'])
            self.assertTrue(0<=f['paletteWidth']<=f['w'])
        self.assertEqual(frames[4]['paletteWidth'],0)
        self.assertEqual(frames[5]['paletteWidth'],0)
