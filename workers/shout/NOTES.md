# positron-shout — measurements

SHOUTcast/Icecast is one HTTP response that never ends. There is no manifest, no
segment list and no seek: the server writes MP3 frames at roughly wall-clock
speed and the client plays whatever it has. The questions worth asking of a
Cloudflare Worker in front of one are therefore not the LL-HLS questions.

## The origin

`icecast.err.ee`, Icecast 2.4.4, HTTP/1.0, `Connection: Close`, 128 kbps MP3.
Five public stations (`vikerraadio`, `raadio2`, `klassikaraadio`, `raadio4`,
`raadiotallinn`).

Two facts about it decided the whole design:

- **No `access-control-allow-origin`, on any response.** A browser may put the
  mount in an `<audio>` element and do nothing else with it: no `fetch`, no byte
  counting, no `icy-name`, and — because a media element without CORS may not be
  connected to a WebAudio graph — no analyser, no level, no spectrum. The relay
  exists to hand the same bytes back with CORS on them. That is the product.
- **`HEAD` answers `400 Bad Request`.** Measured on every mount. Any uptime
  checker that HEADs an Icecast URL is reading a healthy station as down. The
  relay does a GET upstream, keeps the headers and cancels the body, so `HEAD`
  through it is a 200 with `icy-name` on it.

## What a listen looks like

Both paths opened in the same tick, 60 s, `rig/shout/measure.mjs`, 2026-09-06.
The deployed column is `shout.positron.studio` — a real Cloudflare colo, not
`workerd` on a laptop:

| | direct origin | through the EDGE | (local workerd) |
|---|---|---|---|
| ttfb | 325.7 ms | **279.3 ms** | 252.1 ms |
| first byte | 502.5 ms | 455.0 ms | 400.5 ms |
| burst in the first 250 ms | 67.0 KiB | 67.0 KiB | 67.0 KiB |
| bytes / chunks | 993 KiB / 726 | 993 KiB / 1322 | 995 KiB / 1325 |
| mean rate | 135.7 kbps | 135.6 kbps | 135.9 kbps |
| chunk gap p50 / p95 / max | 79.2 / 106.1 / 218.0 ms | 41.8 / 104.9 / 216.1 ms | 74.6 / 105.1 / 227.6 ms |
| gaps past a 1 s jitter buffer | 0 | 0 | 0 |
| audio held beyond realtime | 3.62 s | 3.56 s | 3.71 s |

**Same byte, both paths: −0.8 ms of carry through the edge** (−1.4 ms through
local workerd). The relay hands Cloudflare the upstream `ReadableStream` and
touches nothing, so bytes leave as they arrive.

Two things in that table are worth saying out loud.

**The relay answered 46 ms SOONER than the origin.** Not a trick of the
measurement: Cloudflare terminates the connection at a colo in Tallinn
(`cf-ray … -TLL`) and the origin is in the same city, so the client's handshake
is with something nearer than the origin while the colo's hop to the origin is
local. Read it as "an edge in front of an origin in the same city", not as
"Cloudflare is faster than the origin" — from further away the connect saving
would grow and the carry, which is what this table exists to bound, would be
the number to re-measure.

**The edge re-chunks the stream.** Same 993 KiB, 1322 writes instead of 726, so
the median gap between chunks halves (41.8 ms against 79.2) while p95 and max
stay put. Smaller, more frequent writes: no effect on a player, but it is why
chunk COUNT is not a defect signal here.

That number is the only one worth quoting, and it is not TTFB. Icecast bursts
about 64 KiB — some four seconds of already-encoded audio — at every new
listener, so a path that connects later can still be holding more audio, and
first-byte timings compare connection setup rather than delivery. The rig takes
a 16 KiB needle out of one stream, finds it in the other (the relay does not
transcode, so the frames are identical), and subtracts the two arrival times of
that exact byte. No clock sync, no correlation window, no assumption about the
encoder.

Read the mean rate the same way: 135.9 kbps over 60 s on a 128 kbps station is
the burst amortised, not a fast link. Over a 7 s window the same stream reads
195 kbps. `26 shout` therefore asserts on the rate measured after the burst has
landed (130 kbps), and separately on the burst itself (3.67 s of audio in hand).

## Ten minutes on one response

`rig/shout/measure.mjs 600` through the edge, 2026-09-06: **9431 KiB in 12806
chunks at 128.77 kbps** — exactly nominal once the 3.6 s burst has amortised
away — and the Worker held that single response open for the whole 600 s
without a reconnect. One gap of **1684 ms**, the only one over a second; a
listener holding Icecast's burst would not have heard it, a listener with a
1 s jitter buffer would. So: streaming responses are not the limit here, and
the thing to watch is the occasional gap, not the duration.

## Still open

- **Egress.** 128 kbps is ~57.6 MB per listener-hour, all of it billable and
  none of it cacheable — the origin says `Cache-Control: no-cache, no-store`,
  and a cached radio stream is a contradiction. Nothing here throttles or counts
  listeners; a link that goes anywhere public should get a cap first.
- **Distance.** Every number above was taken from Tallinn, where both the origin
  and the colo are. The carry figure is the one to re-measure from elsewhere.

## Reproducing

```sh
node rig/shout/measure.mjs 60 --out results/shout-edge.json \
  https://icecast.err.ee/raadiotallinn.mp3 \
  https://shout.positron.studio/raadiotallinn.mp3
```
