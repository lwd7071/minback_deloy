create table public.public_lookup_rate_limits (
  key_hash char(64) primary key,
  request_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.public_lookup_rate_limits enable row level security;
revoke all on public.public_lookup_rate_limits from public, anon, authenticated;

create function public.consume_public_lookup_rate_limit(p_key_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row public.public_lookup_rate_limits%rowtype;
  v_now timestamptz := now();
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid rate-limit key';
  end if;

  insert into public.public_lookup_rate_limits (key_hash, request_count)
  values (p_key_hash, 0)
  on conflict (key_hash) do nothing;

  select * into current_row
  from public.public_lookup_rate_limits
  where key_hash = p_key_hash
  for update;

  if current_row.blocked_until is not null and current_row.blocked_until > v_now then
    return false;
  end if;

  if current_row.window_started_at <= v_now - interval '15 minutes' then
    update public.public_lookup_rate_limits
    set request_count = 1,
        window_started_at = v_now,
        blocked_until = null,
        updated_at = v_now
    where key_hash = p_key_hash;
    return true;
  end if;

  if current_row.request_count >= 30 then
    update public.public_lookup_rate_limits
    set blocked_until = current_row.window_started_at + interval '15 minutes',
        updated_at = v_now
    where key_hash = p_key_hash;
    return false;
  end if;

  update public.public_lookup_rate_limits
  set request_count = request_count + 1, updated_at = v_now
  where key_hash = p_key_hash;
  return true;
end;
$$;

revoke all on function public.consume_public_lookup_rate_limit(text)
from public, anon, authenticated;
grant execute on function public.consume_public_lookup_rate_limit(text)
to service_role;

create function public.list_class_section_summaries(
  p_teacher_id uuid,
  p_offset integer,
  p_limit integer
)
returns table (
  id uuid,
  code varchar,
  name varchar,
  student_count bigint,
  assignment_count bigint,
  completed_count bigint,
  grading_total bigint,
  grading_percentage integer,
  total_count bigint
)
language sql
security invoker
set search_path = ''
as $$
  with sections as (
    select cs.id, cs.code, cs.name
    from public.class_sections cs
    where cs.teacher_id = p_teacher_id and p_teacher_id = auth.uid()
  ), counts as (
    select
      section.id,
      section.code,
      section.name,
      (select count(*) from public.students s where s.class_section_id = section.id) as student_count,
      (select count(*) from public.assignments a where a.class_section_id = section.id) as assignment_count,
      (
        select count(*)
        from public.evaluations e
        join public.assignments a on a.id = e.assignment_id
        join public.students s on s.id = e.student_id
        where a.class_section_id = section.id
          and s.class_section_id = section.id
          and a.status in ('published', 'closed')
          and e.status in ('graded', 'returned')
      ) as completed_count
    from sections section
  )
  select
    counts.id,
    counts.code,
    counts.name,
    counts.student_count,
    counts.assignment_count,
    counts.completed_count,
    counts.student_count * (
      select count(*) from public.assignments a
      where a.class_section_id = counts.id and a.status in ('published', 'closed')
    ) as grading_total,
    case
      when counts.student_count = 0 then 0
      when (select count(*) from public.assignments a where a.class_section_id = counts.id and a.status in ('published', 'closed')) = 0 then 0
      else round(
        counts.completed_count::numeric * 100 /
        (counts.student_count * (select count(*) from public.assignments a where a.class_section_id = counts.id and a.status in ('published', 'closed')))
      )::integer
    end,
    count(*) over ()
  from counts
  order by counts.code
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function public.list_class_section_summaries(uuid, integer, integer)
from public, anon;
grant execute on function public.list_class_section_summaries(uuid, integer, integer)
to authenticated;

create function public.bulk_upsert_evaluations(
  p_assignment_id uuid,
  p_rows jsonb
)
returns table (
  id uuid,
  student_id uuid,
  change_type text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  assignment_record public.assignments%rowtype;
  item jsonb;
  existing_record public.evaluations%rowtype;
  saved_id uuid;
begin
  if jsonb_typeof(p_rows) <> 'array'
    or jsonb_array_length(p_rows) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Bulk evaluation size is invalid';
  end if;

  select a.* into assignment_record
  from public.assignments a
  join public.class_sections cs on cs.id = a.class_section_id
  where a.id = p_assignment_id and cs.teacher_id = auth.uid()
  for update of a;
  if not found then
    raise exception using errcode = 'P0002', message = 'Assignment not found';
  end if;

  if (
    select count(distinct value->>'studentId') <> jsonb_array_length(p_rows)
    from jsonb_array_elements(p_rows)
  ) then
    raise exception using errcode = '23505', message = 'Duplicate Student in bulk evaluation';
  end if;

  for item in select value from jsonb_array_elements(p_rows)
  loop
    if not exists (
      select 1 from public.students s
      where s.id = (item->>'studentId')::uuid
        and s.class_section_id = assignment_record.class_section_id
    ) then
      raise exception using errcode = '23514', message = 'Student is outside Assignment ClassSection';
    end if;
    if (item->>'score') is not null
      and (item->>'score')::numeric > assignment_record.max_score then
      raise exception using errcode = '23514', message = 'Score exceeds Assignment max_score';
    end if;
    if item->>'status' in ('graded', 'returned') and (item->>'score') is null then
      raise exception using errcode = '23514', message = 'Completed Evaluation requires score';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p_rows)
  loop
    select e.* into existing_record
    from public.evaluations e
    where e.assignment_id = p_assignment_id
      and e.student_id = (item->>'studentId')::uuid;

    if found then
      if (existing_record.score, existing_record.feedback, existing_record.status)
        is distinct from
        (
          (item->>'score')::numeric,
          coalesce(item->>'feedback', ''),
          item->>'status'
        ) then
        update public.evaluations e
        set score = (item->>'score')::numeric,
            feedback = coalesce(item->>'feedback', ''),
            status = item->>'status'
        where e.id = existing_record.id
        returning e.id into saved_id;
        return query select saved_id, (item->>'studentId')::uuid, 'updated'::text;
      end if;
    else
      insert into public.evaluations (student_id, assignment_id, score, feedback, status)
      values (
        (item->>'studentId')::uuid,
        p_assignment_id,
        (item->>'score')::numeric,
        coalesce(item->>'feedback', ''),
        item->>'status'
      ) returning public.evaluations.id into saved_id;
      return query select saved_id, (item->>'studentId')::uuid, 'created'::text;
    end if;
  end loop;
end;
$$;

revoke all on function public.bulk_upsert_evaluations(uuid, jsonb)
from public, anon;
grant execute on function public.bulk_upsert_evaluations(uuid, jsonb)
to authenticated;
