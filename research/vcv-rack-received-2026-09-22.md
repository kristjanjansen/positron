# VCV Rack, received analysis: module architecture, headless, licensing, ARM64

> **Handed to this repository 2026-09-22** by the owner, in reply to the ask
> *"in the background investigate vcv project exp open source modules: how they
> run? do they run without gui / headless in mac or linux? do they run in pi /
> alsa? can we run them? in browser?"*

🔴 **THIS IS RECEIVED INPUT, NOT THIS PROJECT'S OWN MEASUREMENT, AND NOT ONE
CLAIM IN IT HAS BEEN CHECKED HERE.** It is recorded verbatim below because the
architectural argument in §11 to §14 is worth keeping whether or not every
technical detail survives verification. **Do not quote a figure, a flag, a
licence name or a build target out of this file as a fact about VCV Rack.**
Everything in it is a claim awaiting a source.

🔴 **AND ITS AUTHOR SAYS SO THEMSELVES, IN THE SECOND PARAGRAPH.** They report
that they could not reach `positron-hardware` or `BACKLOG.md`, so they took
*"this Pi has no soundcard"* on trust from the prompt rather than reading the
measurement, and they explicitly refuse to invent the rest. **That is the right
behaviour and it is also the scope of the document**: it is an argument about
architecture written from outside this repository, and every sentence it
contains about this desk arrived from the question rather than from the disk.

⚠️ **WHAT IS CHECKABLE AND IS NOT YET CHECKED.** A `--headless` flag on the
Rack binary. `GPL-3.0-or-later` plus a Non-Commercial Plugin License Exception.
A `lin-arm64` architecture in the build system. An `RtAudio` to ALSA path. The
claim that Rack 2's engine runs on the audio thread. The claim that a module's
`process()` is called once per frame rather than per block. Each of those is one
fetch away from being a fact or a correction, and `plans/plan-vcv-modules.md`
is where that work lands.

⚠️ **THE BROWSER QUESTION IS NOT ANSWERED HERE AT ALL.** The original ask had
five parts and this document addresses four. WebAssembly, AudioWorklet and
whether anybody has actually shipped Rack DSP in a browser are untouched.

✅ **WHAT IS WORTH KEEPING REGARDLESS OF VERIFICATION** is the split it draws in
§2 between three different things called headless, and the conclusion in §14
that the useful question is not whether Rack runs invisibly on a Pi but whether
legally reusable DSP can be separated from Rack's integration layer and given
this project's own node interface. ⚠️ That conclusion is an OPINION, arrived at
by argument rather than by experiment, and it should be read as the strongest
available hypothesis rather than as a finding.

---

## The received text, verbatim from here down

The architecture is promising, but there is a sharp dividing line between **running Rack** and **reusing Rack module DSP**. The latter is the interesting route for the universal patch-bay system.

One limitation first: I searched the available conversation/Library and public web for `positron-hardware` and the quoted `BACKLOG.md` finding, but those project files were not accessible. So I will **not invent their contents**. I'll treat the stated measured result, "this Pi has no soundcard," as a constraint, but cannot yet verify the board model or measurement from those files.

---

## 1. What a VCV module actually is

At the useful level, a Rack module is surprisingly small.

A plugin is a dynamically loaded library:

- `.so` on Linux
- `.dylib` on macOS

The normal Rack build system compiles the plugin as a shared library and links it against `libRack`.

Inside that plugin you register one or more `Model`s.

A model can create two things:

```text
Model
 ├── Module       ← state + DSP
 └── ModuleWidget ← panel + knobs + menus + drawing
```

The **Module** is the interesting half.

A typical implementation is conceptually:

```cpp
struct MyOscillator : rack::engine::Module {
    float phase = 0;

    MyOscillator() {
        config(NUM_PARAMS, NUM_INPUTS, NUM_OUTPUTS, NUM_LIGHTS);
    }

    void process(const ProcessArgs& args) override {
        float pitch = params[PITCH].getValue();
        pitch += inputs[VOCT].getVoltage();

        float frequency = ...;

        phase += frequency * args.sampleTime;

        outputs[AUDIO].setVoltage(...);
    }
};
```

Rack calls `process()` **once per audio frame**.

At 48 kHz, it therefore gets called 48,000 times per second.

`ProcessArgs` supplies things such as:

```text
sampleRate
sampleTime
```

Module state simply persists as C++ members.

The host supplies four principal banks:

```text
params[]    control values
inputs[]    incoming Rack voltages
outputs[]   outgoing Rack voltages
lights[]    state for UI LEDs
```

Inputs and outputs can contain up to **16 polyphonic channels**.

A module explicitly asks how many channels are present and reads/writes their voltages.

So the DSP contract is approximately:

```text
           host
             │
             ▼
      ┌──────────────┐
CV ──▶│ inputs[]     │
UI ──▶│ params[]     │
      │              │
      │ Module       │
      │ ::process()  │  ← sampleRate / sampleTime
      │              │
      │ outputs[]    │──▶ CV/audio
      │ lights[]     │──▶ state
      └──────────────┘
```

Rack then adds the larger machinery around this:

- cables
- scheduling
- bypass
- serialization
- module lifecycle
- plugin loading
- MIDI devices
- audio devices
- patch files
- UI
- parameter automation

An important modern detail is that Rack's engine runs directly on the audio thread rather than maintaining a completely separate engine thread synchronized with the audio thread.

An Audio module/device can therefore clock the engine.

This makes Rack modules much closer to small DSP actors than miniature applications.

---

## 2. HEADLESS: the load-bearing distinction

There are three substantially different things commonly called "headless."

They have completely different architectural costs.

### A. Rack application, but no window

This exists officially:

```bash
./Rack --headless
```

or:

```bash
./Rack -h
```

Rack launches a patch without displaying its normal window.

Conceptually:

```text
Rack GUI             ❌
Rack application     ✅
libRack              ✅
Rack engine          ✅
Rack plugin loader   ✅
Rack modules         ✅
Audio/MIDI subsystem ✅
```

This is useful for things such as:

- installations
- unattended generative patches
- MIDI-controlled systems
- kiosk-like deployments
- background Rack instances

But this is still **Rack**.

The window disappeared. The application did not.

### Verdict

This is useful operationally but **not the interesting headless architecture for this project**.

---

### B. Rack DSP engine without the Rack application

This is considerably more interesting.

Rack 2 separated substantial functionality into:

```text
libRack
```

with the standalone Rack executable sitting above it.

That makes something like this technically plausible:

```text
our daemon
   │
   ├── libRack
   │      ├── Engine
   │      ├── Module
   │      ├── Cable
   │      └── plugin loader
   │
   ├── ALSA
   ├── MIDI
   ├── network
   └── our patch/control model
```

But this isn't a small neutral DSP runtime.

It is still **Rack's engine and infrastructure**.

That means:

1. considerable architectural coupling to Rack;
2. Rack assumptions leak into our host;
3. Rack's licensing becomes relevant to the whole resulting program.

Technically interesting, yes.

As the foundation of a general MIDI/audio/video patching architecture, considerably less attractive.

---

### C. Extract a module's DSP and compile/link it into our engine

**This is the interesting interpretation of headless for this project.**

Instead of:

```text
our system
   ↓
Rack
   ↓
Rack plugin
   ↓
module DSP
```

we want:

```text
our DSP graph
      │
 ┌────┴─────────────┐
 │                  │
 ▼                  ▼
VCV-derived DSP    SuperCollider/etc
 │                  │
 └────────┬─────────┘
          ▼
       audio graph
          ▼
         ALSA
```

But there is a crucial wrinkle.

A Rack module isn't normally written against a tiny neutral DSP interface.

It inherits Rack's `Module` and commonly uses:

```text
rack::engine::Module
Input
Output
Param
Light
ProcessArgs
Rack DSP helpers
Rack SIMD helpers
JSON lifecycle APIs
```

So you cannot normally take:

```cpp
struct SomeRackModule : Module
```

and casually compile it into an unrelated program.

The modules that are particularly interesting are ones where the author has already separated:

```text
Rack adapter
     │
     ▼
independent DSP core
```

For example:

```cpp
class FilterDSP {
public:
    void setSampleRate(float);
    void setCutoff(float);
    void process(float* in, float* out, int n);
};
```

That is the reusable atom.

Rack can then become one adapter:

```text
                 ┌─ Rack Module adapter
FilterDSP ───────┼─ our Positron node
                 └─ perhaps CLAP/VST/etc
```

### Verdict

**C is the interesting one.**

Not:

> How do we run Rack invisibly?

but:

> How do we reuse useful DSP implementations without making Rack our runtime?

That distinction changes almost everything.

---

## 3. Licensing: there is no single "VCV license"

This is critical.

At least four things need to be distinguished:

1. Rack itself
2. the SDK/API
3. individual plugins/modules
4. visual assets

They do not necessarily have the same license.

### Rack Free itself

Current Rack Free source/binaries are licensed under:

```text
GPL-3.0-or-later
```

with VCV's additional **Non-Commercial Plugin License Exception**.

That exception primarily helps code going in the other direction:

```text
third-party plugin
        ↓
      Rack
```

It allows plugins distributed free of charge to use licenses other than GPL under the specified conditions.

It does **not** mean:

> Rack's engine is a permissively licensed library that can be embedded into arbitrary proprietary software.

Those are completely different propositions.

If significant Rack implementation code becomes part of our runtime, Rack's GPL obligations matter.

---

## 4. The SDK and plugin API

The Rack SDK is essentially the development interface for building things that run inside Rack.

Plugins build against Rack headers and link against `libRack`.

Therefore I would **not** architect Positron around:

> "The Rack SDK is our portable module ABI."

It isn't really designed to be that.

The Rack API carries Rack concepts with it:

```text
Module
Model
Param
Input
Output
Light
ProcessArgs
plugin lifecycle
Rack helpers
```

Using that API as our universal ABI would effectively make Rack's architecture our architecture.

That is exactly the coupling we want to avoid.

---

## 5. Individual community modules

This is where things become much more interesting.

Every plugin can have its **own license**.

Examples include modules/plugins distributed under GPL, while other Rack plugins can legally use MIT, BSD or other licenses under Rack's plugin licensing arrangement.

There can even be free closed-source Rack plugins.

Consequently there is no meaningful operation called:

> "Reuse VCV modules."

Instead, it has to be:

```text
for each plugin/module:

1. identify source
2. identify module license
3. identify bundled DSP dependencies
4. distinguish DSP code from Rack adapter code
5. determine whether DSP can be extracted
6. determine resulting license obligations
```

A plugin might look superficially like one project but internally contain:

```text
plugin
 ├── Rack integration       GPL/etc
 ├── original DSP           MIT
 ├── external filter code   BSD
 ├── FFT library            BSD
 ├── panel graphics         CC BY-NC
 └── fonts                  separate license
```

So the reusable unit may be considerably smaller than "the module."

---

## 6. DSP and visual identity must be treated separately

Graphics are another licensing trap.

Rack visual resources and module designs can have Creative Commons restrictions different from the DSP/source-code license.

Therefore:

```text
DSP implementation
```

and:

```text
module panel / graphics / visual identity
```

should be treated as completely separate assets.

For this project that is probably desirable anyway.

We want:

```text
original DSP
     ↓
our generic node/control description
     ↓
our UI
```

rather than recreating the VCV module panel pixel-for-pixel.

---

## 7. Raspberry Pi / Linux ARM64

There is an interesting split here.

Rack's source/build infrastructure **understands ARM64 Linux**.

Its architecture machinery recognizes forms such as:

```text
arm64
aarch64
```

and Linux is independently recognized.

So conceptually:

```text
lin-arm64
```

exists in the source architecture.

But that is different from saying:

> Raspberry Pi/Linux ARM64 is an officially supported VCV Rack distribution target.

The official SDK/build ecosystem has historically concentrated on:

```text
Windows x64
macOS x64
macOS ARM64
Linux x64
```

Linux ARM64 has not had the same official binary/plugin ecosystem.

Therefore the careful conclusion is:

> **ARM64 Linux is understood by Rack's source/build architecture, but Raspberry Pi/Linux ARM64 is not equivalent to the officially distributed Linux x64 target.**

For the Pi, assume **source-build territory**.

That includes:

```text
Rack
dependencies
audio dependencies
every plugin we want
```

And importantly:

```text
lin-x64 plugin binary
```

cannot magically run on:

```text
lin-arm64
```

Every native plugin has to be compiled for ARM64 too.

This substantially reduces the value of using the existing Rack plugin ecosystem directly.

---

## 8. ALSA

On Linux, Rack's audio infrastructure supports the normal Linux audio stack, including ALSA.

Conceptually the normal path is:

```text
Module output
    │
    │ Rack voltage
    ▼
VCV Audio module
    │
    ▼
Rack audio device abstraction
    │
    ▼
RtAudio
    │
    ▼
ALSA
    │
    ▼
Linux PCM device
    │
    ▼
DAC / USB interface
```

So if the machine exposes a working ALSA PCM device, Rack can ultimately feed it.

But this project's measured hardware finding changes the question completely.

---

## 9. This Pi has no soundcard

According to the project finding quoted in the request:

> the Pi has no soundcard

That decides the drum-machine question before it is asked.

ALSA support alone is irrelevant if there is no physical output device behind it.

The graph otherwise becomes:

```text
DSP
 │
 ▼
ALSA
 │
 ▼
???
 │
 X
```

ALSA cannot create a DAC that doesn't exist.

So before asking:

> Can Rack synthesize drums on ARM64?

the system has to answer:

> **Where do the samples physically go?**

Possible paths include:

```text
Pi
 │
 ├── USB class-compliant audio interface
 │       ↓
 │   analogue audio
 │
 ├── HDMI audio
 │       ↓
 │   receiver/display
 │
 ├── I²S DAC/HAT
 │       ↓
 │   analogue audio
 │
 └── network audio
         ↓
     another node
         ↓
        DAC
```

For this project, the last option is particularly interesting.

It doesn't necessarily represent a workaround.

It can be part of the architecture.

---

## 10. The Raspberry Pi doesn't necessarily need to produce analogue audio

Given the larger distributed patch-bay concept, we can separate:

```text
DSP execution
```

from:

```text
physical audio rendering
```

For example:

```text
Raspberry Pi
 ├── sequencer
 ├── synth
 ├── DSP graph
 └── audio frames
        │
        │ network
        ▼
M1 / another Pi / computer
 ├── receive audio
 ├── mix
 └── USB/CoreAudio/ALSA
        │
        ▼
      speakers
```

Or:

```text
Pi
 ├── MIDI
 ├── sequencing
 └── control
       │
       ▼
network
       │
       ▼
M1
 ├── synth DSP
 ├── effects
 └── audio interface
```

Those are two different deployments of the same graph.

That fits the larger architecture very nicely.

A node can advertise:

```text
CPU: ARM64
MIDI IN: yes
MIDI OUT: yes
audio DSP: yes
audio capture: no
audio playback: no
network audio: yes
```

Then the graph planner knows not to attempt:

```text
drum-machine → local speakers
```

but can construct:

```text
drum-machine
      ↓
network audio
      ↓
M1
      ↓
audio interface
```

This is much closer to the universal patch-bay idea.

---

## 11. What I would prototype

I would **not start by porting Rack to the Raspberry Pi**.

Start on macOS/Linux with one tiny experiment:

```text
              our host
                 │
       ┌─────────┴─────────┐
       │                   │
   MIDI/control        audio clock
       │                   │
       ▼                   ▼
   param values      process block
       │                   │
       └──────┬────────────┘
              ▼
       extracted DSP
              │
              ▼
          float audio
              │
              ▼
        CoreAudio / ALSA
```

Pick **one simple open-source Rack module**, preferably:

- oscillator
- filter
- envelope
- simple delay
- chorus

with cleanly separable DSP.

Build its DSP **without Rack or `libRack`**.

Then put our own tiny ABI around it.

For example:

```cpp
struct DspNode {
    void setSampleRate(double);

    void setParam(
        uint32_t id,
        float value
    );

    void process(
        const float* const* inputs,
        float* const* outputs,
        uint32_t frames
    );
};
```

Potentially extend that later to:

```cpp
struct DspNode {
    NodeDescriptor describe();

    void prepare(
        double sampleRate,
        uint32_t maxBlockSize
    );

    void setParam(
        ParamId id,
        float value
    );

    void process(
        const AudioBlock& audio,
        const ControlBlock& control,
        EventQueue& events
    );

    void reset();
};
```

Now Rack isn't our ABI.

**Our ABI is our ABI.**

---

## 12. Rack becomes an adapter/source ecosystem

Then we can build adapters:

```text
                  ┌────────────────────┐
                  │    Positron DSP    │
                  │       ABI          │
                  └─────────┬──────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
          ▼                 ▼                  ▼
     extracted          SuperCollider       native
     Rack DSP              DSP               DSP
```

And perhaps eventually:

```text
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
        CLAP               LV2              Faust
```

Rack itself could even become another host adapter:

```text
our DSP node
     │
     ▼
Rack adapter
     │
     ▼
VCV Rack
```

rather than Rack defining the fundamental abstraction.

---

## 13. This also solves the future video/3D problem

This matters because the eventual system isn't only an audio workstation.

The larger graph wants things like:

```text
MIDI
audio
OSC
network events
video
WebRTC
shader uniforms
OpenGL/WebGPU
3D transforms
tracking
presence
```

Making Rack the universal runtime would therefore create an awkward hierarchy:

```text
everything
   ↓
pretend to be Rack
```

Instead, define a more general graph:

```text
                Universal graph

 MIDI ─────┐
 OSC ──────┤
 sensors ──┤
           ▼
      control graph
           │
    ┌──────┼───────────┐
    ▼      ▼           ▼
   DSP   shader       3D
    │      │           │
    ▼      ▼           ▼
 audio   video      WebXR
    │      │           │
    └──────┼───────────┘
           ▼
        routing
           │
    local / network
```

Then VCV-derived DSP is simply one species of node.

---

## 14. The key conclusion

The useful question is **not**:

> Can we run VCV Rack headlessly on Raspberry Pi?

That is technically interesting but architecturally secondary.

The useful question is:

> Can we identify legally reusable DSP implementations from the Rack ecosystem, separate them from Rack-specific integration, compile them for ARM64 and expose them through our own portable DSP-node ABI?

That gives us:

```text
NO Rack GUI dependency
NO Rack application dependency
NO Rack patch model dependency
NO requirement that Rack owns the audio device
NO requirement that every machine runs Rack
NO requirement for the Pi to have physical audio output
```

while retaining:

```text
YES useful existing DSP
YES ARM64-native execution
YES our routing model
YES distributed processing
YES MIDI mapping
YES network audio
YES future video/3D integration
```

Rack then becomes a **source ecosystem and compatibility target**, rather than the foundation of the system.

That is a much stronger fit for the universal patch-bay architecture.
