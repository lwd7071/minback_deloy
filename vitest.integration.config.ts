import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    fileParallelism: false,
    globalSetup: ["test/integration/global-setup.ts"],
    include: ["test/integration/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
      SUPABASE_SECRET_KEY: "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz",
      RATE_LIMIT_HMAC_SECRET: "a".repeat(32),
      APP_URL: "http://localhost:3099",
    },
  },
});
