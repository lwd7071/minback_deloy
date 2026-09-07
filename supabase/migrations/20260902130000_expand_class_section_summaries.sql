-- Server-side search and whole-result metrics for the Admin Classes page.
-- The search term is escaped before ILIKE so %, _, and \ remain literal text.

drop function if exists public.list_class_section_summaries(uuid, integer, integer);
drop function if exists public.list_class_section_summaries(uuid, integer, integer, text);

create or replace function public.list_class_section_summaries(
  p_teacher_id uuid,
  p_offset integer,
  p_limit integer,
  p_search text default null
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
  total_count bigint,
  total_student_count bigint,
  total_assignment_count bigint,
  total_completed_count bigint,
  total_grading_total bigint
)
language sql
security invoker
set search_path = ''
as $$
  with filtered_sections as (
    select cs.id, cs.code, cs.name
    from public.class_sections cs
    where cs.teacher_id = p_teacher_id
      and p_teacher_id = auth.uid()
      and (
        nullif(trim(p_search), '') is null
        or cs.code ilike '%' || replace(replace(replace(trim(p_search), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'
        or cs.name ilike '%' || replace(replace(replace(trim(p_search), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'
      )
  ), section_counts as (
    select
      section.id,
      section.code,
      section.name,
      (select count(*) from public.students s where s.class_section_id = section.id)::bigint as student_count,
      (select count(*) from public.assignments a where a.class_section_id = section.id)::bigint as assignment_count,
      (
        select count(*)
        from public.evaluations e
        join public.assignments a on a.id = e.assignment_id
        join public.students s on s.id = e.student_id
        where a.class_section_id = section.id
          and s.class_section_id = section.id
          and a.status in ('published', 'closed')
          and e.status in ('graded', 'returned')
      )::bigint as completed_count,
      (
        select count(*)
        from public.assignments a
        where a.class_section_id = section.id
          and a.status in ('published', 'closed')
      )::bigint as published_assignment_count
    from filtered_sections section
  ), calculated as (
    select
      section_counts.*,
      (student_count * published_assignment_count)::bigint as grading_total
    from section_counts
  )
  select
    calculated.id,
    calculated.code,
    calculated.name,
    calculated.student_count,
    calculated.assignment_count,
    calculated.completed_count,
    calculated.grading_total,
    case
      when calculated.grading_total = 0 then 0
      else round(calculated.completed_count::numeric * 100 / calculated.grading_total)::integer
    end as grading_percentage,
    count(*) over ()::bigint as total_count,
    sum(calculated.student_count) over ()::bigint as total_student_count,
    sum(calculated.assignment_count) over ()::bigint as total_assignment_count,
    sum(calculated.completed_count) over ()::bigint as total_completed_count,
    sum(calculated.grading_total) over ()::bigint as total_grading_total
  from calculated
  order by calculated.code
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function public.list_class_section_summaries(uuid, integer, integer, text)
from public, anon;
grant execute on function public.list_class_section_summaries(uuid, integer, integer, text)
to authenticated;
