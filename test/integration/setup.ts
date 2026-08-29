import { type ChildProcess, spawn } from "node:child_process";
import { afterAll, beforeAll } from "vitest";

const TEST_PORT = 3099;
export const BASE_URL = `http://localhost:${TEST_PORT}`;

let serverProcess: ChildProcess;

// ---------------------------------------------------------------------------
// Fail-fast: never hit a remote Supabase project
// ---------------------------------------------------------------------------

function assertLocalSupabase(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${url}". Integration tests require Supabase local.`,
    );
  }
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL points to "${hostname}". Integration tests MUST use Supabase local (localhost/127.0.0.1). Aborting to protect remote data.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Cookie jar helper
// ---------------------------------------------------------------------------

export class CookieJar {
  private cookies = new Map<string, string>();

  capture(response: Response): void {
    const setCookieHeaders = response.headers.getSetCookie();
    for (const header of setCookieHeaders) {
      const [pair] = header.split(";");
      const eqIdx = pair.indexOf("=");
      if (eqIdx > 0) {
        const name = pair.substring(0, eqIdx).trim();
        const value = pair.substring(eqIdx + 1).trim();
        if (value === "" || header.toLowerCase().includes("max-age=0")) {
          this.cookies.delete(name);
        } else {
          this.cookies.set(name, value);
        }
      }
    }
  }

  header(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  clear(): void {
    this.cookies.clear();
  }
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

export async function fetchApi(
  path: string,
  options: RequestInit = {},
  jar?: CookieJar,
): Promise<Response> {
  const headers = new Headers(options.headers);

  if (jar) {
    const cookieHeader = jar.header();
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }
  }

  // Default origin for CSRF
  if (!headers.has("origin") && (options.method === "POST" || options.method === "PUT" || options.method === "PATCH" || options.method === "DELETE")) {
    headers.set("origin", BASE_URL);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    redirect: "manual",
  });

  if (jar) {
    jar.capture(res);
  }

  return res;
}

// ---------------------------------------------------------------------------
// Server lifecycle
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

beforeAll(async () => {
  assertLocalSupabase();

  serverProcess = spawn("npx", ["next", "dev", "--port", String(TEST_PORT)], {
    cwd: process.cwd(),
    stdio: "pipe",
    shell: true,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
    },
  });

  serverProcess.stderr?.on("data", (data: Buffer) => {
    const msg = data.toString();
    // Only log actual errors, not Next.js compilation messages
    if (msg.includes("Error") || msg.includes("error")) {
      console.error("[test-server]", msg);
    }
  });

  await waitForServer(`${BASE_URL}/api/v1/teacher/auth/me`);
}, 60_000);

afterAll(async () => {
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
    // Wait a bit for graceful shutdown
    await new Promise((r) => setTimeout(r, 1000));
    if (!serverProcess.killed) {
      serverProcess.kill("SIGKILL");
    }
  }
});
