create table public.assignment_attachments (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  original_name varchar(255) not null,
  cloudinary_asset_id text not null unique,
  cloudinary_public_id text not null unique,
  cloudinary_secure_url text not null,
  resource_type varchar(20) not null check (resource_type = 'raw'),
  version bigint not null,
  format varchar(10) not null check (format in ('pdf', 'docx', 'xlsx', 'pptx', 'txt', 'zip', 'jpg', 'jpeg', 'png')),
  bytes bigint not null check (bytes > 0 and bytes <= 20971520),
  status varchar(30) not null default 'active' check (status in ('active', 'deletion_pending', 'delete_failed', 'deleted')),
  uploaded_by uuid not null references public.teachers (id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.teachers (id)
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  latest_attempt_number integer not null default 0 check (latest_attempt_number between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table public.submission_attempts (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  attempt_number integer not null check (attempt_number between 1 and 10),
  submitted_at timestamptz not null default now(),
  is_late boolean not null,
  unique (submission_id, attempt_number)
);

create table public.submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_attempt_id uuid not null references public.submission_attempts (id) on delete cascade,
  original_name varchar(255) not null,
  cloudinary_asset_id text not null unique,
  cloudinary_public_id text not null unique,
  cloudinary_secure_url text not null,
  resource_type varchar(20) not null check (resource_type = 'raw'),
  version bigint not null,
  format varchar(10) not null check (format in ('pdf', 'docx', 'xlsx', 'pptx', 'txt', 'zip', 'jpg', 'jpeg', 'png')),
  bytes bigint not null check (bytes > 0 and bytes <= 20971520),
  created_at timestamptz not null default now()
);

create index assignment_attachments_active_by_assignment_idx
  on public.assignment_attachments (assignment_id, created_at desc)
  where status = 'active';
create index submissions_by_assignment_idx
  on public.submissions (assignment_id, updated_at desc);
create index submission_attempts_by_submission_idx
  on public.submission_attempts (submission_id, attempt_number desc);

create trigger submissions_set_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

create function public.create_submission_attempt(
  p_student_id uuid,
  p_class_section_id uuid,
  p_assignment_id uuid,
  p_is_late boolean,
  p_files jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  submission_record public.submissions%rowtype;
  attempt_id uuid;
  next_attempt_number integer;
begin
  if jsonb_typeof(p_files) <> 'array'
    or jsonb_array_length(p_files) not between 1 and 5 then
    raise exception using errcode = '22023', message = 'Submission must contain one to five files';
  end if;

  perform 1
  from public.assignments a
  join public.students s on s.id = p_student_id
  where a.id = p_assignment_id
    and a.class_section_id = p_class_section_id
    and s.class_section_id = p_class_section_id
    and a.status = 'published'
  for update of a;

  if not found then
    raise exception using errcode = '23514', message = 'Submission context is invalid or Assignment is not published';
  end if;

  insert into public.submissions (assignment_id, student_id)
  values (p_assignment_id, p_student_id)
  on conflict (assignment_id, student_id) do nothing;

  select * into submission_record
  from public.submissions
  where assignment_id = p_assignment_id and student_id = p_student_id
  for update;

  if submission_record.latest_attempt_number >= 10 then
    raise exception using errcode = '23505', message = 'Submission attempt limit reached';
  end if;

  next_attempt_number := submission_record.latest_attempt_number + 1;
  insert into public.submission_attempts (
    submission_id,
    attempt_number,
    is_late
  ) values (
    submission_record.id,
    next_attempt_number,
    p_is_late
  ) returning id into attempt_id;

  insert into public.submission_files (
    submission_attempt_id,
    original_name,
    cloudinary_asset_id,
    cloudinary_public_id,
    cloudinary_secure_url,
    resource_type,
    version,
    format,
    bytes
  )
  select
    attempt_id,
    file_item->>'originalName',
    file_item->>'assetId',
    file_item->>'publicId',
    file_item->>'secureUrl',
    file_item->>'resourceType',
    (file_item->>'version')::bigint,
    file_item->>'format',
    (file_item->>'bytes')::bigint
  from jsonb_array_elements(p_files) as file_item;

  update public.submissions
  set latest_attempt_number = next_attempt_number
  where id = submission_record.id;

  return attempt_id;
end;
$$;

alter table public.assignment_attachments enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_attempts enable row level security;
alter table public.submission_files enable row level security;

revoke all on public.assignment_attachments, public.submissions,
  public.submission_attempts, public.submission_files from public, anon, authenticated;

grant select on public.assignment_attachments, public.submissions,
  public.submission_attempts, public.submission_files to authenticated;

create policy assignment_attachments_teacher_select on public.assignment_attachments
for select to authenticated
using (public.owns_assignment(assignment_id));

create policy submissions_teacher_select on public.submissions
for select to authenticated
using (public.owns_assignment(assignment_id));

create policy submission_attempts_teacher_select on public.submission_attempts
for select to authenticated
using (
  exists (
    select 1 from public.submissions s
    where s.id = submission_id and public.owns_assignment(s.assignment_id)
  )
);

create policy submission_files_teacher_select on public.submission_files
for select to authenticated
using (
  exists (
    select 1
    from public.submission_attempts sa
    join public.submissions s on s.id = sa.submission_id
    where sa.id = submission_attempt_id and public.owns_assignment(s.assignment_id)
  )
);

revoke all on function public.create_submission_attempt(uuid, uuid, uuid, boolean, jsonb)
from public, anon, authenticated;
grant execute on function public.create_submission_attempt(uuid, uuid, uuid, boolean, jsonb)
to service_role;
