"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SearchInput } from "@/components/ui/search-input";
import { AppIcon } from "@/components/ui/app-icon";
import type { ClassSectionSummaryDto } from "@/types/frontend-rebuild";
export function ClassSummaryDashboard() {
  const [rows, setRows] = useState<ClassSectionSummaryDto[]>([]);
  const [search, setSearch] = useState("");
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
    <div className="stack">
      <div className="split">
        <div>
          <h1>Lớp học phần</h1>
        </div>
        <Link className="btn btn-primary" href="/admin/classes/new">
          + Tạo lớp mới
        </Link>
      </div>
      <div className="stats-strip" aria-label="Tổng quan lớp học">
        <div className="stat-cell">
          <AppIcon name="classes" size={18} />
          <strong>{rows.length}</strong>
          <span>Lớp</span>
        </div>
        <div className="stat-cell">
          <AppIcon name="students" size={18} />
          <strong>{totalStudents}</strong>
          <span>Sinh viên</span>
        </div>
        <div className="stat-cell">
          <AppIcon name="book" size={18} />
          <strong>{totalAssignments}</strong>
          <span>Bài mở</span>
        </div>
        <div className="stat-cell">
          <AppIcon name="check" size={18} />
          <strong>{avgGradingProgress}%</strong>
          <span>Đã chấm</span>
        </div>
      </div>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Tìm theo mã hoặc tên lớp"
      />
      {error ? <p className="form-error">{error}</p> : null}
      <div className="grid">
        {visible.map((row) => (
          <Link
            className="class-link"
            href={`/admin/classes/${row.id}`}
            key={row.id}
          >
            <Card hover className="class-card stack">
              <span className="badge badge-info">{row.code}</span>
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
        ))}
      </div>
      {!error && !visible.length ? (
        <Card>
          <p className="muted">
            Chưa có lớp phù hợp. Tạo lớp đầu tiên để bắt đầu.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
