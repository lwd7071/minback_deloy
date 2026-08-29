create table public.teachers (
  id uuid primary key,
  display_name varchar(100) not null,
  email_notification_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.class_sections (
  id uuid primary key default gen_random_uuid(),
  code varchar(50) not null,
  name varchar(150) not null,
  teacher_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_section_id uuid not null,
  mssv varchar(50) not null,
  full_name varchar(150) not null,
  email varchar(254),
  nickname varchar(50) not null,
  pin_hash text not null,
  must_change_nickname boolean not null default true,
  must_change_pin boolean not null default true,
  failed_login_count integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  token_hash text not null,
  access_level varchar(30) not null,
  last_activity_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.login_rate_limits (
  id uuid primary key default gen_random_uuid(),
  scope varchar(20) not null,
  key_hash char(64) not null,
  attempt_count integer not null default 0,
  window_started_at timestamptz not null,
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_section_id uuid not null,
  title varchar(200) not null,
  description text not null default '',
  assigned_date date not null,
  due_date date not null,
  status varchar(20) not null,
  max_score numeric(5, 1) not null default 10.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  assignment_id uuid not null,
  score numeric(5, 1),
  feedback text not null default '',
  status varchar(20) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evaluation_history (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null,
  old_score numeric(5, 1),
  old_feedback text not null,
  old_status varchar(20) not null,
  changed_at timestamptz not null default now(),
  changed_by uuid not null
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  evaluation_id uuid,
  type varchar(30) not null,
  message varchar(500) not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

comment on column public.students.failed_login_count is
  'Enrollment-level failed PIN counter; fifth consecutive failure locks this Student for 15 minutes.';
comment on column public.students.locked_until is
  'Enrollment-level lock expiry; complements HMAC identifier and IP buckets.';
comment on table public.login_rate_limits is
  'Server-only HMAC buckets. identifier protects existing and unknown nicknames; ip limits bulk attempts.';
comment on column public.login_rate_limits.key_hash is
  'Lowercase 64-character HMAC-SHA256 hex digest; never stores raw IP or classCode:nickname.';

alter table public.teachers
  add constraint teachers_id_fkey foreign key (id) references auth.users (id);

alter table public.class_sections
  add constraint class_sections_teacher_id_fkey foreign key (teacher_id) references public.teachers (id),
  add constraint class_sections_code_key unique (code);

alter table public.students
  add constraint students_class_section_id_fkey foreign key (class_section_id) references public.class_sections (id),
  add constraint students_class_section_mssv_key unique (class_section_id, mssv),
  add constraint students_class_section_nickname_key unique (class_section_id, nickname),
  add constraint students_failed_login_count_check check (failed_login_count >= 0);

alter table public.student_sessions
  add constraint student_sessions_student_id_fkey foreign key (student_id) references public.students (id) on delete cascade,
  add constraint student_sessions_token_hash_key unique (token_hash),
  add constraint student_sessions_access_level_check check (access_level in ('credential_change', 'full'));

alter table public.login_rate_limits
  add constraint login_rate_limits_scope_check check (scope in ('identifier', 'ip')),
  add constraint login_rate_limits_attempt_count_check check (attempt_count >= 0),
  add constraint login_rate_limits_scope_key_hash_key unique (scope, key_hash);

alter table public.assignments
  add constraint assignments_class_section_id_fkey foreign key (class_section_id) references public.class_sections (id),
  add constraint assignments_dates_check check (due_date >= assigned_date),
  add constraint assignments_status_check check (status in ('draft', 'published', 'closed')),
  add constraint assignments_max_score_check check (max_score > 0);

alter table public.evaluations
  add constraint evaluations_student_id_fkey foreign key (student_id) references public.students (id),
  add constraint evaluations_assignment_id_fkey foreign key (assignment_id) references public.assignments (id),
  add constraint evaluations_student_assignment_key unique (student_id, assignment_id),
  add constraint evaluations_score_check check (score >= 0),
  add constraint evaluations_status_check check (status in ('pending', 'graded', 'returned'));

alter table public.evaluation_history
  add constraint evaluation_history_evaluation_id_fkey foreign key (evaluation_id) references public.evaluations (id) on delete cascade,
  add constraint evaluation_history_changed_by_fkey foreign key (changed_by) references public.teachers (id);

alter table public.notifications
  add constraint notifications_student_id_fkey foreign key (student_id) references public.students (id) on delete cascade,
  add constraint notifications_evaluation_id_fkey foreign key (evaluation_id) references public.evaluations (id) on delete cascade,
  add constraint notifications_type_check check (type in ('evaluation_created', 'evaluation_updated'));

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create trigger teachers_set_updated_at
before update on public.teachers
for each row execute function public.set_updated_at();

create trigger class_sections_set_updated_at
before update on public.class_sections
for each row execute function public.set_updated_at();

create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create trigger login_rate_limits_set_updated_at
before update on public.login_rate_limits
for each row execute function public.set_updated_at();

create trigger assignments_set_updated_at
before update on public.assignments
for each row execute function public.set_updated_at();

create trigger evaluations_set_updated_at
before update on public.evaluations
for each row execute function public.set_updated_at();

create function public.validate_evaluation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  student_class_section_id uuid;
  assignment_class_section_id uuid;
  assignment_max_score numeric(5, 1);
begin
  select class_section_id into student_class_section_id
  from public.students
  where id = new.student_id;

  select class_section_id, max_score
  into assignment_class_section_id, assignment_max_score
  from public.assignments
  where id = new.assignment_id;

  if student_class_section_id is distinct from assignment_class_section_id then
    raise exception using
      errcode = '23514',
      message = 'Evaluation Student and Assignment must belong to the same ClassSection';
  end if;

  if new.score is not null and new.score > assignment_max_score then
    raise exception using
      errcode = '23514',
      message = 'Evaluation score must not exceed Assignment max_score';
  end if;

  return new;
end;
$$;

create trigger evaluations_validate
before insert or update on public.evaluations
for each row execute function public.validate_evaluation();

create function public.write_evaluation_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (old.score, old.feedback, old.status)
    is distinct from
    (new.score, new.feedback, new.status) then
    insert into public.evaluation_history (
      evaluation_id,
      old_score,
      old_feedback,
      old_status,
      changed_by
    ) values (
      old.id,
      old.score,
      old.feedback,
      old.status,
      auth.uid()
    );
  end if;

  return new;
end;
$$;

create trigger evaluations_write_history
before update of score, feedback, status on public.evaluations
for each row execute function public.write_evaluation_history();

alter table public.teachers enable row level security;
alter table public.class_sections enable row level security;
alter table public.students enable row level security;
alter table public.student_sessions enable row level security;
alter table public.login_rate_limits enable row level security;
alter table public.assignments enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_history enable row level security;
alter table public.notifications enable row level security;

revoke all on all tables in schema public from public, anon, authenticated;

grant select, update on public.teachers to authenticated;
grant select, insert, update, delete on public.class_sections to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.assignments to authenticated;
grant select, insert, update, delete on public.evaluations to authenticated;
grant select on public.evaluation_history to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;

create function public.owns_class_section(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_sections
    where id = target_id and teacher_id = auth.uid()
  );
$$;

create function public.owns_student(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.students s
    join public.class_sections cs on cs.id = s.class_section_id
    where s.id = target_id and cs.teacher_id = auth.uid()
  );
$$;

create function public.owns_assignment(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignments a
    join public.class_sections cs on cs.id = a.class_section_id
    where a.id = target_id and cs.teacher_id = auth.uid()
  );
$$;

create function public.owns_evaluation(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.evaluations e
    join public.assignments a on a.id = e.assignment_id
    join public.class_sections cs on cs.id = a.class_section_id
    where e.id = target_id and cs.teacher_id = auth.uid()
  );
$$;

revoke all on function public.owns_class_section(uuid) from public, anon;
revoke all on function public.owns_student(uuid) from public, anon;
revoke all on function public.owns_assignment(uuid) from public, anon;
revoke all on function public.owns_evaluation(uuid) from public, anon;
grant execute on function public.owns_class_section(uuid) to authenticated;
grant execute on function public.owns_student(uuid) to authenticated;
grant execute on function public.owns_assignment(uuid) to authenticated;
grant execute on function public.owns_evaluation(uuid) to authenticated;

create policy teachers_select_own on public.teachers
for select to authenticated
using (id = auth.uid());

create policy teachers_update_own on public.teachers
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy class_sections_teacher_all on public.class_sections
for all to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

create policy students_teacher_all on public.students
for all to authenticated
using (public.owns_class_section(class_section_id))
with check (public.owns_class_section(class_section_id));

create policy assignments_teacher_all on public.assignments
for all to authenticated
using (public.owns_class_section(class_section_id))
with check (public.owns_class_section(class_section_id));

create policy evaluations_teacher_all on public.evaluations
for all to authenticated
using (public.owns_student(student_id) and public.owns_assignment(assignment_id))
with check (public.owns_student(student_id) and public.owns_assignment(assignment_id));

create policy evaluation_history_teacher_select on public.evaluation_history
for select to authenticated
using (public.owns_evaluation(evaluation_id));

create policy notifications_teacher_all on public.notifications
for all to authenticated
using (
  public.owns_student(student_id)
  and (evaluation_id is null or public.owns_evaluation(evaluation_id))
)
with check (
  public.owns_student(student_id)
  and (evaluation_id is null or public.owns_evaluation(evaluation_id))
);
