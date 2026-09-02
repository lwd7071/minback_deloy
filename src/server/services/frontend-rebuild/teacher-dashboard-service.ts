import "server-only";

import { requireTeacher } from "@/server/auth/teacher-auth";
import {
  listPendingGradingItems,
  listRecentActivity,
} from "@/server/repositories/teacher-dashboard-repository";
import { listClassSectionSummaries } from "@/server/repositories/frontend-rebuild-repository";

export async function getTeacherDashboardOverview(input?: {
  classPage?: number;
}) {
  const { supabase, teacher } = await requireTeacher();
  const classPage = Math.max(1, input?.classPage ?? 1);
  const classPageSize = 3;

  const [summariesResult, pendingGrading, recentActivity] = await Promise.all([
    listClassSectionSummaries(supabase, teacher.id, {
      page: classPage,
      pageSize: classPageSize,
    }),
    listPendingGradingItems(supabase, teacher.id, 6),
    listRecentActivity(supabase, teacher.id, 15),
  ]);

  const rows = summariesResult.rows;

  // Tái sử dụng dữ liệu từ summariesResult.rows cho classProgress trực tiếp trong bộ nhớ (0ms DB cost)
  const classProgress = rows.map((row) => ({
    classSectionId: row.id,
    classCode: row.code,
    className: row.name,
    completed: row.gradingProgress.completed,
    total: row.gradingProgress.total,
    percentage: row.gradingProgress.percentage,
  }));

  const metrics = summariesResult.metrics;

  return {
    data: {
      metrics,
      pendingGrading,
      classProgress,
      classProgressMeta: {
        page: classPage,
        pageSize: classPageSize,
        total: summariesResult.total,
      },
      recentActivity,
    },
  };
}
