# Kit lessons: moq.mjs, moq-test.mjs

The long comments cut from `demo/shell/moq.mjs` and `demo/shell/moq-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-moq.md#<anchor>`.

<a id="header"></a>

## moq.mjs, file header

MoQ leg — browser publishes, Cloudflare's relay carries, browser subscribes.

Everything here was measured before it was written; the source of truth is
rig/moq/RUNBOOK.md §6-7. The load-bearing facts:

 · A browser CAN speak IETF MoQT to Cloudflare today. @moq/net offers a compat
   CLIENT_SETUP whose first varint (0x20) is byte-identical to draft-14's
   CLIENT_SETUP type, offering [lite-02, lite-01, DRAFT_14]; CF picks
   draft-14. Session in ~125 ms, verified on the wire (§6.2, §6.4).
 · Video works end to end: 1280x720@30 sustained 90 s, glass-to-glass
   p50 26.2 ms / p95 42.4 ms over n=2740 frames (§7.1).
 · A relay CANNOT live in a Container — no public IP, no raw listeners, so
   inbound QUIC is impossible. Only dial-out clients work (research/
   cf-containers-2026-08.md). Hence browser-to-browser, not container.
 · IETF moq-pub/moq-sub do NOT interoperate with hang: the catalog track name
   (`catalog.json` vs `.catalog`), schema (hang RootSchema vs WARP) and
   container declaration all differ. Both directions die at that one layer
   (§7.2, §7.3). So both ends here are hang, which is what was proven.

Four of the five traps from §7.1 are handled below and marked TRAP n. The
fifth (fresh user-data-dir per headless run) belongs to the harness.
`/moq/`, not `/08-moq/`: demos are addressed by SLUG now, and this import was
left behind by that rename — a 404 that took the whole module down, so `moq`
and `ladder` never reached __demo.ready at all. It escaped the build's own
missing-import check because that check reads HTML files only, and this is a
.mjs importing a .js.

<a id="moq-support"></a>

## moq.mjs, moqSupport

Can this browser reach the relay at all?

CORRECTED TWICE on 2026-09-05. First I claimed Safari has no WebTransport;
that was wrong. Then I built a bypass on the assumption the library's block
was merely conservative; that was wrong too. What is actually true:

1. macOS Safari 26.6.2 HAS WebTransport and it connects. Asked directly,
   `new WebTransport('https://draft-14.cloudflare.mediaoverquic.com')`
   reached ready in 140 ms and created a bidirectional stream. WebTransport
   shipped in Safari 26.4 (24 Mar 2026) on macOS AND iOS.
2. @moq/net blocks it by USER-AGENT, `bowser.satisfies({ safari: '<0' })`,
   which no Safari version can satisfy — a permanent blanket block.
3. THE BLOCK IS CORRECT. Its source comment cites WebKit bug 319818:
   Safari's QUIC flow-control window never refills, so a session deadlocks
   after ~16 MiB or ~7,600 streams, whichever comes first. MoQ opens one
   stream per group, which reaches that in about two minutes.
   https://bugs.webkit.org/show_bug.cgi?id=319818 (NEW, P2, Aug 2026)
   Also open: 322201, `WebTransport.datagrams` undefined on iOS.

Bypassing it reproduces the bug exactly. Measured here: connect 87 ms,
catalog fine, first frame at 0.79 s — then SIX frames total in 30 s and
nothing more. And it is not the encoder: Safari's WebCodecs does VP8 1280x720
at 370 fps (h264 72, vp9 345), so encoding had ~12x headroom.

So the bypass is OPT-IN ONLY (`?transport=force` on demo 08), for measuring
the bug rather than for shipping. Default behaviour respects the block.

The WebSocket route would work — qmux over WebSocket is a real draft
(draft-lcurley-qmux-websocket-00) and moq-relay implements a listener — but
CLOUDFLARE'S RELAY HAS NO WEBSOCKET LISTENER, so there is nothing to
negotiate with. Confirmed by handshake test (four failures out of four) and
by cloudflare/moq-rs documenting only WebTransport and raw QUIC. Note for any
retest: the correct subprotocols are the cross product, e.g.
`qmux-01.moq-lite-05`, NOT the bare `qmux-0N` I tried; and qmux-02 does not
exist. The conclusion is unchanged — no listener is no listener.

The WebSocket fallback is separately useless here: @moq/net can map
https:->wss: with the qmux-02/01/00 subprotocols, but Cloudflare draft-14
refuses a WebSocket handshake outright — measured, all three subprotocols AND
no subprotocol, four failures out of four.

<a id="webkit-tell"></a>

## moq.mjs, moqSupport, webkit field

Reported so a device can SETTLE this. The library emits the same
"WebTransport not supported" message whether the API is absent OR merely
UA-blocked, so the error string alone cannot tell them apart — which is
how I came to assert iOS lacked it without ever checking.

<a id="web-transport-for"></a>

## moq.mjs, webTransportFor

A WebTransport we built ourselves, for browsers the library blocklists.

OFF unless explicitly forced. Returns undefined otherwise, so the library
decides — which is what should happen, both because the block is well-founded
and because the library also handles the http:// certificate-fingerprint path
we do not. When forced, only WebKit-with-WebTransport takes this route:
ManagedMediaSource is the WebKit tell (Chrome lacks it), and Cloudflare
negotiates none of the ALPNs above anyway, falling back to the compat
CLIENT_SETUP — byte-identical to Chrome, just past the UA check.

<a id="pattern"></a>

## moq.mjs, pattern re-export

The pattern used to be drawn here, in a copy of rig/whep/publish.html's
loop. It now lives in ONE place — demo/shell/pattern.mjs — which also carries
the ffmpeg rendering of the same spec, so the geometry cannot drift between a
canvas publisher and an ffmpeg one. Re-exported because `moq` (and any future
reader) knows this module's name.

<a id="codec-preference"></a>

## moq.mjs, CODEC_PREFERENCE

WHICH CODEC, AND WHY IT IS NO LONGER `vp8`.

⚠️ VP8 IS NOT HARDWARE-DECODED ON QUEST 3 OR QUEST 3S. Meta's own codec table
says so in as many words, while listing AV1 as decoded there — so a headset
software-decodes every frame inside a 13.9 ms budget on a six-core part.
(developers.meta.com/horizon/documentation/web/browser-video/)

The old `'vp8'` was not a careless choice: it came out of a correct
measurement — Safari's WebCodecs does VP8 720p at 370 fps, which settled that
the encoder was not the bottleneck. But that was measured on a LAPTOP, and a
codec picked for one device's encoder is a claim about every device's
decoder. This project's own rule: being right about a mechanism says nothing
about whether it dominates somewhere else.

So the publisher PROBES rather than declares, in preference order, and says
which one it got. The subscriber already read the codec out of the catalog —
that end needed no change.

⚠️ The MoQ numbers already in HANDOFF (p50 20 ms, 4K30 at zero drops) were
taken on VP8. Pass `codec: 'vp8'` to reproduce them; a run that changes the
codec and compares against them is comparing two different things.

<a id="pick-codec"></a>

## moq.mjs, pickCodec

The first candidate this browser will actually encode.

Asks `isConfigSupported` rather than guessing from a user agent — an error
string cannot tell "codec absent" from "codec refused at this size", and
neither can a UA.

<a id="start-moq-params"></a>

## moq.mjs, startMoq parameters and MOQ_KEEP

Start a MoQ leg.

@param out    canvas decoded frames are drawn into
@param ns     namespace on the relay. Unique per run: two publishers on one
             namespace and the second one dies (§6.4).
@param role   'loopback' (publish AND subscribe — one device, one clock, so
             the latency delta is exact), 'pub', or 'watch'.
@param paint  optional (ctx, w, h, frame) that draws the whole frame in place
             of the pattern, clock row included. Added 2026-09-30.
@param hue    0..359 for the burned pattern. Defaults to a hash of the
             namespace, so two publishers on two devices come out different
             colours without anyone allocating them.
The newest latency samples kept for `pct()`; a long run would otherwise grow
and re-sort without limit.

<a id="decoder-description"></a>

## moq.mjs, startMoq, decoder description

⚠️ CARRY THE DECODER DESCRIPTION WHEN THERE IS ONE. VP8 needs none, so
this was never missed; AV1 and H.264 hand their parameter sets out
here, exactly once, on the first chunk. Without it the far end
configures a decoder that cannot parse the stream — and the symptom
is decode errors on a publisher that looks perfectly healthy.

<a id="match-source"></a>

## moq.mjs, startMoq, match the source size

MATCH THE SOURCE, do not force it into ours. `drawImage(vf,0,0,w,h)`
scaled every frame into the local 1280x720 whatever the publisher
actually sent — which distorts a picture of any other shape, and is
worse than cosmetic here: `readBurned` samples FIXED coordinates, so
a scaled row is read at the wrong pixels. A remote publisher's size
is its own business; the receiver's job is to show it as it is.

<a id="test-header"></a>

## moq-test.mjs, file header

demo/shell/moq-test.mjs: startMoq's stop and moq-audio's bounded stats, with
no relay and no browser.

  node demo/shell/moq-test.mjs

The vendored @moq client is replaced by a fake whose catalog never arrives,
through a module hook, so what is graded is the wait, not the relay.
THREE OF THE 4 ARE NEGATIVE CONTROLS, written so the bug they name fails them.
Frames, codecs and latency are graded on /video/moq/ against the real relay.
