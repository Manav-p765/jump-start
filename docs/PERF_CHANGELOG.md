# Performance work — change log and metric mapping

Baseline (Vercel Speed Insights, field p75):

| | Score | FCP | LCP | INP | CLS |
|---|---|---|---|---|---|
| Desktop | 65 | 2.73s | 3.03s | 128ms | **0.52** |
| Mobile | 79 | 2.03s | 2.53s | **272ms** | 0.26 |

Measured build change (initial payload = entry + everything
`modulepreload`ed in `index.html`, gzipped), baseline built from commit
`2a48809` in a clean worktree:

```
BEFORE  297 KB gzip   charts 113 + index 106 + vendor 32 + i18n 16 + css 15 + axios 15 + icons 7
AFTER   153 KB gzip   vendor 87 + index 28 + i18n 16 + css 16 + icons 7
                                                              −48%
```

---

## 1. Fonts — targets FCP, LCP, CLS

**`src/index.css`, `index.html`, `scripts/fetchFonts.mjs` (new), `src/styles/fonts.css` (generated)**

`index.css` opened with `@import url("https://fonts.googleapis.com/...")`
and `index.html` carried a second Google Fonts `<link>`. That is three
serial round trips before a glyph can paint — index.css → Google CSS →
gstatic woff2 — all render-blocking. On Home the LCP element is the
`<h1>`, so this chain *was* the LCP.

- Self-hosted Inter, Poppins, Noto Sans Gujarati via `npm run fonts:fetch`.
  Latin/latin-ext subsets only; 42 unused subsets (cyrillic, greek,
  vietnamese…) dropped. **336 KB across 14 files.**
- Deduplicated variable fonts: Google emits one `@font-face` per weight
  all pointing at the same file. Naive per-weight download was 1.28 MB of
  duplicates for the same 336 KB of distinct fonts.
- `font-display: swap` retained on every face.
- Preloaded exactly two faces — Inter 400..800 and Poppins 700 (the
  `<h1>`). Deliberately *not* preloading latin-ext or Gujarati: a preload
  is a priority claim that competes with the JS bundle.
- **Metric-matched fallbacks.** Generated `Inter Fallback` / `Poppins
  Fallback` faces aliasing local Arial with computed `size-adjust`,
  `ascent-override`, `descent-override`, `line-gap-override`, and wired
  into every font stack. Without these, `swap` reflows all text on the
  page at once — pure CLS.

  `size-adjust` is derived by typesetting a frequency-weighted sample and
  comparing real advance widths against the local Arial, *not* from OS/2
  `xAvgCharWidth` — foundries compute that inconsistently and Poppins
  reports 0.85em, which would have produced a nonsense 167% adjustment.
  Poppins is emitted per weight (400 → 102.37%, 700 → 108.92%) because a
  single averaged value would leave the bold `<h1>` shifting.

## 2. The 0.52 CLS — targets CLS

**`src/components/PageLoader.jsx`**

`min-h-[60vh]` → `min-h-screen`. Every route is `lazy()`, so this
fallback is what paints first on a cold load, and `MainLayout` renders
the `Footer` directly beneath it. At 60vh the footer landed **inside**
the first viewport and was then shoved down by a full page of content
when the real chunk resolved. Single largest contributor to the 0.52.

**Images — `Header`, `Footer`, `PageLoader`, `Home`, `Login`, `Signup`,
`StudentReport`, `TestCompleted`, `AdminSidebar`, `AdminHeader`**

Added intrinsic `width`/`height` to every `<img>` whose size was not
already pinned on both axes by CSS. The `h-11 w-auto` header logo was the
worst: `w-auto` resolves to 0 until decode, re-laying-out the header row
at the very top of the page.

**`src/pages/Livetest.jsx`** — `SpatialAssetFigure` wrappers reserved
`min-h-[180px]`/`[220px]` while the images were capped at `max-h-[300px]`,
so a tall diagram grew the box by up to 120px on decode and pushed every
answer option down — once per question. Reservations now match the cap.

Audit result for the rest of the brief: **no iframes, no ad slots, no
cookie banner, no promo bar, no third-party widgets** exist in this
codebase. `NavigationProgress` is the only late-injected above-content
element and it is `position: fixed`, so it already displaces nothing.

## 3. Bundle / main thread — targets FCP, LCP, INP (mobile 272ms)

**`vite.config.js`**

- `assetsInlineLimit: 0`. Vite inlines assets <4 KB as base64; with the
  new responsive AVIF/WebP ladder, **88 images were being embedded into
  the entry chunk**. This alone cut the entry from 149 KB → 28 KB gzip.
  Base64 also costs ~33% overhead and cannot be cached independently.
- **Removed the `charts` manual chunk.** Naming recharts there promoted
  it to a static dependency of the entry, so Vite emitted a
  `<link rel="modulepreload">` for **388 KB of recharts in `index.html`** —
  downloaded by every visitor to the landing page, though it is only used
  by lazy admin routes. It now lands in those lazy chunks.
- **`manualChunks` object → function.** The object form matches module
  ids exactly, so `"react-dom"` never matched `react-dom/client`, which
  is what `main.jsx` imports. 523 KB of react-dom was sitting in the app
  entry and being cache-busted on every deploy; it is now in the stable
  `vendor` chunk.

**`src/i18n/i18n.js`** — `gu/common.json` (105 KB) was statically
imported into the entry although `lng` is hard-locked to `en` and
`setLanguage` was a no-op, making it unreachable at runtime. Moved behind
a dynamic import; `setLanguage` is now a working implementation that
loads the bundle on demand.

**`src/App.jsx`** — `AdminLayout` is now `lazy()`. Statically imported it
pulled `AdminHeader`/`AdminSidebar` and through them axios into the entry
for every anonymous visitor.

**`src/components/Footer.jsx`** — the support-pages request now
dynamically imports the api client and runs at `requestIdleCallback`. It
was putting axios (15 KB gzip) on the critical path and firing a request
that competes with LCP, to refresh links already rendered from a static
fallback.

## 4. Images — targets LCP

**`scripts/optimizeImages.mjs` (new), `src/components/AssetImage.jsx` (new)**

Self-hosted replacement for Vercel's image optimization. Build-time
(wired into `npm run build`), sharp-based: emits AVIF + WebP at a
responsive width ladder for the 31 sources in `src/assets`,
**1.18 MB → 0.35 MB (−70%)**. Skips work when variants are newer than
sources.

`public/question-media` is deliberately excluded: it already has a
dedicated converter (`scripts/convertQuestionMediaToWebp.mjs`) that also
rewrites the `src/data/*QuestionMedia.js` references. Two scripts writing
the same `.webp` paths at different quality settings just means whichever
ran last wins, and the committed assets churn on every build.

`<AssetImage>` renders `<picture>` with AVIF/WebP sources + srcset and a
PNG fallback; `priority` sets `fetchPriority="high"`, otherwise
`loading="lazy"`. Header logo now serves 7.5 KB AVIF instead of 32.6 KB
PNG (−77%).

Build-time rather than a runtime resizer because every image here is a
static committed asset — there are no uploads. An on-the-fly sharp
endpoint (with the Nginx `proxy_cache` in front, and the width whitelist
that stops it being a CPU-burn vector) is documented in
`docs/VPS_DEPLOYMENT.md` for when that changes.

## 5. Render-blocking — targets FCP

Removed both Google Fonts stylesheets and their two `preconnect`s from
`<head>`. Nothing on the critical path is off-origin now. The remaining
blocking resource is `index.css`, which is genuinely critical (it is the
Tailwind layer the first paint needs). The entry `<script>` is
`type="module"`, so it is already deferred by definition.

## 6. Third-party scripts — targets INP

There are none. The only third-party runtime code was
`@vercel/speed-insights`, which has since been **removed** — it posted to
`/_vercel/speed-insights/*`, a route that only existed on Vercel's edge,
so with the project deleted it 404'd on every page load.

Replaced by a self-hosted beacon (`src/lib/reportWebVitals.js` →
`POST /api/vitals`). Net bundle effect: −5 KB (speed-insights) +2 KB
(web-vitals). See `docs/VPS_DEPLOYMENT.md` §7.

## 7. Server — targets TTFB (the floor under every paint metric)

- `deploy/nginx/jumpstart.conf` — Brotli + gzip + `gzip_static` (serves
  the `.gz` files Vite already emits), HTTP/2, HTTP/3/QUIC, TLS 1.3
  0-RTT, upstream keepalive, security headers.
- **Cache split**: `/assets/` (content-hashed) gets
  `max-age=31536000, immutable`; `/fonts/` gets 30d (stable paths, not
  hashed); `index.html` gets `no-cache, must-revalidate`. Getting that
  last one wrong is how a deploy white-screens returning visitors —
  a cached `index.html` references bundle filenames that no longer exist.
- `deploy/systemd/jumpstart-api.service` — supervision, restart backoff,
  hardening, secrets in a root-owned `EnvironmentFile`. Keeps the process
  resident so no request pays for Mongo connect + admin bootstrap +
  Gujarati seed check. `deploy/pm2/ecosystem.config.cjs` is the PM2
  equivalent — run one, never both.
- `backend/server.js` — added `compression()` (assessment packages and
  reports are large, repetitive JSON) and `trust proxy` so `req.ip` and
  `req.protocol` are correct behind Nginx + Cloudflare.
- Cloudflare guidance incl. **Full (strict)**, "Respect Existing Headers"
  (otherwise it overrides the cache split above), and *not* enabling
  Rocket Loader, which reorders scripts and reliably worsens INP.

---

## Not changed — flagged for a decision

- **`Home.jsx` journey cards render 48×48 PNGs at `h-64` (256px tall).**
  `Take-the-Test.png`, `Get-Results.png` and `Expert-Counselling.png` are
  48×48 icons being upscaled ~5×, so they are visibly soft. The 1024×1024
  versions the layout wants (`take_test_visual.png` etc., ~350 KB each)
  exist in `src/assets` but are only referenced by dead code. This is a
  rendering-quality bug, not a perf one, and fixing it changes the page's
  appearance — so it is left for you to call.
- **Dead components**: `components/home/HowWorks.jsx` and
  `FooterTopHomeCTA.jsx` are imported by nothing. (`Hero.jsx` *is* used —
  by `Auth.jsx` and `Signup.jsx`.)
- **`admin/ReviewSubmission.jsx:971`** has an `h-auto w-full` image with
  no reserved ratio. Admin-only and behind auth, so it does not affect
  field metrics; left alone to keep this diff off admin surfaces.
- Three pre-existing lint errors in `Header.jsx` and `Livetest.jsx`
  (unused vars, setState-in-effect) — present at `2a48809`, untouched.

## What to expect

CLS should move the most: the `PageLoader` height fix and the font
fallback metrics together address what almost certainly produced the
0.52. FCP/LCP gain from the removed font round trips plus a 48% smaller
initial payload. INP should improve on mobile from less parse/execute
work, though INP is interaction-driven — if 272ms persists, the next
place to look is the `Livetest` answer handler, which is the app's
hottest interactive path and was out of scope here.

None of this is verified against real metrics yet. It needs a deploy plus
a working RUM beacon (§6) before any of it can be confirmed.
