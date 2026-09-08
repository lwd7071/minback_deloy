import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  buildClassListHref,
  MiniProgressRing,
} from "./class-summary-dashboard";

afterEach(cleanup);

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
    const circumference = 2 * Math.PI * 14;
    expect(circle).toHaveAttribute(
      "stroke-dashoffset",
      String(circumference * ratio),
    );
    expect(screen.getByLabelText(`${value}% đã chấm`)).toBeInTheDocument();
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
