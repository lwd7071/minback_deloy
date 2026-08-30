#!/usr/bin/env node
// scripts/test-health.mjs
// Quick health check: verify Supabase local is reachable and demo accounts
// can login — WITHOUT resetting the DB.
// Usage: npm run test:health   (or: node scripts/test-health.mjs)

// ---------------------------------------------------------------------------
// Config — Supabase local defaults
// ---------------------------------------------------------------------------
const SUPABASE_URL = "http://127.0.0.1:54321";
const SUPABASE_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

const ACCOUNTS = [
  { label: "teacher-a", email: "teacher-a@minback.local", password: "DemoTeacherA123!" },
  { label: "teacher-b", email: "teacher-b@minback.local", password: "DemoTeacherB123!" },
];

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

async function checkSupabase() {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      signal: AbortSignal.timeout(5000),
    });
    // GoTrue health returns 200 even without apikey
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function verifyAuth(account) {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify({ email: account.email, password: account.password }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => ({}));
    return { ok: false, status: res.status, message: body.error_description || body.msg || "unknown" };
  } catch (err) {
    return { ok: false, status: 0, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const results = [];
  let hasError = false;

  // 1. Supabase reachable
  process.stdout.write("Supabase local … ");
  const supaOk = await checkSupabase();
  results.push(`Supabase: ${supaOk ? "OK" : "FAIL"}`);
  if (!supaOk) {
    hasError = true;
    console.log("");
    console.log(results.join(" | "));
    console.error("\nSupabase local is not reachable. Run: npm run db:start");
    process.exit(1);
  }

  // 2. Auth checks
  for (const account of ACCOUNTS) {
    process.stdout.write(`Auth ${account.label} … `);
    const authResult = await verifyAuth(account);
    if (authResult.ok) {
      results.push(`Auth ${account.label}: OK`);
    } else {
      results.push(`Auth ${account.label}: FAIL (${authResult.status} ${authResult.message})`);
      hasError = true;
    }
  }

  // 3. Summary
  console.log("");
  console.log(results.join(" | "));

  if (hasError) {
    console.error("\nEnvironment not ready. Run: npm run test:setup");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
