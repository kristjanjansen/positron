// midilisten.c — print every MIDI byte that crosses the bus, as hex.
//
//   clang -O2 -o midilisten midilisten.c -framework CoreMIDI -framework CoreFoundation
//   ./midilisten
//
// 🔴 THE MISSING INSTRUMENT. `midisend` said it had sent, Live said it had heard
// nothing, and there was no way to tell which was lying — so four separate
// theories got built and tested against the wrong end. This watches the WIRE:
//
//     90 3C 6E   note-on  C4  velocity 110
//     90 40 64   note-on  E4  velocity 100
//     80 3C 00   note-off C4
//     B0 7B 00   all notes off, channel 1
//
// That dump settled in one run what an hour of reasoning had not: the notes are
// on `IAC Driver Bus 1`, every time, so `midisend` is innocent and the fault is
// downstream of the bus. A claim about a wire needs something that reads the
// wire.
//
// ⚠️ It connects to every SOURCE, which is where a destination's traffic
// reappears — the IAC driver loops one to the other. So seeing bytes here also
// proves the loopback itself is alive.
#include <stdio.h>
#include <CoreMIDI/CoreMIDI.h>
#include <CoreFoundation/CoreFoundation.h>
static void onPacket(const MIDIPacketList *pl, void *ref, void *src) {
  (void)src; const char *name = (const char *)ref;
  const MIDIPacket *p = &pl->packet[0];
  for (unsigned i = 0; i < pl->numPackets; i++) {
    printf("  %-24s", name);
    for (unsigned j = 0; j < p->length; j++) printf(" %02X", p->data[j]);
    printf("\n"); fflush(stdout);
    p = MIDIPacketNext(p);
  }
}
int main(void) {
  MIDIClientRef c; MIDIPortRef port;
  MIDIClientCreate(CFSTR("positron-listen"), NULL, NULL, &c);
  MIDIInputPortCreate(c, CFSTR("in"), onPacket, NULL, &port);
  ItemCount n = MIDIGetNumberOfSources();
  fprintf(stderr, "listening on %lu sources:\n", (unsigned long)n);
  for (ItemCount i = 0; i < n; i++) {
    MIDIEndpointRef e = MIDIGetSource(i);
    CFStringRef nm = NULL; MIDIObjectGetStringProperty(e, kMIDIPropertyDisplayName, &nm);
    char *buf = malloc(128); strcpy(buf, "?");
    if (nm) { CFStringGetCString(nm, buf, 128, kCFStringEncodingUTF8); CFRelease(nm); }
    fprintf(stderr, "  [%lu] %s\n", (unsigned long)i, buf);
    MIDIPortConnectSource(port, e, buf);
  }
  fprintf(stderr, "ready\n"); fflush(stderr);
  CFRunLoopRun();
  return 0;
}
