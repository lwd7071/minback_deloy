import "server-only";

import { hash } from "bcrypt";
import { Workbook } from "exceljs";
import { z } from "zod";

import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { findClassSectionById } from "@/server/repositories/class-section-repository";
import {
  createImportedStudents,
  findImportedStudentsByMssv,
  updateImportedStudent,
} from "@/server/repositories/import-repository";
import type { ImportResultDto, ImportRowDto } from "@/types/import";
import type { ImportPreviewDto } from "@/types/frontend-rebuild";

const BCRYPT_ROUNDS = 10;
const REQUIRED_HEADERS = ["mssv", "họ tên"] as const;
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_DATA_ROWS = 2_000;

const importedStudentSchema = z.object({
  mssv: z.string().trim().min(1).max(50),
  fullName: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(254).optional(),
});

type ParsedStudentRow = z.infer<typeof importedStudentSchema> & { row: number };
type ParsedCsvRow =
  | { row: number; status: "valid"; student: ParsedStudentRow }
  | {
      row: number;
      status: "skipped";
      errors: NonNullable<ImportRowDto["errors"]>;
    };
type SourceRow = { row: number; cells: string[] };
type ImportFileKind = "csv" | "xlsx";

function validationError(message: string): never {
  throw new ApiError(400, API_ERROR_CODES.validation, message);
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

function normalizeHeader(value: string): string {
  return value.trim().toLocaleLowerCase("vi-VN");
}

export function validateImportFile(input: {
  name: string;
  size: number;
}): ImportFileKind {
  if (input.size > MAX_IMPORT_FILE_BYTES) {
    validationError("Tệp import vượt quá giới hạn 5 MB");
  }
  const extension = input.name.toLocaleLowerCase().split(".").pop();
  if (extension !== "csv" && extension !== "xlsx") {
    validationError("Chỉ hỗ trợ tệp CSV hoặc XLSX");
  }
  return extension;
}

function parseStudentRecords(records: SourceRow[]): ParsedCsvRow[] {
  const [headerRow, ...dataRows] = records;
  const header = headerRow?.cells;
  if (!header) validationError("Tệp CSV phải có hàng tiêu đề");

  const headerIndex = new Map(
    header.map((value, index) => [normalizeHeader(value), index]),
  );
  for (const requiredHeader of REQUIRED_HEADERS) {
    if (!headerIndex.has(requiredHeader)) {
      validationError("Tệp CSV thiếu cột bắt buộc MSSV hoặc Họ Tên");
    }
  }

  const mssvIndex = headerIndex.get("mssv")!;
  const fullNameIndex = headerIndex.get("họ tên")!;
  const emailIndex = headerIndex.get("email");

  const nonEmptyRows = dataRows.filter((row) =>
    row.cells.some((value) => value.trim().length > 0),
  );
  if (nonEmptyRows.length > MAX_IMPORT_DATA_ROWS) {
    validationError("Tệp import vượt quá giới hạn 2.000 dòng dữ liệu");
  }

  return nonEmptyRows.map<ParsedCsvRow>((row) => {
    const rowNumber = row.row;
    const parsed = importedStudentSchema.safeParse({
      mssv: row.cells[mssvIndex] ?? "",
      fullName: row.cells[fullNameIndex] ?? "",
      email:
        emailIndex === undefined || !row.cells[emailIndex]?.trim()
          ? undefined
          : row.cells[emailIndex],
    });
    if (!parsed.success) {
      return {
        row: rowNumber,
        status: "skipped" as const,
        errors: parsed.error.issues.map((issue) => ({
          field: String(issue.path[0] ?? "row"),
          message: issue.message,
        })),
      };
    }
    return {
      row: rowNumber,
      status: "valid" as const,
      student: { ...parsed.data, row: rowNumber },
    };
  });
}

export function parseStudentCsv(text: string): ParsedCsvRow[] {
  return parseStudentRecords(
    parseCsvRecords(text.replace(/^\uFEFF/, "")).map((cells, index) => ({
      row: index + 1,
      cells,
    })),
  );
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
    if (
      "result" in value &&
      value.result !== undefined &&
      value.result !== null
    ) {
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
    if (
      "text" in value &&
      typeof (value as { text: unknown }).text === "string"
    ) {
      return (value as { text: string }).text.trim();
    }
  }
  return String(value).trim();
}

export async function parseStudentXlsx(
  buffer: ArrayBuffer,
): Promise<ParsedCsvRow[]> {
  const workbook = new Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(buffer) as never);
  } catch {
    validationError("Tệp XLSX không hợp lệ");
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
  return parseStudentRecords(records);
}

export function buildImportPreview(
  parsedRows: ParsedCsvRow[],
): ImportPreviewDto {
  const seenMssvs = new Set<string>();
  const rows: ImportPreviewDto["rows"] = parsedRows.map((parsedRow) => {
    if (parsedRow.status === "skipped") return parsedRow;
    if (seenMssvs.has(parsedRow.student.mssv)) {
      return {
        row: parsedRow.row,
        status: "skipped",
        errors: [{ field: "mssv", message: "MSSV bị trùng trong tệp import" }],
      };
    }
    seenMssvs.add(parsedRow.student.mssv);
    return {
      row: parsedRow.row,
      status: "valid",
      student: {
        mssv: parsedRow.student.mssv,
        fullName: parsedRow.student.fullName,
        email: parsedRow.student.email,
      },
    };
  });
  return {
    summary: {
      total: rows.length,
      valid: rows.filter((row) => row.status === "valid").length,
      skipped: rows.filter((row) => row.status === "skipped").length,
    },
    rows,
  };
}

export function previewStudentCsv(text: string): ImportPreviewDto {
  return buildImportPreview(parseStudentCsv(text));
}

export async function previewStudentXlsx(
  buffer: ArrayBuffer,
): Promise<ImportPreviewDto> {
  return buildImportPreview(await parseStudentXlsx(buffer));
}

export const DEFAULT_INITIAL_PIN = "111111";

export function deriveInstitutionalEmail(mssv: string): string {
  return `${mssv.trim().toLowerCase()}@student.hcmute.edu.vn`;
}

export function generateInitialPin(): string {
  return DEFAULT_INITIAL_PIN;
}

export async function importTeacherClassSectionCsv(
  classSectionId: string,
  csvText: string,
): Promise<ImportResultDto> {
  return importTeacherClassSection(classSectionId, parseStudentCsv(csvText));
}

export async function importTeacherClassSectionXlsx(
  classSectionId: string,
  buffer: ArrayBuffer,
): Promise<ImportResultDto> {
  return importTeacherClassSection(
    classSectionId,
    await parseStudentXlsx(buffer),
  );
}

async function importTeacherClassSection(
  classSectionId: string,
  parsedRows: ParsedCsvRow[],
): Promise<ImportResultDto> {
  const { teacher } = await requireTeacher();
  const classSection = await findClassSectionById(classSectionId, teacher.id);
  if (!classSection) {
    throw new ApiError(
      404,
      API_ERROR_CODES.notFound,
      "Không tìm thấy lớp học phần",
    );
  }

  if (parsedRows.length === 0)
    validationError("Tệp CSV không có dữ liệu sinh viên");

  const outcomes = new Map<number, ImportRowDto>();
  const seenMssvs = new Set<string>();
  const validRows: ParsedStudentRow[] = [];
  for (const parsedRow of parsedRows) {
    if (parsedRow.status === "skipped") {
      outcomes.set(parsedRow.row, parsedRow);
      continue;
    }
    if (seenMssvs.has(parsedRow.student.mssv)) {
      outcomes.set(parsedRow.row, {
        row: parsedRow.row,
        status: "skipped",
        errors: [{ field: "mssv", message: "MSSV bị trùng trong tệp import" }],
      });
      continue;
    }
    seenMssvs.add(parsedRow.student.mssv);
    validRows.push(parsedRow.student);
  }

  const existingByMssv = new Map(
    (
      await findImportedStudentsByMssv(
        classSectionId,
        validRows.map((row) => row.mssv),
      )
    ).map((student) => [student.mssv, student.id]),
  );
  const rowsToCreate = validRows.filter((row) => !existingByMssv.has(row.mssv));
  const credentials = await Promise.all(
    rowsToCreate.map(async (row) => {
      const initialPin = generateInitialPin();
      return {
        row,
        initialPin,
        pinHash: await hash(initialPin, BCRYPT_ROUNDS),
      };
    }),
  );
  const created = await createImportedStudents(
    credentials.map(({ row, pinHash }) => ({
      classSectionId,
      mssv: row.mssv,
      fullName: row.fullName,
      email:
        row.email?.trim().toLowerCase() || deriveInstitutionalEmail(row.mssv),
      nickname: row.mssv,
      pinHash,
    })),
  );
  if (created.length !== rowsToCreate.length) {
    throw new Error("IMPORT_STUDENT_CREATE_INCOMPLETE");
  }
  const idsByMssv = new Map(
    created.map((student) => [student.mssv, student.id]),
  );
  for (const { row } of credentials) {
    outcomes.set(row.row, {
      row: row.row,
      status: "created",
      studentId: idsByMssv.get(row.mssv),
      initialNickname: row.mssv,
    });
  }

  await Promise.all(
    validRows
      .filter((row) => existingByMssv.has(row.mssv))
      .map(async (row) => {
        const studentId = existingByMssv.get(row.mssv)!;
        await updateImportedStudent(studentId, classSectionId, {
          fullName: row.fullName,
          email:
            row.email?.trim().toLowerCase() ||
            deriveInstitutionalEmail(row.mssv),
        });
        outcomes.set(row.row, { row: row.row, status: "updated", studentId });
      }),
  );

  const rows = parsedRows.map((row) => outcomes.get(row.row)!);
  const summary = rows.reduce(
    (value, row) => ({ ...value, [row.status]: value[row.status] + 1 }),
    { total: rows.length, created: 0, updated: 0, skipped: 0 },
  );

  return {
    summary,
    rows,
  };
}
