import { z } from "zod";

export const assignmentStatusSchema = z.enum(["draft", "published", "closed"]);

export const assignmentTitleSchema = z
  .string()
  .trim()
  .min(1, "Tên bài tập không được để trống")
  .max(200, "Tên bài tập không được quá 200 ký tự");

export const assignmentDescriptionSchema = z
  .string()
  .max(10_000, "Mô tả không được quá 10.000 ký tự");

export const assignmentDateSchema = z.iso.date("Ngày không hợp lệ");

export const assignmentMaxScoreSchema = z
  .number()
  .min(0.1, "Điểm tối đa phải từ 0,1")
  .max(999.9, "Điểm tối đa không được quá 999,9")
  .refine((value) => Number.isInteger(value * 10), {
    message: "Điểm tối đa chỉ có một chữ số thập phân",
  });

const assignmentFieldsSchema = z.object({
  title: assignmentTitleSchema,
  description: assignmentDescriptionSchema.default(""),
  assignedDate: assignmentDateSchema,
  dueDate: assignmentDateSchema,
  status: assignmentStatusSchema.default("draft"),
  maxScore: assignmentMaxScoreSchema.default(10),
});

export const assignmentCreateSchema = assignmentFieldsSchema.refine(
  (value) => value.dueDate >= value.assignedDate,
  { message: "Hạn nộp phải sau hoặc bằng ngày giao", path: ["dueDate"] },
);

export const assignmentUpdateSchema = assignmentFieldsSchema
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Phải cung cấp dữ liệu để cập nhật",
  });

export type AssignmentCreateInput = z.infer<typeof assignmentCreateSchema>;
export type AssignmentUpdateInput = z.infer<typeof assignmentUpdateSchema>;
