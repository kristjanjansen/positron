# elektron audience-participation archaeology — the research instrument we already built (2026-08-28)

Companion to `research/timeline-own-prior-art-2026-08.md`. That doc surveyed the
elektronstudio message vocabulary and the 176-line ws relay. This one goes after
three specific mechanisms the user remembered: **video archived and aligned from a
filename timestamp**, **a schema of audience buttons/sliders**, and **an app that
played the recorded interactions beside the video for research**. All three exist,
all three are found, and the dataset survives in the repo.

Marks: ✅ read directly from source · 📄 from a README/comment/payload ·
⚠️ inferred or unverified.

Clones (read-only, shallow, in scratchpad — nothing touched in `~/personal`):
`elektronstudio/{archive,lab,v3,v4,ws}`. Local survivors already on disk:
`~/personal/{foyer,foyer2,wakeup-foyer}` (none of them relevant — no `strapi`
or `data.elektron.art` hits).

---

## Verdict ✅

**The research app is `elektronstudio/lab` — 6 source files, ~2 200 lines, and it
still contains the data.** Three capture sessions from 2022 are committed as a
string literal in `lab/src/data/data.ts`: 18 Feb, 3 Jun, 10 Jun 2022; ~1 160 rows;
20 distinct participants in the largest session; **one** control type (`DATA_1`);
channels `eksperiment`, `liisi-tuba`, and — decisively — **`voogteater`**. The
Estonian word from the thesis is the channel name in the dataset. This is the
instrument, and `lab` is the analysis tool built on top of it.

The alignment trick is real and is four lines long. It is also **the weakest of
the three T₀ strategies we have now measured**, by an order of magnitude: the
filename stamp is a *transcode-completion* time, quantised to 1 s, anchored at the
**end** of the file, and it disagrees with itself by **17 s across the five
renditions of a single recording** — of which the code arbitrarily takes `files[0]`.

---

## 1. The filename-timestamp alignment ✅

**`lab/src/pages/index.vue:42–87`**, function `processVideo`. The whole trick:

```js
const name = video.value.files[0].name;
const videoUrl = `https://pepe-dl.babahhcdn.com/bb1150/${path}/${name}`;
const lastModified = name.split(".")[0].split("_").slice(-1)[0];
const endDatetime   = new Date(parseInt(lastModified) * 1000);
const startDatetime = sub(endDatetime, { seconds: video.value.duration });
```

Then, in **`lab/src/pages/video/[id].vue:35–42`**, the playhead is projected onto
wall-clock so it can be compared to interaction timestamps:

```js
const absoluteTimestamp = computed(() =>
  add(selected.value.value.data.startDatetime, { seconds: timestamp.value })
);
```
…where `timestamp` is `video.currentTime`, updated from `timeupdate` **and**
`seeked` (`[id].vue:44–53`). That pair of listeners is the seek-correctness
instinct our transport formalises — they knew `timeupdate` alone lies after a seek.

### Where the filename came from 📄

The CDN posts a webhook to the ws relay. The literal example payload is committed
as a comment in **`elektronstudio/ws/index.js:63`**:

```
{"operation":"push_bb1150","original":"x_live_1",
 "path":"video/2022_02/2022_02_16_x_live_1_c1_1","duration":5015.796667,
 "files":[{"name":"640x360_517_1645035077.mp4"},{"name":"640x360_1004_1645035079.mp4"},
          {"name":"960x540_1882_1645035087.mp4"},{"name":"1280x720_3053_1645035090.mp4"},
          {"name":"1920x1080_5757_1645035094.mp4"}],"hd":1}
```

which the relay stores verbatim as a `store: true` message (`ws/index.js:66–76`):

```js
const message = createMessage({ type: "VIDEO", channel: "elektron",
                                value: req.body, store: true });
redis.rpush(messagesList, message);
```

`lab` then reads them back over HTTP: `GET https://ws.elektron.art/messages?secret=…&type=VIDEO`
(`index.vue:9`), served by `ws/index.js:45–61` — `redis.lrange(messagesList, 0, -1)`
filtered by `type` or `channel`.

Filename grammar: `{width}x{height}_{bitrate_kbps}_{unix_seconds}.mp4`.

### Assessed against the two T₀s we measured ✅

| strategy | anchor | error vs truth | resolution |
|---|---|---|---|
| native first-frame stamp | first presented frame | **±15 ms** | frame |
| platform metadata (`Stream API created`) | ingest registration | **−6.2 s** | ~1 s |
| **filename stamp + duration (this)** | **transcode completion of one rendition** | **≥17 s of internal disagreement, transcode lag unbounded** | **1 s** |

Three things this gets *wrong*, all measurable from the payload above:

- ⚠️ **It is not a recording time, it is a transcode time.** The five renditions
  of one file carry `1645035077 / …79 / …87 / …90 / …94` — **17 s of spread**,
  monotonically increasing with bitrate. These are ffmpeg finish times, one per
  ladder rung. `files[0]` (the 360p rung, first to finish) is the *least* wrong,
  which is luck, not design; picking the 1080p rung would move T₀ by 17 s.
  Computed: `files[0]` ⇒ start `16:47:41`, `files[4]` ⇒ start `16:47:58`.
- ⚠️ **It is end-anchored.** `start = end − duration` inherits *every* error in
  `duration` as an error in T₀. A container duration that is long by a
  trailing-silence pad, or short by a dropped final GOP, shifts the whole
  interaction overlay. A start-anchored stamp would confine duration error to the
  tail, where nothing is being aligned.
- ⚠️ **1 s quantisation.** Unix seconds in a filename. Even a perfect mtime could
  not do better than ±500 ms — 33× worse than the first-frame stamp before any
  other error is counted.

One thing it gets **right**, and we should keep it: **the anchor travels with the
artefact.** The filename survives re-hosting, CDN migration, and the death of the
platform's metadata API. Six months later `lab` can still derive a T₀ from a bare
URL with no API call. That is exactly the property our content-derived T₀ has and
platform metadata does not — the elektron trick was reaching for the right
*invariant* (self-describing media) with the wrong *sample* (transcode mtime).

### The tell that they knew it was loose ✅

`index.vue:53–72` fuzzy-matches each video to a Strapi event and **reports the
error in minutes**:

```js
const diff = Math.abs(differenceInMinutes(new Date(e.start_at), startDatetime));
const suffix = relativeDiff <= -1 ? "min earlier"
             : relativeDiff >  1  ? "min later" : " on time";
…
.filter((e) => e.diff < 120)[0];
```

A **±120-minute** acceptance window, with the residual surfaced in the UI as
"7 min earlier". Nobody writes a two-hour matching window against a trustworthy
clock. The card UI (`index.vue:153–168`) prints Start / End / Uploaded / Duration
side by side precisely so a human can eyeball which one to believe. **This is a
manual C6 tombstone**: uncertainty was displayed rather than resolved.

### The second, worse clock ⚠️ — and the real problem

Interaction timestamps are **not** server-stamped. `v4/composables/messages.ts`:

```js
sendMessage.value = (message) => send(JSON.stringify({
  id: randomString(),
  datetime: new Date().toISOString(),   // ← the AUDIENCE MEMBER'S device clock
  ...message,
}));
```

So the join in `lab` is: a **server-side transcode clock** (video T₀) against
**N unsynchronised browser clocks** (one per participant), with **no offset
estimation anywhere**. The relay adds no receive-time; the Redis list preserves
only what the client sent. Any participant with a 30 s clock skew has their entire
lane silently displaced, and nothing in the pipeline can detect it. For a study
whose dependent variable is *when* people reacted, this is the load-bearing defect.

---

## 2. The interaction schema ✅

A **plain-text, `---`-delimited, `key: value` mini-DSL, typed into a Strapi
textarea**. Parser: `v3/src/utils/controls.ts` (34 lines) → `v4/composables/controls.ts`
(same 30 lines, plus an aggregation helper). The literal example, from
`v4/pages/lab/controlslab.vue` — whose heading is `Controls field in Strapi`:

```
channel: experiment
type: DATA_1
title: How do you feel!!!!
labels: 🤯,😇,😃
min: 0
max: 5
step: 1
description: Please: enter some data
---
channel: experiment
type: DATA_2
title:  Some other data
min: 0
step: 0.01
```

Parse (`v4/composables/controls.ts:5–40`): split on `/\n---\s*\n/`, split rows on
`/:\s*(.+)/` (first colon only — hence `description: Please: enter some data`
survives), `Object.fromEntries`, then d3's `autoType` for numeric coercion, then
defaults:

```js
return {
  control: chunk.control === "text" ? "text" : "slider",
  title: "", description: "", min: 0,
  max: chunk.max > chunk.min ? chunk.max : 10,
  step: "any",
  ...chunk,
  value: chunk.control === "text" ? "" : chunk.value ? chunk.value : 0,
  labels: chunk.labels ? chunk.labels.split(",").map((l) => l.trim()) : null,
};
```

**In the shipping v4 schema there is no button.** The vocabulary is exactly two
kinds: `text` and `slider` (everything not `text` falls through to `slider`).
Discrete choice was expressed as a **slider quantised into one**:
`min: 0 / max: 5 / step: 1` plus `labels: 🤯,😇,😃` renders as a 6-detent control
with emoji anchors (`v4/components/Controls.vue`, template).

### But the button existed, in v3, and was deleted ✅

`v3/src/components/Controls.vue:92–288` is a **second, richer implementation
commented out inside the file** (`<!-- … -->`). It has three things v4 does not:

- **`control: submit` — an actual button**, with a batch handler that sends every
  non-empty control at once rather than on change:
  ```js
  const onFormSubmit = () => {
    const submissions = controls.value.filter(
      (c) => c.control !== "submit" && c.value.value !== "");
    submissions.forEach((c) => ws.send(createMessage({
      channel: props.channel, type: c.type, value: c.value.value })));
    submitted.value = unique([...submitted.value, props.channel]);
  };
  ```
- **`show: pre` — a phase field**, splitting a *pre-show questionnaire* from
  in-performance controls: `controls.filter((c) => c.show === "pre")`.
- **One-shot submission per channel**, persisted client-side:
  `const submitted = useStorage("elektron_submitted", [])`, with a
  `Tagasi küsimuste juurde` ("back to the questions") escape hatch.

So the original design was **survey + continuous telemetry** — a pre-show
instrument answered once, plus live sliders. v4 kept only the sliders. ⚠️ For a
participation study that is a real regression: the covariates (who is this person,
what did they expect) were designed and then dropped, leaving a corpus of
unattributed movement. `props.private` (`Controls.vue:105, 237`) is *not* a
data-protection flag despite the name — it only gates which subset of controls is
rendered.

### Versus our `cc` adapter

| | elektron controls | our `cc` adapter (`proto/automation/cc-core.js`) |
|---|---|---|
| kinds | `slider`, `text` — **all level-valued** | level-valued CCs **and** `SWITCHES` (64–69, 120–127) that are edge-valued |
| series identity | `type` (`DATA_1`), grouped in the view | `caps.series = (p) => p.key \|\| keyOf(p.status, p.d1)` — folds 14-bit MSB/LSB onto one key |
| capture rate-limit | **`debouncedWatch(…, { deep: true, debounce: 200 })`** | `makeCcCapture({ throttleMs: 100, keyframeMs: 500 })`, gate tagged `'throttle' \| 'endpoint' \| 'switch'` |
| switches exempt from thinning | **n/a — no switches exist** | yes, explicitly: *"a dropped sustain-pedal-down is the CC analogue of a stuck note"* |
| reducer | **none** | `catchUp: 'reduce'` — last value per controller key is the truth |
| value at playhead | **never computed** | `valueAt(series, t)`, with `step` series held flat |
| replay of a slider | draw a polyline; move a red line over it | `reduceAt` restores state, `seriesFromRows` + `valueAt` interpolate |

**Did they throttle? No — they debounced, and that is worse for research data.**
`v4/components/Controls.vue:21–39` watches the control values and only emits
200 ms after motion *stops*. A throttle thins a sweep but preserves its shape; a
debounce **deletes the sweep and keeps only where the hand came to rest**. The
consequence is a systematic sampling bias baked into the dataset: a participant
who moves decisively contributes one sample per gesture, a hesitant participant
contributes many. Sample *density* in `data.ts` is therefore a measure of
indecision, not of engagement — and nothing in `lab` corrects for it. Our
`'endpoint'` gate exists to get the settle value *in addition to* the sweep; theirs
is endpoint-only.

### The debounce, measured in the surviving corpus ✅

Parsed the 18 Feb 2022 session out of `lab/src/data/data.ts` (1 049 rows,
20 participant IDs, span **54.9 min**, values 0.0–10.0):

| statistic | inter-sample gap |
|---|---|
| minimum | **0.301 s** |
| p10 | 0.822 s |
| **median** | **20.2 s** |
| p90 | 108.8 s |
| max | 1 912 s (32 min) |

- **Zero gaps below 0.25 s, out of 1 029.** That floor is the 200 ms
  `debouncedWatch` showing up in the data — direct confirmation the thinning was
  debounce, not throttle, and that no gesture was ever sampled mid-sweep.
- **Median gap 20 s.** Roughly **0.95 samples per participant per minute** across a
  55-minute performance. This is not a continuous signal; it is a sparse event log
  that `Graph2` then draws as a **straight line across a median 20-second void**.
  Linearly interpolating a 0–10 affect slider over 20 s is fabrication, and it is
  the picture the research app presents. Our `makeCcCapture({ keyframeMs: 500 })`
  forced keyframe is precisely the floor this corpus needed and did not have.

**Did they have a reducer? No.** `v4/composables/useControlsData` (`controls.ts:42–91`)
groups messages by `type` then by `username` and computes extents — it never folds
to a current value. There is no notion of "the state of DATA_1 at time t". Which
is why:

**What did replay do with a slider?** It drew it and nothing else.
`lab/src/components/Graph2.vue` renders one `polygonpath` per participant and
overlays a red vertical line at the video playhead — but **no value is ever read
out at that line.** The app can show you *that* the slider was moving when a scene
happened; it cannot tell you *what the value was*. That is the single largest
functional gap between `lab` and a `cc`-shaped adapter, and it is entirely
`valueAt()`.

Two concrete defects in that graph worth recording:
- ✅ **Hardcoded y-scale.** `height - parseFloat(d.value) * 8` over `height = 100` —
  a fixed 0..12.5 domain that never consults `control.min/max`. The
  `max: 5` control from the schema above renders in the bottom half of the plot.
  v4's `useControlsData` computes `yMin = control?.min || yDataMin` — **v4 fixed
  this; `lab`, the research tool, still has the bug.**
- ✅ **The x-domain is derived from the video.** `scaleTime().domain([start − 30 s,
  end + 30 s])` where `start`/`end` are the filename-derived times. A 17 s T₀
  error translates directly into a 17 s displacement of every participant lane.

---

## 3. The side-by-side analysis app ✅

`elektronstudio/lab` — `App.vue`, `state.ts`, `pages/index.vue`,
`pages/video/[id].vue`, `components/Graph.vue`, `components/Graph2.vue`,
`data/data.ts`. Layout (`video/[id].vue`, template): a `<video>` at 50 % width,
`<pre>{{ absoluteTimestamp }}</pre>` underneath, then a 100 px-tall stack of
**absolutely-positioned overlapping `Graph2` instances — one per participant**:

```html
<Graph2 v-for="userSliderData in usersSliderData"
        :data="userSliderData"
        :timestamp="absoluteTimestamp?.toISOString()"
        :start="selected.value.data.startDatetime"
        :end="selected.value.data.endDatetime"
        style="position: absolute; top: 0; right: 0; bottom: 0; left: 0" />
```

Participant split (`[id].vue:70–77`):
```js
const userIds = computed(() => unique(sliderData.value.map((c) => c.userId)));
const usersSliderData = computed(() =>
  userIds.value.map((userId) => sliderData.value.filter((d) => d.userId === userId)));
```

Data ingress is **two textareas** — "Paste CSV data here" / "OR paste JSON data
here" — parsed with `d3-dsv`'s `csvParse`. There is no fetch of interaction data at
all in the detail view; the researcher exports on one machine and pastes on
another.

### What `lab` has that `proto/selfrec/replay-grid.html` does not

- ✅ **N-participant lanes over one shared wall-clock axis.** `replay-grid` grids
  *streams*; `lab` overlays *people*. Every `Graph2` shares an identical x-domain
  computed from the video window, so the lanes are genuinely comparable — that is
  the aggregate primitive our grid has no concept of.
- ✅ **A wall-clock projection of the playhead** (`absoluteTimestamp`) displayed as
  text, so a finding can be quoted against the performance's real time rather than
  a media offset.
- ✅ **Paste-in data ingest** — a trivially useful research affordance. No server,
  no upload, no schema negotiation: paste a CSV, get lanes.
- ✅ **Per-participant colour identity** (v4 side: `stringToColor(username)`) and a
  **solo/mute-style participant filter** in `v4/components/ControlsData.vue` —
  click a participant to dim all others, "Show all users" to restore.

### What it lacked

- ⚠️ **No statistics of any kind.** No mean, median, variance, sum, or envelope
  across participants — grepped `ControlsGraph.vue` and `Graph2.vue` for
  `mean|average|median|sum|aggregate`: zero hits. Twenty lanes and no way to ask
  "what did the room do".
- ⚠️ **No value-at-playhead** (above). The red line is decoration.
- ⚠️ **No export from the analysis app.** Export exists only on the *capture* side
  (`v4/…/experiment.vue`, `downloadCSV`); once in `lab`, data is terminal.
- ⚠️ **No session comparison.** Three capture sessions are in `data.ts`; the app
  loads one array at a time.
- ⚠️ **No seek-to-event.** You can see a spike but cannot click it to move the
  video there — the coupling is one-way, video → graph, never graph → video.
- ⚠️ **`Graph.vue` is dead** and `sliderData.value = savedSliderData` is commented
  out (`[id].vue:59`) — the committed dataset is not even wired to the viewer. The
  tool was left mid-thought.

### The capture-side export ✅

`v4/pages/projects/[project_slug]/[event_slug]/experiment.vue:30–47`:

```js
const onDownloadCsv = () =>
  downloadCSV(experimentMessages.value, `${format(new Date(), "dd_MM_y__HH_mm_ss")}.csv`);
const onCopyAndDownloadCsv = () => { copy(formatCSV(experimentMessages.value)); onDownloadCsv(); };
const onClear = () => { if (confirm("Are you sure you want to clear data?")) messages.value = []; };
```

That filename format `dd_MM_y__HH_mm_ss` is **exactly the shape of the `captureId`
column** in the dataset — `18_02_2022__20_59_02`, `03_06_2022__11_36_16`,
`10_06_2022__12_36_21`. So the session identity of the research corpus is *the
local-timezone filename of a browser download*: a **third** filename-timestamp,
and the only one that is neither UTC nor machine-checkable. ⚠️ It is also
inconsistent with the row timestamps, which are UTC ISO — `18_02_2022__20_59_02`
is EET, i.e. `18:59:02Z`, and must be hand-converted to be compared with the data
it labels.

**A real corruption bug in the export** ✅ — `v4/composables/download.ts:1–12`:

```js
Object.values(item).map((i) => `"${i}"`).join(",")
```

Naive quoting with no escaping. The damage is visible in the committed corpus:
`lab/src/data/data.ts` contains rows like

```
"pvyrtxagslkobczj","2022-02-18T19:00:31.122Z",""kmdslwyuaitnqebg"","eksperiment",…
```

— a doubled-quoted `userId` that `csvParse` will read as a *different participant*
than the same person's other rows. **123 occurrences of `""` in the file.** Any
free-text (`control: text`) answer containing a comma or quote would shred the row
entirely. This is a research dataset with a silent identity-splitting bug in its
serialiser.

---

## 4. What a participation researcher needs from `timeline/` ✅

Nothing in the current client set exercises the research shape. Concretely:

**Adapters**
- **A `participant` kind — N instances of one `cc`-shaped adapter, keyed by
  participant.** `caps.series` already gives per-control identity; the research
  case needs a second axis. Either `series: (p) => `${p.userId}:${p.type}`` (cheap,
  works today, but makes `caps.neighbourhood` — currently the guessed `8` — wrong
  by a factor of N) or a genuine two-level series identity. **The neighbourhood
  guess is the first thing 20 participants break.**
- **An `aggregate` kind that is a pure function of another kind.** Mean / median /
  quantile-envelope of all participant series at the playhead. This is the thing
  `lab` most conspicuously lacked, and it is a *derived* lane — it needs no
  capture, only `reduceAt` over a set of series plus a fold.
- **A `marker` / annotation kind.** Researchers code video. Time-ranged labels with
  a coder identity, so two coders' passes are two lanes.

**API gaps**
- **`valueAt` must be public and seek-exact.** The whole research question is "what
  was the value when X happened". It exists inside `cc-core.js`; it needs to be a
  first-class read at the playhead for any continuous kind.
- **Graph → transport seek.** Every finding starts as "what is that spike" and
  ends as "put the video there". `lab` never had it; our transport can.
- **Per-source clock-offset as a declared property of a lane.** The elektron defect
  is not fixable in analysis because the offset was never estimated. A research
  client needs `offsetMs` per participant — even if it is only ever 0 with a
  tombstone saying "unknown, client-stamped".
- **Export that round-trips.** RFC-4180 CSV (with actual escaping), plus a
  long-format frame that lands in pandas/R without reshaping:
  `session_id, t_wall, t_media, participant, control, value, gate`. Carrying
  `gate` (`throttle|endpoint|switch`) is what lets an analyst *undo* the sampling
  bias that killed the 2022 corpus — you cannot correct for a debounce you cannot
  see.
- **Session as a first-class object.** Three capture sessions in one corpus, loaded
  and compared side by side, is the minimum for a study.

---

## 5. Consent, ethics, data protection ⚠️

**Grep result: zero.** `consent|nõusolek|gdpr|anonym|privacy|isikuandme|uuring|research|ethic`
across `v3`, `v4`, `lab` returns only seven hits, all of them the string
`crossorigin="anonymous"` on `<video>` and `<audio>` tags. There is **no consent
flow, no participation notice, no anonymisation step, no retention policy, and no
per-subject deletion path** anywhere in the platform.

What the pipeline actually does with personal data:

- **Pseudonymous but not anonymous.** Rows carry `userId` (a random 16- or
  36-character string) *and* `userName` — and the committed corpus contains
  self-chosen real nicknames, e.g. `userName: "kika"` in `lab/src/data/data.ts`.
  The identifier is stable across a session, so behavioural re-identification
  within a small theatre audience is straightforward.
- **The corpus is committed to a public GitHub repo.** ~1 160 rows of timestamped
  behavioural data from ~20 named-ish participants, in `lab/src/data/data.ts`, in
  a public repository, with no accompanying consent record.
- **Erasure is all-or-nothing.** The only deletion primitive in the relay is
  `ws/index.js:36–43`, `redis.del(messagesList)` behind `GET /messages/clear` —
  **one global list, no TTL, no per-channel or per-subject segregation.** A GDPR
  Art. 17 erasure request for a single participant is *unimplementable* against
  this store. Everything or nothing.
- **A single static shared secret guards the whole corpus**, passed as a query
  parameter (`hasSecret`, `ws/index.js:34`) — and one such token is **hardcoded in
  the public client source** of `lab/src/pages/index.vue:9`. ⚠️ Worth confirming
  the endpoint is dead and the token retired; do not reuse this pattern.

**For our C6 tombstones.** C6 currently answers *"is this timestamp trustworthy?"*
Research on human participants also needs *"is this row allowed to exist, and can I
remove it?"* — a different axis that our uncertainty model does not touch:
per-row **provenance** (which consent version covers it), **scope** (may it leave
the analysis machine), and **erasability** (is there a key that deletes one
subject's rows without deleting the corpus). A store keyed only by arrival order,
as Redis-`rpush` was, forecloses all three. If `timeline/store.mjs` is to serve a
research client, **subject-keyed deletion has to be a store primitive, not an
afterthought** — that is the single clearest lesson the elektron platform hands us,
and it hands it to us by not having it.

---

## Steal list

1. ✅ **Anchor-travels-with-the-artefact.** Right instinct, wrong sample. Keep the
   principle; take the stamp from the first frame, not from ffmpeg's clock.
2. ✅ **Display the residual.** The "7 min earlier" badge is a hand-rolled
   tombstone. Ours should be automatic and in milliseconds.
3. ✅ **`timeupdate` + `seeked` together.** They already knew `timeupdate` lies
   after a seek.
4. ✅ **Paste-in CSV ingest.** Zero-ceremony data loading for an analysis view.
5. ✅ **Per-participant lanes on one shared wall-clock axis**, with solo-by-click.
6. ⚠️ **Do not debounce a research signal.** Throttle, tag the gate, and export the
   tag.
7. ⚠️ **Never hand-roll CSV.** 123 corrupted cells in the surviving corpus.
8. ⚠️ **Subject-keyed erasure or no personal data.** `redis.del(*)` is not a
   retention policy.

---

## 6. The thesis — Taavet Jansen, "voogteater" (EKA)

*(pending — parallel search in flight at time of writing; see the appended section
below or the agent report.)*

The code side already establishes the link: the channel name in the surviving 10 Jun
2022 capture is literally **`voogteater`** (`lab/src/data/data.ts`, `sliderData`),
alongside `eksperiment` and `liisi-tuba`. Whatever the thesis says, the instrument
it describes is the one documented above, and the corpus it drew on is
`elektronstudio/lab`.
