# Granulating and sampling video: prior art, 1957 to 2002 (2026-10-13)

Status (2026-10-14): done (reference). A 1957 to 2002 prior art survey cited by plans/plan-synthesis-2026-10-07.md, with nothing of its own built.

Research only. No code was changed for this document. Asked by the owner on
2026-10-13, after hearing that our research had almost nothing on it: *"so do
the research"*.

Marks used below:

- **READ**: the claim is in the source linked beside it, read today.
- **SECONDARY**: read today, but in a source that is itself reporting
  (Wikipedia, a dealer listing, a forum quoting somebody). Good enough to steer,
  not to quote as fact.
- **NOT CONFIRMED**: looked for and not found, or found only as a claim nobody
  sourced. Said so rather than left out.
- **INFERRED**: my reasoning about how a technique maps onto positron. Nobody
  has measured it.

No audio or video stream was opened for this document. Every source is a web
page or a PDF.

## What this adds, so nothing here re-describes it

- `plans/plan-synthesis-2026-10-07.md` §7 item 14 had MODELL 5 as one paragraph
  with one source (Ars Electronica) and no method. This file has the method, in
  the duo's own words and in their software's own parameter list.
- `research/video-art-2026-09.md` already covers slit-scan, Rutt-Etra, Paik
  feedback, datamoshing and Steina's *Machine Vision*. Slit-scan appears below
  only where it is a frame-buffer precedent, and is not recommended again.

## The headline

1. **The one primary definition of a video grain in this period is a single
   A/V frame at 25 fps, picture and sound cut together.** Granular Synthesis
   (Kurt Hentschläger and Ulf Langheinrich) wrote it down twice: in 1992 for
   MODELL 3, *"the individual grains range from single frames to entire
   sequences of frames"*, and in their software VARP 9 (1997 to 1999), which
   *"allowed accessing, combining and re-allocating single audio video frames at
   25f/sec. At that video 'grain rate' it was capable of audiovisual granular
   synthesis."* At PAL that is **40 ms**, which sits inside Roads' audio grain
   range of 1 to 100 ms, at the long end. Their own phrase is *"the rather fat
   grains of single video frames (visual content and sound)"*.
2. **Nobody in the period windowed a video grain.** Every precedent found cuts
   hard: scratch video at the edit point, Ortiz and Steina at the laserdisc
   frame, VARP 9 at the frame, the Panasonic mixer at the field. The Hann
   windowed, overlapping video grain is a 2015 paper (Forbes and Villegas),
   which says so itself: *"these examples rely on abrupt jump cuts."*
3. **The two ideas positron needs both existed by 1991 and were never in the
   same box until 1997.** Random frame access driven by a musical controller
   (Steina's MIDI violin to a Pioneer laserdisc, 1991) and picture events
   triggered by sound (the Panasonic WJ-MX50's A/V Synchro). VARP 9 is the first
   place found where a MIDI sampler's parameters address frames directly.
4. **The audio grain and the picture grain disagree about density, and the
   artists said so.** MODELL 5's notes: *"the density of events in sound
   processing is much higher than in image processing."* VARP 9's answer was to
   lock the grain to the frame clock. That is the decision positron has to make
   first, and our engine's patches run at 0.5 to 62 grains a second.

## Timeline

| year | who | what | grain or segment | how chosen | sound | hardware or software |
|---|---|---|---|---|---|---|
| 1957 to 1960 | Peter Kubelka | metric films, *Adebar*, *Schwechater*, *Arnulf Rainer* | phrases of 2 to 288 frames, sections of 576 | composed in advance, like note values | *Arnulf Rainer*: frame by frame, white noise or silence | 35mm film, hand cut |
| 1966 to 1968 | Paul Sharits | flicker films, *Piece Mandala/End War*, *Ray Gun Virus*, *T,O,U,C,H,I,N,G*, *N:O:T:H:I:N:G* | single frames at 24 fps | mapped out before shooting | a word looped (*destroy*), projector sprocket noise | 16mm film |
| 1971 | Erkki Kurenniemi | DIMI-O, the video organ | one 32 by 48 one bit frame read as a sequence | camera image thresholded | image becomes notes | custom digital, camera and monitor |
| 1984 | Fairlight (Kia Silverbrook) | CVI, Computer Video Instrument | one 256 by 256 frame store | live, ten sliders | none | rack unit, 6809 CPU |
| 1984 to 1985 | UK scratch video | Duvet Brothers, Gorilla Tapes, George Barber, Goldbacher and Flitcroft | repeat edits, edit accuracy to about 1/5 s | cut by hand to a soundtrack | sampled with the picture, cut to music | Sony Series V edit suites, Quantel Paintbox, VHS |
| 1985 | Quantel | Harry | up to 80 s of uncompressed frames on disk | editor | separate | Fujitsu disk array |
| 1985 to 1997 | Raphael Montañez Ortiz | Computer-Laser-Videos, *The Kiss* | film passages of about 1 to 10 s, scrubbed back and forth | joystick, improvised in real time | the film's own sound, treated (NOT CONFIRMED how) | Apple computer, laserdisc, oscillator, U-matic |
| 1989, 1993 | Martin Arnold | *pièce touchée*, *passage à l'acte* | single frames, 18 s stretched to 16 min | frame by frame, forward and back | *passage à l'acte* stutters the dialogue with the picture (NOT CONFIRMED in a primary) | optical printer |
| 1990 | NewTek | Video Toaster | two frame buffers | switcher | none | Amiga 2000 |
| 1991 (SECONDARY) | Panasonic | WJ-MX50 mixer, Still, Strobe and A/V Synchro | strobe interval 0.03 to 2.1 s | a timer, or **the audio level** | sound triggers the freeze | frame synchronizers on both buses |
| 1991 | Steina | *Violin Power*, laserdisc version | any frame on the disc | MIDI violin strings point at frames | the violin plays, the disc's sound follows the picture | Zeta MIDI violin, Pioneer VLD-8000, PC |
| 1991 to 1995 | Emergency Broadcast Network | *Commercial Entertainment Product*, *Telecommunication Breakdown* | TV clips, half a second for a sung syllable (SECONDARY) | edited, then played from a keyboard | sampled with the picture | edit suites, then a Mac Quadra 950 video sampler by AVX Design |
| 1991, 1992 | Granular Synthesis | *Piranha*, *Granular Synthesis*, MODELL 3 | single frames to sequences | at random, by an editing computer | not separated | 3 U-matic players, camera, crossbar, editing computer |
| 1994 to 1996 | Granular Synthesis | MODELL 5 | single A/V frames | edited | *"Sound and image are not separated, not even in the smallest of segments"* | AVID suites |
| 1995 | Russell Blakeborough | Midual | an AVI clip from any of several frames | MIDI note | the clip's own | PC |
| 1996 to 1997 | Steina and Tom Demeyer, STEIM | Image/ine | sampled clips, random access, speed, direction | MIDI violin | the clip's own | Mac PowerPC 8600 |
| 1997 | Hexstatic and Coldcut | *Timber* | each sound its own picture | cut by hand to markers | sound and picture taken together | Adobe Premiere |
| 1997 to 1999 | Granular Synthesis | VARP 9 | **one A/V frame at 25 fps** | MIDI notes and CCs: start, loop points, repeat rate per grain, direction | locked to the frame | their own PC software, RAM banks, full PAL |
| 1997 to 1998 | Coldcut and Blakeborough | VJamm | clips on 16 tracks | MIDI, sequencer | audio and video triggered together | PC |
| 1998 | Johnny DeKam | VIDVOX Prophet | DV clips, a jog wheel to scratch | MIDI notes and CCs | NOT CONFIRMED | Mac, DV codec |
| 1999 | Netochka Nezvanova | NATO.0+55+3d | Max objects for live video | patched | via MSP | Max, classic Mac OS |
| 2001 | Curtis Roads | *Microsound* | audio grain 1 to 100 ms | n/a | n/a | book |
| 2001 to 2002 | Eclectic Method | bootleg video mixes | tracks pre-cut into 12 to 16 parts | laptops, later DVJ decks | sound and picture together | Sony Vegas |
| 2002 | Christian Marclay | *Video Quartet* | over 700 film clips | edited | each clip's own sound | Final Cut Pro, four screens |
| 2015 | Angus Forbes and Javier Villegas | *Video Granular Synthesis* | a spatiotemporal cube, Hann windowed, 50 per cent overlap | interactive and audio driven | pitch and amplitude steer the grains | OpenGL, GLSL geometry shader |

## 1. Lead-in: frames as metre, on film

### Peter Kubelka, metric films, 1957 to 1960

**SECONDARY**, from the [Wikipedia article on *Arnulf Rainer*](https://en.wikipedia.org/wiki/Arnulf_Rainer_(film)),
which cites P. Adams Sitney, *Visionary Film* (1974), and Peter Gidal's
*Structural Film Anthology* (BFI 1976):

- *Arnulf Rainer* (1960) *"uses only solid black or white film frames, and its
  audio alternates between white noise and silence."*
- *"The film is broken into 16 sections, each one lasting precisely 24 seconds
  (576 frames)"*, built from phrases of *"2, 4, 6, 8, 9, 12, 16, 18, 24, 36, 48,
  72, 96, 144, 192, or 288 frames."*
- It is the last of three metric films after *Adebar* (1957) and *Schwechater*
  (1958), constructed *"from fixed durations analogous to musical note values."*

Why it matters here: it is the first work found where the frame and the sound
event are the same unit and the unit is chosen by a metre. VARP 9's *"overwrite
grains with silent black or silent white"* parameters (section 6) are this film
turned into a MIDI controller, whether or not the duo had Kubelka in mind
(NOT CONFIRMED that they did).

### Paul Sharits, flicker films, 1966 to 1968

**READ**, Dirk de Bruyn, [*Repetition, Flicker, and Sound in the Films of Paul
Sharits*](https://blog.animationstudies.org/repetition-flicker-and-sound-in-the-films-of-paul-sharits/),
Animation Studies blog, 2020-06-24:

- Single colour frames at 24 fps; in *T,O,U,C,H,I,N,G* *"single frames of poet
  David Franks flash on and off amongst clusters of flickering colored frames."*
- The soundtrack *"stammers and loops the word 'destroy'"*.
- *N:O:T:H:I:N:G*'s clusters *"have been highly programmed, organized, mapped
  out, and planned before they have been shot."*

Dates and durations from the [Film-Makers' Cooperative catalogue](https://film-makerscoop.com/catalogue/paul-sharits-piece-mandala-end-war):
*Piece Mandala/End War* 1966, 5 min.

Neither Kubelka nor Sharits sampled anything: the frames were shot or painted
for the purpose. They are here because they fixed the vocabulary (the frame as
the smallest unit, flicker, a pattern of black and white as a rhythm) that the
1990s video granulators reused.

## 2. Lead-in: a frame as a score

### Erkki Kurenniemi, DIMI-O, 1971

**READ**, from our own notes on Mikko Ojanen's thesis,
`research/ojanen-ekis-notes.md` (thesis p. 166): four octave keyboard, video
camera, monitor, **32-step sequencer with 48-note polyphony, 1,536 bit memory
(32 by 48)**. The camera image is thresholded to black and white and triggers
notes. The 1971 dates and the September 1971 *Dimi Ballet* for television are in
the same file.

How it bears on video granulation: it is the opposite direction. One frame is
captured into memory and read out over time as sound, so the frame is a score
and not a grain. It is the earliest frame store found in this survey that was
built for a musical instrument. **DIMI-T** (1973) reads EEG and has no picture
in it, so it does not bear on this subject.

## 3. Frame stores and mixers, the 1980s hardware

### Fairlight CVI, 1984

**READ**, D. J. E. Nunn, [*Integrating the Fairlight CVI into the video
workflow*](https://publications.eai.eu/index.php/ct/article/download/2650/2205/3378),
EAI Endorsed Transactions on Creative Technologies 9(3), 2022:

- Released 1984, developed by Kia Silverbrook; *"a mere AU$ 10,000 would
  provide much of the functionality of the UK-manufactured Quantel Paintbox ...
  AU$ 360,000."*
- *"a 3U 19-inch rack unit plus a control panel with 10 sliders, 16 buttons and
  a graphics pad to control 100 editable effects"*, a 2 MHz 6809 CPU.
- *"While it offers standard PAL or NTSC analogue resolution, the digital
  framestore has a low resolution of 256x256."*
- Used by Jean-Michel Jarre (*Zoolookologie*), Todd Rundgren, Severed Heads
  (Stephen Jones), Peter Callas.

**NOT CONFIRMED**: how many frames the CVI can hold. Every source says *a*
framestore. Ian Andrews' page on the [CVI](https://ian-andrews.org/video/VSV/CVI.html)
lists mirror, colourisation, stretch and zoom, no clip memory. So the CVI is a
frame processor, not a sampler: it can freeze and paint over one frame, it
cannot hold a sequence and replay it.

### Quantel Paintbox (1981) and Harry (1985)

**SECONDARY**, [Wikipedia, Quantel](https://en.wikipedia.org/wiki/Quantel): Harry
*"recorded and applied effects to a maximum of 80 seconds of 8-bit uncompressed
digital video"* on a Fujitsu disk array. Harry is the first random access
store of real video frames found, but it was a post-production editor, not
something played. The Paintbox matters to scratch video (section 4) because the
art schools had access to one.

### NewTek Video Toaster, 1990

**SECONDARY**, [Wikipedia, Video Toaster](https://en.wikipedia.org/wiki/Video_Toaster)
and the [Amiga Hardware Database](https://amiga.resource.cx/exp/videotoaster):
a switcher, genlock, framebuffer and DVE for the Amiga 2000, with *"a 2 MB dual
frame buffer"* that could freeze incoming video. No clip memory; the Video
Flyer non-linear editor came later. Not a granular precedent; listed because it
is often named as one.

### Panasonic WJ-MX50, A/V Synchro: sound triggers the frame freeze

**READ**, the [WJ-MX50 operating instructions](https://insightlighting.co.uk/media/Panasonic-wjmx50_4-input--external-camera-vision-mixer_dGbBaBE.pdf),
items 37 to 43:

- *"Built-in Frame Synchronizers for A bus and B-bus"*, effects *"Nega, Mosaic,
  Mono, Paint, Still, Strobe, Multi, Trail and AV Synchro"*.
- Strobe: *"Video frames can be frozen intermittently, to achieve a strobe
  effect ... The strobe interval can be adjusted by the Effect Interval Timer
  ... from approximately 0.03 seconds to 2.1 seconds."*
- Trail: up to 16 compressed images trailing, interval 0.06 to 2.1 s.
- **A/V Synchro**: *"Any combination of the digital effects (Nega, Mosaic, Mono,
  Paint, Still or Strobe) can be synchronized to pulse with certain levels of
  accompanying music or sound supplied to the WJ-MX50."* A LEVEL control sets the
  trigger threshold.

Year: **1991 is SECONDARY**, from one [dealer listing](https://visualalchemy.tv/product/1991_panasonic_wj_-_mx50_digital_a_v_mixer_807).
The manual carries no date.

This is the cheapest precedent in the whole survey and the closest to what
positron can do first: **a sound event freezes the current frame**, on a mixer
that was in clubs and community video workshops. The grain is the strobe
interval (30 ms at the shortest, so about one field to one frame), the window is
a hard cut, the selection is "whatever is live now", and the sync to sound is a
level threshold.

## 4. UK scratch video, 1984 to 1985

**READ**, Nick Cope, [*Revisiting Scratch Video*](https://screenworks.org.uk/archive/volume-7-3/revisiting-scratch),
Screenworks 7.3, September 2017, doi 10.37186/swrks/7.3/5:

- The term: *"George Barber credits journalist Pat Sweeney with coining the term
  Scratch Video in 1984"*, *"comparing it to New York's Hip Hop scene"*.
- The technology: *"new edit suite hardware that could facilitate video editing
  accuracy to within 1/5 of a second or more was becoming cheaper, easier to use
  and more accessible, in particular via community video workshops and art
  colleges."* Barber, 1990: *"Editing was central to Scratch ... the first truly
  edit based video form."*
- Source: off-air recordings on domestic VHS, *"re-editing and recontextualising
  this footage was the modus operandi of Scratch."*
- Screenings: the Fridge, Brixton; the ICA, December 1984; Film and Video
  Umbrella's touring programme, 1985; the Tate, 1985. Barber's two VHS volumes
  *The Greatest Hits of Scratch Video*. The Duvet Brothers toured a multi-monitor
  show 1984 to 1987.

**READ**, Leo Goldsmith, [*Scratch's Third Body: Video Talks Back to
Television*](https://viewjournal.eu/articles/JETHC097), VIEW Journal of European
Television History and Culture, 2015: Barber attributes the style to *"the
Sony Series V editing suite, which allowed for rapid editing"* and the Quantel
Paintbox. Works named: Barber's *Tilt* and *Scratch Free State* (1984), Gorilla
Tapes' *Till Death To Apartheid* (1985), the Duvet Brothers' *Fuh Fuh* (1984)
and their set-up of *"up to 25 television monitors"*, Goldbacher and Flitcroft's
*Night of 1000 Eyes* (1984).

**READ**, [REWIND, Duvet Brothers](https://rewind.ac.uk/people/duvet-brothers/):
Rik Lander and Peter Boyd Maclean, met at the Colchester Film Workshop 1983;
*Torchsong* (1984) began as a pop promo parody *"created using two VCRs"*;
*Blue Monday* (1984) on Channel 4 in 1985. [REWIND, George Barber](https://rewind.ac.uk/people/george-barber/):
*Yes Frank No Smoke* and *Absence of Satan*, 1984 and 1985.

**SECONDARY**, [Wikipedia, Gorilla Tapes](https://en.wikipedia.org/wiki/Gorilla_Tapes):
Tim Morrison, Jon Dovey, Gavin Hodge from 1984; *Death Valley Days* (1984),
20 min, Reagan as a global terrorist. [Light Industry](http://www.lightindustry.org/scratchvideo)
on Goldbacher and Flitcroft: *"agile, dancefloor-ready cut-ups of mainstream
entertainment."*

**What a grain was here.** The repeat edit: a phrase of a few frames to a few
seconds, re-laid on tape at the edit controller's accuracy, cut by hand to a
soundtrack. Sound and picture were sampled together from the same broadcast,
then laid against a music bed. **NOT CONFIRMED**: any frame count or ms figure
for a typical scratch repeat; nobody published one, and the 1/5 s edit accuracy
is the only number. The style was set by the edit suite, which is Barber's own
argument in *Scratch and After* (1990).

## 5. Random access, played: laserdisc and joystick

### Raphael Montañez Ortiz, Computer-Laser-Videos, 1985 to 1997

**READ**, [Hammer Museum, 2023](https://hammer.ucla.edu/programs-events/2023/raphael-montanez-ortiz-scratch-videos):
made with *"laser discs, a computer with joystick, an electronic oscillator and
a U-Matic recorder"*, from *"brief passages from a commercial film"*, in a
*"real-time editing process, like an improvisational dance or concert, rather
than the post-production editing of footage"*. Works 1984 to 1997, *The Kiss*
and *Beach Umbrella* 1985.

**SECONDARY**, search summaries of [Artforum](https://www.artforum.com/events/raphael-montanez-ortiz-190273/)
and Wikipedia: segments of one to 10 seconds, moved back and forth at various
speeds by joystick; *"a visual equivalent to a DJ's scratch."* **NOT CONFIRMED**
in a primary: the segment lengths, and what the oscillator did (it may have
driven the scrub, it may have been sound).

### Steina, *Violin Power* with a laserdisc, 1991

**READ**, Steina's own performance sheet, [*Violin Power: An inter-active
performance*](https://www.vasulka.org/archive/Vasulkas3/Video/ViolinPower/Descriptions.pdf),
Vasulka archive:

> In 1991, after having experimentally interfaced my acoustic violin with a
> variable speed video cassette player, I bought a MIDI violin and a Pioneer
> Disk Player. Interfacing these instruments with a computer gave me an instant
> access to any frame of video on the disk as well as access to fast/slow and
> forward/backward movements. The initial software was written by Russel Gritzo
> and further developed and improved by Bill Heckel.

> The assignment at the moment is that stops on A and E string point to frame
> locations on the disk. The D and G strings control speed and direction and the
> C string is a master controller assigned to address segments on the disks.

Equipment: Zeta VC-225 violin, IVL PR 7005 MIDI controller, Pioneer VLD-8000
laserdisc, a laptop, five videodiscs of her own material. Also on the
[Fondation Langlois page](https://www.fondation-langlois.org/html/e/page.php?NumPage=485).

This is the clearest early **grain address**: a note is a frame number, two
other strings are speed and direction, and the fifth picks the segment. That is
a granulator's position, rate and window in 1991, played live.

### Martin Arnold, *pièce touchée* (1989)

**SECONDARY**, the [Film-Makers' Cooperative](https://film-makerscoop.com/catalogue/martin-arnold-piece-touchee)
and Francis Summers, [*(Re)Counting Love*](https://extra.shu.ac.uk/transmission/papers/SUMMERS%20Francis.pdf):
16 minutes made from an 18 second shot of *The Human Jungle* (1954) on an
optical printer, frames duplicated and re-ordered, run back and forth in short
bursts. *passage à l'acte* (1993) does the same with dialogue. Pre-video, so
briefly; it is the frame granulation that MODELL 5 did with an AVID, done with a
printer.

## 6. Granular Synthesis (Kurt Hentschläger and Ulf Langheinrich)

The centre of this file. Founded 1991 in Vienna. Works on
[kurthentschlager.com](https://kurthentschlager.com/): *Piranha* 1991, MODELL 3
1992, MODELL 5 1994, *We Want God Now* 1995, *Sweetheart* 1997, *Noisegate* and
*POL* 1998 to 2000, *Areal* 1997 to 2003, *Feld* 2000, *Reset* 2001, *Lux* 2002,
*<360>* 2002, *Minus* 2003.

### *Piranha*, 1991

**READ**, [kurthentschlager.com](https://kurthentschlager.com/PIRANHA-1991): a 25
second loop installation from the 1978 film *Piranha*, with sound samples from
*Predator* (1987); *"a forerunner of the cutup resynthesis video technique which
eventually became the 'Granular Synthesis' trademark."* So it began as found
footage, like scratch video, and moved to their own recordings.

### *Granular Synthesis* (1992) and MODELL 3 (1992 to 1993): the method in writing

**READ**, Rudolf Frieling on [Media Art Net](http://www.medienkunstnetz.de/works/granulare-synthesen/):
a 4 channel installation of *"re-sequencing, looping, re-arrangement, but never
the manipulation, of short excerpts lasting at most a few seconds and single
events (grains)."*

**READ**, the MODELL 3 text on [kurthentschlager.com](https://kurthentschlager.com/MODELL-3-1992):

- The set-up: four projectors on 2 by 3 m screens, *"the images originate from
  three U-matic players and one camera recording live"*, switched by *"a video
  crossbar"*, sound from the tapes' soundtracks through a concert PA, and
  *"Ulf Langheinrich combines minimised sequences of control data on a computer
  to complete the energy-laden mass of sound."*
- The method, verbatim: *"Significant sections (grains) are selected from the
  tape material ... These sections are reproduced and positioned at random.
  Compared to the original sequences, the final product is denatured by
  re-arranging, looping, repeating and mixing existing synthesised sequences.
  **In terms of length, the individual grains range from single frames to
  entire sequences of frames.** The editing computer chops and mixes the
  sequences of images and sounds recorded by the camera like a blender to
  re-structure them freely outside the time continuum of the video tape."*

### MODELL 5, 1994 to 1996

**READ**, [kurthentschlager.com, MODELL 5](https://kurthentschlager.com/MODELL-5-1994):

- *"a technique derived from the principals of the sound design technique
  called 'granular synthesis' but applied to the rather large grains of single
  video frames (visual content and sound)"*, from *"a few expressions on the face
  of the performer Akemi Takeya"*.
- *"All interventions in the original material are time-based. **Sound and image
  are not separated, not even in the smallest of segments.** This process causes
  interesting technical/conceptual problems: the density of events in sound
  processing is much higher than in image processing (the definition on the
  sound level is higher than that the video definition)."*
- *"At up to 200 beats per second and 6,000 watts"*. *"No special effects are
  used to create the images."* The treatments named: *"time lapse, slow motion,
  real time video scratching, enlargement, amplification, dissolution."*
- 4 channel portrait video on 4 by 3 m walls, 12 channel audio, about 44 min.
- *"Edited on various AVID Suites in England and Austria between 1994-96"*,
  produced by Mike Stubbs at Hull Time Based Arts, premiered at the ICA London
  1994. Mike Stubbs (POL page, below) remembers *"the hard drive crashed a week
  before the premiere of MODELL 5 back in 1994"*.

**READ**, Tom Sherman, *The development and applications of a perpetual moment
machine*, in *Granular Synthesis, Noise Gate M6*, MAK Vienna 1998, pp. 29f,
quoted on [Media Art Net](http://www.medienkunstnetz.de/works/modell-5/):
*"Through granulation, relentless repetition and the rolling, enveloping or
cyclical recombination and layering and compression and with each of thousands
of edit-point, high-frequency staccato image and sound perforation"*.

So MODELL 5 was **composed offline on a non-linear editor, not played**. Its
grain was a frame of picture with its 40 ms of sound attached. *"Up to 200 beats
per second"* is higher than any frame rate, and the duo's own sentence about
sound density says why: the sound could be cut finer than the picture.
**NOT CONFIRMED**: whether the 200 per second figure is grains of sound inside
one frame, or a synthesised pulse under the picture. The text does not say.

### VARP 9, 1997 to 1999: the instrument, with its parameter list

**READ**, [granularsynthesis.info, Varp 9](https://granularsynthesis.info/Varp-9):

> VARP 9 was a unique audio-video re-synthesis software, developed from ground
> up by Kurt Hentschläger, Ulf Langheinrich and Dirk Langheinrich in 1997-1999.
> ... It was a sample based MIDI software instrument that addressed both video
> and audio in, at the time, large scale RAM-banks. It processed in realtime full
> PAL video resolution and frame rate. It allowed accessing, combining and
> re-allocating single audio video frames at 25f/sec. At that video "grain rate"
> it was capable of audiovisual granular synthesis.
>
> The structure of the program resembled in many of its parameters an audio
> sampler. The specialty of VARP 9 was its flicker engine, which could mix with
> each other, frame by frame, 2 discrete video/sample streams, as if 2 videos
> were intersecting each other.

Its MIDI map, from the same page, condensed to what each control is:

| control | what it sets |
|---|---|
| note 0 to 48 | which grain sequence (a clip in RAM) plays as the first stream |
| note 48 to 96 | which plays as the second stream |
| CC 9 / CC 20 | start point, first / second sequence |
| CC 2, CC 4 / CC 23, CC 24 | low and high loop point, first / second |
| CC 5 / CC 25 | **repeat rate per grain** (how many times a frame is shown) |
| CC 11 | grain sequence direction |
| CC 12 | loop mode |
| CC 10 | ignore or follow note off |
| CC 70 | start points by velocity |
| CC 3 | shift all loop points |
| CC 30, CC 31 | horizontal shift within the array of sequences |
| CC 21 | insert grains of the second sequence into the first: how often, and how many |
| CC 26 to 29 | overwrite grains with **silent black or silent white**: frequency, duration, pattern (*"from total black via total flicker to total white"*), shift |

**READ**, the duo quoted by Mike Stubbs (28 June 1998, Ars Electronica catalogue
1998) on the [POL page](https://kurthentschlager.com/POL-1998-2000):

> In 1996 we sat down and started to layout an audio-visual machine that would
> merge our experiences from working with Non-linear video-editing systems as
> well as from audio-sampling. The goal was to access video and synchronised
> audio from such a device single framewise in real-time. The trigger and
> control protocol was definitely to be MIDI ... It was furthermore essential to
> be able to load different (audio-video) samples into RAM, to switch between
> them and to read them out dynamically. Also we wanted the software to run on
> PC, as we need independent machines for each image/sound projection.

> Things like applying flickerframes in an adjustable frequency within a series
> of other frames or modulating one visual sample (series of frames) with
> another, or (super exciting) visual floating - timewise mirroring of movement
> within a series of frames.

Finished *"by the end of 1997"* after *"almost 100 beta-versions"*. The
installations that used it read audience movement with sensors
([Noisegate](https://kurthentschlager.com/NOISEGATE-1998-2000): *"Realtime,
partially Interactive Audiovisual Installation"*).

**What VARP 9 settles.** The grain is one frame and its sound, 40 ms, fixed by
the PAL clock. There is no window and no overlap: grains are concatenated,
repeated, reversed, interleaved from a second stream, or replaced by black or
white silence. Density is the frame rate. Selection is a start point, two loop
points and a direction, under MIDI. That is an audio sampler's loop page with
the sample replaced by a frame, and it is the most precise definition of a video
grain found anywhere in the period.

**NOT CONFIRMED**: VARP 9's RAM size, how many seconds of PAL it held, and its
operating system. The [Forbes and Villegas paper](https://angusforbes.com/pdfs/Forbes_VideoGranularSynthesis_CAe2015.pdf)
cites a 1996 Hentschläger and Langheinrich source as `[HL96]`; the title is cut
off in the PDF's reference list and was not chased.

## 7. Video samplers played from a keyboard, 1991 to 1998

### Emergency Broadcast Network, 1991 to 1995

**READ**, Chaos Control interview, 1995, [*Interview with Providence's
Emergency Broadcast Network*](https://chaoscontrol.com/emgergency-broadcast-network/):

- *Telecommunication Breakdown* (1995) was *"produced with our simulation
  production method"*, which recreated by editing what a video sampler would do,
  before they had one.
- Then a sampler: *"Macintosh Quadra 950 computers running software created
  specially for EBN by Mark Marinello at AVX Design"*, played from *"a keyboard
  or other MIDI instrument"*; *"The pitches of the audio can be controlled, and
  the sounds can be played backward, bent"*; *"four minutes of video, made up of
  many smaller pieces"*, with 16 minutes planned.
- Gardner Post: *"We're focusing on making the beats out of found video clips,
  rather than breakbeats or audio sequencer."*

**SECONDARY**, [Wikipedia, EBN](https://en.wikipedia.org/wiki/Emergency_Broadcast_Network):
founded 1991 by Josh Pearson, Gardner Post and Brian Kane at RISD; *Commercial
Entertainment Product* 1992; U2's Zoo TV tour; lyrics built *"from half-second
sound clips spliced together from various TV personalities"*.

### Midual (1995) and VJamm (1997 to 1998)

**READ**, Russell Blakeborough's [timeline](https://blakeborough.net/russell/timeline):
Midual, 1995, *"allowed performers to trigger an AVI clip from various frames
using MIDI - probably the first ever live performance video sampler."* VJamm,
built with Matt Black of Coldcut, *"16-track AV sequencer/sampler for PC"*,
released on Ninja Tune in 1998. AV scratching is dated 2000 and beat-level
MIDI sequencing 2001 on the same page.

### Hexstatic and Coldcut, *Timber*, 1997

**READ**, Stuart Warren-Hill, [VDMX blog interview](https://vdmx.vidvox.net/blog/stuart-warren-hill-holotronica):
*"I created these using video samples and editing them in Adobe Premier. It was
a very early version of Adobe Premier; and I used it like it was a drum machine
with timing markers as a guide."* And: *"It's a common myth that VJamm was used
to create Timber"*. Released January 1998 on Ninja Tune (SECONDARY,
[Wikipedia](https://en.wikipedia.org/wiki/Timber_(Coldcut_and_Hexstatic_song))).
Andrew Logie's [deconstruction](https://andrewlogie.co.uk/2013/06/20/timber-coldcuthexstatic-deconstruction/):
*"each new sound comes in another image plays in time with it."*

So in *Timber* **every drum hit is a picture**: the grain is a sample with its
footage, the selection is the drum pattern, and sync is by construction.

### VIDVOX Prophet, 1998, and Grid

**READ**, Johnny DeKam, [VDMX blog interview part 1](https://vdmx.vidvox.net/blog/johnny-dekam-pt1):
*"Prophet used the new DV video CODEC tied to MIDI control with notes and CC
messages to control a 'jog shuttle wheel' so that you could 'scratch' the
video."* Grid was *"a ultra intuitive, cuts only video app design for rapid
sequencing / playback of clips"*. **NOT CONFIRMED**: Grid's year, and whether
either kept the clip's sound.

### Eclectic Method, 2001 to 2002

**SECONDARY**, [Wikipedia](https://en.wikipedia.org/wiki/Eclectic_Method) and
[The Rumpus, 2009](https://therumpus.net/2009/07/22/eclectic-method-pushing-the-frontier-of-video-remix/):
formed in London 2001 by Jonny Wilson, Geoff Gamlen and Ian Edgar, from Sony
Vegas editing; *Bootleg Video Mix* CD-ROM 2002; two laptops, with *"every track
had to be split up, in advance, into 12 to 16 parts just because the software
couldn't handle the complete files"*; later Pioneer DVJ-1000 decks. A follow-on,
not a precedent: segments are phrases, not grains.

## 8. Software in the Max lineage, before Jitter

### Steina and Tom Demeyer, Image/ine, STEIM, 1996 to 1997

**READ**, [Digital Canon, Steina: Violin Power](https://www.digitalcanon.nl/artworks/steina-vasulka-tom-demeyer/),
quoting Steina: *"there already was a MIDI/VIDEO software being written by Tom
Demeyer, initially named Image/ine and later IMX. In addition to random access,
speed and direction, this software gave me a plethora of video effects and
memory locations. The clips in my performances are selected as much for the
sound as video content"*. And quoting the program's own description: *"Video
sampling and playback, keying, displacement and other effects are available with
video (live and recorded), QuickTime movies, text, scanned images ... Unlike
digital video editing programs such as Adobe Premiere, Image/ine works in real
time. There is no compression slowdown, no rendering time"*. Real-time capture
and playback on a Macintosh PowerPC 8600 with the stock video card. STEIM dates
it 1996 to 2001 ([Monoskop, STEIM](https://monoskop.org/STEIM)), beside LiSa,
STEIM's live audio sampler (since 1995).

What it did to frames: **random access, speed and direction over clips held in
memory**, the laserdisc's three controls moved into RAM, plus effects.
Displacement here means a spatial displacement map, not time.
**NOT CONFIRMED** from a primary: *"320x240 pixels at some 10 frames per
second"*, which is quoted on [Hacker News](https://news.ycombinator.com/item?id=33706604)
and repeated widely without a source; the 1997 Image/ine manual (Demeyer, STEIM)
was not found online.

### NATO.0+55+3d (1999), GEM (1996), softVNS (2002), Jitter (2002)

**SECONDARY**, [Wikipedia, Nato.0+55+3d](https://en.wikipedia.org/wiki/Nato.0+55+3d):
NATO.0+55 June 1999, +3d July 1999, the modular distributions March to November
2000 (80, 112, 126 objects), development stopped 2001. Max's own video objects
(Jitter) came in late 2002. GEM began as *Graphics Environment for Max* (Mark
Danks, 1996) and moved to Pd ([Pd community site](https://gem.puredata.info/documentation/faq/what-is-gem);
Danks 1997, *Real-time image and video processing in GEM*). David Rokeby's
softVNS, Max objects for video, 2002 ([Max, Wikipedia](https://en.wikipedia.org/wiki/Max_(software))).
DeKam built VDMX's early versions in Max with NATO (the VDMX blog, above).

These are the plumbing of the late 1990s. None of them shipped a granulator; they
made it possible to patch one. **NOT CONFIRMED**: a named NATO or GEM patch from
1999 to 2002 that granulated video; none was found.

## 9. Writing about visual grains

### Curtis Roads, *Microsound* (MIT Press, 2001)

**READ**, the book ([PDF on Monoskop](https://monoskop.org/images/d/d1/Roads_Curtis_Microsound.pdf)):

- p. 86: a grain *"typically between one thousandth of a second and one tenth
  of a second (from 1 to 100 ms). Each grain contains a waveform shaped by an
  amplitude envelope."*
- pp. 56 to 57: cinema is used only as an **analogy** for microsound, via
  persistence of vision and the zoetrope. *"An optical sound track, however, is
  not divided into frames."*
- pp. 67 to 68, on Xenakis' screens: *"the frame rate and the grain duration are
  constant ... such a frame rate will tend to cause audible artefacts ... unless
  countermeasures are taken"*, and the fix is to let the frame interval be
  shorter than the grain so attacks and decays overlap.
- p. 157: Norman McLaren's *Dots* (1948), sound and picture drawn on the film.

**What Microsound does not have**: a definition of a visual or video grain. No
mention of Granular Synthesis the duo, Kubelka, Sharits or Marclay. The search
for *"visual granular synthesis"* before 2001 found nothing in print.

The useful sentence for us is the one about Xenakis: **a constant frame rate is
a comb on the grain stream**. A video granulator locked to 25 or 60 fps is that
constant grid, applied to the picture.

### Roads and visualists, *Point Line Cloud* (2004 to 2005)

**SECONDARY**: Forbes and Villegas cite Roads' collaborations *"with video
artists, including Brian O'Reilly, Woon Seung Yeo, and Garry Kling"* on *Point
Line Cloud* (Asphodel). **NOT CONFIRMED**: whether those visuals granulate video
or draw the grains; the album pages describe *"visualizations"*.

### Forbes and Villegas, *Video Granular Synthesis*, 2015

**READ**, [the paper](https://angusforbes.com/pdfs/Forbes_VideoGranularSynthesis_CAe2015.pdf),
Computational Aesthetics / EXPRESSIVE 2015. A follow-on, included because it is
the first explicit definition found and it names its own precedents:

- *"we define a video grain to be a portion of an input video signal windowed
  by an envelope so that the video signal is stronger in the center of the grain
  and attenuated toward the edges"*; *"we apply a Hann window"*; a grain is *"a
  cube of a small number of pixels"* in x, y and t.
- Grains are created, manipulated (clone, delete, scale, filter) and
  repositioned in space and time, through a *"grain map"* of x, y, t, size and
  orientation, in OpenGL with a GLSL geometry shader.
- *"we created video grains from the input videos using a 50% overlapping
  factor"*; audio pitch and amplitude steered grain size and delay.
- On the 1990s: *"By and large, these examples rely on abrupt jump cuts,
  limiting their expressivity."*

### Christian Marclay, *Video Quartet*, 2002

**SECONDARY**, [SFMOMA](https://www.sfmoma.org/artwork/2002.116.A-D/) and search
summaries: four synchronised screens, over 700 clips of film characters making
sound, edited in Final Cut Pro, 17 minutes. Each clip keeps its own sound. A
follow-on: the unit is a musical gesture, seconds long, chosen for what it
sounds like, which is Steina's rule (*"selected as much for the sound as video
content"*) at the scale of a phrase.

## What a video grain has meant

| | length | window | density | selection | sync to sound |
|---|---|---|---|---|---|
| Kubelka, Sharits | 1 frame up to 288 frames (12 s) | hard cut | composed, up to 24 a second | a written metre | frame for frame (Kubelka), a looped word (Sharits) |
| DIMI-O | one frame, held | none | one frame per sequence | the camera | the frame is the score |
| Scratch video | a few frames to seconds; edit accuracy 1/5 s | hard cut | cut by hand | a person with an edit controller | cut to music, sound sampled with picture |
| WJ-MX50 strobe | one field or frame, held 0.03 to 2.1 s | hard cut | the timer, or the sound | whatever is live | **the audio level triggers the freeze** |
| Steina 1991, Ortiz | any frame, any segment | hard cut | as fast as the disc seeks | MIDI violin, joystick | the disc's own sound |
| MODELL 3 | single frames to sequences | hard cut | random, by computer | random among *"significant sections"* | not separated |
| MODELL 5 | one A/V frame, 40 ms | hard cut | offline edit; sound up to 200 per second | edited | *"not separated, not even in the smallest of segments"* |
| VARP 9 | **one A/V frame, 40 ms**, repeated N times | hard cut | 25 a second, fixed | start, loop points, direction, insertions | locked to the frame |
| EBN, VJamm, *Timber*, Prophet | a clip, seconds; *"half-second"* syllables (EBN, SECONDARY) | hard cut | MIDI notes | a keyboard or a sequencer | triggered together |
| Image/ine | a clip in memory | hard cut | MIDI | random access, speed, direction | the clip's own sound |
| Roads (audio) | 1 to 100 ms | an amplitude envelope | free; a constant rate is a comb | free | n/a |
| Forbes and Villegas | a pixel cube in x, y, t | **Hann, 50 per cent overlap** | free | grain map | pitch and amplitude steer it |

Four definitions survive the period:

1. **The frame grain.** One frame, with its own sound, at the source frame
   rate. Granular Synthesis. It is the smallest unit a video has without
   inventing pixels, and at 25 fps it is 40 ms.
2. **The address grain.** A frame number, a speed and a direction, played by a
   controller. Steina 1991, Ortiz, Image/ine, Prophet's jog wheel. This is a
   granulator's position and rate before anyone called it that.
3. **The triggered freeze.** Sound triggers a held frame of whatever is live.
   The WJ-MX50. No memory beyond one frame.
4. **The windowed grain.** A spatiotemporal cube with a Hann window and overlap.
   Only from 2015 on, in what was found.

Selection was almost never random in the period (MODELL 3 is the exception, and
it chose at random among sections a person had already picked). Sound sync was
almost always by construction, picture and sound cut from the same source at the
same instant, rather than by mapping one onto the other.

## What this means for positron's granulator

### What the engine gives today

**READ** in `demo/concepts/sampler/050/index.html` (`onGrain`) and
`rig/board/norns/Engine_Pappus.sc` line 849: every grain arrives as
`{ at, pos, ago, dur, voice, half, patch }`. `at` is the AudioContext time the
report arrived, `pos` is the fraction of the 8 s window (`BUF_SECONDS = 8` in
`demo/shell/radio-gran.mjs`) the grain read from, `ago` is how many seconds ago
that audio came in, `dur` is the grain length in seconds (clipped 0.002 to 8 in
the engine, `Engine_Pappus.sc` line 682). The events leave the page on a bay
port, `grains:value-out`, so a picture can take them by a link.

**READ** in `demo/shell/radio-gran.mjs`: the patches run grain sizes of **0.05
to 4.0 s** and rates of **0.5 to 62 grains a second**. **INFERRED**: almost
every grain is at least one video frame long (50 ms against 40 ms at 25 fps or
33 ms at 30), but at the high rates several grains start inside one 16.7 ms
display frame. Whether `rate` is per voice, multiplying with the voice count,
was not checked.

The source today is radio: **there is no picture**. A video granulator needs a
source with a picture and a soundtrack, and the obvious one costs nobody
anything: the MIMproject videos already in our own R2 (`positron-station/
mimproject/`, 26 files, per memory). A camera or `/stage/` comes later, as the
owner's *"live sources in next steps"* already plans for audio.

### Which historical techniques can follow the event stream directly

These need the events and nothing held: no frame memory beyond what the
`<video>` element or a camera already shows.

| technique | from | how it maps | needs |
|---|---|---|---|
| sound-triggered freeze | WJ-MX50 A/V Synchro | on each grain, copy the current live frame to a texture and hold it for `dur` | one texture, a live picture |
| flicker grain | Kubelka, Sharits, VARP 9 CC 26 to 29 | on each grain, a black or white frame, or the picture, by a pattern | nothing; a full screen quad |
| grain as cut | scratch video, *Timber* | on each grain, switch between N live sources (camera, a playing video) | N playing sources |
| grain as mark | our grain scope | draw where in time the grain read, over the picture's own scrub bar | nothing new |

**INFERRED**: these are honest only for a live source, because the event's
`pos` points into the past and these techniques show the present. The
WJ-MX50 had the same honesty: it froze what was live.

### Which need a decoded frame ring buffer

Anything where the picture must come from **where the grain read** (`ago`
seconds back), which is the Granular Synthesis definition and the only one in
which the audio grain and the picture grain are the same grain:

| technique | from | needs |
|---|---|---|
| A/V frame grain: show the frame at `ago` for `dur` | MODELL 5, VARP 9 | a ring of decoded frames covering the 8 s window, addressed by time |
| repeat rate per grain, direction, loop points | VARP 9 CC 5, 11, 2 and 4 | the same ring; the engine already has the audio half |
| two-stream interleave, *"flicker engine"* | VARP 9 | two rings, or one ring and a live source |
| *"visual floating"*, timewise mirroring | VARP 9 | the ring, read backwards |
| windowed, overlapping grains | Forbes and Villegas | the ring as a 3D texture, and a blend weighted by each grain's envelope |
| address by controller | Steina, Ortiz | the ring, or a seekable file |

**INFERRED, sizes**: at 25 fps the 8 s window is 200 frames. RGBA at 640 by 360
is 921,600 bytes a frame, **184 MB** for the window; at 320 by 240 (Image/ine's
size) it is 307,200 bytes, **61 MB**. The engine's ring is 60 s
(`RING_SECONDS`), which at 640 by 360 would be 1.4 GB and is out of the
question on a phone. So the picture ring should cover the 8 s window and no more,
and its resolution is the first knob.

**INFERRED, the cheap path that probably fails**: seeking a `<video>` element's
`currentTime` once per grain. Seeks wait on the nearest keyframe and on decode,
and at 62 grains a second they would queue. It should be measured once, to have
a number to refuse it with, not built on.

### The decision the history forces

The MODELL 5 sentence is the design question: sound grains are denser than
picture grains. Three answers exist in the record:

1. **Lock the grain to the frame** (VARP 9). Every grain is 40 ms of picture and
   sound, and the audio engine is constrained to the picture's clock. Honest,
   and it throws away most of what Pappus does.
2. **Let the picture sample the audio grains** (MODELL 5 in effect, and the WJ-MX50).
   At each display frame, show the frame under the most recent grain, or the
   loudest. Grains that start and end inside one display frame are not seen, and
   the page should count them, the way `/videoradio/` already counts grains it
   refuses (`research/video-art-2026-09.md` §9).
3. **Blend overlapping grains** (Forbes and Villegas). Each live grain
   contributes its frame weighted by its envelope at this instant. The only one
   that shows density, and the most expensive: one texture fetch per live grain
   per pixel.

Answer 2 is the smallest that is still the Granular Synthesis definition, and it
degrades into answer 3 by changing "most recent" to "weighted sum".

### What to measure first, in this order

1. **Event to frame timing.** In `/concepts/sampler/050/` with no picture at all:
   for every grain event, log `at`, `performance.now()` on arrival and the next
   `requestAnimationFrame` timestamp. That gives the jitter between a grain and
   the display frame it could land on, which bounds every technique above. If
   the reply path from scsynth jitters by more than a frame, the picture cannot
   be grain accurate whatever else is built.
2. **Grains per display frame, per patch.** From the same log: how many grains
   start inside each 16.7 ms frame, for all twelve patches. That decides between
   answers 2 and 3 on numbers rather than taste.
3. **The ring's cost.** Decode 8 s of one MIMproject video into a WebGL2 texture
   array at 320 by 240 and at 640 by 360, through WebCodecs (`demo/shell/
   board-video.mjs` already uses `VideoDecoder`) or `requestVideoFrameCallback`
   (`demo/shell/media.mjs`). Time to fill, GPU memory, and whether an iPhone mini
   holds it. `demo/shot.mjs` at 375 and 1280 for the picture.
4. **The seek path, once.** Mean and worst `currentTime` seek on the same file,
   so the refusal has a number.

### Recommendation for a first step

**A sound-triggered freeze, on a video with its own soundtrack, following the
existing event port.** Take one MIMproject video from R2 as the source: its
audio goes into Pappus exactly as the radio does now, its picture plays in a
hidden `<video>`. On each grain event from `grains:value-out`, copy the frame
that is showing into one texture and hold it for the grain's `dur`. That is the
WJ-MX50's A/V Synchro with Pappus as the trigger, needs no ring buffer, and is
honest about what it is (it shows the present, triggered by the past), which the
page should say in its gutter as the grain scope already does.

Then, if measurement 1 says the timing is good enough, the second step is the
real one: an 8 s ring of decoded frames at 320 by 240, and each grain shows the
frame at its own `ago`, answer 2 above. That is MODELL 5's grain, picture and
sound from the same instant, played rather than edited, which is what Granular
Synthesis needed VARP 9 for in 1997.

## What could not be verified

- VARP 9's memory size, seconds of PAL held, and platform.
- Whether MODELL 5's *"up to 200 beats per second"* is grains inside a frame or
  a pulse under it.
- Any frame count or millisecond figure for a scratch video repeat edit. The
  only number is 1/5 s edit accuracy.
- How many frames the Fairlight CVI can hold (every source says one framestore).
- The WJ-MX50's year (1991 from a dealer listing only).
- Image/ine's *"320x240 at some 10 frames per second"*; the 1997 manual was not
  found.
- Ortiz's segment lengths, and what his oscillator did.
- Whether *Point Line Cloud*'s visuals granulate video.
- Grid's year, and whether Prophet and Grid kept the clip's sound.
- A named NATO or GEM patch granulating video between 1999 and 2002.
- Any writing on *"visual granular synthesis"* before 2001. None found; Roads
  uses cinema only as an analogy.
- Media Art Net pages answered only over plain http; read by `curl`.
