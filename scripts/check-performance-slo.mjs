const now = Date.now();
const windows = [
  { from: new Date(now - 30 * 60_000), to: new Date(now - 15 * 60_000) },
  { from: new Date(now - 15 * 60_000), to: new Date(now) },
];

let data = null;
let needsSynthetic = false;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();

if (supabaseUrl && supabaseSecretKey) {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await supabase
    .from("performance_samples")
    .select("route_template, metric, duration_ms, created_at")
    .gte("created_at", windows[0].from.toISOString())
    .lt("created_at", windows[1].to.toISOString());
  if (result.error) throw result.error;
  data = result.data;
} else {
  console.warn(
    "WARN Supabase telemetry is unavailable; configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY to query performance samples",
  );
  needsSynthetic = true;
}

const thresholds = {
  "/admin/classes": 1500,
  "/admin/settings": 1500,
  "/class/[code]/profile": 1500,
  "/class/[code]/grades": 1500,
  "/class/[code]/notifications": 1500,
  "/": 1500,
};

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)];
}

const exceededByWindow = [];
for (const window of windows) {
  const rows = (data ?? []).filter((row) => {
    const time = new Date(row.created_at);
    return time >= window.from && time < window.to;
  });
  if (rows.length < 30) {
    console.warn(`WARN insufficient performance samples: ${rows.length}`);
    exceededByWindow.push(new Set());
    needsSynthetic = true;
    continue;
  }
  const exceeded = new Set();
  for (const route of Object.keys(thresholds)) {
    const values = rows
      .filter(
        (row) =>
          row.route_template === route && row.metric === "route_navigation",
      )
      .map((row) => Number(row.duration_ms));
    const p95 = percentile(values, 0.95);
    if (p95 !== null && p95 > thresholds[route]) {
      exceeded.add(route);
      console.error(
        `SLO exceeded route=${route} p95=${p95}ms threshold=${thresholds[route]}ms`,
      );
    }
  }
  exceededByWindow.push(exceeded);
}

if (needsSynthetic) {
  const syntheticUrl = process.env.SYNTHETIC_MONITOR_URL;
  if (!syntheticUrl) {
    console.warn(
      "WARN SYNTHETIC_MONITOR_URL is not configured; sample-based SLO check was not used",
    );
    console.error(
      "Performance SLO check cannot run without Supabase telemetry credentials or SYNTHETIC_MONITOR_URL",
    );
    process.exitCode = 1;
  } else {
    try {
      const response = await fetch(syntheticUrl, {
        headers: { "user-agent": "minback-performance-synthetic/1" },
      });
      if (!response.ok) {
        console.error(`Synthetic monitor failed: HTTP ${response.status}`);
        process.exitCode = 1;
      } else {
        console.log(`Synthetic monitor passed: ${syntheticUrl}`);
      }
    } catch (cause) {
      console.error(
        `Synthetic monitor failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
      process.exitCode = 1;
    }
  }
}

const alertRoutes = [...exceededByWindow[0]].filter((route) =>
  exceededByWindow[1].has(route),
);
if (alertRoutes.length > 0) {
  console.error(
    `SLO alert requires two consecutive windows: ${alertRoutes.join(", ")}`,
  );
  process.exitCode = 1;
}
