import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    prefetch,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    prefetch?: boolean;
  }) => {
    void prefetch;
    return <a {...props}>{children}</a>;
  },
}));

import { IntentPrefetchLink } from "../intent-prefetch-link";

describe("IntentPrefetchLink", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    document.head
      .querySelectorAll("link[data-minback-intent-prefetch]")
      .forEach((node) => node.remove());
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: false, effectiveType: "4g" },
    });
  });

  it("does not prefetch until user intent and deduplicates repeated intent", () => {
    render(
      <IntentPrefetchLink href="/admin/classes">Classes</IntentPrefetchLink>,
    );
    const link = screen.getByRole("link", { name: "Classes" });

    expect(document.head.querySelectorAll("link[rel=prefetch]")).toHaveLength(
      0,
    );
    fireEvent.pointerEnter(link, { pointerType: "mouse" });
    fireEvent.focus(link);
    fireEvent.pointerEnter(link, { pointerType: "mouse" });

    expect(document.head.querySelectorAll("link[rel=prefetch]")).toHaveLength(
      1,
    );
    expect(document.head.querySelector("link[rel=prefetch]")).toHaveAttribute(
      "href",
      "/admin/classes",
    );
  });

  it("prefetches on touch intent without requiring a second navigation gesture", () => {
    const onClick = vi.fn();
    render(
      <IntentPrefetchLink href="/admin/settings" onClick={onClick}>
        Settings
      </IntentPrefetchLink>,
    );
    const link = screen.getByRole("link", { name: "Settings" });

    fireEvent.pointerDown(link, { pointerType: "touch" });
    fireEvent.click(link);

    expect(document.head.querySelectorAll("link[rel=prefetch]")).toHaveLength(
      1,
    );
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("skips prefetch on constrained connections while keeping the link usable", () => {
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: true, effectiveType: "2g" },
    });
    render(
      <IntentPrefetchLink href="/admin/classes">Classes</IntentPrefetchLink>,
    );
    const link = screen.getByRole("link", { name: "Classes" });

    fireEvent.pointerEnter(link, { pointerType: "mouse" });
    expect(document.head.querySelectorAll("link[rel=prefetch]")).toHaveLength(
      0,
    );
    expect(link).toHaveAttribute("href", "/admin/classes");
  });
});
