"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function ClassContextNav({
  code,
  name,
}: {
  classSectionId: string;
  code: string;
  name: string;
}) {
  return (
    <header className="class-context-nav">
      <div className="class-context-top">
        <Link href="/admin/classes" className="class-back-link">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Danh sách lớp học</span>
        </Link>
        <div className="class-title-block">
          <span className="class-code-badge">{code}</span>
          <h1 className="class-name-heading">{name}</h1>
        </div>
      </div>
    </header>
  );
}
