import "server-only";

import { after } from "next/server";

/**
 * Thực thi một mảng các tác vụ bất đồng bộ với giới hạn số lượng worker chạy đồng thời.
 * Ngăn chặn việc làm cạn kiệt socket pool, CPU hoặc chạm ngưỡng Rate Limit (HTTP 429) của các bên thứ ba (như Brevo, Supabase).
 *
 * @param items Mảng dữ liệu đầu vào
 * @param limit Số lượng tác vụ tối đa được thực thi đồng thời (ví dụ: 5)
 * @param fn Hàm async xử lý cho từng phần tử
 * @returns Mảng kết quả dạng PromiseSettledResult theo đúng thứ tự ban đầu
 */
export async function runWithConcurrencyLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  if (items.length === 0) return [];

  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let currentIndex = 0;
  const concurrency = Math.max(1, Math.min(limit, items.length));

  const workers = Array.from({ length: concurrency }, async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      try {
        const value = await fn(items[index], index);
        results[index] = { status: "fulfilled", value };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Chuyển giao một tác vụ sang xử lý nền sau khi HTTP response đã được trả về cho client.
 *
 * Sử dụng hàm `after()` của Next.js để giữ execution context trong môi trường Serverless.
 * Nếu được gọi ngoài request scope (ví dụ trong Vitest unit test hoặc CLI script),
 * hàm sẽ tự động fallback an toàn sang microtask nền để không gây crash.
 *
 * @param task Hàm async hoặc sync thực hiện tác vụ nền
 */
export function deferBackgroundTask(task: () => Promise<void> | void): void {
  try {
    after(task);
  } catch {
    // Khi gọi ngoài request scope (Next.js ném lỗi E468 trong test runner), fallback sang microtask nền
    void Promise.resolve()
      .then(task)
      .catch((err) => {
        console.error(
          "[BackgroundTask] Lỗi khi thực thi ngoài request context:",
          err,
        );
      });
  }
}
