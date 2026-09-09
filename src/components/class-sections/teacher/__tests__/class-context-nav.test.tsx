import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClassContextNav, resolveClassBackTarget } from "../class-context-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/classes/abc123",
}));

describe("resolveClassBackTarget", () => {
  const id = "abc123";
  it.each([
    ["/admin/classes/abc123", "/admin/classes", "Quay lại danh sách lớp học"],
    [
      "/admin/classes/abc123/students",
      "/admin/classes/abc123",
      "Quay lại tổng quan lớp",
    ],
    [
      "/admin/classes/abc123/assignments",
      "/admin/classes/abc123",
      "Quay lại tổng quan lớp",
    ],
    [
      "/admin/classes/abc123/gradebook",
      "/admin/classes/abc123",
      "Quay lại tổng quan lớp",
    ],
    [
      "/admin/classes/abc123/assignments/a1/grade",
      "/admin/classes/abc123/assignments",
      "Quay lại danh sách bài tập",
    ],
  ])("maps %s to %s", (pathname, href, ariaLabel) => {
    expect(resolveClassBackTarget(pathname, id)).toEqual({ href, ariaLabel });
  });
});

describe("ClassContextNav", () => {
  it("renders a deterministic link to the parent route", () => {
    render(<ClassContextNav classSectionId="abc123" />);
    expect(screen.getByRole("link", { name: "Quay lại danh sách lớp học" }))
      .toHaveAttribute("href", "/admin/classes");
  });
});
