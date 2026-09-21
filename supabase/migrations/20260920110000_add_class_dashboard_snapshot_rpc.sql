create function public.get_teacher_class_dashboard(
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
  with page as materialized (
    select *
    from public.list_class_section_summaries(
      p_teacher_id,
      p_offset,
      p_limit,
      p_search,
      p_progress,
      p_sort
    )
  ), facets as materialized (
    select *
    from public.get_class_section_summary_facets(p_teacher_id, p_search)
  )
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb),
    'facets', coalesce((select to_jsonb(facets) from facets limit 1), '{}'::jsonb),
    'total', coalesce((select max(total_count) from page), 0)
  );
$$;

revoke all on function public.get_teacher_class_dashboard(uuid, integer, integer, text, text, text)
from public, anon;
grant execute on function public.get_teacher_class_dashboard(uuid, integer, integer, text, text, text)
to authenticated;
