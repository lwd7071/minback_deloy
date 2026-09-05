"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { StudentAssignmentModal } from "@/components/assignments/student/student-assignment-modal";
import { useNotificationPolling } from "@/components/notifications/student/use-notification-polling";
import { useStudentWorkspace } from "@/components/layout/student/student-workspace";
import { AppIcon } from "@/components/ui/app-icon";
import { Card } from "@/components/ui/card";
import { StudentEmailChangeForm } from "@/components/students/student/student-email-change-form";

export type Section =
  "overview" | "assignments" | "submissions" | "grades" | "notifications";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function StudentWorkspaceView({
  section,
  initialAssignmentId,
}: {
  section: Section;
  initialAssignmentId?: string;
}) {
  const { profile, loading, error, refresh } = useStudentWorkspace();
  const router = useRouter();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    string | null
  >(initialAssignmentId ?? null);
  const notifications = useNotificationPolling();

  const selected = profile?.assignments.find(
    (assignment) => assignment.id === selectedAssignmentId,
  );
  const summary = useMemo(() => {
    if (!profile) return null;
    const returned = profile.assignments.filter(
      (assignment) => assignment.evaluation?.status === "returned",
    ).length;
    return { returned };
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
            <Metric
              icon="check"
              label="Đã trả kết quả"
              value={summary.returned}
            />
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
            <Card className="workspace-panel">
              <PanelTitle icon="check" title="Kết quả gần đây" />
              <AssignmentRows
                assignments={profile.assignments
                  .filter(
                    (assignment) =>
                      assignment.evaluation?.status === "returned",
                  )
                  .slice(0, 4)}
                onSelect={setSelectedAssignmentId}
              />
            </Card>
          </div>
          <StudentEmailChangeForm />
        </>
      ) : section === "notifications" ? (
        <Card className="workspace-panel notification-page">
          <PanelTitle icon="bell" title="Thông báo" />
          {notifications.notifications.length ? (
            notifications.notifications.map((item) => (
              <button
                className="notification-item"
                key={item.id}
                onClick={() => {
                  void notifications.markAsRead(item.id);
                  if (item.evaluationId)
                    router.push(
                      `/class/${encodeURIComponent(profile.classSection.code)}/grades?assignment=${encodeURIComponent(item.evaluationId)}`,
                    );
                }}
              >
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
                : section === "grades"
                  ? "gradebook"
                  : "bell"
            }
            title={navigationTitle(section)}
          />
          <AssignmentRows
            assignments={
              section === "grades"
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
        />
      ) : null}
    </div>
  );
}

function navigationTitle(section: Exclude<Section, "overview">) {
  const titles: Record<Exclude<Section, "overview">, string> = {
    assignments: "Bài tập",
    submissions: "Bài đã chấm",
    grades: "Bảng điểm",
    notifications: "Thông báo",
  };
  return titles[section];
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: "book" | "upload" | "check" | "star";
  label: string;
  value: string | number;
}) {
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

function PanelTitle({
  icon,
  title,
  href,
}: {
  icon: "book" | "clock" | "gradebook" | "bell" | "upload" | "check";
  title: string;
  href?: string;
}) {
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
  onSelect,
}: {
  assignments: StudentProfileAssignment[];
  onSelect: (id: string) => void;
}) {
  if (!assignments.length)
    return <p className="muted">Chưa có bài tập nào được giao.</p>;
  return (
    <div className="workspace-assignment-list">
      {assignments.map((assignment) => {
        const hasReturned = assignment.evaluation?.status === "returned";
        return (
          <button
            key={assignment.id}
            className="workspace-assignment-row"
            onClick={() => onSelect(assignment.id)}
            aria-label={`Xem chi tiết bài tập ${assignment.title}`}
            type="button"
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                textAlign: "left",
              }}
            >
              <strong style={{ fontSize: "0.95rem" }}>
                {assignment.title}
              </strong>
              <div className="assignment-badge-cluster">
                <span
                  className="badge badge-neutral"
                  style={{ fontSize: "0.72rem", padding: "1px 6px" }}
                >
                  Thang {assignment.maxScore}đ
                </span>
              </div>
            </div>
            <span
              className={`workspace-status ${hasReturned ? "is-complete" : "is-pending"}`}
            >
              {hasReturned && assignment.evaluation?.score !== null
                ? `${assignment.evaluation!.score} / ${assignment.maxScore} điểm`
                : "Chưa công bố"}
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
