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
      "--color-primary: #1e3a4a",
      "--color-primary-hover: #2c5468",
      "--color-accent: #f5b400",
      "--color-background: #fbfaf7",
      "--color-surface-elevated: #ffffff",
      "--color-text-primary: #16303d",
      "--color-border: #e1e6e9",
      "--elevation-2: 0 10px 28px rgba(30, 58, 74, 0.12)",
    ];
    for (const token of tokens) expect(globals).toContain(token);

    expect(globals).not.toMatch(
      /(^|\s)--(?:navy|gold|surface|text-primary|text-secondary|border|success|danger|paper|paper-raised|ink|ink-deep|muted|rule|brass|brass-soft|shadow-paper)\b/,
    );
  });

  it.each(["draft", "published", "closed", "pending", "graded", "returned"])(
    "defines a direct badge selector for %s",
    (status) => {
      expect(globals).toContain(`.badge-${status}`);
    },
  );
});
