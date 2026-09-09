import { describe, expect, it, vi } from "vitest";
import {
  MAX_EVALUATION_IMPORT_FILE_BYTES,
  normalizeHeaderKey,
  parseCsvRecords,
  parseEvaluationCsv,
  resolveEvaluationColumns,
  getCellString,
} from "./evaluation-file-parser";

describe("Evaluation File Parser", () => {
  describe("normalizeHeaderKey", () => {
    it("strips accents and special characters and lowercases", () => {
      expect(normalizeHeaderKey("Điểm Số")).toBe("diemso");
      expect(normalizeHeaderKey("Đánh Giá")).toBe("danhgia");
      expect(normalizeHeaderKey("Họ và Tên")).toBe("hovaten");
      expect(normalizeHeaderKey("Mã Sinh Viên (MSSV)")).toBe("masinhvienmssv");
    });
  });

  describe("resolveEvaluationColumns", () => {
    it("maps 4 standard columns accurately", () => {
      const result = resolveEvaluationColumns([
        "MSSV",
        "Họ và tên",
        "Điểm",
        "Nhận xét",
      ]);
      expect(result).toEqual({
        mssvIndex: 0,
        nameIndex: 1,
        scoreIndex: 2,
        feedbackIndex: 3,
      });
    });

    it("throws when required column is missing", () => {
      expect(() =>
        resolveEvaluationColumns(["MSSV", "Họ và tên", "Điểm"]),
      ).toThrow("Tệp phải có đủ 4 cột bắt buộc");
    });

    it("throws when duplicate semantic columns exist", () => {
      expect(() =>
        resolveEvaluationColumns([
          "MSSV",
          "Họ tên",
          "Điểm",
          "Score",
          "Nhận xét",
        ]),
      ).toThrow("Tệp không được có tiêu đề semantic bị trùng.");
    });
  });

  describe("parseCsvRecords & parseEvaluationCsv", () => {
    it("parses rows with quotes and commas", () => {
      const csv = 'MSSV,Họ tên,Điểm,Feedback\n2011001,"Nguyễn, An",8.5,"Bài làm tốt, rõ ràng"';
      const rows = parseEvaluationCsv(csv);
      expect(rows).toHaveLength(2);
      expect(rows[0].cells).toEqual(["MSSV", "Họ tên", "Điểm", "Feedback"]);
      expect(rows[1].cells).toEqual(["2011001", "Nguyễn, An", "8.5", "Bài làm tốt, rõ ràng"]);
    });

    it("throws error for unmatched quotes", () => {
      expect(() => parseCsvRecords('2011001,"Unclosed')).toThrow(
        "Tệp CSV có dấu nháy không hợp lệ",
      );
    });
  });

  describe("getCellString", () => {
    it("handles primitives, objects, richText and null", () => {
      expect(getCellString(null)).toBe("");
      expect(getCellString(undefined)).toBe("");
      expect(getCellString(10)).toBe("10");
      expect(getCellString("  hello ")).toBe("hello");
      expect(getCellString({ result: 9.5 })).toBe("9.5");
      expect(
        getCellString({ richText: [{ text: "Hello " }, { text: "World" }] }),
      ).toBe("Hello World");
    });
  });
});
