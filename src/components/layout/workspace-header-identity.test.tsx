import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceHeader } from "./workspace-header";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/classes",
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
}));

afterEach(cleanup);

describe("Teacher workspace identity", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it("shows the Teacher name and generated initials without an account menu", () => {
    render(<WorkspaceHeader role="teacher" displayName="Nguyễn Văn An" />);
    expect(screen.getAllByText("Giảng viên").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nguyễn Văn An").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Nguyễn Văn An")[0]).toHaveTextContent(
      "VA",
    );
    expect(
      screen.queryByRole("button", { name: /tài khoản/i }),
    ).not.toBeInTheDocument();
  });

  it("keeps the existing Teacher logout behavior", async () => {
    const view = render(
      <WorkspaceHeader role="teacher" displayName="Nguyễn Văn An" />,
    );
    fireEvent.click(
      within(view.container).getByRole("button", { name: "Đăng xuất" }),
    );
    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith("/api/v1/teacher/auth/logout", {
        method: "POST",
      }),
    );
    expect(replace).toHaveBeenCalledWith("/admin/login");
    expect(refresh).toHaveBeenCalled();
  });
});
