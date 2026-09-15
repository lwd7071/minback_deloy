import { redirect } from "next/navigation";

export default async function ClassGradebookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/classes/${encodeURIComponent(id)}/assignments`);
}
