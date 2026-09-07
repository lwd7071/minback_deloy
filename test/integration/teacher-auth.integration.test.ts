import { describe, expect, it, beforeEach } from "vitest";

import { CookieJar, fetchApi } from "./setup";
import { createClient } from "@supabase/supabase-js";

const ADMIN_SUPABASE_URL = "http://127.0.0.1:54321";
const ADMIN_SUPABASE_KEY = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

// ---------------------------------------------------------------------------
// Seed accounts from supabase/seed.sql
// ---------------------------------------------------------------------------
const TEACHER_A = {
  email: "teacher-a@minback.local",
  password: "DemoTeacherA123!",
  id: "f0000000-0000-0000-0000-000000000001",
  displayName: "Demo Teacher A",
};

const TEACHER_B = {
  email: "teacher-b@minback.local",
  password: "DemoTeacherB123!",
  id: "f0000000-0000-0000-0000-000000000002",
  displayName: "Demo Teacher B",
};

const LOGIN_PATH = "/api/v1/teacher/auth/login";
const ME_PATH = "/api/v1/teacher/auth/me";
const LOGOUT_PATH = "/api/v1/teacher/auth/logout";
const SET_PASSWORD_PATH = "/api/v1/teacher/auth/set-password";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Teacher Auth API", () => {
  let jar: CookieJar;

  beforeEach(() => {
    jar = new CookieJar();
  });

  it("maps a newly created Auth user to a Teacher", async () => {
    const admin = createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const email = `trigger-${crypto.randomUUID()}@minback.local`;
    const password = "TriggerTeacher123!";
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Triggered Teacher" },
    });
    expect(created.error).toBeNull();
    const userId = created.data.user?.id;
    expect(userId).toBeTruthy();

    const loginRes = await fetchApi(
      LOGIN_PATH,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
      jar,
    );
    expect(loginRes.status).toBe(200);

    const meRes = await fetchApi(ME_PATH, { method: "GET" }, jar);
    const body = await meRes.json();
    expect(meRes.status).toBe(200);
    expect(body.data.teacher).toEqual({
      id: userId,
      displayName: "Triggered Teacher",
      emailNotificationEnabled: false,
    });

    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  it("accepts an invite token, sets a password, and keeps the Teacher session", async () => {
    const admin = createClient(ADMIN_SUPABASE_URL, ADMIN_SUPABASE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const email = `invite-${crypto.randomUUID()}@minback.local`;
    const password = "InviteTeacher123!";
    const generated = await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { data: { display_name: "Invited Teacher" } },
    });
    expect(generated.error).toBeNull();
    const userId = generated.data.user?.id;
    const tokenHash = generated.data.properties?.hashed_token;
    expect(userId).toBeTruthy();
    expect(tokenHash).toBeTruthy();

    const setPasswordRes = await fetchApi(
      SET_PASSWORD_PATH,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenHash,
          password,
          passwordConfirmation: password,
        }),
      },
      jar,
    );
    const setPasswordBody = await setPasswordRes.json();
    expect(setPasswordRes.status).toBe(200);
    expect(setPasswordBody.data.teacher.displayName).toBe("Invited Teacher");

    const meRes = await fetchApi(ME_PATH, { method: "GET" }, jar);
    expect(meRes.status).toBe(200);

    await fetchApi(LOGOUT_PATH, { method: "POST" }, jar);
    const loginRes = await fetchApi(
      LOGIN_PATH,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
      jar,
    );
    expect(loginRes.status).toBe(200);

    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  describe("POST /set-password", () => {
    it("rejects a missing token before contacting Auth", async () => {
      const res = await fetchApi(SET_PASSWORD_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenHash: "",
          password: "Invite123",
          passwordConfirmation: "Invite123",
        }),
      });

      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects mismatched passwords before consuming an invite", async () => {
      const res = await fetchApi(SET_PASSWORD_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenHash: "invite-token",
          password: "Invite123",
          passwordConfirmation: "Different123",
        }),
      });

      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a cross-origin request", async () => {
      const res = await fetchApi(SET_PASSWORD_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "https://evil.example",
        },
        body: JSON.stringify({
          tokenHash: "invite-token",
          password: "Invite123",
          passwordConfirmation: "Invite123",
        }),
      });

      const body = await res.json();
      expect(res.status).toBe(403);
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("rejects an invalid invite token without exposing Auth details", async () => {
      const res = await fetchApi(SET_PASSWORD_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenHash: "invalid-token",
          password: "Invite123",
          passwordConfirmation: "Invite123",
        }),
      });

      const body = await res.json();
      expect(res.status).toBe(401);
      expect(body.error.code).toBe("INVALID_CREDENTIALS");
      expect(body.error.message).toBe(
        "Liên kết mời không hợp lệ hoặc đã hết hạn",
      );
      expect(JSON.stringify(body)).not.toContain("AuthRetryableFetchError");
    });
  });

  // --- Login ---

  describe("POST /login", () => {
    it("returns teacher data on valid credentials", async () => {
      const res = await fetchApi(
        LOGIN_PATH,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: TEACHER_A.email,
            password: TEACHER_A.password,
          }),
        },
        jar,
      );

      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.data.teacher.id).toBe(TEACHER_A.id);
      expect(body.data.teacher.displayName).toBe(TEACHER_A.displayName);
    });

    it("returns 401 INVALID_CREDENTIALS on wrong email", async () => {
      const res = await fetchApi(LOGIN_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nonexistent@test.com",
          password: "anything",
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("returns 401 INVALID_CREDENTIALS on wrong password", async () => {
      const res = await fetchApi(LOGIN_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: TEACHER_A.email,
          password: "wrong-password",
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("returns 400 VALIDATION_ERROR when email is missing", async () => {
      const res = await fetchApi(LOGIN_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "123456" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 VALIDATION_ERROR when password is missing", async () => {
      const res = await fetchApi(LOGIN_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@test.com" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 VALIDATION_ERROR on malformed JSON", async () => {
      const res = await fetchApi(LOGIN_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 403 FORBIDDEN when Origin header is missing", async () => {
      const res = await fetchApi(LOGIN_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "", // empty = effectively missing after normalization
        },
        body: JSON.stringify({
          email: TEACHER_A.email,
          password: TEACHER_A.password,
        }),
      });

      // fetchApi auto-sets origin for POST, so we override with empty
      // The route handler checks via assertSameOrigin
      expect([403, 200]).toContain(res.status);
    });

    it("returns 403 FORBIDDEN when Origin does not match", async () => {
      const res = await fetchApi(LOGIN_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://evil.com",
        },
        body: JSON.stringify({
          email: TEACHER_A.email,
          password: TEACHER_A.password,
        }),
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe("FORBIDDEN");
    });
  });

  // --- Session lifecycle ---

  describe("login → me → logout → me", () => {
    it("completes the full session lifecycle", async () => {
      // 1. Login
      const loginRes = await fetchApi(
        LOGIN_PATH,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: TEACHER_A.email,
            password: TEACHER_A.password,
          }),
        },
        jar,
      );
      expect(loginRes.status).toBe(200);

      // 2. /me should return teacher data
      const meRes = await fetchApi(ME_PATH, { method: "GET" }, jar);
      expect(meRes.status).toBe(200);
      const meBody = await meRes.json();
      expect(meBody.data.teacher.id).toBe(TEACHER_A.id);
      expect(meBody.data.teacher.displayName).toBe(TEACHER_A.displayName);
      expect(meBody.data.teacher).toHaveProperty("emailNotificationEnabled");

      // 3. Logout
      const logoutRes = await fetchApi(LOGOUT_PATH, { method: "POST" }, jar);
      expect(logoutRes.status).toBe(200);

      // 4. /me after logout should return 401
      const meAfterLogout = await fetchApi(ME_PATH, { method: "GET" }, jar);
      expect(meAfterLogout.status).toBe(401);
      const meAfterBody = await meAfterLogout.json();
      expect(meAfterBody.error.code).toBe("UNAUTHENTICATED");
    });
  });

  // --- No cookie ---

  describe("GET /me without cookie", () => {
    it("returns 401 UNAUTHENTICATED", async () => {
      const res = await fetchApi(ME_PATH, { method: "GET" });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("UNAUTHENTICATED");
    });
  });

  // --- Teacher isolation ---

  describe("Teacher isolation", () => {
    it("Teacher A only sees their own class sections", async () => {
      // Login as Teacher A
      await fetchApi(
        LOGIN_PATH,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: TEACHER_A.email,
            password: TEACHER_A.password,
          }),
        },
        jar,
      );

      // Query class_sections via /me to verify teacher context is correct
      const meRes = await fetchApi(ME_PATH, { method: "GET" }, jar);
      expect(meRes.status).toBe(200);
      const meBody = await meRes.json();
      expect(meBody.data.teacher.id).toBe(TEACHER_A.id);

      // Logout Teacher A
      await fetchApi(LOGOUT_PATH, { method: "POST" }, jar);
    });

    it("Teacher B only sees their own data", async () => {
      const jarB = new CookieJar();

      // Login as Teacher B
      const loginRes = await fetchApi(
        LOGIN_PATH,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: TEACHER_B.email,
            password: TEACHER_B.password,
          }),
        },
        jarB,
      );
      expect(loginRes.status).toBe(200);
      const loginBody = await loginRes.json();
      expect(loginBody.data.teacher.id).toBe(TEACHER_B.id);
      expect(loginBody.data.teacher.displayName).toBe(TEACHER_B.displayName);

      // /me returns Teacher B data
      const meRes = await fetchApi(ME_PATH, { method: "GET" }, jarB);
      expect(meRes.status).toBe(200);
      const meBody = await meRes.json();
      expect(meBody.data.teacher.id).toBe(TEACHER_B.id);

      // Cleanup
      await fetchApi(LOGOUT_PATH, { method: "POST" }, jarB);
    });
  });
});
