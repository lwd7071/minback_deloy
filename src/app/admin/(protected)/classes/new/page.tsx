import Link from "next/link";
import { ClassCreateFlow } from "@/components/class-sections/teacher/class-create-flow";
export default function CreateClassPage() {
  return (
    <div className="stack">
      <div className="page-head">
        <Link className="btn btn-ghost" href="/admin/dashboard">
          ← Tổng quan
        </Link>
        <h1>Tạo lớp học phần</h1>
      </div>
      <ClassCreateFlow />
    </div>
  );
}
