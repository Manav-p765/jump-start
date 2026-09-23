# Database Schema

This document describes the current MongoDB schema used by Jumpstride.

## 1. Overview of Database Design

Jumpstride uses a **small-collection, embedded-document** design.

Current characteristics:

- only two top-level MongoDB collections are defined in the codebase
- most operational data is embedded inside the `users` collection
- package definitions and question banks live in a single configuration document
- report history is stored inside each user document instead of a separate results collection

This keeps reads simple for:

- dashboard data
- result history
- admin review flows
- package ownership checks

It also means large user documents can grow over time as result history increases.

## 2. Collections List

Current collections:

- `users`
- `assessmentconfigs`

There are **no separate collections** yet for:

- payments
- semesters
- teachers
- reports/results
- notifications

Those concepts are currently either embedded in `users` or not yet implemented as first-class persistence models.

## 3. Schema for Each Collection

## Collection: `users`

Purpose:

- authentication
- profile storage
- role/access control
- package ownership
- live test progress
- result snapshot
- historical report storage

### Top-level fields

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | MongoDB default primary key |
| `name` | `String` | Required |
| `email` | `String` | Required, unique, lowercase |
| `password` | `String \| null` | Hashed with bcrypt, null for Google-only users |
| `mobile` | `String` | Optional |
| `city` | `String` | Optional |
| `dateOfBirth` | `String` | Optional |
| `schoolName` | `String` | Optional |
| `schoolLocation` | `String` | Optional |
| `residentialAddress` | `String` | Optional |
| `googleId` | `String \| null` | Sparse field for Google login linkage |
| `avatar` | `String \| null` | Optional profile image URL |
| `subscription` | `String` | Enum: `Basic`, `Standard`, `Premium` |
| `role` | `String` | Enum: `user`, `admin` |
| `isSuspended` | `Boolean` | Account status |
| `lastLoginAt` | `Date \| null` | Last successful login |
| `selectedPackageId` | `String` | Logical reference to chosen package |
| `purchasedPackages` | `String[]` | Logical references to owned packages |
| `testsCompleted` | `Number` | Dashboard counter |
| `testsInProgress` | `Number` | Dashboard counter |
| `reportsReady` | `Number` | Dashboard counter |
| `counsellingSessions` | `Number` | Dashboard counter |
| `availableTests` | `Array<Object>` | Simplified dashboard test summary |
| `topCareers` | `Array<Object>` | Dashboard career summary |
| `resultProfile` | `Object` | Latest result snapshot |
| `resultPublication` | `Object` | Latest result publication state |
| `assessmentReports` | `Array<Object>` | Historical report list by package/attempt |
| `testProgress` | `Object` | Live/resumable test state |
| `createdAt` | `Date` | Added by Mongoose timestamps |
| `updatedAt` | `Date` | Added by Mongoose timestamps |

### Embedded object: `availableTests[]`

| Field | Type | Notes |
|---|---|---|
| `title` | `String` | Required |
| `durationMinutes` | `Number` | Default `180` |
| `totalQuestions` | `Number` | Default `50` |
| `status` | `String` | Enum: `not_started`, `in_progress`, `completed` |

### Embedded object: `topCareers[]`

| Field | Type | Notes |
|---|---|---|
| `title` | `String` | Required |
| `matchPercent` | `Number` | Required |

### Embedded object: `testProgress`

| Field | Type | Notes |
|---|---|---|
| `sectionId` | `Number` | Current section |
| `questionIndex` | `Number` | Current question index |
| `answers` | `Mixed/Object` | Answer map such as `1-0: 4` |
| `completedSectionIds` | `Number[]` | Section completion list |
| `timeRemainingSeconds` | `Number \| null` | Countdown state |
| `updatedAt` | `Date \| null` | Last progress save |

### Embedded object: `resultPublication`

| Field | Type | Notes |
|---|---|---|
| `status` | `String` | Enum: `not_submitted`, `pending_approval`, `approved` |
| `submittedAt` | `Date \| null` | Submission timestamp |
| `approvedAt` | `Date \| null` | Approval timestamp |
| `approvedByName` | `String` | Admin display name |

### Embedded object: `resultProfile`

This is the latest result snapshot kept for backward compatibility and quick dashboard access.

| Field | Type | Notes |
|---|---|---|
| `overallScore` | `Number \| null` | Overall score |
| `overallPercentile` | `String` | Display percentile text |
| `completedTestsCount` | `Number` | Count in the profile snapshot |
| `totalTestsCount` | `Number` | Count in the profile snapshot |
| `careerPathwaysCount` | `Number` | Number of suggested career paths |
| `testResults` | `Array<Object>` | Per-test/per-section summary |
| `sectionBreakdown` | `Array<Object>` | Full score breakdown |
| `strengths` | `Array<Object>` | Strength cards |
| `careerRecommendations` | `Array<Object>` | Career recommendation cards |
| `personalityType` | `Object` | Personality result summary |
| `reviewSummary` | `Object` | Summary notes/observations |
| `metadata` | `Object` | Algorithm metadata |

### Embedded object: `assessmentReports[]`

This is the scalable multi-attempt result history.

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | Auto-generated subdocument id |
| `packageId` | `String` | Logical package reference |
| `packageTitle` | `String` | Package display title |
| `attemptNumber` | `Number` | Attempt sequence |
| `profile` | `Object` | Same shape as `resultProfile` |
| `publication` | `Object` | Same shape as `resultPublication` |
| `createdAt` | `Date \| null` | Report creation time |
| `updatedAt` | `Date \| null` | Report update time |

### Embedded object: `sectionBreakdown[]`

Used inside both `resultProfile` and `assessmentReports[].profile`.

| Field | Type | Notes |
|---|---|---|
| `sectionId` | `Number \| null` | Numeric section identifier |
| `title` | `String` | Section title |
| `score` | `Number \| null` | Section score |
| `maxScore` | `Number \| null` | Section max |
| `average` | `Number \| null` | Average for likert/profile sections |
| `percentage` | `Number \| null` | Percentage score |
| `answeredCount` | `Number \| null` | Questions answered |
| `totalQuestions` | `Number \| null` | Total question count |
| `status` | `String` | Section status |
| `interpretation` | `String` | Human-readable interpretation |
| `careerImplication` | `String` | Additional interpretation text |
| `scoringType` | `String` | `likert`, `objective`, `mixed`, etc. |
| `answerType` | `String` | Answer model |
| `scoreType` | `String` | e.g. average/raw |
| `questionNumbers` | `Number[]` | Source question numbers |
| `questionRangeLabel` | `String` | Display range label |
| `subsections` | `Array<Object>` | Subsection breakdown |

### Embedded object: `subsections[]`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | Optional id |
| `key` | `String` | Stable programmatic key |
| `label` | `String` | Display label |
| `score` | `Number \| null` | Subsection score |
| `rawScore` | `Number \| null` | Raw value |
| `maxScore` | `Number \| null` | Subsection max |
| `average` | `Number \| null` | Average score |
| `percentage` | `Number \| null` | Percentage |
| `band` | `String` | Score band label |
| `status` | `String` | Status such as `completed` or `review_required` |
| `description` | `String` | Supporting text |
| `interpretation` | `String` | Human-readable interpretation |
| `careerImplication` | `String` | Optional impact text |
| `answerType` | `String` | Answer model |
| `scoreType` | `String` | Score representation |
| `questionNumbers` | `Number[]` | Question list |
| `questionRangeLabel` | `String` | Display range label |
| `factorResults` | `Array<Object>` | Optional deeper factor-level results |

### Embedded object: `testResults[]`

| Field | Type | Notes |
|---|---|---|
| `testName` | `String` | Test/package title |
| `sectionName` | `String` | Section title |
| `sectionId` | `Number \| null` | Section id |
| `completedAt` | `Date \| null` | Completion timestamp |
| `score` | `Number \| null` | Score |
| `maxScore` | `Number \| null` | Max score |
| `reportUrl` | `String` | Optional URL |
| `interpretation` | `String` | Result text |

### Embedded object: `strengths[]`

| Field | Type | Notes |
|---|---|---|
| `name` | `String` | Strength title |
| `value` | `Number \| null` | Display value |
| `desc` | `String` | Description |

### Embedded object: `careerRecommendations[]`

| Field | Type | Notes |
|---|---|---|
| `title` | `String` | Career title |
| `matchPercent` | `Number \| null` | Match score |
| `description` | `String` | Description |
| `skills` | `String[]` | Skill tags |
| `salaryRange` | `String` | Display salary text |
| `link` | `String` | Detail route/url |

### Embedded object: `personalityType`

| Field | Type | Notes |
|---|---|---|
| `code` | `String` | e.g. `ISTP-T` |
| `title` | `String` | Human-readable title |
| `description` | `String` | Description |
| `traits` | `Array<Object>` | Trait name/value pairs |

### Embedded object: `reviewSummary`

| Field | Type | Notes |
|---|---|---|
| `statusLabel` | `String` | Summary status |
| `strongestSignals` | `String[]` | Top signals |
| `topCareerTitles` | `String[]` | Top career titles |
| `observations` | `String[]` | Summary notes |

### Embedded object: `metadata`

| Field | Type | Notes |
|---|---|---|
| `algorithmKey` | `String` | Scoring algorithm id |
| `overallMaxScore` | `Number \| null` | Max possible score |
| `packageId` | `String` | Source package id |
| `scoringGuideSources` | `String[]` | Source files used |
| `ambiguityNotes` | `String[]` | Known scoring caveats |

## Collection: `assessmentconfigs`

Purpose:

- store the global assessment/package configuration
- define packages, sections, and question banks

### Top-level fields

| Field | Type | Notes |
|---|---|---|
| `_id` | `ObjectId` | MongoDB default primary key |
| `key` | `String` | Required, unique, usually `default` |
| `packages` | `Array<Object>` | Full package definitions |
| `createdAt` | `Date` | Added by Mongoose timestamps |
| `updatedAt` | `Date` | Added by Mongoose timestamps |

### Embedded object: `packages[]`

| Field | Type | Notes |
|---|---|---|
| `id` | `String` | Required package id |
| `title` | `String` | Required title |
| `badge` | `String` | Display badge |
| `amount` | `Number` | Required price |
| `strikeAmount` | `Number \| null` | Optional compare-at price |
| `features` | `String[]` | Marketing/features list |
| `durationText` | `String` | Display duration |
| `active` | `Boolean` | Whether package is visible/usable |
| `sortOrder` | `Number` | Listing order |
| `sections` | `Array<Object>` | Section definitions |

### Embedded object: `sections[]`

| Field | Type | Notes |
|---|---|---|
| `sectionId` | `Number` | Required numeric section id |
| `title` | `String` | Required section title |
| `durationMinutes` | `Number` | Expected duration |
| `enabled` | `Boolean` | Section visibility |
| `scoringType` | `String` | Enum: `likert`, `objective`, `mixed` |
| `sheetCsvUrl` | `String` | Optional admin CSV source |
| `questions` | `Array<Object>` | Full question bank |

### Embedded object: `questions[]`

| Field | Type | Notes |
|---|---|---|
| `questionId` | `String` | Source question identifier |
| `text` | `String` | Required question text |
| `type` | `String` | Enum: `likert`, `single` |
| `options` | `String[]` | Answer options |
| `correctOption` | `String` | Objective answer key |
| `reverseScored` | `Boolean` | Reverse-scoring flag |
| `weight` | `Number` | Weighting factor |
| `subscale` | `String` | Personality/subscale metadata |
| `notes` | `String` | Additional metadata |

## 4. Relationships Between Collections

The current design uses **logical references**, not MongoDB foreign keys.

### Relationship: `users` → `assessmentconfigs.packages`

Used through string ids:

- `users.selectedPackageId`
- `users.purchasedPackages[]`
- `users.assessmentReports[].packageId`
- `users.resultProfile.metadata.packageId`

These all reference:

- `assessmentconfigs.packages[].id`

### Relationship direction

- one `assessmentconfigs` document holds many packages
- many users can reference the same package ids
- one user can have many embedded `assessmentReports`

### No direct collection joins

The application resolves package relationships in application code rather than MongoDB joins.

## 5. Sample Documents

## Sample `users` document

```json
{
  "_id": "67f0b7d7c85d5b7ed1f3a333",
  "name": "Manav Parihar",
  "email": "manav@siteonlab.com",
  "password": "$2a$12$hashed-value",
  "mobile": "9876543210",
  "city": "Jaipur",
  "dateOfBirth": "",
  "schoolName": "ABC School",
  "schoolLocation": "Jaipur",
  "residentialAddress": "",
  "googleId": null,
  "avatar": null,
  "subscription": "Basic",
  "role": "admin",
  "isSuspended": false,
  "lastLoginAt": "2026-04-05T05:20:31.000Z",
  "selectedPackageId": "complete-aptitude-500q",
  "purchasedPackages": ["dummy-test", "complete-aptitude-500q"],
  "testsCompleted": 2,
  "testsInProgress": 0,
  "reportsReady": 2,
  "counsellingSessions": 0,
  "topCareers": [
    {
      "title": "Software Engineer",
      "matchPercent": 69
    }
  ],
  "resultPublication": {
    "status": "approved",
    "submittedAt": "2026-04-05T02:00:00.000Z",
    "approvedAt": "2026-04-05T03:00:00.000Z",
    "approvedByName": "Jumpstart Admin"
  },
  "resultProfile": {
    "overallScore": 35,
    "overallPercentile": "Top 65% profile strength",
    "careerPathwaysCount": 6,
    "strengths": [
      {
        "name": "Analytical Thinking",
        "value": 33,
        "desc": "Comfort with structured problem solving."
      }
    ]
  },
  "assessmentReports": [
    {
      "_id": "67f0b7d7c85d5b7ed1f3a444",
      "packageId": "complete-aptitude-500q",
      "packageTitle": "Complete Aptitude Test (500Q)",
      "attemptNumber": 1,
      "publication": {
        "status": "approved",
        "submittedAt": "2026-04-05T02:00:00.000Z",
        "approvedAt": "2026-04-05T03:00:00.000Z",
        "approvedByName": "Jumpstart Admin"
      },
      "profile": {
        "overallScore": 35,
        "metadata": {
          "algorithmKey": "career-500q-v1",
          "packageId": "complete-aptitude-500q"
        }
      }
    }
  ],
  "testProgress": {
    "sectionId": 1,
    "questionIndex": 0,
    "answers": {},
    "completedSectionIds": [],
    "timeRemainingSeconds": null,
    "updatedAt": null
  },
  "createdAt": "2026-04-01T12:00:00.000Z",
  "updatedAt": "2026-04-05T05:20:31.000Z"
}
```

## Sample `assessmentconfigs` document

```json
{
  "_id": "67f0b7d7c85d5b7ed1f3b111",
  "key": "default",
  "packages": [
    {
      "id": "dummy-test",
      "title": "Dummy Test",
      "badge": "Quick Test",
      "amount": 0,
      "strikeAmount": null,
      "features": [
        "3 quick sections",
        "1 question per section",
        "Fast end-to-end result testing"
      ],
      "durationText": "3-minute dummy assessment",
      "active": true,
      "sortOrder": 2,
      "sections": [
        {
          "sectionId": 1,
          "title": "Personality Assessment",
          "durationMinutes": 1,
          "enabled": true,
          "scoringType": "likert",
          "sheetCsvUrl": "",
          "questions": [
            {
              "questionId": "1",
              "text": "I enjoy taking initiative when working with others.",
              "type": "likert",
              "options": [],
              "correctOption": "",
              "reverseScored": false,
              "weight": 1,
              "subscale": "",
              "notes": ""
            }
          ]
        }
      ]
    }
  ],
  "createdAt": "2026-04-01T12:00:00.000Z",
  "updatedAt": "2026-04-05T05:20:31.000Z"
}
```

## 6. Indexing

Current indexes defined by schema options:

### `users`

- `_id`
  MongoDB default primary index

- `email`
  Unique index from:

  ```js
  email: { type: String, required: true, unique: true, lowercase: true, trim: true }
  ```

- `googleId`
  Sparse index from:

  ```js
  googleId: { type: String, sparse: true, default: null }
  ```

### `assessmentconfigs`

- `_id`
  MongoDB default primary index

- `key`
  Unique index from:

  ```js
  key: { type: String, required: true, unique: true, default: "default" }
  ```

## Indexing implications

What current indexes help with:

- fast lookup by email during login
- unique account enforcement by email
- lookup by config key for the default config document
- optional Google account linking by `googleId`

What is not indexed yet:

- `selectedPackageId`
- `purchasedPackages`
- `assessmentReports.packageId`
- `role`
- `resultPublication.status`

Those may become worth indexing if:

- user volume grows significantly
- admin queries become slower
- report filtering becomes a bottleneck

## Summary

The current database is intentionally simple:

- `users` stores most operational state
- `assessmentconfigs` stores package and question definitions
- relationships are handled in application code through package ids

This design is easy to work with for the current app size, but if payment, semester, teacher, or notification features expand, additional dedicated collections will likely be needed.
