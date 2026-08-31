import { StudentNotificationList } from "@/components/student/student-notification-list";

export const metadata = {
  title: "Thông báo — MinBack",
  description: "Danh sách thông báo cập nhật kết quả và điểm số bài tập.",
};

export default function StudentNotificationsPage() {
  return (
    <section className="surface">
      <p className="eyebrow">Sinh viên</p>
      <h1>Thông báo của bạn</h1>
      <p className="muted">
        Cập nhật kết quả bài tập và nhận xét từ giáo viên. Hệ thống tự động kiểm
        tra mỗi 10 giây.
      </p>
      <StudentNotificationList />
    </section>
  );
}
