select has_function(
  'public',
  'get_teacher_class_dashboard',
  array['uuid', 'integer', 'integer', 'text', 'text', 'text'],
  'combined class dashboard RPC exists'
);

select function_privilege_is(
  'public',
  'get_teacher_class_dashboard(uuid, integer, integer, text, text, text)',
  'anon',
  'EXECUTE',
  false,
  'anonymous users cannot execute combined dashboard RPC'
);
