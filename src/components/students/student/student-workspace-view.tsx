"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { StudentAssignmentModal } from "@/components/assignments/student/student-assignment-modal";
import { useNotificationPolling } from "@/components/notifications/student/use-notification-polling";
import { useStudentWorkspace } from "@/components/layout/student/student-workspace";
import { AppIcon } from "@/components/ui/app-icon";
import { Card } from "@/components/ui/card";
import { formatDeadlineInfo } from "@/lib/deadline-utils";

export type Section =
  "overview" | "assignments" | "submissions" | "grades" | "notifications";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function StudentWorkspaceView({ section }: { section: Section }) {
  const { profile, loading, error, refresh } = useStudentWorkspace();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(null);
  const notifications = useNotificationPolling();

  const selected = profile?.assignments.find(
    (assignment) => assignment.id === selectedAssignmentId,
  );
  const summary = useMemo(() => {
    if (!profile) return null;
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
          !assignment.submission.latestAttempt,
      )
      .sort(
        (left, right) =>
          new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime(),
      )[0];
    return { submitted, graded, upcoming };
  }, [profile]);

  if (loading)
    return <div className="workspace-state">Đang tải không gian học tập…</div>;
  if (error || !profile || !summary) {
    return (
      <div className="workspace-state">
        <p className="form-error">{error ?? "Không thể tải dữ liệu"}</p>
        <button className="btn btn-primary" onClick={() => void refresh()}>
          Tải lại
        </button>
      </div>
    );
  }

  const assignments = profile.assignments;

  return (
    <div className="student-workspace-view">
      <header className="workspace-topbar">
        <div className="workspace-person">
          <span className="workspace-avatar">
            {profile.student.fullName.slice(0, 1)}
          </span>
          <div>
            <p className="eyebrow">{profile.classSection.code}</p>
            <h1>
              {section === "overview"
                ? `Chào ${profile.student.fullName.split(" ").at(-1)}!`
                : navigationTitle(section)}
            </h1>
          </div>
        </div>
        <span className="workspace-user-meta">{profile.student.mssv}</span>
      </header>

      {section === "overview" ? (
        <>
          <section className="student-summary-strip">
            <div className="student-class-signature">
              <span className="signature-icon">
                <AppIcon name="book" size={28} />
              </span>
              <div>
                <span>Tiến độ lớp</span>
                <strong>{profile.classSection.code}</strong>
                <small>{profile.classSection.name}</small>
              </div>
            </div>
            <Metric
              icon="book"
              label="Bài tập"
              value={profile.assignments.length}
            />
            <Metric icon="upload" label="Đã nộp" value={summary.submitted} />
            <Metric icon="check" label="Đã chấm" value={summary.graded} />
            <Metric
              icon="star"
              label="Tiến độ"
              value={`${profile.progress.percentage}%`}
            />
          </section>
          <div className="student-dashboard-panels">
            <Card className="workspace-panel">
              <PanelTitle
                icon="book"
                title="Bài tập gần đây"
                href={`/class/${profile.classSection.code}/assignments`}
              />
              <AssignmentRows
                assignments={profile.assignments.slice(0, 4)}
                onSelect={setSelectedAssignmentId}
              />
            </Card>
            <Card className="workspace-panel deadline-panel">
              <PanelTitle icon="clock" title="Hạn nộp gần nhất" />
              {summary.upcoming ? (
                <>
                  <strong style={{ fontSize: "1.1rem" }}>{summary.upcoming.title}</strong>
                  <p style={{ margin: "6px 0 10px 0" }}>
                    Hạn chốt:{" "}
                    <strong style={{ color: "var(--navy-900)" }}>
                      {formatDeadlineInfo(summary.upcoming.dueDate).formattedShort}
                    </strong>
                  </p>
                  <span
                    className={`badge ${
                      formatDeadlineInfo(summary.upcoming.dueDate).urgency === "urgent"
                        ? "badge-danger"
                        : formatDeadlineInfo(summary.upcoming.dueDate).urgency === "warning"
                        ? "badge-warning"
                        : "badge-neutral"
                    }`}
                    style={{ marginBottom: "14px", width: "fit-content", display: "inline-block" }}
                  >
                    ⏳ {formatDeadlineInfo(summary.upcoming.dueDate).timeRemainingNotice}
                  </span>
                  <div>
                    <button className="btn btn-primary" onClick={() => setSelectedAssignmentId(summary.upcoming.id)}>
                      Nộp bài ngay
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted">Bạn không có bài đang chờ nộp.</p>
              )}
            </Card>
          </div>
        </>
      ) : section === "notifications" ? (
        <Card className="workspace-panel notification-page">
          <PanelTitle icon="bell" title="Thông báo" />
          {notifications.notifications.length ? (
            notifications.notifications.map((item) => (
              <button className="notification-item" key={item.id} onClick={() => void notifications.markAsRead(item.id)}>
                <span>{item.message}</span>
                <small>{formatDate(item.createdAt)}</small>
              </button>
            ))
          ) : (
            <p className="muted">Chưa có thông báo nào.</p>
          )}
        </Card>
      ) : (
        <Card className="workspace-panel workspace-table-panel">
          <PanelTitle
            icon={
              section === "assignments"
                ? "book"
                : section === "submissions"
                  ? "upload"
                  : section === "grades"
                    ? "gradebook"
                    : "bell"
            }
            title={navigationTitle(section)}
          />
          <AssignmentRows
            assignments={
              section === "submissions"
                ? assignments.filter((a) => a.submission.latestAttempt !== null)
                : section === "grades"
                  ? assignments.filter((a) => a.evaluation !== null)
                  : assignments
            }
            onSelect={setSelectedAssignmentId}
          />
        </Card>
      )}
      {selected ? (
        <StudentAssignmentModal
          assignment={selected}
          open
          onClose={() => setSelectedAssignmentId(null)}
          onSubmitted={() => {
            setSelectedAssignmentId(null);
            void refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function navigationTitle(section: Exclude<Section, "overview">) {
  const titles: Record<Exclude<Section, "overview">, string> = {
    assignments: "Bài tập",
    submissions: "Bài đã nộp",
    grades: "Bảng điểm",
    notifications: "Thông báo",
  };
  return titles[section];
}

function Metric({ icon, label, value }: { icon: "book" | "upload" | "check" | "star"; label: string; value: string | number }) {
  return (
    <div className="workspace-metric">
      <AppIcon name={icon} size={21} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function PanelTitle({ icon, title, href }: { icon: "book" | "clock" | "gradebook" | "bell" | "upload"; title: string; href?: string }) {
  return (
    <div className="workspace-panel-title">
      <span>
        <AppIcon name={icon} size={19} />
        {title}
      </span>
      {href ? <Link href={href}>Xem tất cả</Link> : null}
    </div>
  );
}

function AssignmentRows({
  assignments,
  mode = "assignments",
  onSelect,
}: {
  assignments: StudentProfileAssignment[];
  mode?: "assignments" | "grades";
  onSelect: (id: string) => void;
}) {
  if (!assignments.length)
    return <p className="muted">Chưa có dữ liệu để hiển thị.</p>;
  return (
    <div className="workspace-assignment-list">
      {assignments.map((assignment) => {
        const deadline = formatDeadlineInfo(assignment.dueDate);
        return (
          <button
            key={assignment.id}
            className="workspace-assignment-row"
            onClick={() => onSelect(assignment.id)}
            aria-label={`Xem chi tiết bài tập ${assignment.title}`}
            type="button"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "3px", textAlign: "left" }}>
              <strong style={{ fontSize: "0.95rem" }}>{assignment.title}</strong>
              <div className="assignment-badge-cluster">
                <small style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                  Hạn chốt: <strong style={{ color: "var(--navy-900)" }}>{deadline.formattedShort}</strong>
                </small>
                {assignment.attachments && assignment.attachments.length > 0 ? (
                  <span className="assignment-attachment-badge">
                    📎 {assignment.attachments.length} tài liệu
                  </span>
                ) : null}
                <span
                  className="badge badge-neutral"
                  style={{ fontSize: "0.72rem", padding: "1px 6px" }}
                >
                  Thang {assignment.maxScore}đ
                </span>
                {!assignment.submission.latestAttempt && !deadline.isExpired ? (
                  <span
                    className={`badge ${
                      deadline.urgency === "urgent"
                        ? "badge-danger"
                        : deadline.urgency === "warning"
                        ? "badge-warning"
                        : "badge-neutral"
                    }`}
                    style={{ fontSize: "0.7rem", padding: "1px 6px" }}
                  >
                    {deadline.timeRemainingNotice}
                  </span>
                ) : null}
              </div>
            </div>
            <span
              className={`workspace-status ${assignment.submission.latestAttempt ? "is-complete" : "is-pending"}`}
            >
              {assignment.evaluation
                ? assignment.evaluation.score !== null
                  ? `${assignment.evaluation.score} điểm`
                  : "Đang chấm"
                : assignment.submission.latestAttempt
                ? "Đã nộp"
                : "Chưa nộp"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type StudentProfileAssignment = NonNullable<
  ReturnType<typeof useStudentWorkspace>["profile"]
>["assignments"][number];
