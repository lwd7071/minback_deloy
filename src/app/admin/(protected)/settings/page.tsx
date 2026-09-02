import { NotificationSettingsForm } from "@/components/notifications/teacher/notification-settings-form";
import { handleTeacherPageError } from "@/server/navigation/page-errors";
import { getNotificationSettings } from "@/server/services/notifications/notification-settings-service";

export default async function AdminSettingsPage() {
  let settings;
  try {
    settings = await getNotificationSettings();
  } catch (error) {
    return handleTeacherPageError(error);
  }
  return (
    <div className="stack">
      <div className="page-head">
        <h1>Thông báo</h1>
        <p className="muted">Quản lý email phản hồi gửi tới sinh viên.</p>
      </div>
      <section className="card">
        <NotificationSettingsForm initialSettings={settings} />
      </section>
    </div>
  );
}
