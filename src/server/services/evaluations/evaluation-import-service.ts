import "server-only";

import pkg from "exceljs";
import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { findAssignmentById } from "@/server/repositories/assignment-repository";
import { createEvaluationNotification } from "@/server/services/notifications/notification-service";
import type {
  EvaluationImportInput,
} from "@/schemas/evaluation-import";
import type {
  EvaluationImportPreviewDto,
  EvaluationImportPreviewRowDto,
  EvaluationImportResultDto,
} from "@/types/evaluation-import";

const { Workbook } = pkg;

export const MAX_EVALUATION_IMPORT_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_EVALUATION_IMPORT_DATA_ROWS = 2_000;

type SourceRow = { row: number; cells: string[] };

function validationError(message: string): never {
  throw new ApiError(400, API_ERROR_CODES.validation, message);
}

export function normalizeHeaderKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove Vietnamese accents for flexible matching
    .replace(/[^a-z0-9]/g, "");
}

function matchColumnIndex(
  headerKeys: string[],
  aliases: string[],
): number | undefined {
  for (const alias of aliases) {
    const target = normalizeHeaderKey(alias);
    const index = headerKeys.findIndex((key) => key === target);
    if (index !== -1) return index;
  }
  return undefined;
}

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      records.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (inQuotes) validationError("Tệp CSV có dấu nháy không hợp lệ");
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    records.push(row);
  }
  return records;
}

export function parseEvaluationCsv(text: string): SourceRow[] {
  return parseCsvRecords(text.replace(/^\uFEFF/, "")).map((cells, index) => ({
    row: index + 1,
    cells,
  }));
}

function getCellString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "object") {
    if ("result" in value && value.result !== undefined && value.result !== null) {
      return String(value.result).trim();
    }
    if (
      "richText" in value &&
      Array.isArray((value as { richText: Array<{ text?: string }> }).richText)
    ) {
      return (value as { richText: Array<{ text?: string }> }).richText
        .map((item) => item.text ?? "")
        .join("")
        .trim();
    }
    if ("text" in value && typeof (value as { text: unknown }).text === "string") {
      return (value as { text: string }).text.trim();
    }
  }
  return String(value).trim();
}

export async function parseEvaluationXlsx(buffer: ArrayBuffer): Promise<SourceRow[]> {
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(buffer) as never);
  } catch {
    validationError("Tệp XLSX không hợp lệ hoặc bị hỏng");
  }
  const worksheet = workbook.worksheets[0];
  if (!worksheet) validationError("Tệp XLSX không có trang tính");

  const records: SourceRow[] = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const valStr = getCellString(cell.value);
      cells[columnNumber - 1] = valStr !== "" ? valStr : (cell.text ?? "");
    });
    records.push({ row: rowNumber, cells });
  });
  return records;
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

  const headerKeys = headerRow.cells.map(normalizeHeaderKey);

  // Semantic columns are required. Aliases are accepted for exported/localized files.
  const mssvIndex = matchColumnIndex(headerKeys, [
    "mssv",
    "masv",
    "masinhvien",
    "studentcode",
    "studentid",
    "ma",
  ]);
  const scoreIndex = matchColumnIndex(headerKeys, [
    "diem",
    "diemso",
    "score",
    "grade",
    "point",
    "points",
  ]);
  const feedbackIndex = matchColumnIndex(headerKeys, [
    "nhanxet",
    "feedback",
    "ghichu",
    "comment",
    "comments",
    "danhgia",
  ]);
  const nameIndex = matchColumnIndex(headerKeys, [
    "hoten",
    "hovaten",
    "fullname",
    "name",
    "sinhvien",
  ]);

  if (mssvIndex === undefined) {
    validationError(
      "Không tìm thấy cột MSSV trong tệp. Tiêu đề hợp lệ: MSSV, Mã SV, Mã sinh viên.",
    );
  }

  if (nameIndex === undefined || scoreIndex === undefined || feedbackIndex === undefined) {
    validationError(
      "Tệp phải có đủ 4 cột bắt buộc: MSSV, Họ tên, Điểm và Feedback/Nhận xét.",
    );
  }

  // Fetch all students in the class section
  const { data: students, error: studentError } = await supabase
    .from("students")
    .select("id, mssv, full_name")
    .eq("class_section_id", assignment.classSectionId);

  if (studentError || !students) {
    throw new ApiError(500, API_ERROR_CODES.internal, "Lỗi đọc danh sách sinh viên");
  }

  const studentMap = new Map(
    students.map((s) => [s.mssv.trim().toLowerCase(), s]),
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
    const rawName = nameIndex !== undefined ? (row.cells[nameIndex] ?? "").trim() : undefined;
    const rawScore = scoreIndex !== undefined ? (row.cells[scoreIndex] ?? "").trim() : "";
    const rawFeedback = feedbackIndex !== undefined ? (row.cells[feedbackIndex] ?? "").trim() : "";

    const errors: Array<{ field: string; message: string }> = [];

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
        errors.push({ field: "score", message: "Điểm không phải là số hợp lệ" });
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
        errors.push({ field: "feedback", message: "Nhận xét vượt quá 5.000 ký tự" });
      } else {
        parsedFeedback = rawFeedback;
      }
    }

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
        action: "create",
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
    throw new ApiError(400, API_ERROR_CODES.validation, "Không thể lưu kết quả đánh giá: " + error.message);
  }

  const changed = (data ?? []) as Array<{
    id: string;
    student_id: string;
    change_type: "created" | "updated";
  }>;

  let notificationSent = 0;
  let notificationFailed = 0;
  if (input.mode === "publish") {
    const deliveries = await Promise.allSettled(
      changed.map(async (row) => {
        await createEvaluationNotification({
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
    notificationSent = deliveries.filter((item) => item.status === "fulfilled").length;
    notificationFailed = deliveries.length - notificationSent;
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
      emails: { sent: 0, failed: 0 },
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

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("BangDiemNhanXet");

  worksheet.columns = [
    { header: "MSSV", key: "mssv", width: 16 },
    { header: "Họ tên", key: "fullName", width: 30 },
    { header: "Điểm", key: "score", width: 22 },
    { header: "Feedback", key: "feedback", width: 60 },
  ];

  // Header Styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A4A" }, // Navy-900 MinBack color
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 28;

  if (students && students.length > 0) {
    for (const student of students) {
      worksheet.addRow({
        mssv: student.mssv,
        fullName: student.full_name,
        score: "",
        feedback: "",
      });
    }
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const safeTitle = assignment.title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-");
  const fileName = `bang-diem-${safeTitle}.xlsx`;

  return { buffer, fileName };
}
