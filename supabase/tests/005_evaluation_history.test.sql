begin;

select plan(2);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'teacher-a@example.test');
insert into public.class_sections (id, code, name, teacher_id) values
  ('10000000-0000-0000-0000-000000000001', 'CLASS_A', 'Class A', '00000000-0000-0000-0000-000000000001');
insert into public.students (id, class_section_id, mssv, full_name, nickname, pin_hash) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'SV001', 'Student A', 'student-a', 'test-hash');
insert into public.assignments (id, class_section_id, title, assigned_date, due_date, status, max_score) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Assignment A', '2026-08-01', '2026-08-31', 'published', 10);
insert into public.evaluations (id, student_id, assignment_id, score, feedback, status) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 7, 'Old feedback', 'graded');

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

update public.evaluations
set score = 8, feedback = 'New feedback', status = 'returned'
where id = '40000000-0000-0000-0000-000000000001';

select is(
  (
    select jsonb_build_object(
      'count', count(*),
      'old_score', min(old_score),
      'old_feedback', min(old_feedback),
      'old_status', min(old_status),
      'changed_by', min(changed_by::text)
    )
    from public.evaluation_history
    where evaluation_id = '40000000-0000-0000-0000-000000000001'
  ),
  jsonb_build_object(
    'count', 1,
    'old_score', 7.0,
    'old_feedback', 'Old feedback',
    'old_status', 'graded',
    'changed_by', '00000000-0000-0000-0000-000000000001'
  ),
  'Evaluation update records exactly one atomic history row with old values'
);

update public.evaluations
set score = 8, feedback = 'New feedback', status = 'returned'
where id = '40000000-0000-0000-0000-000000000001';

select is(
  (select count(*) from public.evaluation_history where evaluation_id = '40000000-0000-0000-0000-000000000001'),
  1::bigint,
  'no-op Evaluation update does not create duplicate history'
);

select * from finish();
rollback;
