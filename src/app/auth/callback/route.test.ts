import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { mockExchangeCodeForSession, mockSignOut, mockCookiesSet } = vi.hoisted(() => ({
  mockExchangeCodeForSession: vi.fn(),
  mockSignOut: vi.fn(),
  mockCookiesSet: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      signOut: mockSignOut,
    },
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: mockCookiesSet,
  }),
}));

vi.mock("@/server/services/students/student-auth-service", () => ({
  loginStudentViaGoogle: vi.fn(),
}));

import { loginStudentViaGoogle } from "@/server/services/students/student-auth-service";
import { GET } from "./route";

describe("Auth Callback Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to root when classCode query parameter is missing", async () => {
    const req = new NextRequest("http://localhost:3000/auth/callback?code=oauth-code-123");
    const response = await GET(req);

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("http://localhost:3000/");
  });

  it("redirects to class login with error when code is missing", async () => {
    const req = new NextRequest("http://localhost:3000/auth/callback?classCode=WEB101");
    const response = await GET(req);

    expect(response.status).toBe(307);
    const location = response.headers.get("Location")!;
    expect(location).toContain("/class/WEB101");
    expect(location).toContain("error=");
  });

  it("redirects to onboarding and sets session cookie when loginStudentViaGoogle succeeds", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        user: { email: "student@hcmute.edu.vn" },
      },
      error: null,
    });

    vi.mocked(loginStudentViaGoogle).mockResolvedValue({
      rawToken: "raw-session-token",
      cookieName: "minback_student_session",
      cookieOptions: {
        httpOnly: true,
        path: "/",
      } as never,
      dto: {
        studentId: "s-1",
        accessLevel: "credential_change",
        mustChangePin: true,
      } as never,
    });

    const req = new NextRequest(
      "http://localhost:3000/auth/callback?code=valid-code&classCode=WEB101",
    );
    const response = await GET(req);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("valid-code");
    expect(loginStudentViaGoogle).toHaveBeenCalledWith({
      email: "student@hcmute.edu.vn",
      classCode: "WEB101",
    });
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockCookiesSet).toHaveBeenCalledWith(
      "minback_student_session",
      "raw-session-token",
      expect.objectContaining({ httpOnly: true }),
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      "http://localhost:3000/class/WEB101/onboarding",
    );
  });

  it("handles student not in roster by signing out and redirecting with error", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: {
        user: { email: "intruder@gmail.com" },
      },
      error: null,
    });

    vi.mocked(loginStudentViaGoogle).mockRejectedValue(
      new Error("Email không có trong danh sách sinh viên của lớp này"),
    );

    const req = new NextRequest(
      "http://localhost:3000/auth/callback?code=valid-code&classCode=WEB101",
    );
    const response = await GET(req);

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockCookiesSet).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    const location = response.headers.get("Location")!;
    expect(location).toContain("/class/WEB101");
    expect(location).toContain("error=");
  });
});
