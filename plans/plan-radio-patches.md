# plan-radio-patches — a patch selector for `/radio/`, and where its sound went

> ✅ **§2 IS BUILT (2026-09-14). §0.3 IS NOT, ON PURPOSE. §3 IS NOT.**
> Read this before the body, which is still written as a proposal throughout.
>
> **Built:** the six patches of §2, as a `createPicker` row in
> `demo/radio/index.html`, replacing both the `material` and the `chord`
> choice rows. 33/33 green (`node demo/verify.mjs radio`), up from 31/31 —
> the two new checks read the patch back off scsynth with `/s_get`, `/s_getn`
> and `/b_getn`, and both were proved by sabotage rather than by passing.
>
> **Not built, and the decision is recorded rather than deferred:** §0.3's
> `mbuflen 60`. Its diagnosis is right and is honoured — every patch holds the
> buffer at the ONE length this page records, so none can open onto a hole — but
> the value is **8, not 60**. At 60 the ring takes a full minute to fill before
> the granulator sounds like itself, and this page holds every assert to one
> burst at the end, so the burst would land outside `verify.mjs`'s 30 s
> first-assert ceiling and the page would report **nothing** while working. The
> long comment above `PATCHES` in the page carries the arithmetic and what the
> shorter buffer costs. §3's measurement gate is untouched.
>
> **Corrected while building — the numbers below were never run:**
> · **The names are shorter**, because a picker cell is 13 characters wide:
> `slow tide` · `stutter` · `held still` · `backwards` · `roof rain` ·
> `piled up`.
> · **`slow tide` carries the seventh chord `[0, 4, 7, 10]`.** Every chord in
> §2 is root-and-fifth in octaves — not one has a third or a seventh — so
> absorbing the `chord` row as written would have deleted the one sound the
> owner named and liked.
> · **Every scan, spray and size is recomputed for an 8-second buffer.**
> `stutter`'s `mspray 0.012` becomes **0.09** for the same ±180 ms (spray is a
> fraction of the WINDOW); `held still`'s window becomes `0.30 … 0.70` of eight
> rather than `0.35 … 0.40` of sixty, and its `mscan` **0.36** rather than 0.55,
> since `speed = winspan × (3·mscan − 1)` and the plan's value gave 0.26× where
> it claimed 0.03×. Grain lengths cap at 2.6 s, not 6.
> · **`noisetype` DUST is 3.** `Select.ar((noisetype−1).clip(0,2), [white,
> pink, dust])` (`Engine_Pappus.sc:1784`); the plan named the mode and never the
> number.
> · **`mtilt` is baked into the RECORDING** (`:617–621`, the shelves sit on
> `capl`/`capr` before `BufWr`), so it reaches only audio recorded after the
> press — and under `mlock 1` it is inert entirely. Nothing in §2 says so.
> · **`sfb`, `rtime` and `msos` are moderated** (feedback ≤ 0.50, reverb ≤ 0.72,
> `piled up` at `msos 0.90` with `ingain 0.70` rather than 0.95 at 1.0), because
> the write clips at ±1 and none of this had been heard.
> · **Probabilities below 1 make the grain rate stochastic**, so the patch this
> page OPENS on has `probs` all ones — otherwise its own arithmetic assert
> flaps. The other five thin freely.

Live page today: <https://positron.studio/radio/?decode=1>

Companion: `plans/plan-radio-sound.md` ranks fourteen individual ideas with the same
engine citations. This file does not repeat it. What is new here is (1) the
upstream Lua, mined, (2) six finished patches rather than fourteen loose
controls, and (3) an answer to "can interestingness be measured".

---

## 0 · The diagnosis, before any proposal — the page has never left the granulator

**Every engine control `/radio/` has ever written, in full.** From
`applyAudibleDefaults` (`demo/shell/pappus.mjs:165–181`) and the seven `setBoth` /
`setParam` call sites in `demo/radio/index.html` (lines 1270, 1271, 1277,
1279, 1288, 1289, 1423):

| written | value |
|---|---|
| `mscanmode` `nscanmode` | 2 (POSITION) in music, 3 (DELAY SYNC) in speech |
| `msrc` `nsrc` | 2 (STEREO) |
| `mlock` `nlock` | 0 |
| `msos` `nsos` | 0.6 |
| `mbuflen` `nbuflen` | 8 |
| `mrate` `nrate` | 8 (music) / 22 (speech) |
| `msize` `nsize` | 0.12 (music) / 0.07 (speech) |
| `mscan` `nscan` *or* `mdelay` `ndelay` | 0.666 / 0.12 × 8 s |
| `mspray` `nspray` | 0 (music) / 0.04 (speech) |
| `gates` `gates2` `probs` `probs2` `pitches` | the chord |
| `amp` `ingain` `run` `report` | 1 |

That is **twenty-nine command names of the one hundred and seven the engine
registers** (`rig/board/norns/README.md`, "Pappus registers 107 commands") — and
**twelve of the twenty-nine are the second granulator's**, which LITE compiled
out (`:1013`, `graw2 = if(lite) { DC.ar([0,0]) }`; TINY implies LITE, `:218`).
**Seventeen live controls.** Everything else is
sitting at the compiled-in default in the `arg` list at
`rig/board/norns/Engine_Pappus.sc:368–483`:

- `swet = 0` — **the four-tap delay is off.**
- `rverb = 0` — **the reverb is off** (`:2061`, `rverb 0` is an honest bypass).
- `drive = 0, crush = 0, noise = 0, kwow = 0` — **the whole COLOUR stage is off.**
- `mswarm = 0` — **no swarm.** `mcontour = 8` — the middle window, never moved.
- `melen = 1` — **no rhythm**; `mstrum = 0` — no stagger.
- `mtilt = 0`, `mwinstart = 0`, `mwinend = 1` — no window, no pre-buffer shaping.
- `pin1 = 0.7` into RESONATOR, **which TINY compiles out** (`:1312`,
  `fmodal = if(tiny) { DC.ar([0,0]) }`), so that feed is a pass-through.

**So what the page makes is bare grains through a compressor.** Nothing in this
file's ideas is exotic; most of it is turning on stages that exist, are
compiled in, are costing CPU every block, and have never been sent a value.

### 0.1 And the read head is nailed down, which is the "wash"

In music mode the page sends `mscanmode 2` (POSITION) with `mscan 0.666`. In
POSITION the read point is a **constant** — `K2A.ar(Lag.kr(mscan, lagt))`,
`Engine_Pappus.sc:721` — while the write head laps the 8-second window
underneath it (`wphase = Phasor.ar(0, …, 0, wlen)`, `:651`). So the material at
the read point changes only because the write head is running over it, with a
period of exactly `mbuflen`, and nothing is steering it.

⚠️ **The ENGINE's own default is not this.** `mscanmode = 1` (STRETCH) with
`mscan = 0.666` (`:400`) gives a read head that moves at `+1×`, tracking the
write head. The page overrode the one control that made the read point move.

### 0.2 The formula that makes STRETCH usable, derived

`scanstretch = Phasor.ar(0, ((mscan*3) - 1) / wlen.max(1), 0, 1)` (`:715–716`)
and `pos = (winlo + ((scanpos + off + gjit).wrap(0,1) * winspan)) * loopfrac`
(`:838–839`). The phasor crosses 0→1 in `mbuflen / (3·mscan − 1)` seconds, and
in that time the read point crosses `winspan × mbuflen` seconds of audio. So:

> **playback speed in STRETCH = `winspan × (3·mscan − 1)`**
> — independent of `mbuflen`.

| `mscan` | `3·mscan − 1` | at `winspan 1` |
|---|---|---|
| 0.000 | −1.00 | reverse, life speed |
| 0.200 | −0.40 | reverse, 0.4× |
| 0.333 | 0.00 | stopped |
| 0.345 | +0.035 | forward, 1/29 of life |
| 0.500 | +0.50 | forward, half speed |
| 0.666 | +1.00 | forward, tracks the write head |
| 1.000 | +2.00 | forward, double |

That table is the psychedelic control, it costs one `/n_set`, and the page has
never sent a value into that mode.

### 0.3 One architectural change that everything below assumes

**Hold `mbuflen` at 60 for every patch and use `mwinstart`/`mwinend` to choose
how much of it is read.**

The ring is allocated at `RING_SECONDS × 48000` = 60 s
(`demo/shell/pappus.mjs:33, 49`). `wlen = (mbuflen × SR).clip(4800, frames)`
(`:650`) is both the RECORD length and the lap length, so a page that has been
running at `mbuflen 8` has only ever written the first 8 s of that 60 s buffer.
**Switching a patch from `mbuflen 8` to `mbuflen 45` hands the granulator 37
seconds of zeros** — silence that looks exactly like a broken engine. Fix
`mbuflen` at 60, always recording, and the window is free to move with no hole.

⚠️ Two consequences, both real:

- **The page must wait a full minute before it sounds like itself on first
  load.** It already waits `BUF_SECONDS` (`index.html:1563`); that wait becomes
  60 s. Worth it, and worth saying on screen.
- 🔴 **In DELAY SYNC and DELAY FREE the window must stay 0…1.**
  `delaypos = (wpos − mdelay/mbuflen).wrap(0,1)` (`:717–718`) is a position in
  the whole lap, and `:838` then folds it into `[winlo, winlo+winspan]` — while
  `BufWr` writes at the un-windowed `wphase` (`:655`). Narrow the window in a
  delay mode and the read head is nowhere near the write head; "0.35 s behind"
  silently becomes something else. Only STRETCH and POSITION may use a window.
- ⚠️ `winhi` is held at `winlo + 0.01` (`:659`), so the narrowest reachable
  window is **0.6 s** at `mbuflen 60`.
- ⚠️ **`BUF_SECONDS` IS READ IN FOUR PLACES AND THEY MUST MOVE TOGETHER.**
  `demo/radio/index.html:138` declares it and it is used at `:278`
  (`grainSeconds`, the picture's width), `:1148`
  (`winPos = p × RING_SECONDS / BUF_SECONDS`, the grain-mark rescale), `:1271`
  (`setBoth('delay', v × BUF_SECONDS)`) and `:1563` (the fill wait). Change one
  and the picture is wrong by a constant, which is the hardest kind to notice —
  `pappus.mjs:22–32` says exactly that about this exact rescale. At
  `BUF_SECONDS 60` the rescale becomes ×1 and the reported positions fill the
  axis honestly for the first time, which is a bonus rather than a cost.
- 🔴 **SPRAY BECOMES SEVEN TIMES COARSER, AND THIS IS THE TRAP IN THE CHANGE.**
  `off = … × mspray × 0.25` (`:814`) is a fraction of the WINDOW, so at
  `mbuflen 8` a spray of 0.10 scattered each grain by ±200 ms and at
  `mbuflen 60` with a full window the same 0.10 scatters it by **±1.5 s** — from
  a smear to a different sentence. Any patch that wants word-scale scatter needs
  a spray around **0.012**, and the page's current 0…1 slider gives that value
  one pixel of travel. The scatter slider needs a curve, or the patch carries
  the value and the slider only nudges.

---

## 1 · The upstream Pappus, mined

Fetched 2026-09-14 from `https://github.com/FoundSoundsMM/Pappus` (the URL in
`rig/board/norns/README.md:13`), at tree `060ea71a51dcbd067e0dc97a162d651b439bf4ff`:
`pappus.lua` (307,897 B, 7,508 lines), `lib/Engine_Pappus.sc` (98,469 B, 2,030
lines), `README.md` (8,268 B). Line numbers below are in that `pappus.lua`.

### 1.1 🔴 IT SHIPS NO PRESETS. NONE. This is the headline and it is a negative.

The whole repository is: `README.md`, `pappus.lua`, `lib/Engine_Pappus.sc`,
five `.wav` files in `audio/`, and 44 files in `test/`. There is no `data/`
directory, no `.pset` file, no preset table in the Lua and no shipped scene
file. I listed every blob in the tree through the GitHub API to be sure.

What it has instead is **SKENI** (`:3611`): eight user snapshot slots plus a
MORPH knob between any two of them, written to `scenes.data` in the script's own
data folder at runtime (`scene_path`, `:3719–3723`). Those are things the owner
saves. They do not exist until somebody makes one, and none was published.

**What this costs the proposal:** there is no authored sound to copy, so nobody
can point at a patch below and say "that is what Michael Manning meant it to
sound like". The demo video the owner remembers is not a parameter source
either — a video has no numbers in it.

**What can be mined instead, and it turns out to be more useful:** the
parameter RANGES, the TAPERS, the derived mappings the engine does not
contain, the handful of non-zero Lua defaults that amount to a shipped starting
patch for the effects, and the entire modulation system. Those are below.

### 1.2 The ranges and tapers — and yes, our sliders are in the wrong place

`norns`' `controlspec.new(min, max, warp, step, default, units)`. Ours is
`createSlider({min, max, step, value})`, always linear.

| control | upstream spec | line | our slider | engine's own clamp |
|---|---|---|---|---|
| grain rate | **0.1 … 100 Hz, `exp`**, default 8 | `:2463` | **0.5 … 40, linear, step 0.5** (`index.html:1456`) | `mrate.max(0.05)` (`:690`); Lua clamps 0.05…200 (`:1329`) |
| grain length | **0.002 … 8 beats, `exp`**, default 0.25 | `:2473` | **0.01 … 1 s, linear** (`index.html:1457`) | `msize.clip(0.002, 8).min(winspansec)` (`:682`) |
| read position | 0 … 1 lin, default **0.666** | `:2483` | 0 … 1 lin ✅ | — |
| scatter | 0 … 1 lin, default 0 | `:2497` | 0 … 1 lin ✅ | offset `× 0.25` of window, pan `× 1` (`:814–817`) |
| buffer | **2 … 60 s, `exp`**, default 8 | `:2569` (`BUFLEN_MIN/MAX` `:45`) | never exposed, fixed 8 | `clip(4800, frames)` = 0.1…60 s (`:650`) |
| shape | −1 … +1 lin → `floor((x+1)·8+0.5)` clamp 0…16 | `:2477–2481` | never exposed | `mcontour.clip(0,16)` (`:726`) |
| swarm | 0 … 1 lin | `:2553` | never exposed | `dupgain = (swarm·3).clip(0,1)` (`:744`) |
| sos | 0 … 1 lin | `:2528` | fixed 0.6 | blend reaches all-grains at 0.6 (`:980–983`) |
| tilt (pre-buffer) | −1 … +1 lin | `:2536` | never exposed | ±12 dB shelves at 700 Hz (`:617–621`) |
| phase / strum | 0 … 1 lin, **sent as `× 0.125`** | `:2612`, `:1770` | never exposed | `.clip(0, 0.125)` (`:756`) |
| euclid density | 0 … 1 lin | `:2543` | never exposed | — |
| euclid length | integer **2 … 16**, default 8 | `:2547` | never exposed | `% melen.max(1)` (`:802`) |
| wow | 0 … 1 lin | `:3012` | never exposed | cubic depth (`:1882`) |
| verb amount / time | 0 … 1 lin each | `:3099`, `:3108` | never exposed | `rdecay` curve (`:1985`) |

🔴 **The owner's guess in the brief is exactly right, and by more than he
guessed.** Upstream's rate knob is **0.1–100 Hz exponential**; ours is
**0.5–40 linear**. Upstream's length knob is **0.002–8 beats exponential** —
at 120 bpm that is **1 ms to 4 seconds**, and at 60 bpm **2 ms to 8 seconds**
(`update_timing`, `:1826`: `msize = clamp(m_size × 60/tempo, 0.002, 8)`);
ours is **10 ms to 1 second linear**. The engine itself will take 2 ms to 8 s
(`:682`). **Our grain-length slider reaches one eighth of the top of the
engine's range and five times its floor**, and because it is linear, half its
travel is spent between 0.5 s and 1 s where almost nothing changes.

⚠️ A linear grain-length slider is also wrong in a way a range change alone
does not fix: the interesting register is 2–200 ms, which is the **first two
percent** of a 0.01–1 linear slider. `slider.mjs` has no warp; either the page
maps the slider value itself (`value ** 3`, or `min·(max/min)**x`) or the patch
selector carries the values and the slider is only for nudging.

### 1.3 The mappings the engine does NOT contain — Lua does this work

Our page talks to the SynthDef directly, so it inherits none of these. Each one
is a real behaviour that is simply absent from `/radio/`:

1. **Grain length is in BEATS upstream.** `msize = m_size × 60/tempo`,
   clamped 0.002…8 seconds (`:1826`). Our page sends seconds. Not a defect —
   there is no transport here — but it is why upstream's "0.25" is 125 ms at
   120 bpm and 250 ms at 60.
2. **Grain rate is a musical division upstream.** `DIVS` (`:156–167`), and
   `grain_hz` (`:1305–1329`) returns `clamp((tempo/60)/d.beats, 0.05, 200)`, or
   `m_rate_free` in FREE. Default is `1/4` — one grain per beat.
3. **The euclidean pattern is generated from a DENSITY knob.** `euclid_kn`
   (`:1732–1738`): `k = clamp(round(density × n), 1, n)`, `n = clamp(round(elen),
   2, 16)`; `euclid_steps` (`:1138–1150`) is a Bresenham/Bjorklund spread that
   returns the 0-based onset steps; `send_euclid` (`:1750–1789`) writes the
   sixteen floats. **Density 0 is a special case** — it writes all ones, sets
   `elen 1` and `ephase 0`, and re-purposes the phase knob as strum.
4. **PHASE is one knob with two jobs** (`:2604–2612`). Euclid off →
   `mstrum = knob × 0.125` (`:1770–1771`). Euclid on → `mstrum = 0` and
   `mephase = round(knob × (n−1))` (`:1740–1743`, `:1780–1783`), so the knob
   rotates the pattern per voice instead of raking the onsets.
5. **The tap layout is computed.** `t.time = cycle × (step+1)/n`,
   `t.lvl = (1/√active) × (1 − 0.35·step/n)`, `t.pan = PAN_BASE[i] × spread`
   with `PAN_BASE = {−1, 1, −0.7, 0.7, −1, 1, −0.45, 0.45}` (`:245`, `:1900–1905`).
   That level law is worth copying verbatim: it normalises for how many taps are
   lit and pushes later taps back, which reads as depth rather than as a row.
6. **Twenty-two scales** (`:178–201`) and a per-voice spread that lays a chord
   onto the chosen scale (`distribute`). Our `CHORDS` table has three hand-typed
   interval lists.

### 1.4 Upstream's non-zero defaults — the closest thing to a shipped patch

Most Lua defaults are 0 and match the SynthDef. **Seven do not**, and together
they are a real, authored starting configuration for the effects chain that our
engine's `arg` list does not carry:

| Lua param | default | line | our engine `arg` | resolves to |
|---|---|---|---|---|
| `s_feedback` | **0.35** | `:2931` | `sfb = 0` | |
| `s_tilt` | **−0.2** | `:2935` | `stilt = 0` | |
| `s_tilt_mode` | **MID** | `:2939` | `stiltxover = 900` | `TILT_XOVER[2] = 650` (`:841`) |
| `s_spread` | **0.5** | `:2919` | — | tap pans ±0.5, ±0.35 |
| `s_euclid` | **0.45** | `:2907` | — | `k = 1+floor(0.45×7.999) = 4` taps of 16 (`:1265–1267`) |
| `s_rate` | **50** | `:2915` | `scycle = 1.0` | ratio `x1` → `60/tempo` = **0.5 s at 120 bpm** |
| `crush_mode` | **BIT+REDUX** | `:2980` | `crushmode = 1` | 3 |

Resolved, upstream's out-of-the-box DELAY is: **4 taps at 0.25 / 0.5 / 0.75 /
1.0 of a 0.5 s cycle — 0.125, 0.25, 0.375, 0.5 s — at levels 0.467, 0.423,
0.380, 0.336, panned −0.5, +0.5, −0.35, +0.35, feedback 0.35, tilted 0.2 down
at 650 Hz, unpitched.** ✅ And **four taps is exactly what TINY builds**
(`:1515`, `(if(tiny) { 4 } { 8 }).do`), so this configuration survives our rung
intact. It is the only authored effects setting upstream publishes and every
patch below starts from its shape.

The one thing it does NOT ship is a reason to hear it: `s_wet` defaults to 0
(`:2952`, *"the delay is an effect you reach for"*).

### 1.5 🔴 The modulation system — this is what makes upstream move, and we have none of it

`MODNI`, `:2026–2350` and `:3019–3074`. What it is, exactly:

- **Eight LFOs** (`NLFO = 8`, `:2026`), **two destinations each** (`LFO_DEST = 2`,
  `:2027`) — sixteen routings — plus **an envelope follower with two more**.
- **Six shapes** (`LFO_SHAPES`, `:2035`): STEP, GLIDE, SINE, TRI, SAW, SQUARE.
  Default SINE (`:3023`). GLIDE is a cosine ease between successive sample-and-
  hold values (`:2205–2207`).
- **Rate is a musical ratio of the transport**, not Hz:
  `lfo_hz(i) = clamp(clock_hz() / RATIOS[knob].r, 0.005, MOD_MAX_HZ)`
  (`:2199–2202`), `MOD_MAX_HZ = 12` (`:2017`), `RATIOS` runs `/64` to `x64`
  (`:218–232`). So **0.005 Hz (200 s) to 12 Hz**.
- **Starting phases are spread round the cycle**: `(i−1)/NLFO` (`:3033`), so
  eight LFOs at one rate are eight different places in one wave.
- **A Turing machine on the sample-and-hold** (`:2054–2075`): sixteen slots on a
  loop; each step rewrites its slot with a fresh random value with probability
  `1 − MACHINE`. At 0 it is free random; at 1 the sixteen values loop for ever;
  in between the pattern drifts one value at a time.
- 🔴 **The amount is CUBED** (`mod_route`, `:2308–2314`:
  `val * amt * amt * math.abs(amt)`), and the comment says why: the amount is a
  fraction of the **whole parameter range**, so 0.2 was already a huge gesture.
  Cubed: 0.2 → 0.008, 0.5 → 0.125, 0.8 → 0.512.
- 🔴 **The offset is normalised in the controlspec's OWN WARPED SPACE**
  (`pval`, `:2172–2186`: `controlspec:map(clamp(controlspec:unmap(base) + d, 0, 1))`).
  On an exponential spec that makes a modulation a constant RATIO, not a
  constant amount — an LFO on grain rate multiplies and divides rather than
  adding and subtracting. This is the single most important design decision in
  the file and it is invisible from the engine.
- **The envelope follower** (`:3049–3070`): one-pole with separate attack
  (0.002–1 s exp, default 0.01) and release (0.02–4 s exp, default 0.35),
  sensitivity 0.5–40× exp default 6, and a SOURCE choice of OUT / GS1 / GS2 /
  IN L+R / LEFT / RIGHT. Its own comment: *"the most musical source in the box"*.
- It runs on its own metro at **60 Hz**, faster than the screen, *"because an
  LFO stepped at the screen's rate is visibly stepped"* (upstream README).
- **Destinations are built from the UI pages, not hand-listed** (`:2131–2152`),
  so nothing can be added to the interface and stay unmodulatable. SIZE, RATE
  and the tap layout are deliberately **excluded from the direct-send path**
  because they need `update_timing`, which is too expensive at 60 Hz — they are
  still modulated, via `pval`, by the readers that recompute them.

🔴 **NONE OF THIS IS IN THE SYNTHDEF, so none of it reaches our tab.** The Lua
half does the modulating and sends `/n_set` sixty times a second. A browser page
could do the same — but this repo's own rule is against it: *"Never let sound
gate the work"*, and more to the point a JavaScript timer driving `/n_set` into
wasm scsynth is a per-frame wire this page does not need and cannot prove
arrived.

### 1.6 ✅ What DOES move on its own, inside the SynthDef

Five sources, all compiled in on TINY, all free, none needing a timer:

| mover | where | period / depth |
|---|---|---|
| **STRETCH read head** | `scanstretch`, `:715–716` | crosses the window in `mbuflen/(3·mscan−1)` s — **1 s to 28 minutes** |
| **SPRAY in WARP mode** | `warpa`/`warpb`, `:783–784` | two `LFNoise2` at `0.3 + spray·3` Hz and `0.2 + spray·2` Hz, rotated per voice; drives read offset and pan |
| **WOW** | `kwd`/`kwf`, `:1882–1888` | two `LFNoise2` at 0.08–0.78 Hz and 4.7/6.1 Hz into a `DelayC` |
| **probability** | `coin`, `:801`, with `frnd` offsets `:257` | one random per trigger, read through a different fixed offset per voice |
| **euclid rotation** | `estep`/`egate`, `:707`, `:802` | `melen` steps, voice `i` offset by `mephase·i` |
| **swarm detune drift** | `:740–744`, `:885` | *"a slow independent drift per duplicate"*, not per-grain random |

**That is the answer to "how do we get upstream's movement without upstream's
Lua": use STRETCH and WARP.** Between them they cover the whole range from a
1-second wobble to a half-hour crawl, and they are two `/n_set` each.

### 1.7 What is dead on TINY

Not re-derived here — `plans/plan-radio-sound.md §1` has the table with citations, and
it is correct as of this reading. In one line: **RESONATOR entirely** (`:1312`,
`:1361`), **the shimmer** (`:2050`), **delay taps 4–7** (`:1515`), **every `n…`
control and `gates2`/`pitches2`/`probs2`** (`:1013`, and TINY implies LITE,
`:218`). Two live-but-misleading ones: `loss` is two cascaded lowpasses on this
rung rather than codec damage (`:1735`), and `noisetype ≥ 4` is silent in a tab
because buffers 5–9 are allocated and never filled
(`demo/shell/pappus.mjs:54` — `for (let i = 5; i <= 9; i++)` allocates them and nothing fills them).

---

## 2 · The patch selector

### 2.1 Form — follow `/grains/`, and the kit already has the control

`demo/grains/index.html:496–570` carries the argument and it is the same
complaint: *"The page used to hand you a random number and nine sliders and call
that a choice — every roll landed in the middle of nine ranges, so they all
sounded like one wash wearing different digits."* A patch there is the whole
sound, and the randomiser picks **between patches**, never between slider
positions.

**Replace both existing choice rows.** `material` (speech / music) and `chord`
(one voice / fifth / seventh) become one **patch** picker. Material is not a
property of the material — it is a granulator setting that happened to be named
after the thing it suits, and the page's own comment admits the station carries
both anyway (`index.html:1193`). The chord is part of a patch.

**Use `createPicker`** (`demo/shell/picker.mjs:74`), not `createChoice`.
`/grains/` already steps six patches with it (`demo/grains/index.html:694–706`):
`‹ | slow tide | ›` plus a die. Six names in one segmented `createChoice` row
will not fit 390 px, and `createPicker`'s cell is fixed-width by design
(*"a control that resizes is a control that moves"*).

Readout is untouched — it stays the four cells `heard · kbps · behind · grains`,
so `mount()`'s even-count throw is not in play.

### 2.2 🔴 A patch writes EVERY field, every time

`/grains/`'s `writePatch` does this and the reason is in this repo three times
over: `gates` all-zero, `msrc 1`, `notes.gate`. A patch that sets only what it
changes inherits whatever the last patch left behind, and every message here is
fire-and-forget. **Every patch below is a complete state.**

### 2.3 Shared by all six — sent on every patch change

```
mbuflen 60            nsrc 1        run 1     amp 1      ingain 1
msrc 2 (STEREO)       nlock 0       fade 1    bypass 0   report 1
mlock 0 (except C)    nsos 0        limceil 0.98855
pin1 0.7   sin1 0   kin1 0   oin1 0        (and pin2/sin2/kin2/oin2 = 0)
mwinstart 0   mwinend 1             (except C)
loss 0                              (a lowpass pair on this rung, not codec damage)
taptimes[4..7] taplevels[4..7] tappans[4..7] tappitch[4..7] = 0   (inert on TINY)
pwet / pfrq / pamp / … / rshimmer / rshimmersemi   — dead on TINY, left alone
```

`pin1 0.7` is upstream's own default (`:2771`) and is the head of the chain:
`presig = (pin × fmix) + (fsum × fsend)` with `fmix = cos(pwet·π/2) = 1` at
`pwet 0` (`:1417–1419`), then `sdry = presig + sin1·grains` (`:1471`),
`dry = ssig + kin1·grains` (`:1583`), `omix = kout + oin1·grains` (`:1905`).
So one feed at the head runs the grains through DELAY → COLOUR → REVERB.
⚠️ There is a `Limiter.ar(presig, −1 dB, 0.05)` at `:1432` — **50 ms of pure
delay** in that path, which matters only if anything is ever sample-aligned
against the dry radio.

### 2.4 Reading the tables

Every patch states the arithmetic its own readout can check:

> **reported grains/s = `mrate` × Σ(gates·probs) × (`k`/`melen`)**

`report` fires once per gated voice per trigger (CHAIN.md, graded 8.00 / 4.00 /
15.99 against the board), the trigger is
`trig × (gates[i] > 0.001) × coin × egate` (`:804`), and `coin` is the
probability (`:801`). **Mean concurrent grains ≈ reported rate × `msize`**, plus
one duplicate `GrainBuf` per grain wherever `dupgain = (mswarm·3).clip(0,1)`
(`:744`) is above zero.

---

### A · **slow tide** — the psychedelic one

| | |
|---|---|
| `mscanmode` `mscan` | **1 (STRETCH)**, 0.30 → speed **−0.10×**, one reverse lap of the minute in **600 s** |
| `mrate` `msize` | 1.2 /s, **2.8 s** |
| `mcontour` | 14 (`p = 0.875`: swells in over seven eighths of the grain, `:330`) |
| `msos` `mlock` | 0.72, 0 |
| `mtilt` | −0.35 (+4.2 dB below / −4.2 dB above 700 Hz, `:617–621`) |
| `mspray` `mspraymode` | 0.55, **3 (WARP)** → drifts at 1.95 Hz and 1.30 Hz (`:783–784`), read offset ±13.75% of the window = ±8.25 s, pan ±0.55 |
| `mswarm` `mswarmmode` | 0.55, **3 (OCT)** → −12/+12, `dupgain` 1, detune spread **0.77 st** (`dsp = 0.55·0.4 + 0.55⁴·6`, `:885`) |
| `mstrum` | 0.06 → voice `i` at `0.06 × (1/1.2) × i` = **50 ms × i** (`:756`) |
| `melen` `mephase` | 1, 0 (no rhythm) |
| `gates` | `[1,1,1,1,0,0,0,0]` |
| `pitches` | `[0, −12, 7, −5, 12, 0,0,0]` |
| `probs` | `[1, 0.8, 0.6, 0.45, 1,1,1,1]` |
| **delay** | `swet` 0.28 · `scycle` 6.0 · `sfb` 0.42 · `stilt` −0.25 · `stiltxover` 650 · `sdiffuse` 0.55 · `shold` 0 |
| `taptimes` | `[1.5, 3.0, 4.5, 6.0, …]` (upstream's `cycle×(step+1)/16` at steps 3/7/11/15) |
| `taplevels` | `[0.467, 0.423, 0.380, 0.336, …]` (upstream's law, `norm = 1/√4`) |
| `tappans` | `[−0.8, 0.8, −0.5, 0.5, …]` (`PAN_BASE × 0.8`) |
| `tappitch` | `[0, 7, 12, −12, …]` semitones |
| **colour** | `drive` 0.18 · `crush` 0 · `crushmode` 1 · `noise` 0.12 · `noisetype` 2 (PINK) · `noisedecay` 0.9 · `noisetone` 900 · `noisedyn` 1.4 · `kwow` **0.35** (depth 1.53 ms, `kwd = 0.35·0.0012 + 0.35³·0.026`, `:1882`) |
| **reverb** | `rverb` 0.42 · `rtime` 0.62 → `rdecay = 0.3 + 0.62^1.6·11.7 + 0.62^20·9988` = **6.4 s** (`:1985`) |
| `mcomp` | 0.20 |
| **predicts** | `1.2 × 2.85 = ` **3.42 grains/s** · ~9.6 concurrent + as many duplicates |

**What you would hear.** A very slow reverse drift through the last minute of
the station, in 2.8-second grains that swell in rather than start. Four
transposed copies, one of them an octave down, each grain doubled at ±12
semitones with three quarters of a semitone of beating. Four echoes at 1.5-second
spacings, two of them pitched, smeared into each other, in a six-second room.

**On speech:** the words are gone at 2.8 s per grain and −0.1× — what is left is
the vowel colour of a human voice, held as a chord. This is the patch that turns
a news bulletin into an organ.
**On music:** the tune's harmony survives because the pitches are real
intervals; the rhythm does not. A tidal drone that is recognisably made of this
station.

**Mechanism.** `scanstretch` (`:715`) is the whole patch; `warpa`/`warpb`
(`:783–784`) keep it from being a straight line; `dupa` (`:902`) and
`dsp` (`:885`) make it wide; `DelayC` on `kwd` (`:1888`) keeps the pitch from
sitting still.

⚠️ `dupa` is level-normalised (`:916`) so **none of the swarm shows up in RMS** —
do not grade this patch on level.

---

### B · **the station, stuttering** — words survive

| | |
|---|---|
| `mscanmode` `mdelay` | **3 (DELAY SYNC)**, 0.35 s behind the write head (`:717`) |
| `mwinstart` `mwinend` | **0, 1 — required**, see §0.3 |
| `mrate` `msize` | 12 /s, 0.075 s |
| `mcontour` | 4 (`p = 0.25`, a soft pluck) |
| `msos` `mlock` | 0.62, 0 |
| `mtilt` | +0.15 |
| `mspray` `mspraymode` | **0.012**, 1 (RANDOM) → ±0.3% of 60 s = **±180 ms**, pan ±0.012 |
| `mswarm` `mswarmmode` | 0.12, 1 (DETUNE) → `dupgain` 0.36, spread **0.049 st** — pure beating |
| `melen` `mephase` `mstrum` | **16**, **3**, **0** (upstream's rule: euclid on ⇒ strum 0, `:1783`) |
| `epattern` (buffer 27) | `E(5,16)` = `[0,0,0,1,0,0,1,0,0,1,0,0,1,0,0,1]` — onsets at steps 3, 6, 9, 12, 15 (`euclid_steps`, `:1138`) |
| `gates` | `[1,1,1,0,0,0,0,0]` |
| `pitches` | `[0, 12, −12, 0,0,0,0,0]` |
| `probs` | `[1, 0.7, 0.55, 1,1,1,1,1]` |
| **delay** | `swet` 0.5 · `scycle` 1.5 · `sfb` 0.5 · `stilt` −0.2 · `stiltxover` 650 · `sdiffuse` 0.2 |
| `taptimes` | `[0.375, 0.75, 1.125, 1.5, …]` |
| `taplevels` | `[0.467, 0.423, 0.380, 0.336, …]` |
| `tappans` | `[−0.9, 0.9, −0.6, 0.6, …]` |
| `tappitch` | `[0, 0, 7, −5, …]` |
| **colour** | `drive` 0.30 · `crush` 0.22 · `crushmode` **3** (bit + rate) · `noise` 0 · `kwow` 0.15 |
| **reverb** | `rverb` 0.20 · `rtime` 0.35 → **2.5 s** |
| `mcomp` | 0.30 |
| **predicts** | `12 × 2.25 × 5/16 = ` **8.44 grains/s** · ~0.63 concurrent |

**What you would hear.** The station itself, a third of a second late, cut into
75 ms fragments that fall on five beats of sixteen — and the three voices enter
that figure three steps apart, so they interlock instead of landing together.
Half of it comes back four times over a second and a half, two of the echoes
repitched.

**On speech:** the announcer stays intelligible. This is the one patch where the
words survive, because the read head moves forward with the material (`:717`)
instead of sitting on one moment. It reads as a stutter effect on a real voice.
**On music:** a rhythm the station did not have, locked to nothing in the music —
which is the interesting part. Against a song with its own beat you get
polyrhythm; against talk radio you get a pulse out of nothing.

⚠️ **Its stereo picture comes from the taps, not from the grains.** `mspray`
also sets the per-grain pan (`:816`, no 0.25 there), so a spray small enough to
keep words intact is a spray that puts every grain in the middle. The width is
`tappans ±0.9 / ±0.6` at `swet 0.5` instead. That is a deliberate trade and it
is the one patch where it is made.

⚠️ 🔴 **Write the pattern and leave `melen` at 1 and nothing happens.** At
`melen 1` the index is `… % 1 = 0` and only slot 0 is ever read (`:802`), so
fifteen of the sixteen numbers are inert and the sound is identical. The
separator is free and arithmetic: `8.44/s` in the cell that is already on the
page, against `27/s` if the pattern is not being read.

---

### C · **caught and held** — the freeze

| | |
|---|---|
| `mlock` | **1** → `sos = msos.max(mlock) = 1` (`:638`), `sosret = 1`, `sosin = 0` (`:646`) — a **bit-exact** hold, not a decay |
| `mwinstart` `mwinend` | **0.35, 0.40** → a **3-second** slice of the caught minute |
| `mscanmode` `mscan` | **1 (STRETCH)**, 0.55 → speed `0.05 × 0.65 =` **0.0325×**, crossing 3 s of audio in **92 s** — about **31× stretch** |
| `mrate` `msize` | 9 /s, 0.55 s |
| `mcontour` | 10 (`p = 0.625`) |
| `msos` | 0.6 (irrelevant while locked — `mlock` wins at `:638`) |
| `mtilt` | −0.20 |
| `mspray` `mspraymode` | 0.25, **3 (WARP)** → 1.05 Hz / 0.70 Hz, offset ±6.25% of a 3 s window = ±190 ms, pan ±0.25 |
| `mswarm` `mswarmmode` | 0.75, **4 (5TH+OCT: +7/+12)** → `dupgain` 1, spread **2.20 st** |
| `mstrum` | 0.10 → 11.1 ms × i |
| `melen` `mephase` | 1, 0 |
| `gates` | `[1,1,1,1,1,0,0,0]` |
| `pitches` | `[0, 7, 12, 19, −12, 0,0,0]` |
| `probs` | `[1, 0.85, 0.7, 0.5, 0.6, 1,1,1]` |
| **delay** | `swet` 0.30 · `scycle` 3.2 · `sfb` 0.55 · `stilt` −0.3 · `stiltxover` 650 · `sdiffuse` **0.8** |
| `taptimes` | `[0.8, 1.6, 2.4, 3.2, …]` |
| `taplevels` | `[0.467, 0.423, 0.380, 0.336, …]` |
| `tappans` | `[−1, 1, −0.7, 0.7, …]` |
| `tappitch` | `[0, 12, −12, 7, …]` |
| **colour** | `drive` 0.25 · `crush` 0 · `noise` 0.20 PINK · `noisedecay` 1.2 · `noisetone` 700 · `noisedyn` 1.0 · `kwow` 0.50 |
| **reverb** | `rverb` 0.55 · `rtime` **0.72** → `0.3 + 0.72^1.6·11.7 + 0.72^20·9988` = **21 s** |
| `mcomp` | 0.25 |
| **predicts** | `9 × 3.65 = ` **32.85 grains/s** · ~18 concurrent + 18 duplicates — **the second heaviest patch** |

**What you would hear.** Three seconds of radio, caught at the instant you
pressed it, stretched thirty-one times and held. Five voices spanning three
octaves, each doubled a fifth and an octave up, with two semitones of detune. A
twenty-one-second room.

**On speech:** one syllable becomes a sustained vowel choir — the single most
striking thing this page could do. A person's voice turned into an organ note
that is still, audibly, that person.
**On music:** one chord of whatever was playing, held for as long as you leave
it, with the fifths and octaves the swarm adds sitting on top of the real ones.

⚠️ **Entering this patch catches whatever the buffer happens to hold — including
a silence.** Cheap fix: arm the freeze only when the engine meter has been above
a floor within the last second, and log which it did. A freeze that catches dead
air is indistinguishable from a broken engine.

🔴 **Do NOT use `msrc 1` for this.** It looks like the freeze and it is the
erase: `sosin = 0` but `sosret = (msos·1.05).clip(0,1) = 0.63`, so the buffer
fades to silence over a few passes while every reply says the granulator is fine
(LESSONS #46; `/grains/`'s `writePatch` carries the same warning).

**The separator, and a grain count cannot see it:** the rate is identical frozen
or live. Freeze, wait, and the **envelope autocorrelation at the sweep period
must rise from ~0 to near 1**. See §3.

---

### D · **played backwards** — the loud one

| | |
|---|---|
| `mscanmode` `mscan` | **1 (STRETCH)**, **0.0** → speed **−1.00×**: reverse at life speed, one lap of the minute in 60 s |
| `mrate` `msize` | 5 /s, 0.9 s |
| `mcontour` | **16** (`p = 0.96`: each grain swells and stops — backwards on top of backwards) |
| `msos` `mlock` | 0.68, 0 |
| `mtilt` | −0.50 |
| `mspray` `mspraymode` | 0.30, 1 (RANDOM) → ±7.5% of 60 s = ±4.5 s, pan ±0.30 |
| `mswarm` `mswarmmode` | 0.40, **2 (5TH: −7/+7)** → `dupgain` 1, spread **0.31 st** |
| `mstrum` | **0.125** (the engine's own ceiling, `:756`) → 25 ms × i; voice 8 at 7/8 of the period |
| `melen` `mephase` | 1, 0 |
| `gates` | `[1,1,1,0,0,0,0,0]` |
| `pitches` | `[0, −5, −12, 0,0,0,0,0]` |
| `probs` | `[1, 0.75, 0.6, 1,1,1,1,1]` |
| **delay** | `swet` 0.35 · `scycle` 2.4 · `sfb` **0.6** · `stilt` −0.4 · `stiltxover` 650 · `sdiffuse` 0.65 |
| `taptimes` | `[0.6, 1.2, 1.8, 2.4, …]` |
| `taplevels` | `[0.467, 0.423, 0.380, 0.336, …]` |
| `tappans` | `[−0.7, 0.7, −0.45, 0.45, …]` |
| `tappitch` | `[0, −12, 7, −7, …]` |
| **colour** | `drive` **0.45** · `crush` **0.35** · `crushmode` **2 (rate only)** · `noise` 0.15 **DUST** · `noisedecay` 0.06 · `noisetone` 4500 · `noisedyn` 3.0 · `kwow` **0.85** (depth 17 ms, flutter term 0.0031 — `:1882–1886`) |
| **reverb** | `rverb` 0.35 · `rtime` 0.55 → **4.9 s** |
| `mcomp` | 0.35 |
| **predicts** | `5 × 2.35 = ` **11.75 grains/s** · ~10.6 concurrent + duplicates |

**What you would hear.** The station running backwards at its own speed, in
0.9-second pieces that fade in and cut off, a fifth and a fourth below, through
a rate-crushed, saturated, seasick tape machine with six-tenths feedback.

**On speech:** unmistakably a voice played backwards — the most legible
"psychedelic" signal there is, and the one everybody recognises.
**On music:** a backwards tape with the pitch intact, which is not the same as a
tape rewound: `GrainBuf` reads forward inside each grain (`:871`), so the
fragments are forward and their ORDER is reversed. That is exactly the
Beatles/Revolver artefact and it is a different sound from true reversal.

⚠️ `drive` is fitted to hold loudness flat —
`mk = 1.00658 − 2.84907·dr + 3.75126·dr² − 1.62992·dr³` (`:1627`), within about
half a decibel of clean — so an RMS measurement will read "drive does nothing"
and be measuring the make-up. ⚠️ And `crush`'s crossfade is
`XFade2(sig, crushed, ((cr·25).clip(0,1)·2) − 1)` (`:1669`): **fully wet by
`crush 0.04`**. At 0.35 the remaining knob is depth, not blend.

---

### E · **a shower on the roof** — pointillist, and NOT random

| | |
|---|---|
| `mscanmode` `mscan` | **1 (STRETCH)**, 0.75 → speed **+1.25×**, lapping the write head every 240 s |
| `mrate` `msize` | **26 /s**, **0.030 s** |
| `mcontour` | **0** (`p = 0.04`: every grain is a pluck — sharp in, long out) |
| `msos` `mlock` | 0.60, 0 |
| `mtilt` | **+0.40** (−4.8 dB below / +4.8 dB above 700 Hz — thin and glassy) |
| `mspray` `mspraymode` | **0.70**, **3 (WARP)** → 2.40 Hz / 1.60 Hz, offset ±17.5% of 60 s = ±10.5 s, pan ±0.70 |
| `mswarm` `mswarmmode` | 0.22, 1 (DETUNE) → `dupgain` 0.66, spread **0.102 st** |
| `melen` `mephase` `mstrum` | **12**, **5**, 0 |
| `epattern` (buffer 27) | `E(7,12)` = `[0,1,0,1,0,1,1,0,1,0,1,1, 0,0,0,0]` — onsets at steps 1, 3, 5, 6, 8, 10, 11 |
| `gates` | `[1,1,1,1,0,0,0,0]` |
| `pitches` | `[0, 12, 19, 24, 0,0,0,0]` |
| `probs` | `[1, 0.8, 0.6, 0.4, 1,1,1,1]` |
| **delay** | `swet` 0.40 · `scycle` 0.9 · `sfb` 0.30 · `stilt` **+0.2** · `stiltxover` **2500** · `sdiffuse` 0.15 |
| `taptimes` | `[0.225, 0.45, 0.675, 0.9, …]` |
| `taplevels` | `[0.467, 0.423, 0.380, 0.336, …]` |
| `tappans` | `[−1, 1, −0.7, 0.7, …]` |
| `tappitch` | `[0, 12, 19, 24, …]` |
| **colour** | `drive` 0.15 · `crush` 0.30 · `crushmode` **1 (bits only)** · `noise` 0.18 **DUST** · `noisedecay` 0.04 · `noisetone` 6000 · `noisedyn` 3.5 · `kwow` 0.10 |
| **reverb** | `rverb` 0.50 · `rtime` 0.66 → **8.8 s** |
| `mcomp` | 0.20 |
| **predicts** | `26 × 2.8 × 7/12 = ` **42.5 grains/s** · ~1.3 concurrent |

**What you would hear.** Forty-two 30-millisecond plucks a second, spread across
two octaves upward, falling on seven steps of twelve with the four voices five
steps apart — scattered in the stereo field and in the held minute by a pair of
slow drifts rather than by a fresh random number per grain, so the cloud MOVES
AS ONE rather than being dust. An eight-second room underneath.

**On speech:** consonants. Sibilance and plosives survive 30 ms; vowels do not.
A dry rattle that is audibly speech-shaped without being speech.
**On music:** rain on glass that keeps the tune's pitch centres.

🔴 **The WARP mode is the entire point of this patch and it is what separates it
from the complaint.** `mspraymode 1` (RANDOM, the page's current setting) gives a
fresh `TRand` per grain per voice (`:806–807, 814`) — statistically independent
positions, which is what "random noise" sounds like. `mspraymode 3` shares two
`LFNoise2` across the eight voices, rotated (`:783–784`), so neighbouring grains
read neighbouring places. Same density, same rate, same pitches; a completely
different thing to listen to. **This is measurable without a human** — the
lag-1 autocorrelation of the reported `pos` values goes from ~0 to high.

⚠️ `mspraymode` 2 and 4 set `pan = DC.ar(0)` (`:816`), so switching to a MONO
variant silently narrows the stereo picture as a side effect nobody asked for.

---

### F · **the whole hour at once** — the palimpsest

| | |
|---|---|
| `msos` | **0.95** → `sosret = min(1, 0.95·1.05) = 0.9975` kept per lap, `sosin = clip((1−0.95)·4, 0, 1) = 0.20` in (`:639`, `:646`) |
| `mlock` | 0 |
| `mscanmode` `mscan` | **1 (STRETCH)**, 0.345 → speed **+0.035×**, one lap of the minute in **1,714 s (28.6 min)** |
| `mrate` `msize` | 0.9 /s, **6.0 s** (`dur` clip is 0.002…8 and `winspansec` is 60 here, `:681–682`) |
| `mcontour` | 12 (`p = 0.75`) |
| `mtilt` | −0.55 |
| `mspray` `mspraymode` | 0.45, **3 (WARP)** → 1.65 Hz / 1.10 Hz, offset ±11.25% = ±6.75 s, pan ±0.45 |
| `mswarm` `mswarmmode` | 0.65, **3 (OCT)** → `dupgain` 1, spread **1.33 st** |
| `mstrum` | 0.08 → 89 ms × i |
| `melen` `mephase` | 1, 0 |
| `gates` | `[1,1,1,1,1,1,0,0]` |
| `pitches` | `[0, −12, 7, −5, 12, −24, 0, 0]` |
| `probs` | `[1, 0.9, 0.7, 0.55, 0.4, 0.3, 1, 1]` |
| **delay** | `swet` 0.22 · `scycle` **9.0** · `sfb` 0.50 · `stilt` −0.35 · `stiltxover` 650 · `sdiffuse` **0.9** |
| `taptimes` | `[2.25, 4.5, 6.75, 9.0, …]` — inside `dbuf`, which stays 11 s on TINY (`:272`) |
| `taplevels` | `[0.467, 0.423, 0.380, 0.336, …]` |
| `tappans` | `[−0.6, 0.6, −0.4, 0.4, …]` |
| `tappitch` | `[0, 7, 12, 19, …]` |
| **colour** | `drive` 0.20 · `crush` 0 · `noise` 0.10 PINK · `noisedecay` 2.0 · `noisetone` 500 · `noisedyn` 1.0 · `kwow` 0.55 |
| **reverb** | `rverb` 0.50 · `rtime` **0.78** → `0.3 + 0.78^1.6·11.7 + 0.78^20·9988` = **77 s** |
| `mcomp` | 0.15 |
| **predicts** | `0.9 × 3.85 = ` **3.47 grains/s** · ~21 concurrent + 21 duplicates — 🔴 **the heaviest patch** |

**What you would hear.** The minute stops being replaced and starts piling up:
new audio enters at a fifth of its level and the old is kept at 99.75% per lap,
so what the station said ten minutes ago is still faintly in there. Six voices
across four octaves, in six-second grains, crawling forward at a thirty-fifth of
life speed, in a seventy-seven-second tank.

**On speech:** a fog of half-heard voices from several minutes of one programme
at once — nobody intelligible, everybody present.
**On music:** an accumulating drone that keeps acquiring the harmony of whatever
has been played, and never quite lets go of it.

⚠️ **The write clips.** `BufWr.ar(((capl·sosin) + (oldl·sosret)).clip2(1), …)`
(`:655`) — at `msos 0.95` with a loud station the buffer saturates and the
layering becomes distortion rather than depth. The engine's own comment says the
clip is there so the freeze at the top is bit-exact; here it is a real ceiling.
If it distorts, `ingain` down before `msos` down.

⚠️ **CPU.** Run `sonic.getMetrics().glitchCount` either side of entering this
patch. It is the only counter that moves in this build (`avgCPU` reads 0 always
— research §10.7). If F glitches, `msize 4.0` and `gates` down to five is the
cheap retreat; it costs a third of the concurrent reads.

---

### 2.5 What the six are, as a set

| | read head | grains/s | grain | the thing it is |
|---|---|---:|---:|---|
| A slow tide | −0.10× | 3.4 | 2.8 s | reverse crawl, octave swarm, big room |
| B stuttering | 0.35 s behind | 8.4 | 75 ms | rhythm; **words survive** |
| C caught and held | 0.033×, frozen | 32.9 | 550 ms | 31× stretch of 3 caught seconds |
| D played backwards | −1.00× | 11.8 | 900 ms | reverse at life speed, crushed, seasick |
| E shower on the roof | +1.25× | 42.5 | 30 ms | pointillist, but coherent (WARP) |
| F whole hour at once | +0.035× | 3.5 | 6.0 s | layers that never clear |

Six different read-head behaviours, six different grain registers spanning
**30 ms to 6 seconds**, six different chains. **No two of them are the same wash
wearing different digits** — and the reason is that each is built round a
different mechanism, not round a different point in one range.

⚠️ **Names.** All six are plain English and none is jargon. "slow tide" and
"shower on the roof" are what you hear; "caught and held" and "played backwards"
are what happens. None says `scanmode`, `swarm`, `euclid` or `grain`.

---

## 3 · Can "interestingness" be measured?

### 3.1 The LLM part, answered plainly

🔴 **Claude cannot listen to this. There is no audio content block.** The Files
API's own file-type table lists `application/pdf` and `text/plain` as
`document`, `image/jpeg` `image/png` `image/gif` `image/webp` as `image`, and
everything else as `container_upload` for the code execution tool. No audio MIME
type appears anywhere on that page
(<https://platform.claude.com/docs/en/build-with-claude/files>, fetched
2026-09-14).

Other vendors do take audio natively — Gemini accepts WAV, MP3, AIFF, AAC, OGG
and FLAC through the same endpoint
(<https://ai.google.dev/gemini-api/docs/interactions/audio>). So an audio-native
grader is possible; it is just not Claude, and it is a second vendor to hold.

Two ways an LLM could be involved without leaving this platform:

1. **Let it look at a picture.** Upload the rendered WAV as a `container_upload`
   to the code execution tool, have the sandbox compute the features below and
   render a spectrogram plus an envelope plot (matplotlib is pre-installed), and
   let the model read the plot. A model genuinely can see sixty seconds of
   structure at a glance. Cost is one Messages request: Claude Opus 5 is
   **$5 / $25 per MTok**, Haiku 4.5 **$1 / $5** (model table cached 2026-06-24).
2. **Let it read the numbers.** A rubric over a feature table. This is a
   threshold with extra steps, and it is not reproducible — the same numbers can
   come back with a different verdict.

🔴 **My verdict, and it disagrees with the obvious move: the LLM is the wrong
instrument for the RANKING and the right instrument for the DESCRIPTION.**
What the owner wants graded — "is this a soundscape or a scattered mess" — is a
property of the ENVELOPE over tens of seconds. That is exactly what a number
does well. A model asked to rank two spectrograms will produce fluent,
confident, unfalsifiable prose either way, which is this repo's named failure
mode: *printing "ok" is not evidence*. Where it earns its place is one step
later: once the features have ranked two patches, ask it to say **why** in
words. A description cannot be graded, so nothing is lost if it is wrong.

### 3.2 The features, and which ones actually discriminate

Computed on a captured buffer of the **granulator alone** (fader at 1), 20 ms
RMS frames, 120 s.

| # | feature | discriminates what | status |
|---|---|---|---|
| **2** | **envelope modulation spectrum** — FFT of the mean-removed RMS envelope; report the share of energy in **slow 0.008–0.1 Hz**, **mid 0.1–1 Hz**, **fast 1–30 Hz** | **the complaint itself.** "Scattering fragments" = energy in the fast band and nothing in the slow. "Soundscape" = a real share below 0.1 Hz | 🔴 **UNTESTED. Build the gate in §3.4 before anything else.** |
| **4** | **envelope autocorrelation, peak in lag 1–20 s** | does anything RECUR — freeze, loop, euclid, tap spacing | untested here, cheap, and it is the separator `plan-radio-sound` ③ already proposed |
| **5** | **stereo width** — `1 − corr(L, R)` over 1 s frames, and side/mid RMS | `mspraymode` and `mspray` **by construction** (`:816`), and tap pans | ✅ has its own deaf-probe control built in: `mspraymode 2` must read ~0 |
| **1** | **envelope depth** — 5th percentile ÷ median | continuous drone vs grains with gaps | ✅ **already measured in this repo**: 0.981 at `sos 0` against 0.000 at `sos 0.6` (CHAIN.md). ⚠️ but it is the wrong axis for THIS complaint — a scatter and a soundscape both have gaps |
| **3** | **spectral centroid**, median and interquartile range over 1 s frames | brightness, and whether brightness MOVES | ✅ the code exists — `rig/board/measure.mjs:36–62`. ⚠️ **on live radio it measures the station.** Only meaningful on a frozen buffer (patch C's `mlock`), which is the control that makes it work |
| 6 | silence ratio, frames below −60 dBFS | nothing musical — a safety net | catches the all-gates-shut failure that has bitten this repo three times |
| 7 | onset rate and inter-arrival regularity, **from `/pgrain` AND from the audio** | intent vs audibility | ⚠️ **the pair is the measurement.** `pappus.mjs:149–153`: the graph fired 4–5 grains a window with the output bus at exactly 0.00000. A grain count alone has already been read as progress once |

🔴 **What must NOT be graded: level.** `drive` is fitted flat to within half a
decibel (`:1627`), `swarm` is level-normalised on purpose (`:916`), `mcomp` and
the −1 dB limiter (`:1432`) flatten what is left, and `kwow` and `mcontour`
change neither rate nor RMS. Three separate controls in this engine are designed
so that an RMS measurement reads "no change" and is right about the wrong
quantity. That is *measure the quantity in question* in its purest form.

### 3.3 The negative controls — this is the part that decides whether it works

Four arms, each repeated five times, because **one take of a stochastic
instrument is not a measurement**. `rig/board/measure.mjs:90–107` already solves
the statistics: take the median as the condition's value and the **median
distance from that median** as the floor any between-condition difference must
clear. Its own header records why — three consecutive runs of `pappus-live.mjs`
read 14, 16 and 16 of 17 with *different* checks failing each time.

| arm | what | must read |
|---|---|---|
| **0 · deaf probe** | dry radio only, `gates` all zero | silence ratio 1.0, width 0, zero onsets. **If it does not, the instrument is broken and every other number is worthless.** |
| **1 · today** | the deployed page exactly as it is — music, seventh chord, everything downstream at zero | the number to beat. **Record it before anything changes**, or there is nothing to compare against |
| **2 · each patch** | A … F | — |
| **3 · 🔴 the Poisson control** | **white noise gated by a Poisson process at the same onset rate and the same RMS as the patch** | This is literally "random noise" — the owner's own words for the current sound. **A metric that cannot separate patch A from this is worthless and the work stops.** |

And the upper reference: **the dry radio itself**, which is a real, structured,
human-made sound that nobody calls noise. It is not a target — a granulator is
not supposed to sound like its input — but it bounds what the slow band looks
like for something that is unarguably not a mess.

### 3.4 🔴 The one-hour gate, and it comes first

Before building anything:

1. Capture 120 s of the **deployed page as it is** (arm 1) and 120 s of
   **Poisson-gated noise at the same onset rate and RMS** (arm 3).
2. Compute feature **2** and feature **4** on both.
3. **If they do not separate, stop.** Delete the branch and say so.

That is the whole decision. It costs an hour, it needs no page change, and it is
the only measurement that says whether the rest of the day is worth spending.

### 3.5 Cost, honestly

- 🔴 **Everything is realtime. There is no offline render.** wasm scsynth is
  driven by an `AudioWorklet`, not an `OfflineAudioContext`, and `sclang` /
  `scsynth` are **not installed on this machine** (`which sclang` → not found) —
  only the board has them, and the board is a service that dials out on boot.
  So every arm costs its own wall clock, plus the **60-second fill** the ring
  needs before any patch sounds like itself.
- Full sweep: `5 repeats × (1 deaf + 1 today + 6 patches + 1 Poisson) = 45 runs
  × (60 s fill + 120 s capture) = ` **≈ 2 h 15 min of unattended machine time.**
- Code: a feature module of roughly 150 lines (RMS frames; the FFT is already in
  `measure.mjs:18–34`; modulation bands; autocorrelation; L/R correlation), a
  CDP harness — `demo/verify.mjs` already drives this page — and a Poisson-noise
  generator. **Half a day to a day.**
- Risk: feature 2 is the load-bearing one and it has never been run. §3.4 is
  what caps that risk at one hour.

### 3.6 Recommendation

**Do §3.4. It is an hour and it is a real gate.** If it passes, build the sweep
and use it to rank the six patches and to prove the ranking is not a die roll.

**Do not put any of it in the page.** It is a lab harness. An
"interestingness 7.2" cell would be a number that reads as a measurement of the
sound and is a measurement of a formula somebody chose — exactly the cell this
repo's rule says teaches a reader to ignore the row.

**Do not use an LLM to rank.** Use it, if at all, to describe two patches the
numbers have already separated.

---

## 4 · What I would build, in order

1. **§0.3 — `mbuflen 60` and the window.** One line, and it removes the
   silent-hole failure that every long patch below would otherwise hit on its
   first switch. Nothing else works reliably without it.
2. **The patch selector with A, B and C.** `createPicker`, the `/grains/`
   `writePatch` shape, full state every time. Those three cover the three
   read-head behaviours the engine has — a slow sweep, a fixed lag, a freeze —
   so they are the maximum change for the minimum code. The `grains/s` cell
   already on the page checks each of their arithmetic predictions.
3. **The other three**, which are the same code with different numbers.
4. **§3.4's one-hour gate**, and then either the sweep or a line in HANDOFF
   saying it did not separate.

Not proposed, deliberately:

- **A JavaScript LFO.** Upstream's eight modulators live in Lua at 60 Hz
  (`:3325`), and the equivalent here is a per-frame `/n_set` into wasm scsynth
  that nothing can prove arrived. §1.6's five in-graph movers cover 1 second to
  28 minutes for two `/n_set` each.
- **Exposing `loss`.** It is two cascaded lowpasses on this rung (`:1735`), not
  the codec damage its name promises, and there is a standing "no filter"
  instruction. ⚠️ I could not find that instruction written down anywhere in the
  repo — it is quoted in `plans/plan-radio-sound.md:86` and nowhere else. Two of the
  patches above use `mtilt`, which **is** a filter (±12 dB shelves at 700 Hz,
  `:617–621`); if the instruction covers it, drop `mtilt` from A, D, E and F and
  the patches still stand.
- **A randomiser over slider ranges.** `demo/grains/index.html:496` already
  argues this one and it is the same complaint being answered here.
