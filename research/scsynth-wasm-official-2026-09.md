# SuperCollider's own scsynth.wasm — how big a definition it takes (2026-09-13)

**The official WebAssembly backend has no 64 KiB ceiling and nothing like one.
Measured today with the same generator that found SuperSonic's 65,520: this
engine takes a definition of 860,000 bytes and loses the engine at 880,000 —
13.1 times as much — and what gives way is not scsynth's OSC path but the fixed
16 MB wasm heap the module is built with. Every Pappus rung loads with room to
spare: BARE 43,551, TINY 64,733, LITE 74,733 and FULL 121,425 all answer
`/done /d_recv`, and FULL — the rung the ladder exists to avoid — sits at 14% of
the ceiling. So the sentence TINY rests on, "wasm scsynth refuses a `/d_recv`
over 64 KiB", is false about wasm scsynth and true only about SuperSonic.
🔴 But the failure here is worse, not better: over the line there is no `/fail`,
no reply and no throw at the call site — there is one console line from a worker
thread, `Aborted(OOM)`, after which the engine is dead and never answers again.
SuperSonic's silence at least leaves a server running. 🔴 And the headline
number is not a byte count at all: 880,000 bytes of CONSTANTS load in the same
engine that dies on 880,000 bytes of UGens, and a 2,886-byte definition is
refused outright when 65 of its oscillators have to be alive at once.**

**RECOMMENDATION, in priority order:**

1. 🔴 **Fix the comment in `rig/board/norns/Engine_Pappus.sc`, not the cut.** Keep
   TINY — the engine this repo actually vendors and ships is SuperSonic, its
   65,520-byte edge is real, and TINY at 64,733 fits it with 755 bytes to spare
   while LITE at 74,733 does not. What is wrong is the reason written down:
   "wasm scsynth refuses a `/d_recv` over 64 KiB" is a claim about SuperCollider
   that will outlive the vendored engine it is actually about. Name SuperSonic
   (§8).
2. **Do not vendor this binary.** It is one person's laptop build, hosted beside
   a demo page, dated the day the pull request opened, and its JavaScript surface
   does not match what is in `develop` today (§1). It is evidence about the
   upstream approach, not a dependency.
3. **If a browser engine is ever swapped, swap for the room, not for the API.**
   This backend needs cross-origin isolation (COOP/COEP) where SuperSonic needs
   nothing, its glue class refuses a 121 KB definition that the engine itself
   takes (§13), and it dies rather than declines. The 13× is real; so is the
   bill.
4. **Quote the limit as three numbers, never one.** Bytes, UGens in a row, and
   UGens alive at once give 860,000 / 24,570 / 64 in the same engine (§10). A
   single "it takes 860 KB" is wrong for any graph that is not mostly
   oscillators.
5. **If anyone uses this backend, do not use its `OscMessage` class.** ✅ It
   throws on an 8,192-byte definition the engine loads without noticing (§13).
   Frame `/d_recv` by hand — `demo/shell/synthdef.mjs` already writes the bytes,
   and the OSC framing is sixteen lines.

---

## 0 · Marks used in this file

- ✅ **MEASURED** — run today in headless Chrome on this machine, with the
  harness described beside the number.
- 📄 **READ** — taken from source, a header or a hosted file. Not confirmed by
  running.
- ⚠️ **UNMEASURED** — could not be checked here, and why.
- 🔴 **LOAD-BEARING** — a decision already taken rests on it.

Every number below carries one.

---

## 1 · What was actually measured, and it is one person's demo host

⚠️ **This is not "the official build" in any sense a version number would
recognise, and the report has to start there.** The binary is the one the wasm
PR's author hosts beside his demo page:

| | |
|---|---|
| `https://supercollider.dennis-scheiba.com/scsynth.wasm` | ✅ 1,496,154 B, `sha256 8b4099c57e6e2d32a2aaafe649d19810a0fcca517a416258f19c6ba19c223c54` |
| `…/scsynth.js` | ✅ 135,104 B |
| `…/init.js` | ✅ 6,979 B — the demo page's own glue |
| ✅ `Last-Modified`, all four files | **Sat, 21 Mar 2026 13:55 GMT** |
| 📄 PR #7428 opened | **2026-03-21** |
| 📄 PR #7428 merged to `develop` | **2026-06-06** |
| 📄 latest tagged SuperCollider | **3.14.1, 2025-11-24** — before the merge |

✅ So the hosted files were uploaded **on the day the pull request was opened**,
two and a half months before it was merged, and no tagged release contains any
of it. ✅ The `.wasm`'s own string table carries its author's paths —
`/Users/scheiba/github/supercollider`, `/Users/scheiba/github/emsdk/...` — so it
is a laptop build, not a CI artefact.

🔴 **And it is not the code that is in `develop` today.** Fetched
`server/scsynth/SC_WebAudio.cpp` from `develop` and compared it against what the
hosted module actually exports:

| the hosted build has | `develop` today |
|---|---|
| `_scsynthSendOsc(ptr, len)` as a C export | an embind `sendOsc(val)` |
| two heap RING BUFFERS for replies and stdout, polled by a 20 ms `setInterval` | replies pushed by `MAIN_THREAD_ASYNC_EM_ASM`, stdout pulled by `nextLine()` |
| `OscMessage` and `parseOscMessage` embind classes | ✅ neither name appears anywhere in the file |
| no `scsynthIsReady` | ✅ `scsynthIsReady` is there |

✅ Each of those was checked by grepping the fetched source and the shipped
`.wasm`'s strings.

**What that means for every number below: they describe a March snapshot of the
official port, hosted by its author. They are evidence about the upstream
approach, not about a commit anyone can pin.** Re-measure before depending on
them.

📄 One thing does carry across unchanged, and it is the thing this was sent to
check: `develop`'s `SC_WebAudio.cpp::sendOsc` is

```cpp
auto rawBuffer = static_cast<char*>(malloc(size * sizeof(char)));
memcpy(rawBuffer, data, size);
```

— no size check, and (worth filing) **no null check on that `malloc` either**.
The JS wrapper above it has the same hole: `const ptr = Module._malloc(n); new
Uint8Array(Module.scHeap).set(bytes, ptr)` writes the whole message over address
zero if the allocation failed. The probe below never takes that path; it asks
for the room first and reports a refusal instead (§3).

---

## 2 · Does it boot, and does it make a sound? ✅ Yes, and silence reads zero

Headless Chrome 152, `--headless=new --autoplay-policy=no-user-gesture-required
--mute-audio --disable-gpu`, a local static server serving only the three fetched
files plus this repo's `demo/shell/synthdef.mjs`, a fresh profile per run.

📄 **It needs cross-origin isolation and there is no way around it.** The module
creates its memory as `new WebAssembly.Memory({initial: 16777216/65536, maximum:
the same, shared: true})` — a SharedArrayBuffer, so COOP `same-origin` + COEP
`require-corp` or it does not start. SuperSonic's default `postMessage`
transport needs neither (`research/supercollider-browser-2026-09.md` §3.1), so
this is a real deployment difference, and §3.2 there already priced it: a
`_headers` rule on one path is the lever, because isolating everything would
break the native-HLS demos.

✅ Measured, and every run below repeated it:

| | |
|---|---|
| `crossOriginIsolated` | **true** |
| `SharedArrayBuffer` | **present**, and the wasm heap is one |
| heap size | **16,777,216 B, FIXED** — `maximum` equals `initial`, so it can never grow |
| boot → first `/status.reply` | **621–722 ms** |
| `AudioContext` | **running**, 48,000 Hz |
| everything scsynth printed at boot | one line: `SC_AudioDriver: sample rate = 48000.000000, driver's block size = 128` |
| a 184-byte definition | ✅ `/done /d_recv` |
| 🔴 **silence** | ✅ **0.000000** |
| the same definition playing | ✅ **0.070902 RMS** |

🔴 **The deafness control is the point of that table.** SuperSonic's equivalent
run read **0.070715** against the same silence — the same generator, the same
`SinOsc × amp`, two different engines, two numbers agreeing to four decimals. A
harness that could not hear would have printed the same "it loaded" for every
rung below.

⚠️ **There is no `scsynthIsReady` in this build**, though `develop` has one.
Polling for it measures the poll: the first attempt reported a 16,083 ms boot,
which is 300 × 50 ms of waiting for a function that does not exist. Boot is
timed to the first `/status.reply` instead.

---

## 3 · The instrument, and the two changes it needed

Definitions come from **this repo's own `demo/shell/synthdef.mjs`**, the writer
that measured SuperSonic (`research/synthdef-size-limit-2026-09.md` §2.0),
driven by the same generator: coarse rungs from a chain of `SinOsc` blocks
(35 B each), fine rungs from spare constants (4 B), the last 0–3 bytes from the
definition's own name (1 B a character). Every rung is checked to the exact byte
before it is sent and re-parsed by `readSynthDef`, which throws unless it
consumes the file to the last byte. ✅ Measured generator constants: base 133,
block 35, constant 4, name character 1.

The OSC message is framed **by hand in the page**, not with this build's
`OscMessage` class, because a cap in the glue and a cap in the engine read
identically from outside. §13 sends the same bytes both ways in one engine, and
they do not agree.

🔴 **ONE ENGINE PER RUNG, AND THAT IS NOT TIDINESS.** Over the line this build
does not refuse — it stops. A ladder that keeps sending into the same page after
the first refusal measures the first refusal over and over, and every later rung
reads as a ceiling it had nothing to do with. Each rung below gets its own
Chrome, its own engine and its own deafness control.

🔴 **Every line leaves the page the moment it is made**, by `sendBeacon` to the
harness's own `/log`. The failure being measured is one where the page may stop
answering, so a log read at the end would lose exactly the run that matters.
Same rule as CLAUDE.md's beacon for XR session entry, for the same reason.

⚠️ **And a second generator, because the first cannot see its own confound.** A
chain of `SinOsc` blocks makes a definition bigger by giving it MORE UGENS —
860,000 bytes is 24,570 of them — so an edge found with it could be a byte edge
or a UGen edge and the ladder cannot tell. The control grows the file with
CONSTANTS instead: 3 UGens, any size you like. §6 is what the two say to each
other.

---

## 4 · The edge ✅

Boot options are the defaults the build's own `boot()` declares —
`numInputs 0`, `numOutputs 2`, `realTimeMemorySize 8192` KB, `bufLength 64`,
`maxWireBufs 64`, `numBuffers 1024`, `maxNodes 1024`, `maxGraphDefs 1024`.

| definition | OSC message | result |
|---|---|---|
| 2,000 · 8,000 · 16,384 · 32,768 · 52,730 | | ✅ `/done /d_recv` |
| 64,733 · 65,000 · 65,500 | | ✅ `/done /d_recv` |
| **65,520** — SuperSonic's largest | 65,536 | ✅ `/done /d_recv` |
| **65,521** — SuperSonic's smallest refusal | 65,540 | ✅ `/done /d_recv` |
| 65,536 · **68,892** · 73,297 · 74,733 | | ✅ `/done /d_recv` |
| 100,000 · **121,425** · 200,000 · 400,000 | | ✅ `/done /d_recv` |
| 500,000 · 600,000 · 700,000 · 800,000 · 840,000 | | ✅ `/done /d_recv` |
| **860,000** (24,570 UGens) | **860,016** | ✅ **LOADED — the largest that does** |
| **880,000** (25,141 UGens) | **880,016** | ❌ **the engine dies; §7** |
| 900,000 · 1,000,000 · 1,500,000 · 2,000,000 · 3,000,000 | | ❌ same |

✅ **Confirmed three times each, alternating, one fresh engine per rung** —
860,000 loaded, 880,000 died, 860,000 loaded, 880,000 died, 860,000 loaded,
880,000 died. Every one of those six engines passed its own deafness control
first. ✅ And re-run **once more with every other Chrome on this machine
killed**, because CLAUDE.md's rule about competing with yourself applies:
860,000 loaded, 880,000 died, on an otherwise idle machine.

✅ A second, independent delivery counter agrees with `/done`: `/status`'s
`numSynthDefs` goes **1 → 2** on a rung that loads and **does not move** on one
that does not. (This is the counter SuperSonic gets wrong — there,
`loadedSynthDefs` counted 1 → 2 → 3 across three sends of which one loaded.)

🔴 **860,000 against SuperSonic's 65,520 is 13.1 times.** And 68,892 — the number
`Engine_Pappus.sc` records as the smallest that gets no reply — loads here in
157 ms.

---

## 5 · 🔴 The two rungs the whole question is about ✅ BOTH LOAD

`rig/board/norns/Engine_Pappus.sc` line 22 cuts a compile-time rung out of a real
instrument because "wasm scsynth refuses a `/d_recv` over 64 KiB SILENTLY …
and LITE compiles to 73,297 — 11.8% over". Here are all four rungs' weights,
sent as definitions of exactly those sizes, one fresh engine each:

| rung | bytes | `/d_recv` | `/s_new` | share of this engine's ceiling |
|---|---|---|---|---|
| BARE | 43,551 | ✅ `/done` | ✅ started, 1,243 UGens running | 5.1% |
| **TINY** | **64,733** | ✅ `/done` | ✅ started, 1,848 UGens | **7.5%** |
| **LITE** | **74,733** | ✅ `/done` | ✅ started, 2,134 UGens | **8.7%** |
| **FULL** | **121,425** | ✅ `/done` | ✅ started, 3,468 UGens | **14.1%** |

✅ And the same four sizes again with the **constants** generator, which makes a
three-UGen graph of any weight — so these are definitions that both load and are
audible instruments:

| rung | bytes | constants | `/s_new` |
|---|---|---|---|
| BARE | 43,551 | 10,855 | ✅ 1 synth, **RMS 0.355195** |
| TINY | 64,733 | 16,151 | ✅ 1 synth, **RMS 0.355195** |
| LITE | 74,733 | 18,651 | ✅ 1 synth, **RMS 0.355195** |
| FULL | 121,425 | 30,324 | ✅ 1 synth, **RMS 0.355195** |

against a silence control of **0.000000** in every one of those eight engines.

⚠️ **The chain rungs read `RMS 0` and that is not a failure — it is the
generator.** A `SinOsc` whose frequency input is the previous `SinOsc`'s output
settles at a frequency of zero within a few stages, and `SinOsc` at 0 Hz with
phase 0 is exactly 0.0 by construction. What the chain proves is that the graph
was BUILT and is RUNNING; `/status` reports the UGens and one synth. What proves
sound is the constants column and the 184-byte control. A test whose subject is
silent by construction cannot answer a question about sound, and it took reading
the numbers twice to notice.

⚠️ These are definitions of the same SIZE as the Pappus rungs, not the Pappus
graph — `pappus.scsyndef` has still never been compiled (§14). The sizes are
`rig/board/norns/TINY.md`'s own weighing table.

---

## 6 · 🔴 The ceiling is not about bytes ✅

📄 The code reading that prompted this was right: nothing in `sendOsc`, in the JS
wrapper, or in `RecvSynthDefCmd` counts to 65,536. What gives way is the
module's memory — 16 MB, fixed, `maximum == initial`, every attempt to grow it
landing in `abortOnCannotGrowMemory`, which is a one-way door.

✅ And the two generators disagree about where the edge is, which is how you know
the edge is not a byte count. Same engine, same options, same framing; the only
difference is what the bytes ARE:

| definition | SinOsc-chain generator | constants generator |
|---|---|---|
| 400,000 B | ✅ loads (11,427 UGens) | ✅ loads (99,967 constants, 3 UGens) |
| 800,000 B | ✅ loads (22,856 UGens) | ✅ loads (199,967 constants) |
| **860,000 B** | ✅ **loads (24,570 UGens)** | ✅ loads (214,967 constants) |
| **880,000 B** | ❌ **dies** | ✅ **loads (219,967 constants)** |
| 1,000,000 B | ❌ dies | ✅ **loads (249,967 constants)** |
| 1,500,000 B | ❌ dies | ❌ dies |

🔴 **880,000 bytes of constants load and 880,000 bytes of UGens do not.** So the
engine has no byte ceiling; it has a memory budget, and a UGen costs far more of
it than the 35 bytes it occupies in the file. A one-line summary that says "it
takes 860 KB" is a fact about a graph made almost entirely of oscillators, and
it is wrong by 140 KB for a graph made of numbers. ⚠️ This is CLAUDE.md's
"measure the quantity in question, not one adjacent to it", and without the
second generator this report would have quoted a UGen limit as a size limit.

---

## 7 · 🔴 Is the failure loud? Three channels say yes, three say nothing, and the engine does not come back ✅

Measured with a **heartbeat** — a `setInterval` shipping one line to the server
every half second from before the send until long afterwards — because the
question is whether the page can still speak, and a log read at the end cannot
tell a quiet page from a stopped one.

Sending **880,000 bytes**, one rung over the line:

| channel | what it reported |
|---|---|
| `/fail` | ✅ nothing |
| any OSC reply at all | ✅ nothing — the reply count never moves again |
| scsynth's own stdout | ✅ nothing — still the one boot line |
| the call site (`_scsynthSendOsc`) | ✅ **returned normally**, no throw |
| ✅ **the browser console** | **`Uncaught RuntimeError: Aborted(OOM). Build with -sASSERTIONS for more info.`**, `source: worker` |
| ✅ **the page's `window.onerror`** | **fires** — an `ErrorEvent` relayed by emscripten's own `worker.onerror`, then one second later a bare string exception, `"unwind"` |
| ✅ the engine afterwards | **dead.** `/status` never answers again |
| ✅ the page's main thread | **alive** — the heartbeat kept ticking for 80 more seconds |
| ✅ the page's own module code | **stopped**, killed by that `unwind` |

✅ And the control, the same probe at **860,000 bytes**: `/status` answers every
second for twenty seconds, `numSynthDefs` goes 1 → 2, the error list stays
empty, stdout stays at the one boot line, and the heartbeat records 43 beats
with zero errors.

🔴 **So this is not SuperSonic's silence — it is louder and worse.** SuperSonic
drops the message inside the engine, says nothing on any channel, and **keeps
serving**: a small definition sent immediately afterwards still loads and plays
(`research/synthdef-size-limit-2026-09.md` §4). Here an application that has
installed a `window.onerror` handler WILL see something, which is a real
improvement — but the server it was talking to is gone, and the only way back is
a new page.

⚠️ **Both are wrong in the same way, and it is worth naming: `/d_recv` has no
failure path at all.** 📄 `RecvSynthDefCmd::Stage2` has no `SendFailure` where
`LoadSynthDefCmd::Stage2` does. Neither engine can answer `/fail /d_recv`,
because nobody ever wrote the line.

---

## 8 · 🔴 What this means for TINY — the flat verdict

`Engine_Pappus.sc` line 22 and `rig/board/norns/TINY.md` both rest on one
sentence:

> wasm scsynth refuses a `/d_recv` over 64 KiB, silently (measured: 52,730 B
> loads, 68,892 B gets no reply at all)

✅ **That sentence is false about wasm scsynth and true about SuperSonic.** On
SuperCollider's own WebAssembly backend 68,892 loads in 157 ms, FULL at 121,425
loads, and the edge is 860,000.

**TINY was not cut for nothing, and saying so would be the wrong report.** The
engine this repo vendors and ships is SuperSonic (`demo/patch/vendor/`); its
65,520-byte edge was measured three times either side; TINY at 64,733 fits it
with 755 bytes to spare and LITE at 74,733 does not. The cut is real, the
constraint it answers is real, and on the code deployed today it still binds.

What has to change is the **reason written in the file**, because as written it
will outlive the engine it is about:

| the claim | status |
|---|---|
| "wasm scsynth refuses a `/d_recv` over 64 KiB" | ✅ **false** — that is SuperSonic's number, not WebAssembly's and not SuperCollider's |
| "the browser engine we ship cannot take LITE" | ✅ **true**, and measured |
| "a browser cannot take LITE" | ✅ **false** — this one takes FULL with 7× to spare |

So: **keep TINY, and change its comment to name SuperSonic.** Record that the
constraint is a property of one vendored engine rather than of browsers. The
moment `/grains` or `/patch` swaps engines, the rung has nothing left to do, and
whoever does that swap should learn it from the comment instead of re-running
this measurement.

---

## 9 · The knob that looks like the knob is not the knob ✅

`boot()` takes `realTimeMemorySize`, and 8,192 KB of a 16 MB heap is half of it,
so the obvious move is to hand the pool less and get more room for a message.
**It does nothing, in either direction.**

| `realTimeMemorySize` | 860,000 B | 880,000 B | largest single `_malloc` |
|---|---|---|---|
| **1,024 KB** | ⚠️ not run | ❌ dies | ✅ 3,000,000 ok · 4,000,000 NULL |
| **8,192 KB** (default) | ✅ loads | ❌ dies | ✅ 3,000,000 ok · 4,000,000 NULL |
| **12,288 KB** | ✅ loads | ⚠️ not run | ⚠️ not run |
| **14,336 KB** | ⚠️ not run | ⚠️ not run | ✅ 3,000,000 ok · 4,000,000 NULL |

✅ Every engine booted and passed its own deafness control, so the option was
accepted; it simply does not change how much room a `/d_recv` has. ⚠️ Which also
means the real-time pool is not coming out of the same allocator the message
does, or is not being applied — not resolved here, and it does not need to be:
the operational fact is that **nothing reachable from `boot()` moves the
ceiling.**

⚠️ The `_malloc` bracket could not be narrowed. Asking the heap for a block it
cannot give is itself the one-way door — the very next allocation, of any size,
never returns. So "3,000,000 ok, 4,000,000 NULL" is as fine as this measurement
gets without a fresh engine per probe.

📄 The one knob that might move it is `INITIAL_MEMORY`: `scsynth.js` reads
`Module["INITIAL_MEMORY"] || 16777216` and derives `maximum` from the same
value, so `ScSynth({INITIAL_MEMORY: …})` may take. ⚠️ Untested — the wasm's own
import limits may refuse it. One line to close (§14).

---

## 10 · 🔴 The OTHER limit, and it refuses a 2,886-byte definition ✅

CLAUDE.md: `twins` measured scsynth refusing **1,151 UGens** at `numWireBufs`
64 and 128, and warns that a wire-buffer cliff must not be reported as a size
limit. The ladder in §4 **cannot see that cliff at all** — a chain of `SinOsc`
blocks uses one interconnect buffer and hands it straight back, so 3,471 of them
in a row ran on 64 buffers with nothing printed. A statistic that is constant by
construction over its subject is blind, and that one was.

So a second shape: **N oscillators alive at the same time**, all of them inputs
to one `Out`, which forces N buffers to be held simultaneously. Default boot,
`maxWireBufs 64`:

| voices | definition | `/d_recv` | `/s_new` |
|---|---|---|---|
| 8 | 435 B | ✅ loaded | ✅ 10 UGens, RMS 0.705391 |
| 32 | 1,467 B | ✅ loaded | ✅ 34 UGens, RMS 0.705391 |
| 60 | 2,671 B | ✅ loaded | ✅ 62 UGens, RMS 0.710995 |
| 63 | 2,800 B | ✅ loaded | ✅ 65 UGens, RMS 0.705391 |
| **64** | **2,843 B** | ✅ **loaded** | ✅ **66 UGens, RMS 0.705189** |
| **65** | **2,886 B** | ❌ **no `/done`** | ❌ `*** ERROR: SynthDef ff not found` · `FAILURE IN SERVER /s_new SynthDef not found` |

🔴 **A 2,886-byte definition is refused by the same engine that takes 860,000.**
It bites at **`/d_recv`** rather than at `/s_new`, and it is silent the same way
— no `/done`, no `/fail`, and the first thing the server ever says is the
`/s_new` failure seconds later, which is precisely the diagnostic trap
`research/synthdef-size-limit-2026-09.md` §5 describes. ✅ `/status` stopped
answering afterwards, and the browser console carried `Uncaught 13463960` from a
worker — a C++ exception pointer, thrown on the non-real-time thread and never
caught.

✅ **AND THE GUARD WAS BROKEN ON PURPOSE.** The same ladder with `maxWireBufs`
set to **128** instead of 64:

| voices | `maxWireBufs 64` | `maxWireBufs 128` |
|---|---|---|
| 64 | ✅ loaded | ✅ loaded |
| **65** | ❌ **refused** | ✅ **loaded**, 67 UGens, RMS 0.705391 |
| 70 | — | ✅ loaded, 72 UGens |
| **128** | — | ✅ **loaded**, 130 UGens, RMS 0.704397 |
| **256** | — | ❌ **refused**, same silence |

The cliff moved from 64 to somewhere in (128, 256]. It is the interconnect-buffer
pool and nothing else. ⚠️ Note this is NOT the same as `twins`' finding, which
was 1,151 UGens refused at **both** 64 and 128 — a different graph shape asking a
different question; recorded so the two are not conflated.

**So "how big a definition fits" has three different answers depending on what
you vary, and only one of them is about bytes:**

| vary | what gives way | where |
|---|---|---|
| more bytes, same shape | the 16 MB wasm heap | **860,000 B** |
| more UGens in a row | the heap again, much sooner per byte | **24,570 UGens** |
| more UGens ALIVE AT ONCE | `maxWireBufs` | **64**, at **2,843 B** |

---

## 11 · `/d_load` exists here, and it fails properly ✅

SuperSonic has no `/d_load` at all: `sonic.send('/d_load', …)` throws
*"/d_load is not supported in Clockwork"*. This build has one, because
Emscripten gives it a virtual filesystem:

```
/d_load of a path that does not exist
  → /fail /d_load /not-a-real-path.scsyndef
  → printed: File '/not-a-real-path.scsyndef' could not be opened
```

✅ A `/fail` **and** a line of stdout naming the file. That is what a refusal
should look like, and it is the same `LoadSynthDefCmd` / `RecvSynthDefCmd`
asymmetry the earlier report found on native: one command calls `SendFailure`,
the other does not.

⚠️ Nothing was written to that filesystem here, so "can a definition be put on
MEMFS and `/d_load`ed" is untested. But the command is present and answers, so
this build is not structurally limited to `/d_recv` the way SuperSonic is.

---

## 12 · Side by side with everything else already measured

| | largest definition that loads | what it says when it will not |
|---|---|---|
| **official wasm, this build** | **860,000** (SinOsc chain) · ≥1,000,000 (constants) · **2,843 with 65 voices** · **~1,024 through its own `OscMessage` class** | console `Aborted(OOM)` from a worker, `window.onerror` fires, **engine dead** |
| SuperSonic 0.81.0 (vendored here) | 65,520 | ✅ nothing at all, on any channel; engine survives |
| native scsynth 3.14.1, `/d_recv` over UDP | 65,488 | `EMSGSIZE` at the sender |
| native scsynth 3.14.1, `/d_recv` over TCP | none found at 1,000,000 | — |
| native `/d_load` from disk | none found at 1,000,000, in 44 ms | `/fail /d_load` |
| anything sclang sends | 16,383, above which it silently becomes `/d_load` | nothing — and it does not need to |

📄 The earlier report's §1.5 recorded, as a code reading, that the official port
"has no cap at all: its `sendOsc` is `malloc(size); memcpy(…)`". ✅ That reading
is now a measurement, and the measurement adds the part reading could not give:
there IS a ceiling, it is thirteen times higher, it is the heap rather than a
constant, and it takes the engine with it.

---

## 13 · 🔴 The shipped glue refuses what the engine accepts ✅

`init.js` — the demo page every visitor of that host sees — sends a definition
like this:

```js
new scsynth.OscMessage().beginMessage("/d_recv").addBlob(byteArray).endMessage().getData()
```

✅ **It throws above a few kilobytes.** Both framings of the same rung, in the
same engine, one after the other:

| definition | `OscMessage().addBlob()` | framed by hand | engine |
|---|---|---|---|
| **1,024 B** | ✅ **LOADED** (65,536-byte wire? no — 1,040) | ✅ loaded | alive |
| **8,192 B** | ❌ **THREW** `13452560` | ✅ loaded | alive |
| 32,768 · 65,536 · 80,000 · 100,000 · 110,000 B | ❌ THREW | ✅ loaded | alive |
| **121,425 B** (FULL) | ❌ **THREW** `14119792` | ✅ **loaded** | alive |
| 200,000 B | ❌ THREW | ✅ loaded | alive |

The thrown values are embind exception pointers — heap addresses, not codes —
and they are raised before anything reaches the engine, which is why the engine
stays healthy and the hand-framed send of the identical bytes succeeds
immediately afterwards.

🔴 **So the class every visitor of that demo page uses cannot send a definition
larger than somewhere between 1,024 and 8,192 bytes, while the engine behind it
takes 860,000.** That is a 100× gap between the API and the thing it is an API
for, and the failure looks exactly like the engine's.

This is the reason §3 frames OSC by hand. Had the probe used the shipped class,
this report would have concluded that the official build refuses FULL — a true
observation about the wrong component, and the same shape as the 9,200-byte UDP
reading in `research/synthdef-size-limit-2026-09.md` §8.

---

## 14 · What is still unmeasured, and the cheapest way to close each

| open | why it is open | the check |
|---|---|---|
| ⚠️ The **merged** `develop` build | Everything here is a 2026-03-21 laptop build by the PR author, whose JS surface differs from `develop`'s (§1). | Build it, or find whether CI publishes the artefact. Nothing in this repo can do it — **this machine SIGKILLs locally compiled binaries**, which is why the whole measurement used a prebuilt `.wasm`. |
| ⚠️ The **real** Pappus definition | Sizes were reproduced with a generated graph; `pappus.scsyndef` has still never been compiled. | One line on the board: `SynthDef(\pappus).writeDefFile`, copy the file, send it. Also closes `research/supercollider-browser-2026-09.md` §2.3. |
| ⚠️ `INITIAL_MEMORY` as a knob | 📄 `scsynth.js` reads it from the module argument and derives `maximum` from it. The wasm's import limits may refuse. | Pass it, see whether the module instantiates, re-run §4. |
| ⚠️ Where exactly the `OscMessage` class's edge sits | §13 brackets it to [1,024 loads, 8,192 throws] and did not narrow further — the interesting part was the gap, not the number. | Bisect inside that bracket; five rungs. |
| ⚠️ Anything on a phone | Measured only in headless Chrome on this Mac. | `demo/verify-native.mjs` is the shape. The engine needs COOP/COEP, so a deployed path needs `_headers` on one route. |

---

## 15 · Four traps found on the way, worth keeping

**The measurer's own allocation is the first suspect, and here it was in the
SHIPPED code.** Both ways into this engine — the JS wrapper and the C++ beneath
it — `malloc` without checking the result and then write the whole message to
whatever came back. A failed allocation therefore writes a megabyte over address
zero. The probe never takes that path: it asks for the room first, reports a
refusal if it cannot have it, and stops. ⚠️ But asking is not free either —
**the first `malloc` the heap refuses is a one-way door**, and every allocation
after it, of any size, never returns. That is why §9's bracket is coarse and why
§4 uses one engine per rung.

**A wedge is not a refusal, and a ladder cannot tell the difference.** The first
run of this measurement sent rung after rung into one page; at 1,000,000 bytes
the page stopped and every later rung read as a refusal. One engine per rung
costs about five seconds each and removes the whole class of error.

**The lines that say where something stopped cannot ride on what stopped.** The
heartbeat in §7 is the only reason "the main thread is alive but the module is
dead" could be distinguished from "the page is wedged" — and the two look
identical over CDP, because a `Runtime.evaluate` into a page whose own code has
stopped just times out.

**`pgrep`/`grep` matching your own command line, again.** A queue script that
waited on `ps aux | grep -q "[s]weep.mjs"` never started, because the shell that
had just written the script still had the string in its own arguments. That is
LESSONS #39 and CLAUDE.md's `pgrep -f h264_v4l2m2m` in a third costume, and it
cost a run here. ⚠️ Related, and worth fixing in any harness copied from this
one: SIGKILLing a CDP driver leaves its Chrome behind. **Ninety orphaned
processes accumulated** before it was noticed, which is CLAUDE.md's "a second
browser of your own is a harness that reads broken" waiting to happen — so §4's
edge was re-run once with the machine otherwise empty, and it reproduced exactly.
