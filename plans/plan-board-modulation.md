# plan-board-modulation — the granulator's movement, on the board

> ⚠️ **NOTHING IN THIS FILE IS BUILT.** No code was changed, nothing was
> deployed, and nothing on the board was restarted or reconfigured. It is a
> proposal.
>
> ✅ **MEASURED** marks a number taken off the live board (`raspberrypi`,
> 192.168.1.213, `studio-1`) between **21:18 and 21:32 UTC on 2026-09-14**, over ssh
> and over read-only OSC to its scsynth. Every one of those is a READ:
> `/status`, `/g_queryTree`, `/s_get`, `/s_getn`, `/c_get`, `/c_getn`, plus
> `ps`, `ss`, `md5sum` and `journalctl`. **No `/n_set`, no `/n_map`, no
> `/s_new`, no service action.** So every claim below about what happens when
> something is WRITTEN is reasoned from source, and says so.
>
> Everything else is read off `rig/board/norns/Engine_Pappus.sc`,
> `rig/board/pappus.mjs`, `rig/board/board.mjs`, `rig/board/norns/run-pappus.scd` and
> `demo/shell/pappus-mod.mjs`, with the line cited.

The subject: `demo/shell/pappus-mod.mjs` re-creates, in JavaScript, the half of
Pappus that upstream keeps in Lua — eight LFOs, six shapes, a Turing
sample-and-hold, an envelope follower, the cubed amount, the offset in the
control's own warped space. It runs in a tab today
(<https://positron.studio/radio/>, 35/35). This file is about getting the
same movement onto the Raspberry Pi that serves
<https://positron.studio/keys/> and <https://positron.studio/grains/>.

---

## 0 · What the board is, measured this hour

### 0.1 ✅ The rung is TINY, and it is not a guess

Three independent readings, because `run-pappus.scd`'s own READY line cannot
tell the rungs apart and has already misled this project for a day:

| evidence | reading |
|---|---|
| `/etc/default/positron-board` | `PAPPUS_TINY=1`, with a comment dating the decision to 2026-09-13 and naming the price |
| the live process environments — `board.mjs` pid 176447, `sclang` pid 176615, `scsynth` pid 176653 | all three carry `PAPPUS_TINY=1` |
| `journalctl -u positron-board` | `Engine_Pappus: TINY graph`, Sep 13 22:47:31 — the same minute pid 176447 started |

So `lite = true` as well (`Engine_Pappus.sc:218`, `if(tiny) { lite = true }`),
and **the board and the tab are on the same rung**. Every destination that
`radio` can modulate in a browser exists on the board, and no destination
the board has is one the browser lacks. That is a larger convenience than it
looks: it means the modulator's spec table does not have to fork.

⚠️ **The board's `PAPPUS READY` line says `lite=true` and nothing else, and the
file on disk says more than that.** `/opt/positron-board/rig/board/norns/run-pappus.scd`
has mtime **2026-09-14 06:45**; the service has been up since **2026-09-13
22:47**. The three-flag READY line is in the file and has never been executed.
✅ MEASURED. Nothing is wrong — it is simply that **the running sclang is eight
hours older than its own script**, and anybody reading that log line to find the
rung would be reading a process, not a file. The environment is the honest
source and all three agree.

✅ Every file that matters is otherwise current — md5 identical to this checkout:

```
/opt/positron-board/rig/board/pappus.mjs                       dc595efaa1e152aa425a003850f61eaf
/opt/positron-board/rig/board/board.mjs                          448f04ab15f01351a9ce74093cd52ab2
/opt/positron-board/rig/board/norns/run-pappus.scd             3b0095ff8bcdfef73aee9678232333d8
~/.local/share/SuperCollider/Extensions/pappus/lib/Engine_Pappus.sc  8f689bfa1d18f3508f1f75884ab447d6
~/.local/share/SuperCollider/Extensions/pappus/lib/PosSource.sc      b7372eb4e1b0fe6b86a94b30e3efa522
~/.local/share/SuperCollider/Extensions/CroneEngine.sc              a77d603131dd0f6b0939b58af69b48ee
```

The Extensions copies are the ones sclang compiles — `push.sh` says so at
length, and they are the ones checked here.

### 0.2 The path a parameter takes, and it is two hops, not one

This is the fact the whole of §1 turns on, and it is not what a reader coming
from the browser would assume. In a tab, `demo/shell/pappus.mjs` speaks OSC to
wasm scsynth directly. On the board it does not:

```
board.mjs / pappus.mjs                         node
   └─ UDP 127.0.0.1:57120  '/pappus/cmd' <name> <args…>
      run-pappus.scd  OSCdef(\pcmd)  →  e.cmd(name, *args)   sclang
         └─ Engine_Pappus.sc:2117…2388   synth.set(\name, v)
            └─ UDP 127.0.0.1:57110  /n_set 1001 <name> <v>   scsynth
```

`rig/board/pappus.mjs:54` fixes the port and address; `run-pappus.scd`'s
`OSCdef(\pcmd)` is the door; `Engine_Pappus.sc:2117` onwards registers all
**107** of the engine's commands, **86** of them a single line of
`this.addCommand("<name>", "f", { arg msg; synth.set(\<name>, msg[1]); })`.

✅ Counted: **101 of the 107 land as `/n_set` or `/n_setn` on node 1001.** The
six that do not are buffer operations — `epattern` (`:2129`), `epattern2`
(`:2203`), `bufclear` (`:2286`), `delayclear` (`:2294`), `snapwrite` (`:2302`),
`snapread` (`:2323`). Everything else, including every array control
(`pitches` `:2337`, `gates` `:2345`, `probs` `:2340`, the four tap arrays
`:2357–2366`), is a `setn` on the same node.

**So the engine's parameter surface IS `/n_set` on node 1001, wearing names.**
That single sentence decides §1.

### 0.3 ✅ The numbers off the live board

```
model            Raspberry Pi 4 Model B Rev 1.5, 4 cores, 1847 MB
load             0.22 0.25 0.27       temp 45.7 °C
jackd            jackd -r -d dummy -r 48000 -p 1024          ← DUMMY backend, -r = NO realtime
scsynth argv     scsynth -u 57110 -a 1024 -i 2 -o 2 -m 65536 -w 128 -S 48000 -R 0 -C 1 -l 1
scsynth sched    SCHED_OTHER, priority 0                      ← also not realtime
scsynth socket   UNCONN 127.0.0.1:57110                       ← localhost only
process CPU      scsynth 23.7 %   board.mjs 5.1 %   sclang 0.9 %   jackd 0.3 %
/status.reply    1571 UGens · 2 synths · 3 groups · 108 defs · avgCPU 25.88 % · peakCPU 26.23 %
node tree        group 0 → group 1 → group 1000 → [ synth 1004 `posSource`, synth 1001 `pappus` ]
pappus controls  281
/s_get RTT       n=60   p50 14 ms   p90 22 ms   max 25 ms
```

Four of those matter more than the rest.

🔴 **`jackd -p 1024` at 48 kHz is a 21.3 ms period, and that is the message
quantisation floor of this board.** scsynth drains its OSC receive queue once
per hardware callback; under JACK that is once per period. So an `/n_set` lands
somewhere in the next 21.3 ms whatever rate it was sent at, and the `/s_get`
round trip of **p50 14 ms** is consistent with exactly that — a uniform 0…21.3
ms wait averages 10.7 ms, plus two localhost hops. ⚠️ Reasoned, not measured:
I did not write a control and time its arrival, because that is a write.

🔴 **`-l 1` does NOT lock a second client out of reading.** ✅ MEASURED: a plain
UDP socket on the board, never registered with `/notify`, sent `/s_get 1001
mrate` and got back exactly **one** datagram, `/n_set 1001 mrate 2.2`. Same for
`/s_getn`, `/c_get`, `/c_getn` and `/g_queryTree`. So the readback half of every
design below is available to node today with no change to sclang at all.
⚠️ `/notify` itself was NOT tested — registering a client is a write, and with
`maxLogins 1` it is the one call that plausibly displaces sclang. **Do not send
`/notify` from node on this board** until somebody has proved what it does to
sclang's `.get()` callbacks, which `/pos/confirm` (`run-pappus.scd`) depends on.

⚠️ **`-C 1` is not in this scsynth's own `-h` output.** It is not the control-bus
count: ✅ `/c_getn 15000 8` answered with eight values, so control busses reach at
least 15007 and the default 16384 is intact. Recorded because an undocumented
flag in the argv of the process you are about to talk to is worth one line.

⚠️ **The audio backend is `dummy`.** Nothing is plugged in; JACK is running off a
timer. The 23.7 % CPU is real DSP against a real clock, but it is not a number
about a board that is playing to a speaker, and it is not evidence about xruns.

### 0.4 ✅ THE BOARD HAS HAD A MODULATOR SINCE DAY ONE, AND IT IS RUNNING RIGHT NOW

This is the finding that reframes the whole job, and it was found by reading the
same control twice eleven minutes apart and noticing it had moved.

`rig/board/pappus.mjs:376` is `DRIFT`: six parameters, each a pair of sines at
incommensurate periods, evaluated by `driftValues()` (`:422`) and pushed by
`tick()` (`:588`) at **8 Hz**. `params.random` turns it on unconditionally
(`board.mjs:942`), and it was on.

✅ MEASURED, `/s_get 1001` five times three seconds apart, 21:31:47 → 21:31:59,
**with one socket in the room and nobody connected**:

```
21:31:47.951  mscan=0.550  mspray=0.092  mswarm=0.271  mtilt=-0.068  msize=0.278  msos=0.593  nscan=0.429  mrate=2.2
21:31:50.936  mscan=0.541  mspray=0.087  mswarm=0.276  mtilt=-0.071  msize=0.277  msos=0.588  nscan=0.432  mrate=2.2
21:31:53.948  mscan=0.531  mspray=0.083  mswarm=0.283  mtilt=-0.077  msize=0.277  msos=0.583  nscan=0.437  mrate=2.2
21:31:56.952  mscan=0.520  mspray=0.080  mswarm=0.290  mtilt=-0.084  msize=0.278  msos=0.578  nscan=0.443  mrate=2.2
21:31:59.960  mscan=0.507  mspray=0.078  mswarm=0.298  mtilt=-0.093  msize=0.281  msos=0.574  nscan=0.450  mrate=2.2
```

Six controls moving, `mrate` (not a `DRIFT` name) stationary at 2.2 — which is
the control that proves the other six are not measurement noise. The `n` side is
moving too.

Three consequences, and all three are load-bearing:

1. **The question is not "can the board modulate", it is "what replaces the
   thing already modulating".** A second mover added beside `DRIFT` would fight
   it at 8 Hz on five of the six destinations `pappus-mod.mjs` would want most.
   See §6.3.
2. **`DRIFT` is a strict subset of `pappus-mod.mjs`.** Two sines at periods `p`
   and `p·φ`, summed and halved, is two `{src:'lfo', shape:'sine'}` routings on
   one destination — and `createModulator` already ADDS two routings on one
   destination in the control's own space (`pappus-mod.mjs`, `tick()`). The
   `size` entry is `DRIFT_RELATIVE` (`pappus.mjs:387`) — proportional rather
   than absolute — which is precisely what an `exp` spec gives for free.
3. 🔴 **Half of its messages go nowhere.** `tick()` sends `sendSide('m', …)`
   AND `sendSide('n', …)` — 6 + 6 commands, 96 datagrams a second at 8 Hz — and
   on TINY `graw2 = DC.ar([0,0])` (`Engine_Pappus.sc:1013`). **48 messages a
   second have been writing a granulator that is compiled out**, for as long as
   the board has been on TINY. `radio` already worked this out for the tab
   and wrote it down in `MOD_CMD`'s comment; nobody has applied it here.

---

## 1 · Node or SuperCollider — the question, weighed

### 1.1 There are three routes, not two

| | who computes the shape | how it reaches the graph | resolution |
|---|---|---|---|
| **A · node** | `pappus-mod.mjs` in `board.mjs` | `/pappus/cmd` → sclang → `synth.set` → `/n_set` | one JACK period, **21.3 ms** |
| **A′ · node, direct** | same | node → `/n_set 1001 …` straight to scsynth:57110 | same 21.3 ms, one hop fewer |
| **B · a modulator SynthDef** | UGens on the server | `/n_map` the pappus node's args onto control busses | one control block, **1.33 ms** (64 frames) |

There is a fourth thing that is not a route and must be priced first, because it
is free:

🔴 **FIVE MOVERS ARE ALREADY INSIDE THE SYNTHDEF AND COST ONE `/n_set` EACH.**
`plans/plan-radio-patches.md §1.6` has the table; all five are compiled on TINY. The
STRETCH read head (`:715`) crosses the window in `mbuflen/(3·mscan−1)` seconds —
one second to twenty-eight minutes; WARP spray (`:783–784`) is two `LFNoise2`
rotated per voice; `kwow` (`:1882–1888`) is two more into a `DelayC`; `coin`
(`:801`) is a fresh random per trigger read through a per-voice offset; the
euclid rotation (`:707`, `:802`) steps `melen` positions with voice `i` offset
by `mephase·i`. **A patch should spend these before it spends a single message.**
Nothing below competes with them; the modulator is for the shapes they cannot
make — a sixteen-step pattern that drifts, an envelope follower, a routing whose
depth a patch chooses.

### 1.2 🔴 THE TRAP: `/n_map` AND `/n_set` ARE TWO OWNERS OF ONE CONTROL

⚠️ **Reasoned from the SuperCollider server's behaviour and from this engine's
source. NOT MEASURED — measuring it requires a write.**

The task framed the trap as *"`/n_map` REPLACES the arg, so a mapped control
ignores `/n_set`"*. My reading of scsynth is the **opposite direction and a
worse failure**: `Graph_SetControl` writes the scalar AND resets that control's
map pointer back to its own scalar slot, so **an `/n_set` silently UNMAPS**.
Either way the two cannot coexist, but the two failures look completely
different from outside:

- if `/n_set` is ignored → every page slider stops working, loudly and at once;
- if `/n_set` unmaps → **the modulation stops, one destination at a time, the
  first time anybody touches anything**, and the page still reads correct.

The second is the shape this repo minds most, and it is the one I expect.

And it is not a corner case here, it is the normal case. From §0.2: **101 of the
engine's 107 commands** land as `/n_set` or `/n_setn` on node 1001. So after a
`/n_map`, the following would each silently kill the modulation on whatever they
name:

- `params.set` from `/grains/` — one per knob, per drag (`board.mjs:1072`);
- `params.random` → `apply()` (`pappus.mjs:548`), which sends **~100 commands**;
- `notes` — every `note.on` resends all eight `pitches` and `gates`;
- the startup `Routine` in `run-pappus.scd` (`msrc`, `nsrc`, `amp`, `mswarm`,
  `nswarm`, `mrate`, `ingain`, `run`);
- and `DRIFT` itself, 96 times a second.

**The workaround the task suggests does not survive contact with this engine.**
"Let the modulator synth read a base from its own control bus that `/n_set`
writes" needs `/n_set` to land on a BUS. It lands on the pappus node. To move
the base onto a bus you must change where the base is written, and the base is
written in 101 hand-listed lines of `Engine_Pappus.sc` — the upstream file this
project deliberately does not fork, and whose md5 is checked in `push.sh`,
`PROVENANCE.json` and `demo/grains/defs/`.

There is one honest version of Route B that avoids forking the engine, and it
deserves to be stated properly rather than waved away:

> **B′ — intercept at sclang.** `run-pappus.scd`'s `OSCdef(\pcmd)` is fifteen
> lines from being a router: if the incoming name is a modulated destination,
> `baseBus[name].set(value)`; otherwise `e.cmd(name, *args)` as now. The
> modulator SynthDef reads `In.kr(baseBus)`, adds its offset, and writes the
> destination bus that the pappus node is `/n_map`'d to. `Engine_Pappus.sc` is
> untouched. It would work.

B′ still loses, and §1.4 says why.

### 1.3 What a control bus would actually buy, priced

Route B's entire advantage is resolution: a control bus updates every 64 frames
(1.33 ms) instead of every 1024 (21.3 ms), and costs no messages. Price that
against what the graph does with the value when it arrives:

🔴 **`Engine_Pappus.sc:485` — `var lagt = 0.02`** — and nearly every destination
worth modulating is `Lag.kr(…, lagt)` on the way in: `msos` (`:638`), `mdelay`
(`:717`), `mstrum` (`:756`), `msize`, `mrate`, `mscan`, `mswarm`, the window
ends. **The engine smooths every stepped control change over 20 ms on purpose.**

So the board's message path is quantised at 21.3 ms into a graph that
deliberately blurs 20 ms. The 16× extra resolution a control bus buys is
handed straight to a one-pole that throws it away. That is not an argument that
the SynthDef route is wrong; it is the measurement that says it is **not worth a
restart, a fork, or a second implementation.**

⚠️ And there are two costs on Route B that are not resolution:

- **Array destinations need `/n_mapn`**, one bus per element. `probs`, `gates`
  and `pitches` are eight each — the three most interesting array destinations
  cost 24 busses and 24 `Out.kr` channels. Affordable (✅ 16384 busses measured
  available), but it is not one `/n_map`.
- **`mcontour` is a `Select.kr` index** (`:726`) over seventeen windows. A
  control bus carries a float; the browser modulator quantises it to an integer
  in JavaScript precisely so the value can be read back the way it was sent
  (`pappus-mod.mjs`, the `s.quant` branch). In-graph it would need a `.round`
  and the read-back would be a bus, not a value.

### 1.4 🔴 THE RECOMMENDATION: ROUTE A — NODE, THROUGH THE DOOR THE DRIFT ALREADY USES

**One sentence: on this board every parameter already arrives as `/n_set`, and
`/n_set` is exactly what breaks an `/n_map` — so the SynthDef route would have
to fork or shim the 107-command table to buy resolution that
`Lag.kr(…, 0.02)` and a 21.3 ms JACK period throw away.**

The four supporting reasons, in the order they matter:

1. 🔴 **ONE MODULATOR, TWO MACHINES — and the test already exists.**
   `demo/shell/pappus-mod-test.mjs` is 22 green off the wire, and it grades the
   cube, the warped offset, the sixteen-slot memory, the array split, the
   dead-band, the hold, the refusal of an unknown source and the follower's
   attack/release asymmetry — none of which needs SuperCollider, a browser or a
   radio station. A SynthDef modulator would be a **second implementation of
   the same arithmetic**, graded by nothing, diverging silently. That is
   `plan-twins`' subject exactly, and `rig/board/pappus.mjs:37` already carries
   the rule in its own header: *"Reimplementing it here would be two
   authorities on one number."*
2. **It ships for free.** `pappus-mod.mjs` has **zero imports** (✅ checked), and
   `push.sh`'s tar line already collects `$(grep -ho "from '\.\./\.\./[^']*'"
   ./*.mjs)` from `rig/board/`. Adding
   `import { createModulator } from '../../demo/shell/pappus-mod.mjs'` to
   `pappus.mjs` puts it on the board with no change to the deploy script.
   ⚠️ That grep does **not** follow transitive imports, so the zero-imports
   property is load-bearing, not incidental.
3. **The precedent is running and measured.** `DRIFT` has been pushing 96
   messages a second through `/pappus/cmd` for weeks; §0.4 caught it doing so.
   The proposal is to replace it with a better modulator on the same wire, not
   to open a new one.
4. **It needs no restart.** `run-pappus.scd`, `Engine_Pappus.sc` and scsynth are
   untouched. The board is a service that dials out on boot with nobody
   watching; a change that cannot take down the audio stack is worth a great
   deal here.

**Route A, not A′, for WRITING.** Going direct to scsynth:57110 saves one
localhost hop and the sclang dispatch — and the engine's own comment
(`Engine_Pappus.sc:2261`) warns that *"on a Pi 3 it is what starves scsynth into
clicking long before scsynth runs out of DSP."* That is a real reason to keep it
in reserve. But it makes node a second authority on the pappus node id, it
bypasses the one door every other writer uses, and ⚠️ **not every command is a
bare `synth.set`** — `epattern` writes `patbuf` (`:2129`), `pfrq`/`pamp` are
48-element `setn`s (`:2148`, `:2151`). So A′ is the escape hatch, taken only if
sclang shows up in `ps`, and only for the plain-`synth.set` destinations.

🔴 **BUT READ DIRECT FROM scsynth, ALWAYS.** There is no sclang door for reading
a control at all — `addPoll` is a no-op in the `CroneEngine.sc` stub this board
uses, and the engine's own comment says the seven meter polls *"exist in the
source and have never once fired in a test"* (`:2245–2250`). ✅ MEASURED: a second
unregistered UDP client gets `/s_get`, `/s_getn`, `/c_get`, `/c_getn` and
`/g_queryTree` answers from this scsynth with `-l 1`. That is the measurement
surface, and §2 and §4 are both built on it.

### 1.5 What would change this recommendation

Say it now so it is not re-litigated from feel:

- **A destination that must be sample-accurate.** None of the ones on the table
  are; every one is behind a 20 ms lag. If somebody wants a modulated control
  that is *not* — an audio-rate index, a per-grain value — Route B is the only
  answer and the engine has to change anyway.
- **`jackd` moving to a real card with a small period.** At `-p 128` (2.7 ms)
  the message path stops being inside the engine's own lag, and the argument in
  §1.3 weakens. Re-measure the period before re-opening this.
- **sclang showing up in `ps`.** Currently 0.9 %. If a 25 Hz modulator takes it
  past a few per cent, go to A′ before going to B.

---

## 2 · Where the follower's input comes from

### 2.1 ✅ THE ENGINE ALREADY COMPUTES SEVEN OF THEM AND WRITES THEM TO A CONTROL BUS

`Engine_Pappus.sc:323` — `mbus = Bus.control(srv, 7)`.
`Engine_Pappus.sc:2104` — `Out.kr(mbus, [mt1, mt2, mt3, mt4, mt5, mt6, mt7])`.

Seven `Amplitude.kr` followers, one per stage, all at **attack 0.01 s, release
0.2 s** — which is within a hair of upstream's follower defaults (0.01 / 0.35,
`plans/plan-radio-patches.md §1.5`) and of `createEnvFollower`'s:

| | what it follows | line | on TINY |
|---|---|---|---|
| `mt1` | GRAINSWARM 1 output, `(gsum[0]+gsum[1])·0.5` | `:1057` | live |
| `mt2` | GRAINSWARM 2 | `:1065` | **`DC.kr(0)`** — `lite` branch |
| `mt3` | RESONATOR input, `presig` | `:1433` | live (but `fsum` is silent, `:1312`) |
| `mt4` | DELAY, `ssig` | `:1582` | live |
| `mt5` | COLOUR, `kout` | `:1894` | live |
| `mt6` | output before the master | `:2062` | live |
| `mt7` | output after limiter and level | `:2103` | live |

**So the board's answer to question 2 needs no graph change, no fork, no new
SynthDef and no restart: `/c_getn <mbus> 7`, once per modulator tick.** ✅ The
read itself is measured working — `/c_getn 0 8` and `/c_getn 15000 8` both
answered with one datagram.

⚠️ **The bus INDEX is not confirmed.** `Bus.control(srv, 7)` at `:323` is the
only control-bus allocation in the whole startup path — `run-pappus.scd`
allocates `Bus.new(\audio, …)` by explicit index and `Buffer.alloc` — so it
should be **index 0**. ✅ I read `/c_getn 0 8` and got eight exact zeros, which
is consistent with mbus-at-0-and-silent and equally consistent with
mbus-somewhere-else: the board has nothing playing, so every `Amplitude` of
silence is 0 and `mt2` is `DC.kr(0)` by construction. **The measurement that
settles it costs one sound**: play anything, read `/c_getn 0 7`, and the
non-zero entries that track it are mbus. The negative control is `/c_getn 7 7`,
which must stay at zero. Do that before writing a line of follower code —
reading the wrong seven busses gives a follower that never moves, which reads as
a broken follower rather than a wrong index.

### 2.2 ⚠️ WHAT `mbus` DOES NOT CONTAIN, AND IT IS THE ONE UPSTREAM CALLS MOST MUSICAL

Upstream's follower offers **OUT / GS1 / GS2 / IN L+R / LEFT / RIGHT** and its
own comment picks the input: *"the most musical source in the box"*. `mbus`
gives OUT (`mt6`, `mt7`), GS1 (`mt1`), GS2 (dead here) and three chain points.
**It does not give IN.** Nothing in the engine meters `in`, which is
`LeakDC.ar([In.ar(inbusl,1), In.ar(inbusr,1)])` at `:518`, on hardware busses 2
and 3 (`run-pappus.scd`, `context.in_b`).

That is exactly the difference between the board and `radio`. In the tab the
follower's source is a **live radio station** and the whole gesture is *the
station plays the granulator*. On the board the closest available source is the
granulator's own output.

Three ways to get the input, ranked:

1. **Do without it for v1 and use `mt1`.** GS1 tracks the input closely at a
   fixed grain density, it costs nothing, and it is honest as long as the page
   says which signal is driving the movement.
2. **A separate listener SynthDef** — `Out.kr(bus, Amplitude.kr((In.ar(2)+In.ar(3))*0.5, 0.01, 0.2))`,
   four UGens, added by `run-pappus.scd` beside `PosSource.add`, `addToHead`.
   `Engine_Pappus.sc` is untouched, which is the whole point. Costs a restart of
   the audio stack and one more thing that can fail to load.
   ⚠️ Read `run-pappus.scd`'s own `addToHead` comment first: a node ordering
   mistake here is silent.
3. **Node measures it itself.** The board already captures audio for the relay;
   an rms per frame is nearly free in `board.mjs`. ⚠️ But that measures what is
   being SENT, which is the instrument's output after the insert — not the
   granulator's input — so it is a third signal, not the one wanted. Rejected
   unless somebody wants it for its own sake.

### 2.3 🔴 A FOLLOWER ON THE OUTPUT IS A FEEDBACK LOOP, AND IT HAS TO BE SAID OUT LOUD

`mt1` follows the granulator's output. Route it to a destination that changes
the granulator's level — `probs`, `gates`, `sos`, `rate` — and you have closed a
loop with a 0.2 s release in it and 21.3 ms of transport delay. It will either
pump or run away, and both read as "the modulation sounds wrong" rather than as
"the modulation is a feedback loop".

Upstream's OUT source has the same property and ships anyway, so this is not
disqualifying. The rules that make it safe:

- a follower on `mt1` may modulate **timbre and position** — `size`, `contour`,
  `spray`, `swarm`, `scan`, `strum`, `wow`;
- it may **not** modulate `probs`, `gates`, `sos`, `rate` or `amp`;
- and `pappus-mod.mjs`'s `setRoutes()` already refuses an unknown source with a
  `warn` and a `dropped` count — the same mechanism can refuse a forbidden
  PAIRING, in one table, on the board, where a patch from a page cannot get past
  it.

### 2.4 Cost, and the one detail that would double-smooth

At the modulator's 25 Hz: one `/c_getn` out and one `/c_setn` back, 50
datagrams a second on loopback, each ~64 bytes. Against `DRIFT`'s existing 96
writes a second that is nothing. The value is up to **21.3 ms + 14 ms** old
(✅ both measured), which against a 0.2 s release is a rounding error.

⚠️ **`mt1` is already an envelope, so do not put it through a second one.**
`createEnvFollower` applies its own attack/release; feeding an already-followed
value in double-smooths it and the follower stops following. The file handles
this without a change: `const k = t > 0 ? 1 - Math.exp(-dt/t) : 1` — so
`createEnvFollower({ attack: 0, release: 0, sens: N })` is a pass-through with
gain, which is what the board wants.

⚠️ **And `sens` must be measured, not copied.** Upstream's 6 is calibrated for a
raw rms. `Amplitude.kr` on this chain has never been read. `pappus-mod-test.mjs`
already records what happens when it is wrong — *"an rms of 0.5 pins the
follower at its ceiling, where it is no longer a follower and every later
reading is the same number"*. Read `mbus` for thirty seconds of real material,
take the 90th percentile, and set `sens = 1/p90`.

---

## 3 · Which rung, and what it opens and shuts

### 3.1 TINY, and the destination table follows from it

Established in §0.1 by three readings. What that means for a destination list,
with citations (the full table is `plans/plan-radio-sound.md §1`, and it is correct as
of this reading):

**Alive on TINY, and safe to modulate** — all inside `mkgrain` or COLOUR, both of
which every rung builds:

`mrate` `msize` `mscan` `mspray` `mswarm` `mstrum` `mtilt` `mdelay`
`mwinstart` `mwinend` `mephase` `mcontour` (integer, `:726`) · `probs` `gates`
`pitches` (8 each) · `kwow` (`:1882`) `drive` `crush` `noise` · `rverb` `rtime`
· `swet` `sfb` `scycle`.

**Dead on TINY — a value goes in, the command answers, nothing happens**:

- every `n…` control and `gates2`/`probs2`/`pitches2` — `graw2 = if(lite) { DC.ar([0,0]) }` (`:1013`), and TINY implies LITE (`:218`);
- the entire RESONATOR — `fmodal = if(tiny) { DC.ar([0,0]) }` (`:1312`), strings behind `if(tiny.not)` (`:1361`), so `pwet` `pfrq` `pamp` `pdamp` `pbright` `pstruct` `ppos` `pmodel` `pgrain` `pgraintype` are inert;
- the shimmer — `rshifted = if(tiny) { DC.ar(0) }` (`:2050`);
- delay taps 4…7 — `(if(tiny) { 4 } { 8 }).do` (`:1515`).

🔴 **So the modulator writes `m…` and the globals, and never `n…`.** That is
`radio`'s `MOD_CMD` argument applied to the board, and §0.4 measured the
board getting it wrong today: 48 messages a second into `DC.ar([0,0])`.

🔴 **AND A COMPILED-OUT CONTROL READS BACK PERFECTLY, WHICH IS WHY §4 NEEDS
MORE THAN A READ-BACK.** ✅ MEASURED, on this TINY board, right now:

```
/s_getn 1001 gates2 8  →  /n_setn 1001 gates2 8 [1,0,0,0,0,0,0,0]
/s_getn 1001 probs2 8  →  /n_setn 1001 probs2 8 [1,1,1,1,1,1,1,1]
/s_get  1001 nscan nrate pwet rshimmer
                       →  /n_set 1001 nscan 0.382 nrate 1.4 pwet 0 rshimmer 0
```

Every one of those drives nothing — `graw2` is `DC.ar([0,0])` (`:1013`),
`fmodal` is `DC.ar([0,0])` (`:1312`), `rshifted` is `DC.ar(0)` (`:2050`). The
control exists, takes a value, answers the question and makes no sound. **So
`/s_get` and `/g_queryTree` can prove DELIVERY and can never prove EFFECT**, and
any check that stops at a read-back would pass on a routing aimed at a stage
that was compiled away seven seconds before `PAPPUS READY` printed. That is what
§4.2's fourth instrument — the grain reports — is for, and it is why §4.3's
first sabotage is the rung guard.

⚠️ **If the rung ever moves back to LITE or FULL this section changes and
nothing will say so.** `/etc/default/positron-board` carries a 🔴 warning against
exactly that because `/grains/` depends on TINY. The modulator should not read
the rung from a config file it cannot see — it should ask. There is no command
that answers, which is §8's second open question.

### 3.2 A destination the board has and the tab does not

None. Same rung, same graph, same md5 — that is the point of TINY and it is why
the spec table in `radio`'s `startModulator()` transplants unchanged.

⚠️ With one exception in the other direction: `demo/shell/pappus.mjs:54`, inside
`bufferPlan()`, allocates loop buffers 5…9 and never fills them, so `noisetype ≥
4` is silent **in a tab** and real on the board, where they are `.wav` files.
A shared patch table that modulates `noisetype` would be modulating a live
control on the board and an inert one in the tab. Do not modulate `noisetype`.

---

## 4 · How it is measured

### 4.1 🔴 `/s_get` CANNOT GRADE A MAPPED CONTROL, AND `/g_queryTree` CAN

The browser grades its patches by reading controls back with `/s_get` from
inside the graph, held and moving. That works on the board — ✅ MEASURED,
`/s_get 1001 mrate` → `/n_set 1001 mrate 2.2`, one datagram. It keeps working
under Route A, because Route A never maps anything.

For the record, and because it decides Route B if anybody re-opens it:

- **What `/s_get` returns for a mapped control is UNVERIFIED here.** The Server
  Command Reference says only *"replies to sender with the corresponding
  `/n_set` command"*, and my reading of `Graph_Get` is that it reads the scalar
  slot — which after a map is a **stale number that looks exactly like a
  working read-back**. That is the worst available shape and it is why no
  check should be built on it.
- **`/g_queryTree` with the controls flag reports the mapping, and it is the
  only read that does.** The Server Command Reference's `/g_queryTree.reply`
  format gives each control as *"float or symbol — value or control bus mapping
  symbol (e.g. `c1`)"*. ⚠️ **That half is quoted from the specification and was
  NOT seen here** — nothing on this board is mapped, so no symbol came back.
  ✅ What WAS measured is the rest of the shape: `/g_queryTree 1000 1` answers
  in **one datagram of 3,608 bytes** carrying all **281** pappus controls by
  name with their values, `[flag, group, nChildren, 1004, -1, "posSource", 16,
  …, 1001, -1, "pappus", 281, "t_sync", 0, "report", 0, …]`. One question, one
  answer, every control.

**So the replacement measurement, whichever route wins, is `/g_queryTree 1000 1`
— it is one datagram, it grades every control at once, and it is the only read
that can tell a value from a mapping.**

### 4.2 The three measurements, and what each one cannot see

A modulator is graded by three different instruments because no one of them can
see the whole thing:

| what | how | what it CANNOT see |
|---|---|---|
| **the arithmetic** | `node demo/shell/pappus-mod-test.mjs`, 22 green, no board | whether anything reached the engine |
| **delivery, held** | `hold(true)`, then `/g_queryTree 1000 1` — every destination must equal its base | whether it moves |
| **movement, running** | `hold(false)`, `/g_queryTree 1000 1` five times three seconds apart — the destinations must move and the non-destinations must not | whether the movement is the SHAPE that was asked for |

The third row is exactly the measurement in §0.4, and `mrate` sitting at 2.2
while six others walked is the control that makes it evidence rather than a
reading. **Every movement check needs a stationary control in the same
datagram**, or it cannot tell modulation from drift, jitter or a fault.

🔴 **And `hold()` is not decoration — it is what makes the first two rows
separable.** `pappus-mod.mjs` says why in its own header, with the measurement:
*"`msize 2.4448649883270264 not 1.8`, which is the modulator working and the
assert asking the wrong question."*

⚠️ **A fourth instrument is already on the board and nobody is using it.** The
per-grain `/pgrain` reports (`:849`, `run-pappus.scd`'s 250 ms batcher,
`pappus.mjs:603`) are the only measurement that sees what the granulator
actually DID rather than what it holds. A modulation on `probs` or `gates` must
change the reported grain rate arithmetically — `mrate × open gates × mean
probs` — and that is a prediction a check can assert on without a microphone.
`plans/plan-radio-sound.md §① and §⑥` derive the same arithmetic for the tab.

### 4.3 Prove the guard fires — four ways to break it on purpose

1. **The rung guard.** Set a routing onto `nscan` (dead on TINY, `:1013`). The
   modulator must REFUSE it with a named reason, not send it. Sabotage the
   refusal and the routing must appear in `/g_queryTree` as a moving `nscan`
   that makes no sound — which is the failure being prevented, visible.
2. **The floor guard (§6).** Set `{dest:'sos', amt: 0.9}` with a base of 0.65.
   With the floor in, `msos` must never read below 0.62 over a full cycle of the
   source; take the floor out and it must dip. Both arms, or the check is
   passing on a machine that cannot dip.
3. **The follower.** Feed the follower a constant and every follower-driven
   destination must go still while LFO-driven ones keep moving. That separates
   "the follower is wired" from "the follower is stuck at its ceiling", which
   `pappus-mod-test.mjs` records as a real defect that already happened once.
4. **The bus index (§2.1).** Point the `/c_getn` at bus 7 instead of 0 and every
   follower must go dead. If it does not, the followers were never reading the
   bus.

⚠️ And `cmd | tail` reports `tail`'s exit status, not `cmd`'s.

---

## 5 · What reaches the page

### 5.1 ⚠️ It is not `/keys/` — the granulator's surface is `/grains/`

Worth saying plainly because the brief says `/keys/`. `rig/board/listen.html` — the
page deployed at <https://positron.studio/keys/> — is the INSTRUMENT page. Its
only granulator control is the `fx.pappus` insert switch (`:601`, `:648`), and
its own comment says the granulator *"has its own page now"* (`:487`).

The page with the granulator surface is `demo/grains/index.html`, deployed at
<https://positron.studio/grains/>: `params.set {cmd, args}` per knob (`:951`,
`:956`), `params.drift {on:true}` (`:629`), `grain.report {on:true}` (`:635`),
`params.state` as its poll (`:1412`). **That is the page a modulation has to
reach and report to**, and `/keys/` needs nothing except not to be surprised.

### 5.2 What goes down: a patch name — and the routes behind it

Two candidates, and the answer is both, in that order:

**`params.patch {name}` — a NAME, and the board owns the table.** This is the
right primary verb and it follows `/grains/`'s own argument, quoted in
`plans/plan-radio-patches.md §2.1`: *"The page used to hand you a random number and
nine sliders and call that a choice."* A patch is a place and a motion, and both
halves belong to the same object. A name is one small message, it survives a
page that closed, and — the decisive reason — **the board can keep playing it
unattended**, which is the whole of `plan-hardware §8.7` and the reason `DRIFT`
lives in the box rather than in a tab.

**`params.mod {routes}` — the routes themselves, as the measurement surface.**
For the same reason `params.set` exists beside `params.random`: *"This is the
MEASUREMENT surface, not a control surface: it is what lets a harness sweep one
parameter and grade the sound"* (`board.mjs:1064`). A harness has to be able to
send one routing and watch one control.

Two rules the existing verbs already establish and this must follow:

- ⚠️ **It must go through `pappus().send`, NOT `pappus().set`.** `set()`
  re-centres the drift (`pappus.mjs:578`), and its comment at `:572` says why:
  *"a `send` that re-centred would feed the drift its own output back and
  integrate."* The modulator's ticks are `send`; only the BASE is `set`. Getting
  this backwards produces a sound that walks away from its patch — slowly,
  plausibly, and with every readout still correct.
- ⚠️ **`params.mod` must not switch anything on**, for the same reason
  `fx.space` refuses to: *"A page with four sliders would otherwise insert a
  reverb the first time anyone touched one."*

### 5.3 What comes back

The board should report **what is moving, not how it is moving**. Three fields
on `params.state`, which `/grains/` already polls:

```
mod: {
  on:      true,
  patch:   'slow tide',            // or null when routes were sent directly
  moving:  ['size','scan','swarm'],// modulator.moving() — already exists
  routes:  3,
  sends:   1284,  skipped: 9017,   // modulator.stats() — already exists
  env:     { rms: 0.31 },          // follower values, already in stats()
  source:  'mt1'                   // WHICH signal drives the follower (§2.2)
}
```

`moving()` and `stats()` are already on `createModulator` and need no new code.
`source` is the one new field and it is the one that stops a reader assuming the
board's follower hears what the tab's follower hears.

🔴 **A count on this side of the wire is not evidence about the far side**, and
`board.mjs:1053` already says so about `notes`. `sends` is what the box sent.
What the ENGINE holds comes from `/g_queryTree 1000 1` (§4.1), and if the page
is to be told anything graded, that is where it comes from.

🔴 **AND IT IS PULLED, NOT PUSHED.** A 25 Hz feed of moving values would be a
live sentence — `CLAUDE.md`'s *"NOTHING THAT REDRAWS EVERY FRAME MAY CHANGE HOW
MUCH ROOM IT TAKES"* — and `/grains/` would have to draw it. One `moving` count
in a readout cell, updated when a patch changes, is the whole of what a page
needs. `radio` already does exactly this: `d.set('moving',
modulator.moving().length || '')`.

### 5.4 ✅ What the relay will carry — measured, and CLAUDE.md is stale

```
GET https://ws.positron.studio/room/studio-1/stats     2026-09-14 ~21:25 UTC
{"sockets":1,"sinceWakeMs":2713217,"relayedSinceWake":17261,"droppedSinceWake":0,
 "closedForAbuseSinceWake":0,"evictedIdleSinceWake":0,"idleMs":[20],
 "limits":{"maxBytes":1024000,"maxSockets":128,"bytesPerSec":8388608,"msgPerSec":1000}}
```

⚠️ **`msgPerSec` is 1000, not 60.** `workers/relay/src/index.js:81` reads
`const MSG_PER_SEC = 1000; // was 60 — one knob turn is ~60/s on its own`, and
the deployed worker agrees. Several comments in this repo — including
`run-pappus.scd`'s grain batcher and `pappus.mjs:658` — still reason from 60,
and `CLAUDE.md` still states it. **They are not wrong to batch**, but nobody
should decide against a feature on the 60 figure again without re-reading
`/stats`.

Also measured: `studio-1` had **one socket** (the board), 0 dropped since wake,
0 closed for abuse. The room is clean — which is worth recording, because a full
room on this relay is a silent outage and a redeploy does not clear it.

---

## 6 · What can go wrong unattended

The board is a service that dials out on boot and runs with nobody watching.
`Restart=always`, `StartLimitIntervalSec=0`, and the unit file's own comment:
*"Nobody is in that room."* A modulator that wanders a control into a bad region
is a silent outage, and the regions are known.

### 6.1 The floors, with citations

| control | the edge | what it sounds like | citation |
|---|---|---|---|
| `msos` | below **0.6** the grain/raw crossfade opens | the granulator fades out and hands back the raw input — an **equal-power** fade, `sin`/`cos` of `sxf·π/2`, so it is a leak before it is a switch | `:980–983` |
| `gates` | **all zero** is total silence | ✅ MEASURED in `CHAIN.md`: `rms 0.000000, 0.0 grains/s (299 frames)` against `0.016037, 1.5 grains/s` with one gate open | `:804` |
| `melen` | **≤ 1** makes `% 1` = 0 | only slot 0 is ever read; if that bit is a 0 the granulator never fires. ✅ MEASURED: **30.5 % of old rolls gated both granulators off** | `:707`, `:802`, `pappus.mjs:255` |
| `msrc` | **1 is OFF, and it ERASES** | looks like a freeze and is the erase: `sosin = 0` but `sosret = 0.63`, so the buffer fades to silence over a few passes while every status reply says the granulator is fine | `:638–646`, LESSONS #46 |
| the modes | `Select` indices, **one-based** except `contour` | `Select.ar(mscanmode − 1, …)` over four elements: 0 indexes −1. A mode is an edge, not a position | `:719`, `:726`, `pappus.mjs:24` |
| `mrate` | **0** is no trigger | a granulator that never fires, with every control still reading correctly | `:756` |

🔴 **AND THE BOARD IS SITTING ON ONE OF THESE RIGHT NOW.** ✅ MEASURED: `msos`
read **0.574 … 0.593** across §0.4's five samples. `DRIFT`'s `sos` entry is
excursion 0.06 over a `PARAMS` range of `[0, 0.7]` (`pappus.mjs:385`,
`pappus.mjs:134`) — a span of **±0.042** — so from a centre near 0.594 the drift
walks `msos` **0.552 … 0.636**, across the 0.6 threshold, four times an hour,
unattended.

⚠️ It is inaudible today only because `mlock` is **1** and `:980` takes
`msos.max(mlock)`, which pins `sxf` at 1. **Unfreeze the buffer and the board's
existing drift starts crossfading the granulator against its own raw input.** At
`msos 0.552` that is `sxf 0.92`, `cos(0.92·π/2) = 0.125` — about an eighth of
the raw signal leaking through. Small, and it is the kind of small that gets
blamed on the material. `radio` already fixed this for the tab by putting
the floor in the SPEC (`sos: { min: 0.62, max: 1 }`) rather than in a comment.

### 6.2 Who enforces them, and it must be the board

**The floor goes in the spec table, on the board, and nowhere else.** Three
reasons, in order:

1. `pappus-mod.mjs` clamps to the spec by construction — `s.map(s.unmap(base) +
   d)` runs through `clamp01`, and `pappus-mod-test.mjs` asserts it: *"a
   modulation cannot push a control past its own ends"*. So a floor in the spec
   is enforced by code that is already 22-green.
2. A floor in the PAGE is a floor a different page does not have, and
   `params.set` is a tokenless verb — *"anyone in the room can send it"*
   (`board.mjs:1067–1069`).
3. A floor in a comment is not a floor.

Two things the spec cannot do, which need their own guards in `board.mjs`:

- **`gates` all-zero.** A per-element clamp cannot prevent it — every element
  can be legally 0. The guard is a SUM: if the eight would sum below a
  threshold, force slot 0 to 1, the way `rollChain`'s `least()` already forces a
  euclid pattern to fire (`pappus.mjs:234`).
- **Integers.** `melen`, `mcontour` and the four modes are `quant: 1`
  destinations at best and should not be modulated at all in v1. `DRIFT` already
  refuses them and says why — *"a mode is an edge, not a position; crossing one
  mid-note is a click, not a movement"* (`pappus.mjs:366–368`).

### 6.3 🔴 TWO MOVERS ON ONE CONTROL, AND ONE OF THEM IS ALREADY THERE

`DRIFT` writes `mscan` `mspray` `mswarm` `mtilt` `msize` `msos` at 8 Hz,
unconditionally, with no dead-band, and `params.random` turns it on
(`board.mjs:942`). ✅ It is running now. A 25 Hz modulator on any of those six
would be overwritten eight times a second by a slower sine nobody asked for —
and the symptom is not silence, it is **a modulation that is subtly the wrong
shape**, which is indistinguishable from a modulator that is merely bad.

This has already cost a measurement run once, on this exact mechanism:
`board.mjs:930–938` records `pappus-live.mjs` switching the drift off, rolling ten
seeds, and taking every capture believing nothing was moving — *"which is why
two DIFFERENT seeds measured ten times closer together than one seed measured to
itself."*

**The repair is not arbitration, it is subsumption.** `DRIFT` is six
destinations × two sines at `p` and `p·φ`, summed and halved. `createModulator`
adds two routings on one destination in the control's own space. So `DRIFT`
becomes **twelve routings** in the modulator's own vocabulary, with the same
periods and the same excursions, and then there is one mover:

```js
// pappus.mjs DRIFT, as routes. Two sines per destination at p and p·φ,
// amt halved so the pair sums to the old excursion. `size` needs no special
// case: an exp spec makes the offset a ratio, which is what DRIFT_RELATIVE was.
['scan', 0.22, 181.3], ['spray', 0.08, 97.7], … →
  { src:'lfo', shape:'sine', hz: 1/181.3,       dest:'scan', amt: … },
  { src:'lfo', shape:'sine', hz: 1/(181.3*PHI), dest:'scan', amt: … },
```

⚠️ **The excursions do not transplant directly.** `DRIFT`'s span is a fraction
of the `PARAMS` range (`pappus.mjs:432`); the modulator's `amt` is a fraction of
the SPEC lane and is **cubed** (`taper()`). Compute the `amt` that reproduces
each old excursion and assert it — a drift that silently got three times wider
because a cube was forgotten is the failure this note exists to prevent.

⚠️ And the `PARAMS` ranges and `radio`'s spec ranges **disagree**: `size` is
`[0.02, 0.4]` on the board and `[0.002, 4]` in the tab; `rate` is `[0.5, 24]`
against `[0.1, 100]`; `spray` is `[0, 0.6]` against `[0, 1]`. Both are defensible
— one is a die's playable range, the other is the engine's own — but **a
modulation means a different thing in each**, and one table has to win. Open
question §8.1.

### 6.4 The dead-man's switch

Three, and each catches something the others cannot:

1. **A floor on the sound, not on the controls.** `mt1` is already on the bus and
   already being read. If it stays at 0 for N seconds while `gates` are open and
   `mrate > 0`, the board should put every destination back on its base
   (`hold(true)` does exactly this) and say so in the log. A modulator that has
   walked the instrument into silence cannot detect that from its own numbers.
2. **A ceiling on the routes.** A patch arriving over a tokenless relay with 200
   routings is a denial of service on sclang. Cap it, refuse out loud, and count
   the refusals — `setRoutes` already has `st.dropped` and a `warn`.
3. **An expiry, like `grain.report` has.** `board.mjs:969` keeps shipping grains
   for `GRAIN_TTL` after the last request because *"a board still shouting at an
   empty room a week later is the shape of failure this avoids."* ⚠️ The
   modulator is the OPPOSITE case and should NOT expire — the board moving on
   its own with nobody connected is the feature. But `params.mod` sent by a
   harness for a sweep should, or a measurement run leaves the board modulating
   for a week.

---

## 7 · What I would build, in order

**Session one — read before write, and the reads are all safe.**

0. **Find `mbus`.** Play anything, `/c_getn 0 7`, confirm the seven move; negative
   control `/c_getn 7 7` must stay at zero (§2.1). Everything downstream is
   built on this index and the board is silent, so it cannot be inferred.
1. **A read-only measurement module in `rig/board/`** — one UDP socket to
   127.0.0.1:57110, `/g_queryTree 1000 1` and `/c_getn`. ✅ Both are already
   proved to work from a second client under `-l 1`. This is the instrument for
   everything after it, and building it first is what stops §4's checks being
   written against an instrument nobody has checked.
2. **Settle `/n_set` versus `/n_map` on purpose**, even though Route A does not
   need it: map one control, `/n_set` it, read `/g_queryTree 1000 1`, and record
   whether the reply shows `c<N>` or a float. It is ten lines and it closes the
   only question in §1 that is reasoned rather than measured. ⚠️ It is a write —
   do it when somebody is watching the board, not from a background agent.

**Session two — the modulator, replacing the drift.**

3. **`import { createModulator } from '../../demo/shell/pappus-mod.mjs'` into
   `rig/board/pappus.mjs`**, ticking at 25 Hz through `send` (never `set`), with a
   spec table that is the board's `PARAMS` reconciled against `radio`'s
   (§6.3), `m…` destinations only (§3.1), and the floors in the spec (§6.2).
4. **Port `DRIFT` to twelve routings and delete `driftValues`.** Assert the new
   excursions equal the old ones before deleting anything. Keep
   `driftStats()`'s shape, because `/grains/` reads it.
5. **The follower on `mbus[0]`**, pass-through mode, `sens` measured (§2.4), and
   the forbidden-destination table from §2.3.

**Session three — the page.**

6. `params.mod` and `params.patch` on `board.mjs`, the `mod:` block on
   `params.state` (§5.3), and one readout cell on `/grains/`.

**Not in the plan at all:** a modulator SynthDef, an edit to `Engine_Pappus.sc`,
and any change to `run-pappus.scd` other than the optional input listener in
§2.2 option 2 — which is its own decision and should not ride along.

---

## 8 · Open questions

### 8.1 🔴 Which range table wins — and it is a real fork, not a detail

`rig/board/pappus.mjs:125` `PARAMS` and `demo/radio/index.html`'s
`startModulator()` specs are **two authorities on one number** today, and they
disagree by more than an order of magnitude on `size` (`[0.02, 0.4]` against
`[0.002, 4]`). Because a modulation is applied in the control's warped space,
the SAME routing means a different gesture in each. One table has to move to
`demo/shell/` and both ends import it — which is `plan-twins`' subject and
`pappus.mjs:37`'s own rule — but the two ranges exist for different reasons (a
die's playable band against the engine's full lane) and merging them is a
judgement, not a mechanical edit. **This is the biggest unresolved thing in this
file.**

### 8.2 There is no verb that says which rung the board is on

§3 is entirely rung-dependent and the only honest source is an environment
variable inside a process. `Engine_Pappus.sc:2280` already registers a `rung`
poll — 0 FULL, 1 LITE, 2 TINY, 3 BARE — and `addPoll` is a **no-op** in this
board's `CroneEngine.sc` stub, so it has never fired. Either give it a command
(a one-line `addCommand` that sends the number to `~boxOut`), or have node infer
it — but §3.1 measured `/s_getn 1001 gates2 8` answering normally on a rung
where `gates2` drives `DC.ar([0,0])`, so **the control existing proves nothing**
and the graph behind it is what differs. Inference would have to be acoustic,
which is worse than a command. ✅ `CroneEngine.sc:45` confirmed: `addPoll`
stores the function in a dictionary and nothing ever calls it.

### 8.3 What does the follower hear, and is `mt1` honest enough?

§2.2 is the one place the board genuinely cannot do what the tab does. The tab's
follower hears a radio station; the board's would hear the granulator's own
output, through a loop (§2.3). The listener SynthDef in §2.2 option 2 fixes it
for four UGens and a restart. **Nobody has heard either, and this is a question
about music that no amount of reading settles.** It should be decided by playing
both, not by this document.

### 8.4 Smaller, but named so they are not forgotten

- **`/notify` under `-l 1` is untested** and is the one call that could displace
  sclang's reply registration and break `/pos/confirm`. Do not send it casually.
- **The 21.3 ms quantisation is reasoned, not measured** — it follows from
  `jackd -p 1024` and is consistent with the 14 ms p50 `/s_get` round trip, but
  nobody has written a control and timed its arrival.
- **`jackd` is on the `dummy` backend.** Every CPU and timing number here is from
  a board with no card attached. Re-measure after one is.
- **`-C 1` in the scsynth argv** is not in that binary's own `-h` output and is
  not the control-bus count (✅ bus 15000 reads fine). Harmless as far as anything
  here depends on it, but unexplained.
