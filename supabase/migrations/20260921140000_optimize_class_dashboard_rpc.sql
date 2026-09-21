-- Compute the class dashboard aggregates once per request.
-- The previous V2 wrapper still called the legacy list and facets functions,
-- which repeated the student, assignment and evaluation counts.
create or replace function public.get_teacher_class_dashboard(
  p_teacher_id uuid,
  p_offset integer,
  p_limit integer,
  p_search text default null,
  p_progress text default 'all',
  p_sort text default 'newest'
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with teacher_sections as materialized (
    select cs.id, cs.code, cs.name, cs.created_at
    from public.class_sections cs
    where cs.teacher_id = p_teacher_id
      and p_teacher_id = auth.uid()
  ), section_counts as materialized (
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
    from teacher_sections section
  ), calculated as materialized (
    select
      section_counts.*,
      (student_count * published_assignment_count)::bigint as grading_total,
      case
        when student_count * published_assignment_count = 0 then 0
        else round(completed_count::numeric * 100 / (student_count * published_assignment_count))::integer
      end as grading_percentage
    from section_counts
  ), searched as materialized (
    select *
    from calculated
    where
      nullif(trim(p_search), '') is null
      or code ilike '%' || replace(replace(replace(trim(p_search), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'
      or name ilike '%' || replace(replace(replace(trim(p_search), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' escape E'\\'
  ), progress_filtered as materialized (
    select *
    from searched
    where
      p_progress = 'all'
      or (p_progress = 'urgent' and grading_total > 0 and grading_percentage < 30)
      or (p_progress = 'good' and grading_total > 0 and grading_percentage between 30 and 99)
      or (p_progress = 'complete' and grading_total > 0 and completed_count = grading_total)
  ), ordered as (
    select
      progress_filtered.*,
      row_number() over (
        order by
          case when p_sort = 'newest' then created_at end desc,
          case when p_sort = 'progress_asc' then grading_percentage end asc,
          case when p_sort = 'students_desc' then student_count end desc,
          case when p_sort = 'name_asc' then lower(name) end asc,
          case when p_sort = 'name_asc' then code end asc,
          created_at desc,
          id asc
      ) as order_position,
      count(*) over ()::bigint as total_count
    from progress_filtered
  ), paged as (
    select
      id,
      code,
      name,
      student_count,
      assignment_count,
      completed_count,
      grading_total,
      grading_percentage,
      total_count,
      order_position
    from ordered
    where order_position > greatest(p_offset, 0)
      and order_position <= greatest(p_offset, 0) + least(greatest(p_limit, 1), 100)
  ), global_metrics as (
    select
      count(*)::bigint as class_count,
      coalesce(sum(student_count), 0)::bigint as student_count,
      coalesce(sum(assignment_count), 0)::bigint as assignment_count,
      coalesce(sum(completed_count), 0)::bigint as completed_count,
      coalesce(sum(grading_total), 0)::bigint as grading_total
    from calculated
  ), filter_counts as (
    select
      count(*)::bigint as all_count,
      count(*) filter (where grading_total > 0 and grading_percentage < 30)::bigint as urgent_count,
      count(*) filter (where grading_total > 0 and grading_percentage between 30 and 99)::bigint as good_count,
      count(*) filter (where grading_total > 0 and completed_count = grading_total)::bigint as complete_count
    from searched
  )
  select jsonb_build_object(
    'rows', coalesce(
      (select jsonb_agg(to_jsonb(paged) - 'order_position' order by order_position) from paged),
      '[]'::jsonb
    ),
    'facets', (
      select jsonb_build_object(
        'class_count', global_metrics.class_count,
        'student_count', global_metrics.student_count,
        'assignment_count', global_metrics.assignment_count,
        'completed_count', global_metrics.completed_count,
        'grading_total', global_metrics.grading_total,
        'all_count', filter_counts.all_count,
        'urgent_count', filter_counts.urgent_count,
        'good_count', filter_counts.good_count,
        'complete_count', filter_counts.complete_count
      )
      from global_metrics cross join filter_counts
    ),
    'total', coalesce((select max(total_count) from ordered), 0)
  );
$$;

revoke all on function public.get_teacher_class_dashboard(uuid, integer, integer, text, text, text)
from public, anon;
grant execute on function public.get_teacher_class_dashboard(uuid, integer, integer, text, text, text)
to authenticated;
