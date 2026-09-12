# plan-xr — a headset, measured rather than guessed (2026-09-12)

`research/quest-xr-2026-09.md` opened by admitting **"nothing here was measured
on a headset."** A Quest 3 arrived, and this is what changed. Everything below
carries a tag: **MEASURED** (on the device, this session), **DOCUMENTED** (a
vendor or spec says so), **UNCONFIRMED** (still nobody has looked).

Built and live: **`/scene/`** — a room from one 32-bit number, in a window, in
VR, and in passthrough.

---

## 0. The short answer

**The web path is not a compromise, and the numbers say so.** A hand-rolled
WebGL2 scene — no three.js, no engine, no build step — holds **89.8 fps in VR
and 90.0 fps in passthrough** on an Adreno 740, full rate on a 90 Hz panel, with
compositing the real room costing nothing measurable.

**Five defects in this project's own code were found by putting the headset on,
and four of them were invisible from a desktop.** They are §2, and they are the
most valuable thing in this document — three separate runs looked identical from
outside, and what separated them was instrumentation added after the third
failure rather than before the first.

⚠️ **The generative idea that works here is not "ask a model".** It is `pappus`'s
rule one level up: **the seed is the document**. A room is 10–32 things with
places, sizes, spins and a palette, all from one 32-bit number — so it is **four
bytes on the wire**, two headsets in one room agree by construction, and the
negative control ("the same seed rebuilds the same room, byte for byte") is
checkable rather than rhetorical. MEASURED on the device: 1861 bytes, identical.

---

## 1. The device, measured

| | | |
|---|---|---|
| browser | `OculusBrowser/150.1.0.24.52.1046134268 Chrome/150.0.7871.224` | MEASURED |
| GPU | `Adreno (TM) 740` | MEASURED |
| XR framebuffer | **3360×1760, two views, 1680×1760 per eye** | MEASURED |
| frame rate, VR | **89.8 fps** sustained over 1080 frames | MEASURED |
| frame rate, passthrough | **90.0 fps** over 1920 frames | MEASURED |
| 2D window | **1280×670 CSS at dpr 1** — exactly as documented | MEASURED |
| `environmentBlendMode` | **`alpha-blend`** in `immersive-ar` | MEASURED |
| `session.frameRate` | **not reported** | MEASURED |
| `navigator.xr` | `XRSystem`, **3 methods**, all `[native code]` | MEASURED |
| user agent | says **"Quest 3" on a 3S** | MEASURED |

⚠️ **That last row is the empirical form of §1.7's claim** that a 3 and a 3S
cannot be told apart by user agent. Nothing in this repo interprets the model
string; `verify-quest.mjs` prints it raw and never claims which Quest it is.

⚠️ **Desktop Chrome has a genuinely native `navigator.xr`** — `XRSystem`, an
accessor on `Navigator.prototype`, every method `[native code]` — and answers
`immersive-vr: false`. MEASURED. So **"is the XR object real" is a question NEXT
TO "is there a headset"**, and answering the second with the first passes every
laptop in the world. That is why the guard has two in-page gates plus `adb
getprop`, and why its self-test asserts the laptop case as a *positive* control.

---

## 2. 🔴 Five defects the headset found

Each of these was invisible on a desktop, and each has a rule attached.

### 2.1 `session.renderState.baseLayer` is null until the next frame

`updateRenderState()` **queues**; it does not apply. Reading
`baseLayer.framebufferWidth` one line after creating a session throws a
TypeError — and because the throw escaped the handler, `requestAnimationFrame`,
the controller exit and the bail-out timer were **all** never registered.
Session live, nothing drawing, no way out, no log line. **Three runs.**

Read the layer inside `requestAnimationFrame`, where it exists.

### 2.2 `gl.clear` ignores the viewport

Both eyes share one framebuffer, so a clear on the second view wipes what the
first drew — black. Only the first eye may clear; the rest clear **depth**
inside a `gl.scissor`, or the second eye tests against the first eye's depths.
**A viewport is not a clip region.**

⚠️ The comment above that loop already said *"only the first may clear it"* and
the code then cleared on both. **A correct comment over wrong code is worse than
none** — it is what a reader checks against.

### 2.3 `bindAttribLocation` after `linkProgram` is a no-op

It only takes effect at the **next** link, so calling it afterwards reads like a
fix and does nothing. The Quest reported `GL_INVALID_OPERATION` (1282) on its
first frame and **drew a correct-looking picture anyway**, because the linker
happened to choose the same slots — right on this GPU, undefined on the next.

**Assert on `gl.getError()`.** A WebGL page will happily draw a right-looking
picture with an error pending, and only the device said so.

### 2.4 `alpha: false` makes passthrough impossible

The compositor puts the real room *behind* the page and can only do that through
transparent pixels. With no alpha in the framebuffer there is nothing to clear
to zero, and the room is **replaced by black** rather than composited under.

⚠️ And **assert on `environmentBlendMode`, never on the session's name.** A
session can be called `immersive-ar` and still composite `opaque` — a room
replaced rather than seen through, which presents as a *drawing* bug.

### 2.5 A batched log loses exactly the lines that matter

`createShipper` holds lines for 2 s before POSTing, and **entering an immersive
session is precisely when a browser stops being generous with timers.** So the
lines that say *where* something hung were the ones that never arrived — and the
uncaught-error handler was on the same batcher, so the net meant to catch a
silent failure was itself waiting on the timer that had stopped.

`navigator.sendBeacon` survives it. Every step of session entry now ships a line
before and after, with a 6 s deadline turning a hang into a named failure.

### 2.6 …and one that was not ours

🔴 **The device log itself was evaporating.** `pub`'s ring buffer was an
in-memory array on a Durable Object; MEASURED, a line posted at 02:07:46 read
back fine and was **gone by 02:08:32**. The headset reported correctly, the
reader saw `(nothing reported)`, and the obvious conclusion was that the device
had sent nothing. Persisted now, re-checked at 120 s.

**Any "the phone reported nothing" conclusion drawn before 2026-09-12 is
worthless.**

---

## 3. What a room in a headset needs that a page does not

All three reported from inside the headset, none predictable from a desk.

- **A visible pointer.** Dragging worked and still felt like guessing. A beam
  down the ray, a marker where it stops, the aimed thing lit and the held thing
  lit brighter. **Colour says what is happening to a thing**, as everywhere else
  here.
- **A way to push what you are holding.** Carrying a thing at exactly its grab
  distance means one that is already too close can only ever stay too close.
  Thumbstick, clamped at 0.4 m. ⚠️ And the room pushes anything inside 0.45 m of
  your head back to arm's length on its own, because **a thing you cannot back
  away from is one you cannot aim at**.
- **A way out that the page owns.** Grip leaves; a dead-man's switch leaves on
  its own if nothing has drawn after 4 s. *"Press the Meta button"* is not an
  answer a page gets to give about its own bug.
- ⚠️ **One controller is normal.** "Squeeze both grips" was the only route to
  accepting an update, and it is a gesture that cannot be made. **A gesture
  nobody can perform is not a gesture.**
- 🔴 **The 2D page is invisible inside a session.** `d.log`, the readout and
  every control are behind your face. Anything to be read while wearing the
  headset must be drawn *in the scene*.

---

## 4. The update story, in four tiers

A reload ends a WebXR session and nothing can change that. The tiers exist to
keep as much work as possible on **this** side of a reload.

| | what changes | the session |
|---|---|---|
| `dev.status` | a line to read | untouched |
| `dev.shader` | new GLSL | **recompiled in place, survives** |
| `dev.module` | a new generator, re-imported cache-busted | **survives** |
| `dev.reload` | everything else | ends — **you pick when** |

⚠️ The first three apply themselves; the fourth never does. It puts a line up
and waits for the A button, because a session ending under somebody with no
warning is the disruptive refresh this exists to avoid.

⚠️ **It cannot re-enter by itself afterwards.** `requestSession` needs a
transient user activation and a freshly loaded page has none — so the honest
design is **one press** on the far side, not a promise of none. The page returns
with the control primed and relabelled.

`rig/scene/say.mjs` is the sending end. ⚠️ **One message, not a stream** — the
relay's measured ceiling is 60 msg/s and it drops silently past it, so a build
log piped through it would be indistinguishable from a broken socket.

---

## 5. One shader body, two GPUs

`mirror`'s claim was two copies of one text kept in step by hand. Now the body
travels and each end supplies its own first line: **`310 es` on the board,
`300 es` in the browser.** A body arriving *with* a `#version` is refused rather
than guessed at.

**Crossfaded on both ends, by different tricks, because the cheap one differs:**

- **browser** — two pictures to their own targets and a third program that mixes
  them. A fade using a `uAlpha` would only work on shaders that agreed to carry
  one, and the point is to accept a body somebody just wrote. ⚠️ The **mixed**
  result is what feeds back: the shader reads its own previous frame, so feeding
  it one arm of a fade makes the trail disagree with the picture.
- **board, and `scene`** — `GL_CONSTANT_ALPHA` blending. The old picture is
  already in the framebuffer, so drawing the new one over it with
  `glBlendColor(0,0,0,k)` gives `new*k + old*(1-k)` for nothing. ⚠️ **With
  `LEQUAL`** — the second pass is the same geometry at the same depth, so the
  default `LESS` rejects every fragment and the fade does nothing while reading
  as correctly wired.

⚠️ **And the swap happens in the frame loop, never in the draw function** —
that runs once per eye, so swapping there shows one look to the left eye and
another to the right.

🔴 **A typo must not cost a picture, and on the board it must not cost a
reboot.** `mkprog` called `exit(2)` on a link failure. `mkprog_try` returns 0
and the running program keeps drawing, printing the compiler's own words.

🔴 **And report what the COMPILER said, not what the pipe did.** `video.shader`
answered `ok: true` for a body the renderer then refused, because writing to
stdin succeeds whatever the GLSL says — a count of what was QUEUED reading
identically to what LANDED. That is `createMidiLane.scheduled()` in a new
costume. MEASURED after the fix: `ok=false compile: 0:10(15): error: illegal use
of reserved word 'this'`.

---

## 6. Where this goes

**`scene` is the substrate test. The reason to own the headset is the archive at
scale.** Of positron's three subjects — time, latency, archives — exactly one
gets categorically better in a headset: *scale you can stand in*.
`plan-megatimeline` wants the ERR archive as one zoomable century; on a screen
that is a horizontal scrollbar, and in a headset it is a corridor you walk down,
where *"how much of 1965 survives"* is a thing you see rather than a number you
read. It needs no model and no new infrastructure — the catalogue is committed
and the media already streams cross-origin.

Audio belongs there rather than in `scene`: a room with 1965 radio **positioned**
in it is a different thing from a room with a soundtrack, and only worth
building once there is somewhere to put it.

**Not to build:** a general 3D engine (WebGL2 + `OCULUS_multiview`; WebGPU in a
session is flag-gated, so R&D not deliverable) · a timeline in 3D (one position
surface per page) · three.js, unless §6 proves the hand-rolled path cannot do it,
which is a measurement and not a preference.

---

## 7. What would have to be true

1. **A harness can drive the device.** `demo/verify-quest.mjs` exists and its
   guard is proved — `--self-test` goes 3/3, and sabotaging `nativeVerdict`
   takes it to 0/3. ⚠️ It has never run against a headset: `adb` is not
   installed here. **Until it does, `scene`'s headset half is human-verified and
   the page says so.**
2. **The emulator is caught.** UNCONFIRMED against the real IWER extension; the
   self-test catches an IWER-shaped stub. The `getprop` gate is what remains if
   the native gate ever falls, which is why it is first.
3. **A room replays from its seed.** MEASURED on the device, byte-identical.
4. **A guard has said no, in this run.** One impossible room and one impossible
   drag, both refused, both asserted.
5. **`worst` measures one session.** It was a max since page load and read 310
   then 453 ms across two runs — neither about frame pacing in a headset. ⚠️ **A
   readout you have to apologise for on every quote is measured wrong, not
   explained badly.** Reset per session now.
6. **Nothing claims which Quest it is.**
7. **A doff is noticed before anything streams.** UNCONFIRMED and currently
   harmless: `scene` costs nothing when taken off. `visibilitychange` fires ~10 s
   late, the 3S has no proximity sensor, and Cloudflare bills delivered minutes —
   so a watchdog is required **before** §6's archive media, not after.
8. **The headset layout fits 670 px.** UNCONFIRMED — `shell.css` names the
   numbers to move. Nobody has reported whether the readout and controls are on
   screen together.
