import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { assertSameOrigin } from "@/lib/api/origin";
import { ApiError } from "@/lib/api/errors";

vi.mock("@/lib/env/server", () => ({
  getServerEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test",
    SUPABASE_SECRET_KEY: "test",
    RATE_LIMIT_HMAC_SECRET: "a".repeat(32),
    BREVO_SENDER_NAME: "MinBack",
    APP_URL: "http://localhost:3000",
  }),
}));

function makeRequest(origin?: string): Request {
  const headers = new Headers();
  if (origin) {
    headers.set("origin", origin);
  }
  return new Request("http://localhost:3000/api/v1/teacher/auth/login", {
    method: "POST",
    headers,
  });
}

describe("assertSameOrigin", () => {
  it("passes when origin matches APP_URL", () => {
    expect(() => assertSameOrigin(makeRequest("http://localhost:3000"))).not.toThrow();
  });

  it("passes with case-insensitive comparison", () => {
    expect(() => assertSameOrigin(makeRequest("HTTP://LOCALHOST:3000"))).not.toThrow();
  });

  it("throws 403 when origin header is missing", () => {
    try {
      assertSameOrigin(makeRequest());
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
      expect((error as ApiError).code).toBe("FORBIDDEN");
    }
  });

  it("throws 403 when origin does not match", () => {
    try {
      assertSameOrigin(makeRequest("http://evil.com"));
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
      expect((error as ApiError).code).toBe("FORBIDDEN");
    }
  });

  it("throws 403 when origin has different port", () => {
    try {
      assertSameOrigin(makeRequest("http://localhost:4000"));
      expect.fail("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(403);
    }
  });
});
