begin;

select plan(3);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  'f9000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'trigger-meta@minback.local',
  crypt('TriggerTest123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"  Triggered Teacher  "}'::jsonb,
  now(),
  now()
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  'f9000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  null,
  crypt('TriggerTest123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  'f9000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'trigger-email-prefix@minback.local',
  crypt('TriggerTest123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

select is(
  (select display_name from public.teachers where id = 'f9000000-0000-0000-0000-000000000001'),
  'Triggered Teacher',
  'trigger uses trimmed display_name metadata'
);

select is(
  (select display_name from public.teachers where id = 'f9000000-0000-0000-0000-000000000002'),
  'trigger-email-prefix',
  'trigger falls back to email prefix'
);

select is(
  (select display_name from public.teachers where id = 'f9000000-0000-0000-0000-000000000003'),
  'Giảng viên',
  'trigger falls back to generic teacher name'
);

select * from finish();
rollback;
