import { describe, expect, it } from "vitest";
import pkg from "exceljs";
import { buildEvaluationTemplateWorkbook } from "./evaluation-template-generator";

const { Workbook } = pkg;

describe("Evaluation Template Generator", () => {
  it("generates a styled xlsx buffer with student list", async () => {
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
    expect(buffer.length).toBeGreaterThan(0);

    // Verify generated workbook structure
    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as never);
    const worksheet = workbook.worksheets[0];

    expect(worksheet.name).toBe("BangDiemNhanXet");
    expect(worksheet.rowCount).toBe(3); // 1 header + 2 student rows

    const headerRow = worksheet.getRow(1);
    expect(headerRow.getCell(1).value).toBe("MSSV");
    expect(headerRow.getCell(2).value).toBe("Họ tên");
    expect(headerRow.getCell(3).value).toBe("Điểm");
    expect(headerRow.getCell(4).value).toBe("Feedback");

    const row2 = worksheet.getRow(2);
    expect(String(row2.getCell(1).value)).toBe("2011001");
    expect(row2.getCell(2).value).toBe("Nguyễn Văn A");
  });

  it("provides sample rows when students list is empty and does not apply background color to header", async () => {
    const { buffer, fileName } = await buildEvaluationTemplateWorkbook(
      "Bài Mới",
      [],
    );

    expect(fileName).toBe("bang-diem-bai-moi.xlsx");

    const workbook = new Workbook();
    await workbook.xlsx.load(buffer as never);
    const worksheet = workbook.worksheets[0];

    const headerRow = worksheet.getRow(1);
    expect(headerRow.getCell(1).value).toBe("MSSV");
    expect(headerRow.getCell(2).value).toBe("Họ tên");
    expect(headerRow.getCell(3).value).toBe("Điểm");
    expect(headerRow.getCell(4).value).toBe("Feedback");

    // Header không được tô màu nền (không có fgColor hoặc pattern là none)
    const fill = headerRow.fill as
      { fgColor?: unknown; pattern?: string } | undefined;
    expect(fill?.fgColor).toBeUndefined();

    // Có ít nhất 2 dòng mẫu khi danh sách sinh viên rỗng
    expect(worksheet.rowCount).toBeGreaterThanOrEqual(3);
    const row2 = worksheet.getRow(2);
    expect(String(row2.getCell(1).value)).toMatch(/^\d+$/);
    expect(row2.getCell(2).value).toBeTruthy();
  });
});
