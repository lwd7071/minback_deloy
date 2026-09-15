import { redirect } from "next/navigation";

export default async function StudentSubmissionsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/class/${code}/grades`);
}
