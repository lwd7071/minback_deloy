type SafeError = { code?: unknown };

function safeErrorCode(error: unknown): string {
  if (error && typeof error === "object") {
    const code = (error as SafeError).code;
    if (typeof code === "string" && /^[A-Z0-9_:-]{1,64}$/.test(code)) {
      return code;
    }
  }
  return "UNEXPECTED_ERROR";
}

/** Measures server-side data operations without logging identifiers or payloads. */
export async function withServerTiming<T>(
  routeTemplate: string,
  operation: () => PromiseLike<T>,
  rowCount?: (result: T) => number | undefined,
): Promise<T> {
  const startedAt = process.hrtime.bigint();
  try {
    const result = await operation();
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const payload = {
      event: "minback.server_timing",
      routeTemplate,
      durationMs: Math.round(durationMs * 100) / 100,
      rowCount: rowCount?.(result) ?? null,
      errorCode: null,
    };
    (durationMs >= 200 ? console.warn : console.info)(JSON.stringify(payload));
    return result;
  } catch (error) {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.warn(
      JSON.stringify({
        event: "minback.server_timing",
        routeTemplate,
        durationMs: Math.round(durationMs * 100) / 100,
        rowCount: null,
        errorCode: safeErrorCode(error),
      }),
    );
    throw error;
  }
}
