# Jumpstride Backend (MERN - Node + Express + MongoDB)

## Setup

1. **Install dependencies**
   ```bash
   cd backend && npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env` if you need a template.
   - Set `MONGODB_URI` (for local Docker: `mongodb://127.0.0.1:27017/jumpstart`).
   - Set `JWT_SECRET` to a strong random string.
   - For Google login, set `GOOGLE_CLIENT_ID` to your Google Web OAuth client ID.
   - For admin seeding, optionally set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.

3. **Run MongoDB**
   - Option A: use the included Docker setup after Docker Desktop is running:
     ```bash
     npm run db:up
     ```
   - Option B: start your own local MongoDB service.
   - Option C: use a cloud URI such as MongoDB Atlas.

4. **Start the server**
   ```bash
   npm run dev
   ```
   For auto-reload in environments that support Node's native watch mode, use `npm run dev:watch`.
   Server runs at `http://localhost:5000`.

If startup fails with `ECONNREFUSED`, MongoDB is not running at the host in `MONGODB_URI`.

## Reference Assets

Backend package-generation and scoring reference files now live in `backend/reference/`:

- `complete-aptitude-test-500q.pdf`
- `complete-answer-key-500q.pdf`
- `section-1-personality.csv`
- `section-template.csv`

## Google Sign-In

Use the same Google Web client ID in both `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`
and `backend/.env` as `GOOGLE_CLIENT_ID`.

In Google Cloud Console, the OAuth client must allow your exact frontend origin, for example:

- `http://localhost:5173`

If Vite starts on a different port, Google Sign-In will reject the origin. This repo now pins
the dev server to `http://localhost:5173` so the origin stays stable.

## API

- `POST /api/v1/user/auth/register` - name, email, password, password_confirmation, mobile
- `POST /api/v1/user/auth/login` - email, password -> `{ success, data: { user, auth_token } }`
- `POST /api/v1/user/auth/social-login` - provider: "google", token: Google ID token
- `GET /api/v1/user/init` - Bearer token required -> dashboard stats

## Frontend

Point the React app at this API by setting in `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Then run the frontend from the project root: `cd frontend && npm run dev`.

## Seed Helpers

- `npm run seed:assessment` seeds the assessment config.
- `npm run seed:admin` creates or updates the configured admin account.
