# Architecture

This document gives a quick technical overview of the Jumpstride system so a new developer can understand how the application is structured and where core logic lives.

## 1. High-Level System Overview

Jumpstride is a MERN application with:

- a React + Vite frontend for student and admin interfaces
- an Express API backend for authentication, assessment workflows, reporting, and admin operations
- MongoDB for persistence
- JWT-based authentication for protected API access

High-level responsibilities:

- Frontend handles routing, UI state, forms, protected pages, and API consumption
- Backend handles business rules, scoring, data persistence, and access control
- MongoDB stores users, package configuration, progress, and assessment reports

[Insert system context diagram here]

## 2. Frontend Architecture

### Core structure

Frontend code lives in `frontend/src/`.

Main folders:

- `pages/`
  Route-level screens for students and admins
- `components/`
  Reusable UI blocks, including admin and results-specific components
- `context/`
  Shared React context, mainly authentication
- `api/`
  Axios instance and request helpers
- `data/`
  UI adapters, display config, and mapping helpers
- `layout/`
  Shared route shells such as main layout, admin layout, and blank layout
- `config/`
  Environment access and frontend configuration

### Routing

Routing is defined in `frontend/src/App.jsx`.

Route groups:

- public routes
  Home, login, signup, public test discovery
- protected student routes
  dashboard, profile, test flow, results, detailed reports
- protected admin routes
  admin dashboard, submissions, results, analytics, payments, users, settings

### State management

The frontend uses a lightweight state approach:

- `AuthContext`
  Stores the authenticated user and JWT token
- `localStorage`
  Persists user and token across refreshes
- page-level local state
  Used for screen-specific filters, UI toggles, forms, and request state
- API-driven state
  Most business data is fetched directly from backend endpoints

There is no global Redux/Zustand store in the current implementation.

### API layer

`frontend/src/api/api.js` defines a shared Axios client.

Key behavior:

- attaches `Authorization: Bearer <token>` automatically
- redirects to `/login` on `401` responses
- reads base URL from frontend environment config

### Access control

Frontend protection is route-based:

- `ProtectedRoute` blocks unauthenticated users
- `ProtectedRoute requiredRole="admin"` blocks non-admin access to admin routes

[Insert frontend routing diagram here]

## 3. Backend Architecture

### Core structure

Backend code lives in `backend/`.

Main folders:

- `controllers/`
  HTTP handlers and business orchestration
- `routes/`
  Express route definitions
- `middleware/`
  Authentication and authorization middleware
- `models/`
  Mongoose schemas
- `utils/`
  Shared helpers, scoring logic, report shaping, and result utilities
- `config/`
  Database config and package seed/config files
- `scripts/`
  Seed and maintenance scripts
- `reference/`
  source PDFs and CSVs used by scoring/package generation support code

### Express application

`backend/server.js` is the API entry point.

Main responsibilities:

- load environment variables
- connect to MongoDB
- register middleware
- mount route modules
- expose health and root endpoints
- handle `404` and `500` responses

### Route groups

Auth routes:

- `/api/v1/user/auth/register`
- `/api/v1/user/auth/login`
- `/api/v1/user/auth/social-login`

User routes:

- `/api/v1/user/init`
- `/api/v1/user/profile`
- `/api/v1/user/package/*`
- `/api/v1/user/results`
- `/api/v1/user/test-progress`
- `/api/v1/user/test-submit`

Config routes:

- public package/config read endpoints
- admin config management endpoints

Admin routes:

- `/api/v1/admin/dashboard`
- `/api/v1/admin/users`
- `/api/v1/admin/payments`
- `/api/v1/admin/submissions`
- `/api/v1/admin/results`
- `/api/v1/admin/analytics`

### Middleware

Authentication middleware is in `backend/middleware/auth.js`.

It provides:

- `protect`
  verifies JWT, loads the user, and attaches `req.user`
- `adminOnly`
  allows only users with `role === "admin"`

### Business logic organization

Key controllers:

- `authController.js`
  registration, login, social login
- `userController.js`
  dashboard data, package ownership, test progress, report submission, result history
- `adminController.js`
  admin dashboards, submissions, approvals, results, payments, analytics
- `configController.js`
  package config read/write and CSV/google-sheet package operations

Scoring/report logic:

- generic scoring utilities in `backend/utils/`
- package-specific scoring in `backend/utils/scoring/`
- report normalization/history in `backend/utils/assessmentReports.js`

[Insert backend request flow diagram here]

## 4. Database Design Overview

The current backend uses two primary collections:

- `users`
- `assessmentconfigs`

### `users` collection

The `User` model is the main operational entity.

It stores:

- identity fields
  name, email, password, mobile, profile details
- access fields
  role, suspension state, last login
- package ownership
  `selectedPackageId`, `purchasedPackages`
- test progress
  current section, answers, completed sections, remaining time
- dashboard counters
  completed tests, in-progress tests, reports ready
- latest result snapshot
  `resultProfile`, `resultPublication`
- historical reports
  `assessmentReports[]`

Important embedded structures:

- `resultProfile`
  score summary, section breakdown, strengths, recommendations, personality type
- `assessmentReports[]`
  per-package, per-attempt historical results

### `assessmentconfigs` collection

The `AssessmentConfig` model stores package configuration.

It contains:

- package metadata
  title, price, badge, features, active state
- enabled sections
- question lists
- scoring type per section
- question metadata
  options, correct answers, reverse scoring, subscale, notes

### Relationships

Current relationships are mostly logical references rather than MongoDB joins:

- `users.selectedPackageId` references a package ID inside `assessmentconfigs.packages`
- `users.purchasedPackages[]` stores package IDs
- `users.assessmentReports[].packageId` links a report back to a package definition

There is no dedicated `payments` collection in the current codebase.
Admin payment reporting is derived from user/package purchase history.

There is also no dedicated `semesterRegistrations` collection in the current codebase.
If semester registration is added, a separate collection linked to `users` is recommended.

[Insert data model diagram here]

## 5. Authentication Flow

### Current implementation

Authentication is JWT-based.

Supported login methods:

- email + password
- Google Sign-In token exchange

### Flow

1. User logs in from the frontend.
2. Frontend sends credentials or Google token to auth endpoints.
3. Backend verifies credentials/token.
4. Backend returns:
   - user payload
   - JWT token
5. Frontend stores both in `localStorage`.
6. Future API requests attach the JWT in the `Authorization` header.
7. Backend middleware validates the token on protected routes.

### Role-based access

Current role support in code:

- `user`
- `admin`

Admin access is enforced both:

- on the frontend through `ProtectedRoute`
- on the backend through `protect + adminOnly`

Note:

- the product may refer to Student, Teacher, and Admin roles
- the current schema only implements `user` and `admin`
- `teacher` would be a straightforward extension of the same role-based pattern

[Insert auth sequence diagram here]

## 6. Key Workflows

### A. User Login

Main flow:

1. User enters email/password or uses Google Sign-In.
2. Frontend calls auth API.
3. Backend validates credentials.
4. Backend returns JWT and user object.
5. Frontend saves token and user state.
6. Protected routes become available based on role.

Key modules:

- frontend: `AuthContext`, `Login.jsx`, `Signup.jsx`
- backend: `authRoutes.js`, `authController.js`, `middleware/auth.js`

### B. Semester Registration

Current state in this repo:

- semester registration is not implemented as a dedicated backend module
- there is no semester collection, semester route group, or semester service layer

Recommended architecture when added:

- create a `SemesterRegistration` collection
- link each registration to `User`
- expose endpoints such as:
  - `POST /api/v1/user/semester-registrations`
  - `GET /api/v1/user/semester-registrations`
  - `PATCH /api/v1/admin/semester-registrations/:id`

Recommended data fields:

- `userId`
- `semesterId` or semester label
- academic metadata
- payment status
- registration status
- timestamps

### C. Payment Flow (Current + Razorpay Target)

Current implemented flow:

1. User selects a paid package on the frontend.
2. Frontend navigates to the payment page.
3. Payment page collects billing and method UI data.
4. On completion, frontend currently calls:
   - `POST /v1/user/package/purchase`
5. Backend records package purchase on the user.
6. Frontend navigates to payment confirmation.
7. Admin payment screens derive payment rows from purchased package history.

Current limitation:

- there is no Razorpay order creation, payment verification, or webhook handling yet
- payment success is currently treated as an internal purchase confirmation flow

Recommended Razorpay production flow:

1. Frontend requests order creation from backend.
2. Backend creates Razorpay order and returns order metadata.
3. Frontend opens Razorpay checkout.
4. Razorpay returns payment identifiers.
5. Backend verifies payment signature.
6. Backend records payment transaction.
7. Backend unlocks package and triggers downstream notifications.

Recommended future addition:

- dedicated `Payment` collection
- webhook verification endpoint
- idempotent purchase fulfillment

[Insert payment workflow diagram here]

## 7. API Communication Flow (Frontend ↔ Backend)

### Request path

The typical request path is:

1. React page or component triggers a fetch/action.
2. Shared Axios client builds the request.
3. JWT token is attached if present.
4. Express route receives the request.
5. Middleware validates auth/role where required.
6. Controller performs business logic.
7. Mongoose reads/writes MongoDB.
8. Controller returns JSON response.
9. Frontend updates local or page state.

### Communication style

- JSON over HTTP
- Bearer token authentication for protected endpoints
- environment-driven API base URL

### Error handling

Frontend:

- local loading and error state at page/component level
- Axios interceptor clears auth on `401`

Backend:

- explicit `401`, `403`, `404`, and `500` JSON responses
- route-level validation inside controllers

### Example request lifecycle

Example: published result detail

1. Student opens `/result/:reportId`.
2. Frontend calls `GET /api/v1/user/results/:reportId`.
3. Backend validates JWT.
4. Backend loads the user and the matching embedded report.
5. Backend normalizes the report payload.
6. Frontend renders overall score, section breakdown, and report cards.

[Insert frontend-backend API sequence diagram here]

## Summary

The current system is organized around:

- React page-driven UI with lightweight context state
- Express controllers for domain workflows
- Mongoose models centered on `User` and `AssessmentConfig`
- JWT-based authentication
- embedded report history inside the user document

The architecture is already structured for:

- multiple assessment packages
- repeated attempts and report history
- admin review before publication
- future extensions such as teacher roles, Razorpay verification, and semester registration
