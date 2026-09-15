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
