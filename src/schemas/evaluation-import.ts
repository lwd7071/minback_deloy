import { z } from "zod";

export const evaluationImportRowSchema = z.object({
  rowNumber: z.number().int().positive(),
  mssv: z.string().trim().min(1, "MSSV không được để trống"),
  fullName: z.string().trim().optional(),
  score: z
    .number()
    .min(0, "Điểm không được âm")
    .max(100, "Điểm vượt quá giới hạn tối đa")
    .nullable(),
  feedback: z
    .string()
    .trim()
    .max(5000, "Nhận xét tối đa 5.000 ký tự")
    .nullable(),
});

export const criterionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  weight: z.number().gt(0).max(100),
});

export const criterionScoreSchema = criterionSchema.extend({
  score: z.number(),
});

export const evaluationImportItemSchema = z.object({
  studentId: z.string().uuid("studentId không hợp lệ"),
  score: z
    .number()
    .min(0, "Điểm không được âm")
    .max(100, "Điểm vượt quá giới hạn")
    .nullable(),
  feedback: z
    .string()
    .trim()
    .max(5000, "Nhận xét tối đa 5.000 ký tự")
    .nullable(),
  // Điểm từng tiêu chí (thang 10); khi có thì server tính lại `score`
  criteriaScores: z.array(criterionScoreSchema).max(20).optional(),
});

export const evaluationImportInputSchema = z.object({
  mode: z.enum(["save_draft", "publish"]),
  criteria: z.array(criterionSchema).max(20).optional(),
  evaluations: z
    .array(evaluationImportItemSchema)
    .min(1, "Danh sách đánh giá không được để trống"),
});

export type EvaluationImportInput = z.infer<typeof evaluationImportInputSchema>;
export type EvaluationImportItem = z.infer<typeof evaluationImportItemSchema>;
