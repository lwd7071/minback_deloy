import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
const linkStatus = vi.hoisted(() => ({ pending: false }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("next/link", async () => {
  const actual = await vi.importActual<typeof import("next/link")>("next/link");
  return { ...actual, useLinkStatus: () => linkStatus };
});

import {
  ClassSummaryDashboard,
  buildClassListHref,
  MiniProgressRing,
} from "./class-summary-dashboard";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  router.replace.mockReset();
  router.push.mockReset();
  linkStatus.pending = false;
});

beforeEach(() => {
  vi.useFakeTimers();
});

describe("class list URL state", () => {
  it("omits default and empty query values", () => {
    expect(
      buildClassListHref({ search: " ", progress: "all", sort: "newest" }),
    ).toBe("/admin/classes");
  });

  it("preserves non-default search, filter, sort, and pagination", () => {
    expect(
      buildClassListHref({
        search: "  WEB  ",
        progress: "good",
        sort: "students_desc",
        page: 3,
      }),
    ).toBe("/admin/classes?q=WEB&progress=good&sort=students_desc&page=3");
  });
});

describe("MiniProgressRing", () => {
  it.each([
    [0, 1],
    [20, 0.8],
    [50, 0.5],
    [100, 0],
  ])("renders %s%% with the expected circumference ratio", (value, ratio) => {
    const { container } = render(<MiniProgressRing percentage={value} />);
    const circle = container.querySelector(".teacher-mini-ring-value");
    const circumference = Number(circle?.getAttribute("stroke-dasharray"));
    expect(circle).toHaveAttribute(
      "stroke-dashoffset",
      String(circumference * ratio),
    );
    expect(screen.getByLabelText(`${value}% đã chấm`)).toBeInTheDocument();
    expect(container.querySelector("svg")).toHaveAttribute("width", "44");
  });

  it("clamps values to the valid percentage range", () => {
    const view = render(<MiniProgressRing percentage={-10} />);
    expect(
      within(view.container).getByLabelText("0% đã chấm"),
    ).toBeInTheDocument();
    view.rerender(<MiniProgressRing percentage={120} />);
    expect(
      within(view.container).getByLabelText("100% đã chấm"),
    ).toBeInTheDocument();
  });
});

describe("ClassSummaryDashboard", () => {
  const props = {
    rows: [],
    meta: { page: 2, pageSize: 20, total: 40 },
    metrics: {
      classCount: 4,
      studentCount: 12,
      assignmentCount: 8,
      gradingPercentage: 50,
      completedCount: 20,
      gradingTotal: 40,
    },
    filterCounts: { all: 4, urgent: 1, good: 1, complete: 2 },
    query: { search: "WEB", progress: "good" as const, sort: "name_asc" as const },
  };

  it("renders all filter tabs with counts and the active state", () => {
    render(<ClassSummaryDashboard {...props} />);

    expect(screen.getByRole("link", { name: "Tất cả (4)" })).toHaveAttribute(
      "href",
      "/admin/classes?q=WEB&sort=name_asc",
    );
    expect(
      screen.getByRole("link", { name: "Cần chấm gấp (1)" }),
    ).toHaveAttribute(
      "href",
      "/admin/classes?q=WEB&progress=urgent&sort=name_asc",
    );
    expect(screen.getByRole("link", { name: "Đang tốt (1)" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Hoàn thành (2)" })).toHaveAttribute(
      "href",
      "/admin/classes?q=WEB&progress=complete&sort=name_asc",
    );
  });

  it("shows pending feedback inside a filter link without changing its label", () => {
    linkStatus.pending = true;
    render(<ClassSummaryDashboard {...props} />);

    expect(screen.getAllByRole("status")).toHaveLength(4);
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Đang lọc lớp");
    expect(
      screen.getByRole("link", { name: /^Đang tốt \(1\)/ }),
    ).toBeInTheDocument();
  });

  it("debounces search and resets pagination while preserving filter and sort", () => {
    render(<ClassSummaryDashboard {...props} />);
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "  CNTT  " },
    });

    expect(router.replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(router.replace).toHaveBeenCalledWith(
      "/admin/classes?q=CNTT&progress=good&sort=name_asc",
    );
  });

  it("resets pagination when sorting and preserves search and filter", () => {
    render(<ClassSummaryDashboard {...props} />);
    fireEvent.change(screen.getByLabelText("Sắp xếp lớp học"), {
      target: { value: "students_desc" },
    });

    expect(router.replace).toHaveBeenCalledWith(
      "/admin/classes?q=WEB&progress=good&sort=students_desc",
    );
  });

  it("preserves query state when changing pagination", () => {
    render(<ClassSummaryDashboard {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Trang 1" }));

    expect(router.push).toHaveBeenCalledWith(
      "/admin/classes?q=WEB&progress=good&sort=name_asc",
    );
  });
});
