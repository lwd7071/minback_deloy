-- Deterministic EXPLAIN fixture for the class-dashboard RPC.
-- Run with the local Supabase database, for example:
--   psql "$DATABASE_URL" -f scripts/perf-db-scale.sql
-- The transaction is rolled back, so this never changes the local seed.

\set ON_ERROR_STOP on
begin;

select set_config(
  'request.jwt.claim.sub',
  'f0000000-0000-0000-0000-000000000001',
  true
);

create or replace function pg_temp.perf_load_fixture(
  p_label text,
  p_class_count integer,
  p_student_count integer,
  p_assignment_count integer
) returns void
language plpgsql
as $$
begin
  insert into public.class_sections (id, code, name, teacher_id)
  select
    md5(format('minback-perf-%s-class-%s', p_label, n))::uuid,
    format('PERF_%s_%s', p_label, n),
    format('Performance %s class %s', p_label, n),
    'f0000000-0000-0000-0000-000000000001'::uuid
  from generate_series(1, p_class_count) as series(n);

  insert into public.students (
    id, class_section_id, mssv, full_name, nickname, pin_hash
  )
  select
    md5(format('minback-perf-%s-student-%s-%s', p_label, c.n, s.n))::uuid,
    md5(format('minback-perf-%s-class-%s', p_label, c.n))::uuid,
    format('PERF%s%04s%04s', p_label, c.n, s.n),
    format('Performance Student %s/%s', c.n, s.n),
    format('perf_%s_%s_%s', p_label, c.n, s.n),
    'fixture-pin-hash'
  from generate_series(1, p_class_count) as c(n)
  cross join generate_series(1, p_student_count) as s(n);

  insert into public.assignments (
    id, class_section_id, title, description, assigned_date, due_date,
    status, max_score
  )
  select
    md5(format('minback-perf-%s-assignment-%s-%s', p_label, c.n, a.n))::uuid,
    md5(format('minback-perf-%s-class-%s', p_label, c.n))::uuid,
    format('Performance Assignment %s/%s', c.n, a.n),
    '', current_date, current_date + 30, 'published', 10
  from generate_series(1, p_class_count) as c(n)
  cross join generate_series(1, p_assignment_count) as a(n);

  -- 80% evaluation coverage, deterministic across runs.
  insert into public.evaluations (
    id, student_id, assignment_id, score, feedback, status
  )
  select
    md5(format('minback-perf-%s-evaluation-%s-%s-%s', p_label, c.n, s.n, a.n))::uuid,
    md5(format('minback-perf-%s-student-%s-%s', p_label, c.n, s.n))::uuid,
    md5(format('minback-perf-%s-assignment-%s-%s', p_label, c.n, a.n))::uuid,
    case when (s.n + a.n) % 2 = 0 then 8 else 7 end,
    '',
    case when (s.n + a.n) % 2 = 0 then 'returned' else 'graded' end
  from generate_series(1, p_class_count) as c(n)
  cross join generate_series(1, p_student_count) as s(n)
  cross join generate_series(1, p_assignment_count) as a(n)
  where (s.n + a.n) % 5 <> 0;
end;
$$;

create or replace function pg_temp.perf_cleanup(p_label text) returns void
language plpgsql
as $$
begin
  delete from public.evaluations e
  using public.assignments a, public.class_sections cs
  where e.assignment_id = a.id
    and a.class_section_id = cs.id
    and cs.code like format('PERF_%s_%%', p_label);
  delete from public.assignments a
  using public.class_sections cs
  where a.class_section_id = cs.id
    and cs.code like format('PERF_%s_%%', p_label);
  delete from public.students s
  using public.class_sections cs
  where s.class_section_id = cs.id
    and cs.code like format('PERF_%s_%%', p_label);
  delete from public.class_sections
  where code like format('PERF_%s_%%', p_label);
end;
$$;

\echo '--- small: 30 classes x 100 students x 10 assignments ---'
select perf_load_fixture('small', 30, 100, 10);
explain (analyze, buffers, format json)
select public.get_teacher_class_dashboard(
  'f0000000-0000-0000-0000-000000000001', 0, 20, null, 'all', 'newest'
);
select perf_cleanup('small');

\echo '--- target: 300 classes x 200 students x 20 assignments ---'
select perf_load_fixture('target', 300, 200, 20);
explain (analyze, buffers, format json)
select public.get_teacher_class_dashboard(
  'f0000000-0000-0000-0000-000000000001', 0, 20, null, 'all', 'newest'
);
explain (analyze, buffers, format json)
select public.get_teacher_class_dashboard(
  'f0000000-0000-0000-0000-000000000001', 20, 20, 'PERF_target_1', 'urgent', 'progress_asc'
);
select perf_cleanup('target');

\echo '--- stress: 600 classes x 400 students x 40 assignments ---'
select perf_load_fixture('stress', 600, 400, 40);
explain (analyze, buffers, format json)
select public.get_teacher_class_dashboard(
  'f0000000-0000-0000-0000-000000000001', 0, 20, null, 'all', 'students_desc'
);
explain (analyze, buffers, format json)
select public.get_teacher_class_dashboard(
  'f0000000-0000-0000-0000-000000000001', 0, 20, 'PERF_stress_1', 'complete', 'name_asc'
);
select perf_cleanup('stress');

rollback;
