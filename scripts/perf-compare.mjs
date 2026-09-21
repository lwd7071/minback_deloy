import { readFile } from "node:fs/promises";

const beforePath =
  process.argv[2] ?? "performance/baselines/navigation-before.json";
const afterPath =
  process.argv[3] ?? "performance/results/navigation-after.json";
const before = JSON.parse(await readFile(beforePath, "utf8"));
const after = JSON.parse(await readFile(afterPath, "utf8"));
const directions = ["classesToSettings", "settingsToClasses"];
const percentiles = ["p75", "p95"];

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function summaryFor(result, direction, percentile) {
  const batches = Array.isArray(result.batches) ? result.batches : [];
  if (batches.length === 0) return undefined;
  const values = batches.map(
    (batch) => batch.warmNavigation?.[direction]?.[`${percentile}Ms`],
  );
  return values.every(Number.isFinite) ? median(values) : undefined;
}

function legacySummaryFor(result, direction, percentile) {
  return result.warmNavigation?.[direction]?.[`${percentile}Ms`];
}

const rows = directions.flatMap((direction) =>
  percentiles.map((percentile) => {
    const beforeValue =
      summaryFor(before, direction, percentile) ??
      legacySummaryFor(before, direction, percentile);
    const afterValue =
      summaryFor(after, direction, percentile) ??
      legacySummaryFor(after, direction, percentile);
    if (!Number.isFinite(beforeValue) || !Number.isFinite(afterValue)) {
      throw new Error(`Missing warmNavigation.${direction}.${percentile}Ms`);
    }
    const delta = ((afterValue - beforeValue) / beforeValue) * 100;
    return {
      metric: `${direction} ${percentile} (ms)`,
      before: beforeValue,
      after: afterValue,
      deltaPercent: Number(delta.toFixed(2)),
    };
  }),
);

console.table(rows);
const budgetByPercentile = { p75: 250, p95: 500 };
const slowRoute = process.argv.includes("--slow-4g");
const maxBudget = slowRoute ? { p75: 1000, p95: 1500 } : budgetByPercentile;
const failedRequests = (after.batches ?? []).flatMap((batch) =>
  (batch.network ?? []).filter((request) => request.status >= 400),
);
const wrongLoadingCount = (after.batches ?? []).reduce(
  (total, batch) => total + (batch.warmNavigation?.wrongLoadingCount ?? 0),
  0,
);
const hasRegression = rows.some(
  (row) =>
    row.after > maxBudget[row.metric.split(" ").at(-2)] || row.deltaPercent > 5,
);
const hasInsufficientImprovement =
  slowRoute &&
  rows.some((row) => {
    const beforeValue = row.before;
    return (
      beforeValue > maxBudget[row.metric.split(" ").at(-2)] &&
      row.deltaPercent > -30
    );
  });

if (
  hasRegression ||
  hasInsufficientImprovement ||
  wrongLoadingCount !== 0 ||
  failedRequests.length > 0
) {
  if (failedRequests.length > 0)
    console.error(
      `Benchmark captured ${failedRequests.length} failed request(s)`,
    );
  process.exitCode = 1;
}
