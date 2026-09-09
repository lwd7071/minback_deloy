import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

import { SetPasswordForm } from "../set-password-form";

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn(async () => data),
  } as unknown as Response;
}

describe("SetPasswordForm", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("sets the password and navigates to classes", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        data: { teacher: { id: "teacher-1", displayName: "Teacher" } },
      }),
    );

    render(<SetPasswordForm tokenHash="invite-hash" />);
    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "Invite123" },
    });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu"), {
      target: { value: "Invite123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất thiết lập" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/teacher/auth/set-password",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          tokenHash: "invite-hash",
          password: "Invite123",
          passwordConfirmation: "Invite123",
        }),
      }),
    );
    expect(replace).toHaveBeenCalledWith("/admin/classes");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("removes the invite token from the URL while retaining it for submit", async () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        data: { teacher: { id: "teacher-1", displayName: "Teacher" } },
      }),
    );

    window.history.pushState(
      {},
      "",
      "/admin/set-password?token_hash=invite-hash&type=invite",
    );
    render(<SetPasswordForm tokenHash="invite-hash" />);
    await waitFor(() => expect(replaceState).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "Invite123" },
    });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu"), {
      target: { value: "Invite123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất thiết lập" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(window.location.search).toBe("");
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/teacher/auth/set-password",
      expect.objectContaining({
        body: expect.stringContaining('"tokenHash":"invite-hash"'),
      }),
    );
    replaceState.mockRestore();
  });

  it("shows validation without sending a request for mismatched passwords", () => {
    render(<SetPasswordForm tokenHash="invite-hash" />);
    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), {
      target: { value: "Invite123" },
    });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu"), {
      target: { value: "Different123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất thiết lập" }));

    expect(
      screen.getByText("Mật khẩu xác nhận không khớp."),
    ).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
