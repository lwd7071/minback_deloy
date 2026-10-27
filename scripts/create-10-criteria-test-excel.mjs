import ExcelJS from "exceljs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, "..");

const criteriaList = [
  { name: "Tiêu chí 1", weight: 10 },
  { name: "Tiêu chí 2", weight: 10 },
  { name: "Tiêu chí 3", weight: 10 },
  { name: "Tiêu chí 4", weight: 10 },
  { name: "Tiêu chí 5", weight: 10 },
  { name: "Tiêu chí 6", weight: 10 },
  { name: "Tiêu chí 7", weight: 10 },
  { name: "Tiêu chí 8", weight: 10 },
  { name: "Tiêu chí 9", weight: 10 },
  { name: "Tiêu chí 10", weight: 10 },
];

async function createTestCasesFile() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("BangDiem");

  worksheet.columns = [
    { header: "MSSV", key: "mssv", width: 14 },
    { header: "Họ tên", key: "fullName", width: 24 },
    { header: "Tiêu chí 1 (10%)", key: "c1", width: 18 },
    { header: "Tiêu chí 2 (10%)", key: "c2", width: 18 },
    { header: "Tiêu chí 3 (10%)", key: "c3", width: 18 },
    { header: "Tiêu chí 4 (10%)", key: "c4", width: 18 },
    { header: "Tiêu chí 5 (10%)", key: "c5", width: 18 },
    { header: "Tiêu chí 6 (10%)", key: "c6", width: 18 },
    { header: "Tiêu chí 7 (10%)", key: "c7", width: 18 },
    { header: "Tiêu chí 8 (10%)", key: "c8", width: 18 },
    { header: "Tiêu chí 9 (10%)", key: "c9", width: 18 },
    { header: "Tiêu chí 10 (10%)", key: "c10", width: 18 },
    { header: "Điểm", key: "score", width: 12 },
    { header: "Feedback", key: "feedback", width: 35 },
    { header: "Mô tả Test Case (Ghi chú)", key: "testDesc", width: 45 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 26;

  const rowsData = [
    {
      mssv: "21110001",
      fullName: "Nguyễn Văn An",
      c: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
      feedback: "Xuất sắc, đạt điểm tuyệt đối",
      testDesc: "✅ Test điểm max: Tất cả tiêu chí 10 -> Điểm tổng 10.0 (mỗi tiêu chí đạt tối đa 1.0)",
    },
    {
      mssv: "21110002",
      fullName: "Trần Thị Bích",
      c: [8.5, 9.0, 7.5, 8.0, 10, 6.5, 9.0, 8.5, 7.0, 8.0],
      feedback: "Bài làm tốt, số thập phân lẻ",
      testDesc: "✅ Test điểm thập phân: Tính đúng trung bình trọng số -> Điểm tổng 8.2",
    },
    {
      mssv: "21110003",
      fullName: "Lê Hoàng Cường",
      c: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      feedback: "Không làm bài",
      testDesc: "✅ Test điểm 0: Nhập số 0 toàn bộ -> Điểm tổng 0.0 (hợp lệ)",
    },
    {
      mssv: "21110004",
      fullName: "Phạm Đức Dũng",
      c: [0, 10, 0, 8, 5, 0, 7, 0, 9, 6],
      feedback: "Có tiêu chí 0 xen kẽ có điểm",
      testDesc: "✅ Test điểm 0 xen kẽ: Tính đúng các tiêu chí có điểm -> Điểm tổng 4.5",
    },
    {
      mssv: "21110005",
      fullName: "Hoàng Mai Em",
      c: ["", "", "", "", "", "", "", "", "", ""],
      feedback: "",
      testDesc: "⏭️ Test NULL / Không nhập gì: Bỏ trống cả dòng -> Hệ thống tự động BỎ QUA (skipped)",
    },
    {
      mssv: "21110006",
      fullName: "Vũ Quốc Phong",
      c: [8, 8, 8, 8, "", 8, 8, 8, 8, 8],
      feedback: "Quên nhập tiêu chí 5",
      testDesc: "❌ Test thiếu điểm: Bỏ trống 1 tiêu chí -> Báo lỗi 'Thiếu điểm Tiêu chí 5 (10%)'",
    },
    {
      mssv: "21110007",
      fullName: "Đặng Thu Hà",
      c: [12, 9, 8, 9, 8, 9, 8, 9, 8, 9],
      feedback: "Điểm vượt 10",
      testDesc: "❌ Test điểm quá giới hạn: Tiêu chí 1 nhập 12 -> Báo lỗi 'phải là số từ 0 đến 10'",
    },
    {
      mssv: "21110008",
      fullName: "Bùi Minh Khang",
      c: [8, -2, 8, 8, 8, 8, 8, 8, 8, 8],
      feedback: "Điểm âm",
      testDesc: "❌ Test điểm âm: Tiêu chí 2 nhập -2 -> Báo lỗi 'phải là số từ 0 đến 10'",
    },
    {
      mssv: "21110009",
      fullName: "Đỗ Phương Linh",
      c: [8, 8, "vắng", 8, 8, 8, 8, 8, 8, 8],
      feedback: "Nhập chữ",
      testDesc: "❌ Test nhập chữ: Tiêu chí 3 nhập chữ 'vắng' -> Báo lỗi 'phải là số từ 0 đến 10'",
    },
    {
      mssv: "21110010",
      fullName: "Ngô Quang Minh",
      c: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      feedback: "Đạt mức trung bình",
      testDesc: "✅ Test điểm trung bình: Tất cả 5 -> Điểm tổng 5.0",
    },
  ];

  rowsData.forEach((item, index) => {
    const rowNum = index + 2;
    // Công thức tính điểm trong Excel
    const formulaStr = `ROUND(C${rowNum}*0.1+D${rowNum}*0.1+E${rowNum}*0.1+F${rowNum}*0.1+G${rowNum}*0.1+H${rowNum}*0.1+I${rowNum}*0.1+J${rowNum}*0.1+K${rowNum}*0.1+L${rowNum}*0.1, 1)`;

    const row = worksheet.addRow({
      mssv: item.mssv,
      fullName: item.fullName,
      c1: item.c[0],
      c2: item.c[1],
      c3: item.c[2],
      c4: item.c[3],
      c5: item.c[4],
      c6: item.c[5],
      c7: item.c[6],
      c8: item.c[7],
      c9: item.c[8],
      c10: item.c[9],
      feedback: item.feedback,
      testDesc: item.testDesc,
    });

    const scoreCell = row.getCell(13);
    const validScores = item.c.filter((v) => typeof v === "number");
    const computed =
      validScores.length === 10
        ? Math.round(validScores.reduce((sum, v) => sum + v * 0.1, 0) * 10) / 10
        : undefined;

    scoreCell.value = {
      formula: formulaStr,
      result: computed,
    };
  });

  // Sheet Hướng Dẫn & Giải Thích
  const guideSheet = workbook.addWorksheet("HuongDan");
  guideSheet.columns = [
    { header: "GIẢI THÍCH TEST CASE KHI IMPORT FILE RUBRIC 10 TIÊU CHÍ", key: "info", width: 90 },
  ];
  const gHeader = guideSheet.getRow(1);
  gHeader.font = { bold: true, size: 12 };
  gHeader.height = 28;

  guideSheet.addRow(["1. CẤU TRÚC 10 TIÊU CHÍ (MỖI TIÊU CHÍ MAX 1 ĐIỂM TRONG THANG 10):"]);
  guideSheet.addRow(["   - Mỗi tiêu chí được chấm từ 0 đến 10 với trọng số 10% (ghi rõ 'Tiêu chí X (10%)' ở Header)."]);
  guideSheet.addRow(["   - Điểm bài tập = Tổng 10 tiêu chí x 10%. Điểm tối đa bài tập là 10.0 (mỗi tiêu chí đóng góp max 1.0)."]);
  guideSheet.addRow([""]);
  guideSheet.addRow(["2. CÁC TRƯỜNG HỢP TEST (TEST CASES):"]);
  guideSheet.addRow(["   - Sinh viên 1: Điểm tối đa (toàn 10) -> Hợp lệ, điểm tổng 10.0."]);
  guideSheet.addRow(["   - Sinh viên 2: Điểm thập phân lẻ -> Hợp lệ, điểm tổng 8.2."]);
  guideSheet.addRow(["   - Sinh viên 3: Nhập số 0 cho tất cả tiêu chí -> Hợp lệ, điểm tổng 0.0 (không bị nhầm với chưa nhập)."]);
  guideSheet.addRow(["   - Sinh viên 4: Số 0 xen kẽ các số khác -> Hợp lệ, tính đúng 4.5."]);
  guideSheet.addRow(["   - Sinh viên 5: NULL / Không nhập gì (bỏ trống cả dòng) -> Hệ thống tự động BỎ QUA (skipped), không ghi đè."]);
  guideSheet.addRow(["   - Sinh viên 6: Bỏ trống 1 tiêu chí (quên nhập) -> Báo lỗi INVALID 'Thiếu điểm Tiêu chí 5 (10%)'."]);
  guideSheet.addRow(["   - Sinh viên 7: Điểm > 10 (ví dụ 12) -> Báo lỗi INVALID 'phải là số từ 0 đến 10'."]);
  guideSheet.addRow(["   - Sinh viên 8: Điểm âm (ví dụ -2) -> Báo lỗi INVALID 'phải là số từ 0 đến 10'."]);
  guideSheet.addRow(["   - Sinh viên 9: Nhập chữ (ví dụ 'vắng', 'null') -> Báo lỗi INVALID 'phải là số từ 0 đến 10'."]);

  const filePath = path.resolve(outputDir, "bang_diem_10_tieu_chi_test_cases.xlsx");
  await workbook.xlsx.writeFile(filePath);
  console.log(`Đã tạo file test cases: ${filePath}`);
}

async function createCleanFile() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("BangDiem");

  worksheet.columns = [
    { header: "MSSV", key: "mssv", width: 14 },
    { header: "Họ tên", key: "fullName", width: 24 },
    { header: "Tiêu chí 1 (10%)", key: "c1", width: 18 },
    { header: "Tiêu chí 2 (10%)", key: "c2", width: 18 },
    { header: "Tiêu chí 3 (10%)", key: "c3", width: 18 },
    { header: "Tiêu chí 4 (10%)", key: "c4", width: 18 },
    { header: "Tiêu chí 5 (10%)", key: "c5", width: 18 },
    { header: "Tiêu chí 6 (10%)", key: "c6", width: 18 },
    { header: "Tiêu chí 7 (10%)", key: "c7", width: 18 },
    { header: "Tiêu chí 8 (10%)", key: "c8", width: 18 },
    { header: "Tiêu chí 9 (10%)", key: "c9", width: 18 },
    { header: "Tiêu chí 10 (10%)", key: "c10", width: 18 },
    { header: "Điểm", key: "score", width: 12 },
    { header: "Feedback", key: "feedback", width: 40 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11 };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 26;

  const validStudents = [
    { mssv: "21110001", name: "Nguyễn Văn An", c: [10, 9.5, 10, 9, 10, 9.5, 10, 9, 10, 9.5], fb: "Bài làm xuất sắc" },
    { mssv: "21110002", name: "Trần Thị Bích", c: [8.5, 9.0, 7.5, 8.0, 8.5, 7.0, 9.0, 8.5, 8.0, 8.0], fb: "Nắm vững lý thuyết, trình bày tốt" },
    { mssv: "21110003", name: "Lê Hoàng Cường", c: [7.0, 7.5, 8.0, 7.0, 6.5, 7.0, 8.0, 7.5, 7.0, 7.5], fb: "Khá tốt, cần chú ý chi tiết" },
    { mssv: "21110004", name: "Phạm Đức Dũng", c: [6.0, 6.5, 7.0, 6.0, 6.5, 7.0, 6.0, 6.5, 7.0, 6.5], fb: "Đạt yêu cầu" },
    { mssv: "21110005", name: "Hoàng Mai Em", c: [9.0, 8.5, 9.0, 8.5, 9.0, 8.5, 9.0, 8.5, 9.0, 8.5], fb: "Kỹ năng lập trình tốt" },
    { mssv: "21110006", name: "Vũ Quốc Phong", c: [8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0, 8.0], fb: "Làm bài đầy đủ" },
    { mssv: "21110007", name: "Đặng Thu Hà", c: [9.5, 9.0, 9.5, 9.0, 9.5, 9.0, 9.5, 9.0, 9.5, 9.0], fb: "Rất chỉn chu, sáng tạo" },
    { mssv: "21110008", name: "Bùi Minh Khang", c: [5.0, 5.5, 6.0, 5.0, 5.5, 6.0, 5.0, 5.5, 6.0, 5.5], fb: "Cần cải thiện phần thuyết minh" },
    { mssv: "21110009", name: "Đỗ Phương Linh", c: [8.0, 8.5, 8.0, 8.5, 8.0, 8.5, 8.0, 8.5, 8.0, 8.5], fb: "Tốt" },
    { mssv: "21110010", name: "Ngô Quang Minh", c: [7.5, 7.0, 7.5, 7.0, 7.5, 7.0, 7.5, 7.0, 7.5, 7.0], fb: "Đúng tiến độ" },
  ];

  validStudents.forEach((student, index) => {
    const rowNum = index + 2;
    const formulaStr = `ROUND(C${rowNum}*0.1+D${rowNum}*0.1+E${rowNum}*0.1+F${rowNum}*0.1+G${rowNum}*0.1+H${rowNum}*0.1+I${rowNum}*0.1+J${rowNum}*0.1+K${rowNum}*0.1+L${rowNum}*0.1, 1)`;
    const total = Math.round(student.c.reduce((sum, v) => sum + v * 0.1, 0) * 10) / 10;

    const row = worksheet.addRow({
      mssv: student.mssv,
      fullName: student.name,
      c1: student.c[0],
      c2: student.c[1],
      c3: student.c[2],
      c4: student.c[3],
      c5: student.c[4],
      c6: student.c[5],
      c7: student.c[6],
      c8: student.c[7],
      c9: student.c[8],
      c10: student.c[9],
      feedback: student.fb,
    });

    const scoreCell = row.getCell(13);
    scoreCell.value = {
      formula: formulaStr,
      result: total,
    };
  });

  const filePath = path.resolve(outputDir, "bang_diem_10_tieu_chi_hop_le.xlsx");
  await workbook.xlsx.writeFile(filePath);
  console.log(`Đã tạo file chuẩn hợp lệ: ${filePath}`);
}

async function main() {
  await createTestCasesFile();
  await createCleanFile();
}

main().catch(console.error);
