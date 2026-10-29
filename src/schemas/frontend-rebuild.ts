import { z } from "zod";

export const gradebookQuerySchema = z.object({
  studentPage: z.coerce.number().int().min(1).default(1),
  studentPageSize: z.coerce.number().int().min(1).max(100).default(20),
  assignmentPage: z.coerce.number().int().min(1).default(1),
  assignmentPageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const gradebookConfigSchema = z
  .object({
    assignments: z.array(
      z.object({
        assignmentId: z
          .string()
          .regex(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
          ),
        included: z.boolean(),
        weight: z
          .number()
          .gt(0)
          .max(100)
          .refine(
            (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-8,
          )
          .nullable(),
      }),
    ),
  })
  .superRefine(({ assignments }, context) => {
    if (
      new Set(assignments.map((item) => item.assignmentId)).size !==
      assignments.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["assignments"],
        message: "Bài tập bị trùng trong cấu hình",
      });
    }
    if (assignments.some((item) => item.included && item.weight === null)) {
      context.addIssue({
        code: "custom",
        path: ["assignments"],
        message: "Bài tập được tính tổng phải có trọng số",
      });
    }
    const includedWeight = assignments.reduce(
      (sum, item) => sum + (item.included ? (item.weight ?? 0) : 0),
      0,
    );
    if (includedWeight !== 0 && Math.abs(includedWeight - 100) > 0.01) {
      context.addIssue({
        code: "custom",
        path: ["assignments"],
        message: "Tổng trọng số các bài được tính phải bằng 100%",
      });
    }
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
export type GradebookConfigInput = z.infer<typeof gradebookConfigSchema>;
export type BulkEvaluationInput = z.infer<typeof bulkEvaluationSchema>;
