# Performance Hardening

Status: in progress. This document records only behavior that is implemented and verified; unfinished slices remain explicitly listed.

## Implemented in the current slice

- Student workspace shares one notification polling controller through `NotificationPollingProvider`, so the header bell and workspace view do not create duplicate pollers in the same tab.
- Notification fetches are guarded by an in-flight request, abort after 8 seconds, reset the guard in `finally`, and do not create a second interval when visibility events repeat.
- Shared polling has an opt-in `MINBACK_SHARED_NOTIFICATION_POLLING_V2` flag, HMAC-derived coordination key, BroadcastChannel/Web Locks leader election, heartbeat/takeover handling and per-tab fallback.
- Student profile and grades receive Results from Server Components. They no longer call `/api/v1/student/results` after hydration.
- Notifications view does not load Results merely because it shares the workspace component.
- Teacher Student Management renders the server-provided rows and metadata directly. Search, page and page-size changes are URL-driven server navigations rather than client list GETs.
- Student edits optimistically update the row and then perform one authoritative `router.refresh()`; local `total` is not decremented.
- Assignment edit opens from the existing `TeacherAssignmentSummaryDto` row when available; it does not GET the Assignment again. The returned PATCH DTO is merged while preserving the existing grading summary.
- Header, class-card, assignment and back-navigation links use intent-only prefetch. Pagination no longer prefetches neighboring pages on mount; it prefetches only from hover/focus/touch/pen intent.
- ESLint now rejects direct `next/link` imports outside the wrapper and tests, keeping intent-prefetch policy enforceable for new routes.
- A sampled telemetry endpoint/table, 14-day cleanup script and two-window p95 SLO checker are present. Telemetry stores only aggregate route/metric data.
- The benchmark recorder now keeps normalized request action, type, bytes, duration and failure evidence. `scripts/perf-compare.mjs` compares median p50/p75/p95 across three batches, enforces budgets/regression limits and rejects failed requests. `scripts/perf-db-scale.sql` provides rollback-safe small/target/stress fixtures and EXPLAIN BUFFERS scenarios.
- When either SLO window has fewer than 30 samples, `perf:slo` warns and calls `SYNTHETIC_MONITOR_URL` when configured instead of treating missing telemetry as a pass.
- Key server data operations emit structured timing events with route template, duration, row count and safe error code; no learning data or identifiers are logged, and 200 ms+ operations use warning level.
- Class dashboard and Teacher grading snapshot RPC migrations are additive and feature-gated where applicable. Grading page now reads students, evaluations, assignment and counts from one snapshot RPC.
- Public class lookup is server-loaded with an initial DTO; notification coordination validates messages at runtime and negotiates page size 3 for workspace routes versus 50 for the notifications route.
- Notification list and mark-read now use server-only scoped RPCs: legacy notifications remain visible only when `evaluation_id` is null; related rows require matching Student and ClassSection in SQL. Browser roles cannot execute these RPCs.
- Class dashboard remediation is implemented but not production-verified: `20260921140000_optimize_class_dashboard_rpc.sql` replaces the V2 wrapper's repeated legacy list/facets calls with one shared aggregate pipeline, while the repository now derives pagination totals from the active progress filter and keeps global KPI counts separate. The regression test passes locally; the production migration and `MINBACK_CLASS_DASHBOARD_RPC_V2=true` rollout remain pending.

## Tests added

- `intent-prefetch-link.test.tsx` covers no prefetch before intent, dedupe, touch behavior and constrained connections.
- `use-notification-polling.test.tsx` covers one shared poller, repeated visibility events and a real coordinated leader poll tick.
- `class-section-repository.test.ts` covers the dashboard RPC rollout flag.
- Playwright request-budget tests cover no speculative admin prefetch and intent-triggered prefetch.
- Student integration coverage includes a forged notification pointing to another Student's Evaluation, a legacy notification without Evaluation, and a cross-scope mark-read attempt.
- TypeScript verification: `npm run typecheck` passes after this slice.

The latest deterministic single-worker run passed 55 test files / 222 Vitest tests. Current browser/static evidence also includes 2/2 Playwright request-budget tests, `npm run typecheck`, `npm run lint` with only five pre-existing warnings, `npm run format:check`, and `npm run build`.

## Still required before release

- Run Supabase migration/db lint/pgTAP and integration privacy tests after Docker/Supabase local is available.
- Run authenticated three-tab notification Playwright coverage with seeded Student credentials.
- Run the three-batch local and Slow-4G benchmark against the production build and record real p50/p75/p95 artifacts.
- Run `scripts/perf-db-scale.sql` and retain target/stress EXPLAIN output; verify the scheduled production monitor with repository secrets and `SYNTHETIC_MONITOR_URL`.
- Apply the class dashboard RPC optimization migration in production, enable `MINBACK_CLASS_DASHBOARD_RPC_V2`, then re-check Supabase Query Performance and Chrome navigation p75/p95 before claiming improvement.

Current environment blocker: Supabase image pulls completed, but Docker Desktop's Linux engine is not reachable after container startup failed (`overlayfs metadata.db: read-only file system`; subsequent start reports the missing `dockerDesktopLinuxEngine` pipe). Therefore migrations, pgTAP, RLS/privacy integration, concurrent snapshot tests and real benchmark artifacts remain unverified.

No performance percentile or production improvement percentage is claimed until the benchmark harness produces real before/after artifacts.
