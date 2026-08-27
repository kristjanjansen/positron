#!/bin/bash
set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends cmake ninja-build pkg-config build-essential git curl ca-certificates \
  libavcodec-dev libavutil-dev libswscale-dev libswresample-dev libsimde-dev
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain 1.95.0
. "$HOME/.cargo/env"
rustc --version
cmake -S /src/cpp/obs -B /build -G Ninja -DCMAKE_BUILD_TYPE=Release -DBUILD_PLUGIN=ON -DENABLE_QT=OFF -DENABLE_FRONTEND_API=OFF
ninja -C /build
ls -la /build/obs-moq.so && cp /build/obs-moq.so /src/obs-moq-amd64.so
echo MOQBUILD_OK
