## Wall-clock timecode through live→VOD: industry survey + recommendation (2026-08-26)

**TL;DR — the industry independently arrived at our architecture.** ATSC 3.0 concluded that in-band metadata does not survive redistribution, and standardized (1) a luma-modulated data strip in the top lines of the picture (A/335) and (2) an inaudible audio watermark carrying an incrementing time interval code (A/334/Verance VP1), with out-of-band recovery servers (A/336). Our 56-block ms-strip is a taller, more robust private A/335; our T0-in-metadata plan is a private A/336. Keep both.

### What the industry does
- **Production**: SMPTE ST 12 timecode rides SDI/ST 2110 (PTP-disciplined) in-facility; H.264 SEI pic_timing carries it into contribution encodes — and packagers/transcoders routinely strip it (our CF measurement is the norm, not an anomaly).
- **LTC-on-audio** is still common on dedicated tracks (spare camera channel, MXF TC track) but is never left in stereo program audio — it is loudly audible. Not usable once CF collapses to stereo AAC.
- **Streaming**: Apple's sanctioned wall-clock anchor is `EXT-X-PROGRAM-DATE-TIME`; AWS MediaPackage live→VOD harvest preserves encoder PDT into the VOD asset and documents that harvest timing depends on it. ID3/emsg timed metadata survives into VOD on MediaPackage. Cloudflare Stream emits/preserves none of these (measured), so out-of-band anchoring is the honest equivalent.
- **ATSC 3.0 watermarks**: A/335 encodes 30 B/frame (1X) or 60 B/frame (2X) in the luma of the top 1–2 video lines (8-px symbols) — designed to survive transcodes, bitrate changes, HDMI. A/334 (Verance VP1) embeds a 50-bit payload every 1.5 s of audio (server code + incrementing interval code = a broadcast-grade inaudible timecode); Nielsen's CBET (~8 bit/s, 1–3 kHz masked tones) has proven for decades that such marks survive transcoding and even room acoustics.

### Options ranked for our pipeline (RTMPS → CF Stream → VOD)

| Rank | Option | Invisible | Survives transcode | Gap handling | Impl cost | Browser decode |
|---|---|---|---|---|---|---|
| 1 | (d) T0 in asset `meta` + calibration (+gap table) | yes | n/a (out-of-band) | needs a measurement source | tiny (CF `meta` is a writable KV store) | free |
| 2 | (a) visible micro-strip + CSS crop | near (crop; visible in raw fullscreen/downloads) | proven 100% @480p | per-frame ms — best possible | sunk | proven, cheap (canvas) |
| 3 | (e) VTT sidecar "timecode track" | yes (menu entry in foreign players) | n/a (sidecar; any BCP-47 tag, 10 MB, in-manifest + direct API URL) | carries the gap table, doesn't measure it | small | trivial (hidden TextTrack) |
| 4 | (c) inaudible audio watermark (audiowmark) | yes | yes ≥128 kbps AAC (strength 15 for 64k) | anchors every ~52 s block, ~5 ms alignment | medium (embed at rig pre-RTMPS) | poor: C++/no WASM port — decode server-side offline |
| 5 | (b) invisible video watermark | yes | unproven at 480p (OSS DWT-DCT fragile; VideoSeal 96–256 bit/clip is per-clip ID, not per-frame time) | no | high | none exists |

**Recommendation**: primary = (d)+(a) exactly as planned — T0 + gap table in CF `meta`, micro-strip retained as the measurement/verification channel on gap-prone shows. Fallback/upgrade if pixels must go: embed audiowmark blocks at the rig, decode **once per VOD server-side** to auto-generate the anchor+gap table (invisible, survives AAC, ~5 ms anchors), publish the result via `meta` or a VTT track. Client-side audio decode and forensic-style video watermarks are not viable for us today.
