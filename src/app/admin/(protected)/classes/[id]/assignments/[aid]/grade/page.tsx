import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BulkGradeView } from "@/components/evaluations/teacher/bulk-grade-view";
import { handleTeacherPageError } from "@/server/navigation/page-errors";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { getTeacherAssignment } from "@/server/services/assignments/assignment-service";
import { listTeacherEvaluations } from "@/server/services/evaluations/evaluation-service";
import { listStudentsInClass } from "@/server/services/students/student-management-service";
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
  try {
    const { teacher, supabase } = await requireTeacher();
    assignment = await getTeacherAssignment(assignmentId, teacher.id);
    if (assignment.classSectionId !== classSectionId) {
      notFound();
    }
    [studentResult, evaluations] = await Promise.all([
      listStudentsInClass(classSectionId, {
        page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
        pageSize: 100,
        search: search || undefined,
      }),
      listTeacherEvaluations(assignmentId, {
        teacherId: teacher.id,
        supabase,
      }),
    ]);
  } catch (error) {
    return handleTeacherPageError(error);
  }
  return (
    <BulkGradeView
      key={`${assignmentId}:${studentResult.meta.page}:${search}`}
      classSectionId={classSectionId}
      assignment={assignment}
      students={studentResult.students}
      studentMeta={studentResult.meta}
      initialSearch={search}
      evaluations={evaluations}
    />
  );
}
