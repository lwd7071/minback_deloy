import { ClassSummaryDashboard } from "@/components/class-sections/teacher/class-summary-dashboard";
import { redirect } from "next/navigation";
import { getTeacherClassSectionSummaries } from "@/server/services/frontend-rebuild/frontend-api-service";
import { handleTeacherPageError } from "@/server/navigation/page-errors";

export default async function AdminClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page);
  const search = params.q?.trim().slice(0, 100) ?? "";
  let result: Awaited<ReturnType<typeof getTeacherClassSectionSummaries>>;
  try {
    result = await getTeacherClassSectionSummaries({
      page: Number.isInteger(page) && page > 0 ? page : 1,
      pageSize: 6,
      search: search || undefined,
    });
    const lastPage = Math.max(
      1,
      Math.ceil(result.meta.total / result.meta.pageSize),
    );
    if (result.meta.page > lastPage) {
      const query = new URLSearchParams();
      if (search) query.set("q", search);
      if (lastPage > 1) query.set("page", String(lastPage));
      redirect(`/admin/classes${query.size ? `?${query}` : ""}`);
    }
  } catch (error) {
    return handleTeacherPageError(error);
  }
  return (
    <ClassSummaryDashboard
      key={`${result.meta.page}:${search}`}
      rows={result.data}
      meta={result.meta}
      metrics={result.metrics}
      query={{ search }}
    />
  );
}
