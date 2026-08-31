import "server-only"; // tránh import vào client component 

// thư viện định nghĩa schema 
import { z } from "zod";
// zod gác cổng đảm bảo env variable luôn hợp lệ 

// import các schema đã định nghĩa 
import { getPublicEnv } from "@/lib/env/public";

// định nghĩa schema cho server env
const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1), // bắt phải có chuỗi  
  RATE_LIMIT_HMAC_SECRET: z.string().min(32), // khóa mã hóa hmac phục vụ rate limit dài 32 ký tự 
  BREVO_API_KEY: z.string().optional(),   // có thể cấu hình sau ko bắt buộc 
  BREVO_SENDER_EMAIL: z.email().optional().or(z.literal("")),
  BREVO_SENDER_NAME: z.string().trim().min(1).max(100).default("MinBack"),
  APP_URL: z.url().default("http://localhost:3000"),
});

// hàm  lấy và xác thực môi trường 
export function getServerEnv() {
  return {
    ...getPublicEnv(),
    ...serverEnvSchema.parse({
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
      RATE_LIMIT_HMAC_SECRET: process.env.RATE_LIMIT_HMAC_SECRET,
      BREVO_API_KEY: process.env.BREVO_API_KEY,
      BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
      BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
      APP_URL: process.env.APP_URL,
    }),
  };
}
