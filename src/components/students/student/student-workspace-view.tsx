"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useNotificationPolling } from "@/components/notifications/student/use-notification-polling";
import { useStudentWorkspace } from "@/components/layout/student/student-workspace";
import { AppIcon } from "@/components/ui/app-icon";
import { Card } from "@/components/ui/card";
import { IntentPrefetchLink } from "@/components/ui/intent-prefetch-link";
import type { StudentResultDto } from "@/types/student-results";

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
  initialResults = [],
}: {
  section: Section;
  initialAssignmentId?: string;
  initialResults?: StudentResultDto[];
}) {
  const { identity, loading, refresh } = useStudentWorkspace();
  const router = useRouter();
  const notifications = useNotificationPolling();
  const [results] = useState<StudentResultDto[]>(initialResults);
  const [selectedId, setSelectedId] = useState(initialAssignmentId ?? null);
  const [search, setSearch] = useState("");

  const filteredResults = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return results.filter((result) =>
      keyword ? result.assignmentTitle.toLowerCase().includes(keyword) : true,
    );
  }, [results, search]);

  const selected =
    results.find((result) => result.assignmentId === selectedId) ?? null;

  if (loading) {
    return (
      <div className="workspace-state" aria-busy="true">
        Đang tải kết quả học tập…
      </div>
    );
  }
  if (!identity) {
    return (
      <div className="workspace-state">
        <p className="form-error">Không thể tải dữ liệu</p>
        <button className="btn btn-primary" onClick={() => refresh()}>
          Tải lại
        </button>
      </div>
    );
  }

  const average = results.length
    ? Math.round(
        (results.reduce(
          (sum, result) =>
            sum +
            (result.score === null
              ? 0
              : (result.score / result.maxScore) * 100),
          0,
        ) /
          results.length) *
          10,
      ) / 10
    : null;

  return (
    <div className="student-workspace-view">
      <header className="workspace-topbar">
        <div className="workspace-person">
          <span className="workspace-avatar">
            {identity.student.fullName.slice(0, 1)}
          </span>
          <div>
            <p className="eyebrow">{identity.classSection.code}</p>
            <h1>
              {section === "overview"
                ? `Chào ${identity.student.fullName.split(" ").at(-1)}!`
                : navigationTitle(section)}
            </h1>
          </div>
        </div>
        <span className="workspace-user-meta">{identity.student.mssv}</span>
      </header>

      {section === "notifications" ? (
        <Card className="workspace-panel notification-page">
          <PanelTitle icon="bell" title="Thông báo" />
          {notifications.notifications.length ? (
            notifications.notifications.map((item) => (
              <button
                className="notification-item"
                key={item.id}
                onClick={() => {
                  void notifications.markAsRead(item.id);
                  if (item.assignmentId) {
                    router.push(
                      `/class/${encodeURIComponent(identity.classSection.code)}/grades?assignment=${encodeURIComponent(item.assignmentId)}`,
                    );
                  }
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
      ) : section === "overview" ? (
        <>
          <section
            className="student-summary-cards"
            aria-label="Tổng quan lớp học"
          >
            <Card className="stat-card student-class-card">
              <span className="signature-icon">
                <AppIcon name="book" size={28} />
              </span>
              <div>
                <strong>{identity.classSection.code}</strong>
                <small>{identity.classSection.name}</small>
              </div>
            </Card>
            <Card className="stat-card">
              <strong>{results.length}</strong>
              <span className="muted">Đã công bố</span>
            </Card>
            <Card className="stat-card">
              <strong>{average === null ? "—" : `${average}%`}</strong>
              <span className="muted">Điểm trung bình</span>
            </Card>
          </section>
          <Card className="workspace-panel">
            <PanelTitle
              icon="check"
              title="Kết quả gần đây"
              href={`/class/${identity.classSection.code}/grades`}
            />
            <ResultRows
              results={results.slice(0, 4)}
              onSelect={setSelectedId}
            />
          </Card>
        </>
      ) : (
        <Card className="workspace-panel workspace-table-panel">
          <PanelTitle icon="gradebook" title="Kết quả" />
          <input
            className="form-input"
            placeholder="Tìm theo tên bài tập…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <ResultRows results={filteredResults} onSelect={setSelectedId} />
        </Card>
      )}

      {selected ? (
        <ResultDetail result={selected} onClose={() => setSelectedId(null)} />
      ) : null}
    </div>
  );
}

function navigationTitle(section: Exclude<Section, "overview">) {
  return section === "notifications" ? "Thông báo" : "Kết quả";
}

function PanelTitle({
  icon,
  title,
  href,
}: {
  icon: "book" | "gradebook" | "bell" | "check";
  title: string;
  href?: string;
}) {
  return (
    <div className="workspace-panel-title">
      <span>
        <AppIcon name={icon} size={19} />
        {title}
      </span>
      {href ? (
        <IntentPrefetchLink href={href}>Xem tất cả</IntentPrefetchLink>
      ) : null}
    </div>
  );
}

function ResultRows({
  results,
  onSelect,
}: {
  results: StudentResultDto[];
  onSelect: (id: string) => void;
}) {
  if (!results.length) {
    return <p className="muted">Chưa có kết quả được công bố.</p>;
  }
  return (
    <div className="workspace-assignment-list">
      {results.map((result) => (
        <button
          key={result.assignmentId}
          className="workspace-assignment-row"
          onClick={() => onSelect(result.assignmentId)}
          type="button"
        >
          <strong>{result.assignmentTitle}</strong>
          <span className="workspace-status is-complete">
            {result.score === null
              ? "—"
              : `${result.score} / ${result.maxScore} điểm`}
          </span>
        </button>
      ))}
    </div>
  );
}

function ResultDetail({
  result,
  onClose,
}: {
  result: StudentResultDto;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
        <h2 id="result-title">{result.assignmentTitle}</h2>
        <p className="student-result-score">
          {result.score === null ? "—" : `${result.score} / ${result.maxScore}`}
        </p>
        <p className="muted">Đã công bố {formatDate(result.returnedAt)}</p>
        <div className="form-notice">
          <strong>Feedback</strong>
          <p>{result.feedback || "Giảng viên chưa thêm feedback."}</p>
        </div>
      </div>
    </div>
  );
}
