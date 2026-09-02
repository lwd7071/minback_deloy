import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("bcrypt", () => ({
  hash: vi.fn(async (value: string) => `hash:${value}`),
}));
vi.mock("@/server/auth/teacher-auth", () => ({
  requireTeacher: vi.fn(async () => ({
    supabase: { actor: "teacher" },
    teacher: { id: "teacher-1" },
  })),
}));
vi.mock("@/server/repositories/class-section-repository", () => ({
  createClassSectionWithStudents: vi.fn(),
}));

import { createClassSectionWithStudents } from "@/server/repositories/class-section-repository";
import { createTeacherClassSectionSetup } from "./class-section-setup-service";

const createdClass = {
  id: "10000000-0000-0000-0000-000000000001",
  code: "CS101",
  name: "Nhập môn",
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

describe("createTeacherClassSectionSetup", () => {
  beforeEach(() => {
    vi.mocked(createClassSectionWithStudents).mockReset();
    vi.mocked(createClassSectionWithStudents).mockResolvedValue(createdClass);
  });

  it("creates an empty class only through the atomic repository", async () => {
    const result = await createTeacherClassSectionSetup(
      { code: "CS101", name: "Nhập môn" },
      null,
    );

    expect(createClassSectionWithStudents).toHaveBeenCalledOnce();
    expect(createClassSectionWithStudents).toHaveBeenCalledWith(
      { actor: "teacher" },
      { code: "CS101", name: "Nhập môn" },
      [],
    );
    expect(result).toEqual({
      data: { classSection: createdClass, import: null },
      teacherId: "teacher-1",
    });
  });

  it("maps valid rows to created credentials and keeps skipped rows pin-free", async () => {
    const file = new File(
      [
        "MSSV,Họ Tên,Email\nSV01,Nguyễn An,an@example.test\nSV01,Trùng MSSV,\n,Thiếu MSSV,\n",
      ],
      "students.csv",
      { type: "text/csv" },
    );

    const result = await createTeacherClassSectionSetup(
      { code: "CS101", name: "Nhập môn" },
      file,
    );

    const students = vi.mocked(createClassSectionWithStudents).mock.calls[0][2];
    expect(students).toHaveLength(1);
    expect(students[0]).toMatchObject({
      mssv: "SV01",
      fullName: "Nguyễn An",
      email: "an@example.test",
      nickname: "SV01",
    });
    expect(students[0].pinHash).toMatch(/^hash:\d{6}$/);
    expect(result.data.import?.summary).toEqual({
      total: 3,
      created: 1,
      updated: 0,
      skipped: 2,
    });
    expect(result.data.import?.rows[0]).toMatchObject({
      status: "created",
      studentId: students[0].studentId,
      initialNickname: "SV01",
      initialPin: expect.stringMatching(/^\d{6}$/),
    });
    expect(result.data.import?.rows.slice(1)).toEqual([
      expect.not.objectContaining({ initialPin: expect.anything() }),
      expect.not.objectContaining({ initialPin: expect.anything() }),
    ]);
  });

  it("rejects a file with zero valid rows before calling the repository", async () => {
    const file = new File(["MSSV,Họ Tên\n,Thiếu MSSV\n"], "invalid.csv");

    await expect(
      createTeacherClassSectionSetup({ code: "CS101", name: "Nhập môn" }, file),
    ).rejects.toMatchObject({ status: 400 });
    expect(createClassSectionWithStudents).not.toHaveBeenCalled();
  });

  it("returns a conflict without exposing generated credentials", async () => {
    vi.mocked(createClassSectionWithStudents).mockResolvedValue(null);

    await expect(
      createTeacherClassSectionSetup({ code: "CS101", name: "Nhập môn" }, null),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("returns no partial result when the transaction fails", async () => {
    vi.mocked(createClassSectionWithStudents).mockRejectedValue(
      new Error("transaction failed"),
    );

    await expect(
      createTeacherClassSectionSetup(
        { code: "CS101", name: "Nhập môn" },
        new File(["MSSV,Họ Tên\nSV01,Nguyễn An\n"], "students.csv"),
      ),
    ).rejects.toMatchObject({ status: 500 });
  });
});
