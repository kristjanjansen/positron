# Kit lessons: nodes.mjs, nodes-test.mjs

The long comments cut from `demo/shell/nodes.mjs` and `demo/shell/nodes-test.mjs`, moved here verbatim. Each heading names the file and the block, and the code points at it with `// why: lessons/kit-nodes.md#<anchor>`.

<a id="header"></a>

## nodes.mjs, file header

demo/shell/nodes.mjs: the one catalogue of the node TYPES the site's own
pages build in a browser tab, read off every concept page's addNode and
addPort on 2026-10-14 (plans/plan-node-catalogue.md, step 1). Pure and import
free, so a test and the build can read it.

Left out on purpose: the Pi side (`boardGraph()` in graph-registry.mjs), and
cf-relay, which patchbay.mjs draws from a link's transport. The other hops
(cf-shout, cf-stream, cf-moq) are entries, each on its fixed site.

An entry's key is the catalogue NAME. `node` is the id's second segment when
it is not the name (three different things are called `shader` on three
pages), and `site` is the id's first segment when it is not the page's.
No name may look like an instance another entry matches (`knob-mix` would
be a knob called mix), so the test refuses one and typeOf will not guess.
A port's key is its name; `dir` and `medium` come from it (`value-in-2` is
value, in) unless the port says otherwise (`cutoff-in` is audio).
`optional` ports are added only when a page passes a deliver or an override
for them. `variants` are port fields a page asks for by name
(`{ name: 'keys', variant: 'cc' }`). `pages` are the pages that build the
type today, `labels` the pages that label it something other than `label`.
`match` names a per-instance id a page may pass as a plain string
(`knob-cutoff`), and `instance` says in words how an instance is named.

THE ORDER RULE (decided 2026-10-14): a node's ports come together with the
node, in the entry's port order, so bay.ports() lists node by node and the
details table's rows and the SVG's elements follow. A port added later to a
node that already exists (addPorts) lands after every port added before it.

<a id="player-was-radio"></a>

## nodes.mjs, player

`radio` until 2026-10-14: the grain pages and landscape ask `{ name: 'player', as: 'radio' }`.

<a id="grains-was-granulator"></a>

## nodes.mjs, grains

`granulator` until 2026-10-14: landscape asks `{ name: 'grains', as: 'granulator' }` and
keeps the word granulator (asked 2026-10-13: *"no grains mentions"*).

<a id="tempo-was-bpm"></a>

## nodes.mjs, tempo

`bpm` until 2026-10-14: radio/rig.mjs asks `{ name: 'tempo', as: 'bpm' }`.

<a id="test-header"></a>

## nodes-test.mjs, file header

demo/shell/nodes-test.mjs: the node catalogue (nodes.mjs) against bay.mjs,
with no browser.

  node demo/shell/nodes-test.mjs

What is graded: every entry's kind and ports are legal for bay.mjs, names
are unique in the source and never read as another entry's instance,
addNodes builds a bay bay.mjs links through (port order, portLabel,
variants), addPorts and relabel, the merges and kinds of 2026-10-14 and one
default label per type, and every page an entry names is on disk. Lines marked
NEGATIVE CONTROL must refuse something, so a check that cannot fail is caught.

<a id="test-merges"></a>

## nodes-test.mjs, merges

── merges (2026-10-14): one name per thing, and the pages keep their ids ──
