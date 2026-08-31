"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/teacher/logout-button";
export function AdminSidebar() {
  const pathname = usePathname();
  const items = [
    { href: "/admin/dashboard", label: "Lớp", icon: "📊" },
    { href: "/admin/settings", label: "Cài đặt", icon: "⚙️" },
  ];
  return (
    <aside className="admin-sidebar">
      <Link className="brand-lockup" href="/admin/dashboard">
        <span className="brand-mark">M</span>MinBack
      </Link>
      <nav className="admin-nav">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              className={`nav-item ${active ? "nav-item-active" : ""}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              href={item.href}
              key={item.href}
            >
              <span className={`icon-circle ${active ? "active" : ""}`} style={{ width: 32, height: 32, fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <div className="mobile-nav-logout">
          <LogoutButton />
        </div>
      </nav>
      <div className="admin-sidebar-footer">
        <LogoutButton />
      </div>
    </aside>
  );
}
