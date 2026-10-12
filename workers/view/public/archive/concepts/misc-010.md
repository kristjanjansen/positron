# Mirror (concept misc/010), archived 2026-10-12

Asked: *"archve/md misc 000 and 010"*. The page is gone from the site and from
the tree. Its last version is `demo/concepts/misc/010/index.html` in commit
`3dde7d74` (`git show 3dde7d74:demo/concepts/misc/010/index.html`), 85 lines,
one file. It was the second concept page: born as `demo/concepts/2/` in
`e329be87` (2026-10-09), then `020`, `002`, `091`, `bay/010`, and `misc/010`
from 2026-10-11. Card: *"The mirror demo as the patchbay sees it."*

## What it showed

`/mirror/` read as patchbay ports and links, from `demo/mirror/index.html`
(`SELF`, `linkIn` and every `send()`). Three static tables, nothing joined a
room. Port names shown as `<medium>-<dir>`, one node per pane
(`plans/plan-site-names.md` §4c), the announced id on hover. Same columns as
misc/000's port table without the live dot.

**ANNOUNCED**

| port | announced as | who | dir | medium | transport |
| --- | --- | --- | --- | --- | --- |
| `web:webgl:program-out` | `web-xxxx:webgl:program` | you | out | program | |
| `web:right:video-in` | `web-xxxx:screen:video`, the right pane | you | in | video | |
| `pi-1:gpu:program-in` | same | Raspberry Pi | in | program | |
| `pi-1:gpu:video-out` | same | Raspberry Pi | out | video | relay-h264 |
| `web:webgl:video-out` | `web-xxxx:webgl:video`, the own render | you | out | video | page |
| `web:left:video-in` | `web-xxxx:left:video`, the left pane | you | in | video | page |

**LINKS**

    web:webgl:program-out -> pi-1:gpu:program-in     opened by the page itself
    pi-1:gpu:video-out -> web:right:video-in         opened by the video opener
    web:webgl:video-out -> web:left:video-in         page, nothing crosses a wire

**MISSING**: what the page does that no port describes.

| port | why | who | dir | medium |
| --- | --- | --- | --- | --- |
| `web:knobs:value-out` | not announced: `video.params`, the knob values | you | out | value |
| `pi-1:gpu:value-in` | not announced: the Pi takes `video.params` | Raspberry Pi | in | value |

## How it was built

`/concepts/nav.mjs`, `shell.mjs` (`mount`, `d.stack.titled`) and `table.mjs`.
Medium colours copied from misc/000.

## What it taught

- **A page can do things the bay does not see.** The mirror's knob values
  went to the Pi as `video.params` sends with no port standing for them, so
  the MISSING table was the to do list for announcing them as a `value` link.
- The Pi announced its rows exactly as shown from 2026-10-10; the page's own
  rows stayed simulated.
