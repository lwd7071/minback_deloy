"use client";
import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppIcon } from "@/components/ui/app-icon";
import { MiniProgressRing } from "./class-summary-dashboard";
import type {
  DashboardActivityItem,
  PendingGradingItem,
} from "@/server/repositories/teacher-dashboard-repository";

export type DashboardOverviewData = {
  metrics: {
    classCount: number;
    studentCount: number;
    assignmentCount: number;
    gradingPercentage: number;
  };
  pendingGrading: PendingGradingItem[];
  classProgress: {
    classSectionId: string;
    classCode: string;
    className: string;
    completed: number;
    total: number;
    percentage: number;
  }[];
  classProgressMeta: { page: number; pageSize: number; total: number };
  recentActivity: DashboardActivityItem[];
};

function timeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " năm trước";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " tháng trước";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " ngày trước";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " giờ trước";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " phút trước";
  return "Vừa xong";
}

export function TeacherOverviewDashboard({
  data,
}: {
  data: DashboardOverviewData;
}) {
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PAGE_SIZE = 5;
  const classProgressPages = Math.max(
    1,
    Math.ceil(data.classProgressMeta.total / data.classProgressMeta.pageSize),
  );

  return (
    <div className="teacher-dash">
      <PageHeader
        eyebrow="Tổng quan"
        title="Bảng điều khiển"
        description="Theo dõi tiến độ chấm và công bố phản hồi cho các lớp học phần."
      />

      <div className="teacher-metrics-grid" aria-label="Tổng quan lớp học">
        <StatCard label="Lớp" value={data.metrics.classCount}>
          <AppIcon name="classes" size={19} />
        </StatCard>
        <StatCard label="Sinh viên" value={data.metrics.studentCount}>
          <AppIcon name="students" size={19} />
        </StatCard>
        <StatCard label="Bài cần xử lý" value={data.pendingGrading.length}>
          <AppIcon name="gradebook" size={19} />
        </StatCard>
        <StatCard
          label="Đã công bố"
          value={`${data.metrics.gradingPercentage}%`}
        >
          <AppIcon name="check" size={19} />
        </StatCard>
      </div>

      <div className="teacher-overview-panels">
        {/* Left column: Pending Grading */}
        <section className="overview-panel">
          <h2 className="overview-panel-title">
            <AppIcon name="gradebook" size={20} />
            Bài cần chấm
          </h2>
          {data.pendingGrading.length > 0 ? (
            <div className="pending-grading-list">
              {data.pendingGrading.map((item) => {
                return (
                  <Link
                    key={item.assignmentId}
                    href={`/admin/classes/${item.classSectionId}/assignments/${item.assignmentId}/grade`}
                    className="pending-grading-card-link"
                    aria-label={`Chấm bài tập ${item.assignmentTitle} lớp ${item.classCode} (${item.pendingCount} bài nộp chờ chấm)`}
                  >
                    <Card hover className="pending-grading-card">
                      <div className="pending-card-head">
                        <span className="badge badge-amber">
                          {item.classCode}
                        </span>
                      </div>
                      <h3>{item.assignmentTitle}</h3>
                      <div className="pending-card-footer">
                        <AppIcon name="gradebook" size={16} />
                        <strong>{item.pendingCount}</strong> kết quả cần xử lý
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="muted">Không có bài tập nào đang chờ chấm.</p>
          )}
        </section>

        {/* Right column: Class Progress */}
        <section className="overview-panel">
          <div
            className="activity-panel-header"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <h2 className="overview-panel-title" style={{ marginBottom: 0 }}>
              <AppIcon name="classes" size={20} />
              Tiến độ chấm theo lớp
            </h2>
            {classProgressPages > 1 && (
              <div
                className="activity-pagination"
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <span className="activity-page-info is-compact">
                  Trang {data.classProgressMeta.page} / {classProgressPages}
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <Link
                    href={`/admin/dashboard?classPage=${Math.max(1, data.classProgressMeta.page - 1)}`}
                    className="button button-secondary button-sm"
                    aria-disabled={data.classProgressMeta.page <= 1}
                    aria-label="Trang trước"
                  >
                    Trước
                  </Link>
                  <Link
                    href={`/admin/dashboard?classPage=${Math.min(classProgressPages, data.classProgressMeta.page + 1)}`}
                    className="button button-secondary button-sm"
                    aria-disabled={
                      data.classProgressMeta.page >= classProgressPages
                    }
                    aria-label="Trang sau"
                  >
                    Sau
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="class-progress-list">
            {data.classProgress.length > 0 ? (
              data.classProgress.map((cls) => (
                <div key={cls.classSectionId} className="class-progress-row">
                  <div className="class-progress-header">
                    <span className="class-code">{cls.classCode}</span>
                    <span className="class-name">{cls.className}</span>
                    <MiniProgressRing percentage={cls.percentage} />
                  </div>
                  <ProgressBar value={cls.completed} max={cls.total} />
                </div>
              ))
            ) : (
              <p className="muted">Chưa có lớp học nào.</p>
            )}
          </div>
        </section>
      </div>

      {/* Full width bottom panel: Recent Activity */}
      <section className="overview-panel activity-panel">
        <div className="activity-panel-header">
          <h2 className="overview-panel-title">
            <AppIcon name="clock" size={20} />
            Hoạt động gần đây ({data.recentActivity.length})
          </h2>
          {Math.ceil(data.recentActivity.length / ACTIVITY_PAGE_SIZE) > 1 && (
            <div className="activity-pagination">
              <span className="activity-page-info">
                Trang {activityPage} /{" "}
                {Math.ceil(data.recentActivity.length / ACTIVITY_PAGE_SIZE)}
              </span>
              <button
                type="button"
                className="button button-secondary button-sm"
                disabled={activityPage <= 1}
                onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                aria-label="Trang trước"
              >
                Trước
              </button>
              <button
                type="button"
                className="button button-secondary button-sm"
                disabled={
                  activityPage >=
                  Math.ceil(data.recentActivity.length / ACTIVITY_PAGE_SIZE)
                }
                onClick={() =>
                  setActivityPage((p) =>
                    Math.min(
                      Math.ceil(
                        data.recentActivity.length / ACTIVITY_PAGE_SIZE,
                      ),
                      p + 1,
                    ),
                  )
                }
                aria-label="Trang sau"
              >
                Sau
              </button>
            </div>
          )}
        </div>
        <div className="activity-feed">
          {data.recentActivity.length > 0 ? (
            data.recentActivity
              .slice(
                (activityPage - 1) * ACTIVITY_PAGE_SIZE,
                activityPage * ACTIVITY_PAGE_SIZE,
              )
              .map((activity, idx) => (
                <div key={idx} className="activity-item">
                  <div
                    className={`activity-icon-wrapper ${activity.type === "graded" ? "is-graded" : "is-submission"}`}
                  >
                    <AppIcon
                      name={activity.type === "graded" ? "check" : "upload"}
                      size={16}
                    />
                  </div>
                  <div className="activity-content">
                    <p>
                      <strong>{activity.studentName}</strong>
                      {activity.type === "graded"
                        ? " đã được chấm bài "
                        : " vừa nộp bài "}
                      <em>{activity.assignmentTitle}</em> (Lớp{" "}
                      {activity.classCode})
                    </p>
                    <span className="activity-time">
                      {timeAgo(activity.timestamp)}
                    </span>
                  </div>
                </div>
              ))
          ) : (
            <p className="muted">Chưa có hoạt động nào.</p>
          )}
        </div>
      </section>
    </div>
  );
}
