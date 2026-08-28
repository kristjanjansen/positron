# Play-a-Synth: attempted latency measurement — clean negative (2026-08-28)

**Outcome in one line: it did not play, and it cannot play without creating an
account. No number was measured. No synth was touched, no note was sent, no
session was started, no account was created, no payment details were entered.**

This is the correct negative, not a failed attempt: the gate is an account
wall, and the brief forbids crossing it. What follows is the evidence for the
wall, everything that *was* obtainable from outside it, an honest statement of
why our own numbers cannot be set against theirs today, and the manual recipe
the user can run personally in ~5 minutes if they want the number.

---

## 1 · What was actually done (the whole footprint)

Deliberately tiny, and worth stating exactly, because "we probed a live service"
deserves an audit trail:

- **9 plain HTTP GETs** of public pages/assets: `robots.txt`, `/`,
  `/terms_and_policies`, `/public/list`, one instrument page
  (`/mysynth/0bcd…` — DeepMind 12), the public JS bundle, and 3
  Discourse `search.json` queries on their own public forum.
- **ONE headless Chrome**, two navigations (`/public/list`, then the same
  DeepMind 12 page), real AudioContext, ~14 s total on site. **Zero clicks.**
  The browser was used only to let their Phoenix LiveView finish rendering, so
  that "is there a play button for a signed-out visitor?" is answered against
  the *live* DOM rather than the dead server render.
- **No** connect/disconnect cycling, no repeat visits, no scanning, no attempt
  on `/sign_in` or `/sign_up`, no touching of the five other instruments.
- Chrome killed, temp profile in scratchpad; no repo files changed except this
  one; no commits.

`robots.txt` is permissive — every `Disallow` in it is commented out — so no
crawl rule was broken. Their ToS forbids reverse-engineering "software tools
for download" (the Host app and the VST/AU plugins); nothing in it was
downloaded, installed, or disassembled.

## 2 · The wall, precisely

`liveSocket.isConnected() === true` on the instrument page — the LiveView had
fully connected and rendered its real, authenticated-or-not state. The complete
set of controls offered to a signed-out visitor on that page is:

- a link to the manufacturer's product page,
- **`Sign in`**, and
- **`sign up`**.

There is no `Play`, no `Connect`, no `Start session`, no on-screen keyboard, no
control panel, no `phx-click` handler of any kind that would begin a session.
The tell is in the sign-in link itself:

```
/sign_in?web_play_url=XCP.TYbZDQzEv0HbUEshEUEVGOC-8i7xEpyRPv9pw_nE2UMe…
```

— the play URL is minted as a **token carried through authentication**. Playing
is a post-login route by construction; there is no anonymous door to walk
through, not even a hidden one.

Three further reasons this is a hard stop and not a hurdle to route around:

1. **The ToS binds on signup, not on browsing.** Their own words: *"This Terms
   of Service is binding between the user of the Platform and Play-a-Synth
   **when the user signs up and confirms their sign up**."* Signing up would be
   accepting a contract on the user's behalf — explicitly out of bounds.
2. **"Only one user account per person or business entity."** An agent-created
   throwaway would consume the user's single permitted account. That is a real,
   irreversible cost to him, not a technicality.
3. **The site is behind Cloudflare Turnstile**, described in their own footer as
   there *"to protect the service from bots"*. Even where automation is not
   named in the ToS, driving a headless browser through a declared bot
   challenge is exactly the thing they asked us not to do.

The free tier is real, but "free" means *free of charge*, not *free of
account*: the ToS describes free reservations with a predetermined period that
end after 3 minutes of no sessions — a signed-in flow throughout.

**Therefore: no key→ear number, no p50/p95, no jitter-buffer figure.** The
onset rig (`proto/jam/onset-worklet.js` + `measure-core.js`) was never injected,
because there was never a returned audio stream to point it at.

## 3 · What *was* obtainable from outside the wall

Small, but not nothing, and all of it from public pages:

**Catalog (2026-08-28).** Six instruments, unchanged from the 08-27 survey, all
in Finland, all showing Online: Behringer DeepMind 12, Yamaha Reface DX, Roland
SE-02, Waldorf Pulse 2, DSI OB-6, Korg Minilogue.

**Their web player's WebRTC code is not publicly served.** The site-wide bundle
(`app-v2-…js`, 205 kB) contains **zero** matches for `RTCPeerConnection`,
`createDataChannel`, `requestMIDIAccess`, `AudioWorklet`, `jitterBufferTarget`,
`playoutDelayHint`, `opus…`, `ptime`, `stun:`/`turn:`, or any codec-preference
call. The player is loaded only inside an authenticated session. So the config
constants — the cheap way to learn their buffer policy without playing — are
behind the same wall as the audio. Nothing further was hunted for; looking
harder would have been probing.

**Their own forum is the closest they come to a latency statement, and it still
has no numbers.** Two roadmap posts are genuinely informative about how they
think:

- A planned/beta plugin option to choose *"compressed, uncompressed and
  transmission method (**using webrtc or direct UDP connection**)… This allows
  the user to better choose the audio latency and quality depending on the
  situation, for example, when playing real-time or recording audio."*
  → **They treat WebRTC as the compromise path and keep a direct-UDP escape
  hatch for the real-time case.** That is the same conclusion C7 reached from
  the other end (the browser's Opus+NetEQ return is 76.6 ms of a 77.7 ms loop —
  98.6 % — and cannot be hinted away).
- *"Audio quality/reliability improvement by adding a mode for reliable audio
  (no crackles/gaps in audio) **with the cost of more latency**"* — the jitter
  buffer as an explicit, user-visible product knob.
- A 2017 user report: *"the latency was less than expected"* — the only
  first-hand latency remark found, and it carries no figure.

**The refund policy is a de facto latency disclaimer.** Paid reservations are
auto-refunded if you disconnect inside 2 minutes, and the ToS says that window
is *"primarily intended for the User to assess the quality and latency of the
connection to the Synthesizer as it can highly vary depending on location and
time of day."* They do not publish a number because their honest answer is *it
depends on where you are* — so they sell you a 2-minute look instead. Note the
shape of that: **their product's answer to unmeasured latency is a free trial;
ours is a measurement.** That is the gap `host-check.html` exists to fill.

**Infrastructure.** `playasynth.com` resolves to `167.235.143.72` (Hetzner,
Germany) — the LiveView/signalling origin, 46.8 ms RTT from here. Media is
stated to be "WebRTC and other peer-to-peer techniques" direct to the Owner's
host app, so the German origin sits on session *setup*, not on the audio path.

**Network context from this machine — and a caveat that matters.** Egress is
Estonia (Cloudflare colo `TLL`), but the access link is *not* wired fibre: 16.0 ms
min RTT to `1.1.1.1` and 17.6 ms to `8.8.8.8`, where a wired Tallinn line reaches
either in ~2–5 ms. So this host carries roughly **12–14 ms of extra one-way
access latency, ~25–28 ms round trip**, before any of their infrastructure is
involved. Any measurement taken from this machine today would have been
pessimistic by about that much — worth knowing before the user runs the manual
recipe from the same connection. (Play-a-Synth requires *Owners* to be wired;
it cannot require it of players.)

## 4 · Side-by-side — and why it is not a table

The honest comparison is a blank cell, so here is the frame instead of a fake
number:

| | measured | what the number contains |
|---|---|---|
| **our WebRTC arm (C7 p2p A+V)** | **77.7 / 80.3 ms** p50/p95 key→ear | DC MIDI 0.56 + synth voice 0.67 + Opus return 76.6 (encode + transport + **NetEQ** + decode). Two headless Chromes on **one machine**, loopback network ≈ 0 ms, a *synthetic* percussive voice, no audio interface, no hardware synth. Decoded-track level; +32 ms reported `outputLatency` to reach physical ears. |
| **our MoQ arm** | **35.8 ms** key→ear | Same legs, Opus-over-MoQ return with our own cushion buffer instead of NetEQ. Same synthetic, same loopback, same caveats. |
| **Play-a-Synth** | **— (account wall)** | Would have contained: real Web MIDI → their signalling → real internet Tallinn→Finland → **real hardware synth** (MIDI-in→audio-out 5–15 ms) → real audio interface → Opus → their jitter buffer → back over the real internet. |

**These are not the same kind of number and must never be printed adjacent
without this paragraph.** Our 77.7 ms is a *floor*: the browser stack's own cost
with the wire and the hardware set to zero. A Play-a-Synth session from Tallinn
would have been a *field* number including their hardware, their host machine's
interface buffers, a real wire, and this connection's ~25 ms of bufferbloated
access link. The C7 projection for exactly this shape — `78 + ~10 (synth hw) +
~10 (RTT) ≈ **95–100 ms**` — remains the best available estimate of what
Play-a-Synth feels like, and it is **a projection from our own rig, not a
measurement of theirs.** Nothing found today confirms or refutes it.

The one datum worth more than the headline is still missing: **their
`jitterBufferDelay / jitterBufferEmittedCount`.** C7 established that this term
*is* the product — 76.6 of our 77.7 ms, NetEQ's target floor at 20 ms,
`jitterBufferTarget = 0` making things worse in 4 of 5 arms. Whether Play-a-Synth
beats NetEQ or lives with it is the single question that would tell us if the
MoQ arm is a genuine differentiator or merely a different set of compromises.
Their forum's "direct UDP connection" option is a hint that they know they live
with it — but a hint is not a measurement.

---

## 5 · Manual recipe — get the number yourself in ~5 minutes

Everything below needs the account this agent could not create. Do it wired if
possible (see §3 caveat).

### 5a · Their side, with zero of our code (the cheap 5 minutes)

1. Sign up at `playasynth.com/sign_up` and confirm. Free tier is enough — pick
   any of the six Finnish units from **Try out available synths** →
   `/public/list` → *Go to synth*. Do not pay; a free reservation is plenty.
2. **Before joining**, open a second tab on `chrome://webrtc-internals`. Leave
   it open — it captures from the moment the PeerConnection is created, so
   opening it afterwards loses the interesting part.
3. Join, grant any permission prompt, and play a handful of single notes with
   ~1 s of silence between them (sparse, not a run — bursts get
   concealment-merged, which is trap 4 in `NOTES.md` C7 and it will corrupt any
   matching you attempt later).
4. In `chrome://webrtc-internals`, on the **inbound-rtp (audio)** stream, read
   these graphs/values — this is the whole prize and needs none of our code:
   - **`jitterBufferDelay` and `jitterBufferEmittedCount`** → their mean buffer
     in ms is `jitterBufferDelay / jitterBufferEmittedCount × 1000`. **Write
     this down; it is the most valuable number on the page.** Ours runs 68–180 ms
     through the SFU and is the dominant term in the 77.7 ms p2p loop.
   - `jitterBufferTargetDelay` (what their client is *asking* for — if it sits
     at 20 ms they are on stock NetEQ like us; visibly lower means they have
     done something we have not).
   - `packetsLost`, `concealmentEvents` / `concealedSamples`, `jitter`,
     `currentRoundTripTime`, and the codec row (expect `opus/48000/2`; the
     `ptime`/frame duration shows in the SDP dump lower on the page — 10 ms vs
     20 ms is a 10 ms difference in the loop).
   - Scroll to the **SDP** section and note whether the connection is genuinely
     p2p (`a=candidate` host/srflx pairs to a Finnish IP) or relayed through a
     TURN server (`typ relay`) — that changes the wire term completely.
5. **Feel it, then bound it.** Play a note and count: if it feels like a heavy
   piano action it is in the 30–100 ms band; if it feels sluggish it is >100 ms.
   Then calibrate that impression against §5c rather than trusting it.

### 5b · A real key→ear number, still without our rig

Record the room and your hands together, then measure the gap in an editor:

1. Put the returned audio on **speakers, not headphones** (you need one recording
   containing both events).
2. Record with a phone or a laptop mic: your fingertip hitting the key/keycap
   makes an audible click; the synth's attack arrives later in the same file.
3. Play ~20 sparse notes. In Audacity/Reaper/ffmpeg, measure click→attack for
   each; report the **median and the 95th percentile**, not the mean.
4. What that number contains: your key click → USB/Web MIDI → their signalling →
   internet → Finland → hardware synth → interface → Opus → their jitter buffer →
   internet → your NetEQ → your DAC → speaker → mic. That is *everything*,
   which is exactly what a player feels — and it is why it will be larger than
   our 77.7 ms, legitimately.
5. Subtract nothing except, if you want a fair comparison against our
   decoded-track figures, your own output latency (~32 ms on this class of
   machine) plus mic distance (~3 ms/m).

### 5c · Calibrate the feel against our own numbers

```
node proto/jam/server.mjs          # serves proto/jam/ on :8893
open http://127.0.0.1:8893/host-check.html
```

Use **§4 "Play at a distance"** — the slider inserts a known 0 / 10 / 30 / 60 /
100 ms on the return path, and *"Measure at this distance"* proves the delay is
really there rather than asking you to trust the label. Play until the
Play-a-Synth session feels like one of the detents; that detent, plus our
measured 77.7 ms base, is a calibrated bracket on their loop obtained without
any instrumentation of their service. It is coarse — ±10 ms at best — but it is
honest and takes one minute.

### 5d · The full rig against their stream (only if the number matters enough)

The C7 kernel does work against a foreign stream in principle: inject
`proto/jam/onset-worklet.js` + the `measure-core.js` edge-median ct→epoch map
and adaptive matcher into their session page via CDP, tap the decoded remote
track, and timestamp sends against their on-screen keyboard. Three warnings
before anyone does this:

- **Ask them first.** `contact@playasynth.com`, or the Discord/forum linked from
  their footer. A single-developer Finnish outfit (Two Line Software Oy) that
  publishes a roadmap in a public forum is *far* more likely to hand over their
  buffer numbers for the asking than to appreciate an uninvited harness. **This
  is the recommended next step, and it costs one email.** They are also a
  plausible peer rather than a competitor: our MoQ arm answers the exact
  question their "direct UDP connection" roadmap item is reaching for.
- Their ToS forbids modifying/reverse-engineering the *downloadable* tools, so
  the plugin/host path is off-limits regardless.
- Keep any such run to one short session, sparse notes, one instrument — the
  same politeness constraints that governed this attempt.

---

**Bottom line.** Play-a-Synth remains the only commercial instance of our exact
pattern and still publishes no latency figure — now confirmed a second time, from
inside a real browser session on their live LiveView, not just from their
marketing copy. The gap the addendum identified is intact, and it is intact
*by their choice*: they sell a 2-minute refund window in place of a number. Our
77.7 ms WebRTC and 35.8 ms MoQ arms remain the only measured figures for
key→ear on a remote hardware instrument that anyone has published — with the
standing caveat that both are loopback floors, and the honest projection of our
own stack in their deployment shape is ~95–100 ms.
