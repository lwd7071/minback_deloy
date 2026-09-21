import { PublicClassView } from "@/components/class-sections/student/public-class-view";
import { getPublicClassSection } from "@/server/services/frontend-rebuild/frontend-api-service";
import { headers } from "next/headers";

export default async function ClassLookupPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalizedCode = code.toUpperCase();
  const requestHeaders = await headers();
  let initialSection = null;
  try {
    initialSection = await getPublicClassSection(
      normalizedCode,
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    );
  } catch {
    // Keep the public auth card's user-facing not-found state.
  }
  return (
    <main className="public-shell">
      <PublicClassView code={normalizedCode} initialSection={initialSection} />
    </main>
  );
}
