import { StudentManagementView } from "@/components/students/teacher/student-management-view";
export default async function ClassStudentsPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <StudentManagementView classSectionId={id} />; }
