# rig/pico/net

The Pico 2 W as a node on the relay, over wifi, over TLS: `plans/plan-pico.md`
§3, item 1. It joins a room on `wss://ws.positron.studio`, announces a graph
that `demo/shell/graph-registry.mjs` accepts, answers `graph.ask`, takes
`light.set` aimed at its own port and answers `node.ping`.

**Built for `pico2_w`, never run on one.** There is no board on the desk and
rp2040js has neither the RP2350 nor a radio. The WebSocket client and the node
protocol are the same C files the Linux test runs against the real relay.

## Run the test (Docker and node only)

```sh
node rig/pico/net/test.mjs              # build, self test, then wss, ws, and wss with a 4 KB TLS buffer
node rig/pico/net/test.mjs --no-build   # reuse what is in the Docker volume
```

Every run makes its own room `pico-test-<6 hex>` and site `pico-<6 hex>`.
Never `studio-1`. The binaries live in the Docker volume `positron-pico-net-bin`
and never on the Mac.

## Build the UF2

```sh
cp rig/pico/net/pico/wifi_secrets.example.h rig/pico/net/pico/wifi_secrets.h   # then edit; it is gitignored
rig/pico/net/build.sh                           # wss:// to studio-1
rig/pico/net/build.sh -DRELAY_TLS=0             # plain ws://
rig/pico/net/build.sh -DRELAY_ROOM=pico-test-abc123
```

Writes `build-pico2_w/net.uf2`, `net.elf` and `net.map`. Without
`wifi_secrets.h` it still builds and links, with a warning, and joins nothing.
Logs go to UART1 on GP8 (TX) and GP9 (RX), because UART0 is DIN MIDI.

## The image

`Dockerfile` builds `positron-pico-net:2.2.0` FROM the router's
`positron-pico-sdk:2.2.0` and adds three submodules at the commits pico-sdk
2.2.0 pins: cyw43-driver `dd75682`, lwip `77dcd25` (2.2.x), mbedtls `107ea89`
(3.6.2). The router image is unchanged.

## Files

| file | is |
| --- | --- |
| `ws.c`, `ws.h` | RFC 6455 client, sans-IO: bytes in by `ws_feed`, out by a callback. No heap |
| `node.c`, `node.h` | the wire.mjs envelope, the graph, `graph.ask`, `light.set`, `node.ping`, keep-alive. No heap |
| `vendor/jsmn.h` | jsmn, MIT, verbatim (below) |
| `positron_mbedtls_config.h` | the one mbedTLS config, Pico and Linux. Not called `mbedtls_config.h`, and the file says why |
| `gts_root_r4.h` | the pinned root, with its fingerprint and where it came from |
| `pico/main.c`, `pico/lwipopts.h` | the glue to the CYW43 and lwIP altcp, polled |
| `CMakeLists.txt`, `build.sh`, `Dockerfile` | the Pico build |
| `linux/main.c`, `linux/build.sh` | the same C on Linux over sockets and mbedTLS, plus `--selftest` |
| `test.mjs` | the Mac side: wire.mjs and graph-registry.mjs against the C node |

## jsmn

`vendor/jsmn.h` and `vendor/jsmn.LICENSE` are
`https://github.com/zserge/jsmn` at commit
`25647e692c7906b96ffd2b05ca54c097948e879c` (2021-10-14), unmodified. MIT,
Copyright (c) 2010 Serge Zaitsev. sha256 of `jsmn.h`:
`c04533e9181e1e33baceb0f55ac449b05145bb936e8c68cc77dfe0d8277514fb`.

## What is not covered

- **Anything on the board**: association, DHCP, DNS, reconnect after an access
  point reboot, power save, the soak, the TLS handshake time on a 150 MHz M33,
  the real heap and stack high water marks (printed every 30 s once it runs).
- **Certificate dates on the Pico.** There is no calendar until SNTP is added,
  so an expired certificate from the right chain would be accepted. Linux checks
  the dates.
- **`at` is 0 on the Pico**, for the same reason.
- **WS2812.** `light.set` is parsed, stored and logged; nothing lights.
