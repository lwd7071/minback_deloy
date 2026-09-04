import pkg from "exceljs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Workbook } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const e2eDir = path.resolve(__dirname, "../test/e2e");

async function generateRosterExcel() {
  const wb = new Workbook();
  const ws = wb.addWorksheet("DanhSachSinhVien");

  ws.columns = [
    { header: "MSSV", key: "mssv", width: 16 },
    { header: "Họ Tên", key: "fullName", width: 28 },
    { header: "Email", key: "email", width: 36 },
  ];

  // Format Header
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" }, // Deep blue
  };

  const sampleStudents = [
    { mssv: "22110001", fullName: "Nguyễn Văn An", email: "22110001@student.hcmute.edu.vn" },
    { mssv: "22110002", fullName: "Trần Thị Bình", email: "22110002@student.hcmute.edu.vn" },
    { mssv: "22110003", fullName: "Lê Hoàng Cường", email: "22110003@student.hcmute.edu.vn" },
    { mssv: "22110004", fullName: "Phạm Minh Đức", email: "22110004@student.hcmute.edu.vn" },
    { mssv: "22110005", fullName: "Đỗ Thị Mai", email: "22110005@student.hcmute.edu.vn" },
    { mssv: "22110006", fullName: "Võ Quốc Hưng", email: "22110006@student.hcmute.edu.vn" },
    { mssv: "22110007", fullName: "Hoàng Ngọc Lan", email: "22110007@student.hcmute.edu.vn" },
    { mssv: "22110008", fullName: "Bùi Thanh Phong", email: "22110008@student.hcmute.edu.vn" },
    { mssv: "22110009", fullName: "Đặng Khánh Linh", email: "22110009@student.hcmute.edu.vn" },
    { mssv: "22110010", fullName: "Ngô Quang Huy", email: "22110010@student.hcmute.edu.vn" },
  ];

  for (const s of sampleStudents) {
    ws.addRow(s);
  }

  const filePath = path.join(e2eDir, "danh_sach_sinh_vien_mau.xlsx");
  await wb.xlsx.writeFile(filePath);
  console.log("Created:", filePath);
}

async function generateGradesExcel() {
  const wb = new Workbook();
  const ws = wb.addWorksheet("BangDiemNhanXet");

  ws.columns = [
    { header: "MSSV", key: "mssv", width: 16 },
    { header: "Họ Tên", key: "fullName", width: 28 },
    { header: "Điểm", key: "score", width: 12 },
    { header: "Nhận xét", key: "feedback", width: 50 },
  ];

  // Format Header
  ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF047857" }, // Deep green
  };

  const sampleGrades = [
    { mssv: "22110001", fullName: "Nguyễn Văn An", score: 9.5, feedback: "Bài làm rất tốt, cấu trúc code rõ ràng và đúng chuẩn." },
    { mssv: "22110002", fullName: "Trần Thị Bình", score: 8.0, feedback: "Ý tưởng tốt, cần chú ý format code và xử lý ngoại lệ cẩn thận hơn." },
    { mssv: "22110003", fullName: "Lê Hoàng Cường", score: 10.0, feedback: "Xuất sắc! Hoàn thành đầy đủ các yêu cầu nâng cao." },
    { mssv: "22110004", fullName: "Phạm Minh Đức", score: 7.5, feedback: "Bài làm đạt yêu cầu cơ bản, thiếu phần tối ưu hiệu năng." },
    { mssv: "22110005", fullName: "Đỗ Thị Mai", score: 8.5, feedback: "Giao diện đẹp mắt, luồng xử lý hợp lý." },
    { mssv: "22110006", fullName: "Võ Quốc Hưng", score: 9.0, feedback: "Giải thuật tốt, giải thích cặn kẽ." },
    { mssv: "22110007", fullName: "Hoàng Ngọc Lan", score: 8.5, feedback: "Nắm vững kiến thức, trình bày sạch sẽ." },
    { mssv: "22110008", fullName: "Bùi Thanh Phong", score: 7.0, feedback: "Cần cải thiện phần responsive và bổ sung comment." },
    { mssv: "22110009", fullName: "Đặng Khánh Linh", score: 9.0, feedback: "Đáp ứng đầy đủ tiêu chí chấm điểm, rất tốt." },
    { mssv: "22110010", fullName: "Ngô Quang Huy", score: 8.5, feedback: "Làm đúng hướng dẫn, chú ý commit thường xuyên hơn." },
  ];

  for (const g of sampleGrades) {
    ws.addRow(g);
  }

  const filePath = path.join(e2eDir, "bang_diem_nhan_xet_mau.xlsx");
  await wb.xlsx.writeFile(filePath);
  console.log("Created:", filePath);
}

async function main() {
  await generateRosterExcel();
  await generateGradesExcel();
}

main().catch(console.error);
