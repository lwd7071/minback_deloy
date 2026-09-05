begin;

select plan(10);

select has_function(
  'public',
  'create_class_section_with_students',
  array['text', 'text', 'jsonb'],
  'atomic class setup RPC exists'
);

select ok(
  not has_function_privilege('anon', 'public.create_class_section_with_students(text, text, jsonb)', 'execute'),
  'anon cannot execute class setup RPC'
);

select ok(
  not exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) privilege
    where p.oid = 'public.create_class_section_with_students(text, text, jsonb)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  'PUBLIC cannot execute class setup RPC'
);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000091', 'setup-a@example.test'),
  ('00000000-0000-0000-0000-000000000092', 'setup-b@example.test');
insert into public.teachers (id, display_name) values
  ('00000000-0000-0000-0000-000000000091', 'Setup Teacher A'),
  ('00000000-0000-0000-0000-000000000092', 'Setup Teacher B');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000091';

select lives_ok(
  $$
    select public.create_class_section_with_students(
      'SETUP_A',
      'Atomic setup',
      '[{"studentId":"20000000-0000-0000-0000-000000000091","mssv":"SV91","fullName":"Student 91","email":null,"nickname":"SV91","pinHash":"hash-91"}]'::jsonb
    )
  $$,
  'teacher can atomically create its class and students'
);

select is(
  (select count(*)::integer from public.class_sections where code = 'SETUP_A'),
  1,
  'RPC creates one class'
);

select is(
  (
    select count(*)::integer
    from public.students s
    join public.class_sections c on c.id = s.class_section_id
    where c.code = 'SETUP_A'
      and s.must_change_nickname
      and s.must_change_pin
  ),
  1,
  'RPC creates students with both credential-change flags'
);

select throws_ok(
  $$
    select public.create_class_section_with_students(
      'SETUP_ROLLBACK',
      'Must rollback',
      '[{"studentId":"20000000-0000-0000-0000-000000000092","mssv":"DUP","fullName":"One","nickname":"DUP","pinHash":"hash"},{"studentId":"20000000-0000-0000-0000-000000000093","mssv":"DUP","fullName":"Two","nickname":"DUP2","pinHash":"hash"}]'::jsonb
    )
  $$,
  '23505',
  null,
  'duplicate MSSV aborts the transaction'
);

select is(
  (select count(*)::integer from public.class_sections where code = 'SETUP_ROLLBACK'),
  0,
  'failed student insert rolls back the class'
);

reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000092';

select is(
  (
    public.create_class_section_with_students('SETUP_B', 'Teacher B class', '[]'::jsonb)->>'code'
  ),
  'SETUP_B',
  'empty student array is supported'
);

reset role;

select is(
  (select teacher_id from public.class_sections where code = 'SETUP_B'),
  '00000000-0000-0000-0000-000000000092'::uuid,
  'RPC derives ownership from auth.uid()'
);

select * from finish();
rollback;
