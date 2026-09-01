import { PublicClassView } from "@/components/class-sections/student/public-class-view";

export default async function ClassLookupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <main className="public-shell">
      <PublicClassView code={code.toUpperCase()} />
    </main>
  );
}
