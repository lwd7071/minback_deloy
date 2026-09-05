"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { GradeImportModal } from "@/components/evaluations/teacher/grade-import-modal";
import type { AssignmentDto } from "@/types/assignment";
import type {
  EvaluationStatus,
  EvaluationWithStudentDto,
} from "@/types/evaluation";
import type { EvaluationImportResultDto } from "@/types/evaluation-import";
import type { StudentAdminDto } from "@/types/student";
import type { SubmissionListItemDto } from "@/types/submission";

type Draft = {
  studentId: string;
  score: string;
  feedback: string;
  status: EvaluationStatus;
};

type FilterTab = "all" | "pending" | "graded" | "unsubmitted";

export function BulkGradeView({
  classSectionId,
  assignment,
  students: initialStudents,
  studentMeta,
  initialSearch,
  evaluations,
  submissions: initialSubmissions,
}: {
  classSectionId: string;
  assignment: AssignmentDto;
  students: StudentAdminDto[];
  studentMeta: { page: number; pageSize: number; total: number };
  initialSearch: string;
  evaluations: EvaluationWithStudentDto[];
  submissions: SubmissionListItemDto[];
}) {
  const router = useRouter();
  const [students] = useState<StudentAdminDto[]>(initialStudents);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      initialStudents.map((student) => {
        const current = evaluations.find(
          (value) => value.studentId === student.id,
        );
        return [
          student.id,
          {
            studentId: student.id,
            score: current?.score == null ? "" : String(current.score),
            feedback: current?.feedback ?? "",
            status: current?.status ?? "pending",
          },
        ];
      }),
    ),
  );
  const [submissions] = useState<Record<string, SubmissionListItemDto>>(() =>
    Object.fromEntries(
      initialSubmissions.map((item) => [item.student.id, item]),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [hasChanges, setHasChanges] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const pages = Math.max(
    1,
    Math.ceil(studentMeta.total / studentMeta.pageSize),
  );

  useEffect(() => {
    if (searchQuery === initialSearch) return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      router.replace(
        `/admin/classes/${classSectionId}/assignments/${assignment.id}/grade${params.size ? `?${params}` : ""}`,
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [assignment.id, classSectionId, initialSearch, router, searchQuery]);

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (initialSearch) params.set("q", initialSearch);
    if (page > 1) params.set("page", String(page));
    return `/admin/classes/${classSectionId}/assignments/${assignment.id}/grade${params.size ? `?${params}` : ""}`;
  };

  function confirmNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      hasChanges &&
      !window.confirm("Bạn có thay đổi chưa lưu. Rời trang này?")
    ) {
      event.preventDefault();
    }
  }

  function update(id: string, patch: Partial<Draft>) {
    setHasChanges(true);
    setDrafts((current) => {
      const prevDraft = current[id];
      const nextDraft = { ...prevDraft, ...patch };

      // Tự động nâng trạng thái lên "graded" nếu giảng viên nhập điểm và đang ở "pending"
      if (
        patch.score !== undefined &&
        patch.score.trim() !== "" &&
        prevDraft?.status === "pending" &&
        !patch.status
      ) {
        nextDraft.status = "graded";
      }

      return {
        ...current,
        [id]: nextDraft,
      };
    });
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/v1/teacher/assignments/${assignment.id}/evaluations/bulk`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            evaluations: Object.values(drafts).map((row) => ({
              ...row,
              score: row.score === "" ? null : Number(row.score),
            })),
          }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Không thể lưu bảng điểm");
      setMessage(`Đã lưu ${body.data.length} thay đổi thành công.`);
      setHasChanges(false);
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "Không thể lưu bảng điểm",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleImportSuccess(result: EvaluationImportResultDto) {
    setDrafts((current) => {
      const next = { ...current };
      for (const updated of result.updatedEvaluations) {
        if (next[updated.studentId]) {
          next[updated.studentId] = {
            studentId: updated.studentId,
            score: updated.score === null ? "" : String(updated.score),
            feedback: updated.feedback ?? "",
            status: updated.status,
          };
        }
      }
      return next;
    });
    setHasChanges(false);
    setMessage(
      result.mode === "publish"
        ? `Đã công bố kết quả cho ${result.count} sinh viên và gửi email thông báo.`
        : `Đã lưu bản chấm nháp cho ${result.count} sinh viên từ tệp Excel.`,
    );
  }

  // Thống kê số liệu bài nộp & chấm điểm
  const metrics = useMemo(() => {
    let submitted = 0;
    let graded = 0;
    let pending = 0;
    let unsubmitted = 0;

    for (const student of students) {
      const sub = submissions[student.id];
      const draft = drafts[student.id];
      const hasSubmission = (sub?.attemptCount ?? 0) > 0;

      if (hasSubmission) {
        submitted++;
        if (draft?.status === "graded" || draft?.status === "returned") {
          graded++;
        } else {
          pending++;
        }
      } else {
        unsubmitted++;
      }
    }

    const percentage =
      submitted > 0 ? Math.round((graded / submitted) * 100) : 0;

    return { submitted, graded, pending, unsubmitted, percentage };
  }, [students, submissions, drafts]);

  // Lọc sinh viên theo Tab và Từ khóa tìm kiếm
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const draft = drafts[student.id];
      const sub = submissions[student.id];
      const hasSubmission = (sub?.attemptCount ?? 0) > 0;

      // Filter theo tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchMssv = student.mssv.toLowerCase().includes(q);
        const matchName = student.fullName.toLowerCase().includes(q);
        if (!matchMssv && !matchName) return false;
      }

      // Filter theo tab
      if (activeTab === "pending") {
        return hasSubmission && draft?.status === "pending";
      }
      if (activeTab === "graded") {
        return draft?.status === "graded" || draft?.status === "returned";
      }
      if (activeTab === "unsubmitted") {
        return !hasSubmission;
      }
      return true;
    });
  }, [students, drafts, submissions, activeTab, searchQuery]);

  return (
    <div className="teacher-dash grade-workspace">
      {/* Top Breadcrumb & Header Actions */}
      <div
        className="split"
        style={{
          alignItems: "center",
          marginBottom: "12px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Link
          href={`/admin/classes/${classSectionId}/assignments`}
          className="btn btn-ghost btn-sm"
          style={{ gap: "6px" }}
        >
          ← Quay lại danh sách bài tập
        </Link>
        <div className="cluster" style={{ gap: "8px" }}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            style={{ gap: "6px" }}
          >
            <AppIcon name="upload" size={14} />
            Nhập điểm từ Excel
          </Button>
        </div>
      </div>

      <header className="grade-header-card">
        <div className="grade-header-main">
          <div
            className="cluster"
            style={{ gap: "10px", alignItems: "center" }}
          >
            <span className={`badge badge-${assignment.status}`}>
              {assignment.status}
            </span>
            <span className="muted" style={{ fontSize: "0.86rem" }}>
              Điểm tối đa: {assignment.maxScore}
            </span>
          </div>
          <h1 style={{ margin: "6px 0 0" }}>{assignment.title}</h1>
        </div>

        {/* Quick KPI Strip */}
        <div className="grade-kpi-grid">
          <div className="grade-kpi-item">
            <span className="muted">Tổng sinh viên</span>
            <strong>{students.length}</strong>
          </div>
          <div className="grade-kpi-item">
            <span className="muted">Đã có kết quả</span>
            <strong className="text-success">{metrics.graded}</strong>
          </div>
          <div className="grade-kpi-item">
            <span className="muted">Chưa công bố</span>
            <strong className="text-warning">
              {students.length - metrics.graded}
            </strong>
          </div>
        </div>
      </header>

      <section
        className="grade-import-primary card card-highlighted"
        aria-labelledby="grade-import-title"
      >
        <div className="split">
          <div>
            <span className="eyebrow">Luồng chấm điểm</span>
            <h2 id="grade-import-title">Import điểm và feedback</h2>
            <p className="muted">
              Tải một file CSV/XLSX gồm MSSV, Họ tên, Điểm và Feedback để xem
              trước, lưu bản chấm hoặc công bố kết quả.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => setImportModalOpen(true)}
          >
            <AppIcon name="upload" size={16} /> Nhập file điểm
          </Button>
        </div>
      </section>

      <div className="grade-import-supporting-editor" aria-hidden="true">
        {/* Filter Tabs & Search Bar */}
        <div className="grade-controls-bar">
          <div className="grade-filter-tabs">
            <button
              type="button"
              className={`grade-tab-btn ${activeTab === "all" ? "is-active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              Tất cả ({students.length})
            </button>
            <button
              type="button"
              className={`grade-tab-btn ${activeTab === "pending" ? "is-active" : ""}`}
              onClick={() => setActiveTab("pending")}
            >
              Cần chấm ({metrics.pending})
            </button>
            <button
              type="button"
              className={`grade-tab-btn ${activeTab === "graded" ? "is-active" : ""}`}
              onClick={() => setActiveTab("graded")}
            >
              Đã chấm ({metrics.graded})
            </button>
            <button
              type="button"
              className={`grade-tab-btn ${activeTab === "unsubmitted" ? "is-active" : ""}`}
              onClick={() => setActiveTab("unsubmitted")}
            >
              Chưa nộp ({metrics.unsubmitted})
            </button>
          </div>

          <div className="grade-search-box">
            <AppIcon name="search" size={16} />
            <input
              type="text"
              placeholder="Tìm theo MSSV, Họ tên…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="grade-search-input"
            />
          </div>
        </div>

        {pages > 1 ? (
          <nav
            className="pagination-summary cluster"
            aria-label="Phân trang sinh viên"
          >
            <Link
              href={pageHref(Math.max(1, studentMeta.page - 1))}
              aria-disabled={studentMeta.page === 1}
              onClick={confirmNavigation}
            >
              Trang trước
            </Link>
            <span>
              {studentMeta.page} / {pages}
            </span>
            <Link
              href={pageHref(Math.min(pages, studentMeta.page + 1))}
              aria-disabled={studentMeta.page === pages}
              onClick={confirmNavigation}
            >
              Trang sau
            </Link>
          </nav>
        ) : null}

        {/* Spreadsheet / Table View */}
        <div className="data-table-wrap" style={{ overflowX: "auto" }}>
          <table className="data-table grade-table">
            <thead>
              <tr>
                <th style={{ width: "22%" }}>Sinh viên</th>
                <th style={{ width: "25%" }}>Bài nộp & Tệp tin</th>
                <th style={{ width: "13%" }}>Điểm (/{assignment.maxScore})</th>
                <th style={{ width: "16%" }}>Trạng thái</th>
                <th style={{ width: "24%" }}>Phản hồi / Nhận xét</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const draft = drafts[student.id];
                  const sub = submissions[student.id];
                  const hasSub = (sub?.attemptCount ?? 0) > 0;
                  if (!draft) return null;

                  return (
                    <tr
                      key={student.id}
                      className={hasSub ? "" : "is-unsubmitted"}
                    >
                      {/* Cột 1: Thông tin sinh viên */}
                      <td>
                        <div className="grade-student-cell">
                          <div className="grade-student-avatar">
                            {student.fullName.slice(0, 1)}
                          </div>
                          <div>
                            <strong>{student.fullName}</strong>
                            <span className="muted grade-student-mssv">
                              {student.mssv}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Bài nộp & File đính kèm */}
                      <td>
                        {hasSub ? (
                          <div className="stack" style={{ gap: "6px" }}>
                            <div className="cluster" style={{ gap: "6px" }}>
                              <span className="badge badge-success">
                                Lần #{sub?.attemptCount}
                              </span>
                              {sub?.latestAttempt?.isLate && (
                                <span className="badge badge-warning">
                                  Nộp trễ
                                </span>
                              )}
                            </div>
                            {sub?.latestAttempt?.files?.length ? (
                              <div
                                className="cluster"
                                style={{ gap: "6px", flexWrap: "wrap" }}
                              >
                                {sub.latestAttempt.files.map((file) => (
                                  <a
                                    key={file.id}
                                    href={file.downloadUrl}
                                    className="btn btn-secondary btn-sm"
                                    style={{
                                      fontSize: "0.78rem",
                                      padding: "3px 8px",
                                      gap: "4px",
                                    }}
                                    title={file.originalName}
                                  >
                                    <AppIcon name="upload" size={12} />
                                    <span
                                      style={{
                                        maxWidth: "130px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {file.originalName}
                                    </span>
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span
                                className="muted"
                                style={{ fontSize: "0.82rem" }}
                              >
                                Chưa tải file
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            className="muted"
                            style={{ fontSize: "0.84rem" }}
                          >
                            Chưa nộp bài
                          </span>
                        )}
                      </td>

                      {/* Cột 3: Ô nhập điểm số */}
                      <td>
                        <input
                          type="number"
                          min="0"
                          max={assignment.maxScore}
                          step="0.1"
                          placeholder="0.0"
                          className="form-input grade-score-input"
                          value={draft.score}
                          onChange={(event) =>
                            update(student.id, { score: event.target.value })
                          }
                        />
                      </td>

                      {/* Cột 4: Trạng thái chấm bài */}
                      <td>
                        <select
                          className="form-input grade-status-select"
                          value={draft.status}
                          onChange={(event) =>
                            update(student.id, {
                              status: event.target.value as EvaluationStatus,
                            })
                          }
                        >
                          <option value="pending">Chờ chấm (pending)</option>
                          <option value="graded">Đã chấm (graded)</option>
                          <option value="returned">
                            Đã trả bài (returned)
                          </option>
                        </select>
                      </td>

                      {/* Cột 5: Nhận xét phản hồi */}
                      <td>
                        <input
                          type="text"
                          placeholder="Nhận xét cho sinh viên…"
                          className="form-input grade-feedback-input"
                          value={draft.feedback}
                          onChange={(event) =>
                            update(student.id, { feedback: event.target.value })
                          }
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    <p className="muted">
                      Không tìm thấy sinh viên nào phù hợp.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Sticky Bottom Action Bar */}
        <aside
          className="sticky-grade-bar"
          aria-label="Thanh điều khiển chấm điểm"
        >
          <div className="sticky-grade-content">
            <div className="grade-progress-info">
              <div
                className="cluster"
                style={{ gap: "12px", alignItems: "center" }}
              >
                <span className="grade-progress-title">
                  Tiến độ chấm:{" "}
                  <strong>
                    {metrics.graded} / {metrics.submitted} bài nộp
                  </strong>{" "}
                  ({metrics.percentage}%)
                </span>
              </div>
              <div style={{ width: "160px" }}>
                <ProgressBar
                  value={metrics.graded}
                  max={Math.max(1, metrics.submitted)}
                />
              </div>
            </div>

            <div className="grade-action-group">
              {message ? (
                <span
                  className={
                    message.startsWith("Đã") ? "form-success" : "form-error"
                  }
                  style={{ fontSize: "0.86rem", fontWeight: 600 }}
                >
                  {message}
                </span>
              ) : hasChanges ? (
                <span className="muted" style={{ fontSize: "0.84rem" }}>
                  Có thay đổi chưa lưu
                </span>
              ) : null}

              <Button
                className="btn btn-primary"
                loading={busy}
                onClick={() => void save()}
                style={{ minWidth: "140px" }}
              >
                <AppIcon name="check" size={16} />
                Lưu bảng điểm
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <GradeImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        assignmentId={assignment.id}
        classSectionId={classSectionId}
        maxScore={assignment.maxScore}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
