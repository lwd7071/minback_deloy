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

async function login(jar: CookieJar, credentials: typeof TEACHER_A) {
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

async function resetGradebookConfiguration() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/assignments?class_section_id=eq.${CLASS_A}`,
    {
      method: "PATCH",
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY!,
        authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        gradebook_included: false,
        gradebook_weight: null,
      }),
    },
  );
  expect(response.ok).toBe(true);
}

describe("Teacher Gradebook API", () => {
  let teacherA: CookieJar;
  let teacherB: CookieJar;

  beforeEach(async () => {
    teacherA = new CookieJar();
    teacherB = new CookieJar();
    await login(teacherA, TEACHER_A);
    await login(teacherB, TEACHER_B);
  });

  afterEach(async () => {
    await resetGradebookConfiguration();
  });

  it("reads Assignment columns and saves a valid 100% grade configuration", async () => {
    const path = `/api/v1/teacher/class-sections/${CLASS_A}/gradebook`;
    const before = await fetchApi(path, {}, teacherA);
    expect(before.status).toBe(200);
    const initial = await before.json();
    expect(initial.data.assignmentsConfig).toEqual([
      expect.objectContaining({
        id: "f3000000-0000-0000-0000-000000000001",
        included: false,
        weight: null,
      }),
    ]);

    const update = await fetchApi(
      `${path}/config`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assignments: [
            {
              assignmentId: "f3000000-0000-0000-0000-000000000001",
              included: true,
              weight: 100,
            },
          ],
        }),
      },
      teacherA,
    );
    expect(update.status).toBe(200);

    const after = await fetchApi(path, {}, teacherA);
    expect((await after.json()).data.assignmentsConfig[0]).toMatchObject({
      included: true,
      weight: 100,
    });
  });

  it("rejects invalid totals and hides other Teachers' classes", async () => {
    const invalid = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/gradebook/config`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assignments: [
            {
              assignmentId: "f3000000-0000-0000-0000-000000000001",
              included: true,
              weight: 80,
            },
          ],
        }),
      },
      teacherA,
    );
    expect(invalid.status).toBe(400);

    const foreignAssignment = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/gradebook/config`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assignments: [
            {
              assignmentId: "f3000000-0000-0000-0000-000000000002",
              included: true,
              weight: 100,
            },
          ],
        }),
      },
      teacherA,
    );
    expect(foreignAssignment.status).toBe(400);

    const readOtherClass = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/gradebook`,
      {},
      teacherB,
    );
    expect(readOtherClass.status).toBe(404);

    const updateOtherClass = await fetchApi(
      `/api/v1/teacher/class-sections/${CLASS_A}/gradebook/config`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assignments: [] }),
      },
      teacherB,
    );
    expect(updateOtherClass.status).toBe(404);
  });
});
