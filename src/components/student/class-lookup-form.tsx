"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ClassLookupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form
      className="lp-search"
      onSubmit={(event) => {
        event.preventDefault();
        const value = code.trim().toUpperCase();
        if (value) router.push(`/class/${encodeURIComponent(value)}`);
      }}
    >
      <input
        aria-label="Mã lớp học phần"
        autoCapitalize="characters"
        placeholder="Nhập mã lớp học phần, ví dụ: SWE201_02"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
      />
      <button type="submit" disabled={!code.trim()}>
        Vào lớp
      </button>
    </form>
  );
}
