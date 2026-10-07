# plan-ici-vain: ici on Väin, with nothing of positron in between

**Nothing in this document is built.** Written 2026-10-07 from a pasted
description of Albert Saprykin's *ici* and a reading of `tarmoj/radio1965`.

Marks: **READ** is from a file, cited. **MEASURED** is nothing here: no server
of anybody's was contacted while writing this. **INFERRED** is reasoning.

⚠️ The clone read is `~/personal/radio1965` at `0ff5e8a`, 2026-08-29, and was
NOT fetched first. Every READ below about their server needs one `git fetch`
before anybody builds on it.

## 0. The answer to "why is positron in the middle"

It is not. The first sketch put a recorder page on positron and a source
process on positron's Raspberry Pi, and neither earns its place:

| what ici needs | who already has it |
| --- | --- |
| record 15 seconds on a phone, anonymously | ici's own PWA (MediaRecorder) |
| store the recordings | ici's own Firebase Storage |
| pick one with the 24 hour freshness rule | ici's own algorithm |
| play it to everybody at once | an Icecast mount on `live.uuu.ee` |
| tell phones it is on air | Väin's Icecast `on-connect` hook, already written |
| let it recede after a day | Väin's `DEFAULT_SHELF_DELAY`, already one day |

The one positron piece that would have been genuinely useful, the HTTPS relay
in `workers/shout`, solves a browser problem (an HTTPS page cannot load
`http://...:8001`). Väin is a native Qt app and does not have that problem.

## 1. What Väin already does that makes this nearly free (READ)

- **Any source that connects to a mount publishes a card and a push by
  itself.** `server/icecast_on_connect.sh` reads the source's `ice-name` and
  `ice-description` from `status-json.xsl` and POSTs a `livestream` event
  titled `<ice-name> is on air on channel <mount>!` with `publish_now: true`,
  which sends the notification at once (`server/main.py`, `publish_event`).
  `icecast_on_disconnect.sh` shelves it when the source leaves. So ici needs
  **zero code in Väin**: name the stream `ici`, connect, and the card appears.
- **Väin's freshness rule is ici's freshness rule.** `server/main.py:50`
  `DEFAULT_SHELF_DELAY = timedelta(days=1)`, and `cron_publish.py` moves `new`
  to `shelved` every minute once `shelf_at` passes. The last commit in the clone
  is literally *"auto shelving time to 1 day"*. New Arrivals is the last 24
  hours; the Collection is the deeper layers. The two works landed on the same
  number independently (INFERRED: neither author knew of the other).
- **The mounts exist.** `radio1965` and `user1..user4`, MP3, 128 kbit/s, plain
  HTTP on 8001 (`project-description.md` §8.1).

## 2. The design

```
phone ──QR──> ici PWA ──> Firebase Storage
                               │  (list + fetch, read only)
                               v
                         ici source (Albert's)
                               │  MP3 128k, icecast://
                               v
                   live.uuu.ee:8001/ici ──on-connect──> Väin card + push
                               │
                               v
                       Väin listeners, and anything that plays Icecast
```

### 2.1 The source is the TV

The installation's TV is silent for unpredictable stretches and then plays one
15 second recording to everyone in the room. On air, that is one long-running
process that:

1. lists Firebase Storage and weights recordings by age, last 24 hours first,
   older ones less and less (ici's existing rule, not a new one);
2. waits a random gap, plays one fragment, repeats;
3. **sends encoded silence during the gaps**, never nothing. An Icecast source
   that stops sending is disconnected, which fires `on-disconnect` and shelves
   the card. Silent MP3 frames cost almost nothing.

**Liquidsoap is the tool, and their own document names it**
(`project-description.md:140`). A `request.dynamic` that asks a small script
for the next item, `blank()` for the gaps, `mksafe` underneath so a Firebase
hiccup is silence rather than a dropped source, `output.icecast` on top with
`name="ici"`. Roughly 30 lines plus the picker. A Python loop feeding ffmpeg
works too and is uglier at the seams between files.

### 2.2 Who runs it

**Albert, recommended.** It is his work, his Firebase project and his
algorithm, and the only thing he needs from ECCM is a mount and its source
password. It can run on any always-on machine, including the Raspberry Pi he
already uses for Ariel. Second choice: a process on the `live.uuu.ee` box
itself, which needs Tarmo's say and read credentials to Firebase.

### 2.3 What Väin shows

One `livestream` card per session, written by the hook. The `ice-description`
is the card's summary, so it should say what the listener will hear, because
**a stream that is mostly silence reads as broken unless the card says so**:
something like *"Mostly silence. Now and then, 15 seconds somebody recorded
today."* and the ici PWA address so a listener can send one back.

## 3. A session, not 24/7 (recommendation)

INFERRED from the two mechanisms above: a source connected for a week makes
one card, and the card shelves itself after a day while the stream is still
live. So a 24/7 ici is invisible in New Arrivals from day two.

Running ici as **a daily session** (connect, play for an hour, disconnect)
gives one push and one fresh card per day, a card that recedes overnight, and a
shape the Radio 1965 theses already ask for: fixed slots (28, 56 or 112 min)
and scheduled silence between programmes. It is also a smaller ask of a
volunteer server. Which slot, and how long, is Albert's and Tarmo's call.

## 4. Refused, and why

- **A Väin card per recording.** Every published event pushes, so this is a
  notification every few minutes. Unless Tarmo adds a "publish without
  notifying" flag, fragments stay inside the stream.
- **Recording inside Väin.** The app can capture the microphone for
  broadcasting, but there is no upload endpoint; events carry a `url`, not a
  file. ici's PWA already does this job and is where the QR code points.
- **positron as relay or recorder.** See §0.

## 5. Things to settle before anything runs

1. **Consent of past contributors.** The 200 Freiburg recordings were given
   anonymously to an installation in a foyer. Broadcasting them is a new use.
   Starting the radio version from fresh recordings only, made after the card
   says they will be broadcast, avoids the question.
2. **The operator.** On 2026-09-15 the `live.uuu.ee` operator counted ~100
   concurrent connections traced to positron.studio and the radio1965 mount
   was pulled. A permanent source plus whatever listeners Väin brings is a new
   load and has to be asked for, not assumed. A dedicated `ici` mount needs an
   `icecast.xml` entry with the same hooks as `user1..4`.
3. **Firebase egress.** ~250 KB per 15 s fragment at ici's encoding (INFERRED,
   depends on what MediaRecorder produced). A day of fragments at one a minute
   is ~350 MB. The Spark plan's free download allowance should cover a session
   a day. Check against Albert's plan.
4. **Format.** MediaRecorder writes WebM/Opus on Chrome and MP4/AAC on Safari.
   Liquidsoap decodes both through ffmpeg, but the picker must not assume one.

## 6. Two things to tell Tarmo, unrelated to ici but found while reading

- `project-description.md` (around line 365) carries an **Icecast source
  password in plain text** in an ffmpeg example.
- `POST /events/publish` in `server/main.py` has **no authentication**, and it
  sends a push to every subscribed phone. Anybody who finds the API base can
  notify the whole audience.

## 7. Cost, in work

| piece | who | size |
| --- | --- | --- |
| mount `ici` with the existing hooks | Tarmo | minutes |
| Liquidsoap script + Firebase picker | Albert, or whoever helps him | a day |
| card text, session slot | Albert and Tarmo | a conversation |
| changes to Väin | nobody | none |
| changes to positron | nobody | none |
