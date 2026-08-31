-- Atomically records a failed login bucket. The row is locked from its read
-- through its update, so concurrent failures cannot overwrite each other.
create function public.record_login_rate_limit_failure(
  p_scope varchar,
  p_key_hash char(64)
)
returns public.login_rate_limits
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_row public.login_rate_limits%rowtype;
  next_attempt_count integer;
  next_window_started_at timestamptz;
  next_blocked_until timestamptz;
  current_time timestamptz := clock_timestamp();
begin
  if p_scope not in ('identifier', 'ip') then
    raise exception using
      errcode = '22023',
      message = 'Unsupported login rate-limit scope';
  end if;

  insert into public.login_rate_limits (
    scope,
    key_hash,
    attempt_count,
    window_started_at,
    blocked_until
  ) values (
    p_scope,
    p_key_hash,
    0,
    current_time,
    null
  ) on conflict (scope, key_hash) do nothing;

  select * into current_row
  from public.login_rate_limits
  where scope = p_scope and key_hash = p_key_hash
  for update;

  if p_scope = 'ip'
    and current_row.window_started_at <= current_time - interval '15 minutes' then
    next_attempt_count := 1;
    next_window_started_at := current_time;
  else
    next_attempt_count := current_row.attempt_count + 1;
    next_window_started_at := current_row.window_started_at;
  end if;

  if (p_scope = 'identifier' and next_attempt_count >= 5)
    or (p_scope = 'ip' and next_attempt_count >= 30) then
    next_blocked_until := current_time + interval '15 minutes';
  else
    next_blocked_until := null;
  end if;

  update public.login_rate_limits
  set
    attempt_count = next_attempt_count,
    window_started_at = next_window_started_at,
    blocked_until = next_blocked_until
  where id = current_row.id
  returning * into current_row;

  return current_row;
end;
$$;

revoke all on function public.record_login_rate_limit_failure(varchar, char(64))
from public, anon, authenticated;
grant execute on function public.record_login_rate_limit_failure(varchar, char(64))
to service_role;
