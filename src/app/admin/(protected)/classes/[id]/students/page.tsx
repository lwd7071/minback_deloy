import { StudentManagementView } from "@/components/students/teacher/student-management-view";
import { handleTeacherPageError } from "@/server/navigation/page-errors";
import { listStudentsInClass } from "@/server/services/students/student-management-service";

export default async function ClassStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const parsedPage = Number(query.page);
  const search = query.q?.trim().slice(0, 100) ?? "";
  let result: Awaited<ReturnType<typeof listStudentsInClass>>;
  try {
    result = await listStudentsInClass(id, {
      page: Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
      pageSize: 20,
      search: search || undefined,
    });
  } catch (error) {
    return handleTeacherPageError(error);
  }
  return (
    <StudentManagementView
      key={`${id}:${result.meta.page}:${search}`}
      classSectionId={id}
      initialStudents={result.students}
      initialMeta={result.meta}
      initialSearch={search}
    />
  );
}
