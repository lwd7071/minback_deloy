import { z } from "zod";

export const evaluationStatusSchema = z.enum(["pending", "graded", "returned"]);

export const evaluationInputSchema = z
  .object({
    score: z
      .number()
      .min(0, "Điểm không được âm")
      .refine((value) => Number.isInteger(value * 10), {
        message: "Điểm chỉ có một chữ số thập phân",
      })
      .nullable(),
    feedback: z.string().max(5_000, "Feedback không được quá 5.000 ký tự"),
    status: evaluationStatusSchema,
  })
  .superRefine((value, context) => {
    if (value.status !== "pending" && value.score === null) {
      context.addIssue({
        code: "custom",
        path: ["score"],
        message: "Evaluation đã chấm hoặc trả kết quả phải có điểm",
      });
    }
  });

export type EvaluationInput = z.infer<typeof evaluationInputSchema>;
