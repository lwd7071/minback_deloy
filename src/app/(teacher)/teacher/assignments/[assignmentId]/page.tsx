import { AssignmentDetailView } from "@/components/teacher/assignments/assignment-detail-view";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  return <AssignmentDetailView assignmentId={assignmentId} />;
}
