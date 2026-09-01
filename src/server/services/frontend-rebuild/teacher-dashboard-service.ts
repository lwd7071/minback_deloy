import "server-only";

import { requireTeacher } from "@/server/auth/teacher-auth";
import {
  listPendingGradingItems,
  listRecentActivity,
} from "@/server/repositories/teacher-dashboard-repository";
import { listClassSectionSummaries } from "@/server/repositories/frontend-rebuild-repository";

export async function getTeacherDashboardOverview() {
  const { supabase, teacher } = await requireTeacher();

  // Chạy song song 3 truy vấn độc lập (loại bỏ lời gọi RPC trùng lặp listClassGradingProgress)
  const [summariesResult, pendingGrading, recentActivity] = await Promise.all([
    listClassSectionSummaries(supabase, teacher.id, 1, 100),
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
