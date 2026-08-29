import { NotificationSettingsForm } from "@/components/teacher/notification-settings/notification-settings-form";

export default function NotificationSettingsPage() {
  return (
    <section className="surface">
      <p className="eyebrow">Dev B</p>
      <h1>Cấu hình thông báo</h1>
      <p className="muted">
        Quản lý email Brevo phía server. API key không được hiển thị trên trang
        này.
      </p>
      <NotificationSettingsForm />
    </section>
  );
}
