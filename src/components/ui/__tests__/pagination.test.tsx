import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const router = { prefetch: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

import { Pagination } from "../pagination";

describe("Pagination", () => {
  afterEach(() => {
    cleanup();
    router.prefetch.mockReset();
  });

  it("prefetches an intended page at most once before navigation", () => {
    render(
      <Pagination
        page={1}
        pageSize={20}
        total={60}
        getPageHref={(page) => `/admin/classes?page=${page}`}
        onPageChange={() => undefined}
      />,
    );

    const pageTwo = screen.getByRole("button", { name: "Trang 2" });
    fireEvent.mouseEnter(pageTwo);
    fireEvent.focus(pageTwo);
    fireEvent.mouseEnter(pageTwo);

    expect(router.prefetch).toHaveBeenCalledTimes(1);
    expect(router.prefetch).toHaveBeenCalledWith("/admin/classes?page=2");
  });
});
