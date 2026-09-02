-- Convert assigned_date and due_date from date to timestamptz to support custom hour, minute, second
ALTER TABLE public.assignments 
  ALTER COLUMN assigned_date TYPE timestamptz USING (assigned_date::text || 'T00:00:00+07:00')::timestamptz,
  ALTER COLUMN due_date TYPE timestamptz USING (due_date::text || 'T23:59:59.999+07:00')::timestamptz;
