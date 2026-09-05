import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MAX_EVALUATION_IMPORT_FILE_BYTES,
  normalizeHeaderKey,
  parseEvaluationCsv,
  resolveEvaluationColumns,
} from "./evaluation-import-service";

describe("Evaluation Import Service", () => {
  it("normalizes Vietnamese headers", () => {
    expect(normalizeHeaderKey("Điểm")).toBe("diem");
    expect(normalizeHeaderKey("Nhận xét")).toBe("nhanxet");
    expect(normalizeHeaderKey("MSSV")).toBe("mssv");
  });

  it("parses quoted CSV records", () => {
    const rows = parseEvaluationCsv(
      [
        "MSSV,Họ Tên,Điểm,Nhận xét",
        '22110001,Nguyễn Văn An,9.5,"Tốt, tiếp tục"',
      ].join("\n"),
    );
    expect(rows).toHaveLength(2);
    expect(rows[1].cells[3]).toBe("Tốt, tiếp tục");
  });

  it("keeps the five megabyte limit", () => {
    expect(MAX_EVALUATION_IMPORT_FILE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("requires four semantic columns and rejects duplicates", () => {
    expect(
      resolveEvaluationColumns(["MSSV", "Họ tên", "Điểm", "Feedback"]),
    ).toEqual({ mssvIndex: 0, nameIndex: 1, scoreIndex: 2, feedbackIndex: 3 });
    expect(() => resolveEvaluationColumns(["MSSV", "Điểm"])).toThrow();
    expect(() =>
      resolveEvaluationColumns(["MSSV", "Họ tên", "Điểm", "Feedback", "Score"]),
    ).toThrow();
  });
});
