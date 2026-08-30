import { beforeEach, describe, expect, it } from "vitest";

import { CookieJar, fetchApi } from "./setup";

const TEACHER_A = {
  email: "teacher-a@minback.local",
  password: "DemoTeacherA123!",
};

const CLASS_A = "f1000000-0000-0000-0000-000000000001";
const CLASS_B = "f1000000-0000-0000-0000-000000000002";
const LOGIN_PATH = "/api/v1/teacher/auth/login";

async function loginAsTeacher(jar: CookieJar): Promise<void> {
  const response = await fetchApi(
    LOGIN_PATH,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(TEACHER_A),
    },
    jar,
  );

  expect(response.status).toBe(200);
}

describe("ClassSection API", () => {
  let jar: CookieJar;

  beforeEach(async () => {
    jar = new CookieJar();
    await loginAsTeacher(jar);
  });

  it("rejects unauthenticated list requests", async () => {
    const response = await fetchApi("/api/v1/teacher/class-sections", {
      method: "GET",
    });

    expect(response.status).toBe(401);
  });

  it("rejects invalid pagination", async () => {
    const response = await fetchApi(
      "/api/v1/teacher/class-sections?page=0&pageSize=101",
      { method: "GET" },
      jar,
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("lists only the authenticated Teacher's ClassSections with pagination", async () => {
    const response = await fetchApi(
      "/api/v1/teacher/class-sections?page=1&pageSize=20",
      { method: "GET" },
      jar,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.meta).toMatchObject({ page: 1, pageSize: 20, total: 1 });
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      code: "DEMO_A",
      name: "Demo Class A",
    });
  });

  it("creates a ClassSection with normalized code", async () => {
    const response = await fetchApi(
      "/api/v1/teacher/class-sections",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "  demo_new  ", name: "Temporary Class" }),
      },
      jar,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({
      code: "DEMO_NEW",
      name: "Temporary Class",
    });

    const deleteResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${body.data.id}`,
      { method: "DELETE" },
      jar,
    );
    expect(deleteResponse.status).toBe(204);
  });

  it("rejects duplicate ClassSection code", async () => {
    const response = await fetchApi(
      "/api/v1/teacher/class-sections",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "demo_a", name: "Duplicate" }),
      },
      jar,
    );

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("CONFLICT");
  });

  it("reads and updates a ClassSection in the Teacher context", async () => {
    const getResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}`,
      { method: "GET" },
      jar,
    );
    expect(getResponse.status).toBe(200);

    const patchResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Demo Class A Updated" }),
      },
      jar,
    );
    expect(patchResponse.status).toBe(200);
    expect((await patchResponse.json()).data.name).toBe("Demo Class A Updated");

    const restoreResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Demo Class A" }),
      },
      jar,
    );
    expect(restoreResponse.status).toBe(200);
  });

  it("rejects an update that conflicts with another ClassSection code", async () => {
    const createResponse = await fetchApi(
      "/api/v1/teacher/class-sections",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "temporary", name: "Temporary Class" }),
      },
      jar,
    );
    const created = await createResponse.json();

    const updateResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${created.data.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "DEMO_A" }),
      },
      jar,
    );
    expect(updateResponse.status).toBe(409);

    const deleteResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${created.data.id}`,
      { method: "DELETE" },
      jar,
    );
    expect(deleteResponse.status).toBe(204);
  });

  it("hides a ClassSection owned by another Teacher", async () => {
    const response = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_B}`,
      { method: "GET" },
      jar,
    );

    expect([403, 404]).toContain(response.status);
  });

  it("returns not found for a valid but unknown ClassSection ID", async () => {
    const response = await fetchApi(
      "/api/v1/teacher/class-sections/00000000-0000-0000-0000-000000000099",
      { method: "GET" },
      jar,
    );

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("rejects a malformed ClassSection ID", async () => {
    const response = await fetchApi(
      "/api/v1/teacher/class-sections/not-a-uuid",
      { method: "GET" },
      jar,
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("does not delete a ClassSection that has dependent data", async () => {
    const response = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}`,
      { method: "DELETE" },
      jar,
    );

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("CONFLICT");
  });
});
