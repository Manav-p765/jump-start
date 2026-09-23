# Testing Guide

This document explains the current testing setup in Jumpstride and how to extend it.

## 1. Testing Overview

Current automated coverage in this repo is limited but useful:

- frontend static validation
  - production build check
  - ESLint
- backend smoke validation
  - scoring smoke script for the 500-question package
  - direct syntax/import checks with `node --check`

Current gaps:

- no Jest/Vitest test runner is installed yet
- no Supertest API integration tests are committed
- no frontend component test suite is committed
- no end-to-end browser tests are committed

That means the project currently relies on:

- build validation
- linting
- smoke scripts
- manual UI/API verification

## 2. Tools Used

### Currently used in this repo

- `npm run build` in `frontend/`
  verifies the React app builds successfully
- `npm run lint` in `frontend/`
  catches common frontend code issues
- `npm run smoke:career-500q` in `backend/`
  validates the dedicated 500Q scoring path with mock answers
- `node --check <file>`
  useful for quick backend syntax checks

### Recommended tools for extending tests

These are not installed yet, but they are the most practical next additions:

- `Supertest`
  for backend API integration tests
- `Jest` or `Vitest`
  for backend unit/integration tests
- `Vitest` + `@testing-library/react`
  for frontend component and route tests
- `Playwright`
  for full end-to-end test coverage later

## 3. How to Run Tests

## Frontend checks

From `frontend/`:

```bash
npm run lint
npm run build
```

What this validates:

- JSX/ESLint issues
- import resolution
- production bundling

What it does not validate:

- component behavior
- form logic
- route protection behavior

## Backend checks

From `backend/`:

```bash
npm run smoke:career-500q
```

What this validates:

- package-specific 500Q scoring entry path
- normalized score/result output shape

Useful additional local checks:

```bash
node --check server.js
node --check controllers/userController.js
node --check controllers/adminController.js
```

## Full local validation pass

Use this sequence before pushing changes:

```bash
cd backend
npm run smoke:career-500q

cd ..\frontend
npm run lint
npm run build
```

If you skip these checks:

- syntax problems may reach runtime
- UI imports may break the app build
- scoring regressions may go unnoticed

## 4. Backend Test Examples

There is no committed Supertest suite yet. The examples below show the recommended structure for adding one.

### Example: login API test with Supertest

Suggested file:

```text
backend/tests/auth.login.test.js
```

Example:

```js
import request from "supertest";
import app from "../app.js";

describe("POST /api/v1/user/auth/login", () => {
  it("returns 400 when email/password are missing", async () => {
    const res = await request(app).post("/api/v1/user/auth/login").send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      msg: "Email and password are required",
    });
  });
});
```

### Example: protected route test

```js
import request from "supertest";
import app from "../app.js";

describe("GET /api/v1/user/profile", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/v1/user/profile");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
```

### Example: scoring unit test

Suggested file:

```text
backend/tests/scoring.career500q.test.js
```

Example:

```js
import pkg from "../config/comprehensive500Package.generated.js";
import scoreCareer500QPackage from "../utils/scoring/packageScoring/career500q.js";

describe("scoreCareer500QPackage", () => {
  it("returns the expected algorithm key", () => {
    const answers = {};

    pkg.sections.forEach((section) => {
      section.questions.forEach((question, index) => {
        answers[`${section.sectionId}-${index}`] =
          question.type === "likert" ? 4 : question.correctOption || "A";
      });
    });

    const result = scoreCareer500QPackage(answers, pkg.sections);

    expect(result.metadata.algorithmKey).toBe("career-500q-v1");
    expect(Array.isArray(result.sectionBreakdown)).toBe(true);
  });
});
```

## 5. Frontend Test Examples

There is no committed frontend test runner yet. The recommended direction is `Vitest` with `React Testing Library`.

### Example: protected route behavior

Suggested file:

```text
frontend/src/components/ProtectedRoute.test.jsx
```

Example:

```jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to login", () => {
    render(
      <AuthContext.Provider value={{ user: null, token: "", loading: false }}>
        <MemoryRouter>
          <ProtectedRoute>
            <div>Private Page</div>
          </ProtectedRoute>
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.queryByText("Private Page")).not.toBeInTheDocument();
  });
});
```

### Example: result page rendering

Suggested file:

```text
frontend/src/pages/Result.test.jsx
```

Example:

```jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Result from "./Result";

describe("Result page", () => {
  it("renders the career profile heading", () => {
    render(
      <MemoryRouter>
        <Result />
      </MemoryRouter>
    );

    expect(screen.getByText(/your career profile/i)).toBeInTheDocument();
  });
});
```

## 6. Sample Test Cases

Use these as the baseline cases to add first.

### Authentication

- register succeeds with valid payload
- register fails when password confirmation does not match
- login fails with wrong password
- login fails for suspended user
- social login fails when Google token is invalid

### Authorization

- protected user route rejects requests without JWT
- admin route rejects authenticated non-admin user
- admin route accepts admin user

### Package and test flow

- package purchase fails when package is already purchased
- package select fails when package is not owned
- test progress persists answers and completed sections
- test submit fails when all sections are not completed

### Results

- results hub returns only approved/published reports for visible report details
- report detail returns `hasAccess: false` for pending reports
- overall score aggregation ignores unattempted tests
- 500Q scoring returns package-specific metadata and section breakdown

### Admin review

- admin submissions list includes pending reports
- approving a report changes publication status to approved
- deleting a report removes it from report history

### Frontend UI

- login form submits correct payload
- protected admin route redirects non-admin user
- results page renders summary cards from API data
- student report page renders section breakdown safely with missing subsection data

## 7. CI/CD Testing

There is no formal CI pipeline committed in this repo yet.

At minimum, CI should run:

```bash
cd backend
npm run smoke:career-500q

cd ../frontend
npm run lint
npm run build
```

Recommended future CI stages:

1. install backend and frontend dependencies
2. run backend smoke tests
3. run frontend lint
4. run frontend production build
5. add backend API tests once Supertest is installed
6. add frontend component tests once Vitest is installed

### Example CI job steps

```yaml
steps:
  - checkout
  - install backend dependencies
  - install frontend dependencies
  - run backend smoke test
  - run frontend lint
  - run frontend build
```

## 8. Recommended Next Step

If you want a real automated test baseline, the most practical next implementation is:

1. add `Vitest` + `React Testing Library` to `frontend/`
2. add `Supertest` + `Jest` or `Vitest` to `backend/`
3. export the Express app separately from `server.js`
4. create a small seeded test database or fixtures
5. start with auth, protected routes, and result scoring tests
