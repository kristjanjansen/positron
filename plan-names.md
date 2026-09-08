# plan-names — one write path, tiered by credential, with a name that says what it does

Status: **not started.** Written 2026-09-08 out of "rename ingest selfrec to
something more understandable", then rewritten after the better question:
*"can they not share code, be one domain just different creds / quotas?"*

They can, and that is the plan. Renaming was the small half.

---

## 0. What exists today

Two Workers that both write a recording to R2, differing in exactly two ways:

| | `ingest.positron.studio` | `selfrec.positron.studio` |
|---|---|---|
| script | `positron-ingest` | `elektron-selfrec` |
| who may write | **anyone with the page open** | anything holding `SELFREC_TOKEN` |
| how long it lasts | **6 hours**, cron-enforced | forever |
| caps | 5 sessions + 64 MiB per address per hour | none |
| Durable Object | `Quota` (sqlite) + an hourly cron | none |
| read back at | `archive.positron.studio` | `archive.positron.studio` |

Same bucket, same read path, same job. **Two implementations of one thing,
whose only real difference is who is asking.**

---

## 1. Why the names are wrong

**`ingest`** is a broadcast word for "getting material in". It describes the act
from the system's side and says nothing about which of the two paths this is.

**`selfrec`** is worse: short for "self-recording", which is not what the service
does. It is named after the technique that first used it — participants
recording themselves in a grid — and a name that describes its first caller ages
into a lie the moment there is a second.

Neither says the thing a reader needs: **one of these forgets in six hours and
the other does not.**

---

## 2. The decision: ONE worker, one domain, tiered by credential

The split was never about code. It is about **who is asking**, and that is a
property of a request, not of a deployment.

    POST /open                        -> open tier: 6 h, capped
    POST /open   Authorization: ...   -> trusted tier: no expiry, no caps

One Worker, one hostname, one implementation of the R2 write path. The tier
becomes a row in a table:

```js
const TIERS = {
  open:    { ttlHours: 6,    maxSessionsPerHour: 5,  maxBytesPerHour: 64 * MiB, ... },
  trusted: { ttlHours: null, maxSessionsPerHour: null, maxBytesPerHour: null,   ... },
};
```

The `Quota` DO already keys by address; it keys by PRINCIPAL instead — the
address for an anonymous caller, the token's id for a trusted one. Everything
else it does is unchanged, including the cron, which simply skips sessions with
no expiry.

### What this buys

- **One implementation.** Today a fix to the R2 write path has to be made twice,
  and `capture`'s un-awaited upload bug (which the shared client fixed on the
  way) is the kind of thing that only gets fixed in the copy someone is looking
  at.
- **The difference becomes data.** "Who may write what, for how long" is a table
  a reader can look at, not a difference between two directories.
- **It deletes `elektron-selfrec`** — see §4, where that matters more than it
  looks.
- **The caps get a shape that fits.** `maxSegmentBytes` was already raised today
  because it was sized for a 4-second segment and had become a silent limit on
  take length. Per-tier caps make that kind of drift visible.

### The honest cost, and it is real

**Two workers are two blast radii.** Today a bug in `ingest` cannot expose the
untimed path, because the untimed path is a different script with a different
secret. Merged, a mistake in tier selection — a truthy check on a header that is
absent, say — hands an anonymous caller the trusted tier.

That risk is manageable and must be managed explicitly:

- tier resolution in ONE function, returning `open` unless a token VALIDATES,
  never "not open" by elimination;
- the open tier is the default value of the variable, not an else-branch;
- an assert in the worker's own tests that a request with no header, an empty
  header, a malformed header and a WRONG token all resolve to `open` — four
  cases, because "no token" and "bad token" are different bugs;
- the tier is echoed in the `/open` response, so a caller can see which one it
  got and a test can assert on it.

If that discipline is not wanted, keep two workers and do only the rename. The
merge is worth it; doing it carelessly is not.

---

## 3. The name

| now | proposed |
|---|---|
| `ingest.positron.studio` + `selfrec.positron.studio` | **`store.positron.studio`** |
| `archive.positron.studio` | unchanged — where it is READ |

**`store`** because that is the verb: you store a recording there. The tier
decides how long it stays, and the tier is a credential, not a hostname — which
is the whole point of §2. Two hostnames would keep implying two services.

Runners-up: `drop` (good for the open tier alone, wrong once one hostname serves
both — you do not "drop off" something you keep forever); `keep` (**taken** —
the demo shipped today is `positron.studio/keep/`, and a subdomain `keep.`
meaning something else is a trap); `upload` (describes both tiers, distinguishes
nothing).

**And `r2.` — asked directly, "can it not be like webrtc.positron.studio?"** The
family does split two ways, and both are legitimate: `archive` `cues` `pub`
`jam` `instrument` name the FUNCTION, while `rtc` `ws` `moq` `osc` `shout` name
the PROTOCOL. `store` sits in the first group, which is where it belongs, for
two reasons:

- **The read side of the same bucket is already `archive`, not `r2`.** Naming
  the write side after the vendor while its own pair is named after the job
  splits one thing across two schemes.
- **No hostname here names a vendor's product.** `pub` is ffmpeg in a Cloudflare
  Container and is not called `ffmpeg`; `shout` names the protocol family, not
  Icecast the server. `r2` would be the first, and it goes stale the day storage
  moves.

`archive` for reading and `store` for writing also read as a pair. `archive` and
`r2` do not.

---

## 4. `elektron-*`, and which of them can actually go

Asked alongside this: remove the `elektron` references. There are **three kinds**
and only one is safely removable.

**(a) Worker SCRIPT names — 8 of them, and renaming is not free.** Renaming a
Worker script does not rename anything: it creates a NEW Worker and **abandons
the Durable Objects of the old one**. `elektron-view` holds `Gate` (the durable
ERR cache), `elektron-rtc` holds `RtcRoom`, `elektron-jam` holds `JamRoom`,
`elektron-instrument` holds `Hub`, `elektron-cues` holds `Sessions` and
`BeaconStore`. A custom domain already decouples public identity from script
name, and nobody types one.

**`elektron-selfrec` is the exception, and this plan removes it** — it has NO
Durable Object, and after §2 it has no code either. One of the eight goes away
as a consequence of the merge rather than as a risky rename. That is the right
way to lose a name.

**(b) Prior-art citations — these must NOT change.** `elektronstudio`,
`elektron.art`, `elektron 2020` and the Estonian genitive `elektron.arti` name
the real predecessor project, which exists under that name. Rewriting them makes
the notes false — and this is not hypothetical: a rename swept two of them up
and `SUMMARY.md` claimed a lineage "since positron 2020", a project that did not
exist until 2026-09-04. Fixed on 2026-09-08. Do not do it again.

**(c) The R2 bucket `elektron-archive-test` — cannot be renamed at all**, and
its objects and public URL are bucket-bound. Permanently out of scope.

---

## 5. Phases

**P1 — merge, behind the existing hostname.** Add tiers to `positron-ingest`,
resolve the principal in one function, keep `ingest.positron.studio` serving
exactly as now. The open tier must behave identically: same caps, same TTL, same
responses. **Done when** the four tier-resolution cases assert, and `capture`
and `keep` are green at their committed counts with no page change.

**P2 — move the trusted callers.** Point `proto/selfrec/`'s six files at the
merged worker with their token. **Done when** they work and `elektron-selfrec`
has served nothing for a week.

**P3 — the name.** Attach `store.positron.studio` with `wrangler triggers
deploy` (routes only, no re-upload), move the callers, rename
`demo/shell/ingest.mjs` → `demo/shell/store.mjs`. Leave the old hostnames
attached: they cost nothing, and keeping `*.workers.dev` plus the old custom
domains is why the 2026-09-04 move broke no links. **Done when** nothing in
`demo/` or `proto/` names the old hosts and `build.mjs` passes — proved once by
breaking an import on purpose, since it scans `.mjs`/`.js` as well as HTML.

**P4 — retire.** Delete `elektron-selfrec`, and detach the old hostnames, in
their own commit and not before something has gone a while without them.

---

## 6. What to grep, because a rename here has form

The slug rename left **three dead paths**, one of which pointed the iPhone
harness at a 404 for weeks (LESSONS #29). URLs live where no type checker looks:

```sh
grep -rn "ingest\.positron\.studio\|selfrec\.positron\.studio" . \
  --include='*.mjs' --include='*.js' --include='*.html' --include='*.sh' \
  --include='*.jsonc' --include='*.json' --include='*.md'
```

Then the bare identifiers separately — `INGEST`, `SELFREC_TOKEN`, `selfrec/` —
and note that the R2 KEY PREFIX `demo/ingest/…` is **not** part of this: changing
it orphans every object already written under it. The prefix is data, not a name.

Check `verify-native.mjs` and `verify-safari.mjs` by hand. They are the two
harnesses `verify.mjs` cannot cover, so nothing goes red when they rot.

---

## 7. What is NOT renamed

- The seven remaining `elektron-*` scripts (§4a).
- The R2 bucket, which cannot be (§4c).
- The R2 key prefix `demo/ingest/…`, which is data.
- `proto/selfrec/`'s directory and filenames — named for the TECHNIQUE, which
  still has that name. The service is renamed; the technique is not. Same
  reasoning that kept `research/elektron-participation-2026-08.md`.
- `SELFREC_TOKEN`. Renaming a secret means re-minting it, and it is on
  `SECRETS-ROTATION.md` already. Do it there, once.

---

## 8. Done when

1. One Worker serves both tiers, and which tier a request got is in its own
   response.
2. Four asserts prove that no header, an empty header, a malformed header and a
   wrong token all resolve to the OPEN tier.
3. `store.positron.studio` serves; the old hostnames still do.
4. `elektron-selfrec` is deleted, and nothing noticed.
5. `CLAUDE.md`, `HANDOFF.md` and `SUMMARY.md` describe one path with two tiers,
   by what they do — one forgets in six hours, one does not.
6. A reader who has never seen this repo can say, from the names alone, which
   tier a public page is allowed to use. That is the point, and the only test
   that matters.
