"""Reference tempo, beats and key for one recording, from established tools.

    ~/.cache/positron-tools/venv/bin/python research/tools/tempo-key/ref.py <in.wav> <out.json>

The venv (Python 3.12, prebuilt wheels only, nothing compiled here):
    python3.12 -m venv ~/.cache/positron-tools/venv
    ~/.cache/positron-tools/venv/bin/pip install --only-binary=:all: essentia librosa torch beat-this soxr
⚠️ The venv has to live under the home directory. Under /private/tmp (the
session scratchpad) every native extension, numpy's included, failed to load
with `mmap ... failed with errno=1`: this managed machine refuses to map
executable pages from there.

What it writes (times in seconds from the start of the file):
  essentia_rhythm  RhythmExtractor2013 multifeature: global bpm, beat ticks, confidence
  essentia_degara  RhythmExtractor2013 degara: global bpm, beat ticks
  percival         PercivalBpmEstimator on 12 s windows every 2 s (the page's window)
  librosa          beat_track beats and global tempo; feature.tempo per frame
  beat_this        Foscarin, Schlueter, Widmer 2024 transformer beat tracker, final0 checkpoint, no DBN
  keys             essentia KeyExtractor (HPCP) on the 30 s before every 5 s mark, per profile, and on the whole file;
                   librosa chroma_cqt with Krumhansl-Kessler and Albrecht-Shanahan profiles (values as in music21) on the same windows
"""
import json, sys, time
import numpy as np
import essentia, essentia.standard as es
import librosa
essentia.log.infoActive = False

path, dest = sys.argv[1], sys.argv[2]
SR = 44100
audio = es.MonoLoader(filename=path, sampleRate=SR)()
dur = len(audio) / SR
out = {'file': path, 'seconds': dur, 'versions': {'essentia': essentia.__version__, 'librosa': librosa.__version__}}
timing = {}

t = time.time()
bpm, ticks, conf, est, iv = es.RhythmExtractor2013(method='multifeature')(audio)
out['essentia_rhythm'] = {'bpm': float(bpm), 'ticks': [float(x) for x in ticks], 'confidence': float(conf)}
timing['essentia_rhythm'] = time.time() - t
t = time.time()
bpm, ticks, conf, est, iv = es.RhythmExtractor2013(method='degara')(audio)
out['essentia_degara'] = {'bpm': float(bpm), 'ticks': [float(x) for x in ticks]}
timing['essentia_degara'] = time.time() - t

t = time.time()
perc = []
W, STEP = 12.0, 2.0
# ⚠️ A FRESH INSTANCE PER WINDOW. One instance reused across calls returned the
# same number for every window of a file (130 for all 86 windows of Raadio 2,
# 109 for all 294 of an Ida take whose tempo moves from 93 to 101), MEASURED
# 2026-10-12. A new instance per call reads 94, 94, 92, 101, 100 on that take.
for end in np.arange(W, dur + 1e-9, STEP):
    seg = audio[int((end - W) * SR):int(end * SR)].copy()
    perc.append([float(end), float(es.PercivalBpmEstimator(sampleRate=SR)(seg))])
out['percival'] = perc
timing['percival'] = time.time() - t

t = time.time()
y22 = librosa.resample(audio.astype(np.float32), orig_sr=SR, target_sr=22050)
tempo, beats = librosa.beat.beat_track(y=y22, sr=22050, units='time')
loc = librosa.feature.tempo(y=y22, sr=22050, aggregate=None)
hop_t = 512 / 22050
out['librosa'] = {'tempo': float(np.atleast_1d(tempo)[0]), 'beats': [float(x) for x in beats],
                  'local': [[float(i * hop_t), float(v)] for i, v in enumerate(loc) if i % 43 == 0]}
timing['librosa'] = time.time() - t

t = time.time()
try:
    from beat_this.inference import File2Beats
    f2b = File2Beats(checkpoint_path='final0', device='cpu', dbn=False)
    b, db = f2b(path)
    out['beat_this'] = {'beats': [float(x) for x in b], 'downbeats': [float(x) for x in db]}
except Exception as e:  # say why rather than drop it
    out['beat_this'] = {'error': repr(e)}
timing['beat_this'] = time.time() - t

t = time.time()
PROFILES = ['edma', 'bgate', 'krumhansl', 'temperley', 'shaath']
keys = {'whole': {}, 'windows': {p: [] for p in PROFILES}}
for p in PROFILES:
    k, s, st = es.KeyExtractor(profileType=p, sampleRate=SR)(audio)
    keys['whole'][p] = [k, s, float(st)]
    for end in np.arange(10.0, dur + 1e-9, 5.0):
        seg = audio[int(max(0, end - 30) * SR):int(end * SR)].copy()
        k, s, st = es.KeyExtractor(profileType=p, sampleRate=SR)(seg)  # fresh, as above
        keys['windows'][p].append([float(end), k, s, float(st)])
# An independent front end: librosa's constant Q chroma (not essentia's HPCP),
# summed over the same 30 s windows and correlated with two profile sets.
KK = {'major': [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
      'minor': [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]}
AS = {'major': [0.238, 0.006, 0.111, 0.006, 0.137, 0.094, 0.016, 0.214, 0.009, 0.080, 0.008, 0.081],
      'minor': [0.220, 0.006, 0.104, 0.123, 0.019, 0.103, 0.012, 0.214, 0.062, 0.022, 0.061, 0.052]}
NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
def corr_key(v, prof):
    best = None
    for mode in ('major', 'minor'):
        pr = np.array(prof[mode])
        for tonic in range(12):
            r = np.corrcoef(np.roll(v, -tonic), pr)[0, 1]
            if best is None or r > best[2]:
                best = (NAMES[tonic], mode, float(r))
    return best
chroma = librosa.feature.chroma_cqt(y=y22, sr=22050, hop_length=2048)
ct = 2048 / 22050
for name, prof in (('librosa_kk', KK), ('librosa_albrecht', AS)):
    keys['whole'][name] = list(corr_key(chroma.sum(axis=1), prof))
    keys['windows'][name] = []
    for end in np.arange(10.0, dur + 1e-9, 5.0):
        a, b = int(max(0, end - 30) / ct), int(end / ct)
        k, s_, r = corr_key(chroma[:, a:b].sum(axis=1), prof)
        keys['windows'][name].append([float(end), k, s_, r])
out['keys'] = keys
timing['keys'] = time.time() - t
out['timing_s'] = timing
with open(dest, 'w') as fh:
    json.dump(out, fh)
