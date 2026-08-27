# obscloud — the obsdock OBS image + everything a CF Container run needs baked in:
#   - obs-moq plugin (amd64, moq-dev/moq @ 5ddaed0) -> MoQ egress
#   - Advanced-output profile "obscloud" (x264 tune=zerolatency keyint 2 s via
#     streamEncoder.json — avoids the simple-mode 6.7x latency cliff) with the
#     RECORDING slot pre-set to Custom Output (FFmpeg) -> rtmp URL, format flv:
#     the dual-output trick (StartStream=MoQ + StartRecord=RTMP simultaneously)
#   - BrowserHWAccel=false baked (llvmpipe OSR black-frame fix)
#   - node page server on :8890 (clock.html + /now + /cpu + /collect) so the
#     browser source needs no external network and clock skew is measurable
# Local build: docker build --platform linux/amd64 -t obscloud:latest .
FROM obsdock-obs:latest

RUN apt-get update && apt-get install -y --no-install-recommends nodejs \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

# obs-moq plugin + locale data (PPA OBS plugin paths)
COPY plugin/obs-moq.so /usr/lib/x86_64-linux-gnu/obs-plugins/obs-moq.so
COPY plugin/data/ /usr/share/obs/obs-plugins/obs-moq/

# page server
RUN mkdir -p /opt/obscloud
COPY serve-cloud.mjs clock.html /opt/obscloud/
COPY pages.conf /etc/supervisor/conf.d/pages.conf

# /dev/shm fix (CF Firecracker has none) + more OBS restart patience than the
# default 3 retries (a CEF hiccup must not leave the compositor dead)
COPY start-cloud.sh /usr/local/bin/start-cloud.sh
RUN chmod +x /usr/local/bin/start-cloud.sh \
 && sed -i 's/^startsecs=5$/startsecs=5\nstartretries=10/' /etc/supervisor/conf.d/obsdock.conf \
 && grep -A1 startsecs /etc/supervisor/conf.d/obsdock.conf
CMD ["/usr/local/bin/start-cloud.sh"]

# baked profile: Advanced mode + streamEncoder.json + FFmpeg-recording dual leg.
# global.ini/user.ini overwritten: FirstRun + BrowserHWAccel=false + profile ptr.
COPY profile/basic.ini profile/streamEncoder.json /home/obs/.config/obs-studio/basic/profiles/obscloud/
RUN printf '[General]\nFirstRun=true\nBrowserHWAccel=false\n\n[Basic]\nProfile=obscloud\nProfileDir=obscloud\n' \
      > /home/obs/.config/obs-studio/global.ini \
 && printf '[General]\nFirstRun=true\nBrowserHWAccel=false\n\n[Basic]\nProfile=obscloud\nProfileDir=obscloud\n' \
      > /home/obs/.config/obs-studio/user.ini \
 && chown -R obs:obs /home/obs/.config
