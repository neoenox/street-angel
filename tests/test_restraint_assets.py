import unittest
import json
import hashlib
from pathlib import Path
from PIL import Image

class RestraintAssetsTests(unittest.TestCase):
    def test_all_fighters_have_four_valid_transparent_frames_with_recorded_hashes(self):
        root=Path(__file__).parents[1]
        source=root/'source_art/character-v2/restraint-rear-source.png'
        reports=json.loads((root/'assets/characters/restraint-validation.json').read_text())
        self.assertEqual({r['kind'] for r in reports},{'aoi','thug','yankee','brute'})
        for r in reports:
            source=root/'source_art/character-v2'/r['source']
            path=root/'assets/characters'/r['output']
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),r['sourceSha256'])
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),r['atlasSha256'])
            im=Image.open(path)
            self.assertEqual(im.mode,'RGBA')
            self.assertEqual(im.getextrema()[3][0],0)
            frames=json.loads(path.with_suffix('.js').read_text().split('=',1)[1].rstrip(';\n'))['frames']
            self.assertEqual(len(frames),4)
            normal={'aoi':('characters/aoi_attack_v2',3),'thug':('characters/thug_combat_v2',0),'yankee':('characters/yankee_combat_v2',0),'brute':('br_cmb',0)}[r['kind']]
            normal_path=root/'assets'/normal[0]
            normal_frames=json.loads(normal_path.with_suffix('.js').read_text().split('=',1)[1].rstrip(';\n'))['frames']
            # The rear hold is upright: it must retain the normal fighter's scale.
            ratio=frames[1]['h']/normal_frames[normal[1]]['h']
            self.assertTrue(.90<ratio<1.10,(r['kind'],ratio))
            for f in frames:
                self.assertLessEqual(f['x']+f['w'],im.width)
                self.assertLessEqual(f['h'],im.height)
                self.assertTrue(0<=f['ax']<=f['w'])
                self.assertEqual(f['ay'],f['h'])
