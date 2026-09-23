# Troubleshooting Guide

This guide covers common issues developers are likely to hit while working on Jumpstride.

Each section is organized as:

- **Problem**
- **Cause**
- **Solution**

## 1. Server Not Starting

### Problem

The backend does not start, exits immediately, or prints an error in the terminal.

### Cause

Common causes in this project:

- `MONGODB_URI` is missing
- `JWT_SECRET` is missing
- `PORT` is already in use
- `npm install` was not run in `backend/`
- MongoDB is unreachable and startup fails during DB connection

### Solution

1. Verify backend dependencies are installed:

```bash
cd backend
npm install
```

2. Verify required environment variables exist in `backend/.env`:

```env
MONGODB_URI=...
JWT_SECRET=...
PORT=5000
```

3. Start the backend:

```bash
npm run dev
```

4. If port `5000` is already in use:

- stop the conflicting process
- or change `PORT` in `backend/.env`
- then update `VITE_API_URL` in `frontend/.env`

5. Run a quick syntax check if startup fails after code changes:

```bash
node --check server.js
```

## 2. MongoDB Connection Errors

### Problem

The backend starts and then fails with connection errors such as:

- `ECONNREFUSED`
- authentication failure
- timeout connecting to MongoDB

### Cause

Common causes:

- local MongoDB is not running
- MongoDB Atlas connection string is wrong
- Atlas username/password is wrong
- Atlas IP allowlist is missing your server or local IP
- `MONGODB_URI` points to the wrong database or cluster

### Solution

#### For local MongoDB

1. Confirm MongoDB is running locally.
2. If using Docker from this repo:

```bash
cd backend
npm run db:up
```

3. Use a local URI like:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/jumpstart
```

#### For MongoDB Atlas

1. Open MongoDB Atlas.
2. Verify the cluster is available.
3. Verify the database user credentials.
4. Verify your IP or host is allowlisted.
5. Copy the exact connection string into `backend/.env`.

#### Useful checks

If the backend keeps failing on startup:

- print the resolved `MONGODB_URI` host locally without exposing secrets
- verify the database name is correct
- verify your machine can reach Atlas over the network

## 3. JWT Errors

### Problem

Protected routes fail with:

- `Not authorized`
- `Invalid or expired token`
- unexpected redirects to `/login`

### Cause

Common causes:

- token is missing from `localStorage`
- token expired
- `JWT_SECRET` changed between issued token and current backend runtime
- frontend is using an old session from another environment
- backend cannot find the user referenced by the token

### Solution

1. Log out and log back in.

2. Clear local auth state manually if needed:

```js
localStorage.removeItem("user");
localStorage.removeItem("token");
location.href = "/login";
```

3. Verify the backend `JWT_SECRET` is set and stable.

4. Do not change `JWT_SECRET` casually in development if you want existing sessions to keep working.

5. Check whether the user still exists in MongoDB.

6. If only admin pages fail:

- confirm the user’s `role` is actually `admin`
- sign out and sign back in after role changes

## 4. Login Fails but Credentials Look Correct

### Problem

A user cannot log in even though the email and password appear correct.

### Cause

Possible causes:

- wrong password
- account was created through Google only and has no local password
- account is suspended
- email casing/whitespace mismatch in manual testing

### Solution

1. Try the exact saved lowercase email.
2. If the backend says `Please sign in with Google`, use Google login for that account.
3. Check `isSuspended` in the user document.
4. If needed, reset or reseed the account manually.

## 5. Google Login Not Working

### Problem

Google Sign-In button renders, but login fails after selecting an account.

### Cause

Common causes:

- `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` do not match
- current frontend origin is not allowed in Google Cloud Console
- backend Google client ID is missing
- frontend Google client script did not load

### Solution

1. Use the same client ID in:

- `frontend/.env` → `VITE_GOOGLE_CLIENT_ID`
- `backend/.env` → `GOOGLE_CLIENT_ID`

2. In Google Cloud Console, allow the exact frontend origin:

- local: `http://localhost:5173`
- production: your deployed frontend domain

3. Restart frontend and backend after env changes.

4. Check the browser console for Google script loading errors.

## 6. Frontend Cannot Reach Backend

### Problem

The UI loads, but data requests fail and screens show API/network errors.

### Cause

Common causes:

- backend is not running
- `VITE_API_URL` is wrong
- backend port changed
- production frontend is pointing to the wrong API host

### Solution

1. Check backend health:

```text
http://localhost:5000/api/health
```

2. Confirm frontend env:

```env
VITE_API_URL=http://localhost:5000/api
```

3. Restart Vite after changing frontend env values.

4. In production, verify that `VITE_API_URL` points to the deployed API domain.

## 7. Admin Access Not Working

### Problem

User cannot open `/admin` or gets redirected away.

### Cause

Common causes:

- logged in as a normal user account
- admin role changed in DB but current session is stale
- no admin account exists in the current database
- backend is down so admin auth checks fail indirectly

### Solution

1. Verify the account’s `role` is `admin` in MongoDB.
2. Log out and sign in again.
3. Reseed the admin account if needed:

```bash
cd backend
npm run seed:admin
```

4. Check that backend is reachable and `/api/health` is healthy.

## 8. Packages or Tests Not Showing

### Problem

The test/package listing is empty or missing expected packages.

### Cause

Common causes:

- assessment config was never seeded
- wrong database is connected
- package was marked inactive
- package config contains zero questions

### Solution

1. Seed the assessment config:

```bash
cd backend
npm run seed:assessment
```

2. Confirm the backend is connected to the expected database.
3. Check the `assessmentconfigs` collection for the `default` config document.
4. Verify package `active` is `true` and sections contain questions.

## 9. Test Progress Not Resuming Correctly

### Problem

The user resumes a test but progress is wrong or missing.

### Cause

Common causes:

- progress was never saved
- selected package changed and reset progress
- `testProgress` was cleared after submission or package re-selection
- frontend is using stale local state after a route change

### Solution

1. Inspect the user document’s `testProgress`.
2. Confirm the selected package is the one the user expects.
3. Avoid resetting progress unless explicitly retaking or switching packages.
4. Verify `PATCH /api/v1/user/test-progress` is being called with answers and completed sections.

## 10. Result Not Showing on Student Side

### Problem

A test was submitted, but the student cannot see the report.

### Cause

Common causes:

- report status is still `pending_approval`
- admin has not approved the report yet
- looking at an old/nonexistent report ID
- result aggregation is using a different report than expected

### Solution

1. Check the latest `assessmentReports[]` entry in the user document.
2. Verify `publication.status`.
3. If status is `pending_approval`, approve it through the admin panel or DB logic.
4. Check that the user is opening the correct report id under `/result/:reportId`.

## 11. 500Q Scoring Looks Wrong

### Problem

The 500-question report returns unexpected scoring, review-required status, or missing interpretation.

### Cause

Common causes:

- old stored report was generated before scoring fixes
- assessment config was not reseeded after package generation changes
- package-specific scoring path is not being used
- missing reference assets or stale generated config

### Solution

1. Run the 500Q smoke script:

```bash
cd backend
npm run smoke:career-500q
```

2. Regenerate and reseed if needed:

```bash
npm run generate:assessment-500
npm run seed:assessment
```

3. Remember that old stored reports do not automatically re-score themselves.
4. Retake/resubmit the test if you need corrected output for an old report.

## 12. Email Not Sending

### Problem

Expected emails are not being sent.

### Cause

Important current state:

- there is **no fully implemented email sending service in the current codebase**

So if email delivery is expected in development or production, the likely cause is:

- the feature has not been implemented yet
- SMTP/provider environment variables were never wired into code

### Solution

1. Confirm whether the feature exists in code before debugging infrastructure.
2. If you are adding email support, verify:

- SMTP host
- SMTP port
- SMTP username/password
- sender address

3. Add structured logging around the mail-send call.
4. Test with a real provider sandbox account before production rollout.

## 13. Payment Failures

### Problem

Payment or package purchase flow does not complete as expected.

### Cause

Important current state:

- the current project does **not** have a full Razorpay integration yet
- the current payment screen is primarily a frontend flow that ends by calling package purchase on the backend

So common current causes are:

- missing `plan` state when entering `/payment`
- package already purchased
- backend purchase API failed
- frontend/backend API mismatch

### Solution

1. Confirm the frontend reached `/payment` with a valid `plan`.
2. Check the network request to:

```text
POST /api/v1/user/package/purchase
```

3. If the response says the package is already purchased, use resume/retake flow instead of purchase.
4. Verify backend logs for purchase errors.

### If adding Razorpay later

Also check:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- order creation endpoint
- signature verification logic
- webhook delivery and retry logs

## 14. Build Succeeds with Large Chunk Warning

### Problem

Frontend build succeeds but Vite warns about large chunks.

### Cause

The frontend bundle is currently large and not fully code-split.

### Solution

This is not a hard failure.

Short term:

- treat it as a performance warning, not a deploy blocker

Long term:

- add route-level code splitting
- use dynamic imports for heavy screens
- tune manual chunking if needed

## 15. Recommended Debugging Workflow

When a bug is unclear, use this order:

1. Confirm the backend is running
2. Confirm MongoDB is connected
3. Confirm frontend is pointing to the correct API URL
4. Check browser network requests
5. Check backend terminal logs
6. Inspect the relevant MongoDB document
7. Run the closest smoke/build check

For this repo, the most useful commands are:

```bash
cd backend
npm run smoke:career-500q

cd ../frontend
npm run build
```
