"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppIcon } from "@/components/ui/app-icon";
import { DashboardMetric, MiniProgressRing } from "./class-summary-dashboard";
import type { 
  DashboardActivityItem, 
  PendingGradingItem 
} from "@/server/repositories/teacher-dashboard-repository";

type DashboardOverviewData = {
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
  recentActivity: DashboardActivityItem[];
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

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

export function TeacherOverviewDashboard() {
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activityPage, setActivityPage] = useState(1);
  const ACTIVITY_PAGE_SIZE = 5;
  const [classProgressPage, setClassProgressPage] = useState(1);
  const CLASS_PROGRESS_PAGE_SIZE = 3;

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/teacher/dashboard-overview", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || !body.data)
          throw new Error(body.error?.message ?? "Không thể tải dữ liệu");
        return body.data as DashboardOverviewData;
      })
      .then((resData) => {
        if (active) setData(resData);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Đã xảy ra lỗi");
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div className="teacher-dash">
        <p className="form-error">{error}</p>
      </div>
    );
  }

  if (!data) {
    // Loading state could be added here
    return <div className="teacher-dash"><p className="muted">Đang tải...</p></div>;
  }

  return (
    <div className="teacher-dash">
      <header className="teacher-dash-header">
        <div className="teacher-dash-heading">
          <span className="teacher-dash-icon">
            <AppIcon name="study" size={28} />
          </span>
          <div>
            <h1>Tổng quan</h1>
          </div>
        </div>
      </header>

      <div className="teacher-metrics-grid" aria-label="Tổng quan lớp học">
        <DashboardMetric
          icon="classes"
          tone="blue"
          label="Lớp"
          value={data.metrics.classCount}
        />
        <DashboardMetric
          icon="students"
          tone="green"
          label="Sinh viên"
          value={data.metrics.studentCount}
        />
        <DashboardMetric
          icon="book"
          tone="amber"
          label="Bài mở"
          value={data.metrics.assignmentCount}
        />
        <DashboardMetric
          icon="check"
          tone="violet"
          label="Đã chấm"
          value={`${data.metrics.gradingPercentage}%`}
        />
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
              {data.pendingGrading.map((item) => (
                <Link
                  key={item.assignmentId}
                  href={`/admin/classes/${item.classSectionId}/assignments/${item.assignmentId}`}
                  className="pending-grading-card-link"
                >
                  <Card hover className="pending-grading-card">
                    <div className="pending-card-head">
                      <span className="badge badge-amber">{item.classCode}</span>
                      <span className="pending-deadline">Hạn: {formatDate(item.dueDate)}</span>
                    </div>
                    <h3>{item.assignmentTitle}</h3>
                    <div className="pending-card-footer">
                      <AppIcon name="upload" size={16} />
                      <strong>{item.pendingCount}</strong> bài nộp chờ chấm
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">Không có bài tập nào đang chờ chấm.</p>
          )}
        </section>

        {/* Right column: Class Progress */}
        <section className="overview-panel">
          <div className="activity-panel-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 className="overview-panel-title" style={{ marginBottom: 0 }}>
              <AppIcon name="classes" size={20} />
              Tiến độ chấm theo lớp
            </h2>
            {Math.ceil(data.classProgress.length / CLASS_PROGRESS_PAGE_SIZE) > 1 && (
              <div className="activity-pagination" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span className="activity-page-info" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                  Trang {classProgressPage} / {Math.ceil(data.classProgress.length / CLASS_PROGRESS_PAGE_SIZE)}
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    disabled={classProgressPage <= 1}
                    onClick={() => setClassProgressPage((p) => Math.max(1, p - 1))}
                    aria-label="Trang trước"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    disabled={classProgressPage >= Math.ceil(data.classProgress.length / CLASS_PROGRESS_PAGE_SIZE)}
                    onClick={() => setClassProgressPage((p) => Math.min(Math.ceil(data.classProgress.length / CLASS_PROGRESS_PAGE_SIZE), p + 1))}
                    aria-label="Trang sau"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="class-progress-list">
            {data.classProgress.length > 0 ? (
              data.classProgress
                .slice((classProgressPage - 1) * CLASS_PROGRESS_PAGE_SIZE, classProgressPage * CLASS_PROGRESS_PAGE_SIZE)
                .map((cls) => (
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
                Trang {activityPage} / {Math.ceil(data.recentActivity.length / ACTIVITY_PAGE_SIZE)}
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
                disabled={activityPage >= Math.ceil(data.recentActivity.length / ACTIVITY_PAGE_SIZE)}
                onClick={() => setActivityPage((p) => Math.min(Math.ceil(data.recentActivity.length / ACTIVITY_PAGE_SIZE), p + 1))}
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
              .slice((activityPage - 1) * ACTIVITY_PAGE_SIZE, activityPage * ACTIVITY_PAGE_SIZE)
              .map((activity, idx) => (
                <div key={idx} className="activity-item">
                  <div className={`activity-icon-wrapper ${activity.type === 'graded' ? 'is-graded' : 'is-submission'}`}>
                    <AppIcon name={activity.type === 'graded' ? "check" : "upload"} size={16} />
                  </div>
                  <div className="activity-content">
                    <p>
                      <strong>{activity.studentName}</strong> 
                      {activity.type === 'graded' ? " đã được chấm bài " : " vừa nộp bài "} 
                      <em>{activity.assignmentTitle}</em> 
                      {" "}(Lớp {activity.classCode})
                    </p>
                    <span className="activity-time">{timeAgo(activity.timestamp)}</span>
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
