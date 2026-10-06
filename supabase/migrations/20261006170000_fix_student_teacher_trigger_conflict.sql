-- Fix conflict between Student Google OAuth and Teacher Auto-Creation Trigger.
-- Ensures students logging in via Google OAuth are NEVER automatically inserted into public.teachers.

create or replace function public.handle_new_teacher()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata_name text;
  email_name text;
  is_student boolean;
begin
  -- 1. Explicit student role metadata check
  if (new.raw_user_meta_data ->> 'role') = 'student' then
    return new;
  end if;

  -- 2. Check if the user email matches an existing student roster record
  select exists(
    select 1 from public.students
    where lower(email) = lower(coalesce(new.email, ''))
  ) into is_student;

  if is_student then
    return new;
  end if;

  -- 3. Only create teacher record for non-student users
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
