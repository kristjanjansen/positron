# plan-rack — everything on the studio Mac, whether the Ableton route is the right one, and what to do if this is picked up again (2026-09-12)

`rig/m1/` is PARKED. It is parked **working** — 11/11 links on the
day it stopped — and the stated reason to stop was cost, not failure. This
document does four things the parking note could not: it lists what is actually
on that machine, it asks honestly whether the weight is inherent or ours, it
compares the routes into Ableton Live with sources, and it says what to do next.

Nothing here changes anything. The survey below was taken read-only over
`ssh mbp` on **2026-09-12**; no file was installed, deleted or edited on that
machine.

Every claim is tagged: **MEASURED** (read off the machine today, command
given), **DOCUMENTED** (a vendor, a spec or a repository says so, with a URL),
**ESTIMATED** (arithmetic on measured values), **UNCONFIRMED** (nobody has
looked). ⚠️ A vendor's claim is never promoted to an observation, however
confidently it is written.

---

## 0. The short answer

**The heavy list is a PROVISIONING list, and it was reported as a STARTUP
list.** The README's parking section says *"six things must ALL be true before a
single note sounds, and four of them cannot be restored from this repo"* (its
table actually has eight rows, five of them "no"). Every one of those five was
re-checked today against Ableton's own `Log.txt`, and the result is that they
are **stored settings which had already survived a reboot on this machine**:

| README's row | README said | MEASURED 2026-09-12 |
|---|---|---|
| AbletonOSC as a **Control Surface** | "no — a Preferences click" | in slot 2 at **2026-09-10T22:31**, again at **17:13 on the 11th after a reboot**, and at quit. Stored in `Preferences.cfg`. |
| Preferences → Audio → Output = Multi-Output | "no — no OSC API exists" | `Output Device: Multi-Output Device` at **every** launch logged, including the first after boot |
| IAC Bus 1 enabled for **Track** input | "no — a Preferences click" | `MidiInDevice [Name="IAC Driver (Bus 1)", Track=true …]` at quit |
| Live open "with this set loaded" | "no" | ⚠️ **there is no such set.** No `.als` on the machine is newer than 2025-11-23 and every one is a band project. `live-setup.mjs` configures whatever document is open, and an empty Live set already has the MIDI tracks it needs. §1.4 |
| the Mac awake and not asleep | "no — physical" | still true, still physical — though `pmset` reports **`womp 1`** on AC, so Wake-on-LAN is on |

So the honest cost of **waking** this rig is three things: the Mac is awake,
Live is open, and one command is typed in a terminal. The cost of **rebuilding**
it on a fresh Mac is four clicks and a driver install — real, and paid once.
Those are different numbers, and the parking note reported the second as if it
were the first.

**The genuinely permanent limit is one item, not four.** Live's audio output
device has no API in any route — not AbletonOSC, not an MCP server, not Max for
Live, not Ableton's own new Extensions SDK — because there is **no Preferences,
Settings, AudioDevice or Driver class anywhere in the Live Object Model**
(DOCUMENTED, §3.2). That is a fact about Live, not about our approach, and no
amount of re-plumbing moves it.

**On the owner's actual question — is an MCP server materially better?
No. It is the same Remote Script and the same Live Object Model with a different
wrapper.** Of fourteen projects examined, thirteen bottom out in a MIDI Remote
Script running in Live's embedded Python; two of those reach Live *through
AbletonOSC*, which is itself a Remote Script, so the OSC ones have one **more**
Remote Script in the path than we do, not fewer (DOCUMENTED, §3.2). MCP buys
typed, described, discoverable tools that a language model can plan against. It
buys no reach.

🔴 **The one thing that would materially lighten this rig is not a control
protocol at all — it is getting audio out of Live without BlackHole, and
something appeared in 2026 that does exactly that.** Ableton shipped **Link
Audio** in Live 12.4 (2026-05-05) — LAN audio streaming out of Live, 16-bit PCM,
with a public open-source SDK (`LinkAudio.hpp`, Link 4.0, GPLv2-or-later). It
removes BlackHole, the Multi-Output Device, the avfoundation device-index trap
and the one Preferences click with no API, in one move, officially. We run
Live **11**, so Live's built-in version is out of reach — **but a third party
ships it as a VST3/AU plugin** (`VoidLinkAudio`, GPL-2.0-or-later, updated
2026-08-29) that lists Ableton Live among its hosts and states no Live version
requirement of its own. Live 11 hosts VST3. **Whether that works is UNCONFIRMED,
it costs an afternoon, and it is §4's first item** — because if it works it
deletes the heaviest thing in this document on the Live we already own. §3.5.

A second, lower-ceilinged version of the same idea is already installed on that
Mac: **Audio Hijack 4.5.9** with Rogue Amoeba's **ACE 11.9.2** (MEASURED)
captures a named *application's* output without touching Live's audio device.
Same benefit, a paid closed-source dependency instead of an open one, and no
number behind it yet. §2.4.

---

## 1. Inventory — what is on that Mac, and what each thing is for

Machine: `MacBookPro.home`, macOS **26.6.2** (build 25G83), user
`kristjanjansen`, reachable as `ssh mbp` with a key. All MEASURED 2026-09-12.

### 1.1 The things this project put there

| thing | where | what it is for | in this repo? | survives a reboot? |
|---|---|---|---|---|
| **AbletonOSC** | `~/Music/Ableton/User Library/Remote Scripts/AbletonOSC` | the Remote Script that exposes Live's object model over OSC on UDP 11000/11001. Everything `live-osc.mjs`, `live-setup.mjs` and `live-check.mjs` say to Live goes through it. | **no** — a git clone of `https://github.com/ideoforms/AbletonOSC.git`, at commit `0ca6821`. Re-clonable, not vendored. | yes (a folder on disk) |
| **`browser.py`** | `…/AbletonOSC/abletonosc/browser.py` | our extension. AbletonOSC cannot load an instrument; a track with no device makes no sound however well the MIDI arrives. Adds `/live/browser/{roots,instruments,find,load}`. | **yes** — `rig/m1/abletonosc-ext/browser.py`, md5 `4a6a4ac0…` on **both**, byte-identical | yes |
| **the `view.py` hook** | `…/AbletonOSC/abletonosc/view.py`, +13 lines | registers `browser.py` from a module that `/live/api/reload` actually reloads, so adding it needs no Live restart. `manager.py` is not reloaded; `view.py` is. | **yes** — written by `abletonosc-ext/install-hook.py`; `git diff --stat` on the machine reads exactly `1 file changed, 13 insertions(+)` | yes |
| **`~/positron-rack/`** | four files: `live-check.mjs`, `live-osc.mjs`, `midisend.c`, `rack-agent.mjs` | the relay agent and its check, deliberately copied OUT of the repo clone so the agent can be started from a terminal without a checkout | **yes** — all four md5-identical to `rig/m1/` | yes |
| **`/tmp/midisend`** | 34,824 bytes, built 2026-09-11 20:33 | the CoreMIDI sender. Notes arrive on stdin, go out `IAC Driver Bus 1`. It exists because `brew`'s `sendmidi` refuses to build without a full Xcode and this machine has only the Command Line Tools. | **yes** — `/tmp/midisend.c` is md5-identical to `rig/m1/midisend.c`, and **`live-check.mjs` rebuilds it when missing**, so its survival does not matter | irrelevant by design |
| **`~/moq-rs-draft14/`** | 1.2 GB; `target/release/moq-relay-ietf`, 18 MB, built 2026-09-10 | the LAN MoQ relay — the measured 58 ms key→ear path. Not needed for `/able/`, only for playing. | no — a Rust build of a third-party tree | yes |
| **`~/lan-relay.sh`** | 2,544 bytes | mints the relay's certificate and runs it | **yes** — `rig/m1/lan-relay.sh` | yes |
| **leftovers in `/tmp`** | `pc-dev.txt`, `pc-mic.txt`, `pc-mic2.txt`, `pc-note.sh`, `pc-note.txt`, `pc-silence.txt`, `pc-done`, `pc-note-done` | scratch from the last `live-check.mjs` run. Nothing reads them between runs; each run deletes and rewrites. | n/a | irrelevant |

### 1.2 The things that were already there, and are not ours

Stating these explicitly, because three of them look like project dependencies
and are not — and because one of them (`Mosaiik`) is somebody's music.

| thing | where | evidence it predates this work |
|---|---|---|
| **Ableton Live 11 Standard 11.3.43** | `/Applications/Ableton Live 11 Standard.app` | built 2025-10-06; `Log.txt` records launches back to 2025-11. ⚠️ **Standard**, not Suite — `Licensing: [Variant=Standard]`, and `Licenses loaded:` is **empty** (MEASURED). This is the fact that closes the Max for Live route in §3.3. |
| **BlackHole 2ch 0.6.1** | `/Library/Audio/Plug-Ins/HAL/BlackHole2ch.driver` | `pkgutil --pkg-info audio.existential.BlackHole2ch` → `install-time: 1764686084` = **2025-12-02**, nine months before this project |
| **the Multi-Output Device** | `/Library/Preferences/Audio/com.apple.audio.SystemSettings.plist`, `MetaDevice.~:AMS2_StackedOutput:0` | `stacked: true`, master `BuiltInSpeakerDevice`, subdevices **MacBook Pro Speakers** (drift-corrected) + **BlackHole 2ch**. It is also the machine's current default output. UNCONFIRMED who created it; it is the standard recipe for "hear it and capture it at once". |
| **IAC Driver** | `~/Library/Audio/MIDI Configurations/Default.mcfg` | `devices:0` = `com.apple.AppleMIDIIACDriver`, `offline = 0`, one entity `Bus 1`. ⚠️ **Enabling it WAS ours** — the README records flipping `offline` with PlistBuddy — but the driver itself is Apple's and ships with macOS. Nothing was installed; a flag was turned over. |
| **the Arturia V Collection** | 41 VST3s in `/Library/Audio/Plug-Ins/VST3`, incl. `Stage-73 V2.vst3`, `Analog Lab V.vst3`; support in `/Library/Arturia` | pre-existing, licensed, and the subject of the README's RETRACTED section. Also Guitar Rig 7, Addictive Drums 2. |
| **`Mosaiik`** | `/Applications/Ableton Live 11 Standard.app/…/MIDI Remote Scripts/Mosaiik` — **inside the app bundle** | a third Remote Script occupying **Control Surface slot 1**, alongside AbletonOSC in slot 2. The owner's own band (`~/mosaiik` holds `mosaiik_live.mp3`). ⚠️ It lives inside the `.app`, so **a Live update deletes it**. Not ours, not to be touched, worth knowing about. |
| **Audio Hijack 4.5.9** + **ACE 11.9.2** | `/Applications/Audio Hijack.app`, `/Library/Audio/Plug-Ins/HAL/ACE.driver` (2023) | application-level audio capture, installed via `brew --cask audio-hijack`. A capture route we already own. See §2.4. |
| **Max 8.5.3** | `/Applications/Max.app` | standalone Cycling '74 Max. Separate from the Max runtime **8.5.8** that Live bundles at `App-Resources/Max/Max.app`. See §3.3 and §3.5. |
| **node v24.20.0, ffmpeg 7.1.5, cargo, rustc** | `/opt/homebrew/bin` | ⚠️ see §1.4 |
| other HAL drivers | Microsoft Teams Audio, Camo (Reincubate) | unrelated virtual devices that appear in every `-list_devices` listing and are why resolving by NAME matters |

### 1.3 Where Live's own Preferences actually live, and what they hold

There is no way to read Live's settings over any API, so this is read from
Live's log, which prints the whole table at every document exchange. All MEASURED
from `~/Library/Preferences/Ableton/Live 11.3.43/Log.txt`, last entry
**2026-09-11T21:29:46** (Live quitting):

```
AMidiIO: Midi Remote Scripts:
  MidiRemoteScript 1 [Control Surface="Mosaiik"    Input="None" Output="None"]
  MidiRemoteScript 2 [Control Surface="AbletonOSC" Input="None" Output="None"]
AMidiIO: Midi Devices:
  MidiInDevice  [Name="IAC Driver (Bus 1)", Track=true, Sync=false, Remote=false, …]
  MidiInDevice  [Name="Computer Keyboard",  Track=true, …]
  MidiOutDevice [Name="IAC Driver (Bus 1)", Track=false, …]
Audio In Out: Driver Type: CoreAudio
Audio In Out: Output Device: Multi-Output Device (0 In, 2 Out)
```

All three settings are stored in `Preferences.cfg` (35,958 bytes, an
undocumented binary — `grep -a AbletonOSC` on it returns **0**, so the name is
not stored as a literal string and the file is not somewhere to guess). The
proof that they persist is not the file, it is the log: the identical table
appears at 2026-09-10T22:31, again at 2026-09-11T17:13 **after a reboot**, and
again at quit.

⚠️ **This is the single most useful correction in the document.** "A Preferences
click with no API" is true and also almost irrelevant, because it is a click
that stays clicked.

### 1.4 Four traps found during the survey

**`ssh mbp <cmd>` cannot see node or ffmpeg.** MEASURED: `command -v node` over
a non-interactive ssh answers nothing, while `ssh mbp 'zsh -lc "which node"'`
answers `/opt/homebrew/bin/node`. `.zshrc` never adds `/opt/homebrew/bin`; the
login shell picks it up elsewhere. `live-check.mjs` already runs local commands
through `/bin/zsh -lc` and is therefore safe — but any new one-liner typed at
this machine will look like "node is not installed" when it is.

🔴 **`~/positron` on the M1 is STALE, exactly like `~/positron` on the box.** It
is a clone of a **local bare repo** `/Users/kristjanjansen/positron.git`, not of
GitHub, and its `rig/m1/` has **no `live-check.mjs`, no
`rack-agent.mjs`, no `midisend.c`, no `sweep.mjs`** (MEASURED). The README's
"bring it all back up" recipe opens with `cd ~/positron && git pull`, which
pulls from a bare repo on the same disk that nothing pushes to. The live copies
are the four files in `~/positron-rack/`. This is CLAUDE.md's
`/opt/positron-board` vs `~/positron` lesson in a second costume, and it will cost
somebody the same hour.

**There is no Live set.** MEASURED: no `.als` on the machine newer than
2025-11-23, and every one that exists is one of the owner's band projects
(`band1`, `_four`, `c`, `six`). The parking table's *"Ableton Live 11 open, with
this set loaded"* describes a file that does not exist — `live-setup.mjs`
configures **whatever document is already open**, and a default empty Live set
has the two MIDI tracks it needs. That makes the condition weaker and easier
than written, and it also means **nothing captures the fader value**: the README
asks for the 0.52 fader to be re-measured, and there is no saved set holding it.

**The last recorded run was a FAIL, and for the right reason.** `/tmp/pc-*.txt`
are dated 2026-09-11 21:50, twenty-one minutes **after** Live quit at 21:29.
They read: microphone `max_volume: -42.0 dB` / `mean_volume: -58.3 dB` — a real
room, so the capture was not deaf — and BlackHole `-91.0 dB` for both the
silence baseline and the held chord. That is the chain reporting, correctly,
that there was nothing playing. ⚠️ Anybody who re-runs the check on this machine
today gets the same, and it is not a regression: **Live is not running.**

---

## 2. A critical look — the setup "feels very heavy". Is it?

### 2.1 Separate two questions that the parking note ran together

**Cost to rebuild from nothing** and **cost to wake** are different numbers, and
only the second is paid repeatedly.

| | steps | can a script do it? |
|---|---|---|
| **rebuild on a bare Mac** | install Live; install BlackHole; build a Multi-Output; enable IAC; clone AbletonOSC; run `install-hook.py`; select AbletonOSC as a Control Surface; set Live's output device; copy four files | **5 of 9** — the four that cannot are installing Live itself, building the Multi-Output in Audio MIDI Setup, and the two Preferences clicks |
| **wake it for a session** | Mac awake · Live open · `M1_SSH=local node rack-agent.mjs --room pro-1` in a terminal | the third, and only the third, is ours to make nicer |

MEASURED evidence for the split is §1.3: the Control Surface, the IAC Track
toggle and the output device were all still set after a reboot, without anybody
re-clicking them. The heavy list is a **provisioning** list. The parking note
presented it as a **startup** list, which is why the rig reads heavier than it
is.

### 2.2 What is genuinely inherent, and it is one item

**Live's audio output device.** DOCUMENTED: the generated Live 11.0.0 API
reference (`https://nsuspray.github.io/Live_API_Doc/11.0.0.xml`, 96 classes)
contains **no Preferences, Settings, AudioDevice or Driver class at all**; the
word "preferences" appears exactly once in the whole document, as prose inside
`Application.control_surfaces` describing a read-only list. There is no
`audio_device`, no `driver`, no `buffer_size`. Corroborating, AbletonOSC's own
handler modules are `application, clip, clip_slot, device, handler,
introspection, midimap, osc_server, scene, song, track, view` — there is no
preferences module because there is nothing to wrap.

So this is not a gap in AbletonOSC and not a gap in our script. **Every route in
§3 hits the same wall**, including Ableton's own official Extensions SDK. Any
plan that proposes to "automate the last click" is proposing to write into an
undocumented binary and restart Live, and that is a worse instrument than a
click.

### 2.3 What is heaviness of our own making

Four items, and all four are ours rather than Live's — which is the only reason
they are worth listing:

- 🔴 **The agent must live in a login session.** This is real, permanent, and
  correctly diagnosed: a capture started over ssh reads −91.0 dB on a device
  that a capture in the session reads at −29.3 dB (MEASURED, README). But the
  README then over-generalises it into "this can never be a service". It cannot
  be an **ssh-started** service. macOS has a first-class answer for exactly this
  — a **user LaunchAgent** in `~/Library/LaunchAgents` with
  `RunAtLoad`/`KeepAlive`, which runs inside the logged-in user's session and
  therefore has the audio session the ssh path lacks. UNCONFIRMED whether TCC
  grants it microphone/input access unattended; that is one afternoon's
  measurement and it is the difference between "type a command every time" and
  "log in". The machine already has six LaunchAgents (Google, Postgres), so the
  mechanism is not exotic here.
- **The iTerm2 AppleEvent is a dependency we can drop and largely have.**
  `M1_SSH=local` already bypasses it (README, §"Two traps"), so `live-check`
  run by the agent needs no terminal to write into. The AppleEvent survives only
  for running the check **remotely**, which is the rarer case.
- **`/tmp/midisend` being a build artefact is fine** and should not be counted
  as an install: `live-check.mjs` copies the source and compiles it when it is
  missing. It is the only item in §1.1 that heals itself.
- **The 1.2 GB Rust relay tree is not needed for `/able/` at all.** It belongs
  to the playing path, not the readiness path. Listing it among the rig's
  dependencies makes the rig sound larger than the part anybody uses.

### 2.4 What a materially lighter arrangement looks like — three of them

The heaviest *permanent* item is the one with no API: Live's output device must
point at something a capture can read, which today means BlackHole inside a
Multi-Output Device, which means the click.

**Three arrangements remove it, in descending order of how much they would
change and ascending order of how sure we are.**

🔴 **First, and the reason §4 opens with it: get the audio out of Live as a
network stream instead of through a device.** That is Ableton **Link Audio**,
official since Live 12.4 (2026-05-05) with an open SDK — and possibly reachable
from Live 11 today as a third-party VST3. Live's output device then becomes
irrelevant to the rig entirely, because the audio never goes through it. The
full case, the sources and the honest UNCONFIRMED are in §3.5; it is mentioned
here so that the two cheaper ideas below are read as fallbacks rather than as
the plan.

**Second, application-level capture, which removes the same item, and is
already paid for.** Rogue Amoeba's Audio Hijack (4.5.9 on this machine, with ACE 11.9.2 in
`/Library/Audio/Plug-Ins/HAL/` since 2023 — MEASURED) captures the output of a
**named application**. Live's output device can then stay on the speakers, or on
anything, and nothing in Live's Preferences has to be touched to make the rig
capturable.

What that would buy, stated as a claim to test rather than a result:

- the output-device click leaves the provisioning list (ESTIMATED — it follows
  from capturing the app rather than the device, but has not been run here)
- the Multi-Output Device's drift correction leaves the path, and with it one
  resampling stage between Live and the capture (ESTIMATED)
- ⚠️ it adds a **paid, closed-source, third-party dependency with its own TCC
  and system-extension surface**, where BlackHole is free and open. That is a
  real trade and it is why this is a measurement, not a recommendation yet.

UNCONFIRMED and decisive: whether Audio Hijack can be **started and stopped from
a script** in a way this rig can use, and what it costs in latency against the
measured 58 ms key→ear. Rogue Amoeba's own scripting story is the thing to read
before anything is built.

⚠️ **A refinement that does not remove the click but does move it out of the
way.** Live's *track and master output ROUTING* — which channels of the current
audio device the signal leaves by — **is** in the Live Object Model
(`available_output_routing_types` / `output_routing_channel`), unlike the device
itself. So a **4-channel Aggregate Device** (speakers on 1/2, BlackHole on 3/4)
selected once in Preferences would make *where the sound goes* OSC-settable
afterwards, where today the Multi-Output sends it to both unconditionally. Same
number of clicks to provision, one more thing scriptable once provisioned, and
it would let a session switch between "monitor in the room" and "feed the
stream" without touching Live's window. ESTIMATED from the LOM's contents; not
built, not measured, and strictly a fallback if §3.5's route fails.

**Third, and the one nobody has said out loud: stop asking Live for audio at
all.** The README's own numbers make this worth saying plainly: Ableton costs about **29 ms
over the built-in synth** (29 → 58 ms key→ear, MEASURED), and everything heavy
in this document exists to get audio **out** of Live, not to get notes **in**.
The notes leg is a solved, cheap, fully-scriptable 7.5 ms. If the interesting
product is "play a machine in the next room", `rig/board` already does it with a
service that dials out on boot. If the interesting product is specifically
"**Ableton Live** is the instrument", then the audio path is the whole cost and
it is worth paying. That question has not been asked out loud and it should be
asked before any of §4 is built.

### 2.5 Is AbletonOSC the right route at all?

**Yes, and the survey strengthens rather than weakens that.** Three reasons, in
order of how much they matter:

1. **Nothing else reaches further.** §3 is the long version; the short version
   is that thirteen of fourteen alternatives are the same Remote Script plus a
   different wire format, and the fourteenth is narrower.
2. **It is measured here.** 0.063% worst clock error across four tempos, and
   `live-osc.mjs` already knows that OSC is UDP and a reply can simply not
   arrive — it retries rather than failing on one packet, which was learned from
   an actual lost `current_song_time`. A replacement starts that learning again.
3. **The one capability it lacked cost forty lines.** `browser.py` adds the
   browser, and that is genuinely the whole gap. The README's "why not
   ableton-mcp" reasoning was correct and the research confirms it for a reason
   the README did not know: `ahujasid/ableton-mcp` would put a **second** Remote
   Script in Live's Control Surface list beside AbletonOSC and `Mosaiik`, with
   its own TCP listener on `0.0.0.0:9877`.

The honest counter-argument, and it is not nothing: **AbletonOSC is a
third-party clone in a user folder with two local modifications and no lockfile
in this repo.** `browser.py` is vendored; the clone is not. A `git pull` there
could conflict with our `view.py` hook at any time. That is a real fragility and
§4 fixes it in one step.

---

## 3. The routes into Ableton Live, and what is actually behind each

Everything in this section was checked against primary sources on **2026-09-12**
— repository source, generated API references and Ableton's own pages — not
against summaries. URLs are given so the next reader can disagree with a source
rather than with me.

### 3.0 The one picture that answers most of the question

```
  a browser / an agent / a model
        │
        │  OSC · TCP JSON · WebSocket · MCP stdio · HTTP   ← this layer is where
        │                                                    every project differs
        ▼
  a MIDI Remote Script, in Live's embedded CPython 3.7
        │
        ▼
  the Live Object Model  ← this layer is where NOTHING differs,
        │                   and where Preferences does not exist
        ▼
  Ableton Live
```

Two things sit outside this picture and only two: **Max for Live**, which is a
different host with audio access (§3.3), and Ableton's **Extensions SDK**, which
is a new official host that is currently *narrower* than the LOM (§3.5).

### 3.1 AbletonOSC — what we use

**What it is** (DOCUMENTED, `https://github.com/ideoforms/AbletonOSC`): *"a MIDI
remote script that provides an Open Sound Control (OSC) interface … The
project's aim is to expose the entire Live Object Model API … using the same
naming structure and object hierarchy as LOM."* Install = copy the folder into
Live's `Remote Scripts`, select it as a Control Surface. Ports UDP **11000** in,
**11001** out.

**What is on our machine** (MEASURED): clone at `0ca6821`, plus `browser.py` and
the 13-line `view.py` hook. It vendors its own `pythonosc/` (upstream, tracked)
and rolls its own UDP server, with a comment saying why: *"Implemented because
pythonosc's OSC server causes a beachball when handling incoming messages."*

**Its health, since we depend on it.** DOCUMENTED, GitHub API 2026-09-12: **802
stars, MIT, badge `stability-beta`, last push 2025-11-19**, 70 open issues and
pull requests between them, and **no tagged releases at all**. MEASURED on the
machine: our clone's `master` is at `0ca6821`, *"Add issue templates"*, dated
**2025-11-19** — so **we are at upstream's head, and upstream has been quiet for
ten months.** That is the good news and the bad news in one line: nothing is
waiting to break us on the next pull, and nothing is coming either. With no
tags, *"which AbletonOSC"* can only be answered by a commit hash, and this repo
records none — which is why §4 item 2 exists.

🔴 **The number that explains the rig's whole architecture, MEASURED today from
`manager.py` on the machine: AbletonOSC polls its socket on a 100 ms tick.**

```python
def tick(self):
    """ Called once per 100ms "tick". """
    self.osc_server.process()
    self.schedule_message(1, self.tick)
```

So an OSC command to Live is quantised to that tick, which is
`_Framework/Defaults.py`'s `TIMER_DELAY = 0.1` — **10 Hz, not 100 Hz**. That is
harmless for *"load an instrument, arm the track, set monitoring"* and
disqualifying for *"play this note now"*. HANDOFF 0ab already says **"OSC arms
and reads; never put it in the timing path"**, and this is the mechanism.

⚠️ **CORRECTION to the obvious conclusion, and it matters: the 100 ms floor is
AbletonOSC's, not the host's.** Two things in Live's Python escape it, and both
are running in maintained code today:

- **`Live.Base.Timer(callback, interval, repeat)` takes its interval in
  MILLISECONDS.** `leolabs/ableton-js` runs
  `Live.Base.Timer(callback=self.socket.process, interval=1, repeat=True)` — a
  **1 ms** poll on Live's own timer. The millisecond unit is confirmed by
  Ableton's own decompiled Push 2 source
  (`interval=int(1000 * notification_time)`). COMMUNITY, but it is an existence
  proof rather than an opinion.
- **Daemon threads work.** `ahujasid/ableton-mcp` runs a `threading.Thread`
  accept loop and marshals every LOM call back with `schedule_message(0, …)`;
  `ableton-js` does the same. AbletonOSC's own comment says threading
  *"beachballs"*, its author conceded in July 2025 that *"this could be a
  gamechanger in terms of latency. I trialled threads many years ago, but back
  then (possibly Live 9?) they were not supported"*, and
  [issue #160](https://github.com/ideoforms/AbletonOSC/issues/160) **is still
  open**. So AbletonOSC is 100 ms-bound by a decision that was right once and is
  now stale. The rule is: **threads for I/O, never the LOM off the main thread.**

**This does not change where the notes go, and the reason is better than the one
we had.** Notes go over CoreMIDI not because OSC is slow but because **the Live
Object Model has no note-on at all** — AbletonOSC's own paper: *"the Live Object
Model interface does not expose any mechanism for triggering note-down events…
clients should still use MIDI"* (DOCUMENTED, NIME'23 §7.1). No wire format, no
thread and no timer changes that. `midisend.c` is not a workaround for a slow
protocol; it is the only door there is.

🔴 **And a trap worth recording: AbletonOSC stops dead whenever Live's main
thread stalls.** A user reported that simply **opening Live's top menu bar**
queues every request and then flushes them in a burst
([issue #121](https://github.com/ideoforms/AbletonOSC/issues/121), open). That
is indistinguishable from a network problem and it is neither.

⚠️ **It binds `0.0.0.0`, not loopback** (MEASURED, `osc_server.py`: *"By default,
binds to the wildcard address 0.0.0.0"*). Anything on the LAN can drive Live,
unauthenticated. That is a property to know about, not a bug to report — but it
is the same property flagged against `ahujasid/ableton-mcp` below, and it would
be unfair to name it there and not here.

### 3.2 🔴 MCP servers for Ableton — the owner's actual question

**Answer: packaging, not capability.** Fourteen projects were examined; thirteen
reach Live through a **MIDI Remote Script calling the Live Object Model**, which
is exactly what AbletonOSC is.

| project | what it talks to underneath | transport | stars · last push · licence |
|---|---|---|---|
| [`ahujasid/ableton-mcp`](https://github.com/ahujasid/ableton-mcp) | **its own Remote Script** (`_Framework.ControlSurface`) | TCP JSON **:9877** | 3031 · 2026-08-30 · MIT |
| [`Simon-Kansara/ableton-live-mcp-server`](https://github.com/Simon-Kansara/ableton-live-mcp-server) | **AbletonOSC** — i.e. a Remote Script | MCP → TCP :65432 → OSC :11000/11001 | 394 · **2025-03-26** (stale) · MIT |
| [`nozomi-koborinai/ableton-osc-mcp`](https://github.com/nozomi-koborinai/ableton-osc-mcp) | **AbletonOSC, plus its own patch to it** | OSC :11000/11001 | 10 · 2026-09-06 · MIT |
| [`bschoepke/ableton-live-mcp`](https://github.com/bschoepke/ableton-live-mcp) | own Remote Script with `exec`/`eval`, **plus a Max for Live audio-tap** | TCP :8765; M4L over UDP :17654 | 219 · 2026-07-25 · MIT |
| [`adamjmurray/producer-pal`](https://github.com/adamjmurray/producer-pal) | **a Max for Live device** (`Producer_Pal.amxd`) | HTTP/REST + MCP | 285 · 2026-09-12 · GPL-3.0 |
| [`xiaolaa2/ableton-copilot-mcp`](https://github.com/xiaolaa2/ableton-copilot-mcp) | `ableton-js`, whose `midi-script` is a Remote Script | WebSocket :39031 | 92 · 2026-07-29 · MIT |
| [`uisato/ableton-mcp-extended`](https://github.com/uisato/ableton-mcp-extended) | own Remote Script (ahujasid lineage) | TCP + UDP | 263 · 2026-05-07 · MIT |
| [`opendining/ableton-mcp-server`](https://github.com/opendining/ableton-mcp-server) | own Remote Script, **pure `exec(python_code)`** | TCP :16619 (loopback) | 1 · 2026-03-02 · MIT |
| [`Ziforge/ableton-liveapi-tools`](https://github.com/Ziforge/ableton-liveapi-tools) | own Remote Script, 220 tools | TCP JSON | 15 · 2026-09-09 · GPL-3.0 |
| [`wstierhout/ableton-live-mcp`](https://github.com/wstierhout/ableton-live-mcp) | own Remote Script; also offline `.als` parsing | local socket | 11 · 2026-09-05 · MIT |
| [`Pantani/ableton-mind`](https://github.com/Pantani/ableton-mind) | own Remote Script | TCP NDJSON :9876 | 5 · 2026-06-24 |
| [`t1merickson/next-live-mcp`](https://github.com/t1merickson/next-live-mcp) | **Ableton Extensions SDK** — not a Remote Script | HTTP :20808, bearer token | 0 · 2026-09-08 · MIT |
| [`itsuzef/ableton-mcp`](https://github.com/itsuzef/ableton-mcp) | ahujasid fork | TCP | 15 · 2025-05-07 · MIT |
| [max4.live MCP](https://max4.live/mcp/) | **nothing in Live** — a catalogue search over M4L devices | hosted | n/a |

Registries list ~20 more (`glama.ai/mcp/servers?query=ableton`,
`pulsemcp.com/servers?q=ableton`); a spot-check of six found the same
architecture each time. A useful third-party survey:
`https://www.mslinn.com/av_studio/ableton-mcp-options.html`.

**The decisive detail is in the OSC-based ones.** `nozomi-koborinai/ableton-osc-mcp`
ships a **patch to AbletonOSC's Remote Script** because stock AbletonOSC does not
expose `Browser.load_item()` — the same gap `browser.py` fills here, solved the
same way, and its README notes a **full Live restart** is needed where our
`view.py` hook needs none. So the "OSC MCP" route is: our exact stack, plus an
MCP process, plus a patch we already wrote, minus the reload trick.

**What MCP genuinely buys, stated fairly.** `ahujasid/ableton-mcp` exposes **37
named tools** with typed arguments and descriptions — `create_midi_track`,
`add_notes_to_clip`, `load_instrument_or_effect`, `get_browser_tree`,
`duplicate_to_arrangement`, `create_locator` … That is a discovery and planning
surface for a language model, and building it by hand over OSC is real work. If
the goal were *"let a model compose in Live"*, this is the thing to use. It is
not the goal here: `/able/` asks nine yes/no questions and `play.html` sends
notes.

⚠️ **Three things to weigh before installing one anyway.**
1. **Telemetry is on by default** in `ahujasid/ableton-mcp`, and its README says
   the collection includes *"Prompts, MIDI notes, track and clip names, and
   device settings"* — not anonymous counters. Opt out with
   `ABLETON_MCP_DISABLE_TELEMETRY=true`.
2. It **binds `0.0.0.0:9877`** with no auth — same exposure as AbletonOSC's
   11000, doubled rather than replaced, since it would sit **beside** AbletonOSC
   and `Mosaiik` in a Control Surface list that has seven slots.
3. Two projects (`opendining`, `bschoepke`) hand the model `exec`/`eval` inside
   Live's interpreter. That is a genuine capability increase — arbitrary Python
   in Live's process, able to `import os` — and a genuine remote-code-execution
   surface on whatever port they listen on.

**Does any of them reach Live's Preferences? No, and the LOM has no such
object.** DOCUMENTED from the generated Live 11.0.0 API reference
(`https://nsuspray.github.io/Live_API_Doc/11.0.0.xml`, 96 classes): no
Preferences / Settings / AudioDevice / Driver class; `audio_outputs` and
`midi_outputs` belong to Max devices and Chains, not to Live's Preferences; the
only `sample_rate` is `Sample.sample_rate`. Track input/output **routing** is in
the LOM (`RoutingType`, `available_input_routing_types`) — that chooses among
ports Preferences has already enabled, which is precisely the distinction
`live-setup.mjs` lives on.

**Plugin parameters are gated by Live, not by the protocol — and the popular
version of this claim is wrong in a specific way.** Parameter *naming* is
fine: `DeviceParameter` carries `name` and `original_name` alongside `min`,
`max`, `value`, `is_quantized` and `automation_state`, and `PluginDevice` carries
`parameters`, `presets` and `selected_preset_index`. What is gated is **which**
parameters appear at all: Live auto-populates a plug-in's parameter list only up
to `-_PluginAutoPopulateThreshold`, **default 64, maximum 128**
(`https://help.ableton.com/hc/en-us/articles/6003224107292`), and beyond that a
human adds them through Live's *Configure* mode in the UI. Ableton also notes
that *"certain plug-ins may have parameters which aren't exposed to Live's
configure screen"* (`https://help.ableton.com/hc/en-us/articles/209067009`). So
an agent sees exactly what a hardware controller would see, and **no MCP server,
no OSC bridge and no Max for Live device changes that** — the paper says the
limitation *"applies in the same way to Max For Live devices"* (NIME'23 §6.2).
⚠️ There is also no way to open or close a plug-in's window from the LOM;
"Device/Plug-in Show/Hide" is an open AbletonOSC feature request from
2026-01-14, which is what an absent API looks like from outside.

### 3.3 Max for Live — what it reaches, and what it costs

🔴 **It is the same Live Object Model — and M4L sees a FILTERED SUBSET of it,
not a superset.** The clearest published statement is in AbletonOSC's own
peer-reviewed paper: *"Remote Scripts effectively provide comprehensive access
to the Live Object Model, in just the same manner as Max For Live."*
(DOCUMENTED — Daniel Jones, *AbletonOSC: A unified control API for Ableton
Live*, NIME'23 §3, `https://nime.org/proceedings/2023/nime2023_60.pdf`.) The
sharper version comes from Live's own bundle: **Max for Live's bridge is itself
a Remote Script** — `MIDI Remote Scripts/_MxDCore/` — which does `import Live`
and then applies an explicit whitelist, `EXPOSED_TYPE_PROPERTIES`, with root
keys `this_device / control_surfaces / live_app / live_set` and per-property
version gating. Anything not in that dictionary is invisible to a Max for Live
device and still reachable from a Remote Script (COMMUNITY, from the decompiled
`_MxDCore/LomTypes.py`). So *"M4L would give us a bigger API"* is not merely
unsupported; it is backwards.
Cycling '74's LOM reference (`https://docs.cycling74.com/apiref/lom/`) lists the
same classes and has no Preferences class either; on Live's audio buffer a
Cycling '74 forum answer is blunt — *"The Live preference settings are not
accessible from M4L"* (COMMUNITY,
`https://cycling74.com/forums/live-audio-driver-buffer-io-size`). The VST
"Configure" limitation applies identically: the paper says it *"applies in the
same way to Max For Live devices"* (§6.2), and so does the absence of a
note-trigger — *"the Live Object Model interface does not expose any mechanism
for triggering note-down events… clients should still use MIDI"* (§7.1), which
is `midisend.c`'s existence justified by the upstream author.

**What M4L genuinely adds over a Remote Script — three things, all real:**

| capability | what it is | source |
|---|---|---|
| **audio signal access** | `plugin~`/`plugout~` hand the device its track's audio, up to 2 channels. A Remote Script has none — the LOM has no audio and no metering at all. | DOCUMENTED, `https://docs.cycling74.com/userguide/m4l/live_audiodevices/` |
| **`live.remote~`** | parameter writes applied *"sample-accurately (if sent by the audio thread of Max) with a constant latency of a single audio buffer"*, with no undo steps created. There is no Remote Script equivalent. | DOCUMENTED, `https://docs.cycling74.com/reference/live.remote~` |
| **sitting in the MIDI chain** | a M4L MIDI effect is in the signal path; a Remote Script is beside it | DOCUMENTED |

**What a Remote Script has that M4L does not**, and it is why AbletonOSC is one:
arbitrary Python in Live's process — sockets, threads, files, persistence across
sets, and **no device on any track**. The paper calls this *"an invisible
interface that is installed once"* (§2).

**The price, and what this machine's licence says.** Live 12 Standard is
**EUR 279**, Suite **EUR 599**, and the **Max for Live add-on EUR 149** — with a
**EUR 79 crossgrade** for owners of Live Standard plus a standalone Max licence
(DOCUMENTED, `https://www.ableton.com/en/shop/` and
`https://www.ableton.com/en/live/compare-editions/`, read 2026-09-12). ⚠️ This
machine runs **Live 11 Standard** with an empty `Licenses loaded:` list
(MEASURED, §1.2), so M4L is a purchase, not a setting — but `/Applications/Max.app`
(Max 8.5.3) is installed, so **the EUR 79 crossgrade may apply**. UNCONFIRMED
whether that Max is licensed; it is worth thirty seconds of looking before
anyone quotes EUR 149.

🔴 **And M4L would not solve the problem it looks like it solves.** The reason to
want it here is *"tap Live's audio without BlackHole"*, and the answer is no:

- **Max has no signal-rate network object.** `udpsend~`/`netsend~` are Pd, not
  Max; Max's `udpsend` is message-rate. Max 9's what's-new page lists **zero**
  networking additions.
- **No WebSocket object, no WebRTC object, no Opus/AAC encoder.**
- **Node for Max cannot carry audio.** Cycling '74's Florian Demmer, verbatim:
  *"node.script currently has no support to pipe audio streams in or out of
  node."* (DOCUMENTED,
  `https://cycling74.com/forums/audio-stream-to-max-with-node-js`.)
- **Cycling '74's own streaming advice is to install BlackHole.** *"examples for
  virtual AudioDrivers on OSX would be BlackHole or Loopback"* (DOCUMENTED,
  `https://cycling74.com/tutorials/tips-for-streaming-your-max-patch`).

A search of maxforlive.com found **no maintained device that streams Live's
audio out over a network** — only inbound ones and a dead 2011 Icecast device on
a 32-bit Pd external. That absence is the finding.

What M4L *can* do without BlackHole is **write a file** (`plugin~` →
`sfrecord~`, WAV/FLAC/OGG/raw, 1–64 ch — DOCUMENTED,
`https://docs.cycling74.com/reference/sfrecord~/`), which is a recorder, not a
live path. `bschoepke/ableton-live-mcp` ships exactly that as `AgentAudioTap.amxd`
and it is the only MCP project in §3.2 with any audio at all.

⚠️ **And M4L's threading is worse for this job, not better.** In a M4L device,
Overdrive and Scheduler-in-Audio-Interrupt are forced ON and the signal vector is
fixed at 64, none of it adjustable — so the Max scheduler runs *inside the audio
interrupt*, and a blocking network send is a dropout risk in a way it is not in
standalone Max (COMMUNITY but consistent,
`https://cycling74.com/forums/scheduler-in-max-for-live-questions-overdrive-audio-interrupt-task-objects-etc`).
Jitter objects are worse still: *"Jitter in M4L operates in Ableton Live's
interface update thread"* and is interrupted by redraws (DOCUMENTED,
`https://docs.cycling74.com/userguide/m4l/_m4l_overview/`).

**Verdict: EUR 149 buys audio access, `live.remote~` and a place in the MIDI
chain. It does not buy a wider API, it does not buy lower control latency by any
measured amount, and it does not get us off BlackHole.** Do not buy it for this.

### 3.4 Live's own Python — what the Remote Scripts API actually is

This is the layer everything else in §3 sits on, and the owner asked for it
properly, so here it is measured rather than described.

**What it is.** A "MIDI Remote Script" is a Python package that Live imports at
startup and instantiates as a **Control Surface** — the mechanism written for
hardware like Push and the APC, and the only general-purpose extension point
Live has had for fifteen years. Live 11 Standard ships **143** of them inside
the app bundle (MEASURED — `ls` of
`/Applications/Ableton Live 11 Standard.app/Contents/App-Resources/MIDI Remote Scripts/`),
from `_Framework` and `_Generic` through `APC40`, `Push2`, `Faderport`. A user
script goes in `~/Music/Ableton/User Library/Remote Scripts/<Name>/` with an
`__init__.py` exposing `create_instance`, and is enabled by choosing its name in
**Preferences → Link/Tempo/MIDI → Control Surface**. There are **seven slots**
(MEASURED, from Live's log); this machine uses two.

⚠️ **It is not a documented API, and Ableton's position is unusually clear about
that without ever quite saying it.** Ableton has never published a Remote Script
SDK. It *does* name "the Python API" in its own release notes (e.g. *"Fixed a
crash that occurred when zooming the Arrangement View via the Python API"*,
Live 12 release notes) and fixes API bugs release after release — while its help
pages say *"We cannot provide technical support for remote scripts not included
with Live"* (`https://help.ableton.com/hc/en-us/articles/209072009`). The
community reference (`https://midiremotescripts.structure-void.com/`) is built
from **decompiled** built-in scripts plus Cycling '74's LOM documentation; its
own front matter reads *"NO support given, ONLY source files… Don't contact
Ableton for support about this repository."* The `liaplugin` article concedes
the same point (§3.6). This is a real risk to carry consciously: the thing this
rig stands on is reverse-engineered, and Ableton owes it nothing.

Three framework generations coexist in one install — `_Framework` (the Live
9–11 lineage, which AbletonOSC uses), `ableton.v2.control_surface`, and
`ableton.v3.control_surface` (declarative, what Ableton's own new devices use).
Worth knowing only so that a copied example from the wrong generation is
recognised as such rather than debugged.

**Which Python — MEASURED two ways, and the answer for Live 11 is CPython 3.7:**

- Live writes its own bytecode cache beside our source, and the filenames are
  the version: `~/…/AbletonOSC/abletonosc/__pycache__/browser.cpython-37.pyc`,
  `view.cpython-37.pyc`, and twelve more.
- The stdlib shipped in the app bundle carries the matching magic number:
  `xxd -l 4 …/App-Resources/Python/lib/abc.pyc` → `420d 0d0a`, and `0x0D42` =
  3394 = the Python **3.7** bytecode magic.

There is a **second, legacy CPython 2.7** in the bundle
(`App-Resources/Python2/`, magic `03f3 0d0a` = 62211), but it belongs to
`abl.webconnector` — Live's account/licensing web layer — not to Remote Scripts.

For anyone reading this later: **Live 12.0 was still 3.7**, and **Live 12.1
onward is CPython 3.11.6** — Ableton's own release notes, which is one of the
few places it documents any of this: *"The embedded Python interpreter has been
updated to version 3.11.6. Because of this, remote scripts that use compiled
byte code (.pyc) need to be recompiled using this Python version to work
properly with Live 12.1."* (DOCUMENTED,
`https://www.ableton.com/en/release-notes/live-12/`.) The second-order
consequence is that 3.11's zero-cost exception tables and adaptive interpreter
**broke every decompiler**, so the community reference that makes Remote Scripts
learnable at all is markedly better for Live 11 than for Live 12
(`https://midiremotescripts.structure-void.com/`). It is also CPython with
Boost.Python underneath — the `Live` module's runtime docstrings leak
`boost::python::api::object` signatures.

**What that interpreter can do — MEASURED by looking at what is in the bundle**
(`App-Resources/Python/lib`, 197 entries, all `.pyc`, plus a `site-packages`
holding only `future-0.18.3` and `raven-6.10.0`):

| module | present? | why it matters |
|---|---|---|
| `socket` | **yes** | this is the whole game — AbletonOSC binds a UDP socket from inside Live |
| `threading`, `queue` | **yes** | |
| `json`, `struct`, `logging` | **yes** | |
| `asyncio`, `ssl`, `http`, `urllib`, `subprocess`, `sqlite3` | **yes** | a Remote Script could make an HTTPS request or spawn a process |
| **`ctypes`** | **NO** | the usual escape hatch into system frameworks is absent — so "call CoreAudio from inside Live to set the output device" is not available either |

⚠️ **There are no `.so` files anywhere in that Python tree** (MEASURED,
`find … -name "*.so"` returns nothing), so the C extension modules are linked
into the Live binary and **`pip install` is not a thing that can work**. A
Remote Script's dependencies must be pure Python and vendored — which is exactly
why AbletonOSC carries its own `pythonosc/` folder in-tree, and why
`leolabs/ableton-js` hand-rolled WebSocket framing rather than take a
dependency.

**How far that stretches, as an existence proof rather than a theory:**
`ableton-js`'s Remote Script runs a **WebSocket server and a static HTTP server
inside Live**, on `127.0.0.1:39031`, with optional password authentication —
built from the standard library alone (COMMUNITY,
`https://github.com/leolabs/ableton-js`, 524★, pushed 2026-09-11). So *"a
browser talks to Live directly, with no node process and no OSC in between"* is
a thing that already exists and could be copied. Worth knowing before anybody
designs a new bridge from scratch.

**The limits that actually bite:**

1. **It runs on Live's main/UI thread**, and blocking that thread freezes Live —
   `time.sleep` in a handler is a hung DAW. AbletonOSC sets its socket
   non-blocking (`self._socket.setblocking(0)` — MEASURED) precisely for this.
2. **The default cadence is 10 Hz, and it is escapable — see §3.1's
   correction.** `_Framework/Defaults.py` sets `TIMER_DELAY = 0.1`, so
   `schedule_message(n, …)` counts 100 ms ticks; but `Live.Base.Timer`'s
   interval is in **milliseconds** and daemon threads do work in Live 11.
   AbletonOSC has not taken either. Its author's published numbers on the old
   cadence: over ~100 queries/second is fine, over ~200 the latency is audible
   (NIME'23 §7).
3. **There is no timing guarantee at all.** Everything is best-effort on a UI
   thread that Live can stall. `ableton-js` ships a watchdog that logs
   *"Ableton Live's main thread is lagging, delta: N ms"* when its 100 ms tick
   slips past 200 — an admission worth copying.
4. **It cannot reach Preferences** — §2.2 and §3.2. Not the audio device, not
   the MIDI port enables. Not because the Python is limited but because the LOM
   has no such object. ⚠️ One thing looks like an exception and is not:
   `c_instance.preferences(key)` gives a script **its own private persistent
   blob**, pickled into Live's preferences file. That is storage for the script,
   not access to Live's settings panes.
5. **It cannot touch audio.** `Live.Sample` exposes `file_path`, `length` in
   frames, `sample_rate`, `gain`, markers, slices and warp data — **no PCM
   accessor, and no audio-rate callback anywhere**. That is M4L territory
   (§3.3).
6. **Errors land in `Log.txt`**, at
   `~/Library/Preferences/Ableton/Live 11.3.43/Log.txt` — every `logging` call
   from a script is prefixed `info: Python:`, which is how this survey read back
   `INFO:abletonosc:… Setting property for track: volume` from 2026-09-11
   (MEASURED). The file is 4.5 MB and is the only debugger there is. Three
   distinct failure shapes, and they are not interchangeable: an exception **at
   import** makes the script vanish from the Control Surface dropdown entirely;
   an exception **in a callback** is caught at the C++ boundary and logged, so
   the script survives but may be left wedged mid-operation; and an exception
   **in a `Live.Base.Timer` callback stops the timer** — Ableton's own
   docstring says so, and a stopped timer is a script that is loaded, selected,
   and silently doing nothing.
7. **Reloading is partial, and we depend on knowing exactly how.**
   `/live/api/reload` calls `clear_api()` then `init_api()` and re-imports
   `abletonosc/*` — but **not `manager.py`**. `browser.py` is registered from
   `view.py` for that reason and needs no Live restart; a handler added to
   `manager.py`'s list would.
8. ⚠️ **macOS's Local Network permission applies to Live, not to us.** Live has
   to be allowed under System Settings → Privacy & Security → Local Network to
   reach other machines; a script's own socket traffic rides in Live's process
   and is subject to the same grant. DOCUMENTED for Link
   (`https://help.ableton.com/hc/en-us/articles/209073069`), UNCONFIRMED as
   applied specifically to Remote Script sockets — but it is exactly the shape
   of failure that reads as "the script is broken".

**The rest of the family, for completeness.** LiveOSC / LiveOSC2 / NSLiveOSC are
the Python-2 ancestors AbletonOSC calls its *"spiritual predecessor"* — dead,
they will not load in Live 11+. `leolabs/ableton-js` is a Remote Script with a
Node client and an in-Live WebSocket server (and is what `ableton-copilot-mcp`
uses). **ClyphX Pro** (nativeKONTROL, sold through Isotonik) is a commercial
Remote Script that adds a *scripting language* of named Actions triggerable from
clips, locators and MIDI — updated for Live 12.1 and Python 3; the price is
second-hand and should be checked rather than quoted. **Bome MIDI Translator
Pro** is not in this family at all: it is a rule engine outside Live with no LOM
access, so it can only do what MIDI mapping can do. **TouchOSC** likewise
reaches Live through an OSC→MIDI converter unless you pair it with AbletonOSC.
And Ableton's own **Max for Live Connection Kit**
(`https://github.com/Ableton/m4l-connection-kit`) ships official OSC Send /
Monitor devices — the closest thing to an Ableton-blessed OSC route, but it
lives in a set rather than in the application. **Everything in this paragraph
except Bome is the same door.**

**Is there anything official and new?** One thing, and Ableton says in its own
FAQ that it is not a Remote Script replacement. The **Extensions SDK** (§3.5)
explicitly *cannot* do real-time audio processing, real-time MIDI processing or
monitoring, devices in the chain, *"background processing during playback or
recording"*, *"performance tasks requiring sample-accurate or event-accurate
timing"*, or *"real-time interaction with transport, such as reacting to
playhead position"* — and Ableton's own sentence about what to use instead is
*"Real-time and performance-oriented tools can be created and customized using
Max for Live."* (DOCUMENTED,
`https://help.ableton.com/hc/en-us/articles/27303428331420`.) **Remote Scripts
remain undocumented, unsupported and unreplaced**, and for anything that has to
happen while music is playing they remain the only door.

### 3.5 Web technology inside Live — and the two things that arrived in 2026

**Short answer: not really, on this machine. Genuinely yes, on Live 12.** This is
the section where the version of Live installed decides the answer, so it is
worth being exact about which is which.

#### What exists on Live 11 (what we have)

**`jweb` — a Chromium, but a 2021 one.** Max's `jweb` embeds the Chromium
Embedded Framework, *"in a separate process from the rest of Max"* (DOCUMENTED,
`https://docs.cycling74.com/userguide/web_browser/`). The CEF version is set by
the bundled Max, and Live 11.3.43 bundles **Max 8.5.8** (MEASURED —
`App-Resources/Max/Max.app` reports `8.5.8`), which is **CEF 96 / Chrome 96**.
That has WebSocket, WebRTC, Web Audio, WebMIDI and WebAssembly; it does **not**
have WebTransport or WebGPU. The Max↔page bridge is message-only —
`window.max.outlet()`, and *"Messages from jweb via `outlet` will always be
handled on the low-priority queue"* — so **there is no binary or audio path
between the page and Max**.

It also needs Max for Live to exist at all, which this machine does not have
(§3.3), and it carries three community-reported problems worth knowing before
anybody spends a day on it: WebGL stops working once a device leaves the Max
editor and runs in Live's chain (unresolved,
`https://cycling74.com/forums/jweb-limitations-behavior-in-m4l`, Jan 2025); a
`jweb` device initialised at Live launch crashed *"100% reproducibility"* on
Live 11.3.3, reproduced by a second user and never resolved
(`https://cycling74.com/forums/crash-at-launch-with-any-max-for-live-pluging-with-cef-in-them-percent100-reproducibility`);
and a **frozen** M4L device cannot load its own HTML into `jweb` at all, which
is a distribution blocker
(`https://github.com/h1data/M4L-jweb-injection`). All COMMUNITY.

**Node for Max** does run a real Node process with the full standard library —
sockets, npm packages — and it works **inside M4L devices** with bundled
`node_modules` since Max 8.0.3 (DOCUMENTED,
`https://docs.cycling74.com/reference/node.script`). Live 11's Max 8.5.x ships
**Node v16.6**. And it hits the same wall: **no audio**, staff-confirmed (§3.3).

#### What arrived in 2026 — official, Live 12, and one possible way round that

🔴 **Ableton Link Audio — the official "audio out of Live over a LAN", with an
open SDK.** Shipped in **Live 12.4 on 2026-05-05**: *"Link Audio, letting you and
your peers stream audio between Link Audio-enabled devices on a local network in
real time"*, appearing *"directly as an input"*, with automatic latency
compensation (DOCUMENTED,
`https://www.ableton.com/en/blog/live-12-4-is-coming/`). The SDK is public and
open: `LinkAudio.hpp` landed in **Link 4.0.0 beta 1 (2026-02-10)**, Link 4.0
released 2026-05-04, **dual-licensed GPLv2-or-later / commercial**
(`https://github.com/Ableton/link`). The format is **interleaved 16-bit signed
PCM**, mono or stereo; a receiver makes a `LinkAudioSource` and gets a callback
on a Link-managed thread.

Three honest limits: it is **LAN only** — Peter Kirn, CDM, 2026-02-10: *"this
does not work with audio from another location over the Internet"*
(`https://cdm.link/ableton-live-12-4-adds-link-audio-updated-effects-hands-on-details/`);
**a browser cannot receive it**, because it is UDP on a LAN rather than
WebSocket or WebRTC, so a native bridge is required; and it is **not
sample-accurate** — Julien Bayle's own caveat is that *"Link Audio adds a small
jitter-compensation buffer, so it's not sample-accurate for tight feedback or
FM-style abuse"*.

**Why this matters more than anything else in §3:** it is the only route that
removes **BlackHole, the Multi-Output Device and the one Preferences click with
no API** in a single move, from Ableton, officially, with source. A ~100-line
C++ receiver against `LinkAudio.hpp` writing raw PCM to stdout is exactly the
shape of `midisend.c`, which this repo already maintains for the same reason on
the MIDI side.

⚠️ **And there is a version of it that might work on Live 11, which is the
single highest-value thing to test.** `VoidLinkAudio` (Julien Bayle / Structure
Void, **GPL-2.0-or-later**, updated **2026-08-29**,
`https://structure-void.com/tools/void-ableton-link-audio/`) ships Max and Pd
externals, TouchDesigner CHOPs, VCV Rack modules, an openFrameworks addon **and
`VoidLinkAudioSend` / `VoidLinkAudioReceive` as VST3/AU plugins**, listing
*"Reaper, Bitwig, Logic Pro, Cubase, Studio One, FL Studio, Ableton Live, etc."*
as hosts. The page states *"Ableton Live 12.4 and above"* for **Link Audio**
— i.e. for Live's built-in feature — and states **no version requirement for the
plugins**. Live 11 hosts VST3. So *"does `VoidLinkAudioSend` on Live 11's Master
track stream to a receiver on this LAN?"* is **UNCONFIRMED, cheap to answer, and
if the answer is yes it deletes the heaviest item in this document on the
version of Live we already own.** Its own claim is *"sub-frame latency at
48 kHz"* — a vendor claim, unverified, and exactly the sort this project
measures rather than quotes.

**Ableton Extensions SDK — official JavaScript, and not for this.** *"The
Ableton Extensions SDK lets you extend Ableton Live using modern JavaScript and
TypeScript"* (DOCUMENTED, `https://ableton.github.io/extensions-sdk/`), built on
**Node.js**, announced 2026-06-02
(`https://www.ableton.com/en/blog/introducing-extensions-sdk/`). Three facts
close it for this rig:

1. **Live 12 Suite Beta 12.4.5 or later only** — *"Extensions are not available
   in Live Standard, Intro, or Lite"*, and *"It does not work with any earlier
   version of Live."*
2. **It is run-once, from a right-click.** Ableton's own words: *"Triggering an
   extension causes it to run once, performing its task which returns a result
   or applies changes, then stop."* That is batch tooling, not a control
   surface. (⚠️ `t1merickson/next-live-mcp` claims to run an MCP server *inside*
   Live on this SDK over HTTP :20808 — that is in tension with the run-once
   model, and is UNCONFIRMED.)
3. **It is narrower than the LOM, not wider, and Ableton says so itself.** The
   FAQ lists as impossible: real-time audio processing, real-time MIDI
   processing or monitoring, devices in the chain, *"background processing
   during playback or recording"*, *"performance tasks requiring sample-accurate
   or event-accurate timing"*, and *"real-time interaction with transport"* —
   with the recommendation to use Max for Live for those instead (DOCUMENTED,
   `https://help.ableton.com/hc/en-us/articles/27303428331420`). A third-party
   capability map adds transport, clip and scene launch, track routing,
   metering, third-party VST/AU loading, browser access, automation envelopes
   and **change events** — every read is a synchronous getter. No Preferences
   either.

**A JavaScript audio plugin Live can load? No.** Live supports VST2, VST3 and AU
only — **not CLAP**; the community CLAP registry `https://clapdb.tech/` (~530
entries, updated 2026-09-02) does not list Live at all. CLAP has a draft webview
extension (`clap.webview/3`, shipped in CLAP 1.2.7, 2025-11-26) that **no
shipping DAW implements on the host side**. WebAssembly DSP in a plugin is real
but not shippable: the serious route is `free-audio/web-clap` plus
`WebCLAP/wclap-bridge`, an **11-star** project whose own README says *"Only been
properly tested on MacOS"* and warns the audio thread *"may block"*.

What **is** mature is **web tech for the GUI over native DSP** — JUCE 8's WebView
UIs (2024-04-08), Tracktion's header-only `choc::ui::WebView`, iPlug2, and
Elementary Audio, whose own documentation is explicit that the JavaScript builds
a graph and *"native audio processing nodes"* render it. React-JUCE/Blueprint is
abandoned (last real commit 2022-04). **In every one of these, the DSP is C++ or
Rust and only the interface is web tech.** So the honest answer to *"can we ship
a web-tech device inside Live"* is: **not on Live 11, and on Live 12 only as a
GUI.**

### 3.6 The article the owner linked — `liaplugin.com`, "How to control Ableton with AI" (2026-03-23)

`https://liaplugin.com/blog/how-to-control-ableton-with-ai-2026/`, read
2026-09-12. It is a vendor blog on the site of the product it ranks first, and
it should be read as one — but it is not dishonest, and two of its paragraphs
are more accurate than a lot of what surrounds them.

**What it gets right.**

- Its five-way split — LIA, a MIDI-generating VST, Max for Live devices, MCP
  servers, custom Remote Scripts — is the right taxonomy, and it puts them in
  the right order of effort.
- It states the Max for Live licence requirement correctly: *"Ableton Live Suite
  (which includes Max for Live) or the Max for Live add-on."* That is the fact
  that closes the route on this machine (§3.3).
- It describes Remote Scripts accurately, including the part most write-ups
  skip: *"Ableton Live loads Python scripts from a specific directory at
  startup. These scripts can register as control surfaces and receive callbacks
  when the session state changes"*, and it concedes the API is *"undocumented
  (or partially documented)"*. That is true (§3.4) and it is the honest framing.

**What it is selling, and where the table tilts.** The comparison table scores
LIA `1/5` difficulty with `Full` DAW control and `~2 minutes` setup, against
`4/5` and `30-60 minutes` for an MCP server — with the two rows' *capability*
columns identical. So the whole argument is setup time, and the product wins its
own table on the axis it chose. Pricing is €24.99/month for the paid tier (from
`https://liaplugin.com/`, read 2026-09-12), against `Free (open source)` for the
MCP row it is beating.

⚠️ **What it does not say is the thing this document cares about.** *"LIA
connects to Ableton through a lightweight application called LIA Bridge"* …
*"No DAW plugin, Python setup, or config files."* It never says what the bridge
**is**. There are only three doors into a Live session — a MIDI Remote Script, a
Max for Live device, or Ableton's Extensions SDK (Live 12 Suite beta only) — so
unless it is driving Live's user interface by accessibility automation, the
bridge goes through the same Live Object Model as everything in §3.2, and the
"no Python setup" claim is about **the user's experience of installing it**, not
about the mechanism. UNCONFIRMED, and the article gives a reader no way to check.

**Does anything in it beat what we have? No.**

- The capability column it awards itself is the LOM, the same as ours.
- It makes no latency claim that could be compared: *"The impact is minimal.
  LIA's bridge runs as a separate process with negligible impact on Ableton's
  audio performance"* — that is about CPU, not about control latency, and no
  number is given anywhere. Ours are a 100 ms Remote Script tick (§3.1) and
  7.5 ms on the CoreMIDI path that exists beside it, because the Live Object
  Model has no note-on at all.
- It is chat-to-DAW for composing. This rig is note-to-sound for playing. They
  do not overlap: nothing in the article addresses getting audio **out** of Live,
  which §2 identifies as the entire remaining cost.
- Its pricing model puts a **monthly subscription and a cloud round trip** into a
  path whose whole point is a direct peer link that measured 6.00 ms.

**One thing in it IS worth acting on**: it names `Producer Pal`, which is the
Max for Live–based project in §3.2's table and the only widely-used one that is
not a Remote Script. If the M4L question is ever reopened, that is the reference
implementation to read.

---

## 4. If it is picked up again — what to do, in order

Ordered by *how much each one changes the shape of the rig per hour spent*, not
by how interesting it is. The first item can delete §2's one permanent blocker
outright; the last two are tidying. Nothing after item 1 should be designed
around until item 1 has an answer.

### 4.1 The order

**1. Answer the one question that changes the architecture: does
`VoidLinkAudioSend` work as a VST3 in Live 11?** (§3.5.) If it does, then
**BlackHole, the Multi-Output Device, the avfoundation device-index trap and the
one Preferences click with no API all leave the design at once** — because
Live's own output device stops being the capture path. Live 11 hosts VST3, the
plugin is GPL-2.0-or-later, and it costs an afternoon to find out.

⚠️ Run it with a **control arm in the same session**: the existing BlackHole
path, the same notes, the same minute. An A/B with only one arm is the shape of
mistake this repo keeps naming, and "the new path sounds fine" is not a result
without the old path's number beside it. And measure a **round trip on one
clock** — press here, hear here — against the existing **58 ms key→ear**; a
one-way transit figure across two machines' clocks is the trap that produced a
**−14.2 ms** latency in this very README.

If it does **not** work on Live 11, the same capability exists officially in
**Live 12.4+** (Link Audio, `https://github.com/Ableton/link`), and that turns
the Standard→Suite question from "buy M4L" into "buy the thing that actually
solves the problem" — which is a much better question to be asked.

**2. Pin and vendor AbletonOSC.** It is the largest silent fragility in §1: an
unpinned third-party clone in a user folder, carrying two local modifications,
with the commit recorded nowhere in this repo. A `git pull` there conflicts with
our `view.py` hook on a day nobody expects. One hour: record `0ca6821`, and add
an installer that clones at that commit, runs `install-hook.py` and copies
`browser.py` — so §1.1's *"in this repo? no"* becomes *yes* and the rig can be
rebuilt from the repo rather than from memory.

**3. Test the LaunchAgent, and make the test the microphone.** *"A capture
started over ssh is deaf"* is MEASURED and correct; *"so this can never be a
service"* is an inference nobody has tested. A **user** LaunchAgent in
`~/Library/LaunchAgents` with `RunAtLoad` runs inside the logged-in session and
needs no `sudo` (MEASURED: there is no passwordless sudo on this machine, so
`launchctl asuser` remains unavailable — but a user agent does not need it). The
check already exists: `live-check.mjs`'s microphone arm, which *cannot* read
−91.0 dB in a room unless the process is deaf. One hour, and either answer is
worth having.

⚠️ Expect the failure mode to be **TCC**, not launchd: microphone grants are per
executable and are evaluated when the process starts, and a bare command-line
binary with no bundle identifier is the hard case. Naming it here so that a
−91.0 dB reading is recognised rather than re-diagnosed for the third time.

**4. Fix the two documentation traps found in this survey.** Ten minutes each,
an hour each if skipped: `rig/m1/README.md`'s *"bring it all back
up"* recipe says `cd ~/positron && git pull` on a checkout that is **stale and
pulls from a local bare repo** (§1.4); and the parking table's *"with this set
loaded"* names an `.als` that **does not exist** (§1.4).

**5. Save a Live set, and only then re-measure the fader.** README item 1 asks
for 0.52 → ~0.65 and a read of the peak rather than a computed one. That cannot
be repeatable today because there is nothing holding the value. Save first,
measure second; the reverse produces a number that vanishes when Live closes.

**6. Shell `play.html`.** Unchanged from the README: it has its own CSS, no
`mount()`, and a dynamic `import('./moq-audio.mjs')` of a file that is not
beside it — which `build.mjs`'s import check would refuse, correctly.

**Only if the goal ever becomes "a model composes in Live"**: add an MCP surface
**over the OSC path we already have**, rather than installing a second Remote
Script. `Simon-Kansara/ableton-live-mcp-server` is the shape (MCP → OSC →
AbletonOSC) even though it is 18 months stale; borrowing the tool schema and
pointing it at our own `live-osc.mjs` costs far less than a second control
surface. That is a different product from this one and it should be decided as
one.

**And one cheap experiment that is worth an hour whenever somebody is already in
that file**: AbletonOSC's 100 ms floor is a decision, not a constraint (§3.1).
`Live.Base.Timer(callback=…, interval=1, repeat=True)` is a 1 ms poll on Live's
own timer, proven in `ableton-js`, and AbletonOSC's own
[issue #160](https://github.com/ideoforms/AbletonOSC/issues/160) is open on
exactly this. It would make `/able/`'s ~20 OSC round trips near-instant instead
of ~2 s. ⚠️ It changes **nothing** about playing notes, because the LOM has no
note-on — so it is a convenience, not an architecture change, and it must not be
sold as one.

### 4.2 Do not bother

- **Do not buy Max for Live for this.** EUR 149, or EUR 79 if the standalone
  Max on that machine is licensed. It buys audio access, `live.remote~` and a
  seat in the MIDI chain — **not** a wider API, **not** measurably lower control
  latency, and **not** a way off BlackHole: Cycling '74's own streaming advice is
  to install BlackHole. §3.3.
- **Do not install an MCP server beside AbletonOSC.** Same Remote Script, same
  LOM, one more unauthenticated listener, and one more entry in a Control
  Surface list that already holds somebody's band script. In the market leader,
  telemetry is on by default and its README says it includes prompts, clip names
  and device settings. §3.2.
- **Do not chase Ableton's Extensions SDK for this.** Live 12 **Suite** beta
  only, run-once from a right-click, and **narrower** than what we already
  reach. §3.5.
- **Do not try to automate Live's audio output device.** There is no API in any
  route, and the only remaining path is writing into an undocumented 36 KB
  binary and restarting Live. §2.1 shows the click stays clicked; a click that
  stays clicked beats that trade every time.
- **Do not write a Web Audio or JavaScript device for Live.** Live hosts no
  CLAP, webview-in-plugin is a GUI story over native DSP, and WASM DSP in a
  plugin is an eleven-star, macOS-only experiment whose own README warns the
  audio thread may block. §3.5.
- **Do not swap AbletonOSC for LiveOSC, ClyphX Pro or `ableton-js`.** The same
  door, and a swap costs the retry logic and the reload trick we already paid
  for. ⚠️ **Read** `ableton-js` though — its Remote Script runs a WebSocket and
  static HTTP server *inside Live* from the standard library alone (§3.4), which
  is the reference to copy if a new bridge is ever designed. Reading it is free;
  migrating to it is not.
- **Do not tune the control path.** It is ~7.5 ms of a 58 ms key→ear. The README
  said this and it is still true.
- **Do not make this an always-on service in the box's sense**, even if item 3
  works. It needs Live open, and Live is a document-based GUI application that
  can put up a crash-recovery dialog and refuse an AppleScript `quit`. `/able/`
  reports silence AS silence, and that remains the right design.

### 4.3 What would have to be true

1. **`VoidLinkAudioSend` loads and streams from Live 11.** UNCONFIRMED. Settled
   by loading it on the Master track and reading any receiver. This is item 1
   and nothing after it should be planned around until it is answered.
2. **Something we can write receives Link Audio.** `LinkAudio.hpp` is public and
   **GPLv2-or-later**; a ~100-line C++ receiver writing raw PCM to stdout is the
   same shape as `midisend.c`. The licence is a decision to take, not an
   assumption to make.
3. **Any new audio path is measured as a ROUND TRIP on one clock**, against the
   existing 58 ms — never as a one-way transit across two machines' clocks.
4. **A LaunchAgent's capture is not deaf.** Settled by the microphone control,
   which cannot be digitally silent in a room.
5. **A Live set is saved before any level is re-measured.** Otherwise the number
   has nowhere to live.
6. **AbletonOSC's commit is recorded in this repo before anybody pulls it.**
7. **No vendor number is quoted as a measurement.** Not *"sub-frame latency at
   48 kHz"*, not *"negligible impact on Ableton's audio performance"*. Both
   appear in §3 and neither has a method behind it.
8. **The question in §2.4 is answered out loud**: is the product *"play a
   machine in the next room"* — which `rig/board` already does as a service that
   survives a power cut — or is it *"**Ableton Live** is the instrument"*? Only
   the second justifies the audio path's whole cost, and it has never been said
   either way.

---

## 5. Where this document is weakest

- **The most important claim in it is UNCONFIRMED.** §3.5's Live-11 VST3 Link
  Audio route is an inference from two facts — Live 11 hosts VST3, and the
  vendor states a Live version requirement only for Live's built-in feature. It
  could be wrong for reasons the page does not mention, and if it is, item 1
  collapses into "upgrade to Live 12".
- **Nothing here was re-measured end to end.** The 11/11 in the README is from
  2026-09-11 and the last recorded run on the machine is a **fail** (§1.4),
  correctly, because Live was closed. Nobody has re-run `live-check.mjs` since,
  and this document deliberately did not — the survey was read-only.
- **The Audio Hijack idea in §2.4 has no number at all.** It is an observation
  that a capable tool is already installed, not a measurement that it helps. If
  item 1 succeeds it is moot; if item 1 fails it becomes the next thing to try,
  and it will need its own A/B.
- **The M4L verdict rests on an absence.** *"No maintained M4L device streams
  Live's audio over a network"* is a search that found nothing, and this repo has
  a written rule about diagnosing from absences — it is what produced the
  retracted *"Arturia is unlicensed"* section in the README. The positive
  evidence (no signal-rate network object, no encoder, Node-for-Max cannot carry
  audio, Cycling '74 recommends BlackHole) is what the verdict should be read as
  resting on.
- **The Remote Script world is undocumented and can move.** Everything in §3.1,
  §3.2 and §3.4 stands on a reverse-engineered extension point Ableton has never
  published and owes nothing to. Live 12 already broke the decompilers that make
  it learnable.
- **§3's comparison is source-reading, not running.** Fourteen projects were
  read; none was installed, and nothing in §3.2 or §3.3 was executed on this
  machine. That is the right level of effort for a decision not to install them,
  and it is the wrong level of evidence for any claim that one of them *works*.
  Only §1, §2.1 and the AbletonOSC internals in §3.1 and §3.4 were MEASURED
  here.
- **One claim in §3.1 was wrong in the first draft of this document**, and it is
  worth leaving the scar visible: the 100 ms tick was written up as a property
  of the Remote Script host that every alternative inherits. It is not — it is
  AbletonOSC's choice, and two maintained projects escape it. The conclusion
  survived (notes still go over CoreMIDI) but for a completely different reason,
  and a conclusion that survives its own reasoning being wrong is a conclusion
  to re-check rather than to trust.
