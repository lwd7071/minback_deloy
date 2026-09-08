import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { findAssignmentById } from "@/server/repositories/assignments/assignment-repository";
import { createEvaluationNotification } from "@/server/services/notifications/notification-service";
import type { EvaluationImportInput } from "@/schemas/evaluation-import";
import type {
  EvaluationImportPreviewDto,
  EvaluationImportPreviewRowDto,
  EvaluationImportResultDto,
} from "@/types/evaluation-import";
import {
  MAX_EVALUATION_IMPORT_FILE_BYTES,
  MAX_EVALUATION_IMPORT_DATA_ROWS,
  normalizeHeaderKey,
  resolveEvaluationColumns,
  parseEvaluationCsv,
  parseEvaluationXlsx,
} from "./parsers/evaluation-file-parser";
import { buildEvaluationTemplateWorkbook } from "./templates/evaluation-template-generator";

export {
  MAX_EVALUATION_IMPORT_FILE_BYTES,
  MAX_EVALUATION_IMPORT_DATA_ROWS,
  normalizeHeaderKey,
  resolveEvaluationColumns,
  parseEvaluationCsv,
  parseEvaluationXlsx,
};

function validationError(message: string): never {
  throw new ApiError(400, API_ERROR_CODES.validation, message);
}

export async function previewEvaluationFile(
  assignmentId: string,
  buffer: ArrayBuffer,
  fileName: string,
): Promise<EvaluationImportPreviewDto> {
  const { supabase, teacher } = await requireTeacher();

  const assignment = await findAssignmentById(assignmentId, teacher.id);
  if (!assignment) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  }

  if (buffer.byteLength > MAX_EVALUATION_IMPORT_FILE_BYTES) {
    validationError("Tệp vượt quá giới hạn 5 MB");
  }

  const extension = fileName.toLowerCase().split(".").pop();
  if (extension !== "csv" && extension !== "xlsx") {
    validationError("Chỉ hỗ trợ tệp định dạng .xlsx hoặc .csv");
  }

  const sourceRows =
    extension === "csv"
      ? parseEvaluationCsv(new TextDecoder("utf-8").decode(buffer))
      : await parseEvaluationXlsx(buffer);

  if (sourceRows.length === 0) {
    validationError("Tệp không có dữ liệu");
  }

  const [headerRow, ...dataRows] = sourceRows;
  if (!headerRow || !headerRow.cells.length) {
    validationError("Tệp phải có hàng tiêu đề");
  }

  const { mssvIndex, nameIndex, scoreIndex, feedbackIndex } =
    resolveEvaluationColumns(headerRow.cells);
  const semanticIndexes = new Set([
    mssvIndex,
    nameIndex,
    scoreIndex,
    feedbackIndex,
  ]);
  const extraHeaderIndexes = headerRow.cells
    .map((_, index) => index)
    .filter((index) => !semanticIndexes.has(index));

  // Fetch all students in the class section
  const { data: students, error: studentError } = await supabase
    .from("students")
    .select("id, mssv, full_name")
    .eq("class_section_id", assignment.classSectionId);

  if (studentError || !students) {
    throw new ApiError(
      500,
      API_ERROR_CODES.internal,
      "Lỗi đọc danh sách sinh viên",
    );
  }

  const studentMap = new Map(
    students.map((s) => [s.mssv.trim().toLowerCase(), s]),
  );
  const { data: existingEvaluations } = await supabase
    .from("evaluations")
    .select("student_id, score, feedback")
    .eq("assignment_id", assignmentId);
  const existingByStudent = new Map(
    (existingEvaluations ?? []).map((evaluation) => [
      evaluation.student_id,
      evaluation,
    ]),
  );

  const nonEmptyRows = dataRows.filter((row) =>
    row.cells.some((val) => val.trim().length > 0),
  );

  if (nonEmptyRows.length > MAX_EVALUATION_IMPORT_DATA_ROWS) {
    validationError("Tệp vượt quá giới hạn 2.000 dòng dữ liệu");
  }

  const seenMssvs = new Set<string>();
  const parsedRows: EvaluationImportPreviewRowDto[] = [];

  for (const row of nonEmptyRows) {
    const rawMssv = (row.cells[mssvIndex] ?? "").trim();
    const rawName =
      nameIndex !== undefined ? (row.cells[nameIndex] ?? "").trim() : undefined;
    const rawScore =
      scoreIndex !== undefined ? (row.cells[scoreIndex] ?? "").trim() : "";
    const rawFeedback =
      feedbackIndex !== undefined
        ? (row.cells[feedbackIndex] ?? "").trim()
        : "";

    const errors: Array<{ field: string; message: string }> = [];
    const warnings = extraHeaderIndexes.some(
      (index) => (row.cells[index] ?? "").trim() !== "",
    )
      ? [{ field: "columns", message: "Cột thừa đã được bỏ qua" }]
      : undefined;

    if (!rawMssv) {
      parsedRows.push({
        rowNumber: row.row,
        mssv: "",
        fullName: rawName,
        score: null,
        feedback: null,
        status: "invalid",
        errors: [{ field: "mssv", message: "MSSV bị trống" }],
      });
      continue;
    }

    const normalizedMssv = rawMssv.toLowerCase();
    if (seenMssvs.has(normalizedMssv)) {
      parsedRows.push({
        rowNumber: row.row,
        mssv: rawMssv,
        fullName: rawName,
        score: null,
        feedback: null,
        status: "invalid",
        errors: [{ field: "mssv", message: "MSSV bị trùng lặp trong tệp" }],
      });
      continue;
    }
    seenMssvs.add(normalizedMssv);

    const student = studentMap.get(normalizedMssv);
    if (!student) {
      errors.push({
        field: "mssv",
        message: `Sinh viên không thuộc lớp học phần này`,
      });
    }

    let parsedScore: number | null = null;
    if (rawScore !== "") {
      const numScore = Number(rawScore.replace(",", "."));
      if (Number.isNaN(numScore)) {
        errors.push({
          field: "score",
          message: "Điểm không phải là số hợp lệ",
        });
      } else if (numScore < 0) {
        errors.push({ field: "score", message: "Điểm không được nhỏ hơn 0" });
      } else if (numScore > assignment.maxScore) {
        errors.push({
          field: "score",
          message: `Điểm (${numScore}) vượt quá điểm tối đa của bài (${assignment.maxScore})`,
        });
      } else {
        // Round to 1 decimal place
        parsedScore = Math.round(numScore * 10) / 10;
      }
    } else {
      errors.push({ field: "score", message: "Chưa có điểm số (bắt buộc)" });
    }

    let parsedFeedback: string | null = null;
    if (rawFeedback !== "") {
      if (rawFeedback.length > 5000) {
        errors.push({
          field: "feedback",
          message: "Nhận xét vượt quá 5.000 ký tự",
        });
      } else {
        parsedFeedback = rawFeedback;
      }
    }

    const existing = student ? existingByStudent.get(student.id) : undefined;
    const action = !existing
      ? "create"
      : Number(existing.score ?? -1) === Number(parsedScore ?? -1) &&
          (existing.feedback ?? "") === (parsedFeedback ?? "")
        ? "unchanged"
        : "update";

    if (errors.length > 0) {
      parsedRows.push({
        rowNumber: row.row,
        mssv: rawMssv,
        fullName: rawName || student?.full_name,
        studentId: student?.id,
        score: parsedScore,
        feedback: parsedFeedback,
        status: "invalid",
        errors,
      });
    } else {
      parsedRows.push({
        rowNumber: row.row,
        mssv: rawMssv,
        fullName: student?.full_name || rawName,
        studentId: student!.id,
        score: parsedScore,
        feedback: parsedFeedback,
        status: "valid",
        action,
        warnings,
      });
    }
  }

  const validCount = parsedRows.filter((r) => r.status === "valid").length;
  const skippedCount = parsedRows.filter((r) => r.status === "invalid").length;

  return {
    summary: {
      total: parsedRows.length,
      valid: validCount,
      skipped: skippedCount,
      invalid: skippedCount,
      create: parsedRows.filter((r) => r.action === "create").length,
      update: parsedRows.filter((r) => r.action === "update").length,
      unchanged: parsedRows.filter((r) => r.action === "unchanged").length,
    },
    rows: parsedRows,
  };
}

export async function executeEvaluationImport(
  assignmentId: string,
  input: EvaluationImportInput,
): Promise<EvaluationImportResultDto> {
  const { supabase, teacher } = await requireTeacher();

  const assignment = await findAssignmentById(assignmentId, teacher.id);
  if (!assignment) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  }

  const targetStatus = input.mode === "publish" ? "returned" : "graded";

  const rowsToUpsert = input.evaluations.map((item) => ({
    studentId: item.studentId,
    score: item.score,
    feedback: item.feedback ?? "",
    status: targetStatus,
  }));

  const { data, error } = await supabase.rpc("bulk_upsert_evaluations", {
    p_assignment_id: assignmentId,
    p_rows: rowsToUpsert,
  });

  if (error) {
    throw new ApiError(
      400,
      API_ERROR_CODES.validation,
      "Không thể lưu kết quả đánh giá: " + error.message,
    );
  }

  const changed = (data ?? []) as Array<{
    id: string;
    student_id: string;
    change_type: "created" | "updated";
  }>;

  let notificationSent = 0;
  let notificationFailed = 0;
  let emailSent = 0;
  let emailFailed = 0;
  if (input.mode === "publish") {
    const deliveries = await Promise.allSettled(
      changed.map(async (row) => {
        return createEvaluationNotification({
          studentId: row.student_id,
          evaluationId: row.id,
          type:
            row.change_type === "created"
              ? "evaluation_created"
              : "evaluation_updated",
          assignmentTitle: assignment.title,
        });
      }),
    );
    notificationSent = deliveries.filter(
      (item) => item.status === "fulfilled",
    ).length;
    notificationFailed = deliveries.length - notificationSent;
    emailSent = deliveries.filter(
      (item) => item.status === "fulfilled" && item.value.emailSent,
    ).length;
    emailFailed = deliveries.filter(
      (item) => item.status === "fulfilled" && !item.value.emailSent,
    ).length;
  }

  return {
    count: rowsToUpsert.length,
    mode: input.mode,
    updatedEvaluations: rowsToUpsert.map((r) => ({
      studentId: r.studentId,
      score: r.score,
      feedback: r.feedback,
      status: targetStatus as "graded" | "returned",
    })),
    summary: {
      rows: rowsToUpsert.length,
      created: changed.filter((row) => row.change_type === "created").length,
      updated: changed.filter((row) => row.change_type === "updated").length,
      unchanged: Math.max(0, rowsToUpsert.length - changed.length),
      notifications: { sent: notificationSent, failed: notificationFailed },
      emails: { sent: emailSent, failed: emailFailed },
    },
  };
}

export async function generateEvaluationTemplate(
  assignmentId: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  const { supabase, teacher } = await requireTeacher();

  const assignment = await findAssignmentById(assignmentId, teacher.id);
  if (!assignment) {
    throw new ApiError(404, API_ERROR_CODES.notFound, "Không tìm thấy bài tập");
  }

  const { data: students } = await supabase
    .from("students")
    .select("mssv, full_name")
    .eq("class_section_id", assignment.classSectionId)
    .order("mssv", { ascending: true });

  return buildEvaluationTemplateWorkbook(
    assignment.title,
    (students ?? []).map((student) => ({
      mssv: student.mssv,
      fullName: student.full_name,
    })),
  );
}
