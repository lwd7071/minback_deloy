"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function StudentClassError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const params = useParams<{ code?: string }>();
  const classCode = typeof params.code === "string" ? params.code : "";
  return (
    <main className="workspace-state" role="alert">
      <p className="form-error">
        Không thể tải không gian học tập. Vui lòng thử lại.
      </p>
      <div className="cluster">
        <button className="btn btn-primary" type="button" onClick={reset}>
          Thử lại
        </button>
        <Link
          className="btn btn-outline"
          href={`/class/${encodeURIComponent(classCode)}`}
        >
          Quay về lớp
        </Link>
      </div>
    </main>
  );
}
