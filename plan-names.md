# plan-names — `ingest` and `selfrec` say nothing; what to call them instead

Status: **not started.** Written 2026-09-08, out of "rename ingest selfrec to
something more understandable".

Read `HANDOFF.md`'s "Why the Worker SCRIPT names are still `elektron-*`" before
§2 — this plan is that decision applied a second time, and it is the reason the
work is small.

---

## 0. What they are, in plain words

Two places a recording can be written to R2. They differ in exactly two ways,
and those two ways are the whole product:

| | `ingest.positron.studio` | `selfrec.positron.studio` |
|---|---|---|
| who may write | **anyone with the page open** | anything holding a token |
| how long it lasts | **6 hours**, cron-enforced | forever |
| caps | 5 sessions and 64 MiB per address per hour | none |
| reading it back | `archive.positron.studio` | `archive.positron.studio` |

The split exists for one reason that cannot be engineered away: **a public page
cannot hold a secret.** Everything else follows.

---

## 1. Why the names are wrong

**`ingest`** is a broadcast-industry word for "getting material into a system".
It describes the ACT from the system's side, tells a reader nothing about which
of the two paths this is, and is on `CLAUDE.md`'s banned list in spirit — it is
a word you have to already know.

**`selfrec`** is worse: it is short for "self-recording", which is not what the
service does. It is named after the technique that first used it — participants
recording themselves in a grid — and that technique is one caller among several.
A name that describes its first caller ages into a lie the moment there is a
second.

Neither name says the thing a reader actually needs: **one of these forgets in
six hours and the other does not.**

---

## 2. What may be renamed, and what may not

**Rename the HOSTNAMES. Do not rename the Worker scripts.**

Renaming a Worker script does not rename anything — it creates a NEW Worker at a
new hostname and **abandons the Durable Objects of the old one**. That is not
theoretical here:

- `positron-ingest` binds a Durable Object `Quota` (sqlite) and runs a cron at
  `17 * * * *`. The DO holds live sessions and every address's hourly counters.
  Renaming the script strands them: in-flight uploads 410, and every rate limit
  silently resets to zero — which on a tokenless write path is the one piece of
  state that must not be casually discarded.
- `elektron-selfrec` has **no** Durable Object, so its script could be renamed
  safely. It still should not be, for consistency with the eight `elektron-*`
  scripts left alone on 2026-09-04 for exactly this reason. A custom domain
  already decouples public identity from script name, and nobody types a script
  name.

**The R2 bucket cannot be renamed at all** (`elektron-archive-test`), and its
objects and public URL are bucket-bound. Out of scope, permanently.

So this is a DNS-and-strings change, not a migration.

---

## 3. The names

| now | proposed | why |
|---|---|---|
| `ingest.positron.studio` | **`drop.positron.studio`** | you drop something off and collect it later; it is not kept |
| `selfrec.positron.studio` | **`store.positron.studio`** | it is stored, and stays stored |
| `archive.positron.studio` | unchanged | where both are READ; already the clearest of the three |

Read together they say the shape: **drop** is temporary and open, **store** is
permanent and trusted, **archive** is where you read.

**Runners-up, and why not:**

- `hold` for `drop` — accurate ("we hold it six hours") and arguably safer,
  because `drop` can be misread as *discard*. It is the fallback if anyone
  actually trips on that. `drop` wins on the verb a person performs: you drop a
  file off; you do not "hold" one.
- `keep` for `selfrec` — the best word for "kept forever", and **taken**: the
  demo shipped today is `positron.studio/keep/`. A subdomain `keep.` beside a
  path `/keep/` that mean different things is a trap, not a name.
- `upload` for either — describes what BOTH do, so it distinguishes nothing.
- `vault`, `locker`, `stash` — flavour rather than meaning.

---

## 4. The migration, additive and reversible

Every step is additive until the last, so nothing breaks mid-flight and any step
can be abandoned without a rollback.

1. **Attach the new custom domains** to the existing scripts —
   `drop.positron.studio` to `positron-ingest`, `store.positron.studio` to
   `elektron-selfrec` — with `wrangler triggers deploy`. Routes only, no code
   re-upload. Both hostnames now serve the same Worker, so the old one keeps
   working and there is no flag day.
2. **Move the callers**, three of them for `drop`: `demo/shell/ingest.mjs`'s
   `INGEST` constant, `demo/capture/index.html`, and whatever `keep` inherits
   from the shell module. Then six for `store`, all under `proto/selfrec/`.
3. **Rename the shell module** `demo/shell/ingest.mjs` → `demo/shell/drop.mjs`
   and its exports' prose. `build.mjs` enumerates `demo/shell/` and refuses an
   import with no deployed file — and since 2026-09-07 it scans `.mjs`/`.js` as
   well as HTML, so a missed import is caught at build rather than as a 404 on
   the live site. **Prove that once by breaking it on purpose.**
4. **Update the docs**: `CLAUDE.md`'s "the only tokenless write path" bullet,
   `HANDOFF.md`'s hostname table and worker table, `SUMMARY.md`.
5. **Leave the old hostnames attached** for now. They cost nothing, and
   `workers_dev: true` plus the old custom domains are why the 2026-09-04 move
   broke no links.
6. **Retire the old hostnames later**, in their own commit, once nothing has
   referenced them for a while. Not in the same change as the rename — that is
   what turns a reversible edit into a flag day.

---

## 5. What to grep, because a rename here has form

The slug rename left **three dead paths**, and one of them pointed the iPhone
harness at a 404 for weeks (LESSONS #29). URLs live in places no type checker
looks:

```sh
grep -rn "ingest\.positron\.studio\|selfrec\.positron\.studio" . \
  --include='*.mjs' --include='*.js' --include='*.html' --include='*.sh' \
  --include='*.jsonc' --include='*.json' --include='*.md'
```

and then, separately, the bare words as identifiers — `INGEST`, `SELFREC_TOKEN`,
`selfrec/`, `demo/ingest/` — because the R2 KEY PREFIX is `demo/ingest/…` and is
**not** part of this rename: changing it would orphan every object already
written under it. The prefix is data, not a name.

Check `verify-native.mjs` and `verify-safari.mjs` by hand. They are the two
harnesses `verify.mjs` cannot cover, so nothing goes red when they rot.

---

## 6. What is NOT renamed

- **The Worker scripts** (§2).
- **The R2 bucket** `elektron-archive-test`, which cannot be.
- **The R2 key prefix** `demo/ingest/…`, which is data.
- **`proto/selfrec/`'s directory and filenames.** They are named for the
  TECHNIQUE — participants recording themselves — which is a real thing that
  still has that name. The service they call gets renamed; the technique does
  not. Same reasoning that kept `research/elektron-participation-2026-08.md`.
- **`SELFREC_TOKEN`**, the secret's name. Renaming a secret means re-minting it
  in a session where it can be read, and it is on the rotation list already
  (`SECRETS-ROTATION.md`). Do it there, once, not twice.

---

## 7. Done when

1. `drop.positron.studio` and `store.positron.studio` serve, and the old
   hostnames still do.
2. Nothing in `demo/` or `proto/` names the old hosts; `build.mjs` passes and
   has been shown to refuse a missing import.
3. `CLAUDE.md`, `HANDOFF.md` and `SUMMARY.md` describe the two paths by what
   they do — one forgets in six hours, one does not — rather than by the words
   `ingest` and `selfrec`.
4. The full suite is green at its committed count, and `capture` and `keep`
   still store and fetch back.
5. A reader who has never seen this repo can say which of the two a public page
   is allowed to use, from the names alone. That is the whole point of the
   change and the only test that matters.
