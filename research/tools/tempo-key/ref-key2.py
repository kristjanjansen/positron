"""More key references for one recording: two further front ends beside ref.py's.

    ~/.cache/positron-tools/venv/bin/python research/tools/tempo-key/ref-key2.py <in.wav> <out.json> [--win 30] [--step 5]

Readers, each on the `win` seconds before every `step` s mark (the same marks
ref.py uses, from 10 s):
  madmom_cnn   Korzeniowski and Widmer 2018, the genre agnostic key CNN
               (madmom 0.16.1 CNNKeyRecognitionProcessor, its 5 network
               ensemble), run on the window's slice of its own log spectrogram.
               The network ends in global average pooling, so a slice is a
               whole input to it.
  dc_kk, dc_albrecht   madmom's DeepChromaProcessor (Korzeniowski and Widmer
               2016, a network trained to output chroma that predicts chords),
               summed over the window, correlated with Krumhansl-Kessler and
               Albrecht-Shanahan.
  bp_temperley, bp_albrecht   Spotify's basic-pitch (Bittner et al. 2022) note
               transcription through its ONNX model, notes weighted by
               duration in the window times amplitude, folded to pitch
               classes, correlated with Temperley and Albrecht-Shanahan.

Nothing here is compiled. madmom has no wheel for Python 3.12, so it is
imported from its PyPI source tree with its three Cython modules stubbed
(`~/.cache/positron-tools/madmom-shim/load.py`); the key and chroma paths use
none of them. basic-pitch is installed `--no-deps` (its Darwin dependency is
tensorflow-macos < 2.15.1, which has no wheel for 3.12) and run on
onnxruntime.
"""
import json, os, sys, time, warnings, logging
warnings.filterwarnings('ignore')
logging.disable(logging.WARNING)
import numpy as np
sys.path.insert(0, os.path.expanduser('~/.cache/positron-tools/madmom-shim'))
import load  # noqa: F401  (madmom from source, stubs in place)
from madmom.audio.signal import SignalProcessor, FramedSignalProcessor
from madmom.audio.stft import ShortTimeFourierTransformProcessor
from madmom.audio.spectrogram import LogarithmicFilteredSpectrogramProcessor
from madmom.ml.nn import NeuralNetworkEnsemble
from madmom.ml.nn.activations import softmax
from madmom.models import KEY_CNN
from madmom.audio.chroma import DeepChromaProcessor
from madmom.features.key import key_prediction_to_label

args = sys.argv[1:]
path, dest = args[0], args[1]
opt = lambda k, d: float(args[args.index(k) + 1]) if k in args else d
WIN, STEP = opt('--win', 30.0), opt('--step', 5.0)
NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
SPELL = {'Db': 'C#', 'D#': 'Eb', 'Gb': 'F#', 'G#': 'Ab', 'A#': 'Bb'}
PROF = {
    'kk': {'major': [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88],
           'minor': [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]},
    'albrecht': {'major': [0.238, 0.006, 0.111, 0.006, 0.137, 0.094, 0.016, 0.214, 0.009, 0.080, 0.008, 0.081],
                 'minor': [0.220, 0.006, 0.104, 0.123, 0.019, 0.103, 0.012, 0.214, 0.062, 0.022, 0.061, 0.052]},
    'temperley': {'major': [0.748, 0.060, 0.488, 0.082, 0.670, 0.460, 0.096, 0.715, 0.104, 0.366, 0.057, 0.400],
                  'minor': [0.712, 0.084, 0.474, 0.618, 0.049, 0.460, 0.105, 0.747, 0.404, 0.067, 0.133, 0.330]},
}


def corr_key(v, prof):
    best = None
    if not np.any(v > 0):
        return [None, None, 0.0]
    for mode in ('major', 'minor'):
        pr = np.array(prof[mode])
        for tonic in range(12):
            r = float(np.corrcoef(np.roll(v, -tonic), pr)[0, 1])
            if best is None or r > best[2]:
                best = [NAMES[tonic], mode, r]
    return best


sig = SignalProcessor(num_channels=1, sample_rate=44100)(path)
dur = len(sig) / 44100
marks = list(np.arange(10.0, dur + 1e-9, STEP))
out = {'file': path, 'seconds': dur, 'win': WIN, 'step': STEP, 'windows': {}, 'whole': {}, 'timing_s': {}}

# madmom CNN key, per window on a slice of one spectrogram (5 frames a second)
t = time.time()
frames = FramedSignalProcessor(frame_size=8192, fps=5)(sig)
spec = LogarithmicFilteredSpectrogramProcessor(num_bands=24, fmin=65, fmax=2100, unique_filters=True)(
    ShortTimeFourierTransformProcessor()(frames))
nn = NeuralNetworkEnsemble.load(KEY_CNN)
def cnn(a, b):
    p = softmax(nn(np.asarray(spec[a:b]))[np.newaxis, :])[0]
    tonic, mode = key_prediction_to_label(p).split()
    return [SPELL.get(tonic, tonic), mode, float(p.max())]
out['windows']['madmom_cnn'] = [[float(e)] + cnn(int(max(0, e - WIN) * 5), int(e * 5)) for e in marks]
out['whole']['madmom_cnn'] = cnn(0, len(spec))
out['timing_s']['madmom_cnn'] = time.time() - t

# madmom deep chroma, 10 frames a second
t = time.time()
dcC = DeepChromaProcessor()(path)        # (frames, 12), bins from C
out['timing_s']['deep_chroma'] = time.time() - t
# ⚠️ THE BINS START AT C. The first version rolled them as though they started
# at A and the positive control (synthetic C major, D major, A minor) read A
# major, B major and F# minor: exactly a minor third off, every time.
for pn in ('kk', 'albrecht'):
    out['windows']['dc_' + pn] = [[float(e)] + corr_key(dcC[int(max(0, e - WIN) * 10):int(e * 10)].sum(0), PROF[pn]) for e in marks]
    out['whole']['dc_' + pn] = corr_key(dcC.sum(0), PROF[pn])

# basic-pitch notes
t = time.time()
from basic_pitch.inference import predict, Model
from basic_pitch import ICASSP_2022_MODEL_PATH
import pathlib
model = Model(pathlib.Path(ICASSP_2022_MODEL_PATH).parent / 'nmp.onnx')
import contextlib, io
with contextlib.redirect_stdout(io.StringIO()):
    _, _, notes = predict(path, model)
notes = np.array([[n[0], n[1], n[2], n[3]] for n in notes], dtype=float)
out['timing_s']['basic_pitch'] = time.time() - t
out['notes'] = len(notes)
def bp_hist(a, b):
    h = np.zeros(12)
    if len(notes) == 0: return h
    ov = np.clip(np.minimum(notes[:, 1], b) - np.maximum(notes[:, 0], a), 0, None)
    np.add.at(h, notes[:, 2].astype(int) % 12, ov * notes[:, 3])
    return h
for pn in ('temperley', 'albrecht'):
    out['windows']['bp_' + pn] = [[float(e)] + corr_key(bp_hist(max(0, e - WIN), e), PROF[pn]) for e in marks]
    out['whole']['bp_' + pn] = corr_key(bp_hist(0, dur), PROF[pn])

with open(dest, 'w') as fh:
    json.dump(out, fh)
print(dest, {k: round(v, 1) for k, v in out['timing_s'].items()}, out['whole'])
