import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BulkGradeView } from "@/components/evaluations/teacher/bulk-grade-view";
import { handleTeacherPageError } from "@/server/navigation/page-errors";
import { requireTeacher } from "@/server/auth/teacher-auth";
import { getTeacherGradingSnapshot } from "@/server/services/evaluations/evaluation-service";
import { Skeleton } from "@/components/ui/skeleton";
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
        fallback={
          <div className="stack" aria-busy="true">
            <Skeleton width="260px" height="30px" />
            <Skeleton width="100%" height="84px" />
            <Skeleton width="100%" height="320px" />
          </div>
        }
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
  let snapshot: Awaited<ReturnType<typeof getTeacherGradingSnapshot>>;
  try {
    const { teacher, supabase } = await requireTeacher();
    snapshot = await getTeacherGradingSnapshot(
      assignmentId,
      {
        teacherId: teacher.id,
        supabase,
      },
      {
        page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
        pageSize: 100,
        search: search || undefined,
      },
    );
    if (snapshot.assignment.classSectionId !== classSectionId) {
      notFound();
    }
  } catch (error) {
    return handleTeacherPageError(error);
  }
  return (
    <BulkGradeView
      classSectionId={classSectionId}
      assignment={snapshot.assignment}
      students={snapshot.students}
      studentMeta={snapshot.studentMeta}
      initialSearch={search}
      evaluations={snapshot.evaluations}
      gradingCounts={snapshot.gradingCounts}
      snapshotVersion={snapshot.snapshotVersion}
    />
  );
}
