create or replace function public.handle_new_teacher()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata_name text;
  email_name text;
begin
  metadata_name := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
  email_name := nullif(split_part(coalesce(new.email, ''), '@', 1), '');

  insert into public.teachers (id, display_name)
  values (
    new.id,
    left(coalesce(metadata_name, email_name, 'Giảng viên'), 100)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_teacher() from public, anon, authenticated;

insert into public.teachers (id, display_name)
select
  u.id,
  left(
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Giảng viên'
    ),
    100
  )
from auth.users as u
on conflict (id) do nothing;

drop trigger if exists on_auth_user_created_create_teacher on auth.users;

create trigger on_auth_user_created_create_teacher
  after insert on auth.users
  for each row execute function public.handle_new_teacher();
