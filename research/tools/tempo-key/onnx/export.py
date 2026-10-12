"""beat_this small0 to ONNX for onnxruntime-web, plus a fixture to check a JS
front end against. Needs `onnx` in the venv (binary wheel, installed 2026-10-12).

    cd <work dir> && ~/.cache/positron-tools/venv/bin/python export.py <a 44.1 kHz mono wav>

Writes small0.onnx (float32, 10.5 MB), small0-f16.onnx (weights stored as
float16 and cast back at load, 6.3 MB, arithmetic unchanged) and fx-*.f32: a
12 s window at 44.1 and 22.05 kHz (soxr), its log mel, and the torch logits.
The time axis is dynamic. The logits are taken from a FRESH model: logits taken
after torch.onnx.export on the same instance differed by up to 6.9 (the rotary
embedding cache), while the ONNX graph matches a fresh torch run to 6e-5.
"""
import os, sys, numpy as np, torch, soxr, soundfile as sf
import onnx
from onnx import numpy_helper, helper, TensorProto
from beat_this.inference import load_model
from beat_this.preprocessing import LogMelSpect

class W(torch.nn.Module):
    def __init__(s, m): super().__init__(); s.m = m
    def forward(s, x): y = s.m(x); return y['beat'], y['downbeat']

m = load_model('small0', device='cpu').eval()
torch.onnx.export(W(m), (torch.randn(1, 613, 128),), 'small0.onnx', input_names=['spect'], output_names=['beat', 'downbeat'],
    opset_version=17, dynamo=False, dynamic_axes={'spect': {1: 'T'}, 'beat': {1: 'T'}, 'downbeat': {1: 'T'}})
onnx.checker.check_model(onnx.load('small0.onnx'))

mo = onnx.load('small0.onnx'); g = mo.graph; init, casts = [], []
for t in g.initializer:
    a = numpy_helper.to_array(t)
    if a.dtype == np.float32 and a.size >= 64:
        h = numpy_helper.from_array(a.astype(np.float16), t.name + '__f16'); init.append(h)
        casts.append(helper.make_node('Cast', [h.name], [t.name], to=TensorProto.FLOAT))
    else: init.append(t)
del g.initializer[:]; g.initializer.extend(init)
nodes = list(g.node); del g.node[:]; g.node.extend(casts + nodes)
onnx.checker.check_model(mo); onnx.save(mo, 'small0-f16.onnx')

a, sr = sf.read(sys.argv[1], dtype='float32')
seg = a[int(60 * sr):int(72 * sr)]
s22 = soxr.resample(seg, sr, 22050).astype(np.float32)
spec = LogMelSpect()(torch.tensor(s22))
fresh = load_model('small0', device='cpu').eval()
with torch.no_grad(): y = fresh(torch.nn.functional.pad(spec, (0, 0, 6, 6)).unsqueeze(0))
seg.tofile('fx-wave44.f32'); s22.tofile('fx-wave22.f32')
spec.numpy().astype(np.float32).tofile('fx-mel.f32'); y['beat'][0].numpy().astype(np.float32).tofile('fx-beat.f32')
print({f: os.path.getsize(f) for f in ['small0.onnx', 'small0-f16.onnx']})
