import Link from "next/link";
import { BulkGradeView } from "@/components/admin/bulk-grade-view";
export default async function GradePage({
  params,
}: {
  params: Promise<{ id: string; aid: string }>;
}) {
  const { id, aid } = await params;
  return (
    <div className="stack">
      <Link
        className="btn btn-ghost"
        href={`/admin/classes/${id}?tab=assignments`}
      >
        ← Quay lại lớp
      </Link>
      <BulkGradeView classSectionId={id} assignmentId={aid} />
    </div>
  );
}
