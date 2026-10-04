# Screens and panels for the Pi, bought in Estonia (2026-10-04)

Asked: *"research basic screens/panels for pi available in est"*.

Every price, stock line and part number below was READ from the shop page on
2026-10-04 unless the row says otherwise. Anything marked **inferred** is not
on the page and comes from general knowledge of the part. Nothing was bought
and nothing was plugged in.

## The board this is for

- **Pi 4**, `192.168.1.213`, room `studio-1` (HANDOFF.md, read today).
  `plans/plan-hardware.md` recommends a Pi 5 for a future box; everything
  recommended below fits both.
- 🔴 **THE BOARD DOES NOT DRIVE HDMI TODAY.** `rig/vis/README.md`: *both HDMI
  ports are disconnected and there is no X server*, and the visuals render
  through EGL surfaceless on `/dev/dri/renderD128` into an FBO that is read
  back and encoded. `glmark2-es2-drm` fails with no connector. So a screen is
  a NEW output path for the rig, not a mirror of an existing one: plugging one
  in gives KMS a connector, and the renderer then needs a scan-out path
  (KMS/DRM page flip) it does not have today. The FBO/encode path is not
  affected by a screen being present (inferred, not measured).
- Pi 4 has one 15-pin DSI connector and two micro-HDMI. The Pi 5 has two
  22-pin mini connectors (camera/display) and two micro-HDMI.

## How the Estonian market looks, in one paragraph

**Oomipood's own shelves carry no Pi screen at all today.** Its two own-stock
Pi touchscreens (official 7" and a 3.5" SPI) read *"Toode ei ole saadaval"*.
What Oomipood DOES offer is the TME catalogue under `/kataloog/tme/`: the
official Touch Display 2 and a long Waveshare range, every one reading
*"Toode ei ole kohapeal, eeldatav tarneaeg 8. oktoober 2026"*, i.e. not on
site, **four days' delivery**. Oomipood's own stock is strong in small
SSD1306/SSD1309 OLEDs and SPI TFTs, with per-store counts. Elsewhere:
Electrobase (Latvian, Estonian-language shop, `electrobase.lv/et`) has the
Touch Display 2 7" from supplier stock; Toppc.ee has a 7" `RB-LCD-7` at 14
days; Kaup24 has only marketplace sellers (mostly Lithuanian) at inflated
prices; Arvutitark's Raspberry Pi category (31 products) has **no displays**;
Frog.ee and Cybermarket.ee list the Touch Display 2 7" as *"Laost otsas"*
(out of stock) on hind.ee. 1a.ee, Photopoint, Euronics, Klick and ON24 were
not reached: 1a.ee and hind.ee answer 403 to a script, and hind.ee (which
indexes Euronics, Klick and Kaup24) was read through a browser instead and
showed nothing from those shops for "raspberry pi display".

## 1. Official Raspberry Pi displays

| item | size, res | interface | touch | fits | price | stock (read) | link |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Touch Display 2, 7" (SC1635) | 7", 720x1280 portrait | DSI | capacitive, 5 point | Pi 1B+ and later incl. Pi 4, Pi 5; not Zero | **82.85 €** | not on site, delivery 8 Oct 2026 | [Oomipood TME SC1635](https://www.oomipood.ee/kataloog/tme/toode?sku=U0MxNjM1) |
| same, at Electrobase | as above | DSI | as above | Pi 3 A+/B+, Pi 4, Pi 5 (page) | 97.56 € | "Saadaval tarnija laos 80 tk", pickup to 07.10, delivery to 09.10 | [Electrobase](https://electrobase.lv/et/avaleht/solutions-compatible-arduino/display-black-120x190x66mm-black-interface-dsi-85deg-7) |
| Touch Display 2, 5" (SC1975) | 5", 720x1280 portrait | DSI (TME's listing says "24bit RGB", which is the panel's colour depth; the official docs say DSI) | capacitive, 5 point | as the 7" | **59.64 €** | not on site, delivery 8 Oct 2026 | [Oomipood TME SC1975](https://www.oomipood.ee/kataloog/tme/toode?sku=U0MxOTc1) |
| same, at Electrobase | | | | | 65.04 € on hind.ee | not read | via [hind.ee search](https://www.hind.ee/s/raspberry-pi-touch-display/) |
| Touch Display 2, 10" | 10.1", 1200x1920 | DSI 22-pin | 10 point | **Pi 5 only** (docs) | not found in Estonia | | |
| Original 7" Touch Display (SC1227) | 7", 800x480 | DSI | capacitive | Pi 3 listed | no price | "Toode ei ole saadaval" | [Oomipood TME SC1227](https://www.oomipood.ee/kataloog/tme/toode?sku=U0MxMjI3) |
| Oomipood own "Puutetundlik ekraan 7'' Raspberry PI-le" (2473872) | 7" | DSI | capacitive | all DSI Pis | no price | "Toode ei ole saadaval" | [Oomipood](https://www.oomipood.ee/product/2473872_puutetundlik_ekraan_7_raspberry_pi_le) |
| Toppc.ee "Raspberry Pi 7" Touchscreen Display" RB-LCD-7 | 7", 800x480, TN | **not stated on page**; 800x480 matches the original DSI display, inferred | yes | not stated | **62.14 €** | "Saab tellida 9", available 14 days after order | [Toppc.ee](https://www.toppc.ee/c/90-lcd-monitorid/1461744-raspberry-pi-7-touchscreen-display-f-r-raspberry-pi) |

**Touch Display 2, read from the [Raspberry Pi docs](https://www.raspberrypi.com/documentation/accessories/touch-display-2.html):**
- Ships with a 15-way to 15-way FFC for **Pi 4 and earlier** and a 22-way to
  15-way FFC for Pi 5, plus a GPIO power lead. **Both cables are in the box**,
  so one purchase covers the Pi 4 now and a Pi 5 later.
- **Auto-detected on a Pi B+ and later**: no `config.txt` line. Only Compute
  Modules need `dtoverlay=vc4-kms-dsi-ili9881-7inch` (or `-5inch`).
- Powered from the Pi's GPIO, no separate supply. **No power draw figure is
  given** in the docs.
- The panel is native portrait (720x1280); landscape is a rotation in the
  compositor or in the page (inferred, standard practice).

## 2. Third-party touchscreens (DSI and HDMI), 3.5" to 10"

All Waveshare rows are the TME catalogue through Oomipood: "not on site,
delivery 8 Oct 2026" unless the row says otherwise. Waveshare product names
are **inferred** from the part numbers; Oomipood's page shows only the TME
generic description.

| item (part) | size, res | interface | touch | price | stock | link |
| --- | --- | --- | --- | --- | --- | --- |
| Waveshare 5" DSI (WSH-18396) | 5", 800x480 | DSI + I2C (touch) | yes (inferred capacitive, from the I2C) | **64.57 €** | 8 Oct | [Oomipood](https://www.oomipood.ee/kataloog/tme/toode?sku=V1NILTE4Mzk2) |
| Waveshare 8" DSI (WSH-21229) | 8", 800x480 | DSI | not read | 82.17 € | 8 Oct (from the listing only) | [Oomipood](https://www.oomipood.ee/kataloog/tme/toode?sku=V1NILTIxMjI5) |
| Waveshare 7" QLED (WSH-18625) | 7", 1024x600 | **HDMI** (+USB touch, inferred) | capacitive | **87.96 €** | 8 Oct | [Oomipood](https://www.oomipood.ee/kataloog/tme/toode?sku=V1NILTE4NjI1) |
| Waveshare 7" IPS (WSH-11303) | 7", 1024x600, IPS | not stated on page (inferred HDMI) | not stated | 69.94 € | 8 Oct | [Oomipood](https://www.oomipood.ee/kataloog/tme/toode?sku=V1NILTExMzAz) |
| Waveshare 10.1" IPS (WSH-18096) | 10.1", 1024x600 | **HDMI + USB** | capacitive | 133.53 € | 8 Oct | [Oomipood](https://www.oomipood.ee/kataloog/tme/toode?sku=V1NILTE4MDk2) |
| Waveshare 7" DPI (WSH-12885) | 7", 1024x600 | **DPI on the 40-pin header** | none | 51.16 € | 8 Oct | [Oomipood](https://www.oomipood.ee/kataloog/tme/toode?sku=V1NILTEyODg1) |
| Waveshare 3.5" SPI (WSH-12287) | 3.5", 320x480 | SPI, 26-pin header | resistive, XPT2046 | no price | "Toode ei ole saadaval" | [Oomipood](https://www.oomipood.ee/kataloog/tme/toode?sku=V1NILTEyMjg3) |
| Waveshare 2.8" (WSH-12219) | 2.8", 320x240 | not read | not read | 34.30 € | 8 Oct (listing) | [Oomipood](https://www.oomipood.ee/kataloog/tme/toode?sku=V1NILTEyMjE5) |
| Luckfox 5" DSI (Kaup24 marketplace) | 5", 800x480 | DSI | capacitive | 92.27 € | not read | [Kaup24](https://kaup24.ee/et/arvutid-ja-it-tehnika/monitorid/monitorid/monitor-luckfox-raspberry-pi-5-tolline-puuteekraan-5?id=113177324) |
| 3.5" SPI TFT HAT (Kaup24 marketplace) | 3.5", 480x320 | SPI | resistive | 53.22 € | not read | [Kaup24](https://kaup24.ee/et/arvutid-ja-it-tehnika/monitorid/monitorid/monitor-35-tolline-tft-puuteekraan-spi-display-hat?id=112125489) |

Driver notes (inferred, general knowledge, not read today):
- **HDMI panels are plug and play** on Raspberry Pi OS; USB touch is a HID
  device. Power is a separate USB lead.
- **DSI Waveshare panels need a `dtoverlay` line** in `config.txt` (Waveshare
  publishes one per panel); the official Touch Display 2 does not.
- **SPI TFT HATs (3.5") need a driver**: on current Raspberry Pi OS that means
  a `dtoverlay` for an fbtft/`panel-mipi-dbi` driver, and refresh is a few
  frames a second at full screen. They also occupy the GPIO header.
- **DPI (WSH-12885) consumes most of the GPIO header**, which conflicts with
  anything else the board puts on GPIO (MIDI UART, I2S). Not recommended here.

## 3. Tiny status displays (Oomipood OWN stock, per-store counts read)

| item (code) | size, res | controller | interface | price | stock (read) | link |
| --- | --- | --- | --- | --- | --- | --- |
| OLED 0.96" blue/white (OKY4020) | 128x64 | SSD1306 | I2C, 3 to 5 V, 0.08 W | **12.00 €** | Peterburi tee 122, Järve 7, Tartu 5, Pärnu 1 | [Oomipood](https://www.oomipood.ee/product/oky4020_oled_displei_0_96_sinine_ja_valge) |
| OLED 0.96" + 4 buttons (OKYN-G5335) | 128x64 | SSD1306 | I2C, 3.3 to 5 V | **10.50 €** | Peterburi tee 56, Järve 4 | [Oomipood](https://www.oomipood.ee/product/oled_display_4_nuppu_096_128x64_33v_i2c_ssd1306) |
| OLED 2.42" white (OKYN-Y0335) | 128x64 | SSD1309 | I2C, addr 0x3C | **35.00 €** | Peterburi tee 56, warehouse 54, Järve 4 | [Oomipood](https://www.oomipood.ee/product/oled_display_242_128x64_35v_valge_i2c_ssd1309) |
| OLED 0.91" | 128x32 | not stated | I2C | 11.00 € | "Laos" (counts not read) | [Oomipood](https://www.oomipood.ee/product/oled_display_091_128x32_33v_sinine_ja_valge_i2c) |
| IPS 1.3" (OKYN220512-16) | 240x240 colour | ST7789 | SPI, 7-pin, 3.3 V | **19.00 €** | Peterburi tee 36, Järve 4 | [Oomipood](https://www.oomipood.ee/product/lcd_display_13_240x240_33v_rgb_spi_st7789) |
| TFT 2.4" + touch (OKY4031-1) | 320x240 colour | ILI9341 | SPI, resistive touch, 3.3 to 5 V | 28.00 € | Peterburi tee 45, Järve 1, Tartu 1 | [Oomipood](https://www.oomipood.ee/product/tft_display_24_320x240_rgb_33v_spi_ttl) |
| Waveshare 2.23" OLED HAT (WSH-17009) | 128x32 | not read | 40-pin HAT | 27.51 € | TME, not on site | [Oomipood](https://www.oomipood.ee/kataloog/tme/toode?sku=V1NILTE3MDA5) |

Driver notes (inferred): SSD1306/SH1106/SSD1309 over I2C are driven from
userspace (`luma.oled` in Python, or a few hundred bytes of I2C writes from
node via `i2c-dev`) after enabling I2C in `raspi-config`; no kernel overlay
needed. An `ssd1306` kernel overlay also exists. ST7789/ILI9341 run either
from userspace over `spidev` or as a framebuffer via an overlay.

## 4. e-paper

| item | size, res | interface | price | stock | link |
| --- | --- | --- | --- | --- | --- |
| Waveshare 2.66" (WSH-18321) | 296x152, black/white | SPI (inferred) | 23.70 € | TME, not on site (listing) | [Oomipood](https://www.oomipood.ee/kataloog/tme/toode?sku=V1NILTE4MzIx) |
| Waveshare 4.2" module (WSH-13353) | 400x300, b/w | 3/4-wire SPI, 8-pin cable | no price | "Toode ei ole saadaval" | [Oomipood](https://www.oomipood.ee/kataloog/tme/toode?sku=V1NILTEzMzUz) |
| DFRobot 2.13" e-ink (DF-DFR0591) | 250x122 | SPI | no price | "Toode ei ole saadaval" | [Oomipood](https://www.oomipood.ee/kataloog/tme/toode?sku=REYtREZSMDU5MQ) |
| Waveshare 7.8" e-paper (Cybermarket.ee) | 7.8" | not read | 219.00 € | not read | via [hind.ee](https://www.hind.ee/s/raspberry-pi-display/) |

**No e-paper HAT is on any Estonian shelf today.** The 2.66" is the only one
with a price and a delivery date, and it is a module, not a HAT (inferred
from the TME family).

## Recommendations

**(a) A screen for the GPU's own output: Raspberry Pi Touch Display 2, 7"
(SC1635), 82.85 € at Oomipood via TME, delivery 8 Oct.**
[link](https://www.oomipood.ee/kataloog/tme/toode?sku=U0MxNjM1)
DSI keeps both HDMI ports free for a projector, it is auto-detected on the Pi 4
with no overlay, it is powered from the header, and the box carries the Pi 5
cable too. If a landscape picture at a larger size matters more than staying
on the official part, the **Waveshare 7" QLED HDMI (WSH-18625), 87.96 €**
[link](https://www.oomipood.ee/kataloog/tme/toode?sku=V1NILTE4NjI1)
is plug and play on HDMI but takes one of the two HDMI outputs and needs its
own USB lead. ⚠️ Either way the rig needs a KMS scan-out path it does not have
today (see "The board this is for").

**(b) A touch panel for the router or `/graph/`: the same Touch Display 2, at
5" (SC1975, 59.64 €) if it lives on the desk next to the Circuit, or 7" if it
has to be read from a chair.** [5" link](https://www.oomipood.ee/kataloog/tme/toode?sku=U0MxOTc1)
The panel would run the existing `/graph/` page in a kiosk browser, which
costs RAM on a box the hardware plan sized for no browser at all
(`plans/plan-hardware.md` §7b: 1 GB Pi 5, native). That is the real price of
this option, not the 60 €. A phone as the screen, which the dawless plan
already assumes, costs nothing.

**(c) Always-on status: OLED 0.96" + 4 buttons, SSD1306, I2C (OKYN-G5335),
10.50 €, 56 on the shelf at Peterburi tee today.**
[link](https://www.oomipood.ee/product/oled_display_4_nuppu_096_128x64_33v_i2c_ssd1306)
Four wires on the I2C pins, no overlay, no browser, written from `board.mjs`
over `i2c-dev`, and the buttons give a stop/next/confirm with no phone. If
0.96" is too small to read across the desk, the **2.42" SSD1309 at 35.00 €**
[link](https://www.oomipood.ee/product/oled_display_242_128x64_35v_valge_i2c_ssd1309)
is the same protocol at 128x64 and twice the size.

## What could not be settled

- **Power draw** of Touch Display 2: not in the official docs; measure it on
  the Pi 4's 5 V rail before trusting the board's 3 A supply with it, the
  Fast Track Pro and the Circuit's USB.
- **Whether the Pi 4 can scan out to DSI and HDMI at once** under KMS while
  the v3d render node is busy: believed yes (inferred), not measured.
- **Toppc's RB-LCD-7 interface** is not on its page.
- **Shops not reached**: 1a.ee (403 to a script), Photopoint, Euronics, Klick,
  ON24 directly. hind.ee, which indexes Euronics, Klick and Kaup24, showed
  none of them carrying a Pi display.
- TME catalogue stock can change between the listing and the order; the
  8 Oct date is what the page said at the moment it was read.

## Links checked

Every Oomipood and Electrobase link above answered **200** to `curl` on
2026-10-04. Toppc.ee, raspberrypi.com, hind.ee and Kaup24 answer **403** to
`curl` and were read in a real browser, where each one loaded.
