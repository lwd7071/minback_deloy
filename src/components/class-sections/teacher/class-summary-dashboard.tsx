"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SearchInput } from "@/components/ui/search-input";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import type { ClassSectionSummaryDto } from "@/types/frontend-rebuild";

export function DashboardMetric({
  icon,
  tone,
  label,
  value,
}: {
  icon: AppIconName;
  tone: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="teacher-metric">
      <span className={`student-icon-tile ${tone}`}>
        <AppIcon name={icon} size={19} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function MiniProgressRing({ percentage }: { percentage: number }) {
  const size = 38;
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);

  return (
    <div className="teacher-mini-ring" aria-label={`${percentage}% đã chấm`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--surface-muted)"
          strokeWidth="4"
          fill="none"
        />
        <circle
          className="teacher-mini-ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span>{percentage}%</span>
    </div>
  );
}

export function ClassSummaryDashboard({
  rows,
  meta,
  metrics,
  query,
}: {
  rows: ClassSectionSummaryDto[];
  meta: { page: number; pageSize: number; total: number };
  metrics: {
    classCount: number;
    studentCount: number;
    assignmentCount: number;
    gradingPercentage: number;
  };
  query: { search: string };
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query.search);
  const pages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  useEffect(() => {
    if (search === query.search) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      router.replace(`/admin/classes${params.size ? `?${params}` : ""}`);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query.search, router, search]);

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (query.search) params.set("q", query.search);
    if (page > 1) params.set("page", String(page));
    return `/admin/classes${params.size ? `?${params}` : ""}`;
  };
  return (
    <div className="teacher-dash">
      <header className="teacher-dash-header">
        <div className="teacher-dash-heading">
          <span className="teacher-dash-icon">
            <AppIcon name="study" size={28} />
          </span>
          <div>
            <p className="eyebrow">Quản lý lớp học</p>
            <h1>Lớp học phần</h1>
          </div>
        </div>
      </header>

      <div className="teacher-metrics-grid" aria-label="Tổng quan lớp học">
        <DashboardMetric
          icon="classes"
          tone="blue"
          label="Lớp"
          value={metrics.classCount}
        />
        <DashboardMetric
          icon="students"
          tone="green"
          label="Sinh viên"
          value={metrics.studentCount}
        />
        <DashboardMetric
          icon="book"
          tone="amber"
          label="Bài mở"
          value={metrics.assignmentCount}
        />
        <DashboardMetric
          icon="check"
          tone="violet"
          label="Đã chấm"
          value={`${metrics.gradingPercentage}%`}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "16px",
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, maxWidth: "400px" }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo mã hoặc tên lớp"
          />
        </div>
        <Link className="btn btn-primary" href="/admin/classes/new">
          + Tạo lớp mới
        </Link>
      </div>

      <div className="teacher-class-grid">
        {rows.map((row) => {
          const pct = row.gradingProgress.total
            ? Math.round(
                (row.gradingProgress.completed / row.gradingProgress.total) *
                  100,
              )
            : 0;
          return (
            <Link
              className="class-link"
              href={`/admin/classes/${row.id}`}
              key={row.id}
            >
              <Card hover className="teacher-class-card">
                <div className="teacher-class-card-head">
                  <span className="badge badge-info">{row.code}</span>
                  <MiniProgressRing percentage={pct} />
                </div>
                <div>
                  <h2>{row.name}</h2>
                  <p className="muted">
                    {row.studentCount} sinh viên · {row.assignmentCount} bài tập
                  </p>
                </div>
                <ProgressBar
                  value={row.gradingProgress.completed}
                  max={row.gradingProgress.total}
                  showLabel
                />
              </Card>
            </Link>
          );
        })}
      </div>

      {pages > 1 && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            marginTop: "32px",
          }}
        >
          <Link
            className="btn btn-outline"
            aria-disabled={meta.page === 1}
            href={pageHref(Math.max(1, meta.page - 1))}
          >
            Trang trước
          </Link>
          <span className="pagination-summary">
            {meta.page} / {pages}
          </span>
          <Link
            className="btn btn-outline"
            aria-disabled={meta.page === pages}
            href={pageHref(Math.min(pages, meta.page + 1))}
          >
            Trang sau
          </Link>
        </div>
      )}

      {!rows.length ? (
        <div className="teacher-empty-state">
          <span className="student-icon-tile blue">
            <AppIcon name="classes" size={22} />
          </span>
          <p>Chưa có lớp phù hợp. Tạo lớp đầu tiên để bắt đầu.</p>
        </div>
      ) : null}
    </div>
  );
}
