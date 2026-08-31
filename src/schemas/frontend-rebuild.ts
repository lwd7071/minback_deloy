import { z } from "zod";

export const gradebookQuerySchema = z.object({
  studentPage: z.coerce.number().int().min(1).default(1),
  studentPageSize: z.coerce.number().int().min(1).max(100).default(20),
  assignmentPage: z.coerce.number().int().min(1).default(1),
  assignmentPageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const bulkEvaluationSchema = z.object({
  evaluations: z
    .array(
      z.object({
        studentId: z.uuid(),
        score: z.number().min(0).nullable(),
        feedback: z.string().max(5_000),
        status: z.enum(["pending", "graded", "returned"]),
      }),
    )
    .min(1)
    .max(100)
    .refine(
      (rows) => new Set(rows.map((row) => row.studentId)).size === rows.length,
      "Student bị trùng trong batch",
    ),
});

export type GradebookQuery = z.infer<typeof gradebookQuerySchema>;
export type BulkEvaluationInput = z.infer<typeof bulkEvaluationSchema>;
