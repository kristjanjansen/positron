# plan-circuit-model12: a groovebox and a mixer, and which of them owns the clock

> 🔴 **NOTHING IN THIS FILE IS BUILT.** No code was changed, no row was added to
> `demo/manifest.mjs`, nothing was deployed, nothing was committed, and nothing
> on the board was started, stopped or restarted. It is a proposal.
>
> 🔴 **NEITHER DEVICE IS PLUGGED IN AND NOT ONE CLAIM ABOUT EITHER OF THEM WAS
> MEASURED.** Every number about the Novation Circuit and the Tascam Model 12
> below was read out of a manufacturer's document. Not one of them was seen on
> a wire. This matters more than usual, because CLAUDE.md is a list of cases
> where a confident sentence outlived the thing it described, and a MIDI map is
> exactly the shape of document that gets believed without being checked.
> ⚠️ **The three 🔴 MEASURED items in §6.5 are measurements of THIS REPO'S OWN
> CODE**, run here with no device attached. They say nothing about either
> instrument.
>
> **Evidence marks, used on every claim:**
>
> | mark | means |
> |---|---|
> | 📄 **DOC** | read out of a manufacturer PDF, with the URL. The strongest thing here. |
> | 📁 **REPO** | read out of this checkout, with the file and line. |
> | 🌐 **THIRD PARTY** | a published reverse-engineering document or trade press. Weaker. |
> | ⚖️ **INFERRED** | reasoned from something above. Nobody wrote it down. |
> | 🔌 **NEEDS THE HARDWARE** | cannot be settled without plugging the thing in. |
> | 🔴 **MEASURED** | run here, output pasted. Exactly **three**, all in §6.5, and all of CODE rather than of hardware. |
>
> 🔴 **REVISED 2026-09-20. THE RIG MOVED FROM THE RASPBERRY PI TO AN M2 MAC.**
> *"I can only plug circ and 12 devices to my m2 mac. Plan rigging and testing
> for this"*, then *"Pi plugging later"*. **§1, §6, §8 and §9 were rewritten.
> §2 to §5 and §7 were not touched**, because a MIDI map, a direction table and
> a clock argument are facts about the devices and do not care which machine
> they are plugged into. The Pi route is **deferred, not deleted**: it is §6.8,
> and the uncertainties that went with it are §8 items 14 to 17.

---

## 0. The ask

> *"i need to work on controlling and integrating novation circuit (original)
> and tascam model 12. See also features added in latest firmware. Make plan
> comprehenisvw midi map etc."*

Four things. A comprehensive MIDI map for each. What each can control and what
can control it. How they reach this project. And the firmware question, which
turns out to be load bearing on one device and irrelevant on the other.

---

## 1. Which firmware, read off YOUR units, before anything is plugged in

🔴 **REWRITTEN 2026-09-20 ON A DIRECT ASK:** *"What 12 firmwares bring?"* and
*"I am in ealier release afaik"*. The first draft wrote both maps against the
newest firmware and gave the Model 12 one line of history. That was the wrong
shape, because CLAUDE.md's own rule is that a feature in firmware somebody has
not installed is a different claim from one that is there today.

**So this section now answers three questions in order: how to read the version
off each unit in half a minute, what every release actually brought, and which
parts of this document need a version you may not have.**

### 1.0 The headline, so nobody has to read the tables to get it

🔴 **MODEL 12: THE MIDI MAP IN §4 IS IDENTICAL FROM V1.00 ONWARD. THE VERSION
QUESTION DOES NOT BLOCK ANY RIGGING IN THIS PLAN.** 📄 DOC, and this is a
reading of the COMPLETE cumulative release notes rather than a summary of them:
across thirteen firmware versions, **not one entry mentions MIDI Clock, MTC,
SPP, the MIDI ports, or the message set.** The only DAW control entry in the
whole history is V1.30, which added three DAW names to a menu. MCU and HUI
emulation, MIDI TIMECODE, MIDI CLOCK/SPP and the DIN thru behaviour were all
there at launch. **Whatever version is on that unit, §4 describes it.**

⚠️ **Two releases DO change things that matter to rigging, and one of them is a
bug you could be sitting on.** §1.5 marks them. Neither is MIDI.

🔴 **CIRCUIT: TWO THINGS IN §3 ARE FIRMWARE GATED, AND THE SECOND ONE IS NOT
WHAT THE FIRST DRAFT OF THIS LINE SAID.**

1. **The channel assignment in §3.1 needs 1.8.** If the Circuit is on anything
   earlier, the factory channels are not a default, they are the only option,
   and nothing in the rigging plan breaks because of it.
2. 🔴 **The eight Settings View switches in §3.9 were ASSEMBLED OVER FOUR
   YEARS AND ARE ONLY ALL THERE FROM 1.5.** This line previously said they were
   *"present from much earlier"*, which was a guess dressed as a fact. 🌐 THIRD
   PARTY, two independent outlets quoting Novation's own release notes: the
   **CC Rx/Tx pair arrived in 1.5** (May 2017), and **independent Clock Tx and
   Rx arrived in 1.4** (November 2016). A unit below 1.5 has an incomplete
   Settings View, and **§7's entire clock argument is written on switches that
   a 1.3 unit does not have.**

**Everything else in §3 holds on any firmware**: the CC map, the NRPN map, the
drum notes, the program change behaviour and the SysEx messages.

⚠️ **In practice this is unlikely to bite**, because 1.8 has been the shipped
firmware for over seven years and any unit ever connected to Components would
have been offered it. It is written down because "unlikely" is not "checked",
and §9 test 1.1 checks it in five seconds.

### 1.1 Novation Circuit: reading the version, and why it is worse than it should be

🔴 **THERE IS NO GOOD ON-DEVICE VERSION READOUT AND THE MANUAL SAYS SO ITSELF.**
📄 DOC, User Guide v1.6, Appendix, verbatim:

> *"Bootloader Mode lets you check the version numbers of the currently
> installed firmware... This is strictly an "engineering mode", and all normal
> unit functions become inoperative. You should not use Bootloader Mode without
> instructions to do so from Novation's Technical Support team."*
>
> *"To enter Bootloader Mode: 1. Turn Circuit off. 2. Hold down the Scales, Note
> and Velocity buttons. 3. Power Circuit on again."*
>
> *"Synth 1, (Synth 1) Sidechain and Synth 2 are lit; selecting each of these
> generates a pattern of illuminated pads; the pattern represents the version
> numbers of the three firmware elements in binary form. You may need to
> describe these patterns to Novation's Technical Support Team in the event of
> a problem."*

Read that again. **The version is three numbers, in binary, as lit pads, in a
mode the manual tells you not to enter.** Exit is a press of Play.

⚠️ **THE PRACTICAL ROUTE IS NOVATION COMPONENTS**, which reports the installed
version when the device connects and offers the update in the same place. ⚖️
INFERRED that this is still the fastest answer today; 🔌 whether the web
version of Components still supports a 2015 device in a current browser on
Apple Silicon **needs the machine and the Circuit**, and it is §9 test 1.1.

⚠️ **AND THERE IS A THIRD WAY THAT COSTS NOTHING AND IS WORTH TRYING FIRST:
LOOK FOR THE 1.8 FEATURES.** They are visible without any tool:

| if you can do this | you are on at least |
|---|---|
| Shift + Record toggles the Record button between bright and dim | 1.8 |
| Hold Shift when powering on, then press Synth 1, and the top two rows show a MIDI channel | 1.8 |
| Hold Shift in Patterns View and build a chain sequence | 1.7 |
| A step can be set to tie forward in Gate View | 1.7 |

⚖️ INFERRED from the feature lists below, not stated by Novation as a version
test. It is a five second check and it is good enough to decide whether §3.1's
channel assignment is available.

### 1.2 Novation Circuit: what each release brought

📄 DOC for 1.6, 1.7 and 1.8, read out of the manufacturer PDFs. ⚠️ **The
releases before 1.6 are not documented on Novation's current downloads page at
all**: the page serves a v1.6 User Guide, a v1.7 addendum and a v1.8 addendum,
and nothing older. So the pre-1.6 history below is 🌐 THIRD PARTY where it
appears at all, and this plan does not depend on it.

| version | date | what it brought | MIDI |
|---|---|---|---|
| 1.0 | Oct 2015 | the unit as launched: two synths, four drum parts, the sequencer | 🔴 **no external MIDI reception at all** |
| the Dec 2015 update | Dec 2015 | external MIDI note recording into the sequencer on channels 1, 2 and 10; external program change for synth patches; per step automation clear | 🔴 **this is where receiving MIDI begins** |
| 1.2 | Apr 2016 | user sample import, external MIDI controller recording, Ableton Live sync, momentary record, per step pitch editing | remote preset selection by program change and CC |
| 1.3 | Aug 2016 | sample flip, sample preview, session colours, single session backup | none |
| 1.4 | Nov 2016 | Circuit Packs, independent drum pattern lengths for polyrhythms, real time pattern switching | 🔴 **separate transmit and receive settings for MIDI clock**, so Clock Tx and Rx become independent here |
| 1.5 | May 2017 | fractional gate length, synth patch preview. ⚠️ sessions saved under 1.5 cannot be loaded by older firmware | 🔴 **the CC Rx and CC Tx pads are added**, which completes the eight switch Settings View |
| 1.6 | Sep 2017 | drum micro steps, synth and drum panning, FX bypass, display brightness. **This is the firmware the User Guide documents**, so every quotation in §3 from that guide is confirmed at this level | none |
| **1.7** | Jul 2018 | **tied / drone notes** (a per step tie forward setting in Gate View), **pattern chain sequences** (up to 32 patterns or 16 chains, Shift in Patterns View), **track selection**, **appending to a sequence**, and a per note delay of up to five microsteps | none |
| **1.8** | Mar 2019 | **non-quantised record** (Shift + Record, persists across session change and power cycle), **synth microstep edit**, **per note velocity**, 🔴 **assignable MIDI channels** | 🔴 **yes** |

⚠️ **THE VERSION LABEL "1.1" IS NOT USED ABOVE ON PURPOSE.** The December 2015
update is described in detail by several outlets and **none of them, and no
Novation document, names it 1.1.** Its content is reported; its number is not,
because guessing one would be inventing a string that people then search for.

⚠️ **EVERYTHING FROM 1.0 TO 1.5 IS 🌐 THIRD PARTY.** Novation's current
downloads page serves a v1.6 User Guide, a v1.7 addendum and a v1.8 addendum,
and nothing older; no Novation hosted changelog for that era survives. Where
two independent outlets quote the same release note wording, which is the case
for both the 1.4 clock line and the 1.5 CC line, confidence is higher, and it
is still not a manufacturer document.

📄 DOC, the 1.8 addendum, verbatim and complete:

> *"MIDI channels for each track can now be changed from the settings view.
> Synth 1, Synth 2 and Drum 1/2/3/4 can now be set to MIDI channels 1-15.
> Channel 16 is reserved for the session. Drum 1/2/3/4 is a single MIDI track.*
>
> *How it works: To edit the MIDI channel of each of the three tracks, enter the
> setup menu by holding Shift when powering on Circuit. Press Synth 1, Synth 2,
> or Drum 1/2/3/4 to select the track you wish to change the channel of. The
> top two rows of pads represent the MIDI channels 1-16... As with all settings
> view changes, press Play to save your changes and boot your circuit."*

⚖️ **1.8 IS THE LAST FIRMWARE**, inferred from seven and a half years of
absence on a page that is still served and was re-checked live on 2026-09-20,
not from an end of life statement. **Novation published no end of life notice
that could be found.** The closest thing to an official status is the
"Discontinued products" heading in §1.3, which is a statement about testing
rather than about support ending.

### 1.3 Novation Circuit: what an update costs

📄 DOC, User Guide v1.6, Appendix:

> *"If an update is available, connect Circuit to your computer with the USB
> cable supplied, connect the AC power adaptor and turn Circuit on. (Updating
> firmware while powering Circuit from batteries is not recommended.)... you
> will see pairs of green pads moving from left to right while a pattern of red
> pads rotates around them. Circuit will automatically enter its normal
> operating state when the download is complete."*

🔴 **MAINS POWER, NOT BATTERIES.** The manual says not recommended; a firmware
write interrupted by a flat cell is the worst case there is.

⚠️ **No Windows needed.** It is USB and a Novation tool, and the Circuit's USB
is class compliant MIDI, so the update travels as MIDI over USB.

🔴 **THE TOOL IS NOVATION COMPONENTS, AND THE CIRCUIT IS A NAMED EXCEPTION TO
ITS OWN CUTOFF.** Novation's support pages say Components supports most
products released after 2016, which would exclude a 2015 groovebox, and then
list Circuit explicitly among the grooveboxes it handles. Both the standalone
app and the web version work.

🔴 **AND THE WEB VERSION NEEDS A CHROMIUM BROWSER, FOR THE SAME REASON §6.3
DOES.** Novation's own words: Components runs *"in a web browser using the Web
MIDI API"*, available *"in Chromium browsers like Google Chrome (version 50 or
later), Microsoft Edge, Brave, etc or in Opera"*. **Safari cannot update a
Circuit**, and Novation's own troubleshooting for a failed Circuit update
blames *"problems with web MIDI"* and sends people to the standalone app.

🔴 **NOVATION LISTS THE CIRCUIT UNDER "DISCONTINUED PRODUCTS" AND HAS NOT
TESTED IT ON THIS MAC'S OS.** Their macOS compatibility article, **last updated
2026-09-17, three days before this plan was written**, puts Circuit under a
heading described as *"products that are no longer in development support, so
compatibility will remain as long as the products continue to work without
encountering an issue"*, and its Apple Silicon column reads **Yes** for macOS 12
through 15 and **"Untested but likely to work"** for macOS 26 and 27.

⚠️ **THIS MACHINE RUNS macOS 26.6.2.** So the Circuit sits in the untested
column on the exact OS it is going to be plugged into. That is not a prediction
of trouble, it is the absence of a manufacturer check, and it is the reason
§9 test 1.3 is "open Audio MIDI Setup and look" rather than an assumption.

🔴 **THERE IS NO FACTORY RESET ON A CIRCUIT. NOVATION SAYS SO IN WRITING:**
*"Circuit products... These devices do not feature factory reset, but Factory
Packs can be loaded onto the product to retrieve the material it would have had
originally."* A Factory Pack resets **content**, meaning patches, samples and
sessions, and by its own description nothing else.

**Two consequences for §7.** There is no one press way back to a known clock
configuration, so the Settings View state has to be set deliberately and
written down. And ⚖️ INFERRED, from the fact that content restore and firmware
update are separate operations on separate screens and neither is documented as
touching the Settings View, **an update probably does not reset the Rx and Tx
switches**. 🔌 That inference is the one worth checking before trusting a clock
setup across an update, because §3.9's factory state is Rx and Tx ON for all
four categories, which is **not** the state §7 wants for either arrangement.

🔴 **AND NONE OF THE RIGGING IN §9 NEEDS THE UPDATE.** Tiers 0 to 3 work on any
firmware. The update buys exactly one thing this plan cares about, which is the
ability to move Synth 1 off channel 1.

### 1.4 Tascam Model 12: reading the version, which really is thirty seconds

📄 DOC, Owner's Manual, chapter 10:

1. **Stop the recorder.**
2. **MENU**, then **SYSTEM**, then **INFORMATION**.
3. **Turn the MULTI JOG dial** to cycle the three pages: CARD, then SONG, then
   **FIRMWARE**.
4. The FIRMWARE page shows **VERSION**, which the manual describes as *"the
   system firmware version of this unit."*
5. **F1** returns to the SYSTEM Screen.

The menu index in the same manual lists it as *"INFORMATION: View SD card
information, song information and the firmware version."*

**That number is what §1.5's table is indexed by.**

### 1.5 Tascam Model 12: every firmware, what it brought, and which ones matter

📄 DOC. Read first hand out of TASCAM Europe's cumulative release notes file,
`Model12_v150_en.txt`, which carries the whole history in one document.
⚠️ **The notes carry dates only from V1.30 onward.** Everything earlier is
undated in TASCAM's own file, so no date is given here rather than a guessed
one.

| version | date | what it brought | matters here |
|---|---|---|---|
| **1.00** | launch | the unit as shipped. DAW control with MCU and HUI, MIDI TIMECODE, MIDI CLOCK/SPP, DIN thru, 12 in / 10 out USB audio | 🔴 **the whole of §4 is already true here** |
| **1.01** | undated | use on Windows with two-channel audio applications including OBS Studio. **WAV files are now created read-only** so a DAW cannot alter them | ⚠️ **one way**: *"Songs created using firmware V1.01 cannot be loaded by firmware V1.00"* |
| **1.10** | undated | VAMP playback, **new metronome functions**, new count-in click pattern | ⚠️ **the metronome is what the MIDI Clock rides on**, §4.2 |
| **1.11** | undated | *"The control precision of faders and knobs has been increased and made easier to use"* | ⚠️ ⚖️ possibly the resolution an MCU fader reports, §4.4 |
| **1.20** | undated | **OUTPUT DELAY**, audio delay compensation for the MAIN mix USB and analog MAIN outputs | rigging |
| **1.21** | undated | delay effect no longer has a short initial delay sound at long delay times | no |
| **1.22** | undated | firmware revised *"to handle some IC changes"*. ⚠️ TASCAM's own note: *"If a Model12 is using firmware V1.21, there is no need to update it to V1.22"* | a hardware revision build, not an upgrade |
| **1.23** | undated | 🔴 fixes a **V1.22 bug where USB audio mode STEREO MIX would not send output correctly to the computer**; fixes initialize not resetting STEREO MIX; improves S/N with EQ engaged | 🔴 **see the warning below** |
| **1.30** | 8 Dec 2021 | **PreSonus Studio One, Cockos REAPER and Steinberg Cubasis 3.3 added to DAW control**; MAIN MIX PRE added to PHONE SOURCE; **OUTPUT PAD** for MAIN and SUB outputs | 🔴 **the only DAW control change in the product's life** |
| **1.40** | 24 Aug 2023 | 🔴 **USB 1/2 return can now land on mixer channels 9/10 or the MAIN bus, not just channels 1/2**; track normalization from −20 to 0 dB; **analog input gain boost** | 🔴 rigging, see below |
| **1.41** | 13 Sep 2023 | fixes **gain boost not being applied to channels 1-8 of the USB audio outputs to a computer** | 🔴 only bites if you are on 1.40 |
| **1.42** | 3 Jun 2024 | operation stability | no |
| **1.50** | 18 Jun 2025 | meter bridge display in the ModelMixer Settings Panel V2.20; **MAIN metering point on the LCD moved from MAIN post-fader to MAIN bus pre-fader**; stability | a metering change, not a signal change |

🔴 **THE ONE TO CHECK FOR, IF YOU ARE ON AN EARLIER RELEASE: V1.22.** TASCAM's
own words are that on V1.22, *"if USB audio mode: STEREO MIX was selected,
output would not be sent correctly to the computer"*. §6.6 offers STEREO MIX as
one of the two USB audio modes, so **a unit sitting on 1.22 has a broken half
of that feature and 1.23 is the fix.** This is the single concrete reason in
the whole document to care which Model 12 firmware is installed.

⚠️ **AND V1.40 IS THE ONE WORTH WANTING.** Sending the computer's USB 1/2
return to **channels 9/10 or the MAIN bus** instead of only channels 1/2 is
exactly the routing §6.9 wants, because it leaves channels 1 and 2 free for the
Circuit's analogue output while still hearing the Mac. On anything earlier, the
USB return occupies channels 1 and 2 and the Circuit has to move.

⚠️ **NOTE THE ASYMMETRY IN 1.41.** Gain boost was added in 1.40 and did not
reach the USB outputs until 1.41. So a unit on exactly 1.40 boosts what you
hear and not what the computer records, which is the shape of defect that gets
blamed on the computer.

### 1.6 Tascam Model 12: what an update costs

📄 DOC, Owner's Manual: the firmware file goes in the **`UTILITY` folder on the
SD card**, which the manual describes as *"used when updating the unit system"*.
The card is reachable from a computer through the unit's own **STORAGE** menu
item, so no card reader is needed.

🔴 **NO WINDOWS REQUIRED.** The transfer is USB mass storage and the flash
happens on the unit. ⚠️ The Windows and macOS **ModelMixer Settings Panel** is a
separate thing, currently V2.20, and 📄 DOC gives its reason for existing on a
Mac as update notifications and, since V2.20, a meter bridge display. It is not
a driver.

🔌 **The exact button combination to enter update mode is not in the Owner's
Manual** and lives in TASCAM's per-release update instructions. Not reproduced
here rather than guessed.

⚠️ **Updating touches the card the songs are on.** Back the SD card up first.
That is not in any TASCAM warning found; it is ordinary caution about writing a
system file into a folder that sits beside the recordings.

🔴 **AND NONE OF THE RIGGING IN §9 NEEDS THE UPDATE EITHER.** Every Model 12
test in §9 works on V1.00. The update buys the USB return routing of 1.40 and,
if you are on 1.22, a working STEREO MIX.

---

## 2. The two devices, and the shape of the problem

**The Circuit is a full MIDI citizen and the Model 12 is almost a MIDI mute.**
That single asymmetry decides most of this plan, and it is not obvious from the
marketing of either.

|  | Novation Circuit (original) | Tascam Model 12 |
|---|---|---|
| receives notes | yes | **no** |
| receives CC | yes | **no** |
| receives program change | yes | **no** |
| receives clock | yes, and follows it | **no** |
| receives transport | yes (start, stop, continue) | **no** |
| receives SysEx | yes, patch load and dump request | in DAW control mode only, for its own display |
| transmits notes | yes | in DAW control mode only, as MCU or HUI button presses |
| transmits CC | yes | in DAW control mode only, as MCU or HUI pan and encoder |
| transmits clock | yes, switchable | yes, switchable, **and only while its recorder runs** |
| transmits MTC | **no** | yes, switchable, 30 fps non drop |
| speaks MMC | **no** | **no** |
| USB carries audio | **no** | yes, 12 in and 10 out |
| USB carries power | **no** | (not examined; it has its own PSU) |

📄 DOC for every cell. Sources are in §3 and §4.

Read that table once more. **There is no arrangement in which anything controls
the Model 12 over MIDI.** Its own MIDI Implementation Chart has a dash meaning
NO in the Recognize column of every single row. What the Model 12 offers this
project is three one way things: a clock, a control surface, and twelve
channels of audio over USB.

---

## 3. Novation Circuit (original), the MIDI map

Everything in §3 is 📄 DOC from **Circuit Programmer's Reference Guide v1.1**
and **1.3**, and from **Circuit User Guide v1.6**, all read directly as text
extracted from the manufacturer PDFs.

- PRG v1.1: <https://fael-downloads-prod.focusrite.com/customer/prod/s3fs-public/downloads/Circuit%20Programmers%20Reference%20Guide%20v1-1_0.pdf>
- PRG 1.3: <https://fael-downloads-prod.focusrite.com/customer/prod/downloads/Circuit%20Programmer's%20Reference%20Guide%201.3_2.pdf>
- User Guide v1.6: <https://fael-downloads-prod.focusrite.com/customer/prod/s3fs-public/novation/downloads/15792/circuit-ug-en-03-v1-6.pdf>

PRG 1.3 was diffed against v1.1. It is a reformat with one extra author on the
title page. **Every table is the same, including the one anomaly in §3.11.**

🔴 **WHICH FIRMWARE THIS SECTION DESCRIBES: ALL OF THEM, WITH ONE EXCEPTION.**
The CC map, the NRPN map, the drum notes, the program change behaviour, the
SysEx messages and the clock behaviour are documented against a User Guide
whose version is 1.6 and a Programmer's Reference Guide that was never revised
for 1.8. **The one thing in §3 that needs firmware 1.8 is the channel
assignment in §3.1**, and it is marked there. Everything else applies to a
Circuit on any firmware you are likely to meet. §1.1 says how to find out which
one you have, and §1.2 says what the difference buys.

### 3.1 Channels

| part | factory channel | settable |
|---|---|---|
| Synth 1 | 1 | 1 to 15, firmware 1.8 |
| Synth 2 | 2 | 1 to 15, firmware 1.8 |
| Drums 1 to 4, as ONE track | 10 | 1 to 15, firmware 1.8 |
| Session | 16 | **no, reserved** |

🔴 **THE SAME CC NUMBER MEANS DIFFERENT THINGS ON DIFFERENT CHANNELS, AND THE
COLLISIONS ARE REAL ONES.** CC 12 is Drum 1 level on channel 10 and Synth 1
level on channel 16. CC 14 is Drum 1 pitch on channel 10 and Synth 2 level on
channel 16. CC 74 is the synth filter frequency on channels 1 and 2 and the
**master filter** on channel 16. CC 80 is Macro knob 1 on channels 1 and 2 and
Drum 4 pan on channel 10.

**So a controller number is not a key. `(channel, controller)` is the key.**
This is CLAUDE.md's declare-do-not-infer rule wearing a new costume, and §6.3
shows where this repo's own code gets it wrong.

⚠️ **The four drum parts cannot be split across channels.** They are one MIDI
track. You can move all four, you cannot give Drum 3 its own channel.

### 3.2 Notes, and they are not evenly spaced

**Drum Notes Table**, verbatim:

| MIDI note | drum |
|---|---|
| 60 | Drum 1 |
| 62 | Drum 2 |
| 64 | Drum 3 |
| 65 | Drum 4 |

The gaps are +2, +2, +1. Anybody writing 60, 62, 64, 66 from the pattern gets
three drums and a silent fourth. The document does not separate transmit from
receive for this table.

Synth notes are ordinary note numbers on the synth's channel. The User Guide
says Circuit *"is configured to receive MIDI note data by default, on MIDI
Channel 1 for Synth 1 and MIDI Channel 2 for Synth 2."*

### 3.3 CC, synth engine, channels 1 and 2

**This is Novation's map for the Circuit's own engine. It is not the General
MIDI map and it must not be read as one.** CC 71 and 74 happen to land on
resonance and filter frequency, which is the conventional pair, and that
coincidence is the trap: CC 70, 72, 73, 75 are the envelope, not what GM says,
and CC 76, 77, 78, 79 are not vibrato of any kind.

| section | parameter | CC | range | default |
|---|---|---|---|---|
| Voice | polyphony mode | 3 | 0 to 2 | 2 (0 mono, 1 mono AG, 2 poly) |
| Voice | portamento rate | 5 | 0 to 127 | 0 |
| Voice | pre glide | 9 | 52 to 76 | 64 |
| Voice | keyboard octave | 13 | 58 to 69 | 64 |
| Osc 1 | wave | 19 | 0 to 29 | 2 |
| Osc 1 | wave interpolate | 20 | 0 to 127 | 0 |
| Osc 1 | pulse width index | 21 | 0 to 127 | 127 |
| Osc 1 | virtual sync depth | 22 | 0 to 127 | 0 |
| Osc 1 | density | 24 | 0 to 127 | 0 |
| Osc 1 | density detune | 25 | 0 to 127 | 0 |
| Osc 1 | semitones | 26 | 0 to 127 | 64 |
| Osc 1 | cents | 27 | 0 to 127 | 64 |
| Osc 1 | pitchbend | 28 | 52 to 76 | 76 |
| Osc 2 | wave | 29 | 0 to 29 | 2 |
| Osc 2 | wave interpolate | 30 | 0 to 127 | 0 |
| Osc 2 | pulse width index | 31 | 0 to 127 | 127 |
| Osc 2 | virtual sync depth | **33** | 0 to 127 | 0 |
| Osc 2 | density | **35** | 0 to 127 | 0 |
| Osc 2 | density detune | **36** | 0 to 127 | 0 |
| Osc 2 | semitones | **37** | 0 to 127 | 64 |
| Osc 2 | cents | **39** | 0 to 127 | 64 |
| Osc 2 | pitchbend | **40** | 52 to 76 | 76 |
| Mixer | osc 1 level | **51** | 0 to 127 | 127 |
| Mixer | osc 2 level | **52** | 0 to 127 | 0 |
| Mixer | ring mod level | **54** | 0 to 127 | 0 |
| Mixer | noise level | **56** | 0 to 127 | 0 |
| Mixer | pre FX level | **58** | 52 to 82 | 64 |
| Mixer | post FX level | **59** | 52 to 82 | 64 |
| Filter | routing | **60** | 0 to 2 | 0 |
| Filter | drive | **63** | 0 to 127 | 0 |
| Filter | drive type | 65 | 0 to 6 | 0 |
| Filter | type | 68 | 0 to 5 | 1 |
| Filter | tracking | 69 | 0 to 127 | 127 |
| Filter | resonance | 71 | 0 to 127 | 0 |
| Filter | frequency | 74 | 0 to 127 | 127 |
| Filter | Q normalize | 78 | 0 to 127 | 64 |
| Filter | env 2 to frequency | 79 | 0 to 127 | 64 |
| Env 1 | attack | 73 | 0 to 127 | 2 |
| Env 1 | decay | 75 | 0 to 127 | 90 |
| Env 1 | sustain | 70 | 0 to 127 | 127 |
| Env 1 | release | 72 | 0 to 127 | 40 |
| Env 1 | velocity | 108 | 0 to 127 | 64 |
| FX | distortion level | 91 | 0 to 127 | 0 |
| FX | chorus level | 93 | 0 to 127 | 0 |
| Macro | knob 1 to 8 position | **80 to 87** | 0 to 127 | 0 |

The **bold** numbers are the ones in 32 to 63. Hold that thought until §6.3.

🔴 **A MACRO KNOB TRANSMITS ITS OWN POSITION, NOT WHAT IT DOES.** CC 80 to 87
carry the raw knob position. What each knob is wired to, up to four
destinations A, B, C, D per knob with a start, an end and a depth each, lives
in NRPN bank 3 and is part of the patch. So reading CC 83 tells you macro 4
moved to 91 and tells you nothing at all about which parameter changed. To know
that you must read the patch, which needs SysEx.

📄 DOC, User Guide, on what the eight knobs broadly are, with the manual's own
caveat that many patches differ: 1 and 2 oscillator, 3 and 4 envelope, 5 and 6
filter, 7 and 8 modulation and FX.

### 3.4 CC, drums, channel 10

Flat per channel, one controller per parameter per drum, scattered rather than
banked.

| parameter | Drum 1 | Drum 2 | Drum 3 | Drum 4 |
|---|---|---|---|---|
| patch select (0 to 63) | 8 | 18 | **44** | **50** |
| level | 12 | **23** | **45** | **53** |
| pitch | 14 | **34** | **46** | **55** |
| decay | 15 | **40** | **47** | **57** |
| distortion | 16 | **42** | **48** | **61** |
| EQ | 17 | **43** | **49** | 76 |
| pan | 77 | 78 | 79 | 80 |

Again, bold is 32 to 63.

⚠️ **Drum patches are selected by CC, not by program change.** That is unusual
and it is explicit: *"Note, for drum patch selection see Drum Control table."*

### 3.5 CC, session, channel 16

| section | parameter | CC |
|---|---|---|
| Reverb send | synth 1 | 88 |
| Reverb send | synth 2 | 89 |
| Reverb send | drum 1 | 90 |
| Reverb send | drum 2 | 106 |
| Reverb send | drum 3 | 109 |
| Reverb send | drum 4 | 110 |
| Delay send | synth 1 | 111 |
| Delay send | synth 2 | 112 |
| Delay send | drum 1 | 113 |
| Delay send | drum 2 | 114 |
| Delay send | drum 3 | 115 |
| Delay send | drum 4 | 116 |
| Master filter | frequency | **74** |
| Master filter | resonance | **71** |
| Mixer | synth 1 level | 12 |
| Mixer | synth 2 level | 14 |
| Mixer | synth 1 pan | 117 |
| Mixer | synth 2 pan | 118 |

🔴 **THE MASTER FILTER KNOB IS THE ONE CONTROL ON THIS DEVICE WORTH BUILDING A
PAGE AROUND, AND ITS RANGE IS FOLDED.** Verbatim: `0-63=Low Pass, 64=OFF,
65-127=High Pass`. One 0 to 127 value, low pass sweeping in from the left, a
dead centre, high pass sweeping out to the right. A slider that treats it as an
ordinary 0 to 127 range will feel correct and be wrong about what it is doing
either side of 64, and a page describing it as "filter" without saying which
filter is describing two different filters with one word.

It is also exactly the demonstration `plan-controller.md` was written to build,
on a different instrument. `/knobs/` already has two sliders pointed at a
cutoff and a resonance.

🔴 **THERE IS NO CC FOR TEMPO, SWING OR GATE. NOT ONE.** Searched both PRG
versions. Neither word appears in any parameter table. **Tempo is reachable
only through MIDI Clock**, which means the only way to change a Circuit's tempo
remotely is to become its clock master, which is a much larger commitment than
sending a controller. Say that out loud before anybody designs a tempo slider.

### 3.6 NRPN

📄 DOC. Yes, extensively. The PRG writes addresses as `bank:number`, banks 0 to
3. The parameters that have **no** CC and can only be reached by NRPN:

- Envelope 2, all five parameters, bank 0, LSB 0 to 4
- Envelope 3, all five, bank 0, LSB 14 to 18
- LFO 1, bank 0, LSB 70 to 77, plus flags at 0:122 and 0:123
- LFO 2, bank 0, LSB 79 to 86, plus the same two flag addresses
- EQ bass, mid, treble frequency and level, bank 0, LSB 104 to 109
- Distortion type and compensation, bank 1, LSB 0 and 1
- Chorus type, rate, rate sync, feedback, mod depth, delay, bank 1, LSB 24 to 29
- Reverb type, decay, damping, bank 1, LSB 18 to 20
- Delay time, time sync, feedback, width, left right ratio, slew rate, bank 1, LSB 6 to 11
- FX bypass, 1:21
- All twenty mod matrix slots, four addresses each, banks 1 and 2
- Sidechain for both synths, bank 2
- **Every macro knob destination, start, end and depth**, bank 3, LSB 0 to 127

⚠️ **THE PRG NEVER SAYS WHICH CONTROLLERS CARRY NRPN.** It gives `1:83` and
never states that MSB is CC 99, LSB is CC 98 and data entry is CC 6. ⚖️
INFERRED that it is the MIDI 1.0 convention, because there is no other one, but
**Novation did not write it down** and this is the sort of assumption that is
cheap to check with a MIDI monitor and expensive to be wrong about.
🔌 NEEDS THE HARDWARE.

🔴 **A LEVEL VALUED CONTROL PLANE THAT ONLY HANDLES CC CANNOT REACH HALF OF
THIS SYNTH.** `demo/shell/cc-adapter.mjs` is built on `(status, d1, d2)` and
the CC status byte. NRPN is a four message sequence with state between the
messages, so it is neither level valued nor idempotent the way CC is, and the
adapter's whole design argument, that the last value per controller is the
truth, does not hold for it: a lost NRPN MSB leaves the next data entry landing
on whatever parameter was selected last. That is a genuine open design
question, not a small one, and it is in §8.

### 3.7 Program change and bank select

📄 DOC, verbatim, the whole table:

| MIDI channel | parameter | value | notes |
|---|---|---|---|
| 1 | PGM | 0 to 63 | select synth 1 patch |
| 2 | PGM | 0 to 63 | select synth 2 patch |
| 16 | PGM | 0 to 31 | select session (instant) |
| 16 | PGM | 64 to 95 | select session (queued) |

Two good details. **Program change does two different jobs depending on which
channel it arrives on**, patches on 1 and 2, sessions on 16. And **queued
session change is the same index plus 64**, so there is no mode flag anywhere:
send 5 to switch session 5 now, send 69 to switch at the next boundary.

🔴 **THERE IS NO BANK SELECT.** CC 0 and CC 32 appear nowhere in either PRG.
The patch space is one fixed bank of 64 per synth and program change addresses
all of it directly. Anything in this repo that sends a bank select before a
program change, which is what `rig/board/board.mjs` does for Yoshimi
(`bankCC 32`, `rootCC 0`, read from `voices.list` in `plan-controller.md` §1.2),
would be sending the Circuit two controllers it has no meaning for. On channel
16, **CC 32 is not even unused**: it is inside the 32 to 63 block, and while the
PRG lists no session parameter at 32, sending it is still sending an
undocumented controller to a device on a channel whose map you did not write.

### 3.8 SysEx

📄 DOC, and precise. Every message opens the same way, and the last two header
bytes are what prove this document is about the original Circuit rather than
Circuit Tracks:

```
F0        240        SysEx
00 20 29  0 32 41    Manufacturer ID (Novation)
01        1          Novation Product Type (Synth)
60        96         Novation Product Number (Circuit)
<cmd>                00 Replace Current Patch
                     01 Replace Patch
                     40 Current Patch Dump Request
...
F7        247        EOX
```

Three messages, all about synth patches, and **no documented session dump**:

| command | what it does | size |
|---|---|---|
| `00` Replace Current Patch | loads 340 bytes into RAM for Synth 1 or 2, Flash untouched | 350 bytes |
| `01` Replace Patch | overwrites one of the 64 Flash slots, 0 to 63 | 350 bytes |
| `40` Current Patch Dump Request | asks for a Replace Current Patch back | 9 bytes |

Three constraints that will bite anything automating this:

1. 📄 DOC: *"Although Circuit will receive SysEx messages via MIDI DIN, any
   response will be sent via USB only."* **So a dump request over DIN gets its
   answer somewhere else.** A tool that sends on DIN and listens on DIN waits
   forever and looks like a dead device.
2. 📄 DOC: *"The message may be sent without delays between the bytes. However,
   consecutive messages should have at least 20 ms between them to allow time
   for processing."* A 64 patch bank is therefore at least 1.3 s of forced
   pacing, and it is not optional: *"There are states in which the device is
   not capable of receiving this message... In these situations the message
   will be ignored."* **Ignored, not refused.** No error comes back.
3. 📄 DOC, the documented way to read a Flash patch: send a program change to
   the synth channel, wait about 10 ms, then send command `40`. Three steps,
   two of them timing.

The 340 byte patch body is documented address by address, name in the first 16
bytes as ASCII, then category, genre, nine reserved bytes, then the engine.

**Firmware update SysEx is not documented.** The User Guide describes the
procedure and never the protocol. ⚖️ INFERRED that Novation Components uses
these same three messages for patch work over USB, since they are the entire
published surface, but that is an inference and the one support article that
would settle it answers 403 to an automated fetch.

### 3.9 Clock and transport

📄 DOC, PRG, the complete lists:

- **Supported realtime messages**: start, stop, continue, timing clock.
- **Supported system common messages**: song position pointer, song select.
- **No MTC and no MMC.** Neither string appears in the 3,656 line User Guide
  text or in either PRG.

📄 DOC, User Guide, Settings View. Four independent categories, each with its
own Rx and Tx switch, on eight pads:

| pad | function | colour |
|---|---|---|
| 25 / 26 | MIDI Note Rx / Tx | green |
| 27 / 28 | MIDI CC Rx / Tx | orange |
| 29 / 30 | MIDI Program Change Rx / Tx | purple |
| 31 / 32 | MIDI Clock Rx / Tx | pale blue |

*"When it is shipped from the factory, both MIDI Rx and MIDI Tx are ON for all
data categories."*

🔴 **THESE EIGHT SWITCHES ARE THE ONE PART OF §3 THAT IS FIRMWARE GATED, AND
§7's WHOLE CLOCK ARGUMENT RESTS ON THEM.** 🌐 THIRD PARTY, §1.2: **independent
Clock Tx and Rx arrived in 1.4** and **the CC pair arrived in 1.5**. The table
above is the finished set as the v1.6 User Guide documents it. A unit below 1.5
does not have all eight, and a unit below 1.4 may not be able to transmit and
receive clock independently at all, which is the exact control §7.2 turns off.
**Check the firmware before setting up a clock**, §9 test 1.1.

📄 DOC, and this is the paragraph the clock section of this plan turns on:

> *"When Clock Rx is OFF, the clock is in internal mode and Circuit's BPM is
> defined only by the internal tempo clock. Any external clock will be ignored.
> When Clock Rx is ON, Circuit is in AUTO mode and the BPM will be set by an
> externally applied MIDI clock at either the MIDI IN or the USB ports if a
> valid one is applied; if this is not the case, Circuit will automatically
> switch to its internal clock.*
>
> *If Clock Tx is ON, Circuit is the clock master and its clock, whatever the
> source, will be available as MIDI Clock at the rear panel USB and MIDI OUT
> connectors."*

🔴 **"WHATEVER THE SOURCE" MEANS A SLAVED CIRCUIT IS A CLOCK REPEATER.** With
Clock Rx ON and Clock Tx ON, which is how it leaves the factory, a Circuit
following somebody else's clock re transmits it. In a patchbay that connects
everything to everything, which is what `carry: ["all"]` does, that is one
`aconnect` away from a loop.

Tempo ranges, 📄 DOC:

- internal: **40 to 240 BPM, integers only**, default 120
- following an external clock: **30 to 300 BPM, fractional accepted**
- while following, the tempo knob is disabled and its LED goes out

🔴 **AND THE CLOCK DISAPPEARING STOPS THE MUSIC.** Verbatim: *"If an external
clock is removed (or goes out of range), Circuit will stop playing. The 'SYN'
display will remain visible until Play button is pressed."* Read together with
the settings paragraph above, the behaviour is: no clock ever seen means fall
back to internal, but a clock that **was** being followed and then stops means
the Circuit stops. 🔌 NEEDS THE HARDWARE to pin down exactly which of those two
a given silence counts as, and it matters, because §7 puts the Model 12 in the
master seat and the Model 12's clock stops every time its transport does.

### 3.10 Physical, USB and power

📄 DOC, User Guide, rear panel:

- **Audio out**: two quarter inch TS jacks, L/MONO and RIGHT. Max +5.3 dBu.
  L/MONO sums when RIGHT is empty. Internal speaker mutes on either.
- **MIDI IN and OUT on two 3.5 mm TRS jacks**, with two TRS to 5 pin DIN
  breakout cables supplied.
- **USB 2.0 Type B**, and verbatim: *"The port is MIDI class compliant; connect
  to computers and other devices supporting MIDI via USB to transmit and
  receive MIDI data. Also used for firmware updates. NOTE: Circuit's USB port
  does not carry either DC power or audio."*
- **Power**: 12 V DC adaptor or six AA cells. Verbatim: *"It cannot be powered
  from a computer or other device via a USB connection."* Five hours on good
  alkalines.
- Soft power switch needing about a one second press.

🔴 **TWO CONSEQUENCES FOR A RASPBERRY PI, AND BOTH ARE STRUCTURAL.**

1. **The Pi cannot power the Circuit.** A USB cable from the Pi is data only.
   Anything portable needs the Circuit's own PSU or its batteries, which means
   a board that survives a power cut and a Circuit that does not, unless the
   batteries are in.
2. **No audio comes over USB, ever.** Whatever this project does with the sound
   of a Circuit, it does through an analogue input: the Pi's capture device,
   or, interestingly, the Model 12, which has ten of them and sends them over
   USB. §6.6.

⚠️ **THE TRS MIDI TYPE IS UNCERTAIN AND IT FAILS SILENTLY.** The 3.5 mm TRS
MIDI pinout was standardised in 2018 as Type A, three years after this device
shipped. 🌐 THIRD PARTY says the original Circuit is **Type B**. Novation
publishes a compatibility article and it answers 403 to an automated fetch.
**Use the supplied breakout cables**, and treat a generic TRS to DIN cable as
untested, because the wrong type is not an error, it is no notes.

### 3.11 What the document does not say, and one thing it says twice that looks wrong

- ⚠️ **The PRG never marks a row as send only or receive only.** It presents one
  table per channel. The actual direction is governed globally by the four Rx
  and Tx pairs in §3.9, and not per parameter. ⚖️ INFERRED, and it is a strong
  inference because the User Guide is explicit that macro positions can be
  driven by an external controller and recorded, and that patches can be
  selected by external program change: **every CC and NRPN in these tables is
  both sendable and receivable by default.**
- 🔴 **A LIKELY TYPO THAT SURVIVED TWO DOCUMENT VERSIONS.** Under Sidechain, on
  channel 16, `synth 2 depth` is given as **NRPN 1:69** while every sibling,
  `synth 2 source`, `attack`, `hold` and `decay`, is `2:65` through `2:68`. PRG
  v1.1 and PRG 1.3 both say `1:69`. Either Novation has one sidechain parameter
  living in a different bank from its four neighbours, or the document has an
  error that has been reprinted. 🔌 NEEDS THE HARDWARE, and it is a two minute
  check: send `2:69` and `1:69` and hear which one ducks.
- ⚠️ **The exact ALSA and Web MIDI port name is not published anywhere.** §6.1
  is about why that matters here more than it would elsewhere.

---

## 4. Tascam Model 12, the MIDI map

Everything in §4 is 📄 DOC from the **Owner's Manual** and the **DAW Control
Mode Manual**, read as text extracted from the manufacturer PDFs, plus one page
read as a rendered image.

- Owner's Manual: <https://cf.tascam.com/wp-content/uploads/downloads/products/tascam/model_12/efs_model-12_om_vf.pdf>
- DAW Control Mode Manual: <https://cf.tascam.jp/wp-content/uploads/downloads/products/tascam/model_12/e_model-12_daw_control_om_vb.pdf>

🔴 **AND THE TWO CHARTS ARE IDENTICAL ACROSS MANUAL REVISIONS, CHECKED RATHER
THAN ASSUMED.** The newest Owner's Manual revision and the newest DAW Control
Mode Manual revision were downloaded and their MIDI Implementation Charts
diffed against the revisions quoted here. **Both are byte for byte the same.**
What did change between revisions is the supported operating system table,
§6.4, which is how you can tell TASCAM keeps these documents current rather
than reprinting them unread.

🔴 **WHICH FIRMWARE THIS SECTION DESCRIBES: EVERY ONE OF THEM, V1.00 TO V1.50.**
§1.0 and §1.5 show the working: the complete cumulative release notes contain
no entry about MIDI Clock, MTC, SPP, the MIDI ports or the message set, and the
single DAW control entry in thirteen releases added three names to a menu.
**So there is no version of a Model 12 that this section does not describe**,
and the only thing V1.30 changes is whether `MCU - Studio One`,
`MCU - Reaper` and `MCU - Cubasis` appear in the list in §4.3.

### 4.1 There are two port pairs and they are two different devices

This is the fact that makes the rest legible, and neither manual states it in
one sentence.

| port pair | what it is | chart |
|---|---|---|
| the **general** MIDI ports | the 5 pin DIN sockets, bridged to USB | Owner's Manual chapter 14 |
| the **DAW Control** ports | a separate USB MIDI endpoint speaking MCU or HUI | DAW Control Mode Manual, page 20 |

📄 DOC on the names, from the per DAW walkthroughs: on Windows the control port
is `MIDIIN2 (Model 12 MIDI)` and `MIDIOUT2 (Model 12 MIDI)`, also written
`Model 12 MIDI (Port 2)`. On macOS it is `Model 12 MIDI (DAW Control IN)` and
`Model 12 (DAW Control OUT)`.

⚖️ INFERRED, because the manual never names it: there is a port 1, and it is
the DIN pair. 🔌 NEEDS THE HARDWARE to read the actual strings.

### 4.2 The general MIDI ports: a thru box with a clock bolted on

📄 DOC, Owner's Manual rear panel:

> *"MIDI IN connector. This 5-pin DIN is a standard MIDI input connector. MIDI
> signals input through this connector will be sent to the computer."*
>
> *"MIDI OUT connector. This 5-pin DIN is a standard MIDI output connector.
> This outputs MIDI signals sent from the computer. If the MIDI TIMECODE or
> MIDI CLOCK/SPP items are set to ON on the MIDI screen, those will also be
> output."*

**So the DIN pair is a USB MIDI interface**: DIN IN goes to the computer, the
computer goes to DIN OUT, and the unit's own generated clock is mixed into DIN
OUT and sent to the computer as well.

📄 DOC, the **MIDI Implementation Chart, chapter 14**, with the legend printed
on the same page as `–: YES` and `—: NO`:

| function | transmit | recognize | remarks |
|---|---|---|---|
| basic channels, mode, note, velocity, aftertouch, pitch bend, control change, program change | NO | NO | Thru |
| system exclusive | **YES** \*1 | NO | Thru |
| system common, song position | **YES** \*3 | NO | Thru |
| system common, song select | NO | NO | Thru |
| system common, quarter frame | **YES** \*2 | NO | Thru |
| system common, tune | NO | NO | Thru |
| system real time, clock | **YES** \*3 | NO | Thru |
| system real time, command | NO | NO | Thru |
| local on/off, all notes off, active sense, reset | NO | NO | Thru |

> \*1 MTC full message when MIDI TIME CODE is ON
> \*2 When MIDI TIME CODE is ON
> \*3 When MIDI CLOCK/SPP is ON

🔴 **EVERY CELL IN THE RECOGNIZE COLUMN IS NO.** On its general MIDI ports the
Model 12 acts on nothing. It generates four things and passes everything else
through.

📄 DOC, Owner's Manual chapter 9, which is the entire MIDI functions section:

> *"This unit can generate MIDI TIME CODE and MIDI CLOCK when the recorder is
> playing back or recording. The generated MIDI data is output from the MIDI
> OUT connector and simultaneously sent to a computer connected by USB."*

Two independent switches, **both OFF by default**:

- **MIDI TIMECODE**: *"it sends quarter-frame messages during playback and
  recording. It sends full messages when locating."* Frame type is **30 frames
  per second, non drop**, and that is fixed.
- **MIDI CLOCK/SPP**: *"MIDI CLOCK is sent during playback and recording. Song
  position pointers are sent when locating. The MIDI Clock timing and song
  positions sent depend on the metronome settings."*

🔴 **THREE THINGS IN THAT LAST SENTENCE AND ALL THREE MATTER.**

1. **The tempo of the clock is the metronome's tempo**, not something derived
   from the audio on the card. Change the metronome and you change what every
   device downstream thinks the tempo is.
2. **Clock exists only while the transport runs.** Stopped, there is no clock
   at all. Not a paused clock, no clock.
3. **Locating sends a song position pointer**, so a downstream sequencer is
   expected to jump. The Circuit supports SPP, so it will try.

### 4.3 The DAW Control ports: Mackie Control or HUI, and the mixer goes away

📄 DOC, DAW Control Mode Manual, overview:

> *"The Model 12 has DAW control functions. By setting it to DAW control mode,
> its controls can be used for basic operation of the DAW application. This
> includes fader operation, muting, panning, soloing, recording, playing,
> stopping and other transport functions. Mackie Control (MCU) and HUI protocol
> emulation are supported."*

📄 DOC, the nine presets, and note that **only Pro Tools is HUI**:

> *"Options: MCU - Live, HUI - Pro Tools, MCU - Cubase, MCU - Cakewalk,
> MCU - Logic, MCU - DP, MCU - Cubasis, MCU - Studio One, MCU - Reaper"*

⚠️ **THE LAST THREE ARRIVED IN FIRMWARE V1.30, 8 DECEMBER 2021.** 📄 DOC, §1.5:
*"Support for PreSonus Studio One, Cockos REAPER and Steinberg Cubasis 3.3 have
been added to DAW control."* On anything earlier the menu has six entries, not
nine. **This changes the menu and not the protocol**: MCU is MCU, and a unit on
V1.00 set to `MCU - Live` speaks the same thing a unit on V1.50 does. The only
practical consequence is that a pre-1.30 unit driving REAPER has to be set to
one of the other MCU presets and the mapping may differ in detail.

📄 DOC, the controls that are live in that mode:

F2, F3, F4 on two screens; the MULTI JOG dial for locating; rewind and fast
forward; play; stop; record; **PAN knobs for channels 1 to 6 and 7/8 and
9/10**; **REC buttons**; **MUTE switches**; **SOLO switches**; **channel faders
1 to 6 and 7/8 and 9/10**; and **the FX fader as the DAW master fader**.

That is **eight channel faders plus a master**, which is exactly one Mackie
Control bank.

📄 DOC, the **MIDI Implementation Chart for the DAW Control ports**, read off
the rendered page 20 rather than from extracted text, because the yes and no
glyphs are a circle and a cross that do not survive extraction cleanly:

| function | transmit | recognize | remarks |
|---|---|---|---|
| note number | YES | YES | HUI: Active Sensing. MCU: Key, LED |
| velocity, note on | YES | YES | as above |
| velocity, note off | NO | NO | |
| aftertouch | NO | NO | |
| **pitch bend** | **YES** | **NO** | MCU: Fader |
| control change | YES | YES | HUI: Fader, LED, Switch Ctrl, PAN |
| control change | YES | YES | MCU: PAN, Encoder |
| **system exclusive** | **YES** | **YES** | MCU |
| program change, all system common, all system real time, local, all notes off, active sense, reset | NO | NO | |

🔴 **PITCH BEND TRANSMITS AND IS NOT RECOGNISED, AND THAT IS THE FADERS NOT
BEING MOTORISED.** In MCU a fader is pitch bend in both directions; a surface
with motors listens so the DAW can move them. This one does not listen. 🌐
THIRD PARTY corroboration from Sound on Sound: *"you'll need to familiarise
yourself with how to optimise your DAW to respond to non-motorised faders."*
📄 DOC corroboration, repeated on every single DAW page of the manual: *"the
DAW settings and the state and positions of the Model 12 buttons, knobs and
faders will not match."*

🔴 **SYSTEM REAL TIME IS NO IN BOTH COLUMNS ON THIS PORT PAIR.** The DAW control
port carries no clock at all, in either direction. Clock lives only on the
general ports, §4.2.

🔴 **AND DAW CONTROL MODE COSTS YOU THE MIXER.** 📄 DOC: *"When in DAW control
mode, only audio input through Model 12 channels 1-2 can be heard."* Channel 1
and 2 faders are *"always 0 dB"* regardless of where they are, PAN is forced to
hard L and R, and the AUX/MAIN switches are forced to MAIN. So the Model 12 is
either a mixer or a control surface, and switching costs a menu trip. It also
remembers: *"If the unit is turned off while in DAW control mode, it will still
be in DAW control mode when restarted."*

### 4.4 What MCU actually puts on the wire

⚠️ **TASCAM PUBLISHES NO NOTE NUMBERS AND NO CC NUMBERS, ANYWHERE.** Both charts
classify message types and name the control class, and stop. The numbers below
are 🌐 THIRD PARTY, from a published reverse engineering document, and are here
so that a first measurement has something to disagree with. **They have not
been checked against a Model 12 and every one of them is 🔌 NEEDS THE
HARDWARE.** Source:
<https://github.com/NicoG60/TouchMCU/blob/main/doc/mackie_control_protocol.md>

| control | message | number |
|---|---|---|
| faders 1 to 8 | pitch bend, 14 bit | MIDI channels 1 to 8 |
| master fader | pitch bend | MIDI channel 9 |
| fader touch | note on and off | 104 to 111, master 112 |
| V-Pot rotation | CC, relative | 16 to 23, `0x01` up, `0x41` down |
| V-Pot LED ring | CC | 48 to 55 |
| REC per channel | note on and off | 0 to 7 |
| SOLO per channel | note on and off | 8 to 15 |
| MUTE per channel | note on and off | 16 to 23 |
| SELECT per channel | note on and off | 24 to 31 |
| rewind | note | 91 |
| fast forward | note | 92 |
| stop | note | 93 |
| play | note | 94 |
| record | note | 95 |
| jog wheel | CC, relative | 60 |
| LED feedback | note velocity | 0 off, 1 blink, 127 on |
| display | SysEx | `F0 00 00 66 14 ... F7` |

Two things to notice before building on this.

🔴 **V-POT AND JOG ARE RELATIVE, NOT ABSOLUTE.** `0x01` means one click
clockwise. A receiver that reads the value as a position gets 1 out of 127 and
concludes the knob is almost fully anticlockwise. This is not a level valued
controller and `demo/shell/cc-adapter.mjs`'s whole contract, that the last value
per controller is the truth, is false for it. Relative encoders need
accumulation at the receiver, which is edge valued behaviour wearing a CC status
byte.

⚠️ **THE MODEL 12'S OWN PAN KNOBS ARE PHYSICAL POTENTIOMETERS, NOT ENDLESS
ENCODERS.** ⚖️ INFERRED that they therefore send something absolute rather than
MCU's relative V-Pot codes, or that TASCAM converts a movement into a stream of
relative clicks. The chart says only `MCU: PAN, Encoder`. 🔌 NEEDS THE
HARDWARE, and it is the first thing a MIDI monitor would answer.

### 4.5 USB audio, drivers, and the Linux silence

📄 DOC:

- **12 in and 10 out.** *"12 tracks (10 input channels and MAIN MIX L/R bus)
  can be input to the computer."*
- **24 bit, 48 kHz ceiling.** Nothing higher exists over USB.
- **USB 2.0 high speed, USB C connector.**
- Two USB audio modes: **MULTI INPUT** (default, channels 1 to 6, 7/8, 9/10 and
  the MAIN bus into USB channels 1 to 12) and **STEREO MIX** (the MAIN bus into
  USB channels 1 and 2, which is the mode that exists for streaming software).
- **Windows needs the TASCAM driver**: *"To use this unit as a USB audio
  interface with a Windows computer, dedicated software must be installed."*
  ASIO 2.0 and WDM.
- **macOS does not**: *"With a Mac, the standard OS driver will be used, so
  installation of dedicated software is not strictly necessary."* iOS works
  through a Camera Adapter.

🔴 **LINUX IS NOT MENTIONED IN ANY TASCAM DOCUMENT.** Not in the supported
operating systems list, not anywhere. There are forum reports both ways. ⚖️
INFERRED that the macOS statement implies USB Audio Class 2.0 and USB MIDI
class compliance, which Linux handles natively, but **TASCAM never says the
words class compliant about this unit's USB audio** and the Windows driver
requirement is the kind of fact that sometimes means a vendor specific mode.
🔌 NEEDS THE HARDWARE.

⚠️ **THAT QUESTION WAS THE GATE IN THE FIRST DRAFT AND IS NOW DEFERRED WITH THE
PI**, §8 item 15. On the M2 it does not arise: TASCAM documents macOS, and §6.4
reads the sentence where they do it.

### 4.6 The recorder

📄 DOC. SD, SDHC or SDXC, class 10 or better, FAT16 / FAT32 / exFAT. **12
tracks**, WAV at 44.1 or 48 kHz and 16 or 24 bit, 2 GB per file.

**Nothing controls the recorder over MIDI.** No MMC, and the Recognize column
is NO everywhere. Over USB it is a mass storage device for file management and
nothing else.

---

## 5. Control direction, as one table, because it is not symmetric

| the question | Circuit | Model 12 |
|---|---|---|
| can a browser play notes on it | **yes**, Web MIDI to USB | no |
| can a browser move a parameter on it | **yes**, CC and NRPN | no |
| can the Pi change its patch | **yes**, program change | no |
| can the Pi change its tempo | only by being its clock | only by a hand on the menu |
| can anything start or stop its sequencer or transport | **yes**, start/stop/continue | **no** |
| can it play notes into this project | **yes**, if something reads them | in DAW control mode, as MCU button presses |
| can it move a parameter in this project | **yes**, macro CC 80 to 87 | **yes**, MCU faders as pitch bend |
| can it give this project a clock | **yes** | **yes**, while its transport runs |
| can it give this project a timecode | no | **yes**, MTC 30 fps |
| can it give this project audio over USB | **no** | **yes**, 12 channels |

Read down the last two rows. **The two devices are complementary in exactly the
place it counts**: the Circuit makes sound and cannot send it over USB, the
Model 12 makes no sound and sends twelve channels of anything plugged into it.

---

## 6. How they reach this project

### 6.0 The constraint changed on 2026-09-20, and this section was rewritten

🔴 **BOTH DEVICES GO INTO AN M2 MAC. NOT THE RASPBERRY PI.** Stated as
*"I can only plug circ and 12 devices to my m2 mac. Plan rigging and testing
for this"*, and then *"Pi plugging later"*.

**So the Pi is deferred, not cancelled.** The first draft of this section
planned an `aconnect` based route on the board and made `aconnect -l` the first
test. That was a Linux answer to a question that is now macOS. It is kept, as
§6.8, because the Pi is stage two and most of what was written about it is
still true. What is superseded is the ORDER, not the content.

⚠️ **AND EVERY macOS CLAIM BELOW IS READ, NOT MEASURED, EXACTLY LIKE THE LINUX
ONES.** Nothing has been plugged into anything. The marks mean the same here.

### 6.1 Which Mac, and the one fact that decides the whole shape

⚖️ **INFERRED, and it is the load bearing inference of this revision: "my m2
mac" is the work laptop this checkout sits on, not the studio Mac.**

The reasoning, 📁 REPO and machine readings:

- This machine reports `Apple M2 Pro`, `Mac14,10`, macOS 26.6.2.
- The studio machine is an **M1**. `rig/m1/README.md` measures the rack agent at
  *"4.2% of one core (M1 Pro)"*, and
  `rig/m1/studio.positron.rack-agent.plist` runs
  `/Users/kristjanjansen/positron-rack/live-agent.mjs`. This checkout's user is
  `s32863`. **Two machines, two accounts.**
- This project's own memory records that this laptop is
  ThreatLock and Microsoft Defender managed, and that **it SIGKILLs any locally
  compiled binary**, confirmed down to a trivial `int main(){return 7;}`.

🔴 **IF THAT INFERENCE IS RIGHT, THE M2 CANNOT COMPILE, AND THAT REMOVES THE
OBVIOUS ROUTE.** `rig/m1/midisend.c` and `rig/m1/midilisten.c` are eighty lines
each against CoreMIDI, they already exist, and they are exactly the two halves
this plan needs. **They are also `clang` invocations, and a `clang` invocation
on that laptop produces a binary that is killed.**

⚠️ **AND A BINARY BUILT ON THE M1 AND COPIED OVER IS NOT A WAY ROUND IT.** ⚖️
INFERRED: the policy is about unsigned locally built code, not about which
directory it was built in. `rig/m1/README.md` already records the adjacent
trap, that `audiotap` is codesigned with `--identifier studio.positron.audiotap`
and that a rebuild needs somebody to click Allow in person. 🔌 NEEDS THE
HARDWARE, or rather needs the laptop, and it is a thirty second test: copy one
harmless prebuilt binary over and run it.

⚠️ **IF THE INFERENCE IS WRONG AND THE M2 IS AN UNMANAGED PERSONAL MACHINE,
§6.4 GAINS A SECOND OPTION AND NOTHING ELSE IN THIS SECTION CHANGES.** The
browser route in §6.3 is the recommendation either way, because it is smaller,
not because the other one is blocked.

### 6.2 What already exists on the Mac path, read out of this repo

📁 REPO. There is more here than expected and it is in an odd state: the
sending half is finished and wired, the receiving half is finished and wired to
nothing.

| file | what it does | wired into anything |
|---|---|---|
| `rig/m1/live-agent.mjs` | relay socket, notes out, audio back | yes, `/rack/` |
| `rig/m1/midisend.c` | CoreMIDI out, one process, held open on stdin | yes, by `live-agent.mjs` |
| `rig/m1/audiotap.m` | Core Audio process tap, copies one app's output | yes |
| `rig/m1/studio.positron.rack-agent.plist` | LaunchAgent, survives reboot and `kill -9` | yes |
| **`rig/m1/midilisten.c`** | **CoreMIDI IN, prints every byte as hex** | 🔴 **nothing at all** |

🔴 **`midilisten.c` IS REFERENCED BY NOTHING BUT ITSELF.** Grepped the whole
checkout. It was written as a debugging instrument, its own header says why
(*"A claim about a wire needs something that reads the wire"*), it works, and
**no agent has ever called it**. It connects to every CoreMIDI source at once
and prints `90 3C 6E` style lines on stdout, which is a parseable stream a node
process could read the same way `live-agent.mjs` already reads `audiotap`.

⚠️ **AND CONNECTING TO EVERY SOURCE IS A HAZARD WITH THESE TWO DEVICES.** A
Circuit with Clock Tx ON emits 24 timing clocks per quarter note, which at
120 BPM is 48 messages a second, forever, whether anything is playing or not.
`midilisten` would print all of them. Anything built on it needs a source
filter that `midilisten` does not have.

🔴 **AND `live-agent.mjs` HAS NO `cc` VERB.** 📁 REPO: its `switch` handles
`note.on`, `note.off`, `note.panic` and `rack.status`, and that is the whole
list. `midisend.c` underneath it already parses `cc <n> <v> <ch>`, `prog`, and
`panic` on stdin. **So the agent is one `case` away from being able to move a
Circuit's macro knobs**, and the tool it would call needs no change at all.

### 6.3 The smallest rig that gets a Circuit note into a browser is Chrome

This is the answer to the question, and it is smaller than the question
assumes. **It is also browser specific, which the first draft of this section
did not say and had to be corrected on.**

📄 DOC: the Circuit's USB port *"is MIDI class compliant"*. ⚖️ INFERRED, and
strongly, that Chrome on macOS therefore sees it through Web MIDI with no
driver, no install and no agent.

🔴 **AND IT HAS TO BE CHROME, BECAUSE SAFARI HAS NO WEB MIDI AND HAS NEVER HAD
ANY.** 🌐 THIRD PARTY but about as solid as third party gets, two independent
sources: caniuse reads **not supported in every Safari version listed,
including the Technology Preview**, and WebKit bug 107250, *"Web MIDI API"*,
has been open and **unassigned since 2013**, its most recent comment in July
2025 still asking for the feature.
📁 REPO: `demo/shell/midi.mjs`'s own header already says *"Safari has none at
all"*, so this project knew and this plan did not until it was checked.

⚠️ **Firefox has it and is a fallback.** Chromium browsers and Firefox both
expose `navigator.requestMIDIAccess`; nothing on WebKit does, which on this
Mac means Safari and anything using its engine.

📁 REPO: `demo/shell/midi.mjs` already turns a Web MIDI input into the same two
calls the on screen keyboard makes, already treats a note on at velocity 0 as a
note off, and already reports a browser with no Web MIDI as a capability rather
than a fault. `demo/instrument/index.html` reads `requestMIDIAccess` directly
behind a button and **sends nothing anywhere**, which makes it the zero risk
first test in §9.

So the rig is:

```
Circuit  --USB-->  M2  --Chrome or Firefox, Web MIDI-->  a page
```

and for a note that reaches somebody else:

```
Circuit --USB--> M2 --Chrome--> the relay --> any other browser
```

**No agent. No native code. No compilation. Nothing installed.** The page holds
the relay socket, which is what `demo/shell/wire.mjs` already does for every
page on the site.

🔴 **THE PRICE IS THAT A TAB IS NOT A SERVICE.** The rack's whole unattended
story is a LaunchAgent, and a LaunchAgent that keeps a node process alive is
worth having. On a machine that cannot compile, node cannot reach CoreMIDI at
all: every Node MIDI binding is a native addon that compiles on install. **The
unattended answer for a machine that cannot compile is a LaunchAgent that
starts CHROME, not node**, because Chrome is a signed application and the page
is the agent. That is unusual and it is the honest shape here.

⚠️ **Web MIDI needs a secure context.** 📄 DOC, MDN: *"This feature is
available only in secure contexts (HTTPS)"*. `localhost` and `127.0.0.1` count
as secure under the standard definition, so `node demo/server.mjs` at
`127.0.0.1:8890` qualifies and so does the deployed site.

🔴 **AND SINCE CHROME 124 THE PROMPT IS FOR ALL WEB MIDI, NOT ONLY FOR SYSEX.**
📄 DOC, the Chrome for Developers blog, verbatim: *"the W3C Audio Working Group
has requested an explicit permission requirement for all MIDI API usage in the
Web MIDI specification. This change, previously in place only for advanced MIDI
usage (SysEx messages) in Chrome, now extends to standard MIDI interactions as
well. This means the entire Web MIDI API is now gated behind a permission
prompt."* Rolling out from Chrome 124, April 2024, so it is fully in effect.

**That is a change to what "nothing installed" means and it is worth being
precise about.** The browser route needs no driver, no toolchain and no agent.
It does need **one click, every fresh profile**, and a page that treats a
refusal as a fault will look broken to anybody who clicks the wrong button.
📁 REPO: `demo/shell/midi.mjs` already handles exactly that, reporting
`refused` separately from `unsupported` separately from `none plugged in`,
which is the right three way split and was written before this rule existed.
🔌 Whether the grant persists for `127.0.0.1:8890` across browser restarts
needs the machine.

⚠️ **AND SYSEX IS STILL AN ESCALATION ON TOP, WHICH THIS REPO DOES NOT ASK
FOR.** 📁 REPO: both `demo/shell/midi.mjs:57` and `demo/shell/hardware.mjs:115`
pass `{ sysex: false }`. 📄 DOC, MDN, on the Permissions API: `sysex` is a
distinct sub field of the `midi` permission descriptor, so it is a larger form
of the same grant rather than a separate one. So a page can play a Circuit and
move its macros, and cannot touch the three SysEx messages in §3.8. Turning it
on is one argument and a stronger prompt, and it should be deliberate.

### 6.4 The Model 12 on a Mac, where its Linux uncertainty mostly evaporates

📄 DOC, Owner's Manual: *"With a Mac, the standard OS driver will be used, so
installation of dedicated software is not strictly necessary. We recommend
installing this software, however, because it has a notification function about
updates for the unit firmware and software."*

**That sentence is worth reading twice.** The reason given for installing the
Mac software is update notifications. Not audio. Not MIDI. So ⚖️ INFERRED:
class compliant Core Audio and class compliant USB MIDI, with the Mac package
being convenience. This is a much better position than §8.1's Linux question,
which TASCAM never addresses at all.

📄 DOC, supported audio drivers: **Core Audio on Mac, ASIO 2.0 and WDM on
Windows.** Windows is the one that needs the driver.

🔴 **AND macOS 26 IS EXPLICITLY LISTED IN THE CURRENT MANUAL, WHICH IS BETTER
EVIDENCE THAN ANY INFERENCE.** 📄 DOC, read out of the newest Owner's Manual
revision, supported operating systems for Mac: **`macOS Tahoe 26`,
`macOS Sequia` [printed that way, TASCAM's own typo], `macOS Sonoma`**. This
machine runs 26.6.2.

⚠️ **AND THE ARM64 CAVEAT IN THAT TABLE IS A WINDOWS CAVEAT, NOT A MAC ONE.**
The Windows column carries *"Operation not guaranteed with ARM64 CPUs"* and the
Mac column carries no CPU caveat at all. **TASCAM clearly does flag an
architecture when it is a problem and chose not to for Mac**, which is a
stronger reading than an absence of mention on its own. ⚖️ Still an inference
about Apple Silicon: no TASCAM sentence names M1 or M2 anywhere.

⚠️ **THE MAC SETTINGS PANEL HAS NOTHING REQUIRED IN IT.** 📄 DOC: the app is
"TASCAM Model Mixer", currently V2.20, and its fields are Software Ver,
Firmware Ver, Device, Sample Rate (read only) and an update notification
checkbox. The one setting that changes behaviour, **Buffer Size, is labelled
"(Windows only)"** in the manual's own breakdown. Every routing choice that
matters, MULTI INPUT against STEREO MIX, the USB return channel, OUTPUT DELAY,
is set from the console's own jog dial. **It is not a driver and nothing in it
is a prerequisite.**

📄 DOC on the port names, from the DAW Control Mode Manual's macOS walkthrough
for Live: the input is `Model 12 MIDI (DAW Control IN)` and the output is
`Model 12 (DAW Control OUT)`. ⚠️ **THE MANUAL IS INCONSISTENT ABOUT THE PARENTHESES AND BOTH FORMS ARE
PRINTED.** The Live page on macOS says `Model 12 MIDI (DAW Control IN)` and
`Model 12 (DAW Control OUT)`; every other DAW's macOS note in the same document
says `Model 12 MIDI DAW Control IN` and `Model 12 DAW Control OUT` with no
parentheses. **Anything that matches on the string has to cope with both**, and
neither is confirmed against a real device.

⚖️ INFERRED that a second port pair exists for the 5 pin DIN sockets, and the
evidence is now better than "port 2 implies port 1": 📄 DOC, the Owner's
Manual block diagram draws **two separate blocks bridging to USB**, one labelled
`MIDI IN/OUT` with the annotations *"MIDI OUT ( MTC, MIDI CLOCK, MIDI message
out )"* and *"MIDI IN ( USB conversion )"*, and a separate one labelled
`DAW CONTROLLER`. 🔌 **The macOS name string for that DIN pair is not printed
anywhere**, in either manual, and no third party quotes it. Audio MIDI Setup
answers it by looking, and **do not assume it mirrors the Windows "Port 1"
naming**, because CoreMIDI entity names routinely differ from a Windows
driver's port names for one device.

### 6.5 The two defects, on this path, and both got sharper

**Defect one is now directly in the road, and it needs no hardware to prove.**

📁 REPO, `demo/shell/cc-adapter.mjs:54`:

```js
export const COARSE = (n) => (n >= 32 && n < 64 ? n - 32 : n);
export const has14 = (n) => n < 32;
```

On the Pi route the Circuit's CC would have crossed a relay and might never
have touched this module. **On the Mac route it is browser code reading a
browser's Web MIDI bytes, so it is the first thing a Circuit's traffic meets.**

🔴 **AND IT IS A PURE FUNCTION, SO IT WAS MEASURED WHILE WRITING THIS, WITH NO
DEVICE AND NO RIG. THIS IS THE ONE THING IN THIS DOCUMENT THAT IS NOT A
READING.** Run against the module in this checkout on 2026-09-20:

```
CC  35 -> key cc:0:3     | COARSE 3  | label CC3
CC  51 -> key cc:0:19    | COARSE 19 | label CC19
CC  60 -> key cc:0:28    | COARSE 28 | label CC28
CC  45 -> key cc:9:13    | COARSE 13 | label CC13
CC  74 -> key cc:0:74    | COARSE 74 | label CC74 cutoff
```

Read against §3.3 and §3.4, every one of those is a real Circuit parameter
being filed under a different real Circuit parameter:

| the Circuit sends | it is | filed under | which is |
|---|---|---|---|
| CC 35 ch 1 | osc 2 density | `cc:0:3` | polyphony mode |
| CC 51 ch 1 | osc 1 level | `cc:0:19` | osc 1 wave |
| CC 60 ch 1 | filter routing | `cc:0:28` | osc 1 pitchbend |
| CC 45 ch 10 | drum 3 level | `cc:9:13` | nothing on channel 10 |

🔴 **AND THE WORST CASE IS WHEN BOTH HALVES ARE REAL CONTROLS, WHICH MEASURED
WORSE THAN PREDICTED.** Fold a CC 3 row and a CC 35 row together:

```
entries: 1
cc:0:3  bits 14  msb 2  lsb 100  -> re-sends [[176,3,2],[176,35,100]]
```

**Two different parameters became ONE fourteen bit series.** `msb 2` is
polyphony mode set to Poly, `lsb 100` is osc 2 density at 100, and the entry's
`value14` is 356, a number that describes neither. Every consumer of the map
is now wrong: the digest, the keyframe, the count of live controllers, and
above all `ccInterpolate`, which would ramp that series during a seek and send
polyphony mode marching through 0, 1 and 2 while sweeping a density.

⚠️ **AND ACTUATION SURVIVES, WHICH IS WHY NOBODY WOULD NOTICE.** `assertBytes`
re-sends `[176,35,100]` for the lone entry and `[[176,3,2],[176,35,100]]` for
the merged one. **Both are the correct bytes.** So the synth does the right
thing and the recording is wrong, which is this project's own worst shape:
green everywhere, defect downstream of every quantity being measured.

What the hardware adds is the other half, that the Circuit really does answer
CC 35 as osc 2 density, which is 📄 DOC and is tier 2 in §9.

**Defect two turns out to exist in TWO places, and the second one is on the Mac
path.** The first draft named only `rig/board/board.mjs`'s `ctl.set`, which is
the Pi. 📁 REPO, `demo/shell/cc-adapter.mjs`'s send gate has the same shape:

```js
put(controller, value, { end = false } = {}) {
  const c = controller | 0;
  if (pending.has(c)) stats.thinned++;
  pending.set(c, { v: clamp7(value), end, isSwitch: SWITCHES.has(c) });
}
```

`live`, `pending` and `lastSent` are all keyed by controller number, `put` takes
no channel, and `tick` returns `{ set: [[controller, value], ...] }` with no
channel in it. **There is nowhere for a channel to go.** Against Yoshimi, one
channel, that is correct and the coalescing it buys is the right design.
Against a Circuit, CC 12 is Drum 1 level on channel 10 and Synth 1 level on
channel 16, and they collide in `pending`, and `stats.thinned` would count a
thinning that is really a collision.

🔴 **MEASURED, 2026-09-20, same session, no device.** Offer CC 12 twice, once
as Drum 1 level and once as Synth 1 level, and tick:

```
tick  -> {"set":[[12,40]]}
stats -> {"offered":2,"sent":1,"messages":1,"thinned":1,"restated":0}
```

**One of the two values is gone and the meter calls it a thinning.** A thinning
is a value overtaken by a newer value of the SAME control; this was two
different controls on two different channels, and the counter cannot tell them
apart because the channel never entered the function.

**So the same defect is in the kit module and in the board verb, and the Mac
stage reaches the kit one.** Both repairs are a key change, `${ch}:${c}` rather
than `c`, and both change what a meter counts, so per this project's own rule
the per page assert counts have to be diffed afterwards.

⚠️ **THE THIRD ONE IS SMALLER AND WORTH FIXING AT THE SAME TIME.**
`cc-adapter.mjs` treats CC 64 to 69 as `SWITCHES`, never throttled and never
interpolated. On a Circuit, 65 is filter drive type and 68 is filter type, both
discrete enums, and stepping them is **right**. But **69 is filter tracking,
0 to 127 continuous**, and it would be held flat instead of ramped. One
controller, wrong for one device, for a reason that is correct in general.

### 6.6 Twelve channels of audio into a Mac, which is the Model 12's real offer

📄 DOC: 12 in and 10 out, 24 bit, up to 48 kHz, over USB 2.0 high speed on a
USB-C connector. Two modes: MULTI INPUT, which is channels 1 to 6 plus 7/8 plus
9/10 plus the MAIN bus into USB channels 1 to 12, and STEREO MIX, which is the
MAIN bus into USB 1 and 2.

🔴 **A BROWSER PROBABLY CANNOT HAVE ALL TWELVE, AND THIS IS THE LIMIT TO KNOW
BEFORE DESIGNING ANYTHING AROUND IT.** ⚖️ INFERRED: `getUserMedia` on macOS
hands Chrome a device and Chrome has historically exposed two channels of an
input regardless of how many the device has, with `channelCount` above 2 being
a constraint the browser is free to ignore. **This project has never measured
it.** 🔌 NEEDS THE HARDWARE, and it is a single `getUserMedia` with
`channelCount: 12` and a look at what the track reports.

**If it is two, the honest statement is that a browser gets a stereo mix and
anything multichannel needs a process.** On the managed M2 that process cannot
be something compiled, which points at `ffmpeg -f avfoundation`, a prebuilt
binary already on this machine.

🔴 **AND IF IT DOES, THE avfoundation INDEX RULE APPLIES AND IT HAS ALREADY
COST THIS PROJECT A SESSION.** CLAUDE.md records it: an avfoundation device
INDEX is a shared mutable global, `:0` meant the microphone when
`rig/m1/README.md` was written and means BlackHole today, and **both read
-91.0 dB**, where one reading proves "this capture is deaf" and the other
proves "nothing is playing". **Resolve by NAME from `-list_devices true` every
time.** `rig/m1/live-check.mjs` already does.

⚠️ **DO NOT RUN `-list_devices true` CASUALLY ON THIS LAPTOP.** It can raise a
microphone or camera permission prompt, and this project already has a written
lesson about background work surfacing as an OS alert on a managed machine.
It is a test for a person at the keyboard, which is why it is in §9 and was not
run while writing this.

### 6.7 What the Mac stage makes easier, and harder, for the Pi stage

Asked for explicitly, because it is cheap to notice now.

**Easier:**

- 🔴 **Everything measured about the DEVICES is machine independent.** Whether
  CC 35 really is osc 2 density, whether the drum notes really are 60/62/64/65,
  whether NRPN rides CC 99/98/6, whether the master filter really folds at 64,
  whether a Circuit stops when a Model 12 stops. Measure those once on the Mac
  and the Pi stage inherits every one of them. **That is most of §8.**
- **The `cc-adapter.mjs` repairs land in a browser module both stages use.** Fix
  the fold and the channel key on the Mac stage and the Pi stage starts correct.
- **`demo/shell/midi.mjs` and `board.mjs`'s note path end at the same two
  functions**, by design and by that file's own comment, so a page that reads a
  Circuit over Web MIDI is already the page that would read one through the
  board.

**Harder, or at least different:**

- 🔴 **PORT NAMES WILL NOT MATCH AND MUST NOT BE COPIED ACROSS.** CoreMIDI's
  display name and ALSA's client name are two different strings for one device.
  `rig/board/fixtures/aconnect-l.txt` asserts `client 20: 'Circuit'` with a
  port called `Circuit MIDI 1`, and five asserts in `rig/board/test.mjs` defend
  it. **A name read in Audio MIDI Setup is not evidence about that fixture.**
  Letting a Mac measured string become the Pi's fixture would be this project's
  own two-numbers-from-one-field rule with a cable in it.
- 🔴 **The `carry` problem does not exist on the Mac and appears on the Pi.**
  Web MIDI hands a page one port's traffic. An ALSA subscription is unfiltered,
  and `rig/board/alsa.mjs` **refuses** a subset rather than over connecting,
  which is correct and means every honest Circuit to Model 12 document on the
  Pi is `carry: ["all"]` and therefore carries the clock. A clock leak that
  cannot happen at stage one becomes possible at stage two.
- **Two clock masters becomes reachable at stage two.** The Mac cannot
  accidentally join a Circuit's MIDI OUT to a Model 12's MIDI IN. A patchbay
  can, in one line, and §7's rules exist for that moment.
- **The tooling inverts.** Linux has `aconnect`, `aseqdump` and `amidi` as CLI
  tools with no compilation. macOS has none of those and needs either a
  compiled CoreMIDI client or a browser. **So the machine that cannot compile is
  the one that needs the browser, and the machine that can is the one that does
  not need to.**

### 6.8 The Pi route, deferred to stage two, kept because it is still true

Everything here was written before the constraint changed and none of it has
been contradicted. It is what stage two starts from.

**Writing MIDI from the board: works today, one direction, one port.** 📁 REPO,
`rig/board/jacksynth.mjs:753` finds the `snd-virmidi` raw device, `aconnect`s
its sequencer client to the instrument, and opens it **write only**:

```js
if (vm && alsaClient) {
  sh(`aconnect ${vm.client}:0 ${alsaClient}:0`);
  try { midiFd = openSync(vm.dev, 'w'); } catch (e) { ... }
}
```

So `cc` and `ctl.set` put three bytes on an ALSA sequencer port, and a
`patch.apply` connecting that same virmidi client to a Circuit's input would
make the board play the Circuit with no new code.

**Reading MIDI on the board: almost, and not usefully.** `rig/board/synth.mjs`
has `alsaNotes()`, which spawns `stdbuf -oL aseqdump` and parses its output.
Three limits, all in the code:

1. **It parses note on and note off and nothing else.** Two regexes. No CC, no
   clock, no program change, no pitch bend, no SysEx.
2. **It is started in one place**, `board.mjs` `startAudio` when
   `source === 'synth'`, the FM Rhodes, of which that file says *"NO LONGER
   OFFERED... not listed, not the default, not on the page."* On the Yoshimi
   path it never runs.
3. **Nothing it reads leaves the board.** The callback goes straight to
   `synth.noteOn` and `synth.noteOff`.

🔴 **So at stage two a Circuit still cannot reach a browser THROUGH the board**
until somebody writes a reader that parses more than two message types and
forwards to the relay. ⚠️ **And stage one does not remove that work, it defers
it**, because the Mac route goes Circuit to browser directly and never touches
the board at all.

**The patchbay is ready and its refusal is the interesting part.** 📁 REPO,
`rig/board/alsa.mjs`: a patch is a document, names resolve against what ALSA
reports, ambiguity is reported rather than guessed, and a plan is produced
before anything is applied. Its own comment:

> *"An ALSA subscription is unfiltered, and there is no per-class option on the
> connection. So a document asking for a SUBSET is refused rather than
> approximated: applying a full connection where 'note only' was asked would
> leak clock and transport into a rig."*

With a Circuit that transmits clock by default, that refusal is doing real work
and there is no way to express what somebody means by "notes only". The answer
is §7: filter at the sending device's own Tx switches, not in the patchbay.

### 6.9 The pairing that is actually interesting, and it survived the change

```
Circuit analogue out  ->  Model 12 channels 1 and 2
Circuit USB           ->  M2, Web MIDI, notes and knobs
Model 12 USB          ->  M2, audio and DAW control
Model 12 MIDI OUT     ->  clock, when its recorder is running
```

The Circuit's one real limitation, that no audio comes over its USB, is exactly
what the Model 12 removes, and it removes it for nine other things at once.

⚠️ **On the M2 this is two USB devices and two cables of different kinds.**
§6.10 is about that, and it is the most boringly practical thing in this
document and the thing most likely to stop day one.

### 6.10 The cables, and the one instruction TASCAM repeats three times

🔴 **NEITHER DEVICE CAN BE PLUGGED INTO THIS MAC WITH THE CABLE IN ITS BOX.**
📄 DOC for both halves:

| device | socket on the device | cable supplied | reaches an M2 Pro |
|---|---|---|---|
| Circuit | **USB 2.0 Type B** | *"A Type B-to-Type A cable is supplied with the unit"* | **no** |
| Model 12 | **USB-C**, *"Connector: 4-pin USB C-type"* | *"Use the included Type-A-Type-C USB cable"* | **no** |

An M2 Pro has Thunderbolt / USB-C ports and no USB-A at all. So the Circuit
needs a **USB-C to USB-B** cable or a USB-A to USB-C adapter, and the Model 12
needs a **USB-C to USB-C** cable, which is not in its box.

⚠️ **Any basic cable will do, and this is worth saying so nobody buys a
Thunderbolt cable for it.** 📄 DOC: the Model 12 is *"USB 2.0 HIGH SPEED
(480 Mbps)"* and its connector is described as **4-pin**, which is USB 2.0
signalling on a USB-C shell. The Circuit's port carries MIDI only, at USB 1.1
data rates. Neither needs USB4, Thunderbolt or a high wattage cable.

🔴 **AND THE MODEL 12 MUST NOT GO THROUGH A HUB. TASCAM SAYS SO THREE TIMES.**
📄 DOC, Owner's Manual, as an ATTENTION box in the connector guide, again in
"Connecting a computer", and again in Troubleshooting:

> *"The unit should be connected directly to the computer, not through a USB
> hub. Moreover, noise could be picked up if the cable is too long."*
>
> *"Do not use a USB hub with this unit. Always connect the unit directly to a
> USB port on the computer."*

The second of those is printed as the FIX for a recognition failure, so it is
not only about noise. TASCAM never says why. **Treat it as a hard constraint:
the Model 12 gets its own port on the Mac.**

⚠️ **The Circuit's manual says nothing about hubs at all**, and a search of the
whole User Guide text finds no occurrence of the word. ⚖️ INFERRED that a
class compliant MIDI only device at USB 1.1 rates is the least hub sensitive
thing there is, but Novation does not say so. **So if one of the two has to
share, it is the Circuit.**

🔴 **THE CIRCUIT STILL NEEDS ITS OWN POWER, WHICHEVER PORT IT IS IN.** 📄 DOC,
verbatim: *"It cannot be powered from a computer or other device via a USB
connection."* Mains adaptor or six AA cells. And 📄 DOC again, for firmware:
**not the batteries**, §1.3.

### 6.11 One of them is a MIDI interface and the other is not

A small asymmetry with a useful consequence, and neither manual puts the two
facts side by side.

📄 DOC, Model 12: the DIN sockets are **bridged to USB in both directions**.
*"MIDI signals input through this connector will be sent to the computer"* and
*"This outputs MIDI signals sent from the computer."* The block diagram draws
the MIDI IN block as *"MIDI IN ( USB conversion )"*.

📄 DOC, Circuit: *"Circuit is able to send and receive MIDI data both via the
USB port and the dedicated MIDI IN and MIDI OUT sockets."* Both paths reach the
**Circuit**. Nothing says traffic arriving on its DIN IN is forwarded to its
USB, and nothing in the User Guide suggests it is.

⚖️ INFERRED, and it follows: **the Model 12 is a USB MIDI interface for other
people's gear and the Circuit is not.** So there is a second route for a
Circuit's MIDI into the Mac that does not use the Circuit's USB port at all:

```
Circuit MIDI OUT --TRS to DIN--> Model 12 MIDI IN --USB--> M2
```

That is worth knowing for three reasons. It frees the Circuit's USB socket. It
is the only way a third DIN device would ever reach this rig. And it means the
Model 12's DIN OUT can carry the Mac's MIDI back out to anything, which is a
capability the Circuit alone does not give you.

⚠️ **It also puts the Model 12's clock on the same wire**, §4.2, because
MIDI TIMECODE and MIDI CLOCK/SPP are mixed into that same DIN OUT when they are
switched on. §7's rules apply to this route exactly as they do to a direct
cable.

---

## 7. Clock, and who owns it

Three things here could own the tempo. **Two of them can and one of them should
not.**

⚠️ **EVERYTHING BELOW ASSUMES A CIRCUIT ON FIRMWARE 1.5 OR LATER**, because
that is when the eight Settings View switches were complete and when
independent Clock Tx and Rx became settable. §3.9 and §1.2 have the working.
On an older unit, read §7.2's instructions as things to attempt and verify
rather than as switches you can be sure exist.

### 7.1 What each candidate can actually do

| candidate | can lead | can follow | notes |
|---|---|---|---|
| **Circuit** | yes, Clock Tx ON | yes, Clock Rx ON | follows automatically, 30 to 300 BPM |
| **Model 12** | yes, MIDI CLOCK/SPP ON | **no** | only while its transport runs |
| **Raspberry Pi** | nothing in this repo generates a clock | n/a | see below |

📁 REPO on the Pi: there is no MIDI clock anywhere in `rig/board`. The board's
own timebase is a 20 ms audio frame out of a JACK graph, which is a buffer size
and not a musical tempo. ALSA's sequencer has a queue that could generate one
and nothing uses it. **So the Pi is not a clock candidate, it is a clock
candidate that would have to be written**, and CLAUDE.md's existing rule about
not making the box the timing path is an argument against writing it.

### 7.2 The arrangement, stated plainly

🔴 **IF THE MODEL 12'S RECORDER IS INVOLVED AT ALL, THE MODEL 12 IS MASTER.
THERE IS NO OTHER OPTION, BECAUSE IT CANNOT FOLLOW ANYTHING.**

```
Model 12  MIDI CLOCK/SPP = ON
Circuit   Clock Rx = ON, Clock Tx = OFF
Pi        out of the clock path entirely
```

The consequences, all 📄 DOC and all worth knowing before somebody discovers
them in a session:

- **Pressing STOP on the Model 12 stops the Circuit.** The Model 12 only sends
  clock while playing or recording; the Circuit stops when a clock it was
  following disappears and shows `SYN` until Play is pressed.
- **The tempo is the Model 12's metronome setting**, not anything about the
  audio.
- **Locating on the Model 12 sends a song position pointer**, and the Circuit
  supports SPP, so a locate is expected to move the Circuit's playhead.
  🔌 NEEDS THE HARDWARE to see whether that is musical or a lurch.
- **Clock Tx OFF on the Circuit is not optional.** Leave it ON, which is the
  factory setting, and the Circuit re-transmits the Model 12's clock out of both
  its USB and its DIN, which in an `aconnect` graph that carries everything is
  one link away from a loop.

🔴 **IF THE RECORDER IS NOT INVOLVED, THE CIRCUIT IS MASTER AND THE MODEL 12 IS
NOT IN THE MIDI PATH AT ALL.**

```
Circuit   Clock Tx = ON, Clock Rx = OFF
Model 12  MIDI CLOCK/SPP = OFF, and it is an audio interface
Pi        follows, if anything on it needs to
```

Clock Rx OFF rather than ON is deliberate: with Rx ON the Circuit will follow
any valid clock that appears, so a stray link in the patchbay silently changes
who is in charge, and the first symptom is a tempo that is nearly right.

🔴 **THE DEFAULTS ALREADY PUT YOU IN THE SECOND ARRANGEMENT, AND THAT IS
FORTUNATE.** The Circuit ships with Clock Tx and Clock Rx both ON; the Model 12
ships with MIDI CLOCK/SPP OFF. So out of the box the Circuit leads and the
Model 12 says nothing. **The dangerous move is turning the Model 12's clock on
without turning the Circuit's Clock Tx off**, which produces two transmitters on
one bus with nothing in either device to report it.

### 7.3 MTC is a separate answer and it is the better one for this project

📄 DOC: the Model 12 sends MIDI Time Code, quarter frames while running and a
full message when locating, at 30 fps non drop. The Circuit does not speak MTC
at all.

**That makes MTC useless between the two devices and interesting to this repo.**
MTC is wall clock position, not tempo, which is the same quantity
`timeline/` already works in and the same quantity `followTarget` and `armWall`
were built for in `demo/shell/strip.mjs`. A Model 12 recording a take and
emitting MTC is a hardware write head, and this project already has a strip that
follows one.

⚠️ **30 fps non drop is fixed and it is not 25 and not 29.97.** Anything
converting it has to be told, not asked, which is the declare-do-not-infer rule
again.

---

## 8. What is genuinely uncertain

Listed so none of it gets quietly assumed later, **re-ordered on 2026-09-20**
when the rig moved from the Pi to the M2. Two things that were near the top
moved down because they are now stage two, and two things moved up because the
Mac route reaches them first.

🔴 **AND ONE ITEM LEFT THE LIST ENTIRELY BECAUSE IT WAS MEASURED.** The first
draft listed the `cc-adapter.mjs` fold as a reading of the code. It is a pure
function, it was run, and §6.5 now carries the output. **A thing on this list
that can be settled by running it is a thing that should not be on this list.**

### The ones that would change the plan

1. 🔌 **What does the Model 12 actually transmit in MCU mode?** **This is now
   the biggest single unknown in the document**, and it is the only one that no
   amount of reading can close: TASCAM publishes no note numbers and no CC
   numbers anywhere, in either manual. §4.4's table is a third party reverse
   engineering document and is unverified against this unit. In particular,
   **what do the physical pan potentiometers send**, given that MCU's V-Pot is
   a relative encoder and these are absolute pots. Settled by §9 test 2.7: one
   fader move and one button press.
2. 🔌 **Is "my m2 mac" the ThreatLock managed laptop, and does it kill binaries
   built elsewhere as well as binaries built on it?** §6.1 rests on this, and
   the answer decides whether `midisend` and `midilisten` are available at all
   or whether the browser is the only MIDI path. Settled by §9 test 0.3: copy
   one harmless prebuilt binary over and run it.
3. 🔌 **Which firmware is on each unit?** Not a research question any more, a
   menu press, and §1 now carries both procedures. It is high on this list only
   because it gates how much of §3 applies to the Circuit in the room.
4. 🔌 **Can a browser have more than two channels of a twelve channel input?**
   §6.6. If it cannot, the Model 12's whole multichannel offer needs a process
   rather than a page, and on a managed laptop that process cannot be something
   compiled. Settled by §9 test 4.2.
5. ⚖️ **How should NRPN live in a level valued control plane?**
   `cc-adapter.mjs` is built on the argument that the last value per controller
   is the whole truth. NRPN is a stateful four message sequence, so a dropped
   parameter select makes the next data entry land somewhere else. **Half the
   Circuit's engine is only reachable this way**, including every LFO and every
   macro knob assignment. There is no answer in this repo and this plan does
   not have one either. **This is the only item here that hardware cannot
   settle**, because it is a design question rather than a fact.

### The device questions, all cheap once something is plugged in

6. 🔌 **Which controllers carry NRPN on the Circuit?** Presumed CC 99, 98 and 6
   by convention. Novation gives addresses as `bank:number` and never names the
   controllers. §9 test 2.5.
7. 🔌 **Does `synth 2 depth` live at NRPN `1:69` or `2:69`?** Both published
   document versions say `1:69` while its four siblings are in bank 2. Two
   minutes: send both and hear which one ducks.
8. 🔌 **Does the Circuit's physical Filter knob transmit CC 74 on channel 16?**
   The PRG documents the parameter and never says the front panel control
   sends it. §9 test 1.7.
9. 🔌 **Exactly what counts as "the clock was removed" to a Circuit**, given
   that the User Guide says one thing on page 57 and a compatible but different
   thing on page 68, and that a Model 12 master stops its clock on every STOP.
   §9 test 3.2, and it decides whether §7's arrangement is usable.
10. 🔌 **Which TRS MIDI type is the original Circuit?** Third party says Type B.
    Novation's own compatibility article answers 403 to an automated fetch. The
    wrong cable produces no notes and no error, so this can masquerade as a
    different test failing.
11. 🔌 **What are the CoreMIDI port names, and how many ports does each device
    present?** Narrowed rather than closed. **Known**: the Model 12's DAW
    Control pair, in two spellings the manual cannot agree on, §6.4.
    **Unknown**: the macOS name for the Model 12's DIN pair, the Model 12's
    name as an audio device, and the Circuit's name in CoreMIDI. Secondary
    sources converge on the Circuit simply appearing as `Circuit`, and no
    Novation document or screenshot confirms it. Audio MIDI Setup answers all
    three by looking.
12. 🔌 **Does the Circuit work on macOS 26 at all?** Novation's own
    compatibility article, updated 2026-09-17, lists it under **Discontinued
    products** with Apple Silicon support **"Untested but likely to work"** on
    macOS 26 and 27, against a plain **Yes** for macOS 12 through 15. **This
    machine is on 26.6.2.** Not a prediction of trouble, an absence of a
    manufacturer check, and §9 test 1.3 is where it stops mattering.
13. ⚖️ **Does a Circuit firmware update reset the Settings View switches?**
    Inferred not, because content restore and firmware update are separate
    operations and neither is documented as touching them, and because **the
    Circuit has no factory reset at all**. Worth confirming before trusting a
    clock setup across an update, since the factory state is the opposite of
    what §7 wants.

### Stage two, deferred with the Pi

14. 🔌 **Does the Model 12's DAW Control port pair enumerate under Linux ALSA?**
    TASCAM documents macOS and Windows and never mentions Linux. **This was the
    biggest uncertainty in the first draft and it is now deferred**, because
    nothing at stage one depends on it. One `aconnect -l` settles it when a Pi
    is in the picture.
15. 🔌 **Is the Model 12's USB audio class compliant on Linux?** Same silence,
    separate question, because audio and MIDI are separate USB interfaces on
    one device and either can work without the other.
16. 🔌 **Does the Circuit enumerate on ALSA as `Circuit` with a port called
    `Circuit MIDI 1`?** Five asserts in `rig/board/test.mjs` are written as
    though it does, against an invented fixture. ⚠️ **A CoreMIDI name measured
    at stage one is not evidence about this**, §6.7.
17. ⚖️ **Whether a MIDI reader on the board should parse `aseqdump` text or read
    the virmidi character device directly.** §6.8. Nobody has needed to decide
    yet.

---

## 9. Rigging and testing on the M2, cheapest first

🔴 **THE FIRST TWO TESTS NEED NOTHING PLUGGED INTO ANYTHING AND ONE OF THEM
NEEDS NO DEVICE AT ALL.** That ordering is deliberate: this plan contains a
code defect that is a pure function and a firmware question that is a menu
press, and both were being treated as though they needed a rig.

Every row says what it turns from 📄 DOC or 📁 REPO into 🔴 MEASURED. A test
that upgrades nothing is a test nobody needs to run.

### Tier 0. Nothing plugged in, nothing installed

| # | test | proves | status |
|---|---|---|---|
| 0.1 | `foldRows` on a CC 35 row, and on a CC 3 plus CC 35 pair | the 32 to 63 fold | ✅ **DONE 2026-09-20**, output in §6.5 |
| 0.2 | `makeCcSend.put` twice on CC 12, then `tick` | the missing channel key | ✅ **DONE 2026-09-20**, output in §6.5 |
| 0.3 | Copy one harmless prebuilt binary from the M1 to the M2 and run it | whether the managed machine kills binaries built elsewhere as well as binaries built on it | 🔌 open, and §6.1 rests on it |

🔴 **0.1 AND 0.2 WERE RUN WHILE WRITING THIS AND BOTH DEFECTS ARE REAL.** They
are pure functions in this checkout, they needed no Circuit, no relay and no
board, and they had been sitting in the previous draft as readings of code.
**That is the lesson worth keeping from this revision**: a claim about a pure
function is never a claim that needs hardware, and putting one on an
uncertainty list is a way of not running it.

⚠️ **0.3 IS NOT A FORMALITY.** If a copied binary runs, `midisend` and
`midilisten` are available on the M2 after one build on the M1, and the whole
native agent route reopens. If it is killed, §6.3's browser route is not a
preference, it is the only one.

### Tier 1. One device, on a desk, with nobody listening

🔴 **BEFORE ANY OF THIS: THE CABLES ARE NOT IN THE BOXES.** §6.10. The Circuit
ships Type B to Type A, the Model 12 ships Type A to Type C, and an M2 Pro has
no Type A port. **You need a USB-C to USB-B cable for the Circuit and a USB-C
to USB-C cable for the Model 12**, neither of which is supplied, and the
Model 12 must go **directly into the Mac and not through a hub**, which TASCAM
prints three times. This is the most likely reason day one stops.

**Then read the firmware. Both devices. Before anything else.**

| # | test | needs | proves |
|---|---|---|---|
| 1.1 | Circuit: try Shift + Record, and Shift on power-up then Synth 1. §1.1's feature check | Circuit, powered | whether you have 1.8 (the channel assignment) and at least 1.5 (**the eight Settings View switches §7 needs**) |
| 1.2 | Model 12: stop the recorder, MENU, SYSTEM, INFORMATION, jog to FIRMWARE, read VERSION | Model 12, powered | which row of §1.5 is yours. ⚠️ **If it reads V1.22, STEREO MIX is broken and 1.23 is the fix** |
| 1.3 | Plug the Circuit into the M2. Open Audio MIDI Setup. | Circuit, M2, a USB-C to USB-B cable | the CoreMIDI name, 📄 DOC class compliance becomes 🔴 measured, **and whether a device Novation has not tested on macOS 26 works on macOS 26**, §8 item 12 |
| 1.4 | Open `http://127.0.0.1:8890/instrument/` **in Chrome, not Safari**, press the MIDI button, accept the prompt, hit a synth pad. | as above | a Circuit note in a browser, **the whole of §6.3** |
| 1.5 | Hit each of the four drum pads with the page's log open. | as above | the drum note numbers 60, 62, 64, 65, §3.2 |
| 1.6 | Turn each macro knob. Watch what arrives. | as above | CC 80 to 87, §3.3, and whether a knob transmits at all |
| 1.7 | Turn the physical Filter knob. | as above | whether the master filter transmits CC 74 on channel 16, which §3.5 does not state |
| 1.8 | Press play on the Circuit with nothing else connected. | as above | whether Clock Tx is ON, and at what rate, §3.9 |
| 1.9 | Plug the Model 12 into the M2, **direct, no hub**. Audio MIDI Setup, MIDI window and audio window. | Model 12, M2, a USB-C to USB-C cable | how many CoreMIDI ports and what each is called, §6.4, **including the DIN pair's name, which no document prints** |
| 1.10 | Same window, audio tab: read in and out channel counts and rates. | as above | 12 in / 10 out, 24 bit, 48 kHz, §4.5 |

⚠️ **1.4 USES `/instrument/` ON PURPOSE AND NOT `/rack/`.** 📁 REPO:
`/instrument/` reads `requestMIDIAccess` behind a button and **sends nothing to
any relay**. `/rack/` is the only page that calls `createMidi`, and it also
sends `note.on` into room `m1-1`, which is the studio Mac's Ableton Live. **The
first test should not play an instrument in another building.**

⚠️ **1.4 IS CHROME OR FIREFOX AND NOT SAFARI**, §6.3. Safari has no Web MIDI
and never has, so `/instrument/` there will correctly report `no API` and the
test will look like a hardware failure when it is a browser choice. And since
Chrome 124 **every** Web MIDI page raises a permission prompt, not only SysEx
ones, so a refused click reads as "none plugged in" to anybody not watching for
it.

⚠️ **1.5 has a wrinkle worth expecting.** 60, 62, 64 and 65 are ordinary
keyboard notes, so `/instrument/` will light keys for drum pads. That is
correct behaviour and it is not the drums failing.

### Tier 2. One device, and something has to be written

| # | test | needs | proves |
|---|---|---|---|
| 2.1 | A page, or a few lines in an existing one, logging raw CC with its channel. | Circuit, M2 | which channel each control transmits on, which §3 never separates |
| 2.2 | Send CC 74 value 20 on channel 16 from that page. Listen. | Circuit, M2, ears | the master filter, and the **fold at 64**, §3.5 |
| 2.3 | Send CC 35 on channel 1 and listen for osc 2 density. | as above | the second half of defect one, §6.5 |
| 2.4 | Send CC 12 on channel 10 and CC 12 on channel 16 through `makeCcSend` in one tick. | as above | defect two happening to a real device, §6.5 |
| 2.5 | Send NRPN `0:76` as CC 99 / 98 / 6 and listen for LFO 1 rate. | as above | whether NRPN rides the conventional controllers, §3.6 open question 7 |
| 2.6 | Send program change 5 on channel 1, then 69 on channel 16. | as above | patch select and **queued** session select, §3.7 |
| 2.7 | Model 12 into DAW control mode, MCU-Live. Watch its control port. | Model 12, M2, `midilisten` or a page | **every number in §4.4**, which is the weakest table in this document |

🔴 **2.7 IS THE SINGLE MOST VALUABLE TEST IN THE LIST**, because §4.4 is the
only table here sourced from a third party rather than a manufacturer. TASCAM
publishes no note numbers and no CC numbers anywhere. One fader move and one
button press either confirm the public MCU map or replace it.

⚠️ **2.7 needs something that reads MIDI in.** On the M2 that is a browser page
using Web MIDI, or `midilisten` if tier 0.3 said copied binaries survive.
`midilisten` prints hex, which is the right form for this, and it connects to
every source, which with a Circuit also plugged in and transmitting clock means
48 lines a second of noise to filter out.

### Tier 3. Both devices, and a clock

| # | test | needs | proves |
|---|---|---|---|
| 3.1 | Model 12 MIDI CLOCK/SPP ON, DIN OUT to Circuit MIDI IN, Circuit Clock Rx ON and **Tx OFF**. Press play on the Model 12. | both, one DIN cable, the Circuit's supplied TRS adaptor | the Circuit shows `SYN`, §7.2 |
| 3.2 | Press STOP on the Model 12. | as above | 🔴 **whether the Circuit stops**, §3.9 and open question 9 |
| 3.3 | Locate on the Model 12 while the Circuit follows. | as above | what SPP does to a Circuit, musical or a lurch |
| 3.4 | Change the Model 12's metronome tempo, press play again. | as above | that the clock's tempo is the metronome's, §4.2 |
| 3.5 | Leave Circuit Clock Tx ON and repeat 3.1. | as above | whether a slaved Circuit really repeats the clock, §3.9 |

🔴 **3.2 IS THE TEST THAT DECIDES WHETHER §7's ARRANGEMENT IS USABLE.** The
Model 12 only sends clock while its transport runs, and the Circuit's User
Guide says a followed clock disappearing stops it. If that is what happens,
then **every stop on the Model 12 stops the Circuit**, and anybody rigging the
two has to know that before a session rather than during one.

⚠️ **3.1 depends on the TRS MIDI type being right**, §3.10. Use the Circuit's
own supplied breakout cables. A generic TRS to DIN cable of the wrong type
produces no notes and no error, and that failure would be read as 3.1 failing.

### Tier 4. A person, listening, with both plugged in

| # | test | proves |
|---|---|---|
| 4.1 | Circuit analogue out into Model 12 channels 1 and 2, Model 12 USB into the M2, record the M2's input while playing the Circuit. | the whole of §6.9, one cable at a time |
| 4.2 | `getUserMedia` with `channelCount: 12` and read what the track reports. | 🔴 **whether a browser can have more than two channels**, §6.6 |
| 4.3 | `ffmpeg -f avfoundation -list_devices true`, **run by a person at the keyboard**, and resolve the Model 12 by NAME. | the multichannel fallback, and the index-is-a-global rule |
| 4.4 | Play the Circuit through the Model 12 while a page in another browser holds the same relay room. | end to end |

⚠️ **4.3 IS FOR A PERSON AND NOT FOR AN AGENT.** It can raise a microphone or
camera prompt, and this project has a written lesson about background work
surfacing as an OS alert on a managed laptop. It was not run while writing
this plan for exactly that reason.

### What none of this tests

- **Nothing here measures latency.** Deliberate. `rig/m1/README.md` already
  says the control path is 7% of key to sound and the cushion owns the rest,
  and repeating that measurement on a new device would produce a number that
  is about the cushion again.
- **Nothing here touches the relay's limits.** A Circuit's clock at 48 msg/s
  and a hand on two knobs at roughly 100 msg/s sit under one per cent of the
  relay's measured 1000 msg/s. There is no capacity question to answer.
- **Nothing here runs the demo suite.** No page is being changed. When one is,
  the rule is `node demo/check-html.mjs` first and `node demo/verify.mjs
  <slug>` for only the pages touched.

---

## 10. What a person has to approve before any of this runs

**Stage one, on the M2:**

0. **Buying two cables.** Neither device can reach this Mac with what is in its
   box, §6.10. Not an approval so much as the thing that has to happen before
   any of the rest is possible.
1. **Plugging either device into the work laptop.** It is a managed machine,
   and a new USB device on one is not a neutral act the way it is on a Pi.
   And the Model 12 must go **directly into a port, not through a hub**, which
   TASCAM prints three times.
2. **Running `ffmpeg -f avfoundation -list_devices true`**, §9 test 4.3, which
   can raise a microphone or camera prompt. This project already has a written
   lesson about background work surfacing as an OS alert on this laptop, so it
   is a test for a person at the keyboard and it was deliberately not run while
   writing this plan.
3. **Granting Web MIDI to a page**, which is a browser prompt and is the only
   permission the browser route needs at all.
4. **Turning on Web MIDI SysEx** in `demo/shell/midi.mjs` or
   `demo/shell/hardware.mjs`, which is a strictly larger permission than notes
   and should be a decision rather than a default.
5. **Any change to `demo/shell/cc-adapter.mjs`** for the two defects in §6.5.
   CLAUDE.md says to stop and ask rather than quietly build a fourth copy of
   something the kit almost has, and this is that ask. ⚠️ Three other agents
   are in `demo/shell/` at the time of writing, so this one waits for a clear
   checkout whatever else is decided.
6. **Updating either device's firmware**, §1. Neither update is required for
   the rigging in §9 to start, and §1 says what each one costs.

**Stage two, when the Pi comes back:**

7. **Deploying to the board** with `push.sh`.
8. **A `patch.apply`**, which changes the live ALSA graph. `patch.plan` changes
   nothing and should be run first every time.
9. **Starting audio on the board**, which takes the instrument from anyone else
   using it.
10. **Any change to `ctl.set`** for the board half of defect two, which is a
    behaviour change on a verb `/knobs/` and `/keys/` both use, so the per page
    assert counts have to be diffed after it.

🔴 **NOTHING IN STAGE ONE REQUIRES INSTALLING ANYTHING**, and that is the point
of the browser route rather than a happy accident. No driver, no toolchain, no
compile, no Homebrew formula, no native addon. A cable, a browser and a page
this repo already serves.


---

## Sources

Manufacturer documents, all read directly:

- Novation Circuit Programmer's Reference Guide v1.1
  <https://fael-downloads-prod.focusrite.com/customer/prod/s3fs-public/downloads/Circuit%20Programmers%20Reference%20Guide%20v1-1_0.pdf>
- Novation Circuit Programmer's Reference Guide 1.3
  <https://fael-downloads-prod.focusrite.com/customer/prod/downloads/Circuit%20Programmer's%20Reference%20Guide%201.3_2.pdf>
- Novation Circuit User Guide v1.6
  <https://fael-downloads-prod.focusrite.com/customer/prod/s3fs-public/novation/downloads/15792/circuit-ug-en-03-v1-6.pdf>
- Novation Circuit v1.8 New Features Addendum
  <https://fael-downloads-prod.focusrite.com/customer/prod/s3fs-public/downloads/Circuit%201.8%20User%20Guide.pdf>
- Novation Circuit downloads index
  <https://downloads.novationmusic.com/novation/circuit/circuit>
- Tascam Model 12 Owner's Manual
  <https://cf.tascam.com/wp-content/uploads/downloads/products/tascam/model_12/efs_model-12_om_vf.pdf>
- Tascam Model 12 DAW Control Mode Manual
  <https://cf.tascam.jp/wp-content/uploads/downloads/products/tascam/model_12/e_model-12_daw_control_om_vb.pdf>
- Tascam Model 12 cumulative firmware release notes, V1.01 to V1.50
  <https://www.tascam.eu/sw/model12/Model12_v150_en.txt>
  ⚠️ This URL answers 403 to an automated fetch tool and 200 to `curl` with an
  ordinary browser user agent. It was read in full that way, and it is the
  source for the whole of §1.5 and for §1.0's claim that the MIDI map is
  version independent. Per-version URLs of the same shape
  (`Model12_v142_en.txt` and below) all answer 404, so **this one file is the
  entire published history**.
- Novation Circuit v1.7 New Features Addendum
  <https://fael-downloads-prod.focusrite.com/customer/prod/s3fs-public/novation/downloads/15909/circuit-v1-7-new-features-addendum.pdf>

Manufacturer documents, newest revisions, downloaded and diffed against the
above to confirm the MIDI charts are unchanged:

- Tascam Model 12 Owner's Manual, newest revision (the one whose supported OS
  table lists macOS Tahoe 26)
  <https://cf.tascam.com/wp-content/uploads/downloads/products/tascam/model_12/model-12_om_efs_vh4.pdf>
- Tascam Model 12 DAW Control Mode Manual, newest revision
  <https://cf.tascam.com/wp-content/uploads/downloads/products/tascam/model_12/e_model-12_daw_control_om_vc.pdf>

Platform documentation, for §6.3:

- Chrome for Developers, on the Web MIDI permission prompt extending to all
  MIDI usage from Chrome 124
  <https://developer.chrome.com/blog/web-midi-permission-prompt>
- MDN, Web MIDI API, for the secure context requirement and the `sysex` sub
  field of the `midi` permission descriptor
  <https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API>
- caniuse, Web MIDI, showing Safari unsupported in every version including the
  Technology Preview <https://caniuse.com/midi>
- WebKit bug 107250, "Web MIDI API", open and unassigned since 2013
  <https://bugs.webkit.org/show_bug.cgi?id=107250>

Novation support articles, for §1.2, §1.3 and §8 item 12. ⚠️ **These pages
answer 403 to every automated fetch tried.** They were read through the Help
Centre's public JSON API at
`support.novationmusic.com/api/v2/help_center/en-gb/articles/<id>.json`, which
returns the same article body over a different transport. Same publisher, and
worth naming because a reader repeating the check will hit the 403 first:

- "Updating firmware using Novation Components", article 360002211360
- "Which products use Novation Components?", article 360021384760
- "My web browser is not compatible with Novation Components", article 208258585
- "Using Components to reset a product to Factory Settings", article 10250072564370
- "Novation compatibility on macOS", article 11204398042514, last updated
  2026-09-17, the source for the Discontinued products listing and the
  "Untested but likely to work" entry for macOS 26

Weaker, and labelled as such wherever used:

- Mackie Control protocol, reverse engineered
  <https://github.com/NicoG60/TouchMCU/blob/main/doc/mackie_control_protocol.md>
- Sound on Sound, Tascam Model 12 review, on the faders not being motorised
  <https://www.soundonsound.com/reviews/tascam-model-12>
- midi.guide Novation Circuit page, used only to corroborate CC 80 to 87
  <https://midi.guide/d/novation/circuit/>
- Trade press for the Circuit's 1.0 to 1.5 feature lists and every date before
  1.6, since no Novation hosted changelog for that era survives: Synthtopia,
  KVR Audio, Sweetwater inSync, Attack Magazine, MusicRadar, Sonic State, Fact
  Magazine, DJ TechTools. ⚠️ **The 1.4 clock line and the 1.5 CC line each
  appear in near identical wording in two independent outlets**, which reads as
  both quoting one Novation release note, and is why §1.0 treats them as solid
  enough to build a warning on.

This checkout:

- `demo/shell/cc-adapter.mjs`, `demo/shell/midi.mjs`, `demo/shell/hardware.mjs`,
  `demo/shell/wire.mjs`, `demo/instrument/index.html`, `demo/rack/index.html`
- `rig/m1/live-agent.mjs`, `rig/m1/midisend.c`, `rig/m1/midilisten.c`,
  `rig/m1/studio.positron.rack-agent.plist`, `rig/m1/README.md`
- `rig/board/alsa.mjs`, `rig/board/board.mjs`, `rig/board/jacksynth.mjs`,
  `rig/board/synth.mjs`, `rig/board/test.mjs`,
  `rig/board/fixtures/aconnect-l.txt`
- `plan-hardware.md` §8, `plan-controller.md`, `plan-portable-board.md`,
  `plan-rack.md`

Measurements made while writing, on this machine, with no device attached:

- `demo/shell/cc-adapter.mjs` `keyOf`, `COARSE`, `foldRows`, `assertBytes`,
  `isInterpolableKey` and `makeCcSend`, run under node against this checkout on
  2026-09-20. Output pasted verbatim in §6.5.
- `sysctl machdep.cpu.brand_string hw.model` and `sw_vers`, for §6.1.
