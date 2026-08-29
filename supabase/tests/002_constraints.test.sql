begin;

select plan(2);

select is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'public'
      and is_nullable = 'YES'
      and (table_name, column_name) in (
        ('teachers', 'display_name'),
        ('teachers', 'email_notification_enabled'),
        ('class_sections', 'code'),
        ('class_sections', 'name'),
        ('class_sections', 'teacher_id'),
        ('students', 'class_section_id'),
        ('students', 'mssv'),
        ('students', 'full_name'),
        ('students', 'nickname'),
        ('students', 'pin_hash'),
        ('students', 'must_change_nickname'),
        ('students', 'must_change_pin'),
        ('students', 'failed_login_count'),
        ('student_sessions', 'student_id'),
        ('student_sessions', 'token_hash'),
        ('student_sessions', 'access_level'),
        ('student_sessions', 'last_activity_at'),
        ('student_sessions', 'expires_at'),
        ('login_rate_limits', 'scope'),
        ('login_rate_limits', 'key_hash'),
        ('login_rate_limits', 'attempt_count'),
        ('login_rate_limits', 'window_started_at'),
        ('assignments', 'class_section_id'),
        ('assignments', 'title'),
        ('assignments', 'description'),
        ('assignments', 'assigned_date'),
        ('assignments', 'due_date'),
        ('assignments', 'status'),
        ('assignments', 'max_score'),
        ('evaluations', 'student_id'),
        ('evaluations', 'assignment_id'),
        ('evaluations', 'feedback'),
        ('evaluations', 'status'),
        ('evaluation_history', 'evaluation_id'),
        ('evaluation_history', 'old_feedback'),
        ('evaluation_history', 'old_status'),
        ('evaluation_history', 'changed_by'),
        ('notifications', 'student_id'),
        ('notifications', 'type'),
        ('notifications', 'message')
      )
  ),
  0,
  'contract-required columns are NOT NULL'
);

select is(
  (
    select array_agg(conname::text order by conname::text collate "C")
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and contype in ('c', 'f', 'u')
  ),
  array[
    'assignments_class_section_id_fkey',
    'assignments_dates_check',
    'assignments_max_score_check',
    'assignments_status_check',
    'class_sections_code_key',
    'class_sections_teacher_id_fkey',
    'evaluation_history_changed_by_fkey',
    'evaluation_history_evaluation_id_fkey',
    'evaluations_assignment_id_fkey',
    'evaluations_score_check',
    'evaluations_status_check',
    'evaluations_student_assignment_key',
    'evaluations_student_id_fkey',
    'login_rate_limits_attempt_count_check',
    'login_rate_limits_scope_check',
    'login_rate_limits_scope_key_hash_key',
    'notifications_evaluation_id_fkey',
    'notifications_student_id_fkey',
    'notifications_type_check',
    'student_sessions_access_level_check',
    'student_sessions_student_id_fkey',
    'student_sessions_token_hash_key',
    'students_class_section_id_fkey',
    'students_class_section_mssv_key',
    'students_class_section_nickname_key',
    'students_failed_login_count_check',
    'teachers_id_fkey'
  ]::text[],
  'MVP relationships and integrity constraints are complete'
);

select * from finish();
rollback;
