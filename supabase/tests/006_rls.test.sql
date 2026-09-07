begin;

select plan(6);

select is(
  jsonb_build_object(
    'rls_tables', (
      select count(*)
      from pg_class
      where relnamespace = 'public'::regnamespace
        and relkind = 'r'
        and relrowsecurity
    ),
    'anon_privileges', (
      select count(*)
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee in ('anon', 'PUBLIC')
    )
  ),
    jsonb_build_object('rls_tables', 14, 'anon_privileges', 0),
  'all MVP tables enable RLS and expose no table privileges to anon'
);

select is(
  (
    select count(*)::integer
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'authenticated'
      and table_name in ('student_sessions', 'login_rate_limits')
  ),
  0,
  'authenticated browser role has no direct access to server-only security tables'
);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'teacher-a@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'teacher-b@example.test');
insert into public.class_sections (id, code, name, teacher_id) values
  ('10000000-0000-0000-0000-000000000001', 'CLASS_A', 'Class A', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'CLASS_B', 'Class B', '00000000-0000-0000-0000-000000000002');
insert into public.students (id, class_section_id, mssv, full_name, nickname, pin_hash) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'SVA', 'Student A', 'student-a', 'hash-a'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'SVB', 'Student B', 'student-b', 'hash-b');
insert into public.assignments (id, class_section_id, title, assigned_date, due_date, status) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Assignment A', '2026-08-01', '2026-08-31', 'published'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Assignment B', '2026-08-01', '2026-08-31', 'published');
insert into public.evaluations (id, student_id, assignment_id, score, status) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 8, 'graded'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 9, 'graded');
insert into public.evaluation_history (evaluation_id, old_score, old_feedback, old_status, changed_by) values
  ('40000000-0000-0000-0000-000000000001', 7, '', 'pending', '00000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', 7, '', 'pending', '00000000-0000-0000-0000-000000000002');
insert into public.notifications (student_id, evaluation_id, type, message) values
  ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'evaluation_created', 'Notification A'),
  ('20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'evaluation_created', 'Notification B');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

select is(
  (select array_agg(code order by code) from public.class_sections),
  array['CLASS_A']::varchar[],
  'Teacher A reads its own ClassSection and cannot read Teacher B data'
);

select is(
  jsonb_build_object(
    'students', (select count(*) from public.students),
    'assignments', (select count(*) from public.assignments),
    'evaluations', (select count(*) from public.evaluations),
    'history', (select count(*) from public.evaluation_history),
    'notifications', (select count(*) from public.notifications)
  ),
  jsonb_build_object(
    'students', 1,
    'assignments', 1,
    'evaluations', 1,
    'history', 1,
    'notifications', 1
  ),
  'Teacher A reads only related rows across every business table'
);

select lives_ok(
  $$
    insert into public.students (class_section_id, mssv, full_name, nickname, pin_hash)
    values ('10000000-0000-0000-0000-000000000001', 'SVA2', 'Student A2', 'student-a2', 'hash-a2')
  $$,
  'Teacher A can create a Student in its own ClassSection'
);

select throws_ok(
  $$
    insert into public.students (class_section_id, mssv, full_name, nickname, pin_hash)
    values ('10000000-0000-0000-0000-000000000002', 'SVB2', 'Student B2', 'student-b2', 'hash-b2')
  $$,
  '42501',
  'new row violates row-level security policy for table "students"',
  'Teacher A cannot create a Student in Teacher B ClassSection'
);

reset role;

select * from finish();
rollback;
