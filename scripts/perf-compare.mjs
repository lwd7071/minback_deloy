import { readFile } from "node:fs/promises";

const beforePath =
  process.argv[2] ?? "performance/baselines/navigation-before.json";
const afterPath =
  process.argv[3] ?? "performance/results/navigation-after.json";
const before = JSON.parse(await readFile(beforePath, "utf8"));
const after = JSON.parse(await readFile(afterPath, "utf8"));
const beforeP75 = before.warmNavigation?.p75Ms;
const afterP75 = after.warmNavigation?.p75Ms;
if (!Number.isFinite(beforeP75) || !Number.isFinite(afterP75))
  throw new Error("Missing warmNavigation.p75Ms");
const delta = ((afterP75 - beforeP75) / beforeP75) * 100;
console.table([
  {
    metric: "warm p75 navigation (ms)",
    before: beforeP75,
    after: afterP75,
    deltaPercent: Number(delta.toFixed(2)),
  },
]);
if (afterP75 > 150 || delta > 5) process.exitCode = 1;
