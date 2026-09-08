import { ClassSummaryDashboard } from "@/components/class-sections/teacher/class-summary-dashboard";
import { redirect } from "next/navigation";
import { getTeacherClassSectionSummaries } from "@/server/services/frontend-rebuild/frontend-api-service";
import { handleTeacherPageError } from "@/server/navigation/page-errors";
import {
  classProgressFilterSchema,
  classSummarySortSchema,
} from "@/schemas/class-section";

export default async function AdminClassesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    progress?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page);
  const search = params.q?.trim().slice(0, 100) ?? "";
  const progressResult = classProgressFilterSchema.safeParse(params.progress);
  const sortResult = classSummarySortSchema.safeParse(params.sort);
  const progress = progressResult.success ? progressResult.data : "all";
  const sort = sortResult.success ? sortResult.data : "newest";
  const normalizedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const needsCanonicalRedirect =
    (params.page !== undefined && normalizedPage === 1) ||
    (params.progress !== undefined &&
      (!progressResult.success || progress === "all")) ||
    (params.sort !== undefined && (!sortResult.success || sort === "newest"));
  if (needsCanonicalRedirect) {
    const query = new URLSearchParams();
    if (search) query.set("q", search);
    if (progress !== "all") query.set("progress", progress);
    if (sort !== "newest") query.set("sort", sort);
    if (normalizedPage > 1) query.set("page", String(normalizedPage));
    redirect(`/admin/classes${query.size ? `?${query}` : ""}`);
  }
  let result: Awaited<ReturnType<typeof getTeacherClassSectionSummaries>>;
  try {
    result = await getTeacherClassSectionSummaries({
      page: normalizedPage,
      pageSize: 6,
      search: search || undefined,
      progress,
      sort,
    });
    const lastPage = Math.max(
      1,
      Math.ceil(result.meta.total / result.meta.pageSize),
    );
    if (result.meta.page > lastPage) {
      const query = new URLSearchParams();
      if (search) query.set("q", search);
      if (progress !== "all") query.set("progress", progress);
      if (sort !== "newest") query.set("sort", sort);
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
      filterCounts={result.filterCounts}
      query={{ search, progress, sort }}
    />
  );
}
