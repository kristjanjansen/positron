# positron-pub: ffmpeg for /stage/'s film (a WHIP copy) and the LL-HLS
# loopback (a WebM to RTMPS rewrap). Nothing is drawn, so no font is installed.
FROM node:22-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY server.mjs .
EXPOSE 8080
CMD ["node", "server.mjs"]
