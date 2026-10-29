import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/repositories/classes/class-section-repository", () => ({
  findClassSectionById: vi.fn(),
}));
vi.mock("@/server/repositories/assignments/assignment-repository", () => ({
  createAssignment: vi.fn(),
  deleteAssignmentWithEvaluations: vi.fn(),
  deleteDraftAssignment: vi.fn(),
  findAssignmentById: vi.fn(),
  hasEvaluations: vi.fn(),
  isAssignmentIncludedInGradebook: vi.fn(),
  listAssignmentsByClassSection: vi.fn(),
  listTeacherAssignmentSummaries: vi.fn(),
  updateAssignment: vi.fn(),
}));

import { findClassSectionById } from "@/server/repositories/classes/class-section-repository";
import {
  createAssignment,
  deleteAssignmentWithEvaluations,
  deleteDraftAssignment,
  findAssignmentById,
  hasEvaluations,
  isAssignmentIncludedInGradebook,
  listAssignmentsByClassSection,
  updateAssignment,
} from "@/server/repositories/assignments/assignment-repository";
import {
  createTeacherAssignment,
  deleteTeacherAssignment,
  isAllowedAssignmentStatusTransition,
  updateTeacherAssignment,
} from "./assignment-service";

describe("Assignment status transitions", () => {
  it("allows only unchanged status, draft to published, and published/closed toggling", () => {
    expect(isAllowedAssignmentStatusTransition("draft", "draft")).toBe(true);
    expect(isAllowedAssignmentStatusTransition("draft", "published")).toBe(
      true,
    );
    expect(isAllowedAssignmentStatusTransition("published", "closed")).toBe(
      true,
    );
    expect(isAllowedAssignmentStatusTransition("closed", "published")).toBe(
      true,
    );
    expect(isAllowedAssignmentStatusTransition("published", "draft")).toBe(
      false,
    );
    expect(isAllowedAssignmentStatusTransition("closed", "draft")).toBe(false);
    expect(isAllowedAssignmentStatusTransition("draft", "closed")).toBe(false);
  });
});

describe("Assignment title uniqueness", () => {
  const classSectionId = "class-1";
  const teacherId = "teacher-1";
  const current = {
    id: "assignment-1",
    classSectionId,
    title: "Test",
    description: "",
    assignedDate: "2026-10-01",
    dueDate: "2026-10-10",
    status: "draft" as const,
    maxScore: 10,
    createdAt: "",
    updatedAt: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a duplicate title in the same class when creating", async () => {
    vi.mocked(findClassSectionById).mockResolvedValue({
      id: classSectionId,
    } as never);
    vi.mocked(listAssignmentsByClassSection).mockResolvedValue([current]);

    await expect(
      createTeacherAssignment(
        classSectionId,
        {
          title: " test ",
          assignedDate: "2026-10-01",
          dueDate: "2026-10-10",
          status: "draft",
          maxScore: 10,
        },
        teacherId,
      ),
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "Tên bài tập đã tồn tại trong lớp học phần này",
    });

    expect(createAssignment).not.toHaveBeenCalled();
  });

  it("rejects renaming an assignment to another title in the same class", async () => {
    vi.mocked(findAssignmentById).mockResolvedValue(current);
    vi.mocked(listAssignmentsByClassSection).mockResolvedValue([
      current,
      { ...current, id: "assignment-2", title: "Bài cuối kỳ" },
    ]);

    await expect(
      updateTeacherAssignment(
        "assignment-1",
        { title: " bài cuối kỳ " },
        teacherId,
      ),
    ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });

    expect(updateAssignment).not.toHaveBeenCalled();
  });

  it("allows keeping the current assignment's own title", async () => {
    vi.mocked(findAssignmentById).mockResolvedValue(current);
    vi.mocked(listAssignmentsByClassSection).mockResolvedValue([current]);
    vi.mocked(updateAssignment).mockResolvedValue(current);

    await expect(
      updateTeacherAssignment("assignment-1", { title: " test " }, teacherId),
    ).resolves.toEqual(current);

    expect(listAssignmentsByClassSection).toHaveBeenCalledWith(classSectionId);
  });

  it("allows renaming a published assignment without error", async () => {
    const publishedAssignment = { ...current, status: "published" as const };
    vi.mocked(findAssignmentById).mockResolvedValue(publishedAssignment);
    vi.mocked(listAssignmentsByClassSection).mockResolvedValue([
      publishedAssignment,
    ]);
    vi.mocked(updateAssignment).mockResolvedValue({
      ...publishedAssignment,
      title: "Giữa kỳ",
    });

    const result = await updateTeacherAssignment(
      "assignment-1",
      { title: "Giữa kỳ" },
      teacherId,
    );

    expect(result.title).toBe("Giữa kỳ");
    expect(updateAssignment).toHaveBeenCalledWith("assignment-1", {
      title: "Giữa kỳ",
    });
  });
});

describe("Assignment deletion", () => {
  const teacherId = "teacher-1";
  const assignment = {
    id: "assignment-1",
    classSectionId: "class-1",
    title: "Giữa kỳ",
    description: "",
    assignedDate: "2026-10-01",
    dueDate: "2026-10-10",
    status: "published" as const,
    maxScore: 10,
    createdAt: "",
    updatedAt: "",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes an assignment without evaluations", async () => {
    vi.mocked(findAssignmentById).mockResolvedValue(assignment);
    vi.mocked(isAssignmentIncludedInGradebook).mockResolvedValue(false);
    vi.mocked(hasEvaluations).mockResolvedValue(false);
    vi.mocked(deleteDraftAssignment).mockResolvedValue(true);

    await expect(
      deleteTeacherAssignment("assignment-1", teacherId),
    ).resolves.toBeUndefined();

    expect(deleteDraftAssignment).toHaveBeenCalledWith("assignment-1");
  });

  it("rejects deleting an assignment with evaluations if force is not set", async () => {
    vi.mocked(findAssignmentById).mockResolvedValue(assignment);
    vi.mocked(isAssignmentIncludedInGradebook).mockResolvedValue(false);
    vi.mocked(hasEvaluations).mockResolvedValue(true);

    await expect(
      deleteTeacherAssignment("assignment-1", teacherId),
    ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });

    expect(deleteAssignmentWithEvaluations).not.toHaveBeenCalled();
  });

  it("deletes an assignment with evaluations when force is true", async () => {
    vi.mocked(findAssignmentById).mockResolvedValue(assignment);
    vi.mocked(isAssignmentIncludedInGradebook).mockResolvedValue(false);
    vi.mocked(hasEvaluations).mockResolvedValue(true);
    vi.mocked(deleteAssignmentWithEvaluations).mockResolvedValue(true);

    await expect(
      deleteTeacherAssignment("assignment-1", teacherId, { force: true }),
    ).resolves.toBeUndefined();

    expect(deleteAssignmentWithEvaluations).toHaveBeenCalledWith(
      "assignment-1",
    );
  });

  it("requires removing an Assignment from the final grade before deletion", async () => {
    vi.mocked(findAssignmentById).mockResolvedValue(assignment);
    vi.mocked(isAssignmentIncludedInGradebook).mockResolvedValue(true);

    await expect(
      deleteTeacherAssignment("assignment-1", teacherId, { force: true }),
    ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
    expect(hasEvaluations).not.toHaveBeenCalled();
  });
});
