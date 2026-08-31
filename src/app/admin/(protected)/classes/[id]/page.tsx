import Link from "next/link";
import { ClassDetailTabs } from "@/components/admin/class-detail-tabs";
import { getTeacherClassSection } from "@/server/services/class-section-service";
export default async function AdminClassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const section = await getTeacherClassSection(id);
  return (
    <div className="stack">
      <div className="page-head">
        <Link className="btn btn-ghost" href="/admin/dashboard">
          ← Tổng quan
        </Link>
        <p className="eyebrow">{section.code}</p>
        <h1>{section.name}</h1>
      </div>
      <ClassDetailTabs classSectionId={id} />
    </div>
  );
}
