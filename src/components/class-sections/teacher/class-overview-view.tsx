import Link from "next/link";

import { AppIcon } from "@/components/ui/app-icon";
import { Card } from "@/components/ui/card";

export function ClassOverviewView({
  classSectionId,
}: {
  classSectionId: string;
  code?: string;
  name?: string;
}) {
  const links = [
    {
      href: `/admin/classes/${classSectionId}/students`,
      icon: "students" as const,
      title: "Sinh viên",
      description: "Quản lý danh sách sinh viên, đặt lại mã PIN và xem hồ sơ học tập.",
    },
    {
      href: `/admin/classes/${classSectionId}/assignments`,
      icon: "book" as const,
      title: "Bài tập",
      description: "Tạo, cập nhật và công bố bài tập kèm file hướng dẫn cho lớp.",
    },
    {
      href: `/admin/classes/${classSectionId}/gradebook`,
      icon: "gradebook" as const,
      title: "Bảng điểm",
      description: "Theo dõi tiến độ nộp bài, chấm điểm và trả nhận xét.",
    },
  ];

  return (
    <div className="class-overview">
      <p className="muted" style={{ marginBottom: "20px" }}>
        Chọn khu vực quản lý bạn muốn làm việc cho lớp học phần này:
      </p>
      <div className="class-overview-grid">
        {links.map((item) => (
          <Link
            className="class-overview-link"
            href={item.href}
            key={item.href}
          >
            <Card hover>
              <span className="class-overview-icon">
                <AppIcon name={item.icon} size={24} />
              </span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <span style={{ fontWeight: 600, color: "var(--navy-900)" }}>
                Vào quản lý →
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
