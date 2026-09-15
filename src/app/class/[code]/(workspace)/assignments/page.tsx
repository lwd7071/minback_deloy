import { redirect } from "next/navigation";

export default async function StudentAssignmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{ assignment?: string }>;
}) {
  const { code } = await params;
  const query = searchParams ? await searchParams : {};
  redirect(
    `/class/${encodeURIComponent(code)}/grades${query.assignment ? `?assignment=${encodeURIComponent(query.assignment)}` : ""}`,
  );
}
