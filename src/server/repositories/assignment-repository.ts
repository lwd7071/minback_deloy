import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AssignmentCreateInput,
  AssignmentUpdateInput,
} from "@/schemas/assignment";
import type { AssignmentDto, AssignmentStatus } from "@/types/assignment";

type AssignmentRow = {
  id: string;
  class_section_id: string;
  title: string;
  description: string;
  assigned_date: string;
  due_date: string;
  status: AssignmentStatus;
  max_score: number | string;
  created_at: string;
  updated_at: string;
};

const ASSIGNMENT_COLUMNS =
  "id, class_section_id, title, description, assigned_date, due_date, status, max_score, created_at, updated_at";

function toDto(row: AssignmentRow): AssignmentDto {
  return {
    id: row.id,
    classSectionId: row.class_section_id,
    title: row.title,
    description: row.description,
    assignedDate: row.assigned_date,
    dueDate: row.due_date,
    status: row.status,
    maxScore: Number(row.max_score),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAssignmentsByClassSection(
  classSectionId: string,
): Promise<AssignmentDto[]> {
  const { data, error } = await createAdminClient()
    .from("assignments")
    .select(ASSIGNMENT_COLUMNS)
    .eq("class_section_id", classSectionId)
    .order("created_at", { ascending: false });

  if (error) throw new Error("ASSIGNMENT_LIST_FAILED");
  return (data as AssignmentRow[]).map(toDto);
}

export async function createAssignment(
  classSectionId: string,
  input: AssignmentCreateInput,
): Promise<AssignmentDto> {
  const { data, error } = await createAdminClient()
    .from("assignments")
    .insert({
      class_section_id: classSectionId,
      title: input.title,
      description: input.description,
      assigned_date: input.assignedDate,
      due_date: input.dueDate,
      status: input.status,
      max_score: input.maxScore,
    })
    .select(ASSIGNMENT_COLUMNS)
    .single();

  if (error) throw new Error("ASSIGNMENT_CREATE_FAILED");
  return toDto(data as AssignmentRow);
}

export async function findAssignmentById(
  assignmentId: string,
  teacherId: string,
): Promise<AssignmentDto | null> {
  const { data, error } = await createAdminClient()
    .from("assignments")
    .select(`${ASSIGNMENT_COLUMNS}, class_sections!inner(teacher_id)`)
    .eq("id", assignmentId)
    .eq("class_sections.teacher_id", teacherId)
    .maybeSingle();

  if (error) throw new Error("ASSIGNMENT_GET_FAILED");
  return data ? toDto(data as AssignmentRow) : null;
}

export async function updateAssignment(
  assignmentId: string,
  input: AssignmentUpdateInput,
): Promise<AssignmentDto> {
  const updates: Record<string, string | number> = {};
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.assignedDate !== undefined)
    updates.assigned_date = input.assignedDate;
  if (input.dueDate !== undefined) updates.due_date = input.dueDate;
  if (input.status !== undefined) updates.status = input.status;
  if (input.maxScore !== undefined) updates.max_score = input.maxScore;

  const { data, error } = await createAdminClient()
    .from("assignments")
    .update(updates)
    .eq("id", assignmentId)
    .select(ASSIGNMENT_COLUMNS)
    .single();

  if (error) throw new Error("ASSIGNMENT_UPDATE_FAILED");
  return toDto(data as AssignmentRow);
}

export async function hasEvaluations(assignmentId: string): Promise<boolean> {
  const { count, error } = await createAdminClient()
    .from("evaluations")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", assignmentId);

  if (error) throw new Error("ASSIGNMENT_EVALUATION_CHECK_FAILED");
  return (count ?? 0) > 0;
}

export async function deleteDraftAssignment(
  assignmentId: string,
): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("assignments")
    .delete()
    .eq("id", assignmentId);

  if (error?.code === "23503") return false;
  if (error) throw new Error("ASSIGNMENT_DELETE_FAILED");
  return true;
}
