# rig/pico/firmware/Dockerfile: the Pico SDK toolchain, in a container, because
# this Mac kills any native binary compiled under the home directory.
#
#   docker build -t positron-pico-sdk:2.2.0 rig/pico/firmware   (build.sh does this)
#
# Pinned: pico-sdk 2.2.0 and picotool 2.2.0. The compiler is Debian's
# arm-none-eabi-gcc from the base image's release (14.2.1 when built
# 2026-10-04), which knows cortex-m0plus (RP2040) and cortex-m33 (RP2350).
# gcc:14 is the base only because it was already pulled here; its native gcc
# builds picotool. The Debian packages are NOT pinned.
FROM gcc:14
RUN apt-get update -qq \
 && apt-get install -y -qq --no-install-recommends \
      cmake gcc-arm-none-eabi libnewlib-arm-none-eabi libstdc++-arm-none-eabi-newlib \
      python3 git ca-certificates pkg-config libusb-1.0-0-dev >/dev/null \
 && rm -rf /var/lib/apt/lists/*
ARG SDK_TAG=2.2.0
ARG PICOTOOL_TAG=2.2.0
# No SDK submodules: tinyusb, cyw43, lwip and btstack are not linked. USB MIDI
# host would need tinyusb; add `git submodule update --init lib/tinyusb` then.
RUN git clone -q --depth 1 --branch ${SDK_TAG} https://github.com/raspberrypi/pico-sdk.git /opt/pico-sdk
ENV PICO_SDK_PATH=/opt/pico-sdk
RUN git clone -q --depth 1 --branch ${PICOTOOL_TAG} https://github.com/raspberrypi/picotool.git /opt/picotool-src \
 && cmake -S /opt/picotool-src -B /opt/picotool-build -DCMAKE_INSTALL_PREFIX=/opt/picotool -DPICOTOOL_FLAT_INSTALL=1 >/dev/null \
 && cmake --build /opt/picotool-build -j >/dev/null \
 && cmake --install /opt/picotool-build >/dev/null \
 && rm -rf /opt/picotool-src /opt/picotool-build
ENV picotool_DIR=/opt/picotool/picotool
