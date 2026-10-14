# Kit lessons: moq-audio.mjs

The long comments cut from `demo/shell/moq-audio.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-moq-audio.md#<anchor>`.

<a id="header"></a>

## moq-audio.mjs, file header

The MoQ audio return, extracted from proto/jam's measured rig (session 6i,
35.8 ms key->ear against WebRTC's 77.7).

WHY IT IS FASTER, in one line: WebRTC's cushion is NetEQ's and cannot be
hinted away -- it clamps at 20 ms and forcing it destabilises. Here the
playout floor is OURS, so latency is a number you choose: the measured curve
maps floor ~1:1 into latency (10 -> 36 ms, 40 -> 66 ms).

Reused rather than rewritten: /proto/jam/moq/www/moq-synth.js (the relay
wrapper) and /proto/jam/playout-worklet.js (pcm-capture tap + pcm-playout
ring with an underrun-counting floor).

<a id="publish-synth"></a>

## moq-audio.mjs, publishSynth

Publish `bus` to the relay under `ns`. Returns { stats(), close() }.
`msDest` must be a MediaStreamDestination fed by the same graph — see the
pacer note below; without it a HEADLESS context free-runs in bursts and the
subscriber starves through every retry while everything reports healthy.
groupMs 200 IS THE MEASURED DEFAULT, not a guess. One MoQ group is one QUIC
uni-stream, so 50 ms groups opened 20 streams a second and 200 ms opens 5.
Swept across both relays, twice each: 50 ms lost 0.8% on the LAN and 2.2% over
Cloudflare, 200 ms lost 0.0% on BOTH -- and was also the FASTEST Cloudflare
config (73 ms against 76), so it costs nothing to take.

<a id="pacer"></a>

## moq-audio.mjs, publishSynth, realtime pacing pin

REALTIME PACING PIN. A headless AudioContext with nothing pulling it renders
in bursts (measured 0.2-2.9 s stalls then catch-up), which the capture tap
faithfully reproduces and the subscriber sees as starvation. A muted element
consuming the stream restores the realtime pull. One element for the page's
life: a per-arm one that got paused left the SECOND run with no puller at
all and zero groups on the wire.

<a id="latency-max"></a>

## moq-audio.mjs, publishSynth, latencyMax

latencyMax is the window the relay RETAINS, and the wrapper's default is
2000 ms. Left at that, a subscriber joining mid-stream is served the whole
two seconds and spends the run draining it -- measured: transit starting at
2030 ms and counting down, decode perfect, underruns zero. Everything looks
healthy and every sound is two seconds old.

<a id="capture-tap"></a>

## moq-audio.mjs, publishSynth, the capture tap

Tap the synth bus. 128-frame quanta; media timestamps are anchored ONCE off
the first quantum's context time and then advanced by exact sample count --
re-anchoring per quantum would inject the main thread's jitter into the
timeline the decoder reads.
