"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useNotificationPolling } from "./use-notification-polling";

type StudentProfileDto = {
  student: { mssv: string; fullName: string; nickname: string };
  classSection: { id: string; code: string; name: string };
  progress: { completed: number; total: number; percentage: number };
  assignments: Array<{
    id: string;
    title: string;
    description: string;
    assignedDate: string;
    dueDate: string;
    status: "draft" | "published" | "closed";
    maxScore: number;
    evaluation: {
      id: string;
      score: number | null;
      feedback: string;
      status: "pending" | "graded" | "returned";
      updatedAt: string;
    } | null;
  }>;
};

type ApiResult<T> = { data: T } | { error: { message: string } };

export function StudentProfileView() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { unreadCount } = useNotificationPolling();

  useEffect(() => {
    let active = true;

    fetch("/api/v1/student/profile", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(
              "API Hồ sơ học tập (/api/v1/student/profile) chưa khả dụng (Đang chờ Dev A hoàn thành ở Sprint 5).",
            );
          }
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
        if (active) setProfile(data);
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
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/v1/student/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/student/login";
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

  const { student, classSection, progress, assignments } = profile;

  return (
    <div className="settings-stack">
      {/* Header hồ sơ */}
      <div className="settings-row" style={{ alignItems: "flex-start" }}>
        <div>
          <h2>{student.fullName}</h2>
          <p className="muted" style={{ margin: "4px 0" }}>
            MSSV: <strong>{student.mssv}</strong> — Nickname:{" "}
            <strong>{student.nickname}</strong>
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Lớp học phần: <strong>{classSection.code}</strong> —{" "}
            {classSection.name}
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link
            href="/student/notifications"
            className="button button-secondary"
            style={{ textDecoration: "none", position: "relative" }}
          >
            🔔 Thông báo
            {unreadCount > 0 && (
              <span
                style={{
                  marginLeft: "6px",
                  background: "var(--accent)",
                  color: "#fff",
                  borderRadius: "10px",
                  padding: "1px 6px",
                  fontSize: "0.7rem",
                }}
              >
                {unreadCount}
              </span>
            )}
          </Link>
          <button
            className="button button-secondary"
            onClick={() => void handleLogout()}
          >
            Đăng xuất
          </button>
        </div>
      </div>

      {/* Progress Card */}
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "20px",
          background: "var(--surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <strong>Tiến độ học tập</strong>
          <span className="muted">
            {progress.completed} / {progress.total} bài hoàn thành (
            {progress.percentage}%)
          </span>
        </div>
        <div
          style={{
            height: "10px",
            width: "100%",
            background: "var(--border)",
            borderRadius: "5px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, Math.max(0, progress.percentage))}%`,
              background: "var(--accent)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* Danh sách Bài tập & Đánh giá */}
      <div>
        <h3>Danh sách Bài tập & Kết quả</h3>
        {assignments.length === 0 ? (
          <p className="muted">Chưa có bài tập nào được giao trong lớp này.</p>
        ) : (
          <div style={{ display: "grid", gap: "16px", marginTop: "12px" }}>
            {assignments.map((asm) => {
              const evalData = asm.evaluation;
              const hasScore = evalData && evalData.score !== null;

              return (
                <div
                  key={asm.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                    padding: "20px",
                    background: "var(--surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <h4 style={{ margin: "0 0 6px 0" }}>{asm.title}</h4>
                      {asm.description && (
                        <p
                          className="muted"
                          style={{ margin: "0 0 8px 0", fontSize: "0.88rem" }}
                        >
                          {asm.description}
                        </p>
                      )}
                      <span className="muted" style={{ fontSize: "0.78rem" }}>
                        Hạn nộp:{" "}
                        {new Date(asm.dueDate).toLocaleDateString("vi-VN")}
                      </span>
                    </div>

                    {/* Score badge */}
                    <div style={{ textAlign: "right" }}>
                      {evalData ? (
                        evalData.status === "pending" ? (
                          <span
                            style={{
                              background: "#fef0c7",
                              color: "#dc6803",
                              padding: "4px 10px",
                              borderRadius: "16px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            Đang chờ chấm
                          </span>
                        ) : (
                          <div>
                            <span
                              style={{
                                fontSize: "1.4rem",
                                fontWeight: 700,
                                color: "var(--accent)",
                              }}
                            >
                              {hasScore ? evalData.score : "—"}
                            </span>
                            <span
                              className="muted"
                              style={{ fontSize: "0.85rem" }}
                            >
                              {" "}
                              / {asm.maxScore}
                            </span>
                          </div>
                        )
                      ) : (
                        <span className="muted" style={{ fontSize: "0.8rem" }}>
                          Chưa có kết quả
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Feedback section */}
                  {evalData && evalData.feedback && (
                    <div
                      style={{
                        marginTop: "14px",
                        padding: "12px 14px",
                        background:
                          "color-mix(in srgb, var(--accent) 4%, var(--surface))",
                        borderLeft: "3px solid var(--accent)",
                        borderRadius: "0 8px 8px 0",
                      }}
                    >
                      <strong
                        style={{ fontSize: "0.82rem", color: "var(--muted)" }}
                      >
                        Nhận xét từ giáo viên:
                      </strong>
                      <p
                        style={{
                          margin: "4px 0 0 0",
                          fontSize: "0.9rem",
                          lineHeight: 1.5,
                        }}
                      >
                        {evalData.feedback}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
