"""A reference chord track for one recording, from essentia, for grading what
autoplay on /radio/key/ chooses. Soft truth, not truth: nobody has
labelled these recordings, and essentia's ChordsDetection knows only major and
minor triads.

    ~/.cache/positron-tools/venv/bin/python research/tools/tempo-key/ref-chords.py <in.f32> <out.json>

<in.f32> is mono float32 at 44.1 kHz, as autoplay-chords.mjs reads it. HPCP
(36 bins, 100 Hz to 5 kHz, essentia's defaults otherwise) on 4096 sample
frames every 2048, then ChordsDetection over a 2 s window. Writes
{"hop": seconds, "chords": [[t, label, strength], ...]}.
"""
import json, sys
import numpy as np
import essentia, essentia.standard as es
essentia.log.infoActive = False

src, dest = sys.argv[1], sys.argv[2]
SR, FRAME, HOP = 44100, 4096, 2048
audio = np.fromfile(src, dtype=np.float32)
w = es.Windowing(type='blackmanharris62')
spec = es.Spectrum()
peaks = es.SpectralPeaks(orderBy='magnitude', magnitudeThreshold=0.00001, minFrequency=40, maxFrequency=5000, maxPeaks=60, sampleRate=SR)
hpcp = es.HPCP(size=36, referenceFrequency=440, minFrequency=100, maxFrequency=5000, sampleRate=SR)
frames = []
for f in es.FrameGenerator(audio, frameSize=FRAME, hopSize=HOP, startFromZero=True):
    fr, mg = peaks(spec(w(f)))
    frames.append(hpcp(fr, mg))
chords, strength = es.ChordsDetection(hopSize=HOP, sampleRate=SR, windowSize=2)(np.array(frames, dtype=np.float32))
hop = HOP / SR
json.dump({"hop": hop, "chords": [[round(i * hop, 3), c, round(float(s), 3)] for i, (c, s) in enumerate(zip(chords, strength))]}, open(dest, 'w'))
print(dest, len(chords), 'frames')
