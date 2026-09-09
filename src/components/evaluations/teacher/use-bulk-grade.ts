import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { AssignmentDto } from "@/types/assignment";
import type {
  EvaluationStatus,
  EvaluationWithStudentDto,
} from "@/types/evaluation";
import type { EvaluationImportResultDto } from "@/types/evaluation-import";
import type { StudentAdminDto } from "@/types/student";

type ApiResult<T> = { data: T } | { error: { message: string } };

export type ResultRow = {
  studentId: string;
  score: number | null;
  feedback: string;
  status: EvaluationStatus;
};

export interface UseBulkGradeOptions {
  classSectionId: string;
  assignment: AssignmentDto;
  students: StudentAdminDto[];
  studentMeta: { page: number; pageSize: number; total: number };
  initialSearch: string;
  initialEvaluations: EvaluationWithStudentDto[];
}

export function useBulkGrade({
  classSectionId,
  assignment,
  studentMeta,
  initialSearch,
  initialEvaluations,
}: UseBulkGradeOptions) {
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

  return {
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
  };
}
