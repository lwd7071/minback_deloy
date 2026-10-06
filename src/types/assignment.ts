import type { Criterion } from "@/lib/evaluation-criteria";

export type AssignmentStatus = "draft" | "published" | "closed";

export type AssignmentDto = {
  id: string;
  classSectionId: string;
  title: string;
  description: string;
  assignedDate: string;
  dueDate: string;
  status: AssignmentStatus;
  maxScore: number;
  // Tiêu chí chấm điểm (rỗng/undefined = chấm kiểu 1 cột điểm)
  criteria?: Criterion[];
  createdAt: string;
  updatedAt: string;
};

export type TeacherAssignmentSummaryDto = AssignmentDto & {
  gradingSummary: {
    totalStudents: number;
    gradedCount: number;
    returnedCount: number;
    evaluatedCount: number;
    percentage: number;
    state: "empty" | "incomplete" | "complete";
  };
};
