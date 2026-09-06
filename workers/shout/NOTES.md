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

Both paths opened in the same tick, 60 s, `rig/shout/measure.mjs`, 2026-09-06:

| | direct origin | through the relay (local workerd) |
|---|---|---|
| ttfb | 299.9 ms | 252.1 ms |
| first byte | 450.7 ms | 400.5 ms |
| burst in the first 250 ms | 67.0 KiB | 67.0 KiB |
| bytes / chunks | 994 KiB / 727 | 995 KiB / 1325 |
| mean rate | 135.8 kbps | 135.9 kbps |
| chunk gap p50 / p95 / max | 79.1 / 106.1 / 227.2 ms | 74.6 / 105.1 / 227.6 ms |
| gaps past a 1 s jitter buffer | 0 | 0 |
| audio held beyond realtime | 3.65 s | 3.71 s |

**Same byte, both paths: −1.4 ms of carry.** The relay hands Cloudflare the
upstream `ReadableStream` and touches nothing, so bytes leave as they arrive.

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

## Still to measure, and only from the deployed edge

`workerd` on this machine is not Cloudflare. What the table above rules out is a
relay that buffers — the code path is clean. What it cannot answer:

- carry through the real edge, colo to colo;
- whether a Worker will hold one streaming response open for a whole listen —
  hours, not the 60 s here — and what ends it when it ends;
- egress: 128 kbps is ~57.6 MB per listener-hour, all of it billable, none of it
  cacheable (`Cache-Control: no-cache, no-store` from the origin, and a cached
  radio stream is a contradiction).

Run, once `shout.positron.studio` answers:

```sh
node rig/shout/measure.mjs 60 --out results/shout-edge.json \
  https://icecast.err.ee/raadiotallinn.mp3 \
  https://shout.positron.studio/raadiotallinn.mp3
```
