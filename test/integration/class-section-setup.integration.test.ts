import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CookieJar, fetchApi } from "./setup";

const TEACHER_A = {
  email: "teacher-a@minback.local",
  password: "DemoTeacherA123!",
};

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

async function deleteClasses(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/class_sections?id=in.(${ids.join(",")})`,
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

async function countClassesByCode(code: string): Promise<number> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/class_sections?code=eq.${code}&select=id`,
    {
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
      },
    },
  );
  expect(response.ok).toBe(true);
  return ((await response.json()) as Array<{ id: string }>).length;
}

async function countAllClasses(): Promise<number> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/class_sections?select=id`,
    {
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
      },
    },
  );
  expect(response.ok).toBe(true);
  return ((await response.json()) as Array<{ id: string }>).length;
}

describe("ClassSection setup API", () => {
  let jar: CookieJar;
  const createdClassIds: string[] = [];

  beforeEach(async () => {
    jar = new CookieJar();
    await loginAsTeacher(jar);
  });

  afterEach(async () => {
    await deleteClasses(createdClassIds.splice(0));
  });

  it("previews a roster without creating a class", async () => {
    const before = await countAllClasses();
    const form = new FormData();
    form.set(
      "file",
      new File(["MSSV,Họ Tên\nSV01,Nguyễn An\n"], "students.csv"),
    );

    const response = await fetchApi(
      "/api/v1/teacher/class-section-import-previews",
      { method: "POST", body: form },
      jar,
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.summary).toEqual({
      total: 1,
      valid: 1,
      skipped: 0,
    });
    expect(await countAllClasses()).toBe(before);
  });

  it("creates an empty class in the final setup request", async () => {
    const code = `EMPTY_${randomUUID().slice(0, 8).toUpperCase()}`;
    const form = new FormData();
    form.set("code", code);
    form.set("name", "Lớp trống");

    const response = await fetchApi(
      "/api/v1/teacher/class-section-setups",
      { method: "POST", body: form },
      jar,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.import).toBeNull();
    expect(body.data.classSection.code).toBe(code);
    createdClassIds.push(body.data.classSection.id);
  });

  it("creates a class and valid students atomically with one-time PINs", async () => {
    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const code = `SETUP_${suffix}`;
    const form = new FormData();
    form.set("code", code);
    form.set("name", "Lớp atomic");
    form.set(
      "file",
      new File(
        [
          `MSSV,Họ Tên\nSV${suffix},Nguyễn An\nSV${suffix},Trùng\n,Thiếu MSSV\n`,
        ],
        "students.csv",
      ),
    );

    const response = await fetchApi(
      "/api/v1/teacher/class-section-setups",
      { method: "POST", body: form },
      jar,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    createdClassIds.push(body.data.classSection.id);
    expect(body.data.import.summary).toEqual({
      total: 3,
      created: 1,
      updated: 0,
      skipped: 2,
    });
    expect(body.data.import.rows[0]).toMatchObject({
      status: "created",
      initialNickname: `SV${suffix}`,
      initialPin: expect.stringMatching(/^\d{6}$/),
    });
    expect(
      body.data.import.rows
        .slice(1)
        .every((row: Record<string, unknown>) => !("initialPin" in row)),
    ).toBe(true);
  });

  it("does not leave a class when every file row is invalid", async () => {
    const code = `INVALID_${randomUUID().slice(0, 8).toUpperCase()}`;
    const form = new FormData();
    form.set("code", code);
    form.set("name", "Không được tạo");
    form.set("file", new File(["MSSV,Họ Tên\n,Thiếu MSSV\n"], "students.csv"));

    const response = await fetchApi(
      "/api/v1/teacher/class-section-setups",
      { method: "POST", body: form },
      jar,
    );

    expect(response.status).toBe(400);
    expect(await countClassesByCode(code)).toBe(0);
  });
});
