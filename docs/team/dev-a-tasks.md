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

- [ ] A1.1 — Teacher login API through Supabase Auth SSR
- [ ] A1.2 — Current Teacher API and Auth-to-Teacher mapping
- [ ] A1.3 — Logout and session invalidation
- [ ] A1.4 — `requireTeacher` and protected Teacher boundaries
- [ ] A1.5 — Auth and Teacher-isolation integration tests

## Sprint 2 — Class Section and import backend

- [ ] A2.1 — Teacher-scoped ClassSection CRUD
- [ ] A2.2 — CSV import validation
- [ ] A2.3 — XLSX import and file limits
- [ ] A2.4 — Nickname/PIN generation, hashing and one-time disclosure
- [ ] A2.5 — Re-import, duplicate MSSV and partial success
- [ ] A2.6 — Import/API privacy integration tests

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
