# VPS deployment & performance runbook

Replaces the Vercel hosting. Vercel was supplying four things for free
that now have to be configured explicitly:

| Vercel gave us            | Replacement here                                  |
| ------------------------- | ------------------------------------------------- |
| Edge network + TLS        | Cloudflare in front of the origin                 |
| Brotli/gzip negotiation   | `ngx_brotli` + `gzip_static` in Nginx             |
| Immutable asset caching   | `Cache-Control` blocks in the Nginx site config   |
| Automatic image optimization | `npm run images:optimize` (build-time, sharp)  |

Files:

- `deploy/nginx/jumpstart.conf` — reverse proxy, compression, cache headers
- `deploy/systemd/jumpstart-api.service` — process supervision
- `deploy/pm2/ecosystem.config.cjs` — PM2 alternative (pick one)

---

## 1. Provision

```bash
sudo adduser --system --group --home /var/www/jumpstart jumpstart
sudo mkdir -p /var/www/jumpstart /etc/jumpstart
sudo chown -R jumpstart:jumpstart /var/www/jumpstart

# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
```

Brotli module (Ubuntu 22.04+ / Debian 12):

```bash
sudo apt-get install -y libnginx-mod-brotli
```

Then confirm `nginx.conf` loads it — the `brotli` directives in the site
config are a parse error if the module is missing:

```bash
grep -r brotli /etc/nginx/nginx.conf /etc/nginx/modules-enabled/
```

If the module is unavailable on your distro, delete the `brotli*` block
from the site config. `gzip_static` still serves the `.gz` files Vite
emits at build time, which is most of the benefit.

## 2. Build and deploy

The frontend build is static — build it in CI or on the box, then serve
`dist/`. `npm run build` runs the image optimizer first (see
`package.json`), so AVIF/WebP variants are always in sync with sources.

```bash
cd /var/www/jumpstart/frontend
npm ci
npm run fonts:fetch          # only when the font list changes
VITE_API_URL=https://jumpstride.in/api npm run build

cd ../backend
npm ci --omit=dev
```

`VITE_API_URL` is baked in at build time. Pointing it at the same origin
(`/api`) rather than a separate API host keeps the API on the warm HTTP/2
connection and avoids a preflight round trip on every authenticated call.

## 3. Run the API

```bash
sudo install -o jumpstart -g jumpstart -m 600 backend/.env /etc/jumpstart/api.env
sudo cp deploy/systemd/jumpstart-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now jumpstart-api
journalctl -u jumpstart-api -f
```

The point of the supervisor is that the process stays resident. A cold
start pays Mongo connection setup, the admin bootstrap, and the Gujarati
seed check before it can answer anything — and TTFB is the floor under
every paint metric, so a cold start is a bad first paint for whoever
triggers it.

## 4. TLS and Nginx

```bash
sudo cp deploy/nginx/jumpstart.conf /etc/nginx/sites-available/jumpstart
sudo ln -s /etc/nginx/sites-available/jumpstart /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo certbot --nginx -d jumpstride.in -d www.jumpstride.in
sudo nginx -t && sudo systemctl reload nginx
```

For HTTP/3 also open UDP 443:

```bash
sudo ufw allow 443/udp
```

## 5. Cloudflare

DNS: proxied (orange cloud) A record to the VPS IP.

Settings that matter, and why:

- **SSL/TLS mode: Full (strict).** "Flexible" terminates TLS at the edge
  and talks plaintext HTTP to the origin — the padlock lies, and the
  origin sees `http`, which breaks `X-Forwarded-Proto` handling.
- **Always Use HTTPS: on.**
- **Brotli: on.**
- **HTTP/3 (with QUIC): on.**
- **Early Hints: on.** Cloudflare replays our `preload` links as a 103,
  so the fonts start downloading during origin think-time.
- **Caching → Browser Cache TTL: "Respect Existing Headers".** Otherwise
  Cloudflare overrides the immutable/no-cache split in the Nginx config,
  and `index.html` starts getting cached — which pins users to a deleted
  build after a deploy.
- **Do not enable Rocket Loader or "Auto Minify" JS.** Rocket Loader
  defers and re-orders scripts in ways that break React hydration timing
  and reliably makes INP worse.

A cache rule to make the split explicit:

```
(http.request.uri.path contains "/assets/")  -> Cache eligible, Edge TTL 1 year
(http.request.uri.path contains "/api/")     -> Bypass cache
```

## 6. Verify

TTFB — the number that gates every paint metric:

```bash
curl -o /dev/null -s -w 'dns=%{time_namelookup} connect=%{time_connect} \
tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  https://jumpstride.in/
```

Read it as: `ttfb - tls` is origin think-time, `tls - connect` is
handshake, `connect - dns` is RTT. Target under ~200 ms TTFB from an
Indian PoP for a cached HTML response. If origin think-time dominates,
the API or disk is the problem; if handshake dominates, check that
HTTP/2 and session resumption are actually on.

Compression and protocol:

```bash
# Expect: content-encoding: br
curl -sI -H 'Accept-Encoding: br' https://jumpstride.in/assets/index-*.js \
  | grep -i 'content-encoding\|cache-control'

# Expect: HTTP/3 200
curl -sI --http3 https://jumpstride.in/ | head -1
```

Cache headers — the split is the thing to confirm:

```bash
curl -sI https://jumpstride.in/assets/<hashed>.js | grep -i cache-control
#   -> public, max-age=31536000, immutable
curl -sI https://jumpstride.in/ | grep -i cache-control
#   -> no-cache, must-revalidate
```

Getting these backwards is the single most common deploy bug: an
immutable `index.html` serves a stale document that references deleted
bundle filenames, and the site white-screens for returning visitors until
the TTL expires.

## 7. Re-measuring after the cutover

`@vercel/speed-insights` has been removed and replaced with a
self-hosted RUM beacon. Nothing to do at deploy time beyond running the
migrations-free `npm install` in both packages, but the moving parts:

| Piece | Where |
| --- | --- |
| Browser beacon | `frontend/src/lib/reportWebVitals.js` |
| Ingest endpoint | `POST /api/vitals` (`backend/routes/vitals.js`) |
| Storage | `backend/models/WebVital.js`, collection `webvitals` |
| Read API | `GET /api/v1/admin/vitals/summary?days=7` (admin auth) |

The beacon reports CLS, LCP, INP, FCP and TTFB via `navigator.sendBeacon`
(falling back to `fetch(..., {keepalive:true})`), guarded on
`import.meta.env.PROD` so local development contributes nothing. Samples
are stored raw so percentiles can be recomputed over any window —
CWV is scored at p75, and pre-aggregating to a mean would discard exactly
the slow tail that sets the grade.

Check it is flowing after deploy:

```bash
# Should return 204 with no body
curl -i -X POST https://jumpstride.in/api/vitals \
  -H 'Content-Type: application/json' \
  -d '{"name":"LCP","value":2530,"rating":"needs-improvement","path":"/"}'

# Should return 400
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://jumpstride.in/api/vitals \
  -H 'Content-Type: application/json' -d '{"name":"BOGUS","value":1}'

# p75 per metric (needs an admin bearer token)
curl -s https://jumpstride.in/api/v1/admin/vitals/summary?days=7 \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```

The endpoint is unauthenticated by necessity — beacons fire on pages
logged-out visitors see, and often as the document is unloading. It is
bounded by a 2 KB body cap, a 60 req/min/IP limit, a strict whitelist on
`name`, and a finite-number check on `value`. The user-agent is read from
the request header, never from the body.

Note that field data needs real traffic and lags by design (the Vercel
numbers you have are p75 over a rolling window, and this collection
starts empty). For an immediate before/after, run Lighthouse against the
VPS with the same throttling profile rather than waiting on RUM.

Cloudflare Web Analytics remains a reasonable *additional* source if you
want a second opinion without querying Mongo — it is free and reports the
same three CWV metrics — but it is no longer required.

---

## Appendix: on-the-fly image resizing

Not currently needed — every image in the app is a static asset, so
`scripts/optimizeImages.mjs` handles the whole set at build time with no
runtime cost. If user-uploaded images are introduced later, this is the
drop-in equivalent of Vercel's image optimization. Mount it in
`server.js` and let Nginx cache the output.

```js
// backend/routes/imageRoutes.js
import { Router } from "express";
import sharp from "sharp";
import path from "node:path";

const router = Router();
const UPLOADS = "/var/www/jumpstart/uploads";
const WIDTHS = new Set([320, 640, 960, 1280, 1920]);

router.get("/img/:name", async (req, res) => {
  // Whitelist the width so the endpoint cannot be used to burn CPU by
  // requesting thousands of distinct sizes — that is the standard DoS
  // against a naive resizer.
  const w = Number(req.query.w) || 960;
  if (!WIDTHS.has(w)) return res.status(400).end();

  // basename() strips any ../ traversal before it reaches the filesystem.
  const file = path.join(UPLOADS, path.basename(req.params.name));

  const accepts = req.headers.accept || "";
  const fmt = accepts.includes("image/avif")
    ? "avif"
    : accepts.includes("image/webp")
      ? "webp"
      : "jpeg";

  try {
    const buf = await sharp(file)
      .resize({ width: w, withoutEnlargement: true })
      [fmt]({ quality: fmt === "avif" ? 55 : 78 })
      .toBuffer();

    res.type(`image/${fmt}`);
    // Vary matters: the response body depends on Accept, so without it a
    // cache will hand an AVIF to a browser that cannot decode it.
    res.set("Vary", "Accept");
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.send(buf);
  } catch {
    res.status(404).end();
  }
});

export default router;
```

Add an Nginx `proxy_cache` in front so each (image, width, format) is
encoded once rather than on every request:

```nginx
proxy_cache_path /var/cache/nginx/img levels=1:2 keys_zone=img:50m
                 max_size=2g inactive=30d use_temp_path=off;

location /api/img/ {
    proxy_pass         http://jumpstart_api;
    proxy_cache        img;
    proxy_cache_key    "$uri$is_args$args$http_accept";
    proxy_cache_valid  200 30d;
    add_header X-Cache-Status $upstream_cache_status;
}
```
