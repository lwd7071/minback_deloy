-- Local/test seed data only. Never place real student data or credentials in this file.

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  reauthentication_token,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    'f0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'teacher-a@minback.local',
    -- Password: DemoTeacherA123!
    '$2a$10$E2XAaMqo1XGEKMOrnZC1le.c86gwxSknHjnmjnC4QSegiILrW7s1i',
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Demo Teacher A"}'::jsonb,
    now(),
    now()
  ),
  (
    'f0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'teacher-b@minback.local',
    -- Password: DemoTeacherB123!
    '$2a$10$u/9/7LY.v.I1lGGO.EX1rOHFKV4.HaMFam879FjNL8GCAOAtmdtWC',
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Demo Teacher B"}'::jsonb,
    now(),
    now()
  );

insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at) values
  (
    'f0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    '{"sub":"f0000000-0000-0000-0000-000000000001","email":"teacher-a@minback.local","email_verified":false,"phone_verified":false}',
    'email',
    now(),
    now()
  ),
  (
    'f0000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000002',
    '{"sub":"f0000000-0000-0000-0000-000000000002","email":"teacher-b@minback.local","email_verified":false,"phone_verified":false}',
    'email',
    now(),
    now()
  );

insert into public.class_sections (id, code, name, teacher_id) values
  ('f1000000-0000-0000-0000-000000000001', 'DEMO_A', 'Demo Class A', 'f0000000-0000-0000-0000-000000000001'),
  ('f1000000-0000-0000-0000-000000000002', 'DEMO_B', 'Demo Class B', 'f0000000-0000-0000-0000-000000000002');

insert into public.students (
  id,
  class_section_id,
  mssv,
  full_name,
  email,
  nickname,
  pin_hash
) values
  (
    'f2000000-0000-0000-0000-000000000001',
    'f1000000-0000-0000-0000-000000000001',
    'DEMO001',
    'Demo Student A',
    'student-a@minback.local',
    'DEMO001',
    extensions.crypt('123456', extensions.gen_salt('bf', 10))
  ),
  (
    'f2000000-0000-0000-0000-000000000002',
    'f1000000-0000-0000-0000-000000000002',
    'DEMO002',
    'Demo Student B',
    'student-b@minback.local',
    'DEMO002',
    extensions.crypt('654321', extensions.gen_salt('bf', 10))
  );

insert into public.assignments (
  id,
  class_section_id,
  title,
  assigned_date,
  due_date,
  status,
  max_score
) values
  ('f3000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'Demo Assignment A', '2026-08-01', '2026-08-31', 'published', 10),
  ('f3000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'Demo Assignment B', '2026-08-01', '2026-08-31', 'published', 10);
