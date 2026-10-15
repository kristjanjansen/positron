# demo/shell/bay-oled.mjs

## header

A small patch on a 1 bit 128x64 panel, generalised from the Pico router's screen (`rig/pico/patch/main.c`, boxes with their names and one pixel wires), for the Pi's screen and its simulator (`/devices/patches/`, 2026-10-15). Asked: *"what we need is a patch by renderer to a screen, LCD OLED screen"*, then *"Did you implement the two-column renderer ... Maybe there are some ideas to take from there"*.

- Two facing columns by default, as `bay-layout.mjs` `layoutPair` draws a patch for a phone: sources left, the rest right, every wire in the field between, a link inside one column a bracket into the field. MEASURED on the "Record a take" patch: three columns by rank cut circuit, speaker and recordings to five or six letters (the widest-first shrink still cut three); two columns of 56 px hold nine letters and cut nothing. `arrange: 'columns'` keeps the three column layout.
- The panel's own site (`home`, `pi-1`) is drawn filled with its name cut out, so the device on the desk stands out from the tab and the cloud. A filled box is drawn by writing the name on the dark box and flipping the inside: writing lit letters on a lit fill draws nothing.
- Up to four boxes a column (13 px boxes in 64 px); what does not fit is reported in `cut`, as `createDiagram` reports a label it had to shorten, and the page shows it under the card.
