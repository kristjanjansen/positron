# Pico open issues, settled where research can, and Eurorack boards for playing a modular remotely (2026-10-04)

> Asked 2026-10-04, verbatim in `BACKLOG.md`: *"regarding those open issues to
> do some research and in general would be cool to have some kind of modular
> support maybe there are boards which are ready at the right voltage for
> modular that can be programmed this way ... remember this play my synth idea
> was to support modular synths"*.
>
> Part A takes `plans/plan-pico.md` §14 ("What could not be settled") and
> settles what a datasheet, a repository or a published benchmark can settle.
> Part B surveys programmable boards that already live at Eurorack voltages, for
> the playasynth idea (`research/music-jamming-2026-08.md`, addendum) pointed at
> a modular: a browser and `/patchbay/` send notes, CV, gates and clock, and the
> modular's audio comes back through the Pi.
>
> **Nothing was bought, built, flashed or plugged in.** Labels, as in plan-pico:
>
> - **READ**: opened today, the words are there, URL given. Pages read through a
>   fetch tool are summaries; PDFs and GitHub files were read raw with
>   `pdftotext`, `curl` or `gh api`, and those are marked *raw*.
> - **SECONDHAND**: a search snippet or a page quoting another. Not to build on.
> - **MEASURED**: run today on this machine. Only one thing was: the relay's
>   certificate chain, two `openssl s_client` calls against our own
>   `ws.positron.studio`.
> - **INFERRED**: my reasoning, or arithmetic on READ numbers.

## The verdict, first

**Part A.** Five of the six questions are answered and one changes the plan:

1. **All three logic parts take 3.3 V as wired**, with one caveat on the shelf
   part. ST485CN and MAX3485 read VIH 2.0 V; the HCT family reads VIH 2.0 V;
   the RP2350 drives VOH at least 2.62 V. The ST485's 5 V receiver output can
   go straight into an RP2350 header pin, because GP0 to GP25 are 5 V
   tolerant. ⚠️ The `SN74HCT4050` Oomipood sells has no datasheet under that
   name anywhere I could find; if it is really an HC part it will **not** read
   3.3 V. Test one before trusting it.
2. 🔴 **Pico SDK issue #2633 is CLOSED, not open, and its cause is exactly our
   certificate chain.** It was a missing `MBEDTLS_SHA384_C`. MEASURED today:
   our relay's intermediate (WE1) is signed by GTS Root R4 with
   **ecdsa-with-SHA384**, and R4 is a **P-384** key. So a Pico pinning R4 needs
   SHA-384 and the P-384 curve on, which the pico-examples config already has.
   The first published RP2350 crypto numbers exist (wolfSSL, 150 MHz): ECDSA
   P-256 verify **10.6 ms**, ECDHE agree **9.3 ms**. No handshake time for
   RP2350 exists anywhere I found, with either library.
3. **Pico-DMX's output side should build on RP2350, its input side has two
   RP2040 assumptions in it.** Its licence is BSD-3-Clause, not "MIT-ish".
4. **Every rppicomidi library is MIT.** The two BLE ones add BTstack's terms,
   which Raspberry Pi licenses for use on Pico W and Pico 2 W boards only.
5. **Every pin in plan-pico §9.1 does what the plan asks of it.** Checked
   against the RP2350 datasheet's function table, raw.
6. **Wifi and BLE at once: still no latency number anywhere.** But one useful
   fact: the Pico SDK's CYW43 firmware ships with Bluetooth coexistence ON
   (`btc_mode=1`), which is what Zephyr's copy got wrong.

**Part B.** **Buy the Music Thing Modular Workshop Computer first.** It is an
RP2040 at Eurorack voltages, programmed in C with the Pico SDK like
`rig/pico/firmware/`, its RP2040 is the chip our emulator already runs, and
one existing open program card already turns it into **a class compliant USB
audio interface plus a USB MIDI to CV and clock converter**. That means one USB
cable from the Pi carries notes and clock out to the modular and the modular's
audio back, and the Pi's existing `BOARD_INPUTS` mechanism already describes
exactly that shape of instrument. Two starter setups at the end: about
**€380** for the Computer in a small powered case, or **€840** for the whole
Workshop System (the Computer plus oscillators, filters, envelopes and a mixer,
powered over USB-C, no case to buy).

There is no modular on the desk today, so **nothing can be played today**. The
smallest step from today is one module and one case.

---

# Part A: plan-pico's open list

## A1. Do ST485CN, MAX3485 and SN74HCT4050 take 3.3 V logic as wired?

What the RP2350 drives and accepts, READ raw from the
[RP2350 datasheet](https://datasheets.raspberrypi.com/rp2350/rp2350-datasheet.pdf)
§14.9.4, Table 1683, at IOVDD 3.3 V:

| | value |
| --- | --- |
| VOH, output high | **2.62 V minimum** (at the 2 to 12 mA drive setting) |
| VIH, input high | 2.0 V minimum |
| VIL | 0.8 V maximum |
| **FT pins** | input VIH max **5.5 V**, *"provided IOVDD is powered to 3.3 V"*; Table 1674 lists **GPIO0 to GPIO25 as Digital IO (FT)** and GPIO26 to 29 as Digital IO / Analogue, which are **not** FT |

| part | supply | input threshold | 3.3 V drive (VOH ≥ 2.62 V) | output back to the Pico | label |
| --- | --- | --- | --- | --- | --- |
| **ST485CN** (ST485, DIP-8, 0 to 70 °C) | **5 V ± 5 %** | DI, DE, RE: **VIH 2.0 V**, VIL 0.8 V | ✅ 0.62 V of margin | RO: **VOH ≥ 3.5 V** at -4 mA, i.e. up to 5 V | READ raw, [ST485 datasheet](https://www.nikom.biz/pdf/ST485_STM.pdf) (ST's own PDF refused a script) |
| **MAX3485** | **3.3 V ± 0.3 V** | DE, DI, RE: **VIH 2.0 V**, VIL 0.8 V | ✅ | RO: VOH ≥ VCC - 0.4 V | READ raw, [Maxim datasheet](https://datasheet.octopart.com/MAX3485ESA%2B-Maxim-Integrated-datasheet-13706444.pdf) |
| **74HCT4050** | **4.5 to 5.5 V** | **VIH 2.0 V** at VCC 4.5 to 5.5 V | ✅ 0.62 V of margin | output to 5 V for the WS2812 strip, which wants 3.5 V | READ raw, the HCT family table in the [Philips HCMOS family specification](https://www.farnell.com/cad/311261.pdf), which lists `74HCT4050` as a part |

- **The ST485's receiver output needs no divider into GP9**, which plan-pico
  §4.2 assumed it would. GP9 is an FT pin and takes up to 5.5 V while IOVDD
  is at 3.3 V (READ). ⚠️ The datasheet only promises low current below 3.63 V
  when IOVDD is **off** (READ), so if the transceiver can ever be powered while
  the Pico is not, keep a 1 kΩ series resistor on RO as cheap insurance
  (INFERRED). DMX out alone does not use RO at all.
- **The MAX3485's driver meets RS-485 at 3.3 V**: VOD ≥ 1.5 V into 54 Ω
  (READ). So the 3.3 V part works without any level question, and the 5 V
  part works too. The €2.56 ST485CN on the shelf is fine for DMX out.
- ⚠️ **THE `SN74HCT4050` NAME DOES NOT RESOLVE TO A DATASHEET.**
  `ti.com/lit/ds/symlink/sn74hct4050.pdf` answers **404**. TI's current part
  is the CD74HC4050, whose
  [datasheet](https://www.ti.com/lit/ds/symlink/cd74hc4050.pdf) lists one
  orderable `CD74HCT4050MT` in **SOIC only** and gives the HCT supply range
  (4.5 to 5.5 V) but **no HCT input table**. Oomipood's
  [listing](https://www.oomipood.ee/product/307403_sn74hct4050) says *"Korpus
  DIL, Seeria 74HCTxx, Hex High-to-Low Level Shifter"*, €0.50, 50 at
  Peterburi tee (READ). So the shelf part is DIL, an HCT by its label, from a
  maker I could not identify. **If it is really an HC4050**, its VIH is 3.15 V
  at 4.5 V and 3.5 V at 5 V (READ, the TI sheet's HC table) and 3.3 V data
  will **not** be read reliably. One €0.50 chip, 5 V on pin 1, a 3.3 V square
  wave on an input and a scope or the Pico's own ADC on the output settles it
  before the strip is wired (INFERRED).
- **And the plan's MCP4822 inference is confirmed**: its SPI inputs are
  Schmitt triggers at **VIH 0.7 x VDD** (READ raw,
  [MCP4822 datasheet](https://ww1.microchip.com/downloads/en/devicedoc/21953a.pdf)),
  3.5 V at a 5 V supply. So 3.3 V SPI into a 5 V MCP4822 is out of spec. Run it
  at 3.3 V (VIH 2.31 V) and scale with the op-amp, as §8.4 already says.

## A2. TLS on the RP2350: timings, heap, and SDK issue #2633

### #2633 is closed, and why it was failing is our chain

READ through `gh api`, [pico-sdk #2633](https://github.com/raspberrypi/pico-sdk/issues/2633):
*"Investigate TLS incompatibility with mbedtls 3"*, opened 2025-08-20,
**closed 2026-06-12, state reason completed**, milestone 2.3.0. plan-pico §3.1
says "open"; that is stale.

- The cause, from the maintainer two hours after it was opened: *"Looks like
  you have to define MBEDTLS_SHA384_C in your config. I "think" you got this
  for free with mbedtls v2.x where you had to define MBEDTLS_SHA512_C or else
  you got the same error."* The failure was `MBEDTLS_ERR_ECP_VERIFY_FAILED`
  inside `mbedtls_ecdsa_verify_restartable`, i.e. an ECDSA signature in the
  chain hashed with SHA-384 that the build could not compute.
- Later comments in the same thread, all READ: `MBEDTLS_ALLOW_PRIVATE_ACCESS`
  is needed to compile lwIP's `altcp_tls_mbedtls.c` against mbedTLS 3;
  `MBEDTLS_HAVE_TIME` is needed after that; one report of `bad_record_mac`
  at `-O3` with GCC 13.2 on an RP2040 that the maintainer could not reproduce
  and closed the issue over.
- ✅ **MEASURED today, `openssl s_client -showcerts` against
  `ws.positron.studio:443`:**

  | certificate | key | signed with | expires |
  | --- | --- | --- | --- |
  | `CN=positron.studio` | P-256 | ecdsa-with-SHA256, by WE1 | 2026-12-03 |
  | `CN=WE1` | P-256 | **ecdsa-with-SHA384, by GTS Root R4** | 2029-02-20 |
  | `CN=GTS Root R4` (the cross-signed copy) | **P-384** | sha256WithRSA, by GlobalSign Root CA | 2028-01-28 |

  TLS 1.2 negotiated `ECDHE-ECDSA-CHACHA20-POLY1305`, peer signature
  `ecdsa_secp256r1_sha256`. **So pinning GTS Root R4, as plan-pico
  recommends, means verifying one SHA-384 signature with a P-384 key.** That is
  #2633's exact failure if `MBEDTLS_SHA384_C` or `MBEDTLS_ECP_DP_SECP384R1_ENABLED`
  is missing. The pico-examples
  [`mbedtls_config_examples_common.h`](https://raw.githubusercontent.com/raspberrypi/pico-examples/master/pico_w/wifi/mbedtls_config_examples_common.h)
  (READ raw) defines both, plus `MBEDTLS_ALLOW_PRIVATE_ACCESS`,
  `MBEDTLS_HAVE_TIME`, `MBEDTLS_ECP_NIST_OPTIM`, TLS 1.2 only, and no ChaCha,
  so against our relay it would negotiate an AES-GCM ECDSA suite (INFERRED).
  **Start from that file, not from a minimal one.**

### What a handshake costs on the RP2350

**No published RP2350 TLS handshake time exists that I found, with mbedTLS or
wolfSSL.** The one project that claims to measure it,
[pico-network-test](https://github.com/thebenjaminjperkins/pico-network-test),
uses Arduino-Pico's BearSSL and *"intentionally uses `setInsecure()` so its
timing excludes SNTP and certificate-chain validation"* (READ), and its README
publishes no number.

What does exist is the primitives. wolfSSL's
[RP2350 post](https://www.wolfssl.com/a-slice-of-security-for-the-raspberry-pi-pico/)
(2025-01-17, wolfSSL 5.7.6, RP2350 in Arm mode at the default 150 MHz), READ
raw:

| operation | average |
| --- | --- |
| ECC SECP256R1 key gen | 22.489 ms |
| ECDHE SECP256R1 agree | 9.292 ms |
| ECDSA SECP256R1 sign | 24.226 ms |
| ECDSA SECP256R1 verify | **10.569 ms** |
| RSA 2048 public | 4.442 ms |
| SHA-256 | 2.224 MiB/s |
| SHA-384 | 0.988 MiB/s |
| AES-128-GCM encrypt | 897 KiB/s |

It says *"For RP2040, you can expect around 33-50% of this performance."* No
P-384 line, no RAM figure.

And the only comparison against mbedTLS on a Cortex-M33 is the vendor's own:
on an STM32H563 at 250 MHz, wolfSSL is **13.8x** faster on P-256 verify and
**9.4x** on P-256 ECDH, mbedTLS doing **12.1 verifies/s** and **18.6 agrees/s**
([wolfSSL, June 2026](https://www.wolfssl.com/wolfssl-vs-mbedtls-an-apples-to-apples-benchmark-across-intel-arm-cortex-a-and-cortex-m-and-risc-v-targets/),
READ). A vendor benchmarking itself against a competitor is a claim, not a
measurement; it is the only number there is.

INFERRED arithmetic for one TLS 1.2 ECDHE-ECDSA client handshake to our relay:
three signature verifies (leaf, WE1 with P-384, ServerKeyExchange), one key
generation, one agreement.

- **wolfSSL on the RP2350**: 10.6 + 10.6 + about 30 (P-384, guessed at three
  times P-256) + 22.5 + 9.3 ≈ **80 ms of crypto**, plus two round trips to the
  relay at the 36 ms p50 plan-hardware measured from the M1, so about
  **150 to 200 ms**.
- **mbedTLS 3.6 on the RP2350**, scaling by the vendor's ratios at 150 MHz
  rather than 250: about **0.6 to 1.2 s**. That sits next to the SECONDHAND
  *"about 1 s"* for newer mbedTLS on an RP2040 that plan-pico already cites.
- Either way it is paid **once per connection**. It decides whether a dropped
  socket is noticed by a person, not whether the node works.

### Heap

- 📄 READ, a real Pico TLS build: SidecarTridge's ROM emulator, HTTPS
  downloads through lwIP and mbedTLS, reports *"an HTTPS build guarantees 29.5
  KB of heap; the peak over every test download is 18.6 KB"*
  ([PR #21](https://github.com/sidecartridge/md-rom-emulator/pull/21)). That
  firmware runs on the SidecarTridge Multi-device, which is an RP2040 Pico W
  board (INFERRED, the PR does not say). It is the only measured figure found.
- SECONDHAND, a search summary with no source I could open: *"about 40 KB for
  handshake and TLS record buffers"* on a Pico W running MQTT over TLS.
- Against 520 KB on the RP2350 both are small. plan-pico §9.5's "under 100 KB
  together" stands as INFERRED; only the build's own high water mark settles it.

## A3. Pico-DMX on RP2350

READ raw, a shallow clone of [jostlowe/Pico-DMX](https://github.com/jostlowe/Pico-DMX)
and `gh api`:

- **Licence BSD-3-Clause**, not "MIT-ish". Last push **2023-05-15**, 246 stars,
  15 open issues, **no issue or code mentioning RP2350 or Pico 2**.
  `library.properties` lists `architectures=rp2040, mbed_rp2040, mbed_nano`.
- **`DmxOutput` is plain SDK API and should build for RP2350 unchanged**
  (INFERRED from reading it): it loads a PIO program, claims a state machine,
  claims any free DMA channel, and paces it with `pio_get_dreq()`. Nothing in
  it counts PIO blocks or DMA channels.
- **`DmxInput` has two RP2040 assumptions in it** (READ, `src/DmxInput.cpp`):
  - `bool prgm_loaded[] = {false,false}; volatile uint prgm_offsets[] = {0,0};`
    are indexed by `pio_get_index(pio)`. Passing `pio2`, which only the RP2350
    has, writes past both arrays.
  - `#define NUM_DMA_CHANS 12` sizes `active_inputs[]`, and the DMA IRQ
    handler loops `i < NUM_DMA_CHANS`. The RP2350 has **16** channels, so an
    input whose `dma_claim_unused_channel()` returns 12 to 15 is written out of
    bounds and **never serviced** (INFERRED from the code).
  - It also takes `DMA_IRQ_0` with `irq_set_exclusive_handler`, so it conflicts
    with anything else that wants that line (INFERRED; whether CYW43 does was
    not checked).
- **So for positron, which only sends DMX: use `DmxOutput` on `pio0` or
  `pio1` and it should work; leave `DmxInput` alone or patch the two arrays.**
  Still unbuilt, so still a reading, not a fact.

## A4. The licences of rppicomidi's libraries

READ through `gh api`, each `LICENSE` file opened:

| repository | licence | note |
| --- | --- | --- |
| [usb_midi_host](https://github.com/rppicomidi/usb_midi_host) | **MIT** | pushed 2025-08-08 |
| [ble-midi2usbhost](https://github.com/rppicomidi/ble-midi2usbhost) | **MIT** (GitHub shows NOASSERTION because of the extra paragraph) | *"For Bluetooth stack specific code, please see additional license terms"*, linking BTstack's licence and Raspberry Pi's `LICENSE.RP` |
| [pico-w-ble-midi-lib](https://github.com/rppicomidi/pico-w-ble-midi-lib) | **MIT**, same extra paragraph | README: *"Before using this library in a commercial application, please read the LICENSE file and the comments in each source code header file"*; each source header adds *"To the extent this code is solely for use on the Raspberry Pi Pico W or Pico WH, the license file ... LICENSE.RP may apply"* |
| [midi2piousbhub](https://github.com/rppicomidi/midi2piousbhub) | NOASSERTION, not opened | |
| [pico-usb-midi-processor](https://github.com/rppicomidi/pico-usb-midi-processor) | **MIT** | pushed 2026-09-06 |
| [Pico-PIO-USB](https://github.com/sekigon-gonnoc/Pico-PIO-USB) (sekigon, not rppicomidi) | **MIT** | pushed 2026-07-22 |

**What `LICENSE.RP` says** (READ raw,
[pico-sdk](https://raw.githubusercontent.com/raspberrypi/pico-sdk/master/src/rp2_common/pico_btstack/LICENSE.RP)):
*"Product" shall refer to Raspberry Pi hardware products Pico W, Pico WH,
**Pico 2 W**, Pico 2 WH, and RM2*, and BTstack may be used *"in order to use
BTstack with or integrate BTstack into Products or Customer Products"*. **So
BTstack is free for us on the Pico 2 W and not on any other board.** The MIDI
code itself is MIT everywhere. Nothing here blocks taking the code; the BLE
item stays tied to Raspberry Pi's own boards, which is the plan already.

## A5. The RP2350 GPIO function table, against plan-pico §9.1

READ raw, RP2350 datasheet Table 677 (Bank 0 functions) and the ADC section
(*"On QFN-60, there are 4 external inputs ... ADC input on GPIO26 -> GPIO29"*).
The Pico 2 W is the QFN-60 RP2350A.

| pins | plan's job | needs | the table says | ok |
| --- | --- | --- | --- | --- |
| GP0, GP1 | DIN out, in | UART0 TX, RX | F2: UART0 TX, UART0 RX | ✅ |
| GP4, GP5 | OLED | I2C0 SDA, SCL | F3: I2C0 SDA, I2C0 SCL | ✅ |
| GP10 to GP13 | keys | GPIO | F5: SIO | ✅ |
| GP22 | WS2812 | PIO | F6 to F8: PIO0, PIO1, PIO2 | ✅ |
| GP8, GP9 | DMX TX, driver enable | UART1 TX, then GPIO | F2: **UART1 TX**, UART1 RX (so DMX in later needs no move) | ✅ |
| GP7 | tap tempo | GPIO | SIO | ✅ |
| GP2, GP3, GP6 | encoder | GPIO | SIO | ✅ |
| GP26, GP27, GP28 | knobs | ADC0, 1, 2 | ADC inputs 0 to 2 (GP29 is ADC3, the VSYS monitor and wifi clock) | ✅ |
| GP18, GP19, GP20 | I2S data, bit clock, word clock | PIO, clocks on consecutive pins for side-set | PIO on all three; 19 and 20 are consecutive | ✅ |
| GP14, GP15 | MCP4822 clock, data | SPI1 SCK, SPI1 TX | F1: **SPI1 SCK, SPI1 TX** | ✅ |
| GP17 | MCP4822 select | GPIO | SIO (its hardware CSn is SPI0, so drive it as GPIO, which the plan does) | ✅ |
| GP16, GP21 | gates | GPIO | SIO | ✅ |

**All twelve rows hold.** Two notes that came with the table: every one of
those pins except the three ADC pins is **5 V tolerant** (A1), and the ADC
pins are the only ones on the header that are not, so nothing 5 V goes near
GP26 to GP28.

## A6. Wifi and BLE at once, with latency

- **No latency or throughput figure for wifi and BLE together on a Pico W or
  Pico 2 W was found.** Searched again today. What exists is proof that both
  run: a Rust embassy bring-up logging *"coexistence wifi=up ble=up"* with no
  numbers ([garagelight PR #17](https://github.com/retsimx/garagelight/pull/17),
  2026-09-18, READ), on top of the two sources plan-pico already cites.
- ✅ **One useful fact, READ:** Zephyr's vendored CYW43439 NVRAM shipped
  **`btc_mode=0`, `muxenab=0x11`**, Bluetooth coexistence off, and on a Pico 2 W
  that made BLE advertise about 30 dB weak and *"BLE links drop under any WiFi
  load"*. Setting **`btc_mode=1` + `muxenab=0x100`**, *"the georgerobotics/pico-sdk
  config for the same module"*, fixed it, *"verified by a 2-hour zero-fault
  soak on rpi_pico2/rp2350a/m33/w"*
  ([zephyr #111910](https://github.com/zephyrproject-rtos/zephyr/issues/111910),
  READ through `gh api`). And READ raw, the Pico SDK's driver
  [`wifi_nvram_43439.h`](https://raw.githubusercontent.com/georgerobotics/cyw43-driver/main/firmware/wifi_nvram_43439.h)
  carries `muxenab=0x100` (line 53) and `btc_mode=1` (line 56). **So the SDK
  build starts from the configuration that coexists.** That is a precondition,
  not a latency.
- A SECONDHAND note from the same search: wifi power save adds DTIM bounded
  latency, so a node that cares turns it off
  (`cyw43_wifi_pm(&cyw43_state, CYW43_NO_POWERSAVE_MODE)`, INFERRED from the
  SDK's API, not read today).

## What stays open from plan-pico §14, after today

| question | status now | how to settle |
| --- | --- | --- |
| ST485CN, MAX3485, HCT4050 at 3.3 V | **settled** (A1); the shelf `SN74HCT4050` is the one unknown | test one chip with a 3.3 V input at 5 V supply |
| RP2350 GPIO table for §9.1 | **settled** (A5) | |
| licences of rppicomidi's libraries | **settled** (A4) | |
| Pico-DMX on RP2350 | **read, not built**: output should work, input has two bugs (A3) | build `DmxOutput` in our Docker image |
| SDK #2633 against our chain | **cause known and it applies to us**; the fix is two defines we will have (A2) | build `tls_client` against `ws.positron.studio` with the examples config |
| TLS handshake time and heap on the RP2350 | **still open**; primitives published, no handshake, one heap figure from an RP2040 | the same build, time it, read the high water mark |
| wifi and BLE at once, with latency | **still open**; coexistence is on in the SDK's firmware | measure on the board |
| the rest of §14 (relay record size, plain ws decision, soak, GarageBand quirk, clock jitter, AMY voices, PIO-USB CPU, the Goobay hub, the silicon stepping) | unchanged, none of it is a research question | as plan-pico says |

---

# Part B: programmable boards at modular voltages

## B1. What "at modular voltages" means here

From this repository's own reading of VCV's voltage standard,
`plans/plan-vcv-modules.md` §2: *"Signals are voltages ... ±5 V audio, ±10 V
CV, 1 V per octave"* (READ, in repo). Gates are commonly 0 to 5 V or more
(INFERRED, convention). So the job is: **a pitch CV accurate to a few cents
over several octaves, gates, a clock pulse, and audio at about 10 V peak to
peak coming back into a line input that expects about a third of that.** A
Pico's 0 to 3.3 V does none of it without an analogue stage, which is why a
board that already has the stage is worth buying rather than building
(plan-pico §8.4 priced the build: MCP4822, TL072, a 12 V rail, jacks).

## B2. The survey

All prices in euro unless marked; "EE" is delivery to Estonia.

| board | chip, how you program it | I/O at modular level | open? licence | HP, power | price and where (EU / EE) | label |
| --- | --- | --- | --- | --- | --- | --- |
| **Music Thing Modular Workshop Computer** | **RP2040**, 133 MHz, 264 KB RAM. **C/C++ with the Pico SDK** (the ComputerCard library, MIT), Arduino-Pico, MicroPython, Lua. Programs live on **removable program cards** (2 MB or 16 MB flash), flashed as **UF2 over USB**; 4 blank cards in the box | 2 audio/CV in and 2 out, DC coupled, about **±6 V** (outs: **MCP4822 12 bit**); 2 CV in and 2 **precision CV out** (11 bit PWM at 60 kHz, two pole filtered, **about 15 bit** calibrated by delta-sigma); 2 pulse in, 2 pulse out (**about 5 to 6 V**); 3 knobs, 1 switch, 6 LEDs; USB-C (device, and host with about 100 mA out) | **yes**. Card licences per card: Simple MIDI **MIT**, USB Audio **GPL-3.0-or-later**, Blackbird **GPLv3**; the repo has no top level licence | **8 HP, 25 mm deep, 175 mA at +12 V** | **assembled €235** incl. 20 % VAT, in stock, UPS to EE 2 to 3 working days ([Signal Sounds EU](https://signalsounds.eu/music-thing-modular-workshop-computer-eurorack-module-black-assembled/)); DIY black **€156**, in stock ([Signal Sounds](https://signalsounds.eu/music-thing-modular-workshop-computer-diy-kit-black/)); DIY €153.51 **sold out** ([Exploding Shed](https://www.exploding-shed.com/music-thing-modular-workshop-computer/102000)); DIY £120.83 ex VAT, in stock, ships from the UK ([Thonk](https://www.thonk.co.uk/shop/workshop-computer-eurorack/)) | READ (I/O from the [Rev 1 documentation](https://github.com/TomWhitwell/Workshop_Computer/blob/main/documentation/Computer_%20Rev%201%20Documentation.pdf), raw; chip and RAM from [Music Thing](https://www.musicthing.co.uk/Computer_Program_Cards/)) |
| **Music Thing Workshop System** | the Computer above **plus** 2 SineSquare oscillators, 2 Humpback filters, 2 Slopes, Stereo In, Ring Mod, Stompbox, Amplifier, 4 Voltages, Mix (14 modules) | as above, plus a headphone amp and line out on Mix | as above | 42 HP, 30 mm, 250 mA at +12 V; **powered by USB-C or 15 to 25 V DC**, in a foam lined hard case | **assembled €840**, in stock, EE 2 to 3 days ([Signal Sounds](https://signalsounds.eu/music-thing-modular-workshop-system-desktop-eurorack-synthesiser/)); €859 at SchneidersLaden (SECONDHAND, search snippet) | READ |
| **EuroPi** (Allen Synthesis) | **Raspberry Pi Pico, socketed**; **MicroPython**; supports **Pico 2 and Pico 2 W** (`PICO_MODEL` `"pico 2w"`), wifi as client or access point, OSC bundles | **6 CV out, 0 to 10 V**, RC filtered PWM, about 1.5 kHz usable; 1 CV in 0 to 12 V, 12 bit; 1 digital in; 2 knobs, 2 buttons, 128x32 OLED | **yes**: software Apache 2.0, hardware CERN OHL-S v2, docs CC0. Its README **rejects pull requests that "clearly relied on" AI** | 8 HP, 22 mm | DIY kits: £106 ex VAT, out of stock (Thonk), €136.85 (Exploding Shed), €140.36 (Befaco shop): all SECONDHAND | READ (spec, licence, config); prices SECONDHAND |
| **2HPico / 4HPico (and DSP variants)** (rheslip) | **RP2350** (small form factor boards such as Waveshare's); **Arduino-Pico** sketches | 2HPico: 1 or 2 CV in and out by jumper, PT8211 16 bit DAC buffered to **±5 V**, usable as audio; DSP: PCM1808 / PCM5102A 24 bit audio, AC coupled out | KiCad files public, **no licence file** in the hardware repo | 2 or 4 HP | **DIY only**, order PCBs yourself (JLCPCB files verified) | READ ([repo](https://github.com/rheslip/2HPico-Eurorack-Module-Hardware)) |
| **Electrosmith patch.Init()** | **STM32H750, Cortex-M7 480 MHz**, 64 MB SDRAM; C++ (libDaisy, MIT), Arduino, Max gen~ (Oopsy) | **stereo audio I/O 24 bit / 96 kHz**; 4 CV in **±5 V** (16 bit ADC); **1 CV out 0 to 5 V** (12 bit); 2 gate in, 2 gate out; micro USB, plus pins for full OTG host and device | **yes**, hardware and firmware; panel MIT | 10 HP, 31 mm, 90 mA +12 V, 5 mA -12 V | €238 **unavailable** at [SchneidersLaden](https://schneidersladen.de/en/electrosmith-patch.init); $249 **out of stock, "new batch in production"** at [Electrosmith](https://daisy.audio/products/patch-init) | READ ([databrief](https://daisy.nyc3.cdn.digitaloceanspaces.com/products/patch-init/patch_init_databrief-3-13.pdf), raw) |
| **Befaco MIDI Thing V2** | **Teensy 4** + **MAX11300** | **12 assignable ports**, ranges 0 to +10, 0 to +8, 0 to +5, -5 to +5 V; TRS MIDI, **USB host** on the front, USB device via the Teensy port at the back; polyphony, envelopes, LFOs, clock | 🔴 **firmware NOT published**: the repo is one README saying *"you will find source code pretty soon"*; binaries only | 6 HP, 30 mm; **150 mA +12 V**, 5 mA -12 V (Exploding Shed) or 30 / 5 / **120 mA at +5 V** (ModularGrid) | DIY €238 **sold out** ([Exploding Shed](https://www.exploding-shed.com/befaco-midi-thing-2/100629)); assembled €325 list (ModularGrid); €268.10 "available immediately" at Music Store (SECONDHAND, the page refused a fetch) | READ ([repo](https://github.com/Befaco/MIDIThing2), [manual](https://befaco.org/docs/Midi_thing_V2/Midi%20Thing%20V2_User_Manual.pdf)) |
| **monome crow** | STM32; **Lua over USB serial**, scriptable live from a host | 2 in, 4 out, **16 bit, -5 to +10 V** | GPL-3.0 ([repo](https://github.com/monome/crow)) | 2 HP | **discontinued**, used €300 to €350 (SECONDHAND, ModularGrid via search) | SECONDHAND except the licence |
| **Blackbird** (a Workshop Computer card) | crow's protocol on the Computer: Lua 5.4, *"works with ANY serial host"*, a browser editor at [web-druid](https://dessertplanet.github.io/web-druid/) | crow outputs 1 to 4 = the Computer's two precision CV outs and two audio outs; inputs 1 and 2 = CV ins; pulses, knobs and switch through `bb.*` | GPLv3 | the Computer | free, a card | READ ([README](https://github.com/TomWhitwell/Workshop_Computer/tree/main/releases/41_blackbird)) |
| **uO_C** (micro Ornament and Crime) | **Teensy 4.0** since April 2025, Phazerville firmware (v2.0, 2026-06-12) | 4 CV out, 4 CV in, triggers (not read today) | firmware open (not read today) | 8 HP (not read) | $185 to $299 | SECONDHAND |
| **Expert Sleepers ES-9** | not programmable; a **DC coupled USB audio interface**, 16 in, 16 out, 24 bit, up to 96 kHz, class compliant USB 2.0 | every channel is audio **or** CV | **closed** | (not read) | €519 to €618 | SECONDHAND |
| **AMYboard** | **ESP32-S3**, the AMY synth engine; Python, C, Arduino, an online editor | stereo audio in and out, **2 CV channels selectable 1 Vpp or 10 Vpp**, MIDI in and out on 3.5 mm | AMY open source (licence not stated in the article) | fits a 10 HP module | **$29.90** at Makerfabs | READ via [LinuxGizmos](https://linuxgizmos.com/amyboard-esp32-s3-synth-board-supports-midi-cv-and-eurorack-integration/), 2026-03-15 |
| Motivation Radio, Tele-o | ESP32, wifi or BLE MIDI to CV | not read | Motivation Radio open | | DIY | SECONDHAND |
| **Pimoroni, Pico Eurorack board** | none found | | | | | searched, nothing |
| **Pico MIDI to CV, open firmware** | [pico-midi2cv](https://github.com/peterzimon/pico-midi2cv) (no licence, 2023), [Pico-DCO-DAC](https://github.com/craigyjp/Pico-DCO-DAC) (no licence, 2022), [Midi2euroPiW](https://github.com/glitched0xff/Midi2euroPiW) (**AGPL-3.0**, 2024: a Node bridge sends MIDI over **UDP to a EuroPi with a Pico W** inside, six CVs by wifi) | | | | DIY | READ (`gh api`) |

## B3. The ones that matter, in more words

### Music Thing Workshop Computer: the one to buy

- **It is the same chip and the same toolchain as `rig/pico/firmware/`.** The
  Computer is an RP2040; our Docker image already builds an RP2040 target
  (`build-pico/router.uf2`) and our emulator, rp2040js, is an RP2040
  emulator. Its audio outs are an **MCP4822 on SPI (GPIO18 clock, 19 data,
  21 select)** and its inputs go through a **4052 multiplexer into the RP2040's
  own ADC** (READ, Rev 1 pinout). plan-pico §8.4 already notes rp2040js shows
  every SPI word and lets a script set ADC values. So a card's firmware could
  be run and checked in the existing harness before the module arrives
  (INFERRED, not tried).
- **The ComputerCard library is MIT** and gives a fixed **48 kHz**
  `ProcessSample()` callback, asks for `set_sys_clock_khz(144000, true)` to cut
  ADC noise, and has a **USB MIDI host** that runs on the second core
  (`mu.Start(); // claims the second core, and runs USB MIDI host there`)
  (READ raw, [ComputerCard README](https://github.com/TomWhitwell/Workshop_Computer/tree/main/Demonstrations%2BHelloWorlds/PicoSDK/ComputerCard)).
- **Three cards already do the remote job, all READ:**
  - **`06_usb_audio`** (Vincent Maurer, GPL-3.0-or-later, C++ on the Pico SDK):
    *"a class-compliant multichannel USB audio interface and USB MIDI device
    with integrated CV/Gate support"*. With switch Z **up** (Alt mode):
    **CV Out 1 = 1V/Oct from MIDI notes, Pulse Out 1 = gate, Pulse Out 2 =
    clock / run, CV Out 2 = a CC**, and **Audio In 1 and 2 = stereo to the
    host on USB channels 5 and 6**. Defaults 44.1 kHz; *"The RP2040 USB
    interface operates at Full Speed (USB 1.1)"*, macOS up to 6 channels at
    48 kHz, Windows 4 at 44.1 kHz. Configured from a **Web MIDI editor in the
    browser**, saved to the card's flash.
    ([README](https://github.com/TomWhitwell/Workshop_Computer/tree/main/releases/06_usb_audio))
  - **`00_Simple_MIDI`** (Tom Whitwell, MIT, Arduino-Pico): USB MIDI device;
    two channels of note pitch, gate and CC 42 to CV; knobs and inputs back as
    CCs 34 to 41; **and it is the calibration card for the precision CV outs**
    that other cards read from EEPROM.
    ([README](https://github.com/TomWhitwell/Workshop_Computer/tree/main/releases/00_Simple_MIDI))
  - **`41_blackbird`** (GPLv3): the crow protocol over USB serial, live coded
    from a browser.
- ⚠️ **One card at a time.** While `06_usb_audio` is in, the Computer is an
  interface and nothing else; the sound has to come from other modules. That
  is why the Workshop System matters (B6).
- ⚠️ **The voltages are from the Rev 1 developer document (2024)**, which says
  *"I'll be taking feedback and tweaking this"*. The production module may
  differ. The Signal Sounds page lists the I/O in names only.
- **Flashing**: drag a UF2 onto it over USB; the Rev 1 document puts the boot
  button *"behind the top pot, so you'll take that off to write .uf2 to a
  card"* (READ). Whether the production module still needs the knob off was
  not read.
- **Power**: 175 mA at +12 V (READ, Thonk and Exploding Shed). It *"cannot draw
  power from the front panel USB socket"* (READ, Music Thing), so it needs a
  Eurorack supply.

### EuroPi: the one that takes the Pico 2 W on the desk

A EuroPi is a Pico on a socket with six 0 to 10 V outputs. Its config already
knows `"pico 2w"` and wifi (READ). **So the Pico 2 W ordered for the router
could sit in a EuroPi and be a wifi node with six CV outputs**, which is
plan-pico §3's node and §8.4's CV in one, with the analogue stage already
built. Midi2euroPiW proves the shape on a Pico W, in MicroPython, over UDP.
What stops it being first: the outputs are **RC filtered PWM, about 1.5 kHz
usable** (READ), so pitch accuracy is a calibration question nobody has
answered for it here; it is **DIY only** and the kits read sold out or
SECONDHAND; its firmware is MicroPython, so our C node would replace it rather
than extend it; and **no audio comes back** (no audio input or output at all).

### patch.Init(): the strongest DSP, the weakest fit

A 480 MHz Cortex-M7 with 24 bit audio is far more instrument than the
Computer. For positron it loses on three counts: **one CV out, 0 to 5 V
only**, not the Pico toolchain, and **out of stock everywhere read today**.
plan-hardware already put the Daisy *"on the other end of the DIN cable"*.

### Befaco MIDI Thing V2: the most CV, closed firmware

Twelve ports, -5 to +10 V, USB host and TRS MIDI: the best plain MIDI to CV on
this list. 🔴 **But the firmware is not published**, so it is a fixed
function box, not a board we program. It is the right buy only if the aim is
"more CV outputs" rather than "our code at modular voltages".

### ES-9: the professional version of `06_usb_audio`

Sixteen DC coupled channels where any channel is audio or CV, class compliant
(SECONDHAND). It is what the Computer with card 06 does at six channels, for
about three times the price, closed.

## B4. A case and power, and the cheapest that fits

| case | HP, depth | power | price, stock | label |
| --- | --- | --- | --- | --- |
| **4ms Pod26 (powered)** | 26 HP, **33 mm** | 700 mA +12 V, 280 mA -12 V, 200 mA +5 V | **€118, in stock** ([Thomann](https://www.thomann.de/intl/4ms_pod26_powered.htm)) | READ |
| 4ms Pod32 (powered) | 32 HP, 33 mm | same | **€127, in stock** ([Thomann](https://www.thomann.de/intl/4ms_pod32_powered.htm)) | READ |
| 4ms Pod20 (powered) | 20 HP, 33 mm, **2 slots** | same | €111, stock not shown ([Thomann](https://www.thomann.de/intl/4ms_pod20_powered.htm)); **€134 incl. 24 % VAT, 1 to 3 weeks (19.10 to 23.10)** ([Pillipood.ee](https://shop.pillipood.ee/328425/0/readmore/339911/)) | READ |
| 4ms Pod34X (powered) | 34 HP, 55 mm, 4 slots | 1.4 A +12 V | €145, *"expected back in stock soon"* ([Thomann](https://www.thomann.de/intl/4ms_pod34x_powered.htm)) | READ |
| **4ms Power Brick 45 W** (every powered Pod needs it, **not included**) | | | **€23.70, in stock** ([Thomann](https://www.thomann.de/intl/4ms_power_brick_45w.htm)) | READ |
| Tiptop Happy Ending Kit | 84 HP rails and ears (a frame, not a box), uZeus supply with two flying bus boards, 1000 mA external supply | | **€144, in stock** ([Thomann](https://www.thomann.de/intl/tiptop_audio_happy_ending_kit_black_eu.htm)); €167 at [Pillipood.ee](https://shop.pillipood.ee/Eurorack-korpused/2/) | READ |

- **Estonia, checked**: [Pillipood.ee](https://shop.pillipood.ee/) is the one
  Estonian shop found with a Eurorack catalogue, and it reads like Thomann's
  catalogue resold (its Pod20 page quotes Thomann's own article number for the
  brick). It carries 4ms, Befaco, Doepfer, Tiptop; it returned **nothing** for
  Music Thing, Electrosmith, patch.Init, MIDI Thing or Expert Sleepers (READ,
  its search, one request per term, 1.5 s apart). Every Pod and the Computer
  fit its 33 mm depth (Computer 25 mm, patch.Init 31, MIDI Thing 30).
- **Thomann's pages were read with the "Estonia" storefront** (`/intl/`, the
  page title ends in "Estonia"); that the prices include Estonian VAT is INFERRED.
  Signal Sounds says its prices include 20 % VAT and *"the precise sales tax
  rate for your country will be calculated at checkout"* (READ); at Estonia's
  24 % (READ, on Pillipood's page) €235 becomes about **€243** (INFERRED).
- **The Workshop System needs none of this**: it is its own case and takes
  USB-C power (READ).

## B5. How a modular sits in the universal patchbay

**It is already a shape the registry knows: a hardware input.** READ,
`demo/shell/graph-registry.mjs:60-74`: for every entry in the board's
`BOARD_INPUTS`, the registry makes a `device` node with an **`audio` out**
port (48 kHz, one channel, addressed to the room `rig/board/inputs.mjs`
streams it into, `<room>-<name>`) and, if the entry names a MIDI port, a
**`midi` in** port. That is how the Circuit appears today:
`{"circuit":{"device":"hw:CARD=Pro,DEV=0","channels":2,"take":1,"midi":{"port":"Circuit","channels":[1,2,10]}}}`
(READ, HANDOFF).

With the Computer on card 06 plugged into the Pi's hub, the same entry would
read, INFERRED and untried:
`{"modular":{"device":"hw:CARD=<the Computer>,DEV=0","channels":<4 or 6>,"take":<5>,"midi":{"port":"<its ALSA name>","channels":[1]}}}`.
Then:

| patchbay port | medium (`bay.mjs` MEDIA) | what it is on the module |
| --- | --- | --- |
| `modular:in` | `midi` | notes on channel 1 become **CV Out 1 (1 V/oct) and Pulse Out 1 (gate)** |
| `modular:in`, clock messages | `clock` | **Pulse Out 2, clock or run gate** |
| `modular:in`, a CC | `value` | **CV Out 2**, one CC as a voltage |
| `modular:audio` | `audio` | **Audio In 1 / 2**, back over USB, streamed by `inputs.mjs` into `studio-1-modular` |
| (later) `modular:cv-in` | `value` out | CV In 2 as a CC back to the graph |

🔴 **TWO THINGS IN THE BOARD STOP THIS TODAY, AND BOTH ARE SMALL.**
- **The MIDI gate is Circuit shaped.** `midiVerdict` in
  `rig/board/inputs.mjs:77-107` (READ) passes only note on, note off, CC 123
  and the Circuit's `SYNTH_CC` set, refuses anything that is not three bytes,
  and refuses programs above 63. So **notes reach the modular, clock (one
  byte, `0xF8`) and an arbitrary CC do not**. It wants a per input allow
  list in the config, which is the same rule the Circuit already needs written
  down rather than hard coded (INFERRED).
- **The rate.** `inputs.mjs` captures at 48 kHz (READ, the registry's shape);
  card 06 defaults to **44.1 kHz** and lets the web editor change it (READ). Set
  the card to 48 kHz, and only after that try the capture.

**Audio level, if the capture goes through the Fast Track Pro instead.**
Eurorack audio is about 10 V peak to peak (B1); the Fast Track Pro has a **Pad
button and Inst/Line** on the front (READ, `plans/plan-fasttrack-mk425c.md`
§2.6) and its **input 2 is free** (READ, HANDOFF). It already clips on the
Circuit (HANDOFF), so a modular into it starts with the pad in and gain down,
and a level reading before anybody listens (INFERRED).

## B6. The simplest way to play a modular from the patchbay

**Today, with what the desk has: not possible, because there is no modular and
nothing on the desk has CV.** plan-pico §8.4 reached the same verdict
(INFERRED from the instrument lists). Everything below needs one purchase.

**With one module and a case, two routes, both using pieces that exist:**

1. **USB, one cable, recommended.** Pi's USB hub → Workshop Computer on card
   06. Notes, clock and a CC go out as CV and pulses; the modular's audio comes
   back on the same cable as a USB audio device. On the positron side it is a
   `BOARD_INPUTS` entry plus the two small board changes in B5. **No Pico, no
   Fast Track Pro, no new page**: `/away/` and `/patchbay/` already speak to
   hardware inputs (INFERRED from the registry and HANDOFF; nothing tried).
2. **DIN, if the module is a plain MIDI to CV.** The Fast Track Pro has a MIDI
   Out socket on the Pi today (READ, plan-fasttrack §2.6), and the Pico router's
   UART0 is a DIN out; either feeds a TRS MIDI input (MIDI Thing V2) through a
   DIN to TRS adapter. Audio comes back through Fast Track Pro input 2 with the
   pad in. More cables, a second interface for audio, and the same gate change.

**The Pico router's place in it**: the router is a USB host
(`usb_midi_host`, MIT, A4) and the Computer is a USB MIDI device on cards 00
and 06, so the router could drive the Computer with no Pi at all (INFERRED;
the router's USB host side is planned, not built). That is the "Pico carries
on alone" point of `plans/plan-route-core.md`, extended to a modular. The
audio still has to reach a computer to leave the room.

## B7. Recommendation

**First board: the Music Thing Workshop Computer, assembled.** The reasons, in
order of weight:

1. **It is our toolchain and our emulator.** RP2040, Pico SDK, UF2. The build
   in `rig/pico/firmware/` and the rp2040js harness in `rig/pico/sim/` apply
   to it as they stand (INFERRED). No other board on the list is both at
   modular voltages and on the chip we already build and emulate.
2. **It already closes the loop the playasynth idea needs** with card 06:
   notes, gate, clock and a CC out, stereo audio back, on one USB cable, class
   compliant. Every other board here does half of that and needs an audio
   interface for the other half.
3. **It is open where we would build**: ComputerCard is MIT, so our own cards
   can be any licence; card 06 and Blackbird are GPL, which is fine to run and
   a decision to copy from.
4. **It is in stock in the EU, delivered to Estonia in two to three days**, at
   €235.
5. **Program cards are cheap and swappable**, so a "positron card" (a wifi
   free, USB only patchbay node at modular voltages) can sit next to the
   factory cards without overwriting them.

What it is not: a precision instrument (inputs *"really more like 8-10
bits"*, READ), and not networked (USB only; the network stays on the Pi).

**Minimal starter setup, two options:**

| option | parts | price | note |
| --- | --- | --- | --- |
| **A. The interface, in a small case** | Workshop Computer assembled €235 ([Signal Sounds](https://signalsounds.eu/music-thing-modular-workshop-computer-eurorack-module-black-assembled/)) + 4ms Pod26 powered €118 ([Thomann](https://www.thomann.de/intl/4ms_pod26_powered.htm)) + 4ms Power Brick €23.70 ([Thomann](https://www.thomann.de/intl/4ms_power_brick_45w.htm)) + a few 3.5 mm patch cables (not priced today) + a USB-A to USB-C data cable | **≈ €377**, about €385 at 24 % VAT, plus cables | the Computer makes sound on its own cards (oscillators, the acid and chord cards in its library), but **not while it is the USB interface**, so for remote play with audio back it wants a voice beside it: 18 HP left in the Pod for one |
| **B. A whole modular with the Computer in it** | Workshop System assembled ([Signal Sounds](https://signalsounds.eu/music-thing-modular-workshop-system-desktop-eurorack-synthesiser/)) | **€840**, about €868 at 24 % VAT | two analogue oscillators, two filters, two envelopes, a mixer, its own case and **USB-C power**. With card 06 in the Computer, the Pi plays **real analogue voices** and hears them back on one cable. This is the literal "play my synth" for a modular |

**My recommendation is B if the aim is the playasynth idea, A if the aim is a
development board.** B is the smallest thing that is both a real modular and
remotely playable with audio back, with nothing else to buy. A is the cheapest
way to start writing cards and testing them against the emulator, and a voice
module can be added later.

Neither is a reason to put CV on the Pico board (plan-pico §8.4): the Computer
does it better for the price of the parts plus the soldering.

## What could not be settled

| question | why not | how to settle |
| --- | --- | --- |
| Does the Pi's kernel take the Computer on card 06 as a USB audio device at 48 kHz, and at what latency | no module here; the card's README speaks only of macOS and Windows | plug it into the Pi, `arecord -l`, `aplay -l`, then one `inputs.mjs` capture with a level reading |
| The production Computer's real voltage ranges and pitch accuracy | the only numbers are the 2024 Rev 1 developer document | measure CV Out 1 over five octaves after Simple MIDI's calibration |
| Whether the Workshop System's case USB-C and the Computer's front USB-C are different ports (power versus data) | not stated on the pages read | the manual, or the box |
| Whether the Workshop System includes patch cables | not stated on the page read | the shop, or the box |
| Whether the shelf `SN74HCT4050` is HCT | no datasheet under its name; maker unknown | one chip, 5 V, a 3.3 V input |
| TLS handshake time and heap on the RP2350 | nobody has published one | build `tls_client` against `ws.positron.studio`, as plan-pico §14 says |
| Wifi and BLE together, with latency | nobody has published one | measure on the board |
| Pico-DMX built for RP2350 | read, not compiled | build `DmxOutput` in our image |
| EuroPi PWM pitch accuracy; MIDI Thing V2's latency; ES-9 on a Pi | not read, or not published | not needed for the first purchase |
| Prices marked SECONDHAND (EuroPi, MIDI Thing V2 at Music Store, ES-9, uO_C, crow, SchneidersLaden's Workshop System) | search snippets, or a page that refused a script | open the shop page before buying |

**Cost of this research**: about 30 web searches and 25 page fetches through a
fetch tool; about 15 shop pages read by `curl`, one request per page, 1.5 s
apart (Oomipood 2, Thomann 9, Pillipood 10 searches and pages); about 45
`gh api` calls; seven datasheets downloaded and read with `pdftotext` (RP2350,
CD74HC4050, Philips HCMOS family, ST485, MAX3483 to 3491, MCP4822, patch.Init
databrief) plus the Workshop Computer Rev 1 document and the MIDI Thing V2
manual; one shallow `git clone` of Pico-DMX; **two `openssl s_client` calls
against our own relay**. No broadcaster or other media server was touched.
Nothing was bought, built, flashed or plugged in.
