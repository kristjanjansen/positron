// demo/muta/build/warp_shim.cc: the whole contact surface between a browser
// and Emilie Gillet's Warps DSP.
//
// WHAT THIS IS NOT: a port, a rewrite, or a reimplementation. Every sample
// below comes out of `warps/dsp/modulator.cc` unmodified, compiled from the
// commit recorded in ../vendor/PROVENANCE-warp.json. Nothing in `warps/` or
// `stmlib/` is edited, patched or copied into this file.
//
// WHAT THIS IS NOT, SECOND: Rack's `Module`. There is no Param, no Port, no
// Light and no voltage anywhere.
//
// ── THE CONTACT SURFACE IS SMALLER THAN PLAITS' AND THAT IS THE WHOLE JOB ───
//
// `Modulator` is `Init(float sample_rate)`, `Process(ShortFrame*, ShortFrame*,
// size_t)` and one `Parameters` struct. There is no voice, no allocator, no
// note, no gate and no stealing rule, so the half of `plai_shim.cc` that is
// polyphony machinery simply does not exist here.
//
// ── 🔴 THE BLOCK LENGTH IS 60 AND IT IS NOT A FREE CHOICE ───────────────────
//
// `plans/plan-two-more-modules.md` §3.4 says a 128 frame quantum is "two calls
// of 64 with no carry", on the evidence that every `kMaxBlockSize` in
// `warps/dsp/` is an array dimension and every loop uses `size`. BOTH HALVES OF
// THAT ARE TRUE AND THE CONCLUSION IS WRONG, and the reason is two floors:
//
//   1. `filter_bank.cc:100` is `size / b.decimation_factor`, and the decimation
//      factors read out of the tables are 12, 3 and 1 (`fb__87_8000` opens with
//      `1.2e+01`). So 64 frames give the thirteen lowest bands 64/12 = 5 and
//      throw four frames on the floor, every block, silently.
//   2. `sample_rate_converter.h:220` REFUSES a block it cannot divide:
//      `if ((input_size % ratio) != 0) return;` with no error and no output.
//      `FilterBank::Analyze` calls `low_src_down_` with `size / kMidFactor`, so
//      64 leaves that converter reading a buffer it never wrote.
//
// 🔴 AND BOTH FAILURES ARE SILENT, WHICH IS WHY THIS IS WRITTEN OUT AT LENGTH.
// A vocoder with a stale low band and a dropped frame in twelve does not throw
// and does not go quiet. It sounds slightly wrong, and slightly wrong is the
// one fault nobody attributes to arithmetic.
//
// ✅ SO THE REQUIREMENT IS **A MULTIPLE OF 12, AT MOST `kMaxBlockSize` = 96**,
// and 60 is the one the firmware itself uses: `warps/warps.cc:100` is
// `codec.Start(60, &FillBuffer)`. Choosing the hardware's own length also keeps
// the 6x downsampler on the branch the hardware takes, because
// `sample_rate_converter.h:225` switches implementation at
// `input_size >= 8 * filter_size`: 60 x 6 = 360 against 8 x 48 = 384, so this
// runs the same circular-buffer variant the module runs. A block of 96 would
// have crossed that line and taken a path the firmware never exercises.
//
// ⚠️ 128 IS NOT A MULTIPLE OF 60, SO THERE IS A CARRY, exactly as there is in
// `plai_shim.cc` for a different reason. Two blocks fire in one quantum and
// eight frames are held over, so the third block lands 52 frames into the next
// call. `warp_carry()` reports how many frames are sitting in the block that is
// not full yet.
//
// ⚠️ AND A BLOCK CANNOT BE RENDERED UNTIL ITS INPUT IS COMPLETE, SO THE EFFECT
// DELAYS BY ONE BLOCK. 60 frames is 1.25 ms at 48 kHz. The first 60 frames out
// of a fresh instance are silence, which is a fact about a buffer rather than
// about the DSP, and `warp_block_size()` is what a page prints instead of
// guessing.
//
// ── 🔴 THE SAMPLE RATE, WHICH IS THE PART THAT IS WRONG ON PURPOSE ──────────
//
// Warps runs at 96 kHz in hardware (`warps/warps.cc:91` is
// `modulator.Init(96000.0f)`) and this page runs at 48 kHz. `Modulator::Init`
// TAKES the rate and hands it to the oscillators, the envelope followers and
// `FilterBank::Init`, all of which are then correct. **The biquad coefficients
// are not.** They come out of `resources.cc` as fixed numbers computed by
// `warps/resources/filter_bank.py`, whose line 63 reads `SAMPLE_RATE = 96000`,
// and the table names carry the rate they were designed at: `fb__87_8000`
// through `fb_7040_96000`.
//
// 🔴 SO AT 48 kHz THE TWENTY VOCODER BANDS SIT EXACTLY ONE OCTAVE BELOW WHERE
// THE HARDWARE PUTS THEM: 43.7 Hz to 3520 Hz instead of 87.3 Hz to 7040 Hz.
// The six cross-modulation algorithms are UNAFFECTED, because they are
// memoryless waveshapers and the 6x polyphase converter around them is a fixed
// interpolation filter with no rate in it. Half the knob is exactly right and
// half of it is an octave low.
//
// ⚠️ WHAT WAS REFUSED IS RUNNING THE CONTEXT AT 96 kHz, which is the tidy
// looking answer and is the trap. `plai_init` returns 0 at any rate but 48000
// by design, so a 96 kHz context would silently make the two firmwares on this
// page incompatible. Oversampling 2x inside this shim is the real fix and is a
// later job; it is 40 to 60 lines here plus a converter on the incoming
// carrier, and it doubles what Warps costs.
//
// ✅ SO THE ERROR IS REPORTED RATHER THAN HIDDEN. `warp_table_rate()`,
// `warp_band_shift()`, `warp_band_lo()` and `warp_band_hi()` exist for no other
// reason, and the page prints the shift in a readout cell whenever the vocoder
// path is the one sounding.

#include <cstddef>
#include <cstring>

#include "warps/dsp/modulator.h"
#include "warps/dsp/filter_bank.h"
#include "stmlib/dsp/dsp.h"

#ifndef WARP_BUILD
#define WARP_BUILD "unstamped"
#endif
#ifndef WARP_SOURCE_SHA
#define WARP_SOURCE_SHA "unstamped"
#endif

namespace {

// 60, AND THE HEADER ABOVE IS WHY. A multiple of 12, at most `kMaxBlockSize`,
// and the length `warps.cc:100` hands the codec.
const int kBlock = 60;

// 96000, READ OFF THE GENERATOR SCRIPT RATHER THAN OFF THE HARDWARE. It is
// `SAMPLE_RATE` in `warps/resources/filter_bank.py:63` and in
// `warps/resources/lookup_tables.py:103`, which is the rate the filter bank's
// coefficients were designed at. That is the number the bands are wrong by, and
// it is not the same claim as "the module runs at 96 kHz", although both
// happen to be true.
const float kTableRate = 96000.0f;

// THE BAND LAYOUT, IN THE GENERATOR'S OWN ARITHMETIC.
// `filter_bank.py:78-81`: the interval is a third of an octave, the first
// centre is 110 / interval, and there are twenty of them.
const float kInterval = 1.259921049894873f;      // 2 ** (1/3)
const float kFirstBandHz = 110.0f / kInterval;   // 87.3 Hz at the table rate

warps::Modulator modulator;

float host_rate = 0.0f;
bool ready = false;

// ── the block machinery ─────────────────────────────────────────────────────
// One block in, one block out, and they are separate arrays because
// `Modulator::Process` writes its output while still reading its input.
warps::ShortFrame in_block[kBlock];
warps::ShortFrame out_block[kBlock];
int pos = 0;                 // frames written into `in_block`

int blocks_rendered = 0;
int frames_rendered = 0;

// Scratch the caller can render through without owning an allocator inside
// wasm memory. `warp_render` still takes pointers, so a native host on another
// machine can hand it its own buffers.
const int kScratch = 1024;
float in_l_scratch[kScratch];
float in_r_scratch[kScratch];
float out_scratch[kScratch];
float aux_scratch[kScratch];

const char kBuild[] = WARP_BUILD;
const char kSourceSha[] = WARP_SOURCE_SHA;

inline short ToShort(float x) {
  return stmlib::Clip16(static_cast<int32_t>(x * 32768.0f));
}

/** The vocoder blend, computed the way `modulator.cc:205-207` computes it. */
float VocoderAmount() {
  const warps::Parameters& p = modulator.parameters();
  float a = (p.modulation_algorithm - 0.7f) * 20.0f + 0.5f;
  if (a < 0.0f) a = 0.0f;
  if (a > 1.0f) a = 1.0f;
  return a;
}

}  // namespace

extern "C" {

// ── parameter ids ───────────────────────────────────────────────────────────
// The same numbers are written down in demo/muta/muta-worklet.js. Two files,
// one list, and a mismatch shows up as the wrong knob moving rather than as an
// error, which is why the names are spelled out on both sides.
//
//   0  algorithm     0..1, the continuous knob. Six waveshapers, then a
//                    crossfade, then a 20 band vocoder.
//   1  amount        0..1, `modulation_parameter`, whose meaning changes with
//                    the algorithm. In the vocoder it is the formant shift.
//   2  drive 1       0..1, the carrier channel's gain and saturation
//   3  drive 2       0..1, the modulator channel's
//   4  note          MIDI note for the internal carrier oscillator
//   5  carrier       0 external, 1..3 one of the internal shapes

/** Prepare the modulator at the host's rate. Returns 1 when that rate is the
 *  one the filter bank's coefficients were computed at, 0 when it is not and
 *  the vocoder's bands are shifted. Unlike `plai_init` this is NOT a refusal:
 *  Warps at the wrong rate is half right, and the page reports which half. */
int warp_init(float host_sample_rate) {
  host_rate = host_sample_rate;
  modulator.Init(host_sample_rate);

  warps::Parameters* p = modulator.mutable_parameters();
  std::memset(p, 0, sizeof(*p));
  p->channel_drive[0] = 0.5f;
  p->channel_drive[1] = 0.5f;
  p->modulation_algorithm = 0.0f;
  p->modulation_parameter = 0.5f;
  p->note = 48.0f;
  p->carrier_shape = 0;                 // external, which is the chain

  std::memset(in_block, 0, sizeof(in_block));
  std::memset(out_block, 0, sizeof(out_block));
  pos = 0;
  blocks_rendered = 0;
  frames_rendered = 0;
  ready = true;

  return (host_sample_rate > kTableRate - 0.5f && host_sample_rate < kTableRate + 0.5f) ? 1 : 0;
}

void warp_set_param(int id, float v) {
  warps::Parameters* p = modulator.mutable_parameters();
  switch (id) {
    case 0: p->modulation_algorithm = v; break;
    case 1: p->modulation_parameter = v; break;
    case 2: p->channel_drive[0] = v; break;
    case 3: p->channel_drive[1] = v; break;
    case 4: p->note = v; break;
    case 5: {
      int s = static_cast<int>(v);
      if (s < 0) s = 0;
      if (s > 3) s = 3;                 // `ui.cc:231` is `(shape + 1) & 3`
      p->carrier_shape = s;
      break;
    }
    default: break;
  }
}

float warp_get_param(int id) {
  const warps::Parameters& p = modulator.parameters();
  switch (id) {
    case 0: return p.modulation_algorithm;
    case 1: return p.modulation_parameter;
    case 2: return p.channel_drive[0];
    case 3: return p.channel_drive[1];
    case 4: return p.note;
    case 5: return static_cast<float>(p.carrier_shape);
    default: return 0.0f;
  }
}

/**
 * TWO SIGNALS IN, TWO OUT, IN BLOCKS OF SIXTY WITH THE REMAINDER CARRIED.
 *
 * `in_l` is the carrier input, which the internal oscillator replaces when the
 * carrier shape is anything but 0. `in_r` is the modulator input. `out` is the
 * main output and `aux` is the module's second jack, which carries the summed
 * inputs on the cross-modulation side and the raw carrier on the vocoder side.
 *
 * ⚠️ THE OUTPUT IS ONE BLOCK BEHIND THE INPUT, BY CONSTRUCTION. A block cannot
 * be rendered until its last input frame has arrived, so the first 60 frames
 * after `warp_init` are silence and everything after that is 60 frames late.
 *
 * @return how many blocks of 60 were rendered to fill this call.
 */
int warp_render(const float* in_l, const float* in_r, float* out, float* aux, int frames) {
  if (!ready) return 0;
  int ran = 0;
  for (int i = 0; i < frames; i++) {
    // READ FIRST, THEN WRITE. `out_block[pos]` still holds the previous block's
    // result at this position, which is the one frame of it this call owes the
    // caller. Writing the input first would overwrite nothing (the arrays are
    // separate) but reading first is what makes the order obvious.
    out[i] = static_cast<float>(out_block[pos].l) / 32768.0f;
    aux[i] = static_cast<float>(out_block[pos].r) / 32768.0f;

    in_block[pos].l = ToShort(in_l[i]);
    in_block[pos].r = ToShort(in_r[i]);
    pos++;

    if (pos >= kBlock) {
      modulator.Process(in_block, out_block, static_cast<size_t>(kBlock));
      pos = 0;
      ran++;
      blocks_rendered++;
    }
  }
  frames_rendered += frames;
  return ran;
}

float* warp_in_l_ptr(void) { return in_l_scratch; }
float* warp_in_r_ptr(void) { return in_r_scratch; }
float* warp_out_ptr(void) { return out_scratch; }
float* warp_aux_ptr(void) { return aux_scratch; }
int warp_scratch_frames(void) { return kScratch; }

int warp_block_size(void) { return kBlock; }
int warp_max_block(void) { return static_cast<int>(warps::kMaxBlockSize); }
int warp_carry(void) { return pos; }
int warp_blocks_rendered(void) { return blocks_rendered; }
int warp_frames_rendered(void) { return frames_rendered; }

float warp_sample_rate(void) { return host_rate; }

/** 96000. What `filter_bank.py` computed the coefficients at, which is not the
 *  same statement as what the module runs at. */
float warp_table_rate(void) { return kTableRate; }

int warp_band_count(void) { return static_cast<int>(warps::kNumBands); }

/**
 * HOW FAR THE VOCODER'S BANDS ARE FROM WHERE THE TABLES PUT THEM, IN OCTAVES.
 * 0 at 96 kHz and -1 at 48 kHz. A biquad's coefficients are normalised to the
 * rate they were designed at, so running the same numbers at half the rate puts
 * every band at half the frequency.
 */
float warp_band_shift(void) {
  if (host_rate <= 0.0f) return 0.0f;
  return __builtin_log2f(host_rate / kTableRate);
}

/** The lowest band's centre at the rate this is running at. 87.3 Hz on the
 *  hardware, 43.7 Hz here. */
float warp_band_lo(void) {
  return kFirstBandHz * (host_rate / kTableRate);
}

/** The highest band's centre, nineteen thirds of an octave above the lowest.
 *  7040 Hz on the hardware, 3520 Hz here. */
float warp_band_hi(void) {
  float f = kFirstBandHz;
  for (int i = 0; i < static_cast<int>(warps::kNumBands) - 1; i++) f *= kInterval;
  return f * (host_rate / kTableRate);
}

/**
 * WHICH OF THE SEVEN IS SOUNDING, 0 to 5 for the cross-modulation algorithms
 * and 6 for the vocoder. `modulator.cc:285` is the same arithmetic:
 * `min(modulation_algorithm * 8, 5.999)`, whose integral part selects the pair
 * being crossfaded and whose fractional part is the blend.
 */
int warp_algorithm(void) {
  if (VocoderAmount() >= 0.5f) return 6;
  float a = modulator.parameters().modulation_algorithm * 8.0f;
  if (a > 5.999f) a = 5.999f;
  if (a < 0.0f) a = 0.0f;
  return static_cast<int>(a);
}

/** How far between that algorithm and the next one the knob sits, 0 to 1. The
 *  control surface is continuous rather than a list of modes, which is the
 *  thing that makes this module different from Plaits' stepped engines. */
float warp_algorithm_blend(void) {
  if (VocoderAmount() >= 0.5f) return 0.0f;
  float a = modulator.parameters().modulation_algorithm * 8.0f;
  if (a > 5.999f) a = 5.999f;
  if (a < 0.0f) a = 0.0f;
  return a - static_cast<float>(static_cast<int>(a));
}

float warp_vocoder_amount(void) { return VocoderAmount(); }
int warp_vocoding(void) { return VocoderAmount() >= 0.5f ? 1 : 0; }
int warp_carrier_shape(void) { return modulator.parameters().carrier_shape; }

/** The full stamp: both upstream commits, the source digest, the compiler. */
const char* warp_build(void) { return kBuild; }

/** The source digest alone, over the exact list of .cc files compiled into this
 *  module and the shim itself. It is a DIFFERENT digest from the one plai.wasm
 *  carries, because the shim bytes and the source list are both different, and
 *  that is what keeps one build script from giving two modules one identity. */
const char* warp_source_sha(void) { return kSourceSha; }

}  // extern "C"
