import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const PORT = 3102;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const LOCAL_ENV = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
  SUPABASE_SECRET_KEY: "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz",
  RATE_LIMIT_HMAC_SECRET: "a".repeat(32),
  APP_URL: BASE_URL,
  PORT: String(PORT),
};
const WARMUP_RUNS = 5;
const MEASURED_RUNS = 60;
const BATCHES = 3;
const slow4g = process.argv.includes("--slow-4g");
const outputIndex = process.argv.indexOf("--output");
const OUTPUT_PATH =
  outputIndex >= 0 && process.argv[outputIndex + 1]
    ? process.argv[outputIndex + 1]
    : "performance/results/navigation-after.json";

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
}

function run(command, args, env = LOCAL_ENV) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      shell: false,
    });
    let stderr = "";
    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      process.stderr.write(chunk);
    });
    child.once("error", reject);
    child.once("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} exited ${code}: ${stderr}`)),
    );
  });
}

async function startServer() {
  const nextBin = "node_modules/next/dist/bin/next";
  await run(process.execPath, [nextBin, "build"]);
  const child = spawn(
    process.execPath,
    [nextBin, "start", "--port", String(PORT)],
    { cwd: process.cwd(), env: LOCAL_ENV, shell: false },
  );
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/admin/login`);
      if (response.ok) return child;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  child.kill();
  throw new Error("Benchmark server did not become ready");
}

async function stopServer(child) {
  if (!child?.pid) return;
  if (process.platform === "win32")
    await run(
      "taskkill",
      ["/F", "/T", "/PID", String(child.pid)],
      process.env,
    ).catch(() => undefined);
  else child.kill("SIGTERM");
}

async function login(context) {
  const response = await context.request.post(
    `${BASE_URL}/api/v1/teacher/auth/login`,
    {
      headers: { origin: BASE_URL },
      data: { email: "teacher-a@minback.local", password: "DemoTeacherA123!" },
    },
  );
  if (!response.ok())
    throw new Error(
      `Teacher login failed: ${response.status()} ${await response.text()}`,
    );
}

async function navigate(page, href, expectedHeading, forbiddenSelector) {
  const before = await page.evaluate(() => performance.now());
  const link = page.locator(`a[href="${href}"]:visible`).first();
  await link.hover();
  await page.waitForTimeout(150);
  await link.click();
  const showedWrongLoading = forbiddenSelector
    ? await page
        .locator(forbiddenSelector)
        .isVisible()
        .catch(() => false)
    : false;
  await page
    .getByRole("heading", { name: expectedHeading })
    .waitFor({ state: "visible", timeout: 10_000 });
  const after = await page.evaluate(() => performance.now());
  return { durationMs: after - before, showedWrongLoading };
}

function summarize(values) {
  return {
    samples: values.length,
    p50Ms: percentile(values, 0.5),
    p75Ms: percentile(values, 0.75),
    p95Ms: percentile(values, 0.95),
  };
}

const server = await startServer();
try {
  const browser = await chromium.launch({ headless: true });
  const batches = [];
  for (let batch = 0; batch < BATCHES; batch += 1) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    const requests = [];
    const requestStartedAt = new Map();
    const failedRequests = [];
    context.on("request", (request) => {
      requestStartedAt.set(request, performance.now());
    });
    context.on("requestfailed", (request) => {
      failedRequests.push({
        type: request.resourceType(),
        url: request.url().replace(BASE_URL, ""),
        action: "navigation",
        error: request.failure()?.errorText ?? "requestfailed",
      });
    });
    context.on("response", async (response) => {
      const type = response.request().resourceType();
      if (
        type === "document" ||
        response.url().includes("_rsc") ||
        response.url().includes("/api/")
      ) {
        requests.push({
          type,
          url: response
            .url()
            .replace(BASE_URL, "")
            .replace(/&_rsc=[^&]+|\?_rsc=[^&]+/, ""),
          action: "navigation",
          status: response.status(),
          bytes: Number(response.headers()["content-length"] ?? 0),
          durationMs: requestStartedAt.has(response.request())
            ? performance.now() - requestStartedAt.get(response.request())
            : null,
        });
      }
    });
    if (slow4g) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: (1_600_000 / 8) * 1.25,
        uploadThroughput: (750_000 / 8) * 1.25,
      });
    }
    await login(context);
    await page.goto(`${BASE_URL}/admin/classes`, { waitUntil: "networkidle" });
    const coldNavigation = await page.evaluate(() => {
      const entry = performance.getEntriesByType("navigation")[0];
      return entry
        ? { durationMs: entry.duration, ttfbMs: entry.responseStart }
        : null;
    });
    const warmSamples = [];
    let wrongLoadingCount = 0;
    for (let index = 0; index < WARMUP_RUNS + MEASURED_RUNS; index += 1) {
      const toSettings = await navigate(
        page,
        "/admin/settings",
        "Thông báo",
        ".teacher-class-card.skeleton",
      );
      const toClasses = await navigate(page, "/admin/classes", "Lớp học");
      if (toSettings.showedWrongLoading) wrongLoadingCount += 1;
      if (index >= WARMUP_RUNS) {
        warmSamples.push({
          classesToSettingsMs: toSettings.durationMs,
          settingsToClassesMs: toClasses.durationMs,
        });
      }
    }
    const classesToSettings = warmSamples.map(
      (sample) => sample.classesToSettingsMs,
    );
    const settingsToClasses = warmSamples.map(
      (sample) => sample.settingsToClassesMs,
    );
    const coefficientOfVariation = (values) => {
      const mean =
        values.reduce((sum, value) => sum + value, 0) / values.length;
      const deviation = Math.sqrt(
        values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
          values.length,
      );
      return mean === 0 ? 0 : deviation / mean;
    };
    if (
      classesToSettings.length !== MEASURED_RUNS ||
      settingsToClasses.length !== MEASURED_RUNS ||
      coefficientOfVariation(classesToSettings) > 0.75 ||
      coefficientOfVariation(settingsToClasses) > 0.75
    ) {
      throw new Error("Benchmark samples are incomplete or too noisy");
    }
    batches.push({
      batch,
      coldNavigation,
      warmNavigation: {
        classesToSettings: summarize(classesToSettings),
        settingsToClasses: summarize(settingsToClasses),
        wrongLoadingCount,
      },
      network: requests,
      failedRequests,
    });
    await context.close();
  }
  const output = {
    generatedAt: new Date().toISOString(),
    environment: {
      baseUrl: BASE_URL,
      viewport: "desktop-1280x800",
      warmupRuns: WARMUP_RUNS,
      measuredRuns: MEASURED_RUNS,
      batches: BATCHES,
      networkProfile: slow4g ? "slow-4g-150ms-1.6Mbps-750Kbps" : "local",
    },
    batches,
  };
  const failedResponses = batches.flatMap((batch) =>
    batch.network.filter((request) => request.status >= 400),
  );
  const failedRequests = batches.flatMap((batch) => batch.failedRequests);
  if (failedResponses.length > 0 || failedRequests.length > 0) {
    throw new Error(
      `Benchmark captured ${failedResponses.length} HTTP errors and ${failedRequests.length} failed requests`,
    );
  }
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
  await browser.close();
} finally {
  await stopServer(server);
}
