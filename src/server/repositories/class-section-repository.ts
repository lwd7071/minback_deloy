import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ClassSectionCreateInput,
  ClassSectionListQuery,
  ClassSectionUpdateInput,
} from "@/schemas/class-section";
import type { ClassSectionDto } from "@/types/class-section";
import type { SupabaseClient } from "@supabase/supabase-js";

type ClassSectionRow = {
  id: string;
  code: string;
  name: string;
  teacher_id: string;
  created_at: string;
  updated_at: string;
};

function toDto(row: ClassSectionRow): ClassSectionDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type AtomicStudentSetupInput = {
  studentId: string;
  mssv: string;
  fullName: string;
  email: string | null;
  nickname: string;
  pinHash: string;
};

export async function createClassSectionWithStudents(
  supabase: SupabaseClient,
  input: ClassSectionCreateInput,
  students: AtomicStudentSetupInput[],
): Promise<ClassSectionDto | null> {
  const { data, error } = await supabase.rpc(
    "create_class_section_with_students",
    {
      p_code: input.code,
      p_name: input.name,
      p_students: students,
    },
  );

  if (error) {
    if (error.code === "23505") return null;
    throw new Error(`CLASS_SECTION_SETUP_FAILED:${error.code}`);
  }
  return data as ClassSectionDto;
}

export async function listClassSectionsByTeacher(
  teacherId: string,
  query: ClassSectionListQuery,
): Promise<{ rows: ClassSectionDto[]; total: number }> {
  const supabase = createAdminClient();
  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;
  const { data, count, error } = await supabase
    .from("class_sections")
    .select("id, code, name, teacher_id, created_at, updated_at", {
      count: "exact",
    })
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error("CLASS_SECTION_LIST_FAILED");
  return { rows: (data as ClassSectionRow[]).map(toDto), total: count ?? 0 };
}

export async function findClassSectionById(
  classSectionId: string,
  teacherId: string,
): Promise<ClassSectionDto | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("class_sections")
    .select("id, code, name, teacher_id, created_at, updated_at")
    .eq("id", classSectionId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (error) throw new Error("CLASS_SECTION_GET_FAILED");
  return data ? toDto(data as ClassSectionRow) : null;
}

export async function createClassSection(
  teacherId: string,
  input: ClassSectionCreateInput,
): Promise<ClassSectionDto | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("class_sections")
    .insert({ teacher_id: teacherId, code: input.code, name: input.name })
    .select("id, code, name, teacher_id, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") return null;
    throw new Error("CLASS_SECTION_CREATE_FAILED");
  }
  return toDto(data as ClassSectionRow);
}

export async function updateClassSection(
  classSectionId: string,
  teacherId: string,
  input: ClassSectionUpdateInput,
): Promise<ClassSectionDto | null> {
  const supabase = createAdminClient();
  const updates: Record<string, string> = {};
  if (input.code !== undefined) updates.code = input.code;
  if (input.name !== undefined) updates.name = input.name;

  const { data, error } = await supabase
    .from("class_sections")
    .update(updates)
    .eq("id", classSectionId)
    .eq("teacher_id", teacherId)
    .select("id, code, name, teacher_id, created_at, updated_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return null;
    throw new Error("CLASS_SECTION_UPDATE_FAILED");
  }
  return data ? toDto(data as ClassSectionRow) : null;
}

export async function deleteClassSection(
  classSectionId: string,
  teacherId: string,
): Promise<"deleted" | "conflict"> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("class_sections")
    .delete()
    .eq("id", classSectionId)
    .eq("teacher_id", teacherId);

  if (!error) return "deleted";
  if (error.code === "23503") return "conflict";
  throw new Error("CLASS_SECTION_DELETE_FAILED");
}
