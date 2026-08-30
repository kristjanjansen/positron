# Handoff — 2026-08-30 (end of session 6)

Read order for a fresh session: this file → `SUMMARY.md` → `PROGRESS.md`
(newest first) → the plan you're touching. `plan-timeline.md` §7–§8 is the
current state of the library and OVERRIDES §§1–6 where they disagree.

## One line

The timeline library is built, measured, and has **thirteen clients**; the
studio runs a complete show; the archive viewers are live on the public web.
**Nothing has ever been used by a human.**

## Nothing is in flight. Everything below is committed and green.

## What exists

**`timeline/`** — `transport.mjs` v0.6 (vector + lookahead, worker tick default,
sample-accurate audio lane, adapter registry with caps the library READS,
evidence firewall + provenance, `when` uncertainty, `caps.series`, two-phase
seek) · `nested.mjs` (nested decks, fragment quotation, loops) · `score.mjs`
(a quotation is a VALUE; scores round-trip byte-identically; marks survive a
re-cut) · `strip.mjs` (the component, lanes are deck queries, tick LOD over ten
orders of magnitude, touch) · `store.mjs` (memory/JSONL/DO; 1M rows in 3.8 MB;
fire-late miss policy) · `render.mjs` (deterministic offline render,
60–86k× real time) · `media-master.mjs` · `osc.mjs` · `keepalive.mjs` · `lab/`
(prop-test, prop-nested, prop-store, prop-render — all green at 100 seeds).

**`studio/`** — `node studio/engine.mjs` + one URL runs a complete show.
GO LIVE 3.0 s · stop→replay-link 20.9 s · cue drift p50 1.1 ms · per-cue replay
abs p95 39 ms vs a 150 ms target.

**Deployed**: `elektron-view` (the four archive viewers, public, DO-gated ERR
proxy) · `elektron-rtc` · `elektron-selfrec` · `elektron-jam` ·
`elektron-instrument` (EU-pinned) · `elektron-osc`.
**Public link**: https://elektron-view.kristjan-jansen.workers.dev

**Protos**: megatimeline · remixer (+compose) · kurenniemi · flipper · jam
(+interval) · instrument (+host-check) · automation · paths · text · loops ·
osc · selfrec · replay · archive · m2m.

## The four hard numbers worth remembering

- Cue sync **16 ms p50** on the library (was 59 — and that 59 was ONE LOCKED
  PHASE SAMPLE, not a distribution: real old margin ~11 %, presented as 60 %).
- Remote instrument **35.8 ms** key→ear over MoQ vs 77.7 ms over WebRTC, where
  the jitter buffer is 98.6 % of the loop and cannot be hinted away.
- Loop wraps are the **most** precise instant in a loop (wrap-adjacent lateness
  p50 0.10 ms vs 4.50 ms elsewhere; 0.000 ms/wrap accumulation over 600 wraps).
- MoQ **group-per-bundle = 100 % OSC bundle integrity**; message-per-group = 0 %
  — and the sparse arm showed 0 % message loss with 9.2 % integrity, which any
  message-counting metric would have called lossless.

## Next, in order

1. **Run a real show.** Everything measured is synthetic — canvas sources, fake
   devices, headless Chrome, burned clocks. Twenty minutes with a real camera,
   real cues and one other person watching would teach more than any module.
2. **Close the read-side-only evidence firewall** — nothing stops a derived lane
   from FIRING under `attested`; an evidence-only *performance* is currently the
   adapter's job. Wants `fire()` gating or `caps.evidenceGated`.
3. **The renderer gap** — the transport can say what it does not know; the strip
   still cannot show it. Ambiguation (settled by a controlled study) is unbuilt;
   the megatimeline aggregate is still a miscomputed `+1`-per-item sum.
4. Studio v1: ROOM/SOUND panels, grid-archive wiring, and the unexplained
   **−45 ms** native anchor (vs the archive rig's −15 ms, reproduced with a
   negative control, systematic, unexplained).
5. Deep time in the strip; `deck.assertState`; `renderDeck` seeing a nest.

## Yours alone

Rotate the leaked secrets (`SECRETS-ROTATION.md`) · `elektron.studio` is
drop-caught and for sale via the Afternic lander (expiry 2027-02-08) · an
iPhone capture probe before phones join a grid · the macOS **IAC MIDI toggle**
(the one unmeasured cell: Web MIDI send precision) · ask ERR about the **Finna
CDN edge rule** (not policy — it blocks three Kurenniemi sources) · and the ERR
licence conversation, which gates anything public.

## Traps that cost hours (do not re-derive)

A DO runs OLD class code after deploy (~1 min) — a smoke test straight after
`wrangler deploy` lies · CORS allow-headers must carry `X-Chunk-Sha256` when
copying the upload pipeline · backstop ordering is correctness (once anything
parks, everything parks) · CDP `packetLoss` is a no-op in Chrome 151 (use
netem) · `--use-fake-ui-for-media-devices` is insufficient under headless=new
(needs `Browser.grantPermissions`) · Chrome hands an AudioWorklet an EMPTY input
array when it latches a bus silent (fix: a started `ConstantSourceNode(0)`) ·
**iOS refuses to autoplay an UNMUTED video** (this is why flipper's featured
tile rendered black) · one MoQ group = one QUIC uni-stream · `-bf 0` for
repackaged MediaRecorder streams · a codec is not testable against itself (our
OSC padding bug round-tripped perfectly and died on the first real packet) ·
Docker-esbuild is GONE (`cd proto/jam/moq && npm run build`, 1.1 s).
