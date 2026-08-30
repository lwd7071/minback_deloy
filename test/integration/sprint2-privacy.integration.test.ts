import { randomUUID } from "node:crypto";

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
const TEACHER_B_ID = "f0000000-0000-0000-0000-000000000002";
const CLASS_A = "f1000000-0000-0000-0000-000000000001";
const CLASS_B = "f1000000-0000-0000-0000-000000000002";
const EVIL_ORIGIN = "https://evil.example.test";

async function login(jar: CookieJar, credentials = TEACHER_A): Promise<void> {
  const response = await fetchApi(
    "/api/v1/teacher/auth/login",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(credentials),
    },
    jar,
  );
  expect(response.status).toBe(200);
}

function importForm(mssv: string): FormData {
  const form = new FormData();
  form.set(
    "file",
    new File([`MSSV,Họ Tên\n${mssv},Synthetic Student\n`], "students.csv", {
      type: "text/csv",
    }),
  );
  return form;
}

function adminHeaders(): HeadersInit {
  return {
    apikey: process.env.SUPABASE_SECRET_KEY!,
    authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
  };
}

async function cleanupRows(table: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?id=in.(${ids.join(",")})`,
    { method: "DELETE", headers: adminHeaders() },
  );
  expect(response.ok).toBe(true);
}

async function findBy(
  table: "class_sections" | "students",
  field: "code" | "mssv",
  value: string,
): Promise<Array<{ id: string }>> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}?${field}=eq.${encodeURIComponent(value)}&select=id`,
    { headers: adminHeaders() },
  );
  expect(response.ok).toBe(true);
  return (await response.json()) as Array<{ id: string }>;
}

async function expectSafeError(
  response: Response,
  status: number,
  code: string,
): Promise<void> {
  expect(response.status).toBe(status);
  const body = await response.json();
  expect(body).not.toHaveProperty("data");
  expect(body).toMatchObject({ error: { code } });
  expect(JSON.stringify(body)).not.toMatch(
    /pin_hash|initialPin|SUPABASE_SECRET|service_role|teacher-b@minback\.local/i,
  );
}

describe("Sprint 2 ClassSection privacy regression", () => {
  let teacherAJar: CookieJar;
  const createdClassIds: string[] = [];
  const createdStudentIds: string[] = [];

  beforeEach(async () => {
    teacherAJar = new CookieJar();
    await login(teacherAJar);
  });

  afterEach(async () => {
    await cleanupRows("students", createdStudentIds.splice(0));
    await cleanupRows("class_sections", createdClassIds.splice(0));
  });

  it("rejects unauthenticated access to every Sprint 2 endpoint", async () => {
    const requests = [
      fetchApi("/api/v1/teacher/class-sections", { method: "GET" }),
      fetchApi("/api/v1/teacher/class-sections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "UNAUTH_CREATE", name: "Unauthorized" }),
      }),
      fetchApi(`/api/v1/teacher/class-sections/${CLASS_A}`, { method: "GET" }),
      fetchApi(`/api/v1/teacher/class-sections/${CLASS_A}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Unauthorized" }),
      }),
      fetchApi(`/api/v1/teacher/class-sections/${CLASS_A}`, { method: "DELETE" }),
      fetchApi(`/api/v1/teacher/class-sections/${CLASS_A}/import`, {
        method: "POST",
        body: importForm("UNAUTH001"),
      }),
    ];

    for (const response of await Promise.all(requests)) {
      await expectSafeError(response, 401, "UNAUTHENTICATED");
    }
    expect(await findBy("class_sections", "code", "UNAUTH_CREATE")).toEqual([]);
    expect(await findBy("students", "mssv", "UNAUTH001")).toEqual([]);
  });

  it("hides Teacher B resources from Teacher A for direct-ID operations", async () => {
    const crossMssv = `CROSS${randomUUID().slice(0, 8).toUpperCase()}`;
    const responses = [
      await fetchApi(`/api/v1/teacher/class-sections/${CLASS_B}`, { method: "GET" }, teacherAJar),
      await fetchApi(
        `/api/v1/teacher/class-sections/${CLASS_B}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Cross Teacher Mutation" }),
        },
        teacherAJar,
      ),
      await fetchApi(
        `/api/v1/teacher/class-sections/${CLASS_B}`,
        { method: "DELETE" },
        teacherAJar,
      ),
      await fetchApi(
        `/api/v1/teacher/class-sections/${CLASS_B}/import`,
        { method: "POST", body: importForm(crossMssv) },
        teacherAJar,
      ),
    ];

    for (const response of responses) {
      await expectSafeError(response, 404, "NOT_FOUND");
    }
    const teacherBJar = new CookieJar();
    await login(teacherBJar, TEACHER_B);
    const classBResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_B}`,
      { method: "GET" },
      teacherBJar,
    );
    expect(classBResponse.status).toBe(200);
    expect((await classBResponse.json()).data.name).toBe("Demo Class B");
    expect(await findBy("students", "mssv", crossMssv)).toEqual([]);
  });

  it("ignores a forged teacherId and creates only in the current Teacher context", async () => {
    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const code = `OWNER_${suffix}`;
    const createResponse = await fetchApi(
      "/api/v1/teacher/class-sections",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, name: "Owner Scope", teacherId: TEACHER_B_ID }),
      },
      teacherAJar,
    );
    const created = await createResponse.json();
    expect(createResponse.status).toBe(201);
    createdClassIds.push(created.data.id);

    const teacherBJar = new CookieJar();
    await login(teacherBJar, TEACHER_B);
    const teacherBList = await fetchApi(
      "/api/v1/teacher/class-sections?page=1&pageSize=100",
      { method: "GET" },
      teacherBJar,
    );
    expect((await teacherBList.json()).data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code })]),
    );
    const teacherAGet = await fetchApi(
      `/api/v1/teacher/class-sections/${created.data.id}`,
      { method: "GET" },
      teacherAJar,
    );
    expect(teacherAGet.status).toBe(200);
  });

  it("rejects cross-origin mutations without changing data", async () => {
    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const code = `CSRF_${suffix}`;
    const mssv = `CSRF${suffix}`;
    const createResponse = await fetchApi(
      "/api/v1/teacher/class-sections",
      {
        method: "POST",
        headers: { "content-type": "application/json", origin: EVIL_ORIGIN },
        body: JSON.stringify({ code, name: "CSRF Create" }),
      },
      teacherAJar,
    );
    const createBody = await createResponse.json();
    if (createBody.data?.id) createdClassIds.push(createBody.data.id);
    await expectSafeError(
      new Response(JSON.stringify(createBody), {
        status: createResponse.status,
        headers: { "content-type": "application/json" },
      }),
      403,
      "FORBIDDEN",
    );

    const patchResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", origin: EVIL_ORIGIN },
        body: JSON.stringify({ name: "CSRF Updated" }),
      },
      teacherAJar,
    );
    await expectSafeError(patchResponse, 403, "FORBIDDEN");
    const deleteResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}`,
      { method: "DELETE", headers: { origin: EVIL_ORIGIN } },
      teacherAJar,
    );
    await expectSafeError(deleteResponse, 403, "FORBIDDEN");
    const importResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/import`,
      { method: "POST", headers: { origin: EVIL_ORIGIN }, body: importForm(mssv) },
      teacherAJar,
    );
    await expectSafeError(importResponse, 403, "FORBIDDEN");

    expect(await findBy("class_sections", "code", code)).toEqual([]);
    expect(await findBy("students", "mssv", mssv)).toEqual([]);
    const classAResponse = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}`,
      { method: "GET" },
      teacherAJar,
    );
    expect(classAResponse.status).toBe(200);
    expect((await classAResponse.json()).data.name).toBe("Demo Class A");
  });
});
