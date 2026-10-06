import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("bcrypt", () => ({
  hash: vi.fn().mockResolvedValue("mocked_pin_hash"),
}));
vi.mock("@/server/auth/teacher-auth", () => ({ requireTeacher: vi.fn() }));
vi.mock("@/server/repositories/classes/class-section-repository", () => ({
  findClassSectionById: vi.fn(),
}));
vi.mock("@/server/repositories/classes/import-repository", () => ({
  findImportedStudentsByMssv: vi.fn(),
  createImportedStudents: vi.fn(),
  bulkUpdateImportedStudents: vi.fn(),
}));

import fs from "fs";
import path from "path";

import {
  buildImportPreview,
  MAX_IMPORT_FILE_BYTES,
  generateInitialPin,
  parseStudentCsv,
  parseStudentXlsx,
  validateImportFile,
} from "./import-service";

describe("buildImportPreview", () => {
  it("reports duplicate MSSV without creating credentials or mutating data", () => {
    const preview = buildImportPreview([
      {
        row: 2,
        status: "valid",
        student: { row: 2, mssv: "SV01", fullName: "An", email: "an@gmail.com" },
      },
      {
        row: 3,
        status: "valid",
        student: { row: 3, mssv: "SV01", fullName: "Bình", email: "binh@gmail.com" },
      },
    ]);
    expect(preview.summary).toEqual({ total: 2, valid: 1, skipped: 1 });
    expect(preview.rows[0]).not.toHaveProperty("initialPin");
    expect(preview.rows[1]).toMatchObject({
      status: "skipped",
      errors: [{ field: "mssv" }],
    });
  });
});

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

  it("throws validation error if required Email header is missing", () => {
    expect(() =>
      parseStudentCsv("MSSV,Họ Tên\nSV001,Nguyễn Văn A\n"),
    ).toThrow("Tệp CSV thiếu cột bắt buộc MSSV, Họ Tên hoặc Email");
  });

  it("skips invalid data rows (missing MSSV, wrong email, missing email) while ignoring blank rows", () => {
    const rows = parseStudentCsv(
      "MSSV,Họ Tên,Email\n\n,Thiếu MSSV,x@example.test\nSV002,Đúng,wrong-email\nSV003,Thiếu email,\n",
    );

    expect(rows).toEqual([
      expect.objectContaining({
        row: 3,
        status: "skipped",
        errors: [{ field: "mssv", message: expect.any(String) }],
      }),
      expect.objectContaining({
        row: 4,
        status: "skipped",
        errors: [{ field: "email", message: expect.any(String) }],
      }),
      expect.objectContaining({
        row: 5,
        status: "skipped",
        errors: [{ field: "email", message: expect.any(String) }],
      }),
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

describe("importTeacherClassSectionCsv optimization", () => {
  it("hashes initial PIN exactly once for multiple new students and calls bulkUpdate for existing students", async () => {
    const { hash } = await import("bcrypt");
    const { requireTeacher } = await import("@/server/auth/teacher-auth");
    const { findClassSectionById } =
      await import("@/server/repositories/classes/class-section-repository");
    const {
      findImportedStudentsByMssv,
      createImportedStudents,
      bulkUpdateImportedStudents,
    } = await import("@/server/repositories/classes/import-repository");
    const { importTeacherClassSectionCsv } = await import("./import-service");

    vi.mocked(requireTeacher).mockResolvedValue({
      supabase: {} as never,
      teacher: { id: "teacher-1" } as never,
    });
    vi.mocked(findClassSectionById).mockResolvedValue({
      id: "class-1",
      code: "SE101",
      name: "Software Engineering",
      createdAt: "2026-08-31",
      updatedAt: "2026-08-31",
    });

    // Giả sử SV01 đã tồn tại, SV02 và SV03 là sinh viên mới
    vi.mocked(findImportedStudentsByMssv).mockResolvedValue([
      { id: "student-existing-1", mssv: "SV01" },
    ]);
    vi.mocked(createImportedStudents).mockResolvedValue([
      { id: "student-new-2", mssv: "SV02" },
      { id: "student-new-3", mssv: "SV03" },
    ]);
    vi.mocked(bulkUpdateImportedStudents).mockResolvedValue(1);

    vi.mocked(hash).mockClear();

    const csvContent = [
      "MSSV,Họ Tên,Email",
      "SV01,Nguyễn Văn An Cập Nhật,an_new@example.com",
      "SV02,Trần Thị Bình,binh@example.com",
      "SV03,Lê Văn Cường,cuong@example.com",
    ].join("\n");

    const result = await importTeacherClassSectionCsv("class-1", csvContent);

    expect(result.summary).toEqual({
      total: 3,
      created: 2,
      updated: 1,
      skipped: 0,
    });

    // Đảm bảo bcrypt.hash chỉ được gọi ĐÚNG 1 LẦN duy nhất thay vì 2 lần cho SV02 và SV03
    expect(hash).toHaveBeenCalledOnce();

    // Đảm bảo bulkUpdateImportedStudents được gọi với danh sách mảng thay vì nhiều lời gọi đơn lẻ
    expect(bulkUpdateImportedStudents).toHaveBeenCalledOnce();
    expect(bulkUpdateImportedStudents).toHaveBeenCalledWith("class-1", [
      {
        id: "student-existing-1",
        fullName: "Nguyễn Văn An Cập Nhật",
        email: "an_new@example.com",
      },
    ]);
  });

  it("successfully parses the static template file mau-danh-sach-sinh-vien.xlsx", async () => {
    const templatePath = path.resolve(
      process.cwd(),
      "public/templates/mau-danh-sach-sinh-vien.xlsx",
    );
    const fileBuffer = fs.readFileSync(templatePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    );

    const rows = await parseStudentXlsx(arrayBuffer);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      row: 2,
      status: "valid",
      student: {
        row: 2,
        mssv: "24110001",
        fullName: "Nguyễn Văn A",
        email: "nguyenvana@gmail.com",
      },
    });
    expect(rows[1]).toEqual({
      row: 3,
      status: "valid",
      student: {
        row: 3,
        mssv: "24110002",
        fullName: "Trần Thị B",
        email: "tranthib@gmail.com",
      },
    });
    expect(rows[2]).toEqual({
      row: 4,
      status: "valid",
      student: {
        row: 4,
        mssv: "24110003",
        fullName: "Lê Văn C",
        email: "levanc@gmail.com",
      },
    });

    const { Workbook } = await import("exceljs");
    const wb = new Workbook();
    await wb.xlsx.load(Buffer.from(arrayBuffer) as never);
    const ws = wb.worksheets[0];
    expect(ws.getRow(1).font?.bold).toBe(true);
  });
});
