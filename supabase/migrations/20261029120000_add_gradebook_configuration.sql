alter table public.assignments
  add column gradebook_included boolean not null default false,
  add column gradebook_weight numeric(5, 2);

alter table public.assignments
  add constraint assignments_gradebook_weight_check
    check (gradebook_weight is null or (gradebook_weight > 0 and gradebook_weight <= 100)),
  add constraint assignments_gradebook_weight_required_check
    check (not gradebook_included or gradebook_weight is not null);

create function public.update_teacher_gradebook_config(
  p_class_section_id uuid,
  p_assignments jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  assignment_count integer;
  payload_count integer;
  included_weight numeric;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.class_sections cs
    where cs.id = p_class_section_id
      and cs.teacher_id = auth.uid()
  ) then
    raise exception using errcode = '42501', message = 'ClassSection access denied';
  end if;

  if jsonb_typeof(p_assignments) <> 'array' then
    raise exception using errcode = '22023', message = 'Assignments must be an array';
  end if;

  select count(*) into assignment_count
  from public.assignments a
  where a.class_section_id = p_class_section_id;

  select count(*) into payload_count
  from jsonb_array_elements(p_assignments);

  if assignment_count <> payload_count
    or exists (
      select 1
      from jsonb_array_elements(p_assignments) as rows(item)
      where jsonb_typeof(item->'assignmentId') <> 'string'
        or jsonb_typeof(item->'included') <> 'boolean'
        or (item ? 'weight' and jsonb_typeof(item->'weight') not in ('number', 'null'))
        or (item->>'weight') is not null and (item->>'weight') !~ '^([0-9]+)(\.[0-9]{1,2})?$'
        or not exists (
          select 1 from public.assignments a
          where a.id = (item->>'assignmentId')::uuid
            and a.class_section_id = p_class_section_id
        )
    )
    or (select count(distinct item->>'assignmentId') from jsonb_array_elements(p_assignments) as rows(item)) <> payload_count then
    raise exception using errcode = '22023', message = 'Gradebook configuration is invalid';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_assignments) as rows(item)
    where coalesce((item->>'included')::boolean, false)
      and (item->>'weight') is null
  ) then
    raise exception using errcode = '22023', message = 'Included assignments require a weight';
  end if;

  select coalesce(sum((item->>'weight')::numeric), 0)
  into included_weight
  from jsonb_array_elements(p_assignments) as rows(item)
  where (item->>'included')::boolean;

  if included_weight <> 0 and abs(included_weight - 100) > 0.01 then
    raise exception using errcode = '22023', message = 'Included weights must total 100';
  end if;

  update public.assignments a
  set gradebook_included = (item->>'included')::boolean,
      gradebook_weight = nullif(item->>'weight', '')::numeric
  from jsonb_array_elements(p_assignments) as rows(item)
  where a.id = (item->>'assignmentId')::uuid
    and a.class_section_id = p_class_section_id;
end;
$$;

revoke all on function public.update_teacher_gradebook_config(uuid, jsonb)
from public, anon;
grant execute on function public.update_teacher_gradebook_config(uuid, jsonb)
to authenticated;
