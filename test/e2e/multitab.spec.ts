import { expect, test } from "@playwright/test";

test("notification leader election is available for an authenticated student session", async ({
  browser,
}) => {
  test.skip(
    !process.env.E2E_STUDENT_CLASS_CODE ||
      !process.env.E2E_STUDENT_MSSV ||
      !process.env.E2E_STUDENT_PIN,
    "Set E2E_STUDENT_CLASS_CODE, E2E_STUDENT_MSSV and E2E_STUDENT_PIN for the local multi-tab flow",
  );

  const context = await browser.newContext();
  const first = await context.newPage();
  const second = await context.newPage();
  const notificationRequests: string[] = [];
  for (const page of [first, second]) {
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/student/notifications")) {
        notificationRequests.push(request.url());
      }
    });
  }

  const classPath = `/class/${encodeURIComponent(process.env.E2E_STUDENT_CLASS_CODE!)}`;
  await first.goto(classPath, { waitUntil: "networkidle" });
  await first
    .locator("#student-identifier")
    .fill(process.env.E2E_STUDENT_MSSV!);
  await first
    .locator('input[aria-label^="Chữ số PIN"]')
    .first()
    .fill(process.env.E2E_STUDENT_PIN![0]);
  for (const [index, digit] of [...process.env.E2E_STUDENT_PIN!].entries()) {
    await first
      .locator(`input[aria-label="Chữ số PIN ${index + 1}"]`)
      .fill(digit);
  }
  await first.getByRole("button", { name: "Đăng nhập" }).click();
  await first.waitForURL(/\/class\/[^/]+\/(profile|onboarding)/);

  await first.goto(`${classPath}/notifications`, { waitUntil: "networkidle" });
  await second.goto(`${classPath}/notifications`, { waitUntil: "networkidle" });
  await second.waitForTimeout(11_000);
  expect(notificationRequests.length).toBeLessThanOrEqual(3);
  await context.close();
});
