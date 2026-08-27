# Part-1 QUIC probe image: node runtime + the amd64 draft-14 moq-clock-ietf
# binary (prebuilt locally in scratchpad/quicbuild — rust emulated build; the
# binary is copied here so wrangler's docker build stays trivial).
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY moq-clock-ietf /usr/local/bin/moq-clock-ietf
COPY server.mjs /app/server.mjs
WORKDIR /app
EXPOSE 8080
CMD ["node", "server.mjs"]
