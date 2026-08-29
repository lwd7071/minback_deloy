import "server-only";

import { z } from "zod";

import { getPublicEnv } from "@/lib/env/public";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  RATE_LIMIT_HMAC_SECRET: z.string().min(32),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.email().optional().or(z.literal("")),
  APP_URL: z.url().default("http://localhost:3000"),
});

export function getServerEnv() {
  return {
    ...getPublicEnv(),
    ...serverEnvSchema.parse({
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
      RATE_LIMIT_HMAC_SECRET: process.env.RATE_LIMIT_HMAC_SECRET,
      EMAIL_PROVIDER_API_KEY: process.env.EMAIL_PROVIDER_API_KEY,
      EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
      APP_URL: process.env.APP_URL,
    }),
  };
}
