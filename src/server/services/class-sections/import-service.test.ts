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

import {
  buildImportPreview,
  MAX_IMPORT_FILE_BYTES,
  generateInitialPin,
  parseStudentCsv,
  validateImportFile,
} from "./import-service";

describe("buildImportPreview", () => {
  it("reports duplicate MSSV without creating credentials or mutating data", () => {
    const preview = buildImportPreview([
      {
        row: 2,
        status: "valid",
        student: { row: 2, mssv: "SV01", fullName: "An" },
      },
      {
        row: 3,
        status: "valid",
        student: { row: 3, mssv: "SV01", fullName: "Bình" },
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
});
