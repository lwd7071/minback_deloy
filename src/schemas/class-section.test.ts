import { describe, expect, it } from "vitest";

import { classSectionListQuerySchema } from "./class-section";

describe("classSectionListQuerySchema", () => {
  it("applies class-list defaults", () => {
    expect(classSectionListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
      progress: "all",
      sort: "newest",
    });
  });

  it.each(["all", "urgent", "good", "complete"])(
    "accepts progress filter %s",
    (progress) => {
      expect(classSectionListQuerySchema.parse({ progress }).progress).toBe(
        progress,
      );
    },
  );

  it.each(["newest", "progress_asc", "students_desc", "name_asc"])(
    "accepts sort %s",
    (sort) => {
      expect(classSectionListQuerySchema.parse({ sort }).sort).toBe(sort);
    },
  );

  it.each([
    { progress: "almost_done" },
    { sort: "random" },
    { page: 0 },
    { pageSize: 101 },
    { search: "x".repeat(101) },
  ])("rejects invalid list query %#", (query) => {
    expect(classSectionListQuerySchema.safeParse(query).success).toBe(false);
  });
});
