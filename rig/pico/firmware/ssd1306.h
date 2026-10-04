/* rig/pico/firmware/ssd1306.h: a 128x64 SSD1306 on I2C, in plain C.
 *
 * A 1 KB frame buffer in RAM, drawn into by ui.c through ssd1306_buffer(),
 * and the buffer sent ONE PAGE AT A TIME: 128 data
 * bytes plus the address commands, about 3.5 ms at 400 kHz. A whole frame in
 * one transfer is about 23 ms, and the main loop that drains MIDI out would
 * stall that long, so `ssd1306_step()` sends one page and returns.
 */
#ifndef POSITRON_SSD1306_H
#define POSITRON_SSD1306_H

#include <stdbool.h>
#include <stdint.h>

#include "hardware/i2c.h"

#define SSD1306_W 128
#define SSD1306_H 64
#define SSD1306_PAGES 8   /* 8 rows of pixels each */

void ssd1306_init(i2c_inst_t *i2c, uint8_t addr);
void ssd1306_clear(void);
/* The frame buffer itself, page major: byte (page * 128 + x) is 8 vertical
 * pixels, bit 0 at the top. ui_bind() takes it. */
uint8_t *ssd1306_buffer(void);
/* Start sending the buffer. A frame already on its way is restarted. */
void ssd1306_show(void);
/* Send the next page if a frame is on its way. True while one still is. */
bool ssd1306_step(void);

#endif
