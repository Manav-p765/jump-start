# Authentication and Authorization

This document explains how authentication and authorization are currently implemented in Jumpstride.

## 1. Authentication Method

Jumpstride uses **JWT-based authentication**.

Supported login methods:

- email + password
- Google Sign-In token exchange

Backend token generation happens in `backend/controllers/authController.js`:

```js
jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
```

That means:

- the token payload currently contains only the user ID
- token lifetime is `7 days`
- authorization decisions are made by loading the user from the database after token verification

## 2. Login Flow

## Email/password login

1. User submits email and password from the frontend login form.
2. Frontend calls:

```text
POST /api/v1/user/auth/login
```

3. Backend:
   - finds the user by email
   - verifies the password with `bcrypt`
   - checks `isSuspended`
   - updates `lastLoginAt`
   - signs a JWT

4. Backend returns:
   - sanitized user object
   - `auth_token`

5. Frontend stores both in `localStorage`.

## Google login

1. Frontend gets a Google ID token from Google Sign-In.
2. Frontend calls:

```text
POST /api/v1/user/auth/social-login
```

3. Backend verifies the Google token using `google-auth-library`.
4. Backend either:
   - links the Google account to an existing user by email
   - or creates a new user

5. Backend signs and returns the same JWT flow used for password login.

## Suspended users

Both login flows deny access when:

- `user.isSuspended === true`

In that case the backend returns `403`.

## 3. Token Structure and Storage

## Token structure

Current token payload:

```json
{
  "id": "<user-id>",
  "iat": 1712290000,
  "exp": 1712894800
}
```

Notes:

- `iat` and `exp` are standard JWT claims added by `jsonwebtoken`
- role is **not embedded in the token**
- role is loaded from MongoDB after token verification

## Frontend storage

The frontend stores:

- `user` in `localStorage`
- `token` in `localStorage`

This is implemented in `frontend/src/context/AuthContext.jsx`.

Stored keys:

```text
localStorage["user"]
localStorage["token"]
```

## Request usage

The shared Axios client in `frontend/src/api/api.js` automatically adds:

```http
Authorization: Bearer <token>
```

to outgoing requests when a token exists.

## 4. Middleware Explanation

Auth middleware is implemented in `backend/middleware/auth.js`.

## `protect`

Responsibilities:

- read `Authorization` header
- extract bearer token
- verify JWT using `JWT_SECRET`
- load the user from MongoDB
- attach the user object to `req.user`

Failure cases:

- no token → `401 Not authorized`
- invalid/expired token → `401 Invalid or expired token`
- user no longer exists → `401 User not found`

## `adminOnly`

Responsibilities:

- ensure `req.user` exists
- ensure `req.user.role === "admin"`

Failure case:

- non-admin user → `403 Admin access required`

## Why role is checked after token verification

Because the token only contains `id`, the backend always resolves the latest user record from MongoDB before applying role checks.

This avoids trusting stale role data embedded in an old token.

## 5. Role-Based Access Control

## Current roles in code

The `User` schema currently supports:

- `user`
- `admin`

The product language may refer to:

- Student
- Teacher
- Admin

Current mapping:

- `Student` → `user`
- `Admin` → `admin`
- `Teacher` → **not implemented yet**

## Where roles are enforced

### Backend

Backend role enforcement is the source of truth.

Admin routes use:

- `protect`
- `adminOnly`

Example:

```js
router.use(protect, adminOnly);
```

for `backend/routes/adminRoutes.js`.

### Frontend

Frontend role checks are implemented through `ProtectedRoute`.

Example:

```jsx
<ProtectedRoute requiredRole="admin">
  <AdminLayout />
</ProtectedRoute>
```

This improves UX, but it is not a security boundary by itself.

## Important current limitation

The config-management routes in `backend/routes/configRoutes.js` are mounted under `/api/v1/admin/*`, but they are not protected by `protect` or `adminOnly`.

That means these endpoints are currently public in code:

- `GET /api/v1/admin/config`
- `POST /api/v1/admin/packages`
- `PUT /api/v1/admin/packages/:packageId`
- `DELETE /api/v1/admin/packages/:packageId`
- `PUT /api/v1/admin/packages/:packageId/sections`
- `POST /api/v1/admin/packages/:packageId/sections/:sectionId/sync-google-sheet`

This is a production security gap and should be fixed.

## 6. Protected Routes

## Frontend protected routes

Protected frontend pages include:

- `/dashboard`
- `/profile`
- `/profile/edit`
- `/pretest`
- `/pretest/sections`
- `/payment`
- `/payment-confirmation`
- `/result`
- `/result/:reportId`
- `/test-completed`
- `/sectionbreak`
- `/test-paused`
- `/livetest/:sectionId`

Admin-only frontend routes include:

- `/admin/dashboard`
- `/admin/testsubmissions`
- `/admin/testsubmissions/:reportId`
- `/admin/publishedresults`
- `/admin/usermanagement`
- `/admin/payments`
- `/admin/analytics`
- `/admin/settings`

Frontend behavior when access fails:

- unauthenticated user → redirect to `/login`
- non-admin trying `/admin/*` → redirect to `/login` with admin-login state

## Backend protected routes

Student/admin authenticated user routes:

- `/api/v1/user/init`
- `/api/v1/user/profile`
- `/api/v1/user/package/current`
- `/api/v1/user/package/purchase`
- `/api/v1/user/package/select`
- `/api/v1/user/results`
- `/api/v1/user/results/:reportId`
- `/api/v1/user/test-progress`
- `/api/v1/user/test-submit`

Admin-only backend routes:

- `/api/v1/admin/dashboard`
- `/api/v1/admin/users`
- `/api/v1/admin/payments`
- `/api/v1/admin/submissions`
- `/api/v1/admin/results`
- `/api/v1/admin/analytics`

## 7. Security Considerations

## What is implemented correctly

- passwords are hashed with `bcryptjs`
- JWTs are signed with a server-side secret
- protected backend routes verify the token before access
- admin routes check the user role server-side
- suspended users are blocked during login
- Google login tokens are verified against configured client IDs

## Current risks / limitations

### 1. Token stored in `localStorage`

Current storage is simple and common, but it has XSS exposure risk.

If malicious JavaScript executes in the browser, it can read the token from `localStorage`.

### 2. No refresh token flow

There is no refresh token or session rotation mechanism.

Current behavior:

- token is valid for 7 days
- once expired, the user must log in again

### 3. No server-side token revocation list

Because JWTs are stateless:

- issued tokens remain valid until expiry
- unless the account is deleted or blocked at login time

### 4. Admin config routes are currently unprotected

This is the biggest current authorization issue in the codebase.

Those routes should be wrapped with:

```js
protect, adminOnly
```

### 5. Role is not embedded in token

This is not inherently bad, but it means:

- every protected request requires a database lookup for the user

The benefit is that role changes take effect immediately.

### 6. No CSRF concern for bearer token APIs, but XSS matters more

Because auth uses bearer tokens in headers rather than cookies:

- CSRF is less of a concern
- XSS becomes the more important client-side threat

## Recommended hardening steps

1. Protect config admin routes with `protect` and `adminOnly`
2. Move auth tokens to secure `httpOnly` cookies if you want stronger browser-side protection
3. Add refresh tokens and token rotation if long-lived sessions are needed
4. Add audit logging for admin actions
5. Add rate limiting to login endpoints
6. Consider email verification or password reset flows if user management expands

## Summary

Jumpstride currently enforces authentication and authorization through:

- JWT bearer tokens
- backend auth middleware
- admin-only role checks
- frontend protected route wrappers for UX

The implementation is functional and consistent for `user` and `admin` roles.  
The main production issue to address next is the unprotected config admin route group.
