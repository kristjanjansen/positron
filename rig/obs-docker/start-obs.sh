#!/bin/bash
# Launched by supervisor as user "obs". Waits for Xvfb, then runs OBS with the
# websocket server forced on via CLI flags (override the baked config password
# with OBS_WS_PASSWORD env at `docker run` time).
set -u
mkdir -p "${XDG_RUNTIME_DIR:-/tmp/xdg-obs}"
for i in $(seq 1 100); do
  xdpyinfo -display "${DISPLAY:-:99}" >/dev/null 2>&1 && break
  sleep 0.2
done
cd /home/obs
exec obs \
  --websocket_port "${OBS_WS_PORT:-4455}" \
  --websocket_password "${OBS_WS_PASSWORD:-obsdock}" \
  --disable-shutdown-check \
  --disable-updater \
  --disable-missing-files-check \
  --multi
