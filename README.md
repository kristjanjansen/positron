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
Clone https://github.com/kristjanjansen/positron, then read
positron/.claude/skills/positron-start/SKILL.md and follow it exactly.
Run the commands yourself rather than asking me to.

I want to build something like its stage demo.
```

Change the last line to whatever you want. Some examples that work:

```
I want to build something like its stage demo.
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

Checked against Cloudflare's own pricing pages on 2026-09-24, and they do change.

**Free, and enough for most of this site:**

- **Workers** with static assets. Serving the pages costs nothing and static
  asset requests are unlimited on both plans.
- **Durable Objects**, which is what makes the shared rooms, the cue firing and
  the message history work. These are on the free plan as long as they use the
  SQLite storage backend, which is the only kind you can create new anyway.
- **R2** object storage, for recordings and archives: 10 GB stored per month,
  1 million writes, 10 million reads, and **no charge for bandwidth out**.

**Costs money, and the agent will say so before it touches either:**

- **Cloudflare Stream**, for the live video demos. It is prepaid at **$5 per
  month per 1,000 minutes stored**, plus **$1 per 1,000 minutes delivered**.
  There is no free tier. If you skip this, the live pages are the only ones that
  do not work.
- **Containers**, which this repo uses to run ffmpeg next to a Worker. Included
  in the **$5 per month Workers Paid plan**, and not available at all on free.

So: a working site of your own for nothing, or roughly **$5 to $10 a month** if
you want live video in it too. Nothing here needs a server.

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
