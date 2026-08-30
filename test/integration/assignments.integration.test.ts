import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CookieJar, fetchApi } from "./setup";

const TEACHER_A = {
  email: "teacher-a@minback.local",
  password: "DemoTeacherA123!",
};
const TEACHER_B = {
  email: "teacher-b@minback.local",
  password: "DemoTeacherB123!",
};

const CLASS_A = "f1000000-0000-0000-0000-000000000001";
const CLASS_B = "f1000000-0000-0000-0000-000000000002";
const ASSIGNMENT_B = "f3000000-0000-0000-0000-000000000002";
const STUDENT_A = "f2000000-0000-0000-0000-000000000001";

async function cleanupAssignments(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/assignments?id=in.(${ids.join(",")})`,
    {
      method: "DELETE",
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
      },
    },
  );
  expect(response.ok).toBe(true);
}

async function cleanupEvaluations(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/evaluations?id=in.(${ids.join(",")})`,
    {
      method: "DELETE",
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
      },
    },
  );
  expect(response.ok).toBe(true);
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

async function createAssignment(
  jar: CookieJar,
  createdAssignmentIds: string[],
  overrides: Record<string, unknown> = {},
) {
  const response = await fetchApi(
    `/api/v1/teacher/class-sections/${CLASS_A}/assignments`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "Assignment integration test",
        description: "Kiểm tra Assignment",
        assignedDate: "2026-09-01",
        dueDate: "2026-09-15",
        maxScore: 10,
        ...overrides,
      }),
    },
    jar,
  );
  expect(response.status).toBe(201);
  const body = await response.json();
  createdAssignmentIds.push(body.data.id);
  return body.data;
}

describe("Assignment API", () => {
  let jar: CookieJar;
  const createdAssignmentIds: string[] = [];
  const createdEvaluationIds: string[] = [];

  beforeEach(async () => {
    jar = new CookieJar();
    await loginAsTeacher(jar);
  });

  afterEach(async () => {
    await cleanupEvaluations(createdEvaluationIds.splice(0));
    await cleanupAssignments(createdAssignmentIds.splice(0));
  });

  it("lists Assignments in the authenticated Teacher's ClassSection", async () => {
    const response = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/assignments`,
      { method: "GET" },
      jar,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      expect.objectContaining({
        id: "f3000000-0000-0000-0000-000000000001",
        classSectionId: CLASS_A,
        title: "Demo Assignment A",
        status: "published",
        maxScore: 10,
      }),
    ]);
  });

  it("creates a draft Assignment in the selected ClassSection", async () => {
    const response = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/assignments`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "  Assignment integration test  ",
          description: "Kiểm tra tạo bài tập",
          assignedDate: "2026-09-01",
          dueDate: "2026-09-15",
          maxScore: 9.5,
        }),
      },
      jar,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({
      classSectionId: CLASS_A,
      title: "Assignment integration test",
      description: "Kiểm tra tạo bài tập",
      assignedDate: "2026-09-01",
      dueDate: "2026-09-15",
      status: "draft",
      maxScore: 9.5,
    });
    createdAssignmentIds.push(body.data.id);
  });

  it("rejects invalid Assignment input before mutating the ClassSection", async () => {
    const response = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/assignments`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Invalid dates",
          assignedDate: "2026-09-15",
          dueDate: "2026-09-01",
          maxScore: 10.25,
        }),
      },
      jar,
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("reads, edits, and permits only locked Assignment status transitions", async () => {
    const created = await createAssignment(jar, createdAssignmentIds);

    const getResponse = await fetchApi(
      `/api/v1/teacher/assignments/${created.id}`,
      { method: "GET" },
      jar,
    );
    expect(getResponse.status).toBe(200);
    expect((await getResponse.json()).data.id).toBe(created.id);

    const publishResponse = await fetchApi(
      `/api/v1/teacher/assignments/${created.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Edited assignment",
          status: "published",
        }),
      },
      jar,
    );
    expect(publishResponse.status).toBe(200);
    expect((await publishResponse.json()).data).toMatchObject({
      title: "Edited assignment",
      status: "published",
    });

    const closeResponse = await fetchApi(
      `/api/v1/teacher/assignments/${created.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      },
      jar,
    );
    expect(closeResponse.status).toBe(200);

    const reopenResponse = await fetchApi(
      `/api/v1/teacher/assignments/${created.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      },
      jar,
    );
    expect(reopenResponse.status).toBe(200);

    const invalidTransition = await fetchApi(
      `/api/v1/teacher/assignments/${created.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      },
      jar,
    );
    expect(invalidTransition.status).toBe(400);
    expect((await invalidTransition.json()).error.code).toBe(
      "INVALID_STATE_TRANSITION",
    );
  });

  it("deletes only a draft Assignment without Evaluations", async () => {
    const created = await createAssignment(jar, createdAssignmentIds);

    const deleteResponse = await fetchApi(
      `/api/v1/teacher/assignments/${created.id}`,
      { method: "DELETE" },
      jar,
    );
    expect(deleteResponse.status).toBe(204);

    const getResponse = await fetchApi(
      `/api/v1/teacher/assignments/${created.id}`,
      { method: "GET" },
      jar,
    );
    expect(getResponse.status).toBe(404);
  });

  it("rejects deleting a published Assignment or a draft with an Evaluation", async () => {
    const published = await createAssignment(jar, createdAssignmentIds, {
      status: "published",
    });
    const publishedDelete = await fetchApi(
      `/api/v1/teacher/assignments/${published.id}`,
      { method: "DELETE" },
      jar,
    );
    expect(publishedDelete.status).toBe(409);
    expect((await publishedDelete.json()).error.code).toBe("CONFLICT");

    const draft = await createAssignment(jar, createdAssignmentIds);
    const evaluationResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/evaluations`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_SECRET_KEY!,
          authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
          "content-type": "application/json",
          prefer: "return=representation",
        },
        body: JSON.stringify({
          student_id: STUDENT_A,
          assignment_id: draft.id,
          feedback: "",
          status: "pending",
        }),
      },
    );
    expect(evaluationResponse.status).toBe(201);
    const [evaluation] = await evaluationResponse.json();
    createdEvaluationIds.push(evaluation.id);

    const draftDelete = await fetchApi(
      `/api/v1/teacher/assignments/${draft.id}`,
      { method: "DELETE" },
      jar,
    );
    expect(draftDelete.status).toBe(409);
    expect((await draftDelete.json()).error.code).toBe("CONFLICT");
  });

  it("hides another Teacher's ClassSection and Assignment by returning 404", async () => {
    const listResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_B}/assignments`,
      { method: "GET" },
      jar,
    );
    expect(listResponse.status).toBe(404);

    const getResponse = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_B}`,
      { method: "GET" },
      jar,
    );
    expect(getResponse.status).toBe(404);

    const patchResponse = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_B}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Attempted cross-Teacher edit" }),
      },
      jar,
    );
    expect(patchResponse.status).toBe(404);

    const deleteResponse = await fetchApi(
      `/api/v1/teacher/assignments/${ASSIGNMENT_B}`,
      { method: "DELETE" },
      jar,
    );
    expect(deleteResponse.status).toBe(404);
  });

  it("rejects unauthenticated access and cross-origin mutations", async () => {
    const unauthenticatedRequests = [
      fetchApi(`/api/v1/teacher/class-sections/${CLASS_A}/assignments`, {
        method: "GET",
      }),
      fetchApi(`/api/v1/teacher/class-sections/${CLASS_A}/assignments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      fetchApi(`/api/v1/teacher/assignments/${ASSIGNMENT_B}`, {
        method: "GET",
      }),
      fetchApi(`/api/v1/teacher/assignments/${ASSIGNMENT_B}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "No session" }),
      }),
      fetchApi(`/api/v1/teacher/assignments/${ASSIGNMENT_B}`, {
        method: "DELETE",
      }),
    ];
    const unauthenticatedResponses = await Promise.all(unauthenticatedRequests);
    for (const response of unauthenticatedResponses) {
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).not.toHaveProperty("data");
      expect(body.error.code).toBe("UNAUTHENTICATED");
    }

    const crossOrigin = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/assignments`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.invalid",
        },
        body: JSON.stringify({
          title: "Cross origin assignment",
          assignedDate: "2026-09-01",
          dueDate: "2026-09-15",
          maxScore: 10,
        }),
      },
      jar,
    );
    expect(crossOrigin.status).toBe(403);
    expect((await crossOrigin.json()).error.code).toBe("FORBIDDEN");
  });

  it("returns 403 without mutating when PATCH or DELETE has a foreign Origin", async () => {
    const created = await createAssignment(jar, createdAssignmentIds, {
      title: "Origin protected",
    });

    const patchResponse = await fetchApi(
      `/api/v1/teacher/assignments/${created.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          origin: "https://attacker.invalid",
        },
        body: JSON.stringify({ title: "Unexpected edit" }),
      },
      jar,
    );
    expect(patchResponse.status).toBe(403);

    const deleteResponse = await fetchApi(
      `/api/v1/teacher/assignments/${created.id}`,
      { method: "DELETE", headers: { origin: "https://attacker.invalid" } },
      jar,
    );
    expect(deleteResponse.status).toBe(403);

    const getResponse = await fetchApi(
      `/api/v1/teacher/assignments/${created.id}`,
      { method: "GET" },
      jar,
    );
    expect(getResponse.status).toBe(200);
    expect((await getResponse.json()).data.title).toBe("Origin protected");
  });

  it("does not create an Assignment in another Teacher's ClassSection", async () => {
    const response = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_B}/assignments`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Cross-Teacher create",
          assignedDate: "2026-09-01",
          dueDate: "2026-09-15",
          maxScore: 10,
        }),
      },
      jar,
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).not.toHaveProperty("data");
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
