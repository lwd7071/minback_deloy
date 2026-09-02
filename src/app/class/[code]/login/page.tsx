import { redirect } from "next/navigation";

export default async function ClassLoginRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/class/${encodeURIComponent(code)}`);
}
