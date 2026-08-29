import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { teacherLoginSchema } from "@/schemas/teacher-auth";

describe("teacherLoginSchema", () => {
  it("accepts valid email and password", () => {
    const result = teacherLoginSchema.safeParse({
      email: "admin@test.com",
      password: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const result = teacherLoginSchema.safeParse({
      password: "123456",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = teacherLoginSchema.safeParse({
      email: "admin@test.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = teacherLoginSchema.safeParse({
      email: "not-an-email",
      password: "123456",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = teacherLoginSchema.safeParse({
      email: "admin@test.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = teacherLoginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
