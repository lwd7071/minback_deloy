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
  const worksheet = workbook.addWorksheet("BangDiemNhanXet");

  worksheet.columns = [
    { header: "MSSV", key: "mssv", width: 16 },
    { header: "Họ tên", key: "fullName", width: 30 },
    { header: "Điểm", key: "score", width: 22 },
    { header: "Feedback", key: "feedback", width: 60 },
  ];

  // Header Styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A4A" }, // Navy-900 MinBack color
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 28;

  if (students && students.length > 0) {
    for (const student of students) {
      worksheet.addRow({
        mssv: student.mssv,
        fullName: student.fullName || student.full_name || "",
        score: "",
        feedback: "",
      });
    }
  }

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const safeTitle = assignmentTitle
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-");
  const fileName = `bang-diem-${safeTitle}.xlsx`;

  return { buffer, fileName };
}
