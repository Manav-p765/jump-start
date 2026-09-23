# API Documentation

Jumpstride backend REST API reference.

## Base URL

Local:

```text
http://localhost:5000
```

API base:

```text
http://localhost:5000/api/v1
```

## Authentication

Protected routes require a JWT bearer token:

```http
Authorization: Bearer <jwt-token>
```

Token flow:

1. Client logs in through `/user/auth/login` or `/user/auth/social-login`
2. Backend returns `auth_token`
3. Client stores the token
4. Client sends the token on protected requests
5. Backend validates it through `protect` middleware

Current role mapping:

- `Student` = current `user` role
- `Admin` = current `admin` role
- `Teacher` = not implemented in the current codebase

## Common Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Resource created |
| `400` | Validation or request error |
| `401` | Missing/invalid token or bad credentials |
| `403` | Access denied |
| `404` | Resource not found |
| `409` | Conflict / already exists |
| `500` | Server error |
| `503` | External auth/config unavailable |

## Standard Error Shapes

Most endpoints return:

```json
{ "success": false, "msg": "Error message" }
```

Some auth endpoints use:

```json
{ "success": false, "message": "Error message" }
```

## Security Note

The following config endpoints currently sit under `/api/v1/admin/*` but are **not protected by auth middleware in the router**:

- `GET /admin/config`
- `POST /admin/packages`
- `PUT /admin/packages/:packageId`
- `DELETE /admin/packages/:packageId`
- `PUT /admin/packages/:packageId/sections`
- `POST /admin/packages/:packageId/sections/:sectionId/sync-google-sheet`

They are documented as implemented, not as intended.

---

## Endpoint Index

| Method | Route | Auth | Role |
|---|---|---:|---|
| GET | `/` | No | Public |
| GET | `/api/health` | No | Public |
| POST | `/api/v1/user/auth/register` | No | Public |
| POST | `/api/v1/user/auth/login` | No | Student, Admin |
| POST | `/api/v1/user/auth/social-login` | No | Student, Admin |
| GET | `/api/v1/public/config` | No | Public |
| GET | `/api/v1/public/packages/:packageId/sections` | No | Public |
| GET | `/api/v1/public/packages/:packageId/sections/:sectionId/questions` | No | Public |
| GET | `/api/v1/user/init` | Yes | Student, Admin |
| GET | `/api/v1/user/profile` | Yes | Student, Admin |
| PATCH | `/api/v1/user/profile` | Yes | Student, Admin |
| GET | `/api/v1/user/package/current` | Yes | Student, Admin |
| POST | `/api/v1/user/package/purchase` | Yes | Student, Admin |
| PATCH | `/api/v1/user/package/select` | Yes | Student, Admin |
| GET | `/api/v1/user/results` | Yes | Student, Admin |
| GET | `/api/v1/user/results/:reportId` | Yes | Student, Admin |
| PATCH | `/api/v1/user/results` | Yes | Student, Admin |
| GET | `/api/v1/user/test-progress` | Yes | Student, Admin |
| PATCH | `/api/v1/user/test-progress` | Yes | Student, Admin |
| POST | `/api/v1/user/test-submit` | Yes | Student, Admin |
| GET | `/api/v1/admin/dashboard` | Yes | Admin |
| GET | `/api/v1/admin/users` | Yes | Admin |
| PATCH | `/api/v1/admin/users/:userId` | Yes | Admin |
| DELETE | `/api/v1/admin/users/:userId` | Yes | Admin |
| GET | `/api/v1/admin/payments` | Yes | Admin |
| GET | `/api/v1/admin/submissions` | Yes | Admin |
| GET | `/api/v1/admin/submissions/:reportId` | Yes | Admin |
| GET | `/api/v1/admin/results` | Yes | Admin |
| PATCH | `/api/v1/admin/results/:reportId/approve` | Yes | Admin |
| DELETE | `/api/v1/admin/results/:reportId` | Yes | Admin |
| GET | `/api/v1/admin/analytics` | Yes | Admin |
| GET | `/api/v1/admin/config` | No | Public / Intended Admin |
| POST | `/api/v1/admin/packages` | No | Public / Intended Admin |
| PUT | `/api/v1/admin/packages/:packageId` | No | Public / Intended Admin |
| DELETE | `/api/v1/admin/packages/:packageId` | No | Public / Intended Admin |
| PUT | `/api/v1/admin/packages/:packageId/sections` | No | Public / Intended Admin |
| POST | `/api/v1/admin/packages/:packageId/sections/:sectionId/sync-google-sheet` | No | Public / Intended Admin |

---

## System Endpoints

### GET `/`

- **Description:** Root API status
- **Authentication required:** No
- **Role access:** Public
- **Request body:** None

**Response**

```json
{
  "success": true,
  "message": "Jumpstride API is running",
  "endpoints": {
    "health": "GET /api/health",
    "register": "POST /api/v1/user/auth/register",
    "login": "POST /api/v1/user/auth/login",
    "socialLogin": "POST /api/v1/user/auth/social-login",
    "init": "GET /api/v1/user/init (Bearer token required)"
  }
}
```

**Errors**

- `500` server error

### GET `/api/health`

- **Description:** Health check
- **Authentication required:** No
- **Role access:** Public
- **Request body:** None

**Response**

```json
{
  "ok": true,
  "message": "Jumpstride API running"
}
```

**Errors**

- `500` server error

---

## Authentication Endpoints

### POST `/api/v1/user/auth/register`

- **Description:** Create a new student account
- **Authentication required:** No
- **Role access:** Public

**Request body**

```json
{
  "name": "Manav Parihar",
  "email": "manav@example.com",
  "password": "Password@123",
  "password_confirmation": "Password@123",
  "mobile": "9876543210"
}
```

**Response**

```json
{
  "success": true,
  "message": "Signup successful!"
}
```

**Errors**

- `400` missing fields
- `400` password too short
- `400` passwords do not match
- `400` email already exists
- `500` signup failed

### POST `/api/v1/user/auth/login`

- **Description:** Log in with email/password
- **Authentication required:** No
- **Role access:** Student, Admin

**Request body**

```json
{
  "email": "admin@jumpstart.local",
  "password": "Admin@12345"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "67f0b7d7c85d5b7ed1f3a111",
      "name": "Jumpstart Admin",
      "email": "admin@jumpstart.local",
      "subscription": "Basic",
      "role": "admin",
      "isSuspended": false,
      "selectedPackageId": ""
    },
    "auth_token": "<jwt-token>"
  }
}
```

**Errors**

- `400` email/password required
- `401` invalid email or password
- `401` Google-only account
- `403` suspended account

### POST `/api/v1/user/auth/social-login`

- **Description:** Log in with Google ID token
- **Authentication required:** No
- **Role access:** Student, Admin

**Request body**

```json
{
  "provider": "google",
  "token": "<google-id-token>"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "67f0b7d7c85d5b7ed1f3a222",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "subscription": "Basic",
      "role": "user",
      "isSuspended": false
    },
    "auth_token": "<jwt-token>"
  }
}
```

**Errors**

- `400` provider/token required
- `400` Google account missing email
- `401` client ID mismatch
- `403` suspended account
- `503` Google login not configured

---

## Public Configuration Endpoints

### GET `/api/v1/public/config`

- **Description:** Fetch active packages for public listing
- **Authentication required:** No
- **Role access:** Public
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "packages": [
      {
        "id": "starter",
        "title": "Starter Package",
        "badge": "Recommended",
        "amount": 1499,
        "features": [
          "Complete assessment",
          "Personalized report",
          "Dashboard access"
        ],
        "durationText": "Duration based on selected sections",
        "active": true,
        "sortOrder": 1,
        "sectionCount": 5
      }
    ]
  }
}
```

**Errors**

- `500` failed to load config

### GET `/api/v1/public/packages/:packageId/sections`

- **Description:** Fetch enabled sections for a package
- **Authentication required:** No
- **Role access:** Public
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "package": {
      "id": "complete-aptitude-500q",
      "title": "Complete Aptitude Test (500Q)",
      "amount": 2499,
      "sectionCount": 5
    },
    "sections": [
      {
        "sectionId": 1,
        "title": "Personality Assessment",
        "durationMinutes": 20,
        "enabled": true,
        "scoringType": "likert",
        "totalQuestions": 120
      }
    ]
  }
}
```

**Errors**

- `404` package not found
- `500` failed to load package sections

### GET `/api/v1/public/packages/:packageId/sections/:sectionId/questions`

- **Description:** Fetch public question payload for one section
- **Authentication required:** No
- **Role access:** Public
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "section": {
      "sectionId": 1,
      "title": "Personality Assessment",
      "durationMinutes": 20,
      "enabled": true,
      "scoringType": "likert",
      "totalQuestions": 120
    },
    "questions": [
      {
        "index": 0,
        "questionId": "1",
        "text": "I enjoy taking initiative when working with others.",
        "type": "likert",
        "options": []
      }
    ]
  }
}
```

**Errors**

- `404` package/section not found
- `500` failed to load questions

---

## Student/User Endpoints

All routes below require:

```http
Authorization: Bearer <jwt-token>
```

### GET `/api/v1/user/init`

- **Description:** Load dashboard bootstrap data
- **Authentication required:** Yes
- **Role access:** Student, Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "67f0b7d7c85d5b7ed1f3a333",
      "name": "Manav Parihar",
      "email": "manav@siteonlab.com",
      "selectedPackageId": "complete-aptitude-500q"
    },
    "tests_completed": 2,
    "tests_in_progress": 0,
    "reports_ready": 2,
    "counselling_sessions": 0,
    "available_tests": [],
    "purchased_packages": [],
    "result_status": "approved",
    "top_careers": [
      {
        "title": "Software Engineer",
        "matchPercent": 69
      }
    ],
    "tests_history_summary": {
      "totalPurchased": 3,
      "attemptedCount": 2,
      "inProgressCount": 0,
      "pendingCount": 0,
      "publishedCount": 2
    }
  }
}
```

**Errors**

- `401` not authorized / invalid token
- `404` user not found

### GET `/api/v1/user/profile`

- **Description:** Fetch the current user profile
- **Authentication required:** Yes
- **Role access:** Student, Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "67f0b7d7c85d5b7ed1f3a333",
      "name": "Manav Parihar",
      "email": "manav@siteonlab.com",
      "mobile": "9876543210",
      "city": "Jaipur",
      "schoolName": "ABC School",
      "subscription": "Basic",
      "role": "admin",
      "isSuspended": false,
      "selectedPackageId": "complete-aptitude-500q"
    }
  }
}
```

**Errors**

- `404` user not found

### PATCH `/api/v1/user/profile`

- **Description:** Update profile and optionally password
- **Authentication required:** Yes
- **Role access:** Student, Admin

**Request body**

```json
{
  "name": "Manav Parihar",
  "email": "manav@siteonlab.com",
  "mobile": "9876543210",
  "city": "Jaipur",
  "schoolName": "ABC School",
  "currentPassword": "OldPassword@123",
  "newPassword": "NewPassword@123"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "67f0b7d7c85d5b7ed1f3a333",
      "name": "Manav Parihar",
      "email": "manav@siteonlab.com",
      "mobile": "9876543210",
      "city": "Jaipur",
      "subscription": "Basic",
      "role": "admin",
      "selectedPackageId": "complete-aptitude-500q"
    }
  }
}
```

**Errors**

- `400` no valid fields to update
- `400` invalid email / password rule / wrong current password
- `404` user not found
- `409` email already in use

### GET `/api/v1/user/package/current`

- **Description:** Fetch the currently selected purchased package
- **Authentication required:** Yes
- **Role access:** Student, Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "package": {
      "id": "dummy-test",
      "title": "Dummy Test",
      "amount": 0
    },
    "sections": [
      {
        "sectionId": 1,
        "title": "Personality Assessment",
        "durationMinutes": 1,
        "scoringType": "likert",
        "totalQuestions": 1
      }
    ]
  }
}
```

**Errors**

- `404` user or purchased package not found

### POST `/api/v1/user/package/purchase`

- **Description:** Add a package to the user’s purchased packages
- **Authentication required:** Yes
- **Role access:** Student, Admin

**Request body**

```json
{
  "packageId": "complete-aptitude-500q"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "packageId": "complete-aptitude-500q"
  }
}
```

**Errors**

- `400` packageId required
- `404` package not found or inactive
- `409` already purchased

### PATCH `/api/v1/user/package/select`

- **Description:** Select a purchased package and optionally reset progress
- **Authentication required:** Yes
- **Role access:** Student, Admin

**Request body**

```json
{
  "packageId": "complete-aptitude-500q",
  "resetProgress": true
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "packageId": "complete-aptitude-500q",
    "resetProgress": true
  }
}
```

**Errors**

- `400` packageId required
- `403` package not yet purchased
- `404` package not found or inactive

### GET `/api/v1/user/results`

- **Description:** Fetch results hub summary and all test history
- **Authentication required:** Yes
- **Role access:** Student, Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "hasResults": true,
    "resultStatus": "approved",
    "overallScore": 41,
    "overallPercentile": "Top 59% profile strength",
    "scoredTestsCount": 2,
    "completedTestsCount": 2,
    "totalTestsCount": 3,
    "careerPathwaysCount": 6,
    "strengths": [
      {
        "name": "Analytical Thinking",
        "value": 33,
        "desc": "Comfort with structured problem solving."
      }
    ],
    "careerRecommendations": [
      {
        "title": "Software Engineer",
        "matchPercent": 69,
        "salaryRange": "₹8-18 LPA"
      }
    ],
    "personalityType": {
      "code": "ISTP-T",
      "title": "The Problem Solver"
    },
    "tests": [
      {
        "id": "dummy-test",
        "title": "Dummy Test",
        "attemptState": "attempted",
        "resultState": "approved",
        "scorePreview": 47,
        "currentAction": "view_report"
      }
    ]
  }
}
```

**Errors**

- `404` user not found
- `500` failed to load results

### GET `/api/v1/user/results/:reportId`

- **Description:** Fetch a specific report. Full report payload is only returned for approved reports.
- **Authentication required:** Yes
- **Role access:** Student, Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "hasAccess": true,
    "resultStatus": "approved",
    "submittedAt": "2026-04-05T02:00:00.000Z",
    "approvedAt": "2026-04-05T03:00:00.000Z",
    "report": {
      "id": "67f0b7d7c85d5b7ed1f3a444",
      "testName": "Complete Aptitude Test (500Q)",
      "studentName": "Manav Parihar",
      "overallScore": 35,
      "sectionBreakdown": [
        {
          "sectionId": 1,
          "title": "Personality Assessment",
          "score": 36,
          "maxScore": 100
        }
      ]
    }
  }
}
```

**Errors**

- `404` result report not found
- `500` failed to load result report

### PATCH `/api/v1/user/results`

- **Description:** Patch the latest result profile snapshot
- **Authentication required:** Yes
- **Role access:** Student, Admin

**Request body**

```json
{
  "overallScore": 88,
  "overallPercentile": "Top 12% nationally",
  "careerPathwaysCount": 15,
  "strengths": [
    {
      "name": "Analytical Thinking",
      "value": 92,
      "desc": "Strong ability to analyze complex problems."
    }
  ]
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "resultProfile": {
      "overallScore": 88,
      "overallPercentile": "Top 12% nationally",
      "careerPathwaysCount": 15
    }
  }
}
```

**Errors**

- `400` no valid fields to update
- `404` user not found

### GET `/api/v1/user/test-progress`

- **Description:** Fetch saved live test progress
- **Authentication required:** Yes
- **Role access:** Student, Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "packageId": "complete-aptitude-500q",
    "sectionId": 2,
    "questionIndex": 10,
    "answers": {
      "1-0": 4,
      "1-1": 3
    },
    "completedSectionIds": [1],
    "timeRemainingSeconds": 1240
  }
}
```

**Errors**

- `404` user not found
- `500` failed to load progress

### PATCH `/api/v1/user/test-progress`

- **Description:** Save live test progress for resume support
- **Authentication required:** Yes
- **Role access:** Student, Admin

**Request body**

```json
{
  "sectionId": 2,
  "questionIndex": 10,
  "answers": {
    "1-0": 4,
    "1-1": 3
  },
  "completedSectionIds": [1],
  "timeRemainingSeconds": 1240
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "ok": true
  }
}
```

**Errors**

- `500` failed to save progress

### POST `/api/v1/user/test-submit`

- **Description:** Submit final answers for scoring and admin review
- **Authentication required:** Yes
- **Role access:** Student, Admin

**Request body**

```json
{
  "answers": {
    "1-0": 4,
    "1-1": 3,
    "2-0": "B",
    "3-0": "C"
  }
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "resultProfile": {
      "overallScore": 47,
      "overallPercentile": "Top 53% profile strength",
      "careerPathwaysCount": 6
    },
    "resultStatus": "pending_approval",
    "reportId": "67f0b7d7c85d5b7ed1f3a555"
  }
}
```

**Errors**

- `400` no purchased package selected
- `400` complete all sections before submitting
- `400` answer at least one question
- `500` failed to submit test

---

## Admin Data Endpoints

All routes below require:

```http
Authorization: Bearer <jwt-token>
```

and `role = admin`.

### GET `/api/v1/admin/dashboard`

- **Description:** Admin KPI summary, growth charts, revenue charts, and recent activity
- **Authentication required:** Yes
- **Role access:** Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "kpiData": [
      { "title": "Total Users", "value": 42 },
      { "title": "Tests Purchased", "value": 17 },
      { "title": "Completed Tests", "value": 12 },
      { "title": "Revenue", "value": "₹5,497" }
    ],
    "growthData": [{ "name": "Jan", "value": 4 }],
    "revenueData": [{ "name": "Jan", "value": 1499 }],
    "recentActivities": [
      {
        "id": "pay-0",
        "time": "15m ago",
        "user": "Manav Parihar",
        "action": "Payment received (Starter Package)",
        "status": "Completed"
      }
    ]
  }
}
```

**Errors**

- `401` invalid or expired token
- `403` admin access required
- `500` failed to load admin dashboard

### GET `/api/v1/admin/users`

- **Description:** List all non-admin users
- **Authentication required:** Yes
- **Role access:** Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": [
    {
      "id": "67f0b7d7c85d5b7ed1f3a333",
      "name": "Manav Parihar",
      "email": "manav@siteonlab.com",
      "phone": "9876543210",
      "initials": "MP",
      "tests": 2,
      "subscription": "Basic",
      "lastLogin": "2h ago",
      "status": "Active",
      "packageId": "complete-aptitude-500q"
    }
  ]
}
```

**Errors**

- `403` admin access required
- `500` failed to load users

### PATCH `/api/v1/admin/users/:userId`

- **Description:** Update a non-admin user
- **Authentication required:** Yes
- **Role access:** Admin

**Request body**

```json
{
  "name": "Updated Student",
  "mobile": "9999999999",
  "subscription": "Premium",
  "status": "Suspended"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "id": "67f0b7d7c85d5b7ed1f3a333",
    "name": "Updated Student",
    "email": "student@example.com",
    "phone": "9999999999",
    "initials": "US",
    "tests": 2,
    "subscription": "Premium",
    "lastLogin": "1d ago",
    "status": "Suspended",
    "packageId": "starter"
  }
}
```

**Errors**

- `404` user not found
- `500` failed to update user

### DELETE `/api/v1/admin/users/:userId`

- **Description:** Delete a non-admin user
- **Authentication required:** Yes
- **Role access:** Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "id": "67f0b7d7c85d5b7ed1f3a333"
  }
}
```

**Errors**

- `404` user not found
- `500` failed to delete user

### GET `/api/v1/admin/payments`

- **Description:** Fetch derived payment summary and rows
- **Authentication required:** Yes
- **Role access:** Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": 5497,
      "totalRevenueLabel": "₹5,497",
      "thisMonth": 2499,
      "thisMonthLabel": "₹2,499",
      "pendingAmount": 0,
      "pendingAmountLabel": "₹0",
      "refundedAmount": 0,
      "refundedAmountLabel": "₹0"
    },
    "rows": [
      {
        "id": "ORD-2026-0001",
        "name": "Manav Parihar",
        "email": "manav@siteonlab.com",
        "package": "Complete Aptitude Test (500Q)",
        "amount": 2499,
        "amountLabel": "₹2,499",
        "method": "manual",
        "dateLabel": "05 Apr 2026",
        "status": "Paid"
      }
    ]
  }
}
```

**Errors**

- `500` failed to load payments

### GET `/api/v1/admin/submissions`

- **Description:** List submitted reports for admin review
- **Authentication required:** Yes
- **Role access:** Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": [
    {
      "id": "67f0b7d7c85d5b7ed1f3a555",
      "userId": "67f0b7d7c85d5b7ed1f3a333",
      "name": "Manav Parihar",
      "email": "manav@siteonlab.com",
      "initials": "MP",
      "type": "Complete Aptitude Test (500Q)",
      "date": "05 Apr 2026",
      "duration": "N/A",
      "status": "Pending Approval",
      "canApprove": true
    }
  ]
}
```

**Errors**

- `500` failed to load submissions

### GET `/api/v1/admin/submissions/:reportId`

- **Description:** Fetch the full admin review payload for one submitted report
- **Authentication required:** Yes
- **Role access:** Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "student": {
      "name": "Manav Parihar",
      "email": "manav@siteonlab.com",
      "phone": "",
      "referenceId": "JS-7B89F113",
      "testName": "Complete Aptitude Test (500Q)",
      "submittedAt": "2026-04-05T02:00:00.000Z",
      "attemptLabel": "Attempt 1"
    },
    "summary": {
      "overallScore": 35,
      "maxScore": 100,
      "percentage": 35,
      "completedSections": 5,
      "totalSections": 5,
      "status": "Pending Approval"
    },
    "sectionBreakdown": [
      {
        "sectionId": 1,
        "title": "Personality Assessment",
        "score": 36,
        "maxScore": 100,
        "percentage": 36,
        "subsections": []
      }
    ]
  }
}
```

**Errors**

- `404` submission not found
- `500` failed to load submission detail

### PATCH `/api/v1/admin/results/:reportId/approve`

- **Description:** Approve and publish a report
- **Authentication required:** Yes
- **Role access:** Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "id": "67f0b7d7c85d5b7ed1f3a555",
    "status": "Published",
    "approvedAt": "2026-04-05T03:00:00.000Z"
  }
}
```

**Errors**

- `400` no generated result available
- `404` submission not found
- `500` failed to approve result

### GET `/api/v1/admin/results`

- **Description:** List approved/published results
- **Authentication required:** Yes
- **Role access:** Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": [
    {
      "id": "67f0b7d7c85d5b7ed1f3a555",
      "userId": "67f0b7d7c85d5b7ed1f3a333",
      "name": "Manav Parihar",
      "email": "manav@siteonlab.com",
      "initials": "MP",
      "type": "Complete Aptitude Test (500Q)",
      "date": "05 Apr 2026",
      "score": "35/100",
      "percentile": "65% profile strength",
      "rawResult": {
        "overallScore": 35
      }
    }
  ]
}
```

**Errors**

- `500` failed to load results

### DELETE `/api/v1/admin/results/:reportId`

- **Description:** Delete a result report
- **Authentication required:** Yes
- **Role access:** Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "id": "67f0b7d7c85d5b7ed1f3a555",
    "deleted": true
  }
}
```

**Errors**

- `404` submission not found
- `500` failed to delete result

### GET `/api/v1/admin/analytics`

- **Description:** Fetch aggregate admin analytics
- **Authentication required:** Yes
- **Role access:** Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "funnel": {
      "registered": 42,
      "started": 18,
      "completed": 12,
      "paid": 17,
      "counselling": 0
    },
    "completionData": [
      {
        "name": "Starter Package",
        "started": 8,
        "completed": 4
      }
    ],
    "revenueDistribution": [
      {
        "name": "Complete Aptitude Test (500Q)",
        "value": 45
      }
    ],
    "registrationTrend": [
      {
        "date": "Apr 2026",
        "value": 7
      }
    ],
    "careerPaths": [
      {
        "name": "Software Engineer",
        "value": 5
      }
    ],
    "performanceMetrics": [
      {
        "metric": "Avg. Score",
        "current": "47.2/100",
        "previous": "-",
        "change": "-",
        "trend": "up"
      }
    ]
  }
}
```

**Errors**

- `500` failed to load analytics

---

## Admin Configuration Endpoints

These routes are currently public in the router, though they are intended for admin use.

### GET `/api/v1/admin/config`

- **Description:** Fetch raw assessment configuration
- **Authentication required:** No (current implementation)
- **Role access:** Public / Intended Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "key": "default",
    "packages": [
      {
        "id": "starter",
        "title": "Starter Package",
        "amount": 1499,
        "sections": []
      }
    ]
  }
}
```

**Errors**

- `500` failed to load admin config

### POST `/api/v1/admin/packages`

- **Description:** Create a package in assessment config
- **Authentication required:** No (current implementation)
- **Role access:** Public / Intended Admin

**Request body**

```json
{
  "id": "new-package",
  "title": "New Package",
  "badge": "Recommended",
  "amount": 999,
  "features": ["Feature 1", "Feature 2"],
  "durationText": "60 minutes",
  "active": true,
  "sortOrder": 4,
  "sections": []
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "package": {
      "id": "new-package",
      "title": "New Package",
      "badge": "Recommended",
      "amount": 999,
      "sections": []
    }
  }
}
```

**Errors**

- `400` package id already exists
- `500` failed to create package

### PUT `/api/v1/admin/packages/:packageId`

- **Description:** Update package metadata
- **Authentication required:** No (current implementation)
- **Role access:** Public / Intended Admin

**Request body**

```json
{
  "title": "Updated Package Title",
  "badge": "Popular",
  "amount": 1299,
  "active": true
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "package": {
      "id": "new-package",
      "title": "Updated Package Title",
      "badge": "Popular",
      "amount": 1299,
      "sections": []
    }
  }
}
```

**Errors**

- `404` package not found
- `500` failed to update package

### DELETE `/api/v1/admin/packages/:packageId`

- **Description:** Delete a package from config
- **Authentication required:** No (current implementation)
- **Role access:** Public / Intended Admin
- **Request body:** None

**Response**

```json
{
  "success": true,
  "data": {
    "ok": true
  }
}
```

**Errors**

- `404` package not found
- `500` failed to delete package

### PUT `/api/v1/admin/packages/:packageId/sections`

- **Description:** Replace package sections
- **Authentication required:** No (current implementation)
- **Role access:** Public / Intended Admin

**Request body**

```json
{
  "sections": [
    {
      "sectionId": 1,
      "title": "Personality Assessment",
      "durationMinutes": 20,
      "enabled": true,
      "scoringType": "likert",
      "sheetCsvUrl": ""
    }
  ]
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "sections": [
      {
        "sectionId": 1,
        "title": "Personality Assessment",
        "durationMinutes": 20,
        "enabled": true,
        "scoringType": "likert",
        "sheetCsvUrl": "",
        "questions": []
      }
    ]
  }
}
```

**Errors**

- `400` sections array is required
- `404` package not found
- `500` failed to update sections

### POST `/api/v1/admin/packages/:packageId/sections/:sectionId/sync-google-sheet`

- **Description:** Pull a CSV and replace questions for a section
- **Authentication required:** No (current implementation)
- **Role access:** Public / Intended Admin

**Request body**

```json
{
  "csvUrl": "https://example.com/section-1.csv"
}
```

**Response**

```json
{
  "success": true,
  "data": {
    "section": {
      "sectionId": 1,
      "title": "Personality Assessment",
      "totalQuestions": 120
    }
  }
}
```

**Errors**

- `400` csvUrl is required
- `400` failed to fetch CSV / no questions parsed
- `404` package or section not found
- `500` failed to sync section
