# A box that is the instrument

You press a key here. A synthesiser somewhere else plays the note, and you hear
it back. That works today, and it is measured: **58 milliseconds** from the key
going down to the sound arriving, with Ableton Live making the sound on a machine
in the next room.

The thing making it work is a Mac Pro running a web browser with no window open.
That is an expensive and rather silly way to hold a MIDI cable, and it needs
somebody to have started it. So: **what is the smallest piece of hardware that
could take that job?** A box you could post to a musician, that plugs into their
synthesiser and their wifi and needs no laptop at all.

This is the survey, and the argument that follows from it. Nothing here has been
built yet. Everything in **bold with a number** was measured by this project;
everything from a manufacturer's page says so.

---

## What the box is asked to do

Four things, and one of them is much harder than the other three.

- **Receive notes over the internet.** Somebody in another country presses a key;
  the box learns which note.
- **Play a synthesiser.** Out of a MIDI socket — the five-pin round connector on
  the back of every keyboard since 1983 — into whatever hardware is plugged in.
- **Listen to what that synthesiser played**, through an audio input.
- **Send the sound back**, over the internet, fast enough that the person who
  pressed the key does not feel a gap.

The hard one is the last. Not because sending audio is difficult, but because
the road it travels is long and almost none of that road is ours.

---

## Where the time actually goes

This is the whole design, so it is worth reading the table rather than the
summary. Every row was measured by pressing a key on one machine and detecting
the returning sound on the SAME machine — a round trip, so no clock comparison is
involved and none of the number is two computers disagreeing about the time.

| what | measured |
|---|---|
| notes sent over a direct link, machine to machine in one room | **6.0 ms** there and back |
| notes sent via Cloudflare instead | **68.9 ms** there and back |
| Cloudflare's own computation, inside that 68.9 | **0.18 ms** |
| a browser's built-in audio smoothing buffer | **30–44 ms**, and you cannot switch it off |
| our own smoothing buffer, which we chose | **10 ms** |
| **key press to sound: our own simple synth, small relay in the same room** | **29 ms** |
| **key press to sound: Ableton Live, small relay in the same room** | **58 ms** |
| **key press to sound: Ableton Live, via Cloudflare** | **72–73 ms** |
| **key press to sound: Ableton Live, direct machine-to-machine video call** | **111–128 ms** |

Three things fall out of it, and they decide everything below.

### The notes are cheap. The sound coming back is the whole cost.

Sending a note is sending about three bytes. In one room that round trip is
**6.0 ms**. Measured against a run that came back in **84 ms** end to end, that
is **7%** of what you hear — so you could make the note-sending twice as fast and
save three milliseconds out of eighty-four. In the same run the browser's audio
buffer alone was **37.9 ms**.

Across the internet it is less cheap, and this is worth being exact about,
because it is easy to quote the flattering half. With no direct link available,
a note goes out to a Cloudflare data centre and back down — **68.9 ms** for the
round trip, so roughly 34 ms each way. That is about a third of the budget rather
than a fifteenth. It is still not the biggest piece, and more importantly it is
not a piece any choice of hardware can shrink.

### Almost all of it is distance, or a buffer

Cloudflare's own work — the little program that passes the message along — costs
**0.18 ms** out of that 68.9. A quarter of one percent. The relay is not slow;
**the route is long**. A machine three metres away is 71 ms away because the
message goes to a data centre and back, twice, and then the receipt makes the
same trip.

The other large piece is a buffer. Audio arrives in packets that do not arrive
evenly, so a player holds a small reservoir of sound before it starts playing, to
cover the late ones. In a normal video call the browser owns that reservoir and
sets it itself: we measured **30 to 44 ms** of it, and there is no way to turn it
down from a web page. That single fact is why this project moved to a different
delivery method, one where the reservoir is ours to set. Set to **10 ms**, it
costs 10 ms — the relationship is close to one for one.

### So the board can only change three small things

A board choice cannot shorten the distance to a data centre and cannot make
Cloudflare faster. What it CAN change is:

- how long the incoming audio sits in the sound card's buffer,
- how long it takes to compress that audio,
- and **whether the box can speak the transport at all.**

The first two are together worth maybe ten to twenty-five milliseconds. The third
is worth everything, because a board that cannot speak the transport is not a
candidate at any speed. That is the question the survey turns out to be about.

---

## The transport, briefly, because it is the eliminator

The sound comes back over something called **MoQ** — "media over QUIC". Three
layers, and each one is a wall for a small chip:

- **QUIC** is a way of sending data over the internet that Google built to
  replace the old one. It insists on encryption; there is no unencrypted mode.
  So a device speaking QUIC is also running a full modern encryption stack.
- **WebTransport** is the layer that lets a web page open a QUIC connection.
  It adds another protocol on top — the same one modern web servers use.
- **MoQ** is the layer above that, which carries the actual audio, plus a small
  description file saying what is in the stream.

A Mac has all of this because a browser has all of this. A Raspberry Pi has all
of this because it runs Linux and there is a well-maintained Rust implementation.
A microcontroller has **none** of it, and the gap is not small.

One more constraint, which quietly rules out a whole family of designs: **the box
must always dial out, never wait for a call.** It will sit behind a home router
with no ports opened, and nobody is going to configure one. Cloudflare's relay is
reached by dialling out, so this works — but it means nothing in the design may
require the outside world to connect INTO the box.

And there is no second road. Cloudflare's MoQ relay has **no fallback for
networks that block QUIC**. If a café's wifi blocks it, the box is simply off the
air. A relay you run yourself does have a fallback; Cloudflare's does not.

---

## The eight boards

Prices are approximate list prices in September 2026 and are not measurements.

| board | runs Linux? | can it speak MoQ? | audio input | MIDI out | ≈ money |
|---|---|---|---|---|---|
| Raspberry Pi 4 / 5 | yes | **yes, today** | add a USB interface | 2 resistors, or USB | $100–150 all in |
| Raspberry Pi Zero 2 W | yes | yes, but not via a browser | add a board or USB | 2 resistors, or USB | ~$40 |
| Norns | yes — it IS a Raspberry Pi | as the Pi, on an older Pi | built in | USB | $120–225 as a kit |
| Bela Gem | yes, special kernel | probably; unproven | built in, very good | 2 resistors, or USB | $69 + a wifi dongle |
| Bela (original) | yes, kernel from 2016 | a fight | built in, very good | 2 resistors | ~£150 |
| ESP32-S3 | no | **no** | add a codec chip, ~$10 | 2 resistors | ~$25 |
| Teensy 4.1 | no | **no** | add a shield | **the best here** | ~$60 |
| Daisy Seed | no | **no network at all** | built in | 2 resistors | ~$30 |

### Raspberry Pi 4 / 5 — the only one that runs today's chain unchanged

Google Chrome started shipping for 64-bit Arm Linux in 2026 and has been tested
on a Pi 5. That single fact is what makes "keep the software, change the
computer" a real option instead of a wish, because the thing running on the Mac
right now IS a browser page.

The catch is audio, and it is duller than it sounds. **The Pi 5 has no analogue
audio at all** — the headphone socket was removed to make room for the expansion
slot — and no Raspberry Pi has ever had an audio INPUT. So hearing a synthesiser
means a USB audio interface, about $30 for a basic one that needs no driver, or a
small add-on board with a codec chip on it.

MIDI out is the pleasant surprise. A USB MIDI interface costs $15–40 and works.
But MIDI is just a serial line running at 31,250 bits a second, and the Pi has
serial pins, so a five-pin socket driven directly costs **two resistors and a
jack — about $2**. The official specification was updated for 3.3-volt chips like
these, replacing the old resistor with a 33-ohm and a 10-ohm one. At that speed a
three-byte "note on" takes **960 microseconds** to go down the wire, and nothing
schedules it or queues it, because it is a wire.

### Raspberry Pi Zero 2 W — the right size, one number too small

Four processor cores at 1 GHz, wifi built in, $15. The processor is fine. The
memory is **512 MB**, and Chrome does not live in 512 MB. So the Zero 2 W is only
a candidate once somebody has written a program that replaces the browser — which
is a later step, not a first one. It is the right thing to shrink INTO.

### Norns — and it is a Raspberry Pi, which should be said plainly

Norns is a small self-contained music computer with a screen, three buttons and
three knobs, and a large community writing scripts for it. Inside, it is a
Raspberry Pi: a Compute Module 3 in the finished units, or your own Pi 3B+ or 4
under the DIY version. Its audio comes from a CS4270 codec chip fixed at 48 kHz,
stereo in and out.

So its answer to "can it speak the transport" is the Raspberry Pi's answer, on an
older Pi, plus the constraints of its own software. Monome no longer make the DIY
board; it is open hardware and other people sell kits.

**What Norns is genuinely excellent at is being an object you pick up** — screen,
knobs, sockets, no laptop by design. That is the right shape for this idea and
the wrong place to develop it. It is where the box should end up, not where it
should start.

### Bela — the one most likely to disappoint

Bela is an audio computer built by people who care about exactly this problem,
and its headline is true: **under 1 millisecond** from an input to an output, on
a special Linux kernel that lets the audio jump every queue. The newest version,
Bela Gem, shipped in early 2026 at $69 and does 24-bit at 96 kHz.

It is still the wrong first box, for three reasons that are worth stating
carefully because they are not "it is a bad board".

- **The millisecond it saves is on the leg that is already small.** In a 58 ms
  journey, the audio buffer is a few milliseconds — and the sound is chopped into
  5 ms pieces for compression anyway, so the pipeline cannot be finer than that
  regardless. Buying a hard real-time kernel to fix this is fixing the quantity
  next to the one that hurts.
- **Its guarantee does not cover the network.** The special treatment applies to
  the audio processing. The internet connection runs in ordinary Linux like
  everywhere else — and the internet connection is where all the milliseconds
  are.
- **Connectivity is an afterthought in the hardware.** The board the newest Bela
  sits on has **no wifi and no Ethernet socket**, so a wireless box means a USB
  dongle hanging off it. And the older Bela images run a Linux kernel from 2016,
  which is not somewhere a modern encryption and QUIC stack wants to live.

The general lesson, which is the reason this section exists: **before buying
hardware to fix a delay, write down which part of the journey it shortens and how
long that part currently is.** Bela is the board somebody suggests in the first
five minutes, because it is the one built for instruments.

### ESP32-S3 — separate "cannot" from "nobody has written it"

This is the $8 wifi chip in half the smart devices in your house, and it deserves
a careful answer rather than a dismissal, because the honest answer has two
halves.

**The chip is not incapable.** It has modern encryption in its official software
kit, and QUIC has been ported to this family: there is an ESP32 port built on
ngtcp2, and the company EMQ ran a complete QUIC-based messaging client on the
smaller ESP32-C3. So the bottom layer exists.

**What does not exist is everything above it.** Between QUIC and playing a note
there are three more layers, and none of them has been written for this chip. It
is not a weekend. Saying "impossible" would be wrong; saying "supported" would be
much more wrong.

**There IS a working path on this chip, and it is the slow one.** Espressif ship
a full video-call stack for the ESP32-S3 with Opus audio, and their own figure is
**about 260 ms** between the chip and a phone. That is their number, measured to
their own boundary, not a key-press-to-sound figure like ours — but even
generously discounted it is in a different class from 58 ms, and it uses exactly
the delivery method this project abandoned because its buffer belongs to the
receiving browser and cannot be turned down.

**Compression is the second wall.** The ESP32 port of the Opus audio compressor
turns off floating-point maths entirely — its own notes say the chip's
floating-point unit "is way too slow for this" — and reports that **48 kHz
encoding runs in real time only at the lowest quality setting, and even then uses
85% of the processor**. That is a third-party benchmark on an older ESP32 rather
than a measurement of the S3, and a newer library adds optimisations. But
"most of one core, just for the codec" is not a comfortable place from which to
also run an encryption and QUIC stack.

Hearing a synthesiser is easy here (a $5–15 codec chip). Playing one over a
five-pin socket is easy here (a serial pin and two resistors). Plugging a USB
keyboard INTO it is not: the chip's USB software supports being a device, not
being the thing a device plugs into.

### Teensy 4.1 — the best MIDI hardware here, and no transport

600 MHz, an Ethernet connection on the board with hardware timestamping accurate
to the microsecond, and a genuine USB socket that other devices plug into — so a
USB MIDI keyboard or a USB synthesiser attaches directly, which nothing else on
this list under $50 manages. Its audio shield runs 128-sample blocks, about
2.9 ms.

And there is no path to MoQ on it, nor a realistic route to writing one. The
wired Ethernet is a real advantage for a fixed installation and it does not help
with the layer above.

Its right role is **on the far end of the MIDI cable**: the thing the box plays,
not the box.

### Daisy Seed — not a candidate, and worth one line so nobody re-argues it

480 MHz, 64 MB of memory, an audio codec on the board, and blocks as small as a
single sample. **It has no network connection of any kind.** It cannot be the
box. It is an excellent $30 synthesiser to hang off the box's MIDI socket.

---

## The one I would build

**A Raspberry Pi 5, running the same page the Mac runs today.**

The reason is not that the Pi is the best hardware. It is that **it changes
exactly one thing.** Everything else on the list requires new hardware AND a
rewritten transport at the same time, so its first number would arrive with no
way to say which of the two caused it. This project's whole method is that a
change you cannot attribute is not a measurement.

The rest of the argument is that the risk is small and concentrated. Everything
the chain needs already exists on that machine in principle — QUIC, the Opus
compressor, audio capture, MIDI. Each of those is a one-line check rather than a
project, and the next section lists them.

It fits in a shoebox:

```
Raspberry Pi 5, 4 GB                    ~$60
USB audio interface                     ~$30    (sound in, and out)
five-pin socket + two resistors         ~$2     (MIDI out, 960 µs a note)
power, memory card, case                ~$30
```

If heat or battery life matters, a Pi 4 is the same argument with less headroom
and an audio output already on the board.

And the shape that is probably right in the end is not one board but two: **a
Linux board for the internet, a microcontroller for the MIDI and the sound.** The
Pi dials out, receives notes and sends audio back; a Teensy or a Daisy on the
other side of a MIDI cable is the instrument. That is where the survey keeps
pointing — and it is deliberately not the first step, because the first step's
entire value is that only one thing changed.

---

## What nobody knows yet

Everything above is either a measurement or a reading of somebody's
documentation. These are neither. They are the questions that decide whether the
plan survives, and each one is answered by running something rather than by
arguing.

| the question | what answers it |
|---|---|
| Does Chrome on a Raspberry Pi actually find MIDI outputs? There are reports of it finding none on Linux. | Ask it, on the Pi, and count them. |
| Will it compress audio in 5 ms pieces, or quietly settle for 20 ms? Our code tries three settings in turn, so a downgrade would cost time without reporting anything. | Ask which setting it chose, and print it. |
| Will it open a USB audio input at all? The same request is stuck — neither succeeding nor failing — on the Mac right now. | Ask, and report one of three answers: yes, no, or still waiting. |
| Can it be given permission to use the microphone and MIDI without a laptop attached? Today that permission only lasts while a laptop holds the connection open. | Try the alternative, launch it alone, and read back what permission it has. |
| Does Cloudflare's relay accept a connection that skips the web layer entirely? A program that is not a browser could, and it would halve the stack to write. | One command, from the Mac, today. No hardware needed. |
| Can a Pi compress audio and run QUIC at once without dropping any? | The gap counter that already exists. Zero gaps is the known-good result on both relays, so any gaps on the Pi are the board. |
| **Is a box in another country playable at all?** | Two machines on different networks, and the same round-trip measurement. |

That last one is the one to be most careful about. The arithmetic says roughly
**100 ms**: 72–73 ms measured for the audio coming back through Cloudflare, plus
about 28 ms more because the notes lose their direct link too. But **100 ms is
where playing starts to feel sluggish under the fingers** — of a hundred presses
over Cloudflare, four crossed that line. So a remote box may sit right on the
edge of playable, and adding two measured numbers together is not the same as
measuring the thing.

---

## What none of this covers

- **Your speakers.** Every "key press to sound" figure here is measured on the
  audio the moment it is decoded, before it reaches anything with a cone in it.
  Real ears add the output delay on top; a previous measurement used 32 ms for
  that. These are floors, not promises.
- **Whether it sounds good.** Nothing here is about the audio quality of a
  $10 codec chip against a $300 audio interface. That is a different survey.
- **Enclosures, power, certification, or making twelve of them.** This is about
  whether one works.
- **Manufacturers' numbers.** The 260 ms, the under-1 ms, the 2.9 ms: all of them
  are measured by the people selling the board, to their own boundary, none of
  them from a key press to a sound. They are quoted here with that label attached
  and should never be repeated without it.

## What it costs, from Tallinn

A warning before the list, because it is the biggest number on it. A Raspberry Pi
5 with 8 GB reads 196-249 EUR in Estonia against roughly 90 EUR internationally,
and that is not local markup. The memory it carries has gone up sevenfold in a
year, and the board's maker raised prices twice in 2026 because of it. You can
see it in the prices without reading anything: 8 GB costs 196 EUR and 16 GB costs
362 EUR, so the memory is most of what you are paying for.

**Which means: buy the small one.** This box runs a single web page. It has no
use for 8 GB, and 8 GB was a habit rather than a requirement.

| what | where | roughly |
|---|---|---|
| Raspberry Pi 5, 2 GB | an electronics distributor, not a local shop | 60-80 EUR |
| the official power supply | Oomipood | 15 EUR |
| a case with a fan | Oomipood | 10 EUR |
| a memory card, 32 GB | anywhere | 10 EUR |
| a network cable | anywhere | 5 EUR |

A network cable rather than wifi is deliberate: the sound comes back over that
link, and an uneven arrival time is exactly what costs you.

**Only if the box should capture a synth you already own**, rather than making
its own sound:

| what | where | roughly |
|---|---|---|
| a small USB audio box with line inputs | Pillipood | 18 EUR |
| a 5-pin socket and two resistors, for MIDI out | Oomipood | 2 EUR |

Note that the Pi 5 has no headphone socket and has never had an audio input, so
capturing anything means one of those two.

## If the box makes its own sound

Everything above assumes the box captures a synth. If it IS the synth — an
electric-piano sound, say — then it needs no audio input, no capture hardware and
no MIDI socket at all. Notes arrive, the box makes the sound, the sound goes
back. That is a much smaller machine and a much shorter list.

Three ways to make that sound, in order of how much trouble they are:

- **In the page itself.** An electric piano is two tones beating against each
  other with a bell-like attack, which is cheap to synthesise and is already what
  the browser does elsewhere in this project. Costs nothing and adds no parts.
- **A player and a sound file on the box.** Better, still easy on this hardware.
  It needs the sound to reach the page, and on Linux that is a loopback the
  system already provides — the equivalent on a Mac cost this project a day.
- **A commercial piano instrument.** Best sound, still modest, but it is bought
  rather than free and worth checking it is still sold for this hardware.

Start with the first, because it changes one thing at a time: the same page, a
different computer.
