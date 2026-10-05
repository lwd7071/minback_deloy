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

  // Header Styling: Giữ bảng tính tự nhiên, không tô màu nền
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 24;

  if (students && students.length > 0) {
    for (const student of students) {
      const mssvVal =
        /^\d+$/.test(student.mssv) && !student.mssv.startsWith("0")
          ? Number(student.mssv)
          : student.mssv;
      worksheet.addRow({
        mssv: mssvVal,
        fullName: student.fullName || student.full_name || "",
        score: "",
        feedback: "",
      });
    }
  } else {
    // Nếu lớp chưa có sinh viên, cung cấp 2 dòng dữ liệu mẫu thuần túy
    worksheet.addRow({
      mssv: 24110202,
      fullName: "Nguyễn Văn A",
      score: "",
      feedback: "",
    });
    worksheet.addRow({
      mssv: 24110201,
      fullName: "Nguyễn Văn B",
      score: "",
      feedback: "",
    });
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
