create or replace function public.create_class_section_with_students(
  p_code text,
  p_name text,
  p_students jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_class public.class_sections%rowtype;
  student_item jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if jsonb_typeof(p_students) <> 'array'
    or jsonb_array_length(p_students) > 2000 then
    raise exception using errcode = '22023', message = 'Student setup size is invalid';
  end if;

  for student_item in
    select student_rows.value
    from jsonb_array_elements(p_students) as student_rows(value)
  loop
    if nullif(trim(student_item->>'studentId'), '') is null
      or nullif(trim(student_item->>'mssv'), '') is null
      or nullif(trim(student_item->>'fullName'), '') is null
      or nullif(trim(student_item->>'nickname'), '') is null
      or nullif(trim(student_item->>'pinHash'), '') is null then
      raise exception using errcode = '22023', message = 'Student setup row is invalid';
    end if;
  end loop;

  insert into public.class_sections (code, name, teacher_id)
  values (p_code, p_name, auth.uid())
  returning * into created_class;

  insert into public.students (
    id,
    class_section_id,
    mssv,
    full_name,
    email,
    nickname,
    pin_hash,
    must_change_nickname,
    must_change_pin
  )
  select
    (student_rows.value->>'studentId')::uuid,
    created_class.id,
    student_rows.value->>'mssv',
    student_rows.value->>'fullName',
    nullif(student_rows.value->>'email', ''),
    student_rows.value->>'nickname',
    student_rows.value->>'pinHash',
    true,
    true
  from jsonb_array_elements(p_students) as student_rows(value);

  return jsonb_build_object(
    'id', created_class.id,
    'code', created_class.code,
    'name', created_class.name,
    'createdAt', created_class.created_at,
    'updatedAt', created_class.updated_at
  );
end;
$$;

revoke all on function public.create_class_section_with_students(text, text, jsonb)
from public, anon;
grant execute on function public.create_class_section_with_students(text, text, jsonb)
to authenticated;
