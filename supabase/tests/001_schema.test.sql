begin;

select plan(2);

select tables_are(
  'public',
  array[
    'assignments',
    'class_sections',
    'evaluation_history',
    'evaluations',
    'login_rate_limits',
    'notifications',
    'assignment_attachments',
    'submissions',
    'submission_attempts',
    'submission_files',
    'public_lookup_rate_limits',
    'student_sessions',
    'students',
    'teachers'
  ],
  'public schema contains exactly the MinBack MVP tables'
);

select is(
  (
    select count(*)::integer
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'evaluation_criteria',
        'rubric_templates',
        'rubric_criteria'
      )
  ),
  0,
  'post-MVP Rubric tables are absent'
);

select * from finish();
rollback;
