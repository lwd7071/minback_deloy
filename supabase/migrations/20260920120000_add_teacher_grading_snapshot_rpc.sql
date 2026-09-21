create function public.get_teacher_grading_snapshot(
  p_teacher_id uuid,
  p_assignment_id uuid,
  p_page integer default 1,
  p_page_size integer default 100,
  p_search text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with owned_assignment as materialized (
    select a.*
    from public.assignments a
    join public.class_sections cs on cs.id = a.class_section_id
    where a.id = p_assignment_id
      and cs.teacher_id = p_teacher_id
      and p_teacher_id = auth.uid()
  ), page_students as materialized (
    select s.*
    from public.students s
    join owned_assignment a on a.class_section_id = s.class_section_id
    where nullif(trim(p_search), '') is null
      or s.mssv ilike '%' || trim(p_search) || '%'
      or s.full_name ilike '%' || trim(p_search) || '%'
      or s.nickname ilike '%' || trim(p_search) || '%'
    order by s.mssv asc, s.id asc
    offset greatest((p_page - 1) * p_page_size, 0)
    limit least(greatest(p_page_size, 1), 100)
  ), all_students as materialized (
    select s.id
    from public.students s
    join owned_assignment a on a.class_section_id = s.class_section_id
    where nullif(trim(p_search), '') is null
      or s.mssv ilike '%' || trim(p_search) || '%'
      or s.full_name ilike '%' || trim(p_search) || '%'
      or s.nickname ilike '%' || trim(p_search) || '%'
  ), current_evaluations as materialized (
    select e.*
    from public.evaluations e
    join page_students s on s.id = e.student_id
    where e.assignment_id = p_assignment_id
  ), all_evaluations as materialized (
    select e.*
    from public.evaluations e
    join all_students s on s.id = e.student_id
    where e.assignment_id = p_assignment_id
  ), counts as (
    select
      (select count(*) from all_students)::bigint as total_students,
      (select count(*) from all_evaluations where status = 'graded')::bigint as graded_count,
      (select count(*) from all_evaluations where status = 'returned')::bigint as returned_count,
      (select count(*) from all_evaluations where status in ('graded', 'returned'))::bigint as evaluated_count
  )
  select jsonb_build_object(
    'assignment', (select to_jsonb(a) from owned_assignment a),
    'students', coalesce((select jsonb_agg(to_jsonb(s) order by s.mssv, s.id) from page_students s), '[]'::jsonb),
    'evaluations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'student_id', e.student_id,
        'assignment_id', e.assignment_id,
        'score', e.score,
        'feedback', e.feedback,
        'status', e.status,
        'created_at', e.created_at,
        'updated_at', e.updated_at,
        'student', jsonb_build_object(
          'id', s.id,
          'mssv', s.mssv,
          'full_name', s.full_name,
          'nickname', s.nickname
        )
      ) order by e.created_at, e.id)
      from current_evaluations e
      join public.students s on s.id = e.student_id
    ), '[]'::jsonb),
    'student_meta', jsonb_build_object(
      'page', greatest(p_page, 1),
      'page_size', least(greatest(p_page_size, 1), 100),
      'total', (select total_students from counts)
    ),
    'grading_counts', jsonb_build_object(
      'total_students', (select total_students from counts),
      'graded_count', (select graded_count from counts),
      'returned_count', (select returned_count from counts),
      'evaluated_count', (select evaluated_count from counts),
      'missing_count', greatest((select total_students from counts) - (select evaluated_count from counts), 0)
    ),
    'snapshot_version', coalesce((
      select max(version_value)::text
      from (
        select max(updated_at) as version_value from owned_assignment
        union all
        select max(updated_at) from all_evaluations
        union all
        select max(students.updated_at) from all_students s
        join public.students students on students.id = s.id
      ) versions
    ), '')
  );
$$;

revoke all on function public.get_teacher_grading_snapshot(uuid, uuid, integer, integer, text)
from public, anon;
grant execute on function public.get_teacher_grading_snapshot(uuid, uuid, integer, integer, text)
to authenticated;
