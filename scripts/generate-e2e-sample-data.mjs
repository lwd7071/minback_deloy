import fs from "node:fs";
import path from "node:path";

const E2E_DIR = path.resolve(process.cwd(), "e2e");
if (!fs.existsSync(E2E_DIR)) {
  fs.mkdirSync(E2E_DIR, { recursive: true });
}

const hoList = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Phan",
  "Vũ",
  "Võ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Hồ",
  "Ngô",
  "Dương",
  "Lý",
  "Huỳnh",
  "Đoàn",
];

const demList = [
  "Văn",
  "Thị",
  "Hữu",
  "Đức",
  "Quốc",
  "Thanh",
  "Ngọc",
  "Đình",
  "Minh",
  "Hoàng",
  "Gia",
  "Trọng",
  "Quang",
  "Bảo",
  "Tuấn",
  "Thành",
];

const tenList = [
  "An",
  "Bình",
  "Cường",
  "Dũng",
  "Đạt",
  "Giang",
  "Hà",
  "Hải",
  "Hiếu",
  "Hoàng",
  "Hùng",
  "Huy",
  "Khoa",
  "Kiệt",
  "Long",
  "Minh",
  "Nam",
  "Nghĩa",
  "Nhân",
  "Phát",
  "Phong",
  "Phúc",
  "Quân",
  "Quang",
  "Sơn",
  "Thắng",
  "Thịnh",
  "Thuận",
  "Tiến",
  "Toàn",
  "Trí",
  "Trung",
  "Tú",
  "Tuấn",
  "Tùng",
  "Vinh",
  "Vũ",
  "Việt",
  "Khang",
  "Tài",
];

const feedbacks = [
  "Bài làm rất tốt, logic mạch lạc",
  "Đáp ứng đầy đủ yêu cầu bài toán",
  "Cần tối ưu thêm thuật toán xử lý mảng",
  "Cấu trúc code sạch sẽ, comment rõ ràng",
  "Rất tốt, tiếp tục phát huy",
  "Đạt yêu cầu, chú ý xử lý edge case",
  "Hoàn thành xuất sắc, vượt yêu cầu",
  "Nắm vững kiến thức, trình bày cẩn thận",
  "Bài làm tương đối tốt",
  "Cần hoàn thiện thêm phần kiểm thử",
];

const scores = [6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0];

const students = [];
for (let i = 1; i <= 300; i++) {
  const mssv = `2211${String(i).padStart(4, "0")}`;
  const ho = hoList[i % hoList.length];
  const dem = demList[(i * 3) % demList.length];
  const ten = tenList[(i * 7) % tenList.length];
  const fullName = `${ho} ${dem} ${ten}`;
  const email = `${mssv.toLowerCase()}@student.hcmute.edu.vn`;
  const score = scores[(i * 11) % scores.length];
  const feedback = feedbacks[(i * 13) % feedbacks.length];

  students.push({ mssv, fullName, email, score, feedback });
}

// 1. Tạo danh sách 300 sinh viên (để import lớp học)
const rosterHeader = "MSSV,Họ Tên,Email\n";
const rosterRows = students
  .map((s) => `"${s.mssv}","${s.fullName}","${s.email}"`)
  .join("\n");
fs.writeFileSync(
  path.join(E2E_DIR, "danh_sach_300_sinh_vien.csv"),
  "\uFEFF" + rosterHeader + rosterRows + "\n",
  "utf-8",
);

// 2. Tạo bảng điểm 300 sinh viên (để import điểm / chấm điểm)
const gradeHeader = "MSSV,Họ Tên,Điểm,Nhận xét\n";
const gradeRows = students
  .map((s) => `"${s.mssv}","${s.fullName}",${s.score},"${s.feedback}"`)
  .join("\n");
fs.writeFileSync(
  path.join(E2E_DIR, "bang_diem_300_sinh_vien.csv"),
  "\uFEFF" + gradeHeader + gradeRows + "\n",
  "utf-8",
);

console.log(
  "Đã tạo thành công 2 file dữ liệu mẫu 300 sinh viên trong thư mục e2e/:",
);
console.log("- e2e/danh_sach_300_sinh_vien.csv");
console.log("- e2e/bang_diem_300_sinh_vien.csv");
