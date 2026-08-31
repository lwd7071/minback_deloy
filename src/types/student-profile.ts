import type { AssignmentDto } from "@/types/assignment";
import type { EvaluationDto } from "@/types/evaluation";

export type StudentProfileAssignmentDto = AssignmentDto & {
  evaluation: EvaluationDto | null;
};

export type StudentProfileDto = {
  student: {
    mssv: string;
    fullName: string;
    nickname: string;
  };
  classSection: {
    id: string;
    code: string;
    name: string;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  assignments: StudentProfileAssignmentDto[];
};
