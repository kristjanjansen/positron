# obsdock — headless Linux OBS driven entirely via obs-websocket v5.
# amd64 ONLY: the official OBS PPA (the only apt source whose build bundles CEF
# for the browser source) publishes amd64; on Apple Silicon this runs under
# Rosetta (OrbStack/Docker Desktop both translate). Distro obs-studio packages
# (Debian/Ubuntu universe) are built WITHOUT the browser source — dead end.
FROM --platform=linux/amd64 ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install -y --no-install-recommends software-properties-common gnupg ca-certificates \
 && add-apt-repository -y ppa:obsproject/obs-studio \
 && apt-get update \
 && apt-get install -y --no-install-recommends \
      obs-studio \
      xvfb x11-utils x11vnc \
      supervisor \
      libgl1-mesa-dri libglx-mesa0 mesa-utils \
      dbus dbus-x11 \
      fonts-dejavu-core \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# Non-root user: CEF (browser source) refuses/crashes as root far more often
# than it does as a plain user; ubuntu:24.04 ships uid 1000 as "ubuntu".
RUN userdel -r ubuntu 2>/dev/null || true; useradd -m -s /bin/bash obs

# Pre-seed ONLY what cannot be driven remotely: first-run wizard suppression and
# obs-websocket server_enabled (the websocket must be up before anything can be
# driven through it). Scenes/profile/video/stream settings all set via websocket.
RUN mkdir -p /home/obs/.config/obs-studio/plugin_config/obs-websocket \
 && printf '[General]\nFirstRun=true\n' > /home/obs/.config/obs-studio/global.ini \
 && printf '[General]\nFirstRun=true\n' > /home/obs/.config/obs-studio/user.ini \
 && printf '{"alerts_enabled": false, "auth_required": true, "first_load": false, "server_enabled": true, "server_password": "obsdock", "server_port": 4455}\n' \
      > /home/obs/.config/obs-studio/plugin_config/obs-websocket/config.json \
 && chown -R obs:obs /home/obs/.config

COPY start-obs.sh /usr/local/bin/start-obs.sh
COPY supervisord.conf /etc/supervisor/conf.d/obsdock.conf
RUN chmod +x /usr/local/bin/start-obs.sh

EXPOSE 4455 5900
CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
