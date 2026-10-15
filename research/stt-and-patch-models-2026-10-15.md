# Speech and patch models for /connect/, measured 2026-10-15

Asked: *"ok but test performance. also vertify deepgram nova misbehaviour on cf. look for antr keys in ~/personal projects .env files"*.

Every claim carries a tag. **measured** means run today from this machine, **read** means taken from a page or file (named), **inferred** means a conclusion nobody ran.
Scratch scripts and raw results are in the session scratchpad and nowhere in the repository. Nothing was committed or deployed and no repository file changed apart from this one.

## Verdict in five lines

1. **No Anthropic key exists** in any `~/personal/*/.env*` file (measured). Claude could not be tested directly.
2. **The nova-3 report reproduces, with a narrower cause than reported.** `keyterm` works on `@cf/deepgram/nova-3` and changes the transcript. It fails with `8007 ... does not support keyterm prompting` only when the language is not English (`language: "multi"`, `"de"`, or `detect_language: true`) (measured).
3. **For speech, keep whisper-large-v3-turbo.** Nova-3 is about 5x faster (0.33 s against 1.5 to 1.8 s median) and 10x dearer per minute. It loses far more on accented English, and it returned three empty transcripts out of 24 (measured on synthetic speech, see the caveat).
4. **Most of the patch failures come from the page's port list, not the model.** For "drum machine" and "granulate" sentences the page never sends `web:sequencer` or `web:grains`, so no model can answer them. When the missing ports and an `also` alias are added, the best models go from about 32% to 71 to 76% right (measured).
5. **For a demo, use `@cf/moonshotai/kimi-k2.6` with thinking off and the alias fix.** It was right on 71% of tries at 2.4 s median and about $1 per 1000 asks. `glm-5.3-flash` was the most accurate (76%) but too slow for a live demo (11.8 s median, p90 31 s). Both are outside the worker's `PATCH` list today (measured, recommendation inferred).

## 1. Anthropic keys

**measured.** I searched every `.env*` file under `~/personal` to depth 4, outside `node_modules` (28 files), for `ANTHROPIC_API_KEY`, `sk-ant-`, `anthropic` and `claude`. No value was printed.

- **No `ANTHROPIC_API_KEY` and no `sk-ant-` value in any file.** The shell environment has none either.

So the planned Claude runs (`claude-sonnet-5`, `claude-haiku-4-5-20251001`) were **not made**. See section 3.4 for what Cloudflare's own route would need.

## 2. Deepgram nova-3 on Workers AI

### 2.1 How it was called

- **Credential (measured).** The `CF_API_TOKEN` in `positron/.env` is valid ("active") but cannot use Workers AI. `/ai/run` and `/ai/models/schema` both answer `{"code":10000,"message":"Authentication error"}`. Every call below used wrangler's machine OAuth token (scope `ai:write`), read at run time and never printed.
- **REST (measured).** The REST API takes the raw audio as the body (`content-type: audio/wav`) and options as query parameters. A JSON body with `audio: {body: <base64>, contentType}` is refused: `AiError: Bad input: Error: required properties at '/audio' are 'body,contentType'` (5006).
- **Binding (measured).** I ran a scratch Worker locally under `wrangler dev`, where the AI binding is remote. It passes `audio: {body: ReadableStream, contentType: 'audio/wav'}` to `env.AI.run`. This is the shape a production Worker would use. It was not deployed.
- **Test audio (measured).** I made eight sentences with macOS `say` in three voices: `Eddy (English (US))`, `Daniel` (en_GB), and `Eddy (Finnish (Finland))` reading English as a stand-in for an accented speaker. `afconvert` turned each into 16 kHz mono LEI16 WAV, 2 to 4 s long.

### 2.2 Verbatim responses for each keyterm form

Audio: `s2-fi.wav` ("bass synth with a sawtooth wave", Finnish voice). This file was chosen because the plain transcript misses the word. **measured.**

| call | result |
| --- | --- |
| binding, no keyterm | OK 298 ms: `"bus street rita sautotwelve"` |
| binding, `keyterm: "sawtooth"` | OK 282 ms: `"bus street with a sawtoothwy"` |
| binding, `keyterm: "Rhodes sawtooth Plaits granulate"` (one string) | OK 339 ms: `"bus street rita south of twelve"` (no effect: the string is one phrase) |
| binding, `keyterm: ["Rhodes", "sawtooth"]` (array, which the schema does not list) | OK 261 ms: `"bus street with a sawtoothwy"` |
| binding, `keywords: "sawtooth:2"` | `AiError: 8007: Keywords are not supported for Nova-3. Please use \`keyterm\` instead.` |
| binding, `language: "en"`, `keyterm: "sawtooth"` | OK 273 ms: `"bus street with a sawtoothwy"` |
| binding, `not_a_param: "x"` | OK 255 ms: `"bus street rita sautotwelve"` (unknown fields are ignored silently) |
| binding, `language: "multi"`, `keyterm: ["sawtooth"]` | `AiError: 8007: Bad Request: The selected Nova-3 model does not support keyterm prompting. Model UUID: e8345677-a780-424f-bc88-44eda363a0ab` |
| binding, `language: "de"`, `keyterm: ["sawtooth"]` | same 8007 `does not support keyterm prompting`, same UUID |
| binding, `detect_language: true`, `keyterm: ["sawtooth"]` | same 8007 `does not support keyterm prompting`, same UUID |
| binding, `language: "et"` (with or without keyterm) | `AiError: 8007: Bad Request: No such model/language/tier combination found.` |
| binding, `language: "fi"`, keyterm | same `No such model/language/tier combination found.` |
| binding, `keyterm: ""` | OK, same as no keyterm |
| REST, no params | HTTP 200 387 ms `"bus street rita sautotwelve"` |
| REST, `?keyterm=sawtooth` | HTTP 200 343 ms `"bus street with a sawtoothwy"` |
| REST, `?keyterm=Rhodes&keyterm=sawtooth` | HTTP 200 320 ms `"bus street with a sawtoothwy"` |
| REST, `?keywords=sawtooth:2` | HTTP 400 `{"errors":[{"message":"AiError: AiError: Keywords are not supported for Nova-3. Please use \`keyterm\` instead. (6faa409a-...)","code":8007}]}` |
| REST, `?bogus=1` | HTTP 200, same as no params |

There is one more effect on a clean file. With `?keyterm=Rhodes`, `s1-us.wav` gives the same transcript, but the word confidence for "rhodes" rises from 0.764 to 0.993 (measured).

**Verdict (measured):**

- `keyterm` is accepted and changes the transcript, in English only.
- The error in the community report is real. It comes from the language, not from `keyterm`: any non-English `language`, `multi`, or `detect_language: true`, together with a keyterm.
- Estonian and Finnish are not available at all ("No such model/language/tier combination").
- Several terms must be an **array** (binding) or **repeated query parameters** (REST). A space-joined string is one key phrase and does nothing here.
- A separate 8007 fires for `keywords`, which is easy to mistake for the same bug.

**Inferred:** The schema lists `keyterm` as a plain `string` and says nothing about the English-only limit. That gap is the probable source of the report.

### 2.3 What Cloudflare's page claims (read)

From https://developers.cloudflare.com/workers-ai/models/nova-3/ (read today) and the live schema at `GET /ai/models/schema?model=@cf/deepgram/nova-3` (measured):

- Description: "Transcribe audio using Deepgram's speech-to-text model". Badges: Partner, Cloudflare-hosted, Batch, Real-time.
- Price: $0.0052 per audio minute over HTTP, $0.0092 over WebSocket. The catalogue API returns the same numbers (measured).
- `keyterm`: type `string`, "Key term prompting can boost or suppress specialized terminology and brands."
- `keywords`: type `string`, "Keywords can boost or suppress specialized terminology and brands." The model refuses it with 8007 (measured), but the page still lists it.
- `audio`: object with `body` (object) and `contentType` (string), both required. The page has no code sample showing the shape.
- Nothing on the page says keyterm is English only.

### 2.4 Speech comparison: nova-3 against whisper-large-v3-turbo

Setup (measured):

- 24 files: 8 sentences in 3 voices. Each file was run four ways, all through the local Worker's binding:
  - nova-3 (`smart_format: true`)
  - nova-3 with keyterm array `[Rhodes, sawtooth, Plaits, granulate, synth, drum machine, Circuit, SuperCollider]`
  - turbo exactly as `/hear` sends it (`hearPayload` imported from `workers/wish/src/wish.mjs`: `task: transcribe`, `language: en`, `vad_filter: true`)
  - turbo plus the page's real `initial_prompt`
- The page's prompt is `vocabulary()` from `/connect/`, captured from the running page: 90 names, cut by `PROMPT_MAX` to 394 characters. It starts "Plaits, Circuit, Rhodes, SuperCollider, Piano, Wavetable drift, ...".
- **Key words** means the words a patch depends on, for example rhodes, piano, left, right.

| config | key words right, all voices | US | GB | Finnish-accented | files with every key word | empty transcripts | median ms | max ms | mean WER |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| nova-3 | 57/90 | 27/30 | 27/30 | **3/30** | 11/24 | **3** | **329** | 553 | 0.35 |
| nova-3 + keyterm | 59/90 | 27/30 | 27/30 | 5/30 | 11/24 | 2 | **315** | 416 | 0.33 |
| turbo | 68/90 | 27/30 | 29/30 | 12/30 | 13/24 | 0 | 1844 | 5716 | 0.24 |
| turbo + page prompt (what /hear does today) | **69/90** | 26/30 | 29/30 | **14/30** | **14/24** | 0 | 1471 | 4291 | 0.24 |

Per-file transcripts, all measured. Each cell is key words right, then the transcript.

| sentence (voice) | nova-3 | nova-3 + keyterm | turbo | turbo + page prompt |
| --- | --- | --- | --- | --- |
| s1 us | 4/4 "Play Rhodes on the left hand and piano on the right." | 4/4 "Pla Rhodes on the left hand and piano on the right." | 4/4 "play rhodes on the left hand and piano on the right." | 4/4 "Play Rhodes on the left hand and Piano on the right." |
| s1 gb | 4/4 "Play Rhodes on the left hand and piano on the right." | 4/4 "Plaith Rhodes on the left hand and piano on the right." | 4/4 "Play Rhodes on the left hand and piano on the right." | 4/4 same |
| s1 fi | 0/4 "" | 0/4 "Plaurel is on tail lift on on." | 2/4 "Power rodes on the left hand and piano on the wrist." | 4/4 "Plauer Rhodes on the left hand and piano on the right." |
| s2 us | 2/3 "Base synth with a sawtooth wave." | 2/3 same | 3/3 "Bass synth with a sawtooth wave." | 3/3 same |
| s2 gb | 1/3 "Basinth with a sawtooth wave." | 1/3 same | 3/3 "Bass synth with a sawtooth wave." | 3/3 same |
| s2 fi | 0/3 "Bus Street Rita Sautotwelve." | 1/3 "Bus street with a sawtooth." | 1/3 "BASS 1-3-A-SAUTO-3-B" | 1/3 "Bass Street 3-A-Sauto 3-B" |
| s3 us | 3/3 "Granulate the drum machine." | 3/3 same | 3/3 "granulate the drum machine" | 2/3 "Gradulate the drum machine." |
| s3 gb | 3/3 "Granulate the drum machine." | 3/3 same | 3/3 same | 2/3 "Granulate the drone machine" |
| s3 fi | 0/3 "" | 0/3 "" | 2/3 "Graduate the drum machine." | 0/3 "GRADUATETED RUM MAKINE" |
| s4 us | 5/5 "Split the keyboard, the lower part an octave down." | 5/5 same | 5/5 same | 5/5 same |
| s4 gb | 5/5 same | 5/5 same | 5/5 same | 5/5 same |
| s4 fi | 2/5 "Split the keyboard." | 2/5 same | 3/5 "Split the keyboard, the lower part and octavedone." | 3/5 same |
| s5 us | 3/4 "The drum machine plays plates." | 3/4 same | 3/4 same | 3/4 same |
| s5 gb | 4/4 "The drum machine plays plaits." | 4/4 "... plays Plaits." | 4/4 "... plays plaits." | 4/4 same |
| s5 fi | 0/4 "Room lock in a plug slice." | 0/4 same | 0/4 "Cedrum Makine Playa Splites" | 0/4 "Cedrum Makin'a Playa Splites." |
| s6 us | 5/5 "Keyboard plays Rhodes on the bottom and piano on top." | 5/5 same | 5/5 same | 5/5 same |
| s6 gb | 5/5 same | 5/5 same | 5/5 same | 5/5 same |
| s6 fi | 0/5 "" | 0/5 "" | 4/5 "Keyboard plus Rodes on the bottom and piano on top." | 5/5 "keyboard, plus Rhodes on the bottom and piano on top." |
| s7 us | 3/3 "Play the synth with a sawtooth on the keyboard." | 3/3 same | 3/3 same | 3/3 same |
| s7 gb | 3/3 same | 3/3 same | 3/3 same | 3/3 same |
| s7 fi | 1/3 "Play test with with a Sao Tote on the keyboard." | 2/3 "Plaits with with a sawtooth on the keyboard." | 0/3 "play it with a sound or don't take a board." | 1/3 "Plaitess it with a SoundTot on the keyboard." |
| s8 us | 2/3 "Granulate plates as I play." | 2/3 same | 1/3 "Gratulate place as I play." | 1/3 "Gradulate plates as I play" |
| s8 gb | 2/3 "Granulate plants as I play." | 2/3 same | 2/3 "Granulate plaids as I play." | 3/3 "Granulate Plaits as I play" |
| s8 fi | 0/3 "Ground was deployed as the cloud." | 0/3 "Gran Grun was deployed as the cloud." | 0/3 "Grand water plates as a plug." | 0/3 "Gradwater plates as e-plug." |

What the tables show (measured unless marked):

- **Nova-3 is fast and brittle.** It is the fastest by 5x. On clean US and GB speech it is as good as turbo. On accented speech it fails hard: three empty transcripts and invented sentences such as "Room lock in a plug slice."
- **Keyterm on nova-3 helps rarely and can hurt.** It turned `sautotwelve` into `sawtooth` and `plaits` into `Plaits`. It also over-boosted the keyterm `Plaits` onto the word "Play", giving "Pla Rhodes" and "Plaith Rhodes" on two clean files that were right without it.
- **The page's `initial_prompt` is a small net gain** (68 to 69 of 90; 12 to 14 of 30 on the accented voice). It fixed Rhodes twice. It also introduced "Gradulate" and "drone machine". Inferred cause: the prompt lists `machine`, `drone` (via "Growl drone") and many unrelated labels, while `granulate`, `drum machine` and `bass` are missing.
- **Two side tests of turbo on the accented voice** (measured):
  - `vad_filter: false` changed nothing useful and once looped: "Bass, Street, R3, S8, S8, S8, ...".
  - A short task-specific word list (Rhodes, piano, Plaits, sawtooth, synth, keyboard, granulate, drum machine, grains, bass synth, octave, split) fixed "drum machine" and "an octave down". It also made Whisper copy the comma style of the prompt: "bass synth, whita, sawtooth, wave."
  - A sentence-shaped prompt ("The keyboard plays the Rhodes and the piano on the sampler, Plaits, or the bass synth with a sawtooth wave. Granulate the drum machine. ...") got 25/30 key words on the accented voice. ⚠️ This prompt contains s2, s3 and s4 almost verbatim, so those three prove nothing. On the five sentences it does not contain, it scored 14/20 against 10/20 for the page's prompt and 6/20 for no prompt.
- **"Plaits" sounds like "plates"** (inferred). That is the instrument's own pronunciation, so a correct-sounding speaker is heard as "plates" by every model. The page could map "plates" to Plaits in an `also` alias rather than hoping the recogniser spells it.

⚠️ **Caveat on all of 2.4 (inferred).** This is synthetic speech from macOS voices, which is cleaner and more regular than a person at a laptop microphone. The Finnish voice is a stand-in for the owner's accent, not a measurement of it.

In today's device log, 4 of the voice tries came back as `heard ""`. One was 2.2 KB and 206 ms, a press released too early. One was 39.9 KB and 2.6 s with something in it, which `vad_filter` may have dropped. I did not reproduce that one, because no real recording of it exists.

Cost per minute (read from the catalogue API): nova-3 $0.0052, turbo $0.000513. That is 10x.

## 3. Patch models on the real task

### 3.1 Method

**The port list (measured).** I loaded `/connect/` from the local server (`:8890`) in headless Chrome and patched the page's HTML in flight through CDP `Fetch`, so the repository copy was untouched. The patch exposed the page's own `portsForModel`, `FACTS` and `vocabulary`. For each sentence I captured exactly what the page sends. It is 11 to 25 ports, with labels such as `SuperCollider sampler midi-in (patches: Piano, Rhodes)`. The FACTS string is 875 characters.

**The 19 sentences.** Nine come from today's device log, cleaned of typos where the meaning was clear ("keuboard", "onsccreen", "drum machine plays piano", "drums play plaits and drums in same time"). Ten are the kinds the owner will say: piano and Rhodes splits, sawtooth, "drum machine plays X", "granulate Y", "an octave up", and the Circuit.

**Three port sets:**

- **page:** exactly what `/connect/` sends today.
- **fixed:** page plus the ports a right answer needs and the page leaves out. These are `web:sequencer:midi-out` for drum-machine sentences and `web:grains:audio-in/out` for granulate sentences.
- **aliases:** fixed, plus the basic instruments (synth, sampler and Plaits, midi-in and audio-out), plus `also` names, which the worker already supports:
  - sequencer: "drum machine, drums"
  - grains: "granulator, granulate"
  - synth: "synth, synthesizer"

  The synth's label on the page is `sine`. The word "synth" is only in its id.

**How each model was called:**

- **Models in the worker's `PATCH` list, page set:** through the **deployed** `https://wish.positron.studio/wish` with `Origin: https://positron.studio`, paced under its 30 per minute limit.
- **Everything else:** through `handle('/wish', ...)` imported from `workers/wish/src/wish.mjs`. That is the worker's own prompt (`systemFor`), schema (`schemaFor`) and `relabel`, with `run()` pointed at the Workers AI REST API.
- **Models outside `PATCH`:** the model id was swapped inside `run()`, and their payloads needed extra fields, recorded per row:
  - gpt-oss-120b and gpt-oss-20b: `max_tokens: 2000`, `reasoning: {effort: "low"}`
  - qwen3-30b-a3b-fp8 and glm-5.3-flash: `max_tokens: 2000`, `chat_template_kwargs: {enable_thinking: false}`
  - kimi-k2.6: `max_tokens: 2000`, `chat_template_kwargs: {thinking: false}`
  - gemma-4-26b-a4b-it: `max_tokens: 2000`
- **Why those extras (measured).** At the worker's `max_tokens: 400`, every reasoning model returned **zero links**: gpt-oss, qwen3, glm, kimi and gemma all spent the 400 tokens thinking (`completion_tokens: 400`).

**Automatic score**, one check per column:

- **links valid:** every from and to is in the list sent, out to in, same medium.
- **speaker:** every played instrument's audio reaches `web:speaker:audio-in`, through grains if needed.
- **no audio into midi.**
- **split:** the two ranges start at 0, end at 127 and meet with no overlap. Only applies to split sentences.
- **intent:** the right source, instrument and patch for the sentence. Examples: Rhodes low and Piano high on two sampler instances; `patch sawtooth` on the synth; the sequencer drives the sampler; Plaits feeds grains and grains feeds the speaker; Plaits transposed +12.
- **ALL (model alone)** needs every check.
- **ALL (after the page adds speakers)** drops the speaker check. The page's own `withSpeakers()` adds a speaker link for every dangling audio out (read: `demo/connect/index.html` around line 475), so the visitor gets that part for free.

### 3.2 Results

Measured, 646 calls. "page" and "fixed" are 19 asks each, "aliases" is 38 (19 asks twice). The ms column is time inside the worker or `handle()`, not including the network to the page. Cost comes from the `neurons` each response reports, times $0.011 per 1000 neurons (inferred from Cloudflare's published rate, not re-read today).

| model | ports | links valid | speaker | no audio into midi | split ok | right instrument and patch | ALL, model alone | ALL, after page adds speakers | empty answers | median ms | p90 ms | tokens in/out (median) | $ per 1000 asks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| llama-3.3-70b-fp8-fast (worker default) | page (deployed) | 74% | 26% | 84% | 5/5 | 32% | 16% | **32%** | 1 | 2574 | 7766 | 1185/71 | 0.58 |
| llama-3.3-70b-fp8-fast | fixed | 68% | 26% | 74% | 5/5 | 47% | 26% | 47% | 0 | 3054 | 8757 | 1191/89 | 0.58 |
| llama-3.3-70b-fp8-fast | aliases | 79% | 18% | 89% | 8/10 | 50% | 13% | **50%** | 0 | 2504 | 5266 | 1356/60 | 0.58 |
| llama-3.1-8b-fp8-fast | page (deployed) | 53% | 11% | 89% | 1/5 | 11% | 0% | 11% | 3 | 706 | 2562 | 1185/94 | 0.11 |
| llama-3.1-8b-fp8-fast | fixed | 47% | 37% | 74% | 1/5 | 21% | 11% | 21% | 2 | 893 | 2476 | 1191/113 | 0.12 |
| llama-3.2-3b | page (deployed) | 32% | 5% | 74% | 1/5 | 11% | 5% | 11% | 7 | 596 | 1674 | 1185/105 | 0.11 |
| llama-3.2-3b | fixed | 21% | 16% | 68% | 0/5 | 11% | 5% | 5% | 5 | 698 | 1628 | 1191/87 | 0.10 |
| mistral-small-3.1-24b | page (deployed) | 63% | 63% | 95% | 0/5 | 5% | 5% | 5% | 4 | 2071 | 6707 | 1190/97 | 0.50 |
| mistral-small-3.1-24b | fixed | 79% | 58% | 95% | 0/5 | 11% | 11% | 11% | 1 | 2947 | 3825 | 1195/97 | 0.49 |
| llama-4-scout-17b | page (deployed) | 47% | 32% | 89% | 0/5 | 5% | 0% | 5% | 3 | 2949 | 11133 | 1179/122 | 0.46 |
| llama-4-scout-17b | fixed | 63% | 32% | 89% | 0/5 | 16% | 11% | 16% | 2 | 4022 | 10897 | 1179/93 | 0.43 |
| gpt-oss-120b | page | 58% | 26% | 100% | 4/5 | 32% | 16% | 32% | 8 | 12856 | 38123 | 1220/578 | 1.11 |
| gpt-oss-120b | fixed | 63% | 47% | 100% | 4/5 | 47% | 32% | 42% | 6 | 10180 | 22199 | 1224/535 | 0.99 |
| gpt-oss-120b | aliases | 76% | 45% | 100% | 7/10 | 50% | 34% | 50% | 9 | 12055 | 27292 | 1393/640 | 1.17 |
| gpt-oss-20b | page | 58% | 26% | 100% | 5/5 | 47% | 21% | 42% | 7 | 7240 | 10887 | 1226/710 | 0.47 |
| gpt-oss-20b | fixed | 79% | 37% | 100% | 5/5 | 58% | 32% | 53% | 3 | 4795 | 13861 | 1230/626 | 0.46 |
| gpt-oss-20b | aliases | 89% | 45% | 100% | 9/10 | 68% | 32% | **63%** | 2 | 5508 | 10615 | 1399/644 | 0.48 |
| qwen3-30b-a3b-fp8 | page | 63% | 11% | 89% | 5/5 | 32% | 0% | 32% | 1 | 694 | 1449 | 1179/47 | 0.08 |
| qwen3-30b-a3b-fp8 | fixed | 58% | 5% | 84% | 5/5 | 32% | 0% | 32% | 0 | 842 | 1279 | 1185/47 | 0.08 |
| qwen3-30b-a3b-fp8 | aliases | 63% | 5% | 84% | 8/10 | 45% | 0% | 42% | 0 | 754 | 1331 | 1350/47 | 0.09 |
| glm-5.3-flash | page | 58% | 47% | 100% | 4/5 | 42% | 32% | 37% | 7 | 19276 | 38723 | 1163/736 | 0.66 |
| glm-5.3-flash | fixed | 79% | 63% | 100% | 4/5 | 63% | 53% | 63% | 4 | 18890 | 41988 | 1169/525 | 0.62 |
| glm-5.3-flash | aliases | 89% | 74% | 97% | 9/10 | 79% | **63%** | **76%** | 2 | 11782 | 31230 | 1334/491 | 0.54 |
| gemma-4-26b-a4b-it | page | 11% | 11% | 100% | 1/5 | 11% | 11% | 11% | 17 | 30671 | 35212 | 1253/2000 | 0.70 |
| gemma-4-26b-a4b-it | fixed | 32% | 26% | 100% | 1/5 | 21% | 21% | 21% | 13 | 30484 | 45755 | 1265/2000 | 0.63 |
| kimi-k2.6 | page | 68% | 32% | 95% | 4/5 | 37% | 16% | 32% | 2 | 2441 | 5070 | 1167/59 | 1.25 |
| kimi-k2.6 | fixed | 84% | 47% | 95% | 4/5 | 53% | 37% | 47% | 1 | 2566 | 4954 | 1170/62 | 0.79 |
| kimi-k2.6 | aliases | 92% | 47% | 95% | 10/10 | 74% | 34% | **71%** | 0 | 2432 | 4721 | 1341/74 | 1.06 |

Per sentence with the alias port set, right after the page adds speakers, two tries each (measured):

| sentence | llama-3.3-70b | gpt-oss-120b | gpt-oss-20b | qwen3-30b | glm-5.3-flash | kimi-k2.6 |
| --- | --- | --- | --- | --- | --- | --- |
| play Rhodes on the left hand and piano on the right | 2/2 | 0/2 | 2/2 | 0/2 | 2/2 | 2/2 |
| keyboard plays rhodes on bottom and piano on top | 2/2 | 0/2 | 1/2 | 2/2 | 2/2 | 2/2 |
| split onscreen keyboard to play rhodes on top and synth bass on bottom | 0/2 | 2/2 | 2/2 | 0/2 | 2/2 | 2/2 |
| split the keyboard into two parts, piano on the upper part and the synth on the lower part | 0/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 |
| split the keyboard, the lower part an octave down | 2/2 | 2/2 | 0/2 | 0/2 | 0/2 | 1/2 |
| bass synth with a sawtooth wave on the keyboard | 1/2 | 2/2 | 1/2 | 0/2 | 1/2 | 0/2 |
| play the synth with a sawtooth | 2/2 | 2/2 | 2/2 | 0/2 | 2/2 | 2/2 |
| play Rhodes with the keyboard | 1/2 | 1/2 | 2/2 | 2/2 | 2/2 | 2/2 |
| play piano with keyboard | 2/2 | 1/2 | 2/2 | 2/2 | 2/2 | 2/2 |
| play synth with keyboard | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 |
| drum machine plays piano | 2/2 | 1/2 | 2/2 | 2/2 | 2/2 | 2/2 |
| drum machine plays rhodes | 1/2 | 1/2 | 2/2 | 2/2 | 2/2 | 2/2 |
| the drum machine plays plaits | 2/2 | 1/2 | 2/2 | 2/2 | 2/2 | 2/2 |
| granulate the drum machine | 0/2 | 0/2 | 0/2 | 0/2 | 0/2 | 0/2 |
| granulate plaits as i play | 0/2 | 0/2 | 0/2 | 0/2 | 2/2 | 2/2 |
| granulate the piano as i play it | 0/2 | 1/2 | 0/2 | 0/2 | 2/2 | 1/2 |
| plaits doubles the synth an octave up | 0/2 | 1/2 | 0/2 | 0/2 | 0/2 | 0/2 |
| drums play plaits and drums in same time | 0/2 | 0/2 | 1/2 | 0/2 | 2/2 | 1/2 |
| play the circuit in the studio | 0/2 | 0/2 | 1/2 | 0/2 | 0/2 | 0/2 |

### 3.3 What the failures are

All measured unless marked.

- **The page does not send the ports the sentence needs.** `portsForModel` keeps a part only when a word of the sentence is in its id, label or patch names.
  - "drum machine" matches `web:pick` (label "machine"), `web:machines` and `web:drum` (label "drum voice"), never `web:sequencer` (label "sequencer").
  - "granulate" matches nothing, because the grains node is labelled "grain ring".
  - With the page's list, **0 of 11 models got any drum-machine or granulate sentence right** (7 sentences times 11 models).
  - Adding the ports alone ("fixed") was not enough for drum-machine sentences: the models still did not know that "drum machine" means the sequencer. Adding `also: ["drum machine"]` made "drum machine plays piano / rhodes / plaits" right for 5 of 6 models.
- **"synth" is labelled `sine`.** "bass synth" and "synth bass" went to `web:bass` (label "bass"), which has no patches. One model wrote `{"op":"patch","name":2}` on it, which the worker's relabel had turned from `"to": 2`.
- **Duplicate links.** For "play Rhodes on the left hand and piano on the right", the 70B through the deployed worker answered with the right two MIDI links and then `web:sampler:audio-out -> web:speaker:audio-in` six times. That took 7.6 s and 283 output tokens. Duplicates appeared in 22 of the 228 answers from the five `PATCH` models, up to 8 copies of one link.
- **Empty answers have two causes.**
  1. The answer is cut at the worker's `max_tokens: 400`. The JSON does not parse, and `links` becomes `[]`. This happened 20 times in the 228 `PATCH`-model answers; llama-4-scout reached it on "rhodes split" at 11 to 22 s. Inferred: this is the device log's *"nothing proposed in 11168 ms"* for the same Rhodes and piano sentence.
  2. The model answers `{"links": []}` in 6 or 7 tokens. This is the "If the instruction names nothing on this desk" escape, taken on "granulate the drum machine" and "the circuit" when the right ports were not offered.
- **Audio into MIDI.** The 70B with the page list wrote `web:synth:audio-out -> web:plaits:midi-in` for "plaits doubles the synth", and `web:drum:audio-out -> web:sampler:midi-in` for "drum machine plays piano". Both happen when the source the sentence means is not in the list, and the model wires the nearest thing it has.
- **Speaker links.** Only 5 to 74% of answers carry every speaker link the sound needs. The page's `withSpeakers()` repairs this, which is why the "after page adds speakers" column is the realistic one.
- **Strict expectations (inferred).** Two sentences fail for nearly everyone, and part of that is my scoring:
  - "granulate the drum machine": models link `web:drum -> web:grains -> web:speaker` but not the sequencer into `web:drum`, so nothing would play.
  - "play the circuit in the studio": every model answered `pi-1:circuit:audio-out -> web:speaker:audio-in` (listen), not keys into the Circuit (play).
  - "split the keyboard, the lower part an octave down" names no instrument. In the page's list, the only MIDI ins were the keyboard's own value ins, so models wired `web:keys:midi-out -> web:keys:value-in` (invalid).

### 3.4 Claude through Cloudflare (measured and read)

- **Workers AI catalogue (measured).** `GET /ai/models/search` (325 models) has no Anthropic model. A search for "anthropic" returns nothing, and a search for "claude" returns only `@cf/zai-org/glm-5.3-flash`.
- **Unified Billing (read).** Per https://developers.cloudflare.com/ai-gateway/features/unified-billing/, Unified Billing lets you "call Workers AI and connect to various AI providers (such as OpenAI, Anthropic, and Google AI Studio) and receive a single Cloudflare bill". It needs credits bought in the dashboard, plus "A 5% fee ... applied to all credits purchased".
- **Model ids (read).** Per https://developers.cloudflare.com/ai-gateway/usage/providers/anthropic/, the OpenAI-compatible endpoint `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1/chat/completions` takes `"anthropic/{model}"`.
- **Probe with no credits bought (measured).** Each call was `POST /ai/v1/chat/completions`, `max_tokens: 5`:
  - `anthropic/claude-sonnet-5.5`, `anthropic/claude-sonnet-5`, `anthropic/claude-haiku-4.5`, `anthropic/claude-haiku-5.5`, `anthropic/claude-sonnet-4.5`, `anthropic/claude-opus-5` and `anthropic/claude-opus-5.5` all answered **HTTP 403** `{"message":"Gateway authentication is required to use unified billing. Enable authentication on your gateway or provide your own API key (BYOK).","code":2049}`. **These ids are recognised.**
  - `anthropic/claude-haiku-4-5`, `anthropic/claude-haiku-4-5-20251001`, `anthropic/claude-sonnet-4-5`, `anthropic/claude-haiku-5` and a made-up `anthropic/claude-nonexistent-9` answered **HTTP 404** `Model not found` (7003). The dashed Anthropic API ids are **not** recognised.
  - So the plan's `anthropic/claude-sonnet-5.5` is a real id on this route. It is the dotted form.
- **What it would take (inferred):**
  1. Turn on authentication for an AI Gateway on this account. The `ai-gateway/gateways` listing refused the OAuth token, so I could not check for an existing one.
  2. Buy Unified Billing credits, or store an Anthropic key on the gateway (BYOK).
  3. Call through `env.AI.run('anthropic/claude-...', ..., { gateway: { id } })` or the REST route above.
- **Not done:** No credits were bought and no Claude answer was measured.

## 4. Spend

All figures are from usage reports, measured. Neuron price inferred as above.

- **Patch models:** 646 calls, 33,078 neurons, about **$0.36**.
- **Speech:** about 3.5 audio minutes on nova-3 (about $0.02) and about 4 minutes on turbo (under $0.01).
- **Probes:** a few cents at most.
- **Total: under $0.40**, against a $2 budget.

## 5. Recommendation for a demo setup

Each step is inferred from the measurements above. None of it is built.

1. **Fix the port list before changing the model.** It is the larger and cheaper win: the 70B goes from 32% to 50%, kimi-k2.6 from 32% to 71%, glm-5.3-flash from 37% to 76%.
   - Send `also` names, which `systemFor` already prints as "also called":
     - `web:sequencer` gets "drum machine, drums".
     - `web:grains` gets "granulator, granulate, grains".
     - `web:synth` gets "synth, synthesizer". Or label it "synth" rather than "sine".
     - `web:plaits` gets "plates", so a correct pronunciation still lands.
   - Always include the synth, sampler, Plaits, sequencer and grains ports, whatever the sentence says.
   - In `portsForModel`, match against the aliases as well as ids and labels, so "granulate" finds grains.
2. **Model for a live demo: `@cf/moonshotai/kimi-k2.6` with `chat_template_kwargs: {thinking: false}`.**
   - Alias set: 71% right after the page's speaker repair, 92% valid links, 10/10 split ranges correct, no empty answers.
   - 2.4 s median and 4.7 s p90.
   - About $1.06 per 1000 asks. That is about 2x the 70B, and pennies at demo volume.
   - **Second choice:** `@cf/openai/gpt-oss-20b` with `reasoning: {effort: "low"}`. 63% right at 5.5 s median and $0.48 per 1000.
   - **Accuracy reference:** `glm-5.3-flash` (thinking off), 76%. Too slow on stage at 11.8 s median and 31 s p90.
   - **Avoid** llama-4-scout, mistral-small, the 8B and the 3B. All were 16% or below on every port set.
   - Using any of the new models needs a worker change, which was not done:
     - add the model to `PATCH`;
     - add a per-model extra payload (thinking off or low effort);
     - raise `max_tokens` to about 1000 to 2000;
     - read `choices[0].message.content`, because these models return OpenAI-shaped results, not `response`. qwen3 with thinking off put its JSON in `reasoning_content`, with `content: null`.
3. **Drop exact duplicate links in the worker after `relabel`.** The 70B repeated a speaker link up to eight times, and repetition is what runs into `max_tokens`.
4. **Speech: keep whisper-large-v3-turbo on `/hear` and rewrite its `initial_prompt`.**
   - Put a short, task-specific list first: Rhodes, piano, Plaits, sawtooth, synth, bass synth, granulate, drum machine, grains, keyboard, octave, split.
   - Drop the 80 generic labels ("admin", "chat", "1x or 2x", "machine") that pulled "granulate" toward "Gradulate" and "drum" toward "drone".
   - A sentence-shaped prompt looked better than a comma list in one leaky test. It is worth one real-voice A/B before trusting it.
5. **Do not switch to nova-3 for this user.**
   - It is 5x faster and keyterm works.
   - But it is English-only for keyterm, has no Estonian at all, and costs 10x per minute.
   - It returned empty or invented transcripts on the accented voice.
   - If it is ever tried, keyterm must be an array (binding) or repeated `keyterm=` parameters (REST), never one space-joined string, and never with `detect_language` or `multi`.
6. **Claude** needs a decision about gateway authentication and Unified Billing credits or a stored key. Ids are `anthropic/claude-sonnet-5.5` style. Nothing was measured, so nothing here says whether it would beat kimi-k2.6. Given that the port list is the larger lever, that comparison is worth running only after step 1.

## What could not be settled

- **Real voice.** Every speech number is synthetic. One real A/B of the owner saying the eight sentences into `/connect/` would replace the inference with a measurement, comparing turbo with today's prompt, turbo with the short prompt, and nova-3 with keyterm.
- **Claude.** No key, no gateway authentication, no credits.
- **Run-to-run variance.** Each page and fixed cell is one try per sentence, and each alias cell is two. Differences under about 10 points between models are inside the noise.
- **Two of the 19 expectations are strict:** "granulate the drum machine" needs the sequencer, and "play the circuit" needs keys into it. A looser grader would lift every model by about 5 to 10 points there.
- **Bad patches the grader cannot see.** It checks links against the port list. It does not run the page's `checkTransforms` or consent rules, so a link the page would still refuse (for example a Pi link without `NAMES_PI`) can score as right.
