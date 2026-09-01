"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Bell, ChartNoAxesColumnIncreasing, GraduationCap, LayoutDashboard, LogOut, Menu, Settings, Upload, Users, X } from "lucide-react";
import { useEffect, useState } from "react";

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
          <span className="workspace-role-label">{role === "student" ? classCode : "Giảng viên"}</span>
          <button className="header-logout" onClick={() => void logout()} type="button"><LogOut aria-hidden="true" size={17} /><span>Đăng xuất</span></button>
          <button aria-expanded={open} aria-label={open ? "Đóng menu" : "Mở menu"} className="mobile-menu-toggle" onClick={() => setOpen((value) => !value)} type="button">{open ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </div>
      {open ? <div className="workspace-mobile-panel"><nav aria-label="Điều hướng di động">{items.map(({ href, label, icon: Icon }) => <Link className={`workspace-mobile-link ${pathname === href ? "is-active" : ""}`} href={href} key={href} onClick={() => setOpen(false)}><Icon aria-hidden="true" size={18} />{label}</Link>)}</nav><button className="workspace-mobile-logout" onClick={() => void logout()} type="button"><LogOut size={17} />Đăng xuất</button></div> : null}
    </header>
  );
}
