import { PublicClassView } from "@/components/student/public-class-view";
import Link from "next/link";

export default async function ClassLookupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="public-shell">
      <div className="auth-wrap stack">

        <PublicClassView code={code.toUpperCase()} />
      </div>
    </main>
  );
}
