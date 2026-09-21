create table if not exists public.performance_samples (
  id uuid primary key default gen_random_uuid(),
  build_sha text not null check (char_length(build_sha) between 1 and 128),
  route_template text not null check (char_length(route_template) between 1 and 128),
  actor_scope text not null check (actor_scope in ('public', 'teacher', 'student')),
  metric text not null check (char_length(metric) between 1 and 64),
  duration_ms numeric not null check (duration_ms >= 0 and duration_ms <= 120000),
  device_class text not null check (char_length(device_class) between 1 and 32),
  network_class text not null check (char_length(network_class) between 1 and 32),
  created_at timestamptz not null default now()
);

create index if not exists performance_samples_created_at_idx
  on public.performance_samples (created_at);

create index if not exists performance_samples_route_metric_created_at_idx
  on public.performance_samples (route_template, metric, created_at);

alter table public.performance_samples enable row level security;
revoke all on table public.performance_samples from anon, authenticated;

comment on table public.performance_samples is
  'Sampled aggregate performance telemetry; contains no user or business identifiers.';
