import "server-only";

import { requireTeacher } from "@/server/auth/teacher-auth";
import {
  listClassGradingProgress,
  listPendingGradingItems,
  listRecentActivity,
} from "@/server/repositories/teacher-dashboard-repository";
import { listClassSectionSummaries } from "@/server/repositories/frontend-rebuild-repository";

export async function getTeacherDashboardOverview() {
  const { supabase, teacher } = await requireTeacher();

  const [summariesResult, pendingGrading, classProgress, recentActivity] =
    await Promise.all([
      // Get all summaries for the top metrics
      listClassSectionSummaries(supabase, teacher.id, 1, 100),
      listPendingGradingItems(supabase, teacher.id, 6),
      listClassGradingProgress(supabase, teacher.id),
      listRecentActivity(supabase, teacher.id, 15),
    ]);

  const rows = summariesResult.rows;
  const metrics = {
    classCount: rows.length,
    studentCount: rows.reduce((acc, r) => acc + r.studentCount, 0),
    assignmentCount: rows.reduce((acc, r) => acc + r.assignmentCount, 0),
    gradingPercentage: 0,
  };

  const totalGradingCompleted = rows.reduce(
    (acc, r) => acc + r.gradingProgress.completed,
    0,
  );
  const totalGrading = rows.reduce(
    (acc, r) => acc + r.gradingProgress.total,
    0,
  );
  
  if (totalGrading > 0) {
    metrics.gradingPercentage = Math.round((totalGradingCompleted / totalGrading) * 100);
  }

  return {
    data: {
      metrics,
      pendingGrading,
      classProgress,
      recentActivity,
    },
  };
}
