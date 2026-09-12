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
-+rtaudio=jack -+jack_client=positron-space -+jack_inportname=in -+jack_outportname=out
-i adc -o dac -B 512 -b 128 --sample-rate=48000 --nodisplays -d
</CsOptions>
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
  kmix    chnget "mix"        ; 0 dry .. 1 drenched
  kroom   chnget "room"       ; 0 small .. 1 cavernous
  kdamp   chnget "damp"       ; high-frequency loss in the tail, Hz
  kchorus chnget "chorus"     ; 0 off .. 1 wide

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
</CsInstruments>
<CsScore>
; -1 is "until somebody stops it". This is an insert, not a piece.
i1 0 -1
e
</CsScore>
</CsoundSynthesizer>
