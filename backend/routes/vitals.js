// POST /api/vitals — ingest endpoint for the browser Web Vitals beacon.
//
// Unauthenticated by necessity: the beacon fires on pages a logged-out
// visitor sees, and often as the document is being torn down. That makes
// it the only write endpoint in the app an anonymous caller can reach, so
// the protection here is about bounding damage rather than identifying
// callers:
//
//   - 2 KB body cap. A valid payload is ~200 bytes.
//   - Per-IP rate limit. A page view legitimately produces at most five
//     metrics, plus a few INP updates as the user interacts.
//   - Strict whitelist on `name`, finite-number check on `value`.
//   - user-agent read from the request header, never from the body.
//
// Mounted before the global express.json() in server.js so the 2 KB cap
// actually applies — once a body has been parsed upstream, a second
// parser with a smaller limit is a no-op.

import express from "express";
import WebVital, { METRIC_NAMES } from "../models/WebVital.js";

const router = express.Router();

const MAX_BODY = "2kb";

// --- Rate limit ----------------------------------------------------------
// Deliberately in-process rather than a Redis/express-rate-limit
// dependency: this guards a single low-value endpoint on a single-origin
// deployment. Under PM2 cluster mode each worker keeps its own counter,
// so the effective ceiling is WINDOW_MAX × workers — still bounded, and
// far below what would threaten Mongo.
const WINDOW_MS = 60_000;
// Each page view sends several metrics, and a school lab can share one IP.
const WINDOW_MAX = 300;

const hits = new Map();

const rateLimit = (req, res, next) => {
  const now = Date.now();
  // req.ip is the real client because server.js sets `trust proxy`.
  const key = req.ip || "unknown";
  const entry = hits.get(key);

  if (!entry || now >= entry.reset) {
    hits.set(key, { count: 1, reset: now + WINDOW_MS });

    // Opportunistic prune. Without it the Map is an unbounded leak keyed
    // by client IP — the obvious way this endpoint becomes the outage.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (now >= v.reset) hits.delete(k);
      }
    }
    return next();
  }

  if (entry.count >= WINDOW_MAX) {
    return res.status(429).end();
  }

  entry.count += 1;
  return next();
};

// --- Body parsing --------------------------------------------------------
// sendBeacon carries the Blob's type, so a compliant browser sends
// application/json. Some send text/plain when the Blob type is dropped,
// and the fetch fallback always sends JSON. Accept both shapes.
const parseJson = express.json({ limit: MAX_BODY });

// `type: () => true` rather than a media-type list. body-parser resolves a
// list through type-is, which returns false when the request carries no
// Content-Type header at all — so a headerless beacon fell through both
// parsers and was rejected as an empty body. A predicate bypasses that
// check and parses whatever arrives. It is safe to apply broadly here
// because parseJson runs first and body-parser skips any request whose
// body has already been consumed.
const parseText = express.text({ limit: MAX_BODY, type: () => true });

const readPayload = (req) => {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.length) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }

  return null;
};

const isFiniteNumber = (v) => typeof v === "number" && Number.isFinite(v);

router.post("/", rateLimit, parseJson, parseText, async (req, res) => {
  const body = readPayload(req);

  if (!body || typeof body !== "object") {
    return res.status(400).json({ success: false, msg: "Invalid payload" });
  }

  const { name, value, rating, delta, id, navigationType, path, ts } = body;

  if (!METRIC_NAMES.includes(name)) {
    return res.status(400).json({ success: false, msg: "Unknown metric" });
  }

  if (!isFiniteNumber(value) || value < 0) {
    return res.status(400).json({ success: false, msg: "Invalid value" });
  }

  try {
    await WebVital.create({
      name,
      value,
      // Optional fields are normalised rather than trusted: a bad
      // `rating` would fail the schema enum and reject an otherwise
      // usable sample, so unknown values are dropped instead.
      rating: ["good", "needs-improvement", "poor"].includes(rating)
        ? rating
        : undefined,
      delta: isFiniteNumber(delta) ? delta : undefined,
      metricId: typeof id === "string" ? id.slice(0, 100) : undefined,
      navigationType:
        typeof navigationType === "string"
          ? navigationType.slice(0, 40)
          : undefined,
      // Cap length so a long crafted path cannot bloat the collection.
      path: typeof path === "string" ? path.slice(0, 200) : undefined,
      ts: isFiniteNumber(ts) ? ts : undefined,
      userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
    });
  } catch (error) {
    // A dropped metric is not worth a 500 to a beacon that cannot act on
    // it. Log for us, succeed for the client.
    console.error("vitals ingest failed:", error.message);
  }

  // 204 with no body: the client is fire-and-forget and often already
  // unloading. Nothing to say, and nothing to parse.
  return res.status(204).end();
});

export default router;
