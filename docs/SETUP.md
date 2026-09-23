# Setup Guide

This document explains how to set up the Jumpstride project on a new machine.  
Follow the steps in order. If you skip a required step, the frontend, backend, authentication, or database connection will fail.

## 1. Prerequisites

Install the following before starting:

- Node.js `18.x` or newer
- npm `9.x` or newer
- Git
- MongoDB Atlas account or a local MongoDB instance
- Optional: Docker Desktop if you want to run MongoDB through Docker Compose

Check your installed versions:

```bash
node -v
npm -v
git --version
```

If Node or npm is missing or too old:

- the frontend will not build
- the backend may fail to start
- package installation may break

## 2. Clone the Repository

Clone the project and move into the repo:

```bash
git clone <your-repository-url>
cd jumpstart
```

If this step is skipped, you obviously do not have the source code locally and nothing else will work.

## 3. Install Dependencies

This project has separate frontend and backend apps. Both need dependencies installed.

### Frontend

```bash
cd frontend
npm install
```

### Backend

Open a second terminal or move back to the repo root:

```bash
cd backend
npm install
```

If you skip frontend install:

- `npm run dev` in `frontend/` will fail
- the React app will not start

If you skip backend install:

- `npm run dev` in `backend/` will fail
- the API server will not start

## 4. Environment Variables Setup

You need separate `.env` files for frontend and backend.

### Frontend `.env`

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Explanation:

- `VITE_API_URL`
  Base URL used by the React app to call the backend API.
  If this is wrong, login, dashboard data, tests, results, and admin pages will fail to load.

- `VITE_GOOGLE_CLIENT_ID`
  Google OAuth client ID used by the frontend Google Sign-In button.
  If this is missing, Google login will not initialize.

### Backend `.env`

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
ADMIN_NAME=Jumpstart Admin
ADMIN_EMAIL=admin@jumpstart.local
ADMIN_PASSWORD=Admin@12345
```

Explanation:

- `PORT`
  Port used by the Express server.
  If changed, update `VITE_API_URL` in the frontend to match.

- `MONGODB_URI`
  MongoDB connection string.
  If missing or wrong, the backend will fail to connect and most routes will not work.

- `JWT_SECRET`
  Secret used to sign authentication tokens.
  If missing, login and protected routes will break.

- `GOOGLE_CLIENT_ID`
  Google OAuth client ID used by the backend to verify Google login tokens.
  It must match the frontend Google client ID.
  If mismatched, Google login will fail even if the button renders.

- `ADMIN_NAME`
  Default admin display name used by the admin seed script.

- `ADMIN_EMAIL`
  Default admin email used by the admin seed script.

- `ADMIN_PASSWORD`
  Default admin password used by the admin seed script.

If the backend `.env` file is skipped:

- the server may start incorrectly or fail entirely
- database connection will fail
- authentication will fail

## 5. Database Setup (MongoDB Atlas)

### Option A: MongoDB Atlas

1. Create a MongoDB Atlas cluster.
2. Create a database user.
3. Allow your current IP address in Network Access.
4. Copy the connection string from Atlas.
5. Put that value into `backend/.env` as `MONGODB_URI`.

Example format:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jumpstart
```

Important:

- If your IP is not allowlisted, connection will fail.
- If the username or password is wrong, backend startup will fail.
- If the database name is omitted or incorrect, data may be written to the wrong database.

### Option B: Local MongoDB

If you are using a local MongoDB installation:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/jumpstart
```

### Option C: Docker Compose

From the `backend/` folder:

```bash
npm run db:up
```

This starts the MongoDB service defined for local development.

If MongoDB is not running:

- backend startup will fail
- login and all data-dependent pages will break

## 6. Seed Required Data

The project includes helper scripts for seeding assessment config and an admin account.

From `backend/` run:

```bash
npm run seed:assessment
npm run seed:admin
```

What these do:

- `seed:assessment`
  Seeds the assessment/package configuration used by the app.
  If skipped, tests/packages may not appear correctly.

- `seed:admin`
  Creates or updates the admin user from `.env`.
  If skipped, admin login may not be available.

## 7. Running the Project

You need two terminals: one for backend, one for frontend.

### Development

#### Backend

```bash
cd backend
npm run dev
```

Alternative:

```bash
npm run dev:watch
```

#### Frontend

```bash
cd frontend
npm run dev
```

After both are running:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

If only the frontend is running:

- the app UI will open
- API requests will fail
- login, results, dashboard, and admin pages will not work

If only the backend is running:

- the API is available
- there is no frontend UI to interact with

### Production Build

#### Frontend build

```bash
cd frontend
npm run build
```

Optional preview:

```bash
npm run preview
```

#### Backend production start

```bash
cd backend
npm run start
```

## 8. Common Setup Issues and Fixes

### Issue: `ECONNREFUSED` or MongoDB connection failure

Cause:

- MongoDB is not running
- Atlas IP is not allowlisted
- `MONGODB_URI` is wrong

Fix:

- verify MongoDB is running
- verify the Atlas IP whitelist
- verify the connection string in `backend/.env`

### Issue: Google login button shows but login fails

Cause:

- `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID` do not match
- the Google OAuth app does not allow your frontend origin

Fix:

- use the same client ID in frontend and backend
- allow `http://localhost:5173` in Google Cloud Console

### Issue: Admin panel access does not work

Cause:

- no admin user has been seeded
- you are logged in with a normal user account

Fix:

```bash
cd backend
npm run seed:admin
```

Then log out and log back in with the seeded admin credentials.

### Issue: Tests or packages do not appear

Cause:

- assessment configuration was not seeded

Fix:

```bash
cd backend
npm run seed:assessment
```

### Issue: Frontend cannot reach backend

Cause:

- `VITE_API_URL` is wrong
- backend is not running
- backend port does not match frontend config

Fix:

- confirm backend is running on the expected port
- confirm `frontend/.env` points to the correct API URL

### Issue: Build succeeds with warnings about large chunks

Cause:

- current frontend bundle is large

Fix:

- this does not block local development
- the app can still run
- chunk splitting can be optimized later for production performance

## 9. Quick Verification Checklist

Before handing off or starting feature work, confirm:

- frontend starts on `http://localhost:5173`
- backend starts on `http://localhost:5000`
- MongoDB connection succeeds
- user signup/login works
- admin login works
- test packages load
- results page loads

If any of these fail, fix the setup issue before changing code.
