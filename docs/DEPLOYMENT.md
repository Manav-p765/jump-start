# Deployment Guide

This document explains how to deploy Jumpstride in a production-oriented setup and how to recover when deployment issues happen.

## 1. Hosting Platforms

### Recommended production setup

- **Frontend:** Vercel
- **Database:** MongoDB Atlas
- **Backend API:** Node-capable host such as Render, Railway, Fly.io, VPS, or container platform

### Important platform note

The current backend is a long-running Express server started with:

```bash
npm run start
```

That means:

- the **frontend** is ready for Vercel as-is
- the **database** is ready for MongoDB Atlas as-is
- the **backend is not currently packaged for Vercel serverless functions**

If you want backend-on-Vercel later, you will need to refactor the API entry point into Vercel-compatible serverless handlers.

## 2. Build Commands

## Frontend

From `frontend/`:

```bash
npm install
npm run build
```

Vercel settings:

- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

## Backend

From `backend/`:

```bash
npm install
npm run start
```

Useful pre-deploy checks:

```bash
node --check server.js
npm run smoke:career-500q
```

There is no separate backend build step in the current codebase.

## 3. Environment Variables

Set production variables in the hosting platform, not in committed `.env` files.

## Frontend production variables

- `VITE_API_URL`
  Public base URL for the deployed backend API, for example:
  `https://api.yourdomain.com/api`

- `VITE_GOOGLE_CLIENT_ID`
  Google OAuth client ID used by the frontend login flow

If `VITE_API_URL` is wrong:

- login will fail
- dashboard and result screens will fail
- admin screens will fail

## Backend production variables

- `PORT`
  Port exposed by the backend host. Many hosts inject this automatically.

- `MONGODB_URI`
  MongoDB Atlas connection string

- `JWT_SECRET`
  Long random secret used for JWT signing

- `GOOGLE_CLIENT_ID`
  Same Google OAuth client ID used by the frontend

- `ADMIN_NAME`
  Seeded admin display name

- `ADMIN_EMAIL`
  Seeded admin email

- `ADMIN_PASSWORD`
  Seeded admin password

If `MONGODB_URI` or `JWT_SECRET` is missing:

- backend startup will fail immediately

## Example production variable mapping

### Frontend

```env
VITE_API_URL=https://api.example.com/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Backend

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>
JWT_SECRET=<long-random-secret>
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
ADMIN_NAME=Jumpstart Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=<strong-password>
```

## 4. Deployment Steps

## Step 1: Prepare MongoDB Atlas

1. Create a MongoDB Atlas cluster.
2. Create a database user.
3. Add the backend host IP or allow trusted access rules.
4. Copy the MongoDB connection string.
5. Save it as `MONGODB_URI` in your backend host.

If skipped:

- backend cannot connect to the database

## Step 2: Deploy the backend

Use a Node host such as Render or Railway.

Typical backend settings:

- **Root Directory:** `backend`
- **Install Command:** `npm install`
- **Start Command:** `npm run start`

Before making the service public, set:

- `MONGODB_URI`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `ADMIN_NAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

After deploy:

1. open the backend root URL
2. check `/api/health`
3. confirm the backend logs show a successful MongoDB connection

Recommended post-deploy seed commands:

```bash
npm run seed:assessment
npm run seed:admin
npm run seed:demo-package
```

Run those from the deployed backend environment or your connected production shell.

If skipped:

- packages may not exist in production
- admin login may not exist in production
- the live demo package will be missing or stale, and Section 4 may render as "No Questions Available Yet" until reseeded

### Re-seed after every question/config change

Any deployment that touches question text, options, package curation, or scoring configs MUST be followed by a fresh seed on the production backend:

```bash
npm run seed:assessment
npm run seed:demo-package
```

Without this, the live database keeps serving stale or empty question sets and students see broken sections, missing options, or "No Questions Available Yet" on sections that look fine in local dev.

Common triggers that require a reseed:

- editing `backend/config/comprehensive500Package.generated.js`
- running any `npm run patch:*` script (e.g. `patch:work-style-questions`, `patch:math-operators`)
- changing `backend/utils/scoring/configs/career500qDemo.config.js` (demo curation)
- editing answer keys in `backend/utils/scoring/specs/career500qEvaluationSpec.js`

If only one of the two seeds is run, the mismatch shows up as: demo students see old questions while full-test students see the new ones (or vice versa). Always run both.

### Frontend redeploy after UI changes

Frontend changes do NOT take effect on production until Vercel rebuilds. A code-only push to the default branch will trigger an automatic redeploy in most Vercel setups, but if auto-deploy is disabled or the change is on a non-default branch, trigger one manually:

```bash
vercel --prod
```

Or from the Vercel dashboard → Deployments → Redeploy.

If you've shipped a frontend fix locally and the live site still shows the old behaviour, the most common cause is a missed redeploy. Verify by checking the Vercel "Latest Deployment" timestamp against the commit time.

## Step 3: Deploy the frontend on Vercel

1. Import the repository into Vercel.
2. Set the project root to `frontend`.
3. Use:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add frontend environment variables:
   - `VITE_API_URL`
   - `VITE_GOOGLE_CLIENT_ID`
5. Deploy.

After deploy:

1. open the Vercel URL
2. verify package listing loads
3. verify login works
4. verify admin routes can reach the backend

## Step 4: Configure Google OAuth

In Google Cloud Console:

1. add the frontend production domain as an allowed origin
2. use the same client ID in:
   - frontend `VITE_GOOGLE_CLIENT_ID`
   - backend `GOOGLE_CLIENT_ID`

If skipped:

- Google login button may render
- Google login will still fail at runtime

## Step 5: Production smoke check

Run this after both frontend and backend are live:

- open `/`
- open `/login`
- login with email/password
- test admin login
- load `/test`
- load `/result`
- hit backend `/api/health`

## 5. CI/CD Overview

There is no committed GitHub Actions workflow in this repo today.

Recommended CI pipeline:

1. install backend dependencies
2. install frontend dependencies
3. run backend smoke script
4. run frontend lint
5. run frontend build

Recommended CD flow:

- push to `main`
- CI validates smoke/build checks
- hosting platforms auto-deploy on successful merge

### Recommended GitHub Actions checks

```yaml
- run: cd backend && npm install && npm run smoke:career-500q
- run: cd frontend && npm install && npm run lint
- run: cd frontend && npm run build
```

If CI is missing:

- broken builds may reach production
- regressions in scoring or route imports may only be found after deploy

## 6. Domain Setup

## Frontend domain

Point your main app domain to Vercel, for example:

- `app.example.com`

## Backend domain

Point your API domain to the backend host, for example:

- `api.example.com`

Then update:

- frontend `VITE_API_URL=https://api.example.com/api`

### SSL / HTTPS

Use HTTPS on both frontend and backend.

If frontend is HTTPS and backend is HTTP:

- browser requests may be blocked as mixed content

## 7. Rollback Strategy

Deployment failures will happen. Keep rollback simple.

### Frontend rollback

Vercel supports rolling back to a previous deployment from the dashboard.

Use rollback when:

- the UI deploys but pages fail to load
- admin or auth routes break after a release
- environment variables were changed incorrectly

### Backend rollback

Use your backend host’s previous deploy/release rollback if available.

If not available:

1. redeploy the previous known-good commit
2. restore previous environment variables if they changed
3. restart the service

### Database rollback

Prefer forward fixes over destructive rollback.

Safe options:

- restore from MongoDB Atlas backup if data corruption occurred
- re-run seed scripts if configuration data was lost

Be careful:

- rolling back code without checking schema/data compatibility can create new failures

## 8. Common Deployment Failures and Fixes

### Failure: frontend loads but API calls fail

Cause:

- `VITE_API_URL` is wrong
- backend is down
- CORS or domain mismatch

Fix:

- verify backend health endpoint
- verify `VITE_API_URL`
- redeploy frontend after correcting env vars

### Failure: backend crashes on boot

Cause:

- missing `MONGODB_URI`
- missing `JWT_SECRET`
- bad MongoDB credentials

Fix:

- verify backend environment variables
- verify Atlas user/password
- verify IP allowlist / network access

### Failure: login works locally but fails in production

Cause:

- frontend and backend are using different Google client IDs
- production frontend domain is not allowed in Google Cloud Console

Fix:

- use the same Google client ID in both apps
- add the deployed frontend origin in Google Cloud Console

### Failure: admin panel opens but no data loads

Cause:

- backend API unreachable
- stale token
- backend seed data missing

Fix:

- check `/api/health`
- log out and log back in
- run `npm run seed:assessment`
- run `npm run seed:admin`

### Failure: test packages do not appear in production

Cause:

- assessment config not seeded
- production database is empty

Fix:

```bash
cd backend
npm run seed:assessment
```

### Failure: backend deploys but scoring fails for 500Q workflows

Cause:

- reference assets missing from deploy artifact
- scoring-related scripts or generated config not present

Fix:

- verify `backend/reference/` is included in deploy source
- verify `backend/config/comprehensive500Package.generated.js` exists
- run `npm run smoke:career-500q` before deploy

## 9. Recommended Production Validation Checklist

Before signing off a release:

- backend health endpoint returns `200`
- frontend loads from Vercel
- login works
- admin login works
- package list loads
- purchase/select flow works
- result pages load
- admin submissions/results screens load
- Google login works if enabled
