import { randomUUID } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { CookieJar, fetchApi } from "./setup";

const TEACHER_A = {
  email: "teacher-a@minback.local",
  password: "DemoTeacherA123!",
};
const CLASS_SECTION_A = "f1000000-0000-0000-0000-000000000001";

const createdStudentIds: string[] = [];
const createdAssignmentIds: string[] = [];
const createdEvaluationIds: string[] = [];

function adminHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    apikey: process.env.SUPABASE_SECRET_KEY!,
    authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
    ...extra,
  };
}

async function loginTeacher(jar: CookieJar): Promise<void> {
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

afterEach(async () => {
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
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/student_sessions?student_id=eq.${id}`,
      { method: "DELETE", headers: adminHeaders() },
    );
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/students?id=eq.${id}`,
      { method: "DELETE", headers: adminHeaders() },
    );
    expect(response.ok).toBe(true);
  }
});

describe("Teacher-to-Student core workflow", () => {
  it("imports, evaluates, upgrades Student credentials, and exposes only the resulting profile", async () => {
    const teacherJar = new CookieJar();
    await loginTeacher(teacherJar);
    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const mssv = `A6${suffix}`;
    const importForm = new FormData();
    importForm.set(
      "file",
      new File(
        [
          `MSSV,Họ Tên,Email\n${mssv},A6 Workflow Student,a6-${suffix}@example.test`,
        ],
        "workflow.csv",
        { type: "text/csv" },
      ),
    );
    const importResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_SECTION_A}/import`,
      { method: "POST", body: importForm },
      teacherJar,
    );
    const importBody = await importResponse.json();
    expect(importResponse.status).toBe(200);
    expect(importBody.data.summary).toEqual({
      total: 1,
      created: 1,
      updated: 0,
      skipped: 0,
    });
    const imported = importBody.data.rows[0];
    createdStudentIds.push(imported.studentId);

    const assignmentResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_SECTION_A}/assignments`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: `A6 Workflow ${suffix}`,
          description: "Synthetic core workflow Assignment",
          assignedDate: "2026-09-01",
          dueDate: "2026-09-30",
          maxScore: 10,
        }),
      },
      teacherJar,
    );
    const assignment = (await assignmentResponse.json()).data;
    expect(assignmentResponse.status).toBe(201);
    createdAssignmentIds.push(assignment.id);

    const publishResponse = await fetchApi(
      `/api/v1/teacher/assignments/${assignment.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      },
      teacherJar,
    );
    expect(publishResponse.status).toBe(200);

    const evaluationResponse = await fetchApi(
      `/api/v1/teacher/assignments/${assignment.id}/students/${imported.studentId}/evaluation`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          score: 8.5,
          feedback: "A6 workflow feedback",
          status: "returned",
        }),
      },
      teacherJar,
    );
    const evaluation = (await evaluationResponse.json()).data;
    expect(evaluationResponse.status).toBe(200);
    createdEvaluationIds.push(evaluation.id);

    const studentJar = new CookieJar();
    const studentLoginResponse = await fetchApi(
      "/api/v1/student/auth/login",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          classCode: "DEMO_A",
          nickname: imported.initialNickname,
          pin: imported.initialPin,
        }),
      },
      studentJar,
    );
    expect(studentLoginResponse.status).toBe(200);

    const beforeCredentials = await fetchApi(
      "/api/v1/student/profile",
      { method: "GET" },
      studentJar,
    );
    expect(beforeCredentials.status).toBe(403);
    expect((await beforeCredentials.json()).error.code).toBe(
      "CREDENTIAL_CHANGE_REQUIRED",
    );

    const credentialResponse = await fetchApi(
      "/api/v1/student/auth/credentials",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: `A6${suffix}`, pin: "654321" }),
      },
      studentJar,
    );
    expect(credentialResponse.status).toBe(200);
    expect((await credentialResponse.json()).data.accessLevel).toBe("full");

    const profileResponse = await fetchApi(
      "/api/v1/student/profile",
      { method: "GET" },
      studentJar,
    );
    const profile = await profileResponse.json();
    expect(profileResponse.status).toBe(200);
    expect(profile.data.student).toMatchObject({
      mssv,
      nickname: `A6${suffix}`,
    });
    expect(profile.data.progress).toEqual({
      completed: 1,
      total: 2,
      percentage: 50,
    });
    expect(profile.data.assignments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: assignment.id,
          evaluation: expect.objectContaining({
            score: 8.5,
            feedback: "A6 workflow feedback",
            status: "returned",
          }),
        }),
      ]),
    );
  });
});
