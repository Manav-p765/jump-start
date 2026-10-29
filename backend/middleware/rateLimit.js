// In-process fixed-window rate limiter (same approach as routes/vitals.js,
// shared so auth and coupon endpoints can use it). No Redis dependency:
// single-host deployment; under PM2 cluster mode each worker keeps its own
// counters, so the effective ceiling is max x workers - still bounded.
//
// req.ip is the real client because server.js sets `trust proxy`.

export const createRateLimiter = ({
  windowMs,
  max,
  key = (req) => req.ip || "unknown",
  message = "Too many attempts. Please wait a few minutes and try again.",
}) => {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const k = key(req);
    const entry = hits.get(k);

    if (!entry || now >= entry.reset) {
      hits.set(k, { count: 1, reset: now + windowMs });
      // Opportunistic prune so the map cannot grow without bound.
      if (hits.size > 10000) {
        for (const [hk, v] of hits) if (now >= v.reset) hits.delete(hk);
      }
      return next();
    }

    if (entry.count >= max) {
      res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ success: false, msg: message });
    }

    entry.count += 1;
    return next();
  };
};

const FIFTEEN_MIN = 15 * 60 * 1000;
const normalisedEmail = (req) => String(req.body?.email || "").trim().toLowerCase();

// Several students in one school often share an IP, so the per-IP ceilings
// are loose; the tight limit is per IP + account being guessed.
export const loginAccountLimiter = createRateLimiter({
  windowMs: FIFTEEN_MIN,
  max: 10,
  key: (req) => `${req.ip}|${normalisedEmail(req)}`,
  message: "Too many sign-in attempts for this account. Please wait 15 minutes and try again.",
});
export const loginIpLimiter = createRateLimiter({ windowMs: FIFTEEN_MIN, max: 100 });
export const registerLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 20 });
export const socialLoginLimiter = createRateLimiter({ windowMs: FIFTEEN_MIN, max: 60 });
export const couponLimiter = createRateLimiter({
  windowMs: FIFTEEN_MIN,
  max: 20,
  key: (req) => String(req.user?._id || req.ip),
  message: "Too many coupon attempts. Please wait a few minutes and try again.",
});
