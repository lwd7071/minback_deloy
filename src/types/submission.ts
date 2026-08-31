import type { FileAssetDto } from "@/types/file-assets";

export type SubmissionAttemptDto = {
  id: string;
  attemptNumber: number;
  submittedAt: string;
  isLate: boolean;
  files: FileAssetDto[];
};

export type SubmissionSummaryDto = {
  latestAttempt: SubmissionAttemptDto | null;
  attemptCount: number;
};

export type SubmissionHistoryDto = SubmissionSummaryDto & {
  attempts: SubmissionAttemptDto[];
};

export type SubmissionListItemDto = SubmissionSummaryDto & {
  student: { id: string; mssv: string; fullName: string; nickname: string };
};
