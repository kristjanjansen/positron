# plan-radio-sound — making `/radio1965/` more than one wash

> ⚠️ **NOTHING IN THIS FILE IS BUILT.** It is a proposal. No page, module or
> definition has been changed; every value below is read off
> `rig/box/norns/Engine_Pappus.sc` and has not been heard.

Live page today: <https://positron.studio/radio1965/>

---

## 0 · The picture, which was broken and is being repaired by somebody else

⚠️ **`demo/radio1965/index.html` WAS BEING EDITED WHILE THIS WAS WRITTEN** —
mtime 16:27:05, eleven seconds before the last check. Everything below about
that file is *as found at that minute* and needs re-reading before it is acted
on. The engine citations do not move.

### 0.1 ✅ Found broken, found repaired mid-read

At 15:56 the grain handler read

```js
scope.mark({ pos: m[2], dur: m[3], voice: m[4] });
```

`SendReply` prepends **two** of its own arguments, so the message is
`['/pgrain', nodeID, replyID, pos, dur, voice, half]` —
`["/pgrain", 3000, -1, 0.1329…, 0.12, 0, 0]`, recorded verbatim in
`research/supercollider-browser-2026-09.md` §10.6. `m[2]` is the **replyID,
`-1`, on every grain there has ever been**, and `grain-scope.mjs:332` is
`at = bornAt - (1 - g.pos) * grainSeconds` → `bornAt - 16 s` on a six-second
window, so `if (x < 0 || x > W) continue` **culled every tick**. The page's
headline claim — *"every tick in the picture is a grain the engine reported
firing"* — was drawing nothing, and `grains/s` stayed green because a count
never looks at where a grain landed.

✅ By 16:28 the same file reads `const pos = m[3]` (`:677`), rescales through a
`winPos` built on an imported `RING_SECONDS`, and asserts
`positions … of the ring` at `:516`. Both halves are repaired. It is recorded
here because the ideas below are graded through that picture, and because a
reader coming to this file later needs to know the picture was blind until
today.

### 0.2 ⚠️ THE REMAINING ONE: `pos` IS A PLACE IN A RING, AND THE PICTURE'S AXIS IS AGE

Even correctly indexed and correctly rescaled to the window, the scope's
`at = bornAt - (1 - pos) * buflen` is only right **when the write head sits at
the end of the window**. The capture is a sixty-second ring
(`Engine_Pappus.sc:69`, `bufdur = 60.0`) that the write head laps
continuously, so the true age of what a grain read is
`((wpos - pos) mod 1) * buflen`, and `wpos` is not reported by anything.

The error is not small: it sweeps the full `mbuflen` once per lap, so a tick's
horizontal position drifts by up to eight seconds on a six-second picture for a
reason that has nothing to do with the granulator.

**Idea ③ (freeze) is the cheapest way out.** A stopped buffer has no write head,
so the ambiguity disappears — and a stopped buffer is exactly the case
`grain-scope`'s `buffer() + mark()` picture was built for: *"Freeze and the
whole picture stops dead."* The page holds the same audio the buffer holds, so
it can draw the caught seconds as a waveform with the read points ticking on
it. That would be the first fully honest still picture this page has had.

Neither of these is a sound idea. Both sit on the path of every idea below that
claims to improve the picture, so they are priced first.

---

## 1 · What is dead on TINY, established before proposing anything

The board and the tab both run `PAPPUS_TINY=1`. Compiled out — the control
exists, takes a value, drives nothing:

| control | why it is dead | citation |
|---|---|---|
| `pwet` `pfrq` `pamp` `pvfrq` `pvamp` `pdamp` `pbright` `pstruct` `ppos` `pmodel` `pgrain` `pgraintype` | the whole RESONATOR stage: `fmodal = if(tiny) { DC.ar([0,0]) }` (`:1312`), strings behind `if(tiny.not)` (`:1361`). `presig = (pin*fmix) + (fsum*fsend)` (`:1419`) with `fsum` identically zero | TINY.md measured **`pwet 1` = 0.000000 / −180.0 dBFS** against 0.002723 at `pwet 0` one second earlier |
| `rshimmer` `rshimmersemi` | `rshifted = if(tiny) { DC.ar(0) }` (`:2050`) | TINY.md cut 3, 236 B |
| `taptimes[4..7]` `taplevels[4..7]` `tappans[4..7]` `tappitch[4..7]` | `(if(tiny) { 4 } { 8 }).do` (`:1515`) | TINY.md cut 4, 2,894 B |
| every `n…` control, `pitches2` `gates2` `probs2`, gate buffer **28** | `graw2 = if(lite) { DC.ar([0,0]) }` (`:1013`); TINY implies LITE (`:218`) | CHAIN.md, "the board has ONE granulator" |

Two more that are alive on TINY but wrong for this page:

- ⚠️ **`loss` IS A FILTER ON THIS RUNG.** `if(lite) { lossmono = LPF.ar(LPF.ar(lmono, lcut), lcut) }`
  (`:1735`) — two cascaded lowpasses swept 18 kHz → 810 Hz. The FFT version that
  makes it a codec falling apart is the `lite.not` branch and is not compiled.
  Ruled out by the "no filter" instruction; named here so nobody proposes it as
  "codec damage".
- ⚠️ **`noisetype` 4 and up is SILENT IN THE BROWSER.** The loop players read
  buffers 5…9 (`:1845`, `nlp = Lag.kr(noisetype > 3.5, 0.05)`), which are real
  `.wav` files on the board and **allocated-but-never-filled** by
  `bufferPlan()` in `demo/shell/pappus.mjs:40`. Only 1 WHITE, 2 PINK, 3 DUST
  make a sound in a tab. Classic live-looking inert control.

Everything else below is either inside GRAINSWARM — *"the granulator is
untouched, and that is the whole point"*, TINY.md line 49 — or in DELAY /
COLOUR / REVERB, which only `PAPPUS_BARE` removes.

---

## 2 · The ranked list

### ① A CHORD OUT OF THE STATION — `gates` + `pitches` + `probs`

**Build this first.** It is the largest single change available, it is inside
the granulator so TINY cannot touch it, and the existing `grains/s` cell is an
exact witness that it took.

1. **What you would hear.** The station arrives as a chord instead of one voice.
   Eight copies of the same second of radio, each transposed, all sounding at
   once — a voice on the radio becomes a held harmony of itself.
2. **Controls.** `gates [1,1,1,1,1,0,0,0]`, `pitches [0,-12,7,12,-5,0,0,0]`
   (semitones, any float), `probs [1,1,0.7,0.55,0.4,1,1,1]` to thin the upper
   voices so the chord breathes.
3. **Survives TINY.** Yes, by construction. `base = pitches[i]` (`:851`) feeds
   `2 ** (base/12)` into the two `GrainBuf`s at `:871`; `gates[i]` is inside the
   trigger at `:804`. All inside `mkgrain`, which every rung builds.
4. **Cost.** Three `/n_setn` messages. No buffer, nothing computed per frame.
   The page already sends `gates` and `probs` once via `applyAudibleDefaults`.
5. **What could go wrong.** 🔴 `gates` all-zero is the repo's own worst silence
   (CHAIN.md, MEASURED 2026-09-14: *"rms 0.000000, 0.0 grains/s"* with
   passthrough still working) — but `applyAudibleDefaults` already writes
   `[1,0,…]`, so the failure here is the other way: `setParam` sends `/n_setn`
   only for an `Array` (`pappus.mjs:125`), and one wrong scalar writes voice 0
   and leaves seven voices at whatever they held.
   **The separator: the `/pgrain` rate.** `report` fires once per GATED voice
   per trigger (research §10.6, graded 8.00/4.00/15.99 against the board). Five
   open gates at `mrate 8` must read **40 grains/s** in the cell that already
   exists, not 8. `probs` scales it again — `probs` summing to 3.65 of 5 gives
   29.2/s. An arithmetic prediction the page can assert on, which is better than
   any level measurement.
   ⚠️ CPU: eight open gates is sixteen live grain reads; with ④ on top it is
   forty-eight. Watch `sonic.getMetrics().glitchCount`, which is the only
   counter that moves in this build (research §10.7 — `avgCPU` reads 0 always).

### ② THE READ HEAD FOLLOWS THE RADIO — `mscanmode`, `mdelay`, `mscan`

**Build this second.** It is the direct cause of "one undifferentiated wash".

The page sends `mscanmode 2` (POSITION) and `mscan 0.666`
(`applyAudibleDefaults`, `pappus.mjs:154`). In POSITION the read point is a
**constant** — `K2A.ar(Lag.kr(mscan))` at `:721` — while the write head laps the
8-second window underneath it. So every grain reads material of an age that
cycles 0 → 8 s with nothing steering it. That is a wash by construction, and it
is also why every grain tick would land on one x even after §0 is fixed.

1. **What you would hear.** (a) `mscanmode 3`, small `mdelay`: the station
   itself, a quarter-second late and chopped into grains — words stay words,
   music stays music, and the granulator reads as an effect on the radio rather
   than as fog. (b) `mscanmode 1` with `mscan` under a third: **the radio
   running backwards**. Above two-thirds, faster than life.
2. **Controls.** (a) `mscanmode 3, mdelay 0.25` … `mdelay 4.0` (seconds behind
   the live edge; `delaypos = (wpos - mdelay/mbuflen).wrap(0,1)`, `:717`).
   (b) `mscanmode 1`, then the page's existing `scan` slider becomes a speed:
   `mscan 0` = **−1×, reverse at life speed**, `0.333` = frozen point,
   `0.666` = +1× (tracks the write head), `1.0` = +2×
   (`scanstretch = Phasor.ar(0, ((mscan*3)-1)/wlen, 0, 1)`, `:715`).
3. **Survives TINY.** Yes — `scanpos = Select.ar(mscanmode - 1, …)` at `:719`,
   inside `mkgrain`.
4. **Cost.** One `/n_set` for the mode; the `scan` slider is already on the page
   and only needs its label changed to match the mode. Nothing else.
5. **What could go wrong.** ⚠️ **`mscan` MEANS SOMETHING DIFFERENT IN EACH MODE
   and the page cannot tell which it is in.** `/grains/` pins `mscanmode 2`
   explicitly and says why (`setFixed`, *"the engine's default is 1 STRETCH
   where `mscan` is a speed and not a place"*). A page offering both modes on
   one slider must relabel it or it is a control lying about its own units. The
   grain rate does **not** change with scan mode, so the readout cannot see
   this. **The separator is the picture**: in POSITION every tick lands on one
   x; in DELAY SYNC and STRETCH they sweep. That is measurable without a human —
   the standard deviation of `pos` over 200 reported grains is ~0 in POSITION
   (only `gjit`, capped at 8 ms, `:838`) and a substantial fraction of the
   window otherwise. **This needs §0.1 fixed first, or it measures −1 forever.**

### ③ FREEZE — `mlock 1`

1. **What you would hear.** Press it and the last eight seconds of radio stop
   arriving and start repeating — whatever the station happened to be saying is
   caught and held, and the granulator chews that for as long as you leave it.
   Press again and the radio walks back in.
2. **Controls.** `mlock 1` / `mlock 0`. Optionally `mbuflen` first — anything
   from 0.1 s to 60 s (`wlen = (mbuflen*SR).clip(4800, frames)`, `:653`) decides
   how much gets caught.
3. **Survives TINY.** Yes. `sos = Lag.kr(msos, lagt).max(mlock)` (`:638`),
   `sosin = ((1-sos)*4).clip(0,1)` (`:646`), `sosret = (sos*1.05).clip(0,1)`
   (`:639`). At `mlock 1`: `sosret = 1`, `sosin = 0`, so `BufWr` writes
   `0·new + 1·old` — a **bit-exact** hold, not a decay.
4. **Cost.** One `/n_set`, one button. It is the cheapest large gesture on the
   page.
5. **What could go wrong.** 🔴 **DO NOT USE `msrc 1` FOR THIS.** It looks like
   the freeze and it is the erase: with the page's `msos 0.6`, `msrc 1` gives
   `sosin = 0` but `sosret = 0.63`, so the buffer **fades to silence over a few
   passes** while every status reply says the granulator is fine. That is
   LESSONS #46, and `/grains/` carries the warning in `writePatch`'s comment.
   ⚠️ Also: `mlock` does not change the blend — `sxf = (msos.max(mlock)/0.6).clip(0,1)`
   (`:980`) is already 1 at the page's `msos 0.6`, so freezing changes what is
   read, not how much of it you hear. **The separator:** freeze, wait ten
   seconds, and the engine meter's output must become **periodic at `mbuflen`**
   — autocorrelation of `engLevel`'s frames at 8 s lag goes from ~0 to near 1.
   A grain count cannot see this at all: the rate is identical frozen or live.
   ✅ And this is the idea that unlocks the picture: a stopped buffer is
   `grain-scope`'s `buffer() + mark()` case, whose own header says *"Freeze and
   the whole picture stops dead."* The page holds the same audio the buffer
   holds, so it can draw the caught eight seconds as a waveform with the read
   points ticking on it — the first honest still picture this page could have.

---

### ④ THICKNESS — `mswarm` + `mswarmmode`

1. **What you would hear.** Each grain brings two detuned copies of itself up
   with it. At the low end that is a slow beating that makes a thin signal
   sound wide; with the octave setting the radio comes out as an organ stack.
2. **Controls.** `mswarm 0.35`, `mswarmmode 3` (OCT). Modes read straight off
   `:745`/`:746`: **1 DETUNE (0/0), 2 FIFTH (−7/+7), 3 OCTAVE (−12/+12),
   4 FIFTH+OCTAVE (+7/+12)**. `mswarm` 0…1; the spread is
   `(swarm*0.4) + (swarm**4 * 6)` semitones (`:885`), so the bottom two thirds
   is beating and the top is a several-semitone cluster.
3. **Survives TINY.** Yes — `dupa = GrainBuf.ar(2, dtrig, …)` at `:902`, inside
   `mkgrain`.
4. **Cost.** Two `/n_set`. No buffer.
5. **What could go wrong.** ⚠️ **It is level-normalised, so it will not move
   rms.** `v = (main + dupa*dupgain) / (1 + 2*dupgain).sqrt * (1 + unison*swarm*0.8)`
   (`:916`) holds loudness roughly flat on purpose. A level measurement will
   read "no change" and be right about the wrong quantity — the repo's *measure
   the quantity in question* rule exactly. It also does **not** change the grain
   report rate: `report` fires once per voice per trigger, not per swarm
   duplicate (CHAIN.md). **The separator: `/s_get`** for arrival (research §10.4
   confirms `/n_set mrate 12.5` → `/s_get mrate` reads 12.5), plus a spectral
   arm — on a frozen buffer (③) with a steady passage, the count of distinct
   peaks in `eng.meter`'s `getFloatFrequencyData` roughly triples at
   `mswarmmode 3`. ⚠️ `dupgain = (swarm*3).clip(0,1)` (`:744`), so the
   duplicates are fully in by `mswarm 0.34` — the top two thirds of the knob
   only widens the detune, which is not what the handle implies.

### ⑤ GRAIN SHAPE — `mcontour`

The most underrated control in the engine, and one integer.

1. **What you would hear.** At the bottom, every grain is a little pluck —
   sharp in, long out, so a wash turns into a shower of drips. In the middle it
   is a smooth pulse. At the top each grain swells backwards, so the sound
   arrives rather than starts.
2. **Controls.** `mcontour 0` … `16`, integer. The engine precomputes
   seventeen windows, `Env([0,1,0],[p,1-p],\sine)` with `p` from 0.04 to 0.96
   (`:330`); `demo/shell/pappus.mjs:55` rebuilds that formula and
   `allocBuffers` fills buffers 10…26 with it.
3. **Survives TINY.** Yes — `envsel = Select.kr(mcontour.clip(0,16), envnums)`
   (`:726`), passed to both `GrainBuf`s.
4. **Cost.** One `/n_set`. The buffers are already allocated and already
   filled — this is the single highest payoff per byte sent on the page.
5. **What could go wrong.** 🔴 The windows live in buffers 10…26 and
   `allocBuffers` is what fills them; **unallocated buffers are not an error to
   scsynth, they are silence** (`pappus.mjs:11`). If the fill ever regressed,
   `mcontour` would silently be a mute switch on 16 of its 17 positions.
   It does not change the grain rate either. **The separator: crest factor.**
   On a frozen buffer, peak/rms over the engine meter at `mcontour 0` against
   `mcontour 8` differs by several dB by construction — a raised cosine has an
   rms of about 0.61 of what it windows (`:963`), and a 4 %-attack window does
   not. Zero change in crest factor across the whole range means the buffers
   are not being read.

### ⑥ A RHYTHM — the gate buffer, `melen`, `mephase`

1. **What you would hear.** The grains stop being a continuous drizzle and fall
   into a repeating pattern — five hits spread over sixteen, and each voice
   enters that pattern at a different point, so they interlock instead of
   landing together.
2. **Controls.** `/b_setn 27 0 16 1 0 0 1 0 0 1 0 0 1 0 0 1 0 0 0` (E(5,16)),
   then `melen 16`, `mephase 3`. Buffer 27 is `GATE0` in
   `demo/shell/pappus.mjs:22` and is `patbuf` on the board — the alloc order in
   `Engine_Pappus.sc:242…316` is `buf, bufr, buf2, buf2r, dbuf, 5×loop,
   17×env, patbuf, patbuf2` = 0,1,2,3,4,5–9,10–26,**27**,28, which is exactly
   what `bufferPlan()` reproduces.
3. **Survives TINY.** Yes — `estep = Stepper.ar(trig, 0, 0, (melen-1).max(0), 1)`
   (`:707`) and `egate = Index.ar(gpat.bufnum, (estep + mephase*i).floor % melen.max(1))`
   (`:802`), inside `mkgrain`. ⚠️ Buffer **28** (`patbuf2`) is dead — second
   granulator.
4. **Cost.** One `/b_setn` of sixteen floats plus two `/n_set`. The buffer is
   already allocated and already filled with ones (`pappus.mjs:92`).
5. **What could go wrong.** 🔴 **WRITE THE PATTERN AND LEAVE `melen` AT 1 AND
   NOTHING HAPPENS.** At the default `melen 1`, `Stepper`'s max is 0 and the
   index is `… % 1 = 0` — only slot 0 is ever read, so fifteen of the sixteen
   numbers you just sent are inert and the sound is identical. ⚠️ And `melen`
   must be an **integer**: CHAIN.md records that rolling it 0.2–1.0 made `% 1`
   = 0 and *"switched the granulator off in 30.5 % of rolls"*.
   **The separator is arithmetic and free.** The gate multiplies the trigger, so
   k ones out of sixteen must take the reported rate to `mrate × k/16` × open
   gates. `mrate 8`, one gate, E(5,16) → **2.5 grains/s** in the cell that is
   already on the page. 8.0 means the pattern is not being read; 0.0 means the
   pattern is all zeros, which is silence with passthrough still working.

### ⑦ AN ARPEGGIO — `mstrum`

1. **What you would hear.** The voices of the chord stop landing together and
   spread across the beat, so each pulse is a little roll rather than a block.
2. **Controls.** `mstrum 0` … `0.125`. It is a **subdivision of the grain
   period**: `strumsp = mstrum.clip(0,0.125) * (1/mrate.max(0.05))` (`:756`),
   and voice *i* is delayed `strumsp × i` (`:804`). At `mstrum 0.125` voice 8
   sits 7/8 of a period late, which is why no clamp is needed.
3. **Survives TINY.** Yes, `mkgrain`. `/grains/`'s patch table already uses
   0.05 … 0.45 on the board (values above 0.125 are clipped in-graph).
4. **Cost.** One `/n_set`. Worth nothing without ① — with one open gate there
   is nothing to stagger.
5. **What could go wrong.** ⚠️ Silently inert with a single voice, and the
   grain rate does not change (the `TDelay` delays the trigger, it does not drop
   it). **The separator:** with ①'s five gates open, the inter-arrival times of
   `/pgrain` go from five-at-once every 125 ms to five evenly spread. Histogram
   the gaps: `mstrum 0` gives a spike at 0 ms and one at 125 ms; `mstrum 0.125`
   gives five gaps of ~15.6 ms. That is a real measurement off data the page
   already receives.

### ⑧ THE ROOM — `rverb` + `rtime`

1. **What you would hear.** The cloud stops being a texture in front of you and
   becomes a sound in a place. Pushed to the top the tail stops decaying and
   simply holds.
2. **Controls.** `rverb 0.3` … `0.5` (wet/dry), `rtime 0.45` (≈ 4 s) … `0.99`
   (frozen). `rdecay = 0.3 + rtl^1.6 × 11.7 + rtl^20 × 9988` (`:1985`) — the
   freeze is a detent in the last few percent, not a creep.
3. **Survives TINY.** Yes, the tank is behind `if(bare.not)` (`:1976`). ⚠️ Only
   the **shimmer** is cut (`:2050`), so `rshimmer` and `rshimmersemi` are dead —
   a tail that rings and does not climb.
4. **Cost.** Two `/n_set`.
5. **What could go wrong.** ⚠️ `rverb 0` is an honest bypass whatever `rtime`
   says (`:2061`), so setting only `rtime` does nothing at all — and `rtime` is
   the knob whose name sounds like the effect. **The separator: shut the gates
   and time the fall.** At `sos 0.6` the output is grains only, so
   `gates [0,…]` makes the granulator contribute nothing and what is left is the
   tail. At `rverb 0` the meter drops inside the RESONATOR limiter's 50 ms
   lookahead (`:1432`); at `rverb 0.4, rtime 0.5` it takes seconds. An exact,
   cheap A/B — and it is also the deafness control for the whole reverb stage.

### ⑨ FOUR REPEATS, PITCHED AND PANNED — the DELAY stage

1. **What you would hear.** Four echoes of the cloud, each at its own moment,
   its own place across the stereo picture and its own pitch — the sound of a
   tape machine with four playback heads whose motors run at different speeds.
2. **Controls.** `swet 0.45`, `taptimes [0.19, 0.37, 0.55, 0.81, …]`,
   `taplevels [1, 0.72, 0.5, 0.34, …]`, `tappans [-0.8, 0.55, -0.35, 0.9, …]`,
   `tappitch [0, 7, -5, 12, …]` semitones, `sfb 0.35`, `scycle 1.0`,
   `sdiffuse 0.4`. `shold 1` freezes the line (`:1489`).
3. **Survives TINY, at four taps of eight.** `(if(tiny) { 4 } { 8 }).do`
   (`:1515`). ⚠️ **Indices 4…7 of all four arrays are inert** — they take a
   value, the command answers, nothing happens. That is the standing hazard in
   its purest form and it is the reason this idea is ranked below the
   granulator ones despite a large payoff.
4. **Cost.** Four `/n_setn` of eight floats, plus four `/n_set`. No buffer fill
   — `dbuf` stays at 11 s on TINY (only BARE shrinks it, `:272`).
5. **What could go wrong.** ⚠️ **A repitched tap does not keep its tap time.**
   `ph = Phasor.ar(Impulse.ar(0), BufRateScale × ratio, 0, dframes, resetpos)`
   (`:1523`) resyncs to `taptimes[i]` exactly **once, at synth start**, then
   free-runs at `ratio` — so a tap at `tappitch 7` drifts through the whole
   eleven seconds and wraps. That is the intended tape-motor behaviour and it
   means `taptimes[i]` is a starting position, not a delay time, for any tap
   with a non-zero pitch. ⚠️ `taplevels` defaults to `[1,0,0,0,0,0,0,0]`
   (`:428`) so three of the four live taps are silent until written. **The
   separator:** shut the gates (as in ⑧) and the delay must keep sounding for
   `scycle / (1 - sfb)` seconds; autocorrelate the meter frames at
   `taptimes[1] - taptimes[0]` and it must show a peak that is absent at
   `swet 0`.

### ⑩ TAPE DRIFT, FROM INSIDE THE GRAPH — `kwow`

🔴 **This is the answer to the parked pitch-LFO.** The modulation is generated
by `LFNoise2` at control rate *inside the SynthDef* — no JavaScript timer, no
`/n_set` on a clock, nothing to drop.

1. **What you would hear.** The pitch of the whole thing stops sitting still.
   Low down it is the slight unsteadiness of a tape machine; at the top it is
   properly seasick.
2. **Controls.** `kwow 0.3` (unsteady) … `0.8` (queasy) … `1.0`.
   `kwd = kw×0.0012 + kw³×0.026` is the wow depth and `kwf = kw⁴ × 0.006` the
   flutter, riding two `LFNoise2` at 0.08–0.78 Hz and 4.7/6.1 Hz respectively
   (`:1882`–`:1886`), into `DelayC.ar(outsig, 0.08, Lag.kr(0.0005+kwd, 0.3) + kwm)`
   (`:1888`).
3. **Survives TINY.** Yes — COLOUR is behind `if(bare.not)` (`:1581`) and is
   **always wet** by design. Nothing in COLOUR is cut on TINY.
4. **Cost.** One `/n_set`. Nothing else on the page changes.
5. **What could go wrong.** ⚠️ The engine's own closing comment (`:2091`) is a
   warning about exactly this: *"pitch modulation on a grain cloud reads as
   motion while the same thing on a sustained input reads as a fault."* Here it
   is safe, because the page's dry radio never passes through scsynth at all —
   `dry` is a WebAudio gain straight to the destination (`index.html:217`) and
   only `eng.out` carries the granulated path. So `kwow` cannot touch the dry
   radio, which is the case that sounds broken. ⚠️ It changes neither rate nor
   rms. **The separator:** on a frozen buffer, track the strongest FFT bin in
   `eng.meter` for ten seconds — at `kwow 0` its centre is fixed, at `kwow 0.8`
   it wanders. Failing that, `/s_get kwow` proves arrival and nothing more, and
   should be described as exactly that.

### ⑪ GRIT — `drive`, `crush`, `crushmode`

1. **What you would hear.** The cloud stops being clean. A little of it is
   warmth; a lot of it is a radio that is breaking up.
2. **Controls.** `drive 0.25` … `0.6`; `crush 0.25` with `crushmode 3`
   (1 = bits only, 2 = rate only, 3 = both, `:1665`).
3. **Survives TINY.** Yes, COLOUR is whole on TINY (`:1581`).
4. **Cost.** Three `/n_set`.
5. **What could go wrong.** ⚠️ **`drive` is fitted to hold loudness flat** —
   `mk = 1.00658 - 2.84907·dr + 3.75126·dr² - 1.62992·dr³` (`:1627`), *"within
   about half a decibel of clean"* — so an rms measurement reads "drive does
   nothing" and is measuring the make-up, not the saturator. Measure **crest
   factor or high-band energy**, never level. ⚠️ And `crush`'s blend is
   `XFade2(sig, crushed, ((cr*25).clip(0,1)*2) - 1)` (`:1669`): it is **fully
   wet by `crush 0.04`**, so the bottom 4 % of that knob is the whole crossfade
   and the remaining 96 % is depth. A slider that behaves like a switch in its
   first two pixels needs a curve, not a linear range.

### ⑫ A HISS THAT BREATHES — `noise`

1. **What you would hear.** A crackle that rises with the sound and falls away
   in the gaps, so it sits on the radio instead of under it. Silence in is
   still silence out.
2. **Controls.** `noise 0.25`, `noisetype 3` (DUST), `noisetone 2500`,
   `noisedecay 0.18`, `noisedyn 2.5`.
3. **Survives TINY.** Yes (COLOUR). ⚠️ **`noisetype` 4 and above is silent in
   a browser** — see §1.
4. **Cost.** Five `/n_set`.
5. **What could go wrong.** `sig = sig + (nz * env * ns * 4)` (`:1852`) where
   `env` follows COLOUR's own input, so with the granulator quiet there is no
   noise at all — turning the knob up on a silent cloud does nothing, which
   looks like a broken control and is correct behaviour. **The separator:**
   with `gates` shut (silence at the stage input) the meter must not move at
   any `noise` value; with them open it must. Both arms are needed — the quiet
   arm alone cannot tell "gated correctly" from "inert".

### ⑬ A PALIMPSEST — `msos` above 0.6

1. **What you would hear.** The eight seconds stop being replaced and start
   piling up: what the station said a minute ago is still faintly in there,
   under what it is saying now.
2. **Controls.** `msos 0.85` … `0.97`. `sosret = (sos*1.05).clip(0,1)` (`:639`)
   is how much of the old survives each pass; at 0.95 that is 0.9975.
3. **Survives TINY.** Yes, `mkgrain`.
4. **Cost.** One `/n_set` — the page already sends `msos 0.6`.
5. **What could go wrong.** ⚠️ **The write clips.** `BufWr.ar((capl*sosin + oldl*sosret).clip2(1), …)`
   (`:655`) — at high `msos` with a loud station the buffer saturates and the
   layering becomes distortion rather than depth. ⚠️ And `msos` also moves
   `sxf` (`:980`), but only up to 0.6, so above that it is purely a record
   control and the blend does not change. **The separator:** freeze (③) after
   thirty seconds at `msos 0.95` and the held buffer must contain material
   older than `mbuflen` — measurable as a rise in the buffer's own rms relative
   to the input's, or by reading it back with `/b_getn` and looking for
   low-level content everywhere rather than one pass.

### ⑭ COHERENT DRIFT INSTEAD OF DUST — `mspraymode 3`

1. **What you would hear.** The scatter stops being random per grain and
   becomes a slow wander: the whole cloud drifts through the held seconds
   together rather than each grain jumping somewhere else.
2. **Controls.** `mspraymode 3` (WARP) with the page's existing `scatter`
   slider on `mspray 0.4`. Modes: **1 RANDOM, 2 RANDOM MONO, 3 WARP,
   4 WARP MONO** (`:814`). WARP is two shared `LFNoise2` at `0.3 + mspray*3` Hz
   and `0.2 + mspray*2` Hz, rotated per voice (`:784`).
3. **Survives TINY.** Yes, `mkgrain`.
4. **Cost.** One `/n_set`. The slider already exists.
5. **What could go wrong.** ⚠️ Modes 2 and 4 drop the pan spread
   (`pan = Select.ar(mspraymode-1, [rnd2, DC.ar(0), warpb, DC.ar(0)])`), so
   switching to WARP MONO narrows the stereo picture as a side effect nobody
   asked for. **The separator: the picture, again.** RANDOM gives grain
   positions that are independent sample to sample; WARP gives positions with
   high lag-1 autocorrelation. Both are visible as dust versus a moving band
   once §0.1 is fixed, and computable from the same `pos` values.

---

## 3 · What I would actually build, in order

0. **§0.1 is already done by somebody else.** Prove the new `positions … of the
   ring` assert goes red when broken on purpose (`m[2]` again) before trusting
   any picture-based check below it.
1. **① the chord** — biggest change, granulator-only, and the grain-rate cell
   already on the page proves it took.
2. **② the read head** — removes the actual cause of the wash, costs one
   `/n_set`, and turns the grain picture from a point into a movement.
3. **③ freeze** — one `/n_set` for the largest gesture on the page, and it is
   what makes the still picture in §0.2 possible.

Those three are one session. ④ ⑤ ⑥ are the next session and are all cheap.

## 4 · Three page-level notes if any of this is built

- **The readout was six cells at 15:56 and four at 16:27** — `heard · kbps ·
  behind · grains`, with `gap` and `wet` rehomed. `mount()` throws on an odd
  count, so anything added here comes in pairs or with a deletion. `kbps` is
  now the weakest of the four: it settles once and then sits.
- **There is no control row any more** — `controls: []`, the granulator comes
  up with the sound. So every idea above is a **slider or a switch in the
  slider group**, not a button, and `createSliderGroup` already owns the
  columns. Build from `/kit/`: `createSlider`, `createSliderGroup`, and
  `choice.mjs` for `mscanmode` / `mswarmmode` / `crushmode` — three modes are a
  choice row, not three sliders.
- **Everything here goes behind control 0 or after it.** `verify.mjs` stops
  collecting 400 ms after the count last grew, and this page already routes
  every assert through one `finish()` burst for exactly that reason. A new
  check that waits on a freeze or a reverb tail belongs inside that burst, not
  beside it.
