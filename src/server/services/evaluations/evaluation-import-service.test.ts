import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  MAX_EVALUATION_IMPORT_FILE_BYTES,
  normalizeHeaderKey,
  parseEvaluationCsv,
  resolveEvaluationColumns,
} from "./evaluation-import-service";

describe("Evaluation Import Service - normalizeHeaderKey", () => {
  it("normalizes Vietnamese headers with Đ/đ correctly to match English aliases", () => {
    expect(normalizeHeaderKey("Điểm")).toBe("diem");
    expect(normalizeHeaderKey("ĐIỂM")).toBe("diem");
    expect(normalizeHeaderKey("Điểm số")).toBe("diemso");
    expect(normalizeHeaderKey("Nhận xét")).toBe("nhanxet");
    expect(normalizeHeaderKey("Họ và Tên")).toBe("hovaten");
    expect(normalizeHeaderKey("MSSV")).toBe("mssv");
    expect(normalizeHeaderKey("Mã SV")).toBe("masv");
  });
});

describe("Evaluation Import Service - parseEvaluationCsv", () => {
  it("parses CSV with various headers and content correctly", () => {
    const csvContent = `MSSV,Họ Tên,Điểm,Nhận xét\n22110001,Nguyễn Văn An,9.5,Bài làm tốt\n22110002,Trần Thị Bình,8.0,"Cần cải thiện, chú ý cú pháp"`;
    const rows = parseEvaluationCsv(csvContent);

    expect(rows).toHaveLength(3);
    expect(rows[0].cells).toEqual(["MSSV", "Họ Tên", "Điểm", "Nhận xét"]);
    expect(rows[1].cells).toEqual(["22110001", "Nguyễn Văn An", "9.5", "Bài làm tốt"]);
    expect(rows[2].cells).toEqual([
      "22110002",
      "Trần Thị Bình",
      "8.0",
      "Cần cải thiện, chú ý cú pháp",
    ]);
  });

  it("handles CSV byte limits correctly", () => {
    expect(MAX_EVALUATION_IMPORT_FILE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("requires the four semantic columns", () => {
    expect(resolveEvaluationColumns(["MSSV", "Họ tên", "Điểm", "Feedback"])).toEqual({
      mssvIndex: 0,
      nameIndex: 1,
      scoreIndex: 2,
      feedbackIndex: 3,
    });
    expect(() => resolveEvaluationColumns(["MSSV", "Điểm"])).toThrow();
  });
});
