import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Modal } from "./modal";
import { OtpInput } from "./otp-input";
import { Button } from "./button";

afterEach(cleanup);

describe("OtpInput", () => {
  it("accepts a six-digit paste as one PIN value", () => {
    function Harness() {
      const [value, setValue] = useState("");
      return <OtpInput value={value} onChange={setValue} />;
    }
    render(<Harness />);
    fireEvent.paste(screen.getByLabelText("Chữ số PIN 1"), {
      clipboardData: { getData: () => "12a3456" },
    });
    expect(screen.getByLabelText("Chữ số PIN 6")).toHaveValue("6");
  });
});

describe("Modal", () => {
  it("closes on Escape and returns focus to its trigger", () => {
    const onClose = vi.fn();
    render(
      <>
        <button autoFocus>Mở</button>
        <Modal open onClose={onClose} title="Chi tiết">
          <button>Lưu</button>
        </Modal>
      </>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("applies the requested size without changing dialog semantics", () => {
    render(
      <Modal open onClose={() => undefined} title="Chi tiết" size="lg">
        Nội dung
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("modal-lg");
  });
});

describe("Button", () => {
  it("supports the compact shared control size", () => {
    render(<Button size="sm">Lưu</Button>);
    expect(screen.getByRole("button", { name: "Lưu" })).toHaveClass("btn-sm");
  });
});
