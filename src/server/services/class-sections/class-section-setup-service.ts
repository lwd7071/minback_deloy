import "server-only";

import { hash } from "bcrypt";
import { randomUUID } from "node:crypto";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import {
  classSectionCreateSchema,
  type ClassSectionCreateInput,
} from "@/schemas/class-section";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { createClassSectionWithStudents } from "@/server/repositories/class-section-repository";
import {
  buildImportPreview,
  generateInitialPin,
  parseStudentCsv,
  parseStudentXlsx,
  validateImportFile,
  deriveInstitutionalEmail,
} from "@/server/services/class-sections/import-service";
import type { ClassSectionSetupDto } from "@/types/class-section";
import type { ImportResultDto } from "@/types/import";

const BCRYPT_ROUNDS = 10;

type SetupFile = File | null;

export type TeacherClassSectionSetupResult = {
  data: ClassSectionSetupDto;
  teacherId: string;
};

export async function createTeacherClassSectionSetup(
  input: ClassSectionCreateInput,
  file: SetupFile,
): Promise<TeacherClassSectionSetupResult> {
  const parsedInput = classSectionCreateSchema.parse(input);
  const { supabase, teacher } = await requireTeacher();

  let preview: ReturnType<typeof buildImportPreview> | null = null;
  if (file) {
    const kind = validateImportFile(file);
    const parsedRows =
      kind === "csv"
        ? parseStudentCsv(await file.text())
        : await parseStudentXlsx(await file.arrayBuffer());
    preview = buildImportPreview(parsedRows);
    if (preview.summary.valid === 0) {
      throw new ApiError(
        400,
        API_ERROR_CODES.validation,
        "Tệp import không có sinh viên hợp lệ",
      );
    }
  }

  const validRows =
    preview?.rows.filter(
      (row): row is typeof row & { student: NonNullable<typeof row.student> } =>
        row.status === "valid" && Boolean(row.student),
    ) ?? [];
  const credentials = await Promise.all(
    validRows.map(async (row) => {
      const initialPin = generateInitialPin();
      return {
        row: row.row,
        studentId: randomUUID(),
        mssv: row.student.mssv,
        fullName: row.student.fullName,
        email: row.student.email?.trim().toLowerCase() || deriveInstitutionalEmail(row.student.mssv),
        nickname: row.student.mssv,
        pinHash: await hash(initialPin, BCRYPT_ROUNDS),
      };
    }),
  );

  let classSection;
  try {
    classSection = await createClassSectionWithStudents(
      supabase,
      parsedInput,
      credentials.map((credential) => ({
        studentId: credential.studentId,
        mssv: credential.mssv,
        fullName: credential.fullName,
        email: credential.email,
        nickname: credential.nickname,
        pinHash: credential.pinHash,
      })),
    );
  } catch {
    throw new ApiError(
      500,
      API_ERROR_CODES.internal,
      "Không thể tạo lớp học phần",
    );
  }
  if (!classSection) {
    throw new ApiError(409, API_ERROR_CODES.conflict, "Mã lớp đã tồn tại");
  }

  let importResult: ImportResultDto | null = null;
  if (preview) {
    const credentialsByRow = new Map(
      credentials.map((item) => [item.row, item]),
    );
    const rows: ImportResultDto["rows"] = preview.rows.map((row) => {
      if (row.status === "skipped") {
        return {
          row: row.row,
          status: "skipped",
          errors: row.errors,
        };
      }
      const credential = credentialsByRow.get(row.row)!;
      return {
        row: row.row,
        status: "created",
        studentId: credential.studentId,
        initialNickname: credential.nickname,
      };
    });
    importResult = {
      summary: {
        total: rows.length,
        created: credentials.length,
        updated: 0,
        skipped: rows.filter((row) => row.status === "skipped").length,
      },
      rows,
    };
  }

  return {
    data: { classSection, import: importResult },
    teacherId: teacher.id,
  };
}
