import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MAX_IMPORT_FILE_BYTES,
  generateInitialPin,
  parseStudentCsv,
  validateImportFile,
} from "./import-service";

describe("parseStudentCsv", () => {
  it("accepts trimmed, case-insensitive required headers and normalizes values", () => {
    const rows = parseStudentCsv(
      "  mSsV , HỌ TÊN , email \r\n  SV001  ,  Nguyễn Văn A  ,  a@example.test  \r\n",
    );

    expect(rows).toEqual([
      {
        row: 2,
        status: "valid",
        student: {
          row: 2,
          mssv: "SV001",
          fullName: "Nguyễn Văn A",
          email: "a@example.test",
        },
      },
    ]);
  });

  it("skips invalid data rows while ignoring blank rows", () => {
    const rows = parseStudentCsv(
      "MSSV,Họ Tên,Email\n\n,Thiếu MSSV,x@example.test\nSV002,Đúng,wrong-email\n",
    );

    expect(rows).toEqual([
      expect.objectContaining({ row: 3, status: "skipped" }),
      expect.objectContaining({ row: 4, status: "skipped" }),
    ]);
  });
});

describe("generateInitialPin", () => {
  it("generates six-digit values", () => {
    expect(generateInitialPin()).toMatch(/^\d{6}$/);
  });
});

describe("validateImportFile", () => {
  it("accepts files at exactly 5 MB and rejects the next byte", () => {
    expect(
      validateImportFile({ name: "students.csv", size: MAX_IMPORT_FILE_BYTES }),
    ).toBe("csv");
    expect(() =>
      validateImportFile({
        name: "students.xlsx",
        size: MAX_IMPORT_FILE_BYTES + 1,
      }),
    ).toThrow("Tệp import vượt quá giới hạn 5 MB");
  });
});
