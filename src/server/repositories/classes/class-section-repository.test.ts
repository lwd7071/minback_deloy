import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { listClassSectionSummaries } from "./class-section-repository";

const teacherId = "11111111-1111-4111-8111-111111111111";
const query = {
  page: 1,
  pageSize: 20,
  progress: "all" as const,
  sort: "newest" as const,
};

function createSupabase(rpc: ReturnType<typeof vi.fn>) {
  return {
    rpc,
    from: vi.fn(),
  } as never;
}

describe("listClassSectionSummaries", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed when the summary RPC fails", async () => {
    const rpc = vi.fn().mockImplementation((name: string) => {
      if (name === "list_class_section_summaries") {
        return Promise.resolve({
          data: null,
          error: { code: "42883", message: "function does not exist" },
        });
      }
      return Promise.resolve({ data: [], error: null });
    });
    const supabase = createSupabase(rpc) as { from: ReturnType<typeof vi.fn> };

    await expect(
      listClassSectionSummaries(supabase as never, teacherId, query),
    ).rejects.toMatchObject({
      name: "RepositoryError",
      code: "CLASS_SECTION_SUMMARY_LIST_FAILED",
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("maps summary and facet RPC results without changing the response contract", async () => {
    const rpc = vi.fn().mockImplementation((name: string) => {
      if (name === "list_class_section_summaries") {
        return Promise.resolve({
          data: [
            {
              id: "class-1",
              code: "CS101",
              name: "Computer Science",
              student_count: 2,
              assignment_count: 3,
              completed_count: 4,
              grading_total: 6,
              grading_percentage: 67,
              total_count: 1,
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({
        data: [
          {
            class_count: 1,
            student_count: 2,
            assignment_count: 3,
            completed_count: 4,
            grading_total: 6,
            all_count: 1,
            urgent_count: 0,
            good_count: 1,
            complete_count: 0,
          },
        ],
        error: null,
      });
    });

    await expect(
      listClassSectionSummaries(createSupabase(rpc), teacherId, query),
    ).resolves.toEqual({
      total: 1,
      rows: [
        {
          id: "class-1",
          code: "CS101",
          name: "Computer Science",
          studentCount: 2,
          assignmentCount: 3,
          gradingProgress: { completed: 4, total: 6, percentage: 67 },
        },
      ],
      metrics: {
        classCount: 1,
        studentCount: 2,
        assignmentCount: 3,
        completedCount: 4,
        gradingTotal: 6,
        gradingPercentage: 67,
      },
      filterCounts: { all: 1, urgent: 0, good: 1, complete: 0 },
    });
  });

  it("uses the combined dashboard snapshot RPC only when its rollout flag is enabled", async () => {
    vi.stubEnv("MINBACK_CLASS_DASHBOARD_RPC_V2", "true");
    const rpc = vi.fn().mockResolvedValue({
      data: {
        rows: [
          {
            id: "class-1",
            code: "CS101",
            name: "Computer Science",
            student_count: 2,
            assignment_count: 3,
            completed_count: 4,
            grading_total: 6,
            grading_percentage: 67,
            total_count: 1,
          },
        ],
        facets: {
          student_count: 2,
          assignment_count: 3,
          completed_count: 4,
          grading_total: 6,
          all_count: 1,
          urgent_count: 0,
          good_count: 1,
          complete_count: 0,
        },
        total: 1,
      },
      error: null,
    });

    const result = await listClassSectionSummaries(
      createSupabase(rpc),
      teacherId,
      query,
    );

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "get_teacher_class_dashboard",
      expect.objectContaining({ p_teacher_id: teacherId }),
    );
    expect(result.total).toBe(1);
  });

  it("uses the active progress count for pagination while keeping global KPIs", async () => {
    const rpc = vi.fn().mockImplementation((name: string) => {
      if (name === "list_class_section_summaries") {
        return Promise.resolve({
          data: [
            {
              id: "class-urgent",
              code: "URGENT",
              name: "Urgent class",
              student_count: 2,
              assignment_count: 3,
              completed_count: 1,
              grading_total: 6,
              grading_percentage: 17,
              total_count: 1,
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({
        data: [
          {
            class_count: 17,
            student_count: 446,
            assignment_count: 78,
            completed_count: 666,
            grading_total: 6947,
            all_count: 17,
            urgent_count: 1,
            good_count: 3,
            complete_count: 1,
          },
        ],
        error: null,
      });
    });

    const result = await listClassSectionSummaries(
      createSupabase(rpc),
      teacherId,
      { ...query, progress: "urgent" },
    );

    expect(result.total).toBe(1);
    expect(result.metrics.classCount).toBe(17);
  });
});
