# Typing in a headset, for `/weight/`

Written 2026-09-15, after this was reported from a real Quest:

> held demo: click in vr brought me back to browser.

Every claim below carries **MEASURED** (I ran it and read the number),
**READ** (I fetched a document and it says this) or **INFERRED** (my reasoning
from the two). Nothing here was measured on a headset. There is no `adb` on this
machine and no device attached (MEASURED: `which adb` answers nothing,
`adb devices` does not run), so every statement about what a Quest actually does
is READ or INFERRED and is labelled as such. The one thing that would settle it
is one headset run, and the command for it is at the bottom.

## 1. The flat answer: `dom-overlay` does not work in `immersive-vr`

**It is not a Quest limitation and it is not a permissions flag. It is refused
in Chromium for every session mode except `immersive-ar`, and the Quest Browser
is Chromium.**

READ, `third_party/blink/renderer/modules/xr/xr_system.cc`, function
`IsFeatureValidForMode`, lines 175 to 186
(<https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/xr/xr_system.cc#L175-L186>):

```cpp
case device::mojom::XRSessionFeature::DOM_OVERLAY:
  if (mode != device::mojom::blink::XRSessionMode::kImmersiveAr)
    return false;
```

The block immediately above it returns true for `kImmersiveVr || kImmersiveAr`
for hit test, anchors, hand input and layers. DOM overlay is deliberately in a
different bucket.

READ, Chrome Platform Status for "WebXR DOM Overlay"
(<https://chromestatus.com/feature/6048666307526656>), Blink component
`Blink>WebXR>AR(Android)`, and its motivation verbatim:

> For VR, inline sessions are by definition within the DOM, but we have deferred
> this capability for immersive VR sessions.

READ, `xr_session.cc` line 457: `SetDOMOverlayElement()` is the only place
`dom_overlay_state_` is ever assigned, and its only caller is guarded on
`kImmersiveAr`. **INFERRED from that: in an `immersive-vr` session
`session.domOverlayState` is `null`, so the page's existing
`overlay = !!session.domOverlayState` already reports the right answer.** It was
the page's response to that answer that was wrong, not the test.

Three things worth knowing beside it:

- READ, the W3C DOM Overlays module
  (<https://immersive-web.github.io/dom-overlays/>) does **not** restrict the
  feature to AR. It says "for use in the `requiredFeatures` or
  `optionalFeatures` sequences for immersive sessions", and line 246 explicitly
  contemplates "a desktop PC with an attached VR headset". So the specification
  allows what Chromium refuses. Reading the specification alone would have given
  the wrong answer here, which is why the implementation was worth finding.
- READ, MDN scopes `XRSession.domOverlayState` to "an `immersive-ar` XRSession"
  in its own first sentence.
- READ, a Quest 2 developer with Chrome remote debugging attached, 2022-11-23
  (<https://github.com/google/model-viewer/discussions/3969>), pasted the
  console from a real device:
  `Feature 'dom-overlay' is not supported for mode: immersive-ar`. That is the
  exact Blink string. INFERRED: upstream Chromium allows the feature in AR, so
  Meta's fork has disabled it even there. A runtime that refuses it in the one
  mode upstream permits is not going to permit it in the mode upstream refuses.

READ, Meta has never documented DOM Overlay as supported. Its Mixed Reality page
lists the WebXR modules Browser implements (AR, plane detection, anchors) and
DOM Overlay is not among them; a search of the Browser release notes for
"overlay" returns nothing. And Meta's own WebXR specification editor, on
<https://github.com/immersive-web/dom-overlays/issues/42> (2025-02-19):

> I don't see how dom-overlay could work on non-touchscreen devices

**So: asking for `dom-overlay` costs nothing and will keep answering no.** The
page still asks, because the request is one line, a runtime that grants it gets
the better interface for free, and the answer is published rather than assumed.

## 2. What else can take text in a session

### 2a. The runtime's own keyboard, raised by focusing a field. THIS ONE WORKS.

This is the route the page had missed, and it is a different feature from
`dom-overlay` rather than a workaround for it. DOM overlay is about showing
**the page's** elements. This is about the **runtime** drawing **its own**
keyboard over whatever the session is presenting, triggered by a DOM element
taking focus. The field itself is never seen.

READ, the core WebXR specification, `isSystemKeyboardSupported`:

> If `isSystemKeyboardSupported` is `true`, Web APIs that would trigger the
> overlay keyboard (such as focus) will show the system keyboard. The
> `XRSession` MUST set the visibility state of the `XRSession` to
> `"visible-blurred"` while the keyboard is shown.

READ, it is in Chromium's `xr_session.idl` line 56 behind
`[RuntimeEnabled=WebXRSpecParity]`.

READ, Meta documents it, with a recipe, at
<https://developers.meta.com/horizon/documentation/web/webxr-keyboard/>, from
Browser 26.1. READ, Meta's linked sample
(<https://github.com/emmanueljl/webxr-samples/blob/main/system-keyboard.html>)
requests **`immersive-vr`**, not AR, checks `session.isSystemKeyboardSupported`,
and calls `focus()` on a text field from a `select` handler. That is exactly
this page's gesture in exactly this page's session mode.

Four costs, all READ from Meta's page and the specification, and all of them
matter to `weight` specifically:

1. **No key events.** There is nothing to intercept. You read `value`, or listen
   for `input`. `weight` already drives its wall from an `input` listener, so this
   costs nothing here.
2. **Each showing overwrites the whole value.** The first key press replaces
   everything in the field. INFERRED: for `weight` that is survivable, because a
   word is replaced rather than edited, but it means the field's contents cannot
   be treated as a place to accumulate.
3. **`visibilityState` goes to `"visible-blurred"` while the keyboard is up**,
   and the specification says animation frame callbacks MAY be throttled and
   input source poses are forced to null. INFERRED, and this is the real cost
   for this page: `weight`'s whole argument is that a word resizes **as you type
   it**, and if frames are throttled during typing then the thing the page
   exists to show is the thing you cannot watch. Nobody knows how hard Quest
   throttles. That is a measurement, and it needs the headset.
4. **Browser 26.1 or later**, and it is behind a Chromium runtime flag upstream,
   so `isSystemKeyboardSupported` may be absent entirely. The page tests
   `!!session.isSystemKeyboardSupported`, so an absent attribute reads as no.

### 2b. A keyboard drawn in the scene

READ, this is what Meta's own editor recommends instead of DOM overlay, pointing
at a WebGL UI library. So it is the sanctioned route, not a hack.

**The honest answer about `demo/shell/xr-tablet.mjs`: it cannot carry a keyboard
as it stands, and it is not one refactor away.** READ, from the file itself:

- `createXRTablet` **takes no control list**. `DEFAULT_CONTROLS` is a
  module-global array and the canvas is sized from it at load. The file argues
  for this at length and the argument is about the product, not about
  convenience: "Two pages showing two different tablets is also exactly what
  'the same interface in both kinds of session' forbids. One list, both pages,
  both modes." A keyboard on `weight` means either putting thirty keys into the
  list every page draws, or reversing that decision.
- `controlAt(u, v)` is **one-dimensional**:
  `Math.floor((py - rowsTop()) / rowH())`, one control per row, the row spanning
  the full width. A keyboard is a grid. That is a second axis in the hit test,
  and the hit test is the part that is graded by `xr-pick-test.mjs` with no
  browser in the loop, so the grading has to grow with it.
- The slab is 0.20 m and `DESIGN_W` is 768 design pixels for two rows. READ, the
  file's own figure is 40.1 pixels per degree at a reading distance of 0.35 m.
  INFERRED: thirty keys at a size a controller ray can hit is a different object
  at a different distance, not the same object with more drawn on it.
- READ, the file's header states the rule directly: a control of a kind that
  already exists is one line, and **a new kind is a new branch in four places**
  (the layout, the hit test, the input, the state). A key is a new kind.

What a keyboard **would** get for free from that file, which is not nothing: the
press, hold, drag and release machinery; the canvas plus `texImage2D` idiom; the
`FILL_ALPHA` decision that makes one surface legible over both passthrough and
an opaque room; the site's own button style rather than a fourth invented one;
the beacon lines that distinguish "I held it and nothing happened" into its
three real causes; and a test file that grades the arithmetic under `node`.

INFERRED cost: this is real work in a file `weight` does not own and does not
currently import, and per CLAUDE.md the right move is to ask the owner of
`xr-tablet.mjs` whether a key is a kind it should grow, rather than to build a
second slab in `weight`. It should not be started before 2a has been measured on a
headset, because if 2a works this is redundant.

### 2c. Dictation

READ, Meta's virtual keyboard has dictation built in
(<https://developers.meta.com/horizon/design/virtual-keyboard/>). INFERRED: a
page that raises the system keyboard by the route in 2a gets dictation as a
button on that keyboard, with no speech API and no microphone permission of its
own. Meta's page does not explicitly say dictation is offered on the
WebXR-summoned keyboard, so that last step is inference.

The Web Speech API is **not established** on Quest. The only dated source found
is a 2022 master's thesis reporting that Quest 2's browser did not implement it;
the Meta forum thread on the subject returns HTTP 403 to every fetch. Nobody
should plan around it without testing `typeof SpeechRecognition` on a device.

### 2d. Do not type in VR at all: mark it in the room, type it on the way out

No API, no runtime capability, nothing to be refused. The choosing needs the
room and happens in the room; the typing needs a keyboard and happens where
there is one. Its cost is discoverability: nothing in the room says that leaving
will open a field on the word you lit. See the open request in section 4.

## 3. What was changed, and why that much

`demo/weight/index.html` only. The trigger no longer ends the session under any
circumstances.

- **It marks.** The word the trigger lands on is repainted in `HELD_RGB`, which
  is imported from `xr-ray.mjs` rather than retyped and is already the site's
  colour for "the pointer has hold of this". The word the pointer was yellow
  over goes yellow itself. MEASURED, through the page's own `drawScene` into an
  off-screen target: marking a word turns 6090 of the frame's 10317 lit ink
  pixels to the mark's colour, leaves 4227 white, and unmarking puts 0 back.
- **And it asks for the keyboard, in that order.** Where
  `session.isSystemKeyboardSupported` is true the field is focused as well, with
  the word left lit. The order is the safety: focusing a field is a request, and
  a runtime that claims the keyboard and raises nothing would otherwise leave a
  press with no answer at all. Marking first means the worst case is a lit word
  and a keyboard that did not come.
- **The word you left marked is what the field opens on when you leave.** That
  path already existed; what changed is who decides when to leave. It is the
  wearer, with the labelled button under their thumb, which is the way out the
  page already owned.
- `__demo.xr` now carries `overlay`, `sysKeyboard`, `presenting` and `frames`.
  The first two are the measurement this whole document is about, published
  where a headset harness can read them back. The last two are
  `verify-quest.mjs`'s own contract; without them its compositor lane reports
  silence about a session that ran.
- The paragraph and the instruction on the north wall both said things that were
  no longer true. The paragraph named two readout cells, `nearest` and
  `magnified`, that were deleted from this page two sessions ago. The wall said
  "Your own keyboard opens", in front of somebody standing in a runtime where it
  does not.

## 4. Recommendation

**Ship 2a and 2d together, which is what is now in the page, and measure 2a on a
headset before building anything else.**

The reason is that they fail in different ways and neither failure is silent.
2a is the good interface and it depends on a runtime attribute nobody here has
been able to read. 2d depends on nothing and always works. Running both means
the press has a visible answer in the room whatever the runtime turns out to do,
which is the property the old code did not have: it had one path that worked and
one that ejected you.

**Do not build 2b yet.** It is the largest piece of work available, it lands in a
file `weight` does not own, and it is redundant if 2a works. It becomes the right
answer only if a headset run shows `sysKeyboard` false, or shows it true and the
throttling in cost 3 makes typing unwatchable.

**Do not chase `dom-overlay`.** Section 1 is not a gap in the documentation, it
is a line of source that returns false.

**One open request to the kit.** `createXRQuit` takes its `label` as a parameter
captured at creation and exposes only a getter, so the badge cannot change what
it says. The badge currently reads `HOLD TO QUIT` at all times. With a word
marked, the true label is closer to `HOLD TO TYPE`, and that is the one place in
the room where 2d's discoverability problem can be fixed. That needs a
`setLabel` on `demo/shell/xr-quit.mjs`, which belongs to somebody else.

## 5. What a headset run would settle, and how to run it

`weight` carries the `WebXR` tag in `demo/manifest.mjs`, so the Quest harness picks
it up by name. With a Quest attached over USB and developer mode on:

```sh
node demo/verify-quest.mjs --self-test    # no device needed; MEASURED 3/3 green here
node demo/verify-quest.mjs weight           # the run that matters
DEMO_BASE=https://positron.studio node demo/verify-quest.mjs weight    # against the deploy
ADB=/path/to/adb node demo/verify-quest.mjs weight                     # if adb is not on PATH
```

What that run answers, from the line the page logs on entry and from
`__demo.xr`: whether `domOverlayState` is null in `immersive-vr` on this
Browser build (section 1, currently READ and not MEASURED), and whether
`isSystemKeyboardSupported` is true (section 2a, the thing the recommendation
rests on).

**What it cannot answer, and this needs saying.** READ, from the harness: it
presses every `.pos-controls button` with a user gesture and reads
`__demo.asserts`. **It cannot pull a trigger.** Nothing in it can reach
`xrAim`. So the three asserts added here grade the handler on this laptop by
driving it with a pose and a session stub, and whether a real trigger on real
hardware reaches that handler at all is a thing only a person wearing the
headset can report.

Two harness notes found while reading it, neither of them mine to fix:

- `verify-quest.mjs` asserts `declares a readout` on
  `Object.keys(__demo.readout).length > 0`. `weight` declares `readout: null` on
  purpose, and `shell.mjs` publishes `__demo.readout` as `{}` plus a
  `__demo.readoutOptOut` flag that the harness does not consult. INFERRED: that
  check will read red on `weight` for a reason that is not `weight`'s.
- The harness presses controls in order, so on an XR page it presses `Run in VR`,
  waits, and then presses `Run in AR` while a session is live. INFERRED: the
  second press fails and is reported as a page log line rather than as a harness
  fact.

## 6. What is still not known

- Whether `isSystemKeyboardSupported` is true on the Browser build on the
  headset this was reported from. Everything in section 4 turns on it.
- How hard `"visible-blurred"` throttles animation frames on Quest while the
  keyboard is up. This decides whether a word can be watched changing size as it
  is typed, which is the page's whole argument.
- Whether the system keyboard's dictation is offered on a keyboard summoned from
  inside a WebXR session, or only in the flat browser.
- Whether `SpeechRecognition` exists in the Quest Browser in 2026. The only
  dated evidence is from 2022 and says no, about a different device.
