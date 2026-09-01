"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Hash } from "lucide-react";

export function ClassLookupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form
      className="class-lookup"
      onSubmit={(event) => {
        event.preventDefault();
        const value = code.trim().toUpperCase();
        if (value) router.push(`/class/${encodeURIComponent(value)}`);
      }}
    >
      <Hash aria-hidden="true" size={18} />
      <input
        aria-label="Mã lớp học phần"
        autoCapitalize="characters"
        placeholder="Nhập mã lớp học phần, ví dụ: SWE201_02"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
      />
      <button className="btn btn-primary" type="submit" disabled={!code.trim()}>
        Vào lớp <ArrowRight aria-hidden="true" size={16} />
      </button>
    </form>
  );
}
