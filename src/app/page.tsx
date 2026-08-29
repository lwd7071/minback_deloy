import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="surface">
        <p className="eyebrow">MinBack scaffold</p>
        <h1>Chọn khu vực bắt đầu</h1>
        <p className="muted">
          Đây là baseline route và kiến trúc. Nghiệp vụ sẽ được Dev A và Dev B
          triển khai theo execution plan.
        </p>
        <div className="route-list">
          <Link className="route-card" href="/teacher/login">
            Teacher/Admin
          </Link>
          <Link className="route-card" href="/student/login">
            Student
          </Link>
        </div>
      </section>
    </main>
  );
}
