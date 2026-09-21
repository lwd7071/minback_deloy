import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/link",
              message:
                "Use IntentPrefetchLink so navigation only prefetches after user intent.",
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      "src/components/ui/intent-prefetch-link.tsx",
      "src/**/*.test.{js,jsx,ts,tsx}",
    ],
    rules: { "no-restricted-imports": "off" },
  },
  globalIgnores([".next/**", "coverage/**", "out/**"]),
]);
