import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BulkGradeView } from "@/components/evaluations/teacher/bulk-grade-view";
import { handleTeacherPageError } from "@/server/navigation/page-errors";
import { getTeacherAssignment } from "@/server/services/assignments/assignment-service";
import { listTeacherEvaluations } from "@/server/services/evaluations/evaluation-service";
import { listStudentsInClass } from "@/server/services/students/student-management-service";
import { listTeacherSubmissions } from "@/server/services/students/teacher-submission-service";
export default async function GradePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; aid: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { id, aid } = await params;
  const query = await searchParams;
  return (
    <div className="stack">
      <Link className="btn btn-ghost" href={`/admin/classes/${id}/assignments`}>
        ← Quay lại lớp
      </Link>
      <Suspense
        fallback={<p className="muted">Đang tải danh sách chấm bài…</p>}
      >
        <BulkGradeData classSectionId={id} assignmentId={aid} query={query} />
      </Suspense>
    </div>
  );
}

async function BulkGradeData({
  classSectionId,
  assignmentId,
  query,
}: {
  classSectionId: string;
  assignmentId: string;
  query: { q?: string; page?: string };
}) {
  const parsedPage = Number(query.page);
  const search = query.q?.trim().slice(0, 100) ?? "";
  let assignment: Awaited<ReturnType<typeof getTeacherAssignment>>;
  let studentResult: Awaited<ReturnType<typeof listStudentsInClass>>;
  let evaluations: Awaited<ReturnType<typeof listTeacherEvaluations>>;
  let submissions: Awaited<ReturnType<typeof listTeacherSubmissions>>;
  try {
    assignment = await getTeacherAssignment(assignmentId);
    if (assignment.classSectionId !== classSectionId) {
      notFound();
    }
    [studentResult, evaluations, submissions] = await Promise.all([
      listStudentsInClass(classSectionId, {
        page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
        pageSize: 100,
        search: search || undefined,
      }),
      listTeacherEvaluations(assignmentId),
      listTeacherSubmissions(assignmentId),
    ]);
  } catch (error) {
    return handleTeacherPageError(error);
  }
  const studentIds = new Set(
    studentResult.students.map((student) => student.id),
  );
  return (
    <BulkGradeView
      key={`${assignmentId}:${studentResult.meta.page}:${search}`}
      classSectionId={classSectionId}
      assignment={assignment}
      students={studentResult.students}
      studentMeta={studentResult.meta}
      initialSearch={search}
      evaluations={evaluations.filter((evaluation) =>
        studentIds.has(evaluation.studentId),
      )}
      submissions={submissions.filter((submission) =>
        studentIds.has(submission.student.id),
      )}
    />
  );
}
