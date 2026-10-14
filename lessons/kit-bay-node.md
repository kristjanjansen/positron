# Kit lessons: bay-node

The longer comments cut from `demo/shell/bay-node.mjs` and `demo/shell/bay-node-test.mjs`, moved here verbatim with only the comment markers stripped. Each code site keeps a one-line pointer, `// why: lessons/kit-bay-node.md#<anchor>`.

<a id="header"></a>

## `bay-node.mjs` module header

```text
demo/shell/bay-node.mjs: a page as a node on the patchbay, joined on a press.

🔴 STEP 1 OF `plans/plan-routing-migration.md`, 2026-10-06. Three pages joined
a relay room, announced a graph, answered `graph.ask` and traded
`link.request` for `link.state`, each with its own hand copy of the same
thirty lines (`/patchbay/`, and `/partitur/`'s SCORE and WALL tabs). The copies
disagreed about the one thing that matters most:

  🔴 `/patchbay/` JOINED `studio-1` ON LOAD AND IGNORED `?room=`, so every
  visit AND EVERY SUITE RUN put a `web` site on the owner's desk and asked the
  Pi `graph.ask` (plan §3.4, the stage plan's F6). `/partitur/` had been fixed
  for exactly this on 2026-10-05 and the patchbay had not. A rule in three
  copies is a rule that holds in two of them.

WHAT THIS MODULE DECIDES, SO NO PAGE HAS TO:
  1  THE ROOM (`roomFor`). `?room=` when the page has one, which is what
     `demo/verify.mjs` hands every run; under `?selfcheck=1` with no `?room=`
     a private room of the run's own, never `studio-1`; a person gets
     `studio-1`. A harness that forgets to pass a room still cannot reach the
     owner's desk.
  2  A SITE PER TAB (`randomSite`). `merged()` keeps the freshest graph per
     site, so two visitors announcing one site overwrite each other in every
     registry in the room. Harmless while every `web` graph was identical,
     and wrong the moment a page announces its own MIDI devices (plan §3.1).
  3  NOTHING ON LOAD. `createBayNode` opens no socket. `join()` does, and a
     page calls it from a press or from its own check pass, never from its
     top level (`tab-page.mjs` rule 1, CLAUDE.md: a visit opens nothing).
  4  WHAT A NODE SAYS ONCE JOINED: every own graph on every open (a reconnect
     is a new `from`, so it is a new announce), an answer to every
     `graph.ask`, again every `REANNOUNCE_MS` so a page that joins late hears
     it without asking, and a `link.state` for every `link.request` about one
     of its own ports, refusing in words when the page has no handler.
  5  HOW A LIGHT LINK CROSSES THE NETWORK (`plans/plan-site-names.md` §4h).
     `emit(source, ev)` puts ONE `{ type: 'bay.event', source, ev }` on the
     room when the page's bay has a link out of `source` that reaches another
     site. A heard `bay.event` is handed to the page's bay, which delivers it
     only along a link it holds into one of its own in-ports. A `source` on a
     site the sending socket never announced is dropped, so no tab speaks as
     another.

⚠️ IT DOES NOT IMPORT `selfcheck.mjs`, ON PURPOSE. That module reads
`location` at load, which node does not have, and this file is graded by
`node demo/shell/bay-node-test.mjs` with a fake relay. The rule is the same
one, read from the same query string: `selfcheck=1` or `selfcheck=2`.
⚠️ AND THE SOCKET IS INJECTED (`wire`), for the same test. A page leaves it.
```

<a id="roomfor"></a>

## `bay-node.mjs` roomFor

```text
The room a page joins.
@param {object} [o]
@param {string} [o.slug]    the page's name, which a private room starts with
@param {string} [o.search]  the query string, `location.search` by default
@param {boolean} [o.selfcheck] read from `search` by default
@returns {string}
⚠️ A `?room=` THE RELAY WOULD REFUSE IS IGNORED rather than passed on, because
an upgrade the relay refuses reads as a dead relay to a browser, which cannot
see the status of a refused WebSocket.
```

<a id="randomsite"></a>

## `bay-node.mjs` randomSite

```text
A tab's site is three characters, two letters and one digit in any place
   (asked 2026-10-10, *"make sure its 3 chars and includes 1 num"*): short
   enough to read in a patchbay box, and 20,280 of them, so two tabs in one
   room meet the same name about once in twenty thousand pairs.
```

<a id="emit-here"></a>

## `bay-node.mjs` emit: which links cross

```text
⚠️ "HERE" IS THIS PAGE'S ANNOUNCED SITES, NOT `owns()`. A `local` graph
   describes something elsewhere on its behalf (the store on
   `/room/history/`), so a link into it still has to cross the room.
```

<a id="emit-timed"></a>

## `bay-node.mjs` emit: timed links

```text
🔴 A TIMED LINK IS STAMPED HERE, AT THE SOURCE, SINCE 2026-10-12
   (plans/plan-routing-time.md §4.1): `at` = this page's shared clock now
   plus the link's `ahead`, flat on the `bay.event` beside `ev`, never
   inside it, so an event's own fields mean what they meant. A `follow`
   link with no `ahead` is stamped with now, the moment it happened.
   ⚠️ ONE MESSAGE, SO ONE `at`. When the timed links out of one source
   disagree about `ahead`, the largest wins: every receiver fires on `at`,
   and late for one link is safer than due before the message lands.
   ⚠️ NO SHARED CLOCK, NO STAMP, and the receiver holds rather than
   guessing. A link with neither option sends exactly what it sent before.
```

<a id="leave"></a>

## `bay-node.mjs` leave

```text
⚠️ THE INTERVAL STARTS WITH THE JOIN AND STOPS WITH THE LEAVE, so an
unjoined page has no timer saying anything to anybody.
```

<a id="test-header"></a>

## `bay-node-test.mjs` module header

```text
demo/shell/bay-node-test.mjs: a page as a patchbay node, against a relay that
lives in this file, with no socket, no browser and no studio.

  node demo/shell/bay-node-test.mjs

Step 1 of `plans/plan-routing-migration.md`. What is graded here is what the
three hand copies got wrong between them: which room, whether anything opens
before a press, which site, and who answers a `link.request`.

MOST OF THESE ARE NEGATIVE CONTROLS, for the reason `bay-test.mjs` gives: a
node that joined on load and announced everywhere would pass every positive
check below. Each NEGATIVE CONTROL has to see something NOT happen: a socket
not opened, a room not reached, a request not answered.

⚠️ WHAT IS NOT GRADED HERE: the real relay (`openWire` is replaced by
`fakeRelay`), and whether a page calls `join()` only from a press. The pages
assert that themselves (`/patchbay/`, `/partitur/`: *building joined nothing*).
```

<a id="test-timed"></a>

## `bay-node-test.mjs` test 8: timed link

```text
8. A timed link is stamped at the source (2026-10-12, plan-routing-time §4.1).
```
