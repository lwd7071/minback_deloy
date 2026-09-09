import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Card } from "../card";

describe("Card", () => {
  it("renders children and native div props without leaking children into spread props", () => {
    render(
      <Card variant="compact" hover aria-label="Thẻ mẫu">
        Nội dung
      </Card>,
    );
    const card = document.querySelector(".card")!;
    expect(card).toHaveAttribute("aria-label", "Thẻ mẫu");
    expect(card).toHaveClass("card-compact", "card-hover");
    expect(card).toHaveTextContent("Nội dung");
  });
});
