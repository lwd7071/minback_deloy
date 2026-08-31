# Sprint 6 handoff — Hardening and release gate

## Performance baseline and measured fix

Run `npm run benchmark:local` with Supabase local running. The script starts an isolated Next server, imports 2,000 synthetic CSV rows, measures ClassSection pagination, Assignment/Evaluation list and Profile aggregation, then deletes its ClassSection, Students, Assignment and StudentSession.

2026-08-30 baseline (local machine; informational, no fixed SLA):

| Path | Elapsed |
|---|---:|
| 2,000-row import | 46,041.76 ms |
| ClassSection page | 195.78 ms |
| Assignment list | 240.38 ms |
| Evaluation list | 1,417.57 ms |
| Student Profile | 330.97 ms |

The initial benchmark reproduced a real `IMPORT_STUDENT_LOOKUP_FAILED`: one PostgREST `in(mssv, 2,000 values)` request exceeded the reliable request size. `findImportedStudentsByMssv` now queries batches of 100 MSSVs, keeping results scoped to the ClassSection. The same 2,000-row benchmark then passed.

`EXPLAIN (ANALYZE, BUFFERS)` for current local seed data showed sequential scans of 0.032–0.136 ms using 1–4 buffers. This does not prove an index bottleneck, so no speculative schema migration/index was added. Re-measure after production-like cardinality before changing schema.

## Core workflow regression

`test/integration/core-workflow.integration.test.ts` creates and cleans its own synthetic records and verifies:

1. Teacher imports a Student into an owned ClassSection.
2. Teacher creates then publishes an Assignment and records a returned Evaluation with feedback.
3. Student login is credential-change-only until credentials are changed.
4. A full Student session reads only its own Profile, Evaluation/feedback and progress (1/2 = 50).

The full integration suite also covers wrong Origin, Teacher ownership concealment, Student isolation, import limits/partial success, Assignment transitions, Evaluation history and Notification failure isolation. Expected errors do not emit debug logs. All integration fixtures are synthetic and clean their rows in the test that created them.

## Final release gate — 2026-08-30

| Command | Result |
|---|---|
| `npm run test:setup` | one clean reset; DB and Teacher A/B auth OK |
| `npm run db:test` | 16/16 across 7 SQL files |
| `npm run db:lint` | 0 schema errors |
| `npm run test:health` | Supabase + Teacher A/B auth OK |
| `npm run format:check` | pass |
| `npm run lint` | 0 errors, 7 existing Dev B Student UI warnings |
| `npm run typecheck` | pass |
| `npm test` | 42/42 across 12 files |
| `npm run test:integration` | 59/59 across 8 files; clean exit, no `EADDRINUSE` |
| `npm run build` | pass |
| `npm audit` | 0 vulnerabilities across 662 dependencies |
| `git diff --check` | pass |

## Accepted risks and self sign-off

- The 7 lint warnings are existing Dev B Student UI navigation/unused-variable warnings; no lint errors exist. They are assigned external cleanup rather than silently changed in a Dev A backend release task.
- The prior `exceljs@4.4.0 → uuid@8.3.2` advisory analysis remains documented in the Sprint 2 handoff: XLSX loading does not reach the affected `uuid` buffer path; monitor upstream replacement. Current `npm audit` reports zero vulnerabilities.
- Product owner explicitly authorized repository-wide formatting and delegated Dev B cross-review/self sign-off to Codex on 2026-08-30. Reviewer audit covered DTOs, session/Teacher scope, private caching, error envelopes, schema/history, API routes, fixture cleanup and Dev B boundaries for A4–A6. No contract change was required.
