# Cloudflare models for turning speech into a patch, read off their docs

> **The ask**, 2026-09-21: *"In bg investigate cf models to do sound-to-patcbay
> conversion"*. This is level 3 of `plans/plan-patchbay.md` §4: somebody says
> what they want and a patch comes out.
>
> 🔴 **NOTHING HERE HAS BEEN RUN.** Every number is read off Cloudflare's own
> documentation on 2026-09-21 through their docs search, with the page named.
> No model was called, no latency was measured, and no token was spent. A plan
> written from documentation says so, and §6 names what would have to be
> switched on to turn any of it into a measurement.

---

## 1. The shape, in one line

**Two models and one schema, and the schema is what makes it safe.**

```
microphone -> @cf/openai/whisper-large-v3-turbo -> text
           -> @cf/meta/llama-3.3-70b-instruct-fp8-fast with JSON mode
           -> a patch, as JSON, whose port names are an ENUM of the real ones
           -> demo/shell/bay.mjs validates it -> a person confirms it -> connect
```

🟢 **THE INTERESTING PART IS NOT THE MODEL, IT IS THAT THE REGISTRY BECOMES AN
ENUM.** Workers AI takes a JSON Schema, so the list of ports the model may name
is not a hope expressed in a prompt, it is the `enum` of a field. A model that
tries to invent `circuit:in2` does not produce a wrong patch, it produces
nothing, because the output is constrained rather than parsed. That removes the
largest class of failure before the validator is even reached.

---

## 2. Speech to text

📄 **Three automatic speech recognition models are hosted**, all OpenAI Whisper:

| model | notes | price |
|---|---|---|
| `@cf/openai/whisper-large-v3-turbo` | Batch, `task` transcribe or translate, `language`, `vad_filter` | **$0.000513 per audio minute** |
| `@cf/openai/whisper` | the general purpose one, multilingual | not listed on the model page |
| `@cf/openai/whisper-tiny-en` | **Beta, English only** | not listed |

📄 **The turbo model's output carries more than the sentence**: `text`,
`word_count`, a `words[]` array and a `vtt` track. Word timings are worth having
for a reason that is not obvious: **a patch bay wants to show what it heard**,
and a transcript with timings can be replayed against the audio when somebody
says the machine misheard them.

📄 **`vad_filter` preprocesses with voice activity detection.** For a
push-to-talk control in a studio, where the microphone is open in a room with a
synth in it, that is the difference between transcribing an instruction and
transcribing a bass line.

⚠️ **AND THE LANGUAGE QUESTION IS REAL HERE AND IS NOT ANSWERED.** This desk is
in Tallinn and the instructions in this repository's own backlog are a mixture
of English and Estonian. Whisper is multilingual and takes a `language`
parameter; **its Estonian accuracy is not something Cloudflare's page states and
nothing here has measured it.** A first test should say a patch instruction in
both languages and compare, because the failure mode is not a refusal, it is a
plausible English sentence that means something else.

---

## 3. Text to a patch

📄 **JSON Mode has been in Workers AI since 2025-02-25** and is compatible with
the OpenAI `response_format` API:

```js
response_format: { type: 'json_schema', json_schema: { /* a JSON Schema */ } }
```

📄 **The model to use is `@cf/meta/llama-3.3-70b-instruct-fp8-fast`:**

| | |
|---|---|
| context window | **24,000 tokens** |
| function calling | **yes** |
| batch | yes |
| price | **$0.293 per M input tokens, $2.253 per M output** |

📄 **And the cheaper ones, because this task is small:**

| model | in / out per M tokens |
|---|---|
| `@cf/meta/llama-3.2-3b-instruct` | $0.051 / $0.335 |
| `@cf/meta/llama-3.1-8b-instruct-fp8-fast` | $0.045 / $0.384 |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | $0.351 / $0.555 |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | function calling, vision, natively multimodal |

⚖️ **START ON THE 70B AND TRY TO FALL OFF IT.** The job is small and constrained,
so an 8B may well do it, and the honest way to find out is to build the
evaluation set first: twenty spoken instructions whose correct patch is written
down by hand. That set is worth more than the model choice, it costs nothing to
make, and without it "the small one is good enough" is an opinion.

---

## 4. What it costs, and it is not the interesting constraint

⚖️ **ARITHMETIC, from the published prices, for one spoken instruction:**

| | |
|---|---|
| 5 s of speech at $0.000513 a minute | **$0.0000428** |
| about 1,000 input tokens: a system prompt, the registry, the sentence | **$0.000293** |
| about 60 output tokens: one or two links | **$0.000135** |
| **one command, end to end** | **about $0.00047** |

🟢 **That is roughly 2,100 spoken commands per dollar**, and a studio session is
tens of commands. **Cost is not a reason to choose anything here.** Latency is,
and latency is the number nobody has.

---

## 5. Why this is the right shape for THIS system

🔴 **THE RULE FROM `plans/plan-patchbay.md` §5 DOES NOT MOVE: A MODEL PROPOSES,
IT DOES NOT CONNECT.** Everything above produces a patch as text, which is shown
to a person before anything is joined. A system that rewires a studio from a
microphone is the *page that opens something on load* defect with a larger blast
radius, and this repository has paid for that one four times.

🔴 **THERE ARE THREE WALLS AND THE MODEL IS INSIDE ALL OF THEM.**

1. **The schema** decides what can be SAID: an enum of real port ids, an enum of
   the six transform names, numbers with ranges.
2. **`demo/shell/bay.mjs`'s validator** decides what can be CONNECTED: shapes,
   consent, cycles, staleness. It is ordinary code, it is graded at 30 asserts
   with no browser, and it is the wall that knows the Circuit must never be sent
   SysEx.
3. **A person** presses connect.

⚠️ **AND THE THIRD WALL IS THE ONE THAT WILL BE ARGUED ABOUT.** Somebody will
want a hands free studio. The answer is that the first two walls make an
unconfirmed patch SAFE rather than CORRECT: it cannot damage an instrument, and
it can still be completely the wrong patch. Confirmation is about the second
thing.

✅ **AND THE WHOLE LAYER IS OPTIONAL BY CONSTRUCTION.** Delete every model above
and `/bay/` still works, because the text form and the validator are the product
and the model is an input method. That is the test of whether this is designed
or decorated.

---

## 6. What would have to happen to turn any of this into a measurement

🔌 **NONE OF THIS HAS BEEN RUN AND THE FIRST THREE STEPS ARE CHEAP:**

1. **A Worker with an `AI` binding.** This account already runs five Workers
   (`relay`, `view`, `pub`, `backlog`, `ingest`), so the deploy path exists. The
   binding does not.
2. **One call to `@cf/openai/whisper-large-v3-turbo` with a recorded sentence**,
   to find out the real round trip for five seconds of audio. ⚠️ Measure it from
   a browser on this desk rather than from a Worker to a Worker, because the
   upload is part of the latency and a page is where the microphone is.
3. **One call to the 70B with the real schema** and the registry of this desk,
   to find out whether the enum trick behaves as documented.
4. **The twenty instruction evaluation set**, hand written, before any model
   comparison is believed.

⚠️ **WHAT IS NOT KNOWN AND MATTERS MORE THAN THE PRICES**: the end to end
latency of speech to a shown patch, Whisper's Estonian accuracy on studio
vocabulary like *macro*, *sidechain* and *channel sixteen*, whether the free
daily neuron allocation covers a working session on this account, and whether a
24,000 token context is comfortable once a registry has several sites in it. All
four are one afternoon's measurement and none has been done.

## Sources

Read 2026-09-21 through Cloudflare's documentation search:

- <https://developers.cloudflare.com/workers-ai/models/> and the per model pages
  for `whisper`, `whisper-large-v3-turbo`, `whisper-tiny-en` and
  `llama-3.3-70b-instruct-fp8-fast`.
- <https://developers.cloudflare.com/workers-ai/features/json-mode/> and the
  changelog entry of 2025-02-25 that introduced it.
- <https://developers.cloudflare.com/workers-ai/platform/pricing/> for the token
  prices quoted in §3.
