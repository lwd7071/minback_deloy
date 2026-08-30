#!/usr/bin/env node
// scripts/test-setup.mjs
// Reset DB → apply seed → verify demo accounts login via Supabase Auth API.
// Usage: npm run test:setup   (or: node scripts/test-setup.mjs)

import { execSync } from "node:child_process";

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
// Helpers
// ---------------------------------------------------------------------------

/** Run a shell command, return true on success. On failure print stderr only. */
function run(label, cmd) {
  try {
    execSync(cmd, { stdio: ["pipe", "pipe", "pipe"], cwd: process.cwd() });
    return true;
  } catch (err) {
    const stderr = err.stderr?.toString().trim();
    console.error(`  ✗ ${label}: ${stderr || err.message}`);
    return false;
  }
}

/** Try to login via GoTrue password grant. */
async function verifyAuth(account) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });

  if (res.ok) return { ok: true };

  const body = await res.json().catch(() => ({}));
  return { ok: false, status: res.status, message: body.error_description || body.msg || "unknown" };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const results = [];
  let hasError = false;

  // 1. DB reset (includes migration + seed)
  process.stdout.write("DB reset … ");
  const dbOk = run("DB reset", "npx supabase db reset");
  results.push(`DB reset: ${dbOk ? "OK" : "FAIL"}`);
  if (!dbOk) hasError = true;

  // 2. Verify auth for each account
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
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
