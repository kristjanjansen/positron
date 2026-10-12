"""beat_this run the way a browser tab would have to run it: on the last 12 s
only, every 2 s, never seeing the future. Writes readings in our-tempo.mjs's
shape so eval.mjs can score it beside our detector.

    ~/.cache/positron-tools/venv/bin/python research/tools/tempo-key/bt-window.py <in.wav> <out.json> [small0|final0]

Each reading is repeated over the four 0.5 s slots until the next one, so the
counts line up with the page's 0.5 s readings. Tempo is a least squares line
through the window's beats against their beat number; the phase is the newest
beat in the window.
"""
import json, sys, time
import numpy as np
import essentia, essentia.standard as es
from beat_this.inference import Audio2Beats
essentia.log.infoActive = False

path, dest = sys.argv[1], sys.argv[2]
ck = sys.argv[3] if len(sys.argv) > 3 else 'small0'
SR, W, STEP = 44100, 12.0, 2.0
a = es.MonoLoader(filename=path, sampleRate=SR)()
m = Audio2Beats(checkpoint_path=ck, device='cpu', dbn=False)
out, spent = [], 0.0
end = W
while end <= len(a) / SR:
    seg = a[int((end - W) * SR):int(end * SR)]
    t = time.time()
    b, _ = m(seg, SR)
    spent += time.time() - t
    b = np.asarray(b) + (end - W)
    reading = None
    if len(b) >= 4:
        ibi = np.diff(b)
        med = float(np.median(ibi))
        k = np.round((b - b[0]) / med)
        per = float(np.polyfit(k, b, 1)[0]) if len(set(k)) > 1 else med
        reading = {'bpm': round(60 / per, 1), 'conf': 1, 'beatAt': float(b[-1]), 'cand': []}
    for i in range(4):
        tt = end + 0.5 * i          # used until the next window is read, never before its own end
        if reading:
            out.append({'t': tt, **reading})
    end += STEP
json.dump({'file': path, 'checkpoint': ck, 'seconds': len(a) / SR,
           'msPerSecond': round(1000 * spent / (len(a) / SR), 2), 'readings': out}, open(dest, 'w'))
