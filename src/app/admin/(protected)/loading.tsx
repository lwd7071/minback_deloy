import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div
      className="admin-loading"
      aria-busy="true"
      aria-label="Đang tải dữ liệu"
    >
      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <Skeleton width="200px" height="28px" />
        <Skeleton width="100%" height="120px" />
      </div>
    </div>
  );
}
