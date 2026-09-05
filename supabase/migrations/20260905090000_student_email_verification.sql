alter table public.students
  add column if not exists email_source text not null default 'institutional_derived',
  add column if not exists email_verified_at timestamptz;

alter table public.students
  drop constraint if exists students_email_source_check;

alter table public.students
  add constraint students_email_source_check
  check (email_source in ('institutional_derived', 'student_verified'));

comment on column public.students.email_source is
  'Whether the address was derived from MSSV or verified by the student via OTP.';
