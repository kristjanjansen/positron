# The eccm project setup: which repository, which hostname, whose account

Asked 2026-09-26, verbatim:

> *"make third plan on actual project setup. inside our outside repo? i do not
> have domain for it. eccm.positron.studio somehow?"*

The first two plans are `plans/plan-eccm-cms.md` (what to build) and
`plans/plan-eccm-design.md` (what it looks like). This one is where the code
lives, where it runs, under what name, and how it leaves this account when
ECCM has its own. The marks are the same four the other two use: MEASURED
(seen in a file on this disk today), READ (quoted from a document), INFERRED
(concluded from two measured things), GUESSED (reasoning only, and it says so).

## The verdict

**Its own private repository from the first commit, and `eccm.positron.studio`
as the hostname until ECCM has an account and points `eccm.ee` at it.** The
positron repository went public on 2026-09-24 (MEASURED, `LAYOUT.md`), it is
R&D about streaming, and the eccm site will carry another organisation's
editors, content and eventually a subscriber list; none of that belongs in a
public repository of experiments, and a project that is to be handed over needs
a history that is only its own. What positron keeps is the typography demo the
design plan describes, under `demo/eccm/`, and only until the project's first
deploy. The hostname costs one line: positron's workers already attach to
`positron.studio` with `{ "pattern": "<name>.positron.studio", "custom_domain":
true }` (MEASURED in four `wrangler.jsonc` files), so `eccm.positron.studio` is
the same line with a new name, and Cloudflare writes the DNS record and the
certificate. Media goes to `eccm-media.positron.studio` on an R2 bucket the same
way. Staging runs on this account, which is on Workers Paid (INFERRED: `workers/
pub` declares `containers`, and containers need the paid plan), so every limit
the CMS plan worried about is lifted here and the newsletter can even be
trialled; production runs on ECCM's own account on the free plan, exactly as
that plan priced it. The repository carries both as wrangler environments from
day one, so the handover is a change of account id, an export and an import,
and a DNS change, not a rewrite. Half a day of setup before the CMS plan's
session 1, and the handover is the CMS plan's session 5 with a checklist.

## 1. Inside or outside the repository

| option | for | against |
| --- | --- | --- |
| **inside positron, `workers/eccm/`** | the dev server, `shot.mjs`, `which-rule-won.mjs`, the harness, the deploy habit and the standing files come free; one place to look | the repository is **public** since 2026-09-24 (MEASURED, `LAYOUT.md`), so every commit about ECCM's editors, content shape and defects is public the moment it is made; a `git add -A` from a background agent sweeps ECCM's code into a commit about a synthesiser, which this repository has already done twice to its own files (READ, `CLAUDE.md`); the history cannot be handed to ECCM without handing them 400 commits about streaming; `LAYOUT.md`'s rule is one directory per Cloudflare worker for positron's own workers, and this is not one of positron's |
| **its own private repository, `kristjanjansen/eccm`** | a history that is only the project's, transferable to an ECCM organisation in one click; private while it holds anything of theirs; its own `wrangler.jsonc`, its own deploy, its own `README.md` written for the person who inherits it | the tooling has to be copied (`shot.mjs` and the two CSS tools, about 400 lines, with a header naming where they came from); the GitHub account dance applies to it too (READ, `CLAUDE.md`: the personal account is not the active one) |
| **the demo inside positron, the project outside** | the design plan already puts the typography demo at `demo/eccm/` with `unlisted: true`; it is a page, not a site, and positron is where pages are looked at | two copies of `eccm.css` exist for a while, which is the copy rule broken (READ, `LAYOUT.md` rule 3) unless the demo goes dark the day the project deploys |

**Decision: the third row, with the copy priced.** The demo lives in positron
until the project's first deploy to `eccm.positron.studio`, then the
`demo/eccm/` row goes `built: false` and its `one` line says where the page
went. The tokens file moves once, by `git mv` out of one repository and a
commit into the other on the same day, and the positron commit message names
the destination. Nothing of ECCM's (a dump, an editor's address, a subscriber)
ever enters the positron repository, demo included: the demo's `events.json` is
a dozen public titles and dates from the scan.

## 2. The hostname, and why a subdomain of positron.studio is right for now

**There is no domain because there does not need to be one yet.** `eccm.ee` is
ECCM's, it is the production name, and it arrives at cutover on their account.
Before that the site needs a name that a browser trusts, that Access can be put
in front of, that ECCM's people can open on their phones, and that costs
nothing. A subdomain of a zone already on Cloudflare is exactly that.

- **`eccm.positron.studio`**, the site. In the project's `wrangler.jsonc`:
  `"routes": [{ "pattern": "eccm.positron.studio", "custom_domain": true }]`,
  which is byte for byte the shape `items.positron.studio` and
  `pub.positron.studio` use (MEASURED). On the first deploy Cloudflare creates
  the DNS record and issues the certificate; nothing is typed into the DNS
  panel. `workers_dev: true` as well, so the `eccm.<account>.workers.dev` name
  keeps working as a second door, the same reasoning `workers/view` records.
- **`eccm-media.positron.studio`**, the images. An R2 bucket `eccm-media` with
  a custom domain on this zone, which is what `../trip` does with
  `media.trip.dance`; `r2.dev` has no cache and no transformations (READ, trip
  `plans/images.md`). Renditions are then
  `https://eccm-media.positron.studio/cdn-cgi/image/width=800,quality=82,format=auto/<key>`.
  ⚠️ Image Transformations are switched on per zone in the dashboard, and
  whether `positron.studio` has them on is not visible from this disk; it is
  a checkbox and the first thing to look at (section 11).
- **`/edit/` behind Cloudflare Access**, an application on
  `eccm.positron.studio/edit*` in this account's Zero Trust, one-time PIN to
  an allowlist of addresses. ⚠️ Whether this account has a Zero Trust
  organisation set up is not visible from this disk either; if not, it is a
  free one-time setup (50 seats free, READ in the CMS plan §6).
- **The staging name says so.** While the site answers on
  `eccm.positron.studio`, every page carries `<meta name="robots"
  content="noindex">` and an `X-Robots-Tag: noindex` header, and the sitemap
  is not advertised, so Google never learns a copy of ECCM's site under a
  synthesiser's domain. This is trip's dual-run posture (READ, its
  `robots.txt.ts`), and it is one environment variable, `PUBLIC: false`,
  that flips at cutover. The preview-bot allowlist trip needed does not apply
  until somebody shares a staging link and wants a card.
- **What does not move to the subdomain.** Email. Sending from
  `@eccm.positron.studio` would work technically on this paid account but
  reads wrong to a recipient and would have to be re-warmed on `eccm.ee`
  anyway; a test issue to the team's own addresses is fine, a list is not. The
  newsletter goes live from `eccm.ee` in the CMS plan's session 4 or later,
  never from here.
- **After cutover the subdomain stays as a redirect for a year**, `301` to the
  same path on `eccm.ee`, because links to it will exist in ECCM's own
  messages by then.

Two things were considered and set aside. Buying a placeholder domain: money
and a second zone for a name nobody will keep. `staging.eccm.ee`: better than
the subdomain in every way except that it needs ECCM's zone on Cloudflare
first, which is the cutover's own precondition; the day that zone exists, the
staging environment moves to it and `eccm.positron.studio` starts redirecting.

## 3. Whose account, and two environments from day one

| | staging | production |
| --- | --- | --- |
| account | this one, `positron`'s | ECCM's own, created at cutover |
| plan | Workers Paid (INFERRED from `containers` in `workers/pub`) | Workers Free, as the CMS plan §6 prices it, Paid at $5 when the newsletter starts |
| hostname | `eccm.positron.studio` | `eccm.ee`, `www.eccm.ee` |
| media | `eccm-media.positron.studio` | `media.eccm.ee` |
| D1 | `eccm-staging` | `eccm` |
| R2 | `eccm-media-staging` | `eccm-media` |
| Access | this account's Zero Trust, PIN to the team's addresses | theirs, same policy |
| robots | `noindex` | open, sitemap advertised |
| who deploys | this laptop | this laptop until handover, then whoever holds the repository |

`wrangler.jsonc` carries `"env": { "staging": {...}, "production": {...} }`
with `account_id`, the routes and the bindings under each, so `npx wrangler
deploy --env staging` and `--env production` are the only two commands, and
nothing at the top level deploys anywhere by accident. ECCM's `account_id` is
a blank in the file until they have one. Binding names (`DB`, `MEDIA`,
`ASSETS`) are identical in both so the code has no idea which it is on; the
one variable that differs is `PUBLIC`.

⚠️ **The CMS plan's free-plan arithmetic is about production and is
unchanged.** Staging on a paid account proves nothing about whether the site
fits the free plan; what proves that is the request count read off the
dashboard after a week on `eccm.ee`. The plan already says which limit is the
one to watch (100,000 requests a day, failing total).

## 4. The repository's shape

`kristjanjansen/eccm`, private, created empty and pushed from this laptop with
the account dance (`gh auth switch --user kristjanjansen`, push, switch back;
READ, `CLAUDE.md`). No framework, per the answer already given in the CMS
plan: one Worker, server-rendered HTML, a stylesheet, a few hundred lines of
client script for the editor's paste handler, autosave and date picker.

```
eccm/
  README.md              written for the person who inherits it: what runs where, the two commands, the handover list
  CLAUDE.md              twenty lines: the four marks, no em dashes, agents do not commit, the account dance
  wrangler.jsonc         two environments, D1, R2, assets, crons
  package.json           wrangler, and nothing else at first
  migrations/            0001-schema.sql, the eleven tables plus draft; applied with wrangler d1 migrations
  src/
    index.mjs            the router: public routes, /edit, /api, redirects, robots, sitemap, feeds
    render/              page.mjs, event.mjs, list.mjs, article.mjs, feeds.mjs, sitemap.mjs, md.mjs
    edit/                forms, preview, upload, draft PUT, publish
    db.mjs               every query in one file, so a schema change is one diff
    media.mjs            cdn(key, transform), the one function every <img> goes through
    i18n.mjs             the two languages, date formatting in Estonian and English, Europe/Tallinn
  public/
    eccm.css             the tokens and components from the design plan, @layer on line one
    fonts/               the two WOFF2 files, latin plus latin-ext
    logo.svg             the interim redraw, <desc> says so, replaced when the vector arrives
    nan/                 carried over verbatim
  data/
    sample.json          a dozen public events for local development; never a dump
  scripts/
    import.mjs           the dump or the consented scrape into D1; idempotent
    export.mjs           D1 to a dated JSON in R2, also the nightly cron's body
  tools/
    shot.mjs             from positron, header says so; 375 and 1280 against any URL
    which-rule-won.mjs   from positron
    check-html.mjs       from positron
  test/
    render.test.mjs      node:test over the renderers with the sample data, no browser
```

Rules that come with it, each already paid for elsewhere: `.dev.vars` and
`.env` are ignored and the `.env` shadowing of machine OAuth is in the README
(READ, `CLAUDE.md`); the dump, when it arrives, lives in R2 and on one disk and
never in git; `public/` is served by Workers static assets before the Worker
runs, so anything in it is free on the request budget (READ, CMS plan §6) and
must therefore hold nothing personal; the build output pattern positron has,
a committed `workers/view/public/`, is not copied, since here `public/` is the
source.

## 5. Local development

`npx wrangler dev --env staging --local` runs the Worker against a local D1
and a local R2 in Miniflare with no account at all, seeded by `node
scripts/import.mjs data/sample.json` once. The editor works locally with Access
absent: `src/index.mjs` reads `Cf-Access-Authenticated-User-Email` and, when
the request is from `127.0.0.1` and `PUBLIC` is false, accepts a `?as=` address
instead, which is the only development shortcut and is refused on any other
host. `node --test` runs the renderers over the sample in under a second;
`node tools/check-html.mjs` parses what they emit; `node tools/shot.mjs
http://127.0.0.1:8787/et/ 375 1280` is the look before saying anything is
done (READ, `positron-compose` §0). Transformations do not run locally, so
`media.mjs` returns the original's URL when the host is local, which is the
same passthrough trip's Astro config has in dev (READ, trip `plans/images.md`).

## 6. Deploy

`npx wrangler deploy --env staging` from a directory without a `.env`, or with
`env -u CF_API_TOKEN -u CLOUDFLARE_API_TOKEN` in front (READ, `CLAUDE.md`).
First deploy creates the custom domain; D1 migrations are applied first with
`npx wrangler d1 migrations apply eccm-staging --env staging --remote`, and
the README says so in that order because a Worker deployed before its tables
exist answers 500 on every page and looks like a routing bug. No CI at first:
the laptop deploys, the way positron does, and a GitHub Action with a scoped
API token is the first thing to add when a second person deploys.

## 7. What positron keeps, and for how long

- `demo/eccm/` with the typography demo, `unlisted: true`, until the first
  deploy of the project; then `built: false` and a `one` line naming
  `https://eccm.positron.studio/`.
- The three tools stay positron's; the project holds copies with a header, and
  a fix to one is carried to the other by hand, which is the price of two
  repositories and is small because the tools change rarely (MEASURED: all
  three were written today and have not changed since).
- The three plans stay in `plans/` here, since they were asked for here; the
  project's README links them by URL once the positron repository's public
  address is known to the reader.

## 8. The handover, as a checklist

The CMS plan's session 5, made concrete. Every step is reversible until the
last one.

1. ECCM creates a Cloudflare account (free) with an address they own, and adds
   `eccm.ee` as a zone. Cloudflare shows two nameservers. ⚠️ Who holds
   `eccm.ee` at the registrar and who runs its DNS today is unknown (READ, CMS
   plan §12); it is the first question, because the person who can change
   nameservers is the person the cutover waits for.
2. The mail records that exist today (MX, SPF, DKIM for whatever mailbox
   `info@eccm.ee` lives in) are copied into the new zone **before** the
   nameservers change, or their mail stops. A `dig` of the current records is
   the checklist's first artefact.
3. `account_id` for production goes into `wrangler.jsonc`; D1 `eccm` and R2
   `eccm-media` are created there; `wrangler d1 export eccm-staging` on this
   account and `wrangler d1 execute eccm --file` on theirs move the rows; the
   bucket is copied with `rclone` between two S3 remotes (R2 is S3 compatible)
   or Cloudflare's own migration tool, which reads S3 sources; object keys are
   content hashes so nothing in the database changes.
4. `npx wrangler deploy --env production` with `PUBLIC: true`; Access is
   recreated on their Zero Trust with the same allowlist; the editors sign in
   once and see their own rows.
5. Nameservers change at the registrar. Custom domains `eccm.ee` and
   `www.eccm.ee` attach on the next deploy. The old host stays up, untouched,
   for a fortnight of reading logs, then is switched off.
6. `eccm.positron.studio` becomes a `301` to `eccm.ee`, kept a year. The
   staging D1 and bucket are deleted after the first nightly export on
   production has been read back.
7. The GitHub repository is transferred to an ECCM organisation, or ECCM's
   person is added as an owner and the transfer is left for them; either way
   the README is the document they read first, and it was written for them
   from the first commit.

What the handover does not need: any change to the code, any change to the
schema, any re-upload of images by hand, or any URL that changes for a
visitor, because the code never knew which account it was on.

## 9. Secrets, privacy, and what never leaves where it is

- No secrets in the first three sessions: Access does the login, D1 and R2 are
  bindings, and the only credential anywhere is wrangler's OAuth on this
  laptop. FCM for stream items and an email provider, if either comes, arrive
  as `wrangler secret put` and are never in a file.
- The positron repository is public and holds nothing of ECCM's: no dump, no
  address, no export, and the demo's sample is public data. The eccm
  repository is private and holds no dump either; the dump is in R2 under a
  key nobody links and on the disk that imported it.
- Editors' addresses exist in exactly one place, the Access policy, and in
  D1 only as the `updated_by` of a draft, which the export carries and which
  ECCM should know it carries.
- The nightly export is the handover's insurance and also the answer to
  *"what if this account disappears"*: it is a JSON of every table in a bucket
  ECCM can be given a token to, from the first week on staging.

## 10. Cost and order

| step | takes | lands |
| --- | --- | --- |
| **session 0, half a day** | the repository, the two environments, D1 and R2 on staging, the custom domains, the Access application, the sample data, the tools copied, the README | `https://eccm.positron.studio/` answering a rendered page from D1, `/edit/` asking for a PIN, an image served through a transformation |
| the CMS plan's sessions 1 to 4 | unchanged | on `eccm.positron.studio` rather than on `workers.dev`, which is the one line of that plan this one changes |
| the CMS plan's session 5 | unchanged in length, now with the list above | `eccm.ee` |

## 11. What could not be settled from this disk, and what would settle it

| open | why | what settles it |
| --- | --- | --- |
| whether this account is on Workers Paid | INFERRED from `containers`, not read from a bill | the dashboard's plan page, one look |
| whether Image Transformations are enabled on the `positron.studio` zone | a per-zone checkbox, not in any file | the zone's Images page; if off, switching it on is the same click |
| whether this account has a Zero Trust organisation | not in any file | the Zero Trust dashboard; free to create |
| whether an R2 custom domain on a subdomain of this zone needs anything beyond the bucket setting | trip did it on its own apex zone | the first bucket; the dashboard says in a minute |
| who holds `eccm.ee` at the registrar and who runs its DNS and mail | not visible from outside | one question to ECCM, before session 5 is scheduled |
| whether ECCM wants its own Cloudflare account or wants positron to run it | not asked | the same conversation; the plan assumes their own, because a site should outlive its builder's account |
| whether a GitHub organisation exists for ECCM to receive the repository | not asked | ask at handover; adding an owner is the fallback |
| the `wrangler` version and whether `env`-scoped `routes` with `custom_domain` behave as the top-level ones do | positron uses top-level routes only (MEASURED) | the first staging deploy, and the deploy log names the domain it attached |

The one thing to do first is the same as the CMS plan's: ask ECCM for the
dump, and in the same message ask who runs `eccm.ee`'s DNS.
