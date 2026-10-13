# Web presence names for positron.studio, 2026-10-13

Research only. Nothing was registered, claimed or logged in to. A handful of
anonymous requests per platform, measured 2026-10-13 from this laptop.

## Separator rules per platform

| platform | allowed | cannot hold |
| --- | --- | --- |
| GitHub user/org | letters, digits, single hyphens, max 39 | `.` (github.com/positron.studio answers 406), `_` |
| npm package | lowercase, `-` `.` `_` (not leading `.`/`_`) | nothing in this list |
| npm scope (`@x`) | it is an npm user or org name | `@positron.studio`, `@positron_studio` not tested |
| skills.sh | no names of its own: `/<github-owner>/<repo>/<skill>` | follows GitHub |
| X | letters, digits, `_`, 4 to 15 chars | `-`, `.` |
| Mastodon | letters, digits, `_` | `-`, `.` |
| Instagram, Threads | letters, digits, `.`, `_` (Threads reuses the Instagram name) | `-` |
| TikTok | letters, digits, `.`, `_` | `-` |
| YouTube `@handle` | letters, digits, `.`, `_`, `-`, 3 to 30 | nothing in this list |
| LinkedIn company | letters, digits, `-` | `.`, `_` (from LinkedIn's rules, not tested) |
| Bluesky | a domain name. `x.bsky.social` labels take `-` | `_`. The owner's own domain `positron.studio` works as a handle |

## The table

FREE means the platform answered "not found". A 404 can still be a held or
reserved name, which only an attempt to register would tell.

| name | GitHub | npm package | npm scope | X | Mastodon | Bluesky | YouTube | Instagram | Threads | TikTok | LinkedIn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| positron | TAKEN (user Philip Jagielski, 2008) | TAKEN (QuorraJS framework, 1.1.0, 2022) | TAKEN (@positron, Laravel Elixir packages) | TAKEN ("Mositron") | TAKEN (7 posts, last 2022) | TAKEN (positron.bsky.social, 0 posts) | FREE (404) | INCONCLUSIVE | INCONCLUSIVE | TAKEN (980 followers) | TAKEN (301 to Positron Power Division) |
| positronstudio | TAKEN (org 2016, one repo pushed 2020) | FREE (404) | TAKEN (scope exists, 0 packages) | FREE (404 page) | FREE (404) | FREE (unresolved) | TAKEN ("Positron Studio" channel) | INCONCLUSIVE | INCONCLUSIVE | FREE likely (no user, statusCode 10221) | FREE (404) |
| positron-studio | **FREE (404)** | **FREE (404)** | **FREE ("Scope not found", 404)** | NOT ALLOWED | NOT ALLOWED | FREE (unresolved) | **FREE (404)** | NOT ALLOWED | NOT ALLOWED | NOT ALLOWED | **FREE (404)** |
| positron.studio | NOT ALLOWED (406) | FREE (404) | not tested | NOT ALLOWED | NOT ALLOWED | **FREE as a domain handle (unresolved)** | FREE (404) | INCONCLUSIVE | INCONCLUSIVE | FREE likely (10221) | NOT ALLOWED |
| positron_studio | NOT ALLOWED | FREE (404) | not tested | FREE (404 page) | FREE (404) | NOT ALLOWED | FREE (404) | INCONCLUSIVE | INCONCLUSIVE | FREE likely (10221) | NOT ALLOWED |
| positron-studios | FREE (404) | FREE (404) | not tested | NOT ALLOWED | NOT ALLOWED | not tested | not tested | NOT ALLOWED | NOT ALLOWED | NOT ALLOWED | TAKEN (200) |
| positronstudios | FREE (404) | FREE (404) | not tested | FREE (404 page) | not tested | not tested | not tested | not tested | not tested | not tested | not tested |
| getpositron | TAKEN (org 2025, 0 repos) | FREE (404) | | | | | | | | | |
| positronhq | FREE (404) | FREE (404) | | TAKEN ("Positron") | | | | | | | |
| positron-lab | TAKEN (user Positron-lab, 2025) | FREE (404) | | | | | | | | | |
| positronlabs | TAKEN (org "Positronics", 2025, 4 repos) | FREE (404) | | | | | | | | | |

Evidence notes:
- GitHub: `curl -w %{http_code} https://github.com/<name>` and `gh api users/<name>`.
- npm: `registry.npmjs.org/<name>` for packages; scopes through
  `registry.npmjs.org/-/org/<scope>/package`: `@positron` lists packages,
  `@positronstudio` answers `{}` 200 (the account exists, empty),
  `@positron-studio` answers `Scope not found` 404. npmjs.com itself answers 403
  to curl.
- npm similarity rule: a new name is refused when it equals an existing one once
  punctuation is stripped. None of `positronstudio`, `positron-studio`,
  `positron.studio`, `positron_studio` exists, so whichever is published first
  locks out the other three. Publishing `positron-studio` reserves all four.
- X: the page title is real to anonymous curl: `Mositron (@positron) / X`
  against `User Profile Not Found - X | 404 Error`.
- Mastodon: `mastodon.social/api/v1/accounts/lookup?acct=<name>`.
- Bluesky: `com.atproto.identity.resolveHandle`. `positron.studio` does not
  resolve yet, and claiming it needs only a `_atproto.positron.studio` TXT record
  in Cloudflare DNS or `/.well-known/atproto-did` on the site.
- YouTube: 404 or 200 with a consent cookie; `@positronstudio` is titled
  `Positron Studio - YouTube`.
- Instagram and Threads: both show a login wall to anonymous requests, and
  Instagram's profile endpoint answered 401 "Please wait a few minutes".
  INCONCLUSIVE for every name. Needs a logged-in look.
- TikTok: `positron` returns a user object; the rest return no user and
  `statusCode 10221`. The meaning of that code is not documented, so "likely".
- LinkedIn: `/company/positron` 301s to `positronpowerdivision`; 404 for
  `positronstudio` and `positron-studio`; 200 for `positron-studios`.

## Domains, context only

| domain | state |
| --- | --- |
| positron.studio | owned, Cloudflare NS |
| positronstudio.com | not registered (whois `No match`, no DNS) |
| positron-studio.com | not registered (whois `No match`, no DNS) |
| positron.dev | registered, resolves (A 2.189.243.246, NS arvancdn.ir) |

## Collisions with existing Positrons

- **Posit's Positron IDE**, `posit-dev/positron` on GitHub (4,293 stars). It owns
  the word in developer search.
- **skills.sh is the sharp one.** It names publishers by GitHub owner and repo
  (`/posit-dev/positron/<skill>`, installed as `npx skills add owner/repo`).
  Its search for `positron` returned 54 skills, **42 of them from
  `posit-dev/positron`**, many named `positron-*` (`positron-qa-verify`,
  `positron-pr-helper`, `positron-e2e-tests`, ...). That is the same prefix this
  repository uses for its skills (`positron-verify`, `positron-ui`, ...). No
  technical clash, because every id is namespaced by owner and repo, but a
  `positron-verify` beside Posit's `positron-qa-verify` will read as one family.
  `/positron` and `/positron-studio` on skills.sh are 404 today.
- npm `positron` is the dormant QuorraJS framework; `@positron` is somebody's
  Laravel Elixir scope.
- X `@positronhq` and LinkedIn `positron` are other companies (Positron Power
  Division on LinkedIn; Positron on X).

## Recommendation

No single string is free everywhere: dashes are illegal on X, Mastodon,
Instagram, Threads and TikTok, and `positronstudio` is already taken on GitHub,
the npm scope and YouTube. So use two spellings of one name, plus the domain:

| platform | handle |
| --- | --- |
| GitHub org | `positron-studio` |
| npm | scope `@positron-studio`, and publish (or hold) unscoped `positron-studio`, which by npm's similarity rule also blocks `positronstudio`, `positron.studio`, `positron_studio` |
| skills.sh | follows GitHub: `positron-studio/<repo>`, e.g. `npx skills add positron-studio/skills` |
| YouTube | `@positron-studio` |
| LinkedIn | `company/positron-studio` |
| Bluesky | `@positron.studio` (domain handle, the strongest of all, because it proves ownership) |
| X | `@positronstudio` |
| Mastodon | `@positronstudio@mastodon.social` |
| TikTok | `@positronstudio` (likely free) |
| Instagram, Threads | `positronstudio` if free, else `positron.studio` (both INCONCLUSIVE) |

Why: `positron-studio` is free on every platform that allows a dash, and it reads
the same as the domain. `positronstudio` is the dashless form of the same words
and is free on every dashless platform that could be checked. Underscore forms
are free but add a third spelling for no gain. Plain `positron` is gone almost
everywhere and would sit under Posit's IDE in every search. Consider renaming the
skills away from a bare `positron-` prefix, or relying on the
`positron-studio/` owner prefix to separate them from Posit's 42.

What a reading cannot settle: a 404 does not prove a name is registrable
(GitHub holds recently deleted names, YouTube and LinkedIn reserve some), and
Instagram, Threads and TikTok need a logged-in look.
