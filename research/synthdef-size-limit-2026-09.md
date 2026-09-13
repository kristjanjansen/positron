# The 64 KiB SynthDef ceiling — where it is, and what it actually binds (2026-09-13)

**There is no 64 KiB ceiling on a SynthDef. There is a ceiling on an OSC
MESSAGE, it belongs to one engine out of the four ways in, and 65,536 is not
its value.** Measured today with one generator and the same byte counts at both
ends: the browser's wasm scsynth takes a definition of **65,520 bytes and
refuses 65,521**, silently; a native scsynth 3.14.1 takes **65,488 over UDP**
(and says `EMSGSIZE` at the sender when it will not); a native scsynth over
**TCP took 1,000,000 bytes and asked for more**; and `/d_load` read a
1,000,000-byte definition off disk in **44 ms**. 🔴 **The repo's
`SIZE_CEILING = 64 * 1024` is therefore wrong in the dangerous direction — a
definition of exactly 65,536 bytes passes `fitsCeiling()` and then fails to
load with no reply at all**, which is the precise failure that constant was
added to prevent. And 🔴 **the board has never used `/d_recv` for Pappus and
cannot be made to**: `Engine_Pappus.sc` ends in `.add`, sclang's own `doSend`
switches to `/d_load` above **16,383 bytes** (measured: 16,240 goes on the wire,
16,415 goes to disk), and every Pappus rung — BARE 43,551, TINY 64,733, LITE
74,733, FULL 121,425 — is above that line. All four already load on the board.
The ceiling binds the browser and nothing else.

**RECOMMENDATION, in priority order:**

1. 🔴 **Change the constant, today.** `SIZE_CEILING = 64 * 1024` admits 16 bytes
   that do not load. Make the declared number a **message budget of 65,504
   bytes** and derive the definition ceiling from it — **65,488 bytes** for a
   bare `/d_recv` — so that adding a completion message some day cannot eat the
   margin without anyone noticing (§6.1). TINY at 64,733 still fits with **755
   bytes spare** instead of 803, so nothing has to be recompiled and no cut has
   to be revisited.
2. 🔴 **Stop saying the ceiling binds both ends; it binds one.** Keep TINY as the
   board's default if you want to, but on the honest ground — one graph in two
   places is a comparison, and the full graph on a Pi beside a cut-down one in a
   tab is two instruments — and **not** on the ground that the board could not
   load the bigger one. It can, and always could. `Engine_Pappus.sc`'s own
   comment predicted this outcome and said what to do about it; §6.2 is that
   paragraph rewritten with the measurement in it.
3. **Leave the browser path on `/d_recv`, because there is no other.**
   ✅ `/d_load` in the wasm engine throws *"/d_load is not supported in
   Clockwork"* — a loud, clear refusal, and the right one. The asymmetry is
   real: the board has a disk and the browser does not, so the browser is the
   end with a ceiling and will stay that way.
4. **File the silence upstream, with the repro in one line.** An OSC message
   over 65,536 bytes is dropped inside SuperSonic's wasm scsynth after crossing
   its transport intact, with no `/fail` and no reply (§4). The ring is 1 MiB,
   so nothing on our side can raise it.

---

## 0 · Marks used in this file

- ✅ **MEASURED** — run today, on this machine or on the studio Mac, with the
  harness described beside the number.
- 📄 **READ** — taken from source, a spec or a repo file. Not confirmed by
  running.
- ⚠️ **UNMEASURED** — could not be checked here, and why.
- 🔴 **LOAD-BEARING** — a decision already taken rests on it.

Every number below carries one. Nothing is a guess.

---

## 1 · Where the number comes from — four candidates, three ruled out

The brief listed five places a 64 KiB could live. Four of them can be settled by
reading, and the reading disagrees with the repo's one-sentence claim.

### 1.1 Not the format 📄✅

📄 The `.scsyndef` layout, from the SuperCollider source's own notes and
reproduced in `demo/shell/synthdef.mjs`: in **version 2** every count, index and
source is `int32`. Only `specialIndex` and the number of definitions in a file
are `int16`, and neither is a length. In **version 1** the counts are `int16`,
which caps a v1 file at 65,535 building blocks — **a UGen count, not a byte
count**, and this repo writes v2 only.

✅ Settled by running rather than by arguing about it: a generated definition of
**1,000,000 bytes with 28,570 building blocks** was accepted by a native scsynth
and answered `/done /d_recv` (§2.3). A format that could not describe a
definition over 64 KiB could not have done that.

### 1.2 Not `/d_recv` itself 📄

📄 `server/scsynth/SC_SequencedCommand.cpp:1325`, `RecvSynthDefCmd::Init`:

```cpp
mSize = msg.getbsize();
if (!mSize) throw kSCErr_WrongArgType;
mBuffer = (char*)World_Alloc(mWorld, mSize);
ReturnSCErrIfNil(mBuffer);
msg.getb(mBuffer, mSize);
```

Read the blob's declared size, allocate that much, copy. **There is no size
check anywhere in the command**, and none in `Stage2`, `Stage3` or `Stage4`
either. Whatever the ceiling is, `/d_recv` is not where it lives.

### 1.3 It IS the receive buffer, and it is one line 📄

📄 `server/scsynth/SC_ComPort.cpp` — line **154** on `develop`, line **150** on
tag `Version-3.14.1`:

```cpp
const int kTextBufSize = 65536;
…
class SC_UdpInPort {
    boost::array<char, kTextBufSize> recvBuffer;
```

That is the 64 KiB, and it is **the UDP port's buffer specifically**. 📄 The TCP
port beside it, in the same file, does the opposite — `handleLengthReceived`
reads a 32-bit length off the wire and then `malloc(OSCMsgLength)`, with no cap
of any kind. **The two transports are not the same engine as far as this
question is concerned**, which is the single fact the repo's one sentence was
missing.

⚠️ And on native, `kTextBufSize` **can never be reached**: an IPv4 datagram's
total length field is 16 bits, so a UDP payload cannot exceed
65,535 − 20 − 8 = **65,507 bytes**. The buffer is 29 bytes larger than the
largest datagram that can arrive in it. It is sized so as never to bind — which
is exactly why nobody has ever noticed it on a desktop.

### 1.4 sclang has its OWN, much smaller number, and nobody mentions it 📄✅

📄 `SCClassLibrary/Common/Audio/SynthDef.sc:648` — identical in 3.12.2, 3.13.0,
3.14.1 and `develop`:

```supercollider
doSend { |server, completionMsg|
    var bytes = this.asBytes;
    if (bytes.size < (65535 div: 4)) {
        server.sendMsg("/d_recv", bytes, completionMsg)
    } {
        … this.writeDefFile(synthDefDir);
          server.sendBundle(nil, ["/d_load", path, completionMsg], ["/sync", syncID]) …
    }
}
```

`65535 div: 4` is **16,383**. Every sclang path — `.add`, `.send`, `.load` —
goes through `doSend`, so **a real SuperCollider has not put a definition over
16 KiB on the wire in years.** It writes a file and sends `/d_load`.

✅ **Measured on the studio Mac, sclang 3.14.1**, with a bare UDP listener
standing in for a server so the answer came from the bytes rather than from the
source:

| definition | what went on the wire |
|---|---|
| 173 B | `/d_recv` |
| 7,140 B | `/d_recv` |
| 14,140 B | `/d_recv` |
| **16,240 B** | **`/d_recv` — the largest that does** |
| **16,415 B** | **`#bundle` of `/d_load` + `/sync` — the smallest that does not** |
| 16,590 · 16,940 · 21,140 · 70,141 B | `/d_load` + `/sync`, and a `.scsyndef` appeared on disk |

16,383 sits inside that bracket. 📄 And the switch is **silent by default** —
`classvar <>warnAboutLargeSynthDefs = false` at line 24 — ✅ confirmed, no
warning was printed for any of the five that switched.

### 1.5 So what is the wasm engine's 64 KiB? Not the transport. ✅

The obvious guess was SuperSonic's shared ring buffer, and it is wrong.

✅ Read out of the **running** engine rather than off a source file:

| | |
|---|---|
| `IN_BUFFER_SIZE` | **1,048,576** |
| `MAX_MESSAGE_SIZE` | **1,048,560** |
| `MESSAGE_HEADER_SIZE` | 16 |
| `OUT_BUFFER_SIZE` | 131,072 |

📄 `supersonic.js`'s own guard refuses a message larger than
`IN_BUFFER_SIZE - 16`, so with a 1 MiB ring it does not fire below a megabyte.

✅ And the counters say the same thing from the other side. Sending a
**200,000-byte** definition — 200,016 bytes of message:

| counter | before → after |
|---|---|
| `oscOutBytesSent` | +200,016 — **the host sent every byte** |
| inbound ring peak | 0 → **200,032** = the message + its 16-byte ring header |
| `engineMessagesProcessed` | +1 — **the engine took it out of the ring** |
| what the server said | **nothing** |

🔴 **The message crosses the transport whole, at three times the ceiling, and
dies inside the engine.** So the limit is SuperSonic's wasm scsynth's own OSC
receive path, its value matches `kTextBufSize` exactly, and nothing on this side
of the wire can raise it. ⚠️ I did not read SuperSonic's port source — the npm
package ships only the built `.wasm` — so "it is `kTextBufSize`" is an inference
from a matching constant and matching behaviour, not a line I can cite. 📄 Worth
recording that the **official** SC wasm port (`server/scsynth/SC_WebAudio.cpp`,
merged to `develop` 2026-06-06) has no cap at all: its `sendOsc` is
`malloc(size); memcpy(…)`. The 64 KiB is SuperSonic's, not WebAssembly's.

---

## 2 · The measured edges, side by side

### 2.0 The instrument, and why its answer can be trusted ✅

One generator, both ends. Definitions are built by **this repo's own
`demo/shell/synthdef.mjs`** — coarse rungs from a chain of `SinOsc` blocks
(35 B each), fine rungs from spare constants (4 B), the last 0–3 bytes from
the definition's own name (1 B a character). Every rung is **checked to the
exact byte** before it is sent, and re-parsed by `readSynthDef`, which throws
unless it consumes the file to the last byte. A ladder whose rungs are not the
size they claim would land on a crisp wrong number.

⚠️ **And the first native run was exactly that, caught before it was believed.**
It reported `LOADED` at 200,000 bytes while the send itself was returning
`EMSGSIZE` — because the reply matcher searched the *whole* reply list, so the
`/done /d_recv` from the 2,000-byte rung answered for every rung after it. The
result was tidy, wrong, and would have confirmed the repo's existing belief. A
mark on the reply list before each send fixed it. This is CLAUDE.md's "a partial
result that is too tidy is a broken collector", and it cost one run.

Controls, because "nothing loads" and "this harness is deaf" are the same
reading without them: ✅ in the browser a 184-byte definition loaded and **played
— silence 0.000000, sounding 0.070715 RMS**; ✅ on the native server `/notify 1`
answered `/done /notify` before any ladder was run, on both transports.

### 2.1 The browser ✅

SuperSonic 0.81.0 as vendored in `demo/patch/vendor/`, headless Chrome 152,
`postMessage` transport, 48 kHz, `--autoplay-policy=no-user-gesture-required
--mute-audio`.

| definition | OSC message | result |
|---|---|---|
| 2,000 … 65,500 B | | ✅ `/done /d_recv` |
| **65,520 B** | **65,536 B** | ✅ **LOADED — the largest that does** |
| **65,521 B** | **65,540 B** | ❌ **no reply — the smallest that does not** |
| 65,524 · 65,525 · **65,536** · 68,892 · 100,000 · 200,000 B | | ❌ no reply |

Confirmed **three times each**, alternating, with a `/status` round trip between
every rung proving the engine was still alive. ✅ **65,536 — the repo's declared
ceiling — is on the failing side of the line.**

⚠️ The definition edge moves in **steps of 4**, because an OSC blob pads to a
four-byte boundary: 65,521, 65,522 and 65,523 all produce the same 65,540-byte
message and all three fail. The quantisation is the format's, not the harness's.

### 2.2 🔴 The test that says MESSAGE, not DEFINITION ✅

`/d_recv` takes an optional second argument, a completion message, which rides
in the same OSC message and adds not one byte of definition. A 12-byte
completion costs exactly **16** more bytes on the wire — 4 for the blob's own
size field, 12 for the blob.

| | largest definition that loads |
|---|---|
| `/d_recv <def>` | **65,520** |
| `/d_recv <def> <12-byte completion>` | **65,504** |

✅ **The edge moved by exactly 16.** In both framings the largest OSC message
that loads is **65,536 bytes** and the smallest that does not is **65,540**.
Two different framings agreeing on one message size is what turns "65,520" from
a fact about definitions into a fact about messages.

⚠️ The true boundary is somewhere in **[65,536, 65,540]** and cannot be narrowed
further: every OSC type pads to four bytes, so 65,537, 65,538 and 65,539 are not
sizes an OSC message can have. 65,536 sitting at the bottom of that bracket is
what makes `kTextBufSize` the obvious culprit — the buffer holds the message
inclusive.

### 2.3 The native engine ✅

scsynth **3.14.1** (`Built from tag 'Version-3.14.1' [426edf6]`), studio Mac, on
its own high port, `-i 0 -o 2 -R 0`, killed afterwards. Nothing already running
on that machine was touched.

| transport | largest definition that loads | smallest that does not | what it says when it refuses |
|---|---|---|---|
| **UDP**, default macOS socket | **9,200** (message 9,216) | 9,201 | ✅ `EMSGSIZE` **at the sender** |
| **UDP**, send buffer raised to 4 MiB | **65,488** (message 65,504) | 65,489 | ✅ `EMSGSIZE` at the sender |
| **TCP** | **no ceiling found at 1,000,000** (message 1,000,016) | — | — |

🔴 **Two numbers, and the first one is a trap.** ✅ `net.inet.udp.maxdgram` is
**9216** on macOS, so a socket that does not raise `SO_SNDBUF` cannot put more
than 9,216 bytes in a datagram — and that is *my socket's* limit, not scsynth's
and not the operating system's. ✅ Caught because sclang, on the same machine in
the same hour, successfully sent a **16,260-byte** datagram (§1.4). Raising the
buffer moved the edge to 65,488. ⚠️ Anyone re-running this who forgets the
buffer will measure 9,200 and report it as scsynth's ceiling. It is not.

📄 65,488 is not a SuperCollider number at all. The largest four-byte-aligned
OSC message that fits an IPv4 datagram is **65,504** (the payload limit is
65,507), and 65,504 − 16 bytes of `/d_recv` framing = **65,488**. It is the
Internet Protocol's ceiling, measured through scsynth.

**TCP has no ceiling.** ✅ Every rung to 1,000,000 bytes answered `/done
/d_recv`, including 68,892 — the number the repo's existing note records as the
smallest that fails. It fails in a browser. It has never failed on a desktop.

### 2.4 Do they differ? 🔴 Yes, three ways ✅

| | definition ceiling |
|---|---|
| browser, `/d_recv` | **65,520** |
| native, `/d_recv` over UDP (IPv4) | **65,488** |
| native, `/d_recv` over TCP | **none found at 1,000,000** |
| native, `/d_load` from disk | **none found at 1,000,000** |
| anything sclang sends | **16,383**, above which it silently becomes `/d_load` |
| **what the repo currently declares** | **65,536 — a value no path has** |

---

## 3 · Is `/d_recv` the only way in? Browser yes, board no ✅

✅ **In the browser it is the only way in, and the engine says so out loud.**
`sonic.send('/d_load', …)` throws:

> `/d_load is not supported in Clockwork. Use loadSynthDef() or send /d_recv with synthdef bytes instead.`

A thrown JavaScript error with the alternative named in it — the good kind of
failure, and the opposite of what happens 16 bytes over the ceiling.

✅ **On the board's side of the fence, `/d_load` is unbounded and fast.** Native
scsynth, definitions written to disk and loaded by path:

| from disk | reply | time |
|---|---|---|
| 70,000 B | ✅ `/done /d_load` | 21 ms |
| 200,000 B | ✅ `/done /d_load` | 21 ms |
| **1,000,000 B** | ✅ `/done /d_load` | **44 ms** |

and `/s_new` on each loaded name started a synth with no error. A megabyte off
disk costs 44 ms.

🔴 **Which means the ceiling binds the browser and not the board, and the board
was never near it.** `Engine_Pappus.sc` line 2121 is `}).add;`. `.add` calls
`doSend`. `doSend` sends `/d_recv` only under 16,383 bytes. **Every rung of the
Pappus ladder is above that** — BARE 43,551, TINY 64,733, LITE 74,733, FULL
121,425 — so **all four have always gone to disk and come back via `/d_load`,
and all four load on the board.** ⚠️ 📄 for the board itself: the Pi runs
SuperCollider **3.13** (`rig/box/README.md:194`), whose `SynthDef.sc` carries
the identical `65535 div: 4`, and the measurement above was made against 3.14.1
on another machine. §7 names the one-line check that closes this.

---

## 4 · Is it silent? The browser yes, absolutely; everyone else no ✅

CLAUDE.md says "silent cap". For the browser that is exactly right and it is
worse than it sounds.

✅ Over the line, measured with every channel open at once — the reply stream,
a `window.error` handler, an `unhandledrejection` handler, a `try`/`catch`
around the send, and the CDP console:

| channel | what it reported |
|---|---|
| `/fail` | nothing |
| any reply at all | nothing |
| a thrown exception at the call site | nothing |
| an uncaught error on the page | nothing |
| the browser console | nothing |
| `engineWasmErrors`, `oscInCorrupted`, `engineMessagesDropped` | all unchanged |
| the engine afterwards | ✅ alive; a small definition still loads |

🔴 **And one counter reports the opposite of the truth.** `loadedSynthDefs` went
**1 → 2 → 3** across three sends of which only the first loaded. That is the
third instance in this project of a value that reports INTENT while reading
exactly like one that reports DELIVERY — after `loadSynthDef()` returning
`{name, size}` for a definition the server never got, and `fx.pappus` answering
ok before the engine existed. Watch for `/done /d_recv`; do not read that
counter.

Everyone else reports:

- ✅ **native UDP**: `EMSGSIZE` at the sender, before a byte leaves the machine.
- ✅ **native `/d_load` of a missing file**: `/fail /d_load`, because
  📄 `LoadSynthDefCmd::Stage2` calls `SendFailure` — the line
  `RecvSynthDefCmd::Stage2` does not have.
- ✅ **the browser's `/d_load`**: a thrown error naming the alternative.
- ⚠️ **sclang crossing its own 16,383**: silent, but silent in the harmless
  direction — it switches to a mechanism that works, and nobody needs to know.

---

## 5 · What happens just over the line ✅

Nothing arrives. Not a partial definition, not a truncated one.

⚠️ **The first version of this test could not tell.** It sent an over-the-line
definition and then `/s_new` on its name, and the server said nothing — but the
generator had given that definition the name `z`, which an **earlier rung of the
same ladder had already loaded successfully**. `/s_new z` would have worked
either way, so "the server said nothing" was consistent with both answers. A
name nothing had ever loaded was needed, and the re-run is below.

✅ Three trials in one fresh engine, each with a name the engine had never seen,
`/notify 1` on so failures are reported:

| sent | `/d_recv` answered | then `/s_new` on that name answered |
|---|---|---|
| **65,521 B**, name `q` | nothing | ✅ **`/fail /s_new "SynthDef not found"`** |
| **65,520 B**, name `wwww` | ✅ `/done /d_recv` + `/supersonic/synthdef/loaded wwww` | ✅ `/n_go 9520` — the synth started |
| **a name never sent at all** | — | ✅ `/fail /s_new "SynthDef not found"` |

🔴 **The over-the-line definition and a definition that was never sent are
indistinguishable from the server**, down to the same error string. So there is
no partial load, no truncated graph, and nothing to misbehave: the definition
simply does not exist. ✅ The engine is otherwise completely healthy — a small
definition sent immediately afterwards loads and plays, and `/status` answers
throughout.

⚠️ Which makes the whole failure a diagnostic one, and a cruel one. The first
thing the server ever says is `/fail /s_new "SynthDef not found"`, seconds
later, about a message that was fine. `research/supercollider-browser-2026-09.md`
§8 records what that costs: it reads as a wrong name or a failed buffer
allocation, and both were investigated first.

---

## 6 · What the "64 KiB on both ends" decision should be

### 6.1 🔴 The number is wrong, and wrong the dangerous way

`demo/shell/synthdef.mjs` currently declares:

```js
export const SIZE_CEILING = 64 * 1024;
export const fitsCeiling = (bytes) => {
  …
  return { fits: n <= SIZE_CEILING, bytes: n, margin: SIZE_CEILING - n };
```

✅ A definition of **65,536 bytes passes that check and does not load**, in
silence. So does anything from 65,521 up. The constant admits 16 bytes that
fail in exactly the manner the constant exists to prevent — which is the worst
shape a guard can have, because it converts a loud arithmetic refusal into the
silent one.

**What to declare instead.** The quantity the engines actually measure is the
OSC message, so declare that and derive the rest:

| | |
|---|---|
| message budget | **65,504** — the largest four-byte-aligned OSC message that fits *both* an IPv4 datagram (65,507) and the wasm engine's buffer (65,536) |
| `/d_recv` framing, bare blob | 16 bytes, plus the blob's padding to 4 |
| **definition ceiling** | **65,488** |

Deriving it rather than typing it is not tidiness: ✅ §2.2 measured the
definition ceiling dropping by 16 the moment a completion message was added, and
a hard-coded definition number cannot know that happened.

**What it costs:** TINY at 64,733 keeps **755 bytes** of headroom instead of
803. Nothing needs recompiling and no cut needs revisiting.

**Why 65,488 and not the browser's own 65,520:** one number for every `/d_recv`
this repo could plausibly make, including one to a native server over UDP, for
32 bytes that nothing is using. If the browser is ever the only consumer,
65,520 is the exact figure — but then it should be named as a browser number,
not as a ceiling "both ends keep".

### 6.2 🔴 "The same instrument, two ends" needs a different reason

`Engine_Pappus.sc` says, in the comment that sets `tiny = true`:

> The governing number is 64 KiB, which is what a definition may weigh and still
> load into BOTH engines … the smaller appetite sets the table.

✅ There is no smaller appetite. The board's appetite is **unbounded**: sclang
hands anything over 16,383 bytes to `/d_load`, and `/d_load` took a megabyte in
44 ms. FULL at 121,425 loads on the board today and always has.

The same file already anticipated this, two paragraphs down:

> If it turns out to bind the message rather than the definition, this board can
> `/d_load` from its own disk and the ceiling stops binding HERE while still
> binding the browser — at which point this default is wrong and should go back.

It binds the message. ✅ Proved twice — the completion test moved the edge by
exactly its own width (§2.2), and TCP carried 1,000,016 bytes of the same
message (§2.3).

**But "wrong and should go back" is too strong, and the reason is worth being
precise about.** There are two different claims underneath TINY-on-the-board and
only one of them just died:

| claim | status |
|---|---|
| "the board cannot load a bigger definition" | ✅ **false**, and was always false |
| "the full graph on a Pi beside a cut-down one in a tab is two instruments, not one measured twice" | untouched — and it is the real argument |

So: **keep TINY as the board's default if the point of `/grains` is a
side-by-side comparison, and write the comparability reason into the file in
place of the capacity one.** A constraint that turns out not to exist, left in
place with its old justification, is how a cut nobody can defend survives into
next year. And the moment someone wants the modal bank back on the board, the
answer is now "yes, and the browser then runs a different graph — decide which
you want", not "no".

### 6.3 What this does not change

- The TINY cut itself. ✅ 64,733 fits under 65,488 with 755 to spare.
- `/d_recv` as the browser's path. ✅ It is the only one (§3).
- research §8's conclusion that nothing in SuperSonic's configuration raises the
  ceiling. ✅ Still true, and now for a better reason: the ring is 1 MiB and the
  drop is inside the engine (§1.5).

---

## 7 · What is still unmeasured, and the cheapest way to close each

| open | why it is open | the check |
|---|---|---|
| ⚠️ The **Pi's** sclang really does `/d_load` Pappus | Measured on sclang 3.14.1 on the Mac; the Pi runs 3.13. 📄 The source line is identical in both, but that is reading, not running. | One line on the board: does a `pappus.scsyndef` exist in sclang's synthdefs directory with a recent mtime? If it does, `doSend` took the `/d_load` branch. No restart needed. |
| ⚠️ The wasm edge on the **SAB** transport | ✅ Measured on `postMessage` only. The vendored copy has no `workers/` directory, so SAB cannot be reached from `demo/patch/vendor/` at all. 📄 research §8.1 measured both transports agreeing at coarse resolution (12,984 loads, 73,297 does not, identically). | Vendor `supersonic-scsynth/dist/workers/`, serve with COOP/COEP, re-run the same ladder. Low value: the drop is inside the engine, which both transports share. |
| ⚠️ The constant **inside** SuperSonic's wasm | The npm package ships a built `.wasm` and no source. The inference rests on a matching value and matching behaviour. | Ask upstream, or read `samaaron/supersonic` if its scsynth port is in the public repo. |
| ⚠️ Whether the ceiling is **inclusive** of 65,536 | ✅ Bracketed to [65,536 loads, 65,540 does not] and it cannot be narrowed — OSC messages are four-byte aligned. | Nothing to do. This is the finest an OSC message can be measured. |
| ⚠️ Linux's UDP default send buffer | 📄 `net.core.wmem_default` is typically 212,992 on Raspberry Pi OS, well above 65,507, so the IPv4 limit binds first and no buffer needs raising. Not checked on the board. | Irrelevant unless something starts sending `/d_recv` to the board, which nothing does. |

---

## 8 · Three traps found on the way, worth keeping

**A socket's default send buffer is not the operating system's limit, and both
answer `EMSGSIZE`.** ✅ The first native UDP run measured an edge at 9,200 bytes
and it was entirely mine — `net.inet.udp.maxdgram` is 9216 on macOS and a plain
`dgram` socket inherits it. Raising `SO_SNDBUF` moved the edge to 65,488. What
exposed it was a second instrument disagreeing: sclang put a 16,260-byte
datagram on the same loopback in the same hour. **A number that only one
instrument can produce has not been measured yet** — this is the same shape as
the avfoundation device index in `rig/m1/README.md`, where two opposite
conclusions read −91.0 dB.

**A reply matcher that searches the whole history answers for the wrong
question.** ✅ The first native ladder reported `LOADED` at 200,000 bytes while
the send was failing, because one `/done /d_recv` from the 2,000-byte rung
satisfied every later rung. It read as a clean, confident confirmation of what
the repo already believed. Mark the reply list before each send.

**A test whose subject shares a name with an earlier success has no control.**
✅ The first "does anything arrive at all?" probe sent an oversize definition and
then `/s_new` on its name — and the generator had named it `z`, which an earlier
rung of the same ladder had already loaded. The answer would have looked the
same whether nothing arrived or everything did. Same family as the ladder bug
above: **before running a comparison, ask what defect it could NOT detect.** The
fix was one character — a name nothing had ever loaded — and it turned a
shrug into `/fail /s_new "SynthDef not found"`.

**When two things could be the ceiling, add a byte to one of them.** The whole
question — message or definition — was settled by attaching a 12-byte completion
message and watching the definition edge drop by exactly 16. That is cheaper
than any amount of reading, it is falsifiable in one run, and it is CLAUDE.md's
"when two hypotheses have opposite fixes, build the measurement that separates
them first".
