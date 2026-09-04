# Väin, and what it asks of the timeline

Notes on the philosophy behind the U:/ECCM project, read against
`timeline/`. Written 2026-09-04. The Estonian text is theirs; the API names are
ours; the gaps are the interesting part.

---

## The claim

Three kinds of thing never happened. No preconditions existed. Or things
converged elsewhere in time and something else formed instead. Or — the one that
is recognisable —

> Sa näed objekte. Sa näed inimesi. Aeg klapib. Seosed ristuvad. Aga seal, kus
> peaks olema realisatsioon, seal ei ole midagi. Tühi raamistus, auk pildi
> pinnas, mis on kogu pildi suurune.

*You see the objects. You see the people. The time fits. The connections cross.
But where the realisation should be, there is nothing. An empty framework, a hole
in the surface of the picture, the size of the whole picture.*

And when it does get loose, it is **not the same thing**:

> Kui võimalikku maailma ei tulnud, siis kui ta uuesti tuleb, tuleb ta ikkagi
> esimene kord. […] Võrdusmärki ei teki, aga saab tekkida teisikute külgnemine,
> objekt ja vari (kusjuures pole selge, kumb on objekt ja kumb vari).

*If a possible world did not arrive, then when it arrives again it still arrives
for the first time. […] No equals sign appears, but an adjacency of doubles can
— object and shadow, and it is not clear which is which.*

Also a warning, via Gernsback and Gibson: the *future perfect* was a beautiful
outer surface with 19th-century Victorian content inside. That is not a past
worth giving another chance.

---

## Where the library already agrees

More of this is already built than one would guess, and not by accident — the
same purism produced it.

| the claim | the machinery |
|---|---|
| two ways a date can fail | `when.kind: 'ignorance' \| 'vagueness'` — we do not know, versus the thing has no sharp edge |
| no equals sign | `aoristic()` returns a **ledger** — `items`, `counted`, `clipped`, `open`, and a named `method`. A statistic that will not say what it dropped implies a density nobody has |
| object and shadow kept apart | evidence policies: `attested`, `restored{maxTier}`, `all`. The deck **refuses to serve** past the policy rather than filtering quietly |
| you must choose what you are willing to hear | the evidence policy is **forced** — `EV_UNSET` throws rather than defaulting |
| never guessed at | `caps.absentState`: a lane that must stop actuating and *cannot go quiet* **HOLDS and says so**. It is never guessed at |
| reconstruction is declared, never in place | `registerReconstructor(name, spec)` — a named, versioned tier-1 seam |
| a bracket must be auditable | `when.rule` is **required** and must be versioned `<name>@<int>`; only `hand` and `unknown` may be unversioned |

That last one is the house style in one line: the library will not accept an
uncertainty it cannot later re-audit.

---

## Three things it asks for that are not there

### 1. Absence as a first-class object

`when.kind` models uncertain **presence** — a thing happened, we are unsure
when. It has no way to say: *here is where the 1965 studio would have been;
nothing is here; and that nothing is attested.*

`auk pildi pinnas` is not a vague date. It is a documented void with edges,
sitting on a lane, at a position, with provenance of its own — the archival
record that says the thing was possible and did not occur.

Concretely: a lane kind whose rows assert non-occurrence, which `reduceAt` folds
like anything else, and which the strip draws as a hole rather than as empty
canvas. Empty canvas means "we have not looked". A hole means "we looked".

### 2. A third evidence class, beside attested and restored

The tiers run attested → restored. Both claim **lineage**: restored material
asserts that something existed and this descends from it.

The philosophy forbids exactly that claim. A returning possible world *arrives
for the first time*. So material made now, beside an absence, must not be
labelled `restored` — that would be the falsification thesis 17 already bans,
one level up: not falsifying the signal, falsifying the **provenance**.

It needs its own class, saying: made now, adjacent to a documented absence,
claiming no descent. Not a lower tier of restoration — a different kind of
claim, which the evidence policy can admit or refuse independently.

### 3. `beside`, as well as `from`

`nested.mjs` has quotation: a piece names its source **by identity**, and
refuses an object (`quotation: 'ref' is required — a quotation names its source
by IDENTITY, not by object`). That is a `from` relation, and it is directional.

`teisikute külgnemine` is not directional. Object and shadow, *and it is not
clear which is which*. There is no such relation in the model: no way to place
two things side by side and assert adjacency **without** asserting derivation.

A `from` edge with the arrow removed is not the same as a `beside` edge. The
first says "unknown direction"; the second says "direction is not a property of
this pair". Only the second is honest here.

---

## The Gibson warning, turned on us

> see oli lihtsalt ilus välispind, mille sees oli endiselt vana 19. sajandi
> viktoriaanlik sisu

*it was just a beautiful outer surface, inside which was still old 19th-century
Victorian content*

Worth reading as a note about this repo and not only about theirs. A shared demo
shell makes twenty pages look like one coherent system. It is genuinely nice, and
it is a **surface**. What decides whether positron is a future perfect or a
substrate is whether `deck.reduceAt('cue', t)` is exact at every boundary — 24
probes, 0 wrong — and whether the aoristic ledger really does name what it
dropped. Those are the Victorian-content questions, and they are the ones the
harness asks.

The demo shell is not the work. It is how the work admits to being checked.

---

## What this changes about coworking

The earlier note listed six ways to cowork, cheapest first, and put "compile a
vClick score into a quotation" third. This philosophy promotes it, because it
says what the compile is *for*.

A vClick score is a notated piece that exists. A Väin programme is a piece that
did not. Both want the same substrate, but the second one needs the two missing
primitives above — absence with edges, and adjacency without descent — or the
timeline will quietly file a counterfactual as a restoration, which is the one
thing everybody involved has said must not happen.

That makes it the sharpest possible first client. Not because it is easy, but
because it fails loudly if the evidence model is wrong.
