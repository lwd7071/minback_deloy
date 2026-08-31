import { ClassLookupForm } from "@/components/student/class-lookup-form";
import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ minHeight: "100vh", background: "url('/bg-pattern.svg') center/cover no-repeat, linear-gradient(180deg, #f8faff 0%, #edf2f9 100%)" }}>
      <nav className="lp-nav" style={{ padding: "20px clamp(var(--space-4), 4vw, var(--space-8))", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
        <div style={{ flex: 1 }}>
          <Link className="brand-lockup" href="/">
            <div className="brand-mark" style={{ width: "28px", height: "28px", fontSize: "16px", borderRadius: "8px" }}>M</div>
            MinBack
          </Link>
        </div>
        
        <div style={{ display: "flex", gap: "32px", fontWeight: "600", fontSize: "15px" }}>
        </div>

        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <Link className="btn btn-primary" href="/admin/login" style={{ borderRadius: "8px", fontSize: "14px", height: "40px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Đăng nhập giảng viên
          </Link>
        </div>
      </nav>

      <section className="lp-hero" style={{ minHeight: "auto", padding: "64px clamp(var(--space-4), 4vw, var(--space-8))" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "16px" }}>
          <div className="lp-pill" style={{ marginBottom: "0" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            Nền tảng học tập thông minh
          </div>
          <h1 className="hero-title" style={{ lineHeight: 1.25, letterSpacing: "-0.02em", color: "var(--ink)", margin: 0 }}>
            <span style={{ whiteSpace: "nowrap" }}>Một nhịp học tập,</span><br />
            <span style={{ color: "var(--primary-bright)" }}>mọi tiến bộ.</span>
          </h1>
          <p className="lead" style={{ fontSize: "1.1rem", margin: 0 }}>Theo dõi bài tập và phản hồi dễ dàng.</p>
          <div style={{ maxWidth: "480px", width: "100%", marginTop: "8px" }}>
            <ClassLookupForm />
          </div>
        </div>

        <div className="lp-visual">
          

        </div>
      </section>

      

    </main>
  );
}
