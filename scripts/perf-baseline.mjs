import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SUPABASE_SECRET_KEY = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

const teacher = {
  email: "teacher-a@minback.local",
  password: "DemoTeacherA123!",
};
const cookies = new Map();
let classSectionId;
let studentId;
let studentSessionId;
let serverProcess;

function headers(extra = {}) {
  return {
    apikey: SUPABASE_SECRET_KEY,
    authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    ...extra,
  };
}

function captureCookies(response) {
  for (const header of response.headers.getSetCookie()) {
    const [pair] = header.split(";");
    const index = pair.indexOf("=");
    if (index > 0) cookies.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

async function api(path, options = {}) {
  const requestHeaders = new Headers(options.headers);
  const cookie = [...cookies.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  if (cookie) requestHeaders.set("cookie", cookie);
  if (["POST", "PUT", "PATCH", "DELETE"].includes(options.method)) {
    requestHeaders.set("origin", BASE_URL);
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: requestHeaders,
  });
  captureCookies(response);
  return response;
}

async function timed(name, operation) {
  const startedAt = performance.now();
  const response = await operation();
  const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
  if (!response.ok)
    throw new Error(
      `${name} failed with ${response.status}: ${await response.text()}`,
    );
  return { durationMs, response };
}

async function cleanup() {
  if (studentSessionId) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/student_sessions?id=eq.${studentSessionId}`,
      {
        method: "DELETE",
        headers: headers(),
      },
    );
  }
  if (classSectionId) {
    await fetch(
      `${SUPABASE_URL}/rest/v1/students?class_section_id=eq.${classSectionId}`,
      {
        method: "DELETE",
        headers: headers(),
      },
    );
    await fetch(
      `${SUPABASE_URL}/rest/v1/assignments?class_section_id=eq.${classSectionId}`,
      {
        method: "DELETE",
        headers: headers(),
      },
    );
    await fetch(
      `${SUPABASE_URL}/rest/v1/class_sections?id=eq.${classSectionId}`,
      {
        method: "DELETE",
        headers: headers(),
      },
    );
  }
}

async function startLocalServer() {
  serverProcess = spawn("npx", ["next", "dev", "--port", String(PORT)], {
    cwd: process.cwd(),
    stdio: "pipe",
    shell: true,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SECRET_KEY,
      RATE_LIMIT_HMAC_SECRET: "a".repeat(32),
      APP_URL: BASE_URL,
      PORT: String(PORT),
    },
  });
  serverProcess.stderr?.on("data", (data) => process.stderr.write(data));
  serverProcess.stdout?.on("data", (data) => process.stderr.write(data));

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/teacher/auth/me`);
      if (response.status < 500) return;
    } catch {
      // The isolated benchmark server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Benchmark server did not start within 30 seconds");
}

async function stopLocalServer() {
  if (!serverProcess?.pid) return;
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const taskkill = spawn(
        "taskkill",
        ["/F", "/T", "/PID", String(serverProcess.pid)],
        { stdio: "ignore" },
      );
      taskkill.once("close", resolve);
      taskkill.once("error", resolve);
    });
    return;
  }
  serverProcess.kill("SIGTERM");
}

try {
  await startLocalServer();
  const login = await api("/api/v1/teacher/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(teacher),
  });
  if (!login.ok) throw new Error(`Teacher login failed with ${login.status}`);

  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const createClass = await api("/api/v1/teacher/class-sections", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code: `PF${suffix}`,
      name: "A6 Performance Fixture",
    }),
  });
  if (!createClass.ok)
    throw new Error(`ClassSection create failed with ${createClass.status}`);
  classSectionId = (await createClass.json()).data.id;

  const csv = ["MSSV,Họ Tên,Email"];
  for (let index = 1; index <= 2000; index += 1) {
    csv.push(
      `A6${suffix}${String(index).padStart(4, "0")},A6 Student ${index},a6-${suffix}-${index}@example.test`,
    );
  }
  const form = new FormData();
  form.set(
    "file",
    new File([csv.join("\n")], "a6-2000.csv", { type: "text/csv" }),
  );
  const imported = await timed("import_2000_rows", () =>
    api(`/api/v1/teacher/class-sections/${classSectionId}/import`, {
      method: "POST",
      body: form,
    }),
  );
  const importBody = await imported.response.json();
  if (importBody.data.summary.created !== 2000)
    throw new Error("Import did not create 2,000 Students");
  studentId = importBody.data.rows[0].studentId;

  const classList = await timed("class_section_page", () =>
    api("/api/v1/teacher/class-sections?page=1&pageSize=20"),
  );
  await classList.response.arrayBuffer();

  const createAssignment = await api(
    `/api/v1/teacher/class-sections/${classSectionId}/assignments`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: "A6 Performance Assignment",
        description: "Synthetic benchmark fixture",
        assignedDate: "2026-09-01",
        dueDate: "2026-09-30",
        status: "published",
        maxScore: 10,
      }),
    },
  );
  if (!createAssignment.ok)
    throw new Error(`Assignment create failed with ${createAssignment.status}`);
  const assignmentId = (await createAssignment.json()).data.id;

  const assignmentList = await timed("assignment_list", () =>
    api(`/api/v1/teacher/class-sections/${classSectionId}/assignments`),
  );
  await assignmentList.response.arrayBuffer();
  const evaluationList = await timed("evaluation_list", () =>
    api(`/api/v1/teacher/assignments/${assignmentId}/evaluations`),
  );
  await evaluationList.response.arrayBuffer();

  const profileToken = randomUUID();
  const sessionResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/student_sessions`,
    {
      method: "POST",
      headers: headers({
        "content-type": "application/json",
        prefer: "return=representation",
      }),
      body: JSON.stringify({
        student_id: studentId,
        token_hash: (await import("node:crypto"))
          .createHash("sha256")
          .update(profileToken)
          .digest("hex"),
        access_level: "full",
        last_activity_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    },
  );
  if (!sessionResponse.ok)
    throw new Error(
      `Profile session create failed with ${sessionResponse.status}`,
    );
  studentSessionId = (await sessionResponse.json())[0].id;
  const profile = await timed("student_profile", () =>
    fetch(`${BASE_URL}/api/v1/student/profile`, {
      headers: { cookie: `minback_student_session=${profileToken}` },
    }),
  );
  await profile.response.arrayBuffer();

  console.log(
    JSON.stringify(
      {
        environment: { baseUrl: BASE_URL, rows: 2000 },
        metrics: {
          import2000RowsMs: imported.durationMs,
          classSectionPageMs: classList.durationMs,
          assignmentListMs: assignmentList.durationMs,
          evaluationListMs: evaluationList.durationMs,
          studentProfileMs: profile.durationMs,
        },
      },
      null,
      2,
    ),
  );
} finally {
  await cleanup();
  await stopLocalServer();
}
