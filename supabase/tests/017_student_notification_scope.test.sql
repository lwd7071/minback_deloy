select has_function(
  'public',
  'list_student_notifications',
  array['uuid', 'uuid', 'integer', 'integer', 'boolean'],
  'scoped student notification list RPC exists'
);

select has_function(
  'public',
  'mark_student_notification_read',
  array['uuid', 'uuid', 'uuid'],
  'scoped student notification mutation RPC exists'
);

select function_privilege_is(
  'public',
  'list_student_notifications(uuid, uuid, integer, integer, boolean)',
  'authenticated',
  'EXECUTE',
  false,
  'authenticated browser users cannot execute private notification list RPC'
);

select function_privilege_is(
  'public',
  'mark_student_notification_read(uuid, uuid, uuid)',
  'authenticated',
  'EXECUTE',
  false,
  'authenticated browser users cannot execute private notification mutation RPC'
);

select function_privilege_is(
  'public',
  'list_student_notifications(uuid, uuid, integer, integer, boolean)',
  'service_role',
  'EXECUTE',
  true,
  'only the server service role can execute notification list RPC'
);

select function_privilege_is(
  'public',
  'mark_student_notification_read(uuid, uuid, uuid)',
  'service_role',
  'EXECUTE',
  true,
  'only the server service role can execute notification mutation RPC'
);
