import { describe, expect, it } from "vitest";
import exceljs from "exceljs";
import { buildEvaluationExportWorkbook } from "./evaluation-export-generator";

const { Workbook } = exceljs;

describe("Evaluation Export Generator", () => {
  it("exports saved rubric scores and the full roster in an import-compatible sheet", async () => {
    const { buffer, fileName } = await buildEvaluationExportWorkbook(
      "Bài tập cuối kỳ",
      [
        { name: "Báo cáo", weight: 40 },
        { name: "Vấn đáp", weight: 60 },
      ],
      [
        {
          mssv: "001234",
          fullName: "Nguyễn An",
          evaluation: {
            score: 0,
            feedback: "Chưa đạt",
            criteriaScores: [
              { name: "Báo cáo", weight: 40, score: 0 },
              { name: "Vấn đáp", weight: 60, score: 0 },
            ],
          },
        },
        { mssv: "001235", fullName: "Trần Bình" },
      ],
    );

    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.getWorksheet("BangDiem");

    expect(fileName).toBe("BangDiem_Bài_tập_cuối_kỳ.xlsx");
    expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual([
      "BangDiem",
    ]);
    expect(sheet?.getRow(1).values).toEqual([
      ,
      "MSSV",
      "Họ tên",
      "Báo cáo (40%)",
      "Vấn đáp (60%)",
      "Điểm",
      "Feedback",
    ]);
    expect(sheet?.getRow(2).getCell(1).value).toBe("001234");
    expect(sheet?.getRow(2).getCell(3).value).toBe(0);
    expect(sheet?.getRow(2).getCell(4).value).toBe(0);
    expect(sheet?.getRow(2).getCell(5).value).toBe(0);
    expect(sheet?.getRow(2).getCell(5).type).not.toBe(6);
    expect(sheet?.getRow(3).getCell(1).value).toBe("001235");
    expect(sheet?.getRow(3).getCell(3).value).toBeNull();
    expect(sheet?.getRow(3).getCell(5).value).toBeNull();
    expect(sheet?.getRow(3).getCell(6).value).toBeNull();
  });
});
