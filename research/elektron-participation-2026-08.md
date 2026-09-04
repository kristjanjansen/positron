# positron audience-participation archaeology — the research instrument we already built (2026-08-28)

Companion to `research/timeline-own-prior-art-2026-08.md`. That doc surveyed the
elektronstudio message vocabulary and the 176-line ws relay. This one goes after
three specific mechanisms the user remembered: **video archived and aligned from a
filename timestamp**, **a schema of audience buttons/sliders**, and **an app that
played the recorded interactions beside the video for research**. All three exist,
all three are found, and the dataset survives in the repo.

Marks: ✅ read directly from source · 📄 from a README/comment/payload ·
⚠️ inferred or unverified.

Clones (read-only, shallow, in scratchpad — nothing touched in `~/personal`):
`elektronstudio/{archive,lab,v3,v4,ws}`, plus `elektron-nuxt` read over the GitHub
API. Local survivors already on disk: `~/personal/{foyer,foyer2,wakeup-foyer}`
(none relevant — no `strapi` or `data.elektron.art` hits). Thesis PDF and extracted
text in scratchpad as `thesis.pdf` / `thesis.txt`.

The org has 43 repos. The relevant spine is
**`v1`→`v2`→`v3`→`v4`→`elektron-nuxt`** (clients), **`ws`** (the relay),
**`strapi4`** (described in its own GitHub blurb as "data.elektron.art"), **`lab`**
(the research app) and **`archive`** (a graveyard monorepo containing `logger/` and
an older `strapi/`).

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

**The thesis is real and freshly defended.** Taavet Jansen, *Kehata kohalolu:
voogteatri kontseptuaalne ja praktiline kaardistus*, EKA 2026 (defence 18.05.2026).
It names elektron.art as its research instrument throughout, thanks the author of
this codebase by name for the interaction concepts — and contains **no schema
document, no dataset, and no log-to-video synchronisation method**, naming that
absence as future work. `timeline/` is the answer to a gap stated in a defended
dissertation.

**Two findings reframe the whole survey.** First: the platform never had a discrete
control kind, so a button press was shipped as **two level messages, `value: 10`
then `value: 0`** — an edge faked as a zero-width pulse, which any reducer erases.
Second: measured against the surviving corpus, the slider signal has a **median
inter-sample gap of 20.2 s** and **no gap below 0.25 s** — the 200 ms debounce made
visible in the data, drawn by the research app as a straight line across a
20-second void.

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
const message = createMessage({ type: "VIDEO", channel: "positron",
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
platform metadata does not — the positron trick was reaching for the right
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
  `const submitted = useStorage("positron_submitted", [])`, with a
  `Tagasi küsimuste juurde` ("back to the questions") escape hatch.

So the original design was **survey + continuous telemetry** — a pre-show
instrument answered once, plus live sliders. v4 kept only the sliders. ⚠️ For a
participation study that is a real regression: the covariates (who is this person,
what did they expect) were designed and then dropped, leaving a corpus of
unattributed movement. `props.private` (`Controls.vue:105, 237`) is *not* a
data-protection flag despite the name — it only gates which subset of controls is
rendered.

### The button, as finally shipped: an edge faked with a level pulse ✅

The Memento buttons the thesis describes are
**`elektronstudio/elektron-nuxt/components/MementoButtons.vue`** (used by
`pages/projects/memento/[event_slug]/live.vue`). The parser is the *same*
`parseControls`, with exactly one line changed — `control: chunk.control ? chunk.control : "slider"`,
so arbitrary kinds now pass through. **The `---` / `key: value` Strapi-textarea DSL
survived three generations unchanged: v3 (2021) → v4 (2022) → elektron-nuxt
(2023–25).**

The press handler is the single most instructive fragment in the whole survey:

```js
const handleClick = useThrottleFn((channel: string, type: string) => {
  sendMessage.value({ channel, type, value: 10, userid: userId.value, username: userName.value });
  sendMessage.value({ channel, type, value: 0,  userid: userId.value, username: userName.value });
}, 3000);
```

**A button press is two level-valued messages — 10 then 0, back to back.** Having no
discrete kind, they synthesised an edge as a zero-width pulse on the level channel.
This is a note-on/note-off pair in `cc` clothing, and it is precisely the
distinction our adapter draws with `SWITCHES` and `catchUp: 'reduce'`. Four
consequences, all of which our design already forecloses:

- ⚠️ **A reducer would erase every press.** Last-value-per-control is *always 0*
  after a pulse. Seek to any moment and the room reads as unanimous silence. Our
  cc-core comment — *"edge-valued: no amount of 'current state' can recreate an
  attack you missed"* — is the exact failure mode, met head-on in production
  theatre.
- ⚠️ **The pulse has no width and no order.** Both messages are stamped
  `new Date().toISOString()` in the same tick, frequently the same millisecond, with
  `id: randomString()` and **no sequence number**. Any sort-by-`datetime` is a coin
  flip; reconstruct the pair inverted and you get a **stuck-on** button. Our 16-byte
  frame carries a `u32 seq` for exactly this.
- ⚠️ **The rate limit is client-side, and the thesis misdescribes it.** The thesis
  says *"mitte rohkem kui üks hääl **IP-aadressi** kohta 3 sekundi jooksul"* (no more
  than one vote per IP per 3 s), added after the platform hung on opening night.
  The code is `useThrottleFn(…, 3000)` — **in the browser**, per client, trivially
  bypassable, with no server-side counterpart anywhere in `ws/index.js`. For a
  dissertation reporting vote proportions (61 % / 28.9 % / 9.9 %), the ballot has no
  integrity guarantee. This is the one place where a documentation error in the
  thesis touches a published number.
- ✅ **`value: 10` reuses the slider domain.** Buttons are sliders pinned to the
  endpoints — confirming that the platform never had a non-level kind at all.

Two further mechanisms with no analogue on our side, both worth taking seriously:

- **The schema is mutable mid-performance.** `UPDATE_BUTTON` messages carry a
  space-separated `"index label color"` triple (spaces inside labels encoded as
  apostrophes, `.replace(/'/g, " ")`), and `UPDATE_QUESTION` pushes the prompt text.
  The interaction-dramaturg re-labels the buttons live. ⚠️ **`type` stays `DATA_1`
  while the question it answers changes.** Any analysis grouping by control `type`
  across a performance is silently pooling heterogeneous questions — and Figure 10
  in the thesis is built on exactly this data. **A research timeline must version
  control identity: a control is `(type, schema_epoch)`, not `type`.**
- **`UPDATE_BUTTON_NR`** broadcasts live tallies (`"2 212"` = button 2, count 212).
  The aggregate is computed operator-side and pushed, never derived from the log —
  so the displayed count and the stored rows are two independent artefacts that can
  disagree, with no way to reconcile them after the fact.
- ⚠️ **`store: false` is per-message** and set by the client. The persisted record is
  incomplete by design, and completeness is a client-side decision.

### Versus our `cc` adapter

| | positron controls | our `cc` adapter (`proto/automation/cc-core.js`) |
|---|---|---|
| kinds | `slider`, `text`, later `button` — **all level-valued**; edges faked as a 10→0 pulse | level-valued CCs **and** `SWITCHES` (64–69, 120–127) that are genuinely edge-valued |
| ordering | `id: randomString()`, no sequence — same-ms pairs unorderable | `u32 seq` in the 16-byte frame |
| control identity | `type` only — **re-labelled live, silently** | `keyOf()` stable for the session |
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
- **A genuinely edge-valued participant kind**, so a button press is not a 10→0
  pulse on a level channel. This is `SWITCHES` generalised: `catchUp` must be
  `'replay'`, not `'reduce'`, or every press disappears on seek.
- **A `marker` / annotation kind.** Researchers code video. Time-ranged labels with
  a coder identity, so two coders' passes are two lanes. The thesis codes everything
  thematically by hand (9 themes for `/imagine`, 5 for `/whisper`, 6 for
  `/remember`, 5 for the survey motivations) — that is the workload a marker lane
  removes.

**API gaps**
- **`valueAt` must be public and seek-exact.** The whole research question is "what
  was the value when X happened". It exists inside `cc-core.js`; it needs to be a
  first-class read at the playhead for any continuous kind.
- **Graph → transport seek.** Every finding starts as "what is that spike" and
  ends as "put the video there". `lab` never had it; our transport can.
- **Per-source clock-offset as a declared property of a lane.** The positron defect
  is not fixable in analysis because the offset was never estimated. A research
  client needs `offsetMs` per participant — even if it is only ever 0 with a
  tombstone saying "unknown, client-stamped".
- **Export that round-trips.** RFC-4180 CSV (with actual escaping), plus a
  long-format frame that lands in pandas/R without reshaping:
  `session_id, t_wall, t_media, participant, control, value, gate`. Carrying
  `gate` (`throttle|endpoint|switch`) is what lets an analyst *undo* the sampling
  bias that killed the 2022 corpus — you cannot correct for a debounce you cannot
  see.
- **Versioned control identity.** `(type, schema_epoch)`, not `type` — because
  `UPDATE_BUTTON` re-labels controls mid-show and the thesis's own figures pool
  across those changes.
- **A sequence number on every row.** Two events in the same millisecond must have a
  defined order or an edge pair can be reconstructed inverted.
- **Session as a first-class object.** Three capture sessions in one corpus, loaded
  and compared side by side, is the minimum for a study.
- **An aggregate that is reconcilable with the log.** `UPDATE_BUTTON_NR` broadcast a
  tally computed elsewhere; the displayed number and the stored rows could never be
  checked against each other. A derived lane must be *derived*, not pushed.

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
afterthought** — that is the single clearest lesson the positron platform hands us,
and it hands it to us by not having it.

---

## 6. The thesis — Taavet Jansen, EKA 2026 ✅

**Found, full text retrieved and read.**

> **Taavet Jansen, *Kehata kohalolu: voogteatri kontseptuaalne ja praktiline
> kaardistus*** / *Disembodied Presence: A Conceptual and Practical Mapping of
> Streamed Theatre*. Eesti Kunstiakadeemia, 2026. 162 pp., Estonian with English
> summary. Dissertationes Academiae Artium Estoniae **50**, ISSN 1736-2261,
> ISBN 978-9916-740-75-0 (PDF). Supervisor dr **Anu Allas**; pre-reviewers dr Raivo
> Kelomees (EKA), dr Ott Karulin (TÜ); opponent dr Ott Karulin. Defence
> **18.05.2026**, EKA Põhja pst 7, room A101.

- Record: <https://eka.access.preservica.com/uncategorized/SO_a6bc1ac6-daf6-46f7-adda-7c805426b832/>
- PDF: <https://eka.access.preservica.com/download/file/IO_bbeb983d-b6c2-45b3-bb2e-2255f7b23dd0>
- Defence: <https://www.artun.ee/et/kalender/taavet-janseni-doktoritoo-kaitsmine/>

⚠️ `digikogu.artun.ee` does not resolve; EKA's repository is **EKA Digivaramu** on
Preservica. A `teater.ee` citation still lists the 2025 pre-defence manuscript.

**It names the platform, and it names the author of this codebase.** 23 mentions of
positron; `positron.live` once; **`data.elektron.art` zero times**.

> *"„Memento“ digitaalne etendusruum loodi elektron.arti veebilehele
> erilahendusena, kus lisaks tavalisele video- ja vestlusaknale lisati
> eksperimentaalseks kasutamiseks eraldi funktsioon – **interaktsiooninupud**."*
> — Memento's digital performance space was built as a bespoke solution on the
> elektron.art website, where alongside the usual video and chat windows a separate
> function was added for experimental use — **the interaction buttons**.

> *"Vestlusaken kasutas elektron.arti backend'i, kus vestlusaknas toimuvad
> sissekanded kasutavad **WebSocketi protokolli arhiveerimiseks**."*
> — The chat window used elektron.art's backend, where chat entries use the
> WebSocket protocol for archiving.

And the general instrument claim, English summary p.147 — this is the sentence to
cite when justifying `timeline/`'s research affordances:

> "Streaming platforms, custom web solutions, interaction interfaces, and
> media-routing setups were designed, adjusted, and sometimes reconfigured during
> production. **These technical components were treated as research instruments**
> because they defined what kinds of audience actions were available, how those
> actions were filtered or aggregated, and how their consequences became visible to
> performers and other spectators."

> *"Käesoleva uurimistöö raames oli võimalik teha koostööd organisatsiooniga
> elektron.art, kelle tehnilist platvormi saime kasutada piiranguteta."* (p.127)

And in the acknowledgments (p.5):

> *"Tänan **Kristjan Jansenit**, kes on interaktsioonidisainerina ja
> veebiarendajana loonud veebilahendused kõikidele mu siinkirjeldatud projektidele.
> Väga paljud interaktsioone puudutavad kontseptsioonid minu projektides on
> Kristjanilt pärit."*

### What was actually collected

Three practice-led experiments (Benford's *research-in-the-wild*), setup frozen
across runs:

| project | when | audience | data |
|---|---|---|---|
| **Hundid** | 05.2021, 11.2021, 02.2022 | — | chat words + names → DB → actor's teleprompter; 10-person test group |
| **Memento** | 6 shows, 13–22.02.2023, UT Viljandi | **180 physical, 1592 online** | **142** web survey responses (Google Forms, 6 Q, link dropped in chat); **111** paper responses (2 Q); button votes |
| **Inimeses hoitud** | 21.08–13.09.2023, EKA Gallery + SAAL Biennaal | — | chat-command tallies: **`/imagine` 589, `/remember` 253, `/whisper` 190**; Max8 level-triggered **15 s** auto-recordings (~40 % deliberate input) |

Headline results: **61 % always voted, 28.9 % sometimes, 9.9 % never**; **20 %
reported a feeling of control over the actors**, and those reported higher
engagement. Figure 10 (chart by **Aleksander Väljamäe**) plots triads A/B/C on a
0–5 scale, control vs no-control, shows 1–3 vs 4–6. Two items borrowed from
Freeman (2000)'s cross-media presence questionnaire.

⚠️ **Method: thematic coding plus descriptive percentages. No inferential
statistics anywhere** — no n-tables, no test statistics, no significance values,
not even under the Väljamäe figure. Stated explicitly in the English summary:

> "This material was not treated as a basis for statistical generalisation but as
> evidence of how participants interpreted liveness, presence, and agency under
> specific conditions."

⚠️ Internal inconsistency: "1500-st vaatajast vastas 142" against a stated 1592.

### No schema document, no dataset, no sync method — and he says so ⚠️

There is **no appendix, no code listing, no deposited data**. The button taxonomy
(§4.5) is prose: three categories, **nupud / liugurid / vestlusaken**. Memento's
buttons were **arrow-up, arrow-down, heart**, grey when inactive and coloured when
active, semantics deliberately unlabelled, repeat-pressable, with a live leading-choice
visualisation in the corner of the video, opened and closed live by the author as
*interaktsioonidramaturg*.

The §4.5 taxonomy is worth quoting because it is an argument for the **aggregate
lane**: buttons give binary/collective choices *"quantitatively measurable"*, while
sliders give *"**hajusa kollektiivse tundekaardi**"* — a diffuse collective map of
feeling — over a continuous spectrum. A collective feeling-map is precisely a
mean-plus-envelope across N participant series, and it is the one view `lab` could
not draw.

**Sliders were never used in the three documented experiments.** The single slider
sentence in the whole thesis (p.120) is a side experiment, otherwise unwritten-up:

> *"Katsetasin **liuguriga** näiteks abstraktseid valikuid („punane" vs. „sinine")
> ning vaatajate reaktsioonid näitasid, et just ebamäärasus võib osutuda
> kaasavamaks kui selgevalikuline küsimus."*
> — I experimented with a slider on abstract choices ("red" vs "blue"), and viewers'
> reactions showed that vagueness can be more engaging than a clear-cut question.

✅ **That resolves the surviving corpus.** The 2022 slider data in
`lab/src/data/data.ts` — `DATA_1`, 0–10 floats, ~20 participants, channel
`voogteater` (10.06.2022) — is almost certainly that red/blue experiment, and it
predates Memento by eight months. **`lab` holds unpublished pilot data, not the
dissertation's evidence base.** The interaction-log schema, the timestamps and any
video sync exist only in the code and the corpus, never in the thesis.

⚠️ Channel `liisi-tuba` ("Liisi's room", 03.06.2022) is not in the thesis, but
**Liis Vares** is Jansen's principal collaborator and the *voog-dramaturg* (stream
dramaturg) of *Hundid* — most likely a rehearsal channel rather than a public show.
`eestiteatriauhinnad` (the token in `lab`'s source) is outside the thesis's scope
entirely.

One logged Memento chat line quoted in the thesis is a direct artefact of the
vote-load crash — no stress test was ever run:

> *"system crash, ärge hääletage nii palju"* — system crash, don't vote so much.

On log↔video synchronisation the thesis has **nothing**, and names the absence:

> *"Minu jaoks on uurimistöö käigus olnud väga suur väljakutse see, **kuidas
> kogunevaid andmeid salvestada, süstematiseerida ja vahel isegi ära tunda**.
> Andmed varieeruvad vaatajate tagasiside kogumisest ja nende interaktsiooni
> logidest **etenduste salvestisteni**…"* (p. 35)
> — A very great challenge has been how to record, systematise and sometimes even
> *recognise* the accumulating data. It ranges from audience feedback and their
> interaction logs to **performance recordings**…

> *"Järgmise sammuna näen väga suurt potentsiaali digitaalset vahendatust kasutava
> andmekogumise **reaalajas analüüsimises**."*
> — As a next step I see great potential in real-time analysis of digitally
> mediated data collection.

**That is our gap, stated as future work in a defended dissertation.** The thesis is
now a citable statement of need for exactly what `timeline/` does.

### Ethics — one and a half pages of principle, no protocol ⚠️

§ "Eetilised küsimused", pp. 40–41. **No ethics committee approval mentioned. No
GDPR reference, no retention period, no data-management plan.** "Andmekaitse"
appears once as a general obligation. The honest self-assessment:

> *"Kokkuvõttes võib öelda, et minu eksperimendid olid rajatud **anonümiseeritud
> andmete kogumisele** ning osalejate teavitamisele andmete kasutamise eesmärkidest,
> kuid autobiograafiline ja protsessipõhine uurimisviis **ei võimaldanud alati
> vaatajatele täielikult ette selgitada, milles nende osalus seisneb**, kuna paljud
> nüansid selgusid alles töö käigus. Edaspidi on vaja olla tähelepanelikum
> otseülekande ja publiku sisendi kasutamise puhul, sest **teadliku nõusoleku raamid
> ja kunstilised eesmärgid võivad praktikas vastuollu sattuda**."*
> — In sum my experiments were built on collecting anonymised data and on informing
> participants of the purposes of use, but the process-based approach did not always
> allow viewers to be told in full in advance what their participation consisted of,
> since many nuances only became clear during the work. In future one must be more
> attentive with live broadcast and audience input, because **the frames of informed
> consent and artistic aims can come into conflict in practice**.

⚠️ **The claim of anonymisation is not supported by the code.** The store keeps
`userid` *and* self-chosen `username`, and the surviving corpus is committed to a
public repository with nicknames intact (§5 above). Pseudonymisation was reached
for; anonymisation was not implemented.

§4.5 further documents that the operator sees, in real time, **geolocation, device,
chosen name, join/leave times and dwell duration** — framed as a dramaturgical
resource, *"nähtamatu andmekiht"* (an invisible data layer) — with the ethics
deferred to §4.7, which calls for *"selgeid eetilisi juhiseid ja regulatsioone"*
(clear ethical guidelines and regulations) should personal data, emotional
reactions or biodata be used.

**This is the strongest possible brief for making consent a first-class timeline
concern.** The instrument's own dissertation says the consent frame broke against
the artistic practice, and asks for guidelines. A timeline that carries
per-row provenance, scope and erasability is a direct answer.

---

## 7. Funding and lineage 📄

Named in the thesis: the experimental-development project **"INDEX – Voogteater kui
uurimistööriist"** at the University of Tartu built the audience-feedback collection
software used in *Hundid* and developed further afterwards
(<https://loovuurimus.ee/projektid/index-digitaalse-publiku-uhendamine-loojatega-online-sundmusel>);
a Ministry of Culture creative-research grant funded Memento's real-time feedback
UI; Creative Europe's **ACuTe** funded *Inimeses hoitud*. So the interaction stack
was, from the start, funded as a **research tool** — not as a side effect of making
shows. That is the frame `timeline/` inherits.

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
6. ✅ **The `---` / `key: value` textarea DSL.** Unchanged across v3 → v4 →
   elektron-nuxt (2021–2025), authored by non-programmers in a CMS field, and it
   outlived three frontend rewrites. A control schema should be text a dramaturg can
   edit, not a typed config a developer must deploy.
7. ⚠️ **Do not debounce a research signal.** Throttle, tag the gate
   (`throttle|endpoint|switch`), and export the tag.
8. ⚠️ **Never encode an edge as a level pulse.** The 10→0 button is the whole
   argument for a discrete kind, made in production.
9. ⚠️ **Never hand-roll CSV.** 123 corrupted cells in the surviving corpus.
10. ⚠️ **Rate-limit on the server or don't report proportions.** A client-side
    `useThrottleFn` is a UX affordance, not a ballot control.
11. ⚠️ **Subject-keyed erasure or no personal data.** `redis.del(*)` is not a
    retention policy.

---
