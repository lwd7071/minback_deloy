import pkg from "exceljs";
import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";

const { Workbook } = pkg;

export const MAX_EVALUATION_IMPORT_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_EVALUATION_IMPORT_DATA_ROWS = 2_000;

export type SourceRow = { row: number; cells: string[] };

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

export function matchColumnIndex(
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

export function resolveEvaluationColumns(headerCells: string[]) {
  const keys = headerCells.map(normalizeHeaderKey);
  const semanticAliases = [
    ["mssv", "masv", "masinhvien", "studentcode", "studentid", "ma"],
    ["hoten", "hovaten", "fullname", "name", "sinhvien"],
    ["diem", "diemso", "score", "grade", "point", "points"],
    ["feedback", "nhanxet", "ghichu", "comment", "comments", "danhgia"],
  ];
  for (const aliases of semanticAliases) {
    const matches = keys.filter((key) =>
      aliases.some((alias) => normalizeHeaderKey(alias) === key),
    );
    if (matches.length > 1)
      validationError("Tệp không được có tiêu đề semantic bị trùng.");
  }
  const mssvIndex = matchColumnIndex(keys, [
    "mssv",
    "masv",
    "masinhvien",
    "studentcode",
    "studentid",
    "ma",
  ]);
  const nameIndex = matchColumnIndex(keys, [
    "hoten",
    "hovaten",
    "fullname",
    "name",
    "sinhvien",
  ]);
  const scoreIndex = matchColumnIndex(keys, [
    "diem",
    "diemso",
    "score",
    "grade",
    "point",
    "points",
  ]);
  const feedbackIndex = matchColumnIndex(keys, [
    "feedback",
    "nhanxet",
    "ghichu",
    "comment",
    "comments",
    "danhgia",
  ]);
  if (
    mssvIndex === undefined ||
    nameIndex === undefined ||
    scoreIndex === undefined ||
    feedbackIndex === undefined
  ) {
    validationError(
      "Tệp phải có đủ 4 cột bắt buộc: MSSV, Họ tên, Điểm và Feedback/Nhận xét.",
    );
  }
  return { mssvIndex, nameIndex, scoreIndex, feedbackIndex };
}

export function parseCsvRecords(text: string): string[][] {
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

export function getCellString(value: unknown): string {
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

export async function parseEvaluationXlsx(
  buffer: ArrayBuffer,
): Promise<SourceRow[]> {
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
