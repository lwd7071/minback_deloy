-- Local/test seed data only. Never place real student data or credentials in this file.

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    'f0000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'teacher-a@minback.local',
    extensions.crypt('DemoTeacherA123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    'f0000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'teacher-b@minback.local',
    extensions.crypt('DemoTeacherB123!', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.teachers (id, display_name) values
  ('f0000000-0000-0000-0000-000000000001', 'Demo Teacher A'),
  ('f0000000-0000-0000-0000-000000000002', 'Demo Teacher B');

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
    extensions.crypt('123456', extensions.gen_salt('bf'))
  ),
  (
    'f2000000-0000-0000-0000-000000000002',
    'f1000000-0000-0000-0000-000000000002',
    'DEMO002',
    'Demo Student B',
    'student-b@minback.local',
    'DEMO002',
    extensions.crypt('654321', extensions.gen_salt('bf'))
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
