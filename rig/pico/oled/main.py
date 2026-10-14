# Proves the OLED wiring (wiring.svg: SDA GP4, SCL GP5, keys GP10 to GP13): hello, and held keys.
# Needs micropython-lib ssd1306.py (`mip.install('ssd1306')` on a real Pico W).
# why: lessons/rig-pico.md#oled-main
from machine import Pin, I2C
import ssd1306
import time

i2c = I2C(0, sda=Pin(4), scl=Pin(5), freq=400_000)
found = i2c.scan()
print('i2c devices:', [hex(a) for a in found])   # expect ['0x3c']
if 0x3C not in found:
    raise SystemExit('no display at 0x3c: check SDA and SCL, they are often swapped')

oled = ssd1306.SSD1306_I2C(128, 64, i2c)
# A button pulls its pin to ground when pressed, so pressed reads 0.
keys = [Pin(n, Pin.IN, Pin.PULL_UP) for n in (10, 11, 12, 13)]
presses = [0, 0, 0, 0]
was = [1, 1, 1, 1]

while True:
    now = [k.value() for k in keys]
    for i in range(4):
        if was[i] == 1 and now[i] == 0:
            presses[i] += 1
    was = now
    oled.fill(0)
    oled.text('positron', 0, 0)
    oled.text('K1 K2 K3 K4', 0, 20)
    oled.text('  '.join('x' if v == 0 else '.' for v in now), 0, 32)
    oled.text(' '.join('%2d' % p for p in presses), 0, 48)
    oled.show()
    time.sleep_ms(30)
