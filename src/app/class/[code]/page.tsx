import { PublicClassView } from "@/components/student/public-class-view";
export default async function ClassLookupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="public-shell">
      <div className="auth-wrap">
        <PublicClassView code={code.toUpperCase()} />
      </div>
    </main>
  );
}
