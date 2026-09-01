import Link from "next/link";
import { ArrowRight, BookOpen, LockKeyhole, MessagesSquare } from "lucide-react";
import { ClassLookupForm } from "@/components/auth/student/class-lookup-form";

export default function HomePage() {
  return (
    <main className="landing-page">
      <header className="public-header"><Link className="wordmark" href="/"><span className="wordmark-mark"><BookOpen size={18} /></span>MinBack</Link><Link className="btn btn-secondary" href="/admin/login">Dành cho giảng viên <ArrowRight size={16} /></Link></header>
      <section className="lp-hero">
        <div>
          <p className="lp-pill">Hồ sơ học tập theo từng lớp học phần</p>
          <h1>Một nơi rõ ràng<br />cho từng tiến bộ.</h1>
          <p className="lead">Xem bài tập, điểm số và phản hồi của giảng viên trong đúng hồ sơ học tập của bạn.</p>
          <ClassLookupForm />
          <p className="hero-note"><LockKeyhole size={15} /> Truy cập riêng tư bằng mã lớp, nickname và PIN.</p>
        </div>
        <div aria-label="Xem trước hồ sơ học tập">
          <div className="landing-preview">
            <div><span>Lớp học phần</span><strong>SWE201</strong></div>
            <div><span>Bài tập đã chấm</span><strong>7 / 9</strong></div>
            <div><span>Điểm gần nhất</span><strong>8.5</strong></div>
            <div><span>Nhận xét mới</span><strong>2 thông báo</strong></div>
          </div>
        </div>
      </section>
      <section className="landing-principles"><article><BookOpen size={22} /><h2>Một hồ sơ, một lớp</h2><p>Mỗi lượt ghi danh có tiến độ và phản hồi riêng, không lẫn với lớp khác.</p></article><article><MessagesSquare size={22} /><h2>Phản hồi có ngữ cảnh</h2><p>Điểm số, nhận xét và trạng thái bài tập nằm cạnh nhau để dễ theo dõi.</p></article><article><LockKeyhole size={22} /><h2>Thiết kế riêng tư</h2><p>Sinh viên chỉ xem dữ liệu thuộc đúng phiên học tập của mình.</p></article></section>
    </main>
  );
}
