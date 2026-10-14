// rig/board/plaits/posplaits.cc: demo/muta/build/plaits_shim.cc as a JACK client, `posplaits:out_1`,
// mono. Control is one text line per command on stdin (rig/board/plaits.mjs writes them), queued
// to the process callback because the shim's state is plain globals. Answers are lines on stdout.
//
//   on <note> <level>   off <note>   set <id> <value>   voices <n>   gain <g>   panic   stats   quit
//   posplaits --version       prints the build stamp and exits, no JACK needed
//   posplaits --voices 6      how many voices the shim runs, 1 to plaits_max_voices()

#include <jack/jack.h>

#include <atomic>
#include <cerrno>
#include <cmath>
#include <csignal>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <ctime>
#include <poll.h>
#include <unistd.h>

extern "C" {
int plaits_init(float host_sample_rate);
void plaits_set_param(int id, float v);
int plaits_set_polyphony(int n);
int plaits_polyphony(void);
int plaits_max_voices(void);
int plaits_note_on(float note, int hold, float level);
int plaits_note_off(float note);
void plaits_all_off(void);
int plaits_held(void);
int plaits_steals(void);
int plaits_render(float* out, float* aux, int frames);
int plaits_active_engine(void);
int plaits_blocks_rendered(void);
const char* plaits_build(void);
const char* plaits_source_sha(void);
}

namespace {

const char kClient[] = "posplaits";
const float kRate = 48000.0f;
// The aux output is rendered and dropped; a JACK period longer than this is rendered in pieces.
const int kAuxFrames = 4096;
// Past this the capture, which sums every engine into one input, clips anyway; it is a guard,
// not a level.
const float kClip = 0.98f;
const float kMaxGain = 4.0f;

enum Op : char { kOn = 'n', kOff = 'f', kSet = 'p', kVoices = 'v', kGain = 'g', kPanic = 'x' };
struct Cmd { Op op; float a; float b; };

// One producer (the stdin thread) and one consumer (the process callback), no lock.
const unsigned kRing = 1024;
Cmd ring[kRing];
std::atomic<unsigned> ring_head(0), ring_tail(0);

bool push(const Cmd& c) {
  const unsigned h = ring_head.load(std::memory_order_relaxed);
  if (h - ring_tail.load(std::memory_order_acquire) >= kRing) return false;
  ring[h % kRing] = c;
  ring_head.store(h + 1, std::memory_order_release);
  return true;
}
bool pop(Cmd* c) {
  const unsigned t = ring_tail.load(std::memory_order_relaxed);
  if (t == ring_head.load(std::memory_order_acquire)) return false;
  *c = ring[t % kRing];
  ring_tail.store(t + 1, std::memory_order_release);
  return true;
}

jack_client_t* client = nullptr;
jack_port_t* out_port = nullptr;
float aux[kAuxFrames];
float gain = 1.0f;  // audio thread only

// Written by the audio thread, read by `stats` on the main thread.
std::atomic<int> st_held(0), st_steals(0), st_engine(0), st_voices(0), st_clipped(0);
std::atomic<unsigned long> st_callbacks(0), st_frames(0), st_cmds(0), st_blocks(0);
std::atomic<unsigned long> st_us_sum(0), st_us_max(0), st_us_n(0);
std::atomic<int> st_xruns(0), st_dropped(0), st_refused(0);
std::atomic<bool> quitting(false), jack_gone(false);

double now_us() {
  timespec t;
  clock_gettime(CLOCK_MONOTONIC, &t);
  return t.tv_sec * 1e6 + t.tv_nsec / 1e3;
}

void apply(const Cmd& c) {
  switch (c.op) {
    case kOn: plaits_note_on(c.a, 0, c.b); break;
    case kOff: plaits_note_off(c.a); break;
    case kSet: plaits_set_param(static_cast<int>(c.a), c.b); break;
    case kVoices: plaits_set_polyphony(static_cast<int>(c.a)); break;
    case kGain: gain = c.a; break;
    case kPanic: plaits_all_off(); break;
    default: break;
  }
}

int process(jack_nframes_t nframes, void*) {
  const double t0 = now_us();
  Cmd c;
  unsigned long n_cmds = 0;
  while (pop(&c)) { apply(c); n_cmds++; }
  float* out = static_cast<float*>(jack_port_get_buffer(out_port, nframes));
  int blocks = 0;
  for (jack_nframes_t done = 0; done < nframes;) {
    const int k = static_cast<int>(nframes - done < static_cast<jack_nframes_t>(kAuxFrames) ? nframes - done : kAuxFrames);
    blocks += plaits_render(out + done, aux, k);
    done += k;
  }
  int clipped = 0;
  for (jack_nframes_t i = 0; i < nframes; i++) {
    float v = out[i] * gain;
    if (v > kClip) { v = kClip; clipped++; }
    else if (v < -kClip) { v = -kClip; clipped++; }
    out[i] = v;
  }
  const unsigned long us = static_cast<unsigned long>(now_us() - t0);
  st_us_sum.fetch_add(us, std::memory_order_relaxed);
  st_us_n.fetch_add(1, std::memory_order_relaxed);
  unsigned long was = st_us_max.load(std::memory_order_relaxed);
  while (us > was && !st_us_max.compare_exchange_weak(was, us, std::memory_order_relaxed)) {}
  st_callbacks.fetch_add(1, std::memory_order_relaxed);
  st_frames.fetch_add(nframes, std::memory_order_relaxed);
  st_cmds.fetch_add(n_cmds, std::memory_order_relaxed);
  st_blocks.fetch_add(static_cast<unsigned long>(blocks), std::memory_order_relaxed);
  if (clipped) st_clipped.fetch_add(clipped, std::memory_order_relaxed);
  st_held.store(plaits_held(), std::memory_order_relaxed);
  st_steals.store(plaits_steals(), std::memory_order_relaxed);
  st_engine.store(plaits_active_engine(), std::memory_order_relaxed);
  st_voices.store(plaits_polyphony(), std::memory_order_relaxed);
  return 0;
}

int on_xrun(void*) { st_xruns.fetch_add(1, std::memory_order_relaxed); return 0; }
void on_shutdown(void*) { jack_gone.store(true); }
void on_signal(int) { quitting.store(true); }

void say(const char* kind, const char* json) { std::printf("%s %s\n", kind, json); std::fflush(stdout); }

void stats() {
  const unsigned long n = st_us_n.exchange(0), sum = st_us_sum.exchange(0), max = st_us_max.exchange(0);
  const jack_nframes_t period = client ? jack_get_buffer_size(client) : 0;
  const double period_us = period ? period * 1e6 / kRate : 0;
  const double avg = n ? static_cast<double>(sum) / n : 0;
  char b[512];
  std::snprintf(b, sizeof b,
    "{\"held\":%d,\"steals\":%d,\"engine\":%d,\"voices\":%d,\"callbacks\":%lu,\"frames\":%lu,\"blocks\":%lu,"
    "\"cmds\":%lu,\"renderUsAvg\":%.1f,\"renderUsMax\":%lu,\"loadPct\":%.2f,\"period\":%u,\"xruns\":%d,"
    "\"clipped\":%d,\"dropped\":%d,\"refused\":%d}",
    st_held.load(), st_steals.load(), st_engine.load(), st_voices.load(), st_callbacks.load(), st_frames.load(),
    st_blocks.load(), st_cmds.load(), avg, max, period_us > 0 ? 100.0 * avg / period_us : 0.0,
    static_cast<unsigned>(period), st_xruns.load(), st_clipped.load(), st_dropped.load(), st_refused.load());
  say("stats", b);
}

bool finite_in(float v, float lo, float hi) { return std::isfinite(v) && v >= lo && v <= hi; }

// The ids plaits_set_param acts on; 7 and 9 were removed from the shim and are refused here.
bool param_ok(int id) {
  switch (id) { case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 8: case 10: case 11: case 12: case 13: return true; }
  return false;
}

void refuse(const char* reason) {
  st_refused.fetch_add(1);
  char b[160];
  std::snprintf(b, sizeof b, "{\"reason\":\"%s\"}", reason);
  say("err", b);
}

void queue(const Cmd& c) { if (!push(c)) st_dropped.fetch_add(1); }

// One line, already without its newline. Answers false on `quit`.
bool line(char* s) {
  char word[16] = {0};
  float a = NAN, b = NAN;
  const int got = std::sscanf(s, "%15s %f %f", word, &a, &b);
  if (got < 1) return true;
  if (!std::strcmp(word, "on")) {
    if (got < 3 || !finite_in(a, 0, 127) || !finite_in(b, 0, 1)) { refuse("on takes a note 0..127 and a level 0..1"); return true; }
    queue(Cmd{kOn, a, b});
  } else if (!std::strcmp(word, "off")) {
    if (got < 2 || !finite_in(a, 0, 127)) { refuse("off takes a note 0..127"); return true; }
    queue(Cmd{kOff, a, 0});
  } else if (!std::strcmp(word, "set")) {
    if (got < 3 || !finite_in(a, 0, 13) || a != std::floor(a) || !param_ok(static_cast<int>(a)) || !std::isfinite(b)) {
      refuse("set takes a parameter id the shim knows and a finite value"); return true;
    }
    queue(Cmd{kSet, a, b});
  } else if (!std::strcmp(word, "voices")) {
    if (got < 2 || !finite_in(a, 1, static_cast<float>(plaits_max_voices()))) { refuse("voices takes 1 to the shim's maximum"); return true; }
    queue(Cmd{kVoices, std::floor(a), 0});
    char r[64];
    std::snprintf(r, sizeof r, "{\"got\":%d}", static_cast<int>(std::floor(a)));
    say("voices", r);
  } else if (!std::strcmp(word, "gain")) {
    if (got < 2 || !finite_in(a, 0, kMaxGain)) { refuse("gain takes 0 to 4"); return true; }
    queue(Cmd{kGain, a, 0});
  } else if (!std::strcmp(word, "panic")) {
    queue(Cmd{kPanic, 0, 0});
  } else if (!std::strcmp(word, "stats")) {
    stats();
  } else if (!std::strcmp(word, "quit")) {
    return false;
  } else {
    refuse("unknown command");
  }
  return true;
}

void version() {
  char b[400];
  std::snprintf(b, sizeof b, "{\"build\":\"%s\",\"src\":\"%s\",\"max\":%d}", plaits_build(), plaits_source_sha(), plaits_max_voices());
  say("version", b);
}

}  // namespace

int main(int argc, char** argv) {
  int voices = 6;
  for (int i = 1; i < argc; i++) {
    if (!std::strcmp(argv[i], "--version")) { version(); return 0; }
    if (!std::strcmp(argv[i], "--voices") && i + 1 < argc) voices = std::atoi(argv[++i]);
  }
  std::signal(SIGPIPE, SIG_IGN);
  std::signal(SIGTERM, on_signal);
  std::signal(SIGINT, on_signal);

  jack_status_t status;
  // Exact name, so a second copy fails rather than appearing as `posplaits-01` wired to nothing.
  client = jack_client_open(kClient, static_cast<jack_options_t>(JackNoStartServer | JackUseExactName), &status);
  if (!client) {
    char b[200];
    std::snprintf(b, sizeof b, "{\"reason\":\"jack_client_open failed, status 0x%x%s\"}", static_cast<unsigned>(status),
      (status & JackNameNotUnique) ? ", another posplaits holds the name" : (status & JackServerFailed) ? ", jackd is not running" : "");
    say("fail", b);
    return 2;
  }
  const jack_nframes_t rate = jack_get_sample_rate(client);
  if (!plaits_init(static_cast<float>(rate))) {
    char b[160];
    std::snprintf(b, sizeof b, "{\"reason\":\"jackd runs at %u Hz and Plaits is compiled for 48000\"}", static_cast<unsigned>(rate));
    say("fail", b);
    jack_client_close(client);
    return 3;
  }
  const int got = plaits_set_polyphony(voices);
  out_port = jack_port_register(client, "out_1", JACK_DEFAULT_AUDIO_TYPE, JackPortIsOutput | JackPortIsTerminal, 0);
  if (!out_port) { say("fail", "{\"reason\":\"could not register out_1\"}"); jack_client_close(client); return 2; }
  jack_set_process_callback(client, process, nullptr);
  jack_set_xrun_callback(client, on_xrun, nullptr);
  jack_on_shutdown(client, on_shutdown, nullptr);
  if (jack_activate(client)) { say("fail", "{\"reason\":\"jack_activate failed\"}"); jack_client_close(client); return 2; }

  char b[600];
  std::snprintf(b, sizeof b,
    "{\"client\":\"%s\",\"port\":\"%s:out_1\",\"rate\":%u,\"period\":%u,\"voices\":%d,\"max\":%d,\"build\":\"%s\",\"src\":\"%s\",\"pid\":%d}",
    kClient, kClient, static_cast<unsigned>(rate), static_cast<unsigned>(jack_get_buffer_size(client)), got,
    plaits_max_voices(), plaits_build(), plaits_source_sha(), static_cast<int>(getpid()));
  say("ready", b);

  // Lines are split by hand: stdio's buffer would hide a second line from poll().
  char buf[1024];
  size_t have = 0;
  bool running = true;
  while (running && !quitting.load() && !jack_gone.load()) {
    pollfd p = {STDIN_FILENO, POLLIN, 0};
    const int r = poll(&p, 1, 200);
    if (r < 0) { if (errno == EINTR) continue; break; }
    if (r == 0) continue;
    const ssize_t n = read(STDIN_FILENO, buf + have, sizeof buf - 1 - have);
    if (n <= 0) break;  // the board went away, and with it every reason to sound
    have += static_cast<size_t>(n);
    size_t start = 0;
    for (size_t i = 0; i < have; i++) {
      if (buf[i] != '\n') continue;
      buf[i] = 0;
      if (!line(buf + start)) { running = false; break; }
      start = i + 1;
    }
    if (!running) break;
    std::memmove(buf, buf + start, have - start);
    have -= start;
    if (have >= sizeof buf - 1) { refuse("a line longer than 1023 bytes"); have = 0; }
  }
  if (jack_gone.load()) say("gone", "{\"reason\":\"jackd shut the client down\"}");
  jack_client_close(client);
  return 0;
}
