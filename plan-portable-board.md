# plan-portable-board: a board somebody else can build, and who gets to play it

> ⚠️ **NOTHING IN THIS FILE IS BUILT.** No code was changed, no script was
> written, nothing was deployed, nothing was committed, and nothing on the board
> was started, stopped or reconfigured. `git add` was never run. It is a
> proposal.
>
> ✅ **MEASURED** marks a command that was run on 2026-09-17 and its output.
> Everything put to the board today was a READ: a join to `studio-1` that sent
> **zero** messages and only listened, plus `GET /room/studio-1/stats`. No verb,
> no note, no `audio.start`, no `ctl.set`. The relay itself was measured properly
> and at cost, in throwaway `perf-*` rooms, because it is ours.
>
> 📄 **READ** marks something taken out of this repo's own source, with the file
> and the line.
>
> ⚖️ **INFERRED** marks reasoning that was not checked. The three largest are
> named in §9 and every one of them has a command written beside it.

---

## 0 · The ask

> *"portable"*, *"repeatable"*, *"packageable"*, *"pluggable"*, so that *"my
> friends can also use it"*. And: *"Is it a board which a single person only uses
> for its own use? Or is it multi-user? How much it can take input from different
> users via relay, there are the limits."* Plus one steer that decides the shape
> of §6: **"Jack based"**.

Four words and a question. The four words are one requirement (a board is
rebuildable from nothing by somebody who was not here) and the question is a
different one that has to be answered first, because the answer changes what
gets packaged. A board for one person is a Raspberry Pi with a private room. A
board for several is a piece of shared hardware with a contention problem that
this repo has already been bitten by twice, and is being bitten by **right now**,
which §4 shows with today's traffic.

"Jack based" settles §6. JACK is the substrate, so an instrument, an insert and
the capture are all the same kind of thing (a client on a graph), and
pluggability means a declaration that says how to raise one and how to know it
is really up.

---

## 1 · What exists today, read out of the repo

### 1.1 Four scripts, and they cover less than their names suggest

📄 READ.

| file | what it really does |
|---|---|
| `rig/box/provision.sh` | sweeps the subnet for a host that answers ssh, `tar`s `rig/box` plus every module it imports over, runs `setup.sh`, then runs `test.mjs` and `bench.mjs` |
| `rig/box/setup.sh` | installs `alsa-utils curl git` and node 24 from NodeSource, loads `snd-virmidi` and `snd-aloop`, copies to `/opt/positron-box`, writes `/etc/default/positron-box`, installs and enables the unit |
| `rig/box/push.sh` | ships this checkout to `/opt/positron-box`, builds `rig/vis` on the board, copies the SuperCollider classes to the path `sclang` actually compiles, prints md5s, restarts |
| `rig/box/positron-box.service` | `Restart=always`, `RestartSec=2`, `StartLimitIntervalSec=0`, hardening deliberately off with the bill written in the file |

`setup.sh` installs **four packages and node**. It does not install jackd,
Yoshimi, Yoshimi's banks, SuperCollider, sc3-plugins, ffmpeg, v4l-utils or
build-essential. `rig/audit.mjs` says so in its own header, and says it as the
reason it exists:

> 🔴 **WHY THIS EXISTS.** `setup.sh` installs `alsa-utils curl git` and node.
> That is all it has ever installed. Every instrument on the board (JACK,
> Yoshimi, SuperCollider, its sc3-plugins, ffmpeg) was put there BY HAND at some
> point and written down nowhere, so a fresh Pi would come up with the service
> running and every instrument reporting "unavailable", which reads as a code
> fault.

So the honest current state of "repeatable" is: **a fresh Pi run through
`provision.sh` today comes up as a service with no instrument.** That is the
single biggest gap and it is also the cheapest one to close, because the
inventory already exists and is already runnable.

### 1.2 The inventory exists and nothing installs from it

📄 READ, `rig/audit.mjs`. It declares eleven apt packages for `box` with the
versions seen on a day it worked, three files that must exist, and two devices.
It runs over ssh (`BOX_SSH`, default `positron@192.168.1.213`), asks the machine
what it has, prints the difference, and `--fix` prints
`sudo apt-get install -y --no-install-recommends <pkg>` for everything missing.
Its own comment says it does not pin versions on purpose, and why:

> ⚠️ **AND IT DOES NOT PIN VERSIONS.** `seen` is what was there on a day it
> worked, reported as drift rather than enforced as a requirement. Pinning Debian
> point releases would make this fail on every routine upgrade and teach everyone
> to ignore it.

That judgement is right and §2 keeps it. What is missing is one line joining the
two halves: the audit knows what is needed, `setup.sh` does not read it.

### 1.3 The graph, and the one instrument on it

📄 READ, `rig/box/jacksynth.mjs`. The chain is
`jackd -d dummy` -> `yoshimi -i -a -J -b=256` -> `ffmpeg -f jack -i posbox -f s16le -ar 48000 -ac 1 -`,
and MIDI reaches Yoshimi by writing three raw bytes to `/dev/snd/midiC<n>D0`
(`snd-virmidi`), which `aconnect` routes to Yoshimi's ALSA client.

`JACK_SYNTHS` has exactly one key. Its comment says the reason is the graph and
not the code:

> there is ONE jackd, ONE capture and ONE room on this board, so whatever is up
> is what every listener on every page hears, and a second instrument is a way to
> take the sound away from somebody in another building.

📄 READ: a reverb insert (`positron-space`, a Csound client on the same graph,
driven by `fx.space`) was removed on 2026-09-17 and is at `archive/keys-space/`.
`/keys/` was archived the same day and its keyboard moved to `/knobs/`. So the
board's code is the simplest it has ever been: one instrument, one insert
(`pappusFx`, the granulator), one capture. That is exactly the right moment to
name the seam, which §6 does, because there is nothing to migrate.

### 1.4 The relay is already swappable at both ends, and this was a surprise

📄 READ. `rig/box/box.mjs:45` takes `--relay` (default `RELAY_BASE` from
`demo/shell/wire.mjs:30`). `demo/shell/board.mjs:57` takes a `relay` option and
passes it as `base` to `openWire` at line 246. `demo/knobs/index.html:354` reads
it off the query string: `relay: q.get('relay') || undefined`.

So a friend can already point a board and a page at a different relay with a flag
and a query parameter, today, with no code change. That removes most of the work
from §7 before it starts.

---

## 2 · The unit that gets distributed, priced

Five candidates. The test for each is not elegance, it is: **what does a friend
have to do, and what happens when their Pi is not identical to ours.**

### 2.1 This git checkout (what `provision.sh` does today)

The friend clones the repo, runs `provision.sh`, and gets a board. 📄 READ,
`provision.sh` ships `rig/box` plus every `../../` import resolved out of the
source, and `push.sh` additionally ships `rig/vis`.

**Cost:** zero to build, because it is what exists.
**What breaks:** they get the whole repo (47 demos, `workers/`, ~10 MB of
deployed site) to run one service. They get whatever is on `main` that day,
including work in flight. And the four missing package families from §1.1 are
still missing, so the board comes up silent and the first thing a friend sees is
an instrument reporting `unavailable`.
**Verdict:** this is the development loop, not the distribution. Keep it. Do not
hand it to somebody who does not work here.

### 2.2 A tarball plus an installer

One archive containing `rig/box/`, `rig/vis/`, the `demo/shell/` modules
`box.mjs` imports, `setup.sh` and the unit file. `provision.sh` already builds
exactly this set (📄 READ, the `tar cf -` line reads the import list out of the
source with `grep -ho "from '\.\./\.\./[^']*'"`), so the archive is a one-line
change from a pipe to a file.

**Cost:** ⚖️ INFERRED, a few hours. The `tar` already exists, the `install`
already exists, the import check in `setup.sh` (which refuses when an import has
no file) already exists.
**What has to be pinned:** nothing new. The archive is a snapshot of source; the
system packages are the problem and they are §2.5.
**What breaks on a different Pi:** the same things as §2.1, minus the repo size.
**Verdict:** the smallest honest unit, and the one to build first.

### 2.3 A Debian package

`positron-box_<version>_all.deb` with `Depends: jackd2, yoshimi, yoshimi-data,
supercollider, sc3-plugins, ffmpeg, alsa-utils, v4l-utils, nodejs (>= 22)`, a
`postinst` that writes `/etc/default/positron-box` if it is absent and enables
the unit, and `dpkg-statoverride` for nothing because the service runs as an
ordinary user.

**Cost:** ⚖️ INFERRED, a day to get right and a recurring cost forever, because
`nodejs` from NodeSource is not the `nodejs` in Debian and a `Depends: nodejs
(>= 22)` will either be unsatisfiable on Trixie (📄 READ, `setup.sh` says Trixie
ships node 20, where `WebSocket` is undefined, "a failure that reads as the relay
is down") or will be satisfied by whatever NodeSource put there, which apt cannot
reason about.
**What it buys:** `apt install` does the dependency resolution, which is the
whole §1.1 gap solved by the package manager instead of by a script.
**What breaks:** Raspberry Pi OS is Debian-derived but not Debian, and a friend
on Ubuntu, on a Pi 5 versus a Pi 4, or on 64-bit versus 32-bit userland, hits a
different set. And the package has to be hosted somewhere or handed over as a
file, which is a distribution problem wearing a distribution solution's clothes.
**Verdict:** correct in the long run, too expensive as the first step, and it
does not become cheaper by being done later.

### 2.4 An SD card image

`dd` an image, boot, done.

**Cost:** ⚖️ INFERRED, a day to produce and a day per update, and it must be
produced ON a Pi or under emulation. Images are multiple gigabytes.
**What it buys:** a friend with no Linux at all gets a working board. This is by
far the best experience of the five.
**What breaks:** it is frozen. Every fix means a new image and a friend
re-flashing a card. It bakes in a hostname, an ssh host key (or has to regenerate
one on first boot), a room name and possibly a wifi configuration. 🔴 And it is
the option most likely to ship a **secret**: an image made from a working board
carries that board's `~/.ssh`, its journal, its `/etc/default/positron-box`, and
anything in the shell history. An image has to be built from a clean install by a
script, never captured from a machine that has been used.
**Verdict:** the right eventual answer for a non-technical friend, and it must be
**built by running §2.2's installer on a clean image**, never by snapshotting
this board. Not first.

### 2.5 A container

📄 READ, `rig/box/README.md` lines 108 to 119: the whole suite already passes
inside arm64 Linux with no `/dev/snd`, 13/13 against the live relay, with
`docker run --platform linux/arm64 ... fsbox node box.mjs --room <room>`.

That is a real and useful fact and it is **not** a distribution answer for a
board, for a reason the service file already spells out. 📄 READ,
`positron-box.service`:

> `PrivateTmp=true` gave the service its own `/tmp`, so its jackd socket was
> invisible to its own children after a restart. `ProtectSystem=strict` made
> `/tmp` read-only once `PrivateTmp` was off, so jackd could not create that
> socket at all.

JACK is a shared-socket system with a per-user namespace. Putting it in a
container means either `--ipc=host --pid=host -v /dev/snd -v /tmp` (a container
that has given up being one) or a JACK server per container that no other
container can reach. ⚖️ INFERRED and worth being explicit about: the container
that passes 13/13 does so because it makes sound **from arithmetic** and needs no
kernel, which is a different claim from running the real JACK graph.

**Verdict:** keep the container for CI, where it is excellent. Do not ship it as
the board.

### 2.6 Recommendation for §2

**A tarball (§2.2) whose installer reads `rig/audit.mjs`'s package list**, so
`setup.sh` installs the eleven packages instead of four, and refuses to enable
the service when one is missing (it already refuses when an import does not
resolve, so the shape exists). That single change takes a fresh Pi from "comes up
silent" to "comes up playing". Then §2.4 later, built by running that installer
on a clean image.

**What has to be pinned, honestly:** node major (>= 22, because `WebSocket` is
the whole reason), and nothing else. `rig/audit.mjs`'s argument against pinning
Debian point releases holds. What must be **stated** rather than pinned:
`yoshimi-data` is a separate package and without it Yoshimi starts with nothing
to play; `csound` needs `--no-install-recommends` or it pulls tcl/tk onto a
headless board; `sc3-plugins` is separate and core SuperCollider is not enough
for the granulator.

**What happens when a friend's Pi differs:** they are told, in words, by a check
that runs. `rig/audit.mjs` is that check and it already prints the difference. It
should run at the end of `setup.sh` and its output should be the last thing a
friend sees.

---

## 3 · Configuration and identity

### 3.1 What exists

📄 READ. `box.mjs` reads exactly two environment variables: `BOX_NAME` (line 38)
and `BOX_AUDIO` (line 41). Everything else is argv: `--room`, `--name`, `--dry`,
`--once`, `--audio`, `--relay`. `ROOM` as an environment variable exists only at
the systemd layer, where `positron-box.service:16` interpolates it into
`--room ${ROOM}` from `EnvironmentFile=/etc/default/positron-box`.

`setup.sh` writes that file **only if it is absent**:

```sh
[ -f /etc/default/positron-box ] || cat > /etc/default/positron-box <<CFG
ROOM=$ROOM
BOX_NAME=$(hostname)
BOX_AUDIO=default
CFG
```

So the "a person's own configuration survives a push" requirement is **already
met**, and `push.sh` does not touch that file either. That half is done.

### 3.2 The collision, and it is concrete

🔴 📄 READ, and this is the single most dangerous line for a friend.
`setup.sh:23` is `ROOM="${ROOM:-studio-1}"` and `provision.sh` invokes it as
`sudo ROOM=${ROOM:-studio-1} ./setup.sh`.

**A friend who follows the instructions puts their board in `studio-1`.** That is
our room, the one the Raspberry Pi in the studio lives in, and the default room
of `/knobs/` (📄 READ, `demo/knobs/index.html:37`,
`const ROOM = q.get('room') || 'studio-1'`).

What happens then, 📄 READ from `demo/shell/board.mjs`:

- `boardFrom` is set by **whichever board spoke last**: line 282,
  `if (m.type === 'box.hello' || m.type === 'box.alive') boardFrom = m.from || boardFrom;`.
  Two boards beat every 5 s, so the page's idea of which board it is talking to
  flaps twice a beat.
- Binary frames count as presence **unconditionally** (lines 214 to 215), on the
  stated assumption "Nothing else puts PCM into this room."
- Each board's `aseq` starts at 0 and counts independently (📄 READ,
  `box.mjs:427`, and `aseq = 0` on every `stopAudio()`), so two interleaved
  sequences make the page's `lost` counter meaningless and the playout ring
  receives two instruments' audio as if it were one.
- Every verb reaches both boards, because the box filters only on "is it JSON"
  and "is it not my own echo" (`box.mjs:1202-1206`). There is no target field.

And `BOX_NAME=$(hostname)`. 📄 READ from today's own traffic: the studio board
reports `"name":"raspberrypi"`. A friend's Pi is also called `raspberrypi` unless
they changed it, so the only human label on the wire does not distinguish them
either.

### 3.3 What configuration has to become

Nothing here needs a new file. `/etc/default/positron-box` is the right place and
it survives a push. What it needs is:

| key | today | should be |
|---|---|---|
| `ROOM` | defaults to `studio-1` | 🔴 **no default.** `setup.sh` refuses to write the file without one, and prints a suggestion derived from the hostname |
| `BOX_NAME` | `$(hostname)` | keep, and add `BOX_ID`, minted once at install from `/proc/sys/kernel/random/uuid`, so two `raspberrypi`s are distinguishable on the wire |
| `BOX_AUDIO` | `default` | keep. `arecord -l` lists the real ones |
| `BOX_RELAY` | not read (only `--relay`) | read it, so a friend on their own relay sets one line instead of editing a unit file |
| `BOX_INSTRUMENT` | does not exist | which declaration from §6 this board runs. **One**, chosen at configuration time, never at runtime |

⚠️ **`BOX_ID` is not authentication and must not be described as any.** The relay
is tokenless and forwards verbatim; anybody can put any `name` or `id` in a
message. It is a way to tell two boards apart when both are behaving, which is
the case that actually happens. §4.4 is where the authentication question lands
and the answer there is "not on this relay".

**Credentials:** there are none today and that is a feature. 📄 READ,
`rig/box/README.md:5`: *"Nothing here listens on a port, so there is no inbound
hole and it works from any network that allows outbound TLS."* Every design below
that would add one is priced against losing that sentence.

---

## 4 · Single user or multi user, and what actually breaks

This is the heart of the ask and it has a live example, measured today.

### 4.1 What is happening in `studio-1` right now

🔴 **MEASURED 2026-09-17**, a read-only join that sent nothing, 6 s:

```
frames 294   bytes 568008   92.4 KiB/s   seq gaps 0
rms 0.000000 (-180.0 dBFS)  peak 0.000000  samples 282240
controllers seen on the wire:
   d2ysxd ch0 cc74 = 127
   d2ysxd ch0 cc71 = 63
   d2ysxd ch0 cc7  = 22
ctl.meter  in 5387  out 5245  folded 25  on yoshimi  from box-u5pg1m
box.alive  name raspberrypi  upSec 8180  audio yoshimi  voices 0  frames 330449  fx null
```

An 8 s listen before it showed the same client `d2ysxd` sending
`ctl.set {channel:0, set:[[74,127],[71,63],[7,22]]}` at `seq` 1041 through 1055,
which is **one message every ~500 ms, and three controller values in each**. The
board's `ctl.meter` climbed from `in 4976` to `in 5018` across that window, about
6 values a second, and wrote every one of them to Yoshimi (`out` climbed by the
same 42).

So: **a page somebody left open is holding a shared instrument's three
controllers at its own values, forever, twice a second, and nothing anywhere
reports that this is happening.** `ctl.meter` counts messages and names neither
the controller, the value, nor the sender.

⚠️ **AND IT TOUCHES THE OPEN LEVEL BUG, WITHOUT SOLVING IT.** 📄 READ,
`BACKLOG.md`: the level collapse was investigated the same day and MIDI was ruled
out because *"CC 7 volume and CC 11 expression at 127 change nothing"*. That
measurement and the traffic above are **compatible**: ⚖️ INFERRED, a CC 7 set to
127 by a probe, in a room where another client re-asserts 22 within 500 ms, is
undone before the next note and reads exactly as "it changed nothing", whether or
not CC 7 is the cause. This is **not** a claim that CC 7 explains the collapse. I
could not test it: `voices: 0`, the board is playing nothing, and every sample on
the wire is an exact zero, so the level measurement I could take answers nothing
about the level bug. 🔴 **The measurement that separates them** is: take that
client off the room (or wait for its tab to close), then send CC 7 = 127 and hold
a note for a full second while reading the PCM RMS off the relay.
`rig/box/live-test.mjs` already does RMS-before-note against RMS-after-note and
is the tool for it.

That is the whole multi-user argument in one observation, so the rest of this
section is what to do about it.

### 4.2 Three things "multi user" could mean, and they are not variants

**(a) One board per person, each in their own room.** This is what "portable"
naturally means and it is what the packaging in §2 produces. Costs a Pi each.
Breaks nothing. Every problem below disappears. ✅ **This is the recommended
default and the one the configuration in §3.3 should make hardest to get wrong.**

**(b) Several people listening to one person play.** 🔴 **This works today, with
zero code changes, and it is what the relay is genuinely good at.** MEASURED
above: a listener joins, receives 50 PCM frames a second with **zero sequence
gaps**, and sends nothing. Ceiling is §5's 128 sockets.

The one thing missing is that **nothing distinguishes a listener from a player**.
Any socket in the room can send any verb (📄 READ, `box.mjs:1202-1226` filters
only on JSON-ness and self-echo; the `params.set` comment at 1044 says so
outright: *"the relay is tokenless, so anyone in the room can send it"*). So (b)
is not a mode, it is a social convention, and today it is being broken by a tab.

**(c) Several people playing one board at once.** This is the interesting one and
it is the one that breaks. What breaks, each read out of the source:

| what | where | what it does to a second player |
|---|---|---|
| one MIDI channel | `box.mjs:774`, `ctl.ch = msg.channel ?? ctl.ch` | last speaker wins the channel; everybody's CC lands wherever the last message said |
| one coalescing map | `box.mjs:775-781` | two people moving the same controller fold into one write. `folded` counts it and never says whose value was lost |
| one instrument, replaced not refused | `box.mjs:458-472` | `audio.start` with a different source kills the running one mid-note for everybody |
| the auto-start | `box.mjs:667` | one person's first keypress raises a 13 s JACK chain for the room |
| the start mutex | `box.mjs:62,446` | during that raise, everybody else's notes come back `{dropped:true, starting}` |
| one voice | `voice.select`, line 720 | one person's patch change is everybody's patch change |
| `patch.clear` | line 654 | cuts **every** ALSA subscription on the board. No arguments, no scoping |
| `params.random` | line 917 | turns parameter drift back on regardless of who turned it off |
| one capture | `jacksynth.mjs`, `posbox:input_1` | everybody hears the **sum**. Two players are a duet whether they wanted one or not |

🔴 **The last row is the only one that is a feature.** Many JACK ports into one
input sum, and that is the honest thing a shared instrument does: one room, one
sound, everybody in it. If multi-user is going to mean anything here, that is
what it should mean, and every row above it is a defect standing in its way.

### 4.3 What (c) would cost, if it is wanted

Three changes, in increasing price.

1. **A channel per client, not a global.** Yoshimi has 16 parts. A client that
   sends `ctl.set` without a channel gets one assigned from its `from` id and
   told what it got; `ctl.ch` stops existing. ⚖️ INFERRED cost: small, because
   the MIDI byte already carries the channel (`jacksynth.mjs`,
   `cc: (ch, c, v) => midi([0xb0 | (ch & 15), c & 127, v & 127])`). What it buys
   is that two people stop fighting over one filter. What it does not buy is
   anything about `voice.select`, which is per part and would need the same
   treatment.
2. **A control-state report.** One verb answering "what is every controller set
   to, and which `from` set it, and how long ago". This is `insertState()`'s idea
   (📄 READ, `box.mjs:122-133`, `fx`, `fxBy`, `fxAgoSec`, `fxHeld`) applied to
   controllers instead of to the granulator. It would have made §4.1 visible on
   any page in one glance. 🔴 **This is the cheapest useful thing in the whole
   plan** and it is also §8's first verb, so it gets built once.
3. **Arbitration.** The README already argues against it and the argument is
   good:

   > 🔴 **This half is the one that matters.** A page that says *"another page
   > took the granulator out of the sound"* is correct and honest with no
   > arbitration at all; **arbitration that hides the conflict is worse than
   > none**, because it turns a visible problem into an invisible one.

   ⚠️ And the mechanism it settled on is worth reusing rather than reinventing:
   no lease, nothing to release, nothing to leak, because *"a client that is
   still there keeps talking"* and a client id is minted per connection so a
   claim cannot outlive the tab that made it (📄 READ, README lines 342 to 347).

### 4.4 What cannot be fixed on this relay, and should be said out loud

The relay never parses a message (📄 READ, `workers/relay/src/index.js`,
`webSocketMessage` forwards `msg` verbatim to every socket). Therefore:

- It cannot authenticate a sender, because it does not know there is a sender.
- It cannot route to one board, because it does not know there are boards.
- It cannot tell a listener from a player.
- `webSocketClose()` is an empty method, so **nobody is told when somebody
  leaves**.
- `GET /stats` reports per-socket idle times but the array is anonymous and
  sorted (MEASURED today: `"idleMs":[118482,118479,98380,29313,23402,407,0]`), so
  it cannot say **which** socket went away.

⚖️ INFERRED but strongly: any real multi-user policy is therefore **the board's
job**, not the relay's, and it is advisory rather than enforced. A board can
refuse a verb from a `from` it does not recognise. It cannot stop that `from`
being forged, and pretending otherwise would be the "arbitration that hides a
conflict" failure in a new costume.

---

## 5 · The relay's real limits, MEASURED 2026-09-17

Every number in this section was measured today from this laptop against
`wss://ws.positron.studio`, in throwaway `perf-*` rooms. None of it touched
`studio-1` except the read-only listen.

🔴 **Do not quote the numbers that were here before.** 📄 READ,
`demo/shell/wire.mjs:35-40` still exports `LIMITS` as
`{maxBytes: 256 KiB, maxSockets: 16, bytesPerSec: 512 KiB, msgPerSec: 60}`, under
a comment claiming it is read from the relay so it cannot disagree. **It is wrong
on all four**, by 4x, 8x, 16x and 16.7x. `plan-controller.md` §1.3 reported this
on 2026-09-16 and it is still there.

### 5.1 The live numbers

MEASURED, `GET https://ws.positron.studio/room/studio-1/stats`:

```
"limits":{"maxBytes":1024000,"maxSockets":128,"bytesPerSec":8388608,"msgPerSec":1000}
```

📄 READ, `workers/relay/src/index.js:74-81`, which agrees:
`MAX_BYTES = 1000 * 1024`, `MAX_SOCKETS = 128`, `BYTES_PER_SEC = 8 MiB`,
`BYTE_BURST = 16 MiB`, `MSG_PER_SEC = 1000`, `MSG_BURST = 2000`, `STRIKES = 50`,
`IDLE_MS = 10 min` and reclaim runs **only when the room is full**.

### 5.2 How many sockets a room really takes

🔴 **MEASURED: 128 exactly. The 129th is refused.**

```
A. sockets in one room
   opened 128, then refused
   what the client was told: error event, no message
   /stats says sockets=128 maxSockets=128
```

📄 READ, the refusal is `return new Response('room full (128)', { status: 503 })`
with the comment *"refuse rather than accept-and-drop: a client that is told no
can retry"*. ⚠️ **But a WebSocket client cannot read that status.** MEASURED: all
the client gets is an error event with no message, which is why
`demo/shell/board.mjs:20` says a browser *"cannot read the HTTP status of a
refused upgrade"* and asks `/stats` instead. Any friend's client has to do the
same or it will report a dead relay when the room is merely full.

### 5.3 The message roof

🔴 **MEASURED, to the byte:**

| sent | came back |
|---|---|
| 1,023,999 bytes | yes |
| **1,024,000 bytes** | **yes** |
| 1,024,001 bytes | **no, and no close, and no error** |
| 1,048,576 bytes | no, same |

So the roof is exactly `MAX_BYTES` and a message one byte over vanishes in
silence. `demo/shell/wire.mjs` says 256 KiB.

### 5.4 The message rate, and what the sender is told

🔴 **MEASURED, three seconds at each rate, one sender, receiver counting `seq`:**

| paced rate | delivered | lost in the middle | what the sender was told |
|---|---|---|---|
| 500 /s | 1500 / 1500 | 0 | nothing |
| 1000 /s | 3000 / 3000 | 0 | nothing |
| 1500 /s | 4500 / 4500 | 0 | nothing |
| 2500 /s | 3165 / 7500 | 69 | 🔴 **`close 1008 "rate limit"`** at message 3436 |

And with no pacing at all:

```
D. 6000 messages as fast as the loop goes
   sent 6000 in 37 ms (162162/s)  delivered 2030  lost 0  sender told: NOTHING
```

Three things follow and they matter for §4.

🔴 **First, CLAUDE.md's "the sender is told NOTHING when this bites" is half
right and the other half is worse.** The DROP is silent (📄 READ,
`this.dropped++; return;`). The CLOSE is not: a socket that accumulates 50
consecutive refusals is closed with code 1008 and the reason `rate limit`, and
MEASURED, that is reachable. But it is **not reliable**: a 162,000/s flood got no
close at all, because a token refills about once a millisecond and one
success resets the strike counter (📄 READ, `b.strikes = 0` in `#allow`). So a
sender can be silently truncated, or abruptly closed, and cannot predict which.

🔴 **Second, `MSG_BURST` makes the steady rate a lie for short runs.** The
allowance over `t` seconds is `2000 + 1000t`, so 1500/s for 3 s fits inside it and
reads as clean. A longer run at the same rate would not. ⚖️ INFERRED, not
measured: 1500/s sustained past about 4 s starts losing. The command that would
measure it is the same script with `SEC = 20`.

🔴 **Third, and this is a lesson about the instrument rather than the relay:
`lost 0` in run D is a broken collector.** 2030 of 6000 arrived and the
seq-gap counter read zero, because the loss was a **tail**, not a hole. A check
that counts gaps between delivered messages is blind to truncation at the end,
which is exactly the shape this cap produces. Any page reporting `lost` off a gap
counter is under-reporting.

### 5.5 What a hop costs, by room size

🔴 **MEASURED, 120 samples each, sequential, sender is socket 0:**

| sockets in room | `ping` -> `pong` (runtime, object never woken) | echo through the object | the object's own cost |
|---|---|---|---|
| 1 | p50 36.3 p95 44.7 | p50 42.3 p95 52.0 | **6.0 ms at p50** |
| 4 | p50 35.8 p95 48.2 | p50 41.7 p95 56.0 | **5.9 ms at p50** |
| 16 | p50 39.1 p95 57.2 | p50 46.3 p95 74.2 | **7.2 ms at p50** |

So **going from 1 socket to 16 costs the sender 1.2 ms at p50 and about 22 ms at
p95**. ⚠️ CLAUDE.md records 1 to 2 ms for the hop and 8 ms for a full 16-socket
room; today's hop is 6 ms and today's room-size cost is 1.2 ms. Both were measured
honestly on different days from different networks. ⚖️ INFERRED: the 36 ms floor
is this laptop's RTT to the edge today and it dominates everything; the object's
contribution is small and grows slowly with room size.

### 5.6 What the board actually uses of that

🔴 **MEASURED** on `studio-1`: 294 frames in 6 s, 568,008 bytes, **92.4 KiB/s**,
**zero sequence gaps**. 📄 READ: 20 ms frames of 960 int16 mono at 48 kHz, plus a
12-byte header (`uint32` sequence, `float64` of the board's `performance.now()`),
so 1,932 bytes at 50 a second.

Against its own socket's budget: **4.9 % of the 1000 msg/s** and **1.1 % of the
8 MiB/s**. The board is nowhere near any limit.

🔴 **But the caps are per SENDING socket and fan-out is not capped at all.**
📄 READ: `#allow` is called once per inbound message, and the delivery loop
`for (const s of this.state.getWebSockets()) s.send(msg)` has no budget. ⚖️
INFERRED arithmetic: 128 listeners on one board's audio is
`50 x 1932 x 128 = 12.4 MB/s` leaving one Durable Object, with nothing in the
code that would slow it down. That is the real ceiling for "several people
listening" and it is **not** the one written in the config. NOT MEASURED, and the
thing that would measure it is 128 receiving sockets against one PCM sender for
30 s, reading `droppedSinceWake` and each receiver's gap count. That costs real
bandwidth and should be run once, deliberately, not in a loop.

### 5.7 So: how many people, honestly

- **Sockets:** 128 per room, hard, refused with a 503 a browser cannot read.
- **Boards:** 1 per room, because §3.2. Two is corruption, not contention.
- **Listeners:** ⚖️ INFERRED up to about 126, limited by the un-capped fan-out
  in §5.6 rather than by any declared number.
- **Players:** 1 today, because §4.2(c). Up to 16 if the channel-per-client
  change in §4.3 is made, because Yoshimi has 16 parts.
- **Rate a player needs:** one `ctl.set` carrying every due controller is the
  pattern `/knobs/` already uses (📄 READ, *"Two sliders moving together are one
  `ctl.set`, not two: the relay's budget is counted in messages"*). At 60 Hz that
  is 60 msg/s per player, so 16 players is 960 msg/s, which is **at** the cap.
  ⚖️ INFERRED: the room's aggregate is not what the bucket measures (it is
  per-socket), so 16 players at 60 Hz each is fine for the relay and the question
  moves to whether one Pi can write 960 MIDI bytes a second and whether Yoshimi
  can do anything useful with them. NOT MEASURED.

---

## 6 · Pluggability, on JACK

### 6.1 What a declaration says today

📄 READ, `rig/box/jacksynth.mjs`. `JACK_SYNTHS` is a table with one key, and a
def may carry:

| field | meaning |
|---|---|
| `needs: [bin]` | binaries that must be on `PATH`. `jackSynthAvailable` checks them and `box.hello` reports the result per instrument |
| `spawn(opts)` / `spawnAll(opts)` | the process, or the several processes, that make the sound |
| `portMatch`, `portMatch2` | regexes over `jack_lsp` for the left and right output ports |
| `warmup` | ceiling in ms for the port to appear. Defaults 13000 for yoshimi, 6000 otherwise |
| `settle` | ms to wait **after** the port is there, for an instrument that registers before it can play |
| `alsaMatch` | regex over `aconnect -l` client lines, so virmidi can be joined to it. Optional, because a recording has no notes |
| `oscCmd` | opens a UDP control socket. Hardcoded to `/pappus/cmd` on port 57120 |
| `osc: false` | dead. Left with hexter |

And the board then does, for every instrument identically: connect `portMatch`
and `portMatch2` into `posbox:input_1`, raise the ffmpeg capture, find virmidi,
`aconnect` it to `alsaMatch`'s client, open the raw device, and hand back
`noteOn` / `noteOff` / `cc` / `program` / `panic` / `osc` / `stop`.

**That is already most of a plugin interface.** It is a table in a file rather
than a directory, and it has one entry.

### 6.2 What an insert says today, which is nothing

`pappusFx()` is a hand-written function with everything baked in: the port names
`SuperCollider:in_1/in_2/out_1/out_2`, the availability test
`['sclang','jackd'].every(have) && existsSync('/opt/positron-box/rig/box/norns/run-pappus.scd')`
(an absolute path in a source file), the readiness line `PAPPUS READY`, and the
OSC address `/pappus/cmd` on 57120. `sweepInsert()` in `box.mjs` is written
around it by name. 📄 READ: the reverb that left on 2026-09-17 was a second
hand-written function of the same shape, and the two **disagreed about the right
channel for a month**, which is the whole argument for a seam:

> The reverb insert that used to live below had this right all along: it patched
> `port` AND `portR`, which is why the two inserts disagreed about what a page
> could hear.

### 6.3 The seam

**One directory, one declaration per file, enumerated rather than listed.**
`demo/shell/` is already built this way (📄 READ, `build.mjs` enumerates it and
refuses the build when an import has no file), so the pattern is established.

```
rig/box/clients/yoshimi.mjs
rig/box/clients/pappus.mjs
rig/box/clients/<a friend's thing>.mjs
```

Each exports one default object. What it **must** state, and why each field is
there rather than inferred:

| field | why it cannot be inferred |
|---|---|
| `kind: 'instrument' \| 'insert'` | an instrument generates, an insert processes. Pappus was in `JACK_SYNTHS` once and "faithfully processed silence", which looked like a second sound source identical to the first |
| `name` | the string a page asks for and a log prints |
| `needs: [bin]` | a missing binary must report `not installed: x` rather than a JACK error three processes downstream |
| `spawn()` | what to run |
| `out: [regex]` | output ports, **in channel order**. Not one port and an optional second: a list, so a mono client and a four-channel one are the same shape and nobody can patch the left and forget the right |
| `in: [regex]` | input ports. Empty for an instrument. **This is the field whose absence caused the reverb-versus-granulator disagreement** |
| 🔴 `ready()` | **REQUIRED, and the declaration is refused without it.** See below |
| `midi: regex \| null` | the `aconnect -l` client to join virmidi to. `null` for something with no notes |
| `panic()` | optional. A MIDI all-notes-off reaches a synth and nothing else; a granulator holds a ring buffer, eight delay taps and a reverb tail |
| `stop()` | optional, defaulting to SIGTERM on everything spawned |

🔴 **`ready()` is required and it may not be "the port exists".** 📄 READ, the
measurement is in `jacksynth.mjs`'s own comment and it is seven seconds:

> `SuperCollider:out_1` appears as soon as scsynth boots; the 2,030-line engine
> class is compiled and its 106 commands registered several seconds LATER, and
> sclang answers an unknown command with nothing at all. [...] `pappus inserted`
> at 05:38:59.8, a minute of 1965 loaded at 05:39:03.5, and `PAPPUS READY` only
> at 05:39:06.0.

So the framework waits for the port (it has to, to patch it) and then asks the
declaration whether the thing behind the port can actually receive. Yoshimi's
`ready()` is a 6 s settle while it reads 911 instruments off the disk. Pappus's
is a line on stdout. A friend's is whatever their engine does. **Making it a
required field is how the most expensive bug on this board stops being
re-learnable.**

### 6.4 How the board discovers them, and what it must refuse

- Enumerate the directory at startup. A file that does not export the required
  fields is **refused loudly and named**, never skipped. 📄 READ, `setup.sh`
  already applies exactly this rule to imports (*"REFUSE the install when one has
  no file"*) and `build.mjs` to the deployed site.
- Run `needs` for each and report availability in `box.hello`, which already
  carries `instruments: { synth, pappusFx, ...JACK_SYNTHS keys }`.
- 🔴 **Availability is not a menu.** The instrument this board plays is
  `BOX_INSTRUMENT` from §3.3, chosen once at configuration. Everything else in
  the directory is reported as present and is not startable over the wire.

That last rule is the point where "pluggable" and "somebody took the sound away
from me" are reconciled, and it deserves stating plainly: **the declaration
directory makes the instrument a configuration choice, not a runtime choice.** A
friend plugging a new synth into their own board edits one line of
`/etc/default/positron-box`. A visitor to somebody's board cannot change it at
all. 📄 READ, the scar this avoids is in CLAUDE.md and in the README:
`/knobs/` was found refusing to start because somebody had pressed `sampled` on
another page.

⚠️ **An insert is different and can stay switchable**, because it is a re-patch
rather than a process raise, and because `fx.pappus` already has the only
ownership notion on the board and the board already sweeps an insert out when the
page holding it stops talking (📄 READ, `sweepInsert()`, `box.mjs:167-194`,
`INSERT_HELD_MS = 15000`, which is 3.75 of `/grains/`'s 4 s polls).

### 6.5 What this does not solve

⚖️ INFERRED and worth saying: a declaration cannot make two instruments coexist.
There is one `posbox` capture and one room, so raising a second instrument means
either summing it into the same capture (which is what JACK does, and is
§4.2(c)'s "duet whether you wanted one or not") or a second capture and a second
room. Neither is a plugin problem.

---

## 7 · Production elsewhere: whose relay

📄 READ, `workers/relay/`: one `src/index.js`, one `wrangler.jsonc`, one Durable
Object class bound as `ROOMS`, `new_sqlite_classes: ["Relay"]`, custom domain
`ws.positron.studio`. No storage is used (the class holds live socket sets and an
in-memory bucket).

### 7.1 A friend shares ours

**Cost to them:** nothing. Set a room name and go.
**Cost to us:** their traffic in our account, and 🔴 **the room namespace is
guessable and tokenless**, so `studio-1` is reachable by anybody who reads a page
source. Combined with §3.2's default, this is not a theoretical collision.
**What breaks:** a full room is a silent outage for everybody in it (📄 READ, the
`studio-1` incident: 16 of 16 sockets held by orphaned harness Chromes, the board
logging `closed 1006` for hours), and 128 sockets is shared across every friend.
**Verdict:** fine for one friend trying it out for an evening. Not production.

### 7.2 A friend runs their own Worker from this repo

**What they must own:** a Cloudflare account, and either a domain or the free
`*.workers.dev` subdomain.
**What they do:** copy `workers/relay/`, change `name` and `routes`,
`npx wrangler deploy`.
**What changes on the board:** one line, `BOX_RELAY=wss://their-host` (§3.3), or
`--relay` today.
**What changes on the page:** `?relay=wss://their-host`, which
`demo/knobs/index.html:354` already reads.
**Not verified:** whether Durable Objects are available on Cloudflare's free plan
today, and what a SQLite-backed DO namespace costs. The docs search timed out
twice while writing this and I am not going to fill the gap with a confident
sentence. A person should check `developers.cloudflare.com/durable-objects/` and
the Workers pricing page before telling a friend it is free.
**Verdict:** ✅ **the recommendation.** It is the only option that makes a friend
independent, and the board and the page already support it with no code change.

### 7.3 A friend self-hosts

The relay is ~250 lines of ordinary JavaScript and the Durable Object is used
only as "a room with a socket set". ⚖️ INFERRED: it would port to a plain node
process in an afternoon.
**What breaks:** they now need a public TLS endpoint, which is the one thing the
current design exists to avoid, and the hibernation autoresponse (the free
`ping`/`pong` that makes an RTT probe not wake the object, and the timestamp the
idle reclaim depends on) has no equivalent.
**Verdict:** only for somebody who already runs servers.

### 7.4 What a friend must own to be independent

A Pi, a Cloudflare account, and a room name nobody else uses. That is the whole
list, and it is short because of §1.4.

---

## 8 · Remote diagnosis and recovery

🔴 This is a requirement of a portable board, not a separate errand. **A board a
friend owns is a board nobody here can walk over to**, and today's board proves
the gap: 📄 READ, `BACKLOG.md` records that the output level collapsed to about
1/40th, every page reported correct counters, an `audio.stop` and `audio.start`
over the relay did not fix it, and `ssh positron@192.168.1.213` does not answer
from outside the studio LAN.

### 8.1 What the board can be asked today, and what it cannot

📄 READ, the complete verb list: `ports.get`, `patch.plan`, `patch.apply`,
`patch.clear`, `audio.start`, `audio.stop`, `audio.status`, `note.on/off/panic`,
`voices.list`, `voice.select`, `ctl.set`, `ctl.meter`, `cc`, `moog.patch`,
`fx.pappus`, `params.random/drift/state/set`, `source.set`, `grain.report`,
`video.start/shader/params/watching/stop/status`, `box.ping`.

- **No verb restarts the service.** `grep` over `box.mjs` for
  `restart|systemctl|reboot` returns comments only.
- **No verb reports the JACK graph.** `ports.get` returns **ALSA sequencer MIDI
  ports** (📄 READ, `alsa.mjs:85`, `execFileSync('aconnect', ['-l'])`), addresses
  like `20:0`. `posbox:input_1`, `yoshimi:left` and `SuperCollider:out_1` are not
  reportable by any verb.
- **`ctl.meter` counts and does not name.** MEASURED today: it reported
  `in 5387 out 5245 folded 25` while a client held CC 7 at 22, and said nothing
  about a controller, a value or a sender.
- **What DOES work remotely, and is underused:** `rig/box/live-test.mjs` already
  drives a running board over the real relay and measures **RMS before a note
  against RMS after it**, for exactly the reason that matters here: *"a live,
  unmuted, enabled audio track carrying digital silence looks exactly like a
  working one from every angle except the samples."* That is a remote level
  diagnosis and it exists.

### 8.2 The three verbs, cheapest first

**(a) `graph.get`, read-only.** Returns `jack_lsp -c` (ports AND connections),
`pgrep -x` counts for `jackd`, the instrument and `ffmpeg`, the last value of
every controller with the `from` that set it and how long ago, and the capture's
frame counter. ⚖️ INFERRED cost: an hour. It would have answered §4.1 at a glance
and it is the thing `ports.get` is repeatedly mistaken for.

🔴 **Include `pgrep -cx ffmpeg` and read it before believing anything about the
encoder.** CLAUDE.md: a wedged `/dev/video11` puts ffmpeg in uninterruptible
sleep where SIGTERM, SIGKILL and `timeout` all do nothing, and three stack up
behind it looking from outside like "the encoder produces no bytes". And `-x`,
never `-f`, because `pgrep -f h264_v4l2m2m` matches its own ssh command line and
answers "still held" about itself.

**(b) `service.restart`.** 🔴 **This is nearly free and it is worth saying how.**
📄 READ, `positron-box.service` has `Restart=always`, `RestartSec=2` and
`StartLimitIntervalSec=0` (in `[Unit]`, deliberately, with a comment saying
systemd ignores it in `[Service]` with only a warning). So **`process.exit(1)` IS
a service restart**, guaranteed, in two seconds, with no `sudo`, no polkit and no
new privilege. `box.mjs` already exits cleanly on `--once` and on a signal.

⚠️ **And it is a loaded gun on a shared board**, because any socket in the room
can send any verb. It must at minimum require the board's own `BOX_ID` in the
message (§3.3), which is not authentication and is enough to stop an accident,
and it must log who asked.

**(c) `graph.rebuild`.** Tear the instrument chain down and raise it again,
including jackd, which `audio.stop` deliberately does not touch (📄 READ,
`jacksynth.mjs`: *"jackd is NOT in `procs`. It is a shared server that outlives
any one instrument"*). The open level bug is below `audio.stop`/`audio.start`,
which is exactly the space this verb covers. ⚖️ INFERRED cost: moderate, and it
should reuse `sweepOrphans()`, which already exists and already `pkill -9 -x`s
the whole family, but only at startup and unreachable from a client.

### 8.3 Tunnels, priced

These are **not alternatives to §8.2**. The verbs answer questions while the
service is up. Only a tunnel answers when it is not, and "the service will not
start" is the failure a friend will actually have.

| | what it costs | what it buys | what it breaks |
|---|---|---|---|
| **two verbs only** | an hour, no dependency, no inbound hole | a fixed list of questions, answered from anywhere the relay reaches | ⚠️ **useless when the service is dead**, which is when you need it |
| **Cloudflare Tunnel** | a `cloudflared` daemon on the board, a DNS record, and an Access policy. A friend needs their own Cloudflare account | real ssh from anywhere, outbound-only, same posture as the relay. The account already exists here | ⚖️ INFERRED: without an Access policy the tunnel is a public door onto the board. NOT VERIFIED today, the docs search timed out |
| **Tailscale** | a daemon and a third-party account | ssh with no DNS and no policy to write. ⚖️ INFERRED there is a free personal tier | another account a friend must own, and a second network identity per board |

⚖️ **Recommendation, clearly marked as judgement:** do §8.2(a) and (b) first
because they are hours and they need nothing, then **Cloudflare Tunnel**, because
the account is already there, the outbound-only posture matches the relay exactly
(and so keeps `rig/box/README.md:5` true: *"there is no inbound hole and it works
from any network that allows outbound TLS"*), and a friend who followed §7.2
already has an account for it. Tailscale is the better answer for a friend with
no Cloudflare account, and the choice should be a `BOX_TUNNEL` line rather than a
fork in the code.

---

## 9 · What was not measured, said plainly

- **The open level bug was not reproduced and not explained.** The board reported
  `voices: 0` and every PCM sample on the wire was an exact zero, so the level I
  measured says nothing about the level when something is playing. §4.1 has the
  experiment that would separate the two hypotheses, and it needs the parked
  client gone from the room first.
- **The relay's byte budget was not measured.** `BYTES_PER_SEC` is 8 MiB with a
  16 MiB burst (📄 READ). Tripping it needs more than 16 MiB pushed in under a
  second, which is 16 MB up plus 16 MB echoed back. Not run. The command is the
  §5 script with a 1 MB payload sent 20 times without pacing.
- **Fan-out was not measured.** §5.6's 12.4 MB/s from 128 listeners is
  arithmetic. 128 receiving sockets against one PCM sender for 30 s would
  measure it, and it costs real bandwidth.
- **A sustained rate past the burst was not measured.** 1500/s for 3 s is inside
  `MSG_BURST + 3s`. `SEC = 20` would say where the steady line really is.
- **Nothing was tested on a second Pi**, because there is not one. Every claim in
  §2 about what breaks on a friend's different hardware is reasoning.
- **Durable Object availability and pricing on a free Cloudflare account was not
  verified.** The docs search timed out twice.
- **Neither tunnel was tried.** Both rows in §8.3 are reasoning from how the
  products are described, not from a board that has one.
- **`rig/audit.mjs` was not run**, because it goes over ssh to the studio LAN and
  this machine has no route to it. Its package list is READ, not confirmed
  against the board as it stands today.

---

## 10 · What to do, in order

Cheapest useful first. **Steps 1, 2, 3, 5 and 6 need nobody at the board.**

1. **Fix `demo/shell/wire.mjs`'s `LIMITS`.** Four numbers, wrong by up to 16.7x,
   under a comment claiming they cannot be wrong, reported on 2026-09-16 and
   still there. Minutes. No board.
2. **Add `graph.get` and `service.restart` to `box.mjs`.** §8.2(a) and (b). An
   hour or two. `service.restart` is `process.exit(1)` because the unit file
   already guarantees the rest. **No board needed to write them; a board is
   needed to prove they work**, and the board is currently unreachable for
   repair, so write them, syntax-check them, and ship them with `push.sh` when
   somebody is next in the building.
3. **Make `setup.sh` install the instrument.** Read `rig/audit.mjs`'s package
   list instead of installing four packages, and run the audit at the end so a
   friend's last line of output is the difference. This is the single change that
   takes a fresh Pi from "comes up silent" to "comes up playing". **No board**:
   it is testable in the arm64 container that already runs the suite.
4. 🔴 **Take `studio-1` out of `setup.sh` as a default.** Refuse to write
   `/etc/default/positron-box` without a room, and mint `BOX_ID`. §3.2 is a live
   collision waiting for the first friend who follows the instructions. Minutes.
   **No board**, but it only takes effect on the next provision.
5. **Cut the tarball.** §2.2. `provision.sh` already builds the file set; the
   change is a pipe to a file plus a README a friend can follow. Half a day.
   **No board.**
6. **Name the client seam.** §6.3: move `JACK_SYNTHS`' one entry and `pappusFx`
   into `rig/box/clients/`, make `ready()` required, make the instrument a
   `BOX_INSTRUMENT` line rather than a verb. Do this **now, while there is one
   instrument and one insert**, because the cost only goes up. A day. **No
   board** to write, a board to prove.
7. **Then choose a tunnel** (§8.3) and set it up. **Needs a person at the board**
   the first time, to install the daemon and authenticate it. After that it is
   the thing that means nobody has to be.
8. **Then measure what §9 left open**, in this order: the level bug with the room
   clear (needs the board, and needs the parked client gone), the sustained rate,
   the fan-out at 128.
9. **Only then consider a `.deb` (§2.3) or an image (§2.4)**, and build the image
   by running step 5's installer on a clean card. **Needs a person at a Pi.**

⚠️ And one thing that is not a step because it is a decision:
**§4.2(a), one board per person in their own room, is the recommended answer to
the architectural question.** Multi-user on one board is buildable (§4.3) and is
worth building only if the wanted thing is the duet in §4.2's last row, where
everybody in the room is summed into one sound. If what is wanted is "my friends
can each have one of these", then the answer is packaging and a private room, and
every contention problem in §4 stops existing.
