import { describe, expect, it } from "vitest";
import pkg from "exceljs";
import { buildEvaluationTemplateWorkbook } from "./evaluation-template-generator";

const { Workbook } = pkg;

describe("Evaluation Template Generator", () => {
  it("tạo file mẫu gồm 2 sheet: BangDiem và HuongDan, cột tiêu chí và công thức", async () => {
    const students = [
      { mssv: "2011001", fullName: "Nguyễn Văn A" },
      { mssv: "2011002", fullName: "Trần Thị B" },
    ];

    const { buffer, fileName } = await buildEvaluationTemplateWorkbook(
      "Bài Tập Giữa Kỳ 1",
      students,
    );

    expect(fileName).toBe("bang-diem-bai-tap-giua-ky-1.xlsx");
    expect(buffer).toBeInstanceOf(Buffer);

    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as never);

    expect(workbook.worksheets.map((s) => s.name)).toEqual([
      "BangDiem",
      "HuongDan",
    ]);

    const sheet1 = workbook.getWorksheet("BangDiem")!;
    expect(sheet1.rowCount).toBe(3); // 1 header + 2 student rows

    const header = sheet1.getRow(1);
    expect(header.getCell(1).value).toBe("MSSV");
    expect(header.getCell(2).value).toBe("Họ tên");
    expect(header.getCell(3).value).toBe("Tiêu chí 1 (20%)");
    expect(header.getCell(4).value).toBe("Tiêu chí 2 (30%)");
    expect(header.getCell(5).value).toBe("Tiêu chí 3 (50%)");
    expect(header.getCell(6).value).toBe("Tiêu chí 4");
    expect(header.getCell(12).value).toBe("Tiêu chí 10");
    expect(header.getCell(13).value).toBe("Điểm");
    expect(header.getCell(14).value).toBe("Feedback");

    // Kiểm tra công thức ở cột Điểm (cột 13 / M)
    const row2ScoreCell = sheet1.getRow(2).getCell(13);
    const scoreVal = row2ScoreCell.value as { formula?: string };
    expect(scoreVal?.formula || row2ScoreCell.formula).toContain("C2*20%");
    expect(scoreVal?.formula || row2ScoreCell.formula).toContain("D2*30%");
    expect(scoreVal?.formula || row2ScoreCell.formula).toContain("E2*50%");

    // Sheet Hướng Dẫn
    const sheet2 = workbook.getWorksheet("HuongDan")!;
    expect(sheet2.rowCount).toBeGreaterThanOrEqual(4);
  });

  it("cung cấp dòng dữ liệu mẫu sinh viên và điểm khi danh sách sinh viên rỗng", async () => {
    const { buffer, fileName } = await buildEvaluationTemplateWorkbook(
      "Bài Mới",
      [],
    );

    expect(fileName).toBe("bang-diem-bai-moi.xlsx");

    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet1 = workbook.getWorksheet("BangDiem")!;

    // Có ít nhất 2 dòng mẫu
    expect(sheet1.rowCount).toBeGreaterThanOrEqual(3);
    const row2 = sheet1.getRow(2);
    expect(String(row2.getCell(1).value)).toMatch(/^\d+$/);
    expect(row2.getCell(2).value).toBeTruthy();
    // Dòng mẫu có điểm tiêu chí
    expect(row2.getCell(3).value).toBe(8.5);
  });
});
