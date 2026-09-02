import { Suspense } from "react";

import { GradebookView } from "@/components/evaluations/teacher/gradebook-view";
import { handleTeacherPageError } from "@/server/navigation/page-errors";
import { getTeacherGradebook } from "@/server/services/frontend-rebuild/frontend-api-service";

export default async function ClassGradebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ studentPage?: string; assignmentPage?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return (
    <div className="stack">
      <div className="page-head">
        <h1>Bảng điểm</h1>
      </div>
      <Suspense fallback={<p className="muted">Đang tải bảng điểm…</p>}>
        <GradebookData classSectionId={id} query={query} />
      </Suspense>
    </div>
  );
}

async function GradebookData({
  classSectionId,
  query,
}: {
  classSectionId: string;
  query: { studentPage?: string; assignmentPage?: string };
}) {
  const studentPage = Number(query.studentPage);
  const assignmentPage = Number(query.assignmentPage);
  let data: Awaited<ReturnType<typeof getTeacherGradebook>>;
  try {
    data = await getTeacherGradebook(classSectionId, {
      studentPage:
        Number.isInteger(studentPage) && studentPage > 0 ? studentPage : 1,
      studentPageSize: 20,
      assignmentPage:
        Number.isInteger(assignmentPage) && assignmentPage > 0
          ? assignmentPage
          : 1,
      assignmentPageSize: 20,
    });
  } catch (error) {
    return handleTeacherPageError(error);
  }
  return <GradebookView classSectionId={classSectionId} data={data} />;
}
