"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Bell,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useNotificationPolling } from "@/components/notifications/student/use-notification-polling";
import { Avatar } from "@/components/ui/avatar";

type WorkspaceHeaderProps =
  | { role: "teacher"; displayName: string; classCode?: never }
  | { role: "student"; classCode: string; displayName?: never };

type NavItem = { href: string; label: string; icon: typeof BookOpen };

export function makeItems(
  role: WorkspaceHeaderProps["role"],
  classCode?: string,
): NavItem[] {
  if (role === "student" && classCode) {
    const root = `/class/${encodeURIComponent(classCode)}`;
    return [
      { href: `${root}/profile`, label: "Tổng quan", icon: LayoutDashboard },
      { href: `${root}/assignments`, label: "Bài tập", icon: BookOpen },
      { href: `${root}/notifications`, label: "Thông báo", icon: Bell },
    ];
  }
  return [
    { href: "/admin/classes", label: "Lớp học", icon: Users },
    { href: "/admin/settings", label: "Cài đặt", icon: Settings },
  ];
}

export function WorkspaceHeader({
  role,
  classCode,
  displayName,
}: WorkspaceHeaderProps) {
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
    const endpoint =
      role === "student"
        ? "/api/v1/student/auth/logout"
        : "/api/v1/teacher/auth/logout";
    await fetch(endpoint, { method: "POST" });
    if (role === "student") {
      router.replace(
        classCode ? `/class/${encodeURIComponent(classCode)}/login` : "/",
      );
    } else {
      router.replace("/admin/login");
    }
    router.refresh();
  }

  return (
    <header className="workspace-header">
      <div className="workspace-header-inner">
        <Link
          className="wordmark"
          href={
            role === "student" && classCode
              ? `/class/${encodeURIComponent(classCode)}/profile`
              : "/admin/classes"
          }
          prefetch={role === "teacher" ? true : null}
        >
          <span className="wordmark-mark">
            <GraduationCap size={18} />
          </span>
          <span>MinBack</span>
        </Link>
        <nav aria-label="Điều hướng chính" className="workspace-nav-desktop">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              className={`workspace-nav-link ${pathname === href || (href === "/admin/classes" && pathname.startsWith("/admin/classes")) ? "is-active" : ""}`}
              href={href}
              key={href}
              prefetch={role === "teacher" ? true : null}
            >
              <Icon aria-hidden="true" size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="workspace-header-actions">
          {role === "student" && classCode ? (
            <StudentNotificationBell classCode={classCode} />
          ) : null}
          {role === "teacher" ? (
            <div className="workspace-teacher-identity">
              <span className="workspace-teacher-copy">
                <strong>Giảng viên</strong>
                <small title={displayName}>{displayName}</small>
              </span>
              <Avatar name={displayName} size={38} />
            </div>
          ) : (
            <span className="workspace-role-label">{classCode}</span>
          )}
          <button
            className="header-logout"
            onClick={() => void logout()}
            type="button"
          >
            <LogOut aria-hidden="true" size={17} />
            <span>Đăng xuất</span>
          </button>
          <button
            aria-expanded={open}
            aria-label={open ? "Đóng menu" : "Mở menu"}
            className="mobile-menu-toggle"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {open ? (
        <div className="workspace-mobile-panel">
          {role === "teacher" ? (
            <div className="workspace-mobile-identity">
              <Avatar name={displayName} size={40} />
              <span className="workspace-teacher-copy">
                <strong>Giảng viên</strong>
                <small>{displayName}</small>
              </span>
            </div>
          ) : null}
          <nav aria-label="Điều hướng di động">
            {items.map(({ href, label, icon: Icon }) => (
              <Link
                className={`workspace-mobile-link ${pathname === href ? "is-active" : ""}`}
                href={href}
                key={href}
                onClick={() => setOpen(false)}
                prefetch={role === "teacher" ? true : null}
              >
                <Icon aria-hidden="true" size={18} />
                {label}
              </Link>
            ))}
          </nav>
          <button
            className="workspace-mobile-logout"
            onClick={() => void logout()}
            type="button"
          >
            <LogOut size={17} />
            Đăng xuất
          </button>
        </div>
      ) : null}
    </header>
  );
}

function StudentNotificationBell({ classCode }: { classCode: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { notifications, unreadCount, markAsRead } = useNotificationPolling();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="header-notification-wrapper" ref={popoverRef}>
      <button
        aria-label="Thông báo"
        onClick={() => setOpen(!open)}
        className="header-notification-trigger"
      >
        <Bell size={19} />
        {unreadCount > 0 && <span className="header-notification-dot" />}
      </button>
      {open && (
        <div className="header-notification-popover">
          <div className="header-notification-title">Thông báo mới</div>
          <div className="header-notification-list">
            {notifications.slice(0, 3).map((notif) => (
              <button
                key={notif.id}
                onClick={() => {
                  void markAsRead(notif.id);
                  setOpen(false);
                  if (notif.evaluationId) {
                    router.push(
                      `/class/${encodeURIComponent(classCode)}/grades?assignment=${encodeURIComponent(notif.evaluationId)}`,
                    );
                  }
                }}
                className={`header-notification-item ${notif.readAt ? "" : "is-unread"}`}
              >
                <div className="header-notification-message">
                  {notif.message}
                </div>
                <div className="header-notification-time">
                  {new Intl.DateTimeFormat("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }).format(new Date(notif.createdAt))}
                </div>
              </button>
            ))}
            {notifications.length === 0 && (
              <div className="header-notification-empty">
                Không có thông báo
              </div>
            )}
          </div>
          <Link
            href={`/class/${encodeURIComponent(classCode)}/notifications`}
            onClick={() => setOpen(false)}
            className="header-notification-all"
          >
            Xem tất cả
          </Link>
        </div>
      )}
    </div>
  );
}
