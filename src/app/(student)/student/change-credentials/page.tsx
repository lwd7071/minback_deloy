import { ChangeCredentialsForm } from "@/components/student/change-credentials-form";

export const metadata = {
  title: "Đặt thông tin đăng nhập — MinBack",
  description:
    "Đặt Nickname và PIN cá nhân của bạn trước khi truy cập hồ sơ học tập.",
};

export default function ChangeCredentialsPage() {
  return (
    <section className="surface">
      <p className="eyebrow">Lần đầu đăng nhập</p>
      <h1>Đặt thông tin đăng nhập</h1>
      <p className="muted">
        Bạn cần đặt thông tin đăng nhập cá nhân một lần trước khi xem hồ sơ học
        tập. Thông tin này bảo mật và chỉ bạn mới biết.
      </p>
      <ChangeCredentialsForm />
    </section>
  );
}
