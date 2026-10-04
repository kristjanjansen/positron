# rig/pico/net/Dockerfile: the Pico SDK image plus the three submodules a
# networked node needs, and a host build of the same mbedTLS for the Linux test.
#
#   docker build -t positron-pico-net:2.2.0 rig/pico/net    (build.sh and test.sh do this)
#
# Built FROM `positron-pico-sdk:2.2.0` (rig/pico/firmware/Dockerfile), which has
# NO submodules, so the router build is untouched by this file.
#
# PINNED BY THE SDK, NOT BY HAND: `git submodule update` checks out exactly the
# commit the pico-sdk 2.2.0 tag records for each path, so the versions here are
# whatever 2.2.0 shipped with. `git submodule status` is printed into
# /opt/pico-sdk/SUBMODULES.txt at build time and build.sh echoes it.
#
# No host build of mbedTLS here. `test.sh` compiles lib/mbedtls/library/*.c
# with the image's native gcc and OUR config (positron_mbedtls_config.h, the one the
# Pico uses), so the Linux test negotiates with the same ciphersuites, curves
# and record sizes as the board, from the same commit. mbedTLS's own CMake
# would not work anyway: 3.6 wants its nested `framework` submodule for that.
FROM positron-pico-sdk:2.2.0
RUN cd /opt/pico-sdk \
 && git submodule update --init --depth 1 lib/cyw43-driver lib/lwip lib/mbedtls \
 && git submodule status > /opt/pico-sdk/SUBMODULES.txt \
 && cat /opt/pico-sdk/SUBMODULES.txt
