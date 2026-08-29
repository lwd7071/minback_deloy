begin;

select plan(1);

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'teacher-a@example.test');

insert into public.teachers (id, display_name)
values ('00000000-0000-0000-0000-000000000001', 'Teacher A');

select pg_sleep(0.01);

update public.teachers
set display_name = 'Teacher A Updated'
where id = '00000000-0000-0000-0000-000000000001';

select ok(
  (select updated_at > created_at from public.teachers where id = '00000000-0000-0000-0000-000000000001'),
  'updated_at advances when a row changes'
);

select * from finish();
rollback;
