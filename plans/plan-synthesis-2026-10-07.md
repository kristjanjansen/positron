# Positron: a studio, a practice, and a set of invitations

Comprehensive synthesis of the project discussion, source inspection, artistic references and presentation proposals. 7 October 2026.

## What this document brings together

Positron is best understood at this stage as **an artist-built R&D studio for learning, experimenting and composing with programmable media**. It connects sound, image, code, gestures, recordings and devices through reusable tools for interfaces, routing, time, capture and execution. Its ambition includes sharing the means of making, rather than only presenting finished works.

That gives the project a coherent purpose without requiring every use to become one product or every audience to hear the same pitch. A musician can encounter a playable radio. A learner can encounter an oscillator. A researcher can encounter a comparison of timing policies. An archivist can encounter the distinction between surviving evidence and reconstruction. A developer can encounter a reusable adapter, interface or skill.

The strongest organizing question is: **What becomes possible, understandable or easier to compose because these things share working parts?**

This document replaces the earlier outline as a synthesis. It retains useful language, updates architectural claims after reading the repository, and incorporates the later Moholy-Nagy discussion. It distinguishes source-grounded implementation from interpretation and proposed work. It is a research and presentation document, not a reliability certification or a business plan.

### Contents

1. The project in a few useful formulations
2. Its building blocks and conceptual distinctions
3. Interfaces, hardware, portability and skills
4. Learning, teaching and the different modes of use
5. Radio and Draw as concrete entry points
6. Synchronization: why old techniques return
7. A historical map and expanded reference guide
8. Moholy-Nagy and the composition of a whole situation
9. Bret Victor and explanations that operate
10. An honest assessment and contemporary relatives
11. What changes in the original slides
12. A modular slide bank and six presentation paths
13. A TechTrack presentation and a concrete invitation
14. Candidate subprojects and useful next proofs
15. Source notes and reading order

## 1. The project in a few useful formulations

There is no need for a single sentence to carry every dimension of Positron. These formulations serve different situations.

**General introduction:** Positron is a programmable studio for learning, experimenting and creating with media.

**Artistic introduction:** Positron lets me compose relationships between sound, image, gesture, archives and people, and share the tools for making those relationships.

**Technical introduction:** Positron connects media programs, devices and recordings through reusable interfaces, connection descriptions, explicit time policies and compositional timelines.

**Educational introduction:** Start with a playable example. Understand its parts. Change it. Build something of your own.

**Research introduction:** Positron makes media processes inspectable: how signals travel, how time is shared, how an action is recorded, and what reconstruction adds.

**Underlying purpose:** My own creative practice becomes a means of self-expression for other people. A useful name for this is **expressive toolmaking**.

**Short recurring phrase:** Connect signals. Share time. Compose experiences.

“Distributed media composition” is a useful technical category. “Studio” is a better opening word for most audiences: it suggests a place to work, learn and make. “Platform” can follow once an audience has seen reuse in practice. The repository itself identifies the project as R&D rather than a product.

## 2. Building blocks and conceptual distinctions

The source reveals more structure than the front-page collection of demos initially conveyed. These concepts should become the vocabulary behind the presentations, without requiring every audience to learn the whole vocabulary.

| Building block | Responsibility | Evidence and boundary |
|---|---|---|
| Sources and events | Identify material and record changes or observations. | Timeline and demo implementations. Different capture types retain different aspects of an action. |
| Traces | Keep captured temporal material. | A trace is distinct from a new composition that refers to it. |
| Quotations | Refer to a source passage with placement, boundaries, rate, repetition and provenance. | Serializable score values in `timeline/score.mjs`. A quotation can preserve a relationship to its source. |
| Scores | Arrange quotations and temporal relationships. | Score loading and nested arrangement exist. This does not establish one universal format for every demo. |
| Named marks | Address a meaningful boundary in a source. | Marks can follow a recut if their identity and updated position are maintained. No automatic recognition of a chorus is implied. |
| Nested timelines | Relate several time domains and playback rates. | `timeline/nested.mjs` maps decks and fragments, reporting capability limits or degradation. |
| Adapters | Translate timeline behavior into a particular medium or instrument. | Transport separates actuation, state reduction and state assertion. Replay depends on the adapter's contract. |
| Reconstructions | Derive an interpretation from captured material. | Evidence and derived lanes are separate; interpolation is supplied. Higher reconstruction tiers need a supplied implementation. |
| Evidence policies | Select which kinds of recorded or derived material may be viewed or actuated. | Recorded-only and permitted restoration tiers are explicit. “Attested” is an internal classification, not authentication. |
| Uncertain time | Represent an imprecise date or position honestly. | Bounds, original wording and interpretation rules are separate from reconstructed content. |
| Views | Show the same material through different queries. | Timeline lanes are queries into a deck rather than separate containers of copied events. |
| Nodes and ports | Describe participants and what they can send or receive. | Runtime registry and patch-bay declarations expose capabilities. |
| Links and sessions | Describe connections and establish the appropriate transport. | Control routing differs from audio/video/file sessions. The bay is not one generic byte pipe. |
| Mappings | Transform a relationship between control values. | MIDI range/filter/curve transformations are implemented. General transformation of every medium is not established. |
| Scenes | Change the set of relationships in an experience. | Patch-bay scene recall applies differences, retaining common links. New links still require opening. |
| Clocks and time policies | Decide what “now” means for a particular operation. | Local, shared and media time are distinguished, with arrival, scheduled, presentation-following and beat policies. |
| Rendering | Run a composition under a virtual clock. | Offline rendering shares the timeline engine. Event-trace determinism is different from bit-identical audio across browsers. |
| Interfaces | Make these structures perceivable and playable. | Controls, panels, timelines, layouts, hardware screens and live slides. |
| Skills | Package a reproducible way of assembling and using the system. | Setup instructions and examples are agent-readable working knowledge, distinct from runtime code. |

### Four distinctions with unusually strong explanatory value

**Trace versus score.** A recorded action and a composition made from it are different objects. Keeping them distinct supports reuse without silently rewriting the original. “Keep the trace. Compose a new score.”

**Evidence versus reconstruction.** A smoother result can be useful, but it should remain distinguishable from what was captured. This is relevant to gesture, restoration and generative media. “Show what reconstruction adds.”

**Scheduling versus presentation.** Sending an event at a time does not guarantee that a person sees or hears it at that time. Media playback, buffering and device response intervene. “Follow the moment people actually see.”

**Distribution versus agency.** Several devices can play one score while one person retains all decision-making power. Collective performance additionally needs roles, negotiation and intelligible consequences. “Who conducts the system?”

These distinctions connect artistic questions to real implementation choices. They are stronger public ideas than an inventory of supported protocols.

### Questions still worth investigating

Can a complete experience be described as a portable bundle of graph, scores, interfaces, assets and instructions? How consistently can a gesture trace be rebound to another instrument? How do manual and automated controls negotiate ownership? Which capabilities and failures are visible to a participant? How much of the shared architecture is actually reused across the demos?

These are architectural questions, not diagnoses that the project lacks the corresponding features. The next inspection should follow complete workflows and current callers rather than treating old plans as authoritative.

## 3. Interfaces, hardware, portability and skills

### The interface kit is part of the compositional medium

The kit includes input controls, status displays, timelines, layouts, device panels, hardware interfaces, diagrams and slides. It can make an underlying process legible as well as controllable. The Circuit, Evolution and TASCAM examples connect familiar physical instruments with visible panels. The hardware kit describes the Pico router's real firmware, screen and keys running in the browser; no hardware test was performed in this research.

The conceptual opportunity is **several representations of one working thing**: a physical knob, a browser slider, a parameter value, a recorded gesture and a line of code can expose different aspects of the same activity. That is an organizing idea supported by several examples, not proof of one universal representation system.

An interface can also follow an instrument's activity. Showing movement, signal state and routing can communicate artistic agency to an audience. The appropriate representation depends on the work: a visible relationship may be more expressive than a dense technical dashboard.

### Portability has several meanings

Positron explores streaming the result and moving the program that generates it. The examples include a SuperCollider subset, Faust in the browser, original Plaits C++ compiled to WebAssembly, and shaders rendered in a browser and on a Raspberry Pi. These are different portability mechanisms, with specific supported targets.

“The same instrument, another place” is useful language when the actual implementation is reused. “Run anywhere” would overstate the evidence. A transportable program still needs a compatible runtime, device capabilities and an appropriate control interface.

Microcontrollers are therefore more than a small-screen endpoint. They make sensing, physical controls and local execution part of the same practice. The browser can be an explanation and simulation surface; the device can be a situated instrument.

### A skill distributes practice

The preferred distribution method is not only a library of components. It includes instructions an agent or person can follow to start from an example, assemble a site and adapt it. The deliverable becomes **a way of making**.

This resembles Dan Sandin's emphasis on distributing the knowledge required to reproduce an instrument. It does not imply identical licensing. Positron's own code, dependencies, samples and source media have separate rights and conditions.

Agent capability is strongest when operations have explicit devices, types, parameters, scores, constraints and feedback. The wish demo's language-model connection of instruments is a concrete starting point. It should not be expanded rhetorically into general autonomous orchestration without further evidence.

## 4. Learning, teaching and modes of use

The educational aspect can be a design spine connecting the project, rather than a separate educational product. A playable slide can contain code, controls, a scope and a synth. In the readable slide implementation, the lesson uses working media components: the explanation contains the thing being explained.

**The lesson is an instrument.** A learner can keep changing it after the explanation ends.

### A gradual learning path

1. Play an existing example and hear the consequence of a change.
2. Isolate one primitive, such as an oscillator, gain control or filter.
3. Make the signal and its parameters visible.
4. Read and edit the generating code.
5. Compose primitives into a more complex instrument.
6. Add another representation or controller, such as MIDI or a physical knob.
7. Capture an action and inspect its history.
8. Reuse, render, connect or share the result with instructions.

This is a proposed teaching progression. The source already provides synth-lesson steps including waveform, volume, pitch, filtering and modulation; the entire progression above has not been verified as one finished course.

Papert's constructionism supplies the educational rationale: make a meaningful artifact while learning. Resnick's accessible entry, increasing depth and varied creative paths help evaluate the environment. Ableton Learning Synths demonstrates focused browser explanations; Sonic Pi demonstrates continuity between learning and performance; Faust demonstrates continuity between executable lessons and deployable DSP.

Use **“established media languages and open standards”**, rather than “no DSLs.” Faust is a domain-specific language. SuperCollider is an established language and environment, not an interoperability standard. Custom schemas can still be necessary. The valuable claim is that learners gain transferable concepts and work with existing ecosystems instead of learning an unnecessary private language for every example.

### Purpose, audiences and outputs should remain distinguishable

| Mode | Person's question | Useful output |
|---|---|---|
| Learning | How does this work? | A modified example and an explanation. |
| Teaching | How can someone understand this through experience? | A playable lesson, slide sequence or workshop. |
| Experimentation | What happens if I connect or change this? | A sketch, prototype or surprising behavior. |
| Research | What can I discover and demonstrate? | A comparison, measurement, reproducible experiment or finding. |
| Artistic development | What experience do I want to make? | An instrument, composition, performance or installation. |
| Tool development | What should someone else be able to build? | A reusable primitive, adapter, interface or skill. |
| Product or service development | What recurring need can I support reliably? | A maintained application, commissioned system or service. |

These are modes of work rather than mutually exclusive market segments. One person can move through several. Self-expression runs across them; it is a purpose rather than another row.

The strongest initial external audience seems to be curious musicians, artists and creative developers who want to understand and adapt an instrument or media experience. This is a positioning judgment, not demonstrated demand. Educators, heritage practitioners and technical researchers need their own entry points and evidence.

## 5. Radio and Draw: two concrete entry points

### Radio: make the space between stations playable

**Existing foundation:** a radio demo with granulation and wet/dry control, as described by Kristjan and the project index.

**Proposed change:** replace discrete station-selection buttons with a wide tuning slider. Give stations positions on a virtual band. Near a center, reception is clear; between centers, sources overlap, fade, filter or acquire interference. These positions need not represent actual broadcast frequencies.

Keep the control meanings distinct: tuning selects and blends material; granulation transforms it; wet/dry sets the processed mix. The interface should communicate those relationships through listening and visible state.

The interesting material is the transition itself. An old radio dial supplies a familiar model for a contemporary compositional act: discovering a voice, losing it, hearing another arrive, dwelling between intelligible sources.

**Slide:** “Between stations.” Turn the radio dial into an instrument. Travel through voices, overlapping signals and interference, then reshape what you find.

**Possible experiment:** compare discrete selection with continuous tuning. Does a participant explore more? Can they understand which part of the result comes from source mixing and which from granulation? This is a testable interface question without requiring a startup thesis.

### Draw: how an action survives a recording

**Source-grounded foundation:** Draw retains dense captured pointer evidence separately from a sparse derived record. Sampling can be explored after capture. A continuous reconstruction control blends hold, linear and spline behavior. Its renderer and pointer adapter use the reconstruction machinery.

Draw is therefore more than a sampling tutorial. It can let someone experience the distance between a performed action, a stored trace and a reconstructed appearance.

Sampling rate, coordinate precision, event timing and reconstruction are different decisions. More points do not automatically settle accuracy. A smooth line may communicate continuity while adding a path that was not captured. This can be desirable in an artwork and problematic when mistaken for historical evidence.

| Draw extension | Question it exposes | Status |
|---|---|---|
| Trace and reconstruction together | Which parts were captured and which were inferred? | Existing separation provides a foundation; fuller explanatory presentation is proposed. |
| Gesture controls sound and image | How does a small action become perceptible? | Proposed experience built on captured gesture and adapters. |
| Several performers, separate tracks | Who contributed what to a collective instrument? | Proposed composition and interface design. |
| A deliberately damaged trace | How much can we know from partial evidence? | Proposed teaching and heritage demo. |
| Rebind a gesture to another parameter | What survives when an action changes medium? | Proposed reusable workflow; cross-demo completeness unverified. |
| Responsive behavior beyond replay | What is recorded motion, and what is an authored rule? | Proposed extension informed by Bret Victor. |

Gesture visibility should communicate action and consequence, not claim to reconstruct a performer's entire intention. Michel Waisvisz's bodily instruments and NIME mapping research make this boundary particularly useful. Forsythe's Synchronous Objects demonstrates how one performance can yield several analytical and artistic representations.

### Collective performance and the remembered scientific-instrument studio

Stockhausen's Mikrophonie I provides a concrete precedent for distributing excitation, microphone action and electronic transformation among performers. It is not precisely a one-knob-per-person work. Willem Twee's documented work with historical test equipment and collective jams is a close match to the studio idea; Langham Research Centre demonstrates vintage electronic instruments as continuing performance resources.

The exact installation Kristjan remembers has not been identified. Keep that memory separate from the documented references.

**Proposed work:** one instrument, several hands. Each person controls an intelligible aspect of a shared result. Preserve individual control traces and make the relationships visible. Compose role changes as carefully as parameter changes.

## 6. Synchronization: why old techniques return

The observation about claps and timecode in pixels is compelling because it concerns **where evidence of time lives**.

A clap provides a visible and audible event. A marker embedded in the image travels through the image path. A metadata field travels through a separate representation that an intermediate system may preserve, rewrite or discard. When a delivery chain does not expose trustworthy timing metadata, the content itself can provide an observable witness.

This is not proof that all CDNs strip all metadata. Caching and transcoding are different operations; behavior varies with formats, encoders, players and services. Pixel markers can also be cropped, obscured or degraded. A displayed time label does not synchronize clocks by itself.

Historical television timecode and a contemporary visible frame label are related strategies but not identical. VITC historically occupied the video blanking interval rather than ordinary visible picture content. The broader continuity is that timing information can be carried within the signal path.

### Four different timing questions

| Question | What a useful experiment observes |
|---|---|
| Which source frame or event is this? | Source identity, frame number or timestamp carried through the path. |
| Are sound and image aligned? | A simultaneous visible/audible marker and their measured output offset. |
| Do participants agree on a clock? | Clock relationships, scheduling policy, uncertainty and drift. |
| What is actually being presented now? | Playback state, stalls and presentation timing at the receiver. |

Positron's explicit local/shared/media time and media-master behavior fit this separation. When the relationship needed for a timing decision cannot be established, holding is a meaningful policy rather than pretending to know.

The historical attraction is not that digital infrastructure has failed and we must return to analog. It is that sophisticated systems still need observable reference points. An ordinary clap can reveal a relationship that an opaque pipeline conceals.

**Candidate work: “Time witness.”** Put source identifiers, a visible pulse and a corresponding sound through different delivery paths. Let people inspect what changed. Keep source time, arrival time and presentation time separate.

**Candidate work: “Delay as material.”** Compare immediate response, compensated alignment and deliberately delayed interaction. Electronic Cafe makes a strong historical companion: delay affects the social and artistic structure of a performance, not only its engineering quality.

## 7. Historical map and expanded reference guide

This is a network of shared questions, not a lineage proving that everyone pursued the same system or directly influenced Positron.

| Period | Recurring question | Selected examples |
|---|---|---|
| 1920s–30s | Can heterogeneous sensory elements form one composition? | Moholy-Nagy's theatre proposals, graphic score and Light Prop. |
| 1950s–60s | Can cinema, machinery, sound and performers share a stage? | Laterna magika, Polyekran, Mikrophonie I, E.A.T. |
| 1970s | Can signals become instruments, and distance become a performance space? | Kurenniemi, the Vasulkas, Sandin, Satellite Arts. |
| 1980s–90s | Who authors a networked or sampled work? What is a grain? | Ascott, Oswald, MODELL 5, gesture-based instruments. |
| 2000s–10s | Can databases, movement and behavior become reusable compositions? | Soft Cinema, Reactable, Synchronous Objects, active archives, Victor. |
| Present practice | Can those concerns become approachable, portable and reproducible working parts? | ossia, libmapper, RNBO, Hydra and Positron's own integration. |

### A. Composing media, space and participation

**1. Moholy-Nagy: Theater of Totality and Mechanized Eccentric.** Key concept: people, movement, light, sound and other sensory elements participate in a composed situation. Building blocks: graphic organization, machinery, projection, amplified gesture and audience space. Deliverables: writings and a graphic score, alongside related practical stage work. Positron connection: Partitur and the larger possibility of scoring relationships across media. The deeper reading follows in section 8. [Foundation chronology](https://www.moholy-nagy.org/chronology/); [primary essay](https://effetsdepresence.uqam.ca/upload/files/articles/theater-circus-variety.pdf).

**2. Laterna magika and Polyekran.** Key concept: film participates in live performance and spatial presentation. Building blocks: performers, recorded sequences, projection surfaces and precise coordination. Deliverables: stage productions and multi-screen environments associated with Alfréd Radok and Josef Svoboda, prominent at Expo 58. Connection: compose the relationship between a screen and a space. Laterna magika and Polyekran are related approaches, not interchangeable names. [National Theatre](https://www.narodni-divadlo.cz/en/ensembles/laterna-magika/about-us); [research project](https://laterna-research.cz/?page_id=500).

**3. E.A.T., 9 Evenings: Theatre and Engineering, 1966.** Key concept: collaboration between artists and engineers creates new performance situations. Building blocks: communications equipment, sensing, switching, sound sources and theatrical coordination. Deliverables: performances, custom systems and an enduring organization. Cage's Variations VII brought external sounds into the venue through radios and telephone lines. Connection: routing can itself be an artistic decision; reusable integration can outlast a single work. [E.A.T. history](https://www.experimentsinartandtechnology.org/9-evenings-theatre-engineering); [Cage archive study](https://www.fondation-langlois.org/9evenings/e/john-cage/background.html).

**4. Galloway and Rabinowitz: Satellite Arts and Electronic Cafe.** Key concept: distant participants inhabit a shared mediated performance space. Building blocks: composited video, sound, communications, local venues and, in later work, MIDI. Deliverables: telepresence performances, public installations and connected communities. Connection: particularly close to remote instruments and shared rooms, including the consequences of delay. Ask whether latency should be hidden, compensated or composed. [Artists' account](https://ecafe.com/museum/cyberart92/Welcome_to_ECI.html).

**5. Roy Ascott: La Plissure du Texte, 1983.** Key concept: distributed participants author a changing narrative together. Building blocks: network nodes, roles and text contributions responding to others. Deliverable: a collaborative artwork and later reinterpretations. Connection: distribution changes authorship, not merely output location. Shared clocks do not answer who may change the work. [Project history](https://lpdt2.wordpress.com/lpdt1/).

### B. Signals, instruments and the circulation of knowledge

**6. Erkki Kurenniemi: DIMI-O, 1971.** Key concept: images and movement become sources for electronic sound. Building blocks: camera input, conversion and immediate feedback. Deliverables: an instrument and performances, with later reconstruction. Connection: a mapping between media can itself be an instrument. Kurenniemi also has a direct presence in Positron's archive work. [Kiasma account](https://lehti.kiasma.fi/16.php?id=4&lang=en).

**7. The Vasulkas and Rutt/Etra.** Key concept: manipulate the processes that generate or display electronic images. Building blocks: raster control, waveforms, video sources and modified displays. Deliverables: instruments, video works and technical documentation. Connection: signal-oriented image-making and cross-media control. Historical scan processing changes display scanning; it is not identical to a shader or digital stream transformation. [Vasulka archive](https://vasulka.org/Kitchen/essays_furlong/K_Furlong.html); [scan-processor manuscript](https://www.videohistoryproject.org/node/7044).

**8. Dan Sandin: Image Processor and Distribution Religion.** Key concept: distribute an instrument together with the knowledge needed to reproduce it. Building blocks: modular analog video processing, routing and construction documents. Deliverables: working hardware and reproducible building information. Connection: unusually close to skills as a preferred distribution method. The comparison concerns cultural practice, not equivalent licenses. [Instrument and statements](https://www.vasulka.org/archive/eigenwelt/pdf/132-135.pdf).

**9. Reactable.** Key concept: the structure of a musical patch becomes tangible and visible. Building blocks: physical objects, tracking, projection, modular synthesis and feedback; related reacTIVision/TUIO separate tracking from applications. Deliverables: instruments and interaction research. Connection: the UI kit can expose composition rather than decorate it. [UPF history and research](https://www.upf.edu/web/mtg/reactable).

**10. Michel Waisvisz: The Hands / STEIM.** Key concept: bodily movement and effort shape electronic sound. Building blocks: sensors, physical interfaces, mappings and performer practice. Deliverables: evolving instruments, performances and documentation. Connection: control traces preserve part of an action, while bodily engagement exceeds the data stream. [Instrument research](https://pure.ul.ie/en/publications/the-hands-the-making-of-a-digital-musical-instrument/); [Digital Canon](https://www.digitalcanon.nl/artworks/michel-waisvisz/).

**11. Stockhausen: Mikrophonie I, 1964.** Key concept: electronic transformation is an ensemble performance role. Building blocks: tam-tam excitation, microphone action and filters shared among six players. Deliverables: score, performances and recordings. Connection: a shared instrument can distribute distinct responsibilities. Do not reduce the original to one knob per person. [Publisher](https://www.universaledition.com/en/Mikrophonie-I/P0026684); [recording account](https://www.stockhausen-verlag.com/Stockhausen_Special_Edition_CD14.php).

**12. Willem Twee Studios and Langham Research Centre.** Key concept: historical electronic equipment remains an active performance and teaching resource. Building blocks: oscillators, filters, patch bays, test equipment and collective practice. Deliverables: studios, workshops, concerts and recordings. Connection: useful context for the remembered scientific-instrument ensemble, without identifying that exact event. [Willem Twee](https://www.willem-twee.nl/studio-courses-and-workshops); [Langham](https://www.langhamresearch.co.uk/).

### C. Sampling, remix and active archives

**13. John Oswald: Plunderphonics.** Key concept: existing recordings become compositional material, with source recognizability often consequential. Building blocks: recorded fragments and transformation. Deliverables: the 1985 essay and recorded works. Connection: a fragment can be a cultural quotation rather than anonymous texture. Full-page retrieval failed in the earlier research, so this characterization remains broad. [Original essay](https://www.plunderphonics.com/xhtml/xplunder.html).

**14. Granular Synthesis: MODELL 5, 1994.** Key concept: audiovisual material can be reorganized at the grain/frame level. Building blocks: recorded performance, repetition, temporal manipulation and multiple screens. Deliverable: an audiovisual performance/installation transforming recordings of Akemi Takeya. Connection: a direct precedent for audiovisual granularization; Positron's potential contribution is reusable integration, not the invention of video grains. [Ars Electronica](https://ars.electronica.art/outofthebox/de/modell5/).

**15. Manovich and collaborators: Soft Cinema, 2002.** Key concept: a database and authored rules generate variable films and layouts. Building blocks: corpus, selection rules, spatial arrangement, narration and music. Deliverables: installations, editions and a publication. Connection: distinguish the database, the rules and one particular run. Database cinema and granular synthesis operate at different scales. [Project account](https://manovich.net/index.php/projects/soft-cinema-zkm).

**16. Constant: Kurenniemi active archive, 2012.** Key concept: an archive becomes an ongoing site of computational interpretation. Building blocks: audiovisual/textual records, software experiments and process documentation; Nicolas Malevé and Michael Murtaugh were central collaborators. Deliverables: research and an active archive associated with dOCUMENTA (13). Connection: preserve context while making new experiences from surviving material. [Constant](https://www.constantvzw.org/site/Online-Archive-Erkki-Kurenniemi-In-2048,1681.html).

**17. FIAF: ethical digital film restoration.** Key concept: historically grounded restoration differs from modernization. Building blocks: original scans, historical research, preservation masters and documented interventions. Deliverable: professional guidance, including preserving historical frame rates and rejecting generated frames that introduce nonexistent imagery into restoration. Connection: Draw can make the distinction between plausible continuity and surviving evidence tangible. This does not prohibit interpolation in creative works. [Digital statement, part III](https://www.fiafnet.org/pages/E-Resources/Digital-Statement-part-III.html).

**18. The London Charter.** Key concept: document the reasoning behind a cultural-heritage visualization, including evidence, assumptions and uncertainty. Building blocks: source references and paradata describing interpretive decisions. Deliverable: principles for responsible computer-based visualization. Connection: provenance should explain how an interpretation was made, not merely name a file. [Charter](https://www.londoncharter.org/).

### D. Gesture, visible structure and learning

**19. Golan Levin: Curly / Yellowtail, 1998–2000.** Key concept: a drawn gesture becomes reusable animated behavior, with Yellowtail also producing sound. Building blocks: shape, drawing speed, procedural motion, looping canvas and image-to-sound mapping. Deliverables: interactive software and a candid design report. Connection: a close relative of Draw; procedural animation is different from faithful replay. [Design report](https://flong.com/archive/texts/reports/report_yellowtail/index.html).

**20. Forsythe, Zuniga Shaw, Palazzi and collaborators: Synchronous Objects, 2009.** Key concept: one dance becomes several visual and analytical objects. Building blocks: movement observation, dancer accounts, cueing, alignments and data-driven graphics derived from One Flat Thing, reproduced. Deliverables: an interactive artwork and documented process. Connection: make collective structure visible and reuse performance as a resource. The team does not present it as a complete preservation score. [Project](https://synchronousobjects.osu.edu/); [data process](https://synchronousobjects.osu.edu/blog/2009/04/details-on-the-data/index.html).

**21. Making Mappings, NIME 2021.** Key concept: control, legibility and sound are related design concerns in live performance. Building blocks: mappings and practitioner accounts of their design. Deliverable: research based on interviews. Connection: gives a precise vocabulary for the invisible-knob problem, without prescribing a dashboard for every performance. [Paper](https://nime.pubpub.org/pub/f1ueovwv/release/1).

**22. Papert and Resnick.** Key concept: learn by constructing personally meaningful things, with an accessible beginning and multiple routes toward sophistication. Building blocks: editable artifacts, feedback, sharing and reflection. Deliverables: educational environments and research around Logo and Scratch. Connection: Positron's teaching quality depends on a designed learning progression, not just runnable examples. [Constructionism](https://el.media.mit.edu/logo-foundation/what_is_logo/logo_and_learning.html); [wide walls](https://mres.medium.com/designing-for-wide-walls-323bdb4e7277).

**23. Ableton Learning Synths.** Key concept: understand synthesis through focused direct manipulation and listening. Building blocks: oscillators, envelopes, filters, modulation and a playground. Deliverable: browser lessons with paths into recording/export. Connection: a strong model for gradual explanations; Positron can additionally reveal generating code and connect it to other media. [Learning Synths](https://learningsynths.ableton.com/).

**24. Sonic Pi.** Key concept: learning programming and making performances can use the same environment. Building blocks: short code examples, feedback, samples, synthesis, effects and timing. Deliverables: software, tutorials, compositions and live performances. Connection: education and artistic practice need not become separate identities. [Project](https://sonic-pi.net/); [tutorials](https://sonic-pi.net/learn.html).

**25. Faust's educational ecosystem.** Key concept: an executable lesson can become deployable DSP. Building blocks: code, libraries, diagrams, generated controls and target toolchains. Deliverables: tutorials, editors and generated applications/components. Connection: real media-generation tools can remain underneath approachable lessons. [Quick start](https://faustdoc.grame.fr/manual/quick-start/); [learning resources](https://faust.grame.fr/community/learning/); [deployment](https://faustdoc.grame.fr/manual/deploying/).

**26. Bret Victor.** Key concept: make behavior, time and relationships directly inspectable and manipulable. Building blocks: immediate feedback, visible execution, parameterized drawings and simulations. Deliverables: essays and research demonstrations, including Stop Drawing Dead Fish. Connection: a lesson or interface becomes a thinking tool; replay and authored behavior remain different. Detailed reading follows in section 9.

### E. Contemporary technical relatives

**27. Max and RNBO.** Key concept: compose connected processing objects and export supported programs to other targets. Building blocks: patches, parameters, UI and export runtimes. Deliverables: applications, patches, C++/WebAssembly and other supported exports. Connection: portability and patching are established territory; Positron needs to demonstrate its particular distributed and archival workflows. [Max](https://cycling74.com/products/max); [RNBO](https://rnbo.cycling74.com/).

**28. libmapper and WebMapper.** Key concept: advertised input/output signals can be discovered and mapped dynamically. Building blocks: metadata, connections, transformations and expressions. Deliverables: library, bindings and browser interface. Connection: the closest comparison for capability discovery and control mapping; its numeric-signal focus differs from heavy media sessions. [libmapper](https://github.com/libmapper/libmapper); [WebMapper](https://github.com/libmapper/webmapper).

**29. ossia score.** Key concept: interactive intermedia compositions combine time, processing, devices and conditions. Building blocks: nested timelines, graphs, parameters, protocols and documented distributed execution. Deliverables: editor/interpreter, libossia and executable scores. Connection: the strongest overall architectural relative found here. Browser entry, evidence-aware archives and skills are useful comparison axes, not proven unique features. [Project](https://ossia.io/); [distributed scores](https://ossia.io/posts/distributed/).

**30. Hydra and TOPLAP.** Key concept: media-generating programs change during performance. Building blocks: browser visual synthesis, transforms, feedback and networked inputs. Deliverables: environment, shared sketches, modules and performances. Connection: a close browser/live-coding relative. Hydra explicitly references Satellite Arts and Sandin, providing a documented historical bridge. [Hydra](https://github.com/hydra-synth/hydra); [TOPLAP](https://blog.toplap.org/about/).

**31. JackTrip and Bela.** Key concept: timing is part of whether an instrument or collaboration is playable. Building blocks: network audio in JackTrip; real-time audio and sensing in Bela. Deliverables: performance software and an embedded instrument platform. Connection: local response, network delay, alignment and drift are different domains. [JackTrip](https://github.com/jacktrip/jacktrip); [Bela real-time explanation](https://learn.bela.io/using-bela/about-bela/understanding-real-time/).

**32. OSC and SMIL.** Key concept: common descriptions let independently built parts cooperate. Building blocks: real-time messages in OSC; temporal containers, interaction and layout in SMIL. Deliverables: specifications and implementations. Connection: distinguish communication from composition. SMIL is a historical conceptual reference here, not a proposed implementation choice. [OSC](https://cnmat.berkeley.edu/research/projects/osc); [SMIL 3](https://www.w3.org/TR/SMIL3/).

## 8. Moholy-Nagy: compose the whole situation

Theater of Totality is especially useful because it asks an artistic question at the scale Positron is approaching: how can people and technical media form a coherent experience?

In Theater, Circus, Variety, published in the 1925 Bauhaus theatre book, Moholy-Nagy places human and technical elements on equal artistic footing. He considers magnifying faces and gestures, projecting across surfaces, locating sound beyond the expected stage position and extending action into audience space. His proposal combines participation with strong coordination.

Do not reduce this to automated theatre. A purely mechanized stage is one position the essay examines; the larger concern is an organized relationship among heterogeneous elements. Likewise, do not equate his artistic proposal with Gropius's Totaltheater architectural project.

### Different kinds of deliverable matter

| Work or project | Deliverable | Why it helps Positron |
|---|---|---|
| Mechanized Eccentric, score dated 1924 in Positron | Graphic composition | A score can address sensory relationships beyond a conventional film or music track. |
| Theater, Circus, Variety, 1925 | Theoretical proposal | Supplies an artistic question, rather than a software specification. |
| Light Prop for an Electric Stage, 1930 | Working kinetic apparatus producing changing light, reflections and shadows | A machine's behavior can generate several artistic outputs, including photographs and film. |
| Stage work including The Tales of Hoffmann, The Merchant of Berlin and Madame Butterfly | Practical scenography | Elements of the ambition entered productions even though the total ideal remained unrealized. |
| Harvard metaLAB's Light Prop project | Preservation, replication and documentation of a working object | Preserving behavior requires more than retaining a photograph of an artifact. |
| SENSEFACTORY | Contemporary explicit reinterpretation through bodily sensation, sensors, data and algorithms | Shows this historical question remains active; it does not establish identical architecture. |

The Positron relationship is interpretive: routing provides connections, timing provides temporal relationships, scenes change an arrangement, interfaces enable action, and scores make a composition addressable. Moholy-Nagy did not anticipate each of those software abstractions individually.

The most productive tension is between coordination and collective agency. An authored score, distributed improvisation and negotiated control are different artistic models. A shared timeline does not itself distribute the right to decide.

**Presentation phrases:** Compose the whole situation. Make a small action visible. A score reaches beyond the screen. Who conducts the system?

Further reading: [historical account with production images](https://theatron.hu/theatron_cikkek/performing-agitation-laszlo-moholy-nagy-and-the-1924-special-issue-of-ma-today-on-music-and-theater/), [Light Prop museum account](https://www.metmuseum.org/art/collection/search/899299), [metaLAB project](https://mlml.io/p/light-prop/), [SENSEFACTORY](https://www.sensefactory.org/en).

## 9. Bret Victor: explanations that operate

The fish reference is **Stop Drawing Dead Fish**. Victor's published description connects real-time artistic performance with artwork behaving through simulation. The relationship to Positron is strongest when an interface lets a person see and shape behavior rather than only edit its representation indirectly.

| Work | Main distinction | Positron application |
|---|---|---|
| Stop Drawing Dead Fish, 2012 | A moving picture can be authored as behavior. | Distinguish a captured gesture from a responsive rule. |
| Dynamic Pictures, 2011 | A picture varying with inputs differs from a fixed animation. | Let reusable examples respond to explicit changing conditions. |
| Drawing Dynamic Visualizations, 2013 | Drawing actions, parameters and relationships can form a procedure. | Preserve constraints and mappings alongside coordinates. |
| Learnable Programming, 2012 | Execution, state and time should be visible to the learner. | Show parameter histories, trajectories, comparisons and immediate consequences. |

A recording of a swimming-like path is not the same thing as authoring a fish that reacts to its surroundings. Draw already addresses traces and reconstruction; responsive behavioral authoring would add another layer.

Victor's addendum on dynamic visualizations emphasizes expressing relationships unambiguously rather than guessing intent. It also states that planned standalone JavaScript export was not implemented at that time. These are research demonstrations and design proposals, not evidence of a shipping universal tool.

The affinity is selective. Victor challenges the indirectness of textual programming; Positron intentionally uses established media languages. Positron can adopt visible time, immediate feedback and gradual generalization while retaining those languages.

**Proposed combined lesson:** capture a gesture controlling a form and a sound parameter; inspect its samples and reconstructed path; then introduce an explicit input that alters behavior. Keep evidence, transformation and authored rules distinguishable.

Sources: [Stop Drawing Dead Fish](https://worrydream.com/StopDrawingDeadFish/), [Dynamic Pictures](https://worrydream.com/DynamicPicturesMotivation/), [Drawing Dynamic Visualizations addendum](https://worrydream.com/DrawingDynamicVisualizationsTalkAddendum/), [Learnable Programming](https://worrydream.com/LearnableProgramming/). The earlier research read Victor's descriptions and essays, not a frame-by-frame analysis of the talk video.

## 10. Honest assessment and contemporary relatives

**My impression:** Positron feels like an artist's working studio becoming a reusable research environment. Its breadth is credible as a practice: instruments, archives, interfaces, distributed timing and teaching all arise from making things. The source's trace/score and evidence/reconstruction distinctions make it more coherent than a demo catalog initially suggests.

You can have built this particular project yourself while participating in a field with many predecessors. Authorship lies in your integration, choices, interfaces, implementations and resulting works. Independent construction does not require every primitive to be unprecedented.

“Is anyone doing the same?” needs two answers. **Many people work on overlapping capabilities. No exact equivalent was established by this research.** The second statement is a limit of the investigation, not a uniqueness claim.

| Relative | Substantial overlap | Most useful comparison |
|---|---|---|
| ossia score | Intermedia scores, time, processing and distributed execution | End-to-end composition and execution. |
| libmapper | Discovery and dynamic control mapping | How capabilities and transformations are described. |
| Max/RNBO | Connected processing and portable execution | How an instrument moves between supported targets. |
| Hydra | Browser visual synthesis and networked inputs | Entry, sharing and performance practice. |
| Sonic Pi, Faust, Learning Synths | Learning through executable media | Whether a lesson remains useful after learning. |
| JackTrip, Bela | Playability and timing | Local versus network timing requirements. |
| Active-archive and gesture projects | Material becomes inspectable and recomposable | Evidence, interpretation and visible agency. |

These are adjacent projects with different deliverables, not one list of interchangeable competitors. This is not an exhaustive current market audit.

### Where the ambition feels timely

The “more with less” intuition is plausible. Browser runtimes, WebAssembly, managed infrastructure and coding agents make it easier for one person to connect specialties that previously required more custom engineering. Explicit descriptions of devices, operations and constraints also make systems more amenable to agent assistance.

That is an inference about the conditions of making. It does not prove demand, production readiness or that integration becomes effortless. Timing, device differences and maintenance remain concrete work.

### What seems most distinctive

The promising combination is approachable browser participation, actual implementation reuse on supported devices, explicit temporal composition, heritage-aware reconstruction, and distribution of working knowledge through skills. The value needs to appear in a complete experience. A feature list cannot establish it.

The main risk is that breadth obscures the reason to enter. If each demo introduces another world, a visitor may admire the range without finding a next action. A few strong paths through shared parts would make the range feel cumulative.

The most convincing next proof is an external person making something recognizable with the system, without your continuous intervention. Follow that with several different works that visibly reuse the same parts. This would establish practical value more clearly than claiming a new category.

## 11. What changes in the original slides

The original eleven-slide outline usefully identified media movement, time, capture, archives, interfaces and distribution. It gave architecture too much early emphasis and treated many capabilities as equally important. Learning was underplayed; Draw was collapsed into generic replay; cultural references appeared mainly as a concluding justification.

| Original idea | Revision |
|---|---|
| Compose live media experiences | Lead with the particular experience the audience can understand or try. |
| A common language for connections | Keep for developers; show a relationship before introducing the bay. |
| Move media, or move program | Retain as a strong technical distinction, with supported-target boundaries. |
| Make time part of composition | Separate synchronization from delay used as artistic material. |
| From beats to centuries | Retain; distinguish clock time, media position and uncertain historical date. |
| Record the stream, replay the action | Split into trace/score, state reconstruction and performance visibility. |
| Treat archives as material | Give heritage presentations their own evidence and uncertainty story. |
| Compose the interface too | Retain and strengthen with physical/browser representations. |
| One experience, many places | Add the question of roles and agency, not only distance. |
| Distribute the know-how | Show a concrete example-to-skill workflow. |
| Old artistic ambition, shared system | Place a relevant reference beside each work instead of one broad historical finale. |

The opening should no longer imply a mature all-purpose product. The ending should be a specific invitation: try an example, teach a lesson, build a work, test a workflow or contribute a missing connection.

## 12. Modular slide bank

Each entry below has a short title, a description suitable for a slide, and a demonstration or speaker direction. Select a few for an audience; do not turn the bank into one long presentation.

| # | Title | Slide description | Demonstration or speaker direction |
|---|---|---|---|
| 1 | Between stations | Turn the radio dial into an instrument. Travel through voices, interference and unexpected combinations. | Radio foundation; continuous tuning is proposed. |
| 2 | Make the gesture visible | Show how a small action changes a sound, an image or a shared instrument. | Draw; projected instrument control is an extension. |
| 3 | One instrument, many hands | Give several people distinct, perceptible roles in one musical system. | Collective-performance proposal; Mikrophonie I as context. |
| 4 | Start by playing | Hear and see a working example before taking it apart. | Synth lesson or immediately playable demo. |
| 5 | The lesson is an instrument | Change the explanation and keep making with the result. | Live slides with code, controls and scope. |
| 6 | Small parts, more possibilities | Compose simple media primitives into instruments and experiences of your own. | Oscillator, filter, modulation; then a reused part. |
| 7 | Play it. Read it. Change it. | Gesture, code and interface offer different ways into a working system. | nola, device panels, raw/decoded data. |
| 8 | Compose the interface too | Make the underlying relationships playable and understandable. | UI kit; browser and physical controls. |
| 9 | Move the media. Or the program. | Send a rendered result, or run its generator on another capable device. | Faust, Plaits, browser/Pi shader. |
| 10 | Connect capabilities | Discover what a participant can send and receive, then choose a compatible connection. | Registry and patch bay; distinguish session types. |
| 11 | Compose the connections | A scene changes the relationships between instruments, streams and people. | Patch-bay scenes; describe link-opening limits. |
| 12 | Choose how time is shared | Arrival, scheduling, beats and media presentation need different policies. | Timing examples, without claiming universal precision. |
| 13 | Follow the visible moment | Coordinate with what is actually being presented, not only what was sent. | Media-master and presentation timing. |
| 14 | Keep the trace. Make a score. | Preserve an action, then compose new relationships to it. | Trace and quotation representation. |
| 15 | Compose with quotations | A fragment keeps its source while gaining a new place, rate and repetition. | Score and nested timeline. |
| 16 | From beats to centuries | Relate gestures, recordings and historical dates without pretending they share one clock. | time, reel, tapes, held. |
| 17 | What survived the recording? | Compare captured evidence with the continuity reconstruction adds. | Draw's dense and derived records. |
| 18 | Keep the evidence beside the image | Origins, assumptions and uncertainty belong with the material. | Archive views and evidence policy. |
| 19 | One record, several views | Inspect the same material through different questions and scales. | Query-based lanes; Synchronous Objects as context. |
| 20 | Draw what it does | Give a gesture reusable motion, then distinguish replay from responsive behavior. | Draw foundation; Victor-inspired behavior is proposed. |
| 21 | Compose the whole situation | Sound, image, gesture, people and space participate in the work. | Partitur and Moholy-Nagy. |
| 22 | Who conducts the system? | Explore authored coordination, improvisation and shared control. | An explicit participation rule, not only a clock diagram. |
| 23 | Perform it. Render it. | Use the same composition for a live run and an offline result. | Shared timeline engine; distinguish output guarantees. |
| 24 | Take the practice with you | Share an example and the instructions for making it your own. | A concrete skill and reproducible adaptation. |
| 25 | Try it with me | Help turn a personal studio into something other people can use. | End with a specific experiment and invitation. |

### Six presentations from the same material

| Audience / angle | Proposed opening | Suggested slide order | Desired response |
|---|---|---|---|
| Musicians and performers | Make the gesture part of the music | 1, 2, 3, 6, 8, 24, 25 | Try a playable instrument and discuss expressiveness. |
| Artists and curators | Compose the whole situation | 21, 2, 15, 16, 22, 24, 25 | Discuss a work, commission or collaborative experiment. |
| Educators and learners | Start by playing, learn by changing | 4, 5, 6, 7, 17, 24, 25 | Try or teach a short lesson. |
| Developers and hardware makers | Small parts, many possible instruments | 6, 8, 9, 10, 11, 12, 24, 25 | Reproduce a workflow or contribute a capability. |
| Heritage and research | What survives a recording? | 17, 18, 19, 14, 15, 16, 23, 25 | Examine evidence and try a documented transformation. |
| Collaborators and communities | One instrument, many hands | 3, 2, 11, 12, 22, 24, 25 | Join a structured collective session. |

Show only the reference needed for the argument at hand. Musicians may need Mikrophonie I; curators may need Moholy-Nagy; developers may need ossia; teachers may need constructionism. The full reference guide remains available after the talk.

## 13. TechTrack: fit the invitation to the setting

You can use a startup-style framework without pretending Positron already has a startup business model. Translate its questions into the present stage of the project.

| Expected question | A credible answer at this stage |
|---|---|
| Problem | Choose one demonstrated friction: expressive actions are hard to see; lessons stop before making; a media experiment requires too much assembly. |
| Solution | Show a working example and how shared parts make it understandable and adaptable. |
| Audience | Name the people invited to this particular trial, rather than everyone who might eventually benefit. |
| Differentiation | Explain the workflow and integration, acknowledging existing tools. |
| Traction | Present works, working examples and any actual user evidence. Do not substitute breadth for adoption. |
| Revenue | State that a model is unvalidated if asked. Separate plausible directions from established income. |
| Ask | Invite testers, workshop partners, contributors and introductions around one concrete next experiment. |

### A six-slide music-technology version

**1. Between stations.** Begin with the radio as a musical surface. Demonstrate what exists; label continuous tuning as the next interface experiment if it is still a mock-up.

**2. Make the performance visible.** A knob movement can be musically decisive and visually obscure. Show a gesture trace and its effect.

**3. One instrument, many hands.** Introduce the collective-performance idea. Explain one specific arrangement of roles.

**4. Small parts, reusable instruments.** Reveal enough of the shared system to explain how one example can become another.

**5. Take an example with you.** Show a lesson or skill that lets someone start changing a working example.

**6. Try it with me.** End with a bounded invitation and a way to follow up.

Historical material belongs beside the relevant demonstration, perhaps as one image and a sentence. Do not use several minutes of the talk to prove that the project has a lineage.

### Suggested opening in natural speech

I have been building Positron as my own studio for programmable media. I make instruments, work with recordings and archives, and connect sound, image and devices. Over time, the parts have become reusable. Now I want to find out whether other people can use them to learn and make things of their own. Rather than explain the whole system, I want to show you a few experiences and invite you to try one.

### A concrete proposed ask

I am looking for a small first group of musicians, creative developers and educators. Choose one example, change it, and tell me where the experience becomes confusing or limiting. I would also welcome a partner for a short collective-instrument workshop, and introductions to people working with electronic performance or media archives.

Choose an actual example and a manageable session length before using this invitation publicly. “Test Positron” is too broad; “make one variation of this instrument and tell me what blocked you” produces useful feedback.

Moral support and word of mouth are legitimate goals. Give supporters something concrete to describe: a playable example, a workshop or a short account of what someone made.

### Revenue can remain a hypothesis

Possible directions include commissioned installations, workshops, setup/integration support, maintained tools for a specific recurring need, and services built on reusable parts. None was established as a validated business model in this research. A public talk can honestly seek evidence and collaborators before choosing a commercial path.

## 14. Candidate subprojects and useful next proofs

These are possible works and investigations, not a promise to implement everything.

| Subproject | Artistic / research question | Reused foundation | Reviewable deliverable |
|---|---|---|---|
| Between Stations | Can source transitions become an expressive instrument? | Radio, controls, granulator | Playable tuning experiment and short user observations. |
| Visible Gesture | Can an audience perceive action and consequence? | Draw, parameter controls, views | Performance demo with captured and reconstructed traces. |
| One Instrument, Many Hands | What roles make collective control meaningful? | Ports, mappings, rooms, gesture traces | A small ensemble work with explicit roles. |
| Time Witness | What timing evidence survives a delivery chain? | Test media, timing policies, presentation observation | Comparison with clearly separated clocks and markers. |
| Delay as Material | How does delay change the form of interaction? | Shared timing and remote participation | A composition comparing several timing policies. |
| Archive as Instrument | How can a quotation remain traceable while becoming playable? | Scores, marks, provenance, uncertain time | An archival work with inspectable sources and interventions. |
| Playable Explanation | Can a learner carry a lesson into their own work? | Slides, synth primitives, skills | A short lesson ending in an editable instrument. |
| Partitur Expanded | How does a score coordinate several surfaces and participants? | Partitur, scenes, shared time | A distributed performance with a documented control model. |
| Working Apparatus | What must be preserved to reconstruct behavior? | Hardware/browser portability, provenance | A recreation with source links and explicit limits. |

The strongest immediate proof is one complete path: **play an example, inspect it, change it, preserve the result, share how it was made**. Observe another person attempting that path. Then demonstrate a second work that reuses its parts.

The useful measures are practical: where someone gets stuck, whether they understand the consequences of a change, whether the artifact remains theirs to adapt, and how much assistance is required. These measures can inform learning, artistic practice and later product decisions without forcing them into one role.

## 15. Source notes and reading order

### What was examined

This synthesis draws on Kristjan's descriptions, the earlier slide outline, the latest reference/assessment notes, the later Moholy-Nagy reading, the Positron index and readable slide source, and read-only inspection of the repository at commit **198105056f5edb1a9488ae2691c182e91ab836a9** on 7 October 2026.

Initial research relied on the index because individual demo pages returned HTTP 403. Repository inspection subsequently established the score representation, evidence policies and several other architectural claims. Earlier statements that no source was inspected apply only to the earlier stage. No device operation, broadcaster connection, end-to-end demo test or production-readiness audit was performed. Source presence does not prove every demo adopts a module or that every advertised workflow succeeds.

Key project sources:

- [Positron Studio](https://positron.studio/)
- [Repository](https://github.com/kristjanjansen/positron)
- [README at inspected revision](https://github.com/kristjanjansen/positron/blob/198105056f5edb1a9488ae2691c182e91ab836a9/README.md)
- [Quotations and scores](https://github.com/kristjanjansen/positron/blob/198105056f5edb1a9488ae2691c182e91ab836a9/timeline/score.mjs)
- [Nested temporal composition](https://github.com/kristjanjansen/positron/blob/198105056f5edb1a9488ae2691c182e91ab836a9/timeline/nested.mjs)
- [Transport, state and evidence policies](https://github.com/kristjanjansen/positron/blob/198105056f5edb1a9488ae2691c182e91ab836a9/timeline/transport.mjs)
- [Timeline views](https://github.com/kristjanjansen/positron/blob/198105056f5edb1a9488ae2691c182e91ab836a9/timeline/strip.mjs)
- [Media presentation as time master](https://github.com/kristjanjansen/positron/blob/198105056f5edb1a9488ae2691c182e91ab836a9/timeline/media-master.mjs)
- [Offline rendering](https://github.com/kristjanjansen/positron/blob/198105056f5edb1a9488ae2691c182e91ab836a9/timeline/render.mjs)
- [Connection descriptions](https://github.com/kristjanjansen/positron/blob/198105056f5edb1a9488ae2691c182e91ab836a9/demo/shell/bay.mjs)
- [Time policies](https://github.com/kristjanjansen/positron/blob/198105056f5edb1a9488ae2691c182e91ab836a9/demo/shell/timebase.mjs)
- [Scenes and patch bay](https://github.com/kristjanjansen/positron/blob/198105056f5edb1a9488ae2691c182e91ab836a9/demo/patchbay/index.html)
- [Draw](https://github.com/kristjanjansen/positron/blob/198105056f5edb1a9488ae2691c182e91ab836a9/demo/draw/index.html)
- [Playable slides](https://positron.studio/shell/decks.mjs)

Historical relationships in this document are interpretations, not claims of direct influence. Moholy-Nagy and Kurenniemi have explicit representation in the project. The other references establish related problems and practices. Direct links accompany their profiles so a reader can follow the original accounts.

### Suggested reading paths

**Artistic composition:** Moholy-Nagy → Laterna magika → E.A.T. → Electronic Cafe → MODELL 5 → Soft Cinema.

**Signals and reproducibility:** Kurenniemi → the Vasulkas → Sandin → Hydra → Positron's skills and portability examples.

**Closest architecture:** libmapper → ossia → RNBO → Positron's bay, score, transport and timebase.

**Gesture and collective action:** The Hands → Mikrophonie I → Synchronous Objects → Making Mappings → Draw.

**Learning:** constructionism → Learning Synths → Sonic Pi → Faust → Victor → Positron's playable slides.

**Heritage and interpretation:** Constant's active archive → London Charter → FIAF guidance → Light Prop preservation → Positron's evidence/reconstruction and uncertain-time models.

The public document can keep evolving around concrete works. Each new example should clarify which parts it reuses, what it enables, and what someone else can do with it.
