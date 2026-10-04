# plan-pico: what a Pico 2 W can do for positron besides routing USB MIDI

> Asked 2026-10-04, verbatim in `BACKLOG.md`: *"Plan all of them"*: the Pico 2 W
> as a patchbay node over wifi, light output (WS2812 and DMX) for the timeline's
> light lane, sound (PWM, I2S DAC, USB audio), a clock box, BLE MIDI, physical
> controls and CV.
>
> **NOTHING HERE IS BUILT, AND ALMOST NOTHING IS MEASURED.** It is written from
> documentation, other people's repositories and this repository's own files.
> Every claim carries one label:
>
> - **READ**: opened today, the words are there, URL given. Pages were read
>   through a fetch tool, which summarises; a number that will be built on is
>   worth one look at the raw source.
> - **SECONDHAND**: a search snippet or a page quoting another. Not to build on.
> - **MEASURED**: run on this machine today (three commands against our own
>   relay), or measured earlier in this repository, with the file named.
> - **INFERRED**: my reasoning, or arithmetic on READ numbers.
>
> It stands on `plans/plan-route-core.md` (the core and the board choice),
> `plans/plan-universal-routing.md` (the graph, the media, the registry),
> `plans/plan-wish-dawless.md` (the Pi as hub), `plans/plan-hardware.md` §7b
> (an MCU on our relay), `research/moholy-nagy-partiturskizze-2026-10-04.md`
> (the light lane) and `research/pi-screens-estonia-2026-10-04.md` (how
> Oomipood was read). And on what exists: `rig/pico/firmware/` (the C router,
> route-core inside, UART DIN, SSD1306, four keys, built in Docker, 14/14 PASS
> in the emulator), `rig/pico/sim/` (rp2040js), `demo/shell/graph-registry.mjs`,
> `/patchbay/`, `/wall/` and `/partitur/`.

## 1. The verdict

**Build the network node first, because it is what makes every other item a
node in the graph instead of a gadget.** And it is cheaper than this plan
expected when it started:

- ✅ **MEASURED 2026-10-04: the relay takes a plain `ws://` upgrade.**
  `curl` with `Upgrade: websocket` to `http://ws.positron.studio/room/pico-probe/ws`
  answered **`HTTP/1.1 101 Switching Protocols`**, and
  `http://ws.positron.studio/room/pico-probe/stats` answered **200** with no
  redirect. So a Pico can join `studio-1` with **no TLS at all** today: no
  mbedTLS, no certificate, no clock, no 16 KB record buffers.
- The registry protocol is already the right one. A Pico announces
  `graph.announce` like `/wall/` does, answers `graph.ask`, and takes
  `light.set` addressed to its own port. `/partitur/` already sends exactly
  that to `/wall/` (READ, `demo/partitur/index.html:310`,
  `demo/wall/index.html:79`).

Then **light** (a WS2812 strip, about €30, the first physical fixture for the
light lane), then the **clock box** (almost no parts, and the one place a
microcontroller beats every other machine here on a number). The rest are
worth doing in the order of §10, and two are honestly weak here: **sound** and
**CV**, because the desk has a Circuit and a Pi that already make sound and no
modular gear to take CV (INFERRED from the instrument list in
`plans/plan-wish-dawless.md` §10).

**Pins fit, all nine items at once, with none spare and no multiplexer** (§9).
PIO fits.
The one hard conflict is the single USB socket: host for the router, or device
for USB MIDI and USB audio, not both, unless PIO-USB is added (§8.3).

## 2. What the board is, and what is already on it

| fact | value | label |
| --- | --- | --- |
| chip | RP2350A, two Cortex-M33 at 150 MHz, FPU, 520 KB SRAM, 4 MB flash | READ, [product brief](https://pip-assets.raspberrypi.com/categories/1214-rp2350/documents/RP-008374-DS-1-rp2350-product-brief.pdf) |
| PIO | **3 blocks, 12 state machines** (RP2040 has 2 and 8) | READ, brief; and `NUM_PIOS _u(3)` in the SDK's `platform_defs.h`, read in our Docker image |
| DMA, PWM, UART, SPI | 16 channels, 12 slices, 2, 2 | READ, SDK `platform_defs.h` in the image |
| wireless | CYW43439 on GP23 (REG_ON), GP24 (data), GP25 (CS), GP29 (clock, shared with the VSYS ADC) | READ, `src/boards/include/boards/pico2_w.h` in the image, and [the Pico docs](https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html) |
| what CYW43 takes of PIO | **one state machine, on the first block with one free**, via `pio_claim_free_sm_and_add_program_for_gpio_range` | READ, `cyw43_bus_pio_spi.c:119` in the image |
| ADC on the header | GP26, GP27, GP28 only. GP29 is the wifi clock | READ, Pico docs |
| silicon | boards ship as A2, A3 or A4. **A4 fixes erratum E9** (an input with a pull-down could latch near 2.2 V). Read the marking on the chip | READ, [PCN 32](https://pip-assets.raspberrypi.com/categories/1262-pcn/documents/RP-008978-PC/Pico-2-Products-Moving-to-RP2350-A4-Silicon-Stepping), [news](https://www.raspberrypi.com/news/rp2350-a4-rp2354-and-a-new-hacking-challenge/) |
| price | **€12.00, 20 at Peterburi tee, 9 at Järve** | READ, [Oomipood](https://www.oomipood.ee/product/raspberry_pi_pico_2_w_wireless_arm_cortexm33) |

Already used by `rig/pico/firmware/` (READ, its README): **UART0 on GP0/GP1**
(DIN), **I2C0 on GP4/GP5** (SSD1306 at 0x3C), **K1 to K4 on GP10 to GP13**
(pull-ups, which is the safe side of E9). The UF2 is about 51 KB, bss about
11 KB. The SDK image (`positron-pico-sdk:2.2.0`) has **no submodules**:
`lib/btstack`, `lib/cyw43-driver`, `lib/lwip`, `lib/mbedtls` and `lib/tinyusb`
are empty directories (READ, `ls` in the image). Every wireless item below
starts with `git submodule update --init` in the `Dockerfile`.

## 3. Item 1: a patchbay node over wifi

**What it is.** The Pico joins room `studio-1`, says what it is, and takes
route tables, scenes and light from `/patchbay/` and `/partitur/`. It shows on
`https://positron.studio/graph/` and on `/patchbay/`'s live desk like any page.

### 3.1 The three transports

| | wss to `ws.positron.studio` | plain ws to the relay | ws or UDP to the Pi on the LAN |
| --- | --- | --- | --- |
| works today | yes (browsers use it) | **yes, MEASURED 101 today** | **no**: the board runs no LAN server. `rig/board/*.mjs` has no `createServer`; its only UDP sockets are local OSC to synths (READ, grep) |
| new code on the Pi | none | none | a server, discovery, and a bridge into the room |
| new code on the Pico | lwIP TCP, a WebSocket client, mbedTLS | lwIP TCP, a WebSocket client | lwIP TCP or UDP, mDNS |
| works without the Pi | yes | yes | **no**, which undoes `plan-route-core`'s point that the Pico can carry on alone |
| works in another building | yes | yes | no |
| RAM for TLS | two record buffers default to 16 KB each (in and out); the pico-examples config cuts out to 2 KB and leaves in at 16 KB (READ, [mbedTLS API](https://mbed-tls.readthedocs.io/projects/api/en/v3.6.2/api/file/ssl_8h/), [pico-examples config](https://raw.githubusercontent.com/raspberrypi/pico-examples/master/pico_w/wifi/mbedtls_config_examples_common.h)). Roughly 20 to 40 KB with the handshake, INFERRED, against 520 KB | 0 | 0 |
| handshake | **no RP2350 figure exists anywhere found.** RP2040 at 125 MHz: RSA-2048 about 3 s, EC P-256 about 18 s with mbedTLS 2.x (READ, [forum](https://forums.raspberrypi.com/viewtopic.php?t=362979)); newer mbedTLS about 1 s (SECONDHAND, [gershnik](https://gershnik.github.io/2024/04/17/fast-https-arduino-nano-rp2040.html)). Paid once per connection | 0 | 0 |
| certificate | the relay presents an ECDSA P-256 leaf from **Google Trust Services WE1**, chain to **GTS Root R4**, cross-signed by GlobalSign Root CA; the leaf expires 2026-12-03 (**MEASURED**, `openssl s_client -showcerts` today). So pin the root, never the leaf, which rotates about every 90 days (INFERRED from the dates). The pico-examples pattern is one hardcoded root PEM (READ, [tls_verify.c](https://raw.githubusercontent.com/raspberrypi/pico-examples/master/pico_w/wifi/tls_client/tls_verify.c)); checking validity dates also needs the time, which needs SNTP | none | none |
| known bug | SDK issue: TLS 1.2 handshakes failing `mbedtls_pk_verify() -0x4e00` after the move to mbedTLS 3, milestone 2.3.0. ⚠️ CORRECTED 2026-10-04: **CLOSED 2026-06-12**, cause a missing `MBEDTLS_SHA384_C`, and it applies to us: the relay's intermediate is signed by GTS Root R4 with ecdsa-with-SHA384 on P-384 (MEASURED with `openssl s_client`), so SHA-384 and the P-384 curve must both be on, as pico-examples' config already has them (READ, [#2633](https://github.com/raspberrypi/pico-sdk/issues/2633), `research/pico-open-issues-and-modular-2026-10-04.md`). `rig/pico/net/` builds with both | none | none |
| RP2350 help | SHA-256 hardware is used **only if** `MBEDTLS_SHA256_ALT` is defined in our config; the TRNG feeds entropy by default (READ, [pico_mbedtls.c](https://raw.githubusercontent.com/raspberrypi/pico-sdk/2.2.0/src/rp2_common/pico_mbedtls/pico_mbedtls.c), [rand.h](https://raw.githubusercontent.com/raspberrypi/pico-sdk/2.2.0/src/rp2_common/pico_rand/include/pico/rand.h)) | | |
| latency | relay round trip p50 36 ms (MEASURED 2026-09-10 in `plans/plan-hardware.md` §7b, from the M1, not from a Pico) | same | board round trip 4 ms on one network (MEASURED 2026-09-30, `plans/plan-away-webrtc.md` §9, data channel, not a Pico) |

### 3.2 Recommendation: plain `ws://` to the relay first, `wss://` second, never UDP for this

- **Plain ws first** because it is measured to work, costs nothing in RAM or
  boot time, and lets the network code be proved before mbedTLS is in the
  picture. What it gives up is confidentiality and integrity on the path. It
  gives up **no authority**: `studio-1` is an open room and anything that can
  reach it can already send a table, with or without TLS (INFERRED from
  `workers/relay/src/index.js`: verbatim, no parse, no auth).
- ⚠️ **It works because of a setting nobody chose for this.** If "Always Use
  HTTPS" is ever turned on for the zone, plain HTTP is redirected for all
  subdomains (READ, [Cloudflare](https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/)),
  and a WebSocket client does not follow a redirected upgrade (INFERRED). So
  `wss://` is step two, not optional: the firmware keeps one `#define` for the
  scheme and both paths are built and tested.
- **wss second**, with mbedTLS 3.6 from the SDK, `MBEDTLS_SHA256_ALT` on, GTS
  Root R4 pinned, `MBEDTLS_SSL_IN_CONTENT_LEN` cut to 4 KB because every
  message this node takes is small (INFERRED; a server can send 16 KB records,
  so this needs `max_fragment_length` or a test that the relay never does).
- **Not UDP**, because it needs the Pi bridge and the bridge is a new server
  on the Pi for a gain (32 ms) that nothing on this node needs: light, tables
  and scenes are human-speed, and clock never rides the network (§6).
- 🔴 **Turn wifi power save off.** `CYW43_DEFAULT_PM` is PM2 with a 200 ms
  return to sleep; a Pico W pinged at **23.8 / 186.3 / 320.5 ms** min/avg/max
  with it, and **2.87 / 3.76 / 12.05 ms** after
  `cyw43_wifi_pm(&cyw43_state, CYW43_DEFAULT_PM & ~0xf)` (READ,
  [forum](https://forums.raspberrypi.com/viewtopic.php?t=343746),
  [cyw43.h](https://raw.githubusercontent.com/georgerobotics/cyw43-driver/main/src/cyw43.h)).
  This is the VPN lesson in a new costume: a node that answers the handshake
  and then sits 300 ms behind.
- ⚠️ An open SDK 2.2.0 issue reports a Pico W UDP link degrading after 5 to
  10 minutes at 16 ms intervals with power save off (READ,
  [#2835](https://github.com/raspberrypi/pico-sdk/issues/2835)). UDP, not TCP,
  but a soak test is the first thing to run either way.

### 3.3 What it says and hears

A site of its own, `pico-<6 hex of the flash unique id>`, placed in `studio-1`
(graph-registry requires every id to start with the site; `place` is free,
READ `graphProblem()`). The announcement is a **constant string built at
compile time** plus the ports a build has, so the Pico never builds JSON from
data it parsed:

```json
{ "type": "graph.announce", "from": "pico-a1b2c3", "at": 0, "seq": 7,
  "graph": { "v": 1, "site": "pico-a1b2c3", "place": "studio-1", "nodes": [
    { "id": "pico-a1b2c3:din", "kind": "device", "label": "Pico DIN" },
    { "id": "pico-a1b2c3:led", "kind": "device", "label": "Pico light" } ],
  "ports": [
    { "id": "pico-a1b2c3:din:in",  "dir": "out", "medium": "midi", "emits": ["note","cc","clock"] },
    { "id": "pico-a1b2c3:din:out", "dir": "in",  "medium": "midi", "accepts": ["note","cc","program","sysex"] },
    { "id": "pico-a1b2c3:led:light", "dir": "in", "medium": "value", "shape": { "channels": 3 } } ] } }
```

| hears | does | parsing needed |
| --- | --- | --- |
| `graph.ask` | announce again now | `type` only |
| `light.set` with `to` equal to its port | §4 | `type`, `to`, `hex`, `parts[].hex`, `parts[].across` |
| `table.set` with `to` equal to its site | load a binary route table | `type`, `to`, one base64 field |
| `scene.recall` | nothing: scenes live in `/patchbay/` (READ, `demo/patchbay/index.html:757`), which compiles the links that touch this Pico and sends `table.set` | |

- **A JSON reader is needed after all, and it is small.** `plan-route-core` §7
  says *"An MCU never parses text"*, meaning tables. This keeps that: tables
  arrive compiled, as the binary format `route_core.h` defines. What the Pico
  reads is five fixed keys, with a no-heap tokenizer such as jsmn (MIT, one
  header, INFERRED to be a few hundred bytes of code). It is L2 shaped like L0.
- 🔴 **NO BINARY FRAMES IN `studio-1`.** A synth's PCM comes back as binary
  down the board's main room (READ, `graph-registry.mjs`: *"its sound comes
  back down the same socket"*), so a page playing a synth would decode a
  binary route table as audio. Tables ride as base64 in JSON, or binary in the
  Pico's own room `pico-<id>`, the address rule `<room>-<input>` already uses.
- **Changes are diffs** on the Pico, which `main.c` already does for scenes.
- **Liveness**: announce every 5 s like `board.alive`; the registry marks a
  site stale after 15 s (READ, `STALE_MS`).
- ⚠️ The envelope (`from`, `sent`, `seq`) is the sender's job (READ,
  `demo/shell/wire.mjs`; the stamp was `at` until 2026-10-04 and `node.c`
  writes `sent` since). `sent` needs wall time, so SNTP at boot, or `sent: 0`
  and a page that tolerates it. Not checked which pages read `sent`.

**Firmware work.** `pico2_w` only: `pico_cyw43_arch_lwip_poll` (or
`threadsafe_background`), a WebSocket client over lwIP raw TCP (no Pico SDK C
WebSocket client was found, only HTTPS clients to start from, SECONDHAND
[picohttps](https://github.com/marceloalcocer/picohttps)), RFC 6455 framing
with client masking, jsmn, a base64 decoder, a reconnect with **jittered**
backoff (`plans/plan-remote-looper.md` notes `openWire`'s is not jittered),
wifi credentials in a flash sector written over USB serial once. INFERRED: two
to four days.

**Graph fit.** Its own site, one node per feature; MIDI ports go through
`route_core`, `value` ports do not (§4.4).

**Sim.** None of the wireless half: rp2040js emulates the RP2040 only, and no
CYW43 (READ, `rig/pico/sim/README.md`). **The protocol half is testable
without any board**: put the WebSocket framing, the five-key reader, base64 and
the message handlers in a pure C file with no SDK includes, compile it in the
`gcc:14` container like `rig/route-core/test.sh`, and run it **against the
live relay in a test room** (Docker on this Mac dials out; plan-hardware §8.9
ran `rig/board` against the relay that way). The emulator then only needs
`router_in` fed by a stub.

**Needs the board**: association, reconnect after an access point reboot,
power save, the soak, and a TLS handshake time.

**Measure first.** (1) Round trip Pico to relay to Pico on the relay's own
echo, 1000 pings, p50/p99/worst, power save off and on. (2) A one hour soak:
reconnects, missed beats. (3) Later, the wss handshake in ms and the heap high
water mark.

## 4. Item 2: light for the timeline's light lane

**What it is.** `/partitur/`'s light lane sends `light.set` with a colour
`hex` and `parts`, each `{ hex, across: [a, b] }`, the *"simultaneous partial
lightings"* of Moholy-Nagy's column 3 (READ, `demo/partitur/index.html:306`,
`research/moholy-nagy-partiturskizze-2026-10-04.md` §2). `/wall/` paints them on
a screen. A Pico makes them physical. The research file's own rule holds:
*"Do not add `light` to `MEDIA` until a fixture exists"*, and nothing here
needs it: the port is `medium: 'value'`, `shape: { channels: 3 }`, exactly
`/wall/`'s.

### 4.1 WS2812 by PIO (recommended)

- **Timing**: 800 kbit/s, 1.25 µs a bit, 24 bits an LED, so **30 µs an LED**;
  reset above 50 µs, above 280 µs on newer revisions (READ,
  [WS2812B datasheet](https://cdn-shop.adafruit.com/datasheets/WS2812B.pdf);
  SECONDHAND for 280 µs). 60 LEDs is 1.8 ms a frame, 150 is 4.5 ms (INFERRED).
  pico-examples drives it from one PIO state machine at 800 kHz (READ,
  [ws2812.c](https://raw.githubusercontent.com/raspberrypi/pico-examples/master/pio/ws2812/ws2812.c)).
  DMA feeds it, so the CPU cost is filling a buffer.
- 🔴 **3.3 V DATA IS OUT OF SPEC, NOT MARGINAL.** VIH is 0.7 x VDD, 3.5 V at
  5 V (READ, datasheet). Adafruit: *"If using a 3.3V microcontroller you must
  use a logic level shifter such as a 74AHCT125 or 74HCT245"* (READ,
  [Uberguide](https://learn.adafruit.com/adafruit-neopixel-uberguide/best-practices)).
  Oomipood's own stock has **SN74HCT4050, €0.50, 50 at Peterburi tee** (READ,
  [link](https://www.oomipood.ee/product/307403_sn74hct4050)); HCT inputs read
  3.3 V as high and it runs at 5 V (INFERRED from the HCT family, check the
  datasheet). The 74AHCT125 is TME only, 8 October. The €4 8-channel
  bidirectional module (READ, [link](https://www.oomipood.ee/product/tasememuundur_voltage_translator_8kanaliga_5v33v_bidir))
  is likely BSS138 type and too slow for 800 kHz (INFERRED).
- **Power**: up to 60 mA an LED at full white, 20 mA as the rule of thumb; a
  500 to 1000 µF capacitor across the supply, 300 to 500 Ω in series on data,
  feed power at least every metre (READ, [Uberguide, powering](https://learn.adafruit.com/adafruit-neopixel-uberguide/powering-neopixels)).
  The Oomipood strip is **60 LEDs, 1 m, 18 W** (READ), which is 3.6 A at 5 V,
  the 60 mA figure exactly. Never from the Pico's VBUS. **Mean Well LRS-35-5,
  5 V 7 A, €16.00** (READ, [link](https://www.oomipood.ee/product/lrs_35_5_toiteplokk_5vdc_7a_35w_ip20_mean_well_lrs_35))
  carries two metres at full white; the GST25E05 plug-in, 5 V 4 A, €19.00, is
  the no-mains-wiring option (READ, [link](https://www.oomipood.ee/product/gst25e05_p1j_toiteadapter_5v_4a_2_1_5_5mm_pistik_plug_in_smps_mean_wel)).
  Grounds joined, Pico from the same 5 V on VSYS through its diode (INFERRED).
- **How many**: one metre (60) to start. `parts[].across` maps to a segment of
  the strip, `[0.2, 0.4]` is LEDs 12 to 23, so a partial lighting is a band on
  the strip as it is on `/wall/` (INFERRED design).

### 4.2 DMX512 by an RS-485 transceiver

- **Timing**: 250 kbit/s, 44 µs a slot, break at least 88 µs, mark after break
  at least 8 µs, **about 44 Hz** for a full 512 slot universe; 120 Ω at the end
  of the line; on XLR, pin 1 shield, 2 Data minus, 3 Data plus (READ,
  [ENTTEC](https://support.enttec.com/dmx/dmx-basics/what-is-dmx512)). A short
  universe is faster: 16 slots is about 0.9 ms of data (INFERRED).
- **How**: UART1 at 250 kbaud 8N2 with the break as a GPIO held low for 100 µs
  before each frame (INFERRED, standard approach), or **Pico-DMX** (PIO and DMA,
  in and out, **BSD-3-Clause** (this said "MIT-ish" until corrected 2026-10-04), RP2040 only in its README; RP2350 is not mentioned. Read rather than built: the OUT side uses only standard SDK claims and should work on an RP2350; the IN side sizes two arrays for 2 PIO blocks and hard-codes 12 DMA channels, both wrong on an RP2350)
  (READ, [jostlowe/Pico-DMX](https://github.com/jostlowe/Pico-DMX)). UART1 saves
  a PIO and the library saves writing the break; try the library first.
- **Transceiver**: MAX3485 is the 3.3 V one, TME only, €5.10, 8 October (READ,
  [link](https://www.oomipood.ee/kataloog/tme/toode?sku=TUFYMzQ4NUVFU0Er)).
  Own stock has **ST485CN DIP-8, €2.56, 10 at Peterburi tee** (READ,
  [link](https://www.oomipood.ee/product/st485cn_st485cn_dip8)), a 5 V part
  whose inputs take 3.3 V logic (INFERRED from the 485 family's TTL inputs, to
  check in its datasheet; CHECKED 2026-10-04, DI, DE and RE read 2.0 V as high)
  and whose RO output needs **no** divider into GP9, because GP0 to GP25 are 5 V
  tolerant while IOVDD is 3.3 V (READ, RP2350 datasheet Tables 1674 and 1683;
  this said a divider was needed until corrected). Not GP26 to GP29, the ADC
  pins. A 1 kΩ series resistor if the transceiver can be powered while the Pico
  is not. **No ready TTL to RS-485 module is in own stock.**
- **Socket**: 3-pin XLR female panel, €2.00, 38 on the shelf (READ,
  [link](https://www.oomipood.ee/product/mic27_3_pin_xlr_pesa_paneelile_must_al1227));
  the 5-pin, the standard, is €16.89 with **one** left at Järve (READ). Most
  cheap fixtures use 3-pin (SECONDHAND, general knowledge, not read today).
- 🔴 **THERE IS NO DMX FIXTURE ON THIS DESK** (READ, the Moholy research:
  *"There is no DMX or Art-Net code or hardware on the desk"*). So DMX is a
  plan for a venue, and its first test is a logic capture or a €30 fixture,
  not the timeline.
- **Art-Net or sACN instead**: an Art-Net library lists the Pico W, but it is
  Arduino API (READ, [hideakitai/ArtNet](https://github.com/hideakitai/ArtNet));
  no bare SDK library was found. The Pico as an Art-Net node is the wrong way
  round anyway: positron would be the controller, and the Pico would be the
  gateway from the room to a DMX line, which is what §4.2 already is.

### 4.3 How `light.set` reaches it

```
/partitur/ light lane --light.set{to:pico-x:led:light, hex, parts}--> relay studio-1 --> Pico
```

The link is made on `/patchbay/` or by `/partitur/`'s own *"wall"* choice, which
already lists every `value` in port with 3 channels it hears (READ,
`demo/partitur/index.html:253` and `:272`). **No page changes**: the Pico is
one more wall. One way latency is the relay's, about 18 ms on its own
(INFERRED, half of the 36 ms round trip), which is invisible for a light cue.

### 4.4 Light does not go through `route_core`

The C core takes raw MIDI bytes and has no `value` kind (READ, `route_core.h`:
*"Events are raw MIDI bytes in and out"*). So `light.set` is a handler beside
the core, not a link inside it. If a knob should drive the light on the Pico
alone (no network), that is a `value` kind in the core, which the JS reference
does not have either. Named in §11, not designed here.

**Firmware work**: the PIO program from pico-examples, a frame buffer of
`3 x N` bytes, `hex` and `parts` to pixels, a gamma table, a brightness cap
that keeps the current under the supply's rating (INFERRED: a software limit
of, say, 3 A on a 4 A supply). One day. DMX: one to two days.

**Sim**: **yes for the waveform.** rp2040js emulates PIO and DMA and lets a
script listen to a GPIO (READ, `node_modules/rp2040js/dist/esm/peripherals/pio.js`,
`gpio-pin.d.ts` `addListener`), so the harness can decode the 800 kHz bit
stream back into colours and assert them, at emulator speed (instruction
timing is flat, so the µs widths are approximate, READ sim README). DMX over
UART1: the bytes, yes; the break and its 88 µs, approximate.

**Needs the board**: the level shifter, the supply, real colour, and flicker.

**Measure first**: the current at full white on the real strip with the cap
on, and whether the first LED reads 3.3 V data without the shifter (to know how
much margin the shifter buys, not to skip it).

## 5. Item 3: sound

### 5.1 What runs on this class of chip (all READ unless marked)

| project | chip | what | claimed | licence |
| --- | --- | --- | --- | --- |
| [picoX7](https://github.com/AnotherJohnH/picoX7) | RP2040, RP2350 | DX7 (OPS and EGS models) | 8 voices a core; 16 at 191.08 MHz; "jitter free" 49,096 Hz; I2S or PWM | MIT |
| [PicoDexed](https://github.com/diyelectromusic/picodexed) ([blog](https://diyelectromusic.com/2024/02/04/raspberry-pi-pico-synth_dexed-part-3/)) | RP2040 | Synth_Dexed | 10 notes at 24 kHz at 133 MHz; 16 at 24 kHz or 8 at 48 kHz at 250 MHz; 64 sample buffers | MIT |
| [Pico2Dexed](https://github.com/nyh-workshop/pico2dexed) | RP2350 | the same on the M33 | 10 notes, 44.1 kHz, 250 MHz, PCM5102 | MIT |
| [arduinoMI](https://github.com/poetaster/arduinoMI) | RP2040, RP2350 | Mutable Braids, Tides, Rings, Elements, Plaits, Clouds | all run on RP2350, only Braids and Tides on RP2040; 96 kHz; 250 to 276 MHz | MIT |
| [PRA32-U2](https://github.com/risgk/digital-synth-pra32-u2) | RP2350 | 4 voice subtractive, chorus, delay | 48 kHz, 24 bit, PCM5102A, USB MIDI | CC0 |
| [PicoVintageSynthCollection](https://github.com/Michi71/PicoVintageSynthCollection) | RP2350 | ten emulations (DX, Juno-6, Minimoog, D-50 and more) | 444 MHz at 1.60 V | GPL-3.0+ |
| [AMY](https://github.com/shorepine/amy) | RP2040, RP2350 | analog, FM, PCM, wavetable, Karplus-Strong | **no voice count or rate for a Pico on any page read** | MIT |
| [PicoADK v2](https://github.com/DatanoiseTV/PicoADK-Firmware-Template) | RP2350A board | template, FreeRTOS, Vult DSP | 8 to 192 kHz configurable; sampler 8 voices; €39 board | BSD-3 |
| [picoDSP](https://github.com/Na1w/picoDSP) ([forum](https://forums.raspberrypi.com/viewtopic.php?t=395149)) | RP2350 | Rust monosynth that is a USB audio device | one voice about **45 %** of a core, 75 to 80 % with effects; UAC1 48 kHz 16 bit | MIT |
| [Mozzi](https://sensorium.github.io/Mozzi/doc/html/hardware_rp2040.html) | RP2040 | Arduino synth library | 11 bit PWM default, one core | not checked |

**CPU budget, INFERRED**: 150 MHz / 48,000 is **3,125 cycles a sample a
core**. Almost every project above overclocks (191 to 444 MHz), and picoDSP's
one voice at 45 % is the only CPU figure published. A Pico 2 W that is also the
router and the wifi node keeps core 0; core 1 is the synth's.

### 5.2 Outputs

| output | quality | parts | label |
| --- | --- | --- | --- |
| PWM | about 11 bits; pico-extras `audio_pwm` defaults to 22,058 Hz; supply noise is "probably the worst offender" | an RC filter, a pin | READ, [audio_pwm.c](https://raw.githubusercontent.com/raspberrypi/pico-extras/master/src/rp2_common/pico_audio_pwm/audio_pwm.c), [Mozzi](https://sensorium.github.io/Mozzi/doc/html/hardware_rp2040.html), [Kevin Boone](https://kevinboone.me/pico_pwm.html) |
| I2S DAC by PIO | 16 to 24 bit, 48 kHz; the PIO divider is fractional, so a clean clock needs a chosen sysclk (picoX7 191.08 MHz, PRA32-U2 153.6 MHz) | PCM5102A module, 3 pins, one SM | READ, [audio_i2s.c](https://raw.githubusercontent.com/raspberrypi/pico-extras/master/src/rp2_common/pico_audio_i2s/audio_i2s.c) |
| USB audio device (TinyUSB) | full speed means the UAC1 path; stereo 16 bit 48 kHz is 192 bytes a ms, far under the ~512 byte comfort limit a maintainer gives | the USB socket | READ, [uac2_headset](https://github.com/hathach/tinyusb/tree/master/examples/device/uac2_headset), [discussion 3635](https://github.com/hathach/tinyusb/discussions/3635) |

⚠️ **PCM5102 IS NOT AT OOMIPOOD IN ANY FORM**: the search answered *"ei
vastanud ükski toode"* (READ). It is an order from abroad, or a Pimoroni Pico
Audio Pack, neither looked up.

### 5.3 How its sound enters the patchbay, honestly

- **As a local output into the Pi's audio interface.** The Pico's I2S DAC (or
  its PWM) goes by cable into the board's capture, and then it is **an input**
  on the board's graph with an `audio` out port and an address `<room>-<input>`
  (READ, `boardGraph()`), exactly like the Circuit. Nothing new on the network.
  This is the only path that works.
- **As a USB audio device into the Pi.** The same result through USB, but it
  takes the Pico's only USB socket, which the router needs as a host (§8.3).
- **Streamed over wifi: no.** The one measured Pico W audio stream is UDP Pico
  to Pico: at least 800 kbit/s sustained, 50 kS/s of 16 bit with no loss,
  losses at 60 kS/s, a short packet round trip of **10 to 50 ms**, and trouble
  at 5 m through a wall (READ,
  [Cornell ECE4760](https://people.ece.cornell.edu/land/courses/ece4760/RP2040/C_SDK_LWIP/Audio_UDP/index_udp_audio.html)).
  48 kHz 16 bit mono is 768 kbit/s, at that ceiling; stereo is twice it
  (INFERRED). Over TCP to the relay it would be the ESP32 story of
  plan-hardware §7b with less headroom. No WebSocket audio from a Pico with
  numbers was found.

**Verdict: weak here.** The desk already has a Circuit and the Pi's synths
(Yoshimi and the others `boardGraph()` lists). A Pico synth earns a place only
as a **self-contained instrument at the far end of a DIN cable** (plan-hardware's
*"the thing the box plays"*), e.g. picoX7 on its own Pico 2, not on the router.
Firmware: porting picoX7 or Pico2Dexed into this tree is days; running it as
its own UF2 on a second €8.20 Pico 2 is an afternoon.

**Sim**: PWM and PIO I2S produce pin activity rp2040js can see, at emulator
speed; useless for listening. A pure C render loop in the `gcc:14` container,
writing a WAV, is the honest test of the DSP. **Needs the board**: noise,
clock jitter on I2S, CPU headroom with wifi running.

**Measure first**: picoX7's voice count on a Pico 2 W **with wifi
associated**, because every figure above was taken without it.

## 6. Item 4: a clock box

**What it is.** Tap tempo on a button, MIDI clock out on DIN (and USB when the
socket is a device), start and stop, and following a clock it hears.

### 6.1 The numbers that make this worth doing

| source | figure | label |
| --- | --- | --- |
| DIN | 31,250 baud, 10 bits a byte: **320 µs a byte**, a 3 byte message about 960 µs | READ, [MIDI](https://en.wikipedia.org/wiki/MIDI) |
| DIN jitter, calculated | about 16 µs (half a bit) | READ, [calcsandcomps](https://calcsandcomps.blogspot.com/2021/10/midi-throughput-latency-jitter.html), a calculation not a measurement |
| USB full speed | one frame a ms, an event waits 0 to 1 ms | READ, a forum post quoting Sequentix's maker, [midi.org](https://midi.org/community/midi-connections/jitter-and-latency-usb-firewire-thunderbolt) |
| a DAW's MIDI clock (Live 9, 2014) | cycle to cycle σ **8.433 ms**, from **-38.36 to +22.24 ms** | READ, [E-RM report](https://www.e-rm.de/data/E-RM_report_Jitter_02_14_EN.pdf) |
| hardware (Innerclock Litmus) | Korg SQ-1 0.000 ms, JD-Xi 0.062 ms, TR-808 DIN sync worst 2.052 ms | READ, [Litmus](https://www.innerclocksystems.com/litmus), no method on the page |
| **this repo's relay** | message gaps board to browser: mean 20.0 ms, **p99 43.5 ms, worst 83.6 ms** | MEASURED 2026-09-16, `plans/plan-drum-twin.md` §3.1 |
| this repo's Circuit | sends clock continuously at about 122 bpm, 48.75 messages a second | MEASURED, `plans/plan-patchbay.md` §3.4 |
| the Pi, the browser | **no clock jitter measured in this repository.** `plans/plan-voice.md` asks for it (*"measure the jitter the box adds before trusting it"*) and nothing answers | READ, grep of `plans/`, `research/`, `PROGRESS.md` |

At 120 bpm and 24 ppqn a tick is 20.83 ms (INFERRED). The relay's p99 is two
ticks. 🔴 **SO CLOCK NEVER CROSSES THE NETWORK AS TICKS**, which is the same
verdict plan-drum-twin reached for steps. It crosses as **tempo and phase**: a
`clock.set { bpm, beatAt }` message, and each end generates ticks from its own
timer. Clock offset between the Pico and the room is estimated on the relay's
own echo (the relay sends every message back to its sender, READ
`workers/relay/src/index.js`), the way `/jam/` got peers to agree within
**0.13 to 2.7 ms** (MEASURED, `plans/plan-jam.md`).

### 6.2 The design

- **The generator**: a hardware alarm every tick (1 µs timer resolution,
  INFERRED from the SDK's `time_us_64`), the tick time computed from the beat
  origin, never accumulated, so error does not drift.
- 🔴 **A clock byte may interrupt a message.** MIDI real time bytes can sit
  between the bytes of another message (READ, the MIDI spec as summarised on
  Wikipedia). So the UART writer puts `F8` into the TX FIFO **ahead** of the
  queue, and the worst wait is one byte, **320 µs**, instead of a SysEx chunk.
  INFERRED design; `main.c`'s UART ring today is first in, first out.
- **Tap tempo**: a button, the median of the last four intervals, a timeout of
  2 s. A 0.50 € tactile button (READ, [Oomipood](https://www.oomipood.ee/product/tactsw_060_mikronupp_6_6_9_5mm_nupp_6mm),
  298 in stock) or the FS-1 footswitch, €16.00 (READ, [link](https://www.oomipood.ee/product/fs_1_pedaalluliti_spdt_10a_250vac_suntesaatorile)).
- **Following**: the Circuit on DIN in is already a master at 122 bpm. Follow
  it with a smoothed period estimate (a moving median, INFERRED), and offer it
  to the room as `clock.set`, so `/partitur/` and the pages can lock to the
  instrument rather than the other way round.
- **One source per site** (plan-patchbay §3.4): the Pico's `clock` port is an
  `out` with `shape: { ppqn: 24 }`, and the patchbay chooses the master.
- **Ableton Link**: an ESP32 port exists and is marked experimental (READ,
  [Link examples/esp32](https://github.com/Ableton/link/tree/master/examples/esp32)),
  none for any Pico. Link is C++ with asio; a port is not small. Not first.

**Firmware work**: one day for tap, generator and the priority byte; one more
for following and `clock.set`. **Sim**: the logic, yes (feed `F8` bytes into
UART0 RX at a fake tempo, read the period back off TX); the timing, no, because
instruction timing is flat at 125 MHz. **Needs the board**: the jitter number.

**Measure first**: the Pico's clock out against the Circuit's, on one capture
(a USB MIDI interface timestamping both, or an audio interface recording both
DIN lines through a resistor, the Innerclock approach). That is also the
**first clock jitter number for anything in this repository**, and it grades
the Pi and the browser later on the same rig.

## 7. Item 5: BLE MIDI

- **Prior art that runs on this board**: rppicomidi's `ble-midi2usbhost`,
  *"tested with Pico SDK 2.2.0"*, supports `pico2_w` (READ,
  [repo](https://github.com/rppicomidi/ble-midi2usbhost)); its library
  `pico-w-ble-midi-lib` asks for a 7.5 to 15 ms connection interval and its
  author's iPad *"consistently connects at 15ms"* (READ,
  [lib](https://github.com/rppicomidi/pico-w-ble-midi-lib)). Same author as the
  `usb_midi_host` the router plans to use. Licences not checked.
- **The spec**: the device must ask for 15 ms or less; 13 bit ms timestamps;
  *"does not support ... clock synchronization"* (READ,
  [BLE-MIDI 1.0](https://www.hangar42.nl/wp-content/uploads/2017/10/BLE-MIDI-spec.pdf)).
  Apple: 15 ms minimum for ordinary peripherals, 11.25 ms only with HID present
  (READ, [QA1931](https://developer.apple.com/library/archive/qa/qa1931/_index.html));
  CME says iOS 11.25 ms, macOS 7.5 ms (READ, vendor page, [CME](https://www.cme-pro.com/the-truth-about-bluetooth-midi/)).
- **Pairing**: an iPad app pairs through its own Bluetooth MIDI panel
  (`CABTMIDICentralViewController`); GarageBand is Settings, Advanced,
  Bluetooth MIDI Devices; on the Mac, Audio MIDI Setup's Bluetooth panel
  (READ, [QA1831](https://developer.apple.com/library/archive/qa/qa1831/_index.html),
  [GarageBand](https://support.apple.com/guide/garageband-ipad/a-bluetooth-midi-device-touch-instruments-chse356a0321/ipados)).
  ⚠️ rppicomidi's known issue: **GarageBand shows it connected and plays
  nothing** until another BLE MIDI app has connected first; Android
  reconnection is unreliable (READ, the repo).
- **Wifi and BLE at once**: Raspberry Pi calls sharing one SPI bus *"a
  substantial engineering challenge"*; that both run at once is shown by a
  reader comment and a FreeRTOS example, **with no latency numbers** (READ,
  [news](https://www.raspberrypi.com/news/new-functionality-bluetooth-for-pico-w/),
  [mcuoneclipse](https://mcuoneclipse.com/2023/03/19/ble-with-wifi-and-freertos-on-raspberry-pi-pico-w/)).

**What it is for here**: a phone or an iPad as a MIDI port with no cable and
no browser, and a Mac without a USB lead. It is **not** for clock (the spec
says so, and 15 ms intervals are under a tick but jitter by them, INFERRED).

**Graph fit**: a node `pico-x:ble` with `in` and `out` MIDI ports, routed by
`route_core` like DIN: `router_in(PORT_BLE_IN, ...)` and a case in `emit()`,
the seam `main.c` already names for USB.

**Firmware**: BTstack from the SDK (submodule), a GATT server with the MIDI
service UUID `03B80E5A-...`, the timestamp header stripped and added. Two to
three days starting from rppicomidi's library. **Sim**: none (no CYW43).
**Needs the board** and a phone. **Measure first**: note to sound from an
iPad through the Pico to the Circuit, against the same over USB, and whether
the wifi node's round trip changes with a BLE link up.

## 8. Item 6: physical controls, and CV

### 8.1 Knobs, faders, encoders

- **ADC**: GP26, GP27, GP28, 12 bit (READ, Pico docs). Three pots straight in
  is the cheap case: **10k linear pot €1.00, 213 on the shelf** (READ,
  [link](https://www.oomipood.ee/product/r16148_1a_2_b10k_10k_lin_pote_6mm_voll_16mm_korpus_5mm_samm)).
  The only fader in own stock is a **75 mm stereo** 10k slide pot, €3.00 (READ,
  [link](https://www.oomipood.ee/product/10k_stereo_lin_liugpote_75mm_pikkus));
  use one half. E9 and the ADC: a Raspberry Pi engineer says *"it should not
  affect the ADCs at all in normal usage"*, users report otherwise, and A4 fixes
  it (READ, [forum](https://forums.raspberrypi.com/viewtopic.php?t=375631)).
- **More than three**: a CD4051 (8 channels, €1.30, own stock, READ
  [link](https://www.oomipood.ee/product/cd4051_mbr_cd4051_561kp2)) on one ADC
  pin needs 3 select pins, which the full build does not have (§8.4). The 4067
  is an SMD chip at TME only.
- **Encoder**: `OKY3431` module, €3.00, 49 at Peterburi tee (READ,
  [link](https://www.oomipood.ee/product/oky3431_enkooder_rotary_encoder)),
  marked 5 V; at 3.3 V its pull-ups go to 3.3 V (INFERRED). Two pins and a push.
- **Filtering**: oversample and a hysteresis of a few LSB so a resting knob
  sends nothing (INFERRED). The relay takes 1000 msg/s (READ,
  `workers/relay/src/index.js`) and `thin` already exists in the core.

**Graph fit**: `pico-x:knobs:out`, `medium: 'value'`, `shape: { channels: 3 }`,
announced like a light but `dir: 'out'`, sent as `value.set` over the relay;
**and** as MIDI CC from a `pico-x:knobs:midi` port into `route_core`, so a knob
reaches the Circuit through the table with no network. Learn by demonstration
(plan-wish-dawless §7) works on it unchanged.

### 8.2 As a USB MIDI device

TinyUSB's device MIDI class makes the Pico a class compliant controller for a
Mac, an iPad or the Pi (INFERRED from TinyUSB's examples, not opened today).
**But the router uses the same socket as a host.** So: either the Pico is a
controller (device) or a router (host), per build, or §8.3.

### 8.3 Two USB ports: PIO-USB

Pico-PIO-USB gives a second port, host or device, full speed, **on RP2350
too**; it uses **1 PIO, 3 state machines and all 32 instructions** of that
block, 15 KB, 2 GPIO; **no isochronous**, so MIDI yes, audio no (READ,
[Pico-PIO-USB](https://github.com/sekigon-gonnoc/Pico-PIO-USB)). It *"consumes
a fair amount of CPU"*, needs sysclk **a multiple of 120 MHz**, and *"can
conflict with the drivers for the Pico W WiFi/Bluetooth module"*, fixed by
starting TinyUSB before wifi (READ,
[usb_midi_host](https://github.com/rppicomidi/usb_midi_host)). No percentage is
published. ⚠️ **120 or 240 MHz fights a clean I2S clock** (153.6 or 191.08 MHz),
so PIO-USB and the synth do not share a board (INFERRED).

### 8.4 CV and gate

- **Out, by a DAC**: MCP4822, 2 channels, 12 bit, 2.048 V reference, 1x or 2x,
  2.7 to 5.5 V, SPI to 20 MHz, settles in 4.5 µs, output to VDD minus 0.04 V
  (READ, [datasheet](https://ww1.microchip.com/downloads/en/devicedoc/21953a.pdf)).
  🔴 **AT 3.3 V IT CANNOT REACH 4.096 V**, so 2x gain wants a 5 V supply, and
  then 3.3 V SPI is under its 0.7 x VDD input threshold (INFERRED from the same
  datasheet's VIH, to check). The clean build is **3.3 V, 1x (0 to 2.048 V),
  and an op-amp gain of about 2.44 to 0 to 5 V**, 1.2 mV a step, about 1.5
  cents at 1 V an octave (INFERRED arithmetic). The op-amp needs a rail above
  5 V; TL072 €1.80 in stock (READ, [link](https://www.oomipood.ee/product/tl072ip_tl072ip_dual_low_noise_amp)),
  which is not rail to rail, so 12 V. **MCP4822 is Farnell only, €6.17,
  8 October** (READ, [link](https://www.oomipood.ee/kataloog/farnell/toode?sku=1439413)).
- **Out, by PWM**: an RC filter; for 8 bit ripple RC is 64 PWM periods and
  settling is about **11 ms at 32 kHz** (READ,
  [EDN](https://www.edn.com/cancel-pwm-dac-ripple-with-analog-subtraction/)).
  Fine for slow modulation, wrong for pitch.
- **Gate**: a GPIO through a transistor to 5 V (INFERRED, standard).
- **In**: a divider and clamp into an ADC pin (INFERRED); Eurorack's plus and
  minus 5 to 10 V need an op-amp stage.
- **Jacks**: 3.5 mm mono panel socket with switch, €2.50, 15 at Peterburi tee
  (READ, [link](https://www.oomipood.ee/product/cl1382_3_5mm_mono_pesa_paneelil_lulitiga_avatud_cliff)).

**Verdict on CV: no target on this desk** (INFERRED: the instruments named in
the plans are the Circuit, the MK-425C and the Pi's synths, none with CV
inputs). Plan it, do not build it until there is a CV instrument.

**Sim**: knobs, **yes**: rp2040js lets a script set `adc.channelValues` (READ,
`peripherals/adc.d.ts`), so turning a knob and reading the CC off UART0 is a
harness step. MCP4822: **yes**, SPI `onTransmit` sees every word (READ,
`spi.d.ts`). USB MIDI device: **yes in principle**, rp2040js 1.4.0 emulates the
USB controller in device mode (CDC is used by `pico.mjs`) and, new, **in host
mode with a simulated device** (`connectDevice`, READ `usb.d.ts`), which also
means the **USB MIDI host of the router can be tested in the emulator** with a
fake keyboard written in JS. Not tried. **Needs the board**: ADC noise, real
pots, the op-amp, calibration.

**Measure first**: ADC noise on a resting pot with wifi on (the wifi clock
shares GP29 with the VSYS monitor, READ, and radio noise on the ADC is the
known enemy of Pico W analog, SECONDHAND general knowledge).

## 9. Pins, PIO, USB and cores, all at once

### 9.1 Pins: everything fits, exactly, with no multiplexer

Free on the header after the router: GP2, 3, 6, 7, 8, 9, 14 to 22, 26 to 28,
**18 pins** (INFERRED by subtraction from §2).

| pins | job | peripheral | item |
| --- | --- | --- | --- |
| GP0, GP1 | DIN out, in | UART0 | router, clock (exists) |
| GP4, GP5 | OLED | I2C0 | exists |
| GP10 to GP13 | K1 to K4 | GPIO | exists |
| GP22 | WS2812 data | PIO | light |
| GP8, GP9 | DMX TX, driver enable | UART1 | light |
| GP7 | tap tempo | GPIO | clock |
| GP2, GP3, GP6 | encoder A, B, push | GPIO | controls |
| GP26, GP27, GP28 | three knobs | ADC | controls |
| GP18, GP19, GP20 | I2S data, bit clock, word clock | PIO | sound |
| GP14, GP15, GP17 | MCP4822 clock, data, select | SPI1 (SCK, TX) and GPIO | CV |
| GP16, GP21 | two gates | GPIO | CV |

**0 left.** A CD4051 needs 3 more, PIO-USB needs 2 more, a second I2C device
fits on GP4/GP5 at no cost. So **one board can carry router, network, light,
clock, BLE, three knobs and an encoder with 8 pins to spare**; sound (3) and
CV (5) take exactly those 8, and a 4051 (3 more) means dropping one of them. (INFERRED, check every
function against the RP2350 GPIO function table before soldering.)

### 9.2 PIO

| user | state machines | instruction slots | block |
| --- | --- | --- | --- |
| CYW43 | 1 | its SPI program (size not read) | first free (READ) |
| WS2812 | 1 | 4 (INFERRED from pico-examples) | any |
| I2S | 1 | about 8 (INFERRED) | any |
| Pico-DMX, if used instead of UART1 | 1 | small | any |
| PIO-USB | 3 | **32, a whole block** (READ) | its own |

Twelve state machines and three blocks hold all of it. 🔴 **CLAIM ORDER
MATTERS**: CYW43 takes the first free block (READ), so if PIO-USB is used it
claims its whole block **before** `cyw43_arch_init()`, which is also
rppicomidi's advice for its own reason.

### 9.3 The USB socket

One socket, one role per build: **host** (router, keyboard and Circuit behind
a hub), or **device** (controller, USB audio, USB MIDI clock out). A second
role needs PIO-USB (MIDI only) or a second Pico. Every plan in this repo so far
assumes host.

### 9.4 Cores and clock

Core 0: wifi (poll), the relay, the router, the screen. Core 1: one of the
synth, the clock generator, or PIO-USB. **The system clock is a shared
choice**: 150 MHz default, a multiple of 120 for PIO-USB, 153.6 or 191.08 for
jitter free I2S. That alone keeps sound off the router board.

### 9.5 RAM

Router bss 11 KB (READ, README). lwIP and CYW43 buffers, BTstack, mbedTLS's
records: **not measured, no figure found for the Pico 2 W**. INFERRED from the
buffer sizes above: under 100 KB together against 520 KB. The build prints
bss and the heap high water mark is a one line counter; both go in the
README's table the way the router's do.

## 10. Ranked order, with reasons

| rank | item | cost in parts | firmware | why here |
| --- | --- | --- | --- | --- |
| 1 | **network node, plain ws** | €0 beyond the board | 2 to 4 days | everything else becomes a graph node through it; measured to work today; the protocol half tests in Docker against the live relay with no board |
| 2 | **WS2812 light** | about €30 (§11) | 1 day | the light lane already sends `light.set` and `/partitur/` already lists the port; the first physical fixture; no page changes |
| 3 | **clock box** | €0.50 to €16 | 2 days | uses the DIN that exists; produces the **first clock jitter number in this repo**; the Circuit is already a master to follow |
| 4 | **knobs and encoder** | €6 | 1 to 2 days | sources for learn by demonstration and for the light; fully testable in the emulator |
| 5 | **wss** | €0 | 1 to 2 days plus the SDK bug | needed the day Cloudflare changes a setting; costs RAM and a handshake nobody has measured on RP2350 |
| 6 | **BLE MIDI** | €0 | 2 to 3 days | a phone or iPad as a port with no cable; prior art on this exact board; GarageBand quirk and no coexistence numbers |
| 7 | **DMX** | about €6 | 1 to 2 days | real venues use it; **no fixture on the desk** |
| 8 | **sound** | PCM5102 not in Estonia | an afternoon on a second Pico 2, weeks inside the router | the desk has synths; clock and USB conflicts with the router; streaming is not viable |
| 9 | **CV** | about €20, MCP4822 by order | 2 days | no CV instrument on the desk |

## 11. Combined parts list (Oomipood, READ 2026-10-04)

Stock is pieces per store, Peterburi tee first. Own stock unless marked.

| part | for | price | stock | link |
| --- | --- | --- | --- | --- |
| Pico 2 W | everything | €12.00 | 20 / Järve 9 | [link](https://www.oomipood.ee/product/raspberry_pi_pico_2_w_wireless_arm_cortexm33) |
| Pico 2 (no radio) | a separate synth or controller | €8.20 | 1 / Järve 3 | [link](https://www.oomipood.ee/product/raspberry_pi_pico_2_cortexm33) |
| WS2812 strip, 60 LED, 1 m, 18 W | light | €13.00 | 15 / Järve 3 / Tartu 2 | [link](https://www.oomipood.ee/product/hm_60_rgb_ic_1m_60_led_lint_ip20_1m_adresseeritav_5050_ws2812_rgb_18w) |
| SN74HCT4050 | light, level shift | €0.50 | 50 | [link](https://www.oomipood.ee/product/307403_sn74hct4050) |
| Mean Well LRS-35-5, 5 V 7 A | light | €16.00 | 8 | [link](https://www.oomipood.ee/product/lrs_35_5_toiteplokk_5vdc_7a_35w_ip20_mean_well_lrs_35) |
| or GST25E05 plug-in, 5 V 4 A | light, no mains wiring | €19.00 | 7 | [link](https://www.oomipood.ee/product/gst25e05_p1j_toiteadapter_5v_4a_2_1_5_5mm_pistik_plug_in_smps_mean_wel) |
| 1000 µF 16 V | light | €0.50 | 438 | [link](https://www.oomipood.ee/product/1000_16pht_1000uf_16v_105c_10_15mm) |
| ST485CN | DMX | €2.56 | 10 | [link](https://www.oomipood.ee/product/st485cn_st485cn_dip8) |
| or MAX3485EESA+ (3.3 V), TME | DMX | €5.10 | 8 Oct | [link](https://www.oomipood.ee/kataloog/tme/toode?sku=TUFYMzQ4NUVFU0Er) |
| 3-pin XLR female panel | DMX | €2.00 | 38 | [link](https://www.oomipood.ee/product/mic27_3_pin_xlr_pesa_paneelile_must_al1227) |
| tactile button 6x6 | tap tempo | €0.50 | 298 | [link](https://www.oomipood.ee/product/tactsw_060_mikronupp_6_6_9_5mm_nupp_6mm) |
| FS-1 footswitch | tap tempo, scene | €16.00 | 6 | [link](https://www.oomipood.ee/product/fs_1_pedaalluliti_spdt_10a_250vac_suntesaatorile) |
| 10k linear pot, x3 | knobs | €1.00 each | 213 | [link](https://www.oomipood.ee/product/r16148_1a_2_b10k_10k_lin_pote_6mm_voll_16mm_korpus_5mm_samm) |
| 10k slide pot 75 mm (stereo) | fader | €3.00 | 18 | [link](https://www.oomipood.ee/product/10k_stereo_lin_liugpote_75mm_pikkus) |
| rotary encoder module | controls | €3.00 | 49 | [link](https://www.oomipood.ee/product/oky3431_enkooder_rotary_encoder) |
| CD4051 | more knobs | €1.30 | 17 | [link](https://www.oomipood.ee/product/cd4051_mbr_cd4051_561kp2) |
| MCP4822-E/P, Farnell | CV | €6.17 | 8 Oct | [link](https://www.oomipood.ee/kataloog/farnell/toode?sku=1439413) |
| TL072IP | CV scaling | €1.80 | 24 | [link](https://www.oomipood.ee/product/tl072ip_tl072ip_dual_low_noise_amp) |
| 3.5 mm mono jack, switched | CV, gate | €2.50 | 15 | [link](https://www.oomipood.ee/product/cl1382_3_5mm_mono_pesa_paneelil_lulitiga_avatud_cliff) |
| 6N139 | DIN in (router, clock) | €1.50 | 35 | [link](https://www.oomipood.ee/product/6n139_6n139_uis_6000v_uceo_18v_opt) |
| 5-pin DIN socket | DIN | €1.00 | 36 | [link](https://www.oomipood.ee/product/dnc_205_1_5_din_pesa_paneelil_180deg) |
| USB-C hub with PD pass-through (Goobay 5 port) | router's hub | €17.00 | 9 | [link](https://www.oomipood.ee/product/usb_32_usbc_usba_32_20_5_port_hub_hall) |
| PCM5102A module | sound | **not found at Oomipood** | | |

**Ranks 1 to 4, built on the router that exists**: Pico 2 W 12.00, strip 13.00,
HCT4050 0.50, LRS-35-5 16.00, capacitor 0.50, button 0.50, three pots 3.00,
encoder 3.00: **€48.50**, all own stock today. Small orders carry an €8 minimum
(READ). The Goobay hub has a PD input, not a DC adapter, and whether it powers
its ports from that input for a Circuit and a keyboard is **not read** (the
HANDOFF's open item, still open).

## 12. What shares hardware or firmware

- **The network client** carries items 1, 2 (light.set), 4 (`clock.set`), 6
  (`value.set`) and the router's tables. Build once.
- **`route_core`** carries DIN, USB host, BLE and knob CCs: each is one
  `router_in(PORT_x, ...)` and one case in `emit()`.
- **UART0 and the DIN parts** serve the router and the clock box.
- **The 5 V supply** serves the strip and, through VSYS, the Pico.
- **PIO** serves WS2812, I2S, DMX (optional) and PIO-USB, beside CYW43.
- **The OLED kit** (`ui.c`) shows every item: a light swatch as a bar, a tempo,
  a knob meter (`ui_meter` exists).
- **CYW43** is shared by wifi and BLE, with no coexistence numbers.
- **The system clock** is the one thing they fight over (§9.4).

## 13. Steps

1. `Dockerfile`: init the `cyw43-driver`, `lwip`, `mbedtls`, `btstack` and
   `tinyusb` submodules, pinned with the SDK tag. Rebuild the image.
2. `rig/pico/net/`: the WebSocket client, five-key reader, base64 and handlers
   as pure C with test vectors, run in `gcc:14` **against a test room on the
   live relay**, plain ws. No board.
3. The `pico2_w` build joins `studio-1`, announces, and shows on
   `https://positron.studio/graph/`. Measure §3's round trip and soak.
4. WS2812 on GP22 behind the HCT4050; `light.set` paints it. Emulator step that
   decodes the waveform. Then `/partitur/` with its light lane linked to the
   Pico: the lane on a strip.
5. Clock: the priority byte in the UART writer, tap on GP7, `clock.set`; the
   jitter capture against the Circuit.
6. Knobs and encoder, emulator steps on `adc.channelValues`.
7. wss, BLE, DMX, sound, CV in §10's order, each when its reason arrives.

## 14. What could not be settled

| question | how to settle |
| --- | --- |
| TLS handshake time and heap on the RP2350 with mbedTLS 3.6 | build pico-examples `tls_client` against `ws.positron.studio`, time it, read the heap high water mark |
| ~~Whether SDK issue #2633 bites our ECDSA chain~~ | SETTLED 2026-10-04: closed upstream, and its cause (SHA-384) is on our chain; enable SHA-384 and P-384, which `rig/pico/net/` does |
| Whether the relay ever sends records over 4 KB to a client | count on the Pico, or keep 16 KB |
| Whether plain ws stays allowed | it works because "Always Use HTTPS" is off; nobody decided that for this. Ask the owner whether to keep it off on purpose |
| Pico W round trip and jitter to the relay, and a long soak | §3 measure first |
| RAM for lwIP, CYW43 and BTstack together | the build's bss plus a high water mark |
| Wifi and BLE at once, with latency | measure on the board |
| GarageBand's connect-and-silent quirk on this owner's iPad | try it |
| Clock jitter of the Pi and of a browser, for the comparison §6 wants | the capture rig of §6, pointed at each |
| AMY's voice count on RP2350; PIO-USB's CPU cost | not published; measure if either is used |
| Whether the Goobay hub powers a Circuit and a keyboard from its PD input | read its manual, or try it |
| Which silicon stepping the board on the desk has (E9) | read the chip marking |
| Pico-DMX on RP2350 | its README names RP2040 only; build it |
| The licences of rppicomidi's libraries | read them before taking code |
| Whether ST485CN and SN74HCT4050 take 3.3 V logic as specified | their datasheets, not opened today |
| RP2350 GPIO function table for every pin in §9.1 | the RP2350 datasheet, not opened today |

**Cost of this plan**: three research agents, about 85 page fetches to
Oomipood (one per page, 1.5 s apart) and about 60 to documentation and
GitHub; four commands against our own relay (`/stats` over http and https, one
plain ws upgrade, one TLS chain read) in a room named `pico-probe`. Nobody
else's media server was touched, and nothing was bought, built or flashed.
