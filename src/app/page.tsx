import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ClassLookupForm } from "@/components/auth/student/class-lookup-form";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "MinBack — Lớp học của bạn",
  description:
    "Xem bài tập, điểm số và phản hồi trong lớp học của bạn cùng MinBack.",
};

export default function HomePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          MinBack
        </Link>
        <Link className={styles.teacher} href="/admin/login">
          Dành cho giảng viên <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </header>
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            Lớp học của bạn.
            <br />
            Mọi tiến bộ, ở đây.
          </h1>
          <p className={styles.description}>
            Xem bài tập, điểm số và phản hồi
            <br />
            trong lớp học của bạn.
          </p>
          <ClassLookupForm />
        </div>
      </main>
      <footer className={styles.footer}>
        MinBack · Không gian học tập riêng tư
      </footer>
    </div>
  );
}
