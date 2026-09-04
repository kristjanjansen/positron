# positron-pub — ffmpeg publisher for the Act 1 demos.
#
# Deliberately NOT the obs-cloud image. That one is standard-4, built on
# obsdock-obs with a browser source and llvmpipe workarounds, ~190 % of a core,
# 11.6 s cold wake to pixels — because it exists to compose SCENES. Demos 06-09
# need one test pattern with a burned-in clock pushed at a few destinations,
# which is ffmpeg's job at a quarter of the instance.
#
# ttf-dejavu is required, not optional: without a font file drawtext fails and
# the epoch never reaches the pixels, which is the one thing that makes
# glass-to-glass measurable from a screenshot.
FROM node:22-alpine
RUN apk add --no-cache ffmpeg ttf-dejavu
WORKDIR /app
COPY server.mjs .
EXPOSE 8080
CMD ["node", "server.mjs"]
