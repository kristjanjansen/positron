# plan: a node says only what the bay reads

2026-10-10. Asked: shrink the bay's node `kind`. The owner's view is that
`device`, `engine`, `person` and `screen` give nothing for UI, and the proposal
on the table is two booleans, `store: true` and `external: true`, keeping only
the meanings the bay uses. Nothing in this plan is built. This is a spec.

Every file:line below was READ on 2026-10-10 at `6c70db5` plus the uncommitted
concepts work in the tree. Claims marked INFERENCE were reasoned from code and
not run.

## 0. The answer in five lines

1. `store` is read by the bay (`bay.mjs:905`, `:1304`) and by the openers
   (`openers.mjs:136`, `:139`, `:140`). It needs a flag.
2. `external` already HAS a flag: `consent: true` is a node field today
   (`bay.mjs:862`, `:876`) and is the only thing `validate` reads (`:1034`).
   A second boolean `external` would be two fields that must agree.
3. 🔴 **`engine` IS READ, AND THE BRIEF SAID IT WAS NOT.** `openers.mjs:133`
   to `:137` pick `notes` over `keys` and `synth` over `listen` on
   `kind === 'engine'`, and `partitur/score.mjs:301` does the same for its
   sirens. Removing it silently turns a link into the board's synth into raw
   MIDI through the gate. It needs a replacement (§3).
4. `device`, `person`, `screen` and `endpoint` are read by nothing that decides
   anything. They are read by tests, by page self-checks, and by one colour
   table on `/patchbay/` (§5).
5. Recommended shape: `{ id, label, place, net, store?, consent?, synth? }`,
   with `addNode` deriving the three flags from a legacy `kind` so an old Pi,
   the deployed store worker and a flashed Pico keep working untouched (§4).

## 1. Out of scope, and why it is a different field

| field | where | what it is |
| --- | --- | --- |
| site `kind` | `graph-registry.mjs:30` `SITE_KINDS = ['board','browser','store','node','mac','service']`, checked at `:136`, passed through at `:200` | what a SITE is, `plans/plan-site-names.md` §3. Stays. ⚠️ It also has a `store` value, so `kind: 'store'` means two things in one graph today (`workers/store/src/graph.js:13` site `service`, `:14` node `store`) |
| diagram box `kind` | `diagram.mjs:224` `HUELESS_KINDS`, `:228` `MACHINE_KINDS = ['here','cloud','device']`, `:539`, `:645`, `:2086`, `:2364` | how a BOX is drawn. Every `kind: 'device'` in `weight`, `radio`, `wish`, `kit/diagram`, `knobs:2305`, `mirror:2469`, `nola:4740`, `grains:267`, `fau:1232`, `diagram-test` is this one. Stays |
| `place` | `bay.mjs:882` `placeOf`, read by `whereOf` `:900` | the machine, which picks machine vs network vs internet and so the transport. Stays |
| message `kind` | `midi-kinds.mjs`, `openers` handle `.kind`, timeline rows | unrelated |

## 2. Every reader of node `kind`

Grep: `\.kind\b` over `demo rig workers/store/src workers/relay/src`, excluding
`workers/view/public`, `archive/`, `node_modules`, then filtered by hand to
node objects. VERIFIED by reading each line.

### 2a. Readers that decide something

| file:line | reads | decides | after the change |
| --- | --- | --- | --- |
| `demo/shell/bay.mjs:872` | `NODE_KINDS.includes(n.kind)` | throws on any other value | drop the throw (§4) |
| `demo/shell/bay.mjs:876` | `kind === 'external'` | forces `consent: true` | legacy derivation only |
| `demo/shell/bay.mjs:905` | `?.kind !== 'store'` | a link into a store is not an internet receiver (`internet-many` vs `-one`) | `!…?.store` |
| `demo/shell/bay.mjs:1304` | `?.kind === 'store'` both ends | recording rides `file`/`ingest`, playback rides `READS` | `?.store` |
| `demo/shell/openers.mjs:118` | `kindOfNode = b.node(…)?.kind` | feeds `:133` to `:140` | read flags |
| `demo/shell/openers.mjs:133,134` | `!== 'engine'` / `=== 'engine'` | `keys` (`midi.send` through the gate, `:425`) vs `notes` (`note.on`, `:423`) | `synth` flag |
| `demo/shell/openers.mjs:135,137` | `engine` | `listen` vs `synth` (`audio.start` on the board, `:223`) | `synth` flag |
| `demo/shell/openers.mjs:136,139,140` | `store` | `listen` refuses a store, `record`, `play` | `store` flag |
| `demo/partitur/score.mjs:301` | `?.kind === 'engine'` | sirens send `note.on` vs raw MIDI | `synth` flag |
| `demo/patchbay/index.html:231,247` | `TECH[n.kind]` | the HUE of a box on the live diagram | §5 |

⚠️ `openers.mjs` is imported by `away`, `patchbay`, `knobs`, `mirror`,
`midi-node.mjs` and `link-options.mjs` (grep `openers.mjs`), so the `engine`
read reaches six callers.

### 2b. Readers that only check (self-checks and tests)

These do not change behaviour, but every one is an assert whose COUNT moves or
goes red if the writers change and they do not.

| file:line | asserts |
| --- | --- |
| `demo/shell/midi-node.mjs:388` | page assert: the patchbay hears this machine's instruments `n.kind === 'device'`, 2 of them |
| `demo/nola/index.html:4672` | page assert: 2 nodes `kind === 'device'` |
| `demo/fau/index.html:2169` | page assert: 2 nodes `kind === 'device'` |
| `demo/collide/engine-node.mjs:281` | page assert: `eng?.kind === 'engine'` |
| `demo/muta/engine-node.mjs:281` | same, copy of collide |
| `demo/fau/engine-node-test.mjs:68,99` | `nodes[0].kind === 'engine'`, 2 `device` |
| `demo/shell/midi-graph-test.mjs:143` | every node `device` |
| `demo/shell/graph-registry-test.mjs:63,75,86,105` | boardGraph: synth and yoshimi `engine`, gpu `engine`, circuit `device`, digitakt `device` |
| `demo/shell/bay-test.mjs:948` | `node('studio-1:circuit')?.kind === 'device'` |
| `demo/shell/bay-test.mjs:951` | `NODE_KINDS.join(',') === 'device,engine,endpoint,store,external,screen,person'` |
| `demo/shell/bay-test.mjs:953-956` | NEGATIVE CONTROL: `kind: 'toaster'` throws, message names `external` |
| `demo/shell/bay-test.mjs:867` | NEGATIVE CONTROL: `kind: 'external', consent: false` still gives `consent === true` |
| `demo/shell/bay-test.mjs:979,1028,1085` | write `kind: 'store'`, then assert `ingest`/`https`/`r2-hls` and the receiver count (sections L, N, the restricted source) |

⚠️ `midi-node.mjs:388`, `nola`, `fau`, `collide`, `muta` read
`registry.merged()` nodes, the RAW graph, not a bay node. A derivation inside
`addNode` does not reach them. They change in the same commit as their writer.

## 3. `engine` is load-bearing, and what to replace it with

What the openers actually mean by `engine`: **a sound the board starts with
`audio.start` and plays with `note.on` in its main room** (`openers.mjs:216`
to `:224`, `:419` to `:425`; `graph-registry.mjs:89` says the same). The only
nodes for which that is true are boardGraph's instruments (`graph-registry.mjs:88`).

The other `engine` nodes do not reach those branches, by reading, not by run:
the GPU (`:96`) has a `program` in port and a `video` out, and the openers
check `medium === 'midi'`/`'audio'` first; the browser engines
(`fau/engine-node.mjs:110`, `collide`/`muta` `:137`) declare no `address` on
their ports (grep `address` in `fau/engine-node.mjs`: none), and `!!z.address`
gates `:133`/`:134`. Same grep on `collide/engine-node.mjs` and
`muta/engine-node.mjs`: none either. That the openers never meet them is
still read from code, not run.

| option | shape | cost | against |
| --- | --- | --- | --- |
| **A. a flag** | `synth: true` on boardGraph instrument nodes only | one writer (`graph-registry.mjs:88`), four readers | a third boolean, which the owner's proposal did not have |
| B. derive from the port | board synth in port `address === site` (`:90`), a desk input is `${room}-${name}` (`:111`) | no new field | a reader inferring meaning from an address format, which breaks the day an address scheme changes (`plan-site-names.md` is already changing site ids) |
| C. a port field | the port says what it speaks, e.g. `speaks: 'notes'` | the fact really is about the port | bigger than this plan, and the audio side (`audio.start`) is a second port fact |

**Recommended: A.** It names what the code reads, it is set in exactly one
place, and B is the confident inference this project keeps paying for.

## 4. Compatibility: who sends `kind`, and on what code

| announcer | where | sends | updated by | runs a bay? |
| --- | --- | --- | --- | --- |
| the Raspberry Pi | `rig/board/beat.mjs:45` calls `boardGraph` | `engine` x instruments, `engine` gpu, `device` inputs and ALSA | `rig/board/push.sh`, from its LAN only, so OLD until somebody is at the desk | no (grep `createBay` in `rig/`: none) |
| the Pico | `rig/pico/net/node.c:45,46`, a C string built once at init | `device` x2 | a reflash | no |
| the store worker | `workers/store/src/graph.js:14`, sent at `index.js:128` | `store` | its own wrangler deploy, separate from `view` | no |
| every page | §6 | all seven | the `view` deploy, all at once | yes |

Two directions can break:

1. **New bay, old graph.** The Pi keeps saying `engine`, the store worker keeps
   saying `store`, the Pico keeps saying `device`. Cure: `addNode` derives
   `store = n.store === true || n.kind === 'store'`,
   `consent = n.consent === true || n.kind === 'external'`,
   `synth = n.synth === true || n.kind === 'engine'`, and ignores any other
   `kind`. ⚠️ `engine` to `synth` also marks the GPU and the browser engines
   `synth`; by §3 the openers never reach them, so this is harmless today, and
   it is the reason the derivation should be removed rather than kept forever.
2. **Old bay, new graph.** A tab loaded before the deploy calls
   `registry.fill` (`graph-registry.mjs:205`) on a node with no `kind`, and the
   old `addNode` THROWS (`bay.mjs:872`). No caller catches it
   (`patchbay:215`, `partitur/score.mjs:291`, `mirror:1613`,
   `midi-node.mjs:230` all call it bare), so that tab's whole bay is gone, not
   one node. Pages deploy together, so only a tab left open across a deploy
   meets this, and a reload ends it. INFERENCE about how long tabs stay open on
   the desk; nobody measured it.

🔴 **AND THIS IS ALREADY A LIVE FRAGILITY, BEFORE ANY CHANGE.** `graphProblem`
(`graph-registry.mjs:133` to `:141`) never looks at a node's `kind`, so one
announcer anywhere in a room with a misspelt kind is accepted by `ingest` and
then throws in `fill` for EVERY listener. Dropping the throw fixes that as a
side effect.

🔴 **`fill` DROPS EVERY FIELD IT DOES NOT NAME.** `graph-registry.mjs:205`
copies `id, kind, label, place, net` and nothing else, and
`concepts/6/index.html:168` is a hand copy of the same line. So `consent: true`
on a REMOTE node is lost today (no remote announcer sends one yet, so it has
never shown), and `store: true` from a new store worker would be lost too. Both
lines must pass the flags in the SAME commit as the bay change, or the store
silently stops being a store.

## 5. `/patchbay/`'s colour table loses its input

`TECH = { person: 'browser', screen: 'browser', device: 'sound', engine:
'graphics', store: 'cloudflare', external: 'station' }` (`patchbay:231`), used
at `:247` as `tech: TECH[n.kind] || 'device'`.

⚠️ It is a COLOUR, not an icon: `tech` only picks a hue from `TECH_HUE`
(`diagram.mjs:166`, applied at `:887`). `person` and `screen` already give the
same colour, so the only distinctions lost are `device` (sound, 145) vs
`engine` (graphics, 278), `store` and `external`.

Recommended: colour from what the node HAS, which `specFor` already computes
two lines up (`:240` to `:245`): `store` gives `cloudflare`, `consent` gives
`station`, a `video` or `program` port gives `graphics`, an `audio` or `midi`
port gives `sound`, otherwise `browser` on `place === 'browser'` and `device`
elsewhere. That is closer to the truth than the kind was: a browser engine
making sound is `engine` today and so painted `graphics`.

## 6. Every writer of node `kind`

VERIFIED by grep for `kind: '<value>'` and for the tuple form
`[n, kind, label]` in the same paths as §2.

| file:line | kinds | change |
| --- | --- | --- |
| `demo/shell/graph-registry.mjs:88,96,106,124` | engine, engine, device, device | `:88` adds `synth: true`; drop `kind` |
| `workers/store/src/graph.js:14` | store | `store: true` |
| `rig/pico/net/node.c:45,46` | device x2 | nothing required; drop at the next reflash |
| `demo/shell/midi-graph.mjs:255` | device | drop |
| `demo/shell/midi-node.mjs:101` | screen | drop |
| `demo/fau/engine-node.mjs:110`, `collide/engine-node.mjs:137`, `muta/engine-node.mjs:137` | engine | drop |
| `demo/patchbay/index.html:102-109` | person x2, screen x2, device, engine, store, external | `store: true` on `r2:recordings`, `consent: true` on `err:klassika` |
| `demo/patchbay/index.html:170,171,197,931,994` | person, screen, store, device, person, screen | `:197` `store: true` |
| `demo/away/index.html:462,463` | person, screen | drop |
| `demo/knobs/index.html:2485,2486` | person, screen | drop |
| `demo/mirror/index.html:181-183` | engine, screen x2 | drop |
| `demo/partitur/score.mjs:248,572,583`, `wall.mjs:93` | person, screen, engine, screen | drop (`:583`'s `desk:synth` is a test graph; give it `synth: true` if its check reads it) |
| `demo/concepts/1:40,41`, `3:49`, `4:53,63`, `5:61-63,76`, `6:69-75,100,110` | all seven | `store: true` on the three `cf-store:history`; drop the rest |
| `demo/concepts/10:37`, `11:43`, `12:39`, `13:46`, `14:61`, `20:39` | tuples `[n, kind, label]`, 27 entries | `rec` gets `store: true`; the tuple loses its middle column |

Tests write kinds at `bay-test.mjs` (17 lines, 708 to 1202),
`bay-node-test.mjs:58,202`, `graph-registry-test.mjs:127,185,198,226,295`.

Words that describe the seven kinds and would go stale:
`bay.mjs:64-70` (and `:67` is ALREADY stale: it says `external` is the one kind
the validator reads, while `store` has been read since 2026-10-06), `:857`,
`:862`; `.claude/skills/positron-concepts/SKILL.md:204`;
`plans/plan-universal-routing.md:99` (the node kinds table);
`plans/plan-routing-migration.md:54`; `plans/plan-stage-patchbay.md:70`.
⚠️ Old plans record what was decided; amend with a dated line, do not rewrite.

## 7. Order of work

1. **One commit, shared code, before any page agent starts** (CLAUDE.md, shared
   things are done once): `bay.mjs` `addNode` takes `store`, `consent`,
   `synth`, derives them from a legacy `kind`, stops throwing on `kind`;
   `:905`/`:1304` read `store`; `NODE_KINDS` goes. `graph-registry.mjs:205`
   and `concepts/6:168` pass the three flags. `openers.mjs:118-140` and
   `partitur/score.mjs:301` read flags. `bay-test.mjs` 948, 951, 953-956, 867
   rewritten: the negative controls become "a three part id is still refused",
   "a legacy `external` still forces consent", "a legacy `store` still rides
   ingest", and "an unknown kind is ignored, not thrown".
   Check: `node demo/shell/bay-test.mjs`, `node demo/shell/graph-registry-test.mjs`,
   assert counts compared with before.
2. **Writers, same deploy as 1.** boardGraph `synth: true`, patchbay `NODES`,
   concepts, and every page in §6, each with its self-check from §2b in the
   same commit. `/patchbay/` colour by flags and media (§5).
   Check: `node demo/verify.mjs patchbay partitur knobs mirror away fau nola collide muta`
   plus the concept pages touched, assert counts against the last run.
3. **Deploy `view`.** Reload any tab left open on the desk (§4, direction 2).
4. **Store worker**, any time after 3: `store: true`, keep `kind: 'store'` until
   step 6 so an old open tab still reads it.
5. **The Pi**, whenever somebody is on its LAN: `rig/board/push.sh`. Until
   then derivation carries it.
6. **Remove the derivation** once the Pi and the store worker are on new code.
   The Pico's `device` maps to nothing, so it never blocks this.

## 8. Open questions

1. **`consent` or `external`?** `consent` exists, is stored, is tested
   (`bay-test.mjs:867`) and says what the bay does with it. `external` says what
   the thing is. Recommended `consent`; the owner's proposal said `external`.
2. **`store` as a node flag next to `store: true` on MESSAGES.** The envelope
   already uses `store: true` for "keep this message" (`feedback.mjs:156`,
   `bay-node.mjs:187`, `bay-node-test.mjs:220`, `workers/store/src/index.js:120`),
   and the site `kind` has a `store` value (`graph-registry.mjs:30`). Different
   objects, same word three times. Keep it, or call the node flag something else?
3. **Name of the `engine` replacement.** `synth` is what `openers.mjs` calls
   the opener (`:137`, `:228`). Or option C in §3, a port field, if the owner
   would rather settle it once at the port.
4. **Does anything outside this repository read node `kind`?** `eccm` lives in
   `~/personal/eccm` and was not grepped.
5. **How long do desk tabs stay open across a deploy?** Not measured. If a
   `/patchbay/` lives for days on the desk, keep `kind` in page announcers for
   one deploy cycle as well.
6. **Labels.** If `person` and `screen` really give nothing for UI, the node
   `label` is what a reader sees; nothing here changes it.
