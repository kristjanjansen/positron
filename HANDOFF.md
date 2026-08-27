# Handoff — 2026-08-28 (end of session 6)

Read order for a fresh session: this file → `SUMMARY.md` → `PROGRESS.md`
(sessions 6a–6r, newest first) → the plan you're touching.

## The one-line state

The timeline library exists, is measured, and has **five real clients**; the
open work is (a) finishing three in-flight builds, (b) the continuous-kind
seams the paths client exposed, (c) the nested-span primitive, (d) the DoD-A
verdict.

## In flight when the session ended (agents may not have reported)

| build | dir / port | what to check on resume |
|---|---|---|
| **DoD-A**: replay.html onto the lib | `proto/replay`, :8885 | **the gate verdict** vs 59/71 (content) and 77/95 ms (native) |
| CC automation + slider-video revival | `proto/automation`, :8888 | 14-bit CC + pitch-bend round-trip; seek restores controller map |
| Text performer (`beforeinput` semantic ops) | `proto/text`, :8889 | C2 on real text; selection restored on seek |
| Continuous kinds first-class (`sampleAt`/`bracket`/`info.next`/caps read/logdeck fix) | `timeline/`, `proto/paths` :8887 | paths must hold 0.042 px seek + 0.036 px deviation **with its workarounds DELETED** |

LANDED since the first handoff: **nested spans** (`timeline/nested.mjs`,
16/16, transport.mjs unchanged — composition is just another kind; a degraded
child cannot master; parent seek lands exact inside a nested session) and
**proto/paths** (first continuous client; the six-seam report that drove the
in-flight continuous-kinds work).

Each was briefed to checkpoint its own NOTES.md — read those first; they
survive even if the agent's report was lost.

## Library: what's true and what's missing

**True (measured):** vector + lookahead; worker tick default (8.5 ms hidden vs
main's 981 ms); audio lane sample-accurate (10 µs) and survives main-thread
stalls; `registerAdapter` + `createDeck`/`makeLogDeck`; reduce gets the
complete ordered prefix; `transport.sync()` for external clock masters;
non-destructive drift reads; C2 property gate runnable
(`node timeline/lab/prop-test.mjs`). Fan-out graveyard fails 6/7 asserts as a
permanent fixture.

**Missing — the continuous-kind seams (from proto/paths, highest value):**
1. `interpolate` is never called by the library; caps are read only for
   `catchUp`/`audio`/`assertOnSeek` — so C3's honest degradation cannot happen.
2. No adapter hook between fires (98.8 % of pointer motion was client code).
   Fix: drive `caps.continuous` adapters off the deck's position observable.
3. No `sched.bracket(kind, pos)`; `reduceAt` rescans from 0 (would reproduce
   demo10's per-frame-recompute defect inside the library).
4. `reduce()` gets `prefix ≤ pos` so the successor is absent — an interpolated
   reduce is not expressible. Fix: `info.next` (two lines).
5. `interpolate(a,b,u)` under-specified for C¹ — add neighbourhood.
6. **BUG**: `logdeck` `payload:{i, at, ...p.payload}` lets a row's epoch-µs
   `at` clobber the injected position-domain `at`. Fix: inject last.

**Also missing (plan-timeline, not yet built anywhere):** derived lanes with
`source: reconstructor-*` + method/confidence/tier + refs, and the
`attested | restored(tier ≤ n) | all` evidence policy on reduce/window.

## Clients (each adoption found a latent bug — the pattern held 3/3)

- `proto/jam` — hand-rolled path was firing **−101 ms** (unmeasured).
- `proto/selfrec/replay-grid` — forward seek **fired every skipped cue** (3 cues,
  45/25/5 s late) — the exact assert the graveyard arm fails, shipped.
- `proto/instrument` — stored replay started audio **+1075 ms early**; the test
  was blind to it (`advanced > 0` passes for a one-second-early track).
- `proto/remixer` — chord start spread 0–43 ms → **0.1 ms**; one seek moves all.
- `proto/paths` — first continuous kind; seek 0.042 px vs 38 px hold.

## Deployed (all workers.dev, $0-scale)

`elektron-rtc` (rooms/cues) · `elektron-selfrec` · `elektron-jam` ·
`elektron-instrument` (v6473040f — EU-pinned Sessions DO + R2 audio/AV,
capability tokens, 54/54). Kept R2 proof data under `instrument/` and
`selfrec/` in `elektron-archive-test`.

## Open, needing the user

1. Secret rotations — `SECRETS-ROTATION.md` (untracked, deliberately).
2. `elektron.studio` — drop-caught, for sale via the Afternic lander; expiry
   2027-02-08.
3. iPhone capture probe before phones join a grid (MediaRecorder crash
   durability is the unknown).
4. macOS IAC MIDI bus toggle → the one unmeasured cell (Web MIDI send precision).
5. Usage credits — an agent died of exhaustion mid-run once today.

## Traps that cost hours (do not re-derive)

DO keeps running OLD class code after deploy (~1 min) — a smoke test straight
after `wrangler deploy` lies. · CORS allow-headers must carry `X-Chunk-Sha256`
when copying the upload pipeline. · Backstop ordering is correctness (once
anything parks, everything parks). · CDP `packetLoss` is a no-op in Chrome 151
(use netem). · `--use-fake-ui-for-media-devices` insufficient under
headless=new (needs CDP `Browser.grantPermissions`). · Chrome hands an
AudioWorklet an EMPTY input array when it latches a bus silent (fix: started
`ConstantSourceNode(offset 0)`). · One MoQ group = one QUIC uni-stream. ·
`-bf 0` mandatory for repackaged MediaRecorder streams. · Docker-esbuild is
GONE: `cd proto/jam/moq && npm run build` (esbuild-wasm, 1.1 s).
