# Contributing

This document defines how code changes should be proposed, reviewed, and merged in Jumpstride.

The goal is to keep changes safe, readable, and easy to review.

## 1. How to Contribute

Use this workflow for all code changes:

1. Sync from the latest `main`
2. Create a new branch
3. Make a focused change
4. Run the relevant checks locally
5. Open a pull request
6. Address review comments
7. Merge only after approval

Basic flow:

```bash
git checkout main
git pull
git checkout -b <new-branch-name>
```

Before opening a PR, at minimum run:

```bash
cd backend
npm run smoke:career-500q

cd ../frontend
npm run lint
npm run build
```

Do not:

- push directly to `main`
- mix unrelated changes in one branch
- open a PR without running local checks

## 2. Branch Naming Conventions

Branch names must be short, descriptive, and scoped by change type.

Use one of these prefixes:

- `feature/`
- `fix/`
- `refactor/`
- `docs/`
- `chore/`
- `hotfix/`

Format:

```text
<type>/<short-kebab-case-description>
```

Examples:

- `feature/admin-review-flow`
- `fix/result-score-aggregation`
- `refactor/report-section-components`
- `docs/update-api-reference`
- `chore/cleanup-root-docs`

Rules:

- use lowercase only
- use hyphens, not spaces or underscores
- keep branch names under reasonable length
- one branch should solve one problem

## 3. Commit Message Format

Commits must be readable and consistent.

Format:

```text
<type>: <short summary>
```

Allowed types:

- `feat`
- `fix`
- `refactor`
- `docs`
- `test`
- `chore`

Examples:

- `feat: add admin result review detail page`
- `fix: correct results overall score aggregation`
- `refactor: move scoring reference assets into backend reference folder`
- `docs: add deployment guide`

Rules:

- use present tense
- keep the first line concise
- describe what changed, not what you intended
- do not use vague messages like `update`, `changes`, or `fix stuff`

## 4. Pull Request Guidelines

Every PR must be small enough to review safely.

### PR title

Use the same format as commit messages:

```text
fix: correct report status handling on result page
```

### PR description must include

- what changed
- why the change was needed
- affected areas
- local checks run
- screenshots for UI changes
- migration or env changes if applicable

Suggested PR template:

```text
## Summary
- 

## Why
- 

## Affected Areas
- frontend
- backend

## Validation
- [ ] backend smoke test
- [ ] frontend lint
- [ ] frontend build

## Screenshots
- if applicable

## Notes
- any env, seed, or deployment impact
```

### PR scope rules

- one PR should solve one issue or one tightly related set of issues
- separate refactors from feature work where possible
- avoid mixing docs-only cleanup with logic changes unless directly related

Do not open a PR if:

- build is failing
- smoke checks were not run
- the branch contains unrelated edits

## 5. Code Style Rules

Follow the existing project patterns.

### General

- do not change working logic unless the task requires it
- prefer small, explicit functions over hidden behavior
- keep imports organized and remove dead imports
- avoid large copy-pasted blocks
- keep file names and component names consistent with existing naming

### Frontend

- use existing route/layout/component structure
- keep reusable UI in `frontend/src/components`
- keep route pages in `frontend/src/pages`
- use the shared API client where applicable
- preserve current UX and routing unless intentionally changing behavior

### Backend

- keep route definitions thin
- keep business logic in controllers and utils
- reuse shared scoring/report utilities where possible
- validate request input explicitly
- return consistent JSON response shapes

### Environment and config

- never commit real secrets
- if a new env variable is required, update:
  - `.env.example`
  - setup/deployment documentation
- if a new script is added, document it where relevant

### Cleanup

- remove dead files only when you have verified they are unused
- if files are moved, update imports and documentation in the same change
- do not leave placeholder files or TODO-only code in production paths

## 6. Review Process

All changes should be reviewed before merge.

### Reviewer focus

Reviewers should check:

- correctness
- regression risk
- route/auth impact
- data model impact
- UI consistency
- production readiness

### Author responsibilities

Before requesting review:

- self-review the diff
- remove debug logs unless intentionally useful
- confirm no unrelated files are included
- confirm docs/env updates are included if needed

### Review outcomes

- `Approved`
  Ready to merge
- `Changes requested`
  Must be addressed before merge
- `Commented`
  Non-blocking feedback or questions

### Merge rules

Merge only when:

- required checks passed
- review comments are resolved
- at least one reviewer has approved

Do not merge when:

- there are unresolved review comments
- build or smoke checks are failing
- the branch is clearly behind and conflicts with the current target behavior

## 7. Recommended Local Validation Checklist

Use this before every PR:

```bash
cd backend
npm run smoke:career-500q

cd ../frontend
npm run lint
npm run build
```

For auth, result, admin, or package changes, also verify manually:

- login flow
- protected routes
- package/test listing
- result page
- admin page affected by the change

## 8. Collaboration Rules

- assume other developers are working in parallel
- do not rewrite unrelated files without reason
- do not revert someone else’s work unless explicitly agreed
- raise schema, auth, or deployment-impacting changes early in the PR
- prefer clear tradeoffs over silent assumptions

If a change affects:

- environment variables
- database shape
- auth rules
- deployment behavior

then document that explicitly in the PR description.
