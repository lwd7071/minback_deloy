import type { AssignmentDto } from "@/types/assignment";
import type { EvaluationDto } from "@/types/evaluation";
import type { FileAssetDto } from "@/types/file-assets";
import type { StudentAdminDto } from "@/types/student";
import type { SubmissionSummaryDto } from "@/types/submission";

export type StudentProfileAssignmentDto = AssignmentDto & {
  evaluation: EvaluationDto | null;
  attachments: FileAssetDto[];
  submission: SubmissionSummaryDto;
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
  submissionProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  assignments: StudentProfileAssignmentDto[];
};

export type TeacherStudentProfileDto = {
  student: StudentAdminDto;
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
  submissionProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  assignments: StudentProfileAssignmentDto[];
};
