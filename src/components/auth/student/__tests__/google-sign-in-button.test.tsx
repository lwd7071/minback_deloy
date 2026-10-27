import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSignInWithOAuth = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

import { GoogleSignInButton } from "../google-sign-in-button";

describe("GoogleSignInButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Google sign in button", () => {
    render(<GoogleSignInButton classCode="WEB101" />);
    expect(
      screen.getByRole("button", { name: /đăng nhập với google/i }),
    ).toBeInTheDocument();
  });

  it("calls signInWithOAuth with provider google and data role student", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    render(<GoogleSignInButton classCode="WEB101" />);
    const button = screen.getByRole("button", {
      name: /đăng nhập với google/i,
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: "google",
        options: {
          redirectTo: expect.stringContaining("/auth/callback?classCode=WEB101"),
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
    });
  });

  it("resets loading state if signInWithOAuth throws an error", async () => {
    mockSignInWithOAuth.mockRejectedValue(new Error("OAuth network failure"));

    render(<GoogleSignInButton classCode="WEB101" />);
    const button = screen.getByRole("button", {
      name: /đăng nhập với google/i,
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});
