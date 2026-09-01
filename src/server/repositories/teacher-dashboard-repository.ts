import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { listClassSectionSummaries } from "./frontend-rebuild-repository";

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
  limit: number = 5
): Promise<PendingGradingItem[]> {
  // Fetch assignments belonging to the teacher
  const { data: assignmentsData, error: aError } = await supabase
    .from("assignments")
    .select("id, title, due_date, class_sections!inner(id, code, name, teacher_id)")
    .eq("class_sections.teacher_id", teacherId)
    .in("status", ["published", "closed"]);
    
  if (aError) throw new Error("PENDING_GRADING_FETCH_FAILED");
  if (!assignmentsData?.length) return [];

  const assignmentIds = assignmentsData.map(a => a.id);

  // Fetch submissions
  const { data: submissionsData, error: sError } = await supabase
    .from("submissions")
    .select("assignment_id, student_id")
    .in("assignment_id", assignmentIds);

  if (sError) throw new Error("PENDING_GRADING_FETCH_FAILED");

  // Fetch evaluations
  const { data: evaluationsData, error: eError } = await supabase
    .from("evaluations")
    .select("assignment_id, student_id, status")
    .in("assignment_id", assignmentIds);

  if (eError) throw new Error("PENDING_GRADING_FETCH_FAILED");

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
      // Cast to any to bypass Supabase typing quirks for nested joins
      const classSection = a.class_sections as any;
      results.push({
        assignmentId: a.id,
        assignmentTitle: a.title,
        classCode: Array.isArray(classSection) ? classSection[0].code : classSection.code,
        className: Array.isArray(classSection) ? classSection[0].name : classSection.name,
        classSectionId: Array.isArray(classSection) ? classSection[0].id : classSection.id,
        dueDate: a.due_date,
        pendingCount: count,
      });
    }
  }

  // Sort by nearest deadline first
  results.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  return results.slice(0, limit);
}

export async function listRecentActivity(
  supabase: SupabaseClient,
  teacherId: string,
  limit: number = 10
): Promise<DashboardActivityItem[]> {
  // To avoid complex cross-table sorting in JS if data is huge, we'll fetch recent 
  // submission_attempts and recent evaluations for the teacher, then merge and sort.
  
  // Recent submissions
  const { data: subData, error: subError } = await (supabase
    .from("submission_attempts")
    .select(`
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
    `) as any)
    .eq("submissions.students.class_sections.teacher_id", teacherId)
    .order("submitted_at", { ascending: false })
    .limit(limit);

  if (subError) throw new Error("ACTIVITY_FETCH_FAILED");

  // Recent evaluations
  const { data: evalData, error: evalError } = await (supabase
    .from("evaluations")
    .select(`
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
    `) as any)
    .eq("students.class_sections.teacher_id", teacherId)
    .in("status", ["graded", "returned"])
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (evalError) throw new Error("ACTIVITY_FETCH_FAILED");

  const activities: DashboardActivityItem[] = [];

  for (const row of (subData as any[]) ?? []) {
    const subs = Array.isArray(row.submissions) ? row.submissions[0] : row.submissions;
    const student = Array.isArray(subs.students) ? subs.students[0] : subs.students;
    const assignment = Array.isArray(subs.assignments) ? subs.assignments[0] : subs.assignments;
    const classSection = Array.isArray(student.class_sections) ? student.class_sections[0] : student.class_sections;
    
    activities.push({
      type: "submission",
      studentName: student.full_name,
      assignmentTitle: assignment.title,
      classCode: classSection.code,
      timestamp: row.submitted_at,
    });
  }

  for (const row of (evalData as any[]) ?? []) {
    const student = Array.isArray(row.students) ? row.students[0] : row.students;
    const assignment = Array.isArray(row.assignments) ? row.assignments[0] : row.assignments;
    const classSection = Array.isArray(student.class_sections) ? student.class_sections[0] : student.class_sections;

    activities.push({
      type: "graded",
      studentName: student.full_name,
      assignmentTitle: assignment.title,
      classCode: classSection.code,
      timestamp: row.updated_at,
    });
  }

  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return activities.slice(0, limit);
}
