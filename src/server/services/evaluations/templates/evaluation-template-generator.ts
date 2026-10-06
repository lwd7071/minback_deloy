import pkg from "exceljs";

const { Workbook } = pkg;

export interface EvaluationTemplateStudent {
  mssv: string;
  fullName?: string;
  full_name?: string;
}

export async function buildEvaluationTemplateWorkbook(
  assignmentTitle: string,
  students: EvaluationTemplateStudent[],
): Promise<{ buffer: Buffer; fileName: string }> {
  const workbook = new Workbook();

  // 1. Sheet Bảng điểm
  const worksheet = workbook.addWorksheet("BangDiem");

  worksheet.columns = [
    { header: "MSSV", key: "mssv", width: 16 },
    { header: "Họ tên", key: "fullName", width: 28 },
    { header: "Tiêu chí 1 (20%)", key: "c1", width: 18 },
    { header: "Tiêu chí 2 (30%)", key: "c2", width: 18 },
    { header: "Tiêu chí 3 (50%)", key: "c3", width: 18 },
    { header: "Tiêu chí 4", key: "c4", width: 16 },
    { header: "Tiêu chí 5", key: "c5", width: 16 },
    { header: "Tiêu chí 6", key: "c6", width: 16 },
    { header: "Tiêu chí 7", key: "c7", width: 16 },
    { header: "Tiêu chí 8", key: "c8", width: 16 },
    { header: "Tiêu chí 9", key: "c9", width: 16 },
    { header: "Tiêu chí 10", key: "c10", width: 16 },
    { header: "Điểm", key: "score", width: 14 },
    { header: "Feedback", key: "feedback", width: 45 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 24;

  const dataList =
    students && students.length > 0
      ? students
      : [
          { mssv: "24110201", fullName: "Nguyễn Văn A" },
          { mssv: "24110202", fullName: "Trần Thị B" },
        ];

  const isSample = !students || students.length === 0;

  dataList.forEach((student, index) => {
    const rowNum = index + 2;
    const mssvVal =
      /^\d+$/.test(student.mssv) && !student.mssv.startsWith("0")
        ? Number(student.mssv)
        : student.mssv;

    // Cột 13 (Điểm): công thức Excel =ROUND((C{row}*20% + D{row}*30% + E{row}*50%), 1)
    const formulaStr = `ROUND(C${rowNum}*20% + D${rowNum}*30% + E${rowNum}*50%, 1)`;

    // Nếu là sinh viên mẫu thì điền sẵn điểm tiêu chí để thấy ngay kết quả nhảy số
    const c1Score = isSample ? (index === 0 ? 8.5 : 9.0) : "";
    const c2Score = isSample ? (index === 0 ? 8.0 : 8.5) : "";
    const c3Score = isSample ? (index === 0 ? 9.0 : 9.5) : "";
    const computedScore = isSample
      ? Math.round(((c1Score as number) * 0.2 + (c2Score as number) * 0.3 + (c3Score as number) * 0.5) * 10) / 10
      : undefined;

    const row = worksheet.addRow({
      mssv: mssvVal,
      fullName: student.fullName || student.full_name || "",
      c1: c1Score,
      c2: c2Score,
      c3: c3Score,
      c4: "",
      c5: "",
      c6: "",
      c7: "",
      c8: "",
      c9: "",
      c10: "",
      feedback: isSample ? (index === 0 ? "Bài làm tốt, trình bày rõ ràng" : "Nắm chắc kiến thức") : "",
    });

    const scoreCell = row.getCell(13);
    scoreCell.value = {
      formula: formulaStr,
      result: computedScore,
    };
  });

  // 2. Sheet Hướng dẫn
  const guideSheet = workbook.addWorksheet("HuongDan");
  guideSheet.columns = [
    { header: "QUY TẮC NHẬP BẢNG ĐIỂM THEO TIÊU CHÍ (RUBRIC)", key: "rule", width: 80 },
  ];

  const guideHeader = guideSheet.getRow(1);
  guideHeader.font = { bold: true, size: 12 };
  guideHeader.height = 26;

  guideSheet.addRow(["1. Điểm mỗi tiêu chí được chấm theo thang 10 (tối đa 1 chữ số thập phân)."]);
  guideSheet.addRow(["2. Cột nào có trọng số dạng (xx%) trong tiêu đề (ví dụ: 'Báo cáo (30%)') sẽ được tính vào điểm tổng."]);
  guideSheet.addRow(["3. Tổng phần trăm của các cột tiêu chí có (xx%) phải bằng đúng 100%."]);
  guideSheet.addRow(["4. Các cột không có (xx%) như 'Tiêu chí 4'.. có thể để trống hoặc xóa bớt tùy ý."]);
  guideSheet.addRow(["5. Có thể tự do đổi tên tiêu chí (ví dụ: 'Thuyết trình (20%)', 'Code (40%)', 'Báo cáo (40%)')."]);
  guideSheet.addRow(["6. Cột Điểm có sẵn công thức Excel tự tính. Hệ thống khi import cũng sẽ tự động tính lại chuẩn xác."]);

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const safeTitle = assignmentTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-");
  const fileName = `bang-diem-${safeTitle}.xlsx`;

  return { buffer, fileName };
}
