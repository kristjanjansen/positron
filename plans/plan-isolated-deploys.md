# plan: isolated deploys

Asked 2026-09-16: *"figure out isolated depolys. perhaps <demoname>.positron.studio
separately? just quick plan"*. A plan, not an implementation. Nothing was built,
deployed or committed. Claims are tagged MEASURED (a command was run), READ (a
file or doc page says so), or INFERRED (reasoned, not checked).

## 1. What couples the demos today

MEASURED, `node -e` over `demo/manifest.mjs`: **47 rows, 44 built**, in 8 groups
(timeline 9, transports 9, capture 8, instruments 6, vain 5, xr 5, kurenniemi 3,
kit 2). CLAUDE.md's "40 of 45" is stale.

MEASURED over `demo/*/index.html`: 46 pages on disk, **45 import
`/shell/shell.mjs`** and **46 link `/shell/shell.css`**. Next most shared:
`transport-bar.mjs` (25 consumers), `strip.mjs` (22), `pattern.mjs` (9),
`slider.mjs` (8), `table.mjs` (7), `diagram.mjs` (7). MEASURED over
`workers/view/public/` as committed: **9.93 MB, 172 files**.

| part | bytes | who uses it |
| --- | --- | --- |
| `shell/` + `timeline/` + `src/` | 4.06 MB | shared |
| `resources/` | 0.52 MB | shared by 3 pages |
| `proto/` | 2.13 MB | 4 legacy pages, 3 files shared |
| the 44 per-slug directories | 3.15 MB total | one page each |
| root files | 0.07 MB | the index |

So **46% of the deployed bytes are shared**, and the median demo owns
**29.6 KB** of its own (mean 75 KB). `demo/shell/` alone is 71 top-level files,
1.38 MB, plus 2.31 MB of `shell/vendor/` (scsynth wasm, two controller meshes).

**A per-demo subdomain duplicates that 4.06 MB into every bundle.** 44 copies is
about **179 MB uploaded per full deploy**, against 9.93 MB today. The alternative
is keeping one shared origin for `/shell/`, which makes every page a cross-origin
module load and reintroduces exactly the coupling the split was for.

## 2. What isolation actually buys, and whether it is the fix

Two failures get named when this comes up.

**"A bad build takes all 45 rows down."** Mostly already guarded, READ from
`build.mjs`: four refusals run before one byte is written or deleted
(`checkImports`, `checkPresent`, `checkVendorUrls`, `checkCompiledDefs`), plus a
duplicate-destination throw. A build that would ship a 404 does not ship.

What those cannot catch is a **runtime** bug in a shared module, and per-demo
subdomains do not catch it either: `shell.mjs` is shared **by source**, so 44
workers built from this repo all ship the same file. Splitting the deploy splits
the *timing*, never the *code*. A page is only protected until the next time it
is redeployed, which is the next time anything in its own directory changes.

**"One page's redeploy reships every other page's uncommitted work."** Real, and
it bit today. READ, `deploy.mjs`'s own header: two agents in one checkout,
`public/` is a shared mutable global, A builds, B builds, A uploads B's tree
under B's stamp. `deploy.mjs` already fingerprints `public/`, refuses when it
moved between build and upload, and enumerates the dirty files out of git.

Per-demo workers do **not** fix this. 44 workers built from one working tree have
the same problem 44 times, and each one still carries whatever is uncommitted in
`demo/shell/`. The fix is a build output that is not shared (`--out`, which
exists) plus a deploy target that is not production (a staging host, which does
not).

Verdict: **isolation is aimed at the wrong axis.** The axis that hurts is
production versus not-production, not demo versus demo.

## 3. The subdomain option, priced

**What does not break, checked rather than assumed.** MEASURED by grepping the
pages: every shared import is written root-absolute (`from '/shell/shell.mjs'`
45 times, `/timeline/transport.mjs` 26 times, `/shell/shell.css` 46 times). A
root-absolute path rebases onto whatever origin serves the page, so on
`radio.positron.studio` it resolves to that host with no edit. MEASURED: there
are **zero** `href="/<slug>/"` cross-demo links in any page. `caps.mjs` reads
only APIs and never a URL or a user agent (READ), so it is unaffected. The
`/items/` service worker registers `./push-sw.js` with `scope: './'` and its
manifest uses relative `start_url` and `scope` (READ), so both survive.

**What does break.**

1. Every per-slug bundle carries its own `/shell/`, `/timeline/` and `/src/`.
   That is the 179 MB above, and `build.mjs` grows a per-slug import closure.
   INFERRED cost: a day, plus a new class of bug where two slugs ship different
   vintages of `shell.mjs`.
2. `workers/feedback/src/index.js` pins `LIVE_ORIGIN = 'https://positron.studio'`
   as **an allowlist of one, exact match** (READ), and `demo/shell/feedback.mjs`
   holds the same constant and checks the two agree. A page served from a
   subdomain writes into `feedback-dev`. Only `/feedback/` imports it (MEASURED),
   so this is one constant, but it is the designed-in kind of break.
3. `demo/items/manifest.webmanifest` sets `"id": "/items/"` absolute (READ).
   Changing the origin changes the app identity, so an already-installed web app
   becomes a second app.
4. The index still has to link somewhere. `manifest.mjs:637` builds
   `/${d.name}/`, which would become 44 absolute cross-origin URLs.
5. 44 more Workers. READ, Cloudflare docs: **100 Workers per account on free,
   500 on paid**. 17 worker directories exist here, 15 of them already on a
   `*.positron.studio` custom domain (MEASURED from the `wrangler.jsonc` files),
   so 15 + 44 = 59 is inside the free cap but no longer comfortable. Static
   assets are 20,000 files per version free, 100,000 paid, 25 MiB per file
   (READ); 172 files is nowhere near it.
6. TLS and DNS. Each Workers custom domain provisions its own hostname and
   certificate. INFERRED, not verified: a single wildcard **route**
   (`*.positron.studio/*`) plus Universal SSL would cover one label without 44
   custom domains, but a wildcard route means **one Worker dispatching on the
   Host header**, which is a cosmetic URL change with zero isolation.

## 4. Cheaper alternatives

**(a) One Worker per group.** 8 workers instead of 44, duplication down from
about 179 MB to about 32 MB (8 x 4.06 MB). Still duplicated, still no source
isolation. Not worth it.

**(b) A staging hostname fed by the existing `--out`.** `build.mjs` already takes
`--out <dir>` and refuses to empty a directory it did not write. A second
`wrangler.staging.jsonc` pointed at that directory and at `next.positron.studio`
gives a full second copy of the whole site, on one extra Worker, with no page
edited. MEASURED, `demo/verify.mjs:142-145`: `DEMO_BASE` already exists and the
harness takes any base, so `DEMO_BASE=https://next.positron.studio node
demo/verify.mjs` grades it on day one with no harness change.

**(c) Workers preview URLs.** READ,
`developers.cloudflare.com/workers/versions-and-deployments/preview-urls/`:
`wrangler versions upload --preview-alias staging` publishes a version without
deploying it, at `staging-elektron-view.<subdomain>.workers.dev`. No second
config, no DNS, no certificate. Aliases can only be set at upload, and the 1000
most recent are kept. The cost is a `workers.dev` hostname rather than a
positron.studio one, and INFERRED: a version upload does not take the custom
domain, so production is untouched.

## 5. Recommendation

Do **(c)** today and **(b)** if a second permanent URL turns out to be wanted.
`wrangler versions upload --preview-alias <branch>` costs one flag, no new
Worker, no DNS, no page edit, and it answers the question that actually bit this
repo: *is what I am about to ship good, without shipping it over somebody else's
tree*. Pair it with `node workers/view/build.mjs --out /tmp/x`, which already
answers *does the build still pass* without dirtying `public/`. Do **not** build
`<slug>.positron.studio`: it costs 44 Workers and about 179 MB a deploy to buy
timing isolation over code that stays shared by source, and the one thing it
would genuinely protect against, a bad `shell.mjs`, it does not protect against
at all.

**Not verified.** No wrangler command was run and nothing was deployed. The
wildcard-route and Universal SSL behaviour in 3.6 is reasoning, not a doc quote:
the docs search returned nothing for it. Whether a `versions upload` leaves the
custom domain alone is INFERRED from the docs' description, not observed. The
179 MB figure assumes every per-slug bundle carries the whole shared tree; a
real per-slug import closure would be smaller, and how much smaller was not
computed. The account's current Worker count was read from this repo's configs,
not from the Cloudflare API, so anything deployed from elsewhere is uncounted.
