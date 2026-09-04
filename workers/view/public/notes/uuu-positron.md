# positron and U: — two answers to one problem

Written 2026-09-04 from reading the code, not the pitch: `tarmoj/radio1965`
cloned locally, plus the other 40 repos read over the GitHub API. U: is the
organisation behind `uuu.ee`; ECCM (Estonian Centre of Contemporary Music) is
who `radio1965` is built for.

Both projects spend their effort on **making media happen at the right time in
more than one place at once**. They have arrived at genuinely different answers,
and the differences are not accidents of taste — each follows from where the
work is meant to happen.

---

## The one place they already agree

VideoSync's README:

> Drift correction — playback rate is nudged (±5 %) when drift is small; hard
> seek is used when drift exceeds 500 ms.

`timeline/media-master.mjs`, rule L2:

> DRIFT IS A `sync()`, A DISCONTINUITY IS A `seek()`. Inside `jumpMs` the error
> is frame quantisation and decode jitter. Past `jumpMs` the element has MOVED,
> and a sync would leave every cue in between pending, to be burst all at once.

Two codebases, no contact, same structure: nudge inside a threshold, seek
outside it. 500 ms there, 250 ms here. When two independent implementations
converge on a mechanism, that is the mechanism being right rather than either
team being clever. It is also the natural place to start talking.

---

## Where they diverge

| | U: / tarmoj | positron |
|---|---|---|
| sync authority | a Host device on the LAN | shared skew-corrected epoch, or media-as-master |
| reach | one room, one wifi | anywhere with a network path |
| score format | **Csound** (vClick) | JSON quotations (`score.mjs`) |
| control transport | OSC and WebSocket over LAN | WS relay + Durable Object |
| infrastructure | a hand-administered VPS | versioned; one command deploys |
| measurement | none in any repo | the whole `rig/` |
| time model | now, plus `publish_at` / `shelf_at` | deep time, uncertainty brackets |

### One room, or the internet

Everything U: builds assumes **a wifi network you can see**: VideoSync does UDP
broadcast discovery and elects a Host device; vClick sends OSC to players in the
same hall; `location-music` tracks musicians moving around a concert space.

positron never assumes a shared LAN. `peer.mjs` cannot use
`performance.now()` across two documents — their origins differ — so it runs an
NTP-style exchange, keeps only the fastest sample, and elects the **lowest peer
id** as reference: no election protocol, no leader heartbeat, no split brain.
That machinery is pure overhead in one room and the only thing that works
between two cities.

### Measured, or not

`rig/` exists to produce numbers, and they set the design: MoQ browser-to-browser
**26 ms** p50 at 720p30, WebRTC WHIP/WHEP **74 ms** glass-to-glass, tuned LL-HLS
**2.4–4.0 s**, a Durable Object cue relay at **27 ms**. The word `drift` appears
exactly **once** across all 40 U: repos — in VideoSync's README, as a feature
description. There is no harness anywhere.

That is not a criticism of craft; it is a difference in what the work is for. A
piece that runs once in a hall is verified by the performance. A platform is not.

---

## Icecast, since both projects lean on it

Icecast is a shoutcast-style audio server, and its model is the opposite of
HLS's. A **source client** opens one HTTP request to a **mountpoint** and then
writes MP3 frames forever; a **listener** does a plain `GET` on the same path
and the server copies bytes to them. No manifest, no segments, no playlist —
which is why `<audio src="https://icecast.err.ee/vikerraadio.mp3">` needs no
library at all, and equally why there is no seeking and no DVR.

Three things follow in `radio1965`:

- **The mounts are declared in advance, and that is the capacity limit.**
  `icecast.xml` defines five — `radio1965`, `user1`–`user4` — and a mount holds
  one source at a time. Five simultaneous broadcasters is architectural, not a
  knob. The app polls `status-json.xsl` to grey out the occupied ones.
- **The Qt app is a source client, hand-written.** `icecastbroadcaster.cpp`
  does `QAudioSource` → libmp3lame → raw `QTcpSocket`, speaking the Icecast
  source protocol itself, with libmp3lame cross-compiled through the Android NDK.
- **The hooks are the best idea in the repo.** `<on-connect>` runs a script when
  anyone starts broadcasting, and it POSTs a `livestream` event to the same
  `/events/publish` the editor uses; `<on-disconnect>` shelves it. Going on air
  creates its own catalogue row and its own push notification — the broadcast
  and the database record are one act.

### Measured, because "a few seconds" is not a number

There is no reference signal in a live radio stream, so glass-to-glass is not
available. But the dominant term is: Icecast sends a **burst** from its backlog
the instant you connect, so a listener starts that far behind live. Probing
ERR's five mounts for 12 s each, splitting the initial burst from the
real-time-paced tail:

| mount | measured | burst | behind live at join |
|---|---|---|---|
| vikerraadio | 128 kbps | 63 KiB | **4.04 s** |
| raadio2 | 128 kbps | 63 KiB | **4.05 s** |
| klassikaraadio | 128 kbps | 62 KiB | **3.97 s** |
| raadio4 | 128 kbps | 62 KiB | **3.97 s** |
| raadiotallinn | 128 kbps | 62 KiB | **3.99 s** |

64 KiB ÷ 16 KB/s = **4.0 s**. That is Icecast's default `burst-size` of 65536
bytes divided by the bitrate, and the spread across five independent mounts is
±0.04 s — a configuration constant, not network variance. Time to first byte was
262–315 ms, so the delay is not the network.

And there is no catch-up: Icecast has no notion of a live edge to chase, so a
listener stays wherever they joined, playing at 1×.

**Which makes it a knob U: already owns.** `burst-size` is in their
`icecast.xml`. Lowering it moves join latency down proportionally, at the cost of
a client having less to chew on before playback starts.

### Where it sits against the other transports

| | Icecast | LL-HLS | WebRTC | MoQ |
|---|---|---|---|---|
| latency | **4.0 s measured** | 2.4–4.0 s | 74 ms | 26 ms |
| seek / DVR | none | yes (2 h on ERR) | no | no |
| media | audio only | audio + video | audio + video | audio + video |
| client | `<audio src>` | hls.js | SDP negotiation | WebTransport stack |
| capacity | one source per declared mount | per input | per room | per namespace |

Icecast's virtue is that it is boring in the best way: no build step, no library,
no negotiation, and it plays in every browser and every podcast app. For a radio
station that is a good trade. It just cannot do the two things positron is built
around — low latency and seeking backwards.

The same asymmetry is visible inside `19 flipper`: ERR's five radio stations are
Icecast MP3 and their cells have no scrub track, while the three TV channels are
HLS and theirs scrub two hours.

---

## Six ways to cowork, in order of how little they cost

### 1. Play their channels today — zero work either side

`radio1965`'s Icecast mounts and the nginx HLS endpoints are already
`Access-Control-Allow-Origin: *`:

```
https://live.uuu.ee:4443/hls/<key>.m3u8
https://live.uuu.ee:4443/hls_audio/<key>.m3u8
```

`19 flipper` plays eight ERR channels in equal cells with a scrubbable 2 h DVR.
Adding U:'s five mounts is a manifest edit. Their Broadcast tab and `19 flipper`
are the same screen, built twice.

### 2. Give them the thing their own TODO asks for

Their notes say it twice: *"audio, video, streams — to be implemented"* and
*"TODO: proper support of audio streams, needs a separate streaming service."*
That is the one thing positron has measured to death. Their `payload: {}` column
is explicitly for type-specific data, so measured numbers can ride along without
touching their schema.

### 3. Compile vClick scores into quotations

vClick encodes tempo, bar numbers, fermatas and stops as a Csound score, and its
README admits the catch: playback can start from any bar *"if the vClick score is
done well"*. In positron that property is not a matter of care — `15 seek`
asserts the fold at every cue boundary ±1 ms, 24 probes, 0 wrong, because
`deck.reduceAt(kind, pos)` recomputes state from the rows rather than replaying
them.

A vClick-to-quotation compiler would give them seek-from-anywhere as a
guarantee, and give positron a real corpus of notated pieces — which is exactly
what the timeline lacks. Their scores are the client `plan-timeline` has been
waiting for.

### 4. Borrow their LAN, which positron does not have

Their in-room Host/Guest with UDP discovery is genuinely missing here. positron
assumes an internet path and a relay; a rehearsal room with bad wifi and no
uplink is a case it does not serve. VideoSync solves it, cross-platform, today.
This is the one direction where the borrowing runs the other way.

### 5. Bridge OSC properly

`qosc` is a Qt OSC library; positron has `workers/osc` (a Durable Object OSC
room) and `proto/osc`. A Qt app speaking OSC into a DO room connects a hall full
of native apps to an internet-wide timeline. Both halves exist.

### 6. Put the 1.46 GB somewhere with a timeline over it

`u-vary-player` carries its recordings in git. R2 is roughly 25× cheaper than
Stream storage with zero egress, and `14 replay` already plays a show off R2
with the cues it was recorded with. The archive would gain `when.kind` brackets
and an aoristic statistic that *names what it dropped* — which matters for
material whose dates are uncertain, and which the Radio Tallinn 1965 theses
demand anyway.

---

## One thing to be careful about

`uuu.ee` is not in version control. It appears across the repos only as a deploy
target in `deploy.sh` scripts. The only infrastructure code that exists anywhere
is `radio1965`'s two Icecast hook scripts and an nginx snippet pasted into a
markdown file. If that machine dies it is rebuilt by hand from prose.

Their own `TODOs.md` is candid about the live path still settling: *"When video
streaming is started, no automatic notification is saved"* and *"Sometimes old
stream data stays hanging on player bar."*

So: fine to consume their streams, and worth offering to version their infra.
Not somewhere to put anything that must not be lost — not yet.

---

## The honest summary

U: builds **instruments for occasions** — a click track for this ensemble, a
player for that composition, a station for this centre. Each is finished when
the occasion is served.

positron builds **one substrate and measures it** — save anything, play anything
back, seek inside it, and prove the numbers.

The collaboration is not a merge. It is that U: has the repertoire, the
performers and the rooms, and positron has the transport, the timeline and the
harness. The fastest proof is the cheapest one: their five Icecast mounts in
`19 flipper`, this week, and one vClick score compiled into a quotation to see
whether the model survives contact with real notation.
