import unittest
import json
import hashlib
from pathlib import Path
from PIL import Image

class RestraintAssetsTests(unittest.TestCase):
    def test_all_fighters_have_four_valid_transparent_frames_with_recorded_hashes(self):
        root=Path(__file__).parents[1]
        source=root/'source_art/character-v2/restraint-source.png'
        reports=json.loads((root/'assets/characters/restraint-validation.json').read_text())
        self.assertEqual({r['kind'] for r in reports},{'aoi','thug','yankee','brute'})
        for r in reports:
            path=root/f"assets/characters/{r['kind']}_restraint_v1.png"
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),r['sourceSha256'])
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),r['atlasSha256'])
            im=Image.open(path)
            self.assertEqual(im.mode,'RGBA')
            self.assertEqual(im.getextrema()[3][0],0)
            frames=json.loads(path.with_suffix('.js').read_text().split('=',1)[1].rstrip(';\n'))['frames']
            self.assertEqual(len(frames),4)
            for f in frames:
                self.assertLessEqual(f['x']+f['w'],im.width)
                self.assertLessEqual(f['h'],im.height)
                self.assertTrue(0<=f['ax']<=f['w'])
                self.assertEqual(f['ay'],f['h'])
