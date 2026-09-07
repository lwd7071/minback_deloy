begin;

select plan(2);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'teacher-a@example.test');
insert into public.class_sections (id, code, name, teacher_id) values
  ('10000000-0000-0000-0000-000000000001', 'CLASS_A', 'Class A', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'CLASS_B', 'Class B', '00000000-0000-0000-0000-000000000001');
insert into public.students (id, class_section_id, mssv, full_name, nickname, pin_hash) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'SV001', 'Student A', 'student-a', 'test-hash');
insert into public.assignments (id, class_section_id, title, assigned_date, due_date, status, max_score) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Assignment B', '2026-08-01', '2026-08-31', 'published', 10),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Assignment A', '2026-08-01', '2026-08-31', 'published', 10);

select throws_ok(
  $$
    insert into public.evaluations (student_id, assignment_id, score, status)
    values (
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001',
      8,
      'graded'
    )
  $$,
  '23514',
  'Evaluation Student and Assignment must belong to the same ClassSection',
  'cross-ClassSection Evaluation is rejected'
);

select throws_ok(
  $$
    insert into public.evaluations (student_id, assignment_id, score, status)
    values (
      '20000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000002',
      10.1,
      'graded'
    )
  $$,
  '23514',
  'Evaluation score must not exceed Assignment max_score',
  'Evaluation score above Assignment max_score is rejected'
);

select * from finish();
rollback;
