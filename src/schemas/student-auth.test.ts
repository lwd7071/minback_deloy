import { describe, expect, it } from "vitest";

import { studentAdminUpdateSchema } from "./student-auth";

describe("Student admin update validation", () => {
  it("rejects an empty update instead of treating an omitted email as null", () => {
    expect(studentAdminUpdateSchema.safeParse({}).success).toBe(false);
  });

  it("preserves an omitted email while accepting an explicit email clear", () => {
    expect(
      studentAdminUpdateSchema.parse({ nickname: "new-nickname" }),
    ).toEqual({ nickname: "new-nickname" });
    expect(studentAdminUpdateSchema.parse({ email: "" })).toEqual({
      email: null,
    });
  });
});
