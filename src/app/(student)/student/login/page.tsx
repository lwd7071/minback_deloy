import { StudentLoginForm } from "@/components/student/student-login-form";

export const metadata = {
  title: "Đăng nhập Sinh viên — MinBack",
  description:
    "Đăng nhập vào hồ sơ học tập của bạn bằng mã lớp học phần, nickname và PIN cá nhân.",
};

// phần /student/login frontend nè 
export default function StudentLoginPage() {
  return (
    <section className="surface">
      <p className="eyebrow">Sinh viên</p>
      <h1>Đăng nhập</h1>
      <p className="muted">
        Nhập mã lớp học phần, nickname và PIN để truy cập hồ sơ học tập.
      </p>

      <StudentLoginForm />
    </section>
  );
}
