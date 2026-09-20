# plan-circuit-patches: getting the patches off a 2015 Circuit without losing them

> **The ask**, 2026-09-20: *"can you get my patches from circuit? reseach in bg"*,
> after *"careful, do not want to lose my patches"* earlier the same evening.
>
> 🔴 **RESEARCH ONLY. NOTHING WAS SENT TO THE CIRCUIT WHILE THIS WAS WRITTEN.**
> No SysEx, no program change, no Device Inquiry, no probe. No MIDI output port
> to that device was opened at all. Every byte quoted below was read out of a
> manufacturer PDF, a manufacturer support article, a manufacturer release note,
> or the JavaScript that Novation ships to a browser. **Nothing here has been
> run against the hardware.**

## How to read the marks

| mark | meaning |
|---|---|
| 📄 DOC | a Novation or Focusrite document, opened and read in full |
| 🧾 CODE | read out of the JavaScript Novation serves at `components.novationmusic.com` today |
| 🌐 THIRD PARTY | somebody else's page, opened and read |
| ⚖️ INFERRED | worked out here, from something above |
| 🔌 NEEDS THE HARDWARE | cannot be settled without the Circuit in front of you |

⚠️ **NOTHING IN THIS DOCUMENT IS CITED FROM A SEARCH ENGINE SUMMARY.** Every
support article was opened and read in full, which took three attempts and a
route nobody uses. §10 says what it was, because it is reusable.

---

## 0. The one thing to do first

🔴 **OPEN `https://components.novationmusic.com/` IN CHROME, PICK CIRCUIT, PRESS
`Get Pack from Circuit`, AND THEN SAVE THE RESULT TO YOUR OWN DISK AS A
`.circuitpack` FILE. DO NOT PRESS `Send to Circuit`, AND DO NOT ACCEPT A
FIRMWARE UPDATE, UNTIL THAT FILE IS ON THE DISK AND HAS BEEN CHECKED.**

That is the whole answer. §6 is the ordered version with the checks in place.
Three things make it the right first move rather than a compromise:

1. 📄 DOC. It is the route Novation documents, and it is the **only** route that
   reaches sessions and samples at all. §5 shows that the published MIDI
   protocol carries synth patches and nothing else.
2. 🧾 CODE. What `Get Pack from Circuit` does on the wire is a **memory read**.
   It sends a request naming a start address and a length, and the Circuit
   answers with data and a checksum. There is no erase, no write and no commit
   anywhere on that path. §3 has the bytes.
3. It leaves the patches where they are. A backup that reads cannot cost you the
   thing you are backing up.

⚠️ **THE DANGEROUS BUTTON IS ON THE SAME SCREEN AS THE SAFE ONE**, six
characters different in the label, and it replaces the contents of the unit.

⚠️ **AND COMPONENTS MAY OFFER A FIRMWARE UPDATE THE MOMENT IT SEES THE DEVICE.**
📄 DOC: *"When you first connect a product, you'll be prompted to update the
firmware as needed."* §7 and §9 are about that prompt.

---

## 1. What is at risk, slot by slot

📄 DOC, Circuit User Guide v1.6, Key Features and glossary:

| thing | how many | the guide's own words |
|---|---|---|
| **Sessions** | **32** | *"32 Session slots"*, and *"Up to 32 Sessions can be saved in flash memory"* |
| **Synth patches** | **64** | *"64 synth Patches"*, shared by Synth 1 and Synth 2 |
| **Drum sounds (samples)** | **64** | *"64 drum sounds"* |
| Patterns | 8 per track, inside a Session | *"there are eight per track in each Session"* |

📄 DOC, Components guide: **total sample storage is 60 seconds**, shared across
those 64 slots.

🧾 CODE. Components reads three flash regions off the Circuit, and the numbers
corroborate the manual exactly:

| region | start | length | works out to |
|---|---|---|---|
| sessions | 188416 | 1757184 | 33 blocks of 53248 bytes |
| patches | 155648 | 32768 | 64 slots of 512 bytes |
| samples | 2338816 | 5763072 | **60.03 seconds** at 48 kHz mono 16 bit |

Total read: **7553024 bytes, about 7.2 MiB.**

🔴 **THE SAMPLE ARITHMETIC IS AN INDEPENDENT CONFIRMATION AND IS WORTH THE
SPACE.** 5763072 bytes at two bytes a frame and 48000 frames a second is 60.03
seconds. A support article written by a different team says 60 seconds. Two
sources that cannot have copied each other agree, which is the only kind of
agreement worth anything.

⚠️ **THE SESSION REGION HOLDS 33 BLOCKS AND THE UNIT HAS 32 SESSIONS.**
⚖️ INFERRED that the extra block is a header or the working copy of the current
session. Not established. It changes nothing you would do.

⚖️ **A SESSION LOOKS LIKE IT CARRIES ITS OWN COPY OF THE SYNTH SOUND, AND THAT
IS NOT SETTLED.** 📄 DOC, on why patches sound wrong after a session switch
during playback: *"either ensure that the patch numbers are different when
switching sessions, or ensure that the same actual patch contents are stored in
the two sessions when the patch numbers match"*. The phrase *"stored in the two
sessions"* reads as though a session embeds patch content, and 52 KiB is a large
block for patterns, velocities and gates alone. **It is one ambiguous sentence,
so it is written here as a possibility and not as a fact.** If it is true, a
Pack backup already covers it, because a Pack takes all three regions.

🔴 **AND THE PATCHES ARE ALMOST CERTAINLY NOT THE ONLY THING WORTH SAVING.**
The ask said patches. The 32 sessions are the arrangements, they live in a
different flash region, and §5 is about why they are the half that only one
route can reach. Take the whole Pack.

---

## 2. What a Pack is, and what is inside a `.circuitpack`

📄 DOC, the backup article, on what a Pack contains: *"The Pack file included all
the Samples, Patches and Sessions."*

📄 DOC, the same article, on what Components hands you for an individual item:

| downloaded on its own | file |
|---|---|
| a sample | `.wav`, **48 kHz mono 16 bit** |
| a patch | `.sysex` |
| a session | `.circuitsession` |
| everything | `.circuitpack` |

🧾 **CODE, AND THIS IS THE PART NOBODY HAS WRITTEN DOWN IN PUBLIC. A
`.circuitpack` WRITTEN BY COMPONENTS TODAY IS A DEFLATE ZIP, AND HERE IS ITS
EXACT LAYOUT**, read out of the Circuit's own `addPackFileContent`:

```
thepack.circuitpack        a zip, first two bytes "PK"
  index.json               { name, color, product: "circuit", version: "2.0",
                             sessions: [ {name, url}, ... ],
                             samples:  [ {name, url}, ... ],
                             patches:  [ {name, url}, ... ] }
  sessions/session_0.circuitsession    ... one per session slot
  samples/sample_0.wav                 ... written only for slots with content
  patches/patch_0.syx                  ... one per patch slot
```

The loader refuses the file if `index.json` is missing, if `index.json` is over
a megabyte, or if `product` is anything but `circuit`. **That is the basis of
the verification in §6, and it needs no Circuit, no account and no network: a
`.circuitpack` can be checked with `unzip`.**

⚠️ **AN EMPTY SAMPLE SLOT GETS AN INDEX ENTRY AND NO FILE.** 🧾 CODE: the writer
emits the `.wav` only when the slot `hasContent`, while always pushing a row into
`index.json` with an empty name. **So a Pack whose zip holds fewer WAVs than
index entries is normal and is not damage.** That is exactly the shape that
would make somebody panic during step 9.

🔴 **THERE IS AN OLDER PACK FORMAT AND THIS IS WHERE PUBLIC ACCOUNTS GET IT
WRONG.** A widely repeated claim is that a `.circuitpack` is a raw SysEx stream.
🧾 CODE settles it, and both halves are true of different things:

- **Writing**, today, is the zip above. `makePackFile` builds it with JSZip and
  `generateAsync({compression: "DEFLATE"})`, and the Circuit model's
  `fileExtForDownload` is `circuitpack`.
- **Reading** accepts either. `uploadPack` takes the file if its first two bytes
  are `PK`, **or** if it parses as a concatenation of raw SysEx messages with one
  of seven exact byte lengths (64, 6866, 6930, 22514, 22578, 29380, 29444). The
  Circuit's `loadZip` checks the legacy shape first and branches to
  `loadV1PackFile`.

⚖️ So a pack made today is a zip; a pack found on a forum from 2017, or a `.syx`
saved by somebody driving the bootloader by hand, is the older raw form and
Components still takes it.

⚠️ **NOVATION'S OWN CIRCUIT GUIDE HAS A COPY AND PASTE ERROR IN IT.** 📄 DOC,
the Circuit Components guide, describing `Upload Pack`: *"this lets you upload a
.circuittrackspack file"*, on the page about the original Circuit, which takes
`.circuitpack`. The next sentence corrects itself. Worth knowing, because it
shows the Circuit page of that support site is partly recycled from the Circuit
Tracks one, which changes how much weight any single sentence there can carry.

---

## 3. Is backing up genuinely read only on the device?

**Content: yes. Bytes on the wire: no, and anybody who says otherwise has not
looked.**

🧾 CODE, the exact transfer Components performs for `Get Pack from Circuit`:

```
to the Circuit    F0 00 20 29 00 78 <start, 8 bytes> <length, 8 bytes> F7
from the Circuit  F0 00 20 29 00 77 <start> <length> F7      the range, echoed
                  F0 00 20 29 00 79 <data> F7                repeated
                  F0 00 20 29 00 7A <checksum, 8 bytes> F7
```

Three reads run back to back, one per region in §1, and Components refuses the
result if the echoed range does not match what it asked for or if the checksum
does not verify. 🧾 CODE, its own error strings: `Circuit responded with wrong
data set`, `download-checksum-invalid`.

⚖️ **SO THE CONTENT IS NEVER TOUCHED.** `0x78` names an address and a length and
asks for the bytes back. Nothing in that exchange erases, writes or commits.

🔴 **BUT IT IS NOT A SILENT ROUTE, AND THERE ARE TWO THINGS TO SAY PLAINLY.**

1. 🧾 **CODE: THE CIRCUIT PACKS SCREEN DECLARES `deviceMode = "bootloader"`.**
   Components puts the unit into **bootloader mode** before it reads anything.
   📄 DOC, the Components guide: *"Clicking this indicator allows you to put the
   Circuit into the correct mode. When pressed, the Circuit enters bootloader
   mode and the indicator will turn green."*
2. 🧾 CODE, the handshake that opens the conversation: `F0 00 20 29 00 44 00 00
   00 00 00 00 F7`.

⚠️ **AND THE USER GUIDE WARNS AGAINST BOOTLOADER MODE IN SO MANY WORDS.**
📄 DOC, Appendix: *"This is strictly an 'engineering mode', and all normal unit
functions become inoperative. You should not use Bootloader Mode without
instructions to do so from Novation's Technical Support team."*

🔴 **THAT WARNING IS CONTRADICTED BY NOVATION'S OWN CURRENT SUPPORT PAGES, AND
THE CONTRADICTION IS THE ANSWER.** Three live articles tell an ordinary owner to
enter it by hand, by name, with no support ticket: *"Hold down SCALE, NOTE, and
VELOCITY buttons whilst turning the unit on. You should see some lights come on,
this is Bootloader mode."* It appears in **Uploading patches onto my Circuit has
failed**, in **Circuit Firmware updater has failed**, and again in the general
**Updating firmware using Novation Components**. ⚖️ INFERRED: the manual's
warning is about a person entering that mode and pressing things in it, not
about a tool driving it. **It is an inference and it is the weakest link in the
safety argument in this document.**

⚠️ **THE UNIT IS LEFT IN BOOTLOADER MODE AFTERWARDS.** 📄 DOC: *"To use the
editor, the unit should be in its main firmware, so you may need to click the
device connection icon again."* A power cycle does the same thing.

⚠️ **ONE MORE PATH ON THAT PAGE IS NOT A READ.** 📄 DOC, the factory reset
article: the Novation Packs list on the left carries a **Circuit Factory Pack**
with a `Send to Circuit` beside it, and *"Sending factory content to these
products will reset patches, samples, and templates correspondingly."* That list
sits next to the button you want. Do not expand it.

---

## 4. What `Send to Circuit` replaces, and whether a partial send exists

📄 DOC and 🧾 CODE agree, and the answer is both worse and better than it looks.

🧾 CODE, the send path for the original Circuit, in order: **sessions, then
samples, then patches.** All three, when the whole Pack is sent.

📄 DOC, the Components guide: *"When you click 'Send to Circuit' you'll be able
to decide if you want to send the whole Pack or just one section."*

🧾 CODE confirms it: `sendSetToDevice` takes exactly one of `sessions`, `samples`
or `patches`. 📄 DOC adds a third granularity, the individual item: every sample,
patch and session in the sidebar carries its own send button.

🔴 **SO A PARTIAL SEND EXISTS AT THREE LEVELS, AND EVERY ONE OF THEM REPLACES
WHAT IT LANDS ON.** There is no merge, no append and no undo.

✅ **THERE IS ONE REAL SAFETY NET AND IT IS WORTH KNOWING.** 📄 DOC: *"The
circuit will always keep a backup of the Pack that was loaded before the
transfer so that it can boot up into that Pack."* ⚠️ **READ THAT NARROWLY.** It
says the unit can boot into the **previous Pack** if a transfer fails. It says
nothing about a transfer that **succeeds** and replaces work you never backed
up, which is the case this whole document is about.

🧾 CODE, one refusal that will surprise somebody restoring later: a Pack send
throws `errors.circuit.sessions.not-compatible-with-firmware` if the pack's
sessions are not compatible with the firmware on the unit, or if the pack needs
firmware newer than the unit has. 📄 DOC, the matching article: a Session saved
on firmware older than 1.8 is the usual cause.

---

## 5. The route that does not need Novation at all, and what it cannot reach

📄 DOC, **Circuit Programmer's Reference Guide v1.1 and 1.3**, read in full. The
entire published SysEx surface of the original Circuit is three messages:

```
F0 00 20 29 01 60 <cmd> ... F7
   │        │  └── Novation Product Number, Circuit = 0x60
   │        └───── Novation Product Type, Synth = 0x01
   └────────────── Manufacturer ID, Novation
```

| cmd | name | size | what it does |
|---|---|---|---|
| `00` | Replace Current Patch | 350 bytes | **writes** 340 bytes into RAM for Synth 1 or 2 |
| `01` | Replace Patch | 350 bytes | **writes** one of the 64 flash slots, 0 to 63 |
| `40` | Current Patch Dump Request | 9 bytes | asks for the current patch back |

📄 DOC, the read: *"When this message is received on either MIDI DIN or MIDI USB,
Circuit will respond by sending a Replace Current Patch message to its USB
port."*

🧾 **CODE: THAT COMMAND IS STILL IN NOVATION'S SHIPPING JAVASCRIPT TODAY.** The
byte run `[240, 0, 32, 41, 1, 96, 64]` is present in the current Components
bundle, and the Circuit's device class declares `deviceId = [1, 96]`, matching
the reference guide exactly. **The published protocol is not abandoned.**

🔴 **THREE THINGS MAKE IT A POOR BACKUP ROUTE, AND THE THIRD IS
DISQUALIFYING.**

1. **It reads the CURRENT patch only.** 📄 DOC, the documented way to reach a
   flash slot: *"First send a Program Change message with the desired patch
   number (0 - 63) to a synth MIDI channel. Wait enough time for the patch to
   load from Flash memory (10 ms should be plenty). Send a Current Patch Dump
   Request."* **So reading all 64 means changing the sound loaded on a synth 64
   times.** That does not write flash. It does replace whatever the synth was
   holding, including an edit nobody saved.
2. **The pacing is not optional.** 📄 DOC: *"consecutive messages should have at
   least 20 ms between them"*, and *"There are states in which the device is not
   capable of receiving this message... In these situations the message will be
   ignored."* **Ignored, not refused.** Nothing comes back to say so, so a
   careless tool returns 61 patches and looks like it returned 64.
3. 🔴 **IT CANNOT TOUCH SESSIONS OR SAMPLES. AT ALL.** No session dump, no sample
   dump, no pack message. The three commands above are the complete published
   protocol.

⚖️ **SO THE HONEST SUMMARY IS: THE OPEN ROUTE BACKS UP 64 OF THE 160 SLOTS IN
§1, AND ONLY BY CHANGING WHAT THE INSTRUMENT IS PLAYING.** Components is not
merely more convenient. For sessions and samples it is the only published route
there is.

⚠️ **AND A DUMP REQUEST IS STILL A MESSAGE YOU SEND.** It is a read in the sense
that matters, because nothing it does reaches flash. It is not a read in the
sense this document was written under, which is why nothing in this section was
tried.

📄 DOC, two details that bite anybody implementing it:

- **The reply always comes back over USB**, even when the request went in on
  DIN. A DIN only rig waits forever and reads as a dead device.
- **A bank file is 64 concatenated `Replace Patch` messages**, patch numbers 0 to
  63, and **a single patch file is one `Replace Current Patch` message with the
  Location set to Synth 1.** That is the whole container format. It is why
  Components can accept a `.syx` patch from either a Circuit or a Circuit Tracks,
  and 📄 DOC says exactly that: *"You can also drag patches in via SysEx, these
  can be from Circuit Tracks or the original Circuit."*

---

## 6. The procedure, in order, with the check that makes it a backup

🔴 **A BACKUP NOBODY CHECKED IS NOT A BACKUP.** Steps 8 to 12 are the half that
makes the first seven worth doing, and they need no Circuit, no account and no
network.

**Before anything.**

1. **Power the Circuit from its mains adaptor, not batteries.** 📄 DOC, the User
   Guide: *"Updating firmware while powering Circuit from batteries is not
   recommended."* 📄 DOC, the failed upload article, goes further and says to
   remove the batteries entirely and run on the PSU alone. A Pack read is 7.2 MiB
   and takes minutes. A unit that dies during a read loses nothing; a unit that
   dies during anything else might.
2. **Use Chrome, Edge, Brave or Opera.** 📄 DOC: *"This feature is currently only
   available on Windows, Mac, and Linux in Chromium browsers like Google Chrome
   (version 50 or later), Microsoft Edge, Brave, etc or in Opera."* **Safari has
   no Web MIDI and cannot do any of this.** There is also a standalone Components
   application for macOS and Windows, and 📄 DOC names it as the fix when the web
   version misbehaves with a Circuit specifically.
3. **Plug the Circuit straight into the Mac if you can.** On this desk it
   currently sits behind two nested hubs (`measured-devices-2026-09-20.md`).
   Nothing says that is a problem. It is one variable fewer on the one transfer
   that matters.
4. 🔴 **IF COMPONENTS OFFERS A FIRMWARE UPDATE, DECLINE IT FOR NOW.** §7 and §9.

**The backup.**

5. `https://components.novationmusic.com/`, choose **Circuit**, allow the MIDI
   permission the browser asks for, and press the connection indicator in the top
   right if it is not already green. 📄 DOC: red means not connected, not
   powered, or a browser without Web MIDI.
6. Press **`Get Pack from Circuit`**. It reads sessions, then samples, then
   patches, with a progress bar for each. **Do not touch the unit while it runs.**
7. When the Pack appears, use the **save to computer** option, not the save to
   account option. 📄 DOC: *"You can also download the Pack and save it as a
   '.circuitpack' file on your computer."*

**The check, on the file, with the Circuit no longer involved.**

8. **It is a zip. Open it.** `unzip -l thepack.circuitpack` must list
   `index.json`, a `sessions/` run, a `samples/` run and a `patches/` run. A file
   that is not a zip, or a zip with no `index.json`, is not a Pack whatever its
   name says.
9. **Read `index.json`.** It must say `"product": "circuit"`. Check the session
   **names** against what you know is on the unit. This is the step that catches
   the failure nobody expects, which is a file that transferred cleanly and came
   from somewhere else. ⚠️ Fewer WAV files than sample rows is normal, see §2.
10. **Play two or three of the samples.** They are ordinary WAVs, 48 kHz mono 16
    bit. If they sound like your drums, the sample region really came across.
11. **Look at one patch file.** `patches/patch_0.syx` should be **350 bytes** and
    should begin `F0 00 20 29 01 60`. `xxd` is enough. ⚠️ Do not send it anywhere.
12. **Copy the file somewhere that is not this laptop.** One copy on one disk is
    not a backup either.

⚠️ **THAT PROVES THE FILE IS STRUCTURALLY REAL AND THAT ITS SAMPLES DECODE. IT
DOES NOT PROVE A SESSION RESTORES.** The only thing that proves that is sending
it back, which is the operation this document exists to keep you away from until
you want it. ⚖️ An honest limit, not a gap that can be closed by reading harder.

**After.**

13. Put the unit back into its normal firmware, by clicking the connection
    indicator again or by power cycling it. 📄 DOC.
14. **Then take a second copy by the other route, if you want one.** §11. The
    ordering is the point: an unofficial tool is an excellent second copy and a
    terrible first one.
15. ⚠️ **CONSIDER TURNING SAVE OFF ON THE CIRCUIT.** 📄 DOC: *"To enable save just
    hold SHIFT and SAVE whilst turning the unit on. Likewise, it is possible to
    disable the save function. This can be particularly useful when playing live
    to prevent any accidental changes to the sessions."* It is a write lock the
    instrument already has, it costs one power cycle, and it exists precisely to
    stop an accident. It does **not** protect against anything in §7.

---

## 7. What destroys patches

Ordered by how likely it is to happen to somebody who did not mean it.

1. 🔴 **`Send to Circuit`.** The whole Pack, or one section, or one slot. It
   replaces. §4. It is one button away from the button in §0 and it is the single
   largest risk here.
2. 🔴 **Loading the Circuit Factory Pack.** 📄 DOC: *"These devices do not feature
   factory reset, but Factory Packs can be loaded onto the product to retrieve
   the material it would have had originally... Sending factory content to these
   products will reset patches, samples, and templates correspondingly."* **This
   is the Circuit's factory reset in everything but name**, and it is reached by
   expanding a list on the left of the same screen and pressing send.
3. **A `Replace Patch` SysEx message**, `F0 00 20 29 01 60 01 <slot> ...`.
   📄 DOC: *"it replaces the contents of the specified patch in Flash memory."*
   Anything that can write a patch to the device can do this, including a third
   party librarian and including a plain `.syx` dragged onto the wrong thing.
4. **A `Replace Current Patch` message, or a program change.** Neither touches
   flash. Both replace the sound a synth is holding, so an unsaved edit is gone.
5. **Saving over a session on the unit.** Ordinary use, and the reason the save
   lock in step 15 exists.
6. **A firmware update.** ⚠️ **PROBABLY NOT DESTRUCTIVE, AND NOVATION NEVER SAYS
   SO.** §9 item 1 sets out what was searched and what the best available
   evidence is. Treat it as destructive until the backup exists, which costs
   nothing, then stop worrying about it.
7. ⚠️ **AND ONE THAT IS NOT A COMMAND: A FAILED TRANSFER.** 📄 DOC says the
   Circuit keeps the previously loaded Pack and can boot into it. That is a real
   protection against a send that dies halfway. It is not a protection against a
   completed wrong one.

🔴 **THERE IS NO FACTORY RESET AND THEREFORE NO UNDO.** 📄 DOC, in Novation's own
words, quoted in full above. Whatever is on that unit is the only copy until §6
finishes.

---

## 8. Is the original Circuit still supported, today

This mattered enough to check three ways, because a 2015 product's web tooling is
exactly the kind of thing that quietly disappears.

✅ 📄 **DOC. The live support article `Which products use Novation Components?`,
its own record showing it updated 2026-09-04: Circuit is listed under
Grooveboxes, alongside Circuit Mono Station, Circuit Tracks and Circuit Rhythm.**

✅ 🧾 **CODE, and this is the stronger evidence: the JavaScript currently served
by `components.novationmusic.com` contains a complete original Circuit
implementation.** Its own routes (`circuit.packs`, `circuit.packs.new`), its own
device service with `deviceId = [1, 96]`, its own flash memory map, its own pack
writer and loader with the legacy format fallback, its own error strings, and an
analytics label reading `Circuit Digital` to tell it apart from Tracks. **This is
not a support page nobody has retired. It is running code.**

✅ 🧾 **CODE: NOVATION STILL SERVES CIRCUIT FIRMWARE AND ITS FULL RELEASE
NOTES**, at `s3-eu-west-1.amazonaws.com/circuit-content/`, alongside
`factory-patches.syx`, `factory-samples.syx`, `factory-sessions.syx`,
`init-patch.syx`, `init-session.syx` and `circuit/session_32.circuitsession`.
⚠️ **THOSE FACTORY FILES ARE A RECOVERY SOURCE AND ALSO A HAZARD**: they are what
the Factory Pack in §7 item 2 is made of.

⚠️ 📄 **DOC, and it is the one caution. On the macOS compatibility article, last
edited 2026-09-17, Circuit sits under `Discontinued products`, described as
products *"no longer in development support, so compatibility will remain as long
as the products continue to work without encountering an issue"*. For macOS 26 it
reads `Untested but likely to work` in both the Intel and the Apple Silicon
column.** This desk runs macOS 26.6.2. That is the absence of a manufacturer
test, not a prediction of trouble, and it is why §6 has a verification step
rather than a shrug.

✅ 📄 **DOC: NO ACCOUNT IS NEEDED.** *"You do not need to log in to use
Components, but doing so allows you to back up all of your data to your account,
including packs and templates."* ⚠️ Being logged out costs you the Novation Packs
list in the sidebar, which 🧾 CODE confirms is fetched only when the session is
authenticated. **That list is where the Factory Pack lives, so staying logged out
is quietly a safety feature for this particular job.**

✅ 🧾 **CODE: THE DOWNLOAD IS LOCAL.** The pack is built in the browser with JSZip
and handed to the page as a Blob for an ordinary browser download. Saving to your
account is a separate, explicitly chosen action, and 📄 DOC words it as a choice:
save it to your Components Cloud **or** your computer. **A backup can be kept
entirely on your own disk and never touch Novation's servers.**

⚠️ The page does contact Novation and Focusrite hosts for other things:
`api.focusrite-novation.com`, `id.focusritegroup.com`,
`components-updates.novationmusic.com`, `downloads.novationmusic.com`, plus
Google Tag Manager and a product analytics library. 🧾 CODE, from the URLs in the
bundle. **None of that is the pack transfer**, which is Web MIDI to the device
and JSZip in the page. ⚠️ There IS an analytics event fired when a pack is sent,
carrying the pack's name and whether it was a factory pack. That is metadata, not
contents.

---

## 9. What could NOT be established

Named precisely, because this is the part that decides how much of the rest to
trust.

1. 🔴 **WHETHER A CIRCUIT FIRMWARE UPDATE PRESERVES PATCHES, SESSIONS AND
   SAMPLES. NOVATION NEVER SAYS.** Searched and not found in: the User Guide
   v1.6, the Components firmware article, the Circuit backup article, the Circuit
   Components guide, the failed updater article, a help centre search across 86
   matching articles, and **the complete 1.0 to 1.8.1 release notes** (§12).
   ⚖️ **THE BEST EVIDENCE AVAILABLE POINTS AT PRESERVED, AND IT IS INDIRECT.**
   The 1.3 notes say *"Old sessions are adjusted when loaded to replace 127 with
   126 for a compatible sound. Please save sessions after loading to avoid
   unnecessary conversions."* **A migration path for old sessions only makes
   sense if old sessions survive the update that introduced it.** The 1.5 notes
   warn only about the reverse direction, that sessions saved under 1.5 cannot be
   read by older firmware. Nothing in 8802 bytes of changelog mentions erasing
   user content. **That is a strong hint and it is not a statement, and it is not
   worth betting somebody's only copy on.** 🔌 The measurement that would settle
   it: a Pack backup, an update, a second Pack backup, and a byte comparison.
   Worth doing once the first backup exists.
2. 🔴 **WHETHER ENTERING BOOTLOADER MODE IS ITSELF HARMLESS.** The User Guide says
   do not enter it without instructions from support. Three support articles
   instruct exactly that, unprompted, and Components does it as routine. §3 calls
   this a contradiction resolved by inference, and an inference is what it stays.
3. **What the 33rd session block is.** §1.
4. **Whether a session embeds its own copy of a synth patch.** One ambiguous
   support sentence points that way and nothing confirms it. §1.
5. **How long a Pack read takes, and whether it is reliable on this Mac.** The
   size is known, 7553024 bytes. The duration is not, and 🔌 a 2015 device on an
   untested macOS behind two hubs is exactly where a surprise would come from.
   🌐 THIRD PARTY: at least one owner's web Components backup stalled at about 95
   per cent, which is why the standalone application and the bootloader recipe in
   §6 step 2 are worth having in hand before starting rather than after failing.
6. **Whether `Patch Base` can fetch FROM the device.** §11. Its product page only
   ever says save and import, and the manual page that would answer it is a 404.
   🔌 A seven day trial settles it in ten minutes.
7. **Anything at all measured on the hardware.** Nothing in this document has been
   run. 🔌 Every claim about what the Circuit does when spoken to is read from a
   manufacturer document or from Novation's shipped code.

---

## 10. How the sources were actually obtained

🔴 **`support.novationmusic.com` ANSWERS 403 TO AUTOMATED FETCHES AND THE CONTENT
IS NOT BEHIND THAT WALL.** Measured while writing this: 403 to the fetch tool,
403 to `curl` with a full browser user agent, `Accept-Language`, `Sec-Fetch-*`
headers and a Google referer. The Wayback Machine then answered **503**, and it
was 503 on every form tried, because **the Internet Archive was globally offline
that day**. Three refusals, none of them about the content.

✅ **THE WORKING ROUTE IS THE ZENDESK HELP CENTRE API, WHICH IS PUBLIC AND
UNAUTHENTICATED.** That site is a Zendesk instance, and the article behind
`/hc/en-gb/articles/<id>-<slug>` is served as JSON, in full, body included, at:

```
https://support.novationmusic.com/api/v2/help_center/en-gb/articles/<id>.json
https://support.novationmusic.com/api/v2/help_center/articles/search.json?query=<terms>&per_page=100
```

**200 on every article tried, about twenty of them.** The search endpoint returns
ids, titles, URLs and edit dates, which is how the article list was assembled
rather than guessed. Two seconds between calls. ⚠️ **This is a general bypass for
any Zendesk help centre and is worth remembering.**

Everything else came from files anybody can fetch:

- `Circuit User Guide v1.6`, PDF, 3656 lines of extracted text.
- `Circuit Programmer's Reference Guide v1.1`, PDF. ⚠️ **USE v1.1, NOT v1.3.** The
  three SysEx message tables are real text in v1.1 and **vector art** in v1.3, so
  the byte values in §5 extract perfectly from the older document and not at all
  from the newer one. The two were confirmed identical by reading v1.3's pages as
  images.
- `components.novationmusic.com/assets/main-*.js`, the deployed application,
  4173596 bytes of readable minified JavaScript, an ordinary GET.
- `s3-eu-west-1.amazonaws.com/circuit-content/.../release-notes-1.8.1.txt`, 8802
  bytes, public, and §12 is what is in it.

🔴 **READING THE SHIPPED BUNDLE IS THE STRONGEST SOURCE IN THIS DOCUMENT AND IT
IS THE ONE NOBODY THINKS TO OPEN.** A support article says what a feature is for.
The code says what it does. Everything in §2, §3, the memory map in §1 and the
firmware facts in §12 came from there, and none of it is in any Novation
document.

⚠️ **ONE CONFLICT WAS FOUND AND SETTLED, AND IT IS THE REASON THE ABOVE MATTERS.**
A parallel survey concluded from the file type registry that a `.circuitpack` is
a raw SysEx stream. The registry it read is real: Components accepts
`.circuitpack`, `.syx` and `.sysex` for that slot. **But an accept list is not a
container format.** The writer, twenty thousand characters away in the same file,
builds a DEFLATE zip. Both readings were of the same bundle and only one of them
was of the code that produces the file. **Read the writer, not the validator.**

---

## 11. Open source and third party tooling

None of this was run. Every item is reported so somebody can judge it, and §6
step 14 is where it belongs in the order.

🔴 **WHAT §5 ESTABLISHES BOUNDS ALL OF IT.** A tool speaking documented MIDI
SysEx can reach the 64 synth patches and cannot reach the 32 sessions or the 64
samples, because the messages do not exist. **A tool that DOES reach sessions or
samples is speaking the undocumented bootloader protocol in §3**, whose write
half is what replaces flash.

### Reads a patch off an original Circuit

- 🌐 **`circuit-web-synth-editor`**, GPL-3.0, last commit **2019-12-01**.
  <https://github.com/cgoehl/circuit-web-synth-editor>, upstream on framagit,
  live at <https://cgoehl.github.io/circuit-web-synth-editor/>. Source read: it
  sends `F0 00 20 29 01 60 40 <synth> 00 F7`, the documented `40h` request, and
  listens for the reply, and exports a `.syx` Components accepts.
  ⚠️ **It is a one patch at a time editor, not a bank librarian.** No loop over 0
  to 63, so 64 patches means 64 manual operations. ⚠️ Its own README says not to
  run it while Components is open. ⚠️ It sends a trailing `00` the reference guide
  does not list, 10 bytes against the documented 9.
- 🌐 **`Patch Base`**, commercial, macOS and iPad, seven day trial.
  <https://coffeeshopped.com/patch-base/editor/novation/circuit>. Advertises a
  bank editor over *"the 64 saved sounds on your Novation Circuit"* and states
  its own limit: *"Patch Base doesn't currently support management of Drum
  patches, Samples, and Sessions for the Circuit."* ⚠️ **Whether it FETCHES from
  the device is unconfirmed**, §9 item 6.

### Reads the whole device, by driving the bootloader by hand

🌐 **THIRD PARTY, read in full: Simon Safar, 2021, `simonsafar.com/2021/circuit_backup/`.**
His Components backup was failing at about 95 per cent, so he pulled the request
out of Components' own JavaScript, confirmed it against a Wireshark USB capture,
and replayed it with ALSA's `amidi`:

```
amidi -p hw:1,0,0 -S "f0 00 20 29 00 78 00 00 00 02 0e 00 00 00 00 00 01 0a 0d 00 00 00 f7" -r circuit_dump.syx
```

The device answered `F0 00 20 29 00 77 ...` and then a stream of `F0 00 20 29 00
79 ...`, with recognisable ASCII in it. He then loaded the resulting `.syx` back
into Components successfully, which is the legacy pack path in §2. He hedges
about the restore and so does this document.

✅ **HIS OPCODE IS CONFIRMED CURRENT, AND THE DOUBT ABOUT IT IS RESOLVED HERE.**
A grep for the literal bytes `00 20 29 00 78` in the 2026 bundle finds nothing,
which reads as though the framing changed. It has not: `120` is passed as a
variable into `genericRequest(e, t) { return [240,0,32,41,0,e].concat(t,[247]) }`,
which is the transfer class the Circuit's own pack read uses. **The flat framing
is still what the original Circuit is spoken to with today.** A second
`genericRequest` does exist in the bundle with a `0x7C` header and a product id,
and that one belongs to the firmware update path for newer devices.

### Generic librarians, which is the robust answer

Because the request is a fixed 9 byte message and the reply is a plain SysEx
message, any general purpose tool can do the patch half with no bespoke software
to rot.

- 🌐 **SysEx Librarian**, macOS, free, BSD, v1.5.2 from 2023-10-21.
  <https://www.snoize.com/SysExLibrarian/>. Sends arbitrary `.syx` and **records**
  incoming SysEx. ⚠️ Expect to arm record and then send, not one button.
- `amidi` on Linux, proven end to end by the writeup above.
- ⚠️ **MIDI-OX on Windows is the one negative data point**: the same writer could
  not get it to work for this, though he was trying to interpose on Components
  rather than send his own request.

### File only, never touches the device

| tool | what it does | last commit |
|---|---|---|
| `threedaymonk/circuit_patch_tools` | Ruby, ISC. `split` / `join` / `portable` / `info` on bank files | 2019-09-01 |
| `boblemarin/CircuitPatchExtractor` | JS, MIT. Web UI, pulls single patches out of a pack | 2019-12-12 |
| lazytrap `CircuitBank2Patch` | C#, Windows. Splits a bank `.syx` into individual patches | 2019-12-11 |

### Looks right and is for a different device

⚠️ **CHECK THE PRODUCT BEFORE RECOMMENDING ANY OF THESE.**
`martin-stone/ctpatch` is **Circuit Tracks**. `johanLsp/CircuitMonoStation_Sysex`
is the **Mono Station**, whose format its own notes call very similar to the
Circuit's, differing in the product number. `TheAndrewStaker/mcp-midi-control` is
active but its package is named `circuit-tracks` and there is no original Circuit
package in it. `scrawlon/noc-webmidi` is the original Circuit and is **CC and
NRPN only, no SysEx**, so it is useless for a backup.
⚠️ **`circuitpack` on GitHub is a telecom term** (ITU-T G.988 OMCI) and returns
unrelated code. Expect that false positive.

### Precisely stated negatives

- GitHub repository searches for `novation circuit sysex`, `circuit librarian
  novation`, `circuit sysex librarian`, `circuit patch librarian`, `novation
  librarian`, `circuit groovebox sysex` and `novation sysex dump` **all returned
  zero**. The six repositories above are all that exist.
- GitHub code search `extension:circuitpack` returned **zero**. No `.circuitpack`
  is committed anywhere public.
- npm: the only original Circuit package in existence is `noc-webmidi`. PyPI:
  `circuit-sysex`, `circuitpack`, `novation-circuit`, `circuit-patch-tools` and
  `ctpatch` are all 404.
- **No Ctrlr panel for the original Circuit.** The Isotonik editor is Max4Live
  and standalone, not Ctrlr, and the free one was withdrawn after Components
  shipped.
- **The `.circuitpack` byte layout has never been published for the original
  Circuit.** What exists is the 340 byte patch map in the reference guide, a
  handful of absolute session offsets in one project's README, and a nearly
  complete reverse engineering of the **Circuit Tracks** `.ncs` format by
  userx14, done by decompiling the WASM validator Components runs before upload.
  That method transfers; the result does not.

---

## 12. A correction to `plans/plan-circuit-model12.md`, from a document that turned up

🔴 **THE COMPLETE CIRCUIT CHANGELOG, 1.0 TO 1.8.1, IS PUBLIC AND NOVATION WROTE
IT.** `plans/plan-circuit-model12.md` §1.2 says the releases before 1.6 *"are not
documented on Novation's current downloads page at all"*, marks everything from
1.0 to 1.5 as 🌐 THIRD PARTY, and deliberately refuses to call the December 2015
update "1.1" on the grounds that no Novation document names it. **All of that was
correct about the downloads page and is now superseded**, because Components
fetches its release notes from a URL that nobody had opened:

```
https://s3-eu-west-1.amazonaws.com/circuit-content/da39a3ee5e6b4b0d3255bfef95601890afd80709/release-notes-1.8.1.txt
```

📄 DOC, and the corrections it forces:

1. 🔴 **THE LAST FIRMWARE IS 1.8.1, NOT 1.8.** 🧾 CODE:
   `CIRCUIT_LATEST_FIRMWARE_VERSION: 3592`. 📄 DOC: *"Fixed a regression in 1.8 in
   which Fixed Velocity setting was not applied to drums or patch views"*.
2. 🔴 **"1.1" IS A REAL VERSION AND NOVATION NAMES IT.** Firmware revision 3107.
   It brought instant session switching, continue from position, **the MIDI I/O
   settings screen reached by holding Shift at power on**, filter LED feedback,
   step based automation editing and session loading by song select.
3. **1.4.1 exists**, revision 3370, five fixes including improved low battery
   detection.
4. **Every release carries a firmware revision number**, which is what Components
   compares against: 1.0 = 3101, 1.1 = 3107, 1.2 = 3195, 1.3 = 3304, 1.4 = 3343,
   1.4.1 = 3370, 1.5 = 3408, 1.6 = 3501, 1.7 = 3538, 1.8 = 3590, **1.8.1 = 3592**.
5. ✅ **THE 1.4 AND 1.5 MIDI CLAIMS IN THAT PLAN ARE CONFIRMED BY THE
   MANUFACTURER**, where they were two outlets quoting a release note. 📄 DOC,
   1.4: *"Clock settings can now be adjusted in the same way as other MIDI
   messages. The left pad toggles Clock RX (OFF = Internal, ON = Auto), the right
   pad toggles Clock TX."* 📄 DOC, 1.5: *"Added settings (orange pads) to toggle
   CC RX (left pad) and CC TX (right pad) separately to other MIDI messages."*
6. 🔴 **AND ONE MIDI FACT THAT PLAN DOES NOT HAVE AT ALL.** 📄 DOC, 1.6:
   *"Panning responds to and transmits CC 117 (Synth 1), CC 118 (Synth 2) on
   channel 16, and CC 77-80 (Drum 1-4) on channel 10."* Also 1.6: *"Added FX
   On/Off switch to FX View. Responds to and transmits NRPN (1, 21) on channel
   16."* And 1.2: *"Drum choice can be selected via MIDI CC to channel 10: CC 8
   (Drum 1), 18 (Drum 2), 44 (Drum 3), 50 (Drum 4)."*

⚠️ **NOTHING HERE CHANGES ANY RECOMMENDATION IN THIS DOCUMENT.** It is recorded
because `plans/plan-circuit-model12.md` names its own gaps honestly and one of them
turned out to be a file away, and because a sibling plan reading `1.8 is the last
firmware` after this was written would be wrong.

⚠️ **AND THE FIRMWARE ITSELF IS AT A PUBLIC URL BESIDE THE NOTES**
(`circuit-firmware-3592.syx`). **It was not downloaded and must not be sent to
anything.** It is named here only because somebody will eventually need to know
it exists.
