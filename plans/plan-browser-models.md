# Models that run inside the browser, and whether one of them can transcribe

Answers `does chrome has in-browser llm-based models now? investigate in bg`,
asked 2026-09-22 and recorded in `BACKLOG.md`.

🔴 **THIS DOCUMENT WAS WRITTEN FROM DOCUMENTATION AND NOT FROM A RUNNING
BROWSER.** Nothing here was tried on this desk. No Chrome was driven, no model
was downloaded, no word was transcribed, and no latency was timed. The research
brief forbade testing it here and the reason is sound: a negative result from a
misconfigured attempt is worse than no result, because it looks like a fact.

Every claim below carries one of three marks:

| mark | means |
| --- | --- |
| **DOCUMENTED** | a vendor or standards document says so, and the document is dated |
| **MEASURED** | a number somebody took off a running thing, with whose thing it was |
| **INFERRED** | a conclusion drawn from two documented things, and not stated by either |

The only thing MEASURED by this session is the Chrome version table in section
1, taken from Chrome's own release dashboard today. Everything else marked
MEASURED was measured by somebody else and is attributed.

---

## The short answer

**Yes, and there are two separate answers, and the second one is the one this
project needed.**

1. Chrome ships a general purpose language model to the device and exposes it to
   any page as `LanguageModel`. It has been stable on the open web since **Chrome
   148, 2026-05-05**. It is a roughly **4 GB** download, it needs **22 GB** of
   free disk and a real GPU, it does not exist on any phone, and it speaks five
   languages of which Estonian is not one.
2. Chrome also ships an on-device **speech** path, and it is **not a new API**.
   It is the same `SpeechRecognition` this project already decided against, with
   three members added in **Chrome 139, 2025-08-05**: `processLocally`,
   `SpeechRecognition.available()` and `SpeechRecognition.install()`. The model
   is about **60 MB per language**, not 4 GB.

**And the standing note in `BACKLOG.md` is now half wrong and half still right.**
It says *"in Chrome it sends audio to Google, which needs a decision rather than a
guess"*. Chrome still sends audio to Google **by default**, because
`processLocally` defaults to `false` and nothing about that changed. What changed
is that a page can now **ask for local** and, more usefully, can **check in
advance** whether local is possible for a given language before it opens
anything. The sentence that replaces it is in section 4.

---

## 1. What ships in Chrome today, and at what status

### Chrome itself, as of today

MEASURED by this session on 2026-09-22, from `chromiumdash.appspot.com`
(`fetch_releases?channel=Stable&platform=Mac`), with the epoch milliseconds
converted locally:

| version | released (UTC) |
| --- | --- |
| 153.0.8010.53 | 2026-09-17 |
| 154.0.8037.44 | 2026-09-16 |
| 153.0.8010.48 | 2026-09-15 |

So Chrome stable on macOS is **153**, with **154** already rolling out beside
it. DOCUMENTED, from Chrome's release blog for September 2026: Chrome moved to a
**two-week release cycle starting September 2026**, down from four weeks. That
matters for a reason that has nothing to do with AI: any sentence in this
repository of the form *"lands in Chrome N"* now ages twice as fast as it used
to.

### The built-in AI family

DOCUMENTED, from `developer.chrome.com/docs/ai/built-in-apis` and the Chrome 148
release notes (stable 2026-05-05):

| API | status | Chrome, web | Chrome, extensions |
| --- | --- | --- | --- |
| Translator | stable | 138 | 138 |
| Language Detector | stable | 138 | 138 |
| Summarizer | stable | 138 | 138 |
| Prompt API (`LanguageModel`) | stable | **148** | 138 |
| Prompt API sampling parameters | origin trial | 148 | n/a, extensions keep `topK`/`temperature` |
| Writer | developer trial | flag | flag |
| Rewriter | developer trial | flag | flag |
| Proofreader | origin trial | 141 to 145 | 141 to 145 |

⚠️ **THE STATUS PAGE'S OWN DATE COULD NOT BE READ RELIABLY.** Two fetches of
`developer.chrome.com/docs/ai/built-in-apis` returned two different "last
updated" lines, `2025-09-12` and `2024-09-12`, neither of which can be right for
a table that names Chrome 148. The Prompt API page's own stamp read
**2026-08-26 UTC** and is the one to trust. The table above is cross-checked
against the Chrome 148 release notes rather than against that stamp.

The four facts worth carrying out of that table:

- **The Prompt API is the one that is new.** It was extensions-only for a year.
  Chrome 148 turned it on for every page on the open web, on by default, no
  origin trial and no flag.
- **The writing family is not settled.** Writer and Rewriter are still developer
  trial after more than a year, and Proofreader's origin trial has an end
  milestone on it.
- **Translator, Language Detector and Summarizer have been stable since 138** and
  are the boring, reliable end of this. They are also the ones Google said at
  I/O 2026 it intends to back with a smaller model. See section 2.
- **`SpeechRecognition` is not in this family at all.** It is Web Speech, it
  predates all of this, and it is governed by a different working group with
  different standards positions. Section 4.

### The Prompt API's actual shape

DOCUMENTED, from `developer.chrome.com/docs/ai/prompt-api`, stamped 2026-08-26:

```js
await LanguageModel.availability(options)   // 'unavailable' | 'downloadable' | 'downloading' | 'available'
const s = await LanguageModel.create({ signal, initialPrompts, expectedInputs, expectedOutputs, samplingMode, monitor })
await s.prompt(text, { responseConstraint })      // JSON Schema or a RegExp
s.promptStreaming(text)                            // a ReadableStream
s.contextUsage / s.contextWindow                   // how full the window is
```

Constraints that decide whether a page can use it at all:

| constraint | detail |
| --- | --- |
| user activation | `create()` wants a user gesture, and so does starting the download |
| workers | not available in a Web Worker, stated as a permissions-policy plumbing problem |
| iframes | Permissions-Policy `language-model`, default allowlist `self`, cross origin needs `allow="language-model"` |
| output | text only, in every mode |
| languages | `en`, `ja`, `es`, `de`, `fr`. "Support for additional languages is in development" |
| mobile | does not work on Chrome for Android or Chrome for iOS |

🔴 **THE LANGUAGE LIST IS FIVE AND ESTONIAN IS NOT ON IT.** This is the single
most load-bearing line in section 1 for this project, and it is DOCUMENTED on
Chrome's own page rather than inferred.

---

## 2. Which model, and where it lives

DOCUMENTED and MEASURED, mixed, so the marks are per line.

| fact | mark | detail |
| --- | --- | --- |
| model | DOCUMENTED | Gemini Nano, shipped as a Chrome component named "Optimization Guide On Device Model" |
| on disk | MEASURED, by third parties reporting in May 2026 | a folder `OptGuideOnDeviceModel` holding `weights.bin` |
| size, GPU build | MEASURED, adsm.dev 2026-05-05 | about **4 GB** |
| size, CPU build | MEASURED, adsm.dev 2026-05-05 | about **2.7 GB** |
| what triggers it | DOCUMENTED | first use of an AI API by a page, on a device that qualifies |
| what removes it | DOCUMENTED | free space on the profile volume falling below **10 GB** after download |
| where inference runs | DOCUMENTED | on the device. There is no cloud fallback in this API |

**There is no hybrid mode and no cloud fallback.** DOCUMENTED by absence and
confirmed by the shape of `availability()`: the four states are about whether the
local model is present, and `'unavailable'` means the page gets nothing. Chrome's
own guidance for that case is to fall back to "developer supplied models and
cloud-based services", which is to say: your problem. For `/wish/` that is a
feature rather than a hole, because the fallback already exists and is deployed.

### The download had a public row about it, and that row has consequences

MEASURED and reported widely in **May 2026**: Chrome was observed pulling roughly
4 GB onto machines without asking, between about 20 and 29 April 2026, and the
story broke on 2026-05-06. Google's statement, DOCUMENTED via Android Authority
2026-05-06, was that the model "powers important security capabilities like scam
detection" without sending data to the cloud, and that "in February, we began
rolling out the ability for users to easily turn off and remove the model
directly in Chrome settings".

Two things follow that are directly relevant to this desk.

🔴 **A MANAGED LAPTOP MAY HAVE IT SWITCHED OFF BY POLICY AND THE PAGE CANNOT TELL
WHY.** DOCUMENTED: the Chrome enterprise policy
`GenAILocalFoundationalModelSettings` takes `0` (download automatically) or `1`
(do not download, and delete any existing copy), it applies dynamically with no
browser restart, and it is exactly the kind of policy an endpoint management team
sets after a 4 GB surprise. `MEMORY.md` records this project's daily driver as a
ThreatLock and Defender managed laptop. **INFERRED: the probability that this
particular machine reports `'unavailable'` for reasons that have nothing to do
with its hardware is not small.** A page must treat `'unavailable'` as a normal
answer and not as a bug to debug.

⚠️ **AND `'unavailable'` IS UNDIAGNOSABLE FROM THE PAGE.** DOCUMENTED by absence:
the four availability states carry no reason. Too little disk, wrong GPU, metered
connection, enterprise policy and unsupported OS all produce the same string.
This is the same failure shape `CLAUDE.md` already has a rule about, where the
device ships correctly and the reader concludes the device never sent anything.

### Gemma 197M, announced and not yet pinned down

DOCUMENTED, from `developer.chrome.com/blog/chrome-at-io26`, published
**2026-05-19**: Gemma 197M is described as "an ultra-efficient expert model" that
can "transparently power task-specific APIs like summarizer, automatically
scaling your features to a broader spectrum of devices".

⚠️ **WHAT COULD NOT BE ESTABLISHED IS WHETHER IT HAS ACTUALLY ROLLED OUT.** No
Chrome document found today gives it a version number, a status, or a size. The
announcement is four months old. If it has shipped, the hardware floor in section
3 is wrong for the task APIs and right for the Prompt API, and the way to find
out is to read the Summarizer API page's requirements rather than the Prompt API
page's, which is one fetch somebody should do the day this matters.

---

## 3. The hardware and platform floor

DOCUMENTED verbatim from the Prompt API page, stamped 2026-08-26:

| requirement | value |
| --- | --- |
| operating system | "Windows 10 or 11; macOS 13+ (Ventura and onwards); Linux; or ChromeOS (from Platform 16389.0.0 and onwards) on Chromebook Plus devices" |
| storage | "At least 22 GB of free space on the volume that contains your Chrome profile" |
| GPU path | "Strictly more than 4 GB of VRAM" |
| CPU path | "16 GB of RAM or more and 4 CPU cores or more" |
| network | "Unlimited data or an unmetered connection" |
| audio input | "The Prompt API with audio input requires a GPU" |

Not supported: **Chrome for Android, Chrome for iOS, WebView, and non-Plus
Chromebooks.** DOCUMENTED on the same page and repeated in the Intent to Ship.

🔴 **SO EVERY PHONE IS OUT.** That is not a detail for this repository. A large
share of what gets built here is opened on a phone, `verify-native.mjs` exists
solely because the iPhone code path cannot be reached any other way, and device
logs from phones and headsets have their own worker. A capability that is desktop
only is a capability that half this project's audience does not have.

### What that means on Apple Silicon

MEASURED, by adsm.dev on 2026-05-05, reading Chromium's own gating code: "For
integrated GPUs (e.g. Apple Silicon), Chrome treats at least half of the system
RAM as available VRAM", and "The CPU backend is only available when there is at
least 15000 MiB of RAM, 4 CPU cores, and a 64-bit processor".

INFERRED from those two lines, and flagged as inference because Chrome's own
documentation does not say it:

| machine | half of RAM | clears "strictly more than 4 GB"? |
| --- | --- | --- |
| 8 GB M1 | 4 GB | **no**, 4 is not strictly more than 4 |
| 16 GB M1 | 8 GB | yes |
| 24 GB or more | 12 GB or more | yes |

⚠️ **THE 8 GB CASE SITS EXACTLY ON THE BOUNDARY AND THE BOUNDARY IS THE WORD
"STRICTLY".** That is too fine a reading to bet on from documentation. The M1 on
this desk either qualifies or does not depending on a number nobody has stated
here, and the check is one line in a console: `await LanguageModel.availability()`.

### Throughput, for scale

MEASURED by adsm.dev on their own machine, 2026-05-05, and therefore a number
about their hardware and not about this desk:

| backend | prefill | decode |
| --- | --- | --- |
| GPU, `FASTEST_INFERENCE` | 1668.4 tok/s | 48.0 tok/s |
| CPU | 183.4 tok/s | 15.4 tok/s |

INFERRED: a short `/wish/` style answer of 150 tokens is roughly 3 seconds on
that GPU and roughly 10 seconds on that CPU. The deployed Cloudflare path is
faster than both for an answer of that size, so **on-device is not a latency win
for the language model step.** It is a bill win and a privacy win only.

---

## 4. The speech question, which is the headline

### There IS an on-device speech path, and it is the SAME `SpeechRecognition`

DOCUMENTED, from MDN (`Using the Web Speech API`, last modified **2026-08-31**),
the WebAudio explainer, and the Chrome 139 blog post (**2025-08-05**). Three
members were added to the interface this project already knows:

```js
// static, and answers before anything opens
await SpeechRecognition.available({ langs: ['en-US'], processLocally: true })
// -> 'available' | 'downloadable' | 'downloading' | 'unavailable'

// static, downloads the language pack, wants a gesture
await SpeechRecognition.install({ langs: ['en-US'], processLocally: true })  // -> boolean

// instance, default false
recognition.processLocally = true
```

DOCUMENTED semantics that matter:

| behaviour | detail |
| --- | --- |
| default | `processLocally` is **`false`**. Unchanged. The old behaviour is still the behaviour |
| `true` with no pack | `start()` fails with **`language-not-supported`** |
| what `true` guarantees | recognition "must be done locally". Chrome's blog: "audio and transcribed speech are not sent to a third-party service" |
| `interimResults` | untouched by any of this. The live interim transcript shape is exactly as before |
| falling back | set `processLocally = false` and `start()` again, and you are back on the cloud service |

### Versions, from the compatibility data rather than from prose

DOCUMENTED, from MDN's browser-compat-data `api/SpeechRecognition.json`:

| member | Chrome | Chrome Android | Firefox | Safari |
| --- | --- | --- | --- | --- |
| `SpeechRecognition` | 139 | mirrors Chrome | 142, behind a pref | 14.1, `webkit` prefixed |
| `processLocally` | **139** | **not supported** | not supported | not supported |
| `available()` | **139** | **not supported** | not supported | not supported |
| `install()` | **139** | **not supported** | not supported | not supported |
| `phrases`, contextual biasing | 142 | not supported | not supported | not supported |
| `unspokenPunctuation` | 151 | mirrors Chrome | not supported | not supported |

Chrome stable is 153 today, so all five rows are live in stable, and the API is
still visibly under construction: `unspokenPunctuation` arrived two milestones
ago.

🔴 **AND `processLocally` IS DESKTOP CHROME ONLY.** Not Chrome for Android, which
is where `SpeechRecognition` is most used. INFERRED consequence: a phone visitor
gets the cloud path or nothing, and that is the same conclusion as section 3 by a
completely different road.

### The model is 60 MB, not 4 GB

DOCUMENTED, from the Intent to Ship on blink-dev: each language pack is
"**~60MB**" on Chrome for Windows, Mac and Linux, and the download handling is
implementation-defined rather than specified. It is the SODA component, visible
at `chrome://components` as "SODA (Speech On-Device API)".

⚠️ **THIS IS THE NUMBER THAT MAKES THE SPEECH PATH A DIFFERENT PROPOSITION FROM
THE PROMPT API.** 60 MB on a gesture is an ordinary web download. 4 GB unasked is
a news story. They are not the same kind of ask and should never be argued about
as if they were.

### The languages, and the thing this project actually needs

DOCUMENTED, from the WebAudio explainer: Chrome supports **17** languages for
on-device recognition, listed as German, English US, Spanish, French, Hindi,
Indonesian, Italian, Japanese, Korean, Polish, Portuguese Brazilian, Russian,
Thai, Turkish, Vietnamese, and two Chinese variants.

🔴 **ESTONIAN IS NOT IN THE 17, AND IT IS NOT IN THE PROMPT API'S 5 EITHER.** The
same absence, twice, from two independent Google language lists.

⚠️ **AND THAT IS A DOCUMENTED ABSENCE, NOT A MEASURED ONE.** The explainer itself
says the set is "user-agent dependent", and the authoritative check is reading
`chrome://components` on the machine in front of you. This is the distinction
`CLAUDE.md` keeps paying for: a list somebody wrote is not the contents of a
disk. The check costs one browser tab and no external server.

### Standards positions, which is where the two APIs stop resembling each other

DOCUMENTED, with dates:

| | on-device Web Speech | Prompt API |
| --- | --- | --- |
| Gecko / Mozilla | **positive**, TPAC 2024, Paul Adenot | **negative**, issue #1213, opened 2025-04-28, labelled "concerns: interoperability" |
| WebKit / Apple | **positive**, TPAC 2024, Eric Carlson | **no signal** |
| W3C TAG | closed **"satisfied with concerns"**, issue #1038, concern is fingerprinting | **"lack of consensus"**, issue #1093 |
| Chrome status stage | shipped desktop 139 | shipped web 148 |

Mozilla's stated reasoning on the Prompt API, DOCUMENTED via the issue and
reporting around it: prompts get tightly coupled to one vendor's model, Google's
prohibited-uses policy adds extra-legal restrictions on what a page may do, and a
model exposed to script is an LLM-shaped fingerprinting surface.

**So one of these two is a standards-track feature with three positive or neutral
signals, and the other is one vendor shipping over three objections.** For a
project deciding whether something is a demo or a dependency, that is the whole
answer and it points in opposite directions for the two APIs.

### 🔴 The caveat that could sink the speech path on this desk

Chromium issue **444393111**, titled `speechRecognition.available({
processLocally: true, langs: ['en-US'] }) broken in macOS`. Reported: it returned
`'available'` on Chrome 140.0.7339.82 and `'unavailable'` on 140.0.7339.133, and
the reporter found `OnDeviceWebSpeechNonCros` newly listed under
`disable-features` in the browser's own command line variations. Labelled
`Chromium-Regression` and `Needs-Bisect`.

⚠️ **THE CURRENT STATE OF THAT BUG COULD NOT BE READ.** `issues.chromium.org`
requires sign-in and returned a sign-in page rather than the issue. Everything
above is from the search index, which is a summary of the issue and not the
issue.

🔴 **BUT ONE THING IS SETTLED WHETHER OR NOT THE BUG IS FIXED, AND IT IS THE MORE
IMPORTANT ONE.** `OnDeviceWebSpeechNonCros` is a **Finch field trial name**. That
means **availability of on-device speech on macOS is a server-side switch Google
can move without shipping a Chrome release.** A version number does not tell you
whether this works. `available()` does, at the moment it is called, on that
machine. **Any code that treats "Chrome 139 or later" as the test is wrong, and
any sentence in this repository that says "Chrome supports this since 139" is
describing a default rather than a guarantee.**

### The sentence that replaces the standing note

The `BACKLOG.md` line reads:

> the browser's own `SpeechRecognition` gives interim text free, and in Chrome it
> sends audio to Google, which needs a decision rather than a guess

It should now read:

> the browser's own `SpeechRecognition` gives interim text free and still sends
> audio to Google by default. Since Chrome 139 a page can set
> `processLocally = true` and keep the audio on the device, after checking with
> `SpeechRecognition.available()` and installing a 60 MB pack on a gesture. It is
> desktop Chrome only, no other browser implements it, and Estonian is not one of
> the 17 languages.

---

## 5. What it costs to use, and what it costs not to use

### Detection is cheap, synchronous-ish, and happens before anything opens

This is the part that fits this repository's rules well. Both APIs answer
"can you do this" **before** any byte moves, which is precisely the shape
`CLAUDE.md` demands when it says a visit, a step and a scrub must open nothing.

```js
// the language model, three states plus absent
const hasLM = 'LanguageModel' in self
const lm = hasLM ? await LanguageModel.availability() : 'unavailable'

// the speech path, same four states, per language
const hasLocal = 'available' in SpeechRecognition
const sr = hasLocal
  ? await SpeechRecognition.available({ langs: ['en-US'], processLocally: true })
  : 'unavailable'
```

DOCUMENTED: `availability()` and `available()` both resolve without downloading
anything, and both are the documented way to decide. DOCUMENTED: the actual
download wants a user activation, so it cannot happen on page load by accident.

### The fallback has three arms, not two

INFERRED from the four states, and this is the design note worth keeping:

| state | what the page should do |
| --- | --- |
| `'available'` | use it. The pack or the model is already on disk and nothing downloads |
| `'downloadable'` | **offer** it on the press the visitor was going to make anyway. Never auto-install |
| `'downloading'` | show it, do not block on it, and use the existing path this time |
| `'unavailable'` | use the existing path, and say which path is being used |

⚠️ **THE TWO-STATE VERSION OF THIS IS A TRAP.** Treating `'downloadable'` as
"yes" starts a download the visitor did not ask for, which for the Prompt API is
4 GB. Treating it as "no" throws away the capability permanently for everybody
who has simply never used it yet. It is three arms.

⚠️ **AND THE PAGE MUST SAY WHICH ARM IT IS ON.** `CLAUDE.md`'s rule about
feedback gated on intent applies exactly: a live transcript that silently ships
audio to Google on one machine and keeps it local on another, with the same
button and the same glyph, is a page that lies about what it just did with
somebody's voice.

### What it costs not to use it

Unchanged, and read out of this repository today rather than remembered:

| fact | source in repo |
| --- | --- |
| one `/wish/` press | about **$0.00034** (`BACKLOG.md:122`, `HANDOFF.md:145`) |
| free allowance | roughly **320 presses a day** (same lines) |
| Whisper on Workers AI | batch, **961 ms for 3.68 s** of audio (`BACKLOG.md:250`) |
| Estonian | Whisper supports it. Both Chrome lists do not |

INFERRED, and it is the finding that decides the recommendation: **moving the
language model on-device saves $0.00034 a press and costs Estonian, every phone,
and a 4 GB download.** That is not a trade this project should take.

---

## 6. Other browsers

| browser | language model | on-device speech |
| --- | --- | --- |
| Chrome desktop | Gemini Nano, stable 148 | yes, 139, desktop only |
| Chrome Android / iOS | no | no |
| Edge | `LanguageModel` **with a different model**, developer preview behind a flag in Canary and Dev | inherits Chromium, not separately documented |
| Firefox | no. Position **negative** | no. Position **positive**, nothing shipped |
| Safari | no. **No signal** | no. Position **positive**, nothing shipped |

🔴 **EDGE IS THE INTEROP FINDING AND IT IS WORSE THAN "NOT SHIPPED YET".**
DOCUMENTED from `learn.microsoft.com/microsoft-edge/web-platform/prompt-api`,
page `updated_at` **2026-09-02**: Edge implements the same `LanguageModel`
interface, the same `availability()`, the same `promptStreaming()`, the same
`responseConstraint` JSON Schema, and backs it with **Phi-4-mini**, plus a
prerelease **Aion-1.0-Instruct** behind a second flag from Edge 150.0.4070. Its
hardware floor is different too: **5.5 GB of VRAM**, **20 GB** of storage, macOS
**13.3**, and a "device performance class" of High or better shown at
`edge://on-device-internals`.

**So the same three lines of JavaScript get a different model with different
output, different quality and a different hardware gate depending on which
Chromium the visitor has.** Mozilla's stated objection was that developers will
tune prompts to the one model they can test against. Edge's page is that
objection with a version number on it.

⚠️ **AND EDGE HAS NOT ENABLED IT BY DEFAULT.** It is a developer preview behind
`edge://flags` in Canary and Dev, and reporting around the Chrome 148 ship
records Edge arguing on blink-dev on 2026-05-01 that the API should go back to
origin trial. Treating "Chromium" as one target here is wrong.

The speech picture is the mirror image: **two other vendors have said they are
positive and neither has shipped a line of it.** A positive standards position
with no implementation is a promise, and this project has a file full of reasons
not to spend a promise as though it were a fact.

---

## 7. Recommendation

### Do not move `/wish/`'s language model on-device. Three reasons, any one sufficient

1. **Estonian is not supported.** `en`, `ja`, `es`, `de`, `fr`. That ends it for a
   project whose material is Estonian radio.
2. **No phone can run it.** Not Android, not iOS, not WebView. A capability
   restricted to desktop cannot be the mechanism, only an upgrade.
3. **The saving is $0.00034 a press against a 4 GB download on a stranger's
   disk.** The deployed path is also faster for a short answer, INFERRED from the
   throughput table in section 3.

⚠️ **AND THE INTEROP POSITION IS THE FOURTH REASON, WHICH IS ABOUT WHAT KIND OF
THING IT WOULD BE.** One implementer shipping over a negative from Mozilla, no
signal from Apple, a "lack of consensus" from the TAG, and a second Chromium
shipping a different model under the same name. Built on that, a page is a demo
of a Chrome feature. That is a legitimate thing for this repository to build. It
is not a thing to make `/wish/` depend on.

### Do add the on-device speech probe to the live transcript work, as an upgrade

The live transcript has been asked for three times and is still not built. The
reason recorded in `BACKLOG.md` is that the only browser route sends audio to
Google. **That reason is now conditional rather than absolute**, and the
condition is checkable from JavaScript before anything opens.

The shape:

| step | what happens |
| --- | --- |
| on load | nothing. No probe, no install, no session |
| on the hold-to-talk press | `SpeechRecognition.available({ langs: [lang], processLocally: true })` |
| `'available'` | `processLocally = true`, `interimResults = true`, the audio stays on the device |
| `'downloadable'` | do not install silently. Offer the 60 MB pack as a labelled choice |
| `'unavailable'` | **no interim transcript by default.** The cloud path is opt-in and labelled |
| always | the real transcription still goes to Whisper on Workers AI, unchanged |

🔴 **AND FOR ESTONIAN THE ANSWER WILL BE `'unavailable'`, WHICH IS THE CASE THE
UI HAS TO GET RIGHT.** The interesting outcome of this work is not the English
path working. It is that the page says, plainly, that live interim text for this
language means sending audio to Google, and lets a person decide. That is what
*"needs a decision rather than a guess"* was asking for, and the decision is now
one a visitor can make rather than one this repository makes on their behalf.

### The one measurement worth taking, and it costs nobody anything

**The Prompt API's audio input as a local transcription path.** DOCUMENTED: it
accepts `AudioBuffer`, `ArrayBuffer`, `ArrayBufferView` and `Blob` via
`expectedInputs: [{ type: 'audio' }]`, Chrome's own suggested use case is
"transcribe audio messages sent in a chat application", and it requires a GPU.

It is worth an hour because it is a **second opinion on Whisper with no bill and
no external server**, and this repository already has a standing interest in what
a model costs and what it gets wrong. It is **not** a candidate to replace
anything: it is batch rather than interim, its languages exclude Estonian, and it
needs the 4 GB model present.

⚠️ **NOTHING ABOUT ITS QUALITY OR ITS LATENCY IS KNOWN.** No number for
transcription accuracy, no number for time to first token on audio, and no stated
limit on audio duration or format appears anywhere in Chrome's documentation. All
three would have to be measured.

### And there is a demo in this, which is the honest way to hold a Chrome-only feature

A page that reports what the visitor's own browser actually has: `LanguageModel`
present or not, `availability()`, `SpeechRecognition.available()` for a handful of
languages including Estonian, and the resulting three-arm decision drawn out. It
opens nothing, it costs nobody a byte of somebody else's server, it degrades to a
row of honest "no"s on Safari and on every phone, and it turns a documented
capability into a measured one on whatever machine loads it. That is the
difference this document could not close for itself.

---

## 8. What this could NOT settle

🔴 **Everything in this section is a hole, and each line names what would close
it.**

| open question | why it is open | what closes it |
| --- | --- | --- |
| Does on-device speech work on macOS right now? | Chromium issue 444393111 reports a macOS regression via the `OnDeviceWebSpeechNonCros` Finch trial. The tracker needs sign-in and returned a sign-in page | `await SpeechRecognition.available({ langs: ['en-US'], processLocally: true })` in a console on this machine |
| Does anything here work on **this desk**? | Nothing was run. The brief forbade it and the reason was good | Two lines in a Chrome console on the M1 and on the managed laptop |
| Is Estonian really absent? | The 17 and the 5 are both published lists. The explainer says the set is user-agent dependent | `chrome://components`, and `available({ langs: ['et-EE'] })` |
| Does the M1 clear the VRAM bar? | The "half of system RAM" rule is a third party reading Chromium source, and 8 GB lands exactly on the word "strictly" | `await LanguageModel.availability()` on that machine |
| Is the managed laptop blocked by policy? | `GenAILocalFoundationalModelSettings` exists and this is a managed machine. The API cannot report a reason | `chrome://policy` on that laptop |
| Has Gemma 197M shipped? | Announced 2026-05-19 with no version, status or size published since | The Summarizer API page's own hardware requirements, one fetch |
| How good and how fast is on-device speech? | No accuracy or latency figure is published by anyone | Run it against a known clip and time it |
| How good is the Prompt API at audio transcription? | Chrome names the use case and publishes no number, no duration limit and no format limit | Feed it a clip this project already has and compare to Whisper |
| What is the built-in AI status page's real date? | Two fetches returned two different "last updated" lines, one of them 2024 | Read the page in a browser rather than through a summariser |
| Does `processLocally = true` really keep audio local? | Chrome's blog says so. This is a vendor claim about a vendor's own privacy behaviour | Nothing available here verifies it. It remains a claim, correctly attributed |

⚠️ **AND ONE STRUCTURAL WARNING ABOUT THIS WHOLE DOCUMENT.** Chrome went to a
**two-week** release cycle in September 2026, the on-device speech API gained a
new member as recently as Chrome 151, and at least one of its capabilities is
gated by a field trial that can move without a release. **Every version number
here has a shelf life measured in weeks, and the availability calls in section 5
are the only claims in this document that do not go stale**, because they ask the
browser in front of you instead of asking a page somebody wrote in August.

---

## Sources, with dates

| source | date | used for |
| --- | --- | --- |
| `developer.chrome.com/docs/ai/prompt-api` | stamped 2026-08-26 UTC | API shape, hardware floor, languages, audio input, permissions policy, mobile |
| `developer.chrome.com/docs/ai/built-in-apis` | date unreadable, see section 1 | the API status table |
| `developer.chrome.com/release-notes/148` | stable 2026-05-05 | Prompt API to stable on the web, text/image/audio inputs |
| `developer.chrome.com/blog/chrome-at-io26` | 2026-05-19 | Gemma 197M, WebMCP origin trial in 149, desktop voice input |
| `developer.chrome.com/blog/new-in-chrome-139` | 2025-08-05 | on-device speech recognition shipping, the "not sent to a third-party service" claim |
| blink-dev Intent to Ship, On-device Web Speech API | 2025-01-07 | ~60 MB per language pack, platform list, Gecko and WebKit positions |
| blink-dev Intent to Ship, Prompt API | milestone 148, OT 139 to 144 | what ships, Gecko negative, WebKit no signal |
| `chromestatus.com` feature 6090916291674112 | fetched 2026-09-22 | shipped desktop 139, Android and WebView not shipped |
| `github.com/WebAudio/web-speech-api` on-device explainer | undated in file | the IDL, the 17 languages, fingerprinting mitigations |
| MDN `Using the Web Speech API` | modified 2026-08-31 | the on-device section, `available()` and `install()` signatures, fallback |
| MDN `SpeechRecognition` | modified 2026-08-19 | full member list, `phrases`, `unspokenPunctuation`, "limited availability, not Baseline" |
| MDN browser-compat-data `api/SpeechRecognition.json` | fetched 2026-09-22 | the per-browser version table in section 4 |
| `mozilla/standards-positions` #1213 | opened 2025-04-28 | Prompt API, position negative, interoperability |
| `w3ctag/design-reviews` #1038 | opened 2025-01-09, closed | on-device speech, "satisfied with concerns", fingerprinting |
| `w3ctag/design-reviews` #1093 | 2026 | Prompt API, "lack of consensus" |
| `learn.microsoft.com/microsoft-edge/web-platform/prompt-api` | `updated_at` 2026-09-02 | Edge's Phi-4-mini and Aion-1.0-Instruct, its own hardware floor, flag-only status |
| Android Authority, `weights.bin` explained | 2026-05-06 | the 4 GB download, Google's statement, the flags |
| adsm.dev, "The Prompt API is now on by default in Chrome" | 2026-05-05 | half-of-RAM VRAM rule, CPU threshold, 4 GB and 2.7 GB builds, tok/s |
| Chromium issue 444393111 | reported against 140.0.7339.133 | the macOS regression and `OnDeviceWebSpeechNonCros`. **Read via search index, not the issue** |
| `chromiumdash.appspot.com` stable releases, Mac | fetched 2026-09-22 | Chrome 153 and 154, release dates |
| `BACKLOG.md`, `HANDOFF.md` | read 2026-09-22 | $0.00034, ~320 a day, 961 ms for 3.68 s |
