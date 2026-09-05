"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GradeImportModal } from "@/components/evaluations/teacher/grade-import-modal";
import { AppIcon } from "@/components/ui/app-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AssignmentDto } from "@/types/assignment";
import type {
  EvaluationStatus,
  EvaluationWithStudentDto,
} from "@/types/evaluation";
import type { EvaluationImportResultDto } from "@/types/evaluation-import";
import type { StudentAdminDto } from "@/types/student";

type ApiResult<T> = { data: T } | { error: { message: string } };
type ResultRow = {
  studentId: string;
  score: number | null;
  feedback: string;
  status: EvaluationStatus;
};

export function BulkGradeView({
  classSectionId,
  assignment,
  students,
  studentMeta,
  initialSearch,
  evaluations: initialEvaluations,
}: {
  classSectionId: string;
  assignment: AssignmentDto;
  students: StudentAdminDto[];
  studentMeta: { page: number; pageSize: number; total: number };
  initialSearch: string;
  evaluations: EvaluationWithStudentDto[];
}) {
  const router = useRouter();
  const [evaluations, setEvaluations] = useState<ResultRow[]>(() =>
    initialEvaluations.map((evaluation) => ({
      studentId: evaluation.studentId,
      score: evaluation.score,
      feedback: evaluation.feedback,
      status: evaluation.status,
    })),
  );
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

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

  const byStudentId = useMemo(
    () =>
      new Map(
        evaluations.map((evaluation) => [evaluation.studentId, evaluation]),
      ),
    [evaluations],
  );
  const metrics = useMemo(() => {
    const graded = evaluations.filter((row) => row.status === "graded").length;
    const returned = evaluations.filter(
      (row) => row.status === "returned",
    ).length;
    return {
      total: studentMeta.total,
      graded,
      returned,
      missing: Math.max(0, studentMeta.total - graded - returned),
    };
  }, [evaluations, studentMeta.total]);
  const pages = Math.max(
    1,
    Math.ceil(studentMeta.total / studentMeta.pageSize),
  );
  const gradedRows = evaluations.filter((row) => row.status === "graded");

  function pageHref(page: number): string {
    const params = new URLSearchParams();
    if (initialSearch) params.set("q", initialSearch);
    if (page > 1) params.set("page", String(page));
    return `/admin/classes/${classSectionId}/assignments/${assignment.id}/grade${params.size ? `?${params}` : ""}`;
  }

  function handleImportSuccess(result: EvaluationImportResultDto): void {
    setEvaluations((current) => {
      const next = new Map(current.map((row) => [row.studentId, row]));
      for (const updated of result.updatedEvaluations) {
        next.set(updated.studentId, {
          studentId: updated.studentId,
          score: updated.score,
          feedback: updated.feedback ?? "",
          status: updated.status,
        });
      }
      return [...next.values()];
    });
    setMessage(
      result.mode === "publish"
        ? `Đã công bố kết quả cho ${result.count} sinh viên.`
        : `Đã lưu kết quả chưa công bố cho ${result.count} sinh viên.`,
    );
    setError(null);
    setImportModalOpen(false);
    router.refresh();
  }

  async function publishSavedResults(): Promise<void> {
    if (!gradedRows.length || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (assignment.status === "draft") {
        const assignmentResponse = await fetch(
          `/api/v1/teacher/assignments/${assignment.id}`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: "published" }),
          },
        );
        if (!assignmentResponse.ok) {
          const body = (await assignmentResponse.json()) as ApiResult<never>;
          throw new Error(
            "error" in body
              ? body.error.message
              : "Không thể phát hành bài tập",
          );
        }
      }
      const response = await fetch(
        `/api/v1/teacher/assignments/${assignment.id}/evaluations/import`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mode: "publish",
            evaluations: gradedRows.map((row) => ({
              studentId: row.studentId,
              score: row.score,
              feedback: row.feedback,
            })),
          }),
        },
      );
      const body =
        (await response.json()) as ApiResult<EvaluationImportResultDto>;
      if (!response.ok || !("data" in body))
        throw new Error(
          "error" in body ? body.error.message : "Không thể công bố kết quả",
        );
      handleImportSuccess(body.data);
      setConfirmPublish(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể công bố kết quả",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grade-workspace">
      <div className="grade-page-toolbar">
        <div>
          <p className="eyebrow">Kết quả bài tập</p>
          <h1 className="grade-page-title">{assignment.title}</h1>
        </div>
        <Button type="button" onClick={() => setImportModalOpen(true)}>
          <AppIcon name="upload" size={16} />
          {evaluations.length ? "Nhập lại file điểm" : "Nhập file điểm"}
        </Button>
      </div>

      <div className="teacher-metrics-grid" aria-label="Tổng quan kết quả">
        <Card className="stat-card">
          <strong>{metrics.total}</strong>
          <span className="muted">Tổng sinh viên</span>
        </Card>
        <Card className="stat-card">
          <strong>{metrics.missing}</strong>
          <span className="muted">Chưa có kết quả</span>
        </Card>
        <Card className="stat-card">
          <strong>{metrics.graded}</strong>
          <span className="muted">Chưa công bố</span>
        </Card>
        <Card className="stat-card">
          <strong>{metrics.returned}</strong>
          <span className="muted">Đã công bố</span>
        </Card>
      </div>

      {message ? (
        <p className="form-success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {confirmPublish ? (
        <Card
          className="form-notice"
          role="alertdialog"
          aria-label="Xác nhận công bố"
        >
          <p>
            Đã có {gradedRows.length} kết quả chưa công bố. Công bố cho sinh
            viên ngay?
          </p>
          <div className="button-group">
            <Button
              type="button"
              loading={busy}
              onClick={() => void publishSavedResults()}
            >
              Xác nhận công bố
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirmPublish(false)}
            >
              Hủy
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grade-results-toolbar">
        <input
          className="form-input"
          type="search"
          placeholder="Tìm theo MSSV, Họ tên…"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          aria-label="Tìm sinh viên"
        />
        {gradedRows.length ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmPublish(true)}
          >
            Công bố {gradedRows.length} kết quả
          </Button>
        ) : null}
      </div>

      <Card className="grade-results-card">
        {evaluations.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có kết quả. Hãy nhập file điểm để bắt đầu.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table grade-results-table">
              <thead>
                <tr>
                  <th>MSSV</th>
                  <th>Họ tên</th>
                  <th>Điểm</th>
                  <th>Feedback</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const result = byStudentId.get(student.id);
                  return (
                    <tr key={student.id}>
                      <td className="identity-mono">{student.mssv}</td>
                      <td>{student.fullName}</td>
                      <td>{result?.score ?? "—"}</td>
                      <td className="grade-feedback-cell">
                        {result?.feedback || "—"}
                      </td>
                      <td>
                        <Badge
                          variant={
                            result?.status === "returned"
                              ? "returned"
                              : result?.status === "graded"
                                ? "success"
                                : "neutral"
                          }
                        >
                          {result?.status === "returned"
                            ? "Đã công bố"
                            : result?.status === "graded"
                              ? "Chưa công bố"
                              : "Chưa có kết quả"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pages > 1 ? (
        <nav
          className="pagination-summary cluster"
          aria-label="Phân trang sinh viên"
        >
          <Link href={pageHref(Math.max(1, studentMeta.page - 1))}>
            Trang trước
          </Link>
          <span>
            {studentMeta.page} / {pages}
          </span>
          <Link href={pageHref(Math.min(pages, studentMeta.page + 1))}>
            Trang sau
          </Link>
        </nav>
      ) : null}

      <GradeImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        assignmentId={assignment.id}
        classSectionId={classSectionId}
        maxScore={10}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
