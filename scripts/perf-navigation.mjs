import { mkdir, writeFile } from "node:fs/promises";
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
const CLASS_ID = "f1000000-0000-0000-0000-000000000001";
const ITERATIONS = 20;

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
}

function run(command, args, env = LOCAL_ENV) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: process.cwd(), env, shell: false });
    let stderr = "";
    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => { stderr += chunk; process.stderr.write(chunk); });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}: ${stderr}`)));
  });
}

async function startServer() {
  const nextBin = "node_modules/next/dist/bin/next";
  await run(process.execPath, [nextBin, "build"]);
  const child = spawn(process.execPath, [nextBin, "start", "--port", String(PORT)], { cwd: process.cwd(), env: LOCAL_ENV, shell: false });
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
  if (process.platform === "win32") await run("taskkill", ["/F", "/T", "/PID", String(child.pid)], process.env).catch(() => undefined);
  else child.kill("SIGTERM");
}

async function login(context) {
  const response = await context.request.post(`${BASE_URL}/api/v1/teacher/auth/login`, {
    headers: { origin: BASE_URL },
    data: { email: "teacher-a@minback.local", password: "DemoTeacherA123!" },
  });
  if (!response.ok()) throw new Error(`Teacher login failed: ${response.status()} ${await response.text()}`);
}

async function navigate(page, href, expectedHeading) {
  const before = await page.evaluate(() => performance.now());
  await page.locator(`a[href="${href}"]`).first().click();
  await page.getByRole("heading", { name: expectedHeading }).waitFor({ state: "visible", timeout: 10_000 });
  const after = await page.evaluate(() => performance.now());
  return after - before;
}

const server = await startServer();
try {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const requests = [];
  context.on("response", async (response) => {
    const request = response.request();
    const type = request.resourceType();
    if (type === "document" || response.url().includes("_rsc") || response.url().includes("/api/")) {
      const length = Number(response.headers()["content-length"] ?? 0);
      requests.push({ type, url: response.url(), status: response.status(), bytes: length });
    }
  });
  await login(context);
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Tổng quan" }).waitFor();
  const coldNavigation = await page.evaluate(() => {
    const entry = performance.getEntriesByType("navigation")[0];
    return entry ? { durationMs: entry.duration, ttfbMs: entry.responseStart } : null;
  });
  const warmMs = [];
  for (let index = 0; index < ITERATIONS; index += 1) {
    warmMs.push(await navigate(page, "/admin/classes", "Lớp học phần"));
    warmMs.push(await navigate(page, "/admin/dashboard", "Tổng quan"));
  }
  const output = {
    generatedAt: new Date().toISOString(),
    environment: { baseUrl: BASE_URL, viewport: "mobile-390x844", iterations: ITERATIONS },
    coldDocument: coldNavigation,
    warmNavigation: {
      samples: warmMs.length,
      p50Ms: percentile(warmMs, 0.5),
      p75Ms: percentile(warmMs, 0.75),
      p95Ms: percentile(warmMs, 0.95),
    },
    network: {
      documentRequests: requests.filter((entry) => entry.type === "document").length,
      rscRequests: requests.filter((entry) => entry.url.includes("_rsc")).length,
      apiRequests: requests.filter((entry) => entry.url.includes("/api/")).length,
      transferredBytes: requests.reduce((sum, entry) => sum + entry.bytes, 0),
    },
  };
  await mkdir("performance/results", { recursive: true });
  await writeFile("performance/results/navigation-after.json", `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
  await browser.close();
} finally {
  await stopServer(server);
}
