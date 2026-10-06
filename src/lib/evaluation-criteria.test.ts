import { describe, expect, it } from "vitest";
import {
  computeTotal,
  extractCriteria,
  parseCriteriaHeader,
  validateWeights,
} from "./evaluation-criteria";

describe("parseCriteriaHeader", () => {
  it("đọc tên và trọng số từ tiêu đề có (xx%)", () => {
    expect(parseCriteriaHeader("Báo cáo (30%)")).toEqual({
      name: "Báo cáo",
      weight: 30,
    });
  });

  it("chấp nhận khoảng trắng và số thập phân", () => {
    expect(parseCriteriaHeader("Thuyết trình ( 30.5 % )")).toEqual({
      name: "Thuyết trình",
      weight: 30.5,
    });
  });

  it("bỏ qua cột không có % hợp lệ", () => {
    expect(parseCriteriaHeader("Tiêu chí 4")).toBeNull();
    expect(parseCriteriaHeader("A (abc%)")).toBeNull();
    expect(parseCriteriaHeader("A (0%)")).toBeNull();
    expect(parseCriteriaHeader("A (101%)")).toBeNull();
    expect(parseCriteriaHeader("(30%)")).toBeNull();
  });
});

describe("extractCriteria", () => {
  it("chỉ lấy cột có % trong khoảng giữa, giữ đúng thứ tự", () => {
    const headers = ["MSSV", "Họ tên", "A (40%)", "Ghi chú", "B (60%)", "Điểm"];
    expect(extractCriteria(headers, 2, 5)).toEqual({
      indexes: [2, 4],
      criteria: [
        { name: "A", weight: 40 },
        { name: "B", weight: 60 },
      ],
    });
  });

  it("trả rỗng khi không có cột %", () => {
    expect(extractCriteria(["MSSV", "Họ tên", "X", "Điểm"], 2, 3)).toEqual({
      indexes: [],
      criteria: [],
    });
  });
});

describe("validateWeights", () => {
  it("hợp lệ khi tổng bằng 100", () => {
    expect(
      validateWeights([
        { name: "A", weight: 40 },
        { name: "B", weight: 60 },
      ]),
    ).toBeNull();
  });

  it("cho phép sai số làm tròn 33.3 + 33.3 + 33.4", () => {
    expect(
      validateWeights([
        { name: "A", weight: 33.3 },
        { name: "B", weight: 33.3 },
        { name: "C", weight: 33.4 },
      ]),
    ).toBeNull();
  });

  it("báo lỗi khi tổng khác 100", () => {
    expect(validateWeights([{ name: "A", weight: 90 }])).toContain("100%");
    expect(
      validateWeights([
        { name: "A", weight: 60 },
        { name: "B", weight: 50 },
      ]),
    ).toContain("110");
  });

  it("báo lỗi khi tên tiêu chí bị trùng", () => {
    expect(
      validateWeights([
        { name: "A", weight: 50 },
        { name: "a", weight: 50 },
      ]),
    ).toContain("trùng");
  });
});

describe("computeTotal", () => {
  const scores = [
    { name: "A", weight: 20, score: 10 },
    { name: "B", weight: 30, score: 8 },
    { name: "C", weight: 50, score: 6 },
  ];

  it("tính tổng theo trọng số với thang 10", () => {
    expect(computeTotal(scores, 10)).toBe(7.4);
  });

  it("quy đổi theo maxScore", () => {
    expect(computeTotal(scores, 100)).toBe(74);
  });

  it("chỉ làm tròn ở bước cuối", () => {
    const s = [
      { name: "A", weight: 33.3, score: 7.7 },
      { name: "B", weight: 33.3, score: 7.7 },
      { name: "C", weight: 33.4, score: 7.7 },
    ];
    expect(computeTotal(s, 10)).toBe(7.7);
  });
});
