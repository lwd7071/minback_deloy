import { ClassLookupForm } from "@/components/student/class-lookup-form";
import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <nav className="lp-nav">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">M</span>MinBack
        </Link>
        <div className="lp-links">
          <Link href="/" className="active-link">
            Trang chủ
          </Link>
          <Link href="#">Hướng dẫn</Link>
          <Link href="#">Hỗ trợ</Link>
        </div>
        <Link className="btn btn-ghost" href="/admin/login">
          Đăng nhập giảng viên
        </Link>
      </nav>

      <section className="lp-hero">
        <div>
          <h1 className="hero-title">
            Một nhịp học tập, <span>mọi tiến bộ.</span>
          </h1>
          <p className="lead">Theo dõi bài tập và phản hồi dễ dàng.</p>
          <ClassLookupForm />
        </div>

        <div className="lp-visual">
          <div className="card stack">
            <div className="ring-wrap">
              <div className="ring">
                <svg width="70" height="70" viewBox="0 0 70 70">
                  <circle
                    cx="35"
                    cy="35"
                    r="28"
                    stroke="#EEF1F4"
                    strokeWidth="7"
                    fill="none"
                  />
                  <circle
                    cx="35"
                    cy="35"
                    r="28"
                    stroke="var(--primary)"
                    strokeWidth="7"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="175.929"
                    strokeDashoffset="38.704"
                  />
                </svg>
                <div className="pct">78%</div>
              </div>
              <div>
                <b>SWE201_02</b>
                <span className="muted">Tiến độ học tập</span>
              </div>
            </div>
            <div>
              <div className="row">
                <span>Thiết kế kiến trúc hệ thống</span>
                <span className="badge badge-graded">Đã chấm</span>
              </div>
              <div className="row">
                <span>Phân tích Requirement</span>
                <span className="badge badge-draft">Chưa nộp</span>
              </div>
              <div className="row">
                <span>Đánh giá chéo Mockup</span>
                <span className="badge badge-warning">Đang mở</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}