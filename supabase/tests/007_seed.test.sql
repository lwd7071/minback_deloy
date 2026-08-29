begin;

select plan(1);

select is(
  jsonb_build_object(
    'teachers', (select count(*) from public.teachers where display_name like 'Demo Teacher %'),
    'classes', (select count(*) from public.class_sections where code like 'DEMO_%'),
    'students', (select count(*) from public.students where mssv like 'DEMO%'),
    'assignments', (select count(*) from public.assignments where title like 'Demo Assignment %')
  ),
  jsonb_build_object('teachers', 2, 'classes', 2, 'students', 2, 'assignments', 2),
  'local seed provides two isolated synthetic Teacher workflows'
);

select * from finish();
rollback;
