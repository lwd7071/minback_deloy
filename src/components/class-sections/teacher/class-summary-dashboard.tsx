"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
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

export function ClassSummaryDashboard() {
  const [rows, setRows] = useState<ClassSectionSummaryDto[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void fetch("/api/v1/teacher/class-section-summaries?page=1&pageSize=100", {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.data)
          throw new Error(body.error?.message ?? "Không thể tải lớp học phần");
        return body.data as ClassSectionSummaryDto[];
      })
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error ? cause.message : "Không thể tải lớp",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const visible = rows.filter((row) =>
    `${row.code} ${row.name}`.toLowerCase().includes(search.toLowerCase()),
  );

  const totalStudents = rows.reduce((acc, r) => acc + r.studentCount, 0);
  const totalAssignments = rows.reduce((acc, r) => acc + r.assignmentCount, 0);
  const totalGradingCompleted = rows.reduce(
    (acc, r) => acc + r.gradingProgress.completed,
    0,
  );
  const totalGrading = rows.reduce(
    (acc, r) => acc + r.gradingProgress.total,
    0,
  );
  const avgGradingProgress = totalGrading
    ? Math.round((totalGradingCompleted / totalGrading) * 100)
    : 0;
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
          value={rows.length}
        />
        <DashboardMetric
          icon="students"
          tone="green"
          label="Sinh viên"
          value={totalStudents}
        />
        <DashboardMetric
          icon="book"
          tone="amber"
          label="Bài mở"
          value={totalAssignments}
        />
        <DashboardMetric
          icon="check"
          tone="violet"
          label="Đã chấm"
          value={`${avgGradingProgress}%`}
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
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Tìm theo mã hoặc tên lớp"
          />
        </div>
        <Link className="btn btn-primary" href="/admin/classes/new">
          + Tạo lớp mới
        </Link>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="teacher-class-grid">
        {visible.slice((page - 1) * 6, page * 6).map((row) => {
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

      {visible.length > 6 && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            marginTop: "32px",
          }}
        >
          <button
            className="btn btn-outline"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trang trước
          </button>
          <span className="pagination-summary">
            {page} / {Math.ceil(visible.length / 6)}
          </span>
          <button
            className="btn btn-outline"
            disabled={page === Math.ceil(visible.length / 6)}
            onClick={() =>
              setPage((p) => Math.min(Math.ceil(visible.length / 6), p + 1))
            }
          >
            Trang sau
          </button>
        </div>
      )}

      {!error && !visible.length ? (
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
