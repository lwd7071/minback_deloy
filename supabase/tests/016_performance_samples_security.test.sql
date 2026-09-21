select has_table(
  'public',
  'performance_samples',
  'performance samples table exists'
);

select results_eq(
  $$select relrowsecurity from pg_class where oid = 'public.performance_samples'::regclass$$,
  $$values (true)$$,
  'performance samples has RLS enabled'
);

select table_privs_are(
  'public',
  'performance_samples',
  'anon',
  array[]::text[],
  'anonymous users have no performance sample table privileges'
);

select table_privs_are(
  'public',
  'performance_samples',
  'authenticated',
  array[]::text[],
  'authenticated users have no performance sample table privileges'
);
