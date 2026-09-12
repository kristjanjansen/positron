// audiotap.m — take a copy of what ONE process is playing, and write it to
// stdout as raw PCM. The audio half of `midisend.c`.
//
//   clang -O2 -o audiotap audiotap.m -framework CoreAudio -framework AudioToolbox \
//         -framework Foundation
//   codesign --force --sign - --identifier studio.positron.audiotap audiotap
//   ./audiotap "Live"            then pipe stdout wherever it has to go
//
// ⚠️ THE `codesign` LINE IS NOT OPTIONAL AND IT IS NOT COSMETIC. macOS grants
// the system-audio permission to a SIGNED SUBJECT. Skip it and the binary is
// not a subject anything can be granted to, and you are back to silence. See
// the permission section below.
//
// 🔴 WHY THIS REPLACES BlackHole, THE MULTI-OUTPUT DEVICE, AND A WHOLE CLASS OF
// BUG. macOS has no loopback, so getting Live's audio out meant installing a
// virtual device, pointing Live at it, and then building a Multi-Output so you
// could still HEAR what you were capturing. Three pieces of setup, one of which
// — Live's output device — the Live Object Model cannot script at all.
//
// A process tap is a COPY. Core Audio hands you what a named process is
// rendering while that audio goes on playing through whatever device it was
// already going to. Nothing to install, nothing to split, and Live's own output
// setting stops mattering.
//
// ⚠️ AND IT ENDS THE DEVICE-INDEX TRAP. `ffmpeg -f avfoundation -i ":0"` meant
// the microphone when this rig was written and means BlackHole today — and BOTH
// read -91.0 dB, so one reading proved "this capture is deaf" and the other
// proved "nothing is playing". Opposite conclusions from an identical number.
// A tap names a PROCESS, which cannot be renumbered by plugging in a webcam.
//
// ⚠️ It also captures LIVE specifically rather than whatever is on the output
// device, so a notification arriving mid-take is not in the stream.
//
// ✅ WORKING 2026-09-12. MEASURED against `afplay -v 0.25` of Submarine.aiff:
// peak 0.0573 (-24.8 dBFS), 512,044 non-zero samples, and the non-zero count
// STOPS GROWING at the second afplay finishes — which is the part that makes it
// a measurement rather than a hope, because noise would have kept counting.
//
// 🔴 IT SPENT A DAY RETURNING PERFECTLY SHAPED SILENCE, AND THE CAUSE WAS
// PERMISSION — but not in any of the forms it was looked for, so the record is
// worth more than the fix.
//
// Core Audio does not refuse a tap you may not have. `AudioHardwareCreateProcessTap`
// returns noErr, `kAudioTapPropertyFormat` answers 48000/2/float32, the
// aggregate starts, the IOProc fires 93 times a second, and every sample is
// zero. There is NO error anywhere on the path. The only way to tell "not
// permitted" from "the app is quiet" is to ask the permission itself — which is
// why this program now asks, before it opens anything, and REFUSES TO RUN
// rather than emit silence that looks like a working capture.
//
// Three diagnoses were made on the way and the first two were wrong:
//
//   1. "It is a TCC permission." Right in substance, and dismissed by a test
//      that could not detect it: running from the login session under iTerm2 —
//      the route that fixed the deaf ffmpeg capture — changed nothing. It could
//      not, because that route does not grant the permission, it INHERITS
//      iTerm2's, and iTerm2 has Microphone but has never held audio capture.
//      MEASURED both ways: over plain ssh the microphone preflight reads 2 (no
//      decision); through iTerm2 it reads 0 (allowed). The route works and was
//      proven to work — on the wrong permission.
//   2. "The aggregate has no sub-device to clock it." Genuinely a bug, and
//      fixed below: an aggregate driven by nothing still starts and still hands
//      back correctly sized silence. It was not the cause either.
//   3. The two candidates this file used to name — a sub-tap UID taken from the
//      description instead of read back off the created tap, and a tap that
//      delivers non-interleaved buffers so `mBuffers[0]` is the wrong one —
//      are BOTH RULED OUT, measured. `kAudioTapPropertyUID` read off the
//      created tap is byte-identical to `desc.UUID.UUIDString` (insidegui's
//      AudioCap uses the description's UUID too), and the aggregate delivers
//      exactly one interleaved buffer, 2 channels, 4096 bytes, per callback.
//
// 🔴 THE PERMISSION, AND WHY A BARE BINARY CANNOT SIMPLY ASK FOR IT.
// The service is `kTCCServiceAudioCapture`, added in macOS 14.4. tccd will only
// put up a prompt for a subject whose Info.plist carries
// `NSAudioCaptureUsageDescription` — and for a command-line tool the SUBJECT IS
// THE TERMINAL THAT LAUNCHED IT, not the tool. tccd says so itself:
//
//   Refusing authorization request for service kTCCServiceAudioCapture and
//   subject Sub:{com.googlecode.iterm2} … without NSAudioCaptureUsageDescription key
//
// (`/usr/bin/log show --predicate 'process == "tccd"'` — and note the absolute
// path, because zsh on this Mac has its own `log` and swallows the arguments.)
// iTerm2's Info.plist has NSMicrophoneUsageDescription and nothing else, so no
// prompt could ever appear, and the request returned "denied" in under a
// millisecond without anything reaching the screen.
//
// So this program becomes its own subject, in two steps that only work together:
//
//   • an Info.plist is EMBEDDED IN THE MACH-O (`__TEXT,__info_plist`), which is
//     how a command-line tool carries a usage string with no bundle; and
//   • it RE-EXECS ITSELF DISCLAIMED — `responsibility_spawnattrs_setdisclaim`
//     plus `POSIX_SPAWN_SETEXEC` — which tells the system to stop attributing
//     it to whatever launched it.
//
// After that tccd's log reads `subject=Sub:{…/audiotap} Resp:{identifier=
// studio.positron.audiotap}`, the prompt appears, and the grant lands as a row
// of its own. MEASURED: `kTCCServiceAudioCapture|…/audiotap|1|2`.
//
// ⚠️ THE GRANT IS KEYED TO THE PATH **AND** THE SIGNATURE. Move the binary and
// it is a new subject. Rebuild it and the ad-hoc signature's cdhash changes, so
// the stored requirement no longer matches and macOS asks again. That is not a
// bug to route around — it is why the build line signs, and why a rig that
// deploys this has to expect one click after a rebuild. A real Developer ID
// would survive rebuilds; ad-hoc does not.
//
// ⚠️ Disclaiming COSTS the terminal's permissions. Microphone preflight goes
// 0 -> 2 the moment we disclaim, measured. That is correct and wanted here — we
// want our own grant, not a borrowed one — but do not copy this into something
// that needs the microphone.
//
// ✅ AND IT LIFTS THE "A CAPTURE STARTED OVER ssh IS DEAF" RULE — for this
// binary only. That rule (README.md, and the iTerm2 AppleEvent route it forced)
// is about BORROWED permission: an ffmpeg spawned from ssh inherits sshd's, and
// sshd has none. A binary that holds its own grant does not care who started
// it. MEASURED the same minute, the same source: through iTerm2, peak 0.057279;
// over plain ssh with no login session involved, peak 0.057277. So the rig can
// start this one unattended. The AppleEvent route is still needed for anything
// that borrows — ffmpeg, and anything wanting the microphone.
//
// ⚠️ MEASURED, the rebuild caveat is real and not theoretical: a second copy of
// this program was granted, then recompiled and re-signed at the SAME PATH. Its
// TCC row was still there and still said allowed — and the preflight read 2
// (never asked), because the stored requirement is a 40-byte cdhash and the
// cdhash had moved. A granted binary that you rebuild is a binary that has to
// be granted again.
//
// Line-by-line against insidegui/AudioCap (Apple-sample-derived, known to work),
// the only remaining differences are deliberate: it writes an AVAudioFile and
// this writes stdout, and it is an app bundle so it never needs the disclaim.

#import <Foundation/Foundation.h>
#import <CoreAudio/CoreAudio.h>
// ⚠️ NOT PULLED IN BY CoreAudio.h. The tap API lives in two headers of its own
// and the umbrella does not include them, so without these `CATapDescription`
// reads as an undeclared identifier and clang helpfully suggests
// `CFCopyDescription`.
#import <CoreAudio/CATapDescription.h>
#import <CoreAudio/AudioHardwareTapping.h>
#import <AudioToolbox/AudioToolbox.h>
#include <stdio.h>
#include <unistd.h>
#include <libproc.h>
#include <dlfcn.h>
#include <math.h>
#include <spawn.h>
#include <mach-o/dyld.h>

extern char **environ;

// ⚠️ THIS IS THE APP'S Info.plist, and it has to be INSIDE the executable. A
// command-line tool has no bundle to put one in, and without
// NSAudioCaptureUsageDescription tccd refuses to prompt at all — so this
// section is the difference between a permission dialog and silent zeros.
__attribute__((used, section("__TEXT,__info_plist")))
static const char kInfoPlist[] =
"<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"
"<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n"
"<plist version=\"1.0\"><dict>\n"
"  <key>CFBundleIdentifier</key><string>studio.positron.audiotap</string>\n"
"  <key>CFBundleName</key><string>audiotap</string>\n"
"  <key>CFBundleExecutable</key><string>audiotap</string>\n"
"  <key>NSAudioCaptureUsageDescription</key>"
"<string>positron takes a copy of the audio one named app is playing, so it can be streamed.</string>\n"
"</dict></plist>\n";

static AudioObjectID gTap = kAudioObjectUnknown, gAgg = kAudioObjectUnknown;
static AudioDeviceIOProcID gProc = NULL;

// ---------------------------------------------------------------- permission

typedef long (*TCCPreflightFn)(CFStringRef, CFDictionaryRef);
typedef void (^TCCReplyBlock)(Boolean);
typedef void (*TCCRequestFn)(CFStringRef, CFDictionaryRef, TCCReplyBlock);
typedef int  (*DisclaimFn)(posix_spawnattr_t *, int);

static void *tccLib(void) {
  static void *h; static dispatch_once_t once;
  dispatch_once(&once, ^{ h = dlopen("/System/Library/PrivateFrameworks/TCC.framework/Versions/A/TCC", RTLD_NOW); });
  return h;
}

/** 0 allowed · 1 refused · 2 nobody has ever been asked · -1 cannot tell.
 *  ⚠️ REPORT THE CAPABILITY, NOT AN ERROR. Core Audio's error code is noErr
 *  whether or not this is 0, which is the whole reason this function exists. */
static long audioCaptureStatus(void) {
  void *h = tccLib(); if (!h) return -1;
  TCCPreflightFn pre = (TCCPreflightFn)dlsym(h, "TCCAccessPreflight");
  if (!pre) return -1;
  return pre(CFSTR("kTCCServiceAudioCapture"), NULL);
}

/** Put the prompt on screen and wait for the human. Returns the new status. */
static long askForAudioCapture(int waitSeconds) {
  void *h = tccLib(); if (!h) return -1;
  TCCRequestFn req = (TCCRequestFn)dlsym(h, "TCCAccessRequest");
  if (!req) return -1;
  __block int answered = 0;
  fprintf(stderr, "asking macOS for permission to record system audio — please click Allow\n");
  fflush(stderr);
  req(CFSTR("kTCCServiceAudioCapture"), NULL, ^(Boolean granted) { (void)granted; answered = 1; });
  for (int i = 0; i < waitSeconds * 10 && !answered; i++)
    CFRunLoopRunInMode(kCFRunLoopDefaultMode, 0.1, true);
  return audioCaptureStatus();
}

/** Re-exec ourselves DISCLAIMED, so macOS stops attributing this process to the
 *  terminal that launched it and starts treating this binary as its own subject.
 *  Without it the permission belongs to iTerm2 (or Terminal, or sshd), which has
 *  no audio-capture usage string, so nothing can ever be granted. Returns only
 *  on failure — on success the exec has already replaced us. */
static void disclaimAndReexec(int argc, char **argv) {
  if (getenv("POSITRON_TAP_DISCLAIMED")) return;
  void *sym = dlsym(RTLD_DEFAULT, "responsibility_spawnattrs_setdisclaim");
  if (!sym) { fprintf(stderr, "cannot disclaim on this macOS — permission will be the terminal's\n"); return; }
  setenv("POSITRON_TAP_DISCLAIMED", "1", 1);
  char path[PROC_PIDPATHINFO_MAXSIZE]; uint32_t n = sizeof path;
  if (_NSGetExecutablePath(path, &n)) return;
  posix_spawnattr_t attr;
  if (posix_spawnattr_init(&attr)) return;
  ((DisclaimFn)sym)(&attr, 1);
  posix_spawnattr_setflags(&attr, POSIX_SPAWN_SETEXEC);
  char **av = calloc(argc + 1, sizeof(char *));
  for (int i = 1; i < argc; i++) av[i] = argv[i];
  av[0] = path;
  pid_t child = 0;
  int rc = posix_spawn(&child, path, NULL, &attr, av, environ);
  fprintf(stderr, "could not re-exec disclaimed (%d) — permission will be the terminal's\n", rc);
  posix_spawnattr_destroy(&attr);
  free(av);
}

// ------------------------------------------------------------------- finding

/** Every process Core Audio can see, so a wrong name is a list rather than a
 *  silence — the same courtesy midisend.c pays for MIDI destinations. */
static void listProcesses(void) {
  AudioObjectPropertyAddress a = { kAudioHardwarePropertyProcessObjectList,
                                   kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain };
  UInt32 size = 0;
  if (AudioObjectGetPropertyDataSize(kAudioObjectSystemObject, &a, 0, NULL, &size)) return;
  UInt32 n = size / sizeof(AudioObjectID);
  AudioObjectID *ids = malloc(size);
  if (AudioObjectGetPropertyData(kAudioObjectSystemObject, &a, 0, NULL, &size, ids)) { free(ids); return; }
  fprintf(stderr, "processes making sound right now:\n");
  for (UInt32 i = 0; i < n; i++) {
    pid_t pid = 0; UInt32 ps = sizeof(pid);
    AudioObjectPropertyAddress pa = { kAudioProcessPropertyPID, kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain };
    if (AudioObjectGetPropertyData(ids[i], &pa, 0, NULL, &ps, &pid)) continue;
    char nm[PROC_PIDPATHINFO_MAXSIZE] = "?";
    proc_name(pid, nm, sizeof nm);
    fprintf(stderr, "  pid %-7d %s\n", pid, nm);
  }
  free(ids);
}

/** The first process whose name contains `want`, case-insensitively. */
static AudioObjectID findProcess(const char *want, pid_t *outPid) {
  AudioObjectPropertyAddress a = { kAudioHardwarePropertyProcessObjectList,
                                   kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain };
  UInt32 size = 0;
  if (AudioObjectGetPropertyDataSize(kAudioObjectSystemObject, &a, 0, NULL, &size)) return kAudioObjectUnknown;
  UInt32 n = size / sizeof(AudioObjectID);
  AudioObjectID *ids = malloc(size), found = kAudioObjectUnknown;
  if (AudioObjectGetPropertyData(kAudioObjectSystemObject, &a, 0, NULL, &size, ids)) { free(ids); return found; }
  for (UInt32 i = 0; i < n && found == kAudioObjectUnknown; i++) {
    pid_t pid = 0; UInt32 ps = sizeof(pid);
    AudioObjectPropertyAddress pa = { kAudioProcessPropertyPID, kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain };
    if (AudioObjectGetPropertyData(ids[i], &pa, 0, NULL, &ps, &pid)) continue;
    char nm[PROC_PIDPATHINFO_MAXSIZE] = "";
    if (proc_name(pid, nm, sizeof nm) <= 0) continue;
    if (strcasestr(nm, want)) { found = ids[i]; *outPid = pid; fprintf(stderr, "tapping pid %d — %s\n", pid, nm); }
  }
  free(ids);
  return found;
}

static void cleanup(void) {
  if (gProc && gAgg != kAudioObjectUnknown) { AudioDeviceStop(gAgg, gProc); AudioDeviceDestroyIOProcID(gAgg, gProc); }
  if (gAgg != kAudioObjectUnknown) AudioHardwareDestroyAggregateDevice(gAgg);
  if (gTap != kAudioObjectUnknown) AudioHardwareDestroyProcessTap(gTap);
}
static void onSignal(int s) { (void)s; cleanup(); _exit(0); }

int main(int argc, char **argv) {
  @autoreleasepool {
    // Must happen before anything else touches Core Audio: after this line we
    // are our own permission subject rather than the terminal's.
    disclaimAndReexec(argc, argv);

    const char *want = argc > 1 ? argv[1] : "Live";

    // 🔴 ASK THE PERMISSION, AND STOP IF THE ANSWER IS NO. Every failure mode
    // downstream of here looks exactly like a quiet app, so this is the only
    // place the two can still be told apart.
    long tcc = audioCaptureStatus();
    if (tcc != 0) tcc = askForAudioCapture(240);
    if (tcc != 0) {
      fprintf(stderr,
        "no permission to record system audio (status %ld: 0 allowed, 1 refused, 2 never asked).\n"
        "Run this from a terminal in the logged-in session so the dialog can appear, and click\n"
        "Allow. If it was refused before, clear it with:  tccutil reset AudioCapture\n"
        "Refusing to run: a tap without this permission returns perfectly shaped silence and no\n"
        "error at all, which is indistinguishable from a working capture of a quiet app.\n", tcc);
      return 7;
    }
    fprintf(stderr, "permission to record system audio: allowed\n");

    pid_t pid = 0;
    AudioObjectID proc = findProcess(want, &pid);
    if (proc == kAudioObjectUnknown) {
      fprintf(stderr, "nothing making sound matches \"%s\"\n", want);
      listProcesses();
      // ⚠️ A PROCESS APPEARS IN THIS LIST ONLY ONCE IT HAS AN AUDIO CLIENT. Live
      // with no audio engine running is not here, and that is a different
      // failure from Live not running at all.
      return 1;
    }

    CATapDescription *desc = [[CATapDescription alloc] initStereoMixdownOfProcesses:@[@(proc)]];
    desc.name = @"positron-tap";
    desc.UUID = [NSUUID UUID];
    // ⚠️ UNMUTED, or tapping Live silences Live. The whole point of a tap over a
    // loopback is that the sound carries on to the speakers while a copy comes
    // here — muting it would reinvent the problem the Multi-Output Device exists
    // to solve.
    desc.muteBehavior = CATapUnmuted;

    OSStatus st = AudioHardwareCreateProcessTap(desc, &gTap);
    if (st) { fprintf(stderr, "the tap was refused (%d)\n", (int)st); return 2; }

    // 🔴 THE AGGREGATE NEEDS A REAL DEVICE IN IT. A tap is not a clock: the
    // aggregate has to be driven by an actual device's I/O cycle, and with
    // `subDeviceList: @[]` it starts, reports `ready`, hands back buffers of
    // exactly the right size at exactly the right rate — and every sample is
    // zero. (So does a tap with no permission, which is why that bug was fixed
    // and the silence stayed: two independent causes, one symptom.)
    //
    // ⚠️ DEFAULT **SYSTEM** OUTPUT, not default output — the same property
    // AudioCap reads. On this Mac it resolves to `~:AMS2_StackedOutput:0`.
    AudioObjectID outDev = kAudioObjectUnknown; UInt32 ds = sizeof(outDev);
    AudioObjectPropertyAddress da = { kAudioHardwarePropertyDefaultSystemOutputDevice,
                                      kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain };
    AudioObjectGetPropertyData(kAudioObjectSystemObject, &da, 0, NULL, &ds, &outDev);
    CFStringRef outUID = NULL; UInt32 us = sizeof(outUID);
    AudioObjectPropertyAddress ua = { kAudioDevicePropertyDeviceUID,
                                      kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain };
    AudioObjectGetPropertyData(outDev, &ua, 0, NULL, &us, &outUID);
    if (outUID) fprintf(stderr, "clocked by %s\n", [(__bridge NSString *)outUID UTF8String]);

    // The aggregate's tap list refers to the tap by the UUID in the DESCRIPTION.
    // MEASURED: `kAudioTapPropertyFormat`'s sibling `kAudioTapPropertyUID`, read
    // back off the created tap, is the same string, so there is nothing to
    // choose between them. AudioCap uses the description's.
    NSString *tapUID = desc.UUID.UUIDString;
    NSDictionary *agg = @{
      @(kAudioAggregateDeviceNameKey):      @"positron-tap",
      @(kAudioAggregateDeviceUIDKey):       [NSUUID UUID].UUIDString,
      @(kAudioAggregateDeviceMainSubDeviceKey): outUID ? (__bridge NSString *)outUID : @"",
      // Private: it must not appear in everybody's sound menu.
      @(kAudioAggregateDeviceIsPrivateKey): @YES,
      @(kAudioAggregateDeviceIsStackedKey): @NO,
      @(kAudioAggregateDeviceTapAutoStartKey): @YES,
      @(kAudioAggregateDeviceSubDeviceListKey):
        outUID ? @[ @{ @(kAudioSubDeviceUIDKey): (__bridge NSString *)outUID } ] : @[],
      @(kAudioAggregateDeviceTapListKey): @[ @{ @(kAudioSubTapUIDKey): tapUID,
                                                @(kAudioSubTapDriftCompensationKey): @YES } ],
    };
    st = AudioHardwareCreateAggregateDevice((__bridge CFDictionaryRef)agg, &gAgg);
    if (st) { fprintf(stderr, "could not build the aggregate device (%d)\n", (int)st); cleanup(); return 3; }

    AudioStreamBasicDescription fmt = {0};
    UInt32 fs = sizeof(fmt);
    AudioObjectPropertyAddress fa = { kAudioTapPropertyFormat, kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain };
    if (AudioObjectGetPropertyData(gTap, &fa, 0, NULL, &fs, &fmt)) { fprintf(stderr, "the tap would not say what format it is\n"); cleanup(); return 4; }
    fprintf(stderr, "format %.0f Hz · %u ch · %u bits%s\n", fmt.mSampleRate,
            (unsigned)fmt.mChannelsPerFrame, (unsigned)fmt.mBitsPerChannel,
            (fmt.mFormatFlags & kAudioFormatFlagIsFloat) ? " float" : "");

    __block unsigned long long frames = 0;
    __block float peak = 0.f;          // loudest sample since the last report
    __block int layoutSaid = 0;
    st = AudioDeviceCreateIOProcIDWithBlock(&gProc, gAgg, NULL,
      ^(const AudioTimeStamp *now, const AudioBufferList *in, const AudioTimeStamp *inTime,
        AudioBufferList *out, const AudioTimeStamp *outTime) {
        (void)now; (void)inTime; (void)out; (void)outTime;
        if (!in || !in->mNumberBuffers) return;
        // ⚠️ SAY THE LAYOUT ONCE. MEASURED here: one buffer, 2 interleaved
        // channels, 4096 bytes a callback. If that ever becomes one buffer PER
        // CHANNEL, writing mBuffers[0] silently halves the recording, so the
        // shape gets printed rather than assumed.
        if (!layoutSaid) {
          layoutSaid = 1;
          fprintf(stderr, "buffers %u · %u ch · %u bytes%s\n", (unsigned)in->mNumberBuffers,
                  (unsigned)in->mBuffers[0].mNumberChannels, (unsigned)in->mBuffers[0].mDataByteSize,
                  in->mNumberBuffers > 1 ? "  ⚠️ MORE THAN ONE BUFFER — only the first is written" : "");
          fflush(stderr);
        }
        const AudioBuffer *b = &in->mBuffers[0];
        const float *f = (const float *)b->mData;
        if (f) for (UInt32 k = 0, kn = b->mDataByteSize / 4; k < kn; k++) {
          float v = fabsf(f[k]); if (v > peak) peak = v;
        }
        // ⚠️ STDOUT IS THE PRODUCT, STDERR IS THE TALKING. Same split as
        // rig/vis/v3dpipe: pixels down stdout, timings down stderr, so a
        // consumer can pipe one without parsing the other out of it.
        ssize_t wrote = 0; const char *p = b->mData;
        while (wrote < (ssize_t)b->mDataByteSize) {
          ssize_t k = write(1, p + wrote, b->mDataByteSize - wrote);
          if (k <= 0) break;
          wrote += k;
        }
        frames += b->mDataByteSize / (fmt.mBytesPerFrame ?: 8);
      });
    if (st) { fprintf(stderr, "could not attach a reader (%d)\n", (int)st); cleanup(); return 5; }

    signal(SIGINT, onSignal); signal(SIGTERM, onSignal); signal(SIGPIPE, onSignal);
    if ((st = AudioDeviceStart(gAgg, gProc))) { fprintf(stderr, "could not start (%d)\n", (int)st); cleanup(); return 6; }

    // ⚠️ SAY READY ON STDERR AND FLUSH, so a caller can WAIT for it rather than
    // sleeping a guessed amount — midisend.c's rule, and for the same reason: a
    // capture read before the tap exists returns silence and reports nothing,
    // which is the same silence as every other failure here.
    fprintf(stderr, "ready\n"); fflush(stderr);

    while (1) {
      sleep(5);
      // ⚠️ PRINT THE LEVEL, NOT JUST THE COUNT. A frame count is satisfied by
      // zeros; it read 238,000 frames for a whole day while capturing nothing.
      // Permission is checked above, so a silent reading here now means the app
      // is quiet — which is a fact about Live, not about this program.
      float pk = peak; peak = 0.f;
      if (pk > 0.f) fprintf(stderr, "%llu frames · peak %.4f (%.1f dBFS)\n", frames, pk, 20.f * log10f(pk));
      else          fprintf(stderr, "%llu frames · silent (the app is playing nothing)\n", frames);
      fflush(stderr);
    }
  }
}
