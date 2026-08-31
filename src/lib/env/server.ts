import "server-only";

import { z } from "zod";

import { getPublicEnv } from "@/lib/env/public";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  RATE_LIMIT_HMAC_SECRET: z.string().min(32),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.email().optional().or(z.literal("")),
  BREVO_SENDER_NAME: z.string().trim().min(1).max(100).default("MinBack"),
  APP_URL: z.url().default("http://localhost:3000"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
});

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
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    }),
  };
}
