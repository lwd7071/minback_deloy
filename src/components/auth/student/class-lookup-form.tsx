"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import styles from "@/app/home.module.css";

export function ClassLookupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        const value = code.trim().toUpperCase();
        if (value) router.push(`/class/${encodeURIComponent(value)}`);
      }}
    >
      <label htmlFor="home-class-code">Mã lớp học phần</label>
      <input
        id="home-class-code"
        className={styles.input}
        aria-describedby="home-class-hint"
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="characters"
        placeholder="Ví dụ: SWE201_02"
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
      />
      <button className={styles.submit} type="submit" disabled={!code.trim()}>
        Vào lớp <ArrowRight aria-hidden="true" size={16} />
      </button>
      <p id="home-class-hint" className={styles.hint}>
        Dùng mã lớp do giảng viên cung cấp.
      </p>
    </form>
  );
}
