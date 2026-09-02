import { z } from "zod";

export const classSectionCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, "Mã lớp phải có ít nhất 2 ký tự")
  .max(50, "Mã lớp không được quá 50 ký tự")
  .regex(
    /^[A-Z0-9_-]+$/,
    "Mã lớp chỉ được chứa chữ hoa, số, gạch dưới hoặc gạch ngang",
  );

export const classSectionNameSchema = z
  .string()
  .trim()
  .min(1, "Tên lớp không được để trống")
  .max(150, "Tên lớp không được quá 150 ký tự");

export const classSectionCreateSchema = z.object({
  code: classSectionCodeSchema,
  name: classSectionNameSchema,
});

export const classSectionUpdateSchema = z
  .object({
    code: classSectionCodeSchema.optional(),
    name: classSectionNameSchema.optional(),
  })
  .refine((value) => value.code !== undefined || value.name !== undefined, {
    message: "Phải cung cấp code hoặc name để cập nhật",
  });

export const classSectionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});

export type ClassSectionCreateInput = z.infer<typeof classSectionCreateSchema>;
export type ClassSectionUpdateInput = z.infer<typeof classSectionUpdateSchema>;
export type ClassSectionListQuery = z.infer<typeof classSectionListQuerySchema>;
