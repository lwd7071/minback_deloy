import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/teacher-auth", () => ({ requireTeacher: vi.fn() }));
vi.mock("@/server/repositories/students/teacher-student-profile-repository", () => ({
  findTeacherStudentProfileData: vi.fn(),
}));

import { requireTeacher } from "@/server/auth/teacher-auth";
import { findTeacherStudentProfileData } from "@/server/repositories/students/teacher-student-profile-repository";
import { getTeacherStudentProfile } from "./teacher-student-profile-service";

const profileData = {
  student: {
    id: "student-a",
    classSectionId: "class-a",
    mssv: "SV001",
    fullName: "Student A",
    email: null,
    nickname: "student-a",
    mustChangeNickname: false,
    mustChangePin: false,
    lockedUntil: null,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  },
  classSection: { id: "class-a", code: "WEB101", name: "Web 101" },
  assignments: [],
};

describe("getTeacherStudentProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTeacher).mockResolvedValue({
      supabase: {} as never,
      teacher: {
        id: "teacher-a",
        displayName: "Teacher A",
        emailNotificationEnabled: false,
      },
    });
  });

  it("derives Teacher scope server-side and calculates empty progress", async () => {
    vi.mocked(findTeacherStudentProfileData).mockResolvedValue(profileData);

    await expect(
      getTeacherStudentProfile("class-a", "student-a"),
    ).resolves.toMatchObject({
      student: profileData.student,
      classSection: profileData.classSection,
      progress: { completed: 0, total: 0, percentage: 0 },
    });
    expect(findTeacherStudentProfileData).toHaveBeenCalledWith(
      "teacher-a",
      "class-a",
      "student-a",
    );
  });

  it("conceals a Student outside the Teacher/ClassSection context", async () => {
    vi.mocked(findTeacherStudentProfileData).mockResolvedValue(null);

    await expect(
      getTeacherStudentProfile("class-b", "student-b"),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });
});
