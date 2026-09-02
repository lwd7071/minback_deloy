import "server-only";

/* Supabase's generated relation type cannot represent these nested joins. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { SupabaseClient } from "@supabase/supabase-js";

type NestedClassSection = {
  id?: string;
  code: string;
  name?: string;
  teacher_id?: string;
};
type NestedStudent = {
  full_name: string;
  class_sections: NestedClassSection | NestedClassSection[];
};
type NestedAssignment = { title: string };
type SubmissionActivityRow = {
  submitted_at: string;
  submissions:
    | {
        students: NestedStudent | NestedStudent[];
        assignments: NestedAssignment | NestedAssignment[];
      }
    | Array<{
        students: NestedStudent | NestedStudent[];
        assignments: NestedAssignment | NestedAssignment[];
      }>;
};
type EvaluationActivityRow = {
  updated_at: string;
  students: NestedStudent | NestedStudent[];
  assignments: NestedAssignment | NestedAssignment[];
};

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export type PendingGradingItem = {
  assignmentId: string;
  assignmentTitle: string;
  classCode: string;
  className: string;
  classSectionId: string;
  dueDate: string;
  pendingCount: number;
};

export type DashboardActivityItem = {
  type: "submission" | "graded";
  studentName: string;
  assignmentTitle: string;
  classCode: string;
  timestamp: string;
};

export async function listClassGradingProgress(
  supabase: SupabaseClient,
  teacherId: string,
) {
  // Reuse the existing summary RPC, which returns completed and total grading
  const { data, error } = await supabase.rpc("list_class_section_summaries", {
    p_teacher_id: teacherId,
    p_offset: 0,
    p_limit: 100,
  });
  if (error) throw new Error("CLASS_SECTION_SUMMARY_LIST_FAILED");
  const records = (data ?? []) as Array<Record<string, unknown>>;
  return records.map((row) => ({
    classSectionId: String(row.id),
    classCode: String(row.code),
    className: String(row.name),
    completed: Number(row.completed_count),
    total: Number(row.grading_total),
    percentage: Number(row.grading_percentage),
  }));
}

export async function listPendingGradingItems(
  supabase: SupabaseClient,
  teacherId: string,
  limit: number = 5,
): Promise<PendingGradingItem[]> {
  // Fetch assignments belonging to the teacher
  const { data: assignmentsData, error: aError } = await supabase
    .from("assignments")
    .select(
      "id, title, due_date, class_sections!inner(id, code, name, teacher_id)",
    )
    .eq("class_sections.teacher_id", teacherId)
    .in("status", ["published", "closed"]);

  if (aError) throw new Error("PENDING_GRADING_FETCH_FAILED");
  if (!assignmentsData?.length) return [];

  const assignmentIds = assignmentsData.map((a) => a.id);

  // Chạy song song 2 truy vấn lấy bài nộp và đánh giá
  const [submissionsResult, evaluationsResult] = await Promise.all([
    supabase
      .from("submissions")
      .select("assignment_id, student_id")
      .in("assignment_id", assignmentIds),
    supabase
      .from("evaluations")
      .select("assignment_id, student_id, status")
      .in("assignment_id", assignmentIds),
  ]);

  if (submissionsResult.error) throw new Error("PENDING_GRADING_FETCH_FAILED");
  if (evaluationsResult.error) throw new Error("PENDING_GRADING_FETCH_FAILED");

  const submissionsData = submissionsResult.data;
  const evaluationsData = evaluationsResult.data;

  const evalMap = new Map<string, string>();
  for (const ev of evaluationsData ?? []) {
    evalMap.set(`${ev.assignment_id}_${ev.student_id}`, ev.status);
  }

  // Calculate pending count per assignment
  const pendingCountByAssignment = new Map<string, number>();
  for (const sub of submissionsData ?? []) {
    const key = `${sub.assignment_id}_${sub.student_id}`;
    const status = evalMap.get(key);
    // Pending if no evaluation exists, or evaluation is in "pending" status
    if (!status || status === "pending") {
      const current = pendingCountByAssignment.get(sub.assignment_id) || 0;
      pendingCountByAssignment.set(sub.assignment_id, current + 1);
    }
  }

  const results: PendingGradingItem[] = [];
  for (const a of assignmentsData) {
    const count = pendingCountByAssignment.get(a.id) || 0;
    if (count > 0) {
      const classSection = a.class_sections as unknown as
        NestedClassSection | NestedClassSection[];
      const section = first(classSection);
      if (!section?.id || !section.name) continue;
      results.push({
        assignmentId: a.id,
        assignmentTitle: a.title,
        classCode: section.code,
        className: section.name,
        classSectionId: section.id,
        dueDate: a.due_date,
        pendingCount: count,
      });
    }
  }

  // Sort by nearest deadline first
  results.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );
  return results.slice(0, limit);
}

export async function listRecentActivity(
  supabase: SupabaseClient,
  teacherId: string,
  limit: number = 10,
): Promise<DashboardActivityItem[]> {
  // To avoid complex cross-table sorting in JS if data is huge, we'll fetch recent
  // submission_attempts and recent evaluations for the teacher, then merge and sort.

  // Recent submissions
  const submissionResult = (await (
    supabase.from("submission_attempts").select(`
      submitted_at,
      submissions!inner(
        assignment_id,
        student_id,
        students!inner(
          full_name,
          class_sections!inner(
            code,
            teacher_id
          )
        ),
        assignments!inner(
          title
        )
      )
    `) as any
  )
    .eq("submissions.students.class_sections.teacher_id", teacherId)
    .order("submitted_at", { ascending: false })
    .limit(limit)) as unknown as {
    data: SubmissionActivityRow[] | null;
    error: unknown | null;
  };
  const { data: subData, error: subError } = submissionResult;

  if (subError) throw new Error("ACTIVITY_FETCH_FAILED");

  // Recent evaluations
  const evaluationResult = (await (
    supabase.from("evaluations").select(`
      updated_at,
      status,
      students!inner(
        full_name,
        class_sections!inner(
          code,
          teacher_id
        )
      ),
      assignments!inner(
        title
      )
    `) as any
  )
    .eq("students.class_sections.teacher_id", teacherId)
    .in("status", ["graded", "returned"])
    .order("updated_at", { ascending: false })
    .limit(limit)) as unknown as {
    data: EvaluationActivityRow[] | null;
    error: unknown | null;
  };
  const { data: evalData, error: evalError } = evaluationResult;

  if (evalError) throw new Error("ACTIVITY_FETCH_FAILED");

  const activities: DashboardActivityItem[] = [];

  for (const row of subData ?? []) {
    const subs = first(row.submissions);
    const student = first(subs?.students);
    const assignment = first(subs?.assignments);
    const classSection = first(student?.class_sections);
    if (!student || !assignment || !classSection) continue;

    activities.push({
      type: "submission",
      studentName: student.full_name,
      assignmentTitle: assignment.title,
      classCode: classSection.code,
      timestamp: row.submitted_at,
    });
  }

  for (const row of evalData ?? []) {
    const student = first(row.students);
    const assignment = first(row.assignments);
    const classSection = first(student?.class_sections);
    if (!student || !assignment || !classSection) continue;

    activities.push({
      type: "graded",
      studentName: student.full_name,
      assignmentTitle: assignment.title,
      classCode: classSection.code,
      timestamp: row.updated_at,
    });
  }

  activities.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  return activities.slice(0, limit);
}
