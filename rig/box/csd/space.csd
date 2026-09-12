<CsoundSynthesizer>
; space.csd — somewhere for a note to end.
;
; 🔴 WHY THIS EXISTS. The box's instruments were played through `pappus`, a
; granular insert, and a grain cloud HAS NO NOTE-OFF: it keeps granulating
; whatever is in its buffer, so releasing a key swapped one drone for another
; rather than stopping anything. Everything downstream loses its envelope —
; the attack, the decay and the whole character of a patch are washed out
; before you hear them, which is why the patch selector and the die both
; stopped doing anything audible. The granulator is not at fault; wrapping an
; instrument in it is.
;
; A reverb is the opposite kind of insert: it PASSES the dry signal and adds a
; tail, so the note still stops when you let go.
;
; ⚠️ CSOUND RATHER THAN SUPERCOLLIDER, and it is a decision. SC is already on
; this board and would have worked — but this repo already IMPLEMENTS Csound's
; score semantics (`timeline/csound.mjs`) and grades that against the real
; thing (`timeline/lab/csound-oracle.mjs`), Csound's browser build is mature
; and LGPL where SuperCollider's is alpha and AGPL, and an orchestra is TEXT
; where a SynthDef is compiled bytes. MEASURED: installing it pulled six
; packages and NO GUI toolkit, while SC's own sclang needs Qt offscreen.
<CsOptions>
-+rtaudio=jack -+jack_client=positron-space -+jack_inportname=in_ -+jack_outportname=out_
-i adc -o dac -B 2048 -b 128 --sample-rate=48000 --nodisplays -d
</CsOptions>
; ⚠️ `-B 2048`, AND IT IS NOT A TASTE. This said 512 and Csound REFUSED TO
; START against the box's JACK server — `*** rtjack: buffer size (-B) is too
; small`, then exit, with the orchestra compiling perfectly on the way past.
; jackd is raised here with `-p 1024` and rtjack wants -B at least twice the
; server's period. Measured on the board, same file, same server: -B 512 and
; -B 1024 both refuse and register no port; -B 2048 registers all four in one
; second. A file that compiles is not a file that runs.
;
; `jacksynth.mjs` re-computes this from `jack_bufsize` at spawn time and passes
; it on the command line, where it wins over this line — so the number here is
; the floor for the server we ship, not a constant anyone has to keep in step.
<CsInstruments>
sr      = 48000
ksmps   = 64
nchnls  = 2
0dbfs   = 1

; ⚠️ NAMED CHANNELS, NOT A SCORE. The box sets these while sound is passing
; through, the same way `mirror` sends `seg`/`fb`/`hue` to a running renderer
; rather than restarting it. A parameter change must never cost a re-patch:
; re-patching JACK is what made `fx.pappus` answer `ok` seven seconds before
; anything could be heard.
instr 1
  ; Defaults at init, because a channel nobody has set yet reads 0 — and
  ; `damp` 0 is a reverb with its top end shut, not a quiet one. The box sends
  ; all four the moment it has proof the engine is listening, so these govern
  ; only the first few milliseconds.
  chnset    0.35, "mix"
  chnset    0.5,  "room"
  chnset    5000, "damp"
  chnset    0,    "chorus"

  kmix    chnget "mix"        ; 0 dry .. 1 drenched
  kroom   chnget "room"       ; 0 small .. 1 cavernous
  kdamp   chnget "damp"       ; high-frequency loss in the tail, Hz
  kchorus chnget "chorus"     ; 0 off .. 1 wide

  ; ⚠️ CLAMPED AT THE FAR END, which is here. The box clamps too, but the UDP
  ; control port takes a number from anything on this machine, and `room` above
  ; 1 puts the feedback over 0.95 — a tail that never decays, which is the drone
  ; this whole file exists to get rid of. `damp` at 0 is a reverb with its top
  ; end shut rather than a quiet one.
  kmix    limit   kmix, 0, 1
  kroom   limit   kroom, 0, 1
  kdamp   limit   kdamp, 1000, 12000
  kchorus limit   kchorus, 0, 1

  ; ⚠️ THE PROOF THAT A KNOB REACHED A RUNNING ENGINE, not merely a socket.
  ; The box writes a fresh number to `echo` and waits to read it back here.
  ; This line runs in the performance loop, so the line only appears if the
  ; orchestra is actually being performed — which is the exact thing a JACK
  ; port cannot tell you, and the exact gap that made `fx.pappus` answer ok
  ; seven seconds early.
  kecho   chnget "echo"
  kchg    changed kecho
  printf  "SPACE ECHO %d\n", kchg, kecho

  al, ar  ins

  ; A chorus is a delay whose length wobbles. Two LFOs at slightly different
  ; rates, or both ears move together and it reads as vibrato rather than width.
  kd1     =         0.008 + (0.004 * kchorus * oscili(1, 0.55))
  kd2     =         0.009 + (0.004 * kchorus * oscili(1, 0.41))
  acl     vdelay3   al, kd1 * 1000, 50
  acr     vdelay3   ar, kd2 * 1000, 50
  apl     =         al + (acl * kchorus * 0.6)
  apr     =         ar + (acr * kchorus * 0.6)

  ; `reverbsc` is Sean Costello's feedback-delay network — the good one, and
  ; core Csound rather than a plugin, so it is present wherever Csound is.
  ; Feedback is held below 0.95: above that the tail does not decay, which is
  ; how a reverb becomes the drone this whole change exists to remove.
  kfb     =         0.55 + (kroom * 0.38)
  awl, awr reverbsc apl, apr, kfb, kdamp

  outs    apl + (awl * kmix), apr + (awr * kmix)
endin

; The fallback probe: a short quiet burst, fired by the box over the same UDP
; port the knobs use (`$i2 0 0.25`) and listened for on out_1. It proves the
; engine is producing sound, and NOT that the input reaches the output — which
; is why the box prefers to push a tone through in_1 with `jack_metro` and only
; falls back to this where that tool is missing. Whichever it used is named in
; the reply, so nobody has to guess which claim was made.
instr 2
  aenv    linseg  0, 0.01, 0.2, p3 - 0.02, 0.2, 0.01, 0
  a1      oscili  aenv, 440
  outs    a1, a1
endin
</CsInstruments>
<CsScore>
; -1 is "until somebody stops it". This is an insert, not a piece.
i1 0 -1
e
</CsScore>
</CsoundSynthesizer>
