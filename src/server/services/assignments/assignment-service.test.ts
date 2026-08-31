import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { isAllowedAssignmentStatusTransition } from "./assignment-service";

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
