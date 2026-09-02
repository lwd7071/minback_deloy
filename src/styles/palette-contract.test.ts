import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const globals = readFileSync(
  join(process.cwd(), "src/app/globals.css"),
  "utf8",
);

describe("MinBack palette contract", () => {
  it("declares the locked canonical tokens and removes legacy aliases", () => {
    const tokens = [
      "--navy-900: #1e3a4a",
      "--navy-700: #2c5468",
      "--gold-500: #f5b400",
      "--surface: #fbfaf7",
      "--surface-raised: #ffffff",
      "--text-primary: #16303d",
      "--border: #e1e6e9",
      "--shadow-md: 0 10px 28px rgba(30, 58, 74, 0.12)",
    ];
    for (const token of tokens) expect(globals).toContain(token);

    expect(globals).not.toMatch(
      /--(?:paper|paper-raised|ink|ink-deep|muted|rule|brass|brass-soft|warning|info|shadow-paper)\b/,
    );
  });

  it.each(["draft", "published", "closed", "pending", "graded", "returned"])(
    "defines a direct badge selector for %s",
    (status) => {
      expect(globals).toContain(`.badge-${status}`);
    },
  );
});
