import { beforeEach, describe, expect, it } from "vitest";

import { CookieJar, fetchApi } from "./setup";

const LOGIN_PATH = "/api/v1/teacher/auth/login";
const SUMMARY_PATH = "/api/v1/teacher/class-section-summaries";

async function loginAsTeacher(jar: CookieJar): Promise<void> {
  const response = await fetchApi(
    LOGIN_PATH,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "teacher-a@minback.local",
        password: "DemoTeacherA123!",
      }),
    },
    jar,
  );
  expect(response.status).toBe(200);
}

describe("Teacher class-section summaries API", () => {
  let jar: CookieJar;

  beforeEach(async () => {
    jar = new CookieJar();
    await loginAsTeacher(jar);
  });

  it("rejects unauthenticated requests", async () => {
    const response = await fetchApi(SUMMARY_PATH, { method: "GET" });
    expect(response.status).toBe(401);
  });

  it.each(["progress=almost_done", "sort=random"])(
    "rejects invalid query %s",
    async (query) => {
      const response = await fetchApi(
        `${SUMMARY_PATH}?${query}`,
        { method: "GET" },
        jar,
      );
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    },
  );

  it("returns Teacher-scoped rows and search-scoped filter counts", async () => {
    const response = await fetchApi(
      `${SUMMARY_PATH}?q=DEMO_A&progress=urgent&sort=progress_asc`,
      { method: "GET" },
      jar,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].code).toBe("DEMO_A");
    expect(body.meta).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
      filterCounts: { all: 1, urgent: 1, good: 0, complete: 0 },
    });
  });

  it("keeps the legacy search alias", async () => {
    const response = await fetchApi(
      `${SUMMARY_PATH}?search=DEMO_A`,
      { method: "GET" },
      jar,
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data[0].code).toBe("DEMO_A");
  });
});
