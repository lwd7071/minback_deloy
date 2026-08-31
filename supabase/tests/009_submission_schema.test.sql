begin;

select plan(3);

select is(
  (
    select count(*)::integer
    from information_schema.tables
    where table_schema = 'public'
      and table_name in ('assignment_attachments', 'submissions', 'submission_attempts', 'submission_files')
  ),
  4,
  'assignment file and submission tables exist'
);

select has_function(
  'public',
  'create_submission_attempt',
  array['uuid', 'uuid', 'uuid', 'boolean', 'jsonb'],
  'submission attempts are created atomically by an RPC'
);

select is(
  (
    select count(*)::integer
    from pg_constraint
    where conname in ('submissions_assignment_id_student_id_key', 'submission_attempts_submission_id_attempt_number_key')
  ),
  2,
  'submission roots and attempts are unique'
);

select * from finish();
rollback;
