-- Chấm điểm theo tiêu chí (rubric): lưu cấu trúc tiêu chí ở bài tập,
-- điểm chi tiết từng tiêu chí ở kết quả của sinh viên.

alter table public.assignments
  add column if not exists criteria jsonb not null default '[]'::jsonb;

alter table public.assignments
  add constraint assignments_criteria_is_array
  check (jsonb_typeof(criteria) = 'array');

alter table public.evaluations
  add column if not exists criteria_scores jsonb;

alter table public.evaluations
  add constraint evaluations_criteria_scores_is_array
  check (criteria_scores is null or jsonb_typeof(criteria_scores) = 'array');

-- Cập nhật RPC: nhận thêm criteriaScores (optional) trong từng dòng
create or replace function public.bulk_upsert_evaluations(
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
    if item->'criteriaScores' is not null
      and jsonb_typeof(item->'criteriaScores') <> 'array' then
      raise exception using errcode = '22023', message = 'criteriaScores must be an array';
    end if;
  end loop;

  for item in select value from jsonb_array_elements(p_rows)
  loop
    select e.* into existing_record
    from public.evaluations e
    where e.assignment_id = p_assignment_id
      and e.student_id = (item->>'studentId')::uuid;

    if found then
      if (
        existing_record.score,
        existing_record.feedback,
        existing_record.status,
        existing_record.criteria_scores
      ) is distinct from (
        (item->>'score')::numeric,
        coalesce(item->>'feedback', ''),
        item->>'status',
        item->'criteriaScores'
      ) then
        update public.evaluations e
        set score = (item->>'score')::numeric,
            feedback = coalesce(item->>'feedback', ''),
            status = item->>'status',
            criteria_scores = item->'criteriaScores'
        where e.id = existing_record.id
        returning e.id into saved_id;
        return query select saved_id, (item->>'studentId')::uuid, 'updated'::text;
      end if;
    else
      insert into public.evaluations (
        student_id, assignment_id, score, feedback, status, criteria_scores
      )
      values (
        (item->>'studentId')::uuid,
        p_assignment_id,
        (item->>'score')::numeric,
        coalesce(item->>'feedback', ''),
        item->>'status',
        item->'criteriaScores'
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

-- Cập nhật get_teacher_grading_snapshot: bổ sung criteria vào assignment và criteria_scores vào evaluations
create or replace function public.get_teacher_grading_snapshot(
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
        'criteria_scores', e.criteria_scores,
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
