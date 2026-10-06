import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("bcrypt", () => ({ compare: vi.fn(), hash: vi.fn() }));
vi.mock("@/server/auth/student-session", () => ({
  SESSION_COOKIE_OPTIONS: {},
  SESSION_TIMEOUT_MINUTES: 30,
  STUDENT_SESSION_COOKIE: "minback_student_session",
  buildStudentSessionDto: vi.fn(),
  computeSessionExpiresAt: vi.fn(),
  generateRawToken: vi.fn(),
  hashToken: vi.fn(),
}));
vi.mock("@/server/repositories/students/login-rate-limit-repository", () => ({
  buildIdentifierHash: vi.fn(),
  buildIpHash: vi.fn(),
  checkBothBuckets: vi.fn(),
  incrementBothBuckets: vi.fn(),
  resetIdentifierBucket: vi.fn(),
}));
vi.mock("@/server/repositories/students/student-repository", () => ({
  findClassSectionIdByCode: vi.fn(),
  findStudentByNicknameAndClass: vi.fn(),
  findStudentByIdentifierAndClass: vi.fn(),
  findStudentByEmailAndClass: vi.fn(),
  findStudentRowById: vi.fn(),
  resetStudentFailedLogin: vi.fn(),
  updateStudentNickname: vi.fn(),
  updateStudentPin: vi.fn(),
  updateStudentPinHash: vi.fn(),
}));
vi.mock("@/server/repositories/students/student-session-repository", () => ({
  createStudentSession: vi.fn(),
  revokeAllSessionsByStudentId: vi.fn(),
  revokeSessionById: vi.fn(),
  upgradeSessionToFull: vi.fn(),
}));

import { hash } from "bcrypt";
import {
  findClassSectionIdByCode,
  findStudentByIdentifierAndClass,
  findStudentByEmailAndClass,
  updateStudentPinHash,
} from "@/server/repositories/students/student-repository";
import {
  createStudentSession,
  revokeAllSessionsByStudentId,
} from "@/server/repositories/students/student-session-repository";
import {
  checkBothBuckets,
  incrementBothBuckets,
} from "@/server/repositories/students/login-rate-limit-repository";
import { API_ERROR_CODES, ApiError } from "@/lib/api/errors";
import {
  loginStudent,
  loginStudentViaGoogle,
  resetStudentPin,
} from "./student-auth-service";

describe("loginStudentViaGoogle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws 404 when class code is not found", async () => {
    vi.mocked(findClassSectionIdByCode).mockResolvedValue(null);

    await expect(
      loginStudentViaGoogle({
        email: "student@gmail.com",
        classCode: "INVALID_CLASS",
      }),
    ).rejects.toThrow("Không tìm thấy lớp học phần");
  });

  it("throws 403 NOT_IN_ROSTER when email is not found in class section", async () => {
    vi.mocked(findClassSectionIdByCode).mockResolvedValue("class-123");
    vi.mocked(findStudentByEmailAndClass).mockResolvedValue(null);

    const error = await loginStudentViaGoogle({
      email: "intruder@gmail.com",
      classCode: "CS101",
    }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(403);
    expect(error.code).toBe(API_ERROR_CODES.forbidden);
  });

  it("creates student session and returns DTO when email exists in roster", async () => {
    vi.mocked(findClassSectionIdByCode).mockResolvedValue("class-123");
    vi.mocked(findStudentByEmailAndClass).mockResolvedValue({
      id: "student-1",
      class_section_id: "class-123",
      mssv: "21110001",
      full_name: "Nguyen Van A",
      email: "student@gmail.com",
      nickname: "21110001",
      pin_hash: "some_hash",
      must_change_nickname: false,
      must_change_pin: true,
      failed_login_count: 0,
      locked_until: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    vi.mocked(createStudentSession).mockResolvedValue({
      id: "session-1",
      student_id: "student-1",
      token_hash: "hash",
      access_level: "credential_change",
      expires_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      revoked_at: null,
      created_at: new Date().toISOString(),
    } as any);

    const result = await loginStudentViaGoogle({
      email: "student@gmail.com",
      classCode: "CS101",
    });

    expect(result).toHaveProperty("rawToken");
    expect(createStudentSession).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: "student-1",
        accessLevel: "credential_change",
      }),
    );
  });
});

describe("resetStudentPin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hash).mockResolvedValue("new-pin-hash" as never);
  });

  it("does not change a PIN or disclose a new one when existing sessions cannot be revoked", async () => {
    vi.mocked(revokeAllSessionsByStudentId).mockRejectedValue(
      new Error("SESSION_REVOKE_FAILED"),
    );

    await expect(resetStudentPin("student-1")).rejects.toThrow(
      "SESSION_REVOKE_FAILED",
    );
    expect(updateStudentPinHash).not.toHaveBeenCalled();
  });

  it("revokes every session before replacing the PIN hash", async () => {
    vi.mocked(revokeAllSessionsByStudentId).mockResolvedValue();
    vi.mocked(updateStudentPinHash).mockResolvedValue();

    await expect(resetStudentPin("student-1")).resolves.toMatchObject({
      initialPin: expect.stringMatching(/^\d{6}$/),
    });
    expect(revokeAllSessionsByStudentId).toHaveBeenCalledWith("student-1");
    expect(updateStudentPinHash).toHaveBeenCalledWith(
      "student-1",
      "new-pin-hash",
    );
    expect(
      vi.mocked(revokeAllSessionsByStudentId).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(updateStudentPinHash).mock.invocationCallOrder[0]);
  });
});

describe("loginStudent - Database Error vs Invalid Credentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkBothBuckets).mockResolvedValue({
      ipBlocked: false,
      identifierBlocked: false,
    });
  });

  it("does NOT penalize rate limit when class lookup fails due to database error", async () => {
    vi.mocked(findClassSectionIdByCode).mockRejectedValue(
      new Error("CLASS_SECTION_LOOKUP_FAILED"),
    );

    await expect(
      loginStudent(
        { classCode: "TEST01", identifier: "student1", pin: "123456" },
        "127.0.0.1",
      ),
    ).rejects.toThrow("CLASS_SECTION_LOOKUP_FAILED");

    // Rate-limit buckets MUST NOT be incremented on DB error
    expect(incrementBothBuckets).not.toHaveBeenCalled();
  });

  it("does NOT penalize rate limit when student lookup fails due to database error", async () => {
    vi.mocked(findClassSectionIdByCode).mockResolvedValue("class-uuid-1");
    vi.mocked(findStudentByIdentifierAndClass).mockRejectedValue(
      new Error("STUDENT_LOOKUP_FAILED"),
    );

    await expect(
      loginStudent(
        { classCode: "TEST01", identifier: "student1", pin: "123456" },
        "127.0.0.1",
      ),
    ).rejects.toThrow("STUDENT_LOOKUP_FAILED");

    // Rate-limit buckets MUST NOT be incremented on DB error
    expect(incrementBothBuckets).not.toHaveBeenCalled();
  });

  it("penalizes rate limit when class code is not found in database (valid query returning null)", async () => {
    vi.mocked(findClassSectionIdByCode).mockResolvedValue(null);

    const error = await loginStudent(
      { classCode: "NONEXISTENT", identifier: "student1", pin: "123456" },
      "127.0.0.1",
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).code).toBe("INVALID_CREDENTIALS");
    expect(incrementBothBuckets).toHaveBeenCalledTimes(1);
  });

  it("penalizes rate limit when student identifier is not found in class (valid query returning null)", async () => {
    vi.mocked(findClassSectionIdByCode).mockResolvedValue("class-uuid-1");
    vi.mocked(findStudentByIdentifierAndClass).mockResolvedValue(null);

    const error = await loginStudent(
      { classCode: "TEST01", identifier: "unknown_student", pin: "123456" },
      "127.0.0.1",
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).code).toBe("INVALID_CREDENTIALS");
    expect(incrementBothBuckets).toHaveBeenCalledTimes(1);
  });

  it("rejects PIN login with prompt to use Google if student has not completed initial activation", async () => {
    vi.mocked(findClassSectionIdByCode).mockResolvedValue("class-uuid-1");
    vi.mocked(findStudentByIdentifierAndClass).mockResolvedValue({
      id: "student-1",
      class_section_id: "class-uuid-1",
      mssv: "SV01",
      full_name: "Nguyen Van A",
      email: "a@gmail.com",
      nickname: "SV01",
      pin_hash: "placeholder",
      must_change_nickname: false,
      must_change_pin: true,
      failed_login_count: 0,
      locked_until: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);

    const error = await loginStudent(
      { classCode: "TEST01", identifier: "SV01", pin: "111111" },
      "127.0.0.1",
    ).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).message).toContain("Google");
  });
});
