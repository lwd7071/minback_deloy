/**
 * src/schemas/student-auth.ts
 *
 * Zod validation schemas cho tất cả input của Student Auth domain.
 * Dùng trong Route Handler để parse và validate request body/query.
 *
 * Contract khóa từ docs/team/dev-b-assignment.md mục 2.3:
 * - classCode: 2–50 ký tự, ^[A-Z0-9_-]+$
 * - nickname: 3–50 ký tự, ^[A-Za-z0-9._-]+$, unique trong lớp
 * - pin: đúng 6 chữ số, ^\d{6}$
 * - fullName: trim, 1–150 ký tự
 * - email: null/chuỗi rỗng → null; nếu có phải là email hợp lệ ≤254 ký tự
 */

import { z } from "zod";

// ─── Primitive validators (tái sử dụng) ──────────────────────────────────────

/** Mã lớp học phần — normalize về uppercase trước khi validate */
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

/** Nickname — trim nhưng giữ nguyên case */
export const nicknameSchema = z
  .string()
  .trim()
  .min(3, "Nickname phải có ít nhất 3 ký tự")
  .max(50, "Nickname không được quá 50 ký tự")
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "Nickname chỉ được chứa chữ cái, số, dấu chấm, gạch dưới hoặc gạch ngang",
  );

/** PIN 6 chữ số */
export const pinSchema = z
  .string()
  .regex(/^\d{6}$/, "PIN phải là đúng 6 chữ số");

/** Họ tên — trim, 1–150 ký tự */
export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Họ tên không được để trống")
  .max(150, "Họ tên không được quá 150 ký tự");

/**
 * Email — null/chuỗi rỗng chuyển thành null;
 * nếu có giá trị thật thì phải là email hợp lệ ≤254 ký tự
 */
export const studentEmailSchema = z
  .string()
  .trim()
  .transform((val) => (val === "" ? null : val))
  .pipe(
    z
      .string()
      .email("Email không hợp lệ")
      .max(254, "Email không được quá 254 ký tự")
      .nullable(),
  )
  .nullable()
  .optional();

// ─── Request body schemas ──────────────────────────────────────────────────────

/**
 * POST /api/v1/student/auth/login
 * Body: { classCode, nickname, pin }
 */
export const studentLoginSchema = z.object({
  classCode: classSectionCodeSchema,
  nickname: nicknameSchema,
  pin: pinSchema,
});

export type StudentLoginInput = z.infer<typeof studentLoginSchema>;

/**
 * PATCH /api/v1/student/auth/credentials
 * Body: { nickname?, pin? } — ít nhất một field phải có.
 * Cho phép đổi từng cái một; session chỉ rotate lên 'full'
 * khi tất cả flag must_change_* đã được xóa.
 */
export const credentialsUpdateSchema = z
  .object({
    nickname: nicknameSchema.optional(),
    pin: pinSchema.optional(),
  })
  .refine((data) => data.nickname !== undefined || data.pin !== undefined, {
    message: "Phải cung cấp ít nhất một trong hai: nickname hoặc pin mới",
  });

export type CredentialsUpdateInput = z.infer<typeof credentialsUpdateSchema>;

/**
 * PATCH /api/v1/teacher/class-sections/:classSectionId/students/:studentId
 * Body: { fullName?, email?, nickname? }
 */
export const studentAdminUpdateSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    email: studentEmailSchema,
    nickname: nicknameSchema.optional(),
  })
  .refine(
    (data) =>
      data.fullName !== undefined ||
      data.email !== undefined ||
      data.nickname !== undefined,
    { message: "Phải cung cấp ít nhất một field để cập nhật" },
  );

export type StudentAdminUpdateInput = z.infer<typeof studentAdminUpdateSchema>;

// ─── Query schemas ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/teacher/class-sections/:classSectionId/students
 * Query: { page?, pageSize?, search? }
 */
export const studentListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  pageSize: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  search: z
    .string()
    .trim()
    .max(100, "Từ khóa tìm kiếm không được quá 100 ký tự")
    .optional(),
});

export type StudentListQuery = z.infer<typeof studentListQuerySchema>;

/**
 * GET /api/v1/student/notifications
 * Query: { page?, pageSize?, unreadOnly? }
 */
export const notificationListQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  pageSize: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

/**
 * PATCH /api/v1/teacher/settings/notifications
 * Body: { emailEnabled: boolean }
 */
export const notificationSettingsUpdateSchema = z.object({
  emailEnabled: z.boolean(),
});

export type NotificationSettingsUpdateInput = z.infer<
  typeof notificationSettingsUpdateSchema
>;
