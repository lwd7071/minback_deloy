import { z } from "zod";

export const teacherLoginSchema = z.object({
  email: z.email({ message: "Email không hợp lệ" }),
  password: z.string().min(1, { message: "Mật khẩu không được để trống" }),
});

export type TeacherLoginInput = z.infer<typeof teacherLoginSchema>;

export const teacherSetPasswordSchema = z
  .object({
    tokenHash: z.string().trim().min(1),
    password: z.string().min(6),
    passwordConfirmation: z.string().min(6),
  })
  .refine((input) => input.password === input.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Mật khẩu xác nhận không khớp",
  });

export type TeacherSetPasswordInput = z.infer<typeof teacherSetPasswordSchema>;
