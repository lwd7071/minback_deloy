"use client";

import Link from "next/link";

import { GradeImportModal } from "@/components/evaluations/teacher/grade-import-modal";
import { AppIcon } from "@/components/ui/app-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AssignmentDto } from "@/types/assignment";
import type { EvaluationWithStudentDto } from "@/types/evaluation";
import type { StudentAdminDto } from "@/types/student";
import { useBulkGrade } from "@/components/evaluations/teacher/use-bulk-grade";

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
  const {
    evaluations,
    byStudentId,
    metrics,
    pages,
    gradedRows,
    searchQuery,
    setSearchQuery,
    busy,
    message,
    error,
    confirmPublish,
    setConfirmPublish,
    importModalOpen,
    setImportModalOpen,
    pageHref,
    handleImportSuccess,
    publishSavedResults,
  } = useBulkGrade({
    classSectionId,
    assignment,
    students,
    studentMeta,
    initialSearch,
    initialEvaluations,
  });

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
