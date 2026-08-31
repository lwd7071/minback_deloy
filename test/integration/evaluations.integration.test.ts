import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { CookieJar, fetchApi } from "./setup";

const TEACHER_A = {
  email: "teacher-a@minback.local",
  password: "DemoTeacherA123!",
};

const ASSIGNMENT_A = "f3000000-0000-0000-0000-000000000001";
const ASSIGNMENT_B = "f3000000-0000-0000-0000-000000000002";
const STUDENT_A = "f2000000-0000-0000-0000-000000000001";
const STUDENT_B = "f2000000-0000-0000-0000-000000000002";
const SYNTHETIC_STUDENT = "f2000000-0000-0000-0000-000000000099";
const TEACHER_A_ID = "f0000000-0000-0000-0000-000000000001";

function adminHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    apikey: process.env.SUPABASE_SECRET_KEY!,
    authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
    ...extra,
  };
}

async function cleanupEvaluations(ids: string[]): Promise<void> {
  for (const id of ids) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/evaluations?id=eq.${id}`,
      { method: "DELETE", headers: adminHeaders() },
    );
    if (!response.ok) {
      throw new Error(
        `EVALUATION_FIXTURE_CLEANUP_FAILED:${response.status}:${await response.text()}`,
      );
    }
  }
}

async function cleanupStudentAEvaluationFixture(): Promise<void> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/evaluations?assignment_id=eq.${ASSIGNMENT_A}&student_id=eq.${STUDENT_A}`,
    { method: "DELETE", headers: adminHeaders() },
  );
  expect(response.ok).toBe(true);
}

async function cleanupSyntheticEvaluationFixture(): Promise<void> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/evaluations?assignment_id=eq.${ASSIGNMENT_A}&student_id=eq.${SYNTHETIC_STUDENT}`,
    { method: "DELETE", headers: adminHeaders() },
  );
  expect(response.ok).toBe(true);
}

async function cleanupStudents(ids: string[]): Promise<void> {
  for (const id of ids) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/students?id=eq.${id}`,
      { method: "DELETE", headers: adminHeaders() },
    );
    expect(response.ok).toBe(true);
  }
}

async function createSyntheticStudentFixture(): Promise<string> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/students`,
    {
      method: "POST",
      headers: adminHeaders({
        "content-type": "application/json",
        prefer: "return=representation",
      }),
      body: JSON.stringify({
        id: SYNTHETIC_STUDENT,
        class_section_id: "f1000000-0000-0000-0000-000000000001",
        mssv: "A4-SYNTHETIC-099",
        full_name: "A4 Synthetic Student",
        email: "a4-synthetic-099@minback.local",
        nickname: "A4SYNTH099",
        pin_hash: "synthetic-pin-hash",
      }),
    },
  );
  expect(response.status).toBe(201);
  const [student] = await response.json();
  return student.id;
}

async function createEvaluationFixture(studentId = STUDENT_A): Promise<string> {
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
        assignment_id: ASSIGNMENT_A,
        score: 8.5,
        feedback: "Evaluation fixture",
        status: "graded",
      }),
    },
  );
  expect(response.status).toBe(201);
  const [evaluation] = await response.json();
  return evaluation.id;
}

async function getRows(
  table: string,
  query: string,
): Promise<Array<Record<string, unknown>>> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${query}`,
    { headers: adminHeaders() },
  );
  expect(response.ok).toBe(true);
  return response.json();
}

async function loginAsTeacher(jar: CookieJar): Promise<void> {
  const response = await fetchApi(
    "/api/v1/teacher/auth/login",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(TEACHER_A),
    },
    jar,
  );
  expect(response.status).toBe(200);
}

describe("Evaluation API", () => {
  let jar: CookieJar;
  const createdEvaluationIds: string[] = [];
  const createdStudentIds: string[] = [];

  beforeEach(async () => {
    await cleanupStudentAEvaluationFixture();
    await cleanupSyntheticEvaluationFixture();
    await cleanupStudents([SYNTHETIC_STUDENT]);
    jar = new CookieJar();
    await loginAsTeacher(jar);
  });

  afterEach(async () => {
    await cleanupEvaluations(createdEvaluationIds.splice(0));
    await cleanupStudents(createdStudentIds.splice(0));
  });

  afterAll(async () => {
    const [studentAEvaluations, syntheticEvaluations, syntheticStudents] =
      await Promise.all([
        getRows(
          "evaluations",
          `assignment_id=eq.${ASSIGNMENT_A}&student_id=eq.${STUDENT_A}`,
        ),
        getRows(
          "evaluations",
          `assignment_id=eq.${ASSIGNMENT_A}&student_id=eq.${SYNTHETIC_STUDENT}`,
        ),
        getRows("students", `id=eq.${SYNTHETIC_STUDENT}`),
      ]);

    expect(studentAEvaluations).toHaveLength(0);
    expect(syntheticEvaluations).toHaveLength(0);
    expect(syntheticStudents).toHaveLength(0);
  });

  it("lists current Evaluations with their Student in the owned Assignment", async () => {
    const emptyResponse = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_A}/evaluations`,
      { method: "GET" },
      jar,
    );
    expect(emptyResponse.status).toBe(200);
    expect((await emptyResponse.json()).data).toEqual([]);

    const evaluationId = await createEvaluationFixture();
    const syntheticStudentId = await createSyntheticStudentFixture();
    const syntheticEvaluationId =
      await createEvaluationFixture(syntheticStudentId);
    createdEvaluationIds.push(evaluationId, syntheticEvaluationId);
    createdStudentIds.push(syntheticStudentId);

    const response = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_A}/evaluations`,
      { method: "GET" },
      jar,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: evaluationId,
          studentId: STUDENT_A,
          assignmentId: ASSIGNMENT_A,
          score: 8.5,
          feedback: "Evaluation fixture",
          status: "graded",
          student: {
            id: STUDENT_A,
            mssv: "DEMO001",
            fullName: "Demo Student A",
            nickname: "DEMO001",
          },
        }),
        expect.objectContaining({
          id: syntheticEvaluationId,
          studentId: syntheticStudentId,
          student: {
            id: syntheticStudentId,
            mssv: "A4-SYNTHETIC-099",
            fullName: "A4 Synthetic Student",
            nickname: "A4SYNTH099",
          },
        }),
      ]),
    );
    expect(body.data).toHaveLength(2);
  });

  it("creates one current pending Evaluation for a Student in the same ClassSection", async () => {
    const response = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_A}/students/${STUDENT_A}/evaluation`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score: null, feedback: "", status: "pending" }),
      },
      jar,
    );
    const body = await response.json();
    if (response.ok && "data" in body) createdEvaluationIds.push(body.data.id);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data).toMatchObject({
      studentId: STUDENT_A,
      assignmentId: ASSIGNMENT_A,
      score: null,
      feedback: "",
      status: "pending",
    });
    const listResponse = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_A}/evaluations`,
      { method: "GET" },
      jar,
    );
    expect((await listResponse.json()).data).toHaveLength(1);
  });

  it("rejects every locked score, feedback, and status boundary violation", async () => {
    const invalidPayloads = [
      { score: -0.1, feedback: "", status: "graded" },
      { score: 10.1, feedback: "", status: "graded" },
      { score: 8.25, feedback: "", status: "graded" },
      { score: null, feedback: "", status: "graded" },
      { score: null, feedback: "", status: "returned" },
      { score: 8, feedback: "x".repeat(5_001), status: "graded" },
      { score: 8, feedback: "", status: "invalid" },
    ];

    for (const payload of invalidPayloads) {
      const response = await fetchApi(
        `/api/v1/teacher/assignments/${ASSIGNMENT_A}/students/${STUDENT_A}/evaluation`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
        jar,
      );
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    }

    const rows = await getRows(
      "evaluations",
      `assignment_id=eq.${ASSIGNMENT_A}&student_id=eq.${STUDENT_A}`,
    );
    expect(rows).toHaveLength(0);
  });

  it("updates the current Evaluation atomically, records history, and notifies once", async () => {
    const createResponse = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_A}/students/${STUDENT_A}/evaluation`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score: null, feedback: "", status: "pending" }),
      },
      jar,
    );
    const created = (await createResponse.json()).data;
    createdEvaluationIds.push(created.id);

    const updatePayload = {
      score: 9,
      feedback: "Đã hoàn thành tốt",
      status: "returned",
    };
    const updateResponse = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_A}/students/${STUDENT_A}/evaluation`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updatePayload),
      },
      jar,
    );
    const updated = (await updateResponse.json()).data;

    expect(updateResponse.status).toBe(200);
    expect(updated.id).toBe(created.id);
    expect(updated).toMatchObject(updatePayload);

    const history = await getRows(
      "evaluation_history",
      `evaluation_id=eq.${created.id}&select=old_score,old_feedback,old_status,changed_by`,
    );
    expect(history).toEqual([
      {
        old_score: null,
        old_feedback: "",
        old_status: "pending",
        changed_by: TEACHER_A_ID,
      },
    ]);

    const historyResponse = await fetchApi(
      `/api/v1/teacher/evaluations/${created.id}/history`,
      { method: "GET" },
      jar,
    );
    expect(historyResponse.status).toBe(200);
    expect((await historyResponse.json()).data).toEqual([
      expect.objectContaining({
        evaluationId: created.id,
        oldScore: null,
        oldFeedback: "",
        oldStatus: "pending",
        changedBy: expect.objectContaining({ id: TEACHER_A_ID }),
      }),
    ]);

    const notifications = await getRows(
      "notifications",
      `evaluation_id=eq.${created.id}&select=student_id,type,message`,
    );
    expect(notifications).toEqual([
      expect.objectContaining({
        student_id: STUDENT_A,
        type: "evaluation_updated",
      }),
    ]);

    const noOpResponse = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_A}/students/${STUDENT_A}/evaluation`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updatePayload),
      },
      jar,
    );
    expect(noOpResponse.status).toBe(200);
    expect(
      await getRows("evaluation_history", `evaluation_id=eq.${created.id}`),
    ).toHaveLength(1);
    expect(
      await getRows("notifications", `evaluation_id=eq.${created.id}`),
    ).toHaveLength(1);
  });

  it("conceals cross-ClassSection and cross-Teacher Evaluation contexts", async () => {
    const crossClassResponse = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_A}/students/${STUDENT_B}/evaluation`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score: 8, feedback: "", status: "graded" }),
      },
      jar,
    );
    expect(crossClassResponse.status).toBe(404);

    const crossTeacherList = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_B}/evaluations`,
      { method: "GET" },
      jar,
    );
    expect(crossTeacherList.status).toBe(404);

    const crossTeacherMutation = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_B}/students/${STUDENT_B}/evaluation`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score: 8, feedback: "", status: "graded" }),
      },
      jar,
    );
    expect(crossTeacherMutation.status).toBe(404);
  });

  it("rejects invalid and missing IDs with a safe validation or not-found envelope", async () => {
    const responses = await Promise.all([
      fetchApi(
        "/api/v1/teacher/assignments/not-a-uuid/evaluations",
        {
          method: "GET",
        },
        jar,
      ),
      fetchApi(
        "/api/v1/teacher/assignments/f3000000-0000-0000-0000-000000000099/evaluations",
        { method: "GET" },
        jar,
      ),
      fetchApi(
        `/api/v1/teacher/assignments/${ASSIGNMENT_A}/students/not-a-uuid/evaluation`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ score: 8, feedback: "", status: "graded" }),
        },
        jar,
      ),
      fetchApi(
        `/api/v1/teacher/assignments/${ASSIGNMENT_A}/students/f2000000-0000-0000-0000-000000000099/evaluation`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ score: 8, feedback: "", status: "graded" }),
        },
        jar,
      ),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      400, 404, 400, 404,
    ]);
    for (const response of responses) {
      const body = await response.json();
      expect(body).not.toHaveProperty("data");
      expect(JSON.stringify(body)).not.toMatch(
        /pin|hash|token|supabase|cookie/i,
      );
    }
  });

  it("rejects unauthenticated Evaluation access with safe envelopes", async () => {
    const responses = await Promise.all([
      fetchApi(`/api/v1/teacher/assignments/${ASSIGNMENT_A}/evaluations`, {
        method: "GET",
      }),
      fetchApi(
        `/api/v1/teacher/assignments/${ASSIGNMENT_A}/students/${STUDENT_A}/evaluation`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            score: null,
            feedback: "",
            status: "pending",
          }),
        },
      ),
    ]);

    for (const response of responses) {
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).not.toHaveProperty("data");
      expect(body.error.code).toBe("UNAUTHENTICATED");
      expect(JSON.stringify(body)).not.toMatch(
        /pin|hash|token|supabase|cookie/i,
      );
    }
  });

  it("returns 403 and does not mutate when Evaluation PUT has a foreign Origin", async () => {
    const response = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_A}/students/${STUDENT_A}/evaluation`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.invalid",
        },
        body: JSON.stringify({
          score: 9,
          feedback: "Cross origin",
          status: "graded",
        }),
      },
      jar,
    );

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
    expect(
      await getRows(
        "evaluations",
        `assignment_id=eq.${ASSIGNMENT_A}&student_id=eq.${STUDENT_A}`,
      ),
    ).toHaveLength(0);
  });
});
