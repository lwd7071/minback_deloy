import { readFile } from "node:fs/promises";

const beforePath =
  process.argv[2] ?? "performance/baselines/navigation-before.json";
const afterPath =
  process.argv[3] ?? "performance/results/navigation-after.json";
const before = JSON.parse(await readFile(beforePath, "utf8"));
const after = JSON.parse(await readFile(afterPath, "utf8"));
const directions = ["classesToSettings", "settingsToClasses"];
const rows = directions.map((direction) => {
  const beforeP75 = before.warmNavigation?.[direction]?.p75Ms;
  const afterP75 = after.warmNavigation?.[direction]?.p75Ms;
  if (!Number.isFinite(beforeP75) || !Number.isFinite(afterP75))
    throw new Error(`Missing warmNavigation.${direction}.p75Ms`);
  const delta = ((afterP75 - beforeP75) / beforeP75) * 100;
  return {
    metric: `${direction} p75 (ms)`,
    before: beforeP75,
    after: afterP75,
    deltaPercent: Number(delta.toFixed(2)),
  };
});

console.table(rows);
if (
  rows.some((row) => row.after > 150 || row.deltaPercent > 5) ||
  after.warmNavigation?.wrongLoadingCount !== 0
) {
  process.exitCode = 1;
}
