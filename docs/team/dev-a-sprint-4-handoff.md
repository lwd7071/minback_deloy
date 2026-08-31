# Sprint 4 handoff — Current Evaluation management

## Scope delivered

- Teacher-scoped current Evaluation list by Assignment and same-ClassSection upsert by Student.
- Teacher UI at `/teacher/evaluations` for ClassSection → Assignment → Student selection and score/feedback/status editing.
- Atomic EvaluationHistory through the existing PostgreSQL trigger, with authenticated Teacher attribution.
- Post-commit call to Dev B's locked `createEvaluationNotification` module; no call for identical payloads and Notification failure does not roll back an already committed Evaluation/history.

## Locked API contract

| Method | Endpoint | Success | Error behavior |
|---|---|---:|---|
| GET | `/api/v1/teacher/assignments/:assignmentId/evaluations` | `200 EvaluationWithStudentDto[]` | `401`, invalid UUID `400`, missing/concealed context `404` |
| PUT | `/api/v1/teacher/assignments/:assignmentId/students/:studentId/evaluation` | `200 EvaluationDto` | `401`, invalid Origin `403`, invalid UUID/input `400`, missing/concealed context `404` |
| GET | `/api/v1/teacher/evaluations/:evaluationId/history` | `200 EvaluationHistoryDto[]` | Existing Dev B contract; consumed unchanged by Sprint 4 |

## Validation and transaction rules

- `pending` permits `score=null`; `graded|returned` require a score.
- Score is `0..Assignment.maxScore` with at most one decimal place. Feedback is preserved as entered and limited to 5,000 characters.
- Student and Assignment must share one owned ClassSection. Cross-ClassSection and cross-Teacher contexts are concealed with `404`.
- Both current-Evaluation responses include `Cache-Control: no-store` because score and feedback are private Teacher data.
- The `(student_id, assignment_id)` unique constraint keeps one current Evaluation. Identical payloads return the current DTO without update, history or Notification.
- Real updates use the authenticated Supabase Teacher client; the database trigger stores old score/feedback/status and `changed_by=auth.uid()` in the same transaction.
- After commit, Dev A calls `createEvaluationNotification({ studentId, evaluationId, type, assignmentTitle })`. Dev B owns message/email behavior. Delivery failure is isolated from the committed Evaluation.

## Fixtures and verification

- `test/integration/evaluations.integration.test.ts` creates only synthetic Evaluation rows and one synthetic Student when it needs multiple rows. Each fixture is cleaned before and after the test; Evaluation deletion cascades to its history and Notifications.
- Targeted commands:

```text
npm test -- src/schemas/evaluation.test.ts src/server/services/evaluation-service.test.ts
npx vitest run --config vitest.integration.config.ts test/integration/evaluations.integration.test.ts
```

## Quality-gate evidence

| Check | Result |
|---|---|
| Clean setup | 1 reset; DB reset OK; Teacher auth 2/2 |
| Database tests/lint | 16/16 tests across 7 files; 0 schema errors |
| Health | Supabase OK; Teacher auth 2/2 |
| Targeted Evaluation tests | unit 5/5; integration 8/8 |
| Full suites (final gate) | unit 42/42 across 12 files; integration 59/59 across 8 files; no `EADDRINUSE` |
| Static/build | typecheck pass; build pass; `git diff --check` pass |
| Lint | 0 errors; 7 pre-existing warnings in Student modules outside A4 |
| Format | repository-wide `npm run format:check` pass after authorized release formatting |
| Audit | 0 vulnerabilities across 662 dependencies at verification time |

The integration regression covers empty/multiple lists, invalid/missing IDs, unauthenticated, cross-Teacher, cross-ClassSection, wrong-Origin, input boundaries, history attribution and Notification no-op/failure isolation. Service tests prove a failed Evaluation write does not call Notification; Dev B policy/delivery tests cover email-disabled, missing-email and delivery-failure handling. Fixture cleanup runs before and after each test, and an `afterAll` assertion proves no A4 synthetic Student or Evaluation remains.

## Remaining risks and blockers

- The existing EvaluationHistory endpoint is owned by Dev B and was consumed without changing its contract.
- The 7 lint warnings in Dev B Student UI are tracked in the Sprint 6 handoff; they are warnings, not release-blocking lint errors.

## Review status

The executable A4 regression and final repository gate pass. On 2026-08-30 the product owner delegated Dev B cross-review/self sign-off to Codex; the Evaluation DTO/privacy and Notification boundary were reviewer-audited against the locked contracts. A4.6 is complete.
