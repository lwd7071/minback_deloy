import { GradebookView } from "@/components/evaluations/teacher/gradebook-view";
export default async function ClassGradebookPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <GradebookView classSectionId={id} />; }
