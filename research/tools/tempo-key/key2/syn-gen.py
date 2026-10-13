# 48 synthetic pieces of known key, 40 s: 24 keys x 2 progressions each,
# additive piano chords, a detuned saw pad, a bass on roots, a melody on chord
# tones, noise hats and a sine kick, tuned -30..+30 cents. Written 2026-10-13
# (the 2026-10-11 set's generator was in a scratchpad that is gone).
#   cd $KD2/syn && ~/.cache/positron-tools/venv/bin/python syn-gen.py
#   then node spectra.mjs <x>.f32 $KD2/spec-syn-<x>.f32 for each
import numpy as np, json
rng = np.random.default_rng(13)
SR = 44100
MAJ = [[[0,4,7],[7,11,14],[9,12,16],[5,9,12]], [[0,4,7],[5,9,12],[7,11,14,17],[0,4,7]]]   # I V vi IV ; I IV V7 I
MIN = [[[0,3,7],[5,8,12],[7,11,14,17],[0,3,7]], [[0,3,7],[8,12,15],[3,7,10],[10,14,17]]]   # i iv V7 i ; i VI III VII
labels = []
def tone(f, n, kind, amp):
    t = np.arange(n) / SR
    y = np.zeros(n)
    if kind == 'piano':
        for h in range(1, 15):
            fh = f * h * np.sqrt(1 + 0.0004 * h * h)
            if fh > 8000: break
            y += np.sin(2*np.pi*fh*t + rng.uniform(0, 6.28)) * np.exp(-t * (1.2 + 0.4*h)) / h
    elif kind == 'saw':
        for d in (-0.004, 0.004):
            for h in range(1, 40):
                if f*h > 9000: break
                y += np.sin(2*np.pi*f*(1+d)*h*t) / h * 0.5
        y *= np.minimum(1, t / 0.2)
    elif kind == 'bass':
        y = np.sin(2*np.pi*f*t) + 0.3*np.sin(4*np.pi*f*t)
        y *= np.exp(-t * 2)
    elif kind == 'lead':
        y = np.sin(2*np.pi*f*t) + 0.2*np.sin(6*np.pi*f*t)
        y *= np.exp(-t * 3)
    return y * amp
for tonic in range(12):
    for mode in ('major', 'minor'):
        for v in range(2):
            prog = (MAJ if mode == 'major' else MIN)[v]
            bpm = rng.uniform(90, 130); beat = 60 / bpm; bar = 4 * beat
            cents = rng.uniform(-30, 30); voice = rng.choice(['piano', 'saw', 'both'])
            N = SR * 40; y = np.zeros(N)
            def hz(m): return 440 * 2 ** ((m - 69 + cents / 100) / 12)
            root = 48 + tonic if tonic < 6 else 36 + tonic
            nb = int(40 / bar) + 1
            for b in range(nb):
                ch = prog[b % 4]; s0 = int(b * bar * SR); n = int(bar * SR)
                if s0 >= N: break
                n = min(n, N - s0)
                for c in ch:
                    if voice in ('piano', 'both'): y[s0:s0+n] += tone(hz(root + c), n, 'piano', 0.06)
                    if voice in ('saw', 'both'): y[s0:s0+n] += tone(hz(root + c), n, 'saw', 0.02)
                for q in range(4):
                    s1 = s0 + int(q * beat * SR); m = int(beat * SR)
                    if s1 + m > N: break
                    y[s1:s1+m] += tone(hz(root - 12 + ch[0] + (7 if q == 2 else 0)), m, 'bass', 0.12)
                    y[s1:s1+int(0.15*SR)] += np.sin(2*np.pi*55*np.arange(int(0.15*SR))/SR) * np.exp(-np.arange(int(0.15*SR))/SR*30) * 0.3
                    h0 = s1 + int(beat * SR / 2); hl = int(0.05 * SR)
                    if h0 + hl < N: y[h0:h0+hl] += rng.normal(0, 0.03, hl) * np.exp(-np.arange(hl)/SR*80)
                    mel = root + 12 + ch[rng.integers(len(ch))]
                    y[s1:s1+m] += tone(hz(mel), m, 'lead', 0.04)
            y += rng.normal(0, 0.002, N)
            y = (y / np.abs(y).max() * 0.5).astype(np.float32)
            name = f's{tonic:02d}{mode[:3]}{v}'
            y.tofile(f'{name}.f32')
            labels.append({'name': name, 'tonic': tonic, 'mode': mode, 'v': v, 'voice': str(voice), 'cents': round(cents, 1)})
json.dump(labels, open('labels.json', 'w'))
print(len(labels))
