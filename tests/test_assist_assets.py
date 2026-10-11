import hashlib
import json
import unittest
from pathlib import Path
from PIL import Image

class AssistAssetsTests(unittest.TestCase):
    def test_all_four_sheets_preserve_alpha_scale_and_hashes(self):
        root=Path(__file__).parents[1]
        reports=json.loads((root/'assets/characters/assist-validation.json').read_text())
        self.assertEqual({r['kind'] for r in reports},{'aoi','thug','yankee','brute'})
        for report in reports:
            source=root/'source_art/character-v2'/report['source']
            path=root/'assets/characters'/report['output']
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),report['sourceSha256'])
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),report['atlasSha256'])
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
                self.assertTrue(.88<=f['h']/report['referenceHeight']<=1.05)
                self.assertIsNotNone(im.crop((f['x'],0,f['x']+f['w'],f['h'])).getbbox())
