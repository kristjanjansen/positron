# CF Containers test image: node + ffmpeg, nothing else.
# alpine keeps it small (~65 MB compressed); CF requires linux/amd64.
FROM node:22-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY server.mjs .
EXPOSE 8080
CMD ["node", "server.mjs"]
