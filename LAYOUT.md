# LAYOUT — where things go, and why

Read this before adding a file. It is short on purpose.

The system already exists; what was missing is that nobody had written it down,
which is why the repo *feels* untidy when it is mostly consistent. Two things
look wrong and are deliberate, and they are named at the bottom with the
measured price of "fixing" them, so nobody re-litigates it from scratch.

---

## The one rule

**A top-level directory says WHO RUNS IT, not what it is about.**

| | runs on | holds |
|---|---|---|
| `demo/` | **a browser** | the demo pages, the shared browser library (`shell/`), the harnesses that drive them, and the dev server |
| `rig/` | **hardware we own** | the Raspberry Pi (`box/`), its renderer (`vis/`), the studio Mac (`m1/`), tools that talk to them |
| `workers/` | **Cloudflare** | `relay`, `view`, `pub`, `backlog`, `ingest` — one directory each |
| `timeline/` | **anywhere** | the library: decks, scores, the strip. Imported by pages and by node |
| `src/` | **a shell** | the publisher and its stream tooling |
| `proto/` | **a browser** | prototypes that are not shelled and are not in the story |

That accounts for everything that executes. What remains is writing:

| | |
|---|---|
| `plan-*.md` | 23 documents that PROPOSE and argue. The `plan-` prefix is the folder |
| `research/` | 20 documents that REPORT what is out there or what was measured |
| `results/`, `studio/`, `archive/` | measurements and captures, mostly untracked |
| `CLAUDE.md` `LESSONS.md` `PROGRESS.md` `HANDOFF.md` | the standing rules, why they exist, what was measured when, and where we are |

---

## Where does a new thing go?

1. **A page a visitor opens** → `demo/<slug>/index.html`, a row in
   `demo/manifest.mjs`, `built: true`. The build ENUMERATES `demo/`, so there is
   nothing to add to an allowlist.
2. **A page that lives somewhere else** — because it belongs with the hardware,
   like the box's listener in `rig/box/` — → a row with `built: false`,
   `page: '/slug/'` and **`src:`**. The build and the dev server both read `src`,
   so it is declared once. It used to need a hand-written line in each, in two
   files, with nothing to notice if only one was made.
3. **Something two pages both need** → `demo/shell/`, which is enumerated too.
   ⚠️ Put it there rather than copying it: this repo has paid for two copies of
   one function twice — `rowHTML` printed `undefined` over every demo name for
   an afternoon, and `demo/shell/moq.mjs` imported a URL that had been renamed
   away, which made two demos assert NOTHING while reading red for a plausible
   wrong reason.
4. **Something that runs on the Pi or the Mac** → `rig/<machine>/`, and
   **declare its dependencies in `rig/audit.mjs`**. A machine set up by typing
   is a machine nobody can rebuild.
5. **A document** → `plan-<thing>.md` if it argues for something,
   `research/<thing>-<date>.md` if it reports. Then SAY SO in the reply: a path
   in a commit message is not a report.
6. **Somebody else's binary that one page needs** → `demo/<slug>/vendor/`, and
   **listed BY NAME in `workers/view/build.mjs`**, licence text beside it.
   `demoFiles()` enumerates one directory level and only web extensions, so it
   takes neither a `.wasm` nor anything in a subdirectory — which is the
   containment wall working, not a gap to widen. `patch` is the first of these:
   1.86 MB of AGPL WebAssembly, ten lines in the allowlist, and two of those
   lines are for dynamic imports the page never runs but `checkImports()`
   rightly refuses to ship without. ⚠️ It does NOT go in `demo/shell/`, which is
   enumerated and shared — promoting a 1.86 MB dependency into the kit invites a
   second page to import it without noticing what it costs.

   ⚠️ **And the containment wall is what priced the SECOND candidate out.** The
   WebXR input-profiles controller meshes were assessed on 2026-09-13 and
   **rejected**, with the numbers, so nobody re-derives them:
   `@webxr-input-profiles/assets@1.0.20` is **MIT (Amazon, 2019)** — the licence
   is not the obstacle — and `meta-quest-touch-plus` is **217,984 bytes for the
   left hand, 213,868 for the right**, plus 11,430 for the profile JSON. The
   `.glb` is glTF 2.0 with 31 nodes, 6 meshes, 23 accessors, one PBR material
   and one embedded PNG, carrying **TEXCOORD_0** — which the room's flat-colour
   box program (position at slot 0, normal at slot 1, no texture coordinate) has
   nowhere to put. So it is a container parser *and* an accessor decoder *and* a
   node walk *and* a PNG decode *and* a third renderer, for a shape whose whole
   job is to answer "where is my hand". 🔴 **And the consumer is
   `demo/shell/xr-room.mjs`, which two pages import** — so a
   `demo/<slug>/vendor/` path fetched from a shell module is the `moq.mjs`
   rename bug exactly, and the alternative is a shell-level exception to the
   wall this item exists to describe. Primitives instead, and the tablet's own
   footer says it is a stand-in. **The `profile.json`'s gamepad index map was
   taken WITHOUT the mesh** — ten lines in `demo/shell/xr-hands.mjs`, no fetch,
   no bytes — which is the half that was actually worth having.

---

## ⚠️ Two things that look wrong and are staying

Both were priced before being rejected. Neither is visible to anyone using the
site; both are ~400–1000 mechanical edits in exactly the shape this project's
rename lesson is about — *"a rename moves URLs that live in modules, harnesses
and comments, none of which are type-checked"*.

**`demo/` is not in any URL, and that is correct.** `demo/mirror/` is served at
`/mirror/`, `/demo/mirror/` 404s on the deploy, and the dev server tries the
root then `demo/` so both resolve. The directory exists for one concrete reason,
stated in `workers/view/build.mjs`: **the repo root holds `.env` with live
secrets**, and the build ENUMERATES rather than lists. Enumeration needs a
container it can trust. `demo/` is the wall that makes "enumerate, don't list"
safe — it is not organising the demos, it is fencing the enumeration away from
the secrets.

**~~The CSS prefix is `d-`~~ — DONE 2026-09-12, it is `pos-` now.** The
reasoning above said not to: 956 references for a rename no visitor can see.
That held right up until three components written the same day shipped
UNPREFIXED, at which point the cost of NOT doing it became a split convention
every future component has to pick a side in.

⚠️ **The first attempt corrupted 164 files.** It matched BARE WORDS —
`const step` became `const pos-step` — rather than class names. The `d-*` names
are hyphenated and distinctive and were safe both times. If the remaining
unprefixed ones (`.step`, `.sld`, `.choice`) are ever renamed, match
`class="…"` attributes and CSS selectors, never a bare identifier. And syntax
check every module before believing it worked.

**And the 23 `plan-*.md` files stay at the root.** Moving them into `plan/` is
MEASURED at **421 references** — 74 paths and 347 bare prose citations like
`plan-score §1`, where the name is functioning as a name rather than a path. The
`plan-` prefix is already doing the folder's job.

---

## What is untracked on purpose

`rig/` holds **268 tracked files of 65,703** and `proto/` **1,508 of 7,609** —
the rest is captured data, renders and logs, ignored. A large directory here is
not mess; it is a working machine's output. `auto.crt` / `auto.key` are at the
root and are in `.gitignore`.
