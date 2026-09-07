import ExcelJS from "exceljs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, "../test/e2e");

async function generateRosterFile() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Danh Sách Sinh Viên");

  worksheet.columns = [
    { header: "MSSV", key: "mssv", width: 16 },
    { header: "Họ Tên", key: "fullName", width: 28 },
    { header: "Email", key: "email", width: 36 },
  ];

  const students = [
    {
      mssv: "21110001",
      fullName: "Nguyễn Văn An",
      email: "21110001@student.hcmute.edu.vn",
    },
    {
      mssv: "21110002",
      fullName: "Trần Thị Bích",
      email: "21110002@student.hcmute.edu.vn",
    },
    {
      mssv: "21110003",
      fullName: "Lê Hoàng Cường",
      email: "21110003@student.hcmute.edu.vn",
    },
    {
      mssv: "21110004",
      fullName: "Phạm Đức Dũng",
      email: "21110004@student.hcmute.edu.vn",
    },
    {
      mssv: "21110005",
      fullName: "Hoàng Mai Em",
      email: "21110005@student.hcmute.edu.vn",
    },
    {
      mssv: "21110006",
      fullName: "Vũ Quốc Phong",
      email: "21110006@student.hcmute.edu.vn",
    },
    {
      mssv: "21110007",
      fullName: "Đặng Thu Hà",
      email: "21110007@student.hcmute.edu.vn",
    },
    {
      mssv: "21110008",
      fullName: "Bùi Minh Khang",
      email: "21110008@student.hcmute.edu.vn",
    },
    {
      mssv: "21110009",
      fullName: "Đỗ Phương Linh",
      email: "21110009@student.hcmute.edu.vn",
    },
    {
      mssv: "21110010",
      fullName: "Ngô Quang Minh",
      email: "21110010@student.hcmute.edu.vn",
    },
  ];

  for (const student of students) {
    worksheet.addRow(student);
  }

  // Header style
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A4A" }, // Primary Navy color
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 26;

  // Row formatting
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: "middle" };
      row.height = 22;
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    }
  });

  const filePath = path.join(outputDir, "danh_sach_sinh_vien_mau.xlsx");
  await workbook.xlsx.writeFile(filePath);
  console.log(`Created: ${filePath}`);
}

async function generateEvaluationFile() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Bảng Điểm & Feedback");

  worksheet.columns = [
    { header: "MSSV", key: "mssv", width: 16 },
    { header: "Họ tên", key: "fullName", width: 26 },
    { header: "Điểm", key: "score", width: 12 },
    { header: "Feedback", key: "feedback", width: 65 },
  ];

  const evaluations = [
    {
      mssv: "21110001",
      fullName: "Nguyễn Văn An",
      score: 8.5,
      feedback: "Bài làm rất tốt, cấu trúc code rõ ràng và sạch sẽ.",
    },
    {
      mssv: "21110002",
      fullName: "Trần Thị Bích",
      score: 9.0,
      feedback: "Hoàn thành tốt các yêu cầu chính, thuật toán xử lý tối ưu.",
    },
    {
      mssv: "21110003",
      fullName: "Lê Hoàng Cường",
      score: 7.0,
      feedback: "Code chạy đúng yêu cầu, cần bổ sung thêm comment và kiểm thử.",
    },
    {
      mssv: "21110004",
      fullName: "Phạm Đức Dũng",
      score: 10.0,
      feedback:
        "Xuất sắc! Đầy đủ tính năng, giao diện đẹp và code chuẩn chỉnh.",
    },
    {
      mssv: "21110005",
      fullName: "Hoàng Mai Em",
      score: 6.5,
      feedback: "Cần chú ý validate dữ liệu đầu vào kỹ hơn, giao diện khá tốt.",
    },
    {
      mssv: "21110006",
      fullName: "Vũ Quốc Phong",
      score: 8.0,
      feedback: "Làm đúng tiến độ, kiến trúc logic mạch lạc.",
    },
    {
      mssv: "21110007",
      fullName: "Đặng Thu Hà",
      score: 9.5,
      feedback: "Phần xử lý ngoại lệ rất chi tiết và chu đáo, phát huy nhé!",
    },
    {
      mssv: "21110008",
      fullName: "Bùi Minh Khang",
      score: 7.5,
      feedback: "Đáp ứng đầy đủ yêu cầu, cần chú ý thêm về hiệu năng truy vấn.",
    },
    {
      mssv: "21110009",
      fullName: "Đỗ Phương Linh",
      score: 8.0,
      feedback: "Bài làm sạch đẹp, luồng giao diện mượt mà và trực quan.",
    },
    {
      mssv: "21110010",
      fullName: "Ngô Quang Minh",
      score: 8.5,
      feedback:
        "Hoàn thành tốt toàn bộ bài tập, giải thích giải pháp rất rõ ràng.",
    },
  ];

  for (const item of evaluations) {
    worksheet.addRow(item);
  }

  // Header style
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A4A" }, // Primary Navy
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 26;

  // Row formatting
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.alignment = { vertical: "middle" };
      row.height = 24;
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    }
  });

  const filePath = path.join(outputDir, "bang_cham_diem_mau.xlsx");
  await workbook.xlsx.writeFile(filePath);
  console.log(`Created: ${filePath}`);
}

async function main() {
  await generateRosterFile();
  await generateEvaluationFile();
}

main().catch(console.error);
