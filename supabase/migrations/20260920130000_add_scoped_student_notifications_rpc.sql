create function public.list_student_notifications(
  p_student_id uuid,
  p_class_section_id uuid,
  p_page integer default 1,
  p_page_size integer default 50,
  p_unread_only boolean default false
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with scoped as materialized (
    select
      n.id,
      n.type,
      n.message,
      n.evaluation_id,
      n.created_at,
      n.read_at,
      case
        when n.evaluation_id is null then null
        else e.assignment_id
      end as assignment_id
    from public.notifications n
    left join public.evaluations e on e.id = n.evaluation_id
    left join public.assignments a on a.id = e.assignment_id
    where n.student_id = p_student_id
      and (
        n.evaluation_id is null
        or (e.student_id = p_student_id and a.class_section_id = p_class_section_id)
      )
  ), filtered as (
    select * from scoped
    where not p_unread_only or read_at is null
  )
  select jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'type', f.type,
        'message', f.message,
        'evaluation_id', f.evaluation_id,
        'assignment_id', f.assignment_id,
        'created_at', f.created_at,
        'read_at', f.read_at
      ) order by f.created_at desc, f.id desc)
      from (
        select * from filtered
        order by created_at desc, id desc
        offset greatest((p_page - 1) * p_page_size, 0)
        limit least(greatest(p_page_size, 1), 100)
      ) f
    ), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'unread_count', (select count(*) from scoped where read_at is null)
  );
$$;

create function public.mark_student_notification_read(
  p_notification_id uuid,
  p_student_id uuid,
  p_class_section_id uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  with updated as (
    update public.notifications n
    set read_at = coalesce(n.read_at, now())
    where n.id = p_notification_id
      and n.student_id = p_student_id
      and (
        n.evaluation_id is null
        or exists (
          select 1
          from public.evaluations e
          join public.assignments a on a.id = e.assignment_id
          where e.id = n.evaluation_id
            and e.student_id = p_student_id
            and a.class_section_id = p_class_section_id
        )
      )
    returning id, type, message, evaluation_id, created_at, read_at
  )
  select case when u.id is null then null else jsonb_build_object(
    'id', u.id,
    'type', u.type,
    'message', u.message,
    'evaluation_id', u.evaluation_id,
    'assignment_id', (
      select e.assignment_id
      from public.evaluations e
      join public.assignments a on a.id = e.assignment_id
      where e.id = u.evaluation_id
        and e.student_id = p_student_id
        and a.class_section_id = p_class_section_id
    ),
    'created_at', u.created_at,
    'read_at', u.read_at
  ) end
  from updated u;
$$;

revoke all on function public.list_student_notifications(uuid, uuid, integer, integer, boolean)
from public, anon, authenticated;
revoke all on function public.mark_student_notification_read(uuid, uuid, uuid)
from public, anon, authenticated;
grant execute on function public.list_student_notifications(uuid, uuid, integer, integer, boolean)
to service_role;
grant execute on function public.mark_student_notification_read(uuid, uuid, uuid)
to service_role;
