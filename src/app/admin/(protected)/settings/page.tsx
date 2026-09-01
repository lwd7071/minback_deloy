import { NotificationSettingsForm } from "@/components/notifications/teacher/notification-settings-form";
export default function AdminSettingsPage() {
  return (
    <div className="stack">
      <div className="page-head">
        <h1>Thông báo</h1>
        <p className="muted">Quản lý email phản hồi gửi tới sinh viên.</p>
      </div>
      <section className="card">
        <NotificationSettingsForm />
      </section>
    </div>
  );
}
