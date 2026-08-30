export type ImportRowDto = {
  row: number;
  status: "created" | "updated" | "skipped";
  studentId?: string;
  initialNickname?: string;
  initialPin?: string;
  errors?: Array<{ field: string; message: string }>;
};

export type ImportResultDto = {
  summary: { total: number; created: number; updated: number; skipped: number };
  rows: ImportRowDto[];
};
