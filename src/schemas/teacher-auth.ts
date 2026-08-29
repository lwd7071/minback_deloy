import { z } from "zod";

export const teacherLoginSchema = z.object({
  email: z.email({ message: "Email không hợp lệ" }),
  password: z.string().min(1, { message: "Mật khẩu không được để trống" }),
});

export type TeacherLoginInput = z.infer<typeof teacherLoginSchema>;
