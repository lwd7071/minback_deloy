create function public.bulk_update_imported_students(
  p_class_section_id uuid,
  p_students jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer := 0;
begin
  if auth.uid() is null and current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if jsonb_typeof(p_students) <> 'array' then
    raise exception using errcode = '22023', message = 'p_students must be a jsonb array';
  end if;

  if jsonb_array_length(p_students) = 0 then
    return 0;
  end if;

  with updates as (
    select
      (item->>'id')::uuid as id,
      item->>'fullName' as full_name,
      nullif(trim(item->>'email'), '') as email
    from jsonb_array_elements(p_students) as item
  ),
  applied as (
    update public.students s
    set
      full_name = u.full_name,
      email = u.email,
      updated_at = now()
    from updates u
    where s.id = u.id
      and s.class_section_id = p_class_section_id
    returning s.id
  )
  select count(*) into updated_count from applied;

  return updated_count;
end;
$$;

revoke all on function public.bulk_update_imported_students(uuid, jsonb)
from public, anon;
grant execute on function public.bulk_update_imported_students(uuid, jsonb)
to authenticated, service_role;
