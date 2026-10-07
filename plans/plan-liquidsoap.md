# Liquidsoap: what to learn from it, and where it could plug in

2026-10-07. Prompted by `plans/plan-ici-vain.md`, where Liquidsoap is the source
for ici's Icecast mount on Väin, and by the question *"what to learn from
liquidsoap / integrate etc?"*.

⚠️ **WRITTEN FROM DOCUMENTATION AND MEMORY, NOT FROM A RUNNING LIQUIDSOAP.**
Nothing here was installed or run. The Liquidsoap facts are from its manual and
from the ici document (version 2.4.5 current, 2.3.2+ required there). What
would turn each reading into a fact is named in its section.

## Verdict

Mostly ideas, one integration. Liquidsoap is a source-side scheduler for
Icecast, and positron's core is the listener side: latency and playback in a
browser over LL-HLS, WHEP and MoQ. So it is not a gap in positron. But its
design has answered several questions positron answers ad hoc, page by page.
Take ideas 1 and 5 as rules. Build the one integration (a station of our own on
the Pi) only when a real world Icecast measurement is wanted.

## Where it already touches positron

- **ici on Väin** uses it, and that plan keeps positron out of the path on
  purpose (`plans/plan-ici-vain.md`, section 2.1).
- **It runs inside stations positron listens to.** ida radio's AzuraCast
  reports `backend: liquidsoap` (`research/idaidaida-2026-09.md`). Most small
  Icecast stations are Liquidsoap underneath, so continuous frames through dead
  air, or metadata changing at a crossfade, come from it and not from the
  network. This explains measurements in `/radio/` and `rig/shout/measure.mjs`;
  it adds no code.

## Ideas worth taking

### 1. Whether a source may stop is decided before it runs

Liquidsoap's type checker refuses a script whose output could run out of
material. The script has to say what happens then: `mksafe` (silence instead of
stopping) or `fallback([live, playlist, blank()])`.

Positron decides this per page. `positron-streaming` says a closed socket is
the death detector and nothing else is, and a broadcast ends when its socket
does. That is a valid choice, but it is not written down per output.

**Take:** every output declares one of two kinds. It **never stops**, like ici,
where silence is sent and the listener's card stays up. Or it **ends**, and the
page says it ended. A third state, a stream that is up and quietly sending
nothing, should not be possible. Cheapest form: a field on the publisher config
and one line in the page's readout.

### 2. Clock boundaries are named

Every Liquidsoap source runs on a clock, and joining two clocks (soundcard,
network, file) needs an explicit `buffer()`. That buffer is where latency and
drift live, and it is visible in the script.

Positron's board has jack capture, ffmpeg, the network and the browser's
AudioContext, each with its own clock, joined by buffers nobody drew. The
networked music findings (jitter buffer, WebAudio clock traps) are exactly
these crossings.

**Take:** draw every clock crossing on the latency diagrams as a named buffer,
and measure each one. A latency budget then becomes a list of buffers with a
number each. No code is needed for the diagram; the measurement is per page.

### 3. Metadata travels inside the stream

Track changes and metadata are events inside the stream, tied to a position in
the audio (`on_track`, `on_metadata`, `insert_metadata`), not a side channel.
`demo/fake-station.mjs` already does this with ICY `icy-metaint`.

**Take:** cues and timeline events over HLS go in the stream (ID3 or
`EXT-X-DATERANGE`) so they arrive in step with the sound, rather than over a
separate socket that drifts from it. Worth checking against whatever the
timeline and stage pages do today before anything changes.

### 4. The next item is fetched before it is needed

`request.dynamic` resolves the next track while the current one plays, so the
seam between items is never spent downloading.

⚠️ **ONLY FOR OUR OWN MATERIAL.** `plans/plan-archive-timeline.md` says *"One
content GET per film picked, no prefetch, no polling"*, and that is the
external sources rule. Prefetching somebody else's archive opens connections
nobody asked for. For our own R2 content (the MIMproject corpus, our tapes) it
is fine.

**Take:** pages that play our own items back to back resolve the next one
early and show a `next: ready` cell. Pages on external sources keep no
prefetch.

### 5. Silence detection checks the outcome

`blank.detect` fires when real silence lasts longer than a threshold. A
connection can be healthy while sending zeros, and this catches it. It is the
"gate feedback on outcome" rule as a primitive.

**Take:** one shared assert in the verify kit that measures signal level on
the page's actual output and fails on sustained silence where sound is
expected. It belongs in `positron-verify` territory, so it is done once, in
the shell, before any page uses it. Pages that are meant to be mostly silent
(an ici-like page) declare that, which is idea 1 again.

## Integrations

| what | where it runs | verdict |
| --- | --- | --- |
| Our own 24/7 Icecast mount with a Liquidsoap source playing our own material. A real station that belongs to nobody else, for `/radio/` and `rig/shout` measurements over the real internet | the Pi or the M1 | **yes, when wanted.** It is the stand-in rule taken out of localhost |
| One Liquidsoap source sent to Icecast, HLS and SRT at once, to compare the three paths from a single origin | the Pi | maybe, as a measurement |
| A demo page rebuilding fallback, crossfade and blank detection in WebAudio, showing why a station never drops to dead air | browser | fits positron, small |
| Liquidsoap 24/7 in a Cloudflare Container | CF Containers | **no.** An always-on source is billed all day, and containers sleep and cold start. Being measured separately (`BACKLOG.md`, 2026-10-07) |
| Replacing ffmpeg on the board | Pi | **no.** The board plays live instruments through jack, not playlists |

### The Pi station, sketched

- Icecast2 plus Liquidsoap on the Pi, one mount, our own MP3s from R2 or the
  Circuit through the board.
- `fallback([playlist, blank()])` under `mksafe`, `output.icecast`.
- Reached through the existing relay pattern (`shout.positron.studio`) so the
  measurement covers the same path a listener would use.
- `/radio/` gets it as one more station, labelled as ours.
- **Cost:** Pi electricity, and upstream bandwidth from the Pi's building at
  128 kbps while anybody listens. No Cloudflare container time.
- **To settle first:** whether the Pi's network can accept or reach out to the
  relay (the board already pushes out, so outbound is likely fine), and whether
  Liquidsoap 2.3+ installs on the Pi's OS from packages or needs opam. Load
  `positron-hardware` before touching the Pi.

## Not settled

- ⚠️ **Liquidsoap's HLS output is, as far as known here, plain HLS without
  LL-HLS partial segments.** Not checked against its current manual. If that
  holds, it is no use to the low latency work.
- Whether Liquidsoap on a Pi alongside the board's jack graph fights it for
  the sound card. It should not need the card at all for a playlist station.
- None of the ideas has been priced in code. Ideas 1 and 5 touch the shell and
  the verify kit and are shared work, done once before any page.

## Not doing

- Installing Liquidsoap on this laptop. Managed machine, ask first; the Pi or
  the M1 is where it would run.
- Putting positron in ici's path. ici's plan is right to keep it out.
