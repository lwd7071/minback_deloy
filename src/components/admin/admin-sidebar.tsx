"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/teacher/logout-button";
import { AppIcon } from "@/components/ui/app-icon";
export function AdminSidebar() {
  const pathname = usePathname();
  const items = [
    { href: "/admin/dashboard", label: "Lớp", icon: "classes" as const },
    { href: "/admin/settings", label: "Cài đặt", icon: "settings" as const },
  ];
  return (
    <aside className="admin-sidebar">
      <Link className="brand-lockup" href="/admin/dashboard">
        MinBack
      </Link>
      <nav className="admin-nav">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              className={`nav-item ${active ? "nav-item-active" : ""}`}
              href={item.href}
              key={item.href}
            >
              <span className={`icon-circle ${active ? "active" : ""}`}>
                <AppIcon name={item.icon} size={17} />
              </span>
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
