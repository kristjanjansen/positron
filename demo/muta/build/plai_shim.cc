// demo/muta/build/plai_shim.cc: the whole contact surface between a browser
// and Emilie Gillet's Plaits DSP.
//
// WHAT THIS IS NOT: a port, a rewrite, or a reimplementation. Every sample
// below comes out of `plaits/dsp/voice.cc` unmodified, compiled from the
// commit recorded in ../vendor/PROVENANCE.json. Nothing in plaits/ or stmlib/
// is edited, patched or copied into this file.
//
// WHAT THIS IS NOT, SECOND: Rack's `Module`. There is no Param, no Port, no
// Light, no `process(const ProcessArgs&)` and no voltage anywhere. The DSP
// underneath never knew about Rack and does not have to learn.
//
// ── POLYPHONY IS THE HOST'S DOING AND NOT THE ENGINE'S ──────────────────────
//
// Plaits in hardware is one module with one voice in it. Rack gets chords out
// of the same DSP by instantiating `plaits::Voice voice[16]` and running
// sixteen copies against ONE `Patch`, which is the arrangement copied here with
// eight. `plans/plan-vcv-modules.md` §5.1 has the adapter's six lines.
//
// 🔴 ONE PATCH, EIGHT VOICES, AND THE ONLY PER-VOICE FIELD IS THE NOTE. The
// panel is the panel: `plaits/ui.cc:70-84` binds four big pots and three
// attenuverters, there is one set of them on the hardware, one set in Rack's
// adapter, and one set here. `Patch` is copied per voice per block purely so
// `note` can be overwritten, which is exactly what
// `AudibleInstruments/src/Plaits.cpp` does inside its channel loop.
// ⚠️ AND `decay` AND `lpg_colour` HAVE NO POT OF THEIR OWN OUT THERE. `ui.cc`
// binds them as the SECONDARY parameters of MORPH and TIMBRE, reached by
// holding a button. They are ordinary fields of `Patch` all the same, which is
// why a host can offer them as controls where the hardware cannot.
//
// 🔴 AND EVERY VOICE STAYS ON ONE BLOCK BOUNDARY, WHICH IS STRUCTURAL RATHER
// THAN CAREFUL. There is a single `block_pos_`, and all eight `Render` calls
// happen inside the one branch that resets it. A voice cannot drift half a
// block from its neighbours because there is nowhere for it to keep its own
// position.
//
// THE BLOCK SIZE IS 12 AND IT IS NOT A FREE CHOICE. `plaits/dsp/dsp.h` sets
// `kBlockSize = 12` and `kMaxBlockSize = 24`, and `voice.cc` uses the CONSTANT
// rather than the `size` argument in three places that set envelope rates:
//
//   short_decay = (200.0f * kBlockSize) / kSampleRate * …      voice.cc:135
//   decay_tail  = (20.0f  * kBlockSize) / kSampleRate * …      voice.cc:207
//   attack      = NoteToFrequency(p.note) * float(kBlockSize)  voice.cc:213
//
// So a Render call of 24 advances the audio by 24 samples and the envelopes by
// 12 samples' worth: every decay runs at half speed and the instrument is a
// different instrument. Calling with 12 is the only size at which the envelope
// arithmetic means what it says. An AudioWorklet's 128 frames are therefore 10
// whole blocks with 8 samples left over, and the leftover is CARRIED rather
// than rounded, which is what `block_pos_` below is for.
//
// SAMPLE RATE IS 48000 AND IS NOT NEGOTIABLE EITHER. `kSampleRate` is a
// compile-time constant and the resources tables are built against it. Rack
// answers this by running a sample rate converter on the output; this shim
// refuses instead, because a page that reports the rate it got is worth more
// than one that silently detunes. `plai_init` returns 0 on a mismatch.

#include <cstddef>
#include <cstring>

#include "plaits/dsp/dsp.h"
#include "plaits/dsp/voice.h"
#include "stmlib/utils/buffer_allocator.h"

#ifndef PLAI_BUILD
#define PLAI_BUILD "unstamped"
#endif
#ifndef PLAI_SOURCE_SHA
#define PLAI_SOURCE_SHA "unstamped"
#endif

namespace {

// 🔴 EIGHT, AND THE NUMBER IS A MEASUREMENT RATHER THAN A ROUND FIGURE. One
// voice costs 2 to 16 µs per 128 frames on the machine this was written on,
// against the 2,667 µs those frames last, so eight of the dearest engine is
// about 5 per cent of one core. Rack uses sixteen because a MIDI cable has
// sixteen channels and `PORT_MAX_CHANNELS` says so; nothing here has a MIDI
// cable on it. Raising this is one line and costs 16 KB of allocator per voice.
const int kMaxVoices = 8;

// The firmware's own allocator buffer, the same 16384 bytes `plaits.cc:51`
// hands `BufferAllocator` on the hardware, ONE PER VOICE.
// 🔴 IT CANNOT BE SHARED AND `voice.cc:56` IS WHY: `Voice::Init` calls
// `allocator->Free()` before every engine and its comment reads *"All engines
// will share the same RAM space"*. Sixteen engines inside one voice share a
// buffer because only one of them sounds at a time. Two VOICES sharing one
// would be two live engines writing the same bytes.
char alloc_buffer[kMaxVoices][16384];

plaits::Voice voice[kMaxVoices];

// THE PANEL. One engine and one set of controls, shared by every voice.
plaits::Patch patch;

// ── what a voice is holding ─────────────────────────────────────────────────
// `Modulations` is per voice because the gate is: a note is a trigger on one
// voice and silence on the other seven.
struct VoiceState {
  plaits::Modulations mod;
  float note;        // the note this voice was handed
  float level;       // what it is putting out, followed block by block
  int hold;          // blocks of gate left to hold, 0 means not counting
  int restart;       // blocks of released gate before the note fires
  int settle;        // blocks since the note-on, so a new voice is not "quiet"
  int age;           // the serial number of the note it is playing
  float gate;        // 0..1 while a key is down, which drives the LEVEL input
  bool active;       // rendered at all
};
VoiceState vs[kMaxVoices];

int polyphony = kMaxVoices;
float base_note = 60.0f;   // what the pitch control says, for the next note-on
float trim = 1.0f;         // the output trim, fixed by the voice count
int serial = 0;

// One block per voice, then the mix. 8 voices of 12 frames is 384 bytes.
plaits::Voice::Frame vblock[kMaxVoices][plaits::kBlockSize];
float mix_out[plaits::kBlockSize];
float mix_aux[plaits::kBlockSize];

int block_pos = static_cast<int>(plaits::kBlockSize);   // nothing carried yet
bool ready = false;
bool droning = false;
int blocks_rendered = 0;
int voice_renders = 0;     // `Voice::Render` calls, summed over every voice

// ── the stealing record ─────────────────────────────────────────────────────
// A stolen voice is invisible from the speakers: the note that went away sounds
// exactly like a note that was never played. So the decision is recorded where
// it is made and the page prints it.
int steals = 0;
int last_voice = -1;         // which voice took the last note
int last_stolen = -1;        // -1 when that voice was free
float last_stolen_note = 0.0f;
float last_stolen_level = 0.0f;

// 🔴 EIGHT MILLISECONDS BEFORE A VOICE'S LEVEL IS A MEASUREMENT. A voice that
// was handed a note a moment ago is silent, and silent is the thing the stealer
// below is looking for, so without this the quietest voice is always the one
// that just started. `positron-verify` already has the general form of this
// mistake: a zero read before anything was measured is a very confident
// measurement of nothing. 32 blocks clears the 6 blocks of released gate, the 5
// blocks of `voice.cc`'s trigger delay line, and the lowpass gate's attack.
const int kSettleBlocks = 32;

// A voice is free when it has stopped sounding, measured rather than timed.
const float kSilence = 0.002f;

// The level follower's release, per block. 0.99 at 4000 blocks a second is a
// 25 ms time constant, long enough that a low note's zero crossing does not
// read as silence and short enough that a note that has finished reads free
// within a few tens of milliseconds.
const float kLevelRelease = 0.99f;

// Scratch the caller can render into without owning an allocator inside wasm
// memory. `plai_render` still takes pointers, so a native host on another
// machine can hand it its own buffers.
const int kScratch = 1024;
float out_scratch[kScratch];
float aux_scratch[kScratch];

const char kBuild[] = PLAI_BUILD;
const char kSourceSha[] = PLAI_SOURCE_SHA;

void SilenceVoice(int v) {
  VoiceState& s = vs[v];
  s.mod.trigger = 0.0f;
  s.mod.trigger_patched = true;
  /* ⚠️ AND THE LEVEL INPUT IS UNPATCHED AGAIN. A voice left with
     `level_patched` true and a level of 0 is not silent, it is a lowpass gate
     held shut, which is a different state and one the next note-on would have
     to undo. */
  s.mod.level_patched = false;
  s.mod.level = 0.0f;
  s.gate = 1.0f;
  s.hold = 0;
  s.restart = 0;
  s.level = 0.0f;
  s.active = false;
}

/** Every active voice, one block, one length, one boundary. */
void RenderBlock() {
  const int n = static_cast<int>(plaits::kBlockSize);
  for (int k = 0; k < n; k++) { mix_out[k] = 0.0f; mix_aux[k] = 0.0f; }

  for (int v = 0; v < polyphony; v++) {
    VoiceState& s = vs[v];
    // A FREE VOICE IS NOT RENDERED. Eight voices holding one note cost one
    // voice, which is what `plai_held` reports and what the page's load cell
    // is careful to say it is NOT measuring.
    if (!s.active) { s.level = 0.0f; continue; }

    if (s.restart > 0 && --s.restart == 0) s.mod.trigger = 1.0f;

    // ONE PATCH, COPIED, WITH ONE FIELD CHANGED. MEASURED rather than counted
    // off the struct: `sizeof(plaits::Patch)` is 40 bytes, so eight voices at
    // 4000 blocks a second copy 1.28 MB a second, which is nothing next to the
    // render underneath it.
    plaits::Patch p = patch;
    p.note = s.note;
    voice[v].Render(p, s.mod, vblock[v], static_cast<size_t>(n));
    voice_renders++;

    float peak = 0.0f;
    for (int k = 0; k < n; k++) {
      // Plaits renders 16 bit. The division is the only arithmetic this file
      // does to a sample, and it is the same one the Rack adapter does.
      const float o = static_cast<float>(vblock[v][k].out) / 32768.0f;
      const float a = static_cast<float>(vblock[v][k].aux) / 32768.0f;
      mix_out[k] += o;
      mix_aux[k] += a;
      const float m = o < 0.0f ? -o : o;
      if (m > peak) peak = m;
    }
    s.level = peak > s.level ? peak : s.level * kLevelRelease;

    if (s.settle < kSettleBlocks) s.settle++;
    if (s.restart == 0 && s.hold > 0 && --s.hold == 0) s.mod.trigger = 0.0f;

    if (s.mod.trigger_patched && s.hold == 0 && s.restart == 0
        && s.mod.trigger < 0.1f && s.settle >= kSettleBlocks
        && s.level < kSilence) {
      s.active = false;
    }
  }

  // 🔴 ONE TRIM, DECIDED BY THE SETTING AND NEVER BY WHAT IS SOUNDING. A gain
  // that follows the number of voices currently audible is a compressor nobody
  // asked for, and it pumps on every note. This one changes only when somebody
  // moves the voice control, so one voice at a setting of one is exactly as
  // loud as this page was when it was monophonic.
  for (int k = 0; k < n; k++) { mix_out[k] *= trim; mix_aux[k] *= trim; }
  blocks_rendered++;
}

}  // namespace

extern "C" {

// ── parameter ids ───────────────────────────────────────────────────────────
// The same numbers are written down in demo/muta/muta-worklet.js. Two files,
// one list, and a mismatch shows up as the wrong knob moving rather than as an
// error, which is why the names are spelled out on both sides.
//
//   0  engine          0..15, which of Plaits' sixteen models
//   1  note            MIDI note number for the NEXT note-on, 60 is middle C.
//                      Moving it also retunes anything that is droning.
//   2  harmonics       0..1
//   3  timbre          0..1
//   4  morph           0..1
//   5  decay           0..1, the lowpass gate's decay
//   6  lpg_colour      0..1, the lowpass gate's response
//   7  trigger         (removed: a gate belongs to a voice, see plai_note_on)
//   8  level           accent, only read when 10 is 1
//   9  trigger_patched (removed: see plai_set_drone)
//  10  level_patched   0 or 1
//  11  fm_amount       -1..1, also the internal envelope's pitch sweep
//  12  timbre_mod_amount
//  13  morph_mod_amount

/** Prepare every voice. Returns 1 when the host runs at the rate Plaits was
 *  compiled for, 0 when it does not and the pitch would be wrong. */
int plai_init(float host_sample_rate) {
  for (int v = 0; v < kMaxVoices; v++) {
    stmlib::BufferAllocator allocator(alloc_buffer[v], sizeof(alloc_buffer[v]));
    voice[v].Init(&allocator);
    std::memset(&vs[v], 0, sizeof(vs[v]));
    vs[v].note = 60.0f;
    vs[v].mod.trigger_patched = true;
  }

  std::memset(&patch, 0, sizeof(patch));
  patch.note = 60.0f;
  patch.harmonics = 0.5f;
  patch.timbre = 0.5f;
  patch.morph = 0.5f;
  patch.decay = 0.5f;
  patch.lpg_colour = 0.5f;

  base_note = 60.0f;
  polyphony = kMaxVoices;
  trim = 1.0f / __builtin_sqrtf(static_cast<float>(polyphony));
  serial = 0;
  droning = false;

  block_pos = static_cast<int>(plaits::kBlockSize);
  blocks_rendered = 0;
  voice_renders = 0;
  steals = 0;
  last_voice = -1;
  last_stolen = -1;
  last_stolen_note = 0.0f;
  last_stolen_level = 0.0f;
  ready = true;

  const float want = plaits::kSampleRate;
  return (host_sample_rate > want - 0.5f && host_sample_rate < want + 0.5f) ? 1 : 0;
}

void plai_set_param(int id, float v) {
  switch (id) {
    case 0:  patch.engine = static_cast<int>(v); break;
    case 1:
      base_note = v;
      // A note-on fixes a voice's pitch for the life of that note. A voice with
      // no gate on it has nothing else to take a pitch from, so it follows this
      // control and a drone can be played with it.
      for (int i = 0; i < kMaxVoices; i++) {
        if (!vs[i].mod.trigger_patched) vs[i].note = v;
      }
      break;
    case 2:  patch.harmonics = v; break;
    case 3:  patch.timbre = v; break;
    case 4:  patch.morph = v; break;
    case 5:  patch.decay = v; break;
    case 6:  patch.lpg_colour = v; break;
    case 8:  for (int i = 0; i < kMaxVoices; i++) vs[i].mod.level = v; break;
    case 10: for (int i = 0; i < kMaxVoices; i++) vs[i].mod.level_patched = v >= 0.5f; break;
    case 11: patch.frequency_modulation_amount = v; break;
    case 12: patch.timbre_modulation_amount = v; break;
    case 13: patch.morph_modulation_amount = v; break;
    default: break;
  }
}

float plai_get_param(int id) {
  switch (id) {
    case 0:  return static_cast<float>(patch.engine);
    case 1:  return base_note;
    case 2:  return patch.harmonics;
    case 3:  return patch.timbre;
    case 4:  return patch.morph;
    case 5:  return patch.decay;
    case 6:  return patch.lpg_colour;
    case 8:  return vs[0].mod.level;
    case 10: return vs[0].mod.level_patched ? 1.0f : 0.0f;
    case 11: return patch.frequency_modulation_amount;
    case 12: return patch.timbre_modulation_amount;
    case 13: return patch.morph_modulation_amount;
    default: return 0.0f;
  }
}

/**
 * HOW MANY VOICES RUN. Clamped to 1..kMaxVoices and returned, so a caller that
 * asks for twelve is told it got eight rather than finding out by listening.
 */
int plai_set_polyphony(int n) {
  if (n < 1) n = 1;
  if (n > kMaxVoices) n = kMaxVoices;
  // A voice that is leaving stops here rather than vanishing mid-note: it is
  // about to stop being rendered, and a note that disappears between two blocks
  // is a click.
  for (int v = n; v < kMaxVoices; v++) SilenceVoice(v);
  polyphony = n;
  trim = 1.0f / __builtin_sqrtf(static_cast<float>(n));
  return polyphony;
}

int plai_polyphony(void) { return polyphony; }
int plai_max_voices(void) { return kMaxVoices; }

/**
 * THE OUTPUT TRIM, READ RATHER THAN RE-DERIVED. The page prints this, and it
 * prints it from here because `1 / sqrt(n)` typed a second time in JavaScript
 * is a measurement in two files that can disagree. Eight voices come out at
 * 0.354, which is 9 dB below where this page sat when it was monophonic, and
 * that is the price of eight voices never summing past the destination.
 */
float plai_trim(void) { return trim; }

/**
 * PLAY A NOTE, AND RETURN THE VOICE THAT TOOK IT.
 *
 * 🔴 THE STEALING RULE IS **THE QUIETEST VOICE**, and the reason is this
 * instrument rather than tradition. A Plaits note is a pluck through a lowpass
 * gate with a decay control on it, so a voice keeps sounding long after its
 * gate has gone: at the default decay a note rings for about a second. Taking
 * the OLDEST voice therefore cuts whichever note is still ringing loudest,
 * which is the one a listener is holding on to, while a voice that decayed to
 * nothing three notes ago sits there unused. Quietest takes the one nobody can
 * hear.
 *
 * ⚠️ AND A VOICE THAT HAS NOT BEEN HEARD FROM YET DOES NOT COUNT AS QUIET.
 * `kSettleBlocks` is the whole of that correction: for the first 8 ms a voice's
 * level is a number that has not been measured, and treating it as a small one
 * would make every new note the next note's victim.
 *
 * ⚠️ IF NOTHING HAS BEEN HEARD FROM, the oldest is taken, which is the
 * degenerate case of eight note-ons inside 8 ms and is the only place the age
 * is read at all.
 *
 * ⚠️ EVERY NOTE-ON RELEASES THE GATE FIRST, for six blocks, which is 1.5 ms.
 * `voice.cc:87` reads the trigger through a five block delay line and
 * `voice.cc:94` only re-arms once the value falls under 0.1, so writing 1 over
 * a gate that is already 1 produces no new note at all. Doing it on every
 * note-on rather than only on a steal means there is one path and no branch to
 * get wrong, and a free voice's delay line is flushed the same way as a stolen
 * one's.
 *
 * @param note   MIDI note number
 * @param hold   blocks to hold the gate, 24 is 6 ms. 0 holds it until something
 *               else releases it, which is what a key and the drone both do.
 * @param level  0..1, the LEVEL input while the key is down, which is velocity.
 *               Only read when `hold` is 0; a pluck wants the ping envelope and
 *               gets its loudness from the engine.
 */
int plai_note_on(float note, int hold, float level) {
  if (!ready) return -1;

  int pick = -1;
  for (int v = 0; v < polyphony; v++) {
    if (!vs[v].active) { pick = v; break; }
  }

  int stole = -1;
  if (pick < 0) {
    float best = 0.0f;
    for (int v = 0; v < polyphony; v++) {
      if (vs[v].settle < kSettleBlocks) continue;
      if (pick < 0 || vs[v].level < best) { pick = v; best = vs[v].level; }
    }
    if (pick < 0) {
      int oldest = 0;
      for (int v = 1; v < polyphony; v++) {
        if (vs[v].age < vs[oldest].age) oldest = v;
      }
      pick = oldest;
    }
    stole = pick;
    last_stolen_note = vs[pick].note;
    last_stolen_level = vs[pick].level;
    steals++;
  }

  VoiceState& s = vs[pick];
  s.note = note;
  s.age = ++serial;
  s.settle = 0;
  s.level = 0.0f;
  s.hold = hold > 0 ? hold : 0;
  s.mod.trigger_patched = true;
  s.mod.trigger = 0.0f;
  /**
   * 🔴 A HELD NOTE PATCHES **LEVEL**, AND WITHOUT IT THERE IS NO SUSTAIN IN
   * PLAITS AT ALL. `voice.cc:212` drives the lowpass gate with
   * `lpg_envelope_.ProcessPing(...)` whenever the trigger is patched and the
   * LEVEL input is not, and a ping is a DECAY. Holding the gate high does
   * nothing: the trigger only re-arms the ping on a rising edge, so a key held
   * for a second sounded exactly like a key tapped, which is what was reported
   * as *"i want long midi notes, i got plunky sound"* and, after a first repair
   * that added a note off and changed nothing audible, as *"midi support is
   * really messed up"*.
   * ✅ **WITH `level_patched` THE SAME GATE RUNS `ProcessLP(compressed_level,
   * ...)` INSTEAD**, `voice.cc:210`, which FOLLOWS the level rather than
   * decaying from it. That is how Plaits is played from a keyboard on a rack:
   * TRIG for the attack, LEVEL for the gate. Two cables, and the second one is
   * the one that was missing.
   * ⚠️ AND IT IS PER NOTE RATHER THAN A MODE. `hold > 0` is this page's own
   * pluck, which wants the ping, so it keeps it. `hold == 0` is a key that is
   * down and a drone, and only the key raises the level.
   * ⚠️ `p.accent` BECOMES THE LEVEL TOO, `voice.cc:143`, so velocity is real
   * from here rather than being a number this file throws away.
   */
  /**
   * 🔴 A LEVEL ABOVE ZERO IS WHAT PATCHES THE LEVEL INPUT, NOT A HOLD OF ZERO.
   * This read `hold == 0` for one build and that was too broad by one caller:
   * the page's own BENCH plays `plai_note_on(note, 0)` for each voice and then
   * drones them, so all eight became keyboard notes and the drone silenced
   * every one. It priced eight voices at the cost of the one the drone
   * allocates for itself, **4 µs against 4 µs**, and the assert that says a
   * voice count which costs the same whatever it is set to means the voices are
   * not being rendered went red on the next run.
   * ⚠️ SO THE SIGNAL IS EXPLICIT. A caller that wants a gate held open with no
   * envelope on it passes nothing, which is 0 across the wasm boundary, and
   * gets the old behaviour exactly. A key passes its velocity.
   */
  s.gate = level > 0.0f ? (level > 1.0f ? 1.0f : level) : 1.0f;
  s.mod.level_patched = hold == 0 && level > 0.0f;
  s.mod.level = s.mod.level_patched ? s.gate : 0.0f;
  s.restart = static_cast<int>(plaits::kTriggerDelay) + 1;
  s.active = true;

  last_voice = pick;
  last_stolen = stole;
  return pick;
}

/**
 * RELEASE ONE NOTE, WHICH IS WHAT A KEY COMING BACK UP MEANS.
 *
 * 🔴 UNTIL 2026-09-22 THIS FILE HAD NO NOTE-OFF AT ALL, AND THAT IS WHY A REAL
 * KEYBOARD PLAYED PLUCKS. `plai_note_on` is the only way in and its `hold`
 * argument is a number of BLOCKS decided at the moment the key goes DOWN, so
 * the length of a note had to be guessed before the player had finished
 * playing it. 6 ms of hold through a lowpass gate is a pluck whatever the key
 * does next, and holding the key longer changed nothing.
 *
 * ⚠️ IT DROPS THE GATE AND NOTHING ELSE. The voice keeps rendering, the lowpass
 * gate closes over `decay`, and `RenderBlock` frees it when its level falls
 * under `kSilence`. Freeing it here would cut the release, which is the sound
 * the instrument is FOR.
 *
 * ⚠️ AND A DRONING VOICE IS LEFT ALONE. With `trigger_patched` false there is no
 * gate to drop, so a note-off on it would be silently ignored rather than
 * obviously ignored, and the drone is not something a key press owns.
 *
 * ⚠️ A KEY RELEASED INSIDE 1.5 ms IS THE ONE CASE THAT NEEDS ARITHMETIC. The
 * gate has not gone UP yet at that point: `restart` counts the five block
 * trigger delay `voice.cc:87` reads through. Zeroing it there would produce a
 * note-on that never sounds, so the gate is scheduled to rise and then fall
 * four blocks later, which is the pluck this function exists to avoid and is
 * the honest answer to a key that really was tapped that fast.
 *
 * @param note  the MIDI note number the key sent. Every voice holding it is
 *              released, because two keys cannot send one number.
 * @return how many voices were released, which is 0 for a note nobody is
 *         holding and is a fact the page prints rather than an error.
 */
int plai_note_off(float note) {
  int n = 0;
  for (int v = 0; v < polyphony; v++) {
    VoiceState& s = vs[v];
    if (!s.active || s.note != note) continue;
    if (!s.mod.trigger_patched) continue;
    /* 🔴 THE LEVEL IS WHAT ENDS IT, NOT THE TRIGGER. With `level_patched` the
       lowpass gate follows this number, so dropping it to 0 closes the gate
       over the decay tail. Dropping the trigger alone left `ProcessLP` holding
       whatever level it was last given, which is a note that never stops. */
    s.mod.level = 0.0f;
    if (s.restart > 0) { s.hold = s.restart + 4; }
    else { s.mod.trigger = 0.0f; s.hold = 0; }
    n++;
  }
  return n;
}

/** Stop everything, now. Used when the voice count changes and by the page's
 *  own checks, so a run never inherits the last one's ringing. */
void plai_all_off(void) {
  for (int v = 0; v < kMaxVoices; v++) SilenceVoice(v);
  droning = false;
}

/**
 * DRONE, WHICH IS WHAT `trigger_patched` MEANS. With nothing patched into the
 * trigger the lowpass gate is bypassed and the engine simply runs.
 *
 * ⚠️ IT ACTS ON WHAT IS SOUNDING, AND ON ONE NOTE IF NOTHING IS. A drone has no
 * note-on in it, so there is nothing to hand round eight voices; what there is
 * instead is whatever is already held, which means a chord pressed first and
 * droned second sustains as a chord.
 */
void plai_set_drone(int on) {
  if (on) {
    /**
     * 🔴 A KEYBOARD NOTE IS NOT DRONE MATERIAL, AND TURNING IT INTO ONE IS A
     * NOTE THAT CAN NEVER BE STOPPED. Reported 2026-09-22: *"i get distorted
     * pluck and then beneath it the right drone sound. that pluck never goes
     * away"*. The loop below clears `trigger_patched` on everything SOUNDING,
     * which takes the lowpass gate out of the circuit, so a note still ringing
     * from a key when the drone starts stops being a note and becomes a second
     * drone, at that key's pitch, for ever. Nothing can release it: there is no
     * gate left to drop, and its own note off finds `trigger_patched` false and
     * correctly refuses to touch it.
     * ✅ A LEVEL-PATCHED VOICE IS EXACTLY A KEYBOARD NOTE, which is what makes
     * this separable at all: the page's own pluck is not level patched, so
     * *"a chord held first and droned second sustains as a chord"* below is
     * unchanged and still true of the thing it was written about.
     */
    for (int v = 0; v < kMaxVoices; v++) {
      if (vs[v].mod.level_patched) SilenceVoice(v);
    }
    bool any = false;
    for (int v = 0; v < polyphony; v++) if (vs[v].active) any = true;
    /* 0 FOR THE LEVEL, WHICH MEANS THE GATE IS HELD OPEN WITH NO ENVELOPE ON
       IT. A drone that patched the level input would be a note held by an
       envelope rather than an engine running free, and would silence itself on
       the next drone. */
    if (!any) plai_note_on(base_note, 0, 0.0f);
    for (int v = 0; v < polyphony; v++) {
      if (!vs[v].active) continue;
      vs[v].hold = 0;
      vs[v].restart = 0;
      vs[v].mod.trigger = 0.0f;
      vs[v].mod.trigger_patched = false;
      /* 🔴 AND THE LEVEL INPUT COMES OUT TOO, OR THERE IS NO DRONE.
         `voice.cc:201` bypasses the lowpass gate only when NEITHER input is
         patched. A voice droning with `level_patched` still true would have the
         gate following a level nobody is moving, which is a note held open by
         an envelope rather than an engine running free. */
      vs[v].mod.level_patched = false;
      vs[v].mod.level = 0.0f;
    }
  } else {
    for (int v = 0; v < kMaxVoices; v++) {
      vs[v].mod.trigger_patched = true;
      vs[v].mod.trigger = 0.0f;
      vs[v].mod.level_patched = false;
      vs[v].mod.level = 0.0f;
      vs[v].hold = 0;
      vs[v].restart = 0;
    }
  }
  droning = on != 0;
}

int plai_droning(void) { return droning ? 1 : 0; }

/** How many voices are being rendered right now. */
int plai_held(void) {
  int n = 0;
  for (int v = 0; v < polyphony; v++) if (vs[v].active) n++;
  return n;
}

float plai_voice_note(int v) {
  return (v < 0 || v >= kMaxVoices) ? 0.0f : vs[v].note;
}

float plai_voice_level(int v) {
  return (v < 0 || v >= kMaxVoices) ? 0.0f : vs[v].level;
}

/** 0 beyond the voice count, 1 free, 2 the gate is up, 3 ringing, 4 droning. */
int plai_voice_state(int v) {
  if (v < 0 || v >= kMaxVoices) return 0;
  if (v >= polyphony) return 0;
  const VoiceState& s = vs[v];
  if (!s.active) return 1;
  if (!s.mod.trigger_patched) return 4;
  if (s.restart > 0 || s.hold > 0 || s.mod.trigger > 0.1f) return 2;
  return 3;
}

int plai_steals(void) { return steals; }
int plai_last_voice(void) { return last_voice; }
int plai_last_stolen(void) { return last_stolen; }
float plai_last_stolen_note(void) { return last_stolen_note; }
float plai_last_stolen_level(void) { return last_stolen_level; }

/** Fill `frames` samples of each output. Returns how many 12-frame blocks of
 *  Plaits were run to do it, which is the number the page prints. */
int plai_render(float* out, float* aux, int frames) {
  if (!ready) return 0;
  int ran = 0;
  int i = 0;
  while (i < frames) {
    if (block_pos >= static_cast<int>(plaits::kBlockSize)) {
      RenderBlock();
      block_pos = 0;
      ran++;
    }
    int n = static_cast<int>(plaits::kBlockSize) - block_pos;
    if (n > frames - i) n = frames - i;
    for (int k = 0; k < n; k++) {
      out[i + k] = mix_out[block_pos + k];
      aux[i + k] = mix_aux[block_pos + k];
    }
    i += n;
    block_pos += n;
  }
  return ran;
}

float* plai_out_ptr(void) { return out_scratch; }
float* plai_aux_ptr(void) { return aux_scratch; }
int plai_scratch_frames(void) { return kScratch; }

/** Which model is sounding, asked of the voice that took the last note. Not the
 *  same as parameter 0: `voice.cc` runs the request through a hysteresis
 *  quantizer and only swaps on a trigger when one is patched, so the asked-for
 *  engine and the sounding engine can differ for a block or two. The page shows
 *  both. */
int plai_active_engine(void) {
  const int v = (last_voice >= 0 && last_voice < polyphony) ? last_voice : 0;
  return voice[v].active_engine();
}

int plai_engine_count(void) { return 16; }
int plai_block_size(void) { return static_cast<int>(plaits::kBlockSize); }
float plai_sample_rate(void) { return plaits::kSampleRate; }
int plai_blocks_rendered(void) { return blocks_rendered; }

/**
 * `Voice::Render` CALLS, SUMMED OVER EVERY VOICE, AND IT IS THE HALF THAT MAKES
 * THE BLOCK INVARIANT CHECKABLE. With N voices sounding for a whole stretch,
 * this has to advance by exactly N times `plai_blocks_rendered`. Anything that
 * rendered a voice on its own schedule, at its own length, or not at all, shows
 * up as a number that does not divide.
 */
int plai_voice_renders(void) { return voice_renders; }

/** What eight voices cost in bytes, read off the types rather than estimated. */
int plai_voice_bytes(void) { return static_cast<int>(sizeof(plaits::Voice)); }
int plai_alloc_bytes(void) { return static_cast<int>(sizeof(alloc_buffer[0])); }

/** The full stamp: both upstream commits, the source digest, the compiler. */
const char* plai_build(void) { return kBuild; }

/** The source digest alone, over the exact list of .cc files compiled into
 *  this module and the shim itself. A native build of the same sources on
 *  another machine prints the same sixteen characters, and that is the only
 *  thing that can turn "the same instrument at both ends" into a checkable
 *  statement rather than a claim about two things that sound alike. */
const char* plai_source_sha(void) { return kSourceSha; }

}  // extern "C"
