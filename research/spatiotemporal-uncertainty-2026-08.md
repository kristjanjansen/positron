# Uncertain position — what the spatial trades know, ported to TIME (2026-08-28)

Background survey for the queued **uncertainty-as-position** work (lab NOTES
Checkpoint 7 ranks it behind the firewall: "changes what an `at` IS — scalar →
distribution — touching insertIdx, cursor, horizon, reconcile and every
reducer"). Framing from the user: heritage/preservation records position at
wildly mixed resolutions (a trench square, a street, "somewhere in Estonia"),
and that community has decades of practice. **We are deliberately NOT adding
space.** This reads the spatial tradition for the temporal problem.
Marks: ✅ measured/read here · 📄 documented in a primary source · ⚠️ inferred.

## VERDICT

**Do not turn `at` into a distribution. Keep the scalar; add a sibling `when`
bracket and resolve the scalar ONCE, at ingest, by a named rule that is recorded
on the row.** Every mature standard in the survey converges on the same shape —
a verbatim source expression, a derived `[earliest, latest]` bracket that is
what actually gets indexed, and an explicitly-labelled representative point.
Nobody indexes the fuzzy thing. 📄 CIDOC's four-date model exists *because*
"it does not allow for encoding an arbitrary exact time interval using one RDF
property" and a triple store cannot query an interval-valued property
([How to implement CRM Time in RDF](https://old.cidoc-crm.org/docs/How_to%20implement%20CRM_Time_in%20RDF.pdf));
📄 Shaw's complaint about EDTF is the same complaint in a different notation:
"Neither the SPARQL standard nor any other query engines recognize EDTF
expressions as a special datatype. As a result using EDTF typically requires
custom parsing and comparison logic even for basic functionality such as
filtering and sorting by date"
([Shaw 2021](https://graphentechnologien.hypotheses.org/files/2022/01/Modeling_and_Reasoning_about_Incomplete_Uncertain_and_Approximate_etc-Shaw.pdf)).

Consequence for us: uncertainty-as-position is **cheaper than Checkpoint 7
feared**, because it is not a change to what `at` IS. `insertIdx`, `createCursor`,
`reconcile`'s `ev.at > horizonPos`, `prefixEvents`' bisect and every reducer are
untouched. What changes is what `at` MEANS (a declared anchor, not a fact), plus
one optional row field, one rendering rule, one query predicate and one
accounting call.

And the second finding, which is the one that costs something: ✅ **`at` and the
evidence tier are different axes and our current API has only one.** An
attested 1965 broadcast with a year-wide date is tier 0 and must survive
`evidence:'attested'` — the recording is real; only its position is a smear.
Folding uncertainty into the firewall would silently delete the entire pre-1960
archive under an "attested-only" query. Two knobs, not one — which is exactly
📄 Dyreson & Snodgrass's split between *correlation credibility* ("replaces
indeterminacy in the data") and *ordering plausibility* ("governs the
probability of relationships among the data")
([TODS 1998](https://www2.cs.arizona.edu/~rts/pubs/TODS98.pdf)).

---

## 1. The standards table

| standard | position primitive | expresses | does NOT express |
|---|---|---|---|
| **EDTF / ISO 8601-2:2019** ([LoC](https://www.loc.gov/standards/datetime/), [ISO](https://www.iso.org/standard/70908.html)) | a qualified date *string* | `?` uncertain · `~` approximate · `%` both · `X` unspecified digits · intervals with unknown **and** open ends (`..`) · seasons/quarters (`2014-21`) · sets `[]` one-of / `{}` all-of · `Y` big years · `E` exponent · `S` significant digits | any probability or confidence number; the *magnitude* of `~`; non-uniform or asymmetric mass; who asserted it; sortable/queryable form |
| **CIDOC CRM `E52 Time-Span`** + `P81`/`P82` ([v7.1.1 PDF](https://cidoc-crm.org/sites/default/files/cidoc_crm_v.7.1.1_0.pdf)) | **inner + outer bracket** | P81 = "a **minimum period of time covered by it**" (inner); P82 = "the **maximum period of time within which** an E52 Time-Span falls" (outer). Merge rules are asymmetric: 📄 conflicting-but-compatible sources → P81 takes "the smallest interval including all these extents" (union), P82 takes "the **intersection** of all these extents" | a distribution shape; a confidence value |
| **CRM four-date RDF encoding** `P82a/P81a/P81b/P82b` ([impl. note, ISSUE 164](https://old.cidoc-crm.org/docs/How_to%20implement%20CRM_Time_in%20RDF.pdf)) | 4 scalars | 📄 "begin of the begin", "end of the begin", "begin of the end", "end of the end"; constraints `P82a ≤ P82b`, `P82a ≤ P81a`, `P82a ≤ P81b`, `P81a ≤ P82b`, `P81b ≤ P82b`. 📄 **P81a > P81b is deliberately legal** = "no known inner bound" | ordering between the inner pair (on purpose) |
| **CRM Issue 288** ([accepted 2020](https://cidoc-crm.org/Issue/ID-288-issue-about-p82-and-p81-usage)) | usage doctrine | 📄 "It is also correct **not to instantiate P81**… if there is no evidence that the event was definitely occurring at a particular time"; 📄 "P82a… and P82b… **should always be assigned a value** to for any past phenomenon, albeit however approximate" | — |
| **CRMgeo / `E94 Space Primitive`, `E95 Spacetime Primitive`** ([crmgeo](https://cidoc-crm.org/crmgeo/), [tech report](https://www.ics.forth.gr/tech-reports/2013/2013.TR435_CRMgeo_CIDOC_CRM_GeoSPARQL.pdf)) | phenomenal vs **declarative** extent, joined by `Q13 approximates time` / `Q11 approximates spacetime` | 📄 phenomenal SPVs "are **fuzzy due to the nature of the phenomenon**"; declarative ones "derive their identity through the expression that defines their place and time". 📄 approximating a real extent "**always defines a (declarative) instance of E53 Place in its own right**" | — (approximation is an *edge*, never an overwrite) |
| **PeriodO** ([perio.do](https://perio.do/), [technical overview](https://perio.do/technical-overview/)) | period = `skos:Concept` in an authority; endpoints carry a human label **and** `periodo:earliestYear` + `periodo:latestYear` | ✅ the bracket again, plus **whose** bracket: an authority is "a set of periods that share a source". Disagreement is modelled by co-existence — many authorities define "Bronze Age", nothing reconciles them | a merge |
| **OWL-Time** ([W3C](https://www.w3.org/TR/owl-time/)) | Instant / Interval / ProperInterval; the 13 Allen relations as properties | precision via `unitType`; nominal (named-period) position | ✅ **uncertainty at all.** `hasBeginning`/`hasEnd` omitted means "unknown" only under the open-world assumption — indistinguishable from "genuinely unbounded" |
| **EDTF Ontology** ([Shaw](https://periodo.github.io/edtf-ontology/)) | EDTF → OWL-Time + **statement qualification** | `edtfo:UncertainStatement` / `ApproximateStatement` ⊂ `QualifiedStatement`, via RDF reification or RDF-star. 📄 the payoff: "modeling a qualified date expression produces all the statements produced by modeling an unqualified date expression, so those statements can be queried without concern for qualification". `edtfo:OpenBeginningInterval`/`OpenEndInterval` keep **open** ≠ **unknown** | — |
| **Allen's interval algebra** ([CACM 1983](https://doi.org/10.1145/182.358434)) | 13 relations (`< > m mi o oi s si d di f fi =`) | order **without dates**; incomplete knowledge = a *set* of feasible relations, propagated by the composition table | metric distance. Full algebra NP-hard |
| **Fuzzy temporal** (Hermon & Niccolucci, [Archeologia e Calcolatori 28](https://www.archcalc.cnr.it/indice/PDF28/06_Hermon_Niccolucci.pdf)) | membership function core/support | 📄 "for times in X, the event takes place for sure; outside of Y, the event does not take place; nothing is known for times outside X but within Y… **Y, the support, is actually the interval between TPQ and TAQ**". 📄 "**Fuzziness addresses imprecise and vaguely defined statements; probability, on the contrary, deals with the as yet unknown truth of a precise statement**" | — |
| **Aoristic analysis** ([Ratcliffe & McCullagh 1998](https://doi.org/10.1080/136588198241644), [Ratcliffe 2000](https://doi.org/10.1080/136588100424963), [Crema 2012](https://doi.org/10.1007/s10816-011-9122-3)) | mass 1 per item spread over its range | the aggregate curve; ✅ the direct analogue of "a smear, not a fake instant" | anything about the individual item |
| **Valid-time indeterminacy** ([Dyreson & Snodgrass, TODS 1998](https://www2.cs.arizona.edu/~rts/pubs/TODS98.pdf)) | a set of possible instants + a distribution + **two query knobs** | 📄 "it is known that an event stored in a database did in fact occur, but it is not known exactly when"; definite vs possible answers; *ordering plausibility* 1–100 | — |
| **W3C Web Annotation + media fragments** (our §−1 bridge) | `#t=start,end` | exact byte/second ranges | ✅ nothing uncertain. A media fragment is always crisp |

**Cross-check ✅:** five independent traditions — CIDOC (P82a/P82b), PeriodO
(`earliestYear`/`latestYear`), edtf.js (`.min`/`.max`, e.g.
`edtf('2016-02').min = 1454284800000`, `.max = 1456790399999`), fuzzy archaeology
(support = TPQ→TAQ), and Dyreson & Snodgrass (the set of possible instants) —
all reduce an uncertain position to **two numbers plus a label**. That is not a
coincidence; it is what indexes.

## 2. EDTF: what it says and what it can't

📄 Levels: 0 is a profile of ISO 8601-1; **1 and 2 are profiles of ISO 8601-2**
(Shaw §2). L1 qualifies a *whole* expression; L2 qualifies *parts*
(`1816-05~-25`), allows `X` anywhere, and adds sets, `E`, `S` and sub-year
groupings 21–41.

Three things it gets right that we should copy outright:

1. ✅ **Unspecified is a precision statement, not a value.** 📄 Shaw models
   `1876-XX` as an Instant with `time:unitType time:unitMonth` and *no month
   asserted*. `197X` becomes `edtfo:decade 197` — a unit *larger* than a year.
   The record does not say "July"; it says "we know this to the month".
2. ✅ **Open ≠ unknown.** 📄 "These are distinguished from intervals for which
   either the beginning or end is simply not known." An unfinished span and a
   span whose end we lost are different facts. Our `Span {at, dur}` currently
   cannot say either.
3. ✅ **Not all uncertainty is an interval.** 📄 `1984-X1` = "January **or**
   November 1984" is modelled as an `owl:disjointUnionOf` — a *set*. Same for
   EDTF's `[1821,1822,1830..1832]`. Any design that assumes a single contiguous
   bracket will silently smear across the ten months in between.

What it cannot say, and why that matters here: no confidence number, no
magnitude for `~` (`~1971` never says ±1 or ±10), no asymmetry, no non-uniform
mass, and no record of *who* asserted the uncertainty. And 📄 the fatal one for
software: it is not a datatype any query engine understands (Shaw, quoted in the
verdict). ⚠️ Interop trap: **two incompatible EDTF syntaxes are live in the
wild** — the pre-2019 draft (`u` for unspecified, literal `unknown`/`open` for
interval ends, parenthesised scope `1816-(05)?-25`, `y17e5`) versus the
2019/ISO form (`X`, `..`, no parens, `Y`). Published tutorials still teach the
draft ([example](https://www.pilsudski.org/en/news/blog/849-how-to-write-dates-part-2-edtf)).
Any parser we adopt must declare which.

✅ Our concrete case is expressible: "probably spring 1971" = `1971-21?`
(21 = northern spring, `?` = uncertain). ERR's year-only case is `1965`. Neither
needs anything past Level 1.

## 3. The bracket, and the trapezoid hiding inside it

📄 CRM's `E52 Time-Span` scope note is the clearest statement of the whole
problem in the survey: "Since our knowledge of history is imperfect and physical
phenomena are fuzzy in nature, the extent of phenomenal time-spans can only be
described in approximation. An extreme case of approximation might, for example,
define an instance of E52 Time-Span having unknown beginning, end and duration."

Two rules to steal verbatim:

- 📄 **Merge asymmetrically.** P81 (inner) merges by *union*, P82 (outer) by
  *intersection*. Non-contradicting sources loosen what you claim to know and
  tighten what you claim to bound. Getting this backwards fabricates certainty.
- 📄 **The inner pair is deliberately unordered.** "the time interval of P81 can
  be negative… This is allowed conventionally in cases in which the interval P81
  is unknown". Asserting `P81a ≤ P81b` is a bug, not a validation.

⚠️ **The trapezoid equivalence** (our inference; not stated verbatim in either
source): the four CRM dates are exactly the four knots of a trapezoidal fuzzy
membership function — support `[P82a, P82b]`, core `[P81a, P81b]`. Hermon &
Niccolucci's core/support pair and CRM's inner/outer pair are the same object
reached from opposite directions, which is why P81's legal "negative interval"
matters: it degenerates the trapezoid to a triangle (peaked at an unknown
instant) without a special case. One data shape covers crisp instant, crisp
interval, uniform smear and graded belief.

⚠️ **The possible/necessary pair, derived on the brackets** (subagent report had
these swapped; corrected here). A's end ranges over `[P81b, P82b]`; B's start
ranges over `[P82a, P81a]`. Therefore:

```
necessarily_before(A,B)  ⟺  A.P82b < B.P82a     (A's latest end before B's earliest start)
possibly_before(A,B)     ⟺  A.P81b < B.P81a     (A's earliest end before B's latest start)
```

Two integer comparisons per pair. That is the whole "possibly in 1965 vs
certainly in 1965" distinction, and it is cheap. Fuzzified Allen relations exist
if we ever want degrees ([Schockaert, De Cock & Kerre 2008](https://doi.org/10.1109/TFUZZ.2007.895960);
[historical-event retrieval application](https://doi.org/10.1007/s00500-009-0471-8)),
but the crisp bracket pair buys the useful 90%.

📄 One trap from the CRM text worth naming: "When used as a common E52 Time-Span
for two events, it will nevertheless describe them as being simultaneous, even
if nothing else is known." Sharing one uncertainty object between two rows
asserts simultaneity. Our `when` must be per-row, never interned.

## 4. Aoristic: the smear made arithmetic

📄 Origin is crime science, not archaeology: [Ratcliffe & McCullagh 1998](https://doi.org/10.1080/136588198241644),
then [Ratcliffe 2000](https://doi.org/10.1080/136588100424963) and
[2002](https://doi.org/10.1023/A:1013240828824). 📄 Method, in his own words: the
technique "evenly distributes the probability of a crime event across each hour
of the time span"; for an 8am–4pm window "the probability of the crime event
would be distributed as 0.125 for each hour"
([jerryratcliffe.net](https://www.jerryratcliffe.net/aoristic-analysis)).
Archaeology adopted it via [Crema 2012](https://doi.org/10.1007/s10816-011-9122-3).

📄 The reference implementation is four lines
([`aoristAAR::aorist`](https://github.com/ISAAKiel/aoristAAR)):

```r
input$number_of_years <- abs(input$from - input$to)
input$number_of_years <- ifelse(input$number_of_years == 0, 1, input$number_of_years)
input$weight_per_year = 1/input$number_of_years
```

📄 And the epistemics are explicit: "The aoristic calculation distributes the
probability of an event (**the event has taken place at all = 1**) to (time)
sections of the total range… **The aoristic sum is then the expected value for
the number of events to be assumed within this period**"
([docs](https://rdrr.io/github/ISAAKiel/aoristAAR/man/aorist.html)). Individually
every item is a flat smear that claims nothing; collectively the smears are an
unbiased count estimator. That is precisely §−1's "a smear, not a fake instant",
with the arithmetic attached.

**The pathologies, because we will hit all of them:**

- 📄 **Breakpoint artefacts.** [Crema 2025](https://doi.org/10.1111/arcm.12984):
  coarse periodisation creates "artificial abrupt shifts in the frequency
  density… at major transitions between phases and periods". ⚠️ Our exact
  analogue: ERR's bracket vocabulary is year-shaped, so every aoristic curve over
  the archive will step at 1 January. The structure comes from the cataloguing
  convention, not from 1965.
- 📄 **Summation hides the uncertainty it encodes.** Crema 2025: "the summation
  of aoristic weights **hinders the underlying chronological uncertainty**". A
  corpus of five-block smears and a corpus of perfectly-dated events can produce
  the same curve. The curve is a point estimate with no error bars.
- 📄 **Overlapping-precision bias.** aoristAAR, citing Hinz/Müller-Scheeßel: "The
  structure of the overlapping time intervals can lead to biases of the aoristic
  sum" — because some items are dated to a period and others to a sub-period.
  ⚠️ Ours: ERR mixes day-precise, month-precise and year-precise items in the
  same year, in wildly different proportions per decade.
- 📄 **Silent truncation in degenerate cases.** Ratcliffe's own CRAN package
  ([`aoristic` 1.1.1](https://cran.r-project.org/web/packages/aoristic/index.html))
  assigns the full weight 1.0 to the start hour when the end is missing, and
  spans over 168 h "will default to a time span of 168 hours". A library that
  quietly clamps a long smear is worse than one that refuses.
- 📄 **Descriptive, not inferential.** Crema 2025: "at its best a **descriptive
  rather than an inferential statistic**". 📄 Radiocarbon SPDs make the same
  mistake visibly: "artificial peaks in the SPDs occur at points where the ¹⁴C
  calibration curve is steep"
  ([rcarbon vignette](https://cran.r-project.org/web/packages/rcarbon/vignettes/rcarbon.html)),
  fixed only by testing against a null model. ⚠️ The calibration curve is their
  measuring instrument leaking into the result; our measuring instrument is a
  1970s cataloguing form.

📄 **Monte Carlo is the standard escape**, and it is the source of our firing
rule. Crema 2012 draws one concrete date per item and re-runs the analysis many
times. Worked example, verbatim
([Kolář et al. 2015, Archaeometry 58(3)](https://doi.org/10.1111/arcm.12182)):
"we simulated 1000 potential time-series, in each simulation run every single
archaeological component was randomly assigned to a single year within the time
span of corresponding dating. **Uniform probability** of component occurrence was
set throughout the time span" — reported as "median, 5th and 95th percentile".
Also 📄 their own caveat: "A problematic assumption of this method is the
independency of samples."

## 5. The spatial practice worth translating

The spatial trades solved this first because a map forces the question: you
cannot draw "somewhere in Estonia" without deciding what mark to make. Four
primitives, in rising order of honesty about what is known.

| primitive | what it asserts | temporal analogue |
|---|---|---|
| **point** | a coordinate pair, nothing about extent | a scalar `at` |
| **point + radius** | a centre and a circle guaranteed to contain the whole feature | `at` + a symmetric bracket |
| **footprint / bbox** | a polygon or envelope; extent asserted, interior uniform | `[earliest, latest]` |
| **gazetteer entry** | a named place that is a *record* whether or not any geometry is known | a named period (PeriodO), or a row with `when` but no resolvable instant |

### 5.1 Precision is significant digits — truncation is honest, padding is a lie

📄 The cleanest statement of the disease is GBIF's: "3°20′ has a precision of
one minute, equivalent to about 0.0166667 degrees, but when stored as decimal
degrees where five decimal places are retained and displayed the value would be
3.33333, **with a false precision of 0.00001 degrees**"
([Georeferencing Best Practices §3.4](https://docs.gbif.org/georeferencing-best-practices/1.0/en/)).
📄 The magnitude of the lie is arithmetic: one decimal degree place ≈ 11.1 km at
the equator, five places ≈ 1.11 m
([Humboldt GSP 270, Reporting Geographic Coordinates](https://gsp.humboldt.edu/olm/Lessons/GIS/01%20SphericalCoordinates/Reporting_Geographic_Coordinates.html)).
Four fabricated digits move an implied uncertainty of ~15 km to ~15 m — three
orders of magnitude of confidence invented by a format conversion, with no
malice and no record.

✅ **ERR's synthesised `YYYY-07-15` is exactly this, in the time axis.** A
year-precise catalogue field is one significant digit at year resolution; the
`07-15` pads it to three at day resolution. It is not a midpoint estimate, it is
a rendering artefact of a database column that had no null representation, and
it arrives at us indistinguishable from an attested 15 July. Our own
`proto/aikajana/ingest.mjs:59-71` reached the same conclusion empirically —
"ERR's `YYYY-07-15` proved that a midpoint is indistinguishable from an attested
15 July. A start is at least a LOWER BOUND that is true" — which is the spatial
rule (truncate, never pad) rediscovered from first principles. ⚠️ EDTF's
Level-2 `S` (significant digits) exists for precisely this and nobody uses it;
`1965` with a declared precision of *year* and `1965-07-15` are different
statements, and only the first is true.

### 5.2 Positional accuracy: the standards force you to publish a number

📄 **US NSSDA** (FGDC-STD-007.3-1998) mandates a reporting statement — "Tested
_ (meters, feet) horizontal accuracy at 95% confidence level" for tested data,
"Compiled to meet _ (meters, feet) horizontal accuracy at 95% confidence level"
for compiled — computed as `Accuracy_r = 2.4477 × 0.5 × (RMSE_x + RMSE_y)`
([FGDC part 3](https://www.fgdc.gov/standards/projects/accuracy/part3/chapter3)).
📄 **ISO 19157** ("Geographic information — Data quality",
[ISO 19157:2013](https://www.iso.org/standard/32575.html), now 19157-1:2023)
makes positional accuracy one of six first-class data-quality elements
alongside completeness, thematic accuracy, logical consistency, temporal
quality and usability — i.e. quality is a *reportable property of the dataset*,
not a footnote.

⚠️ The transferable idea is not the constant 2.4477. It is that both standards
make "untested" a **declarable state with its own wording**. A dataset that has
not been assessed says so in the same field where an assessed one puts a
number. Our `when` needs the same: a row with no bracket and a row with an
explicitly-unknown bracket must not be the same row.

### 5.3 DarwinCore point-radius — the working answer to "somewhere in Estonia"

Biodiversity collections have the identical problem at industrial scale:
millions of specimen labels reading "10 mi N of Bakersfield" or "Java". 📄 Their
answer is the **point-radius method** ([Wieczorek, Guo & Hijmans 2004,
IJGIS 18(8):745-767](https://doi.org/10.1080/13658810412331280211)): pick a
representative point, then compute and publish the radius of the smallest
circle guaranteed to contain the whole locality. The point is explicitly *not*
a claim about where the specimen was; it is the centre of a stated circle.

📄 The Darwin Core terms ([dwc.tdwg.org/terms](https://dwc.tdwg.org/terms/)):

- `coordinateUncertaintyInMeters` — "A horizontal distance (in meters) from a
  given `dwc:decimalLatitude` and `dwc:decimalLongitude` describing the
  **smallest circle containing the whole of the `dcterms:Location`**." 📄 And
  the rule that makes it work: "**Zero is not a valid value for this term.**"
  There is no such thing as an uncertainty-free georeference.
- `coordinatePrecision` — "A decimal representation of the precision of the
  coordinates" (`0.00001`, `0.01667`, `1.0`) — **separate from uncertainty**.
  Precision is how finely you wrote it down; uncertainty is how wrong it may be.
- `georeferenceProtocol` — "A description or reference to a `dwc:Protocol` used
  to determine a spatial footprint, coordinates, and uncertainties." **The named
  rule, recorded on the row.** This is the field our VERDICT is asking for.
- `georeferenceRemarks` — the assumptions made "in addition or opposition to
  those formalized in the method"; example, verbatim: `Assumed distance by road
  (Hwy. 101)`.
- `footprintWKT` — the actual polygon, when you have one, *beside* the
  point-radius rather than instead of it.

📄 And the doctrine, which is the single most quotable line in the whole survey:
"**coordinates without a carefully determined uncertainty should not be
considered a georeference, they should be considered coordinates whose meaning
is not clear**" (GBIF Georeferencing Best Practices §1.1). 📄 The named
contributors they enumerate and combine — extent of the feature, coordinate
source, coordinate precision, unknown datum, GPS accuracy, heading and offset
precision — are each computed separately and then merged into one radius. ⚠️ Our
analogue is short: catalogue granularity, the `07-15` padding rule, and whether
a day-evidence field (`Eetrikuupäev` / `Esmaeeter`) overrode it. Three sources,
one bracket.

### 5.4 A place with no geometry is still a first-class record

📄 **Pleiades** is unambiguous: "Places are entirely abstract, conceptual
entities. They are objects of thought, speech, or writing, **not tangible,
mappable points on the earth's surface**", and "some places, attested by name in
ancient sources, may have **no associated location at all** because modern
scholarship cannot pinpoint reliably the ancient site or area in question"
([conceptual overview](https://pleiades.stoa.org/help/conceptual-overview)).
Coordinates live in separate *location* resources hung off the place; a place
with zero locations is a complete, citable record. ✅ That is the same move as
CRMgeo's declarative-vs-phenomenal split in §1: the identity of the thing does
not depend on the quality of its coordinates.

📄 **Linked Places format** ([LinkedPasts](https://github.com/LinkedPasts/linked-places-format))
carries the same rule into JSON — "In the event the location for a place is
unknown, the geometry element's value should be **null**" (the key is required,
the value may be null; absence and unknown are different) — and it independently
invented our recommended shape: a `when` object of `timespans`, each with
`start: {in | earliest, latest}` and `end: {in | earliest, latest}`, plus 📄 an
optional **`certainty`** attribute with values `certain` / `less-certain` /
`uncertain` that may be attached to `when`, to geometries **and** to relations.
Names, types and relations each carry their own `when` — time-scoping is per
assertion, not per record. **World Historical Gazetteer**
([whgazetteer.org](https://whgazetteer.org/)) is the union index built on it,
and **GeoNames** ([geonames.org](https://www.geonames.org/)) is the counter-
example: one point per feature, no extents, no uncertainty field at all — which
is why gazetteer projects treat it as a name resolver, not a geometry source.

📄 **IIIF `navPlace`** ([extension spec](https://iiif.io/api/extension/navplace/))
is the smallest version of the idea and the closest to our own media-object
case: a GeoJSON `FeatureCollection` may hang off a Collection, Manifest, Range
or Canvas, and the spec states outright that the geographic areas "**do not
imply any level of accuracy, temporality, or state of existence**". A
navigational hint, explicitly disclaimed as an assertion. ⚠️ Our `when` should
carry the same disclaimer in its docstring: the representative `at` is where the
row sorts, not where the event happened.

### 5.5 The cartographic critique: a dot implies precision it does not have

📄 The classic finding is from dot-density mapping — "the detailed look of the
individual dots gives the **illusion of more detailed data** than the solid
colour of a choropleth", and readers "can easily interpret the dots… as the
locations of actual settlements"
([dot distribution map](https://en.wikipedia.org/wiki/Dot_distribution_map)).
Cartography's fixes are all *anti-precision* devices: **random placement** of
dots within an enumeration unit specifically so no reader reads a dot as an
address; and **dasymetric** masking, where ancillary data (land cover, water)
excludes impossible areas and redistributes the same mass into the plausible
remainder ([Eicher & Brewer 2001, CaGIS 28(2)](https://doi.org/10.1559/152304001782173727)).
⚠️ Dasymetric is the strongest idea here for us: it is exactly "the bracket is
`[1965-01-01, 1966-01-01)` but we know the station did not broadcast on the
May Day shutdown, so redistribute that mass" — a non-uniform aoristic weight
justified by *external* evidence rather than by a guess. We will not build it,
but the shape is worth knowing: uniform-within-bracket is the null model, not
the truth.

📄 For encoding the uncertainty itself, MacEachren's empirical study is the
reference ([MacEachren et al. 2012, IEEE TVCG 18(12):2496-2505](https://doi.org/10.1109/TVCG.2012.279);
earlier framing in [Cartographic Perspectives 13](https://doi.org/10.14714/CP13.1000)).
Two families: **extrinsic** signifiers add marks (error bars, hatching, contour
glyphs) and **intrinsic** ones modulate the data mark itself (desaturation,
transparency/fog, blur, sketchiness, grain). 📄 The measured result: **fuzziness
ranked most intuitive** of the tested signifiers, with colour value and location
close behind. ⚠️ Translating: a soft/feathered band edge beats a dashed one,
and beats an overlaid error bar, for saying "the edge is not where you think it
is". Keep hatching for the categorical case (this region is *inferred*, §5b's
tratteggio), and reserve alpha for density, because alpha is already spoken for
in our strip.

## 6. Doing it in software

### 6.1 The storage layer already exists and is boring

📄 **Postgres range types** are the reference implementation of the bracket.
"Range types are useful because they represent many element values in a single
range value, and because concepts such as **overlapping ranges** can be
expressed clearly. The use of time and date ranges for scheduling purposes is
the clearest example"
([PostgreSQL docs](https://www.postgresql.org/docs/current/rangetypes.html)).
`tsrange` / `tstzrange` / `daterange` / `int4range` are built in. 📄 Open bounds
are native — "The lower bound of a range can be omitted, meaning that all values
less than the upper bound are included in the range, e.g. `(,3]`… Using NULL for
either bound causes the range to be unbounded on that side." 📄 And the indexing:
"A GiST or SP-GiST index on ranges can accelerate queries involving these range
operators: `=`, `&&`, `<@`, `@>`, `<<`, `>>`, `-|-`, `&<`, and `&>`." 📄
**Multiranges** — "an ordered list of non-contiguous, non-empty, non-null
ranges" — are EDTF's `[1821,1822,1830..1832]` set case, indexed, for free. ✅
This is the whole of §2's finding-3 problem solved by a datatype that shipped in
Postgres 14.

📄 **SQL:2011** contributes the other half: the vocabulary for *which* time you
mean. Kulkarni & Michels ([SIGMOD Record 41(3):34-43](https://doi.org/10.1145/2380776.2380786),
[PDF](https://sigmodrecord.org/publications/sigmodRecord/1209/pdfs/07.industry.kulkarni.pdf))
give the two dimensions verbatim: "**valid time**, the time period during which
a row is regarded as correctly reflecting reality by the user of the database"
and "**transaction time**, the time period during which a row is committed to or
recorded in the database", noting "its transaction time may arbitrarily differ
from its valid time". Valid time is `PERIOD FOR EPeriod (EStart, EEnd)` on an
application-time period table; transaction time is `PERIOD FOR SYSTEM_TIME` with
`WITH SYSTEM VERSIONING`. 📄 Bounds are **closed-open**: "a period represents
all times starting from and including the start time, continuing to but
excluding the end time. For a given row, the period end time must be greater
than its period start time." Predicates: `CONTAINS`, `OVERLAPS`, `EQUALS`,
`PRECEDES`, `SUCCEEDS`, `IMMEDIATELY PRECEDES`, `IMMEDIATELY SUCCEEDS`.

⚠️ Two things to take and one to notice. **Take**: closed-open, so adjacent
year brackets do not overlap (`[1965-01-01, 1966-01-01)` and
`[1966-01-01, 1967-01-01)` are disjoint — the alternative silently
double-counts every year boundary in an aoristic sum). **Take**: the predicate
names, because they are Allen's relations minus the ones nobody queries.
**Notice**: SQL:2011 has *no* uncertainty at all. Its periods are crisp; they
describe when a row was believed true, not when the event was. That is a
**third** axis beside our position-uncertainty and evidence-tier axes, and our
transport already has a degenerate version of it in the monotonic `seq`
tiebreak. Not now — but it is the axis that answers "the catalogue said 1965
until the 2019 re-dating", and it should not be confused with either of the
other two.

### 6.2 EDTF indexing: three fidelity tiers, and only one is right

✅ Surveyed implementations sort cleanly into three tiers, and the tier is
visible in a single line of code each.

- **(a) Strip and collapse.** Islandora's `EDTFDateProcessor` literally does
  `str_replace(["~","?","%"], "", $value)`, keeps only the interval's start, and
  normalizes `X` downward
  ([controlled_access_terms](https://github.com/Islandora/controlled_access_terms)).
  The qualifier is deleted, not stored. This is the commonest real-world
  behaviour and it is data loss at ingest.
- **(b) One `[min,max]` pair + orthogonal qualifier flags.**
  [edtf.js](https://github.com/inukshuk/edtf.js) exposes `.min`/`.max` as epoch
  ms (`edtf('2016-02').min = 1454284800000`) with `uncertain`/`approximate` as
  bitmasks that **do not move** `min`/`max`;
  [edtf-ruby](https://github.com/inukshuk/edtf-ruby) is explicit that qualifiers
  "do not factor into date calculations" and makes precision first-class:
  📄 `Date.new(1966).year_precision! == Date.new(1966) → false`, documented as
  "**The year 1966 is not equal to January 1st, 1966**". That single assertion is
  the refutation of every padding bug in §6.3.
- **(c) TWO pairs.** [python-edtf](https://github.com/ixc/python-edtf) exposes
  `lower_strict`/`upper_strict` — 📄 "if you had to pick a single date to sort
  by" — **and** `lower_fuzzy`/`upper_fuzzy` — 📄 "the earliest and latest dates
  that are possible… useful for filtering". **Sort on strict, filter on fuzzy.**

✅ **Only (c) gives "might this overlap my window?" and "where does this sort?"
different and correct answers**, which is the entire practical content of the
VERDICT. ⚠️ Its padding constants, however, are folklore that the library itself
flags as arbitrary: 100% of the uncertain timescale (12 weeks for a season),
`?` and `~` weighted identically, `%` exactly 2×. That is fine *provided the
constant is a named rule stored on the row* rather than a library default that
changes under you on upgrade.

📄 **PeriodO** gives the naming to use, and a cautionary tale. A period's
`start`/`stop` are each a terminus that is either crisp (`in.year`) or fuzzy
(`in.earliestYear` + `in.latestYear`), so a period carries **at most four
numbers**: earliest-start, latest-start, earliest-stop, latest-stop
([context](https://data.perio.do/context.json),
[technical overview](https://perio.do/technical-overview/)). 📄 Golden & Shaw
([PeerJ CS 2:e44](https://doi.org/10.7717/peerj-cs.44)): "the start and end of a
period definition's temporal extent are themselves ProperIntervals, not points
or instants… **because the beginnings and endings of historical periods can
never be precisely determined**." ✅ Same four knots as CRM's `P82a/P81a/P81b/P82b`
and the same trapezoid as §3, reached a fourth time independently.
✅ **Census of the real data** (9,446 periods from
[data.perio.do/d.json](https://data.perio.do/d.json)): **only 612 starts (6.5%)
and 601 stops use the fuzzy form.** The affordance exists and is barely used —
⚠️ which is our expected outcome too, and an argument for making `when` optional
and absent by default rather than mandatory and mostly degenerate.

📄 And PeriodO **explicitly rejected fuzzy curves**, in wording that settles
§8.4 for us: "Some proposals… also support the specification of separate curves
for the start interval and end interval… **We have chosen not to support these
more complex representations at this time**… Natural language is already a
compact and easily indexable way to represent imprecision or uncertainty.
Rather than imposing an **arbitrary mapping from natural language to
parameterized curves**, we prefer to maintain the original natural language
terms used." The verbatim expression is kept; the curve is not invented.

### 6.3 The possible/necessary distinction, and where it lands in our code

This is the load-bearing paragraph. §3 derived the pair on the brackets; here is
what it buys operationally.

```
POSSIBLY in W   ⟺  [earliest, latest]  &&  W     -- overlaps      (Postgres &&,  SQL OVERLAPS)
CERTAINLY in W  ⟺  [earliest, latest]  <@  W     -- contained by  (Postgres <@,  SQL CONTAINS)
```

📄 Both are on the same GiST operator list quoted above, so both are one index
scan. 📄 This is Dyreson & Snodgrass's definite-vs-possible answers with the
distribution machinery removed ([TODS 1998](https://www2.cs.arizona.edu/~rts/pubs/TODS98.pdf)),
and it is Allen's `possibly_before`/`necessarily_before` restricted to the one
question a timeline UI actually asks. "All items **possibly** in 1965" returns
every year-only smear; "all items **certainly** in 1965" returns only those
whose whole bracket fits — which for a year-only ERR row is *also* true, and for
a "1960s" row is false. Two different, both-correct answers to what looks like
one question.

✅ **How it maps onto our firewall — and why the two must stay apart.** The
2×2 is fully populated and every cell is a real query someone will run:

| | `evidence:'attested'` (tier 0) | `evidence:{restored:{maxTier:1}}` |
|---|---|---|
| **possible** | "everything the archive really holds that might be 1965" — the pre-1960 corpus lives here | "…plus interpolated rows that might be 1965" |
| **necessary** | "everything the archive really holds that is provably 1965" | "…plus interpolations provably in 1965" |

⚠️ Collapsing them loses information in both directions: an uncertain *attested*
row is tier 0 with a wide bracket; a precise *restored* row is tier 1 with a
zero-width bracket. Neither is "less trustworthy" than the other in the same
sense. ✅ And in our code the separation is **structural, not disciplinary**:
`evExcludes` (`timeline/transport.mjs:860-868`) reads only `laneTier(kind)`,
because the firewall's O(1) property rests on lane purity
(`transport.mjs:592-616`) — tier is a lane attribute. A per-row `when` field
therefore *cannot* reach the firewall predicate even by accident. The two knobs
cannot be merged by a careless patch.

📄 On **open vs unknown** (§2's finding 2), the primitive is right there —
Postgres's NULL bound — and the failures are all schema discipline. Islandora
clamps both to `1000`/`9999`; Recogito's `end.getOrElse(startDate)` turns an
open end into a **zero-length instant**. ⚠️ Storing `null` for open and a
sentinel for unknown, or vice versa, is one boolean; getting it wrong is
silent and permanent.

📄 Real archives keep the verbatim string beside the derived numbers, which is
the VERDICT's shape in production: ArchivesSpace has a free-text `expression`
beside ISO `begin`/`end` — Yale bulk-parsed expressions into them and
"**retained the original date expression value**"
([Code4Lib Journal 14443](https://journal.code4lib.org/articles/14443)); DPLA
MAP carries `begin`/`end` beside `displayDate`; Omeka S shadows a display
literal with `numeric_data_types_timestamp`/`interval` tables
([NumericDataTypes](https://github.com/omeka-s-modules/NumericDataTypes)).

### 6.4 How UIs actually render uncertain time: five tools, one bug

✅ Surveyed directly. The result is bleak and therefore useful.

| tool | data model for imprecision | visual encoding |
|---|---|---|
| **TimelineJS3** ([repo](https://github.com/NUKnightLab/TimelineJS3)) | none — no uncertainty concept | collapses to a point |
| **ChronoZoom** ([repo](https://github.com/alterm4nn/ChronoZoom)) | boolean `IsCirca` / `FromIsCirca` / `ToIsCirca` | dashed edge, `setLineDash([6,3])`; `[1,3]` for open-ended |
| **Palladio** ([HDLab](https://hdlab.stanford.edu/palladio/)) | none — requires hard exact dates | n/a |
| **Histropedia** ([HistropediaJS docs](https://js.histropedia.com/documentation/all/)) | `precision` enum → span. The **only** one where imprecision governs extent | span drawn only when starred/selected |
| **TimeLineCurator** ([UBC/IMAGER](https://www.cs.ubc.ca/labs/imager/tr/2015/TimeLineCurator/), [TVCG 22(1)](https://doi.org/10.1109/TVCG.2015.2467531)) | a "vague date" class | square glyph, **off-axis in the corner**, not placed |

📄 **The recurring implementation tell — the same line of code written twice.**
TimelineJS's `TLDate.js` backfills missing parts so `{year:1850}` becomes
`new Date(1850,0,1,0,0,0,0)` (`parsed = ix == 4 || ix == 5 ? 1 : 0`); Palladio's
`date.js` `normalizeDateString` does `padYear(s) + "-01-01"`. **Year → 1 January,
midnight.** ✅ That is §5.1's padding lie, in two of the most-used timeline tools
in the humanities, and it is the same defect as ERR's `07-15` with a different
constant. edtf-ruby's `Date.new(1966).year_precision! ≠ Date.new(1966)` is the
one-line refutation.

📄 TimelineJS **does** track precision — `findBestFormat` tests which
`DATE_PARTS` were truthy — but only to choose a display format: **precision is a
typography decision there, never a layout one.** `display_date` is documented as
a presentation override that still requires a real point "so that TimelineJS can
properly position the event". ✅ Its uncertainty-marker request is
[issue #499](https://github.com/NUKnightLab/TimelineJS3/issues/499), open since
2017; a repo search for `circa`/`uncertain`/`approximate` returns 0 hits. Same
searches in Palladio's two temporal components: 0 hits, a missing start is
silently substituted with the end, and the repo carries an
`unfinished_components/palladio-timespan-filter/` — the ranged-time work was
parked.

📄 **Histropedia inverts the bug and is right**: "Precision is the source of
truth: finer fields are ignored" — `{year:2000, month:6, precision:'year'}`
resolves to the whole of 2000. Ladder: day → month → year → decade → century →
millennium → million-years → billion-years. ⚠️ But its Wikidata app defaults to
DAY precision unless the author wires the precision variable, and spans are only
drawn for starred/selected events — so the correct model is off by default and
invisible by default.

⚠️ **The distinction nobody renders.** Wikidata separates *granularity*
(`precision: 7` = century, [Help:Dates](https://www.wikidata.org/wiki/Help:Dates))
from *confidence* (`P1480` sourcing circumstances = *circa*,
[P1319](https://www.wikidata.org/wiki/Property:P1319) earliest,
[P1326](https://www.wikidata.org/wiki/Property:P1326) latest) — and **no
consumer surveyed reads the qualifier layer.** That is §7's ignorance/vagueness
split arriving from the data side: granularity is the bracket, *circa* is a
separate mark, and they need separate fields. ChronoZoom's `IsCirca` proves the
converse failure — circa is a **boolean, not a magnitude**; the geometry stays
exact and the dash is decoration.

📄 **TimeLineCurator is the honest failure and worth reading closely.** Three
glyphs: circle = point, bar-with-triangles = span, **square = vague, drawn
outside the axis**. Verbatim: vague expressions "do not belong on a timeline";
resolving one "moves its glyph to its appropriate place… and becomes more
saturated"; and "**Vague events are not exported.**" ✅ So its fuzzy class is an
*authoring inbox*, not an encoding — it converts uncertainty to certainty rather
than displaying it. Honest, and exactly the wrong end state for an archive where
the uncertainty is permanent.

📄 **PeriodO has the fuzz in its data and has never displayed it.** Its
`Plot.js` `getEndpoints()` returns `[earliestYear(start), latestYear(stop)]` —
the maximal outer envelope — and discards the two inner values, so a period
fuzzy at both ends draws identically to a crisp one
([periodo-client](https://github.com/periodo/periodo-client)). ✅ **That is
precisely the gap a timeline can fill**: solid core = `[latest-start,
earliest-stop]`, hatched skirt out to the outer envelope. 📄 And its one active
aggregate view, `FrequencyPath.js`, is the idea worth stealing outright: a
step-function of **definition density over time** — sort all endpoints, count
how many periods cover each inter-endpoint interval, draw one path. It degrades
gracefully (one definition = a bar; twenty = a skyline whose peak marks
consensus) and it is an aoristic sum in all but name. Its dot-plot
`Histogram.js` is commented out.

✅ **Two negative results, one line each.** **Recogito**
([pelagios/recogito2](https://github.com/pelagios/recogito2)) has *no temporal
annotation at all* — the annotation body enum is a closed list with no DATE or
TIME, entities are PLACE and PERSON only, and time survives only as
`TemporalBounds(from, to)` on gazetteer records, merged across records by
`min(from), max(to)`. **Aviary** ([aviaryplatform.com](https://www.aviaryplatform.com/))
is media-offset time (`HH:MM:SS.###` against `player.currentTime()`) with a
telling degenerate case: a transcript lacking timestamps is stored at exact
`[00:00:00]` — **a wrong exact number, not an unknown**. Aviary also confirms
that the industry keeps the media axis and the history axis entirely separate;
nobody has unified them, which is exactly what our media-span-on-a-world-timeline
is.

⚠️ **Synthesis.** Four of five tools can *print* imprecision; only one lets it
determine where and how wide the mark is, and hides that by default. None
separates granularity from confidence. Archaeology's own tools are ahead —
`aoristAAR` and `rcarbon` plot the smear as the primary object — but they are R
batch analytics, not interactive timelines. ✅ The consequence for §8.4: our
existing flat full-year band is **already ahead of the field**, and the open
question is not whether a band beats a dot (settled, it does) but whether an
aoristic curve beats a band.

## 7. Ignorance vs vagueness — one paragraph, and why the UI cares

📄 Fisher's taxonomy (after Klir & Yuan) splits **uncertainty** first by whether
the object is well defined: "If both the class of object and the individual are
well defined then the uncertainty is caused by errors and is probabilistic in
nature"; if not, you get **vagueness** ("whether an object is a member of a class
or set within the universe is a matter of *vagueness*, and this can conveniently
be treated with fuzzy sets") and **ambiguity**, which splits again into *discord*
(one object, two classification schemes disagree) and *non-specificity* (the
assignment process itself is open to interpretation)
([Models of uncertainty in spatial data, ch.13](https://www.geos.ed.ac.uk/~gisteac/gis_book_abridged/files/ch13.pdf)).
📄 Fisher names our axis in passing: "There are three facets to this, namely
uncertainty in measurement of attributes, **of space, and of time**." 📄 Fisher's
test for which you have is the sorites paradox — "if that concept is sorites
susceptible, then it should be modelled as a vague concept, otherwise a Boolean
model may be appropriate"
([Fuzzy Sets and Systems 113:7–18](https://doi.org/10.1016/S0165-0114(99)00009-3)).
📄 The fuzzy-archaeology restatement is the crispest: "Fuzziness addresses
imprecise and vaguely defined statements; probability, on the contrary, deals
with the as yet unknown truth of a precise statement" (Hermon & Niccolucci).

Why a timeline UI must not conflate them. **Ignorance** — "this broadcast went
out on one specific day in 1965 and the card doesn't say which" — has a fact of
the matter; a better catalogue would collapse the smear to a point, and the UI
should promise that (the smear is a *defect record*, and finding the day is a
repair). **Vagueness** — "the thaw", "the late sessions", the moment a rehearsal
became a performance — has no fact of the matter; collapsing it to a point is not
a repair but a falsification, and a UI that offers "resolve this date" is lying
about the world. Same bracket, opposite affordances: ignorance wants a
provenance link and an invitation to narrow; vagueness wants a graded edge and no
narrowing affordance at all. ⚠️ Practical rule for us: **ERR's smears are almost
all ignorance** (a real broadcast, on a real day, badly catalogued — 📄 ERR's own
FAQ admits "Aastakümnete jooksul andmebaasidesse … sisestatud andmetes võib
leiduda nii kirja- kui faktivigu", research/err-archives-2026-08.md), while the
*performance* smears we will author — a Kurenniemi-era "sometime that spring", a
period boundary — are vagueness. One flag (`when.kind: 'ignorance' | 'vagueness'`)
buys the right edge rendering and the right affordance, and costs nothing.

**And the tie to §5b:** a *restoration* and a *smear* are the same admission at
different tiers. A tier-1 interpolation says "I do not know the value here, so I
computed one from the neighbours"; a smear says "I do not know the position here,
so I bounded it". Both are the system declining to fabricate silently. The
difference is which coordinate is missing — the payload or the `at` — and that is
exactly why they need separate marks and separate policies (§8.3).

## 8. THE RECOMMENDATION

Six decisions, in implementation order. ⚠️ Pointer correction for whoever picks
this up: the Checkpoint-7 backlog paragraph quoted in the header is in
`PROGRESS.md:331-334`, not `timeline/lab/NOTES.md` (Checkpoint 7 there is
"v0.4: CONTINUOUS KINDS ARE FIRST-CLASS", `NOTES.md:320-403`).

### 8.1 The row shape

`at` stays a scalar `number` in transport-position ms. Add **one optional
sibling**, `when`, frozen at ingest, never interned (§3's CRM trap: a shared
uncertainty object asserts simultaneity):

```js
when = {
  verbatim,          // string — EXACTLY what the source said: 'Esmaeeter 4. jaanuar 1965',
                     //   'sometime that spring', '1965-07-15'. Never normalised, never dropped.
  edtf,              // string | null — the honest re-expression: '1965', '1971-21?'. Level 1 suffices.
  earliest, latest,  // number, number — CLOSED-OPEN transport ms. THE indexed pair. Always present.
  innerFrom,         // number | null — CRM P81a. null = no known inner bound.
  innerTo,           // number | null — CRM P81b. innerFrom > innerTo is LEGAL, not a bug (§3).
  rule,              // string — the NAMED RULE that produced `at` and the bracket, e.g.
                     //   'err-july15-padding@1' | 'err-audio-month-null@1' | 'edtf-l1@1' | 'hand'.
                     //   This is DarwinCore's `georeferenceProtocol`. Non-optional. Versioned.
  kind,              // 'ignorance' | 'vagueness' — §7. Drives edge rendering and affordances.
  note               // string | null — DarwinCore's `georeferenceRemarks`: the assumption made.
}
```

Four rules that make this shape work:

1. **Absence is meaningful, and it is the fast path.** A crisp row has **no
   `when` key**. This mirrors the firewall exactly — an attested row has no
   `provenance` key (`transport.mjs:583-588`). ✅ Two absences, two axes, and the
   hot loops (`insertInto` `:481`, `afterIdx` `:497`, `createCursor`'s `bsearch`
   `:330`) never touch either. §6.2's PeriodO census — 6.5% fuzzy — says this is
   the right default by a factor of fifteen.
2. **`earliest`/`latest` are closed-open** (SQL:2011, §6.1), so `1965` is
   `[Date.UTC(1965,0,1), Date.UTC(1966,0,1))` and adjacent years never
   double-count in an aoristic sum.
3. **`verbatim` is never discarded**, even when `edtf` parses cleanly — PeriodO's
   rejection of parameterised curves and Yale's "retained the original date
   expression value" are the same discipline (§6.2, §6.3). The verbatim string is
   the evidence that the rule fired.
4. **It sits *beside* §5b provenance, not inside it.** `provenance` answers "who
   made this payload up, and from what"; `when` answers "how well is this row
   positioned". A row may have both (a tier-1 interpolation between two
   year-precise attestations, itself smeared), either, or neither. They share no
   field and no code path. ⚠️ The one thing to resist: putting `confidence` in
   `when`. `provenance.confidence` is a number in [0,1] about *fabrication*;
   position uncertainty is a bracket, not a scalar, and §1 records that no mature
   standard emits a confidence number for it.

### 8.2 THE FIRING RULE — anchor at `earliest`, always

> **`at = when.earliest`. Deterministically, at ingest, by the named rule. The
> event fires exactly once, at the bracket's lower bound, with `when` carried as
> metadata on the fire callback and in `info`.**

Rejected alternatives and why:

- **Representative point / midpoint — rejected.** This is the `07-15` disease
  with our name on it. A midpoint is indistinguishable from an attestation on
  inspection (§5.1), it is not a bound so it supports no inference, and it makes
  `ev.at <= pos` mean nothing in particular. `proto/aikajana/ingest.mjs:59-71`
  already found this by measurement: "a midpoint is indistinguishable from an
  attested 15 July. A start is at least a LOWER BOUND that is true."
- **Inner-bracket start (`P81a`) — rejected.** It is frequently `null` (CRM Issue
  288: "It is also correct not to instantiate P81"), so it cannot be the primary
  key, and where it exists it is a *stronger* claim than the outer bound —
  anchoring on it would omit rows that possibly occurred.
- **Render-only, never fire — rejected, and this is the important one.** The
  deck's contract is `state(t) = f(prefix(≤ t))` (`transport.mjs:726-732`), and
  `prefixEvents(kind, pos)` (`:737`) folds *every* row with `at <= pos`. A row in
  a lane that never fires would hand a reducer a payload with no position; a row
  kept out of the lane would be invisible to `deck.evidenceAccounting()`
  (`:1159-1171`), so the archive would silently shrink under exactly the query
  the firewall exists to protect. Both failure modes are the ones §5b was built
  to prevent.
- **A per-kind `caps` policy — rejected.** The transport has *one* ordering key.
  A per-lane anchor means two lanes disagree about what `at <= pos` means, and
  `window()` across lanes stops being well-defined. §5b's precedent is a forced
  choice **at the query** (`EVIDENCE_POLICY_REQUIRED`, `transport.mjs:836-843`),
  not a configurable meaning for the index. Uncertainty belongs on the query
  axis, not the index axis — see below.

The justification, positively stated:

1. **Nothing in the transport moves.** Every positional read bottoms out in
   `insertInto` (`:481`), `afterIdx` (`:497`) and `createCursor`'s `bsearch`
   (`:330`); all three compare one scalar plus the `seq` tiebreak. The lookahead
   `scan(now)` (`:660`) needs `ev.at` scalar *and* the lane sorted by it, because
   `if (ev.at > horizonPos) break;` (`:676`) is an early exit over a sorted
   prefix, not a filter. `reconcile(pos)` (`:649`) is pure scalar comparison.
   All untouched.
2. **It gives the existing comparisons a true semantics instead of a fictional
   one.** With `at = earliest`, `ev.at <= pos` means exactly "**possibly** already
   occurred by `pos`" — the *possible* half of §3's pair, computed for free by
   code that already exists. `prefixEvents(kind, pos)` becomes "everything that
   possibly happened by `pos`", which is a defensible default for a fold: you
   never omit something that did happen.
3. **It is one-sided sound.** `earliest ≤ true position` is a theorem, not an
   estimate. The row never asserts anything it cannot support — which is the same
   property §5b's tratteggio buys on the payload axis.
4. **The strict reading is one extra sorted key, not a redesign.** "Certainly by
   `pos`" is `when.latest <= pos`, obtained by a second `createCursor` over the
   same lane keyed on `r.when?.latest ?? r.at` (`createCursor` already takes
   `{key}`, `:326`). Opt-in, O(log n), no change to the default path.
5. **The firing is *marked*, not suppressed.** The consumer that must not act on
   a guess reads `ev.when` on the callback and in `info`; and
   `deck.degradations(kind)` gains a fourth literal, `'anchored'`, beside
   `'attested-hold'` / `'attested-fold'` / `'excluded'`, recording that a row
   fired at a bound rather than at a fact.

⚠️ Two edge cases to name now. **(a)** A bracket wider than the lookahead
(`when.latest - when.earliest > horizonMs * rate`) fires correctly but its true
span is never covered by one `scan` — fine for scheduling, misleading if anyone
reasons about the horizon as "what might happen next". Document, do not fix.
**(b)** `when.kind === 'vagueness'` fires by the same rule; the difference is
purely in the UI (§8.4), never in the schedule. A vague event still has to sort.

### 8.3 Composition with the evidence firewall

**Two knobs, orthogonal, and the orthogonality is structural.** The evidence
policy (`'attested'` | `{restored:{maxTier:n}}` | `'all'`,
`normalizeEvidence` `transport.mjs:414-424`) governs *fabrication of the
payload*. The new certainty policy governs *width of the position*. §6.3's 2×2 is
fully populated; no cell is empty and none is a synonym for another.

- **An uncertain ATTESTED row is tier 0.** A 1965 broadcast with a year-wide
  bracket has no `provenance` key, so `evExcludes` (`:860-868`) never sees it.
  This is the finding that costs something, and the code already enforces it:
  `evExcludes` reads only `laneTier(kind)`, and the firewall's O(1) property
  rests on lane purity (`:592-616`). **A per-row `when` cannot reach the firewall
  predicate even by a careless patch.** ✅ Design for free.
- **A precise RESTORED row is tier 1 with `when` absent.** An interpolated sample
  sits at an exact position and is entirely invented. It must be excluded by
  `evidence:'attested'` and included by any certainty query.
- **The new query knob**, mirroring §5b's forced choice in shape but *not* in
  strictness: `window(kind, a, b, {certainty})` where `certainty` is `'possible'`
  (default — bracket overlaps `[a,b)`) or `'necessary'` (bracket contained in
  `[a,b)`). ⚠️ **Do not make this one throw.** `EVIDENCE_POLICY_REQUIRED` exists
  because a silent default there mixes *dreamed data* into an archival answer.
  Here the default is sound in the inclusive direction — `'possible'` never
  omits a real row — so a default is honest and a throw would be ceremony. The
  asymmetry is the point: forced choice where silence fabricates, safe default
  where silence merely over-includes.
- **`deck.evidenceAccounting()` gains a sibling, not a field.** Add
  `deck.positionAccounting(kind?)` → `{crisp, smeared, total, smearedFraction,
  byRule: {…}, medianSpanMs, maxSpanMs}`. Reporting by **rule** is the point:
  it makes "43% of this lane is positioned by `err-july15-padding@1`" a number
  someone can see, which is NSSDA's discipline (§5.2) — publish the accuracy
  statement or declare it untested.
- ⚠️ **Never multiply the two into one score.** A "trust" number that folds tier
  and span is the exact collapse §7 and the VERDICT warn against, and it deletes
  the pre-1960 archive from any attested-only view.

### 8.4 What the strip should draw

**Per row: keep the flat band. Per lane: replace alpha-stacking with a real
aoristic sum.** Concretely, against the current implementation in
`proto/megatimeline/index.html`:

1. ✅ **The flat full-year band is correct and stays** (`:518-527`, width =
   `worldToScreenX(Jan 1 Y+1) − worldToScreenX(Jan 1 Y)`, the true calendar year
   in world space). §4's epistemics: individually every item is a flat smear that
   claims nothing. §6.2: PeriodO explicitly rejected per-record curves rather
   than impose "an arbitrary mapping from natural language to parameterized
   curves". §6.4: four of five surveyed tools cannot draw this at all. **An
   aoristic curve on a single row would be inventing the shape we refused to
   invent in §8.1.**
2. ⚠️ **The aggregate is where the curve belongs, and ours is currently
   miscomputed.** `globalAlpha = Math.min(0.4, 0.05 + 0.02 * n)` (`:520`) is an
   aoristic sum in disguise, with two of §4's named pathologies baked in: it adds
   **`+1` per item regardless of span** (overlapping-precision bias — a
   day-precise and a decade-precise item contribute equally), and it **clips at
   0.4** (silent truncation, Ratcliffe's CRAN clamp in a different costume).
   Fix: weight `1/span_in_bins` per item so every item contributes total mass 1
   (`aoristAAR`'s three lines, §4), and render the sum as **height**, not alpha,
   because height does not clip. PeriodO's `FrequencyPath.js` step function
   (§6.4) is the reference: sort endpoints, count coverage per inter-endpoint
   interval, one path.
3. **Inner bracket = solid core, outer = hatched skirt** — the encoding PeriodO
   has the data for and has never drawn (§6.4). Where `innerFrom`/`innerTo` are
   null (the common case) the whole band is skirt, which is honest and needs no
   special case.
4. **Edge treatment carries `when.kind`** (§7, §5.5). `'ignorance'` → hard band
   edges + a "narrow this" affordance linking to `verbatim` and `rule`: the smear
   is a *defect record* and finding the day is a repair. `'vagueness'` → feathered
   / gradient edges (📄 MacEachren: fuzziness ranked most intuitive) and **no
   narrowing affordance at all**. ⚠️ Keep hatching for §5b's tratteggio
   (inferred *payload*) so the two axes never share an ink; reserve alpha for
   density, since it is already spoken for.
5. **Never dash for uncertainty.** ChronoZoom's `setLineDash([6,3])` encodes a
   boolean while the geometry stays exact (§6.4) — decoration standing in for
   magnitude. If the edge is soft, move the edge.

### 8.5 The ERR ingest rule, concretely

The two detection sites already exist and are correct
(`proto/megatimeline/index.html:268-269`, mirrored at
`proto/remixer/index.html:264,269`):

```js
if (it.type === 'audio' && (month === null || month === 0)) …   // :268 — CONFIRMED year-only
if (M === 7 && D === 15 && !dayEv)                              // :269 — HEURISTIC year-only
```

The adapter emits, for a record with `month:null` and a synthesised `1965-07-15`:

```js
{
  at:   Date.UTC(1965, 0, 1),                 // the anchor. NOT 07-15, NOT a midpoint.
  kind: 'err/audio',
  payload: { … },                             // NO `provenance` key — the broadcast is attested
  when: {
    verbatim:  '1965-07-15',                  // ERR's field, byte for byte
    edtf:      '1965',
    earliest:  Date.UTC(1965, 0, 1),
    latest:    Date.UTC(1966, 0, 1),          // closed-open
    innerFrom: null, innerTo: null,           // no known inner bound
    rule:      'err-audio-month-null@1',      // or 'err-july15-padding@1' for the heuristic path
    kind:      'ignorance',                   // a real broadcast on a real day, badly catalogued
    note:      'ERR month field null on an audio record; 07-15 is a database padding artefact.'
  }
}
```

Five rules the adapter follows:

- **`07-15` is never written to `at`, and never deleted.** It survives in
  `verbatim` because it is the evidence that the rule fired — and because if ERR
  ever publishes a genuine 15 July record we need to be able to re-audit which
  rows we reinterpreted.
- **The two paths get different `rule` strings**, because one is confirmed and
  one is a heuristic that a future catalogue fix will invalidate. The existing
  `conf: true|false` distinction (`:269` vs `:273`) maps onto the rule id, not
  onto a confidence float. `@1` is a version: when the heuristic changes, the
  string changes and the affected rows are a `WHERE rule = …` away.
- **Day-precise and month-precise records emit no `when` at all** when the
  bracket is a single day, and a month bracket otherwise. The day-evidence
  overrides already implemented (`Eetrikuupäev` / `Võttekuupäev` / an
  `Esmaeeter` prefix on `dateCombined`, `:264-267`) suppress the heuristic before
  it runs, as now.
- ⚠️ **`month:null` on a VIDEO record is not a year-only signal.** This was
  measured — AK chronicle items carry `month:null` with a day-precise
  `dateCombined` ("Esmaeeter 4. jaanuar 1965") (`proto/remixer/index.html:254-257`).
  The audio-only guard on `:268` is load-bearing; do not generalise it.
- **No `provenance` key, ever, from this adapter.** ERR ingest is tier 0 by
  construction. If a reconstructor later fills a gap between two ERR rows, it
  writes to its own lane (§5b, item 4) and that lane carries `provenance`.

### 8.6 What to defer, explicitly

- **Space. Entirely.** No coordinates, no `where`, no geometry, no gazetteer
  binding. §5 is read for the temporal problem and nothing in §8 emits a spatial
  field. ⚠️ If a place is ever needed, the settled answer is already in §5.4 —
  Linked Places' `"geometry": null` plus IIIF `navPlace`'s disclaimer — and it is
  a different document.
- **The trapezoid interior.** `innerFrom`/`innerTo` are stored (they are two
  numbers and CRM's merge rules need them) but **nothing reads them except the
  renderer's core/skirt split**. No membership functions, no fuzzified Allen
  relations, no degrees. §3: the crisp bracket pair buys the useful 90%.
- **Non-contiguous brackets** — EDTF's `[1821,1822,1830..1832]` and `1984-X1`
  (§2, finding 3). Postgres multiranges are the right primitive (§6.1) but
  nothing in the ERR corpus needs them. ⚠️ Record the limitation explicitly in
  the `when` docstring so nobody assumes contiguity is a guarantee.
- **Open vs unknown ends** — keep the distinction *representable* (`latest:
  null` for open, absent `when` for crisp, and a `rule` of `'unknown'` for
  genuinely unbounded) but do not build query semantics for it yet. §6.3: the
  primitive is free, the discipline is the work.
- **Monte Carlo resampling** (§4) and any inferential use of the aoristic sum.
  📄 Crema 2025: "at its best a descriptive rather than an inferential
  statistic". Draw the curve, do not test hypotheses on it.
- **Multiple competing brackets per row** — PeriodO's authority model, where
  disagreement is represented by co-existence with no merge (§1). One `when` per
  row for now. ⚠️ This is the one deferral most likely to be regretted; when a
  second cataloguer disagrees with ERR, the shape is `when: [ …, … ]` with an
  authority id, and the migration is additive.
- **Transaction time** — SQL:2011's second axis (§6.1), "the catalogue said 1965
  until the 2019 re-dating". A third axis, real, and not this quarter's problem.
- **`when` on spans.** `Span {at, dur}` does not exist in code (planned at
  `plans/plan-timeline.md:142-144`); a smeared *duration* is a genuinely harder object
  than a smeared instant and should not be designed before the span type is real.

## §9 — Supplement: late findings (a stalled sub-agent's work, recovered)

Arrived after §8 was written. Nothing here overturns §8; three items sharpen it,
and one is the single most actionable finding in the whole survey.

### 9.1 THE render decision is settled by a controlled study — task decides the mark
📄 Gschwandtner, Bögl, Federico & Miksch, *"Visual Encodings of Temporal
Uncertainty: A Comparative User Study"*, IEEE TVCG 22(1):539–548, 2016
(DOI 10.1109/TVCG.2015.2467752). Compared gradient plots, violin plots,
accumulated-probability plots, error bars, centred error bars and ambiguation:
> *"We recommend using **ambiguation — using a lighter color value to represent
> uncertain regions — or error bars for judging durations and temporal bounds**,
> and **gradient plots — using fading color or transparency — for judging
> probability values."*
⇒ **"When did it happen / how long?" → two-tone ambiguation. "How likely at
time t?" → gradient/density.** §8.4's flat band is the correct default for our
primary task; a curve is for a different question, not a better answer to the
same one. rcarbon ships exactly ambiguation (`col` inside the credible mass,
`col2` outside).

### 9.2 Four points, and four independent traditions converged on them
CIDOC-CRM **P81 ongoing throughout (inner/CERTAIN) + P82 at some time within
(outer/POSSIBLE)** 📄; OpenAtlas stores `begin_from/begin_to/end_from/end_to` 📄;
PlanningLines encodes `[[ESS,LSS],[EFS,LFS],[MinDu,MaxDu]]` as nested bars with
caps 📄 (Aigner et al., IV'05 — *users make fewer mistakes and are faster* than
with a traditional encoding); TimeViz Fig 3.27 names the same four quantities.
**Every renderer surveyed keeps only two and loses the "certainly" query
permanently** — including PeriodO, whose own model has four (its `getEndpoints`
returns `[earliestYear(start), latestYear(stop)]`, the outer hull). ⇒ our
`when` sibling's `innerFrom`/`innerTo` are not optional decoration: without them
"certainly in 1965" is unanswerable, because `Y @> possible` under-reports.

### 9.3 The theory has names for our two knobs
📄 Dyreson & Snodgrass, *"Supporting Valid-Time Indeterminacy"*, ACM TODS
23(1):1–57, 1998. Representation = lower support + upper support + a p.m.f.
between them; queries carry **correlation credibility** (what to do with
indeterminacy in the DATA: keep / expected / max / min) and **ordering
plausibility** (how strict the relation test is: 100 = definite answer,
1 = possible answer), yielding nested Definite ⊂ Probable ⊂ Possible result
sets — with **linear** evaluation cost, unlike general probabilistic DBs.
⇒ §8's `{certainty: 'possible'|'necessary'}` is ordering plausibility at its two
endpoints; `rule` at ingest is correlation credibility fixed once. Both knobs
are 28 years old and named.

### 9.4 Verified database facts (✅ run against postgres:16-alpine)
- **Omitted bound ≠ `infinity` bound**: `upper_inf('[2020-01-01,)')` = t but
  `upper_inf('[2020-01-01,infinity)')` = f, and the omitted form *contains*
  `'infinity'::timestamptz` while the explicit form does not. ⇒ use the omitted
  bound for EDTF's *unknown* end, reserve `infinity` for *explicitly ongoing* —
  the `..`-vs-empty distinction §6 flags as universally lost, with a storage
  representation that actually preserves it.
- **Multiranges merge ADJACENT members silently**: `'{[1,3),[3,5)}'` becomes
  `'{[1,5)}'`. ⇒ a multirange **cannot** represent EDTF's `[1667,1668,1670..1672]`
  ("one of these years, definitely not the others"). Use one row per candidate
  with a group id. (Deferred in §8.6, but this is *why*.)
- Allen ↔ PG operators, verified: `&&` covers everything except `< > m mi`;
  `<<` covers `<` AND `m` (`[1,5) << [5,9)` = t); `-|-` is `m`/`mi`; **no single
  operator is `meets` alone**. SQL:2011 publishes the same mapping (`PRECEDES` ≡
  before OR meets) — Kulkarni & Michels, SIGMOD Record 41(3), 2012, which also
  confirms SQL:2011 has **no slot for uncertainty at all**: period endpoints are
  ordinary DATE columns, and the standard's own future-work list never mentions
  it. Bitemporality is not a substitute — it records *when we believed*, never
  *how sure we are when it happened*.

### 9.5 Aggregation at pixel-column resolution (fixes §8.4's broken lane sum)
📄 M4 (Jugel et al., PVLDB 7(10), 2014, VLDB best paper): group into exactly `w`
spans, one per **pixel column**, and it is *proven* that per-column min/max of
value and time is required for an error-free line rendering; `w` is bounded by
the display, not by `n`. The uncertain-interval analogue is the **aoristic bin**:
one bin per pixel column, mass `1/(b−a)` per item (Ratcliffe 1998/2000; Ashby &
Bowers 2013 for the cleanest OA definition), **divided by the number of
overlapping periods** so coarsely-dated items don't dominate (aoristAAR's
`period_correction`; PeriodO's 4-px histogram counts coverage, not mass, and has
exactly this bias). Pair the curve with a rug of individuals — rcarbon's
`barCodes()`, TimeDensityPlots' bar-panel-plus-silhouette.

### 9.6 Deep time: regime-swapping, not a log axis (✅ read from ChronoZoom source)
`Settings.maxPermitedTimeRange = {left: -13700000000, right: 0}` — a **signed
float in YEARS**, not ms — with `deeperZoomConstraints` capping zoom depth
*per era* (you cannot zoom to a day inside the Hadean), and `timescale.js`
picking one of three tick sources (`cosmos` / `calendar` / `date`) by
`log10(viewport span)`: **the log selects the tick source, it does not warp the
axis.** Alvarez rejected a log axis outright. Corroboration: d3 ships no
logarithmic time scale at all; TimelineJS bolts on a parallel `cosmological`
big-number path and drops sub-year precision on it, because JS `Date` walls at
±271821 BCE. ⇒ **never use a JS Date as the internal coordinate** (we already
don't — epoch µs numbers — but a heritage deck spanning 13.8 Gyr needs the same
signed-offset + per-era-cap treatment, and PeriodO's 1-px clamp for sub-pixel
marks).

### 9.7 The gap, stated plainly
No JS timeline library surveyed has a field for uncertainty (vis-timeline,
TimelineJS3, d3-timeline, patternfly, visavail, Histropedia). The one tool that
*models* period disagreement discards half its model at render. The one
authoring tool that *knew* it should encode uncertainty put it in Future Work
("we opted for simplicity over expressiveness") and shipped without it. The
archaeology R packages get the statistics right and render static PNGs in base R.
**Nobody has shipped an interactive, zoomable, uncertainty-native timeline.**
