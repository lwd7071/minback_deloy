# Sprint 5 handoff — Student Profile API

## Locked endpoint and privacy boundary

| Method | Endpoint | Success | Errors |
|---|---|---|---|
| GET | `/api/v1/student/profile` | `200 StudentProfileDto`, `Cache-Control: no-store` | `401 UNAUTHENTICATED`, `401 SESSION_EXPIRED`, `403 CREDENTIAL_CHANGE_REQUIRED`, safe `500` |

The route accepts no `studentId` or `classSectionId` from URL, query, or body. It calls `requireFullStudentSession()` first and passes only its `studentId` and `classSectionId` to the repository. A missing/scoped-out Student or ClassSection is treated as `401 SESSION_EXPIRED`, so the response does not disclose enrollment existence.

`StudentProfileDto` returns `{ student, classSection, progress, assignments }`. Each assignment is the locked Assignment DTO plus `evaluation: EvaluationDto | null`. Only `published` and `closed` Assignments in the session ClassSection are visible. Evaluations are queried once for the session Student and visible Assignment IDs; draft content and another Student's score/feedback cannot be mapped into the result.

## Progress

- `total`: visible `published|closed` Assignments.
- `completed`: visible assignments whose current Evaluation is `graded|returned`.
- With no visible Assignment: `{ completed: 0, total: 0, percentage: 0 }`.
- Otherwise `percentage = Math.round(completed / total * 100)`.

## Regression and fixtures

`test/integration/student-profile.integration.test.ts` covers no cookie, expired/revoked/credential-change sessions, Student/ClassSection isolation, same nickname in another class, draft exclusion, null/pending/returned Evaluation, safe envelope and no-store cache header. It creates only UUID/tagged synthetic Student, Assignment, Evaluation and StudentSession rows; `afterEach` deletes in dependency order and `afterAll` confirms recorded IDs no longer exist.

`src/server/services/student-profile-service.test.ts` covers the pure progress table: zero, pending, partial (2/3 = 67) and null Evaluation.

## Dev B integration and review

The existing Student Profile UI consumes this exact DTO; no Dev B UI contract was changed. On 2026-08-30, the product owner delegated the Dev B cross-review/self sign-off to Codex. The reviewer audit confirmed no browser-selected identity, session-first behavior, response privacy and DTO compatibility.

## Scope boundary

Academic history/STU-006 remains deferred and is not inferred by this endpoint.
