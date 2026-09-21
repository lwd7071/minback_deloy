import { expect, test } from "@playwright/test";

test("admin entry does not prefetch class detail or unrelated routes", async ({
  page,
}) => {
  const urls: string[] = [];
  page.on("request", (request) => urls.push(request.url()));

  await page.goto("/admin/classes", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  const speculative = urls.filter((url) =>
    /\/admin\/classes\/[0-9a-f-]{20,}|\/admin\/settings|\/admin\/classes\/new/.test(
      url,
    ),
  );
  expect(speculative).toEqual([]);
});

test("intent prefetch is only armed after pointer intent", async ({ page }) => {
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  const link = page.locator("a[href]").first();
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  const beforeHover: string[] = [];
  page.on("request", (request) => beforeHover.push(request.url()));
  await page.waitForTimeout(250);
  expect(beforeHover.filter((url) => url.includes("?_rsc=")).length).toBe(0);

  await link.hover();
  await page.waitForTimeout(500);
  expect(
    beforeHover.some(
      (url) => url.includes(`${href}?_rsc=`) || url.endsWith(href!),
    ),
  ).toBe(true);
});
