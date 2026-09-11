import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  deferBackgroundTask,
  runWithConcurrencyLimit,
} from "./async-task-runner";

describe("async-task-runner", () => {
  describe("runWithConcurrencyLimit", () => {
    it("handles empty items array gracefully", async () => {
      const results = await runWithConcurrencyLimit([], 5, async (x) => x);
      expect(results).toEqual([]);
    });

    it("respects the concurrency limit and maintains result order", async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      let activeCount = 0;
      let maxSeenActive = 0;

      const results = await runWithConcurrencyLimit(items, 3, async (val) => {
        activeCount++;
        if (activeCount > maxSeenActive) {
          maxSeenActive = activeCount;
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
        activeCount--;
        return val * 2;
      });

      expect(maxSeenActive).toBeLessThanOrEqual(3);
      expect(results).toHaveLength(10);
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);
      expect(
        results.map((r) => (r.status === "fulfilled" ? r.value : null)),
      ).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    });

    it("captures rejections without aborting other tasks", async () => {
      const items = ["a", "fail", "b"];
      const results = await runWithConcurrencyLimit(items, 2, async (item) => {
        if (item === "fail") {
          throw new Error("task failed");
        }
        return item.toUpperCase();
      });

      expect(results[0]).toEqual({ status: "fulfilled", value: "A" });
      expect(results[1].status).toBe("rejected");
      expect(results[2]).toEqual({ status: "fulfilled", value: "B" });
    });
  });

  describe("deferBackgroundTask", () => {
    it("falls back to microtask when called outside request scope", async () => {
      let executed = false;
      deferBackgroundTask(() => {
        executed = true;
      });

      // Chờ microtask hoàn thành
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(executed).toBe(true);
    });
  });
});
