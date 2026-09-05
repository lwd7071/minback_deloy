import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Modal } from "./modal";
import { OtpInput } from "./otp-input";
import { Button } from "./button";
import { BackLink } from "./back-link";

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

  it("calls onComplete when all digits are entered", () => {
    const onComplete = vi.fn();
    render(
      <OtpInput value="" onChange={() => undefined} onComplete={onComplete} />,
    );
    fireEvent.paste(screen.getByLabelText("Chữ số PIN 1"), {
      clipboardData: { getData: () => "123456" },
    });
    expect(onComplete).toHaveBeenCalledWith("123456");
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

  it("keeps keyboard focus inside the dialog", async () => {
    render(
      <Modal open onClose={() => undefined} title="Chi tiết">
        <button>Đầu</button>
        <button>Cuối</button>
      </Modal>,
    );
    const close = screen.getByRole("button", { name: "Đóng" });
    const last = screen.getByRole("button", { name: "Cuối" });
    await waitFor(() => expect(screen.getByRole("dialog")).toHaveFocus());
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });
});

describe("Button", () => {
  it("supports the compact shared control size", () => {
    render(<Button size="sm">Lưu</Button>);
    expect(screen.getByRole("button", { name: "Lưu" })).toHaveClass("btn-sm");
  });
});

describe("BackLink", () => {
  it("renders an icon-only link with the declared accessible name", () => {
    render(<BackLink fallbackHref="/parent" ariaLabel="Quay lại trang cha" />);
    const button = screen.getByRole("button", { name: "Quay lại trang cha" });
    expect(button).toHaveAttribute("title", "Quay lại trang cha");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("uses a direct home link when fallback navigation is forced", () => {
    render(
      <BackLink
        fallbackHref="/"
        ariaLabel="Quay lại trang chủ"
        forceFallback
      />,
    );

    expect(
      screen.getByRole("link", { name: "Quay lại trang chủ" }),
    ).toHaveAttribute("href", "/");
  });
});
