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
vi.mock("@/server/repositories/login-rate-limit-repository", () => ({
  buildIdentifierHash: vi.fn(),
  buildIpHash: vi.fn(),
  checkBothBuckets: vi.fn(),
  incrementBothBuckets: vi.fn(),
  resetIdentifierBucket: vi.fn(),
}));
vi.mock("@/server/repositories/student-repository", () => ({
  findClassSectionIdByCode: vi.fn(),
  findStudentByNicknameAndClass: vi.fn(),
  findStudentRowById: vi.fn(),
  resetStudentFailedLogin: vi.fn(),
  updateStudentNickname: vi.fn(),
  updateStudentPin: vi.fn(),
  updateStudentPinHash: vi.fn(),
}));
vi.mock("@/server/repositories/student-session-repository", () => ({
  createStudentSession: vi.fn(),
  revokeAllSessionsByStudentId: vi.fn(),
  revokeSessionById: vi.fn(),
  upgradeSessionToFull: vi.fn(),
}));

import { hash } from "bcrypt";
import { updateStudentPinHash } from "@/server/repositories/student-repository";
import { revokeAllSessionsByStudentId } from "@/server/repositories/student-session-repository";
import { resetStudentPin } from "./student-auth-service";

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
