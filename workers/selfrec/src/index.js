// ============================================================================
// elektron-selfrec — PROTO A (participant self-recording) ingest worker.
//
// Browser MediaRecorder(timeslice=2000) emits a sequence of webm blobs that is
// ONE logical byte stream (only chunk 0 carries the EBML/Segment header); each
// blob is stored as its own R2 object so a mid-show death loses at most the
// in-flight timeslice:
//     POST /chunk/<show>/<participant>/<seq>   body = raw webm blob
//        -> selfrec/<show>/<participant>/chunk-<seq%05d>.webm
//        Optional header X-Chunk-Sha256 (hex): R2 verifies the body against it
//        SERVER-SIDE during put — a corrupt/truncated upload FAILS the put
//        (stronger than the etag==md5 HEAD compare, which the client still
//        does for availability proof, matching proto/archive discipline).
//     POST /finalize/<show>/<participant>      body = manifest JSON
//        -> selfrec/<show>/<participant>/manifest.json
//     GET  /list/<show>[/<participant>]        -> {count, objects:[...]}
//     POST /delete/<show>                      -> deletes selfrec/<show>/*
//        (the consent story: forget a participant/show = one prefix delete)
//     GET  /time                               -> {now: epoch ms} — TOKENLESS
//        skew endpoint (rate-guarded, no storage ops; see comment below)
//     POST /derived/<show>/<participant>/<...> -> derived artifacts (fMP4 HLS,
//        index.json) under selfrec/<show>/<participant>/derived/
//
// Auth: every route needs Bearer SELFREC_TOKEN (or ?token=). Objects are
// publicly READABLE via the bucket's r2.dev URL (already enabled for
// elektron-archive-test) — same posture as proto/archive's segments.
// ============================================================================

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type,X-Chunk-Sha256",
  "Access-Control-Max-Age": "86400",
};
const ID = /^[\w.-]{1,64}$/;
const MAX_CHUNK = 64 * 1024 * 1024;      // one timeslice is ~0.3 MB; 64 MB = sanity roof
const MAX_MANIFEST = 2 * 1024 * 1024;

function j(status, obj) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "content-type": "application/json", ...CORS },
  });
}

// ---- /time rate guard (in-isolate, no storage ops) --------------------------
// Tokenless by design (a participant needs the clock BEFORE any auth dance),
// so keep it abuse-safe: zero storage/binding work per hit + a per-isolate
// sliding window (120 req / 10 s → 429). Global abuse is bounded by CF's own
// per-account request limits; this guard only keeps a hot loop from burning
// CPU. Isolate-local state is best-effort (one bucket per isolate) — fine for
// a rate CEILING, never used for correctness.
let timeHits = [];

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);

    // ---- GET /time — skew endpoint (TOKENLESS, rate-guarded) ---------------
    // Client protocol (participant.html): sample 5×; per sample
    //   offset = serverNow + rtt/2 − clientRecvT ; keep the min-RTT sample.
    if (req.method === "GET" && parts.length === 1 && parts[0] === "time") {
      const nowMs = Date.now();
      timeHits = timeHits.filter((t) => nowMs - t < 10000);
      if (timeHits.length >= 120) {
        return j(429, { error: "rate", retryAfterMs: 10000 - (nowMs - timeHits[0]) });
      }
      timeHits.push(nowMs);
      return new Response(JSON.stringify({ now: nowMs }), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store", ...CORS },
      });
    }

    const auth = req.headers.get("authorization") || "";
    const tok = auth.startsWith("Bearer ") ? auth.slice(7) : (url.searchParams.get("token") || "");
    if (!env.SELFREC_TOKEN || tok !== env.SELFREC_TOKEN) return j(403, { error: "forbidden" });

    // ---- POST /chunk/<show>/<participant>/<seq> ----------------------------
    if (req.method === "POST" && parts[0] === "chunk" && parts.length === 4) {
      const [, show, part, seqs] = parts;
      if (!ID.test(show) || !ID.test(part) || !/^\d{1,6}$/.test(seqs)) return j(400, { error: "bad path" });
      const len = parseInt(req.headers.get("content-length") || "0", 10);
      if (!len) return j(411, { error: "length required" });
      if (len > MAX_CHUNK) return j(413, { error: "too large" });
      const key = `selfrec/${show}/${part}/chunk-${String(parseInt(seqs, 10)).padStart(5, "0")}.webm`;
      const sha256 = req.headers.get("x-chunk-sha256") || undefined;
      let obj;
      try {
        obj = await env.ARCHIVE.put(key, req.body, {
          httpMetadata: { contentType: "video/webm" },
          ...(sha256 ? { sha256 } : {}),
        });
      } catch (e) {
        // sha256 mismatch (truncated/corrupt body) lands here — client retries
        return j(400, { error: "put failed: " + (e && e.message || e) });
      }
      return j(200, { ok: true, key, size: obj.size, etag: obj.httpEtag });
    }

    // ---- POST /finalize/<show>/<participant> -------------------------------
    if (req.method === "POST" && parts[0] === "finalize" && parts.length === 3) {
      const [, show, part] = parts;
      if (!ID.test(show) || !ID.test(part)) return j(400, { error: "bad path" });
      const body = await req.text();
      if (body.length > MAX_MANIFEST) return j(413, { error: "manifest too large" });
      try { JSON.parse(body); } catch { return j(400, { error: "manifest not json" }); }
      const key = `selfrec/${show}/${part}/manifest.json`;
      const obj = await env.ARCHIVE.put(key, body, { httpMetadata: { contentType: "application/json" } });
      return j(200, { ok: true, key, size: obj.size });
    }

    // ---- POST /derived/<show>/<participant>/<...path> ----------------------
    // Upload lane for ENGINE-side derived artifacts (repackaged fMP4 HLS,
    // cluster index.json): body streams to
    //   selfrec/<show>/<participant>/derived/<path>
    // Same auth as /chunk; path segments are ID-safe; content-type taken from
    // the request header. Lives under the participant prefix so the one-call
    // consent delete (POST /delete/<show>) sweeps derived artifacts too.
    if (req.method === "POST" && parts[0] === "derived" && parts.length >= 4) {
      const [, show, part, ...rest] = parts;
      if (!ID.test(show) || !ID.test(part) || !rest.every((p) => ID.test(p))) return j(400, { error: "bad path" });
      const len = parseInt(req.headers.get("content-length") || "0", 10);
      if (!len) return j(411, { error: "length required" });
      if (len > MAX_CHUNK) return j(413, { error: "too large" });
      const key = `selfrec/${show}/${part}/derived/${rest.join("/")}`;
      const ct = req.headers.get("content-type") || "application/octet-stream";
      let obj;
      try {
        obj = await env.ARCHIVE.put(key, req.body, { httpMetadata: { contentType: ct } });
      } catch (e) {
        return j(400, { error: "put failed: " + (e && e.message || e) });
      }
      return j(200, { ok: true, key, size: obj.size, etag: obj.httpEtag });
    }

    // ---- GET /list/<show>[/<participant>] ----------------------------------
    if (req.method === "GET" && parts[0] === "list" && (parts.length === 2 || parts.length === 3)) {
      const ids = parts.slice(1);
      if (!ids.every((p) => ID.test(p))) return j(400, { error: "bad path" });
      const prefix = "selfrec/" + ids.join("/") + "/";
      const objects = [];
      let cursor;
      do {
        const r = await env.ARCHIVE.list({ prefix, cursor, limit: 500 });
        for (const o of r.objects) objects.push({ key: o.key, size: o.size, etag: o.httpEtag, uploaded: o.uploaded });
        cursor = r.truncated ? r.cursor : null;
      } while (cursor);
      return j(200, { prefix, count: objects.length, objects });
    }

    // ---- POST /delete/<show> — the consent story: one prefix, gone ---------
    if (req.method === "POST" && parts[0] === "delete" && parts.length === 2) {
      const show = parts[1];
      if (!ID.test(show)) return j(400, { error: "bad path" });
      const prefix = `selfrec/${show}/`;
      let deleted = 0, cursor;
      do {
        const r = await env.ARCHIVE.list({ prefix, cursor, limit: 500 });
        const keys = r.objects.map((o) => o.key);
        if (keys.length) { await env.ARCHIVE.delete(keys); deleted += keys.length; }
        cursor = r.truncated ? r.cursor : null;
      } while (cursor);
      return j(200, { ok: true, prefix, deleted });
    }

    return j(404, { error: "no route" });
  },
};
