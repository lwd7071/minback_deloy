"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { AppIcon, type AppIconName } from "@/components/ui/app-icon";
import { NotificationBell } from "@/components/ui/notification-bell";

import { StudentAssignmentModal } from "@/components/assignments/student/student-assignment-modal";
import { useNotificationPolling } from "@/components/notifications/student/use-notification-polling";

export type StudentProfileAssignment = {
  id: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  status: "draft" | "published" | "closed";
  maxScore: number;
  createdAt: string;
  updatedAt: string;
  attachments: Array<{
    id: string;
    originalName: string;
    bytes: number;
    format: string;
    downloadUrl: string;
  }>;
  submission: {
    attemptCount: number;
    latestAttempt: {
      id: string;
      attemptNumber: number;
      submittedAt: string;
      isLate: boolean;
      files: Array<{
        id: string;
        originalName: string;
        bytes: number;
        format: string;
        uploadedAt: string;
        downloadUrl: string;
      }>;
    } | null;
  };
  evaluation: {
    id: string;
    score: number | null;
    feedback: string;
    status: "pending" | "graded" | "returned";
    createdAt: string;
    updatedAt: string;
  } | null;
};

type StudentProfileDto = {
  student: { mssv: string; fullName: string; nickname: string };
  classSection: { id: string; code: string; name: string };
  progress: { completed: number; total: number; percentage: number };
  submissionProgress: { completed: number; total: number; percentage: number };
  assignments: StudentProfileAssignment[];
};

type ApiResult<T> = { data: T } | { error: { message: string } };

type RecentActivity = {
  id: string;
  icon: AppIconName;
  tone: "blue" | "green";
  label: string;
  occurredAt: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatRelativeDate(value: string, now: number) {
  const delta = new Date(value).getTime() - now;
  const absolute = Math.abs(delta);
  const future = delta > 0;
  const units = [
    { limit: 60_000, divisor: 1_000, name: "giây" },
    { limit: 3_600_000, divisor: 60_000, name: "phút" },
    { limit: 86_400_000, divisor: 3_600_000, name: "giờ" },
    { limit: Number.POSITIVE_INFINITY, divisor: 86_400_000, name: "ngày" },
  ];
  const unit = units.find((candidate) => absolute < candidate.limit)!;
  const amount = Math.max(1, Math.round(absolute / unit.divisor));
  return future ? `còn ${amount} ${unit.name}` : `${amount} ${unit.name} trước`;
}

function getAssignmentStatus(assignment: StudentProfileAssignment) {
  if (assignment.evaluation?.status === "returned") {
    return { className: "pill returned", label: "Đã trả kết quả" };
  }
  if (assignment.evaluation?.status === "graded") {
    return { className: "pill graded", label: "Đã chấm" };
  }
  if (assignment.submission.latestAttempt) {
    return { className: "pill submitted", label: "Đã nộp" };
  }
  if (assignment.status === "closed") {
    return { className: "pill closed", label: "Đã đóng" };
  }
  return { className: "pill overdue", label: "Chưa nộp" };
}

function ProgressRing({ percentage }: { percentage: number }) {
  const size = 104;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - percentage / 100);

  return (
    <div
      className="student-progress-ring"
      aria-label={`Tiến độ chấm ${percentage}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--surface-muted)"
          strokeWidth="10"
          fill="none"
        />
        <circle
          className="student-progress-ring-value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <strong>{percentage}%</strong>
    </div>
  );
}

function DashboardMetric({
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
    <div className="student-metric">
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

export function StudentProfileView({ classCode }: { classCode: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(null);
  const [referenceTime] = useState(() => Date.now());
  const notificationState = useNotificationPolling();

  useEffect(() => {
    let active = true;

    fetch("/api/v1/student/profile", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          let message = "Không thể tải hồ sơ học tập";
          try {
            const body = (await response.json()) as {
              error?: { message?: string };
            };
            if (body.error?.message) message = body.error.message;
          } catch {
            // The fallback above is intentionally used for non-JSON responses.
          }
          throw new Error(message);
        }
        const body = (await response.json()) as ApiResult<StudentProfileDto>;
        if (!("data" in body)) throw new Error("Dữ liệu không hợp lệ");
        return body.data;
      })
      .then((data) => {
        if (!active) return;
        if (classCode && data.classSection.code !== classCode.toUpperCase()) {
          router.replace(
            `/class/${encodeURIComponent(data.classSection.code)}/profile`,
          );
          return;
        }
        setProfile(data);
      })
      .catch((fetchError: unknown) => {
        if (active) {
          setError(
            fetchError instanceof Error ? fetchError.message : "Lỗi kết nối",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshKey, classCode, router]);

  async function handleLogout() {
    try {
      await fetch("/api/v1/student/auth/logout", { method: "POST" });
    } finally {
      setProfile(null);
      router.replace(`/class/${encodeURIComponent(classCode)}/login`);
    }
  }

  const dashboard = useMemo(() => {
    if (!profile) return null;
    const scores = profile.assignments
      .filter(
        (assignment) =>
          assignment.evaluation?.score !== null &&
          assignment.evaluation?.score !== undefined &&
          (assignment.evaluation.status === "graded" ||
            assignment.evaluation.status === "returned"),
      )
      .map(
        (assignment) =>
          (assignment.evaluation!.score! / assignment.maxScore) * 100,
      );
    const averageScore = scores.length
      ? Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length,
        )
      : null;
    const submitted = profile.assignments.filter(
      (assignment) => assignment.submission.latestAttempt !== null,
    ).length;
    const graded = profile.assignments.filter(
      (assignment) =>
        assignment.evaluation?.status === "graded" ||
        assignment.evaluation?.status === "returned",
    ).length;
    const upcoming = profile.assignments
      .filter(
        (assignment) =>
          assignment.status === "published" &&
          !assignment.submission.latestAttempt &&
          new Date(assignment.dueDate).getTime() > referenceTime,
      )
      .sort(
        (left, right) =>
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
      )[0];
    const recentActivities: RecentActivity[] = profile.assignments
      .flatMap((assignment) => {
        const activities: RecentActivity[] = [];
        if (assignment.submission.latestAttempt) {
          activities.push({
            id: `submission-${assignment.submission.latestAttempt.id}`,
            icon: "upload",
            tone: "blue",
            label: `Bạn đã nộp bài “${assignment.title}”`,
            occurredAt: assignment.submission.latestAttempt.submittedAt,
          });
        }
        if (
          assignment.evaluation?.status === "graded" ||
          assignment.evaluation?.status === "returned"
        ) {
          activities.push({
            id: `evaluation-${assignment.evaluation.id}`,
            icon: "fileCheck",
            tone: "green",
            label: `Giảng viên đã chấm bài “${assignment.title}”`,
            occurredAt: assignment.evaluation.updatedAt,
          });
        }
        return activities;
      })
      .sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() -
          new Date(left.occurredAt).getTime(),
      )
      .slice(0, 4);

    return {
      averageScore,
      submitted,
      graded,
      notSubmitted: profile.assignments.length - submitted,
      upcoming,
      recentActivities,
    };
  }, [profile, referenceTime]);

  if (loading) {
    return (
      <div className="student-dashboard-state" aria-live="polite">
        <span className="student-loading-mark" />
        <p>Đang chuẩn bị dashboard của bạn…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-dashboard-state">
        <p className="form-error" role="alert">
          {error}
        </p>
        <button className="button button-secondary" onClick={handleLogout}>
          Về trang đăng nhập
        </button>
      </div>
    );
  }

  if (!profile || !dashboard) return null;

  const { student, classSection, progress, assignments } = profile;

  return (
    <div className="student-dashboard">
      <header className="app-topbar student-dashboard-header">
        <div className="who">
          <Avatar name={student.fullName} size={52} />
          <div>
            <div className="student-name-line">
              <span className="name">{student.fullName}</span>
              <span className="badge badge-info">Sinh viên</span>
            </div>
            <div className="class-tag">
              {student.mssv} · {classSection.code}
            </div>
          </div>
        </div>
        <div className="profile-actions">
          <NotificationBell
            unreadCount={notificationState.unreadCount}
            notifications={notificationState.notifications.slice(0, 50)}
            onMarkRead={(id) => void notificationState.markAsRead(id)}
          />
          <button
            className="btn btn-secondary"
            onClick={() => void handleLogout()}
          >
            <AppIcon name="logout" size={17} />
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="student-dashboard-grid">
        <aside className="student-overview-card">
          <p className="eyebrow">Tổng quan tiến độ</p>
          <div className="student-progress-summary">
            <ProgressRing percentage={progress.percentage} />
            <div>
              <strong>Tiến độ chung</strong>
              <span>
                {progress.completed} / {progress.total} bài đã chấm
              </span>
            </div>
          </div>
          <div className="student-overview-stats">
            <div>
              <span className="student-icon-tile blue">
                <AppIcon name="star" size={18} />
              </span>
              <span>Điểm trung bình</span>
              <strong>
                {dashboard.averageScore === null
                  ? "—"
                  : `${dashboard.averageScore}%`}
              </strong>
            </div>
            <div>
              <span className="student-icon-tile green">
                <AppIcon name="check" size={18} />
              </span>
              <span>Bài đã nộp</span>
              <strong>
                {dashboard.submitted} / {assignments.length}
              </strong>
            </div>
            <div>
              <span className="student-icon-tile amber">
                <AppIcon name="clock" size={18} />
              </span>
              <span>Bài chưa nộp</span>
              <strong>{dashboard.notSubmitted}</strong>
            </div>
          </div>
          <div className="student-next-deadline">
            <span className="student-icon-tile blue">
              <AppIcon name="calendar" size={18} />
            </span>
            <div>
              <span>Hạn nộp gần nhất</span>
              {dashboard.upcoming ? (
                <>
                  <strong>{dashboard.upcoming.title}</strong>
                  <small>
                    {dateTimeFormatter.format(
                      new Date(dashboard.upcoming.dueDate),
                    )}
                  </small>
                  <span className="badge badge-info">
                    {formatRelativeDate(
                      dashboard.upcoming.dueDate,
                      referenceTime,
                    )}
                  </span>
                </>
              ) : (
                <strong>Không có bài đang chờ nộp</strong>
              )}
            </div>
          </div>
        </aside>

        <section className="student-class-card">
          <div className="student-class-heading">
            <span className="student-class-icon">
              <AppIcon name="book" size={30} />
            </span>
            <div>
              <p className="eyebrow">Tiến độ lớp</p>
              <h1>{classSection.code}</h1>
              <p>{classSection.name}</p>
            </div>
          </div>

          <div className="student-metrics-grid">
            <DashboardMetric
              icon="book"
              tone="blue"
              label="Bài tập"
              value={assignments.length}
            />
            <DashboardMetric
              icon="check"
              tone="green"
              label="Đã nộp"
              value={dashboard.submitted}
            />
            <DashboardMetric
              icon="fileCheck"
              tone="blue"
              label="Đã chấm"
              value={dashboard.graded}
            />
            <DashboardMetric
              icon="clock"
              tone="amber"
              label="Chưa nộp"
              value={dashboard.notSubmitted}
            />
            <DashboardMetric
              icon="star"
              tone="violet"
              label="Điểm TB"
              value={
                dashboard.averageScore === null
                  ? "—"
                  : `${dashboard.averageScore}%`
              }
            />
          </div>

          <div className="student-assignment-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Danh sách bài tập</p>
                <h2>Bài tập của bạn</h2>
              </div>
              <span className="muted">{assignments.length} bài</span>
            </div>
            {assignments.length === 0 ? (
              <div className="empty-state">
                <AppIcon name="book" size={24} />
                <p>Chưa có bài tập nào được giao trong lớp này.</p>
              </div>
            ) : (
              <div className="student-assignment-table-wrap">
                <table className="student-assignment-table">
                  <thead>
                    <tr>
                      <th>Bài tập</th>
                      <th>Hạn nộp</th>
                      <th>Trạng thái</th>
                      <th>Điểm</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => {
                      const status = getAssignmentStatus(assignment);
                      const score = assignment.evaluation?.score;
                      const shouldSubmit =
                        !assignment.submission.latestAttempt &&
                        assignment.status === "published";
                      return (
                        <tr key={assignment.id}>
                          <td>
                            <span
                              className={`assignment-leading-icon ${
                                assignment.submission.latestAttempt
                                  ? "complete"
                                  : "waiting"
                              }`}
                            >
                              <AppIcon
                                name={
                                  assignment.submission.latestAttempt
                                    ? "check"
                                    : "clock"
                                }
                                size={18}
                              />
                            </span>
                            <button
                              className="assignment-title-button"
                              onClick={() =>
                                setSelectedAssignmentId(assignment.id)
                              }
                            >
                              {assignment.title}
                            </button>
                          </td>
                          <td>
                            {dateTimeFormatter.format(
                              new Date(assignment.dueDate),
                            )}
                          </td>
                          <td>
                            <span className={status.className}>
                              {status.label}
                            </span>
                          </td>
                          <td className="student-score-cell">
                            {score === null || score === undefined
                              ? "—"
                              : `${score} / ${assignment.maxScore}`}
                          </td>
                          <td>
                            <button
                              className={
                                shouldSubmit
                                  ? "btn btn-primary btn-sm"
                                  : "student-row-action"
                              }
                              aria-label={`${shouldSubmit ? "Nộp" : "Xem"} bài ${assignment.title}`}
                              onClick={() =>
                                setSelectedAssignmentId(assignment.id)
                              }
                            >
                              {shouldSubmit ? (
                                "Nộp bài"
                              ) : (
                                <AppIcon name="eye" size={18} />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="student-dashboard-footer-grid">
        <section className="student-feed-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Dòng thời gian</p>
              <h2>Hoạt động gần đây</h2>
            </div>
          </div>
          {dashboard.recentActivities.length ? (
            <div className="student-feed-list">
              {dashboard.recentActivities.map((activity) => (
                <div key={activity.id} className="student-feed-item">
                  <span className={`student-icon-tile ${activity.tone}`}>
                    <AppIcon name={activity.icon} size={16} />
                  </span>
                  <span>{activity.label}</span>
                  <time dateTime={activity.occurredAt}>
                    {formatRelativeDate(activity.occurredAt, referenceTime)}
                  </time>
                </div>
              ))}
            </div>
          ) : (
            <div className="student-feed-empty">
              Hoạt động nộp bài và chấm điểm sẽ xuất hiện tại đây.
            </div>
          )}
        </section>

        <section className="student-feed-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Cập nhật</p>
              <h2>Thông báo</h2>
            </div>
            {notificationState.unreadCount ? (
              <span className="badge badge-error">
                {notificationState.unreadCount} chưa đọc
              </span>
            ) : null}
          </div>
          {notificationState.loading ? (
            <p className="muted">Đang tải thông báo…</p>
          ) : notificationState.error ? (
            <p className="form-error">{notificationState.error}</p>
          ) : notificationState.notifications.length ? (
            <div className="student-feed-list">
              {notificationState.notifications.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  className="student-feed-item student-notification-row"
                  onClick={() => void notificationState.markAsRead(item.id)}
                >
                  <span className="student-icon-tile blue">
                    <AppIcon name="bell" size={16} />
                  </span>
                  <span>{item.message}</span>
                  <time dateTime={item.createdAt}>
                    {formatRelativeDate(item.createdAt, referenceTime)}
                  </time>
                  {!item.readAt ? <i aria-hidden="true" /> : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="student-feed-empty">Bạn chưa có thông báo nào.</div>
          )}
        </section>
      </div>

      {assignments.map((assignment) => (
        <StudentAssignmentModal
          key={assignment.id}
          assignment={assignment}
          open={selectedAssignmentId === assignment.id}
          onClose={() => setSelectedAssignmentId(null)}
          onSubmitted={() => {
            setRefreshKey((value) => value + 1);
            setSelectedAssignmentId(null);
          }}
        />
      ))}
    </div>
  );
}
