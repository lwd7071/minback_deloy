import { createHash, randomUUID } from "node:crypto";

import { afterAll, afterEach, describe, expect, it } from "vitest";

import { fetchApi } from "./setup";

const STUDENT_A = "f2000000-0000-0000-0000-000000000001";
const CLASS_SECTION_A = "f1000000-0000-0000-0000-000000000001";
const ASSIGNMENT_A = "f3000000-0000-0000-0000-000000000001";

const createdSessionIds: string[] = [];
const createdEvaluationIds: string[] = [];
const createdAssignmentIds: string[] = [];
const createdStudentIds: string[] = [];
const fixtureSessionIds: string[] = [];
const fixtureEvaluationIds: string[] = [];
const fixtureAssignmentIds: string[] = [];
const fixtureStudentIds: string[] = [];

function adminHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    apikey: process.env.SUPABASE_SECRET_KEY!,
    authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
    ...extra,
  };
}

async function createSession(
  studentId: string,
  options: {
    accessLevel?: "credential_change" | "full";
    lastActivityAt?: string;
    revokedAt?: string;
  } = {},
): Promise<string> {
  const token = randomUUID();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/student_sessions`,
    {
      method: "POST",
      headers: adminHeaders({
        "content-type": "application/json",
        prefer: "return=representation",
      }),
      body: JSON.stringify({
        student_id: studentId,
        token_hash: createHash("sha256").update(token).digest("hex"),
        access_level: options.accessLevel ?? "full",
        last_activity_at: options.lastActivityAt ?? new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        ...(options.revokedAt ? { revoked_at: options.revokedAt } : {}),
      }),
    },
  );
  expect(response.status).toBe(201);
  const [session] = await response.json();
  createdSessionIds.push(session.id);
  fixtureSessionIds.push(session.id);
  return token;
}

async function createStudentFixture(
  classSectionId: string,
  input: { mssv: string; fullName: string; nickname: string },
): Promise<string> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/students`,
    {
      method: "POST",
      headers: adminHeaders({
        "content-type": "application/json",
        prefer: "return=representation",
      }),
      body: JSON.stringify({
        class_section_id: classSectionId,
        mssv: input.mssv,
        full_name: input.fullName,
        nickname: input.nickname,
        pin_hash: "a5-synthetic-pin-hash",
      }),
    },
  );
  expect(response.status).toBe(201);
  const [student] = await response.json();
  createdStudentIds.push(student.id);
  fixtureStudentIds.push(student.id);
  return student.id;
}

async function createAssignmentFixture(
  status: "draft" | "published" | "closed",
): Promise<string> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/assignments`,
    {
      method: "POST",
      headers: adminHeaders({
        "content-type": "application/json",
        prefer: "return=representation",
      }),
      body: JSON.stringify({
        class_section_id: CLASS_SECTION_A,
        title: `A5 ${status} ${randomUUID()}`,
        description: "A5 synthetic assignment",
        assigned_date: "2026-09-01",
        due_date: "2026-09-30",
        status,
        max_score: 10,
      }),
    },
  );
  expect(response.status).toBe(201);
  const [assignment] = await response.json();
  createdAssignmentIds.push(assignment.id);
  fixtureAssignmentIds.push(assignment.id);
  return assignment.id;
}

async function createEvaluationFixture(
  assignmentId: string,
  input: {
    score: number | null;
    feedback: string;
    status: "pending" | "graded" | "returned";
  },
  studentId = STUDENT_A,
): Promise<string> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/evaluations`,
    {
      method: "POST",
      headers: adminHeaders({
        "content-type": "application/json",
        prefer: "return=representation",
      }),
      body: JSON.stringify({
        student_id: studentId,
        assignment_id: assignmentId,
        ...input,
      }),
    },
  );
  expect(response.status).toBe(201);
  const [evaluation] = await response.json();
  createdEvaluationIds.push(evaluation.id);
  fixtureEvaluationIds.push(evaluation.id);
  return evaluation.id;
}

afterEach(async () => {
  for (const id of createdSessionIds.splice(0)) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/student_sessions?id=eq.${id}`,
      { method: "DELETE", headers: adminHeaders() },
    );
    expect(response.ok).toBe(true);
  }
  for (const id of createdEvaluationIds.splice(0)) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/evaluations?id=eq.${id}`,
      { method: "DELETE", headers: adminHeaders() },
    );
    expect(response.ok).toBe(true);
  }
  for (const id of createdAssignmentIds.splice(0)) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/assignments?id=eq.${id}`,
      { method: "DELETE", headers: adminHeaders() },
    );
    expect(response.ok).toBe(true);
  }
  for (const id of createdStudentIds.splice(0)) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/students?id=eq.${id}`,
      { method: "DELETE", headers: adminHeaders() },
    );
    expect(response.ok).toBe(true);
  }
});

afterAll(async () => {
  const checks = [
    ["student_sessions", fixtureSessionIds],
    ["evaluations", fixtureEvaluationIds],
    ["assignments", fixtureAssignmentIds],
    ["students", fixtureStudentIds],
  ] as const;

  for (const [table, ids] of checks) {
    for (const id of ids) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?id=eq.${id}&select=id`,
        { headers: adminHeaders() },
      );
      expect(response.ok).toBe(true);
      expect(await response.json()).toEqual([]);
    }
  }
});

describe("Student Profile API", () => {
  it("rejects a request without a Student session using the safe auth envelope", async () => {
    const response = await fetchApi("/api/v1/student/profile", {
      method: "GET",
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      error: {
        code: "UNAUTHENTICATED",
        message: expect.any(String),
      },
    });
    expect(JSON.stringify(body)).not.toMatch(/pin|hash|token|supabase|cookie/i);
  });

  it("returns the current Student's visible profile from a full session", async () => {
    const token = await createSession(STUDENT_A);
    const response = await fetchApi("/api/v1/student/profile", {
      method: "GET",
      headers: { cookie: `minback_student_session=${token}` },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data).toMatchObject({
      student: {
        mssv: "DEMO001",
        fullName: "Demo Student A",
        nickname: "DEMO001",
      },
      classSection: {
        id: CLASS_SECTION_A,
        code: "DEMO_A",
        name: "Demo Class A",
      },
      progress: { completed: 0, total: 1, percentage: 0 },
      assignments: [
        expect.objectContaining({
          id: ASSIGNMENT_A,
          status: "published",
          evaluation: null,
        }),
      ],
    });
  });

  it.each([
    {
      name: "credential-change session",
      options: { accessLevel: "credential_change" as const },
      status: 403,
      code: "CREDENTIAL_CHANGE_REQUIRED",
    },
    {
      name: "expired session",
      options: {
        lastActivityAt: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
      },
      status: 401,
      code: "SESSION_EXPIRED",
    },
    {
      name: "revoked session",
      options: { revokedAt: new Date().toISOString() },
      status: 401,
      code: "SESSION_EXPIRED",
    },
  ])(
    "rejects a $name without revealing profile data",
    async ({ options, status, code }) => {
      const token = await createSession(STUDENT_A, options);
      const response = await fetchApi("/api/v1/student/profile", {
        method: "GET",
        headers: { cookie: `minback_student_session=${token}` },
      });
      const body = await response.json();

      expect(response.status).toBe(status);
      expect(body).not.toHaveProperty("data");
      expect(body.error.code).toBe(code);
      expect(JSON.stringify(body)).not.toMatch(
        /pin|hash|token|supabase|cookie/i,
      );
    },
  );

  it("shows only published/closed Assignments and this Student's current Evaluations", async () => {
    const [draftId, publishedId, closedId] = await Promise.all([
      createAssignmentFixture("draft"),
      createAssignmentFixture("published"),
      createAssignmentFixture("closed"),
    ]);
    const anotherStudentId = await createStudentFixture(CLASS_SECTION_A, {
      mssv: `A5-OTHER-${randomUUID()}`,
      fullName: "A5 Other Student",
      nickname: `A5Other${randomUUID().slice(0, 8)}`,
    });
    await Promise.all([
      createEvaluationFixture(draftId, {
        score: 10,
        feedback: "Must remain hidden with draft",
        status: "graded",
      }),
      createEvaluationFixture(publishedId, {
        score: null,
        feedback: "Pending feedback",
        status: "pending",
      }),
      createEvaluationFixture(closedId, {
        score: 7,
        feedback: "Visible returned feedback",
        status: "returned",
      }),
      createEvaluationFixture(
        ASSIGNMENT_A,
        {
          score: 10,
          feedback: "Another Student private feedback",
          status: "returned",
        },
        anotherStudentId,
      ),
    ]);
    const token = await createSession(STUDENT_A);
    const response = await fetchApi("/api/v1/student/profile", {
      method: "GET",
      headers: { cookie: `minback_student_session=${token}` },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(
      body.data.assignments.map((assignment: { id: string }) => assignment.id),
    ).not.toContain(draftId);
    expect(body.data.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: publishedId,
          evaluation: expect.objectContaining({
            score: null,
            feedback: "Pending feedback",
            status: "pending",
          }),
        }),
        expect.objectContaining({
          id: closedId,
          evaluation: expect.objectContaining({
            score: 7,
            feedback: "Visible returned feedback",
            status: "returned",
          }),
        }),
      ]),
    );
    expect(body.data.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: ASSIGNMENT_A, evaluation: null }),
      ]),
    );
    expect(body.data.progress).toEqual({
      completed: 1,
      total: 3,
      percentage: 33,
    });
  });

  it("binds a same-nickname Student to the session ClassSection", async () => {
    const studentId = await createStudentFixture(
      "f1000000-0000-0000-0000-000000000002",
      {
        mssv: `A5-${randomUUID()}`,
        fullName: "A5 Same Nickname Student",
        nickname: "DEMO001",
      },
    );
    const token = await createSession(studentId);
    const response = await fetchApi("/api/v1/student/profile", {
      method: "GET",
      headers: { cookie: `minback_student_session=${token}` },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.student).toEqual({
      mssv: expect.stringMatching(/^A5-/),
      fullName: "A5 Same Nickname Student",
      nickname: "DEMO001",
    });
    expect(body.data.classSection).toMatchObject({
      id: "f1000000-0000-0000-0000-000000000002",
      code: "DEMO_B",
    });
    expect(
      body.data.assignments.map((assignment: { id: string }) => assignment.id),
    ).not.toContain(ASSIGNMENT_A);
  });
});
