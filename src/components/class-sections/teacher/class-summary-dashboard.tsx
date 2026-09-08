"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Toolbar } from "@/components/layout/toolbar";
import { AppIcon } from "@/components/ui/app-icon";
import { StatCard } from "@/components/ui/stat-card";
import type {
  ClassSectionSummaryDto,
  ClassSummaryFilterCounts,
} from "@/types/frontend-rebuild";
import type {
  ClassProgressFilter,
  ClassSummarySort,
} from "@/schemas/class-section";

type ClassListQuery = {
  search: string;
  progress: ClassProgressFilter;
  sort: ClassSummarySort;
};

export function buildClassListHref(
  query: ClassListQuery & { page?: number },
): string {
  const params = new URLSearchParams();
  if (query.search.trim()) params.set("q", query.search.trim());
  if (query.progress !== "all") params.set("progress", query.progress);
  if (query.sort !== "newest") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  return `/admin/classes${params.size ? `?${params}` : ""}`;
}

export function MiniProgressRing({ percentage }: { percentage: number }) {
  const normalizedPercentage = Math.min(100, Math.max(0, percentage));
  const size = 38;
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - normalizedPercentage / 100);

  return (
    <div
      className="teacher-mini-ring"
      aria-label={`${normalizedPercentage}% đã chấm`}
    >
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-neutral-soft)"
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
      <span>{normalizedPercentage}%</span>
    </div>
  );
}

export function ClassSummaryDashboard({
  rows,
  meta,
  metrics,
  filterCounts,
  query,
}: {
  rows: ClassSectionSummaryDto[];
  meta: { page: number; pageSize: number; total: number };
  metrics: {
    classCount: number;
    studentCount: number;
    assignmentCount: number;
    gradingPercentage: number;
    completedCount: number;
    gradingTotal: number;
  };
  filterCounts: ClassSummaryFilterCounts;
  query: ClassListQuery;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query.search);
  const pages = Math.max(1, Math.ceil(meta.total / meta.pageSize));

  useEffect(() => {
    if (search === query.search) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      router.replace(
        buildClassListHref({
          search,
          progress: query.progress,
          sort: query.sort,
        }),
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query.progress, query.search, query.sort, router, search]);

  const pageHref = (page: number) => buildClassListHref({ ...query, page });
  const filters: Array<{
    value: ClassProgressFilter;
    label: string;
  }> = [
    { value: "all", label: "Tất cả" },
    { value: "urgent", label: "Cần chấm gấp" },
    { value: "good", label: "Đang tốt" },
    { value: "complete", label: "Hoàn thành" },
  ];
  return (
    <div className="teacher-dash">
      <h1 className="sr-only">Lớp học</h1>

      <div className="teacher-metrics-grid" aria-label="Tổng quan lớp học">
        <StatCard label="Lớp" value={metrics.classCount} tone="accent">
          <AppIcon name="classes" size={19} />
        </StatCard>
        <StatCard label="Sinh viên" value={metrics.studentCount} tone="info">
          <AppIcon name="students" size={19} />
        </StatCard>
        <StatCard
          label="Bài tập"
          value={metrics.assignmentCount}
          tone="warning"
        >
          <AppIcon name="book" size={19} />
        </StatCard>
        <StatCard
          detail={`${metrics.completedCount} / ${metrics.gradingTotal} bài đã chấm`}
          label="Đã chấm"
          tone="success"
          value={`${metrics.gradingPercentage}%`}
        >
          <AppIcon name="check" size={19} />
        </StatCard>
      </div>

      <Toolbar
        search={
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo mã hoặc tên lớp"
          />
        }
        actions={
          <>
            <label className="sr-only" htmlFor="class-sort">
              Sắp xếp lớp học
            </label>
            <select
              className="form-input class-sort-select"
              id="class-sort"
              onChange={(event) =>
                router.replace(
                  buildClassListHref({
                    ...query,
                    sort: event.target.value as ClassSummarySort,
                  }),
                )
              }
              value={query.sort}
            >
              <option value="newest">Sắp xếp: Mới tạo gần nhất</option>
              <option value="progress_asc">
                Sắp xếp: % đã chấm (thấp → cao)
              </option>
              <option value="students_desc">
                Sắp xếp: Nhiều sinh viên nhất
              </option>
              <option value="name_asc">Sắp xếp: Tên A → Z</option>
            </select>
            <Link className="btn btn-primary" href="/admin/classes/new">
              + Tạo lớp mới
            </Link>
          </>
        }
      />

      <nav aria-label="Lọc lớp theo tiến độ" className="class-filter-tabs">
        {filters.map((filter) => (
          <Link
            aria-current={query.progress === filter.value ? "page" : undefined}
            className={`class-filter-tab ${query.progress === filter.value ? "is-active" : ""}`}
            href={buildClassListHref({ ...query, progress: filter.value })}
            key={filter.value}
          >
            {filter.label} ({filterCounts[filter.value]})
          </Link>
        ))}
      </nav>

      <div className="teacher-class-grid">
        {rows.map((row) => {
          const pct = row.gradingProgress.percentage;
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
                />
                <small className="class-grading-caption muted">
                  {row.gradingProgress.total > 0
                    ? `${row.gradingProgress.completed} / ${row.gradingProgress.total} bài đã chấm`
                    : "Chưa có nội dung cần chấm"}
                </small>
              </Card>
            </Link>
          );
        })}
      </div>

      {pages > 1 ? (
        <Pagination
          page={meta.page}
          pageSize={meta.pageSize}
          total={meta.total}
          onPageChange={(page) => router.push(pageHref(page))}
          showSummary={false}
        />
      ) : null}

      {!rows.length ? (
        <EmptyState
          icon="classes"
          title="Chưa có lớp phù hợp"
          description={
            metrics.classCount === 0
              ? "Tạo lớp đầu tiên để bắt đầu quản lý phản hồi."
              : "Không có lớp phù hợp với bộ lọc này."
          }
        />
      ) : null}
    </div>
  );
}
