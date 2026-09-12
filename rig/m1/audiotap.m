// audiotap.m — take a copy of what ONE process is playing, and write it to
// stdout as raw PCM. The audio half of `midisend.c`.
//
//   clang -O2 -o audiotap audiotap.m -framework CoreAudio -framework AudioToolbox \
//         -framework Foundation
//   ./audiotap "Live"            then pipe stdout wherever it has to go
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

static AudioObjectID gTap = kAudioObjectUnknown, gAgg = kAudioObjectUnknown;
static AudioDeviceIOProcID gProc = NULL;

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
    const char *want = argc > 1 ? argv[1] : "Live";
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
    if (st) { fprintf(stderr, "the tap was refused (%d) — has this binary been granted audio recording permission?\n", (int)st); return 2; }

    NSString *tapUID = desc.UUID.UUIDString;
    NSDictionary *agg = @{
      @(kAudioAggregateDeviceNameKey):      @"positron-tap",
      @(kAudioAggregateDeviceUIDKey):       [NSUUID UUID].UUIDString,
      // Private: it must not appear in everybody's sound menu.
      @(kAudioAggregateDeviceIsPrivateKey): @YES,
      @(kAudioAggregateDeviceIsStackedKey): @NO,
      @(kAudioAggregateDeviceTapAutoStartKey): @YES,
      @(kAudioAggregateDeviceSubDeviceListKey): @[],
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
    st = AudioDeviceCreateIOProcIDWithBlock(&gProc, gAgg, NULL,
      ^(const AudioTimeStamp *now, const AudioBufferList *in, const AudioTimeStamp *inTime,
        AudioBufferList *out, const AudioTimeStamp *outTime) {
        (void)now; (void)inTime; (void)out; (void)outTime;
        if (!in || !in->mNumberBuffers) return;
        const AudioBuffer *b = &in->mBuffers[0];
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
      fprintf(stderr, "%llu frames\n", frames); fflush(stderr);
    }
  }
}
