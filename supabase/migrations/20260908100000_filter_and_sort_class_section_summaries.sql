-- Server-side progress filters, sorting, global KPI metrics, and search facets
-- for the authenticated Teacher class list.

drop function if exists public.list_class_section_summaries(uuid, integer, integer, text);
create function public.list_class_section_summaries(
  p_teacher_id uuid,
  p_offset integer,
  p_limit integer,
  p_search text default null,
  p_progress text default 'all',
  p_sort text default 'newest'
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
  with filtered_sections as (
    select cs.id, cs.code, cs.name, cs.created_at
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
      section.created_at,
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
      (student_count * published_assignment_count)::bigint as grading_total,
      case
        when student_count * published_assignment_count = 0 then 0
        else round(completed_count::numeric * 100 / (student_count * published_assignment_count))::integer
      end as grading_percentage
    from section_counts
  ), progress_filtered as (
    select *
    from calculated
    where
      p_progress = 'all'
      or (p_progress = 'urgent' and grading_total > 0 and grading_percentage < 30)
      or (p_progress = 'good' and grading_total > 0 and grading_percentage between 30 and 99)
      or (p_progress = 'complete' and grading_total > 0 and completed_count = grading_total)
  )
  select
    progress_filtered.id,
    progress_filtered.code,
    progress_filtered.name,
    progress_filtered.student_count,
    progress_filtered.assignment_count,
    progress_filtered.completed_count,
    progress_filtered.grading_total,
    progress_filtered.grading_percentage,
    count(*) over ()::bigint as total_count
  from progress_filtered
  order by
    case when p_sort = 'newest' then progress_filtered.created_at end desc,
    case when p_sort = 'progress_asc' then progress_filtered.grading_percentage end asc,
    case when p_sort = 'students_desc' then progress_filtered.student_count end desc,
    case when p_sort = 'name_asc' then lower(progress_filtered.name) end asc,
    case when p_sort = 'name_asc' then progress_filtered.code end asc,
    progress_filtered.created_at desc,
    progress_filtered.id asc
  offset greatest(p_offset, 0)
  limit least(greatest(p_limit, 1), 100);
$$;
revoke all on function public.list_class_section_summaries(uuid, integer, integer, text, text, text)
from public, anon;
grant execute on function public.list_class_section_summaries(uuid, integer, integer, text, text, text)
to authenticated;
create function public.get_class_section_summary_facets(
  p_teacher_id uuid,
  p_search text default null
)
returns table (
  class_count bigint,
  student_count bigint,
  assignment_count bigint,
  completed_count bigint,
  grading_total bigint,
  all_count bigint,
  urgent_count bigint,
  good_count bigint,
  complete_count bigint
)
language sql
security invoker
set search_path = ''
as $$
  with teacher_sections as (
    select cs.id, cs.code, cs.name
    from public.class_sections cs
    where cs.teacher_id = p_teacher_id
      and p_teacher_id = auth.uid()
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
    from teacher_sections section
  ), calculated as (
    select
      section_counts.*,
      (student_count * published_assignment_count)::bigint as grading_total,
      case
        when student_count * published_assignment_count = 0 then 0
        else round(completed_count::numeric * 100 / (student_count * published_assignment_count))::integer
      end as grading_percentage
    from section_counts
  ), global_metrics as (
    select
      count(*)::bigint as class_count,
      coalesce(sum(student_count), 0)::bigint as student_count,
      coalesce(sum(assignment_count), 0)::bigint as assignment_count,
      coalesce(sum(completed_count), 0)::bigint as completed_count,
      coalesce(sum(grading_total), 0)::bigint as grading_total
    from calculated
  ), searched as (
    select *
    from calculated
    where
      nullif(trim(p_search), '') is null
      or code ilike '%' || replace(replace(replace(trim(p_search), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'
      or name ilike '%' || replace(replace(replace(trim(p_search), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'
  ), filter_counts as (
    select
      count(*)::bigint as all_count,
      count(*) filter (where grading_total > 0 and grading_percentage < 30)::bigint as urgent_count,
      count(*) filter (where grading_total > 0 and grading_percentage between 30 and 99)::bigint as good_count,
      count(*) filter (where grading_total > 0 and completed_count = grading_total)::bigint as complete_count
    from searched
  )
  select
    global_metrics.class_count,
    global_metrics.student_count,
    global_metrics.assignment_count,
    global_metrics.completed_count,
    global_metrics.grading_total,
    filter_counts.all_count,
    filter_counts.urgent_count,
    filter_counts.good_count,
    filter_counts.complete_count
  from global_metrics cross join filter_counts;
$$;
revoke all on function public.get_class_section_summary_facets(uuid, text)
from public, anon;
grant execute on function public.get_class_section_summary_facets(uuid, text)
to authenticated;
