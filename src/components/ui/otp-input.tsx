"use client";

import { useRef } from "react";

export function OtpInput({
  value,
  onChange,
  disabled,
  length = 6,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  length?: number;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const setDigit = (index: number, digit: string) => {
    const chars = value.padEnd(length, " ").split("");
    chars[index] = digit;
    const next = chars.join("").replace(/\s/g, "").slice(0, length);
    onChange(next);
    if (digit && index < length - 1) refs.current[index + 1]?.focus();
  };
  return (
    <div
      className="otp-row"
      onPaste={(event) => {
        const digits = event.clipboardData
          .getData("text")
          .replace(/\D/g, "")
          .slice(0, length);
        if (digits) {
          event.preventDefault();
          onChange(digits);
          refs.current[Math.min(digits.length, length) - 1]?.focus();
        }
      }}
    >
      {Array.from({ length }, (_, index) => (
        <input
          aria-label={`Chữ số PIN ${index + 1}`}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          className="otp-digit"
          disabled={disabled}
          inputMode="numeric"
          key={index}
          maxLength={1}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="password"
          value={value[index] ?? ""}
          onChange={(event) =>
            setDigit(index, event.target.value.replace(/\D/g, "").slice(-1))
          }
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !value[index] && index > 0)
              refs.current[index - 1]?.focus();
            if (event.key === "ArrowLeft")
              refs.current[Math.max(0, index - 1)]?.focus();
            if (event.key === "ArrowRight")
              refs.current[Math.min(length - 1, index + 1)]?.focus();
          }}
        />
      ))}
    </div>
  );
}
