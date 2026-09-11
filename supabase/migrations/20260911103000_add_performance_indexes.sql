-- Performance optimization indexes for foreign keys, dashboards, and frequent lookups

-- 1. evaluations: Optimize looking up all evaluations for an assignment (grade page, gradebook, exports)
create index if not exists evaluations_assignment_id_idx
  on public.evaluations (assignment_id);

-- 2. evaluations: Optimize completed_count aggregation on dashboard (Index-Only Scan)
create index if not exists evaluations_assignment_status_idx
  on public.evaluations (assignment_id, status);

-- 3. assignments: Optimize querying assignments by class section
create index if not exists assignments_class_section_id_idx
  on public.assignments (class_section_id);

-- 4. assignments: Optimize published/closed assignment lookups on dashboard
create index if not exists assignments_class_status_idx
  on public.assignments (class_section_id, status);

-- 5. class_sections: Optimize querying classes by teacher
create index if not exists class_sections_teacher_id_idx
  on public.class_sections (teacher_id);

-- 6. notifications: Optimize student notification queries
create index if not exists notifications_student_id_idx
  on public.notifications (student_id);
