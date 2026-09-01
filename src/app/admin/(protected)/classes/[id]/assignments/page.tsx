import { ClassAssignmentsView } from "@/components/assignments/teacher/class-assignments-view";
export default async function ClassAssignmentsPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ClassAssignmentsView classSectionId={id} />; }
