"use client";

import { usePathname } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";

export function resolveClassBackTarget(
  pathname: string,
  classSectionId: string,
) {
  const root = `/admin/classes/${encodeURIComponent(classSectionId)}`;
  if (/\/assignments\/[^/]+\/grade(?:\/|$)/.test(pathname)) {
    return {
      href: `${root}/assignments`,
      ariaLabel: "Quay lại danh sách bài tập",
    };
  }
  if (pathname !== root && pathname.startsWith(root)) {
    return { href: root, ariaLabel: "Quay lại tổng quan lớp" };
  }
  return { href: "/admin/classes", ariaLabel: "Quay lại danh sách lớp học" };
}

export function ClassContextNav({
  classSectionId,
}: {
  classSectionId: string;
}) {
  const pathname = usePathname();
  const sectionId = classSectionId;
  const back = resolveClassBackTarget(pathname, sectionId);
  return (
    <div className="teacher-content-back">
      <BackLink fallbackHref={back.href} ariaLabel={back.ariaLabel} />
    </div>
  );
}
