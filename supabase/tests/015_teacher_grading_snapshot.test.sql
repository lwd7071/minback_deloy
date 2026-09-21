select has_function(
  'public',
  'get_teacher_grading_snapshot',
  array['uuid', 'uuid', 'integer', 'integer', 'text'],
  'teacher grading snapshot RPC exists'
);

select function_privilege_is(
  'public',
  'get_teacher_grading_snapshot(uuid, uuid, integer, integer, text)',
  'anon',
  'EXECUTE',
  false,
  'anonymous users cannot execute grading snapshot RPC'
);
