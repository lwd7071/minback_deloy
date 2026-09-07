import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthCard } from "./auth-card";

describe("AuthCard", () => {
  it("keeps back, header, form and footer in a stable order", () => {
    render(
      <AuthCard
        back={{ fallbackHref: "/", ariaLabel: "Quay lại" }}
        title="Đăng nhập"
        context={<div>Context</div>}
        footer={<div>Footer</div>}
      >
        <label htmlFor="field">Trường</label>
        <input id="field" />
      </AuthCard>,
    );
    const card = document.querySelector(".auth-card")!;
    expect(
      [...card.children].map((node) => node.className.split(" ")[0]),
    ).toEqual([
      "page-back-slot",
      "auth-card-header has-context",
      "auth-form",
      "auth-card-footer",
    ]);
    expect(
      screen.getByRole("heading", { name: "Đăng nhập" }),
    ).toBeInTheDocument();
  });
});
