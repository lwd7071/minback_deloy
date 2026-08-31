"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNotificationPolling } from "./use-notification-polling";
import { NotificationBell } from "@/components/ui/notification-bell";
import { Avatar } from "@/components/ui/avatar";

import { StudentAssignmentModal } from "./student-assignment-modal";

export type StudentProfileAssignment = {
  id: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  status: "draft" | "published" | "closed";
  maxScore: number;
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

function ProgressRing({ percentage, size = 70 }: { percentage: number; size?: number }) {
  const r = (size - 14) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percentage / 100);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#EEF1F4" strokeWidth="7" fill="none"/>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--primary)" strokeWidth="7"
          fill="none" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
      </svg>
      <div className="pct">{percentage}%</div>
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
  const notificationState = useNotificationPolling();

  useEffect(() => {
    let active = true;

    fetch("/api/v1/student/profile", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          let message = "Không thể tải hồ sơ học tập";
          try {
            const body = (await res.json()) as { error?: { message?: string } };
            if (body.error?.message) message = body.error.message;
          } catch {
            // Ignored if non-json
          }
          throw new Error(message);
        }
        const body = (await res.json()) as ApiResult<StudentProfileDto>;
        if (!("data" in body)) {
          throw new Error("Dữ liệu không hợp lệ");
        }
        return body.data;
      })
      .then((data) => {
        if (active) {
          if (classCode && data.classSection.code !== classCode.toUpperCase()) {
            router.replace(
              `/class/${encodeURIComponent(data.classSection.code)}/profile`,
            );
            return;
          }
          setProfile(data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Lỗi kết nối");
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

  if (loading) {
    return <p className="muted">Đang tải hồ sơ học tập…</p>;
  }

  if (error) {
    return (
      <div className="settings-stack">
        <p className="form-error" role="alert">
          {error}
        </p>
        <button className="button button-secondary" onClick={handleLogout}>
          Về trang đăng nhập
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const { student, classSection, progress, submissionProgress, assignments } =
    profile;
  const completedScores = assignments
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
  const averageScore = completedScores.length
    ? Math.round(
        completedScores.reduce((sum, score) => sum + score, 0) /
          completedScores.length,
      )
    : null;

  return (
    <div>
      <div className="app-topbar">
        <div className="who">
          <Avatar name={student.fullName} size={42} />
          <div>
            <div className="name">{student.fullName}</div>
            <div className="class-tag">{classSection.code} · {classSection.name}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <NotificationBell
            unreadCount={notificationState.unreadCount}
            notifications={notificationState.notifications.slice(0, 50)}
            onMarkRead={(id) => void notificationState.markAsRead(id)}
          />
          <button
            className="btn btn-secondary"
            style={{ minHeight: 36, padding: '6px 14px', fontSize: 13 }}
            onClick={() => void handleLogout()}
          >
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="sp-body">
        {/* Sidebar */}
        <div className="stack">
          <div className="card progress-card stack">
            <div className="ring-wrap" style={{ marginBottom: 16 }}>
              <ProgressRing percentage={progress.percentage} size={78} />
              <div>
                <b style={{ display: 'block', fontSize: 15, marginBottom: 2 }}>{progress.percentage}%</b>
                <span className="muted" style={{ fontSize: 13 }}>{progress.completed} / {progress.total} đã chấm</span>
              </div>
            </div>
            
            <div>
              <div className="stat-row">
                <span>Điểm TB chuẩn hóa</span>
                <span>{averageScore === null ? "—" : `${averageScore}%`}</span>
              </div>
              <div className="stat-row">
                <span>Tiến độ nộp bài</span>
                <span>{submissionProgress.completed} / {submissionProgress.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="card">
          <h3 style={{ margin: '0 0 20px', fontSize: 18 }}>Bài tập</h3>
          {assignments.length === 0 ? (
            <p className="muted">Chưa có bài tập nào được giao trong lớp này.</p>
          ) : (
            <div>
              {assignments.map((asm) => {
                const evalData = asm.evaluation;
                const hasScore = evalData && evalData.score !== null;
                
                let pillClass = "pill pending";
                let pillText = "Chưa nộp";
                if (evalData?.status === "graded") {
                  pillClass = "pill graded";
                  pillText = "Đã chấm";
                } else if (evalData?.status === "returned") {
                  pillClass = "pill returned";
                  pillText = "Cần nộp lại";
                } else if (asm.submission.latestAttempt) {
                  pillClass = "pill pending";
                  pillText = "Đã nộp";
                } else if (asm.status === "published") {
                  pillClass = "pill pending";
                  pillText = "Đang mở";
                }

                return (
                  <div key={asm.id} className="assign-block">
                    <div className="assign-item" onClick={() => setSelectedAssignmentId(asm.id)}>
                      <div className="icon-circle active">📝</div>
                      <div className="info">
                        <b>{asm.title}</b>
                        <span>Hạn nộp: {new Date(asm.dueDate).toLocaleDateString("vi-VN")}</span>
                      </div>
                      <span className={pillClass}>{pillText}</span>
                      <div className="assign-score">
                        {hasScore ? evalData.score : "—"}
                      </div>
                    </div>

                    {/* Expandable feedback if any */}
                    {evalData && evalData.feedback && selectedAssignmentId !== asm.id && (
                      <div className="feedback-box">
                        <b>Nhận xét:</b> {evalData.feedback.slice(0, 80)}{evalData.feedback.length > 80 ? '...' : ''}
                      </div>
                    )}
                    
                    <StudentAssignmentModal
                      assignment={asm}
                      open={selectedAssignmentId === asm.id}
                      onClose={() => setSelectedAssignmentId(null)}
                      onSubmitted={() => {
                        setRefreshKey((value) => value + 1);
                        setSelectedAssignmentId(null);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
