import { describe, expect, it } from "vitest";
import { makeItems } from "./workspace-header";

describe("workspace navigation", () => {
  it("keeps Teacher navigation focused on classes and settings", () => {
    expect(makeItems("teacher")).toEqual([
      expect.objectContaining({ href: "/admin/classes", label: "Lớp học" }),
      expect.objectContaining({ href: "/admin/settings", label: "Cài đặt" }),
    ]);
  });

  it("does not change Student navigation", () => {
    expect(makeItems("student", "TEST115").map((item) => item.label)).toEqual([
      "Tổng quan",
      "Bài tập",
      "Thông báo",
    ]);
  });
});
