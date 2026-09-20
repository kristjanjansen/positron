# plan-hardware — the box that IS the instrument, with no laptop under it

Status: **not started.** Written 2026-09-10, out of `rig/m1/` reaching
58 ms key→ear with Ableton Live on the other machine — and that other machine
being a Mac Pro running a headless browser, which is a large and expensive way to
hold a MIDI cable.

Read `rig/m1/README.md` first; every number below comes from it or
from HANDOFF item 0. `demo/notes/hardware-board.md` is the prose version of the
same argument for a reader who does not work here. `plans/plan-instrument.md` owns what
the two instrument PAGES share and this plan owes it deference — nothing here
changes a page.

---

## 0. One line

**Change one variable: the computer.** The chain that measures 58 ms already
exists and every part of it is either a browser API or a Cloudflare service, so
the cheapest first box is the smallest computer that runs the SAME page — and
that is a Raspberry Pi, because Chrome now ships for 64-bit Arm Linux and the
alternatives cannot speak the transport at all.

A survey of eight boards is in §3. The reason the survey does not decide anything
is in §2: the latency is not where the interesting boards are good.

---

## 1. The decision everything follows from

**The board choice cannot move the number that dominates, so pick the board that
makes the number attributable.**

Here is the whole budget, measured, on one clock, pressed here and heard here
(`rig/m1/README.md`):

| leg | measured | who owns it |
|---|---|---|
| notes out, direct peer-to-peer link | **6.00 ms** round trip | the network, in one room |
| notes out, via the Cloudflare relay | **68.90 ms** round trip | **geography** — two edge round trips |
| the Cloudflare Durable Object itself | **0.18 ms** | nobody; it is noise |
| Live's own buffer + output latency | 10.7 + 13.7 ms | Ableton, on the instrument machine |
| Opus framing, at 5 ms frames | ~20 ms in the 84 ms run | the codec settings |
| a browser's WebRTC audio cushion | **30–44 ms**, adapting (37.9 in that run) | the browser, and it cannot be set |
| our own MoQ playout floor | **10 ms**, chosen | us — and it maps ~1:1 into latency |
| **key press → sound, built-in synth, LAN relay** | **29 ms** | |
| **key press → sound, Ableton, LAN relay** | **58 ms** | |
| **key press → sound, Ableton, via Cloudflare** | **72–73 ms** | |
| **key press → sound, Ableton, WebRTC peer-to-peer** | **111–128 ms** | |

Three consequences, and they are the plan.

**The control leg is 7% of what you hear — WHEN the two ends can see each
other.** In one room, notes go up a direct link at 6.00 ms round trip and the
sound coming back is the entire cost. Over the open internet there is no direct
link, so notes take the same trip as everything else: ~34 ms each way, which is
about a third of the budget. Neither figure is something a board can improve.
A faster microcontroller does not shorten the distance to a Cloudflare edge.

**What a board CAN change is three small things**: how long its audio input sits
in a buffer before anything sees it, how long it takes to compress that audio,
and whether it can speak the transport at all. The first two are together worth
maybe 10–25 ms. The third is worth everything, because a board that cannot speak
the transport is not a candidate at any latency.

**So the first box should change exactly one thing.** The chain that produces
58 ms is a page in a headless browser: Web MIDI out, a captured audio input,
Opus through `AudioEncoder`, MoQ over WebTransport, and a playout ring we wrote.
Swap the computer and keep the page, and any difference in the number belongs to
the board. Swap the computer AND rewrite the transport in Rust AND change the
audio path, and you get one number and no way to say what caused it — which is
the mistake `CLAUDE.md` opens with: measure the quantity in question, not one
adjacent to it.

---

## 2. What the box has to do, stated as requirements

1. **Receive notes from the internet, dialling OUT.** It sits behind a domestic
   NAT with no port forwarding, ever. Cloudflare's relay is reached by dial-out
   and a Durable Object cannot be reached any other way. **Nothing in this plan
   may require an inbound port** — that is the same constraint that killed a
   relay in a Container.
2. **Send audio back the same way**, Opus, 48 kHz mono, ~64 kbit/s, 5 ms frames,
   grouped every 200 ms (`groupMs: 200` is zero-loss on both a LAN relay and
   Cloudflare and is simultaneously the fastest Cloudflare setting — there is no
   trade to weigh).
3. **Drive a hardware synth over MIDI**, and capture what that synth plays.
4. **Boot into its job**, with no laptop and nobody to click anything.
5. **Say what it is doing**, over the same relay, in numbers — notes received,
   bytes out the MIDI socket, frames published, gaps. A box you cannot question
   is a box you cannot debug from another country.

Requirement 4 is the one that quietly costs the most, and §6 says why.

---

## 3. The survey

Prices are approximate list prices in September 2026, not measured. Latency
figures marked *datasheet* are the vendor's, not ours.

| board | Linux? | can it speak MoQ? | Opus encode | audio in | MIDI out | ≈ money |
|---|---|---|---|---|---|---|
| **Raspberry Pi 4 / 5** | yes | **yes, today, in a browser or natively** | trivial | USB interface or I2S add-on | UART DIN, or USB | $100–150 all in |
| **Raspberry Pi Zero 2 W** | yes | natively yes; **not in a browser** (512 MB) | trivial | I2S add-on or USB | UART DIN, or USB | ~$40 |
| **Norns** | yes — it IS a Pi | as the Pi, on an older Pi | trivial | built in, 48 kHz stereo | USB | $120–225 kit, more assembled |
| **Bela Gem** | yes, real-time kernel | probably, unproven | trivial | built in, 24-bit/96 kHz | UART DIN, or USB | $69 + a USB network dongle |
| **Bela (classic)** | yes, 2016-era kernel | a fight | fine | built in, 44.1 kHz/16-bit | UART DIN | ~£150 |
| **ESP32-S3** | no | **no** — WebRTC instead, at ~260 ms *datasheet* | 85% of a core *at 48 kHz, third-party benchmark* | I2S codec chip, add ~$10 | UART DIN + 2 resistors | ~$25 |
| **Teensy 4.1** | no | **no** | fine on paper, no stack to feed | audio shield, 44.1 kHz | **the best on this list** | ~$60 |
| **Daisy Seed** | no | **no network of any kind** | n/a | built in, 48/96 kHz | UART DIN | ~$30 |

### Raspberry Pi 4 / 5 — the only board that can run today's chain unchanged

Chrome now ships for 64-bit Arm Linux and has been tested on a Pi 5
([CNX](https://www.cnx-software.com/2026/08/17/google-chrome-is-now-available-for-arm-linux-we-tested-it-on-a-raspberry-pi-5/)),
which is what makes "keep the page, change the computer" a real option rather
than a wish. Everything the chain needs is a browser API and none of them is
platform-specific in principle: WebTransport, `AudioEncoder` with Opus,
`getUserMedia`, Web MIDI. **In principle** is doing work in that sentence —
§6 turns each of them into a check.

Audio is the one place the Pi is worse than it looks. **The Pi 5 has no analogue
audio at all** — the 3.5 mm jack was dropped and the board space went to PCIe —
and no Pi has ever had an analogue INPUT. So capturing a hardware synth means a
USB audio interface (~$30 for a basic one, class-compliant, no driver) or an I2S
codec add-on board. Neither is exotic; both are a line item.

MIDI out has two shapes and the cheaper one is better. A USB-MIDI interface is
$15–40 and works. A DIN socket driven from the Pi's own serial pins is **two
resistors and a jack**, about $2: MIDI 1.0 is a 31250 bit/s serial line, and the
electrical spec was updated for 3.3 V parts with 33 Ω and 10 Ω in place of the
old 220 Ω ([MMA/AMEI CA-033](https://www.midi.org/wp-content/uploads/wpforo/default_attachments/1709416667-ca33-MIDI-10-Electrical-Specification-Update.pdf)).
At 31250 bit/s and 10 bits a byte, a three-byte note-on takes **960 µs** on the
wire — and nothing schedules it, because it is a serial port rather than a bus.

### Raspberry Pi Zero 2 W — the right size, one number too small

Quad-core Cortex-A53 at 1 GHz and **512 MB of RAM**
([Raspberry Pi](https://www.raspberrypi.com/products/raspberry-pi-zero-2-w/)).
The CPU is fine; the 512 MB is what decides it. Chrome does not live there, so
the Zero 2 W is only a candidate for a NATIVE client — which is P5, not P1.
It is the right target to shrink to once there is something to shrink.

### Norns — say plainly that it is a Raspberry Pi

A norns is a Raspberry Pi Compute Module 3 (CM3, or CM3+ after 2021) in a case;
a norns shield is a hat you put on your own Pi 3B+ or 4B, with a CS4270 audio
codec (CS4271 on boards from late 2021) fixed at 48 kHz, stereo line in and out
([monome docs](https://monome.org/docs/norns/shield/)). So its transport story is
the Pi story on an older Pi, and adding a QUIC client to it is the Pi work plus
norns' own Lua and SuperCollider constraints. monome no longer makes the shield;
it is open hardware and third-party kits run $120–225.

**What norns is genuinely good at is being an instrument you can pick up**:
screen, three buttons, three encoders, line in and line out, a script ecosystem,
and no laptop by design. That is the right ENCLOSURE for this idea and the wrong
place to develop it. Revisit at P4, not at P1.

### Bela — the board most likely to disappoint, and it is worth saying why

Bela's headline is real: **under 1 ms round-trip audio latency**, from a
real-time Linux kernel (Xenomai, or EVL on the newest boards) and a driver that
bypasses the normal audio path
([bela.io](https://bela.io/products/bela-systems/)). Bela Gem, shipping since
early 2026, puts that on a PocketBeagle 2 — quad Cortex-A53 at 1.4 GHz, 24-bit /
96 kHz, $69 for the stereo board
([Crowd Supply](https://www.crowdsupply.com/bela/bela-gem-stereo-and-multi)).

Three things make it the wrong first box anyway.

- **The 1 ms is about the leg that is already small.** In a 58 ms budget the
  audio buffer is a few milliseconds, and the pipeline is quantised at 5 ms by
  the Opus frame regardless. Buying a hard real-time kernel to fix that is
  measuring the quantity next to the one in question.
- **Networking is not in the real-time part.** Bela's guarantee covers the audio
  thread; the network stack runs in ordinary Linux like everywhere else. The leg
  that costs the money gets no benefit.
- **Connectivity is an afterthought on the hardware.** PocketBeagle 2 has **no
  wifi and no Ethernet on board** — it is USB-C and expansion pins
  ([BeagleBoard](https://www.beagleboard.org/boards/pocketbeagle-2)) — so a
  wireless box means a USB dongle, and the classic Bela images sit on a 4.4
  kernel from 2016, which is not where a modern TLS 1.3 and QUIC stack wants to
  live.

None of that says Bela is a bad board. It says its virtue is orthogonal to this
problem, and boards whose virtue is orthogonal are exactly the ones that get
bought.

### ESP32-S3 — separate "cannot" from "has not been written"

The honest split, because `CLAUDE.md`'s rule is to report the capability rather
than the error:

**QUIC and TLS 1.3 on this class of part are demonstrated.** ESP-IDF ships
mbedTLS with TLS 1.3, and QUIC has been ported: `demianzenkov/esp-QUIC` builds
ngtcp2 for ESP-IDF, and EMQX ran a full MQTT-over-QUIC client on an ESP32-C3 with
wolfSSL and ngtcp2 ([EMQ](https://www.emqx.com/en/blog/can-esp32-run-mqtt-over-quic)).
So the chip is not incapable.

**What does not exist is everything above QUIC.** MoQ over WebTransport is
QUIC, then HTTP/3, then the WebTransport session layer, then MoQ transport, then
a catalogue convention that our browser player already disagrees with the IETF
tools about (§7). There is no ESP-IDF implementation of the middle three, and
writing them is not a weekend. Calling this "impossible" would be wrong and
calling it "supported" would be worse.

**The path that DOES exist on this chip is WebRTC**, and it is well supported:
`espressif/esp-webrtc-solution` handles WHIP signalling with Opus audio on
ESP32-S3 and ESP32-P4, and Espressif's own figure is **about 260 ms** between an
ESP32 and a phone ([Espressif](https://www.espressif.com/en/solutions/multimedia-solutions/esp-webrtc)) —
a vendor number, not ours, and not measured the way key→ear is measured here.
Even generously discounted it is in a different class from 58 ms, and it lands on
the path this project already rejected: WebRTC's cushion belongs to the receiving
browser and cannot be set.

**Opus encoding is the second wall.** The ESP32 port of libopus disables
floating point outright ("the ESP32's FPU is way too slow for this") and reports
that **48 kHz encoding runs in real time only at complexity 1, and even then at
85% CPU** ([esp-libopus](https://github.com/XasWorks/esp-libopus)) — a
third-party benchmark on an older ESP32, not a measurement of the S3. The newer
`micro-opus` component adds ESP32-S3 DSP optimisations and is candid about
memory: ~30–50 KB of state per instance and a **120 KB working area per thread**
([ESP Registry](https://components.espressif.com/components/esphome/micro-opus/versions/0.3.5/readme)).
Whatever the exact S3 figure turns out to be, "most of one core for the codec" is
not a comfortable place from which to also run a QUIC stack.

Audio in is easy (the I2S peripheral plus a $5–15 codec chip; DMA buffers can be
tiny). MIDI DIN out is easy (a UART pin and two resistors). **USB-host MIDI is
not**: ESP-IDF's TinyUSB integration is device-side, supporting CDC and MIDI as a
device ([ESP-IDF docs](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/usb_device.html)),
which is the wrong direction for plugging a keyboard in.

### Teensy 4.1 — the best MIDI hardware here and the worst transport story

600 MHz Cortex-M7, an on-board 10/100 Ethernet PHY with IEEE 1588 packet
timestamping, and a real 480 Mbit **USB socket that other devices plug INTO**
([PJRC](https://www.pjrc.com/store/teensy41.html)) — so a USB MIDI keyboard or a
USB synth attaches directly, which nothing else on this list under $50 does. The
audio shield is an SGTL5000 at 44.1 kHz with 128-sample blocks, about 2.9 ms.

And there is no TLS 1.3 + QUIC + HTTP/3 + WebTransport + MoQ stack for it, nor a
realistic route to one. Wired Ethernet is a genuine advantage for a fixed
installation and it does not rescue the layer above.

Its right role is **on the other end of the DIN cable**: the thing the box plays.

### Daisy Seed — not a candidate, and that is fine

STM32H750 at 480 MHz with 64 MB of SDRAM, an audio codec on board, block sizes
down to a single sample and throughput latency quoted from 1 ms down to 0.01 ms
([datasheet](https://daisy.nyc3.cdn.digitaloceanspaces.com/products/seed/Daisy_Seed_datasheet_v1-1-5.pdf)).
**It has no network interface of any kind.** It cannot be the box. It is an
excellent $30 synth to hang off the box's MIDI socket, and naming it here is
worth the line only so nobody re-litigates it later.

---

## 4. The position

### Build first: a Raspberry Pi 5, running the same page

The one-line reason: **it is the only board that changes exactly one variable.**
Every other candidate changes the hardware AND requires rewriting the transport,
so its first number would be unattributable.

Second reason, which matters more over a month: everything the chain needs
already exists there. The risk is concentrated in three browser capabilities
(§6), each of which is a one-line check rather than a project.

Concretely, and it fits in a shoebox:

    Raspberry Pi 5, 4 GB                    ~$60
    USB audio interface, class-compliant    ~$30     (audio in AND out)
    DIN socket + 33 Ω + 10 Ω off the UART   ~$2      (MIDI out, 960 µs a note)
    power, card, case                       ~$30

If heat or power is the constraint, a Pi 4 is the same argument with less
headroom and an analogue output already on the board.

### Most likely to disappoint: Bela

Also one line: **its headline number is about the leg that is already small, and
its weakness is the leg that costs everything.** §3 has the three reasons. It is
the board somebody will suggest in the first five minutes of this conversation
because it is the one built for instruments, and that is precisely why it needs
answering with numbers rather than with taste.

### And name the shape that is probably right in the end

Not a board, a pair: **a Linux board for the transport, a microcontroller for the
MIDI and the sound.** The Pi dials out, decodes notes and publishes audio; a
Teensy or a Daisy on the far side of a DIN cable is the instrument. That is the
architecture the survey keeps pointing at, and it is explicitly NOT P1, because
the whole point of P1 is one variable.

---

## 5. Phases

### P1 — the capability report, before buying anything else

A page of about twenty lines, served by `demo/server.mjs`, opened in Chrome on
the Pi, that prints four facts and asserts nothing:

- `typeof WebTransport`
- `(await navigator.requestMIDIAccess()).outputs.size`
- `await AudioEncoder.isConfigSupported({codec:'opus', sampleRate:48000, numberOfChannels:1, bitrate:64000, opus:{frameDuration:5000, application:'lowdelay'}})`
- whether `getUserMedia({audio:true})` RESOLVES, REJECTS, or does neither

The last one is written that way on purpose. `rig/m1` has that exact
failure open on macOS right now — neither the success nor the failure line
logged, so the promise is still pending — and a pending promise is a different
defect from a refusal. Report the capability, not the error string.

**Done when** the four lines are in the repo as a saved log with the Pi's Chrome
version beside them, and each one says present, absent, or pending.

### P2 — the same page, on the Pi, and the same number

Run `synth.html` on the Pi against `play.html` on the dev Mac, unchanged, with
the built-in triangle synth first — no Ableton, no loopback device, nothing that
could be the Pi's fault or not. That arm has a Mac figure to beat: **29 ms
typical on a LAN relay, 86 ms on WebRTC.**

Both are round trips on ONE clock. That is not a stylistic preference: two real
machines here are **~57 ms apart** on their wall clocks with network time running
on both, and a cross-machine stamp difference already produced a transit reading
of **−14.2 ms**. A one-way number from the box is not a latency.

**Done when** the Pi has a key→ear figure measured the same way as the Mac's, on
the same LAN relay, with the gap between them stated as the board's cost.

### P3 — the DIN socket, and a synth that is not a computer

Two resistors, a jack, the Pi's serial pins, and something with a MIDI input on
the bench. Capture it through the USB interface and publish that.

Two known traps land here together. **The onset detector must be re-tuned or it
will silently measure one note in thirty** — the built-in triangle decays to
0.0001 in 450 ms so the detector re-arms between notes, and Drift does not; at
420 ms spacing only the first note of thirty was ever counted. A detector tuned
to one instrument is not tuned to instruments, and a hardware synth with a long
release is the same problem with a soldering iron. And **count the notes on the
far side of the boundary**: bytes clocked out of the UART, not messages queued.
`createMidiLane` counted what the page queued and read identically to delivery
while every note was being scheduled fifty-six years out.

**Done when** a hardware synth is playable from the other machine, and the note
count in the readout is a count of something that left the box.

### P4 — no laptop

A systemd unit, a fresh namespace minted per run and announced over the relay,
and a readout the box publishes about itself. The namespace is not a detail:
**a same-name rejoin bricks a draft-14 namespace** — five restarts under one
fixed name gave every subscriber `SUBSCRIBE code=4 Track not found` while the
publisher reported 1851 frames and zero errors.

The hard part is permissions, and it is a real cost of the browser path.
`launch-synth.mjs` grants `midi` and `audioCapture` over CDP before navigating,
and **that grant lives only while the CDP connection is held** — the launcher
exiting once turned a live, unmuted, enabled capture into digital silence with
nothing in any log. So on the box, something must hold that connection forever.
Whether a Chrome policy file on Linux can replace it is **unverified**; §6.

**Done when** the box comes up from cold power with nothing attached and a player
on another network can hear it.

### P5 — the native client, only if P2 says the browser is the cost

If and only if P2 shows the browser is where the milliseconds are, replace it
with a native client: Rust, `quinn` + `rustls` (which is what `moq-rs`'s
`moq-native-ietf` already uses), libopus, ALSA capture, ALSA raw MIDI. That is
also the point at which a Pi Zero 2 W becomes possible, because 512 MB stops
mattering when Chrome is gone.

Two things to know before starting it, both already measured here.

**A native client can skip HTTP/3 entirely.** `moq-native-ietf` picks its
transport from the URL scheme: `https://` offers the WebTransport ALPN, `moqt://`
offers MoQ's own ALPN and runs straight over QUIC with no HTTP/3 framing at all.
Whether Cloudflare's public relay accepts that ALPN is **not known here** and is
one command to find out (§6).

**The catalogue is where interop dies, and it has been measured in both
directions.** The browser player speaks hang's conventions (`catalog.json`, hang
schema); IETF `moq-pub` speaks `.catalog` with a WARP/CMAF schema. Publisher to
player and player to subscriber both fail at the catalogue fetch, before any
media logic, and the gap was estimated at about a hundred lines of shim. **A
native box must publish hang's conventions**, not the IETF tools' — or the
browser on the other end sees nothing and reports nothing useful.

---

## 6. What is genuinely uncertain, and what settles it

Each of these is a hypothesis until it has a number. None is settled by argument.

| unknown | how it is settled | cost |
|---|---|---|
| Does Chrome on Arm Linux enumerate MIDI OUTPUTS? There is field evidence of Linux Chromium returning an outputs map of length zero. | P1's second line, on the Pi, with a USB-MIDI device attached and again with a UART port. | one Pi |
| Does it support Opus at 5 ms frames with `application: 'lowdelay'`? `moq-audio.mjs` already falls back through three configs, so a silent downgrade to 10 ms or 20 ms would cost latency without erroring. | P1's third line, and then print which config `pickOpus` actually chose. | free |
| Does `getUserMedia({audio:true})` resolve for a USB capture device under headless Chrome on Linux? The same call is PENDING on macOS today. | P1's fourth line, then the control that ended the equivalent hunt on the Mac: capture something known to carry signal and read its level. | free |
| Can a Chrome policy file grant `midi` and `audioCapture` on Linux without a CDP client held open? | Write the policy, launch without CDP, read the permission state from the page. | free |
| Does Cloudflare's MoQ relay accept the raw-QUIC ALPN? | `moq-clock-ietf` against `moqt://draft-14.cloudflare.mediaoverquic.com`, from the Mac, today. Needs no hardware at all. | minutes |
| Does a Pi hold Opus at 5 ms frames plus a QUIC stack without dropping audio? | The gap counter that is already in the rig. `groupMs: 200` measured zero loss on both relays, so a nonzero gap count on the Pi is the board and not the policy. | P2 |
| What does the box actually cost against the Mac? | The gap between P2's key→ear and the Mac's 29 ms, same relay, same synth, same day. | P2 |
| Is a remote box playable at all? Predicted ~100 ms — 72–73 ms measured for Cloudflare audio return, plus roughly 28 ms more because the notes lose the direct link too. **This is arithmetic on measured parts, not a measurement.** | Two machines on different networks, key→ear, one clock. | P4 |

That last row is the one to be most careful with. **4 presses in 100 crossed
100 ms** on the Cloudflare control path, and ~100 ms is where playing starts to
feel sluggish under the fingers. A remote box may sit right on that line, and
predicting it is not the same as knowing it.

---

## 7. Traps

- **The box dials out and never listens.** No inbound port, no forwarding, no
  dynamic DNS. Cloudflare's relay is reached by dial-out; the same constraint is
  why a relay cannot live in a Container.
- **There is no fallback transport at Cloudflare.** Its MoQ relay has **no
  WebSocket listener**, so a network that blocks UDP/443 takes the box off the
  air with no second path. A self-hosted `moq-relay` does have one, via
  `[web.http] listen`. Decide which of those the box depends on before shipping
  it somewhere you cannot visit.
- **Do not quote a one-way stamp from the box as a latency.** Two machines here
  differ by ~57 ms with network time running, and the peer-to-peer estimator
  agrees with an independent check to ~3 ms. Round trips on one clock, or
  nothing. A box with no real-time clock at all makes this worse, not different.
- **A vendor's latency figure is not this project's kind of number.** The ~260 ms
  for esp-webrtc, the sub-1 ms for Bela, the 2.9 ms for a Teensy audio block:
  all datasheet or vendor figures, measured to their own boundary, none of them
  key press to sound. Quote them with the label attached or not at all.
- **A green transport is not a working instrument.** Every indicator read healthy
  while `latencyMax` defaulted to 2000 ms and transit counted down from 2030 ms
  — 4417 frames decoded of 4417, zero underruns, every sound two seconds old.
  The box will have the same failure available to it.
- **Assert the mechanism, not a downstream effect.** A box that reports "notes
  received" and nothing else can be entirely broken downstream and look fine.
- **`groupMs: 200`, and do not assume a longer Opus frame is safer.** 10 ms
  frames were WORSE over Cloudflare than 5 ms — 3.8% loss against 2.2%, and
  42 ms slower. Frame size and group size are not the same lever.
- **A same-name rejoin bricks a namespace.** Mint per run, announce it, never
  guess it.
- **Chrome refuses a pinned certificate older than 14 days**, which is why the
  LAN relay's certificate is 10-day ECDSA. That is a BROWSER rule, not a QUIC
  one — a native client can pin properly and ignore it. Do not carry the
  constraint into P5 by habit.
- **Do not buy the board whose virtue is orthogonal.** §3, Bela. The general
  form: before buying hardware for a latency, write down which leg it shortens
  and how many milliseconds that leg currently is.

---

## 8. Definition of done

1. A capability report from Chrome on the box, saying present, absent or pending
   for each of the four things the chain needs — never an error string.
2. A key→ear figure from the box, measured as a round trip on one clock, on the
   same LAN relay as the Mac's 29 ms, with the difference stated as the board's
   cost.
3. A hardware synth played from another machine through the box's own MIDI
   socket, with the note count taken on the far side of the wire.
4. The box comes up from cold power with no laptop, mints and announces its own
   name, and publishes a readout about itself.
5. Every number in this plan that is a prediction is either measured or still
   labelled as a prediction. The ~100 ms remote figure is the one to watch.

---

## 7b. Two corrections from pricing and from our own relay (2026-09-10)

### The Pi price is RAM, so buy the small one

Estonian retail reads **196–249 EUR** for a Pi 5 8 GB against roughly 90 EUR
international, and the reason is not Estonian markup: **LPDDR4 is up sevenfold in
a year**, and Raspberry Pi raised prices twice in 2026 — February (+$30 on 8 GB,
+$60 on 16 GB) and April (+$50 on 8 GB, +$100 on 16 GB). The 16 GB Pi 5 is now
$205, about 70% above launch.

The price scaling gives it away without reading a single article: 8 GB at 196 EUR
and 16 GB at 362 EUR is a 166 EUR step for 8 GB of memory. The memory IS the
price.

**So buy the 2 GB Pi 5.** This box runs one browser page and has no use for 8 GB.
That was a specification chosen out of habit, and habit is now the expensive part.

Worth knowing for later: **Pi Zero, Pi 3 and the older boards are explicitly
unaffected**, because Raspberry Pi holds years of LPDDR2 inventory. The cheap
boards stayed cheap, which changes the calculus for P5's shrink target.

### ESP32-S3 over OUR relay, which needs no QUIC

The survey rules the ESP32-S3 out because it cannot do QUIC, so no MoQ, leaving
WebRTC at ~260 ms *datasheet*. That is true and it is the wrong question, because
there is a third transport and we own it.

**`ws.positron.studio` is a verbatim relay and it carries binary.** An ESP32 does
TLS WebSocket comfortably — no QUIC stack, no SDP, no ICE:

    ESP32 -> Opus -> WebSocket -> the Durable Object relay -> browser

Every number for that path is already measured. The **DO hop costs 0.18 ms**; the
rest is geography, ~34 ms each way. Opus at 64 kbit/s is **8 KB/s** against the
relay's 512 KiB/s per-socket budget — three orders of magnitude of headroom.

**The binding constraint is the MESSAGE RATE, not bandwidth**, and it is exactly
known: **60 msg/s**, measured off the wire as `MSG_BURST` 120 plus 60/s (298
delivered in three seconds, twice, at two different send rates). At 20 ms Opus
frames one frame per message is 50 msg/s — under the cap with no headroom, and
**the relay drops silently when it bites**: no error, no close, no backpressure.

So **batch**: two or three frames per message puts the box at 17–25 msg/s with
room to spare, and `seq` in the envelope is already there to make any loss
visible, which is the entire argument that kept `seq` in plan-ws.

Predicted, and labelled as arithmetic on measured parts rather than a
measurement: ~34 ms out + synthesis + a 20 ms frame + ~34 ms back + the playout
floor, so **100–120 ms**. Worse than MoQ on a LAN relay (58 ms measured),
comparable to WebRTC, and reachable on a $25 board.

**The self-sounding box helps the ESP32 most of all.** If the box makes its own
Rhodes it needs no audio input and no capture codec — synthesise and encode, and
nothing else. It stays tight: Opus at 48 kHz is ~85% of one core by a
third-party benchmark, so the second core carries the synth and there is no third
core for surprises.

### MEASURED 2026-09-10: raw PCM goes through, and Opus is unnecessary here

`rig/m1/ws-audio-probe.mjs`, through the deployed relay, echo timed
on one clock so no offset is in it:

| configuration | kbit/s | msg/s | delivered | loss | round trip p50/p95 |
|---|---|---|---|---|---|
| **PCM 48k, 20 ms frames** | 768 | 50 | **400/400** | **0.0%** | 36 / 45 ms |
| **PCM 48k, 40 ms frames** | 768 | 25 | **200/200** | **0.0%** | 39 / 51 ms |
| PCM 24k, 40 ms | 384 | 25 | 200/200 | 0.0% | 40 / 56 ms |
| Opus 64k, 20 ms | 64 | 50 | 400/400 | 0.0% | 33 / 37 ms |
| PCM 48k, 10 ms | 768 | **100** | 646/800 | **19.3%** | 31 / 39 ms |

**So the codec is not needed on this path.** Opus exists to save bandwidth and
bandwidth is the abundant thing here — 768 kbit/s is 19% of one socket's budget.
Dropping it removes the 85%-of-a-core encode, the encoder's own frame delay, and
a library from the firmware. It bought only **3 ms** of round trip for all that
CPU, which is the whole argument in one number.

**And the cap bites exactly where the relay says it does.** 100 msg/s lost 19.3%
with no error, no close and no backpressure — the token bucket, visible only
because the receiver could count. Stay at or under 50 msg/s; 20 ms frames give
that with room.

This test cost nothing and needed no hardware. It is the cheapest thing that
could have killed the ESP32 path, so it is the thing to run first.

### What this does NOT change

The Pi is still the first box, for the reason it always was: it changes exactly
ONE variable. The ESP32 path needs a new transport, a new synth and new hardware
at once, and would produce one number with no way to say what caused it. Build
the Pi, get a baseline, then let the ESP32 try to beat it with everything else
held still.

---

## 8. The real use case, which reframes all of it (2026-09-10)

Everything above was written against an abstract box. Here is the actual one,
and it is better because it is smaller.

**A Novation Circuit lives in another studio, in another city, and its owner is
not there.** Three wants, which turn out to be one box:

| when you are | the box is |
|---|---|
| in that studio | a MIDI patchbay you re-patch by voice |
| in another city | the same patchbay, with audio coming back |
| either | something that has to survive being alone |

### 8.1 A Circuit is LOOP-SHAPED, and that dissolves the latency problem

The sequencer runs ON the Circuit, in the room where it is. Nothing is scheduled
remotely and nothing has to agree about time. What crosses the wire is
*steering* — change pattern, mute a track, turn a macro, nudge tempo — and none
of that is latency-critical. A mute landing 100 ms late lands on the next step.
A filter sweep at 100 ms delay feels like a filter sweep.

So the two things measured as hard this month simply do not arise:

- **no clock problem.** The Circuit is its own clock, so the ~57 ms
  machine-to-machine offset and the ~3 ms residual after estimation are not in
  this path at all.
- **no note-timing problem.** There are no remote notes to schedule.

What is left is audio coming back at ~100 ms, and you are LISTENING to that, not
playing on it. **What you lose is finger drumming**, and no board fixes that.
Say so plainly rather than letting somebody discover it after buying.

### 8.2 The patchbay is what justifies the box

A box that only works when you are away is hard to justify; a box that is your
patchbay every day and is also reachable from another city is easy. Build the
second thing.

**Linux already IS the patchbay.** The ALSA sequencer gives every MIDI port a
number and a name, and `aconnect 20:0 24:0` wires any output to any input, live.
A Pi with a USB hub is the hardware: the Circuit is class-compliant USB MIDI, so
it is a cable, not a DIN socket and two resistors.

What is missing is only the FACE — and because that face talks over the relay it
is identical from the next room and the next country.

### 8.3 Voice belongs in the browser, not in the box

Put speech where the microphone and the CPU already are:

    phone or laptop -> browser speech-to-text -> "connect circuit to microfreak"
      -> the relay -> the box runs the patch

The box never runs a model, needs no microphone, and the voice half is testable
on a laptop today with no hardware at all.

### 8.4 A patch is a VALUE, not a sequence of commands

The tempting shape is voice -> `aconnect 20:0 24:0`. The failure mode forbids it:
**a wrong MIDI patch is SILENT.** Nothing errors, nothing lights up, notes just
do not arrive — and you are in another city. Generated commands that might work
are the wrong shape for something that fails quietly.

A document can be checked before it is applied:

```jsonc
{ "v": 1, "name": "circuit drives everything",
  "links": [
    { "from": "circuit", "to": "microfreak", "carry": ["note", "cc"] },
    { "from": "circuit", "to": "digitakt",   "carry": ["clock", "transport"] }
  ] }
```

Every name resolves against the ports ALSA actually reports, or is named as
unresolvable. The model's job becomes **intent -> document**, which is
verifiable, rather than **intent -> commands**, which can only be run and hoped
for. That is `plans/plan-score.md`'s rule one level up: normalise the envelope, carry
the payload verbatim, and never let a generated thing be authoritative over a
thing you can check.

Three consequences:

- **The naming layer is the product.** ALSA says `20:0` and `Circuit MIDI 1`;
  nobody says that out loud. The map from "the circuit" to a port is what a human
  wants, and once it exists, voice is easy and so is typing.
- **Patches diff and recall.** "What did I have patched last Tuesday" is a real
  question in a dawless rig, and a document answers it where a command history
  does not.
- **A re-patch is an event with a timestamp**, which puts it in this project's
  own substrate: a session's patching history is a timeline you could replay.

⚠️ **`carry` matters more than `from`/`to`.** Most dawless pain is clock and
transport arriving somewhere they should not, and a patch that says only "A -> B"
hides exactly that. Making the message classes explicit is what makes this better
than cables rather than a metaphor for them.

**Narrowed 2026-09-10, building `rig/board`: `carry` is not expressible in
`aconnect`.** An ALSA subscription is unfiltered — it carries every message class
the source emits, there is no per-class flag on the connection, and the
sequencer's event filter is per *client*, governing what a client receives rather
than what a subscription between two other ports carries. So the box **refuses** a
subset rather than connecting everything, because over-connecting would leak
clock and transport silently, which is the exact failure the document exists to
prevent. Filtering needs a process in the middle that reads and re-emits — which
makes the box the timing path, the thing the next paragraph warns against. Read
from the tools rather than measured; **first thing to check on the board.**

⚠️ **Do not let the box become the timing path.** Route clock as directly as the
rig allows and measure the jitter `aconnect` adds against a direct cable before
trusting it. Same rule this project already applies to OSC and to the servo.

### 8.5 Unattended is now the binding requirement

Nobody is in that room. Every failure this month needed a human standing at the
machine:

- Live blocked twenty minutes on a crash-recovery dialog, having written **zero**
  log lines;
- audio capture died because a permission grant expires when its client
  disconnects, leaving a live, unmuted track carrying digital silence;
- the machine went to sleep mid-measurement;
- `sshd` wedged and needed Remote Login toggled.

So the box must boot into its job with no login and no dialog, come back after a
power cut, hold its permissions across restarts, and **say that it is alive
before you need it** — which this project already has, in the device log sink and
the BUILD stamp that attributes a report to a build.

**This makes one unknown critical**: can a Chrome policy file on Linux grant
microphone access permanently? If yes, the measured 58 ms browser path runs
unattended and the box is a Pi with a systemd service. If no, something must hold
that grant forever, and that is the argument for a native client. One evening on
one Pi settles it.

### 8.6 What can be simulated, and what cannot

**Not a Cloudflare Container.** Containers are the wrong instrument here: the
patchbay needs ALSA's sequencer, which is a KERNEL facility, and a container
shares the host's kernel with no `/dev/snd` and no `snd-seq`. It also cannot
answer anything about ARM, and the whole browser question is "does Chrome for
arm64 Linux do this". A container would answer the questions we are not asking.

⚠️ **HALF WRONG, corrected 2026-09-10.** This generalised from the patchbay to
the whole box, and the instrument does not need a kernel at all. FluidSynth's
`file` audio driver is **realtime-paced** and writes to a pipe, so sound is made
with no `/dev/snd`, no ALSA, no audio server and no mixer. Measured in an arm64
container: 4.14 s of wall clock produced 3.92 s of audio, six programs on six
channels, and the whole of `rig/board` ran there against the live relay —
**13/13 green, streaming, in Docker, with no sound hardware in existence.**

The line falls between two things this plan treated as one:

| | needs a kernel | runs in a container |
|---|---|---|
| making sound | no | **yes** |
| a MIDI keyboard plugged in | yes | no |
| capturing a real audio device | yes | no |
| the patchbay | yes | no |

Three consequences, none small:

- **A cloud instrument is real.** Notes over the relay, audio back, no hardware
  anywhere — a complete product for anyone without a box.
- **It is how the box gets tested.** Everything except real ports and real
  capture is now exercisable in CI, which this plan listed under "needs the
  board".
- **A container can hold a sample library the Pi cannot.** 2 GB of RAM rules out
  any serious SFZ or SoundFont set, which makes the cloud the *better* home for
  big libraries rather than a fallback.

`board.mjs` needs no change to run there — it dials OUT, the one thing a
Cloudflare Container can do, and this repo already ships one in
`workers/pub/container/`.

**Docker on the M1 is better and free.** `--platform linux/arm64` on an Apple
Silicon machine is NATIVE arm64 Linux, not emulation, so it answers the
software-only half properly: does Chrome for arm64 Linux exist and run, does
`AudioEncoder.isConfigSupported` accept 5 ms `lowdelay` Opus, does WebTransport
reach the relay from arm64 Linux.

**What no simulation answers**: real MIDI ports, real audio devices, unattended
boot, and how a Pi behaves after a power cut. Those need the board, and they are
precisely the things that broke this month.

### 8.7 The box is a SERVICE, not a peer

An earlier draft of this section made the browser load-bearing. That was wrong,
and the correction is the important part of the plan.

**The Pi connects out to Cloudflare and does its thing, whether or not anyone is
watching.** It holds a socket to the relay and reconnects forever; it reports
what MIDI ports exist; it accepts a patch document, validates it and applies it;
it streams audio when asked; and it keeps its own state, so the truth about the
studio lives IN the studio.

Nothing in that list mentions a browser. The box behaves the same at 3 a.m. with
nobody connected as it does when a page is open.

The draft that coupled the box's behaviour to a session on the other end
reproduced the exact fault §8.5 complains about: a studio that exists only while
somebody is looking at it is a SESSION, and the whole point of a box is that it
is an OBJECT.

**So the interface is the message shape, not the page.** `plans/plan-ws.md` already
settled the envelope — `type`, `from`, `at`, `seq`, carried verbatim — so the box
speaks what everything else here speaks, and then:

- a browser is a client;
- `curl` and a node script are clients;
- a phone is a client;
- another box could be a client.

Two consequences worth having:

**It is testable without a browser**, which matters because driving Chrome over
CDP is what made this month's debugging slow. `node something.mjs` can list
ports, apply a patch and read state back.

**The browser gets to be genuinely good**, because it is no longer carrying
reliability: draw the patch graph, light the ports as MIDI flows, scrub the
audio, show what changed and when. Rich, disposable, and if it crashes the studio
does not notice.

Audio still has to LAND somewhere, and a browser is the most convenient renderer
— no install, works on a phone. But that is a choice of listener, not a
dependency: `ffplay` would do, and so would a second box with speakers.

### 8.8 Where the audio goes, and where a model does not

The audio goes to **whoever asked for it, and nowhere else**:

    Circuit -> the box captures -> the relay -> a listener

**Cloudflare is a dumb pipe here, deliberately.** The relay's whole value is that
it does not parse, which is why the Durable Object hop costs 0.18 ms. Nothing
stores the audio and no model touches it.

⚠️ **Do not transcode in the Worker.** It is the tempting place and it is the
wrong one: it makes every message a parse, it spends Worker CPU per listener, it
adds encode and decode to the latency, and it solves a problem that does not
exist — raw PCM measured **zero loss at 768 kbit/s**, which is 19% of one
socket's budget. `shout` already showed a Worker carries continuous audio as a
PIPE at −0.8 ms of carry. **Compress at the source or not at all**, and if a
listener on mobile data needs Opus, encode it on the box, which has the CPU the
ESP32 did not.

**No container either.** A container adds a hop, a cold start and a bill to solve
a problem nobody has.

A model belongs in exactly one place: **the words, not the sound.**

| | |
|---|---|
| the browser's own `SpeechRecognition` | free, no round trip, Chrome-only, ships audio to Google anyway |
| **Workers AI (Whisper)** | consistent, any browser, infrastructure already in use, costs a little |

Voice commands are not latency-critical, so the round trip is free in the only
sense that matters. **Not a local model on the box**: a speech model is exactly
the weight that makes an unattended machine fragile.

The second place a model earns its keep is **intent -> patch document**, under
8.4's rule: it produces a DOCUMENT validated against the ports ALSA reports,
never commands that are run.

Which divides the work, and keeps the part nobody can walk over to boring:

- **the box**: ports, patching, capture, a socket. No models, no browser.
- **Cloudflare**: a dumb pipe, and optionally a model for words.
- **the listener**: the face, the microphone and the speakers.

### 8.9 What can be simulated, and what cannot

**Not a Cloudflare Container.** The patchbay needs ALSA's sequencer, a KERNEL
facility, and a container shares the host kernel with no `/dev/snd` and no
`snd-seq`. It cannot answer anything about ARM either. It would answer questions
nobody is asking.

⚠️ **HALF WRONG, corrected 2026-09-10.** This generalised from the patchbay to
the whole box, and the instrument does not need a kernel at all. FluidSynth's
`file` audio driver is **realtime-paced** and writes to a pipe, so sound is made
with no `/dev/snd`, no ALSA, no audio server and no mixer. Measured in an arm64
container: 4.14 s of wall clock produced 3.92 s of audio, six programs on six
channels, and the whole of `rig/board` ran there against the live relay —
**13/13 green, streaming, in Docker, with no sound hardware in existence.**

The line falls between two things this plan treated as one:

| | needs a kernel | runs in a container |
|---|---|---|
| making sound | no | **yes** |
| a MIDI keyboard plugged in | yes | no |
| capturing a real audio device | yes | no |
| the patchbay | yes | no |

Three consequences, none small:

- **A cloud instrument is real.** Notes over the relay, audio back, no hardware
  anywhere — a complete product for anyone without a box.
- **It is how the box gets tested.** Everything except real ports and real
  capture is now exercisable in CI, which this plan listed under "needs the
  board".
- **A container can hold a sample library the Pi cannot.** 2 GB of RAM rules out
  any serious SFZ or SoundFont set, which makes the cloud the *better* home for
  big libraries rather than a fallback.

`board.mjs` needs no change to run there — it dials OUT, the one thing a
Cloudflare Container can do, and this repo already ships one in
`workers/pub/container/`.

**Docker on an M1 is better and free.** `--platform linux/arm64` on Apple Silicon
is NATIVE arm64 Linux, so it answers the software half properly.

**What no simulation answers**: real MIDI ports, real audio devices, unattended
boot, and how a board behaves after a power cut. Those need the board, and they
are precisely what broke this month.

The order that follows: prototype the naming layer and the patch document against
`aconnect -l` output with no hardware; test what is left in arm64 Docker; buy one
board only for the questions that remain. And with no browser on the box, that
board is the **1 GB Pi 5 at 65 EUR** rather than the 4 GB at 159 — the RAM crisis
turned "browser or native" into a 94 EUR question, and native wins it twice.
