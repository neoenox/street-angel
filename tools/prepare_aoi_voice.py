"""Trim synthesized placeholder clips and balance their levels using PCM only."""
import hashlib
import json
from pathlib import Path
import struct
import wave

root = Path(__file__).resolve().parents[1]
source = root / 'source_art/audio'
dest = root / 'assets/audio'
dest.mkdir(parents=True, exist_ok=True)
report = []
for name, text in [('aoi-hurt-u', 'うっ'), ('aoi-hurt-ku', 'くっ')]:
    path = source / (name + '.wav')
    with wave.open(str(path), 'rb') as wav:
        assert wav.getnchannels() == 1 and wav.getsampwidth() == 2
        rate = wav.getframerate()
        raw = wav.readframes(wav.getnframes())
    samples = list(struct.unpack('<' + 'h' * (len(raw) // 2), raw))
    peak = max(abs(x) for x in samples)
    audible = [i for i, x in enumerate(samples) if abs(x) > max(24, peak * .018)]
    if not audible:
        raise ValueError('silent voice: ' + name)
    samples = samples[max(0, audible[0] - int(rate * .015)):min(len(samples), audible[-1] + int(rate * .04))]
    rms = (sum(x*x for x in samples) / len(samples)) ** .5
    gain = min(.10 * 32768 / rms, .85 * 32768 / peak)
    fade = int(rate * .005)
    samples = [round(x * gain * min(1, i/fade, (len(samples)-1-i)/fade)) for i, x in enumerate(samples)]
    output = dest / (name + '.wav')
    with wave.open(str(output), 'wb') as wav:
        wav.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
        wav.writeframes(struct.pack('<' + 'h' * len(samples), *samples))
    report.append(dict(file=output.name, text=text, duration=round(len(samples)/rate, 4),
                       sampleRate=rate, channels=1, bits=16,
                       sourceSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                       sha256=hashlib.sha256(output.read_bytes()).hexdigest()))
(dest / 'provenance.json').write_text(json.dumps(dict(
    purpose='Temporary female damage speech for Aoi only, not acted recordings.',
    engine='Windows System.Speech SAPI', voice='Microsoft Haruka Desktop', locale='ja-JP',
    rate=2, volume=90, processing='Trim silence, RMS level balance with peak cap, 5ms edge fades.',
    generator='tools/generate_aoi_voice.ps1 + tools/prepare_aoi_voice.py', files=report,
), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
