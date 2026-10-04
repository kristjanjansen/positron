/* rig/pico/firmware/midi_parse.h: a DIN MIDI byte stream to whole messages.
 *
 * One parser per input port. Bytes go in one at a time, as they come off a
 * UART, and whole messages come out through one callback:
 *   - channel messages with RUNNING STATUS undone, so the core always sees the
 *     status byte (90 3C 64 3C 00 arrives as 90 3C 64 and 90 3C 00);
 *   - system common (F1 F2 F3 F6) whole, and they cancel running status;
 *   - real time (F8..FF) at once, as one byte, in the middle of anything,
 *     without touching running status or an open SysEx;
 *   - SysEx as CHUNKS of at most MIDI_SX_CHUNK bytes: the first starts with F0,
 *     the rest are bare data, the last ends with F7. That is the chunk shape
 *     `route_core` reads (§12 of plans/plan-route-core.md): the core never
 *     buffers a whole message, and neither does this.
 *
 * ⚠️ A SYSEX CUT SHORT BY ANOTHER STATUS BYTE IS CLOSED WITH AN F7 HERE. The
 * MIDI spec says any status byte but real time ends a SysEx; without the F7 the
 * core would keep the stream open and read the next stray data byte as its
 * continuation. F4, F5 and a data byte with no status are dropped.
 */
#ifndef MIDI_PARSE_H
#define MIDI_PARSE_H

#include <stdint.h>

#ifndef MIDI_SX_CHUNK
#define MIDI_SX_CHUNK 64
#endif

typedef void (*midi_msg_fn)(void *ctx, const uint8_t *bytes, uint16_t len);

typedef struct {
  uint8_t running;              /* the running status, 0 for none */
  uint8_t buf[3];
  uint8_t have, need;           /* bytes in buf, and how many make a message */
  uint8_t in_sx;
  uint16_t sxn;
  uint8_t sx[MIDI_SX_CHUNK + 1];  /* +1: room for a closing F7 */
  midi_msg_fn fn;
  void *ctx;
} midi_parser;

void midi_parse_init(midi_parser *p, midi_msg_fn fn, void *ctx);
void midi_parse_byte(midi_parser *p, uint8_t b);

#endif
