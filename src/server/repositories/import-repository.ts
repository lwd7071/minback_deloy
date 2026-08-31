import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type CreateImportedStudentInput = {
  classSectionId: string;
  mssv: string;
  fullName: string;
  email: string | null;
  nickname: string;
  pinHash: string;
};

type CreatedImportedStudent = { id: string; mssv: string };

type ExistingImportedStudent = { id: string; mssv: string };
const MSSV_LOOKUP_BATCH_SIZE = 100;

export async function createImportedStudents(
  students: CreateImportedStudentInput[],
): Promise<CreatedImportedStudent[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("students")
    .insert(
      students.map((student) => ({
        class_section_id: student.classSectionId,
        mssv: student.mssv,
        full_name: student.fullName,
        email: student.email,
        nickname: student.nickname,
        pin_hash: student.pinHash,
        must_change_nickname: true,
        must_change_pin: true,
      })),
    )
    .select("id, mssv");

  if (error || !data) {
    throw new Error(`IMPORT_STUDENT_CREATE_FAILED:${error?.code ?? "NO_DATA"}`);
  }
  return data as CreatedImportedStudent[];
}

export async function findImportedStudentsByMssv(
  classSectionId: string,
  mssvs: string[],
): Promise<ExistingImportedStudent[]> {
  if (mssvs.length === 0) return [];
  const supabase = createAdminClient();
  const existing: ExistingImportedStudent[] = [];

  for (let start = 0; start < mssvs.length; start += MSSV_LOOKUP_BATCH_SIZE) {
    const { data, error } = await supabase
      .from("students")
      .select("id, mssv")
      .eq("class_section_id", classSectionId)
      .in("mssv", mssvs.slice(start, start + MSSV_LOOKUP_BATCH_SIZE));

    if (error || !data) throw new Error("IMPORT_STUDENT_LOOKUP_FAILED");
    existing.push(...(data as ExistingImportedStudent[]));
  }

  return existing;
}

export async function updateImportedStudent(
  studentId: string,
  classSectionId: string,
  input: { fullName: string; email: string | null },
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("students")
    .update({ full_name: input.fullName, email: input.email })
    .eq("id", studentId)
    .eq("class_section_id", classSectionId);

  if (error) throw new Error("IMPORT_STUDENT_UPDATE_FAILED");
}
