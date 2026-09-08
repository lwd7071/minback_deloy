begin;
select plan(9);

set local request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';

select results_eq(
  $$select code::text from public.list_class_section_summaries(
    'f0000000-0000-0000-0000-000000000002', 0, 20, null, 'all', 'newest'
  )$$,
  $$values (null::text) limit 0$$,
  'summary list excludes another Teacher classes'
);

select results_eq(
  $$select code::text from public.list_class_section_summaries(
    'f0000000-0000-0000-0000-000000000001', 0, 20, null, 'urgent', 'newest'
  )$$,
  $$values ('DEMO_A'::text)$$,
  'a class with work and zero completed evaluations is urgent'
);

insert into public.class_sections (id, code, name, teacher_id, created_at) values
  ('f1100000-0000-0000-0000-000000000001', 'EMPTY_A', 'Empty progress', 'f0000000-0000-0000-0000-000000000001', '2026-09-01'),
  ('f1100000-0000-0000-0000-000000000002', 'DONE_A', 'Complete progress', 'f0000000-0000-0000-0000-000000000001', '2026-09-02');

insert into public.students (id, class_section_id, mssv, full_name, nickname, pin_hash) values
  ('f2100000-0000-0000-0000-000000000001', 'f1100000-0000-0000-0000-000000000002', 'DONE001', 'Done Student', 'DONE001', 'test-hash');

insert into public.assignments (id, class_section_id, title, assigned_date, due_date, status, max_score) values
  ('f3100000-0000-0000-0000-000000000001', 'f1100000-0000-0000-0000-000000000002', 'Done Assignment', '2026-08-01', '2026-08-31', 'published', 10);

insert into public.evaluations (id, student_id, assignment_id, score, status) values
  ('f4100000-0000-0000-0000-000000000001', 'f2100000-0000-0000-0000-000000000001', 'f3100000-0000-0000-0000-000000000001', 8, 'graded');

insert into public.class_sections (id, code, name, teacher_id, created_at) values
  ('f1100000-0000-0000-0000-000000000029', 'P29_A', 'Progress 29', 'f0000000-0000-0000-0000-000000000001', '2026-09-03'),
  ('f1100000-0000-0000-0000-000000000030', 'P30_A', 'Progress 30', 'f0000000-0000-0000-0000-000000000001', '2026-09-04'),
  ('f1100000-0000-0000-0000-000000000099', 'P99_A', 'Progress 99', 'f0000000-0000-0000-0000-000000000001', '2026-09-05');

insert into public.students (class_section_id, mssv, full_name, nickname, pin_hash)
select
  'f1100000-0000-0000-0000-000000000029',
  'P29-' || lpad(n::text, 3, '0'),
  'Progress 29 Student ' || n,
  'P29-' || lpad(n::text, 3, '0'),
  'test-hash'
from generate_series(1, 100) n;

insert into public.students (class_section_id, mssv, full_name, nickname, pin_hash)
select
  'f1100000-0000-0000-0000-000000000030',
  'P30-' || lpad(n::text, 3, '0'),
  'Progress 30 Student ' || n,
  'P30-' || lpad(n::text, 3, '0'),
  'test-hash'
from generate_series(1, 10) n;

insert into public.students (class_section_id, mssv, full_name, nickname, pin_hash)
select
  'f1100000-0000-0000-0000-000000000099',
  'P99-' || lpad(n::text, 3, '0'),
  'Progress 99 Student ' || n,
  'P99-' || lpad(n::text, 3, '0'),
  'test-hash'
from generate_series(1, 100) n;

insert into public.assignments (id, class_section_id, title, assigned_date, due_date, status, max_score) values
  ('f3100000-0000-0000-0000-000000000029', 'f1100000-0000-0000-0000-000000000029', 'Progress 29 Assignment', '2026-08-01', '2026-08-31', 'published', 10),
  ('f3100000-0000-0000-0000-000000000030', 'f1100000-0000-0000-0000-000000000030', 'Progress 30 Assignment', '2026-08-01', '2026-08-31', 'published', 10),
  ('f3100000-0000-0000-0000-000000000099', 'f1100000-0000-0000-0000-000000000099', 'Progress 99 Assignment', '2026-08-01', '2026-08-31', 'published', 10);

insert into public.evaluations (student_id, assignment_id, score, status)
select id, 'f3100000-0000-0000-0000-000000000029', 8, 'graded'
from public.students
where class_section_id = 'f1100000-0000-0000-0000-000000000029'
order by mssv
limit 29;

insert into public.evaluations (student_id, assignment_id, score, status)
select id, 'f3100000-0000-0000-0000-000000000030', 8, 'graded'
from public.students
where class_section_id = 'f1100000-0000-0000-0000-000000000030'
order by mssv
limit 3;

insert into public.evaluations (student_id, assignment_id, score, status)
select id, 'f3100000-0000-0000-0000-000000000099', 8, 'graded'
from public.students
where class_section_id = 'f1100000-0000-0000-0000-000000000099'
order by mssv
limit 99;

select results_eq(
  $$select code::text from public.list_class_section_summaries(
    'f0000000-0000-0000-0000-000000000001', 0, 20, null, 'urgent', 'name_asc'
  )$$,
  $$values ('DEMO_A'::text), ('P29_A'::text)$$,
  'urgent includes 0 and 29 percent work but excludes zero-total classes'
);

select results_eq(
  $$select code::text from public.list_class_section_summaries(
    'f0000000-0000-0000-0000-000000000001', 0, 20, null, 'good', 'name_asc'
  )$$,
  $$values ('P30_A'::text), ('P99_A'::text)$$,
  'good includes the rounded 30 through 99 percent boundary'
);

select results_eq(
  $$select code::text from public.list_class_section_summaries(
    'f0000000-0000-0000-0000-000000000001', 0, 20, null, 'complete', 'name_asc'
  )$$,
  $$values ('DONE_A'::text)$$,
  'complete returns only a non-empty 100 percent class'
);

select is(
  (select all_count from public.get_class_section_summary_facets(
    'f0000000-0000-0000-0000-000000000001', null
  )),
  6::bigint,
  'all facet includes every owned class'
);

select is(
  (select class_count from public.get_class_section_summary_facets(
    'f0000000-0000-0000-0000-000000000001', 'NO_MATCH'
  )),
  6::bigint,
  'global KPI class count is independent of search'
);

select results_eq(
  $$select all_count, urgent_count, good_count, complete_count
    from public.get_class_section_summary_facets(
      'f0000000-0000-0000-0000-000000000001', 'P'
    )$$,
  $$values (3::bigint, 1::bigint, 2::bigint, 0::bigint)$$,
  'facet counts follow search before progress filtering'
);

select is(
  (select total_count from public.list_class_section_summaries(
    'f0000000-0000-0000-0000-000000000001', 0, 1, null, 'all', 'name_asc'
  ) limit 1),
  6::bigint,
  'pagination row carries the pre-pagination total'
);

select * from finish();
rollback;
