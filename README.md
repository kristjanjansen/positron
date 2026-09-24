# positron

Media art experiments that run in a browser, deployed on Cloudflare.
Live at **[positron.studio](https://positron.studio)**.

Timelines, live video, a granular radio, WebMIDI panels for hardware on a desk,
a Raspberry Pi playing a synthesizer in another building, and a pile of
measurements about what streaming actually costs in milliseconds. It is R&D
rather than a product. Every page is one HTML file you can open and read.

---

## Build one like it

Paste this into **Claude Code** or **Codex** (or any coding agent that can run
commands on your machine):

```
Fetch and execute the appropriate instructions to set me up for Cloudflare from
https://developers.cloudflare.com/agent-setup/prompt.md

Then read https://raw.githubusercontent.com/kristjanjansen/positron/main/.claude/skills/positron-start/SKILL.md
and follow it exactly. Run every command yourself rather than asking me to.

I want to build something like the stage demo at https://positron.studio/stage/.
```

The first line is Cloudflare's own, from their setup page. It is in the prompt
rather than buried in the file below it because it installs the Cloudflare
tooling into your agent, and an instruction two hops deep is one that gets
skipped. The file below asks for it again and moves on if it has already
happened.

**Nothing is installed to read that.** It is one public file over the web, so the
agent can open it whether or not you have git, and the file itself works out
what your machine is missing before anything is created.

Change the last line to whatever you want. Some examples that work:

```
I want to build something like the stage demo.
I want a page that plays my own archive recordings on a timeline.
I want the radio one, but pointed at a different station.
I want to start with nothing and just get one page deployed.
```

**You do not need to be a developer.** The agent checks your machine and your
Cloudflare account first, tells you in plain words if something is missing, and
does not create anything until you have said yes to what it costs.

> The instructions live in one file and are read two ways: Claude Code picks up
> `.claude/skills/` automatically in any clone, and any other agent can simply be
> told to read that path. One source, two doors, so the two cannot drift apart.

---

## What it will check before it builds anything

| gate | why it matters |
| --- | --- |
| Your operating system | macOS is what this is developed on. Linux is fine. Windows needs WSL, and the agent will say so rather than half-working. |
| **node** | Everything here is plain ES modules run by node. No build step, no framework, no bundler. |
| **wrangler** | Cloudflare's command line tool. It deploys, and it is what proves you are logged in. |
| A **Cloudflare account** | Free to create. The agent will not make one for you, because it needs your email and your password. |
| Being **logged in** | `wrangler login` opens a browser once. The agent prefers this over an API token, and the skill explains why. |
| **Free or paid plan** | Most of this runs on the free plan. Two things do not. See below. |
| A **domain** | Optional, and preferred. See below. |

---

## What it costs

🔴 **NO PRICES ARE WRITTEN DOWN HERE, ON PURPOSE.** Cloudflare's change, this
file does not, and a stale price in a page somebody makes a spending decision
from is worse than no price at all. **The agent reads the current numbers off
Cloudflare's own pricing pages and tells you what today's answer is**, before it
creates anything that costs money. What is below is the SHAPE, which moves much
more slowly, and even that was last checked on **2026-09-24**.

**On the free plan, and enough for most of this site:**

- **Workers** with static assets. Serving the pages costs nothing, and static
  asset requests are free and unlimited on both plans.
- **Durable Objects**, which is what makes the shared rooms, the cue firing and
  the message history work. Free plan, with the SQLite storage backend, which is
  the only kind you can create new anyway.
- **R2** object storage, for recordings and archives. It has a monthly free
  allowance and, notably, **no charge for bandwidth out at all**.

**Costs money, and the agent says the current number before it touches either:**

- **Cloudflare Stream**, for the live video demos. Prepaid storage plus a
  per-minute-delivered charge, and **no free tier**. Skip it and the live pages
  are the only ones that do not work.
- **Containers**, which this repo uses to run ffmpeg next to a Worker. Included
  in the Workers Paid plan and **not available on free at all**.

So: a working site of your own for nothing, or a small monthly bill if you want
live video in it too. Nothing here needs a server.

The pages the agent reads, and you can too:

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), which also covers Containers
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Stream pricing](https://developers.cloudflare.com/stream/pricing/)
- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)

---

## Why a domain is preferred

You can deploy to `something.your-name.workers.dev` and it works. A domain is
better for four reasons, and the first two are the ones this repo learned the
hard way.

**1. A worker's free hostname contains its script name, so renaming the worker
changes the public address.** This site's worker is still called
`elektron-view`, two renames after the project stopped being called elektron,
because renaming a Worker script creates a NEW one and abandons the Durable
Object holding its state. On `workers.dev` that fossil would be in the URL
everybody types. On a domain the public identity is `positron.studio` and the
script name is an internal handle nobody sees.

**2. Related services want to live together.** This site runs four names on one
domain: the site itself, `pub.` for the device log a phone posts to, `rtc.` for
the signalling relay, and `selfrec.` for the recorder. On `workers.dev` those
are four unrelated strings that happen to share an account.

**3. `workers.dev` is on the Public Suffix List**, so every subdomain under it is
treated as a separate site by browsers. That is deliberate and good for
isolation, and it means a family of pages cannot share anything at the domain
level.

**4. A link is something you hand to a person.** This project has a standing
rule that finished work is handed over as a URL somebody can click, and
`positron.studio/stage/` is a thing you can say out loud, print on a wall, or put
in a QR code beside an installation. `elektron-view.kristjan-jansen.workers.dev`
is not.

⚠️ There is a fifth reason often given, that some corporate and school networks
block `*.workers.dev` wholesale because it is shared hosting. That is **reported
rather than measured here**, so treat it as a risk and not as a fact.

Cloudflare's own registrar sells domains at cost, and a domain you register
there is already on the account the agent is deploying to, which removes the
only fiddly step.

---

## What is in here

| directory | what it holds |
| --- | --- |
| `demo/<slug>/index.html` | one page per experiment, deployed at `/<slug>/`. Each one is a single readable file. |
| `demo/manifest.mjs` | the one list of what exists. Both index renderers read it, so there is no second place to forget a row. |
| `demo/shell/` | the kit: controls, readouts, tables, sliders, transport bars, the timeline strip. |
| `timeline/` | the timeline itself: transport, score, nested clips, media sync. |
| `workers/` | the Cloudflare Workers, one directory each. |
| `rig/` | the hardware side: the Raspberry Pi, MIDI capture, audio capture. |
| `.claude/skills/` | the rules, by the kind of work being done. |
| `CLAUDE.md` | how this project is worked on, and what it cost to learn each rule. |
| `plans/`, `research/`, `LESSONS.md`, `PROGRESS.md` | what was decided, what was measured, and when. |

Run it locally with `node demo/server.mjs` and open the address it prints.
There is no install step and no dependencies to fetch.

---

## Licence

**MIT** for the code written here, in `LICENSE`.

Two things it does not cover, and `NOTICE.md` is the index of them with a
pointer to each licence text in the tree:

- **`demo/grains/` and `demo/patch/` are AGPL-3.0-or-later**, because they run
  scsynth on Sam Aaron's SuperSonic clockwork. AGPL is the licence where serving
  something over a network counts as distributing it, which is why this
  repository being public is what satisfies the obligation rather than what
  creates it.
- **The recordings, films and archive material are not mine to licence.** Every
  row carries its holder in `demo/resources/corpus.json`. Reuse is a question
  for the holder.

Every vendored thing already arrived with its own `LICENSE-*` file beside it.
Those files are the authority; `NOTICE.md` is a table of contents.
