begin;

select plan(5);

select lives_ok(
  $$ select public.record_login_rate_limit_failure('identifier', repeat('a', 64)::char(64)) $$,
  'records an identifier failure through the atomic function'
);

select is(
  (
    select attempt_count
    from public.login_rate_limits
    where scope = 'identifier' and key_hash = repeat('a', 64)::char(64)
  ),
  1,
  'first identifier failure has count one'
);

select lives_ok(
  $$
    do $block$
    begin
      perform public.record_login_rate_limit_failure('identifier', repeat('a', 64)::char(64));
      perform public.record_login_rate_limit_failure('identifier', repeat('a', 64)::char(64));
      perform public.record_login_rate_limit_failure('identifier', repeat('a', 64)::char(64));
      perform public.record_login_rate_limit_failure('identifier', repeat('a', 64)::char(64));
    end;
    $block$;
  $$,
  'records repeated failures through the atomic function'
);

select is(
  (
    select attempt_count
    from public.login_rate_limits
    where scope = 'identifier' and key_hash = repeat('a', 64)::char(64)
  ),
  5,
  'repeated failures increment one-at-a-time'
);

select ok(
  (
    select blocked_until > now()
    from public.login_rate_limits
    where scope = 'identifier' and key_hash = repeat('a', 64)::char(64)
  ),
  'fifth identifier failure creates a 15-minute block'
);

select * from finish();
rollback;
