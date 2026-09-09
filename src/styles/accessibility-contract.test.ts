import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function luminance(hex: string) {
  const rgb =
    hex.match(/[a-f\d]{2}/gi)?.map((value) => parseInt(value, 16) / 255) ?? [];
  const channels = rgb.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return (
    0.2126 * (channels[0] ?? 0) +
    0.7152 * (channels[1] ?? 0) +
    0.0722 * (channels[2] ?? 0)
  );
}

describe("UI accessibility contract", () => {
  it("keeps required focus and dialog semantics in the stylesheet", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain("--color-focus-ring");
    expect(css).toContain("outline-offset: 2px");
    expect(css).toContain("min-height: 44px");
    expect(css).toContain(".teacher-mini-ring-value");
    expect(css).toContain("stroke: var(--color-success)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".class-filter-tab.is-active");
    expect(css).toContain(".class-create-wizard");
    expect(css).toContain("width: min(100%, 980px);");
    expect(css).toContain("margin-inline: auto;");
    expect(css).toContain(".class-create-stage .form-stack");
    expect(css).toContain("width: 100%;");
    expect(css).toContain(".teacher-mini-ring-label");
    expect(css).toContain("line-height: 1;");
    expect(css).toContain(".class-filter-tab-pending.is-pending");
  });

  it("keeps primary text and surface contrast at WCAG AA level", () => {
    const foreground = luminance("16303d");
    const background = luminance("ffffff");
    const ratio =
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(7);
  });
});
