-- Convert assigned_date and due_date from date to timestamptz to support custom hour, minute, second
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assignments'
      and column_name = 'assigned_date'
      and data_type = 'date'
  ) then
    alter table public.assignments 
      alter column assigned_date type timestamptz using (assigned_date::text || 'T00:00:00+07:00')::timestamptz;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'assignments'
      and column_name = 'due_date'
      and data_type = 'date'
  ) then
    alter table public.assignments 
      alter column due_date type timestamptz using (due_date::text || 'T23:59:59.999+07:00')::timestamptz;
  end if;
end $$;
