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

- [ ] A2.6 — Sprint 2 privacy regression, handoff and quality gate
  - Type: AFK
  - Blocked by: A2.1–A2.5
  - Covers: Teacher isolation, direct API negative tests, Dev B handoff and Sprint 2 Definition of Done
  - [ ] RED: regression suite demonstrates unauthorized, cross-Teacher and cross-ClassSection attempts against every new endpoint
  - [ ] GREEN: close any authorization, response-envelope, cache or sensitive-data gaps found by the regression suite
  - [ ] REFACTOR: remove debug logs, dead code and TODOs; document API/error codes, import fixtures, one-time PIN handling and remaining risks
  - [ ] VERIFY: run format check, lint, typecheck, unit tests, integration tests, build and local database reset/test from a clean state
  - [ ] VERIFY: Dev B reviews API/privacy behavior and can consume the locked DTO/endpoints without schema or contract changes

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

## Sprint 3 — Assignment backend

- [ ] A3.1 — Assignment validation and status transitions
- [ ] A3.2 — Teacher-scoped list/create/get/update
- [ ] A3.3 — Delete only unused draft Assignment
- [ ] A3.4 — Assignment API and authorization integration tests

## Sprint 4 — Evaluation backend

- [ ] A4.1 — Evaluation list with Student
- [ ] A4.2 — Same-ClassSection Evaluation upsert
- [ ] A4.3 — Score, feedback and status validation
- [ ] A4.4 — Atomic EvaluationHistory integration
- [ ] A4.5 — Post-commit Notification without no-op/failure delivery
- [ ] A4.6 — Evaluation privacy and failure-isolation tests

## Sprint 5 — Student Profile API

- [ ] A5.1 — Profile authentication through `requireFullStudentSession`
- [ ] A5.2 — Student profile aggregation and Assignment visibility
- [ ] A5.3 — Progress calculation
- [ ] A5.4 — Student A/B privacy regression tests

## Sprint 6 — Backend hardening

- [ ] A6.1 — Query, index and import performance review
- [ ] A6.2 — Full backend regression
- [ ] A6.3 — README, API/schema documentation and test report
- [ ] A6.4 — Final quality gate
