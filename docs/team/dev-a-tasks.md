# MinBack — Dev A Task Checklist

Contract: `docs/team/dev-a-assignment.md`. TDD workflow: one observable behavior per RED → GREEN cycle. UI remains scaffolded until the backend phase is complete.

## Sprint 0 — Database foundation

- [x] A0.1 — Supabase CLI, Docker local and project config
  - [x] RED: local Supabase command proves the project is not configured yet
  - [x] GREEN: local stack starts from repository config
  - [x] REFACTOR: scripts and configuration have no duplication or secrets
  - [x] VERIFY: CLI status is healthy
- [x] A0.2 — MVP table migration, excluding Rubric tables
  - [x] RED: schema test cannot find the required MVP tables
  - [x] GREEN: migration creates exactly the required MVP tables
  - [x] REFACTOR: common defaults and naming are consistent
  - [x] VERIFY: schema test passes after database reset
- [x] A0.3 — Foreign keys, unique/check constraints and timestamps
  - [x] RED: invalid rows are accepted or timestamp behavior is absent
  - [x] GREEN: database rejects invalid rows and maintains timestamps
  - [x] REFACTOR: shared trigger logic is centralized
  - [x] VERIFY: constraint tests pass
- [x] A0.4 — Evaluation class/score invariants and atomic history
  - [x] RED: cross-class/over-max Evaluation or history omission is observable
  - [x] GREEN: triggers enforce the invariants and record old values atomically
  - [x] REFACTOR: trigger functions expose a small database interface
  - [x] VERIFY: Evaluation behavior tests pass
- [x] A0.5 — Grants and RLS
  - [x] RED: anon or Teacher B can access rows outside its context
  - [x] GREEN: policies permit only the correct Teacher context
  - [x] REFACTOR: helper predicates remove policy duplication where safe
  - [x] VERIFY: role-isolation tests pass
- [x] A0.6 — Three-layer Student rate-limit schema
  - [x] RED: schema cannot represent Student, identifier and IP lock state safely
  - [x] GREEN: constraints/indexes support atomic counters and expiry
  - [x] REFACTOR: security-sensitive fields and comments are explicit
  - [x] VERIFY: schema/constraint tests pass
- [x] A0.7 — Local/test seed
  - [x] RED: core local workflow has no deterministic test records
  - [x] GREEN: seed creates synthetic Teacher A/B and isolated class data
  - [x] REFACTOR: seed is repeatable and contains no real credentials/data
  - [x] VERIFY: repeated database reset succeeds
- [x] A0.8 — pgTAP/SQL integration suite
  - [x] RED: each required behavior is first observed failing in its vertical slice
  - [x] GREEN: all schema, trigger and RLS behavior tests pass
  - [x] REFACTOR: fixture duplication reviewed; no production-facing test helper introduced
  - [x] VERIFY: full local database test suite passes after reset
- [x] A0.9 — Sprint 0 quality gate and report
  - [x] RED: any failing project/database check blocks completion
  - [x] GREEN: all required checks pass
  - [x] REFACTOR: docs reflect the implemented schema without duplication
  - [x] VERIFY: format, lint, typecheck, Vitest, build and database reset pass

## Sprint 1 — Teacher authentication backend

- [x] A1.1 — Teacher login API through Supabase Auth SSR
- [x] A1.2 — Current Teacher API and Auth-to-Teacher mapping
- [x] A1.3 — Logout and session invalidation
- [x] A1.4 — `requireTeacher` and protected Teacher boundaries
- [x] A1.5 — Auth and Teacher-isolation integration tests

### Sprint 1 verification note

- Implementation hiện có trong `src/server/auth/teacher-auth.ts`, các Teacher auth route/layout và `test/integration/teacher-auth.integration.test.ts`.
- `npm run typecheck` đã pass sau khi cài các dependency theo `package-lock.json`.
- Sau khi khởi động Docker/Supabase local, làm sạch Next test server ở port 3099 và chạy `npx supabase db reset`, `npm run test:integration` đã chạy đủ 12 test: 8 pass, 4 fail. Bốn test login hợp lệ thất bại với `401 INVALID_CREDENTIALS` vì BCrypt hash của Teacher A/B trong `supabase/seed.sql` không khớp với mật khẩu demo mà test sử dụng; cần sửa seed rồi chạy lại suite.
- Review còn cần xử lý trước khi coi Sprint 1 đạt Definition of Done: xóa debug logging trong Teacher login route và làm cho test Origin thiếu header assert đúng `403` thay vì chấp nhận cả `200`.

## Sprint 2 — Class Section and import backend

All slices are **AFK** because the API, validation, ownership and import behavior are locked in `docs/team/dev-a-assignment.md`. Implement in dependency order; a task is complete only when all RED, GREEN, REFACTOR and VERIFY checks below are complete.

- [x] A2.1 — List and create Teacher-scoped ClassSections
  - Type: AFK
  - Blocked by: Sprint 1 Teacher auth quality gate
  - Covers: CLS-001, Teacher ClassSection context, paginated `GET/POST /api/v1/teacher/class-sections`
  - [x] RED: API tests prove unauthenticated access, invalid pagination/input and duplicate code are rejected; Teacher A cannot observe Teacher B rows
  - [x] GREEN: implement Zod schemas, service/repository, DTO mapping and list/create route behavior with `createdAt desc`, `201` on create and standard envelopes
  - [x] GREEN: connect the Teacher ClassSection page to list/create behavior with loading, empty, validation and conflict states
  - [x] REFACTOR: centralize ClassSection validation, pagination and database-error mapping without leaking raw Supabase errors
  - [x] VERIFY: unit/API tests pass for success, `400`, `401`, `404/403` privacy behavior and `409` duplicate code

- [x] A2.2 — Read, update and safely delete one ClassSection
  - Type: AFK
  - Blocked by: A2.1
  - Covers: CLS-002, Teacher-scoped `GET/PATCH/DELETE /api/v1/teacher/class-sections/:classSectionId`
  - [x] RED: API tests prove invalid UUID/body, missing resource, cross-Teacher access and deletion of a class containing Student/Assignment are rejected
  - [x] GREEN: implement detail/update/delete through route → auth/context → service → repository, returning `204` only for an unused class and `409` otherwise
  - [x] GREEN: connect Teacher detail/edit/delete interactions without exposing or accepting `teacherId` from the browser
  - [x] REFACTOR: reuse A2.1 DTO/schema/error helpers and keep authorization before business mutation
  - [x] VERIFY: integration tests cover happy path, unchanged update, duplicate code, wrong Teacher context, not found and delete conflict

- [x] A2.3 — Import a valid CSV and disclose initial credentials once
  - Type: AFK
  - Blocked by: A2.1
  - Covers: CLS-003, BRULE-005, BRULE-010, `POST /api/v1/teacher/class-sections/:classSectionId/import`
  - [x] RED: tests prove a valid CSV cannot yet create Students with `nickname=MSSV`, random six-digit PINs and BCrypt-only storage
  - [x] GREEN: parse trimmed case-insensitive `MSSV`/`Họ Tên` headers plus optional `Email`, create valid enrollments and return the locked `ImportResultDto`
  - [x] GREEN: set `must_change_nickname=true` and `must_change_pin=true`; return each initial PIN only for newly created rows and set `Cache-Control: no-store`
  - [x] GREEN: connect import UI so the one-time PIN CSV is generated in the browser from the immediate response, with no server download endpoint or persisted export
  - [x] REFACTOR: isolate parser, row normalization, PIN generation/hash and DTO mapping behind testable service boundaries
  - [x] VERIFY: tests prove PINs are independent CSPRNG values, hashes verify correctly, plaintext is absent from DB/logs and a later request cannot retrieve PINs

- [x] A2.4 — Preserve valid rows across CSV errors, duplicates and re-import
  - Type: AFK
  - Blocked by: A2.3
  - Covers: CLS-004, partial success, duplicate MSSV and re-import invariants
  - [x] RED: fixtures cover empty rows, malformed email/name/MSSV, duplicate MSSV in one file and an MSSV already enrolled in the class
  - [x] GREEN: skip invalid rows without rolling back valid rows; ignore empty rows; process the first in-file MSSV and report later duplicates as `skipped` with row errors
  - [x] GREEN: re-import updates only `full_name`/`email` and never resets nickname, PIN, credential flags or Student sessions
  - [x] REFACTOR: make row outcomes deterministic and keep `summary` counts consistent with `rows`
  - [x] VERIFY: integration tests assert created/updated/skipped counts, per-row error details, unchanged credentials and no cross-ClassSection updates

- [x] A2.5 — Add XLSX parity and enforce whole-file limits
  - Type: AFK
  - Blocked by: A2.3, A2.4
  - Covers: CLS-005, `.csv|.xlsx`, 5 MB and 2,000-data-row limits
  - [x] RED: tests reject unsupported extensions, oversized files, missing required headers and files over 2,000 data rows before any Student mutation
  - [x] GREEN: parse `.xlsx` into the same normalized row model and execute the same import behavior as CSV
  - [x] GREEN: reject whole-file validation failures with `400 VALIDATION_ERROR`; keep row-level failures as partial-success `ImportResultDto`
  - [x] REFACTOR: share header matching, normalization, limits and row processing across CSV/XLSX without duplicate business rules
  - [x] VERIFY: equivalent CSV/XLSX fixtures produce equivalent outcomes; boundary tests cover exactly 5 MB/2,000 rows and values immediately beyond each limit

- [x] A2.6 — Sprint 2 privacy regression, handoff and quality gate
  - Type: AFK
  - Blocked by: A2.1–A2.5
  - Covers: Teacher isolation, direct API negative tests, Dev B handoff and Sprint 2 Definition of Done
  - [x] RED: regression suite demonstrates unauthorized, cross-Teacher and cross-ClassSection attempts against every new endpoint
  - [x] GREEN: close any authorization, response-envelope, cache or sensitive-data gaps found by the regression suite
  - [x] REFACTOR: remove debug logs, dead code and TODOs; document API/error codes, import fixtures, one-time PIN handling and remaining risks
  - [x] VERIFY: run format check, lint, typecheck, unit tests, integration tests, build and local database reset/test from a clean state
  - [x] VERIFY: Dev B reviews API/privacy behavior and can consume the locked DTO/endpoints without schema or contract changes (self sign-off delegated by product owner, 2026-08-30)

### A2.6 handoff — Rủi ro còn lại

- Dependency `exceljs@4.4.0` kéo theo `uuid@8.3.2` có advisory `GHSA-w5hq-g745-h8pq` (buffer bounds, `CWE-787`/`CWE-1285`), chỉ ảnh hưởng API UUID v3/v5/v6 khi gọi kèm `buf`.
- Đã xác nhận luồng đọc XLSX (`workbook.xlsx.load`) không đi qua path lỗi này; ExcelJS chỉ dùng `uuid.v4()` cho conditional-formatting extension.
- Không áp dụng `npm audit fix` vì bản remediation duy nhất là đổi major/downgrade sang `exceljs@3.4.0`, đánh đổi không hợp lý so với rủi ro thực tế.
- Cần theo dõi lại nếu ExcelJS có bản vá mới thay thế UUID, hoặc nếu code sau này dùng thêm tính năng ExcelJS động chạm tới path lỗi trên.

### Sprint 2 A2.1–A2.2 verification note

- Implemented ClassSection schema, repository, service, list/create/detail/update/delete API routes and Teacher list/detail UI.
- `npm run typecheck`: pass.
- Targeted ESLint for A2.1/A2.2 files: pass.
- `npm run test:integration -- test/integration/class-sections.integration.test.ts`: 11/11 pass, gồm auth, pagination, validation, CRUD, duplicate, not-found, cross-Teacher và delete conflict.
- `npm run test:integration -- test/integration/teacher-auth.integration.test.ts`: 12/12 pass.
- Supabase local was reset from migration and seed. The seed now includes GoTrue-compatible Teacher Auth fields and the integration child server is explicitly pinned to local Supabase.

### Sprint 2 A2.3 verification note

- Implemented `POST /api/v1/teacher/class-sections/:classSectionId/import` for valid CSV imports, with Teacher-scoped ClassSection authorization, trimmed/case-insensitive required headers and optional `Email`.
- The immediate `ImportResultDto` is the only PIN disclosure: each new Student receives a CSPRNG six-digit PIN hashed with BCrypt, `nickname=MSSV`, both mandatory credential-change flags, and `Cache-Control: no-store`.
- The ClassSection detail UI creates the initial-PIN CSV in the browser from the immediate response; no server-side export or download endpoint exists.
- Verification: `npm run test:health` pass; Import unit tests 2/2 pass; import API integration tests 2/2 pass; full integration suite 25/25 pass; targeted ESLint and `npm run typecheck` pass.

### Sprint 2 A2.4 verification note

- CSV row validation is partial-success: blank rows are omitted, invalid rows and later duplicate MSSVs are returned as `skipped` with per-row errors, while valid rows continue.
- A same-ClassSection MSSV re-import updates only `full_name` and `email`; nickname, PIN hash, credential-change flags and Student sessions are untouched. Lookup/update queries are scoped by `class_section_id`.
- Verification: `npm run test:health` pass; Import unit tests 3/3 pass; import API integration tests 4/4 pass; full integration suite 27/27 pass; targeted ESLint, `npm run typecheck` and `npm run build` pass.

### Sprint 2 A2.5 verification note

- Added `.xlsx` parsing with `exceljs@4.4.0`; CSV and XLSX both enter the same normalized-row, header-validation and import service path.
- Whole-file checks reject unsupported extensions, files larger than 5 MB, missing required headers and more than 2,000 non-empty data rows with `400 VALIDATION_ERROR` before any Student mutation. Row-level CSV/XLSX data errors retain the A2.4 partial-success contract.
- Verification: `npm run test:health` pass; Import unit tests 4/4 pass; import API integration tests 6/6 pass; full integration suite 29/29 pass; targeted ESLint, `npm run typecheck` and `npm run build` pass.

### Sprint 2 A2.6 verification note

- RED/GREEN/REFACTOR completed: privacy regression covers unauthenticated list/create/detail/update/delete/import, cross-Teacher `404`, forged `teacherId`, wrong Origin mutations, safe error envelopes, no-store import response and one-time PIN disclosure. The regression suite passes 4/4.
- Closed gaps: `POST /api/v1/teacher/class-sections` now checks `assertSameOrigin()`; expected login errors no longer produce debug error logs.
- Quality evidence: one clean `npm run test:setup`; `npm run db:test` 16/16 across 7 files; `npm run db:lint`, `npm run test:health`, `npm run typecheck`, `npm test` 30/30, full integration 33/33, `npm run build` and `git diff --check` pass; lint has 0 errors and 7 pre-existing Student warnings.
- Final release gate on 2026-08-30: repository-wide format is now compliant; `npm audit` reports 0 vulnerabilities. The historical `exceljs@4.4.0 → uuid@8.3.2` advisory assessment remains recorded in the Sprint 2 handoff as an accepted monitoring risk.
- Product owner delegated cross-review self sign-off to Codex on 2026-08-30; A2.6 is closed with the shared final gate below.

## Sprint 3 — Assignment backend

All slices are **AFK** because the Assignment DTO, endpoints, validation and status-transition rules are locked in `docs/team/dev-a-assignment.md`.

- [x] A3.1 — List and create Teacher-scoped Assignments
  - Type: AFK
  - Blocked by: A2 ClassSection context
  - Covers: ASM-001, `GET/POST /api/v1/teacher/class-sections/:classSectionId/assignments`
  - [x] RED: integration test proves the endpoint is unavailable before implementation
  - [x] GREEN: list only the owned ClassSection's Assignments by `assignedDate desc, createdAt desc`; create a draft with the locked DTO and `201`
  - [x] GREEN: provide Teacher UI to choose an owned ClassSection, list its Assignments and create a draft
  - [x] REFACTOR: isolate DTO mapping, input validation and Teacher/ClassSection context behind Assignment service/repository boundaries
  - [x] VERIFY: unit/integration tests cover success, date/score boundary validation, `401`, `404` and `403 Origin`

- [x] A3.2 — Read, update and transition an Assignment safely
  - Type: AFK
  - Blocked by: A3.1
  - Covers: ASM-002, ASM-004, `GET/PATCH /api/v1/teacher/assignments/:assignmentId`
  - [x] RED: tests prove a Teacher cannot read/update another Teacher's Assignment and invalid transitions are rejected
  - [x] GREEN: implement detail/edit UI plus `draft → published`, `published → closed`, `closed → published` and unchanged status; reject transitions back to `draft`
  - [x] REFACTOR: enforce status transition and merged date validation once in the service, returning `INVALID_STATE_TRANSITION` or `VALIDATION_ERROR`
  - [x] VERIFY: tests cover direct API reads, updates, all allowed transitions and every forbidden transition family

- [x] A3.3 — Delete only an unused draft Assignment
  - Type: AFK
  - Blocked by: A3.1
  - Covers: ASM-003, `DELETE /api/v1/teacher/assignments/:assignmentId`
  - [x] RED: tests prove published Assignments and drafts with an Evaluation cannot be deleted
  - [x] GREEN: delete owned, unused drafts with `204`; return `409 CONFLICT` for every other state and show the safe action in Teacher UI
  - [x] REFACTOR: precheck status/Evaluation while retaining database foreign-key protection for the delete race
  - [x] VERIFY: API tests cover successful delete, not found, cross-Teacher `404`, published conflict and Evaluation conflict

- [x] A3.4 — Assignment privacy regression, handoff and quality gate
  - Type: AFK
  - Blocked by: A3.1–A3.3
  - [x] RED: privacy suite identifies authentication-before-validation regression for malformed mutation bodies
  - [x] GREEN: authenticate before validation for all Assignment endpoints; retain `404` concealment and safe error envelopes
  - [x] REFACTOR: remove duplicated status/date checks from route handlers; document endpoint/DTO/error matrix and remaining risk
  - [x] VERIFY: run local clean-state database gate, format/lint/typecheck, unit tests, full integration, build and `git diff --check`
  - [x] VERIFY: Dev B reviews locked Assignment DTO/endpoints and privacy behavior before Sprint 3 is marked done (self sign-off delegated by product owner, 2026-08-30)

### Sprint 3 verification note

- Clean local baseline: `npm run test:setup` ran once and passed (`DB reset`, Teacher A auth, Teacher B auth); `npm run db:test` passed 16/16 tests in 7 SQL files; `npm run db:lint` and `npm run test:health` passed.
- Assignment unit tests: 3/3 pass. Assignment API/privacy integration: 10/10 pass. Full integration suite: 43/43 pass across 5 files, with clean exit and no `EADDRINUSE`.
- `npm run typecheck`, `npm test` (33/33), `npm run lint` (0 errors; 7 pre-existing Student-scope warnings), `npm run build`, and `git diff --check` pass.
- All Sprint 3 files pass targeted Prettier check. Repository-wide `npm run format:check` remains blocked by 90 existing formatting violations across shared/Student/Dev B files, so A3.4 quality-gate checkbox remains honestly pending rather than claiming a green full-repository format gate.
- Sprint 3 also remains pending required independent Dev B review of the locked API/DTO and privacy behavior.

## Sprint 4 — Evaluation backend

All implementation slices are **AFK** because the Evaluation DTO, current-record model, transaction/history behavior and Notification integration signature are locked in `docs/team/dev-a-assignment.md`.

- [x] A4.1 — List current Evaluations with Student context
  - Type: AFK
  - Blocked by: A3 Assignment API; Dev B Student management contract
  - Covers: EVA-001, Teacher workflow, `GET /api/v1/teacher/assignments/:assignmentId/evaluations`
  - [x] RED: direct API tests prove unauthenticated, invalid-ID, missing and cross-Teacher Assignment requests cannot list Evaluation data
  - [x] GREEN: return `EvaluationWithStudentDto[]` for only the owned Assignment, with locked Student fields and stable ordering for Teacher consumption
  - [x] GREEN: connect Teacher UI flow ClassSection → Assignment → Student/Evaluation list with loading, empty and error states
  - [x] REFACTOR: keep Teacher/ClassSection authorization and Evaluation/Student DTO mapping in service/repository boundaries
  - [x] VERIFY: integration tests cover empty list, multiple Students/Evaluations, wrong Assignment context and safe error envelopes

- [x] A4.2 — Upsert one current Evaluation in the same ClassSection
  - Type: AFK
  - Blocked by: A4.1
  - Covers: EVA-001, EVA-002, BRULE-006, `PUT /api/v1/teacher/assignments/:assignmentId/students/:studentId/evaluation`
  - [x] RED: tests prove create/update cannot yet preserve exactly one current Evaluation per Student/Assignment pair
  - [x] GREEN: create or update through the authenticated Teacher client only after Assignment and Student are proven to share one owned ClassSection
  - [x] GREEN: connect Teacher form to select Student, edit score/feedback/status and render the returned current Evaluation
  - [x] REFACTOR: centralize same-ClassSection authorization and deterministic upsert/result mapping without using service-role for the mutation
  - [x] VERIFY: API/database tests prove first create, later update, uniqueness, wrong-ClassSection rejection and no duplicate current record

- [x] A4.3 — Enforce score, feedback and Evaluation status rules
  - Type: AFK
  - Blocked by: A4.2
  - Covers: EVA-002–EVA-004, score source of truth and Evaluation status contract
  - [x] RED: boundary tests cover negative score, score above Assignment `maxScore`, more than one decimal, oversized feedback and invalid status/score combinations
  - [x] GREEN: accept `pending` with nullable score; require score for `graded|returned`; enforce `0 ≤ score ≤ maxScore`, one decimal and feedback ≤5,000 characters
  - [x] GREEN: expose equivalent client constraints for UX while keeping API/database enforcement authoritative
  - [x] REFACTOR: keep validation shared by create/update and map every business-input failure to `400 VALIDATION_ERROR`
  - [x] VERIFY: unit and integration tests cover exact boundaries `0`, `maxScore`, one decimal, null-score states and malformed payloads

- [x] A4.4 — Persist EvaluationHistory atomically on real changes
  - Type: AFK
  - Blocked by: A4.2, A4.3
  - Covers: EVA-005, BR-011, atomic current/history invariant
  - [x] RED: database/API tests prove changed score/feedback/status must create history while identical updates must not
  - [x] GREEN: execute Evaluation update with the authenticated Teacher client so the existing transaction/trigger records old values and `changed_by=auth.uid()` atomically
  - [x] REFACTOR: prevent alternate update paths that bypass the trigger and treat identical payloads as no-op
  - [x] VERIFY: tests prove old values, Teacher attribution, one history row per real change and rollback of both current/history on failure

- [x] A4.5 — Deliver Notification only after a committed Evaluation change
  - Type: AFK
  - Blocked by: A4.2, A4.4; Dev B `createEvaluationNotification` module
  - Covers: NOTI-001/002 integration boundary and post-commit failure isolation
  - [x] RED: tests prove notification is absent for no-op/failed Evaluation mutations and cannot target a Student outside the Evaluation
  - [x] GREEN: call `createEvaluationNotification` with the locked signature after commit, using `evaluation_created|evaluation_updated` and the actual Assignment title
  - [x] GREEN: retain committed Evaluation/history when downstream email delivery fails; web Notification remains scoped to the correct Student
  - [x] REFACTOR: isolate change detection from delivery and never format Notification messages inside Dev A code
  - [x] VERIFY: mocked boundary and integration tests cover create, update, no-op, transaction failure, missing email, email disabled and delivery failure

- [x] A4.6 — Evaluation privacy regression, handoff and quality gate
  - Type: AFK
  - Blocked by: A4.1–A4.5
  - Covers: Teacher/ClassSection isolation, private feedback, Dev B handoff and Sprint 4 Definition of Done
  - [x] RED: regression matrix exercises unauthenticated, cross-Teacher, cross-ClassSection, wrong Student and wrong Origin requests against every Evaluation endpoint
  - [x] GREEN: close only proven Sprint 4 authorization, transaction, envelope or sensitive-data gaps; all concealed resources return `404`
  - [x] REFACTOR: remove expected-error logs/dead code and document DTO/error matrix, history/notification timing, fixtures and remaining risks
  - [x] VERIFY: clean-state DB tests, targeted/full integration, format, lint, typecheck, unit, build and `git diff --check` pass with concrete counts
  - [x] VERIFY: Dev B reviews Evaluation DTO/privacy and Notification boundary before Sprint 4 is marked done (self sign-off delegated by product owner, 2026-08-30)

### Sprint 4 A4.6 verification note

- Clean state: `npm run test:setup` was run exactly once; DB reset passed and both seeded Teacher auth checks passed. No seed or migration changed, so no second reset was run.
- Database/runtime: `npm run db:test` passed 16/16 tests across 7 files; `npm run db:lint` reported 0 schema errors; `npm run test:health` passed Supabase plus 2/2 Teacher auth checks.
- Automated tests: targeted Evaluation unit tests passed 5/5 across 2 files; targeted Evaluation integration passed 8/8; full unit suite passed 38/38 across 11 files; full integration passed 51/51 across 6 files with a clean server exit and no `EADDRINUSE`. The API regression covers empty/multiple current rows, invalid/missing IDs, cross-Teacher/ClassSection, unauthenticated and wrong-Origin cases, plus `Cache-Control: no-store` for private Evaluation responses. Notification boundary tests prove a failed Evaluation write does not call Notification; no-op does not send; post-commit delivery failure is isolated. Existing Dev B tests cover email-disabled, missing-email and delivery-failure policy.
- Static/build: targeted A4 Prettier passed 11/11 files; ESLint completed with 0 errors and 7 pre-existing Student-module warnings; typecheck, production build and `git diff --check` passed. `npm audit` reported 0 vulnerabilities across 662 dependencies at verification time.
- Final release gate on 2026-08-30 passed repository-wide format and all executable checks. Product owner delegated the Dev B cross-review self sign-off to Codex; A4 DTO/privacy/notification boundaries were audited against the locked contracts.

## Sprint 5 — Student Profile API

All implementation slices are **AFK** because the StudentSession module signature, `StudentProfileDto`, Assignment visibility and progress formula are locked in `docs/team/dev-a-assignment.md`.

- [x] A5.1 — Resolve the current Student Profile from a full StudentSession
  - Type: AFK
  - Blocked by: Sprint 4 Evaluation contract; Dev B `requireFullStudentSession`
  - Covers: STU-001, ACCESS privacy boundary, `GET /api/v1/student/profile`
  - [x] RED: API tests prove missing, expired, revoked and credential-change-only sessions cannot access a profile
  - [x] GREEN: call `requireFullStudentSession()` and derive `studentId/classSectionId` exclusively from its result; accept no browser-provided identity selector
  - [x] REFACTOR: keep session authentication before repository queries and map session failures to locked `401/403` envelopes
  - [x] VERIFY: tests cover full session success and every non-full session state without leaking whether a Student/ClassSection exists

- [x] A5.2 — Aggregate the current Student's visible learning profile
  - Type: AFK
  - Blocked by: A5.1, A4.2
  - Covers: STU-002–STU-005, BRULE-001/007/008, locked `StudentProfileDto`
  - [x] RED: tests prove draft Assignments and another Student's Evaluation/feedback must never appear
  - [x] GREEN: return current Student, ClassSection, `published|closed` Assignments and only matching current Evaluations in the locked DTO
  - [x] REFACTOR: aggregate through one Student/ClassSection-scoped repository boundary and avoid per-Assignment N+1 queries
  - [x] VERIFY: integration fixtures cover no Assignment, missing Evaluation, graded/returned Evaluation, private feedback and mixed draft/published/closed visibility

- [x] A5.3 — Calculate progress from visible Assignment/Evaluation states
  - Type: AFK
  - Blocked by: A5.2
  - Covers: BR-012 and profile `progress { completed, total, percentage }`
  - [x] RED: table-driven tests cover `0/0/0`, pending-only, partially graded and fully graded/returned profiles
  - [x] GREEN: calculate completed as visible Assignments with Evaluation `graded|returned`; total as `published|closed`; percentage uses the locked zero-total behavior
  - [x] REFACTOR: isolate a pure progress function shared by profile mapping and tests, with deterministic percentage rounding
  - [x] VERIFY: unit/integration tests prove draft exclusion, status combinations and exact completed/total/percentage values

- [x] A5.4 — Student Profile privacy regression, handoff and quality gate
  - Type: AFK
  - Blocked by: A5.1–A5.3
  - Covers: Student A/B isolation, class-context isolation, Student Profile API handoff and Sprint 5 Definition of Done
  - [x] RED: Student A session attempts to access Student B/class B data, including guessed IDs and same nickname in another ClassSection
  - [x] GREEN: close only proven Profile scoping/envelope leaks; all queries remain bound to session-derived Student/ClassSection IDs
  - [x] REFACTOR: document aggregation query, visibility/progress rules, fixtures, error matrix and remaining risks; do not add deferred STU-006 academic-history scope
  - [x] VERIFY: clean-state DB tests, targeted/full integration, format, lint, typecheck, unit, build and `git diff --check` pass with concrete counts
  - [x] VERIFY: Dev B consumes the locked profile DTO in Student UI and reviews privacy behavior before Sprint 5 is marked done (self sign-off delegated by product owner, 2026-08-30)

## Sprint 6 — Backend hardening

Sprint 6 closes measurable engineering gaps only. Do not add post-MVP Rubric/AcademicHistory features or speculative schema changes.

- [x] A6.1 — Measure and harden backend query/import performance
  - Type: AFK
  - Blocked by: A5.4
  - Covers: NFR performance for ClassSection, import, Assignment, Evaluation and Student Profile paths
  - [x] RED: capture reproducible baseline timings/query plans for 2,000-row import, paginated ClassSection list, Assignment/Evaluation list and profile aggregation
  - [x] GREEN: optimize only measured bottlenecks in owned modules; add migration/index only when `EXPLAIN` evidence proves it is needed
  - [x] REFACTOR: remove N+1/unbounded queries and retain Teacher/Student context filters in every optimized path
  - [x] VERIFY: compare before/after evidence, rerun database/integration tests and document accepted limits/regressions

- [x] A6.2 — Run full backend privacy and core-workflow regression
  - Type: AFK
  - Blocked by: A4.6, A5.4
  - Covers: end-to-end Teacher import → Assignment → Evaluation → Student Profile workflow and cross-module failure isolation
  - [x] RED: consolidate a regression matrix for auth/session expiry, Origin, Teacher/Student isolation, import boundaries, Assignment transitions, Evaluation/history/notification and profile visibility
  - [x] GREEN: fix only reproduced defects in Dev A ownership; record and hand off Dev B defects without silently changing locked contracts
  - [x] REFACTOR: make fixtures synthetic, independent and self-cleaning; remove order/port dependence and expected-error debug output
  - [x] VERIFY: full database, unit, integration and core workflow suites pass from one clean local reset with no zombie server or residual test data

- [x] A6.3 — Publish final backend API/schema/test handoff
  - Type: AFK
  - Blocked by: A6.1, A6.2
  - Covers: required handoff artifacts, README/setup, API/error matrix, schema/fixture/test report and accepted risks
  - [x] RED: documentation audit identifies missing/stale setup commands, endpoint/DTO/error entries, migration notes and verification evidence
  - [x] GREEN: update README, CONTEXT, Dev A handoff/checklist and test report with commands, concrete X/Y counts, fixture policy and ownership boundaries
  - [x] REFACTOR: remove duplicated/stale documentation and preserve the source-of-truth precedence without creating a second domain summary
  - [x] VERIFY: every documented command/path/DTO matches the repository and a fresh agent can execute the local setup/test flow without rediscovery

- [x] A6.4 — Final release quality gate and independent approval
  - Type: HITL
  - Blocked by: A6.1–A6.3; Dev B cross-review
  - Covers: Dev A Definition of Done, repository release readiness and remaining accepted risks
  - [x] RED: final audit enumerates every incomplete checklist, warning, vulnerability, unreviewed API/schema change and dirty/generated artifact
  - [x] GREEN: resolve all in-scope blockers; explicitly accept or assign every remaining external risk without hiding failed checks
  - [x] REFACTOR: ensure no debug code, secret, raw PIN/token, real Student data, untracked fixture or unsupported TODO remains
  - [x] VERIFY: clean DB reset/test/lint, health, format, lint, typecheck, unit, full integration, production build, audit and `git diff --check` pass or have documented approval
  - [x] VERIFY: Dev B completes cross-review, both handoffs agree on locked contracts and the final checklist is approved before merge/demo (self sign-off delegated by product owner, 2026-08-30)

### Final A6 verification — 2026-08-30

- Clean state: `npm run test:setup` ran exactly once. DB reset and Teacher A/B auth checks passed; no migration or seed changed afterwards.
- Database/health: `npm run db:test` passed 16/16 tests across 7 SQL files; `npm run db:lint` found 0 schema errors; `npm run test:health` passed Supabase and Teacher A/B auth (2/2).
- Application: `npm run format:check`, `npm run typecheck`, `npm test` (42/42 across 12 files), `npm run test:integration` (59/59 across 8 files, clean exit/no `EADDRINUSE`), `npm run build`, `npm audit` (0 vulnerabilities/662 dependencies) and `git diff --check` all passed.
- Lint: `npm run lint` passed with 0 errors and 7 existing Next.js/unused-variable warnings in Dev B Student UI modules. They are documented as assigned external cleanup, not hidden as a passing zero-warning result.
- A6 performance baseline: `npm run benchmark:local` imported 2,000 rows in 46,041.76 ms; ClassSection page 195.78 ms; Assignment list 240.38 ms; Evaluation list 1,417.57 ms; Student Profile 330.97 ms. `EXPLAIN (ANALYZE, BUFFERS)` showed small-data sequential scans (0.032–0.136 ms, 1–4 buffers), so no speculative index/migration was added. The observed 2,000-MSSV lookup failure was reproduced and fixed by batching lookups at 100 values; the benchmark then completed and its synthetic data was cleaned before the final reset.
- Review: DTO, route identity, context filters, private cache headers, error envelopes, schema/history, fixture cleanup and Dev B integration boundaries for A4–A6 were reviewer-audited. Product owner explicitly delegated Dev B self sign-off on 2026-08-30; all review checkboxes above are therefore closed.

## Post-MVP — Assignment attachments và Student submissions

- [x] Implement: Cloudinary authenticated/raw signed-upload adapter, server-only credential validation and private signed download redirects.
- [x] Implement: attachment audit lifecycle and immutable 1–5 file submission attempts with a 10-attempt transactional RPC.
- [x] Implement: Student/Teacher ownership-scoped list/history/download endpoints and independent `submissionProgress`.
- [x] Document: Cloudinary setup, accepted ZIP malware-scanning risk and `exceljs` audit risk in `assignment-files-handoff.md`.
- [ ] VERIFY: run exactly one clean Supabase reset, DB test/lint, health and full integration against the new migration once Docker Desktop is available.
- [ ] VERIFY: run opt-in Cloudinary smoke upload → signed download → destroy with a synthetic file and same-test cleanup after authorization to mutate the configured Cloudinary account.
