# Sprint 3 handoff — Assignment management

## Scope delivered

- Teacher-scoped Assignment list/create by ClassSection, plus read/update/delete by Assignment ID.
- Teacher management UI at `/teacher/assignments` and `/teacher/assignments/:assignmentId`.
- API and privacy regression tests use synthetic Assignment/Evaluation data and remove it in the same test.

## Locked API contract

| Method | Endpoint | Success | Error behavior |
|---|---|---:|---|
| GET | `/api/v1/teacher/class-sections/:classSectionId/assignments` | `200 AssignmentDto[]` | `401`, owned-context-hidden `404`, invalid UUID `400` |
| POST | `/api/v1/teacher/class-sections/:classSectionId/assignments` | `201 AssignmentDto` | `401`, `403` invalid Origin, `404`, `400 VALIDATION_ERROR` |
| GET | `/api/v1/teacher/assignments/:assignmentId` | `200 AssignmentDto` | `401`, concealed `404`, invalid UUID `400` |
| PATCH | `/api/v1/teacher/assignments/:assignmentId` | `200 AssignmentDto` | `401`, `403` invalid Origin, `404`, `400 VALIDATION_ERROR` / `INVALID_STATE_TRANSITION` |
| DELETE | `/api/v1/teacher/assignments/:assignmentId` | `204` | `401`, `403` invalid Origin, concealed `404`, `409 CONFLICT` |

`AssignmentDto` is locked: `id`, `classSectionId`, `title`, `description`, `assignedDate`, `dueDate`, `status`, `maxScore`, `createdAt`, `updatedAt`.

## Business and privacy rules

- Title: trim, 1–200 characters. Description: maximum 10,000 characters.
- `dueDate >= assignedDate`; `maxScore` is 0.1–999.9 with at most one decimal place.
- New Assignment defaults to `draft` and `maxScore=10`.
- Allowed status changes: unchanged; `draft → published`; `published → closed`; `closed → published`. No transition to `draft` from another status.
- Only an owned `draft` with no Evaluation may be deleted. Published/closed Assignments and any Assignment with an Evaluation return `409`.
- Every mutation requires both authenticated Teacher context and same Origin. An Assignment/ClassSection belonging to another Teacher is always concealed by `404`; no raw Supabase/database errors are returned.
- Assignment lists sort by `assignedDate desc, createdAt desc`.

## Verification commands

```text
npm run test:setup       # exactly once for a clean local Supabase state when running full gate
npm run test:health
npm test
npm run test:integration -- test/integration/assignments.integration.test.ts
npm run test:integration
npm run typecheck
npm run build
```

## Review status

Clean-state verification on 2026-08-30:

- `npm run test:setup`: pass once; DB reset and Teacher A/B authentication successful.
- `npm run db:test`: 16/16 pass across 7 SQL files. `npm run db:lint` and `npm run test:health`: pass.
- Assignment unit tests: 3/3 pass. Assignment API/privacy integration: 10/10 pass. Full integration: 43/43 pass across 5 files, clean exit/no `EADDRINUSE`.
- `npm run typecheck`, `npm test` (33/33), `npm run lint` (0 errors; 7 existing Student-scope warnings), `npm run build`, `git diff --check`: pass.
- All Sprint 3 files pass targeted Prettier. Repository-wide `npm run format:check` fails on 90 pre-existing shared/Student/Dev B files, outside Assignment scope; it must be resolved before the full quality-gate checkbox can close.

Dev B must still review the DTO/API and direct negative privacy behavior before Sprint 3 is marked done.
