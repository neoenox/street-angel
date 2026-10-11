import hashlib
import json
import unittest
from pathlib import Path
from PIL import Image

class HoldPairAssetsTests(unittest.TestCase):
    def test_registered_pairs_preserve_aoi_size_and_hashes(self):
        root=Path(__file__).parents[1]
        reports=json.loads((root/'assets/characters/hold-pairs-validation.json').read_text())
        self.assertEqual({r['kind'] for r in reports},{'yankee','brute','boss'})
        for r in reports:
            source=root/'source_art/character-v2'/r['source']
            atlas=root/'assets/characters'/r['output']
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),r['sourceSha256'])
            self.assertEqual(hashlib.sha256(atlas.read_bytes()).hexdigest(),r['atlasSha256'])
            self.assertTrue(250<=r['aoiHeight']<=266,r)
            with Image.open(atlas) as im:
                self.assertEqual(im.mode,'RGBA');self.assertEqual(im.getextrema()[3],(0,255))
                metadata=json.loads(atlas.with_suffix('.js').read_text().split('=',1)[1].rstrip(';\n'))
                self.assertEqual(len(metadata['frames']),1)
                f=metadata['frames'][0]
                self.assertLessEqual(f['x']+f['w'],im.width);self.assertEqual(f['ay'],im.height)
                self.assertTrue(0<f['ax']<f['w'])
                if r['kind']=='yankee':
                    x,y,w,h=metadata['paletteRect']
                    self.assertTrue(x>f['w']*.4);self.assertLessEqual(x+w,im.width)
                    self.assertLessEqual(y+h,im.height)
