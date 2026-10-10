import importlib.util
from pathlib import Path
import unittest
import json
import hashlib
from PIL import Image
import numpy as np

spec = importlib.util.spec_from_file_location('pack', Path(__file__).parents[1] / 'tools/pack_character_sheet.py')
pack = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pack)


class CharacterPackTests(unittest.TestCase):
    def test_native_alpha_and_green_clothing_are_preserved(self):
        image = Image.new('RGBA', (2, 1))
        image.putdata([(0, 220, 0, 128), (255, 20, 30, 0)])
        np.testing.assert_array_equal(pack.key_background(image), np.array(image))

    def test_opaque_green_is_removed_without_losing_white_or_skin(self):
        image = Image.new('RGB', (3, 1))
        image.putdata([(0, 255, 0), (240, 240, 240), (230, 170, 130)])
        result = pack.key_background(image)
        self.assertEqual(list(result[:, :, 3].flat), [0, 255, 255])
        np.testing.assert_array_equal(result[0, 1:, :3], np.array(image)[0, 1:])

    def test_one_sheet_scale_keeps_crouched_frames_small(self):
        poses = [(Image.new('RGBA', (20, 40), 'red'), 10, [0, 0, 20, 40]),
                 (Image.new('RGBA', (40, 20), 'red'), 20, [0, 0, 40, 20])]
        atlas, frames, scale = pack.pack(poses, 0, 80)
        self.assertEqual(scale, 2)
        self.assertEqual([f['h'] for f in frames], [80, 40])
        self.assertEqual([f['ay'] for f in frames], [80, 40])
        self.assertEqual(atlas.mode, 'RGBA')

    def test_shipped_atlases_match_sources_and_all_frames_fit(self):
        root = Path(__file__).parents[1]
        recipes = json.loads((root / 'source_art/character-v2/recipes.json').read_text(encoding='utf-8'))
        report = json.loads((root / 'assets/characters/validation.json').read_text())
        for recipe, entry in zip(recipes['assets'], report):
            source = root / 'source_art/character-v2' / recipe['source']
            png = root / 'assets/characters' / (recipe['output'] + '.png')
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), entry['sourceSha256'])
            self.assertEqual(hashlib.sha256(png.read_bytes()).hexdigest(), entry['atlasSha256'])
            text = png.with_suffix('.js').read_text()
            frames = json.loads(text.split('=', 1)[1].rstrip(';\n'))['frames']
            image = Image.open(png)
            self.assertEqual(image.mode, 'RGBA')
            self.assertEqual(len(frames), recipe['cols'] * recipe['rows'])
            for f in frames:
                self.assertLessEqual(f['x'] + f['w'], image.width)
                self.assertLessEqual(f['y'] + f['h'], image.height)
                self.assertTrue(0 <= f['ax'] <= f['w'])
                self.assertEqual(f['ay'], f['h'])
                self.assertEqual(image.getpixel((f['x'] + f['w'], 0))[3], 0)

    def test_missing_pose_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'missing pose'):
            pack.extract_poses(Image.new('RGBA', (100, 100)), 2, 2, 'red')


if __name__ == '__main__':
    unittest.main()
