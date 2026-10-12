# Announce (concept misc/000), archived 2026-10-12

Asked: *"archve/md misc 000 and 010"*. The page is gone from the site and from
the tree. Its last version is `demo/concepts/misc/000/index.html` in commit
`3dde7d74` (`git show 3dde7d74:demo/concepts/misc/000/index.html`), 147 lines,
one file. It was the first concept page: born as `demo/concepts/1/` in
`e329be87` (2026-10-09), then `010`, `001`, `090`, `bay/000`, and `misc/000`
from 2026-10-11 (`git log --follow` walks all of it). Card: *"Every port the
studio room can hear."*

## What it showed

One button, **Connect to Pi**, and one table: every port announced in the
patchbay room, with Cloudflare services drawn under them. Nothing joined on
load; the press joined `roomFor({ slug: 'patchbay' })` as a fresh
`randomSite('web')` and then the table filled as graphs arrived.

The tab announced itself like any patchbay tab: site kind `browser`, nodes
`keys` and `screen`, ports `keys:midi-out`, `screen:audio-in`,
`screen:video-in`.

## The port table

This is the table the `positron-concepts` skill tells later pages to copy.

| column | key | width | what |
| --- | --- | --- | --- |
| (no header) | `state` | 16 | live dot, `.pos-pres-dot`, `var(--ok)` live, empty ring `cc-ring` in `var(--dim2)` stale |
| port | `id` | grow, `hi`, `clip` | simulated `<site>:<node>:<medium>-<dir>`, `-2` for a second of the same |
| who | `who` | 120 | `you`, `Raspberry Pi`, `browser ab12`, or a site's own `label` |
| dir | `dir` | 48 | `→○` in, `○→` out |
| medium | `medium` | 72 | coloured by `md-<medium>` |
| transport | `by` | 120 | `transports` joined with `, ` |

- **who** read the site's `kind` and `label` (`plans/plan-site-names.md` §3),
  with a guess from `place` for a site that said neither (a `studio*` place is
  a board). Every tab is labelled `browser`, so its four letters were shown.
  "you" was decided by comparing with the page's own `SITE`, never sent.
- **Rows sorted** you first, then the board, then everyone else, by who and id.
- **The live dot trap**: in a table cell the dot needs
  `.pos-tbl-c .pos-pres-dot { display: inline-block; vertical-align: middle; }`,
  or it draws as thin lines. The swap only touched body cells reading `live`
  or `stale`, so the header stayed empty.
- **Medium colours**, defined on `:root` on this page first and copied by
  room/000, room/040, synth/000 to synth/030 and device/000: midi `#6fb8e8`,
  audio `#ee9a4d`, clock `#c9ced6`, value `#9ad16b`, video `#e07a5f` (coral),
  program `#c39af0`, file `#d68fc6` (orchid), state `#8a9fc4`.

## Simulated Cloudflare rows

`plans/plan-site-names.md` §4d: Cloudflare services as sites. Nothing on
Cloudflare announces, so these were drawn and never sent, with a blank live
cell:

    cf-stream:main:video-in       WHIP
    cf-stream:main:video-out      WHEP
    cf-stream:main:video-out-2    LL-HLS
    cf-moq:main:video-in          MoQ
    cf-moq:main:video-out         MoQ
    cf-container:main:video-in    RTMP
    cf-container:main:video-out   LL-HLS
    cf-r2:main:audio-in           HTTPS
    cf-r2:main:audio-out          HTTPS

## How it was built

`/concepts/nav.mjs` (`conceptNav`), `shell.mjs` (`mount`), `table.mjs`,
`button-group.mjs`, and `bay-node.mjs` (`createBayNode`, `roomFor`,
`randomSite`; `node.registry.merged()` gave nodes, ports and sites).

## What it taught

- **studio-1 was the room and the Pi named its site after it**, which is why
  nothing on the page said "this is the Pi" until sites carried `kind` and
  `label`. That gap is what prompted §3 of `plans/plan-site-names.md`.
- Port names as `<medium>-<dir>` (§4c) were tried here first on screen, with
  the real id kept on hover.
