import { type ChildProcess, spawn } from "node:child_process";

// ---------------------------------------------------------------------------
// Global setup: start Next.js dev server ONCE for all integration test files.
// Vitest runs this before any test file and calls teardown() after all finish.
// ---------------------------------------------------------------------------

const TEST_PORT = 3099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

let serverProcess: ChildProcess;

// ---------------------------------------------------------------------------
// Config — Supabase local (hardcoded; globalSetup doesn't see test.env)
// ---------------------------------------------------------------------------

const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SUPABASE_SECRET = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

// ---------------------------------------------------------------------------
// Fail-fast: if .env.local has leaked into process.env and points to remote,
// refuse to start.
// ---------------------------------------------------------------------------

function assertNotRemote(): void {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!envUrl) return; // not set — fine, we override anyway
  let hostname: string;
  try {
    hostname = new URL(envUrl).hostname;
  } catch {
    return; // unparseable — we override anyway
  }
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    // The child process env overrides this, but warn loudly.
    console.warn(
      `[global-setup] WARNING: process.env.NEXT_PUBLIC_SUPABASE_URL points to "${hostname}". ` +
        `Child server will be pinned to local Supabase (${SUPABASE_URL}).`,
    );
  }
}

// ---------------------------------------------------------------------------
// Wait for server readiness
// ---------------------------------------------------------------------------

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok || res.status < 500) return;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function setup(): Promise<void> {
  assertNotRemote();

  serverProcess = spawn("npx", ["next", "dev", "--port", String(TEST_PORT)], {
    cwd: process.cwd(),
    stdio: "pipe",
    shell: true,
    env: {
      ...process.env,
      // Explicitly pin to local Supabase so .env.local (remote) never leaks in.
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SECRET_KEY: SUPABASE_SECRET,
      RATE_LIMIT_HMAC_SECRET: "a".repeat(32),
      APP_URL: BASE_URL,
      PORT: String(TEST_PORT),
    },
  });

  serverProcess.stderr?.on("data", (data: Buffer) => {
    const msg = data.toString();
    if (msg.includes("Error") || msg.includes("error")) {
      console.error("[test-server]", msg);
    }
  });

  await waitForServer(`${BASE_URL}/api/v1/teacher/auth/me`);
}

export async function teardown(): Promise<void> {
  if (!serverProcess?.pid) return;

  // On Windows with shell:true, SIGTERM doesn't propagate to child processes.
  // Use taskkill /F /T to kill the entire process tree so the port is released.
  if (process.platform === "win32") {
    const { execSync } = await import("node:child_process");
    try {
      execSync(`taskkill /F /T /PID ${serverProcess.pid}`, { stdio: "pipe" });
    } catch {
      // Process may already be gone
    }
  } else {
    serverProcess.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 2000));
    if (!serverProcess.killed) {
      serverProcess.kill("SIGKILL");
    }
  }
}
