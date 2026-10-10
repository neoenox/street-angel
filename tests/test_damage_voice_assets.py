import hashlib
import json
from pathlib import Path
import struct
import unittest
import wave


class DamageVoiceAssetsTests(unittest.TestCase):
    def test_clips_are_short_non_silent_pcm_with_faded_edges_and_recorded_hashes(self):
        root = Path(__file__).parents[1] / 'assets/audio'
        provenance = json.loads((root / 'provenance.json').read_text(encoding='utf-8'))
        self.assertEqual(len(provenance['files']), 2)
        for entry in provenance['files']:
            path = root / entry['file']
            self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(), entry['sha256'])
            with wave.open(str(path), 'rb') as audio:
                self.assertEqual((audio.getnchannels(), audio.getsampwidth(), audio.getframerate()), (1, 2, 22050))
                self.assertTrue(.08 <= audio.getnframes() / audio.getframerate() <= .6)
                raw = audio.readframes(audio.getnframes())
            samples = struct.unpack('<' + 'h' * (len(raw) // 2), raw)
            self.assertEqual((samples[0], samples[-1]), (0, 0))
            self.assertTrue(1000 < max(abs(x) for x in samples) <= 28000)


if __name__ == '__main__':
    unittest.main()
