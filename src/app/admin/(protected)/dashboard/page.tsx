import { TeacherOverviewDashboard } from "@/components/class-sections/teacher/teacher-overview-dashboard";
import { getTeacherDashboardOverview } from "@/server/services/frontend-rebuild/teacher-dashboard-service";
import { handleTeacherPageError } from "@/server/navigation/page-errors";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ classPage?: string }>;
}) {
  const { classPage } = await searchParams;
  const parsedPage = Number(classPage);
  let result: Awaited<ReturnType<typeof getTeacherDashboardOverview>>;
  try {
    result = await getTeacherDashboardOverview({
      classPage:
        Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    });
  } catch (error) {
    return handleTeacherPageError(error);
  }
  return <TeacherOverviewDashboard data={result.data} />;
}
