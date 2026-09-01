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
    const currentChars = Array.from({ length }, (_, i) => value[i] ?? "");
    currentChars[index] = digit;
    const nextValue = currentChars.join("").trimEnd();
    onChange(nextValue);

    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  return (
    <div
      className="otp-input"
      onPaste={(event) => {
        const digits = event.clipboardData
          .getData("text")
          .replace(/\D/g, "")
          .slice(0, length);
        if (digits) {
          event.preventDefault();
          onChange(digits);
          const targetIndex = Math.min(digits.length, length) - 1;
          refs.current[Math.max(0, targetIndex)]?.focus();
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
          type="tel"
          value={value[index] ?? ""}
          onChange={(event) => {
            const rawChar = event.target.value.replace(/\D/g, "").slice(-1);
            setDigit(index, rawChar);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              if (!value[index] && index > 0) {
                event.preventDefault();
                const currentChars = Array.from(
                  { length },
                  (_, i) => value[i] ?? "",
                );
                currentChars[index - 1] = "";
                onChange(currentChars.join("").trimEnd());
                refs.current[index - 1]?.focus();
              } else if (value[index]) {
                event.preventDefault();
                const currentChars = Array.from(
                  { length },
                  (_, i) => value[i] ?? "",
                );
                currentChars[index] = "";
                onChange(currentChars.join("").trimEnd());
                if (index > 0) {
                  refs.current[index - 1]?.focus();
                }
              }
            } else if (event.key === "ArrowLeft" && index > 0) {
              refs.current[index - 1]?.focus();
            } else if (event.key === "ArrowRight" && index < length - 1) {
              refs.current[index + 1]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}
