"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Bell, ChartNoAxesColumnIncreasing, GraduationCap, LayoutDashboard, LogOut, Menu, Settings, Upload, Users, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNotificationPolling } from "@/components/notifications/student/use-notification-polling";

type WorkspaceHeaderProps = {
  role: "student" | "teacher";
  classCode?: string;
};

type NavItem = { href: string; label: string; icon: typeof BookOpen };

function makeItems(role: WorkspaceHeaderProps["role"], classCode?: string): NavItem[] {
  if (role === "student" && classCode) {
    const root = `/class/${encodeURIComponent(classCode)}`;
    return [
      { href: `${root}/profile`, label: "Tổng quan", icon: LayoutDashboard },
      { href: `${root}/assignments`, label: "Bài tập", icon: BookOpen },
      { href: `${root}/notifications`, label: "Thông báo", icon: Bell },
    ];
  }
  return [
    { href: "/admin/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/admin/classes", label: "Lớp học", icon: Users },
    { href: "/admin/settings", label: "Cài đặt", icon: Settings },
  ];
}

export function WorkspaceHeader({ role, classCode }: WorkspaceHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const items = makeItems(role, classCode);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  async function logout() {
    const endpoint = role === "student" ? "/api/v1/student/auth/logout" : "/api/v1/teacher/auth/logout";
    await fetch(endpoint, { method: "POST" });
    router.replace(role === "student" && classCode ? `/class/${encodeURIComponent(classCode)}/login` : "/admin/login");
  }

  return (
    <header className="workspace-header">
      <div className="workspace-header-inner">
        <Link className="wordmark" href={role === "student" && classCode ? `/class/${encodeURIComponent(classCode)}/profile` : "/admin/dashboard"}>
          <span className="wordmark-mark"><GraduationCap size={18} /></span>
          <span>MinBack</span>
        </Link>
        <nav aria-label="Điều hướng chính" className="workspace-nav-desktop">
          {items.map(({ href, label, icon: Icon }) => (
            <Link className={`workspace-nav-link ${pathname === href || (href === "/admin/classes" && pathname.startsWith("/admin/classes")) ? "is-active" : ""}`} href={href} key={href}>
              <Icon aria-hidden="true" size={16} />{label}
            </Link>
          ))}
        </nav>
        <div className="workspace-header-actions">
          {role === "student" && classCode ? <StudentNotificationBell classCode={classCode} /> : null}
          <span className="workspace-role-label">{role === "student" ? classCode : "Giảng viên"}</span>
          <button className="header-logout" onClick={() => void logout()} type="button"><LogOut aria-hidden="true" size={17} /><span>Đăng xuất</span></button>
          <button aria-expanded={open} aria-label={open ? "Đóng menu" : "Mở menu"} className="mobile-menu-toggle" onClick={() => setOpen((value) => !value)} type="button">{open ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </div>
      {open ? <div className="workspace-mobile-panel"><nav aria-label="Điều hướng di động">{items.map(({ href, label, icon: Icon }) => <Link className={`workspace-mobile-link ${pathname === href ? "is-active" : ""}`} href={href} key={href} onClick={() => setOpen(false)}><Icon aria-hidden="true" size={18} />{label}</Link>)}</nav><button className="workspace-mobile-logout" onClick={() => void logout()} type="button"><LogOut size={17} />Đăng xuất</button></div> : null}
    </header>
  );
}

function StudentNotificationBell({ classCode }: { classCode: string }) {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotificationPolling();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="header-notification-wrapper" style={{ position: "relative", marginRight: "1rem" }} ref={popoverRef}>
      <button 
        aria-label="Thông báo"
        onClick={() => setOpen(!open)}
        style={{ background: "none", border: "none", cursor: "pointer", position: "relative", display: "flex", alignItems: "center", padding: "0.25rem", color: "var(--muted)" }}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span style={{ position: "absolute", top: 2, right: 2, background: "var(--destructive, #ef4444)", width: 8, height: 8, borderRadius: "50%" }} />
        )}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", right: 0, width: 320, background: "var(--background)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, marginTop: 8, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontWeight: 600, fontSize: "0.9rem" }}>Thông báo mới</div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {notifications.slice(0, 3).map(notif => (
              <button 
                key={notif.id} 
                onClick={() => { void markAsRead(notif.id); setOpen(false); }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", borderBottom: "1px solid var(--border)", background: notif.readAt ? "transparent" : "var(--muted-bg, rgba(0,0,0,0.02))", border: "none", cursor: "pointer" }}
              >
                <div style={{ fontSize: "0.85rem", marginBottom: 4, color: "var(--foreground)", fontWeight: notif.readAt ? 400 : 500 }}>{notif.message}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(notif.createdAt))}
                </div>
              </button>
            ))}
            {notifications.length === 0 && (
              <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "0.85rem" }}>Không có thông báo</div>
            )}
          </div>
          <Link 
            href={`/class/${encodeURIComponent(classCode)}/notifications`}
            onClick={() => setOpen(false)}
            style={{ display: "block", padding: "10px", textAlign: "center", fontSize: "0.85rem", color: "var(--primary)", fontWeight: 500, textDecoration: "none", background: "var(--surface)" }}
          >
            Xem tất cả
          </Link>
        </div>
      )}
    </div>
  );
}
