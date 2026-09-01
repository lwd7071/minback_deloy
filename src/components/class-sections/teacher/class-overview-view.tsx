import Link from "next/link";

import { AppIcon } from "@/components/ui/app-icon";
import { Card } from "@/components/ui/card";

export function ClassOverviewView({ classSectionId, code, name }: { classSectionId: string; code: string; name: string }) {
  const links = [
    { href: `/admin/classes/${classSectionId}/students`, icon: "students" as const, title: "Sinh viên", description: "Quản lý danh sách, email và thông tin đăng nhập." },
    { href: `/admin/classes/${classSectionId}/assignments`, icon: "book" as const, title: "Bài tập", description: "Tạo, cập nhật và công bố bài tập cho lớp." },
    { href: `/admin/classes/${classSectionId}/gradebook`, icon: "gradebook" as const, title: "Bảng điểm", description: "Theo dõi tiến độ chấm và kết quả hiện tại." },
  ];
  return (
    <div className="class-overview">
      <header className="page-head class-overview-head"><p className="eyebrow">{code}</p><h1>{name}</h1><p className="muted">Chọn phần việc bạn muốn quản lý cho lớp học phần này.</p></header>
      <div className="class-overview-grid">
        {links.map((item) => <Link className="class-overview-link" href={item.href} key={item.href}><Card hover><span className="class-overview-icon"><AppIcon name={item.icon} size={24} /></span><h2>{item.title}</h2><p>{item.description}</p><span>Xem chi tiết</span></Card></Link>)}
      </div>
    </div>
  );
}
