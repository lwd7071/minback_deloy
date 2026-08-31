create or replace function public.consume_public_lookup_rate_limit(p_key_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row public.public_lookup_rate_limits%rowtype;
  v_now timestamptz := now();
begin
  if p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid rate-limit key';
  end if;

  insert into public.public_lookup_rate_limits (key_hash, request_count)
  values (p_key_hash, 0)
  on conflict (key_hash) do nothing;

  select * into current_row
  from public.public_lookup_rate_limits
  where key_hash = p_key_hash
  for update;

  if current_row.blocked_until is not null and current_row.blocked_until > v_now then
    return false;
  end if;

  if current_row.window_started_at <= v_now - interval '15 minutes' then
    update public.public_lookup_rate_limits
    set request_count = 1,
        window_started_at = v_now,
        blocked_until = null,
        updated_at = v_now
    where key_hash = p_key_hash;
    return true;
  end if;

  if current_row.request_count >= 30 then
    update public.public_lookup_rate_limits
    set blocked_until = current_row.window_started_at + interval '15 minutes',
        updated_at = v_now
    where key_hash = p_key_hash;
    return false;
  end if;

  update public.public_lookup_rate_limits
  set request_count = request_count + 1, updated_at = v_now
  where key_hash = p_key_hash;
  return true;
end;
$$;
