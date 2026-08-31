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
      <div style={{ padding: "0 12px", color: "var(--ink-faint)", background: "#f2f5f8", borderRadius: "50%", width: "32px", height: "32px", display: "grid", placeItems: "center", fontSize: "18px", fontWeight: "bold" }}>
        #
      </div>
      <input
        aria-label="Mã lớp học phần"
        autoCapitalize="characters"
        placeholder="Nhập mã lớp học phần, ví dụ: SWE201_02"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
      />
      <button className="btn btn-primary" type="submit" disabled={!code.trim()} style={{ borderRadius: "10px", padding: "10px 24px" }}>
        Vào lớp <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </form>
  );
}
